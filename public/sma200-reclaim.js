(function () {
  "use strict";
  // ============================================================
  // SMA200 RECLAIM — ชั้นหลักฐานเชิงเทคนิคของ Thai Catalyst Hunter
  //
  // ตอบคำถามเดียว: "ราคาปิดกลับขึ้นไปยืนเหนือเส้นค่าเฉลี่ย 200 วันหรือยัง"
  //
  // กฎเดียวที่นับ (สเปค §4):
  //   close[D-1] <= SMA200[D-1]   และ   close[D] > SMA200[D]
  //   ครอบทั้งกรณีทะลุขึ้นจากใต้เส้น และกรณีแตะเส้นแล้วปิดเหนือเส้น
  //   ไม่มีเพดานระยะห่าง ไม่มีขั้นต่ำระยะห่าง
  //
  // สิ่งที่โมดูลนี้ "ไม่ใช่" (สเปค §1 · §10 · §11 · §12 · §14 · §22):
  //   • ไม่ใช่ catalyst — ยก C3/C4/C5 ไม่ได้ ยก EARLY_CATALYST ไม่ได้
  //   • ไม่ใช่ตัวตัดสิน market recognition — engine เดิมยังเป็นเจ้าของสเกลนั้น
  //   • ไม่ลบล้าง value trap — ราคาที่ดีขึ้นไม่ได้แปลว่าธุรกิจหายเสื่อม
  //   • ไม่มีคะแนน ไม่มี percentile ไม่มีการจัดอันดับ — TRUE/FALSE + ตัวเลขบรรยาย
  //   • ไม่ใช่สัญญาณซื้อขาย
  //
  // ตำแหน่งในห่วงโซ่: Story → Catalyst → Business → Financial →
  //                   **Market Recognition / Technical** → Price Re-rating
  //
  // ห้ามออก NaN / Infinity / undefined จากทุกฟิลด์ที่เป็นตัวเลข
  // ============================================================

  var VERSION = "1.0.0";

  var SMA_PERIOD = 200;
  // หน้าต่างย้อนหลังที่ยอมให้มองหา "การกลับขึ้นเหนือเส้น" ครั้งล่าสุด
  // 60 วันทำการ ~3 เดือน — เป็นหลักฐาน "เร็ว ๆ นี้" ไม่ใช่ประวัติศาสตร์
  //
  // ตัวเลขนี้ผูกกับ cache ของหน้า Catalyst Hunter ด้วย: cache เก็บราคาไว้
  // 272 แท่ง (catalyst-page.js: slice(-CONFIG.bars.year - 20)) ดังนั้น
  // 200 + 60 = 260 <= 272 ทำให้ "สแกนสด" กับ "อ่านจาก cache" ได้คำตอบเดียวกันเป๊ะ
  // ถ้าจะเพิ่มค่านี้เกิน 72 ต้องขยาย cache ก่อน มิฉะนั้นสองเส้นทางจะตอบไม่ตรงกัน
  var LOOKBACK_BARS = 60;
  // ราคาปิดล่าสุดเก่ากว่านี้ = ข้อมูลไม่สด (ใช้เกณฑ์เดียวกับ valuation-engine.js)
  var STALE_DAYS = 7;

  // ---- เงื่อนไขวอลุ่มยืนยัน ----
  // วอลุ่ม "ของวันที่เกิดสัญญาณ" ต้องสูงกว่าค่าเฉลี่ย 10 วันทำการ "ก่อนหน้าวันนั้น" เกิน 20%
  // ค่าเฉลี่ยไม่รวมวันสัญญาณเอง — ถ้ารวม วันที่วอลุ่มพุ่งจะดันค่าเฉลี่ยขึ้นเอง
  // แล้วเกณฑ์จะอ่อนลงโดยอัตโนมัติ (ยิ่งพุ่งแรงยิ่งผ่านยาก) ซึ่งไม่ใช่สิ่งที่ต้องการ
  var VOLUME_LOOKBACK = 10;
  var VOLUME_MIN_PCT = 20;
  // ใน 10 วันนั้นต้องมีวอลุ่มที่ใช้ได้อย่างน้อยเท่านี้ จึงจะตัดสินได้
  // น้อยกว่านี้ = "ตรวจไม่ได้" (null) ไม่ใช่ "ไม่ผ่าน" (false)
  var VOLUME_MIN_SAMPLES = 6;

  var STATUS = {
    RECLAIM: "RECLAIM",
    NO_RECLAIM: "NO_RECLAIM",
    DATA_INSUFFICIENT: "DATA_INSUFFICIENT",
    DATA_UNAVAILABLE: "DATA_UNAVAILABLE",
    DATA_STALE: "DATA_STALE",
  };
  var STATUS_TH = {
    RECLAIM: "กลับขึ้นยืนเหนือ SMA200",
    NO_RECLAIM: "ยังไม่พบการกลับขึ้นเหนือ SMA200",
    DATA_INSUFFICIENT: "ประวัติราคาไม่พอคำนวณ SMA200",
    DATA_UNAVAILABLE: "ไม่มีข้อมูลราคาให้ตรวจ",
    DATA_STALE: "ข้อมูลราคาไม่สด",
  };

  // ---------------- utils ----------------
  function fin(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  // ปัดเศษชั้นแสดงผลเท่านั้น — ตัวเปรียบเทียบด้านล่างใช้ค่าดิบทั้งหมด
  function r2(v) { return v == null || !isFinite(v) ? null : Math.round(v * 100) / 100; }

  function isYmd(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  // แปลง YYYY-MM-DD เป็นมิลลิวินาที UTC — เลี่ยงการตีความเขตเวลาของ Date.parse
  function ymdMs(s) {
    if (!isYmd(s)) return null;
    var y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
    if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;
    var ms = Date.UTC(y, m - 1, d);
    return isFinite(ms) ? ms : null;
  }
  function daysBetween(fromYmd, toYmd) {
    var a = ymdMs(fromYmd), b = ymdMs(toYmd);
    if (a == null || b == null) return null;
    return Math.round((b - a) / 86400000);
  }

  // วันที่ "วันนี้" ตามเวลาไทย — ตลาดที่สแกนคือ SET/mai จึงต้องใช้ปฏิทินไทย
  // ทุกจุดที่เรียกใช้ส่ง today เข้ามาได้เสมอ (เทสต์ต้องกำหนดเองเพื่อไม่ผูกกับนาฬิกาจริง)
  function todayBangkok() {
    try {
      var s = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      if (isYmd(s)) return s;
    } catch (e) { /* ตกไปใช้ UTC ด้านล่าง */ }
    try {
      var iso = new Date().toISOString();
      return iso.slice(0, 10);
    } catch (e2) { return null; }
  }

  // ตัวคำนวณ SMA ของทั้งเว็บ — ห้ามเขียนสูตรซ้ำที่นี่ (สเปค §6)
  // หาไม่เจอ = ตอบ DATA_UNAVAILABLE ไม่ใช่คำนวณเอง
  function smaCalc() {
    if (typeof window !== "undefined" && window.AITechnicalIndicators &&
        typeof window.AITechnicalIndicators.calculateSMA === "function") {
      return window.AITechnicalIndicators.calculateSMA;
    }
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try {
        var TI = require("./technical-indicators.js");
        if (TI && typeof TI.calculateSMA === "function") return TI.calculateSMA;
      } catch (e) { /* ไม่มีก็ตอบว่าไม่มี */ }
    }
    return null;
  }

  function emptyResult(status, note, extra) {
    var out = {
      type: "SMA200_RECLAIM",
      version: VERSION,
      status: status,
      statusThai: STATUS_TH[status] || status,
      detected: false,
      signalDate: null,
      previousClose: null,
      previousSma200: null,
      currentClose: null,
      currentSma200: null,
      previousDistancePct: null,
      currentDistancePct: null,
      reclaimStrengthPct: null,
      barsSinceSignal: null,
      // เงื่อนไขวอลุ่มของวันที่เกิดสัญญาณ
      volume: null,
      volumeAvg: null,
      volumeVsAvgPct: null,
      volumeConfirmed: null,
      volumeSamples: 0,
      volumeLookback: VOLUME_LOOKBACK,
      volumeMinPct: VOLUME_MIN_PCT,
      volumeNote: "",
      stillAbove: null,
      latestClose: null,
      latestSma200: null,
      latestDistancePct: null,
      asOf: null,
      freshnessKnown: false,
      staleDays: null,
      stale: false,
      excludedPartialBar: null,
      validObservations: 0,
      windowBars: 0,
      lookbackBars: LOOKBACK_BARS,
      smaPeriod: SMA_PERIOD,
      events: [],
      eventCount: 0,
      note: note || "",
    };
    if (extra) {
      for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k]; }
    }
    return out;
  }

  // ============================================================
  // เงื่อนไขวอลุ่มยืนยัน ณ วันที่เกิดสัญญาณ
  //   vols  = ชุดวอลุ่มที่เรียงตรงกับราคาแล้ว (null = วันที่ใช้ไม่ได้)
  //   k     = ดัชนีของวันที่เกิดสัญญาณ
  //   ผลลัพธ์ confirmed: true = ผ่าน · false = ตรวจแล้วไม่ผ่าน · null = ตรวจไม่ได้
  // "ตรวจไม่ได้" ต้องแยกจาก "ไม่ผ่าน" เสมอ — ไม่มีข้อมูลวอลุ่มไม่ได้แปลว่าวอลุ่มไม่มา
  // ============================================================
  function volumeCheck(vols, k, minPct) {
    var out = { volume: null, avg: null, vsAvgPct: null, confirmed: null,
      samples: 0, lookback: VOLUME_LOOKBACK, minPct: minPct, note: "" };
    if (!Array.isArray(vols)) { out.note = "ไม่มีข้อมูลวอลุ่ม"; return out; }
    var v = fin(vols[k]);
    if (v == null || !(v > 0)) { out.note = "ไม่มีวอลุ่มของวันที่เกิดสัญญาณ"; return out; }
    out.volume = v;

    var start = k - VOLUME_LOOKBACK;
    if (start < 0) { out.note = "มีวันก่อนหน้าไม่ครบ " + VOLUME_LOOKBACK + " วัน"; return out; }
    var sum = 0, cnt = 0;
    for (var j = start; j < k; j++) {           // ไม่รวมวันสัญญาณเอง
      var x = fin(vols[j]);
      if (x == null || !(x > 0)) continue;
      sum += x; cnt++;
    }
    out.samples = cnt;
    if (cnt < VOLUME_MIN_SAMPLES) {
      out.note = "วอลุ่มย้อนหลังใช้ได้เพียง " + cnt + " จาก " + VOLUME_LOOKBACK +
        " วัน — ต้องมีอย่างน้อย " + VOLUME_MIN_SAMPLES + " วันจึงจะตัดสินได้";
      return out;
    }
    var avg = sum / cnt;
    if (!(avg > 0) || !isFinite(avg)) { out.note = "ค่าเฉลี่ยวอลุ่มใช้ไม่ได้"; return out; }
    out.avg = avg;
    var pctv = (v / avg - 1) * 100;
    if (!isFinite(pctv)) { out.note = "คำนวณส่วนต่างวอลุ่มไม่ได้"; return out; }
    out.vsAvgPct = pctv;
    out.confirmed = pctv > minPct;              // "มากกว่า 20%" = เกินจริง ไม่ใช่เท่ากับ
    out.note = out.confirmed
      ? "วอลุ่มวันสัญญาณสูงกว่าค่าเฉลี่ย " + VOLUME_LOOKBACK + " วันก่อนหน้า " +
        (Math.round(pctv * 10) / 10) + "% (เกณฑ์ > " + minPct + "%)"
      : "วอลุ่มวันสัญญาณสูงกว่าค่าเฉลี่ย " + VOLUME_LOOKBACK + " วันก่อนหน้าเพียง " +
        (Math.round(pctv * 10) / 10) + "% (ไม่ถึงเกณฑ์ > " + minPct + "%)";
    return out;
  }

  // ระยะห่างจากเส้น เป็น % ของเส้น — ฟิลด์บรรยาย ไม่ใช่คะแนน (สเปค §8)
  function distPct(close, sma) {
    if (close == null || sma == null || !(sma > 0)) return null;
    var v = (close / sma - 1) * 100;
    return isFinite(v) ? v : null;
  }

  // ============================================================
  // detect — จุดเข้าเดียวของโมดูล
  //   opts.closes  : ราคาปิดรายวัน เรียงเก่า → ใหม่
  //   opts.dates   : วันที่คู่กัน (YYYY-MM-DD) ความยาวเท่ากัน
  //   opts.today   : วันอ้างอิง (ไม่ส่ง = วันนี้ตามเวลาไทย)
  //   opts.lookbackBars / opts.staleDays : ปรับได้เพื่อทดสอบ
  // ============================================================
  function detect(opts) {
    opts = opts || {};
    var closesIn = opts.closes;
    var datesIn = Array.isArray(opts.dates) ? opts.dates : [];
    var volsIn = Array.isArray(opts.volumes) ? opts.volumes : null;
    var volMinPct = fin(opts.volumeMinPct);
    volMinPct = volMinPct == null ? VOLUME_MIN_PCT : volMinPct;
    var lookback = fin(opts.lookbackBars);
    lookback = lookback != null && lookback >= 1 ? Math.floor(Math.min(lookback, 500)) : LOOKBACK_BARS;
    var staleLimit = fin(opts.staleDays);
    staleLimit = staleLimit != null && staleLimit >= 0 ? staleLimit : STALE_DAYS;
    var today = isYmd(opts.today) ? opts.today : todayBangkok();

    var sma = smaCalc();
    if (!sma) {
      return emptyResult(STATUS.DATA_UNAVAILABLE,
        "ไม่พบตัวคำนวณ SMA ของระบบ (technical-indicators.js) — โมดูลนี้ไม่คำนวณเอง",
        { lookbackBars: lookback });
    }
    if (!Array.isArray(closesIn) || !closesIn.length) {
      return emptyResult(STATUS.DATA_UNAVAILABLE, "ไม่มีชุดราคาปิดให้ตรวจ", { lookbackBars: lookback });
    }

    // ---- 1) ตัดแท่งของ "วันนี้" ทิ้ง — อาจเป็นแท่งที่ยังไม่ปิด (สเปค §16) ----
    // ตัดแบบไม่มีเงื่อนไข: ไม่มีทางรู้จากข้อมูลว่าตลาดปิดแล้วหรือยัง
    // ผลข้างเคียงที่ยอมรับ: สัญญาณของวันนี้จะเห็นในวันทำการถัดไป
    var n0 = closesIn.length;
    // วันที่จับคู่กับราคาด้วยตำแหน่ง — ถ้าความยาวไม่ตรงกัน แปลว่าจับคู่ไม่ได้
    // ให้ถือว่า "ไม่ทราบวันที่" ทั้งชุด ดีกว่าจับคู่ผิดแล้วรายงานวันที่ผิดแบบเงียบ ๆ
    var datesAligned = datesIn.length === n0;
    var excludedPartial = null;
    var cut = n0;
    if (today && datesAligned && datesIn[n0 - 1] === today) {
      excludedPartial = today;
      cut = n0 - 1;
    }

    // ---- 2) เก็บเฉพาะ "วันทำการที่ใช้ได้จริง" (สเปค §6 — ไม่ใช่วันปฏิทิน) ----
    // วอลุ่มต้องถูกกรองไปพร้อมกับราคาด้วยดัชนีเดียวกัน ไม่งั้นจะเหลื่อมกัน
    // วอลุ่มที่ใช้ไม่ได้เก็บเป็น null ไว้ในตำแหน่งเดิม (ไม่ตัดทิ้ง) เพื่อรักษาการเรียงตัว
    var volsAligned = Array.isArray(volsIn) && volsIn.length === closesIn.length;
    var vCloses = [], vDates = [], vVols = [];
    for (var i = 0; i < cut; i++) {
      var c = fin(closesIn[i]);
      if (c == null || !(c > 0)) continue;        // ราคา <= 0 / ว่าง / NaN = ไม่ใช่วันทำการที่ใช้ได้
      vCloses.push(c);
      vDates.push(datesAligned && isYmd(datesIn[i]) ? datesIn[i] : null);
      var vv = volsAligned ? fin(volsIn[i]) : null;
      vVols.push(vv != null && vv > 0 ? vv : null);
    }
    var valid = vCloses.length;

    if (valid < SMA_PERIOD) {
      return emptyResult(STATUS.DATA_INSUFFICIENT,
        "มีราคาปิดที่ใช้ได้ " + valid + " วัน — ต้องมีอย่างน้อย " + SMA_PERIOD + " วันจึงจะคำนวณ SMA200 ได้",
        { validObservations: valid, excludedPartialBar: excludedPartial, lookbackBars: lookback });
    }
    if (valid < SMA_PERIOD + 1) {
      // มี SMA200 แค่วันเดียว — เทียบ D-1 กับ D ไม่ได้ จึงตัดสินกฎไม่ได้
      return emptyResult(STATUS.DATA_INSUFFICIENT,
        "มีราคาปิดที่ใช้ได้ " + valid + " วัน — คำนวณ SMA200 ได้เพียงวันเดียว ยังเทียบวันก่อนหน้าไม่ได้",
        { validObservations: valid, excludedPartialBar: excludedPartial, lookbackBars: lookback });
    }

    // ---- 3) ตัดให้เหลือเฉพาะหางที่จำเป็น ----
    // 200 (เพื่อให้ SMA แรกเกิด) + lookback (จำนวนวันที่ต้องตรวจ transition)
    // ทำให้ผลของ "ข้อมูลเต็ม 5 ปี" กับ "ข้อมูลจาก cache 272 แท่ง" เท่ากันโดยโครงสร้าง
    var need = SMA_PERIOD + lookback;
    var tC = vCloses.length > need ? vCloses.slice(vCloses.length - need) : vCloses;
    var tD = vDates.length > need ? vDates.slice(vDates.length - need) : vDates;
    var tV = vVols.length > need ? vVols.slice(vVols.length - need) : vVols;
    var n = tC.length;

    var smaSeries = sma(tC, SMA_PERIOD);
    if (!Array.isArray(smaSeries) || smaSeries.length !== n) {
      return emptyResult(STATUS.DATA_UNAVAILABLE, "ตัวคำนวณ SMA คืนค่าผิดรูป",
        { validObservations: valid, excludedPartialBar: excludedPartial, lookbackBars: lookback });
    }

    var asOf = tD[n - 1];
    var freshnessKnown = asOf != null;
    var staleDays = freshnessKnown && today ? daysBetween(asOf, today) : null;
    if (staleDays != null && staleDays < 0) staleDays = 0;   // วันที่ในอนาคต = ไม่นับว่าเก่า
    var isStale = staleDays != null && staleDays > staleLimit;

    var latestClose = tC[n - 1];
    var latestSma = fin(smaSeries[n - 1]);
    var latestDist = distPct(latestClose, latestSma);

    // ---- 4) ไล่หา transition ทุกครั้งในหน้าต่าง (เก่า → ใหม่) ----
    // เหตุการณ์เกิดเฉพาะ "วันที่ข้าม" เท่านั้น — ยืนเหนือเส้นต่ออีก 5 วันไม่ใช่ 5 เหตุการณ์ (สเปค §15)
    var startIdx = Math.max(SMA_PERIOD, n - lookback);
    var events = [];
    for (var k = startIdx; k < n; k++) {
      var pC = fin(tC[k - 1]), cC = fin(tC[k]);
      var pS = fin(smaSeries[k - 1]), cS = fin(smaSeries[k]);
      if (pC == null || cC == null || pS == null || cS == null) continue;
      if (!(pC <= pS)) continue;      // วันก่อนหน้าต้องอยู่ "ที่หรือต่ำกว่า" เส้น
      if (!(cC > cS)) continue;       // วันนี้ต้องปิด "เหนือ" เส้นจริง ๆ (เท่ากับ = ยังไม่นับ)
      var pd = distPct(pC, pS), cd = distPct(cC, cS);
      var vchk = volumeCheck(tV, k, volMinPct);
      events.push({
        signalDate: tD[k],
        previousDate: tD[k - 1],
        volume: vchk.volume,
        volumeAvg: vchk.avg,
        volumeVsAvgPct: vchk.vsAvgPct,
        volumeConfirmed: vchk.confirmed,
        volumeSamples: vchk.samples,
        volumeNote: vchk.note,
        previousClose: pC,
        previousSma200: pS,
        currentClose: cC,
        currentSma200: cS,
        previousDistancePct: pd,
        currentDistancePct: cd,
        // แรงของการกลับขึ้น = ระยะห่างที่เปลี่ยนไป หน่วยเป็น percentage point (สเปค §9)
        // เป็นคำบรรยาย ไม่ใช่คะแนน และไม่ถูกใช้จัดอันดับที่ใด
        reclaimStrengthPct: pd == null || cd == null ? null : cd - pd,
        barsAgo: n - 1 - k,
      });
    }

    var windowBars = Math.max(0, n - startIdx);
    var base = {
      validObservations: valid,
      windowBars: windowBars,
      lookbackBars: lookback,
      excludedPartialBar: excludedPartial,
      asOf: asOf,
      freshnessKnown: freshnessKnown,
      staleDays: staleDays,
      stale: isStale,
      latestClose: r2(latestClose),
      latestSma200: r2(latestSma),
      latestDistancePct: r2(latestDist),
      events: events.map(function (e) {
        return {
          signalDate: e.signalDate,
          previousDate: e.previousDate,
          previousClose: r2(e.previousClose),
          previousSma200: r2(e.previousSma200),
          currentClose: r2(e.currentClose),
          currentSma200: r2(e.currentSma200),
          previousDistancePct: r2(e.previousDistancePct),
          currentDistancePct: r2(e.currentDistancePct),
          reclaimStrengthPct: r2(e.reclaimStrengthPct),
          barsAgo: e.barsAgo,
          volume: e.volume == null ? null : Math.round(e.volume),
          volumeAvg: e.volumeAvg == null ? null : Math.round(e.volumeAvg),
          volumeVsAvgPct: r2(e.volumeVsAvgPct),
          volumeConfirmed: e.volumeConfirmed,
          volumeSamples: e.volumeSamples,
          volumeNote: e.volumeNote,
        };
      }),
      eventCount: events.length,
    };
    base.stillAbove = latestDist == null ? null : latestDist > 0;

    var last = events.length ? events[events.length - 1] : null;
    var hasEvent = !!last;

    if (isStale) {
      // §17 — ข้อมูลไม่สด ห้ามนับเป็นสัญญาณของวันนี้ แต่ก็ไม่ซ่อนสิ่งที่ตรวจพบ
      var st = emptyResult(STATUS.DATA_STALE,
        "ราคาปิดล่าสุด " + asOf + " เก่ากว่าวันนี้ " + staleDays + " วัน (เกิน " + staleLimit +
        " วัน) — ไม่นับเป็นสัญญาณของวันนี้", base);
      if (hasEvent) {
        st.signalDate = last.signalDate;
        st.previousClose = r2(last.previousClose);
        st.previousSma200 = r2(last.previousSma200);
        st.currentClose = r2(last.currentClose);
        st.currentSma200 = r2(last.currentSma200);
        st.previousDistancePct = r2(last.previousDistancePct);
        st.currentDistancePct = r2(last.currentDistancePct);
        st.reclaimStrengthPct = r2(last.reclaimStrengthPct);
        st.barsSinceSignal = last.barsAgo;
        applyVolume(st, last, volMinPct);
      }
      st.detected = false;            // สถานะข้อมูล ไม่ใช่สัญญาณ
      return st;
    }

    if (!hasEvent) {
      return emptyResult(STATUS.NO_RECLAIM,
        "ตรวจย้อนหลัง " + windowBars + " วันทำการ ไม่พบวันที่ปิดข้ามขึ้นเหนือ SMA200" +
        (base.stillAbove === true ? " (ราคายืนเหนือเส้นมาก่อนหน้าช่วงที่ตรวจ)" : ""), base);
    }

    var out = emptyResult(STATUS.RECLAIM,
      "ปิดเหนือ SMA200 เมื่อ " + last.signalDate + " หลังวันก่อนหน้าปิดที่หรือต่ำกว่าเส้น" +
      (base.stillAbove === false ? " — ปัจจุบันหลุดกลับลงไปใต้เส้นแล้ว" : ""), base);
    out.detected = true;
    out.signalDate = last.signalDate;
    out.previousDate = last.previousDate;
    out.previousClose = r2(last.previousClose);
    out.previousSma200 = r2(last.previousSma200);
    out.currentClose = r2(last.currentClose);
    out.currentSma200 = r2(last.currentSma200);
    out.previousDistancePct = r2(last.previousDistancePct);
    out.currentDistancePct = r2(last.currentDistancePct);
    out.reclaimStrengthPct = r2(last.reclaimStrengthPct);
    out.barsSinceSignal = last.barsAgo;
    applyVolume(out, last, volMinPct);
    return out;
  }

  // ยกค่าวอลุ่มของ "เหตุการณ์ล่าสุด" ขึ้นมาไว้ระดับบนสุด ให้อ่านง่ายเหมือนฟิลด์อื่น
  function applyVolume(target, ev, minPct) {
    target.volume = ev.volume == null ? null : Math.round(ev.volume);
    target.volumeAvg = ev.volumeAvg == null ? null : Math.round(ev.volumeAvg);
    target.volumeVsAvgPct = r2(ev.volumeVsAvgPct);
    target.volumeConfirmed = ev.volumeConfirmed;
    target.volumeSamples = ev.volumeSamples;
    target.volumeMinPct = minPct;
    target.volumeNote = ev.volumeNote;
  }

  // ============================================================
  // summarize — นับผลรวมของการสแกนทั้งจักรวาล (สเปค §24)
  // นับอย่างเดียว ไม่จัดอันดับ ไม่ให้คะแนน · ทุกตัวถูกนับในช่องเดียวเท่านั้น
  // ============================================================
  function summarize(list) {
    var out = { scanned: 0, reclaim: 0, noReclaim: 0, insufficient: 0, unavailable: 0, stale: 0,
      withSma200History: 0, stillAbove: 0, fellBackBelow: 0, latestDataDate: null,
      // แยกสามช่องเสมอ: ผ่าน / ไม่ผ่าน / ตรวจไม่ได้ — ห้ามยุบ "ตรวจไม่ได้" เข้ากับ "ไม่ผ่าน"
      volumeConfirmed: 0, volumeRejected: 0, volumeUnknown: 0 };
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || s.type !== "SMA200_RECLAIM") continue;
      out.scanned++;
      if (s.status === STATUS.RECLAIM) out.reclaim++;
      else if (s.status === STATUS.NO_RECLAIM) out.noReclaim++;
      else if (s.status === STATUS.DATA_INSUFFICIENT) out.insufficient++;
      else if (s.status === STATUS.DATA_STALE) out.stale++;
      else out.unavailable++;
      // "มีประวัติพอคำนวณ SMA200" = ผ่านด่านข้อมูลแล้ว ไม่ว่าจะเจอสัญญาณหรือไม่
      if (s.status !== STATUS.DATA_INSUFFICIENT && s.status !== STATUS.DATA_UNAVAILABLE) {
        out.withSma200History++;
      }
      if (s.status === STATUS.RECLAIM) {
        if (s.stillAbove === true) out.stillAbove++;
        else if (s.stillAbove === false) out.fellBackBelow++;
        if (s.volumeConfirmed === true) out.volumeConfirmed++;
        else if (s.volumeConfirmed === false) out.volumeRejected++;
        else out.volumeUnknown++;
      }
      if (isYmd(s.asOf) && (out.latestDataDate == null || s.asOf > out.latestDataDate)) {
        out.latestDataDate = s.asOf;
      }
    }
    return out;
  }

  var Sma200Reclaim = {
    VERSION: VERSION,
    SMA_PERIOD: SMA_PERIOD,
    LOOKBACK_BARS: LOOKBACK_BARS,
    STALE_DAYS: STALE_DAYS,
    VOLUME_LOOKBACK: VOLUME_LOOKBACK,
    VOLUME_MIN_PCT: VOLUME_MIN_PCT,
    VOLUME_MIN_SAMPLES: VOLUME_MIN_SAMPLES,
    STATUS: STATUS,
    STATUS_TH: STATUS_TH,
    detect: detect,
    summarize: summarize,
    _internal: { fin: fin, distPct: distPct, volumeCheck: volumeCheck,
      daysBetween: daysBetween, todayBangkok: todayBangkok,
      ymdMs: ymdMs, isYmd: isYmd, smaCalc: smaCalc },
  };

  if (typeof window !== "undefined") window.Sma200Reclaim = Sma200Reclaim;
  if (typeof module !== "undefined" && module.exports) module.exports = Sma200Reclaim;
})();
