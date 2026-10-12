(function () {
  "use strict";
  // ============================================================
  // THAI DR MONITOR — ชั้นตรรกะ (pure)
  //
  // หน้าที่: รับแถว DR ดิบจาก SET → ยุบรวมตามสินทรัพย์อ้างอิง → จัดกลุ่ม
  //          → เทียบกับของเดิมเพื่อหาว่าอะไรใหม่/อะไรหาย
  //
  // ข้อตกลงของไฟล์นี้:
  //   - pure: ไม่มี DOM · ไม่มี fetch · ไม่เขียน storage · ไม่มี logic ของ UI
  //   - ES5 syntax เท่านั้น (var / function / ต่อ string)
  //   - ค่าที่ไม่รู้ต้องเป็น null เสมอ — ห้ามออก NaN / Infinity / undefined
  //   - V1 คือการค้นพบและคุณภาพข้อมูลเท่านั้น ไม่มีคะแนน ไม่มีคำแนะนำลงทุน
  //
  // กฎที่ห้ามละเมิด (มาจากข้อมูลจริง ไม่ใช่ความเห็น):
  //   1. ห้ามยุบรวมด้วยการตัดเลขท้าย DR symbol
  //      GOLD03 = SPDR GOLD ฮ่องกง · GOLD19 = SPDR GOLD TRUST สิงคโปร์
  //      GOLDUS03/19/80 = SPDR GOLD อเมริกา · GOLDM01/23 = GOLD MINISHARES
  //      4 กองคนละตัว 3 ตลาด — ตัดเลขท้ายจะรวมเป็นก้อนเดียวทันที
  //   2. firstSeenAt (แอปเห็นครั้งแรก) ≠ sourceListingDate (วันจดทะเบียนจริง)
  //      import ครั้งแรกมี 551 แถว แต่จดทะเบียนใน 30 วันจริง ๆ แค่ 4 ตัว
  //   3. สแกนไม่ครบ ห้ามตัดสินว่าอะไรหาย
  //   4. SET ไม่มีประเภท "ดัชนีโดยตรง" — ทุกตัวที่อ้างดัชนีคือ ETF
  // ============================================================

  var VERSION = 1;

  // ---- ประเภทสินทรัพย์ ----
  var TYPE = {
    STOCK: "individual-stock",
    ETF_INDEX: "index-etf",
    ETF_SECTOR: "sector-etf",
    ETF_BOND: "bond-etf",
    ETF_COMMODITY: "commodity-etf",
    FUND_OTHER: "other-fund",
    UNKNOWN: "needs-review"
  };
  var TYPE_TH = {};
  TYPE_TH[TYPE.STOCK] = "หุ้นรายตัว";
  TYPE_TH[TYPE.ETF_INDEX] = "ETF อิงดัชนี";
  TYPE_TH[TYPE.ETF_SECTOR] = "ETF รายอุตสาหกรรม/ธีม";
  TYPE_TH[TYPE.ETF_BOND] = "ETF ตราสารหนี้";
  TYPE_TH[TYPE.ETF_COMMODITY] = "ETF สินค้าโภคภัณฑ์";
  TYPE_TH[TYPE.FUND_OTHER] = "กองทุนอื่น";
  TYPE_TH[TYPE.UNKNOWN] = "ยังจัดไม่ได้ · รอตรวจ";

  // ---- ตลาด → ประเทศ ----
  // ยืนยันจากข้อมูลจริง 16 ค่า ทุกค่าชี้ประเทศได้ชัดเจน
  // หมายเหตุ: นี่คือ "ตลาดที่จดทะเบียน" ไม่ใช่ "ประเทศที่บริษัทตั้งอยู่"
  // ข้อมูล domicile ไม่มีในแหล่ง จึงไม่อ้างว่ารู้
  var EXCHANGE_GEO = {
    "The Nasdaq Stock Market": "สหรัฐฯ",
    "The Nasdaq Global Select Market": "สหรัฐฯ",
    "The New York Stock Exchange": "สหรัฐฯ",
    "The New York Stock Exchange Archipelago": "สหรัฐฯ",
    "The Stock Exchange of Hong Kong Limited": "ฮ่องกง",
    "Shanghai Stock Exchange": "จีน",
    "Shenzhen Stock Exchange": "จีน",
    "Tokyo Stock Exchange": "ญี่ปุ่น",
    "Taiwan Stock Exchange": "ไต้หวัน",
    "Singapore Exchange": "สิงคโปร์",
    "Hochiminh Stock Exchange": "เวียดนาม",
    "Euronext Paris": "ยุโรป",
    "Euronext Amsterdam": "ยุโรป",
    "Euronext Milan": "ยุโรป",
    "Deutsche Borse": "ยุโรป",
    "Nasdaq Copenhagen": "ยุโรป"
  };
  var GEO_UNKNOWN = "ไม่ทราบ · รอตรวจ";

  // ---- SET class ----
  var CLASS_STOCK = "6"; // หุ้นสามัญต่างประเทศ
  var CLASS_FUND = "7"; // หน่วยของโครงการจัดการลงทุนต่างประเทศ

  // ---- กฎจัดประเภทกองทุนจากชื่อทางการของ SET ----
  // เรียงตามลำดับความสำคัญ — ตัวแรกที่ตรงชนะ
  // ตั้งใจให้ "จับไม่ได้" เหลือเป็น needs-review แทนที่จะเดา
  var FUND_RULES = [
    { type: TYPE.ETF_BOND, re: /\bBOND|TREASURY|CREDIT\b/i },
    { type: TYPE.ETF_COMMODITY, re: /\bGOLD|SILVER|OIL|CRUDE|RARE EARTH|METALS\b/i },
    {
      type: TYPE.ETF_INDEX,
      re: /\bCSI|STAR ?50|CHINEXT|HANG SENG|NASDAQ ?100|S&P ?500|TOPIX|NIKKEI|MSCI|VN30|VNFIN|FTSE|KOSPI|SZSE|SSE |TOP ?50|TOTAL WORLD\b/i
    },
    {
      type: TYPE.ETF_SECTOR,
      re: /\bSEMICONDUCTOR|BIOTECH|ROBOTIC|ELECTRIC VEHICLE|ARTIFICIAL INTELLIGENCE|GAMES|ANIMATION|COMMUNICATION|FINANCIAL|HEALTH|ENERGY|MINERS\b/i
    }
  ];

  // ---------------- utils ----------------
  function str(v) {
    return v === null || v === undefined ? "" : String(v);
  }
  function trim(v) {
    return str(v).replace(/^\s+|\s+$/g, "");
  }
  function norm(v) {
    return trim(v).toUpperCase().replace(/\s+/g, " ");
  }
  function fin(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function ymd(v) {
    var s = trim(v);
    if (!s) return null;
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    return m ? m[1] : null;
  }
  function ymdMs(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str(s))) return null;
    var ms = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return isFinite(ms) ? ms : null;
  }
  function daysBetween(a, b) {
    var x = ymdMs(a), y = ymdMs(b);
    if (x == null || y == null) return null;
    return Math.round((y - x) / 86400000);
  }

  // ราคาเสนอขายจาก bid/offer object ที่ SET ส่งมาเป็น { volume, price:"33.50" }
  function offerPrice(row) {
    var o = row && row.offer;
    if (!o) return null;
    var p = fin(o.price);
    return p != null && p > 0 ? p : null;
  }
  // ราคาตลาดของ DR: ใช้ last ก่อน ถ้าไม่มีค่อยใช้ offer
  // ห้ามคืน 0 เพราะ 0 จะถูกอ่านว่า "ราคาเป็นศูนย์" ไม่ใช่ "ไม่มีราคา"
  function pickMarketPrice(row) {
    var l = fin(row && row.last);
    if (l != null && l > 0) return l;
    return offerPrice(row);
  }

  // กลุ่มอุตสาหกรรม — อ่านจากตาราง curated ที่แยกเป็นอีกไฟล์
  // ไฟล์นั้นไม่ถูกโหลด (เช่นในเทสต์เก่า) ก็ยังทำงานได้ แค่ได้ unknown
  function sectorTable() {
    if (typeof window !== "undefined" && window.ThaiDrSectors) return window.ThaiDrSectors;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./thai-dr-sectors.js"); } catch (e) { return null; }
    }
    return null;
  }
  function sectorOf(row) {
    var T = sectorTable();
    if (!T) {
      return { sector: "unknown", sectorTh: "ยังไม่จัดกลุ่ม", isAi: false, source: "no-table" };
    }
    return T.lookup(row.underlying, row.underlyingName, row.underlyingClassId);
  }

  // ---------------- จัดประเภท ----------------
  function classifyGeography(row) {
    var ex = trim(row.underlyingExchange);
    if (!ex) return { geography: GEO_UNKNOWN, source: "none", confident: false };
    var g = EXCHANGE_GEO[ex];
    if (g) return { geography: g, source: "set-exchange", confident: true };
    // ตลาดที่ไม่รู้จัก — บอกตรง ๆ ว่ายังจัดไม่ได้ ไม่เดาจากชื่อ
    return { geography: GEO_UNKNOWN, source: "unmapped-exchange", confident: false };
  }

  function classifyInstrument(row) {
    var cls = trim(row.underlyingClassId);
    if (cls === CLASS_STOCK) {
      return { instrumentType: TYPE.STOCK, source: "set-class", confident: true };
    }
    if (cls === CLASS_FUND) {
      var name = str(row.underlyingName) + " " + str(row.underlying);
      for (var i = 0; i < FUND_RULES.length; i++) {
        if (FUND_RULES[i].re.test(name)) {
          return {
            instrumentType: FUND_RULES[i].type,
            source: "set-class+name-rule",
            confident: true
          };
        }
      }
      // เป็นกองทุนแน่ (SET ยืนยัน) แต่ยังแยกชนิดไม่ได้ — ต้องให้คนดู
      return { instrumentType: TYPE.UNKNOWN, source: "set-class-only", confident: false };
    }
    return { instrumentType: TYPE.UNKNOWN, source: "none", confident: false };
  }

  // ---------------- คีย์ประจำตัวสินทรัพย์ ----------------
  // ลำดับความสำคัญตามที่ตกลงไว้:
  //   1. underlying + ตลาด  (ทางการ · ยืนยันแล้วว่าไม่ชนกันเลยใน 551 แถว)
  //   2. ชื่อทางการ + ตลาด  (ถ้าไม่มี symbol)
  //   3. จัดไม่ได้ → ต้องให้คนตรวจ ห้ามรวมเงียบ ๆ
  function canonicalKeyOf(row) {
    var sym = norm(row.underlying);
    var ex = norm(row.underlyingExchange);
    if (sym && ex) return { key: sym + "@" + ex, basis: "symbol+exchange", resolved: true };
    var nm = norm(row.underlyingName);
    if (nm && ex) return { key: "NAME:" + nm + "@" + ex, basis: "name+exchange", resolved: true };
    if (sym) return { key: sym + "@?", basis: "symbol-only", resolved: false };
    if (nm) return { key: "NAME:" + nm + "@?", basis: "name-only", resolved: false };
    // ไม่มีอะไรให้ยึดเลย — ใช้ DR symbol เป็นคีย์ของตัวเอง เพื่อไม่ให้ไปรวมกับใคร
    return { key: "DR:" + norm(row.symbol), basis: "unresolved", resolved: false };
  }

  // ---------------- ยุบรวมเป็นสินทรัพย์ ----------------
  function buildInventory(rows, opts) {
    var o = opts || {};
    var list = [];
    var i;
    for (i = 0; i < (rows || []).length; i++) {
      var r = rows[i];
      if (r && trim(r.symbol)) list.push(r);
    }

    var map = {};
    var order = [];
    for (i = 0; i < list.length; i++) {
      var row = list[i];
      var ck = canonicalKeyOf(row);
      if (!map[ck.key]) {
        var geo = classifyGeography(row);
        var ins = classifyInstrument(row);
        // กลุ่มอุตสาหกรรม + ป้าย AI มาจากตารางที่ทำเอง (SET ไม่มีข้อมูลนี้)
        // ถ้าไม่ได้โหลด thai-dr-sectors.js ก็ยังทำงานได้ แค่ไม่มีกลุ่ม
        var sec = sectorOf(row);
        map[ck.key] = {
          sector: sec.sector,
          sectorTh: sec.sectorTh,
          isAi: sec.isAi,
          sectorSource: sec.source,
          canonicalKey: ck.key,
          keyBasis: ck.basis,
          canonicalName: trim(row.underlyingName) || trim(row.underlying) || null,
          underlyingSymbol: trim(row.underlying) || null,
          underlyingMarket: trim(row.underlyingExchange) || null,
          underlyingUrl: trim(row.underlyingUrl) || null,
          setClassId: trim(row.underlyingClassId) || null,
          setClassName: trim(row.underlyingClassName) || null,
          geography: geo.geography,
          geographySource: geo.source,
          instrumentType: ins.instrumentType,
          instrumentTypeTh: TYPE_TH[ins.instrumentType],
          classificationSource: ins.source,
          // ต้องให้คนตรวจเมื่อ: จัดประเภทไม่ได้ · ภูมิศาสตร์ไม่ได้ · คีย์ไม่ชัด
          reviewStatus: ins.confident && geo.confident && ck.resolved ? "ok" : "needs-review",
          drListings: []
        };
        order.push(ck.key);
      }
      var a = map[ck.key];
      a.drListings.push({
        drSymbol: trim(row.symbol),
        drName: trim(row.name) || null,
        issuer: trim(row.issuer) || null,
        issuerName: trim(row.issuerName) || null,
        conversionRatio: trim(row.conversionRatio) || null,
        // ราคาตลาดของ DR เอง — last ถ้ามี ไม่งั้นใช้ราคาเสนอขาย (offer) เป็นตัวแทน
        // DR ที่ยังไม่มีการซื้อขายวันนี้จะไม่มี last แต่มี bid/offer อยู่
        marketThb: pickMarketPrice(row),
        marketThbBasis: fin(row.last) != null && fin(row.last) > 0 ? "last"
          : offerPrice(row) != null ? "offer" : null,
        sourceListingDate: ymd(row.firstTradeDate),
        outstandingShare: fin(row.outstandingShare),
        outstandingDate: ymd(row.outstandingDate),
        tradingSession: trim(row.tradingSession) || null
      });
    }

    var assets = [];
    for (i = 0; i < order.length; i++) {
      var as = map[order[i]];
      as.drListings.sort(function (x, y) {
        return x.drSymbol < y.drSymbol ? -1 : x.drSymbol > y.drSymbol ? 1 : 0;
      });
      as.drCount = as.drListings.length;
      as.hasMultipleDrs = as.drCount > 1;
      // วันจดทะเบียนล่าสุดในกลุ่ม — ของจริงจาก SET ไม่ใช่วันที่แอปเห็น
      var newest = null;
      for (var k = 0; k < as.drListings.length; k++) {
        var d = as.drListings[k].sourceListingDate;
        if (d && (newest == null || d > newest)) newest = d;
      }
      as.newestListingDate = newest;
      assets.push(as);
    }

    assets.sort(function (x, y) {
      var a1 = str(x.canonicalName).toUpperCase();
      var b1 = str(y.canonicalName).toUpperCase();
      return a1 < b1 ? -1 : a1 > b1 ? 1 : 0;
    });

    return {
      version: VERSION,
      assets: assets,
      totalDrListings: list.length,
      totalAssets: assets.length,
      multiDrAssets: assets.filter(function (a2) { return a2.hasMultipleDrs; }).length,
      needsReview: assets.filter(function (a2) { return a2.reviewStatus === "needs-review"; }).length
    };
  }

  // ---------------- ซิงก์: เทียบของใหม่กับของเดิม ----------------
  // prev = { version, drs: { <drSymbol>: {firstSeenAt, lastSeenAt, sourceStatus, ...} },
  //          lastSuccessfulSyncAt, baselineAt }
  //
  // กฎสำคัญ:
  //   complete === false → ห้ามแตะ lastSeenAt และห้ามมาร์คว่าอะไรหาย
  //   firstSeenAt ตั้งครั้งเดียว ห้ามเขียนทับ
  //   sourceListingDate มาจาก SET เท่านั้น ห้ามสร้างจาก firstSeenAt
  function syncInventory(prev, incoming, nowIso, opts) {
    var o = opts || {};
    var complete = o.complete === true;
    var now = str(nowIso) || new Date().toISOString();
    var today = now.slice(0, 10);

    var base = { version: VERSION, drs: {}, lastSuccessfulSyncAt: null, baselineAt: null };
    if (prev && prev.drs && typeof prev.drs === "object") {
      var pk;
      for (pk in prev.drs) {
        if (Object.prototype.hasOwnProperty.call(prev.drs, pk)) {
          var p = prev.drs[pk];
          if (!p) continue;
          base.drs[pk] = {
            drSymbol: p.drSymbol || pk,
            firstSeenAt: p.firstSeenAt || null,
            lastSeenAt: p.lastSeenAt || null,
            sourceListingDate: p.sourceListingDate || null,
            sourceStatus: p.sourceStatus || "unconfirmed"
          };
        }
      }
      base.lastSuccessfulSyncAt = prev.lastSuccessfulSyncAt || null;
      base.baselineAt = prev.baselineAt || null;
    }

    var hadPrev = false;
    var anyKey;
    for (anyKey in base.drs) {
      if (Object.prototype.hasOwnProperty.call(base.drs, anyKey)) { hadPrev = true; break; }
    }
    // import ครั้งแรก = baseline ไม่ใช่ "ออกใหม่ทั้งหมด"
    var isBaseline = !hadPrev;

    var rows = [];
    var i;
    for (i = 0; i < (incoming || []).length; i++) {
      var r = incoming[i];
      if (r && trim(r.symbol)) rows.push(r);
    }

    // สแกนไม่ครบ → เก็บของเดิมไว้ทั้งหมด ไม่ตัดสินอะไรเลย
    if (!complete) {
      return {
        state: base,
        newDrSymbols: [],
        missingDrSymbols: [],
        isBaseline: isBaseline,
        applied: false,
        reason: "สแกนไม่ครบ — ไม่อัปเดตสถานะใด ๆ เพื่อไม่ให้ตัดสินผิดว่า DR หายไป"
      };
    }

    var seen = {};
    var newSyms = [];
    for (i = 0; i < rows.length; i++) {
      var sym = trim(rows[i].symbol);
      seen[sym] = true;
      var listing = ymd(rows[i].firstTradeDate);
      if (!base.drs[sym]) {
        base.drs[sym] = {
          drSymbol: sym,
          firstSeenAt: today, // แอปเห็นครั้งแรกวันนี้
          lastSeenAt: today,
          sourceListingDate: listing, // ของจริงจาก SET — null ได้ ห้ามเดา
          sourceStatus: "present"
        };
        if (!isBaseline) newSyms.push(sym);
      } else {
        var rec = base.drs[sym];
        // firstSeenAt ห้ามเขียนทับ — ถ้าเคยไม่มีค่า ค่อยตั้งครั้งนี้
        if (!rec.firstSeenAt) rec.firstSeenAt = today;
        rec.lastSeenAt = today;
        // อัปเดต metadata จากแหล่งได้ แต่ firstSeenAt ไม่ยุ่ง
        if (listing) rec.sourceListingDate = listing;
        rec.sourceStatus = "present";
      }
    }

    // หายจากสแกนที่ "ครบ" → บอกว่าหายจากรอบล่าสุด
    // ห้ามเขียนว่า "เพิกถอน" เพราะแหล่งนี้ไม่ได้ยืนยันการเพิกถอน
    var missing = [];
    var key;
    for (key in base.drs) {
      if (!Object.prototype.hasOwnProperty.call(base.drs, key)) continue;
      if (!seen[key]) {
        base.drs[key].sourceStatus = "missing-from-complete-scan";
        missing.push(key);
      }
    }

    base.lastSuccessfulSyncAt = now;
    if (!base.baselineAt) base.baselineAt = now;

    newSyms.sort();
    missing.sort();
    return {
      state: base,
      newDrSymbols: newSyms,
      missingDrSymbols: missing,
      isBaseline: isBaseline,
      applied: true,
      reason: null
    };
  }

  // ---------------- รวมร่าง: inventory + สถานะซิงก์ + override ----------------
  function decorate(inventory, syncState, overrides, opts) {
    var o = opts || {};
    var today = str(o.today) || new Date().toISOString().slice(0, 10);
    var windowDays = fin(o.newWindowDays);
    if (windowDays == null || windowDays <= 0) windowDays = 30;
    var ov = overrides || {};
    var drs = (syncState && syncState.drs) || {};

    var assets = [];
    for (var i = 0; i < inventory.assets.length; i++) {
      var src = inventory.assets[i];
      var a = {};
      var k;
      for (k in src) if (Object.prototype.hasOwnProperty.call(src, k)) a[k] = src[k];

      // ต่อข้อมูลการพบเห็นเข้ากับ DR แต่ละตัว
      var listings = [];
      var anyNewByListing = false;
      var anyMissing = false;
      for (var j = 0; j < src.drListings.length; j++) {
        var L = {};
        var kk;
        for (kk in src.drListings[j]) {
          if (Object.prototype.hasOwnProperty.call(src.drListings[j], kk)) {
            L[kk] = src.drListings[j][kk];
          }
        }
        var rec = drs[L.drSymbol];
        L.firstSeenAt = rec ? rec.firstSeenAt : null;
        L.lastSeenAt = rec ? rec.lastSeenAt : null;
        L.sourceStatus = rec ? rec.sourceStatus : "unconfirmed";
        // "ใหม่" ตัดสินจากวันจดทะเบียนจริง ไม่ใช่วันที่แอปเพิ่งเห็น
        var age = L.sourceListingDate ? daysBetween(L.sourceListingDate, today) : null;
        L.listingAgeDays = age;
        L.isNewListing = age != null && age >= 0 && age <= windowDays;
        if (L.isNewListing) anyNewByListing = true;
        if (L.sourceStatus === "missing-from-complete-scan") anyMissing = true;
        listings.push(L);
      }
      a.drListings = listings;
      a.hasNewListing = anyNewByListing;
      a.hasMissing = anyMissing;

      // override ของผู้ใช้ — เก็บแยก ไม่ทับข้อมูลต้นทาง
      var over = ov[src.canonicalKey];
      a.sourceValues = {
        canonicalName: src.canonicalName,
        geography: src.geography,
        instrumentType: src.instrumentType,
        instrumentTypeTh: TYPE_TH[src.instrumentType]
      };
      a.hasOverride = false;
      if (over) {
        if (trim(over.canonicalName)) { a.canonicalName = trim(over.canonicalName); a.hasOverride = true; }
        if (trim(over.geography)) { a.geography = trim(over.geography); a.hasOverride = true; }
        if (trim(over.instrumentType)) {
          a.instrumentType = trim(over.instrumentType);
          a.instrumentTypeTh = TYPE_TH[a.instrumentType] || trim(over.instrumentType);
          a.hasOverride = true;
        }
        if (a.hasOverride) {
          a.classificationSource = "manual-override";
          a.reviewStatus = trim(over.reviewStatus) || "ok";
          a.overrideNote = trim(over.note) || null;
          a.overrideUpdatedAt = over.updatedAt || null;
        }
      }
      assets.push(a);
    }

    var summary = {
      totalDrListings: inventory.totalDrListings,
      totalAssets: assets.length,
      multiDrAssets: 0,
      newListings: 0,
      needsReview: 0,
      missing: 0,
      newWindowDays: windowDays
    };
    for (var m = 0; m < assets.length; m++) {
      if (assets[m].hasMultipleDrs) summary.multiDrAssets++;
      if (assets[m].reviewStatus === "needs-review") summary.needsReview++;
      for (var n = 0; n < assets[m].drListings.length; n++) {
        if (assets[m].drListings[n].isNewListing) summary.newListings++;
        if (assets[m].drListings[n].sourceStatus === "missing-from-complete-scan") summary.missing++;
      }
    }

    return { version: VERSION, assets: assets, summary: summary };
  }

  // ============================================================
  // ราคา: หุ้นแม่ → ราคา DR ตามทฤษฎี
  //
  // ความหมายของ conversionRatio "340 : 1" = DR 340 หน่วย ต่อหุ้นแม่ 1 หุ้น
  //   พิสูจน์กับข้อมูลจริงแล้ว 4 ตัว ต่างจากราคาตลาด 0.1-1.0% ซึ่งคือช่วง
  //   premium/discount ปกติ ถ้าตีความกลับด้านจะเพี้ยนเป็นหลักหมื่นเท่า
  //
  // สูตร: ราคา DR ตามทฤษฎี (บาท) = ราคาหุ้นแม่ × (บาทต่อสกุลนั้น) ÷ (a/b)
  // ============================================================

  // แปลง "3,000 : 1" → { per: 3000, shares: 1 }  ·  คืน null ถ้าอ่านไม่ออก
  function parseRatio(s) {
    var txt = trim(s);
    if (!txt) return null;
    var m = /^([\d,\.]+)\s*:\s*([\d,\.]+)$/.exec(txt);
    if (!m) return null;
    var a = Number(String(m[1]).replace(/,/g, ""));
    var b = Number(String(m[2]).replace(/,/g, ""));
    if (!isFinite(a) || !isFinite(b) || !(a > 0) || !(b > 0)) return null;
    return { per: a, shares: b };
  }

  // ตลาด → สกุลเงินของราคาหุ้นแม่
  var EXCHANGE_CCY = {
    "The Nasdaq Stock Market": "USD",
    "The Nasdaq Global Select Market": "USD",
    "The New York Stock Exchange": "USD",
    "The New York Stock Exchange Archipelago": "USD",
    "The Stock Exchange of Hong Kong Limited": "HKD",
    "Tokyo Stock Exchange": "JPY",
    "Shanghai Stock Exchange": "CNY",
    "Shenzhen Stock Exchange": "CNY",
    "Taiwan Stock Exchange": "TWD",
    "Singapore Exchange": "SGD",
    "Hochiminh Stock Exchange": "VND",
    "Euronext Paris": "EUR",
    "Euronext Amsterdam": "EUR",
    "Euronext Milan": "EUR",
    "Deutsche Borse": "EUR",
    "Nasdaq Copenhagen": "DKK"
  };
  function currencyOf(exchange) {
    return EXCHANGE_CCY[trim(exchange)] || null;
  }

  // ดึง ticker ของตลาดต้นทางจาก underlyingUrl ที่ SET ให้มา
  // ใช้ URL ทางการเท่านั้น ไม่เดาจากชื่อย่อที่ SET ตั้งเอง
  // (SET ใช้ "AIA" แต่ตลาดฮ่องกงใช้ 1299 — เดาเองจะได้ราคาผิดตัว)
  function providerTickerOf(row) {
    var u = str(row && row.underlyingUrl).replace(/\s+/g, "");
    var m;
    if ((m = /nasdaq\.com\/market-activity\/stocks\/([A-Za-z0-9.\-]+)/.exec(u))) {
      return { ticker: m[1].toUpperCase(), ccy: "USD" };
    }
    if ((m = /nyse\.com\/quote\/[A-Z]+:([A-Za-z0-9.\-]+)/.exec(u))) {
      return { ticker: m[1].toUpperCase(), ccy: "USD" };
    }
    if ((m = /hkex\.com\.hk\/.*[?&]sym=(\d+)/.exec(u))) {
      var hk = String(parseInt(m[1], 10));
      while (hk.length < 4) hk = "0" + hk;
      return { ticker: hk + ".HK", ccy: "HKD" };
    }
    if ((m = /jpx\.co\.jp\/.*topSearchStr=(\d{4})/.exec(u))) {
      return { ticker: m[1] + ".T", ccy: "JPY" };
    }
    // ตลาดอื่นยังไม่มีทางแปลงที่เชื่อถือได้ → ไม่เดา
    return null;
  }

  // คิดราคา DR ตามทฤษฎีจากราคาหุ้นแม่
  //   underlyingPrice = ราคาหุ้นแม่ในสกุลท้องถิ่น
  //   thbPerUnit      = บาทต่อ 1 หน่วยสกุลนั้น
  // คืน null ถ้าขาดอะไรก็ตาม — ห้ามเดา
  function theoreticalDrPrice(underlyingPrice, thbPerUnit, ratio) {
    var p = fin(underlyingPrice), fx = fin(thbPerUnit);
    if (p == null || fx == null || !ratio) return null;
    if (!(p > 0) || !(fx > 0)) return null;
    var v = p * fx * (ratio.shares / ratio.per);
    return isFinite(v) && v > 0 ? v : null;
  }

  // ส่วนต่างราคาตลาดกับทฤษฎี (%) — บวก = ซื้อขายแพงกว่าทฤษฎี
  function premiumPct(marketPrice, theoretical) {
    var m = fin(marketPrice), th = fin(theoretical);
    if (m == null || th == null || !(th > 0) || !(m > 0)) return null;
    var v = ((m - th) / th) * 100;
    return isFinite(v) ? v : null;
  }

  // เติมข้อมูลราคาเข้าไปใน DR แต่ละตัวของสินทรัพย์หนึ่ง
  //   quote = { price, currency, asOf } ของหุ้นแม่ · fxRates = { USD: 33.5, HKD: 4.27, ... }
  // ไม่แก้ของเดิม — คืนอาร์เรย์ใหม่
  function priceListings(asset, quote, fxRates) {
    var out = [];
    var listings = (asset && asset.drListings) || [];
    var q = quote || null;
    var rates = fxRates || {};
    for (var i = 0; i < listings.length; i++) {
      var L = {}, k;
      for (k in listings[i]) {
        if (Object.prototype.hasOwnProperty.call(listings[i], k)) L[k] = listings[i][k];
      }
      var ratio = parseRatio(L.conversionRatio);
      L.ratioPer = ratio ? ratio.per : null;
      L.ratioShares = ratio ? ratio.shares : null;
      var ccy = (q && q.currency) || currencyOf(asset && asset.underlyingMarket);
      L.underlyingCurrency = ccy;
      L.underlyingPrice = q && fin(q.price) != null ? fin(q.price) : null;
      var fx = ccy ? fin(rates[ccy]) : null;
      L.thbPerUnit = fx;
      L.theoreticalThb = theoreticalDrPrice(L.underlyingPrice, fx, ratio);
      L.premiumPct = premiumPct(L.marketThb, L.theoreticalThb);
      // บอกเหตุผลเมื่อคิดไม่ได้ เพื่อให้หน้าเว็บอธิบายได้ ไม่ใช่โชว์ขีดเฉย ๆ
      L.priceNote = L.theoreticalThb != null ? null
        : !ratio ? "อ่านอัตราแปลงสภาพไม่ได้"
        : L.underlyingPrice == null ? "ยังไม่มีราคาหุ้นแม่"
        : fx == null ? "ไม่มีอัตราแลกเปลี่ยนของสกุล " + (ccy || "?")
        : "คำนวณไม่ได้";
      out.push(L);
    }
    return out;
  }

  // ============================================================
  // ราคาล่าสุด · ลงจาก ATH · ลงจาก ATH 1 ปี
  //
  // นิยามที่ตกลงไว้ (เปลี่ยนแล้วตัวเลขเปลี่ยน ต้องแก้เทสต์ด้วย):
  //   - ATH คิดจาก "ราคาปิด" ไม่ใช่ราคาสูงสุดระหว่างวัน
  //     เพราะราคาปิดคือราคาที่มีคนถือข้ามคืนจริง และเทียบกับราคาปัจจุบัน
  //     (ซึ่งก็เป็นราคาปิด) ได้อย่างสมมูล · ใช้ high จะได้ตัวเลขลึกกว่าความจริง
  //   - คิดในสกุลเดิมของหุ้นแม่ ไม่แปลงเป็นบาท
  //     เพื่อวัดผลงานของธุรกิจล้วน ๆ ไม่ปนผลค่าเงิน
  //   - "1 ปี" = 365 วันปฏิทินนับถอยจากแท่งล่าสุด ไม่ใช่ 252 วันทำการ
  // ============================================================
  var YEAR_DAYS = 365;
  // ATH จะมีความหมายว่า "สูงสุดตลอดกาล" ก็ต่อเมื่อข้อมูลยาวพอ
  // ต่ำกว่านี้มันคือ "สูงสุดเท่าที่มีข้อมูล" ซึ่งคนละเรื่อง
  //   วัดจาก 257 สินทรัพย์จริง: 239 ตัวมีข้อมูล >= 2 ปี · 18 ตัวต่ำกว่า
  //   ตัวที่ต่ำกว่าคือหุ้นเพิ่ง IPO (CBRS 103 แท่ง, Z.AI 186 แท่ง) ซึ่งเวลาเรียง
  //   "ลงจาก ATH" จะลอยขึ้นหัวตารางปนกับหุ้นที่ลงจากยอดจริง ๆ มา 10 ปี
  var ATH_MIN_DAYS = 2 * YEAR_DAYS;
  // ...แต่ "ช่วงวัน" อย่างเดียวปลอมได้ด้วยแท่งเดียว: ฟีดที่มีแท่งค้างเก่าปี 2015
  // ติดมา 1 แท่ง + ข้อมูลจริง 103 วัน จะได้ช่วง 4252 วัน ทั้งที่รู้ราคาจริง 3 เดือน
  // จึงต้องดูความหนาแน่นด้วย — ตั้งหลวม ๆ ให้จับเฉพาะฟีดที่บางผิดปกติจริง
  // ไม่ไปลงโทษฟีดรายสัปดาห์ที่ถูกต้อง (3 ปี = 157 แท่ง)
  var ATH_MIN_BARS = 120;

  // หา ATH จากราคาปิด พร้อมวันที่ที่ทำจุดสูงสุด
  function peakClose(bars, fromMs) {
    var hi = null, hiDate = null;
    for (var i = 0; i < (bars || []).length; i++) {
      var b = bars[i];
      if (!b) continue;
      var d = ymd(b.date);           // รับทั้ง "2026-10-09" และ ISO timestamp
      if (!d) continue;
      var c = fin(b.close);
      if (c == null || !(c > 0)) continue;
      if (fromMs != null) {
        var ms = ymdMs(d);
        if (ms == null || ms < fromMs) continue;
      }
      if (hi == null || c > hi) { hi = c; hiDate = d; }
    }
    return hi == null ? null : { price: hi, date: hiDate };
  }

  // ลงจากจุดสูงสุดกี่ % — ติดลบเสมอเมื่อต่ำกว่า ATH, 0 เมื่ออยู่ที่ ATH พอดี
  function drawdownPct(last, peak) {
    var l = fin(last), p = fin(peak);
    if (l == null || p == null || !(p > 0) || !(l > 0)) return null;
    var v = ((l - p) / p) * 100;
    return isFinite(v) ? v : null;
  }

  // สรุปสถิติราคาของสินทรัพย์หนึ่งตัวจากแท่งราคารายวัน
  //   bars = [{date, close}] เรียงเก่า→ใหม่ (ไม่เรียงก็ได้ ฟังก์ชันไม่พึ่งลำดับ)
  // คืน null ถ้าไม่มีแท่งที่ใช้ได้เลย — ห้ามเดา
  function priceStats(bars, opts) {
    var o = opts || {};
    var rows = [];
    for (var i = 0; i < (bars || []).length; i++) {
      var b = bars[i];
      if (!b) continue;
      var d = ymd(b.date);
      if (!d) continue;
      var c = fin(b.close);
      if (c == null || !(c > 0)) continue;
      rows.push({ date: d, close: c });
    }
    if (!rows.length) return null;
    rows.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });

    var last = rows[rows.length - 1];
    var allPeak = peakClose(rows, null);

    // หน้าต่าง 1 ปี นับถอยจากแท่งล่าสุด ไม่ใช่จากวันนี้
    // (ถ้าข้อมูลหยุดไปนาน การนับจากวันนี้จะได้หน้าต่างว่าง)
    var lastMs = ymdMs(last.date);
    var yearFrom = lastMs == null ? null : lastMs - YEAR_DAYS * 86400000;
    var yearPeak = yearFrom == null ? null : peakClose(rows, yearFrom);
    var yearBars = 0;
    if (yearFrom != null) {
      for (var k = 0; k < rows.length; k++) {
        var ms = ymdMs(rows[k].date);
        if (ms != null && ms >= yearFrom) yearBars++;
      }
    }

    // ช่วงเวลาที่ข้อมูลครอบคลุมจริง — วัดเป็นวันปฏิทิน ไม่ใช่จำนวนแท่ง
    // เพราะแท่งอาจห่าง (รายสัปดาห์) หรือถี่ (รายวัน) แล้วแต่แหล่ง
    var firstMs = ymdMs(rows[0].date);
    var historyDays = (firstMs == null || lastMs == null)
      ? null : Math.round((lastMs - firstMs) / 86400000);

    // ไม่ปัดเศษที่นี่ — ปัดที่ชั้นแสดงผลเท่านั้น (ข้อตกลงของไฟล์นี้)
    return {
      last: last.close,
      lastDate: last.date,
      bars: rows.length,
      firstDate: rows[0].date,
      historyDays: historyDays,
      // ATH เชื่อได้ว่าเป็น "ตลอดกาล" ไหม — หน้าเว็บใช้ตัดสินว่าจะติดป้ายเตือนหรือไม่
      // ต้องผ่านทั้งสองข้อ (และ) — ยาวพอ "และ" ไม่บางจนปลอมช่วงได้
      athReliable: historyDays != null && historyDays >= ATH_MIN_DAYS &&
        rows.length >= ATH_MIN_BARS,
      ath: allPeak ? allPeak.price : null,
      athDate: allPeak ? allPeak.date : null,
      // แท่งเดียว = ราคากับยอดสูงสุดเป็นตัวเดียวกัน จะได้ 0% ซึ่งอ่านว่า
      // "อยู่ที่จุดสูงสุด" — เป็นข้อความที่มั่นใจเกินจริง ไม่ใช่ผลวัด
      // จึงคืน null เพื่อให้หน้าเว็บแสดง "—" พร้อมบอกเหตุผล
      fromAthPct: (rows.length > 1 && allPeak)
        ? drawdownPct(last.close, allPeak.price) : null,
      ath1y: yearPeak ? yearPeak.price : null,
      ath1yDate: yearPeak ? yearPeak.date : null,
      fromAth1yPct: (rows.length > 1 && yearPeak)
        ? drawdownPct(last.close, yearPeak.price) : null,
      // ข้อมูลสั้นกว่า 1 ปี → ATH 1 ปี ไม่ใช่ ATH 1 ปีจริง ต้องบอกผู้ใช้
      coversFullYear: yearBars > 0 && rows.length > 0 &&
        ymdMs(rows[0].date) != null && yearFrom != null
        ? ymdMs(rows[0].date) <= yearFrom : false,
      yearBars: yearBars,
      currency: trim(o.currency) || null
    };
  }

  // นับแยกตามมิติ — ใช้ทำมุมมองจัดกลุ่ม
  function groupCounts(assets, field) {
    var map = {};
    for (var i = 0; i < (assets || []).length; i++) {
      var v = assets[i][field];
      var key = trim(v) || "ไม่ทราบ · รอตรวจ";
      map[key] = (map[key] || 0) + 1;
    }
    var out = [];
    var k;
    for (k in map) if (Object.prototype.hasOwnProperty.call(map, k)) out.push({ key: k, count: map[k] });
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  var ThaiDrMonitor = {
    VERSION: VERSION,
    TYPE: TYPE,
    TYPE_TH: TYPE_TH,
    EXCHANGE_GEO: EXCHANGE_GEO,
    GEO_UNKNOWN: GEO_UNKNOWN,
    buildInventory: buildInventory,
    syncInventory: syncInventory,
    decorate: decorate,
    groupCounts: groupCounts,
    parseRatio: parseRatio,
    currencyOf: currencyOf,
    providerTickerOf: providerTickerOf,
    theoreticalDrPrice: theoreticalDrPrice,
    premiumPct: premiumPct,
    priceListings: priceListings,
    priceStats: priceStats,
    peakClose: peakClose,
    drawdownPct: drawdownPct,
    // เกณฑ์ว่า ATH เชื่อได้ว่าเป็น "ตลอดกาล" — เปิดให้เทสต์/หน้าเว็บอ้างได้
    // ไม่ให้ไปเขียนเลข 730 ซ้ำที่อื่นแล้วหลุดกันคนละค่า
    ATH_MIN_DAYS: ATH_MIN_DAYS,
    ATH_MIN_BARS: ATH_MIN_BARS,
    EXCHANGE_CCY: EXCHANGE_CCY,
    _internal: {
      canonicalKeyOf: canonicalKeyOf,
      classifyGeography: classifyGeography,
      classifyInstrument: classifyInstrument,
      norm: norm,
      ymd: ymd,
      daysBetween: daysBetween,
      fin: fin,
      offerPrice: offerPrice,
      pickMarketPrice: pickMarketPrice,
      FUND_RULES: FUND_RULES
    }
  };

  if (typeof window !== "undefined") window.ThaiDrMonitor = ThaiDrMonitor;
  if (typeof module !== "undefined" && module.exports) module.exports = ThaiDrMonitor;
})();
