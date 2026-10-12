"use strict";
// ============================================================
// THAI DR MONITOR — เทสต์ชั้นตรรกะ
//   node scripts/thai-dr-monitor-test.js
//
// สิ่งที่ล็อกไว้ (มาจากข้อมูลจริง ไม่ใช่ความเห็น):
//   1. ยุบรวมด้วยฟิลด์ทางการ ไม่ใช่การตัดเลขท้าย DR symbol
//      GOLD03 / GOLD19 / GOLDUS03 เป็นคนละกองคนละตลาด ห้ามรวมกัน
//   2. firstSeenAt (แอปเห็นครั้งแรก) ≠ sourceListingDate (วันจดทะเบียนจริง)
//   3. สแกนไม่ครบ/ล้มเหลว ห้ามลบของเดิม ห้ามมาร์คว่าหาย
//   4. จัดประเภทไม่ได้ ต้องขึ้น needs-review ไม่ใช่เดาให้
//   5. ค่าที่ผู้ใช้แก้เองต้องรอดจากการรีเฟรช และข้อมูลต้นทางต้องยังอยู่
// ============================================================
var fs = require("fs");
var path = require("path");
var E = require("../public/thai-dr-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function near(a, b, eps) {
  return a != null && b != null && isFinite(a) && isFinite(b) &&
    Math.abs(a - b) < (eps == null ? 1e-9 : eps);
}

// ---- ตัวช่วยสร้างแถว DR แบบที่ SET ส่งมาจริง ----
function dr(o) {
  return {
    symbol: o.symbol,
    name: o.name || ("Depositary Receipt on " + (o.underlying || "?")),
    issuer: o.issuer || "PI",
    issuerName: o.issuerName || "บริษัทหลักทรัพย์ พาย จำกัด (มหาชน)",
    issuerId: o.issuerId || 2009,
    underlying: o.underlying,
    underlyingName: o.underlyingName,
    underlyingClassName: o.classId === "7" ? "หน่วยของโครงการจัดการลงทุนต่างประเทศ" : "หุ้นสามัญต่างประเทศ",
    underlyingClassId: o.classId || "6",
    underlyingExchange: o.exchange,
    underlyingUrl: o.url || null,
    conversionRatio: o.ratio || "100 : 1",
    firstTradeDate: o.firstTradeDate || "2025-01-15T00:00:00+07:00",
    outstandingShare: o.outstanding == null ? 1000000 : o.outstanding,
    outstandingDate: "2026-10-09T00:00:00+07:00",
    listedShare: 1000000000,
    securityType: "X",
    securityTypeName: "ตราสารแสดงสิทธิในหลักทรัพย์ต่างประเทศ (DR)",
    tradingSession: "ช่วงกลางวันและกลางคืน"
  };
}

var NASDAQ = "The Nasdaq Stock Market";
var HKEX = "The Stock Exchange of Hong Kong Limited";
var SGX = "Singapore Exchange";
var ARCA = "The New York Stock Exchange Archipelago";

console.log("== ยุบรวมตามสินทรัพย์อ้างอิง ==");
{
  // §12.1 + §12.2 — DR 4 ตัวของ underlying เดียวกัน ต้องเหลือสินทรัพย์เดียว
  var rows = [
    dr({ symbol: "AAPL01", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "PI" }),
    dr({ symbol: "AAPL03", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "INVX" }),
    dr({ symbol: "AAPL19", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "KKPS" }),
    dr({ symbol: "AAPL80", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "KTB" })
  ];
  var inv = E.buildInventory(rows);
  t("DR 4 ตัว → สินทรัพย์ 1 รายการ", inv.totalAssets === 1, inv.totalAssets);
  t("นับ DR ได้ครบ 4", inv.totalDrListings === 4, inv.totalDrListings);
  t("สินทรัพย์รู้ว่ามี DR 4 ตัว", inv.assets[0].drCount === 4, inv.assets[0].drCount);
  t("ติดธงว่ามี DR หลายตัว", inv.assets[0].hasMultipleDrs === true);
  var syms = inv.assets[0].drListings.map(function (d) { return d.drSymbol; });
  t("DR ทั้ง 4 ตัวยังอยู่ครบในรายละเอียด",
    syms.join(",") === "AAPL01,AAPL03,AAPL19,AAPL80", syms);
  t("ผู้ออกแต่ละรายไม่หาย",
    inv.assets[0].drListings.map(function (d) { return d.issuer; }).join(",") === "PI,INVX,KKPS,KTB",
    inv.assets[0].drListings.map(function (d) { return d.issuer; }));
  t("อัตราแปลงสภาพไม่หาย",
    inv.assets[0].drListings.every(function (d) { return d.conversionRatio === "100 : 1"; }));

  // §12.6 — สแกนซ้ำต้องได้ผลเท่าเดิม (idempotent)
  var inv2 = E.buildInventory(rows.concat([]));
  t("สแกนซ้ำได้ผลเหมือนเดิมเป๊ะ", JSON.stringify(inv) === JSON.stringify(inv2));
  // แถวซ้ำจริง ๆ (API ส่งซ้ำ) ต้องไม่ทำให้สินทรัพย์เพิ่ม
  var invDup = E.buildInventory(rows.concat([rows[0]]));
  t("แถวซ้ำไม่ทำให้สินทรัพย์เพิ่ม", invDup.totalAssets === 1, invDup.totalAssets);
}

console.log("== ห้ามยุบรวมผิด (เคสจริงจากข้อมูล SET) ==");
{
  // §12.3 — ticker/ชื่อคล้ายกันแต่คนละตลาด = คนละกอง
  // นี่คือเคสจริง: ตัดเลขท้ายจะได้ GOLD เหมือนกันหมด แล้วรวมผิดทันที
  var rows = [
    dr({ symbol: "GOLD03", underlying: "SPDR GOLD (HK) ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD TRUST (2840)", exchange: HKEX, classId: "7" }),
    dr({ symbol: "GOLD19", underlying: "SPDR GOLD TRUST(GSD)", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD SHARES (GSD)", exchange: SGX, classId: "7" }),
    dr({ symbol: "GOLDUS03", underlying: "SPDR GOLD (US) ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD SHARES (GLD)", exchange: ARCA, classId: "7" }),
    dr({ symbol: "GOLDUS19", underlying: "SPDR GOLD (US) ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD SHARES (GLD)", exchange: ARCA, classId: "7" }),
    dr({ symbol: "GOLDM01", underlying: "GOLDM ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD MINISHARES TRUST (GLDM)", exchange: ARCA, classId: "7" })
  ];
  var inv = E.buildInventory(rows);
  t("GOLD 5 DR → 4 สินทรัพย์ (ไม่รวมมั่ว)", inv.totalAssets === 4, inv.totalAssets);
  var byKey = {};
  inv.assets.forEach(function (a) { byKey[a.underlyingSymbol] = a; });
  t("GOLD ฮ่องกง แยกจาก GOLD สิงคโปร์",
    byKey["SPDR GOLD (HK) ETF"].underlyingMarket === HKEX &&
    byKey["SPDR GOLD TRUST(GSD)"].underlyingMarket === SGX);
  t("GOLDUS 2 DR รวมเป็นสินทรัพย์เดียว",
    byKey["SPDR GOLD (US) ETF"].drCount === 2, byKey["SPDR GOLD (US) ETF"].drCount);
  t("GOLDM ไม่ถูกรวมเข้ากับ GOLDUS", byKey["GOLDM ETF"].drCount === 1);

  // §12.3 — ticker เดียวกันแต่คนละตลาด ต้องแยก
  var same = [
    dr({ symbol: "XX01", underlying: "ACME", underlyingName: "บริษัท ACME CORP (ACME)", exchange: NASDAQ }),
    dr({ symbol: "XX02", underlying: "ACME", underlyingName: "บริษัท ACME HOLDINGS (1234)", exchange: HKEX })
  ];
  var invSame = E.buildInventory(same);
  t("ticker เดียวกันคนละตลาด → แยกเป็น 2 สินทรัพย์", invSame.totalAssets === 2, invSame.totalAssets);

  // §12.4 — ETF กับหุ้นที่ชื่อคล้ายกัน ห้ามรวม
  var mix = [
    dr({ symbol: "NVDA01", underlying: "NVDA", underlyingName: "บริษัท NVIDIA CORPORATION (NVDA)", exchange: NASDAQ, classId: "6" }),
    dr({ symbol: "NVDAETF01", underlying: "NVDA ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ NVIDIA SEMICONDUCTOR ETF (NVDX)", exchange: NASDAQ, classId: "7" })
  ];
  var invMix = E.buildInventory(mix);
  t("หุ้น NVDA กับ ETF ชื่อคล้าย ไม่ถูกรวม", invMix.totalAssets === 2, invMix.totalAssets);
  var types = invMix.assets.map(function (a) { return a.instrumentType; }).sort();
  t("และถูกจัดคนละประเภท", types[0] !== types[1], types);
}

console.log("== คลุมเครือ = ต้องให้คนตรวจ ไม่ใช่รวมเงียบ ๆ ==");
{
  // §12.5
  var rows = [
    dr({ symbol: "NOEX01", underlying: "MYSTERY", underlyingName: "บริษัท MYSTERY LTD", exchange: "" }),
    dr({ symbol: "NOEX02", underlying: "MYSTERY", underlyingName: "บริษัท MYSTERY LTD", exchange: "" })
  ];
  var inv = E.buildInventory(rows);
  t("ไม่มีตลาด → ยังรวมตาม symbol ได้ แต่ต้องติดธงตรวจ",
    inv.assets[0].reviewStatus === "needs-review", inv.assets[0].reviewStatus);
  t("บอกได้ว่าคีย์มาจากอะไร", inv.assets[0].keyBasis === "symbol-only", inv.assets[0].keyBasis);

  // ไม่มีอะไรให้ยึดเลย → ห้ามไปรวมกับใคร
  var blank = [
    dr({ symbol: "B01", underlying: "", underlyingName: "", exchange: "" }),
    dr({ symbol: "B02", underlying: "", underlyingName: "", exchange: "" })
  ];
  var invB = E.buildInventory(blank);
  t("ไม่มีข้อมูลอ้างอิงเลย → ห้ามรวมเข้าด้วยกัน", invB.totalAssets === 2, invB.totalAssets);
  t("ทั้งคู่ต้องรอตรวจ",
    invB.assets.every(function (a) { return a.reviewStatus === "needs-review"; }));
}

console.log("== จัดประเภทสินทรัพย์ ==");
{
  // §12.14 — หุ้นสหรัฐฯ ต้องแยกจาก ETF สหรัฐฯ
  var rows = [
    dr({ symbol: "MSFT01", underlying: "MSFT", underlyingName: "บริษัท MICROSOFT CORPORATION (MSFT)", exchange: NASDAQ, classId: "6" }),
    dr({ symbol: "IVV23", underlying: "IVV ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ ISHARES CORE S&P 500 ETF (IVV)", exchange: ARCA, classId: "7" })
  ];
  var inv = E.buildInventory(rows);
  var m = {};
  inv.assets.forEach(function (a) { m[a.underlyingSymbol] = a; });
  t("หุ้นสหรัฐฯ = individual-stock", m["MSFT"].instrumentType === E.TYPE.STOCK, m["MSFT"].instrumentType);
  t("S&P500 ETF = index-etf", m["IVV ETF"].instrumentType === E.TYPE.ETF_INDEX, m["IVV ETF"].instrumentType);
  t("ทั้งคู่อยู่ภูมิภาคสหรัฐฯ",
    m["MSFT"].geography === "สหรัฐฯ" && m["IVV ETF"].geography === "สหรัฐฯ");

  // §12.15 — ETF ดัชนีจีน ต้องไม่กลายเป็นหุ้นบริษัทจีน
  var cn = [
    dr({ symbol: "CSI30001", underlying: "CAM CSI300 ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ CHINAAMC CSI 300 INDEX ETF (3188)", exchange: HKEX, classId: "7" }),
    dr({ symbol: "BABA01", underlying: "BABA", underlyingName: "บริษัท ALIBABA GROUP HOLDING LIMITED (9988)", exchange: HKEX, classId: "6" })
  ];
  var invCn = E.buildInventory(cn);
  var c = {};
  invCn.assets.forEach(function (a) { c[a.underlyingSymbol] = a; });
  t("CSI300 ETF = index-etf ไม่ใช่หุ้นรายตัว",
    c["CAM CSI300 ETF"].instrumentType === E.TYPE.ETF_INDEX, c["CAM CSI300 ETF"].instrumentType);
  t("BABA = หุ้นรายตัว", c["BABA"].instrumentType === E.TYPE.STOCK);
  t("ETF ดัชนีไม่ถูกเรียกว่าดัชนีโดยตรง (SET ไม่มีประเภทนั้น)",
    Object.keys(E.TYPE).indexOf("DIRECT_INDEX") < 0 &&
    JSON.stringify(E.TYPE).indexOf("direct-index") < 0);

  // ชนิดกองทุนอื่น ๆ
  var funds = [
    dr({ symbol: "BOND01", underlying: "BONDUS ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ PREMIA US TREASURY FLOATING RATE ETF ACC (9078)", exchange: HKEX, classId: "7" }),
    dr({ symbol: "GLD01", underlying: "GOLDM ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ SPDR GOLD MINISHARES TRUST (GLDM)", exchange: ARCA, classId: "7" }),
    dr({ symbol: "SEMI01", underlying: "CNSEMI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ GLOBAL X CHINA SEMICONDUCTOR ETF (3191)", exchange: HKEX, classId: "7" })
  ];
  var invF = E.buildInventory(funds);
  var f = {};
  invF.assets.forEach(function (a) { f[a.underlyingSymbol] = a; });
  t("ETF ตราสารหนี้ = bond-etf", f["BONDUS ETF"].instrumentType === E.TYPE.ETF_BOND, f["BONDUS ETF"].instrumentType);
  t("ETF ทองคำ = commodity-etf", f["GOLDM ETF"].instrumentType === E.TYPE.ETF_COMMODITY, f["GOLDM ETF"].instrumentType);
  t("ETF เซมิคอนดักเตอร์ = sector-etf", f["CNSEMI ETF"].instrumentType === E.TYPE.ETF_SECTOR, f["CNSEMI ETF"].instrumentType);

  // §12.16 — จัดไม่ได้ต้องอยู่ใน Needs Review ไม่ใช่เดาให้
  var unknown = [
    dr({ symbol: "VT03", underlying: "VT ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ VANGUARD TOTAL WORLD STOCK (VT)", exchange: ARCA, classId: "7" }),
    dr({ symbol: "JEPI01", underlying: "JEPI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ JPMORGAN EQUITY PREMIUM INCOME ETF (JEPI)", exchange: ARCA, classId: "7" })
  ];
  var invU = E.buildInventory(unknown);
  var jepi = invU.assets.filter(function (a) { return a.underlyingSymbol === "JEPI ETF"; })[0];
  t("กองที่กฎจับไม่ได้ → needs-review", jepi.instrumentType === E.TYPE.UNKNOWN, jepi.instrumentType);
  t("และยังบอกได้ว่ารู้แค่ชั้นของ SET", jepi.classificationSource === "set-class-only", jepi.classificationSource);
  t("นับรวมใน needsReview", invU.needsReview >= 1, invU.needsReview);
  t("แต่ยังเก็บชั้นทางการของ SET ไว้", jepi.setClassId === "7" && !!jepi.setClassName);

  // ตลาดที่ไม่รู้จัก ห้ามเดาประเทศ
  var oddEx = E.buildInventory([
    dr({ symbol: "ODD01", underlying: "ODD", underlyingName: "บริษัท ODD", exchange: "Some New Exchange" })
  ]);
  t("ตลาดที่ยังไม่ได้แมป → ไม่เดาประเทศ",
    oddEx.assets[0].geography === E.GEO_UNKNOWN, oddEx.assets[0].geography);
  t("และติดธงรอตรวจ", oddEx.assets[0].reviewStatus === "needs-review");
}

console.log("== ซิงก์: ของใหม่ / ของเดิม / ของหาย ==");
{
  var base = [
    dr({ symbol: "AAA01", underlying: "AAA", underlyingName: "บริษัท AAA", exchange: NASDAQ, firstTradeDate: "2024-03-01T00:00:00+07:00" }),
    dr({ symbol: "BBB01", underlying: "BBB", underlyingName: "บริษัท BBB", exchange: NASDAQ, firstTradeDate: "2026-10-01T00:00:00+07:00" })
  ];

  // §12.12 — import ครั้งแรกคือฐานตั้งต้น ไม่ใช่ของออกใหม่
  var s1 = E.syncInventory(null, base, "2026-10-12T00:00:00Z", { complete: true });
  t("import ครั้งแรก = baseline", s1.isBaseline === true);
  t("baseline ต้องไม่รายงานว่ามีของใหม่", s1.newDrSymbols.length === 0, s1.newDrSymbols);
  t("baseline ต้องไม่รายงานว่ามีของหาย", s1.missingDrSymbols.length === 0);
  t("บันทึกครบทุกตัว", Object.keys(s1.state.drs).length === 2);
  t("ตั้ง lastSuccessfulSyncAt", !!s1.state.lastSuccessfulSyncAt);

  // §12.13 — sourceListingDate ต้องมาจากแหล่ง ไม่ใช่สร้างจาก firstSeenAt
  t("sourceListingDate มาจาก SET", s1.state.drs["AAA01"].sourceListingDate === "2024-03-01",
    s1.state.drs["AAA01"].sourceListingDate);
  t("firstSeenAt คือวันนี้ ไม่ใช่วันจดทะเบียน",
    s1.state.drs["AAA01"].firstSeenAt === "2026-10-12" &&
    s1.state.drs["AAA01"].firstSeenAt !== s1.state.drs["AAA01"].sourceListingDate);
  t("ไม่มีแถวไหนที่ sourceListingDate ถูกยัดด้วย firstSeenAt",
    s1.state.drs["BBB01"].sourceListingDate === "2026-10-01");

  // ไม่มีวันจดทะเบียนจากแหล่ง → ต้องเป็น null ห้ามเดา
  var noDate = E.syncInventory(null, [
    { symbol: "ZZZ01", underlying: "ZZZ", underlyingName: "บริษัท ZZZ", underlyingExchange: NASDAQ, underlyingClassId: "6" }
  ], "2026-10-12T00:00:00Z", { complete: true });
  t("ไม่มีวันจดทะเบียน → null ไม่ใช่วันที่เห็นครั้งแรก",
    noDate.state.drs["ZZZ01"].sourceListingDate === null,
    noDate.state.drs["ZZZ01"].sourceListingDate);

  // §12.8 + §12.9
  var s2 = E.syncInventory(s1.state, base, "2026-10-19T00:00:00Z", { complete: true });
  t("firstSeenAt ของเดิมไม่ถูกเขียนทับ",
    s2.state.drs["AAA01"].firstSeenAt === "2026-10-12", s2.state.drs["AAA01"].firstSeenAt);
  t("lastSeenAt อัปเดตตามรอบล่าสุด",
    s2.state.drs["AAA01"].lastSeenAt === "2026-10-19", s2.state.drs["AAA01"].lastSeenAt);
  t("สแกนซ้ำไม่มีของใหม่", s2.newDrSymbols.length === 0);

  // §12.7 — ตัวใหม่โผล่หลัง baseline
  var withNew = base.concat([
    dr({ symbol: "CCC01", underlying: "CCC", underlyingName: "บริษัท CCC", exchange: NASDAQ, firstTradeDate: "2026-10-15T00:00:00+07:00" })
  ]);
  var s3 = E.syncInventory(s2.state, withNew, "2026-10-26T00:00:00Z", { complete: true });
  t("ตรวจพบ DR ตัวใหม่", s3.newDrSymbols.join(",") === "CCC01", s3.newDrSymbols);
  t("ไม่ใช่ baseline แล้ว", s3.isBaseline === false);
  t("ตัวเดิมยัง firstSeenAt เท่าเดิม", s3.state.drs["AAA01"].firstSeenAt === "2026-10-12");

  // §12.10 — สแกนล้มเหลว ห้ามลบอะไร
  var s4 = E.syncInventory(s3.state, [], "2026-11-02T00:00:00Z", { complete: false });
  t("สแกนล้มเหลว → ไม่ลบ record ใด", Object.keys(s4.state.drs).length === 3,
    Object.keys(s4.state.drs).length);
  t("สแกนล้มเหลว → ไม่มาร์คว่าหาย", s4.missingDrSymbols.length === 0);
  t("สแกนล้มเหลว → applied = false", s4.applied === false);
  t("สแกนล้มเหลว → lastSeenAt ไม่ขยับ",
    s4.state.drs["AAA01"].lastSeenAt === "2026-10-26", s4.state.drs["AAA01"].lastSeenAt);
  t("สแกนล้มเหลว → lastSuccessfulSyncAt ไม่ขยับ",
    s4.state.lastSuccessfulSyncAt === s3.state.lastSuccessfulSyncAt);
  t("บอกเหตุผลว่าทำไมไม่อัปเดต", typeof s4.reason === "string" && s4.reason.length > 0);

  // §12.11 — สแกนไม่ครบ (ได้มาบางส่วน) ห้ามมาร์คว่าหาย
  var s5 = E.syncInventory(s3.state, [base[0]], "2026-11-02T00:00:00Z", { complete: false });
  t("สแกนไม่ครบ → ไม่มาร์คตัวที่ขาดว่าหาย", s5.missingDrSymbols.length === 0, s5.missingDrSymbols);
  t("สแกนไม่ครบ → record ยังครบ 3", Object.keys(s5.state.drs).length === 3);
  t("สแกนไม่ครบ → สถานะเดิมไม่เปลี่ยน",
    s5.state.drs["BBB01"].sourceStatus === "present", s5.state.drs["BBB01"].sourceStatus);

  // สแกนครบแล้วหายจริง
  var s6 = E.syncInventory(s3.state, [base[0]], "2026-11-09T00:00:00Z", { complete: true });
  t("สแกนครบ + หายจริง → มาร์คว่าหายจากรอบล่าสุด",
    s6.missingDrSymbols.sort().join(",") === "BBB01,CCC01", s6.missingDrSymbols);
  t("สถานะคือ missing-from-complete-scan ไม่ใช่ delisted",
    s6.state.drs["BBB01"].sourceStatus === "missing-from-complete-scan");
  t("ไม่มีคำว่าเพิกถอน/delisted ในสถานะ",
    JSON.stringify(s6.state).indexOf("delist") < 0 && JSON.stringify(s6.state).indexOf("เพิกถอน") < 0);
  t("ตัวที่หายยังอยู่ในฐานข้อมูล ไม่ถูกลบ", !!s6.state.drs["BBB01"]);
  t("ตัวที่หายยังเก็บ firstSeenAt เดิม", s6.state.drs["BBB01"].firstSeenAt === "2026-10-12");

  // กลับมาอีกครั้ง
  var s7 = E.syncInventory(s6.state, base, "2026-11-16T00:00:00Z", { complete: true });
  t("ของที่กลับมา → สถานะกลับเป็น present",
    s7.state.drs["BBB01"].sourceStatus === "present");
  t("ของที่กลับมาไม่ถูกนับเป็นของใหม่", s7.newDrSymbols.indexOf("BBB01") < 0, s7.newDrSymbols);
}

console.log("== decorate: นับของใหม่จากวันจดทะเบียนจริง ==");
{
  var rows = [
    dr({ symbol: "OLD01", underlying: "OLD", underlyingName: "บริษัท OLD", exchange: NASDAQ, firstTradeDate: "2019-05-01T00:00:00+07:00" }),
    dr({ symbol: "NEW01", underlying: "NEW", underlyingName: "บริษัท NEW", exchange: NASDAQ, firstTradeDate: "2026-10-01T00:00:00+07:00" })
  ];
  var s = E.syncInventory(null, rows, "2026-10-12T00:00:00Z", { complete: true });
  var inv = E.buildInventory(rows);
  var v = E.decorate(inv, s.state, {}, { today: "2026-10-12", newWindowDays: 30 });
  t("นับ DR ทั้งหมดแยกจากสินทรัพย์",
    v.summary.totalDrListings === 2 && v.summary.totalAssets === 2);
  t("ของที่จดทะเบียนใน 30 วัน นับได้ 1 (ไม่ใช่ 2)", v.summary.newListings === 1, v.summary.newListings);
  var byS = {};
  v.assets.forEach(function (a) { byS[a.underlyingSymbol] = a; });
  t("ตัวเก่าไม่ถูกนับว่าใหม่ ทั้งที่เพิ่งเห็นวันนี้",
    byS["OLD"].hasNewListing === false, byS["OLD"].drListings[0]);
  t("ตัวใหม่ถูกนับว่าใหม่", byS["NEW"].hasNewListing === true);
  t("อายุการจดทะเบียนคิดถูก", byS["NEW"].drListings[0].listingAgeDays === 11,
    byS["NEW"].drListings[0].listingAgeDays);
  t("firstSeenAt ปรากฏในรายละเอียด", byS["OLD"].drListings[0].firstSeenAt === "2026-10-12");
  t("lastSeenAt ปรากฏในรายละเอียด", byS["OLD"].drListings[0].lastSeenAt === "2026-10-12");
}

console.log("== ค่าที่ผู้ใช้แก้เอง ==");
{
  var rows = [
    dr({ symbol: "JEPI01", underlying: "JEPI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ JPMORGAN EQUITY PREMIUM INCOME ETF (JEPI)", exchange: ARCA, classId: "7" })
  ];
  var s = E.syncInventory(null, rows, "2026-10-12T00:00:00Z", { complete: true });
  var inv = E.buildInventory(rows);
  var key = inv.assets[0].canonicalKey;
  var ov = {};
  ov[key] = { instrumentType: E.TYPE.FUND_OTHER, canonicalName: "JPMorgan Equity Premium Income", note: "กองรายได้", updatedAt: "2026-10-12T01:00:00Z" };

  var v = E.decorate(inv, s.state, ov, { today: "2026-10-12" });
  var a = v.assets[0];
  // §12.17
  t("override เปลี่ยนประเภทได้", a.instrumentType === E.TYPE.FUND_OTHER, a.instrumentType);
  t("override เปลี่ยนชื่อได้", a.canonicalName === "JPMorgan Equity Premium Income");
  t("ติดธงว่าแก้เอง", a.hasOverride === true && a.classificationSource === "manual-override");
  t("แก้แล้วออกจาก needs-review", a.reviewStatus === "ok", a.reviewStatus);

  // §12.18 — ข้อมูลต้นทางต้องยังอ่านได้หลังแก้
  t("ยังเก็บชื่อจากแหล่งไว้",
    a.sourceValues.canonicalName.indexOf("JPMORGAN") >= 0, a.sourceValues.canonicalName);
  t("ยังเก็บประเภทจากแหล่งไว้",
    a.sourceValues.instrumentType === E.TYPE.UNKNOWN, a.sourceValues.instrumentType);
  t("ยังเก็บชั้นทางการของ SET ไว้", a.setClassId === "7");
  t("DR ยังอยู่ครบหลังแก้", a.drListings.length === 1 && a.drListings[0].drSymbol === "JEPI01");

  // §12.17 — รีเฟรชข้อมูลใหม่แล้ว override ต้องไม่หาย
  var rows2 = rows.concat([
    dr({ symbol: "JEPI23", underlying: "JEPI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ JPMORGAN EQUITY PREMIUM INCOME ETF (JEPI)", exchange: ARCA, classId: "7" })
  ]);
  var s2 = E.syncInventory(s.state, rows2, "2026-10-19T00:00:00Z", { complete: true });
  var inv2 = E.buildInventory(rows2);
  var v2 = E.decorate(inv2, s2.state, ov, { today: "2026-10-19" });
  t("override รอดจากการรีเฟรช", v2.assets[0].instrumentType === E.TYPE.FUND_OTHER);
  t("คีย์ไม่เปลี่ยนเมื่อมี DR เพิ่ม", v2.assets[0].canonicalKey === key);
  t("DR ใหม่เข้ามาอยู่ใต้สินทรัพย์เดิม", v2.assets[0].drCount === 2);
  t("ข้อมูลต้นทางยังอ่านได้หลังรีเฟรช",
    v2.assets[0].sourceValues.instrumentType === E.TYPE.UNKNOWN);
}

console.log("== ห้ามมีค่าผิดรูป / ห้ามชี้นำซื้อขาย ==");
{
  var bad = [];
  var cases = [
    ["ไม่ส่งอะไร", undefined],
    ["อาร์เรย์ว่าง", []],
    ["แถว null", [null, undefined]],
    ["แถวไม่มี symbol", [{ underlying: "X" }]],
    ["ฟิลด์เป็น null หมด", [{ symbol: "N01", underlying: null, underlyingName: null, underlyingExchange: null, underlyingClassId: null, firstTradeDate: null, outstandingShare: null }]],
    ["ตัวเลขเป็นข้อความ", [{ symbol: "S01", underlying: "S", underlyingExchange: NASDAQ, underlyingClassId: "6", outstandingShare: "เยอะมาก", firstTradeDate: "ไม่ใช่วันที่" }]]
  ];
  cases.forEach(function (c) {
    var inv, v;
    try {
      inv = E.buildInventory(c[1]);
      var s = E.syncInventory(null, c[1] || [], "2026-10-12T00:00:00Z", { complete: true });
      v = E.decorate(inv, s.state, {}, { today: "2026-10-12" });
    } catch (e) {
      bad.push(c[0] + ": throw " + e.message);
      return;
    }
    JSON.stringify(v, function (k, val) {
      if (typeof val === "number" && !isFinite(val)) bad.push(c[0] + "." + k + "=" + val);
      return val;
    });
    (v.assets || []).forEach(function (a, ai) {
      Object.keys(a).forEach(function (k) {
        if (a[k] === undefined) bad.push(c[0] + ".assets[" + ai + "]." + k + "=undefined");
      });
    });
  });
  t("ไม่มี NaN/Infinity/undefined และไม่ throw", bad.length === 0, bad.slice(0, 6));

  var src = fs.readFileSync(path.join(__dirname, "..", "public", "thai-dr-engine.js"), "utf8");
  var code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  t("ไม่มีคำว่า buy/sell ในโค้ด", !/\b(buy|sell)\b/i.test(code));
  t("ไม่มีคำแนะนำซื้อขายภาษาไทย", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ/.test(src));
  t("ไม่มีการให้คะแนน (score)", !/\bscore\b/i.test(code));
  // §9 — ES5 เท่านั้น
  t("ES5 เท่านั้นในเอนจิน (ไม่มี arrow / const / let / template literal)",
    !/=>/.test(code) && !/\bconst\s/.test(code) && !/\blet\s/.test(code) && code.indexOf("`") < 0);

  var pageSrc = fs.readFileSync(path.join(__dirname, "..", "public", "thai-dr-page.js"), "utf8");
  var pageCode = pageSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  t("ES5 เท่านั้นในหน้าเว็บ",
    !/=>/.test(pageCode) && !/\bconst\s/.test(pageCode) && !/\blet\s/.test(pageCode) &&
    pageCode.indexOf("`") < 0);
  t("หน้าเว็บไม่มีคำว่า buy/sell", !/\b(buy|sell)\b/i.test(pageCode));
}

console.log("== อัตราแปลงสภาพ และราคา DR ตามทฤษฎี ==");
{
  // ความหมาย "340 : 1" = DR 340 หน่วย ต่อหุ้นแม่ 1 หุ้น
  // พิสูจน์กับของจริงแล้ว: AAPL01 ที่ \$336.64 / 33.53 บาทต่อดอลลาร์ → 33.199 บาท
  // ราคาตลาดจริง 33.50 บาท ต่างกัน 0.9% = ช่วง premium ปกติ
  // ถ้าตีความกลับด้านจะได้ 0.003 บาท ซึ่งผิดเป็นหมื่นเท่า
  var r = E.parseRatio("340 : 1");
  t("อ่านอัตราแปลงสภาพได้", r != null && r.per === 340 && r.shares === 1, r);
  t("อ่านเลขมีลูกน้ำได้", (function () {
    var x = E.parseRatio("3,000 : 1");
    return x && x.per === 3000 && x.shares === 1;
  })());
  t("อ่านไม่ออก → null ไม่ใช่เดา", E.parseRatio("ไม่ทราบ") === null);
  t("ค่าว่าง → null", E.parseRatio("") === null && E.parseRatio(null) === null);
  t("หารศูนย์ → null", E.parseRatio("0 : 1") === null && E.parseRatio("340 : 0") === null);

  var THB_USD = 33.53;
  t("คิดราคาตามทฤษฎีตรงกับของจริง (AAPL01)",
    near(E.theoreticalDrPrice(336.64, THB_USD, E.parseRatio("340 : 1")), 33.199, 0.01),
    E.theoreticalDrPrice(336.64, THB_USD, E.parseRatio("340 : 1")));
  t("อัตราต่างกัน ราคาต่างกันตามสัดส่วน (AAPL03 = 3000:1)",
    near(E.theoreticalDrPrice(336.64, THB_USD, E.parseRatio("3,000 : 1")), 3.763, 0.01));
  t("ratio ใหญ่ขึ้น ราคาต่อหน่วยต้องถูกลง",
    E.theoreticalDrPrice(336.64, THB_USD, E.parseRatio("3,000 : 1")) <
    E.theoreticalDrPrice(336.64, THB_USD, E.parseRatio("340 : 1")));
  var THB_HKD = 33.53 / 7.8476;
  t("สกุลอื่นก็คิดถูก (BABA01 HKD)",
    near(E.theoreticalDrPrice(107, THB_HKD, E.parseRatio("44 : 1")), 10.39, 0.02),
    E.theoreticalDrPrice(107, THB_HKD, E.parseRatio("44 : 1")));

  t("ไม่มีราคาหุ้นแม่ → null", E.theoreticalDrPrice(null, THB_USD, r) === null);
  t("ไม่มีอัตราแลกเปลี่ยน → null", E.theoreticalDrPrice(336.64, null, r) === null);
  t("ไม่มี ratio → null", E.theoreticalDrPrice(336.64, THB_USD, null) === null);
  t("ราคาเป็น 0 → null ไม่ใช่ 0", E.theoreticalDrPrice(0, THB_USD, r) === null);
  t("ราคาติดลบ → null", E.theoreticalDrPrice(-5, THB_USD, r) === null);
  t("FX เป็น 0 → null (กันหารศูนย์)", E.theoreticalDrPrice(336.64, 0, r) === null);
  // ราคาที่คิดออกมาแล้วต้องเป็นบวกเสมอ — FX ติดลบ (ข้อมูลเพี้ยน) ต้องไม่หลุดออกไปเป็นราคา
  t("FX ติดลบ → null ไม่ใช่ราคาติดลบ", E.theoreticalDrPrice(336.64, -33.53, r) === null,
    E.theoreticalDrPrice(336.64, -33.53, r));
  t("ratio ติดลบ → null", E.theoreticalDrPrice(336.64, THB_USD, { per: -340, shares: 1 }) === null,
    E.theoreticalDrPrice(336.64, THB_USD, { per: -340, shares: 1 }));
  t("shares ติดลบ → null", E.theoreticalDrPrice(336.64, THB_USD, { per: 340, shares: -1 }) === null);
  t("ผลลัพธ์ที่คิดได้ต้องมากกว่า 0 เสมอ", (function () {
    var vals = [
      E.theoreticalDrPrice(336.64, THB_USD, r),
      E.theoreticalDrPrice(0.0001, THB_USD, { per: 100000, shares: 1 })
    ];
    return vals.every(function (v) { return v === null || v > 0; });
  })());

  t("ส่วนต่างจากทฤษฎีคิดถูก", near(E.premiumPct(33.5, 33.199), 0.9066, 0.001),
    E.premiumPct(33.5, 33.199));
  t("ถูกกว่าทฤษฎี → ติดลบ", E.premiumPct(32, 33.199) < 0);
  t("ขาดข้อมูล → null ไม่ใช่ 0", E.premiumPct(null, 33.2) === null && E.premiumPct(33.5, null) === null);
  t("ทฤษฎีเป็น 0 → null (กันหารศูนย์)", E.premiumPct(33.5, 0) === null);

  // สกุลเงินตามตลาด
  t("ตลาด Nasdaq = USD", E.currencyOf("The Nasdaq Stock Market") === "USD");
  t("ตลาดฮ่องกง = HKD", E.currencyOf("The Stock Exchange of Hong Kong Limited") === "HKD");
  t("ตลาดโตเกียว = JPY", E.currencyOf("Tokyo Stock Exchange") === "JPY");
  t("ตลาดที่ไม่รู้จัก → null ไม่เดา", E.currencyOf("Unknown Exchange") === null);
}

console.log("== แปลง ticker ของตลาดต้นทางจาก URL ทางการ ==");
{
  // ต้องใช้ URL ที่ SET ให้มา ไม่ใช่เดาจากชื่อย่อที่ SET ตั้งเอง
  // SET เรียก AIA แต่ตลาดฮ่องกงใช้เลข 1299 — เดาเองจะได้ราคาผิดตัว
  t("Nasdaq → ใช้ symbol ตรง ๆ", (function () {
    var x = E.providerTickerOf({ underlyingUrl: "https://www.nasdaq.com/market-activity/stocks/aapl" });
    return x && x.ticker === "AAPL" && x.ccy === "USD";
  })());
  t("NYSE → ตัด prefix ตลาดออก", (function () {
    var x = E.providerTickerOf({ underlyingUrl: "https://www.nyse.com/quote/XNYS:ABBV" });
    return x && x.ticker === "ABBV" && x.ccy === "USD";
  })());
  t("ฮ่องกง → เลข 4 หลัก + .HK (ไม่ใช่ชื่อย่อของ SET)", (function () {
    var x = E.providerTickerOf({ underlying: "AIA",
      underlyingUrl: "https://www.hkex.com.hk/Market-Data/Securities-Prices/Equities/Equities-Quote?sym=1299&sc_lang=en" });
    return x && x.ticker === "1299.HK" && x.ccy === "HKD";
  })(), E.providerTickerOf({ underlyingUrl: "https://www.hkex.com.hk/x?sym=1299&sc_lang=en" }));
  t("ฮ่องกงเลขน้อยหลัก → เติม 0 ข้างหน้า", (function () {
    var x = E.providerTickerOf({ underlyingUrl: "https://www.hkex.com.hk/x?sym=700&sc_lang=en" });
    return x && x.ticker === "0700.HK";
  })());
  t("โตเกียว → เลข 4 หลัก + .T", (function () {
    var x = E.providerTickerOf({ underlyingUrl: "https://www2.jpx.co.jp/tseHpFront/StockSearch.do?method=&callJorEFlg=1&topSearchStr=6857&x=0&y=0" });
    return x && x.ticker === "6857.T" && x.ccy === "JPY";
  })());
  t("ตลาดที่ยังไม่รองรับ → null ไม่เดา",
    E.providerTickerOf({ underlyingUrl: "https://live.euronext.com/en/product/equities/NL0000235190-XPAR" }) === null);
  t("ไม่มี URL → null", E.providerTickerOf({}) === null && E.providerTickerOf(null) === null);
}

console.log("== priceListings: เทียบราคาทุก DR ของหุ้นตัวเดียวกัน ==");
{
  // เคสจริง: BABA มี 7 DR อัตราแปลงสภาพ 5 แบบ ราคาตามทฤษฎีต้องสอดคล้องกันหมด
  var rows = [
    dr({ symbol: "BABA01", underlying: "BABA", underlyingName: "บริษัท ALIBABA", exchange: HKEX, ratio: "44 : 1" }),
    dr({ symbol: "BABA06", underlying: "BABA", underlyingName: "บริษัท ALIBABA", exchange: HKEX, ratio: "100 : 1" }),
    dr({ symbol: "BABA13", underlying: "BABA", underlyingName: "บริษัท ALIBABA", exchange: HKEX, ratio: "250 : 1" })
  ];
  rows[0].last = 10.4; rows[1].last = 4.58; rows[2].last = 1.89;
  var inv = E.buildInventory(rows);
  var a = inv.assets[0];
  // drListings เรียงตาม DR symbol → BABA01, BABA06, BABA13
  t("ราคาตลาดของ DR ถูกเก็บมาด้วย (เรียงตาม symbol)",
    a.drListings.map(function (d) { return d.drSymbol + "=" + d.marketThb; }).join(",") ===
    "BABA01=10.4,BABA06=4.58,BABA13=1.89",
    a.drListings.map(function (d) { return d.drSymbol + "=" + d.marketThb; }));

  var fx = { HKD: 33.53 / 7.8476 };
  var priced = E.priceListings(a, { price: 107, currency: "HKD" }, fx);
  t("คิดราคาตามทฤษฎีครบทุก DR",
    priced.every(function (d) { return d.theoreticalThb != null && d.theoreticalThb > 0; }),
    priced.map(function (d) { return d.theoreticalThb; }));
  t("DR ทุกตัวอ้างหุ้นเดียวกัน → มูลค่าต่อหุ้นต้องเท่ากัน", (function () {
    var vals = priced.map(function (d) { return d.theoreticalThb * d.ratioPer / d.ratioShares; });
    for (var i = 1; i < vals.length; i++) if (!near(vals[i], vals[0], 0.001)) return false;
    return true;
  })());
  t("คิดส่วนต่างจากทฤษฎีได้", priced.every(function (d) { return d.premiumPct != null; }));
  t("จับได้ว่า BABA13 แพงกว่าพี่น้อง", (function () {
    var b13 = priced.filter(function (d) { return d.drSymbol === "BABA13"; })[0];
    var b01 = priced.filter(function (d) { return d.drSymbol === "BABA01"; })[0];
    return b13.premiumPct > b01.premiumPct + 2;
  })(), priced.map(function (d) { return [d.drSymbol, d.premiumPct]; }));
  t("ไม่แก้ข้อมูลเดิม (ไม่ mutate)", a.drListings[0].theoreticalThb === undefined);

  // ไม่มีราคาหุ้นแม่ → ต้องบอกเหตุผล ไม่ใช่เงียบ
  var noQuote = E.priceListings(a, null, fx);
  t("ไม่มีราคาหุ้นแม่ → ทฤษฎีเป็น null", noQuote.every(function (d) { return d.theoreticalThb === null; }));
  t("และบอกเหตุผลให้หน้าเว็บอธิบายได้",
    noQuote.every(function (d) { return d.priceNote === "ยังไม่มีราคาหุ้นแม่"; }),
    noQuote[0].priceNote);
  var noFx = E.priceListings(a, { price: 107, currency: "HKD" }, {});
  t("ไม่มีอัตราแลกเปลี่ยน → บอกเหตุผลเฉพาะเจาะจง",
    noFx[0].priceNote.indexOf("อัตราแลกเปลี่ยน") >= 0, noFx[0].priceNote);
  // อ่าน ratio ไม่ออก
  var badRatio = E.buildInventory([
    dr({ symbol: "ZZ01", underlying: "ZZ", underlyingName: "ZZ", exchange: HKEX, ratio: "ไม่ระบุ" })
  ]);
  var bp = E.priceListings(badRatio.assets[0], { price: 100, currency: "HKD" }, fx);
  t("อ่านอัตราแปลงสภาพไม่ได้ → บอกเหตุผล",
    bp[0].theoreticalThb === null && bp[0].priceNote === "อ่านอัตราแปลงสภาพไม่ได้", bp[0].priceNote);

  // DR ที่ยังไม่ซื้อขายวันนี้ ใช้ราคาเสนอขายแทน last
  var offerOnly = E.buildInventory([(function () {
    var r = dr({ symbol: "OF01", underlying: "OF", underlyingName: "OF", exchange: HKEX, ratio: "10 : 1" });
    r.last = null; r.offer = { volume: 100, price: "5.25" };
    return r;
  })()]);
  t("ไม่มี last → ใช้ราคาเสนอขาย", offerOnly.assets[0].drListings[0].marketThb === 5.25,
    offerOnly.assets[0].drListings[0].marketThb);
  t("และบอกว่าเป็นราคาเสนอขาย", offerOnly.assets[0].drListings[0].marketThbBasis === "offer");
  // last = 0 ต้องไม่ถูกอ่านว่าเป็นราคาจริง
  var zero = E.buildInventory([(function () {
    var r = dr({ symbol: "Z01", underlying: "Z", underlyingName: "Z", exchange: HKEX });
    r.last = 0; r.offer = { volume: 1, price: "2.00" };
    return r;
  })()]);
  t("last = 0 ไม่ถูกนับเป็นราคา", zero.assets[0].drListings[0].marketThb === 2,
    zero.assets[0].drListings[0].marketThb);
}

console.log("== ราคาล่าสุด · ลงจาก ATH · ลงจาก ATH 1 ปี ==");
{
  // สร้างแท่งราคาที่รู้คำตอบแน่นอน
  //   ทำจุดสูงสุดตลอดกาล 200 เมื่อ 3 ปีก่อน แล้วลงมา
  //   ทำจุดสูงสุดใน 1 ปี 150 เมื่อ 6 เดือนก่อน แล้วปิดที่ 100
  function bar(d, c) { return { date: d, close: c }; }
  function daysAgo(n) {
    return new Date(Date.UTC(2026, 9, 12) - n * 86400000).toISOString().slice(0, 10);
  }
  var bars = [
    bar(daysAgo(1200), 50),
    bar(daysAgo(1100), 200),   // ATH ตลอดกาล
    bar(daysAgo(900), 120),
    bar(daysAgo(400), 110),
    bar(daysAgo(180), 150),    // ATH ใน 1 ปี
    bar(daysAgo(30), 130),
    bar(daysAgo(0), 100)       // ราคาล่าสุด
  ];
  var s = E.priceStats(bars, { currency: "USD" });
  t("คืนสถิติได้", !!s, s);
  t("ราคาล่าสุด = แท่งสุดท้าย", s.last === 100, s.last);
  t("วันที่ของราคาล่าสุดถูก", s.lastDate === daysAgo(0), s.lastDate);
  t("ATH ตลอดกาล = 200", s.ath === 200, s.ath);
  t("วันที่ ATH ถูก", s.athDate === daysAgo(1100), s.athDate);
  t("ลงจาก ATH = -50%", near(s.fromAthPct, -50, 1e-9), s.fromAthPct);
  t("ATH ใน 1 ปี = 150 (ไม่ใช่ 200)", s.ath1y === 150, s.ath1y);
  t("ลงจาก ATH 1 ปี = -33.33%", near(s.fromAth1yPct, -100 / 3, 1e-9), s.fromAth1yPct);
  t("ลงจาก ATH 1 ปี ตื้นกว่าลงจาก ATH ตลอดกาลเสมอ", s.fromAth1yPct > s.fromAthPct);
  t("บอกสกุลเงิน", s.currency === "USD");
  t("นับจำนวนแท่ง", s.bars === 7, s.bars);

  // ATH ต้องคิดจากราคาปิด ไม่ใช่ราคาสูงสุดระหว่างวัน
  var withHigh = [
    { date: daysAgo(100), close: 100, high: 999 },
    { date: daysAgo(0), close: 90, high: 95 }
  ];
  var sh = E.priceStats(withHigh);
  t("ATH ใช้ราคาปิด ไม่ใช่ high (999 ต้องไม่ถูกใช้)", sh.ath === 100, sh.ath);
  t("ลงจาก ATH คิดจากราคาปิด", near(sh.fromAthPct, -10, 1e-9), sh.fromAthPct);

  // อยู่ที่ ATH พอดี → 0% ไม่ใช่ null
  var atPeak = E.priceStats([{ date: daysAgo(10), close: 50 }, { date: daysAgo(0), close: 80 }]);
  t("ราคาล่าสุดคือ ATH → ลง 0%", atPeak.fromAthPct === 0, atPeak.fromAthPct);
  t("ATH = ราคาล่าสุด", atPeak.ath === 80);

  // หน้าต่าง 1 ปีนับจากแท่งล่าสุด ไม่ใช่จากวันนี้
  // (ถ้าข้อมูลหยุดไป 2 ปี การนับจากวันนี้จะได้หน้าต่างว่าง)
  var stale = E.priceStats([
    bar(daysAgo(900), 100),
    bar(daysAgo(800), 160),   // อยู่ใน 1 ปีก่อนแท่งล่าสุด
    bar(daysAgo(700), 120)    // แท่งล่าสุด
  ]);
  t("ข้อมูลเก่า: ยังหา ATH 1 ปีได้ (นับจากแท่งล่าสุด)", stale.ath1y === 160, stale.ath1y);
  t("ข้อมูลเก่า: ลงจาก ATH 1 ปี = -25%", near(stale.fromAth1yPct, -25, 1e-9), stale.fromAth1yPct);

  // ข้อมูลสั้นกว่า 1 ปี → ต้องบอกว่ายังไม่ครบปี
  var shortHist = E.priceStats([bar(daysAgo(60), 100), bar(daysAgo(0), 80)]);
  t("ข้อมูลสั้นกว่า 1 ปี → coversFullYear = false", shortHist.coversFullYear === false);
  t("แต่ยังคิด ATH 1 ปีจากที่มีได้", shortHist.ath1y === 100 && near(shortHist.fromAth1yPct, -20, 1e-9));
  var longHist = E.priceStats([bar(daysAgo(800), 100), bar(daysAgo(0), 80)]);
  t("ข้อมูลยาวกว่า 1 ปี → coversFullYear = true", longHist.coversFullYear === true,
    longHist.coversFullYear);
  t("coversFullYear แยกสองกรณีได้จริง (ไม่ใช่ค่าคงที่)",
    longHist.coversFullYear !== shortHist.coversFullYear,
    [longHist.coversFullYear, shortHist.coversFullYear]);

  // "1 ปี" ต้องเป็น 365 วันปฏิทิน ไม่ใช่ 252 วันทำการ
  // ยอดที่ 300 วันก่อน ต้องอยู่ในหน้าต่าง 1 ปี (ถ้าใช้ 252 จะหลุดออกไป)
  var cal = E.priceStats([
    bar(daysAgo(1000), 500),   // ATH ตลอดกาล นอกหน้าต่าง
    bar(daysAgo(300), 200),    // อยู่ใน 365 วัน แต่อยู่นอก 252 วัน
    bar(daysAgo(10), 100)
  ]);
  t("หน้าต่าง 1 ปี = 365 วันปฏิทิน (ยอดที่ 300 วันก่อนต้องนับ)",
    cal.ath1y === 200, cal.ath1y);
  t("ลงจาก ATH 1 ปีคิดจากยอด 200", near(cal.fromAth1yPct, -50, 1e-9), cal.fromAth1yPct);

  // เคสขอบ
  t("ไม่มีแท่งเลย → null", E.priceStats([]) === null && E.priceStats(null) === null);
  t("แท่งเสียทั้งหมด → null",
    E.priceStats([{ date: "มั่ว", close: 10 }, { date: "2026-01-01", close: null }]) === null);
  t("แท่งเสียบางส่วน → ใช้เฉพาะที่ดี", (function () {
    var x = E.priceStats([
      { date: "2026-01-01", close: 100 },
      { date: "ไม่ใช่วันที่", close: 999 },
      { date: "2026-06-01", close: 0 },
      { date: "2026-10-01", close: 80 }
    ]);
    return x && x.ath === 100 && x.last === 80 && x.bars === 2;
  })());
  t("ราคาเป็น 0 หรือติดลบถูกข้าม", (function () {
    var x = E.priceStats([{ date: "2026-01-01", close: -5 }, { date: "2026-02-01", close: 50 }]);
    return x && x.bars === 1 && x.ath === 50;
  })());
  t("แท่งไม่เรียงวันที่ ก็ยังหาราคาล่าสุดถูก", (function () {
    var x = E.priceStats([
      { date: "2026-10-01", close: 80 },
      { date: "2026-01-01", close: 100 },
      { date: "2026-05-01", close: 90 }
    ]);
    return x.last === 80 && x.lastDate === "2026-10-01" && x.ath === 100;
  })());
  t("รับวันที่แบบ ISO timestamp ได้", (function () {
    var x = E.priceStats([
      { date: "2026-01-01T00:00:00+07:00", close: 100 },
      { date: "2026-10-01T00:00:00+07:00", close: 80 }
    ]);
    return x && x.bars === 2 && x.lastDate === "2026-10-01";
  })());
  // ปัดเศษต้องอยู่ชั้นแสดงผลเท่านั้น — เอนจินคืนค่าดิบ
  // (1-3)/3 = -66.6666...% ถ้าถูกปัดเป็น -66.67 จะต่างจากค่าจริงเกิน 1e-9
  t("ไม่ปัดเศษ % ในเอนจิน", (function () {
    var x = E.priceStats([{ date: "2026-01-01", close: 3 }, { date: "2026-10-01", close: 1 }]);
    return near(x.fromAthPct, -200 / 3, 1e-12) && x.fromAthPct !== -66.67;
  })(), E.priceStats([{ date: "2026-01-01", close: 3 }, { date: "2026-10-01", close: 1 }]).fromAthPct);
  t("ไม่ปัดเศษราคาในเอนจิน", (function () {
    var x = E.priceStats([{ date: "2026-01-01", close: 1.23456789 },
      { date: "2026-10-01", close: 1.111111111 }]);
    return x.last === 1.111111111 && x.ath === 1.23456789;
  })(), E.priceStats([{ date: "2026-10-01", close: 1.111111111 }]).last);

  // ---- ประวัติสั้น: "ATH" ไม่ใช่ ATH จริง ต้องบอกให้ตรง ----
  // เคสจริงที่วัดมาแล้ว (สแกน 257 สินทรัพย์): 18 ตัวมีประวัติ < 2 ปี
  //   2513.HK  186 แท่ง ตั้งแต่ 2026-01-08 → แสดง -73.4%
  //   CBRS     103 แท่ง ตั้งแต่ 2026-05-14 → แสดง -47.2%
  // ตัวเลขพวกนี้ลอยขึ้นหัวตารางเมื่อเรียง "ลงจาก ATH" ปนกับ BABA -65.2%
  // ที่มาจากยอดปี 2020 (ข้อมูล 10 ปี) — คนละความหมายกันสิ้นเชิง
  var SHORT_BARS = 504;   // 2 ปีทำการ
  t("เอนจินบอกจำนวนแท่งที่ใช้คิด ATH", (function () {
    var x = E.priceStats([bar(daysAgo(100), 100), bar(daysAgo(0), 50)]);
    return x.bars === 2;
  })());
  t("ประวัติสั้น → ติดธงว่า ATH เชื่อไม่ได้เต็มที่", (function () {
    var rows = [];
    for (var i = 200; i >= 0; i--) rows.push(bar(daysAgo(i), 100 - i * 0.1));
    var x = E.priceStats(rows);
    return x.athReliable === false;
  })(), (function () {
    var rows = [];
    for (var i = 200; i >= 0; i--) rows.push(bar(daysAgo(i), 100 - i * 0.1));
    return E.priceStats(rows).athReliable;
  })());
  t("ประวัติยาว → ATH เชื่อได้", (function () {
    var rows = [];
    for (var i = 900; i >= 0; i--) rows.push(bar(daysAgo(i), 100 + (i % 7)));
    return E.priceStats(rows).athReliable === true;
  })());
  t("บอกช่วงเวลาที่ข้อมูลครอบคลุม (ปี)", (function () {
    var rows = [];
    for (var i = 200; i >= 0; i--) rows.push(bar(daysAgo(i), 100));
    var x = E.priceStats(rows);
    return x.historyDays != null && x.historyDays >= 199 && x.historyDays <= 201;
  })(), (function () {
    var rows = [];
    for (var i = 200; i >= 0; i--) rows.push(bar(daysAgo(i), 100));
    return E.priceStats(rows).historyDays;
  })());
  t("เกณฑ์วัดจากช่วงวันจริง ไม่ใช่จำนวนแท่ง", (function () {
    // ข้อมูลห่าง ๆ (สัปดาห์ละแท่ง) 3 ปี = 156 แท่ง แต่ครอบคลุม 3 ปีจริง
    var rows = [];
    for (var i = 156; i >= 0; i--) rows.push(bar(daysAgo(i * 7), 100 + i));
    var x = E.priceStats(rows);
    return x.athReliable === true;
  })(), (function () {
    var rows = [];
    for (var i = 156; i >= 0; i--) rows.push(bar(daysAgo(i * 7), 100 + i));
    var x = E.priceStats(rows);
    return [x.bars, x.historyDays, x.athReliable];
  })());
  // แท่งเดียว: เทียบราคากับตัวมันเอง ไม่ใช่การวัดการย่อ
  // 0% อ่านว่า "อยู่ที่จุดสูงสุด" ซึ่งเป็นข้อความที่มั่นใจเกินจริงที่สุดในหน้า
  t("แท่งเดียว → ไม่ใช่ 'อยู่ที่จุดสูงสุด' แต่คือวัดไม่ได้", (function () {
    var x = E.priceStats([bar(daysAgo(0), 100)]);
    return x.athReliable === false && x.fromAthPct === null && x.fromAth1yPct === null;
  })(), (function () {
    var x = E.priceStats([bar(daysAgo(0), 100)]);
    return [x.fromAthPct, x.fromAth1yPct];
  })());
  t("แท่งเดียว → ยังรู้ราคาและยอดสูงสุดอยู่ ไม่ได้ทิ้งข้อมูล", (function () {
    var x = E.priceStats([bar(daysAgo(0), 100)]);
    return x.last === 100 && x.ath === 100 && x.bars === 1;
  })());

  // ---- ความหนาแน่นของข้อมูล: ช่วงวันอย่างเดียวถูกปลอมได้ด้วยแท่งเดียว ----
  // ของจริง: ฟีดที่มีแท่งค้างเก่า 1 แท่ง + ข้อมูลจริง 103 วัน
  // → historyDays = 4252 วัน ทั้งที่รู้ราคาจริงแค่ 103 วัน
  t("แท่งค้างเก่า 1 แท่ง ต้องไม่ทำให้ ATH กลายเป็นเชื่อถือได้", (function () {
    var rows = [bar(daysAgo(4252), 20)];
    for (var i = 102; i >= 0; i--) rows.push(bar(daysAgo(i), 100 - i * 0.3));
    var x = E.priceStats(rows);
    return x.athReliable === false;
  })(), (function () {
    var rows = [bar(daysAgo(4252), 20)];
    for (var i = 102; i >= 0; i--) rows.push(bar(daysAgo(i), 100 - i * 0.3));
    var x = E.priceStats(rows);
    return [x.bars, x.historyDays, x.athReliable];
  })());
  t("แต่ยังรายงานช่วงวันจริงตามตรง ไม่กลบข้อมูล", (function () {
    var rows = [bar(daysAgo(4252), 20)];
    for (var i = 102; i >= 0; i--) rows.push(bar(daysAgo(i), 100 - i * 0.3));
    var x = E.priceStats(rows);
    return x.historyDays >= 4250 && x.historyDays <= 4254;
  })());
  t("2 แท่งห่างกัน 730 วัน → เชื่อไม่ได้ (บางเกินไป)", (function () {
    var x = E.priceStats([bar(daysAgo(730), 50), bar(daysAgo(0), 100)]);
    return x.athReliable === false;
  })());
  t("ฟีดบางแต่สม่ำเสมอ 2 ปี → ยังเชื่อได้ ไม่ลงโทษ", (function () {
    // รายสัปดาห์ 3 ปี = 157 แท่ง — ฟีดจริงที่ถูกต้อง ห้ามตัดทิ้ง
    var rows = [];
    for (var i = 156; i >= 0; i--) rows.push(bar(daysAgo(i * 7), 100 + i));
    return E.priceStats(rows).athReliable === true;
  })());
  t("แท่งถี่แต่ช่วงสั้น (600 แท่ง/400 วัน) → เชื่อไม่ได้", (function () {
    var rows = [];
    for (var i = 599; i >= 0; i--) rows.push(bar(daysAgo(Math.round(i * 400 / 599)), 100 + i));
    var x = E.priceStats(rows);
    return x.athReliable === false;
  })(), (function () {
    var rows = [];
    for (var i = 599; i >= 0; i--) rows.push(bar(daysAgo(Math.round(i * 400 / 599)), 100 + i));
    var x = E.priceStats(rows);
    return [x.bars, x.historyDays, x.athReliable];
  })());

  // เกณฑ์ต้องมีที่มาเดียว — เทสต์ห้ามถือเลขของตัวเอง
  t("เอนจินเปิดเกณฑ์ ATH_MIN_DAYS ให้อ้างอิงได้",
    E.ATH_MIN_DAYS === 730, E.ATH_MIN_DAYS);
  t("ขอบเกณฑ์: ต่ำกว่าเกณฑ์ 1 วัน → เชื่อไม่ได้", (function () {
    var n = 400, d = E.ATH_MIN_DAYS - 1, rows = [];
    for (var i = n - 1; i >= 0; i--) rows.push(bar(daysAgo(Math.round(i * d / (n - 1))), 100 + i));
    return E.priceStats(rows).athReliable === false;
  })());
  t("ขอบเกณฑ์: เท่าเกณฑ์พอดี → เชื่อได้", (function () {
    var n = 400, d = E.ATH_MIN_DAYS, rows = [];
    for (var i = n - 1; i >= 0; i--) rows.push(bar(daysAgo(Math.round(i * d / (n - 1))), 100 + i));
    return E.priceStats(rows).athReliable === true;
  })());

  // ฟังก์ชันย่อย
  t("drawdownPct: ต่ำกว่ายอด → ติดลบ", near(E.drawdownPct(80, 100), -20, 1e-9));
  t("drawdownPct: เท่ายอด → 0", E.drawdownPct(100, 100) === 0);
  t("drawdownPct: ขาดข้อมูล → null",
    E.drawdownPct(null, 100) === null && E.drawdownPct(80, null) === null);
  t("drawdownPct: ยอดเป็น 0 → null (กันหารศูนย์)", E.drawdownPct(80, 0) === null);
  t("peakClose: หายอดได้", (function () {
    var p = E.peakClose([{ date: "2026-01-01", close: 10 }, { date: "2026-02-01", close: 30 }]);
    return p && p.price === 30 && p.date === "2026-02-01";
  })());
  t("peakClose: ไม่มีแท่งใช้ได้ → null", E.peakClose([]) === null);
}

console.log("== การเรียงลำดับ (ตรรกะเดียวกับที่หน้าเว็บใช้) ==");
{
  // ค่าว่างต้องไปท้ายเสมอ ไม่ว่าจะเรียงทางไหน
  // ไม่งั้นเรียงจากน้อยไปมากจะเจอ "—" เต็มหน้าแรก
  var items = [
    { canonicalName: "B", drCount: 2, newestListingDate: "2026-01-01" },
    { canonicalName: "A", drCount: 5, newestListingDate: null },
    { canonicalName: "C", drCount: 1, newestListingDate: "2026-05-01" }
  ];
  function sortBy(field, dir) {
    var copy = items.slice();
    copy.sort(function (x, y) {
      var get = { name: function (o) { return o.canonicalName; },
        drs: function (o) { return o.drCount; },
        newest: function (o) { return o.newestListingDate; } }[field];
      var a = get(x), b = get(y);
      var ae = a == null || a === "", be = b == null || b === "";
      if (ae && be) return 0;
      if (ae) return 1;
      if (be) return -1;
      if (typeof a === "number") return (a - b) * dir;
      return a < b ? -dir : a > b ? dir : 0;
    });
    return copy;
  }
  t("เรียงชื่อ A→Z", sortBy("name", 1).map(function (o) { return o.canonicalName; }).join("") === "ABC");
  t("เรียงชื่อ Z→A", sortBy("name", -1).map(function (o) { return o.canonicalName; }).join("") === "CBA");
  t("เรียงจำนวน DR มาก→น้อย", sortBy("drs", -1)[0].drCount === 5);
  t("ค่าว่างไปท้ายเสมอเมื่อเรียงน้อย→มาก",
    sortBy("newest", 1)[2].newestListingDate === null);
  t("ค่าว่างไปท้ายเสมอเมื่อเรียงมาก→น้อย",
    sortBy("newest", -1)[2].newestListingDate === null);
}

console.log("== กลุ่มธุรกิจ + ป้าย AI ==");
{
  var SEC = require("../public/thai-dr-sectors.js");

  // หุ้นที่อยู่ในตาราง
  t("NVDA = เซมิคอนดักเตอร์ + AI", (function () {
    var h = SEC.lookup("NVDA", "", "6");
    return h.sector === "semi" && h.isAi === true && h.source === "curated";
  })(), SEC.lookup("NVDA", "", "6"));
  t("KO = อุปโภคบริโภค ไม่ติด AI", (function () {
    var h = SEC.lookup("KO", "", "6");
    return h.sector === "consumer" && h.isAi === false;
  })());
  // เคสที่ตัดสินใจยาก: ธุรกิจหลักคือค้าปลีก แต่ AWS คือ AI infra
  t("AMZN = ค้าปลีก แต่ติดป้าย AI (กลุ่มหลักอันเดียว + ป้ายแยก)", (function () {
    var h = SEC.lookup("AMZN", "", "6");
    return h.sector === "ecommerce" && h.isAi === true;
  })(), SEC.lookup("AMZN", "", "6"));
  t("CEG = พลังงาน + AI (ขายไฟให้ดาต้าเซ็นเตอร์)", (function () {
    var h = SEC.lookup("CEG", "", "6");
    return h.sector === "energy" && h.isAi === true;
  })());
  t("LVMH = สินค้าหรู ไม่ติด AI", SEC.lookup("LVMH", "", "6").isAi === false);
  t("JPMUS = ธนาคาร ไม่ติด AI", (function () {
    var h = SEC.lookup("JPMUS", "", "6");
    return h.sector === "bank" && !h.isAi;
  })());

  // กองทุน: ใช้กฎจากชื่อทางการ
  t("SOXX ETF = กองทุนรายอุตสาหกรรม + AI", (function () {
    var h = SEC.lookup("SOXX ETF", "ISHARES SEMICONDUCTOR ETF", "7");
    return h.sector === "fund_sector" && h.isAi === true && h.source === "fund-name-rule";
  })(), SEC.lookup("SOXX ETF", "ISHARES SEMICONDUCTOR ETF", "7"));
  t("กองทองคำ = สินค้าโภคภัณฑ์ ไม่ติด AI", (function () {
    var h = SEC.lookup("GOLDM ETF", "SPDR GOLD MINISHARES TRUST", "7");
    return h.sector === "fund_commodity" && !h.isAi;
  })());
  t("กองตราสารหนี้แยกออกมา", (function () {
    var h = SEC.lookup("BONDUS ETF", "PREMIA US TREASURY FLOATING RATE ETF", "7");
    return h.sector === "fund_bond";
  })());
  t("กองดัชนีกว้าง = กองทุนดัชนี", (function () {
    var h = SEC.lookup("IVV ETF", "ISHARES CORE S&P 500 ETF", "7");
    return h.sector === "fund_index" && !h.isAi;
  })());
  t("กองหุ่นยนต์/AI ติดป้าย AI", (function () {
    var h = SEC.lookup("CNROBOAI ETF", "GLOBAL X CHINA ROBOTICS AND AI ETF", "7");
    return h.isAi === true;
  })());

  // ไม่รู้จัก → unknown ไม่เดาจากชื่อ
  t("หุ้นที่ไม่อยู่ในตาราง → unknown ไม่เดา", (function () {
    var h = SEC.lookup("ZZZZZ", "บริษัท MYSTERY CORP", "6");
    return h.sector === "unknown" && h.isAi === false && h.source === "none";
  })(), SEC.lookup("ZZZZZ", "บริษัท MYSTERY", "6"));
  t("ชื่อว่าง → unknown", SEC.lookup("", "", "6").sector === "unknown");
  t("ทุกกลุ่มมีชื่อไทย", (function () {
    var k;
    for (k in SEC.MAP) {
      if (!Object.prototype.hasOwnProperty.call(SEC.MAP, k)) continue;
      if (!SEC.SECTOR_TH[SEC.MAP[k][0]]) return false;
    }
    return true;
  })());
  t("ค่า AI เป็น 0 หรือ 1 เท่านั้น", (function () {
    var k;
    for (k in SEC.MAP) {
      if (!Object.prototype.hasOwnProperty.call(SEC.MAP, k)) continue;
      var v = SEC.MAP[k][1];
      if (v !== 0 && v !== 1) return false;
    }
    return true;
  })());

  // engine ต่อข้อมูลเข้า inventory
  var secRows = [
    dr({ symbol: "NVDA01", underlying: "NVDA", underlyingName: "บริษัท NVIDIA CORPORATION (NVDA)", exchange: NASDAQ }),
    dr({ symbol: "KO80", underlying: "KO", underlyingName: "บริษัท THE COCA-COLA COMPANY (KO)", exchange: NASDAQ })
  ];
  var secInv = E.buildInventory(secRows);
  var byS2 = {};
  secInv.assets.forEach(function (a) { byS2[a.underlyingSymbol] = a; });
  t("engine ต่อกลุ่มธุรกิจเข้า asset", byS2["NVDA"].sectorTh === "เซมิคอนดักเตอร์",
    byS2["NVDA"].sectorTh);
  // ต้องเก็บรหัสกลุ่มด้วย ไม่ใช่แค่ชื่อไทย — ตัวกรอง/จัดกลุ่มอาจใช้รหัส
  t("engine ต่อรหัสกลุ่ม (ไม่ใช่แค่ชื่อไทย)",
    byS2["NVDA"].sector === "semi" && byS2["KO"].sector === "consumer",
    [byS2["NVDA"].sector, byS2["KO"].sector]);
  t("รหัสกลุ่มกับชื่อไทยตรงกัน",
    SEC.SECTOR_TH[byS2["NVDA"].sector] === byS2["NVDA"].sectorTh);
  t("engine ต่อป้าย AI เข้า asset", byS2["NVDA"].isAi === true && byS2["KO"].isAi === false);
  t("บอกที่มาของการจัดกลุ่ม", byS2["NVDA"].sectorSource === "curated");
  t("จัดกลุ่มตาม sectorTh ได้", (function () {
    var g = E.groupCounts(secInv.assets, "sectorTh");
    return g.length === 2;
  })());
}

console.log("== groupCounts ==");
{
  var rows = [
    dr({ symbol: "A01", underlying: "A", underlyingName: "A", exchange: NASDAQ }),
    dr({ symbol: "B01", underlying: "B", underlyingName: "B", exchange: NASDAQ }),
    dr({ symbol: "C01", underlying: "C", underlyingName: "C", exchange: HKEX })
  ];
  var inv = E.buildInventory(rows);
  var g = E.groupCounts(inv.assets, "geography");
  t("จัดกลุ่มตามภูมิภาคได้", g.length === 2, g);
  t("เรียงจากมากไปน้อย", g[0].count >= g[1].count);
  t("นับถูก", g[0].count === 2 && g[1].count === 1, g);
  t("อาร์เรย์ว่างไม่ throw", E.groupCounts([], "geography").length === 0);
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
