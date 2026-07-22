(function () {
  "use strict";

  // ============================================================
  // Macro Dashboard (Market Risk) — redesigned 2026-07.
  //
  // One page, big picture. Global warning gauges (rates, yield curve,
  // dollar, credit, bond vol) shown as ZONE BARS: where each sits on a
  // ผ่อนคลาย→ปกติ→จับตา→เสี่ยง scale + which way the risk trend is heading.
  // The existing equity-risk core (VIX/VVIX score) stays compact, with the
  // raw SPX/XLK/VIX/VVIX/VIXEQ values available as a secondary reference row.
  //
  // Data: /api/market-risk (UNCHANGED — Action Center / scoring still consume
  // snapshot.marketRisk) + snapshot.historicalData + /api/ohlc (cached daily).
  // ============================================================

  var CACHE_KEY = "macro_ohlc_v1";
  var riskStatus = document.getElementById("riskStatus");
  var riskTimestamp = document.getElementById("riskTimestamp");
  var refreshButton = document.getElementById("refreshRiskButton");

  var state = { api: null, apiError: null, macro: {}, loadingMacro: false };

  // ---------------------------------------------------------- utils
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function el(id) { return document.getElementById(id); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function today() { return new Date().toISOString().slice(0, 10); }

  function yieldNorm(v) { var n = num(v); if (n == null) return null; return n > 20 ? n / 10 : n; } // ^TNX family sometimes ×10
  function last(arr) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i] != null && isFinite(arr[i])) return arr[i]; return null; }
  function nBarsAgo(arr, n) { var idx = arr.length - 1 - n; return idx >= 0 && isFinite(arr[idx]) ? arr[idx] : null; }
  function ma(arr, n) { if (!arr || arr.length < n) return null; var s = 0, c = 0; for (var i = arr.length - n; i < arr.length; i++) { if (isFinite(arr[i])) { s += arr[i]; c++; } } return c ? s / c : null; }
  function fmt(v, d) { var n = num(v); return n == null ? "—" : n.toFixed(d == null ? 2 : d); }
  function bps(v) { var n = num(v); if (n == null) return "—"; var b = Math.round(n * 100); return (b > 0 ? "+" : "") + b + " bps"; }
  function pct(v, d) { var n = num(v); return n == null ? "—" : (n > 0 ? "+" : "") + n.toFixed(d == null ? 1 : d) + "%"; }

  // piecewise-linear map value → risk 0..100 (anchors ascending by input value)
  function interp(x, anchors) {
    if (x == null || !isFinite(x)) return null;
    if (x <= anchors[0][0]) return anchors[0][1];
    var lastA = anchors[anchors.length - 1];
    if (x >= lastA[0]) return lastA[1];
    for (var i = 1; i < anchors.length; i++) {
      if (x <= anchors[i][0]) { var a = anchors[i - 1], b = anchors[i], t = (x - a[0]) / (b[0] - a[0]); return a[1] + t * (b[1] - a[1]); }
    }
    return lastA[1];
  }
  function zoneOf(risk) { return risk == null ? "normal" : risk < 25 ? "calm" : risk < 50 ? "normal" : risk < 75 ? "warning" : "danger"; }
  // momentum series: value now minus value `lag` bars ago (pct optional)
  function momSeries(c, lag, asPct) { var out = []; for (var i = 0; i < c.length; i++) { if (i < lag || !isFinite(c[i]) || !isFinite(c[i - lag])) out.push(null); else out.push(asPct ? (c[i] - c[i - lag]) / c[i - lag] * 100 : c[i] - c[i - lag]); } return out; }

  var TONE_RANK = { calm: 0, normal: 1, warning: 2, danger: 3 };
  function worstTone(a, b) { return (TONE_RANK[a] || 0) >= (TONE_RANK[b] || 0) ? a : b; }
  var TONE_TH = { calm: "ผ่อนคลาย", normal: "ปกติ", warning: "จับตา", danger: "เสี่ยง" };

  // คำอธิบายราย card (กดปุ่ม ⓘ เพื่อเปิด): ความหมาย · วิธีดู · ทำไมสำคัญ
  var EXPLAIN = {
    rates: { title: "🏦 ดอกเบี้ยสหรัฐ 10 ปี", meaning: "อัตราผลตอบแทนพันธบัตรรัฐบาลสหรัฐอายุ 10 ปี — เป็น “ต้นทุนเงิน” อ้างอิงของทั้งโลก และเป็นตัวคิดลดมูลค่าสินทรัพย์ทุกชนิด", how: "บาร์วัด “ความเร็ว” ที่ดอกเบี้ยเปลี่ยนใน 1 เดือน: ขึ้น ≥25bps = เข้าโซนจับตา, ≥50bps = เสี่ยง, ลง = ผ่อนคลาย · ลูกศรบอกว่ากำลังเร่งขึ้นหรือชะลอ", why: "ดอกเบี้ยขึ้นเร็ว = คิดลดกระแสเงินอนาคตแรงขึ้น → หุ้น growth/เทค และสินทรัพย์ที่ให้ผลตอบแทนไกล ๆ ราคาลงก่อนใคร เป็นตัวกดตลาดที่มาไว" },
    curve: { title: "📉 Yield Curve (10Y − 3M)", meaning: "ส่วนต่างดอกเบี้ยยาว (10 ปี) ลบดอกเบี้ยสั้น (3 เดือน) — บอกรูปทรงของเส้นอัตราผลตอบแทน", how: "เป็นบวก = ปกติ (ยาวสูงกว่าสั้น) · ติดลบ = “กลับหัว” (inverted) เข้าโซนเสี่ยง · ชันขึ้นเพราะดอกยาวพุ่ง = bear steepener (จับตา)", why: "curve กลับหัวเป็นสัญญาณเตือน recession ที่แม่นที่สุดในประวัติศาสตร์ (มักนำ 6–18 เดือน) และช่วง re-steepen หลังกลับหัวคือช่วงที่ตลาดพลิกผันบ่อยที่สุด" },
    long: { title: "🏛️ ดอกเบี้ยสหรัฐ 30 ปี", meaning: "ดอกเบี้ยพันธบัตรอายุยาวสุด สะท้อนมุมมองเงินเฟ้อและภาระหนี้ภาครัฐระยะยาว (term premium)", how: "บาร์วัดระดับ: เกิน 5.0% = จับตา, เกิน 5.25% = เสี่ยง", why: "30 ปีสูง = ตลาดเรียกผลตอบแทนชดเชยความเสี่ยงหนี้รัฐ ระดับเกิน 5% เคยจุดชนวน sell-off ข้ามสินทรัพย์ (หุ้น ทอง บอนด์ ร่วงพร้อมกัน)" },
    dxy: { title: "💵 Dollar Index (DXY)", meaning: "ดัชนีค่าเงินดอลลาร์เทียบตะกร้าสกุลเงินหลัก — เป็น “วาล์ว” เปิด/ปิดความเสี่ยงของโลก", how: "บาร์วัดการเปลี่ยนใน 1 เดือน: แข็งค่า ≥2.5% = จับตา, ≥4% = เสี่ยง · เทียบ MA50 ดูเทรนด์หลัก", why: "ดอลลาร์แข็ง = สภาพคล่องโลกตึง เงินไหลออกจากสินทรัพย์เสี่ยงและตลาดเกิดใหม่ กดหุ้นไทย ทอง และ crypto พร้อมกัน" },
    credit: { title: "🧾 เครดิต High-Yield (HYG)", meaning: "ETF พันธบัตรบริษัทเรตต่ำ (high-yield/junk) — เป็นตัวแทน “ความกล้าเสี่ยง” ของตลาดเครดิต", how: "บาร์วัดการเปลี่ยน 1 เดือน + อยู่เหนือ/ใต้ MA50: ร่วง ≥2% หรือหลุด MA50 = เริ่มเตือน", why: "ตลาดเครดิตมัก “รู้ก่อน” ตลาดหุ้น — เมื่อคนเริ่มเทขายหนี้เสี่ยง มักตามด้วยหุ้นปรับฐานใหญ่ จึงเป็นสัญญาณเตือนล่วงหน้าที่ดี" },
    move: { title: "🌊 ความผันผวนพันธบัตร (MOVE)", meaning: "“VIX ของตลาดพันธบัตร” — วัดความผันผวนที่ตลาดคาดของพันธบัตรรัฐบาลสหรัฐ", how: "บาร์วัดระดับ: เกิน 100 = จับตา, เกิน 120 = เสี่ยง", why: "พันธบัตรรัฐเป็นหลักประกันและสภาพคล่องของระบบการเงินโลก MOVE สูง = สภาพคล่องปั่นป่วน มักลามมาหุ้นและสินทรัพย์เสี่ยงภายในไม่กี่สัปดาห์" },
    score: { title: "🎯 Equity Risk Score", meaning: "คะแนนรวมความเสี่ยงตลาดหุ้น 0–100 จากระบบ (รวม VIX, VVIX, VIXEQ และความกระจุกตัวของหุ้นเทค)", how: "<25 ปกติ · 25–50 เฝ้าระวัง · 50–75 ระวัง · ≥75 ควรลดเสี่ยง/hedge", why: "เป็นตัวสรุปเร็วว่าตลาดหุ้นอยู่โหมดไหน และ Action Center ใช้คะแนนนี้ปรับน้ำหนักสัญญาณซื้อของแต่ละสินทรัพย์ด้วย" },
    vix: { title: "😱 VIX (ดัชนีความกลัว)", meaning: "ความผันผวนที่ตลาดคาดของ S&P 500 ใน 30 วันข้างหน้า — ยิ่งสูงยิ่งกลัว", how: "<15 นิ่งมาก (อาจชะล่าใจ) · 15–20 ปกติ · 20–30 เริ่มกลัว/ระวัง · >30 ตึงเครียด", why: "VIX พุ่ง = ตลาดกำลัง panic มักตรงกับจุดที่หุ้นร่วงแรง ส่วน VIX ต่ำมากนาน ๆ = ตลาดชะล่าใจ เสี่ยงพลิกกลับเมื่อมีข่าวร้าย" },
    vvix: { title: "🫥 VVIX (แรงซื้อประกัน)", meaning: "“ความผันผวนของ VIX เอง” — สะท้อนว่าตลาดกำลังไล่ซื้อ option ประกันความเสี่ยงหนาแน่นแค่ไหน", how: "เกิน 90 = เริ่มมีการ hedge · เกิน 100 = หนาแน่น", why: "VVIX มัก “นำ” VIX — ถ้า VIX ยังนิ่งแต่ VVIX พุ่ง แปลว่าเงินฉลาดกำลังซื้อประกันเงียบ ๆ ก่อนความผันผวนจริงจะมา" },
    ref: { title: "📋 ค่าอ้างอิงตลาดหุ้น", meaning: "ค่าดิบของกลุ่ม VIX complex และภาวะผู้นำตลาด (tech leadership) ไว้อ้างอิงเชิงลึก แต่ละช่องมี mini bar บอกโซนความเสี่ยง", how: "SPX/XLK 1M = ผลตอบแทน 1 เดือน · XLK−SPX = หุ้นเทคนำหรือตามตลาด · VIXEQ = ความผันผวนหุ้นรายตัว · VIXEQ−VIX = ส่วนต่างความเสี่ยงรายตัวกับดัชนี", why: "XLK−SPX สูง = ตลาดพึ่งหุ้นเทคไม่กี่ตัว (โครงสร้างเปราะ) · VIXEQ−VIX สูง = ความเสี่ยงรายตัวสูงกว่าดัชนี มักเป็นสัญญาณ risk ซ่อนอยู่" },
    rateMonitor: { title: "🏦 Interest Rate Risk Monitor", meaning: "เฝ้าระวัง US Treasury yields 10 ปี (^TNX) และ 30 ปี (^TYX) — เป็นต้นทุนเงินอ้างอิงที่ใช้คิดลดมูลค่าหุ้นทั้งตลาด โดยเฉพาะ growth / AI / Nasdaq และสินทรัพย์ที่ให้ผลตอบแทนไกล (long duration)", how: "ระดับ (ไม่เปลี่ยน): 10Y < 4.50% Healthy · 4.50–4.59% Caution · ≥ 4.60% High Alert / 30Y < 5.00% Healthy · 5.00–5.19% Caution · ≥ 5.20% High Alert.  Momentum (30 วัน): <10bps Stable · 10–20bps Rising · >20bps Rapidly Rising · ติดลบ = Falling.  ดูระดับ + momentum + percentile ประกอบกัน", why: "ดอกเบี้ยพันธบัตรที่สูงขึ้นทำให้ discount rate ที่ใช้คิดลดกำไรในอนาคตสูงขึ้น หุ้น growth/AI/เทค ที่กำไรอยู่ไกลในอนาคตจึงถูกกดดัน valuation แม้พื้นฐานธุรกิจไม่เปลี่ยน — เป็นสัญญาณลมต้าน (headwind) ที่มักมาก่อนตลาดปรับฐาน" },
    rateHeadwind: { title: "🌬️ Interest Rate Headwind", meaning: "คะแนนสรุปว่าดอกเบี้ยกำลังเป็น “ลมต้าน” ต่อพอร์ตแรงแค่ไหน — รวม ระดับ 10Y/30Y + โมเมนตัม 30 วัน + ความไวของพอร์ต เป็นระดับเดียว LOW / MODERATE / HIGH / SEVERE", how: "คะแนน = Level (Caution +1, High Alert +2 ต่อตัว) + Momentum (Rising +1, Rapidly Rising +2 ต่อตัว, Falling หักล้าง) + Portfolio (MEDIUM +1, HIGH +2).  รวม ≥6 SEVERE · 4–5 HIGH · 2–3 MODERATE · ≤1 LOW.  Headwind Strength (None→Severe) ใช้เฉพาะ Level+Momentum (แรงตลาดล้วน ไม่รวมพอร์ต).  ทุกเหตุผลแสดงเป็นรายการ ✓ ใต้การ์ด — ไม่มีการซ่อนการคำนวณ", why: "ตอบคำถามเดียวที่สำคัญ: yields กำลังเป็นลมต้านแรงขึ้นหรือไม่ และควรยกระดับการเฝ้าระวังหรือยัง — เป็น deterministic ล้วน ไม่พยากรณ์อนาคต" },
    rateCurve30: { title: "📐 Yield Curve Monitor (30Y − 10Y)", meaning: "ดูรูปทรงปลายยาวของเส้นดอกเบี้ย: 10Y, 30Y และส่วนต่าง (spread) — สะท้อนเงื่อนไขการเงิน “ระยะยาว” ว่ากำลังตึงขึ้นหรือผ่อนคลาย", how: "Tightening = 30Y ขึ้น ≥10bps/30วัน (หรือ spread กว้างขึ้นพร้อมดอกยาวขึ้น) · Improving = 30Y ลง ≥10bps/30วัน · นอกนั้น Stable — อธิบายสภาพปัจจุบันเท่านั้น ไม่พยากรณ์", why: "ต้นทุนกู้ยืมระยะยาว (บ้าน โครงสร้างพื้นฐาน หนี้บริษัท) อิงดอกยาว — ปลายยาวตึงขึ้นมักกดดัน valuation ข้ามสินทรัพย์แม้ดอกสั้นยังนิ่ง" },
    rateHist: { title: "📊 Historical Context", meaning: "ตำแหน่งของ yield ปัจจุบันเทียบประวัติ ~5 ปี: percentile + กรอบต่ำสุด–สูงสุด", how: "Percentile 82% = ปัจจุบันสูงกว่าประมาณ 82% ของค่าที่เคยเห็นในช่วง 5 ปี (นับจากข้อมูลจริง /api/ohlc 1825 วัน cache รายวัน — ถ้าโหลดไม่ได้จะใช้ช่วง ~12 เดือนและระบุไว้ตรง ๆ)", why: "บอกว่า “สูง” ที่เห็นนั้นสูงจริงเมื่อเทียบอดีตหรือแค่สูงเทียบเดือนก่อน — เป็นบริบท ไม่ใช่คำพยากรณ์" },
    rateSens: { title: "🎯 Portfolio Sensitivity", meaning: "พอร์ตของคุณไวต่อดอกเบี้ยแค่ไหน — วัดจากสัดส่วนมูลค่าจริงใน AI / Nasdaq-Tech / Growth / Long-duration (รวม crypto และบอนด์ยาว)", how: "จำแนกจาก holdings จริงใน snapshot: AI (NVDA, AMD, TSM, SMH, PLTR…) · Tech/Nasdaq (+MSFT, GOOG, AMZN, META, QQQ, XLK…) · Long-duration (+BTC, ETH, TLT).  Overall: HIGH เมื่อ Growth ≥50% หรือ AI ≥35% · MEDIUM เมื่อ Growth ≥25% หรือ AI ≥15% · ต่ำกว่านั้น LOW — เปอร์เซ็นต์และเกณฑ์แสดงบนการ์ดครบ", why: "ยิ่งพอร์ตกระจุกใน growth/long-duration แรงกดดันจากดอกเบี้ยขาขึ้นยิ่งแรง — sensitivity นี้ถูกนำไปรวมในคะแนน Headwind ด้วย" },
    riskAsset: { title: "🧭 Macro Risk → ระดับการถือสินทรัพย์เสี่ยง", meaning: "รวมทุกมาตรวัดในหน้านี้ (ดอกเบี้ย 10Y/30Y · yield curve · ดอลลาร์ · เครดิต HYG · MOVE · Equity Risk Score) เป็นคะแนน Macro Risk เดียว 0–100 แล้วแปลงเป็น “ระดับการถือ” สินทรัพย์เสี่ยงแต่ละตัว พร้อมลูกศรเทรนด์ราคา ~1 เดือนของตัวนั้น", how: "exposure = 100 − (Macro Risk × ความไวของสินทรัพย์): Bitcoin ไวสุด β1.30 · Nasdaq β1.15 · S&P β0.90 · SET50 β0.85 — แถบสี่โซน: <25 ลดหนัก/ขายออก · 25–49 ถือบางส่วน · 50–74 ลงทุนได้ · ≥75 ลงเงินเต็มส่วน หมุดคือตำแหน่งตอนนี้.  ลูกศรเทรนด์: ▲▲ ขึ้นแรง/เร็ว · ▲ ขึ้น · ▬ ทรงตัว · ▼ ลง · ▼▼ ลงแรง/เร็ว (เกณฑ์ ±2%/±6% ต่อเดือน; BTC ใช้ ±4%/±12% เพราะเหวี่ยงแรงกว่า)", why: "สินทรัพย์เสี่ยงไม่ได้โดน macro เท่ากัน — สภาพคล่องตึง/ดอกเบี้ยขึ้นกด BTC แรงกว่า Nasdaq และ Nasdaq แรงกว่า S&P/SET50 — ดู “ระดับที่ควรถือ” คู่กับ “เทรนด์จริงของราคา” ช่วยตัดสินใจว่าควรกล้าแค่ไหน ก่อนไปดูสัญญาณรายตัว" }
  };

  // trend on the RISK axis over ~10 trading days → {dir, toward, label}
  function riskTrend(axisSeries, anchors) {
    var vNow = last(axisSeries), vPrev = nBarsAgo(axisSeries, 10);
    var rNow = interp(vNow, anchors), rPrev = interp(vPrev, anchors);
    if (rNow == null || rPrev == null) return { dir: 0, toward: "flat", label: "ทรงตัว" };
    var d = rNow - rPrev;
    if (Math.abs(d) < 4) return { dir: 0, toward: "flat", label: "ทรงตัว" };
    return d > 0 ? { dir: 1, toward: "risk", label: "ความเสี่ยงกำลังเพิ่ม" } : { dir: -1, toward: "safe", label: "กำลังผ่อนคลาย" };
  }

  // ---------------------------------------------------------- macro data
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function writeCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} }

  function seriesFromSnapshot(keys) {
    var snap = readSnapshot(); var hist = (snap && snap.historicalData) || {};
    for (var i = 0; i < keys.length; i++) { var h = hist[keys[i]]; if (h && Array.isArray(h.closes) && h.closes.length >= 40) return { closes: h.closes.map(Number), dates: h.dates || [] }; }
    return null;
  }
  // minBars: Thai indices (^SET50.BK) only return a few sparse bars on this
  // pipeline — a lenient floor still lets us compute an honest 1M trend.
  async function fetchOhlc(sym, force, minBars) {
    minBars = minBars || 40;
    var cache = readCache(); var hit = cache[sym];
    if (!force && hit && hit.u === today() && Array.isArray(hit.c) && hit.c.length >= minBars) return { closes: hit.c, dates: hit.d || [] };
    try {
      var res = await fetch("/api/ohlc?symbol=" + encodeURIComponent(sym) + "&days=300", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var j = await res.json(); var bars = (j && j.bars) || []; var closes = [], dates = [];
      bars.forEach(function (b) { var c = num(b.close); if (c != null) { closes.push(c); dates.push(String(b.date).slice(0, 10)); } });
      if (closes.length >= minBars) { cache[sym] = { u: today(), c: closes.slice(-260), d: dates.slice(-260) }; writeCache(cache); return { closes: closes, dates: dates }; }
    } catch (_e) { /* keep stale */ }
    if (hit && Array.isArray(hit.c)) return { closes: hit.c, dates: hit.d || [] };
    return null;
  }
  async function loadMacro(force) {
    state.loadingMacro = true;
    state.macro.tnx = seriesFromSnapshot(["^TNX"]) || await fetchOhlc("^TNX", force);
    state.macro.dxy = seriesFromSnapshot(["DX-Y.NYB", "DXY"]) || await fetchOhlc("DX-Y.NYB", force);
    state.macro.vix = seriesFromSnapshot(["^VIX"]) || await fetchOhlc("^VIX", force);
    state.macro.vvix = seriesFromSnapshot(["^VVIX"]) || await fetchOhlc("^VVIX", force);
    var jobs = [["irx", "^IRX"], ["tyx", "^TYX"], ["hyg", "HYG"], ["move", "^MOVE"]];
    for (var i = 0; i < jobs.length; i++) state.macro[jobs[i][0]] = await fetchOhlc(jobs[i][1], force);
    // price-trend series for the risk-asset positioning card (snapshot first)
    state.macro.trBtc = seriesFromSnapshot(["BTCUSD", "BTC-USD"]) || await fetchOhlc("BTC-USD", force);
    state.macro.trNdx = seriesFromSnapshot(["^IXIC"]) || await fetchOhlc("^IXIC", force);
    state.macro.trSpx = seriesFromSnapshot(["^GSPC"]) || await fetchOhlc("^GSPC", force);
    state.macro.trSet = seriesFromSnapshot(["^SET50.BK"]) || await fetchOhlc("^SET50.BK", force, 2);
    state.loadingMacro = false;
  }

  // ---------------------------------------------------------- gauges
  // Each returns: { key, icon, title, value, valueSub, risk(0-100), tone,
  //                 trend:{dir,toward,label}, meaning, warn, spark }
  function gaugeRates() {
    var s = state.macro.tnx; if (!s) return null;
    var c = s.closes.map(yieldNorm);
    var mom = momSeries(c, 21, false); // Δ1M in yield points
    var anchors = [[-0.5, 0], [-0.25, 25], [0.25, 50], [0.5, 75], [0.8, 100]];
    var v = last(c), d1 = last(mom), d3 = (function () { var x = last(c), y = nBarsAgo(c, 63); return x != null && y != null ? x - y : null; })();
    var risk = interp(d1, anchors), tone = zoneOf(risk), trend = riskTrend(mom, anchors);
    var meaning, warn = null;
    if (tone === "danger") { meaning = "ดอกเบี้ยพุ่งเร็วมาก — กดดันหุ้น/สินทรัพย์เสี่ยงแรง"; warn = "ดอกเบี้ย 10 ปี พุ่ง " + bps(d1) + "/เดือน — หุ้น growth/เทคโดนกดดัน ระวังการปรับฐาน"; }
    else if (tone === "warning") { meaning = "ดอกเบี้ยเป็นขาขึ้น — เริ่มกดดัน valuation"; warn = "ดอกเบี้ย 10 ปี ขึ้น " + bps(d1) + "/เดือน — จับตาผลต่อหุ้น growth และสินทรัพย์ duration ยาว"; }
    else if (tone === "calm") meaning = "ดอกเบี้ยเป็นขาลง — ผ่อนแรงกดดันสินทรัพย์เสี่ยง";
    else meaning = "ดอกเบี้ยทรงตัว — ไม่กดดันเป็นพิเศษ";
    return { key: "rates", icon: "🏦", title: "ดอกเบี้ยสหรัฐ 10 ปี", value: fmt(v, 2) + "%", valueSub: "1M " + bps(d1) + " · 3M " + bps(d3), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: c };
  }

  function gaugeCurve() {
    var t = state.macro.tnx, r = state.macro.irx; if (!t || !r) return null;
    var tC = t.closes.map(yieldNorm), rC = r.closes.map(yieldNorm);
    var n = Math.min(tC.length, rC.length), curve = [];
    for (var i = 0; i < n; i++) { var a = tC[tC.length - n + i], b = rC[rC.length - n + i]; curve.push(a != null && b != null ? a - b : null); }
    var anchors = [[-0.5, 95], [0, 75], [0.3, 55], [0.8, 30], [1.6, 10]];
    var v = last(curve), m1 = nBarsAgo(curve, 21), d1 = v != null && m1 != null ? v - m1 : null;
    var tenD1 = (function () { var x = last(tC), y = nBarsAgo(tC, 21); return x != null && y != null ? x - y : null; })();
    var risk = interp(v, anchors);
    var steepener = v != null && v > 0 && d1 != null && d1 > 0.15 && tenD1 != null && tenD1 > 0.15;
    if (steepener) risk = Math.max(risk || 0, 58); // bear steepener is its own risk
    var tone = zoneOf(risk), trend = riskTrend(curve, anchors);
    var meaning, warn = null;
    if (v != null && v < 0) { meaning = "Curve กลับหัว (inverted) — สัญญาณเตือน recession แบบคลาสสิก"; warn = "Yield curve 10Y−3M ติดลบ (" + fmt(v, 2) + "pp) — ประวัติศาสตร์มักตามด้วยเศรษฐกิจชะลอ อย่าเพิ่มความเสี่ยงแรง"; }
    else if (steepener) { meaning = "Curve ชันขึ้นเพราะดอกยาวพุ่ง (bear steepener) — กังวลเงินเฟ้อ/หนี้ภาครัฐ"; warn = "Curve ชันขึ้นจากฝั่งดอกเบี้ยยาว (+" + bps(d1) + "/เดือน) — bear steepener มักกดดันทั้งหุ้นและบอนด์"; }
    else if (tone === "warning") { meaning = "Curve เกือบแบน/เพิ่งพ้น inversion — ช่วงหัวเลี้ยวหัวต่อ มักผันผวน"; warn = "Yield curve แบน (" + fmt(v, 2) + "pp) — ช่วง re-steepening หลัง inversion ตลาดพลิกผันบ่อย"; }
    else meaning = "Curve ปกติ (ชันพอดี) — ระบบการเงินยังไหลลื่น";
    return { key: "curve", icon: "📉", title: "Yield Curve (10Y − 3M)", value: fmt(v, 2) + " pp", valueSub: "1M " + bps(d1), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: curve };
  }

  function gaugeLongBond() {
    var s = state.macro.tyx; if (!s) return null;
    var c = s.closes.map(yieldNorm);
    var anchors = [[3.5, 10], [4.5, 35], [5.0, 55], [5.25, 78], [5.75, 100]];
    var v = last(c), m1 = nBarsAgo(c, 21), d1 = v != null && m1 != null ? v - m1 : null;
    var risk = interp(v, anchors), tone = zoneOf(risk), trend = riskTrend(c, anchors);
    var meaning, warn = null;
    if (tone === "danger") { meaning = "ดอกเบี้ย 30 ปี สูงอันตราย — ตลาดเรียกร้องผลตอบแทนชดเชยหนี้ภาครัฐ"; warn = "ดอกเบี้ย 30 ปี " + fmt(v, 2) + "% — ระดับที่เคยจุดชนวน sell-off ข้ามสินทรัพย์"; }
    else if (tone === "warning") { meaning = "ดอกเบี้ย 30 ปี สูง (>5%) — แรงกดดัน fiscal/term premium ชัดเจน"; warn = "ดอกเบี้ย 30 ปี " + fmt(v, 2) + "% — ระดับนี้กดดัน valuation หุ้นทั้งกระดาน"; }
    else meaning = "ดอกเบี้ยยาวยังอยู่ในกรอบ";
    return { key: "long", icon: "🏛️", title: "ดอกเบี้ยสหรัฐ 30 ปี", value: fmt(v, 2) + "%", valueSub: "1M " + bps(d1), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: c };
  }

  function gaugeDollar() {
    var s = state.macro.dxy; if (!s) return null;
    var c = s.closes.map(Number);
    var mom = momSeries(c, 21, true); // Δ1M %
    var anchors = [[-4, 10], [0, 30], [2.5, 55], [4, 78], [7, 100]];
    var v = last(c), d1 = last(mom), m50 = ma(c, 50);
    var risk = interp(d1, anchors), tone = zoneOf(risk), trend = riskTrend(mom, anchors);
    var meaning, warn = null;
    if (tone === "danger") { meaning = "ดอลลาร์พุ่งแรง — เงินไหลออกจากสินทรัพย์เสี่ยง/ตลาดเกิดใหม่"; warn = "DXY แข็งค่า " + pct(d1) + "/เดือน — กดดันหุ้นไทย, ทอง, crypto พร้อมกัน"; }
    else if (tone === "warning") { meaning = "ดอลลาร์กำลังแข็งค่า — สัญญาณ risk-off เริ่มก่อตัว"; warn = "DXY แข็งค่า " + pct(d1) + "/เดือน — มักมาก่อนแรงขายในสินทรัพย์เสี่ยง"; }
    else if (tone === "calm") meaning = "ดอลลาร์อ่อน — บวกต่อสินทรัพย์เสี่ยงและทอง";
    else meaning = "ดอลลาร์ทรงตัว";
    return { key: "dxy", icon: "💵", title: "Dollar Index (DXY)", value: fmt(v, 1), valueSub: "1M " + pct(d1) + (m50 != null ? " · MA50 " + fmt(m50, 1) : ""), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: c };
  }

  function gaugeCredit() {
    var s = state.macro.hyg; if (!s) return null;
    var c = s.closes.map(Number);
    var mom = momSeries(c, 21, true);
    var anchors = [[-4, 95], [-2, 72], [0, 35], [3, 10]];
    var v = last(c), d1 = last(mom), m50 = ma(c, 50), below = m50 != null && v != null && v < m50;
    var risk = interp(d1, anchors); if (below) risk = Math.max(risk || 0, 56);
    var tone = zoneOf(risk), trend = riskTrend(mom, anchors);
    var meaning, warn = null;
    if (tone === "danger") { meaning = "หนี้ high-yield ถูกเทขาย — สัญญาณ stress ที่มักนำตลาดหุ้น"; warn = "HYG ร่วง " + pct(d1) + "/เดือน — ตลาดเครดิตตึง มักเห็นก่อนหุ้นปรับฐานใหญ่"; }
    else if (tone === "warning") { meaning = "เครดิตเริ่มอ่อนแรง (HYG ใต้ MA50) — ความเชื่อมั่นในหนี้เสี่ยงสั่น"; warn = "HYG " + (below ? "อยู่ใต้ MA50" : "อ่อนแรง") + " — เครดิตส่งสัญญาณระวัง จับตาว่าจะลามไหม"; }
    else meaning = "ตลาดเครดิตปกติ — นักลงทุนยังกล้าถือหนี้เสี่ยง";
    return { key: "credit", icon: "🧾", title: "เครดิต High-Yield (HYG)", value: fmt(v, 2), valueSub: "1M " + pct(d1) + (m50 != null ? (below ? " · ใต้ MA50" : " · เหนือ MA50") : ""), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: c };
  }

  function gaugeBondVol() {
    var s = state.macro.move; if (!s) return null;
    var c = s.closes.map(Number);
    var anchors = [[50, 10], [80, 30], [100, 55], [120, 80], [160, 100]];
    var v = last(c), m1 = nBarsAgo(c, 21), d1 = v != null && m1 != null ? v - m1 : null;
    var risk = interp(v, anchors), tone = zoneOf(risk), trend = riskTrend(c, anchors);
    var meaning, warn = null;
    if (tone === "danger") { meaning = "ตลาดพันธบัตรปั่นป่วนหนัก — ทุกสินทรัพย์เสี่ยงสะเทือน"; warn = "MOVE " + fmt(v, 0) + " — ความผันผวนบอนด์ระดับวิกฤต มักลามมาหุ้นภายในไม่กี่สัปดาห์"; }
    else if (tone === "warning") { meaning = "ความผันผวนบอนด์สูง (>100) — สภาพคล่องเริ่มไม่นิ่ง"; warn = "MOVE " + fmt(v, 0) + " — ตลาดพันธบัตรไม่นิ่ง ระวังแรงเหวี่ยงข้ามสินทรัพย์"; }
    else if (tone === "calm") meaning = "บอนด์นิ่ง — สภาพแวดล้อมเอื้อสินทรัพย์เสี่ยง";
    else meaning = "ตลาดพันธบัตรปกติ";
    return { key: "move", icon: "🌊", title: "ความผันผวนพันธบัตร (MOVE)", value: fmt(v, 0), valueSub: "1M " + (d1 == null ? "—" : (d1 > 0 ? "+" : "") + fmt(d1, 0)), risk: risk, tone: tone, trend: trend, meaning: meaning, warn: warn, spark: c };
  }

  function macroGauges() { return [gaugeRates(), gaugeCurve(), gaugeLongBond(), gaugeDollar(), gaugeCredit(), gaugeBondVol()].filter(Boolean); }

  // ---------------------------------------------------------- views
  function spark(closes, tone) {
    if (!closes) return "";
    var pts = closes.slice(-63).filter(function (v) { return isFinite(v); });
    if (pts.length < 10) return "";
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), range = max - min || 1, W = 96, H = 26;
    var d = pts.map(function (v, i) { return (i === 0 ? "M" : "L") + (i / (pts.length - 1) * W).toFixed(1) + "," + (H - ((v - min) / range) * (H - 4) - 2).toFixed(1); }).join(" ");
    var color = tone === "danger" ? "#f43f5e" : tone === "warning" ? "#f59e0b" : tone === "calm" ? "#34d399" : "#64748b";
    return '<svg class="mr-spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
  }

  function zoneBar(risk) {
    if (risk == null) return "";
    var r = Math.max(0, Math.min(100, risk));
    return '<div class="mr-bar">' +
      '<div class="mr-bar-seg mr-seg-calm"></div><div class="mr-bar-seg mr-seg-normal"></div>' +
      '<div class="mr-bar-seg mr-seg-warning"></div><div class="mr-bar-seg mr-seg-danger"></div>' +
      '<div class="mr-bar-marker" style="left:' + r.toFixed(1) + '%"></div></div>' +
      '<div class="mr-bar-labels"><span>ผ่อนคลาย</span><span>ปกติ</span><span>จับตา</span><span>เสี่ยง</span></div>';
  }

  function gaugeCard(g) {
    var trHtml = "";
    if (g.trend) {
      var tr = g.trend, trCls = tr.toward === "risk" ? "mr-tr-risk" : tr.toward === "safe" ? "mr-tr-safe" : "mr-tr-flat";
      var arw = tr.dir > 0 ? "▲" : tr.dir < 0 ? "▼" : "▬";
      trHtml = '<span class="mr-trend ' + trCls + '">' + arw + " " + esc(tr.label) + "</span>";
    }
    var info = g.key && EXPLAIN[g.key] ? '<button class="mr-info" type="button" data-explain="' + g.key + '" aria-label="คำอธิบาย ' + esc(g.title) + '">i</button>' : "";
    return '<article class="mr-card mr-' + g.tone + '">' +
      '<div class="mr-card-top"><span class="mr-card-title">' + g.icon + " " + esc(g.title) + '</span>' +
      '<span class="mr-card-top-right">' + info + '<span class="mr-tone-pill">' + esc(TONE_TH[g.tone] || g.tone) + "</span></span></div>" +
      zoneBar(g.risk) +
      '<div class="mr-card-foot"><span class="mr-value">' + esc(g.value) + "</span>" + trHtml + spark(g.spark, g.tone) + "</div>" +
      (g.valueSub ? '<div class="mr-sub">' + esc(g.valueSub) + "</div>" : "") +
      '<div class="mr-meaning">' + esc(g.meaning) + "</div></article>";
  }

  var VIX_ANCHORS = [[12, 8], [15, 25], [20, 50], [25, 68], [30, 82], [45, 100]];
  var VVIX_ANCHORS = [[80, 15], [90, 50], [100, 75], [115, 90], [135, 100]];

  function scoreGauge() {
    var api = state.api; if (!api || !api.risk) return null;
    var risk = num(api.risk.score), lvl = api.risk.level || {};
    // API score bands (25/50/75) line up with the zone boundaries.
    return { key: "score", icon: "🎯", title: "Equity Risk Score", value: (risk != null ? risk : "—") + "/100", valueSub: lvl.label || "", risk: risk, tone: zoneOf(risk), trend: null, meaning: lvl.thai || "รวมสัญญาณ VIX complex + tech leadership", spark: null };
  }
  function gaugeVix() {
    var m = state.api && state.api.metrics; var s = state.macro.vix;
    var c = s ? s.closes.map(Number) : null;
    var v = c ? last(c) : (m ? num(m.vix) : null); if (v == null) return null;
    var risk = interp(v, VIX_ANCHORS), tone = zoneOf(risk), trend = c ? riskTrend(c, VIX_ANCHORS) : null;
    var meaning = tone === "danger" ? "ตลาดตึงเครียด — ความกลัวสูง" : tone === "warning" ? "ความกลัวเริ่มสูงขึ้น" : tone === "calm" ? "ตลาดนิ่งมาก (ระวัง complacent)" : "ความผันผวนปกติ";
    return { key: "vix", icon: "😱", title: "VIX (ความกลัวหุ้น)", value: fmt(v, 1), valueSub: "เกณฑ์ 20 = เริ่มระวัง · 30 = ตึงเครียด", risk: risk, tone: tone, trend: trend, meaning: meaning, spark: c };
  }
  function gaugeVvix() {
    var m = state.api && state.api.metrics; var s = state.macro.vvix;
    var c = s ? s.closes.map(Number) : null;
    var v = c ? last(c) : (m ? num(m.vvix) : null); if (v == null) return null;
    var risk = interp(v, VVIX_ANCHORS), tone = zoneOf(risk), trend = c ? riskTrend(c, VVIX_ANCHORS) : null;
    var d5 = c ? (function () { var x = last(c), y = nBarsAgo(c, 5); return x != null && y != null ? (x - y) / y * 100 : null; })() : (m ? num(m.vvixFiveDayChangePct) : null);
    var meaning = (tone === "warning" || tone === "danger") ? "สถาบันเริ่มซื้อประกันความเสี่ยง — มักนำ VIX" : "แรงซื้อ hedge ปกติ";
    return { key: "vvix", icon: "🫥", title: "VVIX (แรงซื้อประกัน)", value: fmt(v, 1), valueSub: "5D " + pct(d5) + " · เกณฑ์ 90/100", risk: risk, tone: tone, trend: trend, meaning: meaning, spark: c };
  }
  function equityCards() {
    var api = state.api;
    if (!api) return '<div class="risk-empty">' + (state.apiError ? "โหลดข้อมูลตลาดหุ้นไม่สำเร็จ — " + esc(state.apiError) : "กำลังโหลด…") + "</div>";
    return [scoreGauge(), gaugeVix(), gaugeVvix()].filter(Boolean).map(gaugeCard).join("");
  }

  // secondary reference — raw VIX-complex numbers, each with a mini status bar
  var REF_DEFS = [
    { label: "SPX 1M", key: "spxOneMonthReturn", d: 2, anchors: [[-8, 88], [-3, 62], [0, 45], [4, 25], [9, 14]], suffix: "%" },
    { label: "XLK 1M", key: "xlkOneMonthReturn", d: 2, anchors: [[-8, 88], [-3, 62], [0, 45], [4, 25], [9, 14]], suffix: "%" },
    { label: "XLK−SPX", key: "techLeadershipSpread", d: 2, anchors: [[-3, 30], [0, 28], [5, 46], [10, 62], [15, 80], [22, 95]], suffix: "%" },
    { label: "VIX", key: "vix", d: 2, anchors: VIX_ANCHORS },
    { label: "VVIX", key: "vvix", d: 2, anchors: VVIX_ANCHORS },
    { label: "VIXEQ", key: "vixeq", d: 2, anchors: [[20, 15], [35, 45], [50, 65], [70, 90]], needVixeq: true },
    { label: "VIXEQ−VIX", key: "vixeqSpread", d: 2, anchors: [[0, 25], [15, 50], [30, 68], [45, 88]], needVixeq: true }
  ];
  function miniBar(risk) {
    if (risk == null) return '<div class="mr-minibar mr-minibar-empty"></div>';
    var r = Math.max(0, Math.min(100, risk));
    return '<div class="mr-minibar"><div class="mr-bar-seg mr-seg-calm"></div><div class="mr-bar-seg mr-seg-normal"></div><div class="mr-bar-seg mr-seg-warning"></div><div class="mr-bar-seg mr-seg-danger"></div><div class="mr-bar-marker" style="left:' + r.toFixed(1) + '%"></div></div>';
  }
  function equityRefStrip() {
    var m = state.api && state.api.metrics; if (!m) return "";
    var hasVixeq = num(m.vixeq) && m.vixeq > 0;
    var cells = REF_DEFS.map(function (def) {
      var v = (def.needVixeq && !hasVixeq) ? null : num(m[def.key]);
      var risk = v == null ? null : interp(v, def.anchors);
      var tone = risk == null ? "" : zoneOf(risk);
      var txt = v == null ? "—" : (def.suffix === "%" ? pct(v, def.d) : fmt(v, def.d));
      return '<div class="mr-ref-cell"><span>' + esc(def.label) + '</span>' +
        '<b class="mr-val-' + tone + '">' + esc(txt) + "</b>" + miniBar(risk) + "</div>";
    }).join("");
    return '<div class="mr-ref-title">ค่าอ้างอิงตลาดหุ้น (secondary) <button class="mr-info" type="button" data-explain="ref" aria-label="คำอธิบายค่าอ้างอิง">i</button></div><div class="mr-ref-strip">' + cells + "</div>";
  }

  function overallVerdict(gauges) {
    var api = state.api, apiToneMap = { normal: "normal", watch: "warning", caution: "warning", danger: "danger" };
    var equityTone = api && api.risk && api.risk.level ? (apiToneMap[api.risk.level.tone] || "normal") : "normal";
    var dangers = gauges.filter(function (g) { return g.tone === "danger"; }).length;
    var warnings = gauges.filter(function (g) { return g.tone === "warning"; }).length;
    var rising = gauges.filter(function (g) { return g.trend && g.trend.toward === "risk"; }).length;
    var macroTone = dangers >= 2 ? "danger" : dangers === 1 ? "warning" : warnings >= 2 ? "warning" : "normal";
    var tone = worstTone(equityTone, macroTone);
    var label = tone === "danger" ? "ลดความเสี่ยง / ตั้งการ์ดสูง" : tone === "warning" ? "ระวังตัว — มีสัญญาณเตือน" : "สภาพแวดล้อมปกติ";
    var parts = [];
    parts.push(dangers + warnings > 0 ? "macro เตือน " + (dangers + warnings) + " ตัว" + (dangers ? " (เสี่ยง " + dangers + ")" : "") : "macro ไม่มีสัญญาณเตือน");
    if (rising > 0) parts.push(rising + " ตัวความเสี่ยงกำลังเพิ่ม");
    if (api && api.risk) parts.push("ตลาดหุ้น: " + (api.risk.level && api.risk.level.thai ? api.risk.level.thai : "—") + " (" + api.risk.score + ")");
    return { tone: tone, label: label, detail: parts.join(" · ") };
  }

  function warningsList(gauges) {
    var items = [];
    gauges.forEach(function (g) { if (g.warn) items.push({ sev: g.tone === "danger" ? 2 : 1, text: g.warn }); });
    var flags = (state.api && state.api.flags) || [];
    flags.forEach(function (f) { if (f.severity === "danger" || f.severity === "warning") items.push({ sev: f.severity === "danger" ? 2 : 1, text: (f.thai || f.label) + (f.detail ? " — " + f.detail : "") }); });
    items.sort(function (a, b) { return b.sev - a.sev; });
    if (!items.length) return '<div class="mr-allclear">✅ ตอนนี้ไม่มีสัญญาณเตือนที่ต้องกังวลเป็นพิเศษ</div>';
    return '<ul class="mr-warn-list">' + items.map(function (it) { return '<li class="' + (it.sev === 2 ? "mr-warn-danger" : "mr-warn-warning") + '">' + (it.sev === 2 ? "🔴" : "🟠") + " " + esc(it.text) + "</li>"; }).join("") + "</ul>";
  }

  // ---------------------------------------------------------- Interest Rate Risk Monitor
  // Early-warning view on US Treasury yields. REUSES state.macro.tnx (^TNX, 10Y) and
  // state.macro.tyx (^TYX, 30Y) — no new data source. Thresholds are fixed per spec;
  // this is additive and does not touch the existing gauge logic above.
  var WHY_RATES_EN = "Higher Treasury yields increase the discount rate applied to future corporate earnings. As a result, long-duration growth assets such as AI and technology companies may experience valuation pressure even if business fundamentals remain unchanged.";
  var WHY_RATES_TH = "ดอกเบี้ยพันธบัตรที่สูงขึ้น = discount rate ที่ใช้คิดลดกำไรในอนาคตสูงขึ้น หุ้น growth/AI/เทค จึงถูกกดดัน valuation แม้พื้นฐานธุรกิจไม่เปลี่ยน";
  var RATE_SEV = { healthy: 0, caution: 1, alert: 2 };
  var RATE_DEFS = [
    {
      key: "us10y", label: "US 10-Year Treasury (^TNX)", get: function () { return state.macro.tnx; },
      caution: 4.50, alert: 4.60, impact: "หุ้น growth / AI / Nasdaq",
      msgCaution: "Higher yields may begin to limit valuation expansion. Growth assets could face increasing headwinds.",
      msgAlert: "US 10-Year Treasury Yield has exceeded 4.60%. Historically, elevated long-term yields often create significant valuation pressure on growth stocks and AI-related assets. Portfolio should be monitored carefully."
    },
    {
      key: "us30y", label: "US 30-Year Treasury (^TYX)", get: function () { return state.macro.tyx; },
      caution: 5.00, alert: 5.20, impact: "สินทรัพย์ duration ยาว / ต้นทุนกู้ยืมระยะยาว",
      msgCaution: "Long-duration financing costs are rising.",
      msgAlert: "US 30-Year Treasury Yield has exceeded 5.20%. Historically this may indicate tighter financial conditions and increasing pressure on long-duration assets."
    }
  ];

  function rateStatus(def, y) { return y == null ? null : y >= def.alert ? "alert" : y >= def.caution ? "caution" : "healthy"; }
  function rateTone(st) { return st === "alert" ? "danger" : st === "caution" ? "warning" : st === "healthy" ? "calm" : "normal"; }
  function rateStatusLabel(st) { return st === "alert" ? "High Alert" : st === "caution" ? "Caution" : st === "healthy" ? "Healthy" : "—"; }
  function yieldSeries(def) { var s = def.get(); return s ? s.closes.map(yieldNorm) : null; }
  function rateTrend(c) {
    if (!c) return { cls: "mr-tr-flat", arw: "▬", label: "รอข้อมูล" };
    var v = last(c), m1 = nBarsAgo(c, 21), d = v != null && m1 != null ? Math.round((v - m1) * 100) : null;
    if (d == null) return { cls: "mr-tr-flat", arw: "▬", label: "ทรงตัว" };
    if (d >= 5) return { cls: "mr-tr-risk", arw: "▲", label: "กำลังขึ้น +" + d + " bps/เดือน" };
    if (d <= -5) return { cls: "mr-tr-safe", arw: "▼", label: "กำลังลง " + d + " bps/เดือน" };
    return { cls: "mr-tr-flat", arw: "▬", label: "ทรงตัว (" + (d > 0 ? "+" : "") + d + " bps)" };
  }

  // ===== V2 enhancement — momentum / headwind score / sensitivity / curve / history =====
  // All deterministic. Reuses state.macro.tnx/.tyx + snapshot holdings + the existing
  // /api/ohlc endpoint (longer window, cached daily) — no new APIs, no forecasts.

  // yield momentum: bps changes over ~7 calendar days (5 bars) and ~30 days (21 bars)
  function yieldMomentum(c) {
    if (!c) return null;
    var v = last(c), w = nBarsAgo(c, 5), m = nBarsAgo(c, 21);
    var d7 = v != null && w != null ? Math.round((v - w) * 100) : null;
    var d30 = v != null && m != null ? Math.round((v - m) * 100) : null;
    var cls, label;
    if (d30 == null) { cls = "flat"; label = "รอข้อมูล"; }
    else if (d30 < 0) { cls = "falling"; label = "Falling"; }
    else if (d30 < 10) { cls = "stable"; label = "Stable"; }
    else if (d30 <= 20) { cls = "rising"; label = "Rising"; }
    else { cls = "rapid"; label = "Rapidly Rising"; }
    return { d7: d7, d30: d30, cls: cls, label: label };
  }
  function bpsTxt(b) { return b == null ? "—" : (b > 0 ? "+" : "") + b + " bps"; }

  // 5-year history (same /api/ohlc endpoint, own daily cache) — used ONLY for percentile context
  var CACHE5Y_KEY = "macro_ohlc_5y_v1";
  function read5yCache() { try { return JSON.parse(localStorage.getItem(CACHE5Y_KEY) || "{}") || {}; } catch (e) { return {}; } }
  async function fetch5y(sym) {
    var cache = read5yCache(); var hit = cache[sym];
    if (hit && hit.u === today() && Array.isArray(hit.c) && hit.c.length >= 200) return { closes: hit.c };
    try {
      var res = await fetch("/api/ohlc?symbol=" + encodeURIComponent(sym) + "&days=1825", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var j = await res.json(); var closes = [];
      ((j && j.bars) || []).forEach(function (b) { var c = num(b.close); if (c != null) closes.push(c); });
      if (closes.length >= 200) { cache[sym] = { u: today(), c: closes }; try { localStorage.setItem(CACHE5Y_KEY, JSON.stringify(cache)); } catch (e) {} return { closes: closes }; }
    } catch (_e) { /* fall back below */ }
    if (hit && Array.isArray(hit.c)) return { closes: hit.c };
    return null;
  }
  async function load5y() {
    state.macro.tnx5y = await fetch5y("^TNX");
    state.macro.tyx5y = await fetch5y("^TYX");
  }
  // percentile of current yield within a history series; falls back to the ~1Y series (honest label)
  function histContext(defKey, current) {
    if (current == null) return null;
    var five = defKey === "us10y" ? state.macro.tnx5y : state.macro.tyx5y;
    var fallback = defKey === "us10y" ? state.macro.tnx : state.macro.tyx;
    var src = five || fallback; if (!src) return null;
    var c = src.closes.map(yieldNorm).filter(function (v) { return v != null && isFinite(v); });
    if (c.length < 60) return null;
    var below = 0; c.forEach(function (v) { if (v < current) below++; });
    var pctile = Math.round(below / c.length * 100);
    var min = Math.min.apply(null, c), max = Math.max.apply(null, c);
    return { pctile: pctile, min: min, max: max, span: five ? "5 ปี" : "~12 เดือน (ข้อมูล 5 ปีไม่พร้อม)" };
  }

  // portfolio sensitivity from snapshot holdings (deterministic symbol classification)
  var SENS_AI = ["NVDA", "AMD", "AVGO", "TSM", "SMH", "SMCI", "PLTR", "ASML", "MU", "ARM", "MRVL", "NDX01", "SPTECH"];
  var SENS_TECH = ["MSFT", "GOOG", "GOOGL", "AMZN", "META", "AAPL", "QQQ", "TQQQ", "XLK", "^NDX", "^IXIC", "NDX", "TSLA", "ORCL", "CRM", "NFLX"];
  var SENS_LONGDUR_EXTRA = ["BTC", "ETH", "TLT", "GOVT", "EDV"];
  function symInList(sym, list) {
    var u = String(sym || "").toUpperCase();
    for (var i = 0; i < list.length; i++) { if (u === list[i] || u.indexOf(list[i]) === 0) return true; }
    return false;
  }
  function portfolioSensitivity() {
    var snap = readSnapshot();
    var rows = (snap && snap.portfolioHoldings && snap.portfolioHoldings.data) || [];
    if (!rows.length) {
      return { known: false, level: "MEDIUM", tone: "warning", ai: null, nasdaq: null, growth: null, longDur: null,
        why: "ไม่พบข้อมูลพอร์ต (snapshot) — ใช้ค่า default MEDIUM จนกว่าจะโหลดพอร์ตจากหน้า Home" };
    }
    var total = 0, vAI = 0, vTech = 0, vLong = 0, counted = 0;
    rows.forEach(function (h) {
      var sym = h.canonicalSymbol || h.canonical_symbol || h.display_symbol || h.ticker || "";
      var v = num(h.marketValue != null ? h.marketValue : (h.market_value != null ? h.market_value : h.value));
      if (v == null || v <= 0) v = 1; // value unknown → equal-weight fallback
      else counted++;
      total += v;
      var isAI = symInList(sym, SENS_AI);
      var isTech = isAI || symInList(sym, SENS_TECH);
      var isLong = isTech || symInList(sym, SENS_LONGDUR_EXTRA);
      if (isAI) vAI += v;
      if (isTech) vTech += v;
      if (isLong) vLong += v;
    });
    var ai = total ? Math.round(vAI / total * 100) : 0;
    var nasdaq = total ? Math.round(vTech / total * 100) : 0;
    var growth = nasdaq; // growth exposure = tech/Nasdaq-style long-duration equities
    var longDur = total ? Math.round(vLong / total * 100) : 0;
    var level = growth >= 50 || ai >= 35 ? "HIGH" : growth >= 25 || ai >= 15 ? "MEDIUM" : "LOW";
    var tone = level === "HIGH" ? "danger" : level === "MEDIUM" ? "warning" : "calm";
    var why = "AI " + ai + "% · Nasdaq/Tech " + nasdaq + "% · Long-duration " + longDur + "% ของพอร์ต ("
      + rows.length + " holdings" + (counted < rows.length ? ", บางตัวไม่มีมูลค่า → นับน้ำหนักเท่ากัน" : "") + ") — เกณฑ์: HIGH เมื่อ Growth ≥50% หรือ AI ≥35% · MEDIUM เมื่อ Growth ≥25% หรือ AI ≥15%";
    return { known: true, level: level, tone: tone, ai: ai, nasdaq: nasdaq, growth: growth, longDur: longDur, why: why };
  }
  function expLevel(p) { return p == null ? "—" : p >= 40 ? "High" : p >= 20 ? "Medium" : "Low"; }

  // headwind points: level (0/1/2 per yield) + momentum (falling −1 / rising +1 / rapid +2) + sensitivity (0/1/2)
  function headwindModel() {
    var out = { reasons: [], levelPts: 0, momPts: 0, sensPts: 0 };
    RATE_DEFS.forEach(function (def) {
      var c = yieldSeries(def), y = c ? last(c) : null;
      var st = rateStatus(def, y), mom = yieldMomentum(c);
      var name = def.key === "us10y" ? "10Y" : "30Y";
      if (st === "alert") { out.levelPts += 2; out.reasons.push("✓ " + name + " ≥ " + def.alert.toFixed(2) + "% (High Alert)"); }
      else if (st === "caution") { out.levelPts += 1; out.reasons.push("✓ " + name + " เกิน " + def.caution.toFixed(2) + "% (Caution)"); }
      if (mom) {
        if (mom.cls === "rapid") { out.momPts += 2; out.reasons.push("✓ " + name + " ขึ้นเร็ว " + bpsTxt(mom.d30) + "/30 วัน (Rapidly Rising)"); }
        else if (mom.cls === "rising") { out.momPts += 1; out.reasons.push("✓ " + name + " กำลังขึ้น " + bpsTxt(mom.d30) + "/30 วัน"); }
        else if (mom.cls === "falling") { out.momPts -= 1; }
      }
    });
    out.momPts = Math.max(0, out.momPts);
    var sens = portfolioSensitivity();
    out.sens = sens;
    out.sensPts = sens.level === "HIGH" ? 2 : sens.level === "MEDIUM" ? 1 : 0;
    if (sens.level === "HIGH") out.reasons.push("✓ พอร์ตกระจุกใน AI/Growth (sensitivity HIGH)");
    else if (sens.level === "MEDIUM") out.reasons.push("✓ พอร์ตมีสัดส่วน Growth ปานกลาง (sensitivity MEDIUM)");
    out.total = out.levelPts + out.momPts + out.sensPts;
    out.level = out.total >= 6 ? "SEVERE" : out.total >= 4 ? "HIGH" : out.total >= 2 ? "MODERATE" : "LOW";
    out.tone = out.level === "SEVERE" ? "danger" : out.level === "HIGH" ? "danger" : out.level === "MODERATE" ? "warning" : "calm";
    // headwind strength = level + momentum only (portfolio-independent market force)
    var s = out.levelPts + out.momPts;
    out.strength = s >= 6 ? "Severe" : s >= 4 ? "Strong" : s >= 2 ? "Moderate" : s >= 1 ? "Light" : "None";
    // early warning: rising fast although High Alert not yet reached
    out.earlyWarnings = [];
    RATE_DEFS.forEach(function (def) {
      var c = yieldSeries(def), y = c ? last(c) : null;
      var st = rateStatus(def, y), mom = yieldMomentum(c);
      if (mom && mom.d30 != null && mom.d30 > 20 && st !== "alert") {
        out.earlyWarnings.push("⚠️ Early Warning: " + (def.key === "us10y" ? "10Y" : "30Y")
          + " ขึ้น " + bpsTxt(mom.d30) + " ใน 30 วัน — Yields are rising rapidly although High Alert has not yet been reached.");
      }
    });
    return out;
  }

  function rateCard(def) {
    var c = yieldSeries(def), y = c ? last(c) : null, st = rateStatus(def, y), tone = rateTone(st);
    var tr = rateTrend(c), msg = st === "alert" ? def.msgAlert : st === "caution" ? def.msgCaution : null;
    var mom = yieldMomentum(c), hist = histContext(def.key, y);
    var momCls = mom ? ("mr-mom-" + mom.cls) : "mr-mom-flat";
    var impact = (st === "healthy" || st == null) ? "จำกัด — yield ยังไม่กดดัน valuation" : def.impact + " — แรงกดดัน valuation เพิ่มขึ้น";
    var thresh = "Healthy < " + def.caution.toFixed(2) + "% · Caution " + def.caution.toFixed(2) + "–" + (def.alert - 0.01).toFixed(2) + "% · High Alert ≥ " + def.alert.toFixed(2) + "%";
    return '<article class="mr-card mr-' + tone + ' mr-rate-card">' +
      '<div class="mr-card-top"><span class="mr-card-title">🏦 ' + esc(def.label) + "</span>" +
      '<span class="mr-card-top-right"><button class="mr-info" type="button" data-explain="rateMonitor" aria-label="คำอธิบาย Interest Rate Risk Monitor">i</button>' +
      '<span class="mr-tone-pill">' + esc(rateStatusLabel(st)) + "</span></span></div>" +
      '<div class="mr-rate-figs">' +
        '<div class="mr-rate-yield"><span class="mr-rate-num mr-val-' + tone + '">' + (y == null ? "—" : fmt(y, 2) + "%") + '</span><span class="mr-rate-cap">Current Yield</span></div>' +
        '<div class="mr-rate-meta">' +
          '<div class="mr-rate-row"><span>Momentum</span><b class="' + momCls + '">' + (mom ? esc(mom.label) + " · 7D " + bpsTxt(mom.d7) + " · 30D " + bpsTxt(mom.d30) : "—") + "</b></div>" +
          '<div class="mr-rate-row"><span>Trend</span><b class="' + tr.cls + '">' + tr.arw + " " + esc(tr.label) + "</b></div>" +
          '<div class="mr-rate-row"><span>Risk Level</span><b class="mr-val-' + tone + '">' + esc(rateStatusLabel(st)) + "</b></div>" +
          '<div class="mr-rate-row"><span>Portfolio Impact</span><b>' + esc(impact) + "</b></div>" +
        "</div>" +
      "</div>" +
      spark(c, tone) +
      (hist ? '<div class="mr-rate-hist">Historical: สูงกว่า ~<b>' + hist.pctile + "%</b> ของช่วง " + esc(hist.span) + " (กรอบ " + fmt(hist.min, 2) + "–" + fmt(hist.max, 2) + "%) <button class=\"mr-info\" type=\"button\" data-explain=\"rateHist\" aria-label=\"คำอธิบาย Historical Context\">i</button></div>" : "") +
      '<div class="mr-rate-thresh">เกณฑ์: ' + esc(thresh) + "</div>" +
      (msg ? '<div class="mr-rate-msg mr-rate-msg-' + tone + '">' + esc(msg) + "</div>" : "") +
      "</article>";
  }

  // one overall summary: Interest Rate Headwind (LOW/MODERATE/HIGH/SEVERE) + strength + reasons
  var HW_THAI = {
    LOW: "🟢 ระวังน้อย — ดอกเบี้ยยังไม่เป็นลมต้าน ลงทุนตามแผนปกติได้",
    MODERATE: "🟡 ระวังปานกลาง — เริ่มมีแรงกดจากดอกเบี้ย เพิ่มไม้ใหม่อย่างเลือกจังหวะ",
    HIGH: "🟠 ต้องระวังมาก — ลมต้านชัดเจน ชะลอการเพิ่มไม้ใหม่ในหุ้น growth/AI และจับตาโมเมนตัมดอกเบี้ยใกล้ชิด",
    SEVERE: "🔴 ต้องระวังสูงสุด — ดอกเบี้ยทั้ง “สูงเกินเกณฑ์” และ “กำลังพุ่งขึ้นเร็ว” พร้อมกัน เป็นสภาพแวดล้อมที่กด valuation หุ้น growth/AI แรงที่สุด: งดเพิ่มไม้ใหม่ในสินทรัพย์เสี่ยง ทบทวนความเสี่ยงพอร์ต และรอให้โมเมนตัมดอกเบี้ยสงบก่อน"
  };
  function headwindCard(hw) {
    var reasons = hw.reasons.length ? hw.reasons : ["ไม่มีเงื่อนไขเตือน — ระดับและโมเมนตัมของ yields ยังไม่เป็นลมต้าน"];
    var early = hw.earlyWarnings.map(function (w) { return '<div class="mr-early-warn">' + esc(w) + "</div>"; }).join("");
    return '<article class="mr-card mr-' + hw.tone + ' mr-headwind-card">' +
      '<div class="mr-card-top"><span class="mr-card-title">🌬️ Interest Rate Headwind</span>' +
      '<span class="mr-card-top-right"><button class="mr-info" type="button" data-explain="rateHeadwind" aria-label="คำอธิบาย Headwind Score">i</button>' +
      '<span class="mr-tone-pill">' + esc(hw.level) + "</span></span></div>" +
      '<div class="mr-hw-figs">' +
        '<div class="mr-hw-main"><span class="mr-rate-num mr-val-' + hw.tone + '">' + esc(hw.level) + '</span><span class="mr-rate-cap">Headwind Strength: <b>' + esc(hw.strength) + "</b> · คะแนน " + hw.total + " (Level " + hw.levelPts + " + Momentum " + hw.momPts + " + Portfolio " + hw.sensPts + ")</span></div>" +
      "</div>" +
      '<div class="mr-rate-msg mr-rate-msg-' + hw.tone + ' mr-hw-thai">' + esc(HW_THAI[hw.level] || "") + "</div>" +
      early +
      '<ul class="mr-hw-reasons">' + reasons.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" +
      "</article>";
  }

  // yield curve monitor (30Y − 10Y): current shape of long-term financing conditions — no forecasts
  function curveMonitorCard() {
    var t = yieldSeries(RATE_DEFS[0]), x = yieldSeries(RATE_DEFS[1]);
    if (!t || !x) return "";
    var y10 = last(t), y30 = last(x);
    if (y10 == null || y30 == null) return "";
    var spread = y30 - y10;
    var p10 = nBarsAgo(t, 21), p30 = nBarsAgo(x, 21);
    var dSpread = (p10 != null && p30 != null) ? Math.round(((y30 - y10) - (p30 - p10)) * 100) : null;
    var d30y = p30 != null ? Math.round((y30 - p30) * 100) : null;
    var tightening = (d30y != null && d30y >= 10) || (dSpread != null && dSpread >= 10 && d30y != null && d30y > 0);
    var easing = d30y != null && d30y <= -10;
    var tone = tightening ? "warning" : easing ? "calm" : "normal";
    var explain = tightening
      ? "เงื่อนไขการเงินระยะยาวกำลังตึงขึ้น — ดอกเบี้ยยาวขึ้น " + bpsTxt(d30y) + "/30 วัน" + (dSpread != null && dSpread > 0 ? " และ spread กว้างขึ้น " + bpsTxt(dSpread) : "") + " ต้นทุนกู้ยืมระยะยาวแพงขึ้น"
      : easing
        ? "เงื่อนไขการเงินระยะยาวกำลังผ่อนคลาย — ดอกเบี้ยยาวลดลง " + bpsTxt(d30y) + "/30 วัน ต้นทุนกู้ยืมระยะยาวถูกลง"
        : "เงื่อนไขการเงินระยะยาวทรงตัว — spread และระดับ yields ไม่เปลี่ยนอย่างมีนัยใน 30 วัน";
    return '<article class="mr-card mr-' + tone + ' mr-curve-card">' +
      '<div class="mr-card-top"><span class="mr-card-title">📐 Yield Curve Monitor (30Y − 10Y)</span>' +
      '<span class="mr-card-top-right"><button class="mr-info" type="button" data-explain="rateCurve30" aria-label="คำอธิบาย Yield Curve Monitor">i</button>' +
      '<span class="mr-tone-pill">' + (tightening ? "Tightening" : easing ? "Improving" : "Stable") + "</span></span></div>" +
      '<div class="mr-impact-grid mr-curve-grid">' +
        '<div class="mr-impact-cell"><span>10Y</span><b>' + fmt(y10, 2) + "%</b></div>" +
        '<div class="mr-impact-cell"><span>30Y</span><b>' + fmt(y30, 2) + "%</b></div>" +
        '<div class="mr-impact-cell"><span>Spread</span><b>' + fmt(spread, 2) + " pp</b></div>" +
        '<div class="mr-impact-cell"><span>Trend (30D)</span><b>' + (dSpread == null ? "—" : bpsTxt(dSpread)) + "</b></div>" +
      "</div>" +
      '<div class="mr-meaning">' + esc(explain) + "</div></article>";
  }

  // portfolio sensitivity V2 — real exposure percentages + overall LOW/MEDIUM/HIGH with the why
  function sensitivityCard(sens) {
    var rows = [
      ["AI Exposure", sens.ai == null ? "—" : sens.ai + "%", expLevel(sens.ai)],
      ["Nasdaq Exposure", sens.nasdaq == null ? "—" : sens.nasdaq + "%", expLevel(sens.nasdaq)],
      ["Growth Exposure", sens.growth == null ? "—" : sens.growth + "%", expLevel(sens.growth)],
      ["Long Duration", sens.longDur == null ? "—" : sens.longDur + "%", expLevel(sens.longDur)]
    ];
    return '<article class="mr-card mr-' + sens.tone + ' mr-impact-card">' +
      '<div class="mr-card-top"><span class="mr-card-title">🎯 Portfolio Sensitivity</span>' +
      '<span class="mr-card-top-right"><button class="mr-info" type="button" data-explain="rateSens" aria-label="คำอธิบาย Portfolio Sensitivity">i</button>' +
      '<span class="mr-tone-pill">Overall ' + esc(sens.level) + "</span></span></div>" +
      '<div class="mr-impact-grid">' +
        rows.map(function (r) { return '<div class="mr-impact-cell"><span>' + esc(r[0]) + '</span><b class="mr-val-' + sens.tone + '">' + esc(r[1]) + '</b><i class="mr-exp-lvl">' + esc(r[2]) + "</i></div>"; }).join("") +
      "</div>" +
      '<div class="mr-impact-overall">Overall Sensitivity: <b class="mr-val-' + sens.tone + '">' + esc(sens.level) + "</b></div>" +
      '<div class="mr-sub">' + esc(sens.why) + "</div>" +
      '<div class="mr-rate-msg mr-rate-msg-' + sens.tone + '">' + esc(WHY_RATES_EN) + '<span class="mr-rate-why-th">' + esc(WHY_RATES_TH) + "</span></div>" +
      "</article>";
  }

  function rateActionStrip(hw) {
    var actions = hw.level === "SEVERE" ? ["Reduce New Exposure", "Review Portfolio Risk", "Increase Monitoring"]
      : hw.level === "HIGH" ? ["Review Portfolio Risk", "Increase Monitoring"]
      : hw.level === "MODERATE" ? ["Increase Monitoring", "Maintain Awareness"]
      : ["Maintain Awareness"];
    var tone = hw.tone === "danger" ? "danger" : hw.tone === "warning" ? "warning" : "calm";
    return '<div class="mr-rate-actions mr-rate-actions-' + tone + '">' +
      '<span class="mr-rate-actions-lbl">แนวทางเชิงกลยุทธ์ (ไม่ใช่คำสั่งซื้อ/ขาย):</span>' +
      actions.map(function (a) { return '<span class="mr-action-chip">' + esc(a) + "</span>"; }).join("") +
      "</div>";
  }

  function renderRateMonitor() {
    var host = el("mrRateBody"); if (!host) return;
    var anyData = false;
    RATE_DEFS.forEach(function (def) { var c = yieldSeries(def); if (c && last(c) != null) anyData = true; });
    if (!anyData) {
      host.innerHTML = '<div class="risk-empty">' + (state.loadingMacro ? "กำลังโหลดข้อมูล Treasury yield…" : "โหลดข้อมูล Treasury yield ไม่สำเร็จ — กด Refresh risk data") + "</div>";
      return;
    }
    var hw = headwindModel();
    var html = headwindCard(hw);
    // one row, user-specified order: 30Y → 10Y → Yield Curve Monitor
    // (Portfolio Sensitivity card removed by user request — the model still feeds the headwind score)
    html += '<div class="mr-grid mr-rate-grid mr-rate-grid-3">' + rateCard(RATE_DEFS[1]) + rateCard(RATE_DEFS[0]) + curveMonitorCard() + "</div>";
    html += rateActionStrip(hw);
    host.innerHTML = html;
  }

  // ---------------------------------------------------------- Macro → risk-asset positioning
  // One composite macro-risk score (0-100, renormalised over connected gauges +
  // the equity risk score), then translated into a suggested EXPOSURE level per
  // risk asset. Each asset has a fixed macro-beta (how hard macro squeezes it):
  // BTC 1.30 > Nasdaq 1.15 > S&P 0.90. exposure = clamp(100 − composite×beta).
  // Deterministic + fully explained on the card; a positioning view, not an order.
  var RA_WEIGHTS = { rates: 15, curve: 10, long: 10, dxy: 15, credit: 20, move: 10, equity: 20 };
  var RA_ASSETS = [
    { key: "btc", label: "Bitcoin", beta: 1.30, color: "#f7931a", tr: "trBtc", volMult: 2 },
    { key: "ndx", label: "Nasdaq", beta: 1.15, color: "#38bdf8", tr: "trNdx", volMult: 1 },
    { key: "spx", label: "S&P 500", beta: 0.90, color: "#a78bfa", tr: "trSpx", volMult: 1 },
    { key: "set50", label: "SET50", beta: 0.85, color: "#f472b6", tr: "trSet", volMult: 1 }
  ];
  // price trend over ~1 month: direction + speed, scaled per asset volatility
  // (BTC uses 2× thresholds so "แรง/เร็ว" means the same intensity across assets)
  function assetTrend(series, volMult) {
    if (!series || !Array.isArray(series.closes) || series.closes.length < 2) return null;
    var c = series.closes, d = series.dates || [], n = c.length;
    var iRef = n - 22 >= 0 ? n - 22 : 0;
    var v = num(c[n - 1]), r = num(c[iRef]);
    if (v == null || r == null || r <= 0) return null;
    var pct = (v - r) / r * 100;
    var days = 30;
    if (d[n - 1] && d[iRef]) {
      var t1 = Date.parse(d[n - 1]), t0 = Date.parse(d[iRef]);
      if (isFinite(t1) && isFinite(t0) && t1 > t0) days = Math.round((t1 - t0) / 86400000);
    }
    var m = volMult || 1, hi = 6 * m, lo = 2 * m;
    if (pct >= hi) return { cls: "up2", arw: "▲▲", label: "ขาขึ้นแรง/เร็ว", pct: pct, days: days };
    if (pct >= lo) return { cls: "up1", arw: "▲", label: "ขาขึ้น", pct: pct, days: days };
    if (pct <= -hi) return { cls: "dn2", arw: "▼▼", label: "ขาลงแรง/เร็ว", pct: pct, days: days };
    if (pct <= -lo) return { cls: "dn1", arw: "▼", label: "ขาลง", pct: pct, days: days };
    return { cls: "flat", arw: "▬", label: "ทรงตัว", pct: pct, days: days };
  }
  function macroComposite(gauges) {
    var acc = 0, wsum = 0, parts = [];
    gauges.forEach(function (g) {
      var w = RA_WEIGHTS[g.key];
      if (!w || g.risk == null) return;
      acc += g.risk * w; wsum += w;
      parts.push({ label: g.title, risk: Math.round(g.risk), w: w, tone: g.tone });
    });
    var eq = state.api && state.api.risk ? num(state.api.risk.score) : null;
    if (eq != null) { acc += eq * RA_WEIGHTS.equity; wsum += RA_WEIGHTS.equity; parts.push({ label: "Equity Risk Score (VIX complex)", risk: Math.round(eq), w: RA_WEIGHTS.equity, tone: zoneOf(eq) }); }
    if (!wsum) return null;
    var score = Math.round(acc / wsum);
    parts.sort(function (a, b) { return b.risk - a.risk; });
    return { score: score, tone: zoneOf(score), parts: parts, coverage: Math.round(wsum / (Object.keys(RA_WEIGHTS).reduce(function (s, k) { return s + RA_WEIGHTS[k]; }, 0)) * 100) };
  }
  function exposureOf(composite, beta) { return Math.max(0, Math.min(100, Math.round(100 - composite * beta))); }
  function exposureZone(e) {
    if (e >= 75) return { label: "ลงเงินได้เต็มส่วน", color: "#34d399", tone: "calm" };
    if (e >= 50) return { label: "ลงทุนได้ ค่อนข้างเต็ม", color: "#a3e635", tone: "normal" };
    if (e >= 25) return { label: "ถือบางส่วน / ชะลอเพิ่ม", color: "#f59e0b", tone: "warning" };
    return { label: "ลดหนัก / ขายออกส่วนใหญ่", color: "#f43f5e", tone: "danger" };
  }
  function raBar(asset, e) {
    var z = exposureZone(e);
    var tr = assetTrend(state.macro[asset.tr], asset.volMult);
    var trHtml = tr
      ? '<span class="mr-ra-trend mr-ratr-' + tr.cls + '">' + tr.arw + " " + esc(tr.label) + " · " + (tr.pct >= 0 ? "+" : "") + tr.pct.toFixed(1) + "%/" + tr.days + "วัน</span>"
      : '<span class="mr-ra-trend mr-ratr-flat">▬ รอข้อมูลเทรนด์</span>';
    return '<div class="mr-ra-row">' +
      '<div class="mr-ra-head"><span class="mr-ra-name"><i style="background:' + asset.color + '"></i>' + esc(asset.label) + trHtml + '</span>' +
      '<span class="mr-ra-read"><b style="color:' + z.color + '">' + e + "/100</b> · <span style=\"color:" + z.color + '">' + esc(z.label) + "</span></span></div>" +
      '<div class="mr-ra-track">' +
        '<span class="mr-ra-seg" style="width:25%;background:#f43f5e"></span>' +
        '<span class="mr-ra-seg" style="width:25%;background:#f59e0b"></span>' +
        '<span class="mr-ra-seg" style="width:25%;background:#a3e635"></span>' +
        '<span class="mr-ra-seg" style="width:25%;background:#34d399"></span>' +
        '<b class="mr-ra-marker" style="left:' + e + '%"></b>' +
      "</div>" +
      '<div class="mr-ra-sub">ความไวต่อ macro (β ' + asset.beta.toFixed(2) + ")" + (asset.key === "set50" ? " · เทรนด์จากข้อมูลดัชนีไทยที่มีจำกัด (แบบหยาบ)" : "") + "</div>" +
    "</div>";
  }
  function renderRiskAsset(gauges) {
    var host = el("mrRiskAssetBody"); if (!host) return;
    var C = macroComposite(gauges);
    if (!C) {
      host.innerHTML = '<div class="risk-empty">' + (state.loadingMacro ? "กำลังประเมินภาพรวม macro…" : "ยังไม่มีข้อมูลพอสรุป — กด Refresh risk data") + "</div>";
      return;
    }
    var drivers = C.parts.slice(0, 3).map(function (p) { return esc(p.label) + " " + p.risk; }).join(" · ");
    var bars = RA_ASSETS.map(function (a) { return raBar(a, exposureOf(C.score, a.beta)); }).join("");
    host.innerHTML = '<article class="mr-card mr-' + C.tone + ' mr-ra-card">' +
      '<div class="mr-card-top"><span class="mr-card-title">🧭 Macro Risk → ระดับการถือสินทรัพย์เสี่ยง</span>' +
      '<span class="mr-card-top-right"><button class="mr-info" type="button" data-explain="riskAsset" aria-label="คำอธิบาย Macro Risk Positioning">i</button>' +
      '<span class="mr-tone-pill">Macro Risk ' + C.score + "/100</span></span></div>" +
      '<div class="mr-ra-scale"><span>← ขายออก</span><span>ถือบางส่วน</span><span>ลงทุนได้</span><span>ลงเต็มส่วน →</span></div>' +
      bars +
      '<div class="mr-ra-drivers">ตัวกดดันหลักตอนนี้: ' + drivers + ' <span class="mr-ra-cov">· ครอบคลุมข้อมูล ' + C.coverage + "%</span></div>" +
      '<div class="mr-sub">มุมมองการวางน้ำหนักจากสภาพแวดล้อม macro เท่านั้น (0 = ไม่ควรถือเลย, 100 = ลงเงินได้เต็มแผน) — ไม่ใช่คำสั่งซื้อขาย ใช้ประกอบสัญญาณรายสินทรัพย์เสมอ</div>' +
      "</article>";
  }

  function render() {
    var gauges = macroGauges(), verdict = overallVerdict(gauges);
    var vEl = el("mrVerdict");
    if (vEl) vEl.innerHTML = '<div class="mr-verdict mr-' + verdict.tone + '"><div class="mr-verdict-main"><span class="mr-verdict-dot"></span><b>' + esc(verdict.label) + "</b></div><div class=\"mr-verdict-detail\">" + esc(verdict.detail) + "</div></div>";
    renderRiskAsset(gauges);
    renderRateMonitor();
    var mEl = el("mrMacroCards");
    if (mEl) mEl.innerHTML = gauges.length ? gauges.map(gaugeCard).join("") : '<div class="risk-empty">' + (state.loadingMacro ? "กำลังโหลดข้อมูล macro…" : "โหลดข้อมูล macro ไม่สำเร็จ — กด Refresh") + "</div>";
    var eEl = el("mrEquityCards"); if (eEl) eEl.innerHTML = equityCards();
    var rEl = el("mrEquityRef"); if (rEl) rEl.innerHTML = equityRefStrip();
    var wEl = el("mrWarnings"); if (wEl) wEl.innerHTML = warningsList(gauges);
    if (riskStatus) riskStatus.textContent = verdict.label;
    if (riskTimestamp) riskTimestamp.textContent = state.api && state.api.generatedAt ? "อัปเดต " + new Date(state.api.generatedAt).toLocaleString("th-TH") : "";
  }

  // ---------------------------------------------------------- load
  async function loadApi() {
    try { var res = await fetch("/api/market-risk", { cache: "no-store" }); if (!res.ok) throw new Error("HTTP " + res.status); state.api = await res.json(); state.apiError = null; }
    catch (e) { state.apiError = String(e && e.message || e); var snap = readSnapshot(); if (snap && snap.marketRisk && snap.marketRisk.risk) state.api = snap.marketRisk; }
  }
  async function loadAll(force) {
    if (riskStatus) riskStatus.textContent = "กำลังโหลดข้อมูล…";
    render();
    await Promise.all([loadApi(), loadMacro(force)]);
    render();
    // 5-year context loads after the main view (same /api/ohlc endpoint, cached daily)
    await load5y();
    render();
  }

  // ---------------------------------------------------------- explain popover
  function openExplain(key) {
    var e = EXPLAIN[key]; if (!e) return;
    var prev = document.getElementById("mrExplainBack"); if (prev) prev.remove();
    var back = document.createElement("div"); back.className = "mr-explain-back"; back.id = "mrExplainBack";
    back.innerHTML = '<div class="mr-explain" role="dialog" aria-modal="true">' +
      '<div class="mr-explain-head"><h3>' + esc(e.title) + '</h3><button class="mr-explain-close" type="button" aria-label="ปิด">✕</button></div>' +
      '<div class="mr-explain-body">' +
      '<div class="mr-explain-sec"><b>ความหมาย</b><p>' + esc(e.meaning) + "</p></div>" +
      '<div class="mr-explain-sec"><b>วิธีดู</b><p>' + esc(e.how) + "</p></div>" +
      '<div class="mr-explain-sec"><b>ทำไมค่านี้สำคัญ</b><p>' + esc(e.why) + "</p></div>" +
      "</div></div>";
    document.body.appendChild(back); document.body.style.overflow = "hidden";
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    back.addEventListener("click", function (ev) { if (ev.target === back || (ev.target.closest && ev.target.closest(".mr-explain-close"))) close(); });
    document.addEventListener("keydown", onKey);
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-explain]");
    if (b) { ev.preventDefault(); openExplain(b.getAttribute("data-explain")); }
  });

  if (refreshButton) refreshButton.addEventListener("click", function () { loadAll(true); });
  window.addEventListener("portfolio-data-snapshot", function () { render(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { loadAll(false); });
  else loadAll(false);

  window.MacroDashboard = { render: render, macroGauges: macroGauges, interp: interp, zoneOf: zoneOf };
})();
