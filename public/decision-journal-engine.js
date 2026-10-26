/* ============================================================
 * DECISION JOURNAL ENGINE — เอนจินบันทึกการตัดสินใจลงทุน
 *
 * สัญญาของไฟล์นี้ (ละเมิดข้อใดข้อหนึ่ง = บั๊ก):
 *   · pure — ไม่แตะ DOM / fetch / localStorage / นาฬิกาเครื่อง
 *     "ตอนนี้" ต้องส่งเข้ามาเป็นพารามิเตอร์ nowBangkok ("YYYY-MM-DDTHH:mm" เวลากรุงเทพ)
 *     ข้อยกเว้นเดียวคือ newId() ที่ใช้ Math.random และไม่อยู่ในการคำนวณใด ๆ
 *   · ES5 เท่านั้น — ใช้ได้ทั้งในเบราว์เซอร์ (window.DecisionJournal) และ Node (module.exports)
 *   · ค่าที่ไม่รู้ = null เสมอ ห้ามเป็น NaN / Infinity / undefined / 0
 *   · ค่าดิบไม่ปัด ปัดเฉพาะตอนแสดงผลในหน้าเว็บ
 *   · สิ่งที่แช่แข็งไว้ในบันทึก (rules / verdict / context / view / action) ห้ามคำนวณซ้ำ
 *     ผลจริงภายหลังเท่านั้นที่คิดใหม่ได้จากราคาจริง
 *   · ไม่ใช่คำแนะนำการลงทุน — เอนจินบอกแค่ว่ากฎที่ผู้ใช้ตั้งเองพูดว่าอะไร
 *
 * ราคาและแท่ง as-of (สเปก §5.2): วันที่ของแท่งเป็นวันท้องถิ่นของตลาด
 * ส่วน "ปิดตลาดแล้วหรือยัง" คิดจากเวลากรุงเทพตาม market ของสัญลักษณ์
 *   TH / ASIA : แท่ง D ปิดเมื่อ now >= D 17:00
 *   US        : แท่ง D ปิดเมื่อ now >= (D+1) 05:00
 *   CRYPTO    : แท่ง D ปิดเมื่อ now >= (D+1) 07:00
 * ============================================================ */
(function () {
  "use strict";

  // ---------- ค่าคงที่ (ส่งออกทั้งหมด เพื่อให้หน้าเว็บพิมพ์ "วิธีคิด" จากค่าจริง) ----------
  var VERSION = 1;
  var RULES_VERSION = "dj-rules-1";
  var HORIZONS = [7, 30, 90];
  var FLAT_BAND_PCT = 2;     // |pct| <= 2 = ทรงตัว (ผู้ใช้ยืนยัน 2026-10-26 "ขยับ ±2% ถือว่าทรงตัว" · เดิม 1)
  var DIP_PCT = -20;
  var TOUCH_BAND_PCT = 3;    // แตะหรือเข้าใกล้ SMA200 ในระยะ ±3% แล้วเด้ง (ผู้ใช้ยืนยัน 2026-10-26 · เดิม 2)
  var TOUCH_LOOKBACK_BARS = 5;
  var RECLAIM_MAX_BARS_AGO = 9;
  var CONFIRM_BARS = 2;
  var MIN_STAT_N = 3;
  var MAX_STALE_DAYS = 7;
  var MAX_GAP_DAYS = 7;
  var BASIS_TOLERANCE_PCT = 0.5;
  // ความคลาดเคลื่อนตอนเทียบเกณฑ์เปอร์เซ็นต์ (สเปก §3 ขอบเขตตัวเลข) เข้าข้างเกณฑ์:
  // 100.05 → 80.04 คิดได้ −19.999999999999993 · 5.5 → 5.61 (+2% พอดี) ได้ 2.0000000000000058 · 10 → 10.05 ได้ 0.5000000000000115
  var EPS_PCT = 1e-9;
  var MIN_EMA_BARS = 26;
  var MIN_SMA_BARS = 200;
  var HIGH1Y_BARS = 252;
  var QTY_EPS = 1e-9;   // เศษจำนวนที่เล็กกว่านี้ถือว่าศูนย์ (เลขทศนิยมลอย: 0.0157 − 0.0057 − 0.01 ≈ −1.7e-18 ไม่ใช่ 0 พอดี)

  var FEELINGS = [
    { key: "fear", thai: "กลัว" },
    { key: "greed", thai: "โลภ" },
    { key: "fomo", thai: "กลัวตกรถ" },
    { key: "confident", thai: "มั่นใจ" },
    { key: "unsure", thai: "ลังเล" },
    { key: "bored", thai: "เบื่อ" },
    { key: "regret", thai: "เสียดาย" },
    { key: "calm", thai: "นิ่ง" }
  ];
  var ACTIONS = [
    { key: "buy", thai: "ซื้อ" },
    { key: "sell", thai: "ขาย" },
    { key: "hold", thai: "ถือต่อ" },
    { key: "none", thai: "ไม่ทำอะไร" }
  ];
  var DIRECTIONS = [
    { key: "up", thai: "ขึ้น" },
    { key: "down", thai: "ลง" },
    { key: "unsure", thai: "ไม่แน่ใจ" }
  ];

  var ASIA_SUFFIXES = [".HK", ".T", ".SS", ".SZ", ".TW", ".SI"];
  var MS_PER_DAY = 86400000;
  var BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

  // ---------- วันที่ (คิดแบบ UTC ล้วน ไม่ขึ้นกับ timezone ของเครื่อง) ----------
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function ymdToUtcMs(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var y = parseInt(s.slice(0, 4), 10);
    var m = parseInt(s.slice(5, 7), 10);
    var d = parseInt(s.slice(8, 10), 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    var ms = Date.UTC(y, m - 1, d);
    var back = new Date(ms);
    // กันวันที่ปลอม เช่น 2026-02-30 ซึ่ง Date.UTC จะเลื่อนไปเดือนถัดไปเงียบ ๆ
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
    return ms;
  }

  function utcMsToYmd(ms) {
    var dt = new Date(ms);
    return dt.getUTCFullYear() + "-" + pad2(dt.getUTCMonth() + 1) + "-" + pad2(dt.getUTCDate());
  }

  function isYmd(s) {
    return ymdToUtcMs(s) !== null;
  }

  function ymdAdd(ymd, days) {
    var ms = ymdToUtcMs(ymd);
    if (ms === null) return null;
    if (typeof days !== "number" || !isFinite(days) || Math.floor(days) !== days) return null;
    return utcMsToYmd(ms + days * MS_PER_DAY);
  }

  // b − a เป็นจำนวนวัน (ลบได้ถ้า b อยู่ก่อน a)
  function daysBetween(a, b) {
    var ma = ymdToUtcMs(a);
    var mb = ymdToUtcMs(b);
    if (ma === null || mb === null) return null;
    return Math.round((mb - ma) / MS_PER_DAY);
  }

  // เวลากรุงเทพ "YYYY-MM-DDTHH:mm" · ต่อท้ายได้เฉพาะ ":ss" และ/หรือ "+07:00" → { ymd, hour, minute } | null
  // ปฏิเสธ "Z" / offset อื่น / ช่องว่างแทน T / มิลลิวินาที — กันส่ง toISOString() มาผิดแล้วอ่านเพี้ยน 7 ชั่วโมงเงียบ ๆ
  function parseNow(nowBangkok) {
    if (typeof nowBangkok !== "string") return null;
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\+07:00)?$/.exec(nowBangkok);
    if (!m) return null;
    if (!isYmd(m[1])) return null;
    var hour = parseInt(m[2], 10);
    var minute = parseInt(m[3], 10);
    var second = m[4] ? parseInt(m[4], 10) : 0;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
    return { ymd: m[1], hour: hour, minute: minute };
  }

  // ---------- สัญลักษณ์ / ตลาด / สกุลเงิน ----------
  // trim → upper → ตัดอักขระนอก A-Z0-9.^- → รวม alias ของบิตคอยน์เป็น BTCUSD (คีย์ canonical)
  function canonicalSymbol(raw) {
    if (typeof raw !== "string") return "";
    var s = raw.replace(/^\s+|\s+$/g, "").toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
    if (s === "BTC" || s === "BTC-USD" || s === "BTCUSD") return "BTCUSD";
    return s;
  }

  // สัญลักษณ์ที่ส่งให้ /api/ohlc (กติกาเดียวกับ data-snapshot.js): BTCUSD → BTC-USD
  function providerSymbol(canonical) {
    var s = canonicalSymbol(canonical);
    if (s === "BTCUSD") return "BTC-USD";
    return s;
  }

  function endsWith(s, suffix) {
    return s.length >= suffix.length && s.slice(s.length - suffix.length) === suffix;
  }

  function marketOf(symbol) {
    var s = canonicalSymbol(symbol);
    if (endsWith(s, ".BK")) return "TH";
    for (var i = 0; i < ASIA_SUFFIXES.length; i++) {
      if (endsWith(s, ASIA_SUFFIXES[i])) return "ASIA";
    }
    if (s === "BTCUSD" || endsWith(s, "-USD")) return "CRYPTO";
    return "US";
  }

  function currencyOf(symbol) {
    return marketOf(symbol) === "TH" ? "THB" : "USD";
  }

  // ---------- แท่งสุดท้ายที่ปิดตลาดแล้ว ณ เวลากรุงเทพ nowBangkok ----------
  // คืนวันที่ของแท่ง (ymd) ที่ถือว่าปิดแล้ว · ข้อมูลเข้าไม่ถูกต้อง → null
  function closedBarCutoff(market, nowBangkok) {
    var now = parseNow(nowBangkok);
    if (!now) return null;
    if (market === "TH" || market === "ASIA") {
      return now.hour >= 17 ? now.ymd : ymdAdd(now.ymd, -1);
    }
    if (market === "US") {
      return now.hour >= 5 ? ymdAdd(now.ymd, -1) : ymdAdd(now.ymd, -2);
    }
    if (market === "CRYPTO") {
      return now.hour >= 7 ? ymdAdd(now.ymd, -1) : ymdAdd(now.ymd, -2);
    }
    return null;
  }

  // ---------- id ----------
  // ตัวช่วยเดียวที่ไม่ pure (Math.random) — ใช้ตั้งชื่อรายการใหม่เท่านั้น ไม่อยู่ในการคำนวณ
  function newId(prefix) {
    var out = "";
    for (var i = 0; i < 8; i++) {
      out += BASE36.charAt(Math.floor(Math.random() * BASE36.length));
    }
    return String(prefix) + "_" + out;
  }

  // ---------- ตัวเลข ----------
  // รับเฉพาะตัวเลขจำกัด (หรือสตริงตัวเลขจาก API) · อย่างอื่น = null
  // สตริงว่าง / มีแต่ช่องว่าง → null (Number(" ") ได้ 0 ซึ่งผิดสัญญา "ไม่รู้ = null ไม่ใช่ 0")
  function toNum(v) {
    var n;
    if (typeof v === "number") n = v;
    else if (typeof v === "string" && !/^\s*$/.test(v)) n = Number(v);
    else return null;
    return isFinite(n) ? n : null;
  }

  // ---------- ตัวคำนวณ EMA/SMA กลางของเว็บ (สเปก §5.3: ห้ามเขียนสูตรใหม่ที่นี่) ----------
  // เบราว์เซอร์อ่านจาก window.AITechnicalIndicators · Node ใช้ require แบบเดียวกับ sma200-reclaim.js
  // หาไม่เจอ = กฎ 1 และ 2 เป็น na ไม่ใช่คำนวณเอง
  function indicators() {
    var src = null;
    if (typeof window !== "undefined" && window.AITechnicalIndicators) {
      src = window.AITechnicalIndicators;
    } else if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try { src = require("./technical-indicators.js"); } catch (e) { src = null; }
    }
    if (src && typeof src.calculateEMA === "function" && typeof src.calculateSMA === "function") {
      return { calculateEMA: src.calculateEMA, calculateSMA: src.calculateSMA };
    }
    return null;
  }

  // ---------- แท่ง as-of (สเปก §5.2) ----------
  // คัดแท่งที่ใช้ได้ (วันที่ถูกต้อง · close เป็นตัวเลข > 0) เรียงตามวันที่ · เก็บเฉพาะ date <= entryDate
  // และ date <= แท่งสุดท้ายที่ปิดตลาดแล้ว ณ nowBangkok · แท่งที่ยังไม่ปิดถูกทิ้งและติดธง partialBarDropped
  // แท่งซ้ำวันเดียวกัน: ตัวหลังชนะ (กันข้อมูลซ้ำทำให้ "ติดต่อกัน" นับเพี้ยน)
  // low ที่ไม่ใช่ตัวเลข / ช่องว่าง / <= 0 → ใช้ close แทน (สเปก §3 กฎแตะแล้วเด้ง)
  function barLow(rawLow, close) {
    var low = toNum(rawLow);
    return (low === null || low <= 0) ? close : low;
  }

  function normalizeBar(b, close) {
    return {
      date: b.date,
      open: toNum(b.open),
      high: toNum(b.high),
      low: barLow(b.low, close),
      close: close,
      volume: toNum(b.volume)
    };
  }

  function asOfBars(bars, entryDate, nowBangkok, symbol) {
    var out = { bars: [], asOfBar: null, partialBarDropped: false, staleDays: null };
    if (!isYmd(entryDate)) return out;
    var cutoff = closedBarCutoff(marketOf(symbol), nowBangkok);
    if (cutoff === null) return out;              // ไม่รู้เวลา = ไม่รู้ว่าแท่งไหนปิดแล้ว → ไม่เดา
    var list = Array.isArray(bars) ? bars : [];
    var byDate = {};
    var dates = [];
    var i, b;
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!b || typeof b !== "object") continue;
      if (!isYmd(b.date)) continue;
      var close = toNum(b.close);
      if (close === null || close <= 0) continue;
      if (b.date > entryDate) continue;           // YYYY-MM-DD เทียบเป็นสตริงได้ตรงตามลำดับเวลา
      if (!Object.prototype.hasOwnProperty.call(byDate, b.date)) dates.push(b.date);
      byDate[b.date] = normalizeBar(b, close);
    }
    dates.sort();
    var kept = [];
    for (i = 0; i < dates.length; i++) {
      if (dates[i] > cutoff) { out.partialBarDropped = true; continue; }
      kept.push(byDate[dates[i]]);
    }
    out.bars = kept;
    if (kept.length) {
      out.asOfBar = kept[kept.length - 1].date;
      out.staleDays = daysBetween(out.asOfBar, entryDate);
    }
    return out;
  }

  // ---------- ตัวช่วยกฎ ----------
  // การตัดครั้งล่าสุดของเส้น a เทียบเส้น b (นิยามเดียวกับ data-snapshot.js crossDays/smaReclaimDays):
  //   ขึ้น = prev <= && now >  ·  ลง = prev >= && now <  · ไม่มีตัวกรอง anti-glitch
  // barsAgo นับจากแท่งสุดท้าย (0 = ตัดบนแท่ง as-of) · ไม่พบ → null
  function lastCross(aArr, bArr) {
    if (!Array.isArray(aArr) || !Array.isArray(bArr)) return null;
    var n = Math.min(aArr.length, bArr.length);
    for (var i = n - 1; i >= 1; i--) {
      var a = toNum(aArr[i]), b = toNum(bArr[i]), pa = toNum(aArr[i - 1]), pb = toNum(bArr[i - 1]);
      if (a === null || b === null || pa === null || pb === null) continue;
      if (pa <= pb && a > b) return { dir: "up", barsAgo: n - 1 - i };
      if (pa >= pb && a < b) return { dir: "down", barsAgo: n - 1 - i };
    }
    return null;
  }

  function stateVsLine(close, line) {
    if (close === null || line === null) return null;
    if (close > line) return "above";
    if (close < line) return "below";
    return "at";
  }

  // สถานะของแท่งสุดท้ายเทียบ SMA และจำนวนแท่งติดต่อกันที่สถานะเดียวกัน (แท่ง at ตัดสตรีคของ above/below)
  function trailingState(closes, sma) {
    var out = { state: null, consecutive: null };
    if (!Array.isArray(closes) || !Array.isArray(sma)) return out;
    var n = Math.min(closes.length, sma.length);
    if (n === 0) return out;
    var st = stateVsLine(toNum(closes[n - 1]), toNum(sma[n - 1]));
    if (st === null) return out;
    var c = 0;
    for (var i = n - 1; i >= 0; i--) {
      if (stateVsLine(toNum(closes[i]), toNum(sma[i])) !== st) break;
      c++;
    }
    out.state = st;
    out.consecutive = c;
    return out;
  }

  // แตะหรือเข้าใกล้แล้วเด้ง (สเปก §3 แก้ 2026-10-26) — ต้องครบทั้ง 3 ข้อ:
  //   (ก) มีแท่ง t ใน asOf−5 … asOf−1 ที่ sma200[t] × 0.97 <= low[t] <= sma200[t] × 1.03 (แถบ ±TOUCH_BAND_PCT ทั้งสองฝั่ง)
  //       low ที่ลงมาไม่ถึงเส้นแต่เข้าใกล้ในระยะ 3% (เข้าใกล้จากด้านบน) นับเหมือนแตะ
  //       low ที่ไม่มี / ไม่ใช่ตัวเลข / <= 0 ใช้ close แทน
  //   (ข) ก่อนแท่ง as-of ไม่ได้อยู่ในภาวะหลุดยืนยัน: จำนวนแท่งปิดใต้ SMA200 ติดต่อกันที่จบที่ asOf−1 < CONFIRM_BARS
  //       (ถ้าหลุดยืนยันแล้ว การกลับขึ้นต้องผ่านกฎ "ยืนได้" 2 แท่ง ไม่ใช่ "เด้ง" แท่งเดียว)
  //   (ค) แท่ง as-of close > sma200 และ close > close[t]
  // ถ้าแตะหลายแท่ง รายงานแท่งที่ลึกสุด (low/sma ต่ำสุด) ที่เข้าเงื่อนไข · ถ้าแตะแต่ไม่นับว่าเด้ง met=false แต่ยังบอกว่าแตะเมื่อไร
  // ขอบแถบเทียบเป็นเปอร์เซ็นต์พร้อม EPS_PCT (สเปก §3 ขอบเขตตัวเลข · แก้ review-2): ผลคูณดิบ sma × 1.03 ตัดราคาทศนิยม 2 ตำแหน่ง
  //   ที่อยู่บนขอบพอดีทิ้ง เช่น sma 10.04 → 10.04 × 1.03 = 10.341199999999999 < low 10.3412 (+3.0000000000000147%)
  function touchBounce(bars, sma) {
    var out = { met: null, touchDate: null, touchLow: null, touchSma: null };
    if (!Array.isArray(bars) || !Array.isArray(sma)) return out;
    var n = Math.min(bars.length, sma.length);
    if (n === 0 || !bars[n - 1]) return out;
    var asOf = n - 1;
    var sAsOf = toNum(sma[asOf]);
    var cAsOf = toNum(bars[asOf].close);
    if (sAsOf === null || cAsOf === null) return out;
    // (ข) นับแท่งปิดใต้เส้นติดต่อกันย้อนจาก asOf−1 ("at" หรือข้อมูลขาด ตัดสตรีค)
    var belowStreakBeforeAsOf = 0;
    for (var k = asOf - 1; k >= 0; k--) {
      if (!bars[k] || stateVsLine(toNum(bars[k].close), toNum(sma[k])) !== "below") break;
      belowStreakBeforeAsOf++;
    }
    var deepest = null;        // แตะลึกสุดในหน้าต่าง
    var deepestCleared = null; // แตะลึกสุดที่แท่ง as-of ปิดสูงกว่า close ของแท่งนั้น
    for (var t = Math.max(0, asOf - TOUCH_LOOKBACK_BARS); t < asOf; t++) {
      var bar = bars[t];
      if (!bar) continue;
      var s = toNum(sma[t]);
      var c = toNum(bar.close);
      if (s === null || c === null || !(s > 0)) continue;
      var low = barLow(bar.low, c);
      var dev = (low - s) * 100 / s;     // ห่างจากเส้นกี่ % (ลบ = ใต้เส้น)
      if (dev < -TOUCH_BAND_PCT - EPS_PCT || dev > TOUCH_BAND_PCT + EPS_PCT) continue;
      var cand = { date: bar.date, low: low, sma: s, depth: low / s, cleared: cAsOf > c };
      if (deepest === null || cand.depth < deepest.depth) deepest = cand;
      if (cand.cleared && (deepestCleared === null || cand.depth < deepestCleared.depth)) deepestCleared = cand;
    }
    var met = cAsOf > sAsOf && belowStreakBeforeAsOf < CONFIRM_BARS && deepestCleared !== null;
    var pick = met ? deepestCleared : deepest;
    out.met = met;
    if (pick) {
      out.touchDate = pick.date;
      out.touchLow = pick.low;
      out.touchSma = pick.sma;
    }
    return out;
  }

  // ---------- evaluateRules (สเปก §3 + §5.3) ----------
  var RULES_SOURCE = "yahoo:/api/ohlc";
  var MIN_DIP_BARS = 5;

  function naRule1() {
    return { state: "na", crossDir: null, crossBarsAgo: null, buy: null, sell: null };
  }
  function naRule2() {
    return {
      state: "na", consecutive: null, crossDir: null, crossBarsAgo: null,
      breakConfirmed: null, reclaimHeld: null,
      touchBounce: { met: null, touchDate: null, touchLow: null, touchSma: null },
      buy: null, sell: null
    };
  }
  function naRule3(conviction) {
    return { dd1yPct: null, dipMet: null, conviction: conviction, buy: null, high1y: null, high1yDate: null, high1yWindowBars: null };
  }

  // opts = { date, nowBangkok, symbol, conviction }
  // ผลลัพธ์ = §5.3 ทั้งก้อน + { ok, blocked, staleSource }
  //   blocked (ตรวจตามลำดับนี้ · ทุกตัว ok=false → หน้าห้ามบันทึก ยกเว้น "no-bars" ที่หน้าบันทึกได้เป็น unknown):
  //     "bad-input" = nowBangkok ผิดรูป (parseNow ไม่ผ่าน) หรือ date ไม่ใช่วันที่จริงรูป YYYY-MM-DD → ทุกกฎ na
  //     "future"    = date > วันนี้ (กรุงเทพ) → ทุกกฎ na
  //     "no-bars"   = คำขอถูกต้องแต่ไม่มีแท่งใช้ได้เลย (ทุกกฎ na)
  //     "stale"     = แท่ง as-of เก่ากว่าวันบันทึกเกิน MAX_STALE_DAYS (ยังรายงานข้อเท็จจริงของแท่ง as-of ให้ดู)
  //   staleSource เป็นของหน้าเว็บ (จาก /api/ohlc sourceType) เอนจินตั้ง false เสมอ
  function evaluateRules(bars, opts) {
    var o = opts || {};
    var conviction = o.conviction === true;
    var now = parseNow(o.nowBangkok);
    var inputBad = now === null || !isYmd(o.date);
    var future = !inputBad && o.date > now.ymd;
    var cut = (inputBad || future) ? { bars: [], asOfBar: null, partialBarDropped: false, staleDays: null } : asOfBars(bars, o.date, o.nowBangkok, o.symbol);
    var n = cut.bars.length;
    var res = {
      ok: false,
      blocked: null,
      staleSource: false,
      version: RULES_VERSION,
      source: RULES_SOURCE,
      asOfBar: cut.asOfBar,
      barsUsed: n,
      partialBarDropped: cut.partialBarDropped,
      close: null, ema12: null, ema26: null, sma200: null,
      high1y: null, high1yDate: null, high1yWindowBars: null,
      r1: naRule1(),
      r2: naRule2(),
      r3: naRule3(conviction)
    };
    if (inputBad) {
      res.blocked = "bad-input";
      return res;
    }
    if (future) {
      res.blocked = "future";
      return res;
    }
    if (n === 0) {
      res.blocked = "no-bars";
      return res;
    }
    if (cut.staleDays !== null && cut.staleDays > MAX_STALE_DAYS) res.blocked = "stale";
    else res.ok = true;

    var closes = [];
    var i;
    for (i = 0; i < n; i++) closes.push(cut.bars[i].close);
    var last = n - 1;
    res.close = closes[last];
    var ti = indicators();

    // กฎ 1 — EMA12/26 บนแท่ง as-of
    if (ti && n >= MIN_EMA_BARS) {
      var ema12 = ti.calculateEMA(closes, 12);
      var ema26 = ti.calculateEMA(closes, 26);
      var e12 = toNum(ema12[last]);
      var e26 = toNum(ema26[last]);
      if (e12 !== null && e26 !== null) {
        res.ema12 = e12;
        res.ema26 = e26;
        var st1 = e12 > e26 ? "bull" : (e12 < e26 ? "bear" : "flat");
        var x1 = lastCross(ema12, ema26);
        res.r1 = {
          state: st1,
          crossDir: x1 ? x1.dir : null,
          crossBarsAgo: x1 ? x1.barsAgo : null,
          buy: st1 === "bull",
          sell: st1 === "bear"
        };
      }
    }

    // กฎ 2 — close เทียบ SMA200: หลุด (ยืนยัน 2 แท่ง) · ยืนได้ · แตะแล้วเด้ง
    if (ti && n >= MIN_SMA_BARS) {
      var sma = ti.calculateSMA(closes, 200);
      var sAsOf = toNum(sma[last]);
      if (sAsOf !== null) {
        res.sma200 = sAsOf;
        var ts = trailingState(closes, sma);
        var x2 = lastCross(closes, sma);
        var tb = touchBounce(cut.bars, sma);
        var breakConfirmed = ts.state === "below" && ts.consecutive >= CONFIRM_BARS;
        var reclaimHeld = ts.state === "above" && ts.consecutive >= CONFIRM_BARS &&
          x2 !== null && x2.dir === "up" && x2.barsAgo <= RECLAIM_MAX_BARS_AGO;
        res.r2 = {
          state: ts.state,
          consecutive: ts.consecutive,
          crossDir: x2 ? x2.dir : null,
          crossBarsAgo: x2 ? x2.barsAgo : null,
          breakConfirmed: breakConfirmed,
          reclaimHeld: reclaimHeld,
          touchBounce: tb,
          buy: reclaimHeld || tb.met === true,
          sell: breakConfirmed
        };
      }
    }

    // กฎ 3 — ย่อจาก high 1 ปี (252 แท่งล่าสุดรวม as-of · น้อยกว่านั้นใช้เท่าที่มีและบันทึกจำนวน)
    if (n >= MIN_DIP_BARS) {
      var w = Math.min(HIGH1Y_BARS, n);
      var hi = null;
      var hiIdx = -1;
      for (i = n - w; i < n; i++) {
        if (hi === null || closes[i] >= hi) { hi = closes[i]; hiIdx = i; }   // >= → วันที่ล่าสุดที่ทำ high
      }
      // (close/high1y − 1) × 100 ตามสเปก เขียนเป็น (close − high1y) × 100 / high1y
      // ค่าเท่ากันทางคณิตศาสตร์ แต่รูปนี้ให้ −20 พอดีเมื่อ close/high = 0.8 (รูปแรกได้ −19.999999999999996)
      var dd = (res.close - hi) * 100 / hi;
      var dipMet = dd <= DIP_PCT + EPS_PCT;
      res.high1y = hi;
      res.high1yDate = cut.bars[hiIdx].date;
      res.high1yWindowBars = w;
      res.r3 = {
        dd1yPct: dd,
        dipMet: dipMet,
        conviction: conviction,
        buy: dipMet && conviction,
        high1y: hi,
        high1yDate: res.high1yDate,
        high1yWindowBars: w
      };
    }

    return res;
  }

  // ---------- verdictFor (สเปก §4) — คำตัดสิน "ตามกฎ / แหกกฎ" คิดตอนบันทึกแล้วแช่แข็ง ----------
  // รับ rules ของเต็มจาก evaluateRules หรือย่อ { r1:{buy,sell,state}, r2:{buy,sell,state}, r3:{buy} }
  //   buy  : supports = r1.buy r2.buy r3.buy · opposes = r1.sell r2.sell
  //   sell : supports = r1.sell r2.sell      · opposes = r1.buy r2.buy   (กฎ 3 เป็นเรื่องซื้อเท่านั้น ไม่นับค้านการขาย)
  //   hold / none / ค่าอื่น : compliance "n/a" (ไม่ตัดสินการกระทำ) แต่ rulesSay และ why ยังบันทึกไว้ดูย้อนหลัง
  //   buy/sell ที่กฎ 1 และ 2 na ทั้งคู่ (ข้อมูลราคาไม่พอ) → "unknown" · na ข้อเดียวยังตัดสินจากข้ออื่นได้
  // ธง buy/sell ของแต่ละกฎใช้ตามที่ส่งมา ไม่คิดใหม่จาก state (บันทึกเก่าต้องได้คำตัดสินเดิมเสมอ)
  // why = ไทย หนึ่งวลีต่อกฎ คั่นด้วย " · " · ไม่มีตัวเลขที่คำนวณ (ปัดเฉพาะในหน้าเว็บ) · บอกข้อเท็จจริง ไม่ใช่คำแนะนำ
  function flag(rule, key) {
    return !!(rule && typeof rule === "object" && rule[key] === true);
  }

  // กฎถือว่า na เมื่อไม่มี object · state "na" · หรือไม่มีธง buy/sell เลย (ของย่อที่ไม่ส่ง state)
  function ruleIsNa(rule) {
    if (!rule || typeof rule !== "object") return true;
    if (rule.state === "na") return true;
    return rule.buy == null && rule.sell == null;
  }

  function rule1Phrase(r1, kind) {
    if (ruleIsNa(r1)) return "ข้อมูลไม่พอ";
    var st = r1.state;
    if (st === "bull" || (st == null && flag(r1, "buy"))) return kind === "sell" ? "EMA12 ยังเหนือ EMA26" : "EMA12 เหนือ EMA26";
    if (st === "bear" || (st == null && flag(r1, "sell"))) return kind === "buy" ? "EMA12 ยังใต้ EMA26" : "EMA12 ใต้ EMA26";
    if (st === "flat") return "EMA12 เท่ากับ EMA26";
    return "ไม่เข้านิยามข้อใด";
  }

  function rule2Phrase(r2, kind) {
    if (ruleIsNa(r2)) return "ข้อมูลไม่พอ";
    if (flag(r2, "sell")) return "หลุด SMA200 ยืนยันแล้ว";
    if (flag(r2, "buy")) {
      if (r2.reclaimHeld === true) return "กลับขึ้นยืนเหนือ SMA200 ได้";
      if (r2.touchBounce && r2.touchBounce.met === true) return "แตะหรือเข้าใกล้ SMA200 (±" + TOUCH_BAND_PCT + "%) แล้วเด้ง";
      return "ยืนเหนือ SMA200 ได้";
    }
    var st = r2.state;
    if (st === "below") return "ปิดใต้ SMA200 ยังไม่ครบ " + CONFIRM_BARS + " แท่ง ยังไม่นับว่าหลุด";
    if (st === "at") return "ปิดเท่ากับ SMA200 พอดี";
    if (st === "above" || st == null) return kind === "buy" ? "เหนือ SMA200 แต่ไม่เข้านิยามยืนได้หรือแตะแล้วเด้ง" : "ยังไม่หลุด SMA200";
    return "ไม่เข้านิยามข้อใด";
  }

  function rule3Phrase(r3) {
    if (!r3 || typeof r3 !== "object") return "ข้อมูลไม่พอ";
    if (r3.dipMet == null && r3.buy == null) return "ข้อมูลไม่พอ";
    var dip = r3.dipMet === true || (r3.dipMet == null && r3.buy === true);
    var depth = Math.abs(DIP_PCT) + "%";
    if (!dip) return "ย่อจาก high 1 ปียังไม่ถึง " + depth;
    if (r3.buy === true) return "ย่อจาก high 1 ปีอย่างน้อย " + depth + " และติ๊กว่าศึกษามาดี";
    return "ย่อจาก high 1 ปีอย่างน้อย " + depth + " แต่ไม่ได้ติ๊กว่าศึกษามาดี";
  }

  function verdictFor(actionKind, rules) {
    var r = (rules && typeof rules === "object") ? rules : {};
    var r1 = r.r1, r2 = r.r2, r3 = r.r3;
    var kind = typeof actionKind === "string" ? actionKind : "";
    var buySide = [];
    var sellSide = [];
    if (flag(r1, "buy")) buySide.push("r1");
    if (flag(r2, "buy")) buySide.push("r2");
    if (flag(r3, "buy")) buySide.push("r3");
    if (flag(r1, "sell")) sellSide.push("r1");
    if (flag(r2, "sell")) sellSide.push("r2");
    var rulesSay = (buySide.length && sellSide.length) ? "mixed" : buySide.length ? "buy" : sellSide.length ? "sell" : "none";

    var supports = [];
    var opposes = [];
    var i;
    if (kind === "buy") {
      supports = buySide;
      opposes = sellSide;
    } else if (kind === "sell") {
      supports = sellSide;
      for (i = 0; i < buySide.length; i++) if (buySide[i] !== "r3") opposes.push(buySide[i]);
    }

    var compliance;
    if (kind !== "buy" && kind !== "sell") compliance = "n/a";
    else if (ruleIsNa(r1) && ruleIsNa(r2)) compliance = "unknown";
    else compliance = supports.length > 0 ? "per-rule" : "against";

    var parts = ["กฎ 1: " + rule1Phrase(r1, kind), "กฎ 2: " + rule2Phrase(r2, kind)];
    if (kind !== "sell") parts.push("กฎ 3: " + rule3Phrase(r3));

    return { compliance: compliance, supports: supports, opposes: opposes, rulesSay: rulesSay, why: parts.join(" · ") };
  }

  // ---------- ผลจริงภายหลัง (สเปก §5.4) — คิดตอนแสดงผลจากราคาจริง ไม่เก็บใน doc ----------
  // แท่งที่ใช้ได้ = วันที่ถูกต้อง · close ตัวเลข > 0 · (ถ้าให้ cutoff) date <= cutoff
  // คืนเป็น { date, close } ล้วน ไม่เรียง · แท่งซ้ำวันเดียวกัน: ตัวหลังชนะ (เหมือน asOfBars)
  function usableBars(bars, cutoff) {
    var byDate = {};
    var dates = [];
    var list = Array.isArray(bars) ? bars : [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b || typeof b !== "object" || !isYmd(b.date)) continue;
      var c = toNum(b.close);
      if (c === null || c <= 0) continue;
      if (cutoff != null && b.date > cutoff) continue;
      if (!Object.prototype.hasOwnProperty.call(byDate, b.date)) dates.push(b.date);
      byDate[b.date] = c;
    }
    var out = [];
    for (i = 0; i < dates.length; i++) out.push({ date: dates[i], close: byDate[dates[i]] });
    return out;
  }

  // ราคาปิดล่าสุดที่ไม่เกินวันเป้าหมาย ห่างได้ไม่เกิน maxGapDays (ค่าเริ่มต้น MAX_GAP_DAYS)
  // สัญญาเดียวกับ btc-forecast-log.js actualAt · ไม่พบ / ห่างเกิน / ข้อมูลเข้าเพี้ยน → null ห้ามเดา
  // ไม่กรองแท่งที่ยังไม่ปิดเอง — outcomes กรองด้วย closedBarCutoff ก่อนส่งเข้ามา
  function actualAt(bars, targetYmd, maxGapDays) {
    if (!isYmd(targetYmd)) return null;
    var gap = (maxGapDays == null) ? MAX_GAP_DAYS : toNum(maxGapDays);
    if (gap === null || gap < 0) return null;
    var list = usableBars(bars, null);
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].date > targetYmd) continue;
      if (best === null || list[i].date > best.date) best = list[i];
    }
    if (best === null) return null;
    if (daysBetween(best.date, targetYmd) > gap) return null;
    return { date: best.date, close: best.close };
  }

  // (actual/ref − 1) × 100 ตามสเปก เขียนเป็น (actual − ref) × 100 / ref
  // ค่าเท่ากันทางคณิตศาสตร์ แต่รูปนี้ให้ 2.0 พอดีที่ขอบแถบ flat (102 เทียบ 100) ไม่ใช่ 2.0000000000000018
  function pctChange(actual, ref) {
    if (actual === null || ref === null || !(ref > 0)) return null;
    return (actual - ref) * 100 / ref;
  }

  // |pct| <= แถบ (+EPS_PCT) = ทรงตัว
  function isFlat(pct) {
    return Math.abs(pct) <= FLAT_BAND_PCT + EPS_PCT;
  }

  // คาดถูก/ผิดที่ช่วงของตัวเอง: up ถูกเมื่อ pct > +แถบ · down ถูกเมื่อ pct < −แถบ · |pct| <= แถบ = flat · unsure/อื่น ๆ = n/a
  // (พ้นแถบ flat แล้ว pct > 0 แปลว่าเกิน +แถบ · pct < 0 แปลว่าต่ำกว่า −แถบ)
  function judgePrediction(direction, pct) {
    if (direction !== "up" && direction !== "down") return "n/a";
    if (pct === null) return "no-data";
    if (isFlat(pct)) return "flat";
    if (direction === "up") return pct > 0 ? "right" : "wrong";
    return pct < 0 ? "right" : "wrong";
  }

  // ผลของการกระทำ: ดูแถบ flat ก่อน (สเปก §5.4 แก้ 2026-10-26) · ซื้อดีเมื่อ pct > 0 · ขายดีเมื่อ pct < 0 ("ขายแล้วลง") · hold/none/อื่น ๆ = n/a
  function judgeAction(kind, pct) {
    if (kind !== "buy" && kind !== "sell") return "n/a";
    if (pct === null) return "no-data";
    if (isFlat(pct)) return "flat";
    if (kind === "buy") return pct > 0 ? "good" : "bad";
    return pct < 0 ? "good" : "bad";
  }

  // outcomes(entry, bars, nowBangkok) → ดูรูปร่างในแผน Task 5
  //   · ใช้เฉพาะแท่งที่ปิดแล้ว ณ nowBangkok (closedBarCutoff ตาม market ของสัญลักษณ์) · now เพี้ยน = ไม่รู้ว่าแท่งไหนปิด → ไม่มีแท่ง
  //   · refClose = close ของชุดราคาสดบนวัน rules.asOfBar ("fresh") — ให้ ref กับ actual มาจากชุดเดียวกัน (Yahoo ปรับย้อนหลังตอนแตกพาร์)
  //     ไม่มีแท่งวันนั้น → rules.close ที่แช่แข็ง ("frozen") · ไม่มีทั้งคู่ → null และทุกช่วง no-data
  //   · priceBasisChanged = ชุดสดต่างจากที่แช่แข็งเกิน BASIS_TOLERANCE_PCT (เฉพาะเมื่อมีทั้งคู่)
  //   · ต่อช่วง +7/+30/+90: pending ขณะ cutoff === null || target > cutoff (แท่งของวันเป้าหมายยังไม่ปิด · แก้ 2026-10-26 ·
  //     เดิมนับวันตามปฏิทินทำให้ได้คะแนนชั่วคราวจากราคาวันก่อน แล้วตัวเลขเปลี่ยนเมื่อแท่งปิด) · เป้าวันหยุดได้ผลเมื่อ cutoff เลยวันเป้า
  //     ไม่งั้น scored เมื่อ actualAt พบแท่งและคิด pct ได้ · ไม่งั้น no-data (date/close/pct = null ทั้งหมด)
  //   · ยัง pending ด้วยเมื่อ "feed ยังไม่ส่งแท่งวันเป้าหมาย" (แก้ review-2): /api/ohlc ตั้งปลายช่วงที่ 00:00 UTC ของวันนี้
  //     แท่ง D จึงมาถึงราว 07:00 กรุงเทพของ D+1 ทั้งที่ตาราง cutoff บอกว่าปิดแล้ว (ไทย 17:00 · US 05:00)
  //     ถ้าไม่รอ actualAt จะถอยไปใช้แท่ง D−1 แล้วตัวเลขพลิกตอนแท่ง D มาถึง (ล้มเหลวตามสเปก §2)
  //     → pending ขณะ targetBarArrived เป็นเท็จ และ cutoff เลยวันเป้าไม่เกิน MAX_GAP_DAYS
  //     (เลยกว่านั้น = แท่งนั้นคงไม่มาแล้ว เช่น feed ขาด → ให้คะแนนด้วยสิ่งที่มี หรือ no-data ตาม actualAt)
  //   · predicted / actionResult ตัดสินที่ช่วง view.horizonDays เท่านั้น · ช่วงที่ไม่ใช่ 7/30/90 = n/a
  //   · lastClosedBar = วันที่ของแท่งล่าสุดที่ใช้ได้และปิดแล้ว (ให้หน้าบอกว่า "ราคาถึงวันไหน")
  // วันในสัปดาห์ของ ymd (0 = อาทิตย์ … 6 = เสาร์) · คิดแบบ UTC จากวันที่ล้วน ไม่อ่านนาฬิกา
  function weekdayOf(ymd) {
    var ms = ymdToUtcMs(ymd);
    return ms === null ? null : new Date(ms).getUTCDay();
  }

  // feed ส่ง "แท่งที่ตัดสินวันเป้าหมาย" มาแล้วหรือยัง:
  //   · มีแท่งที่วันที่ >= เป้า (แท่งวันนั้นเอง หรือแท่งหลังวันหยุด ซึ่งแปลว่าวันเป้าผ่านไปใน feed แล้ว)
  //   · เป้าเป็นเสาร์/อาทิตย์ของตลาดที่ไม่ใช่คริปโต (ไม่มีแท่งวันนั้นอยู่แล้ว) และแท่งศุกร์ก่อนหน้ามาแล้ว
  function targetBarArrived(lastClosedBar, target, market) {
    if (lastClosedBar === null || target === null) return false;
    if (lastClosedBar >= target) return true;
    if (market === "CRYPTO") return false;
    var dow = weekdayOf(target);
    if (dow === 6) return lastClosedBar >= ymdAdd(target, -1);
    if (dow === 0) return lastClosedBar >= ymdAdd(target, -2);
    return false;
  }

  function outcomes(entry, bars, nowBangkok) {
    var e = (entry && typeof entry === "object") ? entry : {};
    var view = (e.view && typeof e.view === "object") ? e.view : {};
    var action = (e.action && typeof e.action === "object") ? e.action : {};
    var rules = (e.rules && typeof e.rules === "object") ? e.rules : {};
    var market = marketOf(e.symbol);
    var cutoff = closedBarCutoff(market, nowBangkok);
    var list = cutoff === null ? [] : usableBars(bars, cutoff);
    var byDate = {};
    var lastClosedBar = null;
    var i;
    for (i = 0; i < list.length; i++) {
      byDate[list[i].date] = list[i].close;
      if (lastClosedBar === null || list[i].date > lastClosedBar) lastClosedBar = list[i].date;
    }

    var frozenClose = toNum(rules.close);
    if (frozenClose !== null && frozenClose <= 0) frozenClose = null;
    var refClose = null;
    var refSource = null;
    if (isYmd(rules.asOfBar) && Object.prototype.hasOwnProperty.call(byDate, rules.asOfBar)) {
      refClose = byDate[rules.asOfBar];
      refSource = "fresh";
    } else if (frozenClose !== null) {
      refClose = frozenClose;
      refSource = "frozen";
    }
    var priceBasisChanged = refClose !== null && frozenClose !== null &&
      Math.abs(refClose / frozenClose - 1) * 100 > BASIS_TOLERANCE_PCT + EPS_PCT;

    var horizons = {};
    for (i = 0; i < HORIZONS.length; i++) {
      var target = ymdAdd(e.date, HORIZONS[i]);
      var H = { target: target, status: "no-data", date: null, close: null, pct: null };
      if (target !== null) {
        if (cutoff === null || target > cutoff) {
          // แท่งของวันเป้าหมายยังไม่ปิด (หรือไม่รู้เวลา) → ยังไม่ตัดสิน ไม่ใช้ราคาวันก่อนให้คะแนนชั่วคราว
          H.status = "pending";
        } else if (!targetBarArrived(lastClosedBar, target, market) && daysBetween(target, cutoff) <= MAX_GAP_DAYS) {
          // ปิดตามตารางแล้วแต่ feed ยังไม่ส่งแท่งนั้น (ช่วงเย็นไทย 17:00–07:00 · US 05:00–07:00) → รอ ไม่ถอยไปใช้แท่งก่อนหน้า
          H.status = "pending";
        } else {
          var a = actualAt(list, target, MAX_GAP_DAYS);
          var pct = a ? pctChange(a.close, refClose) : null;
          if (pct !== null) {
            H.status = "scored";
            H.date = a.date;
            H.close = a.close;
            H.pct = pct;
          }
          // ไม่งั้นคง no-data และ date/close/pct = null ทั้งหมด
        }
      }
      horizons[String(HORIZONS[i])] = H;
    }

    var hDays = toNum(view.horizonDays);
    var ownKey = hDays === null ? null : String(hDays);
    var own = (ownKey !== null && Object.prototype.hasOwnProperty.call(horizons, ownKey)) ? horizons[ownKey] : null;
    var direction = view.direction;
    var kind = action.kind;
    var predicted, actionResult;
    if (direction !== "up" && direction !== "down") predicted = "n/a";
    else if (own === null) predicted = "n/a";
    else if (own.status !== "scored") predicted = own.status;
    else predicted = judgePrediction(direction, own.pct);
    if (kind !== "buy" && kind !== "sell") actionResult = "n/a";
    else if (own === null) actionResult = "n/a";
    else if (own.status !== "scored") actionResult = own.status;
    else actionResult = judgeAction(kind, own.pct);

    return {
      refClose: refClose,
      refSource: refSource,
      priceBasisChanged: priceBasisChanged,
      horizons: horizons,
      dueDate: hDays === null ? null : ymdAdd(e.date, hDays),
      predicted: predicted,
      actionResult: actionResult,
      lastClosedBar: lastClosedBar
    };
  }

  // ถึงกำหนดทบทวน = ยังไม่เคยทบทวน และช่วงของตัวเองไม่ใช่ pending แล้ว (scored หรือ no-data ก็ถึงกำหนด — ผู้ใช้ยังเขียนบทเรียนได้)
  // ช่วงที่ไม่มีใน outcome → ไม่ถึงกำหนด (ไม่มีอะไรให้ทบทวน)
  function reviewDue(entry, outcome) {
    var e = (entry && typeof entry === "object") ? entry : {};
    var review = (e.review && typeof e.review === "object") ? e.review : {};
    if (review.reviewedAt) return false;
    var view = (e.view && typeof e.view === "object") ? e.view : {};
    var hDays = toNum(view.horizonDays);
    if (hDays === null) return false;
    var hz = outcome && typeof outcome === "object" && outcome.horizons && typeof outcome.horizons === "object" ? outcome.horizons : null;
    if (!hz || !Object.prototype.hasOwnProperty.call(hz, String(hDays))) return false;
    var H = hz[String(hDays)];
    if (!H || typeof H !== "object") return false;
    return H.status !== "pending";
  }

  // ---------- ไม้จริง FIFO (สเปก §5.5) ----------
  // ไม้ที่ใช้ได้ = object · ไม่มี deletedAt · id เป็นสตริง · วันที่ถูกต้อง · ด้าน buy/sell · qty ตัวเลข > 0 · price ตัวเลข >= 0
  //   · fee ติดลบ = ไม้ไม่ถูกต้อง (สเปก §5.5) · fee ที่ไม่ใช่ตัวเลข / ว่าง = 0
  // สัญลักษณ์เก็บเป็น canonical (ไม้ที่พิมพ์ " nvda " รวมกลุ่มกับ NVDA)
  // สกุล: ตามที่ระบุในไม้ (THB/USD) · ไม่ระบุ → currencyOf(สัญลักษณ์)
  // ไม้ที่ลบ → ข้ามเงียบ (ตั้งใจลบ) · ไม้ที่ข้อมูลไม่ครบ/ไม่ถูกต้อง → ข้ามพร้อมคำเตือน (ห้ามเงียบ ไม่งั้นยอดถือเพี้ยนโดยไม่รู้ตัว)
  function normalizeTrade(tr, idx) {
    if (!tr || typeof tr !== "object" || tr.deletedAt) return null;
    var symbol = canonicalSymbol(tr.symbol);
    var qty = toNum(tr.qty);
    var price = toNum(tr.price);
    if (typeof tr.id !== "string" || tr.id === "" || symbol === "" || !isYmd(tr.date)) return null;
    if (tr.side !== "buy" && tr.side !== "sell") return null;
    if (qty === null || qty <= 0 || price === null || price < 0) return null;
    var fee = toNum(tr.fee);
    if (fee !== null && fee < 0) return null;
    return {
      id: tr.id,
      symbol: symbol,
      date: tr.date,
      createdAt: typeof tr.createdAt === "string" ? tr.createdAt : "",
      side: tr.side,
      qty: qty,
      price: price,
      fee: fee === null ? 0 : fee,
      currency: (tr.currency === "THB" || tr.currency === "USD") ? tr.currency : currencyOf(symbol),
      idx: idx
    };
  }

  // ลำดับไม้ = (date, ซื้อก่อนขายในวันเดียวกัน, createdAt) แล้วค่อยลำดับที่ส่งมา (กัน sort ไม่ stable ในเครื่องเก่า)
  // ซื้อก่อนขาย (สเปก §5.5 แก้ 2026-10-26): ไม้ขายที่กรอกก่อนไม้ซื้อวันเดียวกันเคยกลายเป็นขายเกิน + ล็อตผี
  function tradeOrder(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.side !== b.side) return a.side === "buy" ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.idx - b.idx;
  }

  // a อยู่หลัง b จริง ๆ ตาม (date, createdAt) — ตราประทับเท่ากันทุกอย่างไม่ถือว่าหลัง
  // (ใช้กับซื้อกลับ: ซื้อวันเดียวกับที่ขายนับเป็นซื้อกลับเฉพาะเมื่อกรอกทีหลัง ไม่ขึ้นกับลำดับ FIFO ที่ไล่ซื้อก่อน)
  function isAfter(a, b) {
    if (a.date !== b.date) return a.date > b.date;
    return a.createdAt > b.createdAt;
  }

  function tradeLabel(tr, idx) {
    if (tr && typeof tr === "object") {
      if (typeof tr.symbol === "string" && tr.symbol !== "") return tr.symbol;
      if (typeof tr.id === "string" && tr.id !== "") return tr.id;
    }
    return "ไม้ลำดับ " + (idx + 1);
  }

  // คืน { list: ไม้ที่ใช้ได้เรียงแล้ว, warnings: [] }
  function liveTradeList(trades) {
    var out = { list: [], warnings: [] };
    var src = Array.isArray(trades) ? trades : [];
    for (var i = 0; i < src.length; i++) {
      var tr = src[i];
      if (!tr || typeof tr !== "object") continue;
      if (tr.deletedAt) continue;
      var n = normalizeTrade(tr, i);
      if (n === null) {
        out.warnings.push(tradeLabel(tr, i) + ": ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง ไม่ได้นำมาคิด");
        continue;
      }
      out.list.push(n);
    }
    out.list.sort(tradeOrder);
    return out;
  }

  // { close, date, closed, currency } · currency = สกุลที่ entry บอกเอง (THB/USD) หรือ null (ให้ fifo ใช้ currencyOf ของ feed)
  function lastCloseFor(lastCloses, symbol) {
    var out = { close: null, date: null, closed: null, currency: null };
    if (!lastCloses || typeof lastCloses !== "object") return out;
    if (!Object.prototype.hasOwnProperty.call(lastCloses, symbol)) return out;
    var lc = lastCloses[symbol];
    if (!lc || typeof lc !== "object") return out;
    var close = toNum(lc.close);
    if (close === null || close <= 0) return out;     // ราคาเพี้ยน = ไม่รู้ราคา → วันที่/สถานะแท่งก็ไม่มีความหมาย
    out.close = close;
    out.date = isYmd(lc.date) ? lc.date : null;
    out.closed = lc.closed === true ? true : (lc.closed === false ? false : null);
    out.currency = (lc.currency === "THB" || lc.currency === "USD") ? lc.currency : null;
    return out;
  }

  // fifo(trades, lastCloses) → { realized, open, totals, warnings } (รูปร่างในแผน Task 6)
  //   · เรียงทุกไม้ตาม (date, ซื้อก่อนขาย, createdAt, ลำดับที่ส่งมา) แล้วไล่ทีละไม้: ซื้อ = เพิ่มล็อตท้ายคิวของสัญลักษณ์นั้น · ขาย = ดึงล็อตเก่าสุดก่อน
  //   · หนึ่งสัญลักษณ์มีสกุลเดียว = สกุลของไม้แรกที่ใช้ได้ตามลำดับนี้ · ไม้ (ซื้อหรือขาย) สกุลอื่น → ไม่นำมาคิด + เตือน (ห้ามบวกลบข้ามสกุล)
  //   · กำไรต่อไม้ขาย = Σ(sellPrice − lotPrice)×จับได้ − ค่าธรรมเนียมขาย × (จับได้ / qty) − ค่าธรรมเนียมซื้อตามสัดส่วนที่จับ
  //     pnlPct = กำไร / Σ(lotPrice×จับได้) × 100 · ไม่มีฐานทุน (จับไม่ได้เลย หรือล็อตราคา 0) → null
  //   · ขายเกินที่ถือ: คิดเฉพาะส่วนที่จับได้ (ค่าธรรมเนียมขายตามสัดส่วนที่จับ) ติด oversell และใส่คำเตือน (จับไม่ได้เลย → กำไร 0)
  //   · จำนวนที่เหลือต่ำกว่า QTY_EPS ถือว่าศูนย์ (เศษทศนิยมของ BTC) → ไม่ติดขายเกินปลอม ไม่เหลือล็อตผี
  //   · open = หนึ่งแถวต่อสัญลักษณ์ที่ยังมีล็อต เรียงตามสัญลักษณ์ · cost/avgCost คิดจากราคาซื้อล้วน (ค่าธรรมเนียมซื้อไปหักตอนขาย)
  //     floating = lastClose×qty − cost · ไม่มีราคาปิดล่าสุด → null · แท่งล่าสุดยังไม่ปิดก็ใช้ได้แต่ lastBarClosed=false ให้หน้าติดป้าย
  //     priceCurrency = lastCloses[sym].currency (THB/USD) ถ้าระบุ ไม่งั้น currencyOf(sym) · ไม่ตรงกับสกุลไม้ → floating/floatingPct null + เตือน
  //   · totals แยกสกุล ไม่แปลง · realized = ผลรวมกำไรที่รับรู้ · floating = ผลรวมลอยตัว
  //     แต่ถ้ามีสัญลักษณ์เปิดอยู่ที่ไม่รู้ราคา ผลรวมลอยตัวของสกุลนั้น = null (ผลรวมบางส่วนคือตัวเลขที่ผิด)
  //   · realized เรียงตามลำดับเวลาข้ามทุกสัญลักษณ์ · ไม่แก้ไข object ที่ส่งเข้ามา
  function fifo(trades, lastCloses) {
    var lt = liveTradeList(trades);
    var realized = [];
    var warnings = lt.warnings;
    var lotsBySym = {};
    var ccyBySym = {};
    var symbols = [];
    var i, j, sym, lots;

    for (i = 0; i < lt.list.length; i++) {
      var tr = lt.list[i];
      sym = tr.symbol;
      if (!Object.prototype.hasOwnProperty.call(lotsBySym, sym)) {
        lotsBySym[sym] = [];
        ccyBySym[sym] = tr.currency;
        symbols.push(sym);
      } else if (tr.currency !== ccyBySym[sym]) {
        warnings.push(sym + ": สกุลเงินไม่ตรงกับไม้ก่อนหน้า ไม่ได้นำมาคิด (ไม้ " + tr.date + ")");
        continue;
      }
      lots = lotsBySym[sym];
      if (tr.side === "buy") {
        lots.push({ tradeId: tr.id, price: tr.price, qty: tr.qty, remaining: tr.qty, fee: tr.fee, currency: tr.currency });
        continue;
      }
      var need = tr.qty;
      var matched = 0;
      var gross = 0;
      var basis = 0;
      var lotFees = 0;
      while (need > QTY_EPS && lots.length) {
        var lot = lots[0];
        var take = Math.min(need, lot.remaining);
        gross += (tr.price - lot.price) * take;
        basis += lot.price * take;
        lotFees += lot.fee * take / lot.qty;
        matched += take;
        need -= take;
        lot.remaining -= take;
        if (lot.remaining <= QTY_EPS) lots.shift();
      }
      var oversell = need > QTY_EPS;
      if (!oversell) matched = tr.qty;          // จับครบ → ใช้จำนวนที่บันทึก ไม่ใช่ผลบวกที่มีเศษทศนิยม
      if (matched <= QTY_EPS) matched = 0;
      var sellFee = oversell ? tr.fee * matched / tr.qty : tr.fee;   // ขายเกิน → ค่าธรรมเนียมขายเฉพาะส่วนที่จับได้
      var pnl = gross - sellFee - lotFees;
      realized.push({
        tradeId: tr.id,
        symbol: sym,
        date: tr.date,
        qty: tr.qty,
        matchedQty: matched,
        pnl: pnl,
        pnlPct: (matched > 0 && basis > 0) ? pnl * 100 / basis : null,
        currency: tr.currency,
        oversell: oversell
      });
      if (oversell) warnings.push(sym + ": ขายมากกว่าที่บันทึกซื้อไว้ (ไม้ " + tr.date + ")");
    }

    symbols.sort();
    var open = [];
    for (i = 0; i < symbols.length; i++) {
      sym = symbols[i];
      lots = lotsBySym[sym];
      if (!lots.length) continue;
      var qty = 0;
      var cost = 0;
      for (j = 0; j < lots.length; j++) {
        qty += lots[j].remaining;
        cost += lots[j].price * lots[j].remaining;
      }
      if (qty <= QTY_EPS) continue;
      var lc = lastCloseFor(lastCloses, sym);
      var posCcy = lots[0].currency;
      // ราคาล่าสุดมาจาก feed สกุลของตลาดเอง (BTC-USD / หุ้น US = USD · .BK = THB) เว้นแต่ entry ระบุสกุลมาเอง
      // สกุลไม่ตรงกับไม้ (เช่นซื้อ BTC เป็นบาท) → ไม่คิดกำไรลอยตัว (ห้ามลบข้ามสกุล สเปก §5.5) แต่ยังโชว์ราคาล่าสุด
      var priceCcy = lc.currency !== null ? lc.currency : currencyOf(sym);
      var ccyMismatch = lc.close !== null && priceCcy !== posCcy;
      if (ccyMismatch) warnings.push(sym + ": ราคาล่าสุดเป็น " + priceCcy + " แต่ไม้บันทึกเป็น " + posCcy + " จึงไม่คิดกำไรลอยตัว");
      var floating = (lc.close === null || ccyMismatch) ? null : lc.close * qty - cost;
      open.push({
        symbol: sym,
        qty: qty,
        avgCost: cost / qty,
        cost: cost,
        currency: posCcy,
        lastClose: lc.close,
        priceCurrency: priceCcy,
        lastDate: lc.date,
        lastBarClosed: lc.closed,
        floating: floating,
        floatingPct: (floating !== null && cost > 0) ? floating * 100 / cost : null
      });
    }

    var totals = {};
    var floatingUnknown = {};
    function bucket(ccy) {
      if (!Object.prototype.hasOwnProperty.call(totals, ccy)) totals[ccy] = { realized: 0, floating: 0 };
      return totals[ccy];
    }
    for (i = 0; i < realized.length; i++) bucket(realized[i].currency).realized += realized[i].pnl;
    for (i = 0; i < open.length; i++) {
      var b = bucket(open[i].currency);
      if (open[i].floating === null) floatingUnknown[open[i].currency] = true;
      else b.floating += open[i].floating;
    }
    for (var ccy in floatingUnknown) {
      if (Object.prototype.hasOwnProperty.call(floatingUnknown, ccy)) totals[ccy].floating = null;
    }

    return { realized: realized, open: open, totals: totals, warnings: warnings };
  }

  // ---------- ซื้อกลับ (สเปก §5.4 ย่อหน้าท้าย) ----------
  // entry ที่ action.kind === "sell" และ action.tradeIds มีไม้ขาย กับไม้ซื้อสัญลักษณ์เดียวกันที่ "หลังกว่า" ตาม (date, createdAt)
  //   · ซื้อวันเดียวกับที่ขาย นับเป็นซื้อกลับเฉพาะเมื่อ createdAt ใหม่กว่าไม้ขาย
  //   · ใช้ไม้ขายตัวแรกตามลำดับ แล้วไม้ซื้อตัวแรกที่อยู่หลังมันและสกุลเดียวกัน · ไม้ที่ลบ/ข้อมูลไม่ครบ/คนละสัญลักษณ์กับ entry ไม่นับ
  //   · diffPerUnit = buyPrice − sellPrice · diffPct = (buyPrice − sellPrice) × 100 / sellPrice (ขายราคา 0 → null)
  //   · ราคาไม้จริง ไม่ปรับ split (V1) · ไม่เข้าเงื่อนไข → null
  function buyBack(entry, trades) {
    var e = (entry && typeof entry === "object") ? entry : {};
    var action = (e.action && typeof e.action === "object") ? e.action : {};
    if (action.kind !== "sell") return null;
    var ids = Array.isArray(action.tradeIds) ? action.tradeIds : [];
    if (!ids.length) return null;
    var want = canonicalSymbol(e.symbol);
    var list = liveTradeList(trades).list;
    var linked = [];
    for (var i = 0; i < list.length; i++) {
      if (ids.indexOf(list[i].id) < 0) continue;
      if (want !== "" && list[i].symbol !== want) continue;
      linked.push(list[i]);
    }
    var sell = null;
    for (i = 0; i < linked.length; i++) {
      if (linked[i].side === "sell") { sell = linked[i]; break; }
    }
    if (sell === null) return null;
    var buy = null;
    for (i = 0; i < linked.length; i++) {
      // สกุลต้องตรงกับไม้ขาย (แก้ review-2): ขาย 110 USD เทียบซื้อ 3,700 THB ไม่ใช่ "ซื้อกลับแพงกว่า +3,263%"
      if (linked[i].side === "buy" && linked[i].symbol === sell.symbol && linked[i].currency === sell.currency && isAfter(linked[i], sell)) { buy = linked[i]; break; }
    }
    if (buy === null) return null;
    return {
      sellTradeId: sell.id,
      buyTradeId: buy.id,
      sellPrice: sell.price,
      buyPrice: buy.price,
      diffPerUnit: buy.price - sell.price,
      diffPct: pctChange(buy.price, sell.price)
    };
  }

  // ---------- เอกสาร (สเปก §5.1 · §6) — รวมตาม id · tombstone · รายการที่ยังอยู่ ----------
  // ตราประทับเวลา (updatedAt / deletedAt) เป็นสตริง ISO ที่หน้าเว็บส่งเข้ามา เอนจินไม่อ่านนาฬิกาเอง
  function emptyDoc() {
    return { v: VERSION, updatedAt: null, entries: [], trades: [] };
  }

  // ---------- กติกาเดียวกับเซิร์ฟเวอร์ (lib/journal-validation.js · สเปก §6) ----------
  // ฝั่งหน้าใช้ตรวจรายการใหม่ก่อน PUT — รายการเสียตัวเดียว (แม้เป็น tombstone) ทำให้เซิร์ฟเวอร์ปฏิเสธทั้ง doc ตลอดไป
  var MAX_DOC_BYTES = 900000;

  // itemProblems(item) → string[] · ไม่ใช่ plain object → ["not-object"] แล้วหยุด
  //   ไม่งั้นเรียงตามนี้: "id" (ไม่ใช่สตริงที่ไม่ว่าง) · "date" (ไม่ใช่ YYYY-MM-DD ที่เป็นวันจริง) · "symbol" (ไม่ใช่สตริง หรือว่างหลังตัดช่องว่าง)
  function itemProblems(item) {
    if (!item || typeof item !== "object" || Object.prototype.toString.call(item) !== "[object Object]") return ["not-object"];
    var out = [];
    if (typeof item.id !== "string" || item.id === "") out.push("id");
    if (!isYmd(item.date)) out.push("date");
    if (typeof item.symbol !== "string" || item.symbol.replace(/^\s+|\s+$/g, "") === "") out.push("symbol");
    return out;
  }

  // ขนาด UTF-8 (ไบต์) ของ JSON.stringify(doc) คิดแบบ ES5 — เท่ากับ Buffer.byteLength(..., "utf8") ของเซิร์ฟเวอร์
  //   < U+0080 = 1 · < U+0800 = 2 · surrogate pair (อีโมจิ) = 4 · อื่น ๆ (รวมไทย และ surrogate เดี่ยวที่กลายเป็น U+FFFD) = 3
  //   JSON ไม่ได้ (undefined / ฟังก์ชัน) → 0
  function docBytes(doc) {
    var s;
    try { s = JSON.stringify(doc); } catch (e) { return 0; }
    if (typeof s !== "string") return 0;
    var bytes = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) bytes += 1;
      else if (c < 0x800) bytes += 2;
      else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { bytes += 4; i++; }
        else bytes += 3;
      } else bytes += 3;
    }
    return bytes;
  }

  function isoStamp(v) {
    return (typeof v === "string" && v !== "") ? v : null;
  }

  // แก้ item ที่ส่งมาโดยตรงแล้วคืนตัวเดิม (หน้าเว็บถือ doc ไว้ในหน่วยความจำ) · item หรือตราประทับเพี้ยน → null ไม่แตะอะไร
  function touch(item, nowIso) {
    var stamp = isoStamp(nowIso);
    if (!item || typeof item !== "object" || stamp === null) return null;
    item.updatedAt = stamp;
    return item;
  }

  // tombstone (แก้ review-2): เหลือเฉพาะคีย์ที่ merge และเซิร์ฟเวอร์ต้องใช้ — id · date · symbol · createdAt · updatedAt · deletedAt
  //   · ลบเนื้อหาที่เหลือทิ้ง → ลบรายการแล้ว doc เล็กลงจริง (ไม่งั้นชนเพดาน MAX_DOC_BYTES แล้วลบเพื่อคืนพื้นที่ไม่ได้)
  //   · date / symbol ที่เซิร์ฟเวอร์จะปฏิเสธ (itemProblems) ถูกซ่อม: date → 10 ตัวแรกของตราประทับถ้าเป็นวันจริง ไม่งั้น "1970-01-01"
  //     symbol → "-" · ไม่งั้นรายการเสียที่ลบแล้วยังทำให้ทั้ง doc ถูกปฏิเสธตลอดไป (เซิร์ฟเวอร์ไม่ยกเว้น tombstone)
  //   · id แก้ไม่ได้ (เป็นตัวตน) — รายการที่ id ใช้ไม่ได้ mergeDocs ทิ้งอยู่แล้ว
  var TOMBSTONE_KEYS = ["id", "date", "symbol", "createdAt", "updatedAt", "deletedAt"];
  var TOMBSTONE_FALLBACK_DATE = "1970-01-01";
  var TOMBSTONE_FALLBACK_SYMBOL = "-";

  function tombstone(item, nowIso) {
    var stamp = isoStamp(nowIso);
    if (!item || typeof item !== "object" || stamp === null) return null;
    var k;
    var drop = [];
    for (k in item) {
      if (Object.prototype.hasOwnProperty.call(item, k) && TOMBSTONE_KEYS.indexOf(k) < 0) drop.push(k);
    }
    for (var i = 0; i < drop.length; i++) delete item[drop[i]];
    if (!isYmd(item.date)) item.date = isYmd(stamp.slice(0, 10)) ? stamp.slice(0, 10) : TOMBSTONE_FALLBACK_DATE;
    if (typeof item.symbol !== "string" || item.symbol.replace(/^\s+|\s+$/g, "") === "") item.symbol = TOMBSTONE_FALLBACK_SYMBOL;
    item.deletedAt = stamp;
    item.updatedAt = stamp;
    return item;
  }

  // รายการที่ยังอยู่ = object ที่ไม่มี deletedAt · คืน object ตัวเดิม (ไม่ก๊อป) ให้หน้าเว็บ touch ต่อได้
  function liveItems(list) {
    var out = [];
    var src = Array.isArray(list) ? list : [];
    for (var i = 0; i < src.length; i++) {
      var it = src[i];
      if (!it || typeof it !== "object") continue;
      if (it.deletedAt) continue;
      out.push(it);
    }
    return out;
  }

  function liveEntries(doc) {
    return liveItems(doc && typeof doc === "object" ? doc.entries : null);
  }

  function liveTrades(doc) {
    return liveItems(doc && typeof doc === "object" ? doc.trades : null);
  }

  function strOf(v) {
    return typeof v === "string" ? v : "";
  }

  function cmpStr(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  // บันทึก: date ใหม่ก่อน แล้ว createdAt ใหม่ก่อน · id เป็นตัวตัดสินสุดท้ายให้ลำดับนิ่งทุกเครื่อง
  function entryOrder(a, b) {
    var c = cmpStr(strOf(b.date), strOf(a.date));
    if (c !== 0) return c;
    c = cmpStr(strOf(b.createdAt), strOf(a.createdAt));
    if (c !== 0) return c;
    return cmpStr(a.id, b.id);
  }

  // ไม้: date เก่าก่อน แล้ว createdAt เก่าก่อน (ลำดับเก็บใน doc · fifo ไล่เองอีกชั้นโดยให้ซื้อก่อนขายในวันเดียวกัน)
  function tradeDocOrder(a, b) {
    var c = cmpStr(strOf(a.date), strOf(b.date));
    if (c !== 0) return c;
    c = cmpStr(strOf(a.createdAt), strOf(b.createdAt));
    if (c !== 0) return c;
    return cmpStr(a.id, b.id);
  }

  // รวมรายการสองชุดตาม id (สเปก §6): ซ้ำ → updatedAt ใหม่กว่าชนะ (เทียบสตริง ISO) · เท่ากัน → ของชุดหลัง (b)
  //   · tombstone ก็เป็นรายการหนึ่ง ชนะเมื่อใหม่กว่า และไม่ถูกทิ้ง (เครื่องอื่นจะได้ไม่ชุบชีวิตกลับมา)
  //   · ไม่มี updatedAt = "" แพ้ทุกตราประทับ · รายการที่ไม่ใช่ object หรือไม่มี id สตริง รวมตาม id ไม่ได้ → ทิ้ง (เซิร์ฟเวอร์ก็ปฏิเสธอยู่แล้ว)
  //   · คืน object ตัวเดิมของฝั่งที่ชนะ ไม่ก๊อป ไม่แก้ชุดที่ส่งมา
  function mergeItems(la, lb, order) {
    var byId = {};
    var ids = [];
    function take(list) {
      var src = Array.isArray(list) ? list : [];
      for (var i = 0; i < src.length; i++) {
        var it = src[i];
        if (!it || typeof it !== "object") continue;
        if (typeof it.id !== "string" || it.id === "") continue;
        if (!Object.prototype.hasOwnProperty.call(byId, it.id)) {
          ids.push(it.id);
          byId[it.id] = it;
          continue;
        }
        if (strOf(it.updatedAt) >= strOf(byId[it.id].updatedAt)) byId[it.id] = it;
      }
    }
    take(la);
    take(lb);
    var out = [];
    for (var i = 0; i < ids.length; i++) out.push(byId[ids[i]]);
    out.sort(order);
    return out;
  }

  // mergeDocs(a, b) → doc ใหม่ · v = VERSION เสมอ · updatedAt = ตราประทับระดับ doc ที่มากกว่า (ไม่มองของรายการ)
  function mergeDocs(a, b) {
    var da = (a && typeof a === "object") ? a : {};
    var db = (b && typeof b === "object") ? b : {};
    var ua = isoStamp(da.updatedAt);
    var ub = isoStamp(db.updatedAt);
    var updatedAt;
    if (ua === null) updatedAt = ub;
    else if (ub === null) updatedAt = ua;
    else updatedAt = ub >= ua ? ub : ua;
    return {
      v: VERSION,
      updatedAt: updatedAt,
      entries: mergeItems(da.entries, db.entries, entryOrder),
      trades: mergeItems(da.trades, db.trades, tradeDocOrder)
    };
  }

  // ---------- สถิติ (สเปก §5.6) — นับเฉพาะที่ scored ที่ช่วงของตัวเอง · n < MIN_STAT_N ไม่มีค่าเฉลี่ย ----------
  // ต่อกลุ่ม: n · scoredN/goodN/avgPct = ผลของ action · rightN/wrongN/judgedN = คาดถูก/ผิด (judged = ถูก + ผิด + flat)
  function statBucket() {
    return { n: 0, scoredN: 0, goodN: 0, sum: 0, rightN: 0, wrongN: 0, judgedN: 0 };
  }

  // enough = ประตู n ของผลของ action (scoredN) · predEnough = ประตู n ของ "สัดส่วนคาดถูก" rightN/judgedN (judgedN) — แยกกัน (แก้ review-2)
  //   (hold ที่คาดทิศไว้มี judgedN แต่ไม่มี scoredN · ซื้อที่ "ไม่แน่ใจ" มี scoredN แต่ไม่มี judgedN)
  function finishStat(b) {
    var enough = b.scoredN >= MIN_STAT_N;
    return {
      n: b.n, scoredN: b.scoredN, goodN: b.goodN, avgPct: enough ? b.sum / b.scoredN : null, enough: enough,
      rightN: b.rightN, wrongN: b.wrongN, judgedN: b.judgedN, predEnough: b.judgedN >= MIN_STAT_N
    };
  }

  // ช่วงของตัวเอง (view.horizonDays) ที่ scored แล้ว → object ช่วงนั้น · ไม่งั้น null
  function ownScoredHorizon(entry, outcome) {
    if (!outcome || typeof outcome !== "object") return null;
    var view = (entry.view && typeof entry.view === "object") ? entry.view : {};
    var hDays = toNum(view.horizonDays);
    if (hDays === null) return null;
    var hz = (outcome.horizons && typeof outcome.horizons === "object") ? outcome.horizons : null;
    if (!hz || !Object.prototype.hasOwnProperty.call(hz, String(hDays))) return null;
    var H = hz[String(hDays)];
    if (!H || typeof H !== "object" || H.status !== "scored") return null;
    return H;
  }

  // คาดการณ์ที่นับได้: ช่วงของตัวเอง scored และ outcome.predicted เป็น right|wrong|flat → ค่านั้น · ไม่งั้น null
  function predictionOf(entry, outcome) {
    if (ownScoredHorizon(entry, outcome) === null) return null;
    var p = outcome.predicted;
    return (p === "right" || p === "wrong" || p === "flat") ? p : null;
  }

  // ส่วนที่นับได้ของรายการหนึ่ง: ช่วงของตัวเอง (view.horizonDays) ต้อง scored และ actionResult เป็น good|bad|flat
  //   dirPct = pct ในทิศของการกระทำ (ขาย = −pct · ซื้อ = pct) · ไม่เข้าเงื่อนไข → null (นับ n แต่ไม่นับ scored)
  function scoredSlice(entry, outcome) {
    var H = ownScoredHorizon(entry, outcome);
    if (H === null) return null;
    var action = (entry.action && typeof entry.action === "object") ? entry.action : {};
    var res = outcome.actionResult;
    if (res !== "good" && res !== "bad" && res !== "flat") return null;
    var pct = toNum(H.pct);
    if (pct === null) return null;
    return { good: res === "good", dirPct: action.kind === "sell" ? -pct : pct };
  }

  function addToBucket(b, slice, pred) {
    b.n++;
    if (pred !== null) {
      b.judgedN++;
      if (pred === "right") b.rightN++;
      else if (pred === "wrong") b.wrongN++;
    }
    if (!slice) return;
    b.scoredN++;
    if (slice.good) b.goodN++;
    b.sum += slice.dirPct;
  }

  // stats(entries, outcomeById) → { byCompliance: { "per-rule", "against" }, byFeeling: { key → S }, byPrediction }
  //   · byCompliance มีสองคีย์นี้เสมอ · compliance n/a / unknown ไม่เข้า
  //   · byFeeling มีทุกอารมณ์ใน FEELINGS เสมอ (ศูนย์ได้) · คีย์อื่นที่พบในบันทึกก็ต่อท้าย · ติ๊กซ้ำในรายการเดียวนับครั้งเดียว
  //   · byPrediction นับ outcome.predicted right / wrong / flat (ช่วงของตัวเอง scored) · judged = ผลรวม · enough = judged >= MIN_STAT_N
  //     unjudged = ช่วงของตัวเอง scored แต่ predicted "n/a" (คาดว่า "ไม่แน่ใจ") = "ไม่ตัดสิน" ของสเปก §5.6 · ไม่รวมใน judged
  //   · ทุกกลุ่มมี predEnough = judgedN >= MIN_STAT_N (หน้าโชว์สัดส่วนคาดถูกเมื่อ predEnough เท่านั้น)
  //   · ทุกกลุ่มมี rightN/wrongN/judgedN (คาดถูก/ผิด เฉพาะช่วงของตัวเองที่ scored) — "สัดส่วนคาดถูก" = rightN / judgedN
  //   · รายการที่มี deletedAt ไม่นับเลย (กันหน้าส่ง tombstone มาโดยไม่ตั้งใจ)
  function stats(entries, outcomeById) {
    var list = Array.isArray(entries) ? entries : [];
    var byId = (outcomeById && typeof outcomeById === "object") ? outcomeById : {};
    var comp = { "per-rule": statBucket(), "against": statBucket() };
    var feel = {};
    var feelKeys = [];
    var pred = { right: 0, wrong: 0, flat: 0, unjudged: 0 };
    var i, j;
    for (i = 0; i < FEELINGS.length; i++) {
      feel[FEELINGS[i].key] = statBucket();
      feelKeys.push(FEELINGS[i].key);
    }
    for (i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== "object" || e.deletedAt) continue;
      var o = (typeof e.id === "string" && Object.prototype.hasOwnProperty.call(byId, e.id)) ? byId[e.id] : null;
      if (!o || typeof o !== "object") o = null;
      var slice = scoredSlice(e, o);
      var itemPred = predictionOf(e, o);

      var verdict = (e.verdict && typeof e.verdict === "object") ? e.verdict : {};
      if (verdict.compliance === "per-rule" || verdict.compliance === "against") addToBucket(comp[verdict.compliance], slice, itemPred);

      var ctx = (e.context && typeof e.context === "object") ? e.context : {};
      var feelings = Array.isArray(ctx.feelings) ? ctx.feelings : [];
      var seen = [];
      for (j = 0; j < feelings.length; j++) {
        var k = feelings[j];
        if (typeof k !== "string" || k === "" || seen.indexOf(k) >= 0) continue;
        seen.push(k);
        if (!Object.prototype.hasOwnProperty.call(feel, k)) {
          feel[k] = statBucket();
          feelKeys.push(k);
        }
        addToBucket(feel[k], slice, itemPred);
      }

      if (itemPred !== null) pred[itemPred]++;
      else if (o !== null && o.predicted === "n/a" && ownScoredHorizon(e, o) !== null) pred.unjudged++;   // ถึงเวลาแล้วแต่ไม่ได้คาดทิศ = "ไม่ตัดสิน"
    }

    var byFeeling = {};
    for (i = 0; i < feelKeys.length; i++) byFeeling[feelKeys[i]] = finishStat(feel[feelKeys[i]]);
    var judged = pred.right + pred.wrong + pred.flat;
    return {
      byCompliance: { "per-rule": finishStat(comp["per-rule"]), "against": finishStat(comp.against) },
      byFeeling: byFeeling,
      byPrediction: { right: pred.right, wrong: pred.wrong, flat: pred.flat, judged: judged, unjudged: pred.unjudged, enough: judged >= MIN_STAT_N }
    };
  }

  // ---------- ส่งออก ----------
  var DecisionJournal = {
    VERSION: VERSION,
    RULES_VERSION: RULES_VERSION,
    HORIZONS: HORIZONS,
    FLAT_BAND_PCT: FLAT_BAND_PCT,
    DIP_PCT: DIP_PCT,
    TOUCH_BAND_PCT: TOUCH_BAND_PCT,
    TOUCH_LOOKBACK_BARS: TOUCH_LOOKBACK_BARS,
    RECLAIM_MAX_BARS_AGO: RECLAIM_MAX_BARS_AGO,
    CONFIRM_BARS: CONFIRM_BARS,
    MIN_STAT_N: MIN_STAT_N,
    MAX_STALE_DAYS: MAX_STALE_DAYS,
    MAX_GAP_DAYS: MAX_GAP_DAYS,
    BASIS_TOLERANCE_PCT: BASIS_TOLERANCE_PCT,
    EPS_PCT: EPS_PCT,
    MIN_EMA_BARS: MIN_EMA_BARS,
    MIN_SMA_BARS: MIN_SMA_BARS,
    HIGH1Y_BARS: HIGH1Y_BARS,
    QTY_EPS: QTY_EPS,
    FEELINGS: FEELINGS,
    ACTIONS: ACTIONS,
    DIRECTIONS: DIRECTIONS,

    isYmd: isYmd,
    ymdAdd: ymdAdd,
    daysBetween: daysBetween,
    canonicalSymbol: canonicalSymbol,
    providerSymbol: providerSymbol,
    marketOf: marketOf,
    currencyOf: currencyOf,
    closedBarCutoff: closedBarCutoff,
    newId: newId,
    asOfBars: asOfBars,
    evaluateRules: evaluateRules,
    verdictFor: verdictFor,
    actualAt: actualAt,
    outcomes: outcomes,
    reviewDue: reviewDue,
    fifo: fifo,
    buyBack: buyBack,
    emptyDoc: emptyDoc,
    MAX_DOC_BYTES: MAX_DOC_BYTES,
    itemProblems: itemProblems,
    docBytes: docBytes,
    mergeDocs: mergeDocs,
    touch: touch,
    tombstone: tombstone,
    liveEntries: liveEntries,
    liveTrades: liveTrades,
    stats: stats,

    _internal: {
      parseNow: parseNow,
      toNum: toNum,
      indicators: indicators,
      lastCross: lastCross,
      trailingState: trailingState,
      touchBounce: touchBounce,
      ruleIsNa: ruleIsNa,
      usableBars: usableBars,
      pctChange: pctChange,
      judgePrediction: judgePrediction,
      judgeAction: judgeAction,
      normalizeTrade: normalizeTrade,
      tradeOrder: tradeOrder,
      liveTradeList: liveTradeList,
      mergeItems: mergeItems,
      scoredSlice: scoredSlice
    }
  };

  if (typeof window !== "undefined") window.DecisionJournal = DecisionJournal;
  if (typeof module !== "undefined" && module.exports) module.exports = DecisionJournal;
})();
