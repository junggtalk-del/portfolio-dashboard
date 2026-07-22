(function () {
  "use strict";

  // ============================================================
  // Bitcoin Monitor — dedicated BTC dashboard.
  // Phase 1: BTC price + EMA12/EMA26/SMA200 + RSI14 + Volume Ratio (from snapshot).
  // Phase 2: manual / CSV import of on-chain metrics (MVRV, NUPL, SOPR, ...).
  // Buy Zone Score (0-100) = Technical 35 + Cycle 30 + Holder 25 + Stress 10,
  // renormalised over the components that actually have data, so it stays
  // meaningful even when only price/technical data is connected.
  // ============================================================

  const root = document.getElementById("btcRoot");
  const BTC_KEY = "BTCUSD";
  const BTC_PROVIDER = "BTC-USD";
  const LS_KEY = "portfolio_dashboard_bitcoin_onchain_imports"; // manual / CSV imports (spec key)
  const LS_KEY_OLD = "btc_onchain_v1";                          // migrate from the earlier key
  const API_CACHE_KEY = "btc_monitor_api_v1";                   // last successful /api/bitcoin payload

  let range = "1Y";
  let activeTab = "monitor"; // "monitor" | "intelligence" (Phase 2 tab)
  let apiData = null;       // /api/bitcoin payload (Binance + Glassnode + CryptoQuant)
  let apiState = "idle";    // idle | loading | ready | error
  let apiError = null;

  // ---------------------------------------------------------------- helpers
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function fin(v) { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  function dn(v) { return v != null && Number.isFinite(v); }
  function num(v, d = 2) { const n = fin(v); return n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d }); }
  function money(v, d) { const n = fin(v); if (n == null) return "—"; const dd = d != null ? d : (n >= 1000 ? 0 : 2); return "$" + n.toLocaleString("en-US", { maximumFractionDigits: dd }); }
  function compact(v) { const n = fin(v); if (n == null) return "—"; const a = Math.abs(n); if (a >= 1e12) return (n / 1e12).toFixed(2) + "T"; if (a >= 1e9) return (n / 1e9).toFixed(2) + "B"; if (a >= 1e6) return (n / 1e6).toFixed(2) + "M"; if (a >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(Math.round(n)); }
  function moneyShort(v) { const n = fin(v); return n == null ? "—" : "$" + compact(n); }
  function signedPct(v) { const n = fin(v); return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function btcTech(s) { return (s && s.technicalSignals && (s.technicalSignals[BTC_KEY] || s.technicalSignals.BTC)) || null; }
  function btcHist(s) { return (s && s.historicalData && (s.historicalData[BTC_KEY] || s.historicalData.BTC)) || null; }

  function readOnchain() {
    try {
      let o = JSON.parse(window.localStorage.getItem(LS_KEY) || "null");
      if (!o) o = JSON.parse(window.localStorage.getItem(LS_KEY_OLD) || "null"); // migrate
      return (o && typeof o === "object") ? { values: o.values || {}, lastImported: o.lastImported || null } : { values: {}, lastImported: null };
    } catch (e) { return { values: {}, lastImported: null }; }
  }
  function writeOnchain(o) { try { window.localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {} }
  function readApiCache() { try { return JSON.parse(window.localStorage.getItem(API_CACHE_KEY) || "null"); } catch (e) { return null; } }
  function writeApiCache(d) { try { window.localStorage.setItem(API_CACHE_KEY, JSON.stringify(d)); } catch (e) {} }
  function fmtWhen(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso); const mins = Math.round((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return "เมื่อสักครู่"; if (mins < 60) return `${mins} นาทีก่อน`; if (mins < 1440) return `${Math.round(mins / 60)} ชม.ก่อน`;
      return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) { return "—"; }
  }
  function chartHist(snap) { return (apiData && apiData.history && Array.isArray(apiData.history.closes) && apiData.history.closes.length > 1) ? apiData.history : btcHist(snap); }

  // freshness label → [thai, tone]
  const FRESH = {
    near_real_time: ["ใกล้ real-time", "ok"], D0: ["วันนี้", "ok"], D1: ["D-1", "ok"], D2: ["D-2", "warn"],
    stale: ["ข้อมูลเริ่มเก่า", "warn"], not_connected: ["ยังไม่ได้เชื่อมต่อ", "warn"],
    public_chart_only: ["มีกราฟอ้างอิง", "warn"], missing: ["ไม่มีข้อมูล", "muted"],
    manual: ["กรอกเอง/CSV", "ok"], daily: ["รายวัน", "ok"]
  };
  function freshBadge(f) { const x = FRESH[f] || ["—", "muted"]; return `<span class="btc-fresh btc-fresh-${x[1]}">${esc(x[0])}</span>`; }
  function fmtDate(d) { if (!d) return ""; try { const s = String(d); const dt = new Date(s.length <= 10 ? s + "T00:00:00" : s); return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }); } catch (e) { return String(d); } }
  function refLabel(name) { const i = String(name).indexOf("—"); return i > 0 ? String(name).slice(0, i).trim() : String(name); }
  function refLinksHtml(links) {
    return (links || []).map((l) => `<a class="btc-ref-btn" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(refLabel(l.name))}</a>`).join("");
  }

  const ONCHAIN_FIELDS = [
    { key: "mvrvZScore", label: "MVRV Z-Score", group: "cycle", step: "0.01" },
    { key: "mvrvRatio", label: "MVRV Ratio", group: "cycle", step: "0.01" },
    { key: "nupl", label: "NUPL", group: "cycle", step: "0.01" },
    { key: "puellMultiple", label: "Puell Multiple", group: "cycle", step: "0.01" },
    { key: "sthRealizedPrice", label: "STH Realized Price (USD)", group: "holder", step: "1" },
    { key: "lthRealizedPrice", label: "LTH Realized Price (USD)", group: "holder", step: "1" },
    { key: "sthSopr", label: "STH-SOPR", group: "holder", step: "0.001" },
    { key: "lthSopr", label: "LTH-SOPR", group: "holder", step: "0.001" },
    { key: "fundingRate", label: "Funding Rate (%/8h)", group: "stress", step: "0.001" },
    { key: "openInterest", label: "Open Interest (USD)", group: "stress", step: "1" },
    { key: "exchangeNetflow", label: "Exchange Netflow (BTC)", group: "stress", step: "1" },
    { key: "stablecoinReserve", label: "Stablecoin Reserve (USD)", group: "stress", step: "1" },
    { key: "ssr", label: "SSR (Stablecoin Supply Ratio)", group: "stress", step: "0.1" }
  ];

  const EXPLAIN = [
    ["MVRV Z-Score", "วัดว่าราคาตลาดสูง/ต่ำกว่า “ทุนเฉลี่ยของทั้งเครือข่าย” มากแค่ไหน ค่าติดลบ–ต่ำ = ถูก/โซนสะสม, สูงมาก (>5–7) = แพง/โซนยอดดอย"],
    ["MVRV Ratio", "ราคาตลาด ÷ ราคาทุนเฉลี่ย (realized) <1 = นักลงทุนเฉลี่ยขาดทุน (โซนสะสม), สูง >3.5 = แพง"],
    ["NUPL", "สัดส่วนกำไร/ขาดทุนที่ยังไม่รับรู้ของทั้งตลาด ติดลบ = ตลาดขาดทุน (capitulation, โซนซื้อ), สูง >0.75 = euphoria (ระวัง)"],
    ["Puell Multiple", "วัดรายได้นักขุดเทียบค่าเฉลี่ย ต่ำ = นักขุดเค้นขาย/รายได้ต่ำ (มัก = bottom), สูง = top zone"],
    ["STH Realized Price", "ทุนเฉลี่ยของผู้ถือระยะสั้น (<155 วัน) ถ้าราคา > ค่านี้ = ผู้ถือสั้นกลับมามีกำไร = สัญญาณฟื้นตัว"],
    ["LTH Realized Price", "ทุนเฉลี่ยของผู้ถือระยะยาว (>155 วัน) ใช้ดูว่าราคาห่างจากต้นทุนระยะยาวมากไปไหม"],
    ["STH-SOPR", "ผู้ถือระยะสั้นขายได้กำไร/ขาดทุน >1 = ขายมีกำไร (ฟื้นตัว), <1 = ขายขาดทุน (อาจเป็นโซนสะสม)"],
    ["LTH-SOPR", "ผู้ถือระยะยาวขายได้กำไรกี่เท่า สูงมาก = ผู้ถือยาวเริ่มขายทำกำไรหนัก (ระวัง distribution)"],
    ["RSI14", "โมเมนตัมราคา 0–100 <30 = oversold (มักเป็นจังหวะสะสม), >70 = overbought (ระวังพักตัว)"],
    ["EMA12 / EMA26", "เส้นค่าเฉลี่ยระยะสั้น EMA12 > EMA26 = โมเมนตัมบวก (ตัดขึ้น), EMA12 < EMA26 = โมเมนตัมอ่อน"],
    ["SMA200", "เส้นค่าเฉลี่ย 200 วัน = เทรนด์ใหญ่ ราคาเหนือ SMA200 = ขาขึ้นใหญ่, ใต้ = ขาลงใหญ่"],
    ["Volume Ratio 5D", "วอลุ่มล่าสุด ÷ เฉลี่ย 5 วัน >1 = วอลุ่มยืนยัน, ≥1.5 = วอลุ่มแรง"],
    ["Realized Price Proxy", "ต้นทุนเฉลี่ยทั้งตลาด (proxy) = realized cap ÷ supply จาก Coin Metrics ถ้าราคา < ค่านี้ = ตลาดถือขาดทุนเฉลี่ย (โซนสะสม) — ไม่ใช่ STH/LTH แยกแบบเสียเงิน"],
    ["NUPL Proxy", "= 1 − 1/MVRV จาก Coin Metrics (proxy ของ NUPL) ติดลบ = capitulation, สูง = euphoria"],
    ["Fear & Greed", "ดัชนีความรู้สึกตลาดคริปโต 0–100 จาก Alternative.me <25 = Extreme Fear (มักเป็นจังหวะซื้อสวน), >75 = Extreme Greed (ระวัง)"],
    ["Funding Rate (8h)", "ค่าธรรมเนียม perpetual ทุก 8 ชม. จาก Binance Futures บวกสูง = long แออัด (ระวัง squeeze), ติดลบ/ต่ำ = ไม่มี long แออัด (ดี)"],
    ["Open Interest", "มูลค่าสัญญา futures คงค้างรวมจาก Binance Futures ใช้ดูระดับ leverage ในตลาด"],
    ["Taker Buy/Sell", "อัตราส่วนวอลุ่มฝั่งซื้อ market ÷ ขาย market >1 = แรงซื้อเด่น, <1 = แรงขายเด่น"],
    ["Long/Short Ratio", "อัตราส่วนบัญชี long ÷ short สูงมาก = คนเล่น long แน่น (อาจสวนทาง)"],
    ["SSR Proxy", "BTC market cap ÷ มูลค่า stablecoin รวม (DefiLlama) ต่ำ = มี stablecoin dry powder เยอะ (พร้อมเข้าซื้อ) — proxy ของ SSR ไม่ใช่ค่า Glassnode"],
    ["Miner Revenue Multiple Proxy", "รายได้นักขุดวันนี้ ÷ เฉลี่ย 365 วัน (Blockchain.com) คล้าย Puell ต่ำ <0.6 = miner รายได้ต่ำ (มัก bottom)"],
    ["Hashrate / Difficulty", "พลังขุด/ความยากของเครือข่าย ใช้ดูความแข็งแรง–ความปลอดภัยของเครือข่าย Bitcoin"]
  ];

  // ---------------------------------------------------------------- indicators
  // on-chain page keys resolved from /api/bitcoin `metrics` map (API value preferred,
  // CSV/manual fallback). ssr has no API source (CSV-only); the rest map 1:1.
  const ONCHAIN_KEYS = [
    "mvrvZScore", "mvrvRatio", "nupl", "realizedPriceProxy", "puellMultiple",
    "sthRealizedPrice", "lthRealizedPrice", "sthSopr", "lthSopr",
    "fearGreed", "fundingRate", "openInterest", "takerBuySellRatio", "longShortRatio",
    "ssrProxy", "minerRevenueMultipleProxy", "hashRate", "difficulty", "minersRevenueUsd",
    "exchangeNetflow", "estimatedLeverageRatio", "ssr"
  ];

  function buildIndicators(snap) {
    const a = apiData || {}, aMetrics = a.metrics || {}, aAt = a.fetchedAt || null;
    const oc = readOnchain(), ocv = oc.values || {}, ocAt = oc.lastImported || null;
    const t = btcTech(snap) || {};
    const ind = {}, meta = {};

    // Resolve one indicator: merged API metric first, else snapshot/CSV fallback.
    // Each meta carries { source, date, freshness, referenceLinks, value, derived, proxy }.
    function resolve(key, fallbackVal, fallbackSrc) {
      const mm = aMetrics[key];
      if (mm && fin(mm.value) != null) {
        ind[key] = fin(mm.value);
        meta[key] = { source: mm.source, date: mm.date || null, freshness: mm.freshness, referenceLinks: mm.referenceLinks || [], value: ind[key], derived: !!mm.derived, proxy: !!mm.proxy };
      } else if (fallbackVal != null) {
        ind[key] = fallbackVal;
        meta[key] = { source: fallbackSrc, date: (fallbackSrc === "CSV / Manual" ? ocAt : ((snap && snap.loadedAt) || null)), freshness: fallbackSrc === "CSV / Manual" ? "manual" : "daily", referenceLinks: (mm && mm.referenceLinks) || [], value: fallbackVal, proxy: false };
      } else {
        ind[key] = null;
        meta[key] = { source: null, date: null, freshness: (mm && mm.freshness) || "missing", referenceLinks: (mm && mm.referenceLinks) || [], value: null, proxy: !!(mm && mm.proxy) };
      }
    }

    // --- price + technical: Binance via API, Data Snapshot fallback ---
    const pm = aMetrics.price;
    const fromApi = pm && fin(pm.value) != null;
    resolve("price", fin(t.latestClose), "Data Snapshot");
    resolve("ema12", fin(t.ema12), "Data Snapshot");
    resolve("ema26", fin(t.ema26), "Data Snapshot");
    resolve("sma200", fin(t.sma200), "Data Snapshot");
    resolve("rsi14", fin(t.rsi14), "Data Snapshot");
    resolve("volumeRatio5D", fin(t.volumeRatio), "Data Snapshot");
    ind.date = fromApi ? (pm.date || null) : t.latestDate;
    ind.emaStatus = t.emaStatus; ind.sma200Status = t.sma200Status;
    if (!ind.emaStatus && ind.ema12 != null && ind.ema26 != null) ind.emaStatus = ind.ema12 > ind.ema26 ? "EMA_BULLISH" : ind.ema12 < ind.ema26 ? "EMA_BEARISH" : "EMA_NEUTRAL";
    if (!ind.sma200Status && ind.price != null && ind.sma200 != null) ind.sma200Status = ind.price > ind.sma200 ? "ABOVE_SMA200" : ind.price < ind.sma200 ? "BELOW_SMA200" : "AT_SMA200";

    // --- on-chain: merged API value, CSV/manual fallback ---
    ONCHAIN_KEYS.forEach((k) => resolve(k, fin(ocv[k]), "CSV / Manual"));
    resolve("stablecoinReserve", fin(ocv.stablecoinReserve), "CSV / Manual");

    // --- BGeometrics exact overlay (browser-fetched, day-cached, free 10 req/hr) ---
    // Upgrades derived/proxy values to EXACT ones. Rule: exact wins unless the
    // existing source is strictly FRESHER (per the user's "ใช้ source ในรูปถ้า
    // realtime กว่า"); MVRV-Z always prefers exact because our derived Z is a
    // compressed proxy, not comparable in quality.
    const bgeo = (window.BtcOnchainLive && window.BtcOnchainLive.get().metrics) || {};
    const freshKeyOf = (dateStr) => {
      if (!dateStr) return "daily";
      const t = Date.parse(String(dateStr).slice(0, 10) + "T00:00:00Z");
      if (!Number.isFinite(t)) return "daily";
      const o = Math.round((Date.now() - t) / 86400000);
      return o <= 0 ? "D0" : o === 1 ? "D1" : o === 2 ? "D2" : "stale";
    };
    function bgeoOverlay(key, bgKey, always) {
      const b = bgeo[bgKey];
      if (!b || fin(b.value) == null) return;
      const cur = meta[key];
      if (!always && cur && cur.value != null && cur.date && b.date && String(cur.date).slice(0, 10) > String(b.date).slice(0, 10)) return;
      ind[key] = fin(b.value);
      meta[key] = { source: "BGeometrics (bitcoin-data.com)", date: b.date || null, freshness: freshKeyOf(b.date), referenceLinks: (cur && cur.referenceLinks) || [], value: ind[key], derived: false, proxy: false };
    }
    bgeoOverlay("mvrvZScore", "mvrvZScore", true);
    bgeoOverlay("nupl", "nupl", false);
    bgeoOverlay("realizedPriceProxy", "realizedPrice", false);
    bgeoOverlay("ssrProxy", "ssr", false);
    // new metrics that had no free source before
    bgeoOverlay("sopr", "sopr", true);
    bgeoOverlay("lthSupply", "lthSupply", true);
    if (!("sopr" in ind)) { ind.sopr = null; meta.sopr = { source: null, date: null, freshness: "missing", referenceLinks: [], value: null }; }
    if (!("lthSupply" in ind)) { ind.lthSupply = null; meta.lthSupply = { source: null, date: null, freshness: "missing", referenceLinks: [], value: null }; }

    ind._meta = meta;
    ind._hasOnchain = ["mvrvZScore", "mvrvRatio", "nupl", "realizedPriceProxy", "puellMultiple", "sthRealizedPrice", "lthRealizedPrice", "sthSopr", "lthSopr", "fearGreed", "fundingRate", "openInterest", "takerBuySellRatio", "longShortRatio", "ssrProxy", "minerRevenueMultipleProxy", "exchangeNetflow", "estimatedLeverageRatio", "ssr", "stablecoinReserve"].some((k) => ind[k] != null);
    ind._techSrc = meta.price.source; ind._techAt = fromApi ? aAt : (snap && snap.loadedAt) || null;
    return ind;
  }

  // ---------------------------------------------------------------- buy zone score
  const ZONES = {
    deep: { key: "deep", label: "Deep Accumulation", thaiLabel: "โซนสะสมลึก", tone: "bull" },
    accum: { key: "accum", label: "Accumulation", thaiLabel: "โซนสะสม", tone: "bull" },
    recovery: { key: "recovery", label: "Recovery", thaiLabel: "โซนฟื้นตัว", tone: "watch-bull" },
    expansion: { key: "expansion", label: "Expansion", thaiLabel: "โซนขาขึ้น", tone: "watch-bull" },
    overheated: { key: "overheated", label: "Overheated", thaiLabel: "โซนร้อนเกินไป", tone: "bear" }
  };
  const ACTIONS = {
    dca: { key: "dca", action: "DCA / Accumulate", thaiAction: "DCA / สะสม", tone: "bull" },
    buyfirst: { key: "buyfirst", action: "Buy First Tranche", thaiAction: "ซื้อไม้แรก", tone: "watch-bull" },
    add: { key: "add", action: "Add", thaiAction: "ซื้อเพิ่ม", tone: "bull" },
    hold: { key: "hold", action: "Hold", thaiAction: "ถือต่อ", tone: "neutral" },
    reduce: { key: "reduce", action: "Reduce / Trim", thaiAction: "ลดน้ำหนัก", tone: "bear" },
    avoid: { key: "avoid", action: "Avoid / Wait", thaiAction: "รอก่อน", tone: "bear" }
  };

  function band(s) {
    if (s >= 80) return { label: "Strong Buy Zone", thaiLabel: "โซนซื้อน่าสนใจมาก", tone: "bull", color: "var(--mc-emerald)" };
    if (s >= 65) return { label: "Good Buy Zone", thaiLabel: "โซนซื้อดี", tone: "bull", color: "var(--mc-emerald)" };
    if (s >= 50) return { label: "Neutral / DCA Only", thaiLabel: "กลาง ๆ / DCA ได้", tone: "neutral", color: "var(--mc-blue)" };
    if (s >= 35) return { label: "Wait", thaiLabel: "รอก่อน", tone: "warn", color: "var(--mc-amber)" };
    return { label: "Overheated / Avoid", thaiLabel: "ร้อนเกินไป / ยังไม่ควรซื้อ", tone: "bear", color: "var(--mc-red)" };
  }

  function cycleZoneOf(ind, aboveSma, belowSma, emaBull) {
    // Explicit "cheap / accumulate" rule (price below realized value):
    //   MVRV Z-Score < 0  OR  MVRV Ratio < 1  OR  NUPL < 0  => Deep Accumulation (ถูก ซื้อสะสมได้).
    // These three are mathematically the same point, but checking all of them means
    // the cheap zone still triggers if only ONE of the metrics is connected.
    if ((dn(ind.mvrvZScore) && ind.mvrvZScore < 0) || (dn(ind.mvrvRatio) && ind.mvrvRatio < 1) || (dn(ind.nupl) && ind.nupl < 0)) return ZONES.deep;
    // NUPL is scale-stable and exact for both Coin Metrics (1-1/MVRV) and Glassnode,
    // so it leads; MVRV Z-Score (often a derived approximation) then MVRV Ratio follow.
    if (dn(ind.nupl)) { const n = ind.nupl; return n < 0.25 ? ZONES.accum : n < 0.5 ? ZONES.recovery : n < 0.75 ? ZONES.expansion : ZONES.overheated; }
    if (dn(ind.mvrvZScore)) { const z = ind.mvrvZScore; return z < 2 ? ZONES.accum : z < 3.5 ? ZONES.recovery : z < 5 ? ZONES.expansion : ZONES.overheated; }
    if (dn(ind.mvrvRatio)) { const m = ind.mvrvRatio; return m < 2 ? ZONES.accum : m < 3.5 ? ZONES.recovery : ZONES.expansion; }
    // Technical-only fallback. "Overheated" is a VALUATION state (MVRV/NUPL), so
    // without on-chain data the zone tops out at "expansion" — it never returns
    // overheated from momentum (RSI) alone, which would contradict the score.
    if (belowSma) return (dn(ind.rsi14) && ind.rsi14 < 35) ? ZONES.deep : ZONES.accum;
    if (aboveSma && emaBull) return ZONES.expansion;
    if (aboveSma) return ZONES.recovery;
    return ZONES.accum;
  }

  function actionOf(score, zoneKey, aboveSma, emaBull) {
    if (zoneKey === "overheated") return aboveSma ? ACTIONS.reduce : ACTIONS.avoid;
    if (score < 35) return ACTIONS.avoid;
    if (score < 50) return zoneKey === "deep" ? ACTIONS.dca : ACTIONS.avoid;
    if (score < 65) return aboveSma ? ACTIONS.hold : ACTIONS.dca;
    return (aboveSma && emaBull) ? ACTIONS.add : ACTIONS.buyfirst;
  }

  function computeBuyZone(ind) {
    const reasons = [], warnings = [];
    const emaBull = dn(ind.ema12) && dn(ind.ema26) ? ind.ema12 > ind.ema26 : ind.emaStatus === "EMA_BULLISH";
    const emaBear = dn(ind.ema12) && dn(ind.ema26) ? ind.ema12 < ind.ema26 : ind.emaStatus === "EMA_BEARISH";
    const aboveSma = dn(ind.price) && dn(ind.sma200) ? ind.price > ind.sma200 : ind.sma200Status === "ABOVE_SMA200";
    const belowSma = dn(ind.price) && dn(ind.sma200) ? ind.price < ind.sma200 : ind.sma200Status === "BELOW_SMA200";

    // ---- Part 1: Technical Timing (max 35) ----
    let tech = 0;
    if (emaBull) { tech += 12; reasons.push("EMA12 อยู่เหนือ EMA26 (โมเมนตัมบวก)"); }
    else { warnings.push("EMA โมเมนตัมยังอ่อน"); }
    if (aboveSma) { tech += 10; reasons.push("ราคาอยู่เหนือ SMA200 (เทรนด์ใหญ่เป็นบวก)"); }
    if (dn(ind.rsi14)) {
      const r = ind.rsi14;
      if (r < 30) { tech += 5; reasons.push("RSI ต่ำมาก (oversold) โซนสะสม"); }
      else if (r < 45) { tech += 6; reasons.push("RSI 30–45 จังหวะสะสมที่ดี"); }
      else if (r < 60) { tech += 4; }
      else if (r < 70) { tech += 2; }
      else { tech -= 7; warnings.push("RSI สูง ระวังพักตัว (overbought)"); }
    }
    if (dn(ind.volumeRatio5D)) {
      if (ind.volumeRatio5D >= 1.5) { tech += 10; reasons.push("วอลุ่ม 5 วันแรง (≥1.5x)"); }
      else if (ind.volumeRatio5D >= 1.0) { tech += 7; reasons.push("วอลุ่ม 5 วันยืนยัน (≥1x)"); }
    }
    tech = Math.max(0, Math.min(35, tech));

    // ---- Part 2: Cycle Valuation (max 30) ----
    // MVRV-Z, MVRV-Ratio and NUPL are COLLINEAR on the free path (all derived from the
    // same Coin Metrics MVRV/realized-cap), so score ONE primary valuation signal
    // (prefer NUPL — scale-stable & exact) up to 24, then add Puell (independent miner
    // valuation) up to 6. This avoids triple-weighting one underlying signal.
    let cycle = 0;
    const cycleAvail = dn(ind.mvrvZScore) || dn(ind.mvrvRatio) || dn(ind.nupl) || dn(ind.puellMultiple);
    if (dn(ind.nupl)) { const n = ind.nupl; if (n < 0) { cycle += 24; reasons.push("NUPL ติดลบ (capitulation = โซนซื้อ)"); } else if (n < 0.25) cycle += 20; else if (n < 0.5) cycle += 12; else if (n < 0.75) cycle += 4; else warnings.push("NUPL สูง (euphoria) ระวัง"); }
    else if (dn(ind.mvrvZScore)) { const z = ind.mvrvZScore; if (z < 0) cycle += 24; else if (z < 2) cycle += 18; else if (z < 3.5) cycle += 10; else if (z < 5) cycle += 4; else warnings.push("MVRV Z-Score > 5 (ร้อนเกินไป)"); }
    else if (dn(ind.mvrvRatio)) { const m = ind.mvrvRatio; if (m < 1.0) cycle += 24; else if (m < 2.0) cycle += 16; else if (m < 3.5) cycle += 6; else warnings.push("MVRV Ratio > 3.5 (แพง)"); }
    // explicit cheap-zone reasons (informational — points already counted once above)
    if (dn(ind.mvrvZScore) && ind.mvrvZScore < 0 && !reasons.some((r) => r.indexOf("MVRV Z-Score") >= 0)) reasons.push("MVRV Z-Score < 0 → zone ถูก ซื้อสะสมได้");
    if (dn(ind.mvrvRatio) && ind.mvrvRatio < 1 && !reasons.some((r) => r.indexOf("MVRV Ratio") >= 0)) reasons.push("MVRV Ratio < 1 → zone ถูก ซื้อสะสมได้");
    if (dn(ind.puellMultiple)) { const p = ind.puellMultiple; if (p < 0.5) { cycle += 6; reasons.push("Puell Multiple ต่ำ (โซน bottom)"); } else if (p < 1.5) cycle += 4; else warnings.push("Puell Multiple สูง (top zone)"); }
    cycle = Math.max(0, Math.min(30, cycle));

    // ---- Part 3: Holder / Sentiment Proxy (max 20) ----
    // Independent signals only: Fear & Greed (sentiment) + exact STH/LTH/SOPR (Glassnode).
    // Realized Price Proxy is shown on the card but NOT scored here — it is collinear with
    // the Cycle MVRV term (price<realizedPriceProxy ⟺ MVRV<1), so scoring it would
    // double-count the same "below realized cost" event already credited in Cycle.
    let holder = 0;
    const holderAvail = dn(ind.fearGreed) || dn(ind.realizedPriceProxy) || dn(ind.sthRealizedPrice) || dn(ind.sthSopr);
    if (dn(ind.fearGreed)) {
      const fgv = ind.fearGreed;
      if (fgv < 25) { holder += 14; reasons.push("Fear & Greed < 25 (Extreme Fear) → โซนซื้อสวนตลาด"); }
      else if (fgv < 45) { holder += 9; reasons.push("Fear & Greed < 45 (กลัว) ตลาดยังกังวล"); }
      else if (fgv < 55) holder += 5;
      else if (fgv < 75) holder += 2;
      else warnings.push("Fear & Greed > 75 (Greed) ระวังตลาดร้อน");
    }
    // exact STH/LTH/SOPR (Glassnode) — independent on-chain confirm if connected
    if (dn(ind.price) && dn(ind.sthRealizedPrice) && ind.price > ind.sthRealizedPrice) { holder += 3; reasons.push("ราคาเหนือทุน STH (ผู้ถือสั้นกลับมีกำไร)"); }
    if (dn(ind.sthSopr)) { if (ind.sthSopr < 1) { holder += 3; reasons.push("STH-SOPR < 1 ขายขาดทุน (อาจเป็นโซนสะสม)"); } else { holder += 3; } }
    if (dn(ind.lthSopr) && ind.lthSopr > 8) { holder -= 3; warnings.push("LTH-SOPR สูงมาก ผู้ถือยาวอาจ distribution"); }
    holder = Math.max(0, Math.min(20, holder));

    // ---- Part 4: Free Market Stress (max 15) ----
    // Binance funding + SSR proxy (DefiLlama) + miner-revenue multiple proxy
    // (Blockchain.com) + taker buy/sell. CSV ssr/stablecoinReserve as fallback.
    let stress = 0;
    const stressAvail = dn(ind.fundingRate) || dn(ind.takerBuySellRatio) || dn(ind.ssrProxy) || dn(ind.minerRevenueMultipleProxy) || dn(ind.ssr) || dn(ind.stablecoinReserve);
    if (dn(ind.fundingRate)) { const f = ind.fundingRate; if (f <= 0) { stress += 5; reasons.push("Funding ≤ 0 (ไม่มี long แออัด)"); } else if (f < 0.01) stress += 4; else if (f < 0.05) stress += 2; else warnings.push("Funding สูง (long แออัด ระวัง squeeze)"); }
    if (dn(ind.ssrProxy)) { if (ind.ssrProxy < 4) { stress += 3; reasons.push("SSR Proxy ต่ำ (มี stablecoin dry powder)"); } else if (ind.ssrProxy < 7) stress += 2; else warnings.push("SSR Proxy สูง (stablecoin น้อยเทียบ BTC)"); }
    else if (dn(ind.ssr)) { if (ind.ssr < 10) stress += 2; } else if (dn(ind.stablecoinReserve)) stress += 1;
    if (dn(ind.minerRevenueMultipleProxy)) { const p = ind.minerRevenueMultipleProxy; if (p < 0.6) { stress += 4; reasons.push("Miner Revenue Multiple Proxy ต่ำ (miner capitulation = bottom)"); } else if (p < 1.5) stress += 2; else warnings.push("Miner Revenue Multiple Proxy สูง (top zone)"); }
    if (dn(ind.takerBuySellRatio)) { const tkr = ind.takerBuySellRatio; if (tkr >= 0.95 && tkr <= 1.15) stress += 1; }
    stress = Math.max(0, Math.min(15, stress));

    // ---- combine (renormalise over available components) ----
    const componentScores = {
      technical: { raw: tech, max: 35, avail: true },
      cycle: { raw: cycle, max: 30, avail: cycleAvail },
      holder: { raw: holder, max: 20, avail: holderAvail },
      stress: { raw: stress, max: 15, avail: stressAvail }
    };
    let rawSum = 0, maxSum = 0;
    Object.keys(componentScores).forEach((k) => { const c = componentScores[k]; if (c.avail) { rawSum += c.raw; maxSum += c.max; } });
    const buyZoneScore = maxSum > 0 ? Math.round((rawSum / maxSum) * 100) : 0;
    const fullData = cycleAvail && holderAvail && stressAvail;
    const coveragePct = maxSum; // component maxes sum to 100 when fully connected
    const modeParts = ["เทคนิค"];
    if (cycleAvail) modeParts.push("Cycle/MVRV");
    if (holderAvail) modeParts.push("Holder/Sentiment");
    if (stressAvail) modeParts.push("Free Stress");
    const modeLabel = modeParts.join(" + ");

    const zone = cycleZoneOf(ind, aboveSma, belowSma, emaBull);
    // Overheated valuation overrides momentum: the buy-zone can't be "attractive"
    // when the cycle is overheated, so cap the score. This keeps the gauge/band,
    // the risk level, and the action recommendation consistent with each other.
    let finalScore = buyZoneScore;
    if (zone.key === "overheated" && finalScore > 34) { finalScore = 34; warnings.push("วัฏจักรร้อนเกินไป จึงกดคะแนนโซนซื้อลง"); }
    const b = band(finalScore);
    const action = actionOf(finalScore, zone.key, aboveSma, emaBull);
    let riskKey, riskLabel, riskThai;
    if (zone.key === "overheated" || finalScore < 35 || warnings.length >= 3) { riskKey = "high"; riskLabel = "High"; riskThai = "สูง"; }
    else if (finalScore >= 65) { riskKey = "low"; riskLabel = "Low"; riskThai = "ต่ำ"; }
    else { riskKey = "medium"; riskLabel = "Medium"; riskThai = "ปานกลาง"; }

    // Cache the canonical BTC Buy Zone Score so other pages (e.g. Portfolio
    // Position's Bitcoin bucket) show the SAME number instead of a separate calc.
    try { window.localStorage.setItem("portfolio_dashboard_btc_buyzone", JSON.stringify({ score: finalScore, zone: zone.key, mode: modeLabel, coverage: coveragePct, at: new Date().toISOString() })); } catch (e) {}

    return {
      buyZoneScore: finalScore, label: b.label, thaiLabel: b.thaiLabel, color: b.color, tone: b.tone,
      action, cycleZone: zone, riskLevel: { key: riskKey, label: riskLabel, thaiLabel: riskThai },
      componentScores, reasons, warnings, fullData, coveragePct, modeLabel,
      aboveSma, belowSma, emaBull, emaBear
    };
  }

  // ---------------------------------------------------------------- chart
  function emaSeries(vals, period) {
    const n = vals.map(Number); const out = new Array(n.length).fill(null);
    if (n.length < period) return out;
    let e = n.slice(0, period).reduce((s, v) => s + v, 0) / period; out[period - 1] = e;
    const k = 2 / (period + 1);
    for (let i = period; i < n.length; i++) { if (!Number.isFinite(n[i])) return out; e = (n[i] - e) * k + e; out[i] = e; }
    return out;
  }
  function smaSeries(vals, period) {
    const n = vals.map(Number); const out = new Array(n.length).fill(null);
    if (n.length < period) return out;
    let sum = 0; for (let i = 0; i < period; i++) sum += n[i]; out[period - 1] = sum / period;
    for (let i = period; i < n.length; i++) { sum += n[i] - n[i - period]; out[i] = sum / period; }
    return out;
  }
  function rangeBars(r) { return ({ "1M": 22, "3M": 66, "6M": 132, "1Y": 252, "3Y": 756, "5Y": 1260, "MAX": 100000 })[r] || 252; }

  // Build OHLC candles. Uses Binance real open/high/low when present in history,
  // otherwise synthesises (open = previous close) like the asset360 chart.
  function btcBars(hist) {
    const closes = (hist && Array.isArray(hist.closes)) ? hist.closes.map(Number) : [];
    const dates = (hist && Array.isArray(hist.dates)) ? hist.dates : [];
    const vols = (hist && Array.isArray(hist.volumes)) ? hist.volumes : [];
    const opens = (hist && Array.isArray(hist.opens)) ? hist.opens.map(Number) : null;
    const highs = (hist && Array.isArray(hist.highs)) ? hist.highs.map(Number) : null;
    const lows = (hist && Array.isArray(hist.lows)) ? hist.lows.map(Number) : null;
    const real = !!(opens && highs && lows && opens.length === closes.length);
    const bars = [];
    let prev = null;
    for (let i = 0; i < closes.length; i++) {
      const cl = closes[i];
      if (!Number.isFinite(cl)) continue;
      let o, h, l;
      if (real && Number.isFinite(opens[i]) && Number.isFinite(highs[i]) && Number.isFinite(lows[i])) {
        o = opens[i]; h = highs[i]; l = lows[i];
      } else {
        o = (prev != null) ? prev : cl; h = Math.max(o, cl); l = Math.min(o, cl);
      }
      bars.push({ date: dates[i], open: o, high: h, low: l, close: cl, volume: Number(vols[i]) || null });
      prev = cl;
    }
    return bars;
  }

  function drawChart(hist, ind) {
    const allBars = btcBars(hist);
    if (allBars.length < 2) {
      return `<div class="mc-empty"><strong>ยังไม่มีข้อมูลราคา BTC</strong>กด Load Latest Data ที่หัวมุมขวาบนเพื่อดึงราคา Bitcoin</div>`;
    }
    const fullCloses = allBars.map((b) => b.close);
    const e12f = emaSeries(fullCloses, 12), e26f = emaSeries(fullCloses, 26), s50f = smaSeries(fullCloses, 50), s200f = smaSeries(fullCloses, 200);
    const start = Math.max(0, allBars.length - rangeBars(range));
    const bars = allBars.slice(start);
    const d = bars.map((b) => b.date);
    const a12 = e12f.slice(start), a26 = e26f.slice(start), a50 = s50f.slice(start), a200 = s200f.slice(start);
    const n = bars.length;
    if (n < 2) return `<div class="mc-empty"><strong>ข้อมูลย้อนหลังไม่พอ</strong></div>`;

    const W = 1000, H = 360, leftPad = 4, rightPad = 4, topPad = 6;
    const showVol = bars.some((b) => Number.isFinite(Number(b.volume)) && Number(b.volume) > 0);
    const priceBottom = showVol ? 284 : 350;
    const volTop = priceBottom + 12, volBottom = 352;
    const innerW = W - leftPad - rightPad;

    const vals = [];
    bars.forEach((b) => { if (Number.isFinite(b.high)) vals.push(b.high); if (Number.isFinite(b.low)) vals.push(b.low); });
    [a12, a26, a50, a200].forEach((arr) => arr.forEach((v) => { if (dn(v)) vals.push(v); })); // dn() rejects the leading nulls that Number()==0 would leak as price 0
    if (dn(ind.sthRealizedPrice)) vals.push(ind.sthRealizedPrice);
    if (dn(ind.lthRealizedPrice)) vals.push(ind.lthRealizedPrice);
    if (dn(ind.realizedPriceProxy)) vals.push(ind.realizedPriceProxy);
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (!(max > min)) { max = min + 1; }
    const pad = (max - min) * 0.06 || 1; min -= pad; max += pad;
    const span = (max - min) || 1;
    const xAt = (i) => leftPad + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
    const pY = (v) => topPad + (1 - (v - min) / span) * (priceBottom - topPad);
    const cw = Math.max(1, (innerW / n) * 0.62);

    let svg = "";
    // gridlines + y labels
    const yl = [];
    for (let g = 0; g <= 4; g++) {
      const v = min + span * (g / 4); const yy = pY(v);
      svg += `<line x1="${leftPad}" y1="${yy.toFixed(1)}" x2="${W - rightPad}" y2="${yy.toFixed(1)}" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>`;
      yl.push(`<div class="btc-yl" style="top:${((yy / H) * 100).toFixed(2)}%">${money(v)}</div>`);
    }
    // volume bars
    if (showVol) {
      const vmax = Math.max.apply(null, bars.map((b) => Number(b.volume) || 0)) || 1;
      bars.forEach((b, i) => {
        const v = Number(b.volume); if (!Number.isFinite(v) || v <= 0) return;
        const up = Number(b.close) >= Number(b.open);
        const h = (v / vmax) * (volBottom - volTop);
        svg += `<rect x="${(xAt(i) - cw / 2).toFixed(1)}" y="${(volBottom - h).toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" fill="${up ? "#10b981" : "#f43f5e"}" opacity="0.35"/>`;
      });
    }
    // realized price reference lines (horizontal dashed)
    const refLine = (v, color) => {
      if (!dn(v) || v < min || v > max) return "";
      const yy = pY(v).toFixed(1);
      return `<line x1="${leftPad}" y1="${yy}" x2="${W - rightPad}" y2="${yy}" stroke="${color}" stroke-width="1" stroke-dasharray="4 4" opacity="0.8"/>`;
    };
    svg += refLine(ind.sthRealizedPrice, "#22d3ee") + refLine(ind.lthRealizedPrice, "#10b981") + refLine(ind.realizedPriceProxy, "#38bdf8");
    // candlesticks (wick + body)
    bars.forEach((b, i) => {
      const o = b.open, h = b.high, l = b.low, cl = b.close;
      if (![o, h, l, cl].every(Number.isFinite)) return;
      const up = cl >= o; const col = up ? "#10b981" : "#f43f5e"; const x = xAt(i);
      svg += `<line x1="${x.toFixed(1)}" y1="${pY(h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${pY(l).toFixed(1)}" stroke="${col}" stroke-width="1"/>`;
      const yT = pY(Math.max(o, cl)), yB = pY(Math.min(o, cl));
      svg += `<rect x="${(x - cw / 2).toFixed(1)}" y="${yT.toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(1, yB - yT).toFixed(1)}" fill="${col}"/>`;
    });
    // EMA/SMA overlays
    const lineOf = (arr, color, dash) => {
      const pts = arr.map((v, i) => (dn(v) ? `${xAt(i).toFixed(1)},${pY(v).toFixed(1)}` : null)).filter(Boolean).join(" ");
      return pts ? `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` : "";
    };
    svg += lineOf(a200, "#64748b", "6 4") + lineOf(a50, "#2dd4bf", "3 3") + lineOf(a26, "#a855f7") + lineOf(a12, "#f59e0b");
    // x labels
    const xl = [];
    const ticks = Math.min(6, n);
    for (let t = 0; t < ticks; t++) {
      const i = Math.round((t * (n - 1)) / (ticks - 1 || 1));
      xl.push(`<div class="btc-xl" style="left:${((xAt(i) / W) * 100).toFixed(2)}%">${esc(String(d[i] || "").slice(2, 10))}</div>`);
    }
    return `<div class="btc-chart-inner"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${svg}</svg>${yl.join("")}${xl.join("")}</div>`;
  }

  // ---------------------------------------------------------------- render
  function toneColor(t) { return t === "bull" ? "var(--mc-emerald)" : t === "bear" ? "var(--mc-red)" : t === "warn" || t === "watch-bull" ? "var(--mc-amber)" : t === "neutral" ? "var(--mc-blue)" : "var(--mc-muted)"; }

  function providerChip(name, status, tone) { return `<span class="btc-prov btc-prov-${tone}"><b>${esc(name)}</b> ${esc(status)}</span>`; }
  function modeBar(ind) {
    const p = (apiData && apiData.providers) || {};
    const onc = ind._hasOnchain;
    const csvAt = readOnchain().lastImported;
    let bStatus, bTone;
    if (p.binance && p.binance.ok) { bStatus = "เชื่อมต่อแล้ว"; bTone = "ok"; }
    else if (ind._techSrc === "Binance") { bStatus = "เชื่อมต่อแล้ว"; bTone = "ok"; }
    else if (ind._techSrc) { bStatus = "ใช้ " + ind._techSrc; bTone = "warn"; }
    else { bStatus = "เชื่อมต่อไม่ได้"; bTone = "err"; }
    const provStatus = (pv) => !pv ? ["ยังไม่ดึง", "warn"] : (!pv.configured ? ["ยังไม่ตั้ง API key", "warn"] : (pv.metricCount ? ["เชื่อมต่อแล้ว", "ok"] : ["ตั้งค่าแล้ว (ยังไม่มีข้อมูล)", "warn"]));
    const freeStatus = (pv) => pv && pv.ok ? ["เชื่อมต่อแล้ว", "ok"] : (apiData ? ["ดึงไม่ได้", "warn"] : ["ยังไม่ดึง", "warn"]);
    const cm = freeStatus(p.coinMetrics), fut = freeStatus(p.binanceFutures), bc = freeStatus(p.blockchain), ll = freeStatus(p.defillama), fng = freeStatus(p.fearGreed);
    const gl = provStatus(p.glassnode), cq = provStatus(p.cryptoquant);
    const fetched = apiData && apiData.fetchedAt ? fmtWhen(apiData.fetchedAt) : "—";
    return `<section class="mc-card mc-panel mc-fade btc-modebar">
      <div class="btc-mode">
        <span class="btc-mode-badge ${onc ? "btc-mode-full" : "btc-mode-tech"}">${onc ? "Free data — full coverage" : "Free data — technical only"}</span>
        <span class="mc-sub">ใช้ข้อมูลฟรีทั้งหมด (ไม่ต้องใช้ API key)</span>
      </div>
      <div class="btc-provs">
        ${providerChip("Binance", bStatus, bTone)}
        ${providerChip("Binance Futures", fut[0], fut[1])}
        ${providerChip("Coin Metrics", cm[0], cm[1])}
        ${providerChip("Blockchain.com", bc[0], bc[1])}
        ${providerChip("DefiLlama", ll[0], ll[1])}
        ${providerChip("Fear&Greed", fng[0], fng[1])}
        ${(p.glassnode && p.glassnode.configured) ? providerChip("Glassnode", gl[0], gl[1]) : ""}
        ${(p.cryptoquant && p.cryptoquant.configured) ? providerChip("CryptoQuant", cq[0], cq[1]) : ""}
        ${csvAt ? providerChip("CSV", fmtWhen(csvAt), "ok") : ""}
      </div>
    </section>`;
  }
  // slim top bar: freshness + refresh (moved out of modeBar so provider status doesn't block the top)
  function slimBar(ind) {
    const fetched = apiData && apiData.fetchedAt ? fmtWhen(apiData.fetchedAt) : ((readSnapshot() && readSnapshot().loadedAt) ? fmtWhen(readSnapshot().loadedAt) : "—");
    return `<section class="mc-card mc-panel mc-fade btc-slimbar">
      <span class="mc-sub">${apiState === "loading" ? "กำลังดึงข้อมูล…" : apiState === "error" ? ("ดึงไม่สำเร็จ: " + esc(apiError || "")) : "Free data · อัปเดตล่าสุด " + esc(fetched)}</span>
      <button class="mc-btn mc-btn-primary" id="btcRefresh" type="button"${apiState === "loading" ? " disabled" : ""}>↻ ดึงข้อมูลล่าสุด</button>
    </section>`;
  }
  // 6-signal strip (shared with the Intelligence tab; falls back to a hint when Intelligence not built yet)
  function signalStripSection(snap) {
    const strip = (window.BitcoinIntelligenceUI && window.BitcoinIntelligenceUI.signalStrip) ? window.BitcoinIntelligenceUI.signalStrip(snap) : "";
    if (!strip) return "";
    return `<section class="mc-card mc-panel mc-fade btc-sigwrap"><div class="mc-panel-head"><div><h2>📡 6 สัญญาณเทคนิค</h2><span class="mc-sub">EMA12×26 · SMA50 · SMA200 · RSI(30/70) · Bull/Bear Divergence — ดูรายละเอียด+คาดการณ์ที่แท็บ 🧠 Intelligence</span></div></div>${strip}</section>`;
  }
  // Data & Sources — provider status + coverage + paid note + CSV import folded into one accordion
  function dataSourcesAccordion(ind, bz) {
    return `<details class="mc-card mc-panel mc-fade btc-datasrc">
      <summary><h2 style="display:inline">🔌 ข้อมูล & แหล่งที่มา (Data & Sources)</h2><span class="mc-sub"> · สถานะ provider · Data Coverage · นำเข้า CSV</span></summary>
      <div class="btc-datasrc-body">${modeBar(ind)}${coveragePanel(ind, bz)}${paidNote()}${importSection()}</div>
    </details>`;
  }

  function coveragePanel(ind, bz) {
    // The 4 scoring rows are driven by the SAME componentScores availability the Buy
    // Zone Score uses, so the panel and the coverage % can never disagree. A 5th
    // info row reports exact holder data (paid) vs the free proxies in use.
    const cs = (bz && bz.componentScores) || {};
    const M = ind._meta || {};
    const srcOf = (keys) => { for (const k of keys) { if (ind[k] != null && M[k] && M[k].source) return M[k]; } return null; };
    const rows = [
      { key: "technical", label: "Technical (ราคา/EMA/SMA/RSI)", metrics: ["price"], need: "Binance" },
      { key: "cycle", label: "Cycle Valuation (MVRV/NUPL)", metrics: ["mvrvRatio", "mvrvZScore", "nupl"], need: "Coin Metrics (ฟรี)" },
      { key: "holder", label: "Holder / Sentiment Proxy", metrics: ["realizedPriceProxy", "nupl", "fearGreed"], need: "Coin Metrics + Alternative.me (ฟรี)" },
      { key: "stress", label: "Free Market Stress", metrics: ["fundingRate", "ssrProxy", "minerRevenueMultipleProxy", "takerBuySellRatio"], need: "Binance Futures + DefiLlama + Blockchain.com (ฟรี)" }
    ];
    const item = (r) => {
      const avail = !!(cs[r.key] && cs[r.key].avail);
      const meta = srcOf(r.metrics);
      const proxy = meta && meta.proxy;
      return `<div class="btc-cov-item ${avail ? "btc-cov-on" : "btc-cov-off"}">
        <div class="btc-cov-top"><span class="btc-cov-dot"></span><strong>${esc(r.label)}</strong></div>
        <div class="btc-cov-meta">${avail ? `เชื่อมต่อแล้ว · ${esc(meta ? meta.source : r.need)}${proxy ? " (proxy)" : ""}${meta && meta.freshness ? " · " + freshBadge(meta.freshness) : ""}` : `ยังไม่เชื่อมต่อ · ${esc(r.need)}`}</div>
      </div>`;
    };
    // 5th info row: exact holder on-chain (paid) — not part of the score.
    const exactHolder = dn(ind.sthRealizedPrice) || dn(ind.lthRealizedPrice) || dn(ind.sthSopr) || dn(ind.lthSopr);
    const exactRow = `<div class="btc-cov-item ${exactHolder ? "btc-cov-on" : "btc-cov-off"}">
      <div class="btc-cov-top"><span class="btc-cov-dot"></span><strong>Holder exact (STH/LTH/SOPR)</strong></div>
      <div class="btc-cov-meta">${exactHolder ? "เชื่อมต่อแล้ว · Glassnode" : "ไม่มีแบบฟรี — ใช้ proxy แทน (exact ต้องใช้ Glassnode เสียเงิน)"}</div>
    </div>`;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>Data Coverage</h2><span class="mc-sub">แหล่งข้อมูลฟรีที่เชื่อมแล้ว · ครอบคลุม ${esc(bz ? bz.coveragePct : 0)}%</span></div></div>
      <div class="btc-cov-grid">${rows.map(item).join("")}${exactRow}</div>
    </section>`;
  }

  function tabBar() {
    return `<div class="btc-tabs" id="btcTabs">
      <button type="button" class="btc-tab${activeTab === "monitor" ? " is-active" : ""}" data-tab="monitor">₿ Monitor · ถูกหรือแพง?</button>
      <button type="button" class="btc-tab${activeTab === "intelligence" ? " is-active" : ""}" data-tab="intelligence">🧠 Intelligence · 6 สัญญาณ + คาดการณ์</button>
    </div>`;
  }
  function biCycle(snap) { return (snap && snap.bitcoinIntelligence && snap.bitcoinIntelligence.cycle) || null; }

  function render() {
    const snap = readSnapshot();
    // Phase 2 — delegate the Intelligence tab to its own read-only UI module.
    if (activeTab === "intelligence") {
      const body = (window.BitcoinIntelligenceUI && window.BitcoinIntelligenceUI.html)
        ? window.BitcoinIntelligenceUI.html(snap)
        : `<div class="mc-empty"><strong>กำลังโหลด Bitcoin Intelligence…</strong>โมดูลกำลังเริ่มต้น</div>`;
      root.innerHTML = tabBar() + `<div id="btcTabBody">${body}</div>`;
      wire();
      if (window.BitcoinIntelligenceUI && window.BitcoinIntelligenceUI.wire) window.BitcoinIntelligenceUI.wire(document.getElementById("btcTabBody"));
      return;
    }
    const ind = buildIndicators(snap);
    if (ind.price == null) {
      root.innerHTML = tabBar() + `<div id="btcTabBody">${hero(null, null) + modeBar(ind) + (snap ? emptyNoBtc() : emptyNoSnapshot())}</div>`;
      wire(); return;
    }
    const hist = chartHist(snap);
    const bz = computeBuyZone(ind);

    root.innerHTML = tabBar() + `<div id="btcTabBody">` +
      hero(ind, bz) +
      signalStripSection(snap) +
      slimBar(ind) +
      buyZoneSection(bz) +
      onchainDeepDive(ind) +
      `<div class="mc-grid mc-grid-2">${cyclePanel(ind, bz)}${holderSentimentPanel(ind)}</div>` +
      chartSection(hist, ind) +
      `<div class="mc-grid mc-grid-2">${technicalPanel(ind, bz)}${freeStressPanel(ind)}</div>` +
      explainSection() +
      dataSourcesAccordion(ind, bz) +
      `</div>`;
    wire();
  }

  function dailyChange(hist, price) {
    const c = hist && Array.isArray(hist.closes) ? hist.closes.map(Number) : [];
    if (c.length < 2) return null; const a = c[c.length - 2]; if (!(a > 0)) return null; return ((price - a) / a) * 100;
  }

  function hero(ind, bz) {
    const snap = readSnapshot();
    const change = ind ? dailyChange(chartHist(snap), ind.price) : null;
    const price = ind ? money(ind.price) : "—";
    const act = bz ? bz.action : null;
    const zone = bz ? bz.cycleZone : null;
    const risk = bz ? bz.riskLevel : null;
    const cy = biCycle(snap), hv = cy && cy.halving;
    const halvingLine = hv ? `<p class="mc-hero-sub btc-hero-halving">⛏️ วัฏจักร 4 ปี: <b>${cy.current ? esc(cy.current.state) : ""}</b>${hv.daysSince != null ? ` · ${hv.daysSince} วันหลัง halving` : ""}${hv.daysTo != null ? ` · อีก ${hv.daysTo} วันถึงครั้งถัดไป` : ""}${hv.bucket ? ` · ${esc(hv.bucket)}` : ""}</p>` : "";
    const m = (label, thai, value, valueColor, sub) => `<div class="mc-card mc-metric mc-glow"><div class="mc-label"><span>${esc(label)}</span></div>
      <div class="mc-value" style="font-size:${String(value).length > 12 ? "20px" : "26px"};color:${valueColor || "var(--mc-text)"}">${value}</div>
      <div class="mc-delta" style="color:var(--mc-muted)">${esc(sub || thai)}</div></div>`;
    return `<section class="mc-page-hero mc-fade">
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start;">
        <div style="position:relative;z-index:1;">
          <p class="mc-eyebrow">Bitcoin Monitor · ถูกหรือแพง?</p>
          <h1>₿ มอนิเตอร์ Bitcoin</h1>
          <p class="mc-hero-sub">โซนมูลค่า on-chain (MVRV/NUPL) + Buy Zone Score สำหรับจังหวะสะสมระยะยาว — สัญญาณเทคนิค + คาดการณ์ราคาดูที่แท็บ 🧠 Intelligence</p>
          ${halvingLine}
        </div>
        <div class="a360-hero-cards" style="position:relative;z-index:1;min-width:min(640px,100%);display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
          ${m("BTC Price", "ราคา Bitcoin", price, "var(--mc-text)", change == null ? "ราคา Bitcoin" : `${change >= 0 ? "▲" : "▼"} ${signedPct(change)} วันนี้`)}
          ${m("BTC Action", "คำแนะนำ", act ? esc(act.thaiAction) : "—", toneColor(act && act.tone), act ? esc(act.action) : "ยังไม่มีข้อมูล")}
          ${m("Valuation Zone", "โซนมูลค่า", zone ? esc(zone.thaiLabel) : "—", toneColor(zone && zone.tone), zone ? esc(zone.label) : "")}
          ${m("BTC Risk", "ความเสี่ยง", risk ? esc(risk.thaiLabel) : "—", risk && risk.key === "high" ? "var(--mc-red)" : risk && risk.key === "low" ? "var(--mc-emerald)" : "var(--mc-amber)", risk ? esc(risk.label) : "")}
        </div>
      </div>
    </section>`;
  }

  function chartSection(hist, ind) {
    const ranges = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head">
        <div><h2>BTC Price Chart</h2><span class="mc-sub">ราคา + EMA12 / EMA26 / SMA50 / SMA200${dn(ind.realizedPriceProxy) || dn(ind.sthRealizedPrice) || dn(ind.lthRealizedPrice) ? " + Realized Price" : ""}</span></div>
        <div class="btc-range" id="btcRange">${ranges.map((r) => `<button type="button" class="${r === range ? "is-active" : ""}" data-range="${r}">${r}</button>`).join("")}</div>
      </div>
      <div class="btc-chart-wrap" id="btcChart">${drawChart(hist, ind)}</div>
      <div class="btc-legend">
        <span><i style="background:#10b981"></i>แท่งขึ้น</span>
        <span><i style="background:#f43f5e"></i>แท่งลง</span>
        <span><i style="background:#f59e0b"></i>EMA12</span>
        <span><i style="background:#a855f7"></i>EMA26</span>
        <span><i style="background:#2dd4bf"></i>SMA50</span>
        <span><i style="background:#64748b"></i>SMA200</span>
        ${dn(ind.realizedPriceProxy) ? '<span><i style="background:#38bdf8"></i>Realized Price Proxy</span>' : ""}
        ${dn(ind.sthRealizedPrice) ? '<span><i style="background:#22d3ee"></i>STH Realized</span>' : ""}
        ${dn(ind.lthRealizedPrice) ? '<span><i style="background:#10b981"></i>LTH Realized</span>' : ""}
      </div>
    </section>`;
  }

  function gauge(score, color) {
    const v = Math.max(0, Math.min(100, score));
    const len = (v / 100) * 157.08;
    return `<svg viewBox="0 0 120 74" width="150" height="92"><path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="10" stroke-linecap="round"/>
      <path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${len} 200"/>
      <text x="60" y="58" text-anchor="middle" font-size="26" font-weight="800" fill="${color}">${v}</text></svg>`;
  }
  function compBar(label, c) {
    const pct = c.avail ? Math.round((c.raw / c.max) * 100) : 0;
    return `<div class="btc-comp"><div class="btc-comp-head"><span>${esc(label)}</span><strong>${c.avail ? `${c.raw}/${c.max}` : "ไม่มีข้อมูล"}</strong></div>
      <div class="btc-comp-bar"><i style="width:${c.avail ? pct : 0}%;${c.avail ? "" : "background:var(--mc-border)"}"></i></div></div>`;
  }
  function buyZoneSection(bz) {
    const cs = bz.componentScores;
    const reasons = bz.reasons.slice(0, 6).map((r) => `<li>${esc(r)}</li>`).join("");
    const warns = bz.warnings.slice(0, 6).map((w) => `<li>⚠️ ${esc(w)}</li>`).join("");
    return `<section class="mc-card mc-panel mc-fade btc-acc-${bz.tone}">
      <div class="mc-panel-head"><div><h2>BTC Buy Zone Score</h2><span class="mc-sub">Technical 35 · Cycle 30 · Holder/Sentiment 20 · Free Stress 15 (ข้อมูลฟรีทั้งหมด)</span></div>
        <span class="btc-cov-chip">ครอบคลุมข้อมูล ${bz.coveragePct}% · โหมด: ${esc(bz.modeLabel)}</span></div>
      <div class="btc-bz">
        <div class="btc-bz-gauge">${gauge(bz.buyZoneScore, bz.color)}<div class="btc-bz-label" style="color:${bz.color}">${esc(bz.thaiLabel)}</div><div class="btc-bz-sub">${esc(bz.label)}</div></div>
        <div class="btc-bz-comps">
          ${compBar("Technical Timing (35)", cs.technical)}
          ${compBar("Cycle Valuation (30)", cs.cycle)}
          ${compBar("Holder / Sentiment (20)", cs.holder)}
          ${compBar("Free Market Stress (15)", cs.stress)}
        </div>
      </div>
      ${!bz.fullData ? `<p class="btc-note">💡 คะแนนคิดจาก <b>${esc(bz.coveragePct)}%</b> ของข้อมูล (renormalised จากส่วนที่เชื่อมต่อแล้ว ไม่กดคะแนนเพราะข้อมูลขาด) — Holder/Stress ต้องใช้ Glassnode/CryptoQuant key ดูได้ที่ Data Coverage ด้านล่าง</p>` : ""}
      <div class="btc-reasons">
        ${reasons ? `<div><h4>เหตุผลสนับสนุน</h4><ul class="btc-ul">${reasons}</ul></div>` : ""}
        ${warns ? `<div><h4>ข้อควรระวัง</h4><ul class="btc-ul btc-warn">${warns}</ul></div>` : ""}
      </div>
    </section>`;
  }

  function zoneTag(key) {
    const z = { under: ["ต่ำกว่ามูลค่า", "var(--mc-emerald)"], fair: ["ปกติ", "var(--mc-blue)"], expensive: ["แพง", "var(--mc-amber)"], over: ["ร้อนเกินไป", "var(--mc-red)"], na: ["ไม่มีข้อมูล", "var(--mc-muted)"] }[key];
    return `<span class="btc-zone" style="color:${z[1]};border-color:${z[1]}">${z[0]}</span>`;
  }

  // Zone scales: [threshold, zone] segments + display range. Lower = cheaper/buy on
  // the left, higher = sell on the right (Fear & Greed: low fear = buy, same orientation).
  const ZONE_COL = { buy: "var(--mc-emerald)", normal: "var(--mc-blue)", high: "var(--mc-amber)", sell: "var(--mc-red)" };
  const ZONE_TH = { buy: "น่าซื้อ", normal: "ปกติ", high: "เริ่มแพง", sell: "น่าขาย" };
  const ZONE_SCALES = {
    mvrvZScore: { lo: -1, hi: 7, segs: [[0, "buy"], [2, "normal"], [5, "high"], [7, "sell"]] },
    mvrvRatio: { lo: 0, hi: 4, segs: [[1, "buy"], [2, "normal"], [3.5, "high"], [4, "sell"]] },
    nupl: { lo: -0.25, hi: 1, segs: [[0, "buy"], [0.5, "normal"], [0.75, "high"], [1, "sell"]] },
    puellMultiple: { lo: 0, hi: 5, segs: [[0.5, "buy"], [1.5, "normal"], [4, "high"], [5, "sell"]] },
    fearGreed: { lo: 0, hi: 100, segs: [[25, "buy"], [55, "normal"], [75, "high"], [100, "sell"]] },
    rsi14: { lo: 0, hi: 100, segs: [[30, "buy"], [70, "normal"], [100, "sell"]] },
    ssrProxy: { lo: 0, hi: 10, segs: [[4, "buy"], [7, "normal"], [10, "high"]] },
    minerRevenueMultipleProxy: { lo: 0, hi: 5, segs: [[0.6, "buy"], [1.5, "normal"], [4, "high"], [5, "sell"]] },
    fundingRate: { lo: -0.02, hi: 0.08, segs: [[0, "buy"], [0.01, "normal"], [0.05, "high"], [0.08, "sell"]] }
  };
  function zoneBar(scaleKey, value) {
    const sc = ZONE_SCALES[scaleKey];
    if (!sc || !dn(value)) return "";
    const range = sc.hi - sc.lo || 1;
    let prev = sc.lo, segHtml = "";
    sc.segs.forEach(([to, zone]) => {
      const w = Math.max(0, (Math.min(to, sc.hi) - prev) / range * 100);
      segHtml += `<span class="btc-zseg" style="width:${w.toFixed(2)}%;background:${ZONE_COL[zone]}"></span>`;
      prev = to;
    });
    const pos = Math.max(0, Math.min(100, (value - sc.lo) / range * 100));
    let curZone = sc.segs[sc.segs.length - 1][1];
    for (let i = 0; i < sc.segs.length; i++) { if (value < sc.segs[i][0]) { curZone = sc.segs[i][1]; break; } }
    return `<div class="btc-zonebar">
      <div class="btc-ztrack">${segHtml}<span class="btc-zmarker" style="left:${pos.toFixed(1)}%;color:${ZONE_COL[curZone]}">▾</span></div>
      <div class="btc-zlabels"><span>น่าซื้อ</span><span>ปกติ</span><span>น่าขาย</span></div>
      <div class="btc-znow" style="color:${ZONE_COL[curZone]}">ตอนนี้: <b>${esc(ZONE_TH[curZone])}</b></div>
    </div>`;
  }
  function metricCard(title, value, zoneKey, interp, info, scaleKey) {
    info = info || {};
    const hasValue = info.value != null && info.source;
    let footer, body;
    if (hasValue) {
      const proxyTag = info.proxy ? ` <span class="btc-proxy-tag" title="ค่าประมาณจากข้อมูลฟรี ไม่ใช่ค่าทางการแบบเสียเงิน">proxy</span>` : "";
      footer = `<div class="btc-ind-src">ที่มา: <b>${esc(info.source)}</b> ${freshBadge(info.freshness)}${proxyTag}${info.date ? ` · ${esc(fmtDate(info.date))}` : ""}${info.derived ? ` · <em title="คำนวณจาก market cap / realized cap">derived</em>` : ""}</div>`;
      body = `<div class="btc-ind-val">${value}</div><div class="btc-ind-interp">${esc(interp)}</div>${scaleKey ? zoneBar(scaleKey, info.value) : ""}`;
    } else {
      const links = info.referenceLinks || [];
      if (links.length) {
        footer = `<div class="btc-ind-src btc-ind-na">${freshBadge(info.freshness || "public_chart_only")} · มีกราฟอ้างอิงภายนอก</div><div class="btc-refs">${refLinksHtml(links)}</div>`;
      } else {
        footer = `<div class="btc-ind-src btc-ind-na">${freshBadge(info.freshness || "not_connected")} · เพิ่ม API key / นำเข้า CSV</div>`;
      }
      body = `<div class="btc-ind-val btc-ind-val-na">—</div><div class="btc-ind-interp">${esc(links.length ? "ยังไม่มีข้อมูลอัตโนมัติ — ดูกราฟอ้างอิงภายนอกได้" : "ยังไม่มีข้อมูล")}</div>`;
    }
    return `<div class="mc-card btc-ind-card${hasValue ? "" : " btc-ind-empty"}">
      <div class="btc-ind-top"><span class="btc-ind-title">${esc(title)}</span>${zoneTag(zoneKey)}</div>
      ${body}
      ${footer}
    </div>`;
  }
  // ---------------------------------------------------------------- on-chain deep dive
  // 6 exact on-chain cards (BGeometrics free API) with full Thai explanations:
  // คืออะไร / อ่านยังไง / วันนี้ / ข้อจำกัด + gauge bar + link to the full chart.
  const DD_COL = { green: "var(--mc-emerald)", gray: "#64748b", amber: "var(--mc-amber)", red: "var(--mc-red)", blue: "var(--mc-blue)" };
  function ddFmtM(v) { return dn(v) ? Number((v / 1e6).toFixed(2)) + "M" : "—"; }
  const DD_CARDS = [
    {
      key: "mvrvZScore", group: "ราคาถูกหรือแพง", title: "MVRV Z-Score",
      fmt: (v) => num(v, 2),
      gauge: { lo: -1, hi: 8, ticks: [-1, 0, 2, 5, 8], segs: [[2, "green"], [5, "gray"], [8, "red"]] },
      tag: (v) => v < 0 ? ["ถูกสุดขั้ว", "green"] : v < 2 ? ["ต่ำ", "green"] : v < 5 ? ["กลาง", "gray"] : v < 7 ? ["สูง", "amber"] : ["ยอดดอย", "red"],
      what: "MVRV ที่หารด้วยความผันผวนของมูลค่าตลาด ทำให้เอาคนละยุคมาเทียบกันได้ตรงๆ",
      how: "ต่ำกว่า 0 คือถูกสุดขั้ว 0–2 สะสม เกิน 7 คือโซนยอดดอยในอดีต",
      today: (v) => num(v, 2) + " = " + (v < 0 ? "ถูกสุดขั้ว — โซนสะสมประวัติศาสตร์" : v < 2 ? "ยังอยู่ครึ่งล่างของวัฏจักร" : v < 5 ? "กลางวัฏจักร" : v < 7 ? "ครึ่งบนของวัฏจักร เริ่มร้อน" : "โซนยอดดอยในอดีต"),
      chart: "https://charts.bgeometrics.com/mvrv_zscore.html"
    },
    {
      key: "realizedPriceProxy", group: "ราคาถูกหรือแพง", title: "Realized Price",
      fmt: (v) => money(v),
      tag: () => ["เส้นฐาน", "blue"],
      what: "ต้นทุนเฉลี่ยของทั้งตลาด คิดจากราคาตอนที่แต่ละเหรียญขยับครั้งล่าสุด",
      how: "ไม่ใช่โซน แต่เป็นเส้นฐาน ถ้าราคาหลุดใต้เส้นนี้แปลว่าตลาดโดยรวมอยู่ใต้ต้นทุน",
      today: (v, ind2) => "เป็นตัวหารของ MVRV" + (dn(ind2.price) && v > 0 ? " · ราคาปัจจุบัน" + (ind2.price >= v ? "สูงกว่าเส้นฐาน " : "ต่ำกว่าเส้นฐาน ") + Math.abs((ind2.price - v) / v * 100).toFixed(0) + "%" : ""),
      limit: "เหรียญที่หายไปตลอดกาลก็ถูกนับด้วยที่ราคาสมัยที่ขยับครั้งสุดท้าย เส้นนี้จึงต่ำกว่าต้นทุนจริงของคนที่ยังถืออยู่",
      chart: "https://charts.bgeometrics.com/realized_price.html"
    },
    {
      key: "nupl", group: "อารมณ์ตลาด", title: "NUPL",
      fmt: (v) => num(v, 2),
      gauge: { lo: 0, hi: 1, ticks: [0, 0.25, 0.5, 0.75, 1], segs: [[0.25, "green"], [0.5, "gray"], [0.75, "amber"], [1, "red"]] },
      tag: (v) => v < 0 ? ["ยอมแพ้", "green"] : v < 0.25 ? ["ความหวัง", "green"] : v < 0.5 ? ["ลังเล", "gray"] : v < 0.75 ? ["เชื่อมั่น", "amber"] : ["ยูโฟเรีย", "red"],
      what: "สัดส่วนกำไรบนกระดาษของทั้งตลาดเทียบกับมูลค่าตลาด ใช้วัดว่าตลาดร้อนแค่ไหน",
      how: "ต่ำกว่า 0 ยอมแพ้ · 0–0.25 ความหวัง · 0.25–0.5 ลังเล · 0.5–0.75 เชื่อมั่น · เกิน 0.75 ยูโฟเรีย",
      today: (v) => num(v, 2) + " = " + (v < 0 ? "ตลาดขาดทุน (capitulation)" : v < 0.25 ? "ตลาดยังไม่ร้อน" : v < 0.5 ? "กำไรปานกลาง" : v < 0.75 ? "ตลาดเชื่อมั่น เริ่มร้อน" : "ยูโฟเรีย — เสี่ยงสูง"),
      chart: "https://charts.bgeometrics.com/nupl.html"
    },
    {
      key: "sopr", group: "อารมณ์ตลาด", title: "SOPR",
      fmt: (v) => num(v, 2),
      gauge: { lo: 0.9, hi: 1.1, ticks: [0.9, 1, 1.1], segs: [[1, "green"], [1.1, "gray"]] },
      tag: (v) => v < 0.98 ? ["ยอมขายขาดทุน", "green"] : v < 1 ? ["ขายขาดทุนเล็กน้อย", "green"] : v <= 1.03 ? ["ขายมีกำไร", "gray"] : ["กำไรหนา ระวัง", "amber"],
      what: "เหรียญที่ขยับวันนี้ ขายที่ราคากำไรหรือขาดทุนเทียบกับตอนที่ได้มา",
      how: "เกิน 1 คือคนขายมีกำไร ต่ำกว่า 1 คือคนยอมขายขาดทุน ซึ่งมักเกิดตอนตลาดหมดแรง",
      today: (v) => num(v, 2) + " = " + (v >= 1 ? "คนที่ขายวันนี้มีกำไรเฉลี่ย" : "คนขายยอมขายขาดทุน (มักใกล้จุดหมดแรงขาย)"),
      chart: "https://charts.bgeometrics.com/sopr.html"
    },
    {
      key: "ssrProxy", group: "แรงซื้อในตลาด", title: "SSR",
      fmt: (v) => num(v, 2),
      gauge: { lo: 0, hi: 55, ticks: [0, 10, 25, 40, 55], segs: [[10, "green"], [25, "gray"], [40, "amber"], [55, "red"]] },
      tag: (v) => v < 10 ? ["แรงซื้อเยอะ", "green"] : v < 25 ? ["ปกติ", "gray"] : v < 40 ? ["เริ่มตึง", "amber"] : ["แรงซื้อหมด", "red"],
      what: "Stablecoin Supply Ratio — มูลค่าตลาด Bitcoin หารด้วยมูลค่า Stablecoin ทั้งหมด วัดว่ามีเงินรอซื้อ (stablecoin) มากแค่ไหนเทียบกับ Bitcoin",
      how: "ยิ่งต่ำ = มี stablecoin เยอะเทียบ Bitcoin = แรงซื้อรอเข้าเยอะ · ยิ่งสูง = เงินรอซื้อน้อย แรงหมดแล้ว",
      today: (v) => num(v, 2) + " = " + (v < 10 ? "ต่ำ มีเงิน stablecoin รอซื้อเยอะเทียบ Bitcoin" : v < 25 ? "กลางๆ เงินรอซื้อพอมี" : "สูง เงินรอซื้อเริ่มน้อย"),
      limit: "ค่านี้ค่อยๆ ต่ำลงตามเวลาเพราะ Stablecoin โตเร็วกว่า Bitcoin เทียบข้ามยุคตรงๆ ไม่ได้ ให้ดูเทียบช่วงใกล้ๆ",
      chart: "https://charts.bgeometrics.com/ssr.html"
    },
    {
      key: "lthSupply", group: "พฤติกรรมนักลงทุน", title: "LTH Supply",
      fmt: (v) => ddFmtM(v),
      gauge: { lo: 12e6, hi: 20e6, ticks: [12e6, 15e6, 20e6], tickFmt: ddFmtM, segs: [[15e6, "gray"], [20e6, "green"]] },
      tag: (v) => v >= 15e6 ? ["ถูกล็อกเยอะ", "green"] : ["ระดับกลาง", "gray"],
      what: "จำนวน Bitcoin ที่อยู่ในมือคนถือเกิน 155 วัน เทียบกับ ~19.9 ล้านเหรียญที่ขุดออกมาแล้วทั้งหมด",
      how: "ยิ่งสูงแปลว่าเหรียญยิ่งถูกล็อกไว้กับสายยาว เหลือหมุนในตลาดน้อย ดูทิศทางว่าเพิ่มหรือลดสำคัญกว่าตัวเลขนิ่งๆ",
      today: (v) => (v / 1e6).toFixed(2) + " ล้าน BTC อยู่ในมือสายถือยาว",
      chart: "https://charts.bgeometrics.com/supply_lth_sth.html"
    }
  ];

  function ddGauge(g, v) {
    if (!g || !dn(v)) return "";
    const range = g.hi - g.lo || 1;
    let prev = g.lo, segsHtml = "";
    g.segs.forEach(([to, col]) => {
      const w = Math.max(0, (Math.min(to, g.hi) - prev) / range * 100);
      segsHtml += `<span style="width:${w.toFixed(2)}%;background:${DD_COL[col]}"></span>`;
      prev = to;
    });
    const pos = Math.max(0, Math.min(100, (v - g.lo) / range * 100));
    const ticks = (g.ticks || []).map((t) => {
      const x = ((t - g.lo) / range * 100);
      return `<i style="left:${x.toFixed(1)}%">${esc(g.tickFmt ? g.tickFmt(t) : String(t))}</i>`;
    }).join("");
    return `<div class="btc-dd-gauge"><div class="btc-dd-track">${segsHtml}<b style="left:${pos.toFixed(1)}%"></b></div><div class="btc-dd-ticks">${ticks}</div></div>`;
  }

  function ddCard(cfg, ind) {
    const M = (ind._meta || {})[cfg.key] || {};
    const v = ind[cfg.key];
    const has = dn(v);
    const tag = has ? cfg.tag(v) : null;
    const rows = [];
    rows.push(["คืออะไร", cfg.what]);
    rows.push(["อ่านยังไง", cfg.how]);
    if (has) rows.push(["วันนี้", cfg.today(v, ind)]);
    const rowsHtml = rows.map(([l, t]) => `<div class="btc-dd-row"><span>${esc(l)}</span><p>${esc(t)}</p></div>`).join("") +
      (cfg.limit ? `<div class="btc-dd-row btc-dd-limit"><span>ข้อจำกัด</span><p>${esc(cfg.limit)}</p></div>` : "");
    const src = has && M.source
      ? `ที่มา: <b>${esc(M.source)}</b> ${freshBadge(M.freshness)}${M.date ? ` · ${esc(fmtDate(M.date))}` : ""}${M.proxy ? ' · <em>proxy</em>' : ""}`
      : `${freshBadge("missing")} · ยังไม่มีข้อมูลอัตโนมัติ — ดูกราฟที่ BGeometrics`;
    return `<div class="mc-card btc-dd-card${has ? "" : " btc-ind-empty"}">
      <div class="btc-dd-kicker">${esc(cfg.group)}</div>
      <div class="btc-dd-top"><span class="btc-dd-title">${esc(cfg.title)}</span>
        <span class="btc-dd-right"><b class="btc-dd-value">${has ? cfg.fmt(v) : "—"}</b>${tag ? `<span class="btc-dd-tag" style="color:${DD_COL[tag[1]]};border-color:${DD_COL[tag[1]]}">${esc(tag[0])}</span>` : ""}</span></div>
      ${has ? ddGauge(cfg.gauge, v) : ""}
      <div class="btc-dd-rows">${rowsHtml}</div>
      <div class="btc-dd-foot"><a href="${esc(cfg.chart)}" target="_blank" rel="noopener noreferrer">ดูกราฟย้อนหลังเต็มที่ BGeometrics ↗</a><span class="btc-dd-src">${src}</span></div>
    </div>`;
  }

  function onchainDeepDive(ind) {
    // one continuous grid (3 cols on wide screens) — the group name renders as a
    // kicker chip on each card instead of separate half-empty group rows
    const body = `<div class="btc-dd-grid">${DD_CARDS.map((c) => ddCard(c, ind)).join("")}</div>`;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🧬 On-chain Deep Dive</h2><span class="mc-sub">ค่า exact จาก BGeometrics (bitcoin-data.com · ฟรี · อัปเดตรายวัน D-1/D-2) — MVRV-Z · Realized Price · NUPL · SOPR · SSR · LTH Supply</span></div></div>
      ${body}
    </section>`;
  }

  function cyclePanel(ind, bz) {
    // MVRV Z-Score + NUPL moved to the On-chain Deep Dive section (exact values,
    // full explanations) — kept here: the metrics the deep dive does NOT cover.
    const mr = ind.mvrvRatio, pu = ind.puellMultiple;
    const M = ind._meta || {};
    const cards = [
      metricCard("MVRV Ratio", dn(mr) ? num(mr, 2) : "—",
        !dn(mr) ? "na" : mr < 1 ? "under" : mr < 2 ? "fair" : mr < 3.5 ? "expensive" : "over",
        !dn(mr) ? "ยังไม่มีข้อมูล" : mr < 1 ? "< 1 → zone ถูก ซื้อสะสมได้ (นักลงทุนเฉลี่ยขาดทุน)" : mr < 2 ? "ปกติ" : "เริ่มแพงขึ้น", M.mvrvRatio, "mvrvRatio"),
      metricCard("Puell Multiple", dn(pu) ? num(pu, 2) : "—",
        !dn(pu) ? "na" : pu < 0.5 ? "under" : pu < 1.5 ? "fair" : pu < 4 ? "expensive" : "over",
        !dn(pu) ? "ยังไม่มีข้อมูล" : pu < 0.5 ? "รายได้นักขุดต่ำ มัก = bottom" : "ปกติ–สูง", M.puellMultiple, "puellMultiple")
    ];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>Cycle Valuation</h2><span class="mc-sub">มูลค่าตามวัฏจักร on-chain — MVRV-Z / NUPL ดูที่ 🧬 Deep Dive</span></div></div>
      <div class="btc-ind-grid">${cards.join("")}</div>
    </section>`;
  }
  function holderSentimentPanel(ind) {
    // Realized Price + NUPL moved to the On-chain Deep Dive section (exact values).
    const M = ind._meta || {};
    const fg = ind.fearGreed;
    const fgInterp = !dn(fg) ? "ยังไม่มีข้อมูล" : fg < 25 ? "Extreme Fear — โซนซื้อสวนตลาด" : fg < 45 ? "Fear — ตลาดยังกังวล" : fg < 55 ? "Neutral" : fg < 75 ? "Greed — เริ่มร้อน" : "Extreme Greed — ระวัง";
    const cards = [
      metricCard("Fear & Greed", dn(fg) ? String(Math.round(fg)) : "—", !dn(fg) ? "na" : fg < 45 ? "under" : fg < 55 ? "fair" : fg < 75 ? "expensive" : "over", fgInterp, M.fearGreed, "fearGreed"),
      metricCard("STH Realized Price", dn(ind.sthRealizedPrice) ? money(ind.sthRealizedPrice) : "—", !dn(ind.sthRealizedPrice) ? "na" : (dn(ind.price) && ind.price > ind.sthRealizedPrice ? "under" : "expensive"), dn(ind.sthRealizedPrice) ? "ทุนเฉลี่ยผู้ถือสั้น (exact)" : "exact ต้องใช้ Glassnode (เสียเงิน)", M.sthRealizedPrice),
      metricCard("LTH Realized Price", dn(ind.lthRealizedPrice) ? money(ind.lthRealizedPrice) : "—", !dn(ind.lthRealizedPrice) ? "na" : "fair", dn(ind.lthRealizedPrice) ? "ทุนเฉลี่ยผู้ถือยาว (exact)" : "exact ต้องใช้ Glassnode (เสียเงิน)", M.lthRealizedPrice),
      metricCard("STH-SOPR", dn(ind.sthSopr) ? num(ind.sthSopr, 3) : "—", !dn(ind.sthSopr) ? "na" : ind.sthSopr >= 1 ? "under" : "expensive", dn(ind.sthSopr) ? (ind.sthSopr >= 1 ? "≥1 ขายมีกำไร" : "<1 ขายขาดทุน (สะสม)") : "exact ต้องใช้ Glassnode/CryptoQuant", M.sthSopr)
    ];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>พฤติกรรมผู้ถือ / Sentiment</h2><span class="mc-sub">Fear & Greed (ฟรี) · Realized Price / NUPL / SOPR รวมดูที่ 🧬 Deep Dive · STH/LTH exact ต้องใช้ผู้ให้บริการเสียเงิน</span></div></div>
      <div class="btc-ind-grid">${cards.join("")}</div>
    </section>`;
  }
  function gateChip(status) {
    const map = { PASS: ["ผ่าน", "bull"], NEAR: ["ใกล้", "warn"], FAIL: ["ไม่ผ่าน", "bear"], STRONG: ["แรง", "bull"], CONFIRMED: ["ยืนยัน", "bull"], MISSING: ["ไม่มีข้อมูล", "muted"] };
    const m = map[status] || ["—", "muted"];
    return `<span class="btc-gate btc-gate-${m[1]}">${m[0]}</span>`;
  }
  function technicalPanel(ind, bz) {
    let gates = null;
    if (window.Scoring && typeof window.Scoring.calculateTimingScore === "function") {
      try { gates = window.Scoring.calculateTimingScore({ latestPrice: ind.price, latestDate: ind.date, ema12: ind.ema12, ema26: ind.ema26, sma200: ind.sma200, rsi14: ind.rsi14, volumeRatio: ind.volumeRatio5D, emaTrendStatus: ind.emaStatus, sma200Status: ind.sma200Status }).gates; } catch (e) {}
    }
    const row = (label, val, extra) => `<div class="btc-tech-row"><span>${esc(label)}</span><div>${val}${extra ? ` <em>${esc(extra)}</em>` : ""}</div></div>`;
    // price vs SMA50 (client-side, from the same closes the chart uses)
    const hist50 = chartHist(readSnapshot()); const closes50 = (hist50 && Array.isArray(hist50.closes)) ? hist50.closes.map(Number) : [];
    let sma50 = null; if (closes50.length >= 50) { let s = 0; for (let i = closes50.length - 50; i < closes50.length; i++) s += closes50[i]; sma50 = s / 50; }
    const above50 = dn(ind.price) && dn(sma50) ? ind.price >= sma50 : null;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>Technical Timing</h2><span class="mc-sub">EMA12/26 · SMA50/200 · RSI(30/70) · Volume — สัญญาณครบ 6 ตัวดูที่ Intelligence</span></div></div>
      ${row("EMA Gate", gateChip(gates && gates.ema ? gates.ema.status : (bz.emaBull ? "PASS" : "FAIL")), bz.emaBull ? "EMA12 > EMA26" : "EMA12 < EMA26")}
      ${row("SMA50 Gate", gateChip(above50 == null ? "MISSING" : above50 ? "PASS" : "FAIL"), above50 == null ? "" : above50 ? "ราคาเหนือ SMA50" : "ราคาใต้ SMA50")}
      ${row("SMA200 Gate", gateChip(gates && gates.sma200 ? gates.sma200.status : (bz.aboveSma ? "PASS" : "FAIL")), bz.aboveSma ? "ราคาเหนือ SMA200" : "ราคาใต้ SMA200")}
      ${row("RSI14 (30/70)", `<strong>${num(ind.rsi14, 1)}</strong>`, dn(ind.rsi14) ? (ind.rsi14 > 70 ? "ระวัง/ทยอยขาย (>70)" : ind.rsi14 < 30 ? "ซื้อสะสม (<30)" : "ปกติ") : "")}
      ${dn(ind.rsi14) ? zoneBar("rsi14", ind.rsi14) : ""}
      ${row("Volume Ratio 5D", `<strong>${dn(ind.volumeRatio5D) ? ind.volumeRatio5D.toFixed(2) + "x" : "—"}</strong>`, gates && gates.volume ? gates.volume.thaiLabel : "")}
      ${row("Buy Zone Score", `<strong style="color:${bz.color}">${bz.buyZoneScore}/100</strong>`, bz.thaiLabel)}
      ${row("Final BTC Action", `<strong style="color:${toneColor(bz.action.tone)}">${esc(bz.action.thaiAction)}</strong>`, bz.action.action)}
    </section>`;
  }
  function freeStressPanel(ind) {
    const M = ind._meta || {};
    const f = ind.fundingRate, oi = ind.openInterest, tk = ind.takerBuySellRatio, ls = ind.longShortRatio;
    const mm = ind.minerRevenueMultipleProxy, hr = ind.hashRate, df = ind.difficulty; // SSR moved to 🧬 Deep Dive
    const cards = [
      metricCard("Funding Rate (8h)", dn(f) ? f.toFixed(4) + "%" : "—", !dn(f) ? "na" : f <= 0 ? "under" : f < 0.01 ? "fair" : f < 0.05 ? "expensive" : "over", !dn(f) ? "ยังไม่มีข้อมูล" : f <= 0 ? "ติดลบ/เป็นกลาง (ดี — ไม่มี long แออัด)" : f < 0.05 ? "ปกติ" : "สูง ระวัง long squeeze", M.fundingRate, "fundingRate"),
      metricCard("Open Interest", dn(oi) ? moneyShort(oi) : "—", !dn(oi) ? "na" : "fair", dn(oi) ? "มูลค่าสัญญา futures คงค้างรวม" : "ยังไม่มีข้อมูล", M.openInterest),
      metricCard("Taker Buy/Sell", dn(tk) ? tk.toFixed(3) : "—", !dn(tk) ? "na" : tk >= 1 ? "under" : "fair", !dn(tk) ? "ยังไม่มีข้อมูล" : tk >= 1 ? "ผู้ซื้อ market เด่น" : "ผู้ขาย market เด่น", M.takerBuySellRatio),
      metricCard("Long/Short Ratio", dn(ls) ? ls.toFixed(2) : "—", !dn(ls) ? "na" : "fair", !dn(ls) ? "ยังไม่มีข้อมูล" : ls > 2 ? "บัญชี long มากกว่า short" : "ค่อนข้างสมดุล", M.longShortRatio),
      metricCard("Miner Rev Multiple Proxy", dn(mm) ? mm.toFixed(2) : "—", !dn(mm) ? "na" : mm < 0.6 ? "under" : mm < 1.5 ? "fair" : mm < 4 ? "expensive" : "over", !dn(mm) ? "ยังไม่มีข้อมูล" : mm < 0.6 ? "ต่ำ — miner รายได้ต่ำ (มัก bottom)" : mm < 4 ? "ปกติ–สูง" : "สูงมาก (top zone)", M.minerRevenueMultipleProxy, "minerRevenueMultipleProxy"),
      metricCard("Hashrate (TH/s)", dn(hr) ? compact(hr) : "—", !dn(hr) ? "na" : "fair", dn(hr) ? "ความปลอดภัยเครือข่าย" : "ยังไม่มีข้อมูล", M.hashRate),
      metricCard("Difficulty", dn(df) ? compact(df) : "—", !dn(df) ? "na" : "fair", dn(df) ? "ความยากในการขุด" : "ยังไม่มีข้อมูล", M.difficulty)
    ];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>ความเสี่ยงตลาดจากข้อมูลฟรี</h2><span class="mc-sub">Binance Futures · Blockchain.com — funding · OI · taker · miner proxy · network (SSR ดูที่ 🧬 Deep Dive)</span></div></div>
      <div class="btc-ind-grid">${cards.join("")}</div>
    </section>`;
  }
  function paidNote() {
    return `<section class="mc-card mc-panel mc-fade btc-paidnote">
      <p>ℹ️ <b>ข้อมูล STH / LTH / SOPR แบบแท้ (exact)</b> ต้องใช้ผู้ให้บริการ on-chain แบบเสียเงิน (Glassnode / CryptoQuant) — หน้านี้ใช้ <b>proxy จากข้อมูลฟรี</b> แทน (Coin Metrics, Blockchain.com, DefiLlama, Alternative.me) จึงไม่ปล่อยให้การ์ดว่าง
      <span class="mc-sub">STH/LTH/SOPR exact metrics require paid on-chain providers. This dashboard uses free proxy metrics instead.</span></p>
    </section>`;
  }
  function explainSection() {
    return `<details class="mc-card mc-panel mc-fade btc-explain">
      <summary><h2 style="display:inline">📖 อธิบาย Indicators (สำหรับมือใหม่)</h2></summary>
      <div class="btc-explain-grid">${EXPLAIN.map(([t, d]) => `<div class="btc-explain-item"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("")}</div>
    </details>`;
  }
  function importSection() {
    const oc = readOnchain();
    const v = oc.values || {};
    const grp = (g, title) => `<div class="btc-imp-group"><h4>${esc(title)}</h4><div class="btc-imp-fields">${ONCHAIN_FIELDS.filter((f) => f.group === g).map((f) =>
      `<label class="btc-imp-field"><span>${esc(f.label)}</span><input type="number" step="${f.step}" data-oc="${f.key}" value="${v[f.key] != null ? esc(v[f.key]) : ""}" placeholder="—" /></label>`).join("")}</div></div>`;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>Data Source / Import</h2><span class="mc-sub">ดึงข้อมูลออนไลน์อัตโนมัติ — ไม่ต้องใช้ CSV สำหรับ MVRV/NUPL แล้ว · CSV/กรอกเองเป็น fallback</span></div>
        <span class="btc-last">${oc.lastImported ? "นำเข้า CSV/manual ล่าสุด: " + new Date(oc.lastImported).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่ได้นำเข้า CSV/manual"}</span></div>
      <p class="btc-note"><b>อัตโนมัติ:</b> ราคา/เทคนิคจาก <b>Binance</b> (near real-time) · MVRV Ratio + MVRV Z-Score + NUPL จาก <b>Coin Metrics Community</b> (รายวัน D-1/D-2, ไม่ต้องใช้ key) · ถ้าตั้ง <code>GLASSNODE_API_KEY</code>/<code>CRYPTOQUANT_API_KEY</code> ฝั่งเซิร์ฟเวอร์ จะได้ Puell, STH/LTH Realized, SOPR, OI, funding เพิ่ม (ไม่เก็บใน frontend) · metric ที่ยังดึงไม่ได้จะมีปุ่ม "ดูกราฟอ้างอิงภายนอก" ให้ · กรอก/อัปโหลด CSV ด้านล่างเป็น fallback ได้</p>
      <div class="btc-imp-csv">
        <label class="mc-btn" style="cursor:pointer;">📄 อัปโหลด CSV<input type="file" id="btcCsv" accept=".csv,text/csv" style="display:none;" /></label>
        <span id="btcCsvMsg" class="mc-sub"></span>
      </div>
      ${grp("cycle", "Cycle Valuation")}
      ${grp("holder", "Holder Behavior")}
      ${grp("stress", "Market Stress / Derivatives")}
      <div class="btc-imp-actions">
        <button class="mc-btn mc-btn-primary" id="btcSave" type="button">บันทึก</button>
        <button class="mc-btn" id="btcClear" type="button">ล้างข้อมูล on-chain</button>
      </div>
    </section>`;
  }

  function emptyNoSnapshot() {
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:40px 22px;">
      <div style="font-size:42px;">₿</div><h2 style="margin:12px 0 6px;">กรุณาโหลดข้อมูลล่าสุดก่อน</h2>
      <p style="color:var(--mc-muted);max-width:560px;margin:0 auto 18px;">Bitcoin Monitor ใช้ข้อมูลจาก Data Snapshot — กดเพื่อโหลดราคา BTC ล่าสุด</p>
      <button class="mc-btn mc-btn-primary" id="btcLoad" type="button" style="padding:10px 22px;">Load Latest Data</button>
    </section>`;
  }
  function emptyNoBtc() {
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:40px 22px;">
      <div style="font-size:42px;">₿</div><h2 style="margin:12px 0 6px;">ยังไม่พบข้อมูลราคา Bitcoin</h2>
      <p style="color:var(--mc-muted);max-width:560px;margin:0 auto 18px;">กด Load Latest Data เพื่อดึงราคา BTC-USD (ระบบเพิ่ม BTC เข้ารายการที่โหลดอัตโนมัติแล้ว)</p>
      <button class="mc-btn mc-btn-primary" id="btcLoad" type="button" style="padding:10px 22px;">Load Latest Data</button>
    </section>`;
  }

  // ---------------------------------------------------------------- CSV
  function parseCSV(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
    if (!lines.length) return { headers: [], rows: [] };
    const split = (l) => l.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
  }
  function autoMapCSV(parsed) {
    if (!parsed.rows.length) return {};
    const last = parsed.rows[parsed.rows.length - 1];
    const findVal = (re, notRe) => { for (let i = 0; i < parsed.headers.length; i++) { const h = parsed.headers[i]; if (re.test(h) && (!notRe || !notRe.test(h))) { const n = fin(last[i]); if (n != null) return n; } } return null; };
    return {
      mvrvZScore: findVal(/mvrv.*z.?score|mvrv.*zscore|\bz.?score\b/i), mvrvRatio: findVal(/mvrv/i, /z.?score|zscore/i), nupl: findVal(/nupl/i), puellMultiple: findVal(/puell/i),
      sthRealizedPrice: findVal(/(sth|short).*realiz/i), lthRealizedPrice: findVal(/(lth|long).*realiz/i),
      sthSopr: findVal(/(sth|short).*sopr/i), lthSopr: findVal(/(lth|long).*sopr/i),
      fundingRate: findVal(/fund/i), openInterest: findVal(/open.*interest|\boi\b/i), exchangeNetflow: findVal(/net.?flow/i),
      stablecoinReserve: findVal(/stable.*reserve/i), ssr: findVal(/\bssr\b|supply.*ratio/i)
    };
  }

  // ---------------------------------------------------------------- wire
  async function loadLatest(btn) {
    const api = window.PortfolioDataSnapshot;
    if (!api || typeof api.loadLatestData !== "function") return;
    if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }
    try { await api.loadLatestData(); } catch (e) {}
    finally { if (btn) { btn.disabled = false; btn.textContent = "Load Latest Data"; } render(); }
  }
  function collectInputs() {
    const values = {};
    root.querySelectorAll("[data-oc]").forEach((el) => { const n = fin(el.value); if (n != null) values[el.getAttribute("data-oc")] = n; });
    return values;
  }
  function wire() {
    const tabsEl = document.getElementById("btcTabs");
    if (tabsEl) tabsEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      if (b.dataset.tab !== activeTab) { activeTab = b.dataset.tab; render(); }
    });
    const rangeBox = document.getElementById("btcRange");
    if (rangeBox) rangeBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-range]"); if (!b) return;
      range = b.dataset.range;
      rangeBox.querySelectorAll("button").forEach((x) => x.classList.toggle("is-active", x === b));
      const chart = document.getElementById("btcChart");
      if (chart) { const snap = readSnapshot(); chart.innerHTML = drawChart(chartHist(snap), buildIndicators(snap)); }
    });
    const refresh = document.getElementById("btcRefresh"); if (refresh) refresh.addEventListener("click", () => fetchApi());
    const load = document.getElementById("btcLoad"); if (load) load.addEventListener("click", () => loadLatest(load));
    const save = document.getElementById("btcSave"); if (save) save.addEventListener("click", () => { writeOnchain({ values: collectInputs(), lastImported: new Date().toISOString() }); render(); });
    const clear = document.getElementById("btcClear"); if (clear) clear.addEventListener("click", () => { if (window.confirm("ล้างข้อมูล on-chain ที่นำเข้าทั้งหมด?")) { writeOnchain({ values: {}, lastImported: null }); render(); } });
    const csv = document.getElementById("btcCsv");
    if (csv) csv.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const mapped = autoMapCSV(parseCSV(String(reader.result || "")));
          let filled = 0;
          Object.keys(mapped).forEach((k) => { if (mapped[k] != null) { const inp = root.querySelector(`[data-oc="${k}"]`); if (inp) { inp.value = mapped[k]; filled++; } } });
          const msg = document.getElementById("btcCsvMsg");
          if (msg) msg.textContent = filled ? `จับคู่ได้ ${filled} ค่า — ตรวจแล้วกด "บันทึก"` : "จับคู่คอลัมน์ไม่ได้ ลองกรอกเอง";
        } catch (err) { const msg = document.getElementById("btcCsvMsg"); if (msg) msg.textContent = "อ่าน CSV ไม่สำเร็จ"; }
      };
      reader.readAsText(file);
    });
  }

  // ---------------------------------------------------------------- live fetch
  async function fetchApi() {
    if (apiState === "loading") return;
    apiState = "loading"; apiError = null;
    render(); // reflect the loading state (chips + disabled button) right away
    try {
      const res = await fetch("/api/bitcoin", { headers: { "accept": "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || (!data.latest && !data.history)) throw new Error("empty response");
      apiData = data; apiState = "ready"; writeApiCache(data);
      // provider-level errors (e.g. missing API key) are surfaced per-chip, not as a top-level failure
    } catch (e) {
      apiState = "error"; apiError = String(e && e.message ? e.message : e);
    }
    render();
  }

  window.addEventListener("portfolio-data-snapshot", render);
  window.addEventListener("btc-onchain-live", render);
  function init() {
    apiData = readApiCache();
    render();
    fetchApi();
    // BGeometrics exact on-chain metrics (browser-side, day-cached, 10 req/hr free tier)
    if (window.BtcOnchainLive) window.BtcOnchainLive.load(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
