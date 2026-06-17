(function () {
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const RSI_PERIOD = 14;
  const FRESH_BARS = 3;
  const NEAR_EMA_GAP = 0.01;
  const NEAR_SMA_DISTANCE = 0.015;
  const seed = window.AIBoomUniverseSeed || { ai_boom_universe: [] };
  const scoring = window.AIBoomScoring || { enrichAsset: (asset) => asset };
  const technical = window.AITechnicalIndicators;
  const priceCache = new Map();
  const LEGACY_HIDDEN_IDS = new Set(["ai-scb-global-tech-fund", "ai-kkp-g-tech-fund", "ai-b-innotech-fund"]);

  const THAI_MUTUAL_FUND_ALIASES = {
    "K-GTECHRMF": "K-GTECHRMF",
    KGTECHRMF: "K-GTECHRMF",
    "KUSXNDQRMF": "K-USXNDQRMF",
    "K-USXNDQRMF": "K-USXNDQRMF"
  };
  const THAI_INDEX_ALIASES = {
    SET: "^SET.BK",
    "SET.BK": "^SET.BK",
    "^SET.BK": "^SET.BK",
    SETINDEX: "^SET.BK",
    SET50: "^SET50.BK",
    "SET50.BK": "^SET50.BK",
    "^SET50.BK": "^SET50.BK",
    SET50INDEX: "^SET50.BK",
    SET100: "^SET100.BK",
    "SET100.BK": "^SET100.BK",
    "^SET100.BK": "^SET100.BK",
    SET100INDEX: "^SET100.BK"
  };
  const THAI_INDEX_METADATA = {
    "^SET.BK": { displaySymbol: "SET", displayName: "SET Index" },
    "^SET50.BK": { displaySymbol: "SET50", displayName: "SET50 Index" },
    "^SET100.BK": { displaySymbol: "SET100", displayName: "SET100 Index" }
  };
  const US_INDEX_ALIASES = {
    SPX: "^GSPC",
    GSPC: "^GSPC",
    "^GSPC": "^GSPC",
    IXIC: "^IXIC",
    "^IXIC": "^IXIC",
    NDX: "^NDX",
    "^NDX": "^NDX"
  };
  const THAI_STOCK_ALIASES = {
    GULF: "GULF.BK",
    GULFBK: "GULF.BK",
    "GULF.BK": "GULF.BK"
  };
  const YAHOO_SYMBOLS = {
    BTC: "BTC-USD",
    BTCUSD: "BTC-USD",
    "BTC-USD": "BTC-USD",
    XBTUSD: "BTC-USD",
    ETHUSD: "ETH-USD",
    NVDA: "NVDA",
    AMD: "AMD",
    MSFT: "MSFT",
    AMZN: "AMZN",
    GOOG: "GOOG",
    QQQM: "QQQM",
    SPY: "SPY"
  };
  const DISPLAY_NAME_OVERRIDES = {
    BTC: "Bitcoin",
    BTCUSD: "Bitcoin",
    "BTC-USD": "Bitcoin",
    QQQM: "Invesco NASDAQ 100 ETF",
    SPY: "SPDR S&P 500 ETF Trust",
    "^GSPC": "S&P 500 Index",
    "^IXIC": "NASDAQ Composite Index",
    "^NDX": "NASDAQ 100 Index"
  };

  const ACTIONS = [
    {
      key: "buy_now",
      title: "Buy Now",
      thai: "ซื้อได้ทันที",
      description: "RSI เป็นสัญญาณซื้อ และ Market Risk ยังไม่สูง",
      empty: "ยังไม่มีรายการ Buy Now",
      tone: "tone-buy",
      summaryTone: "summary-buy"
    },
    {
      key: "watch_buy",
      title: "Watch Buy",
      thai: "เฝ้าระวังซื้อ",
      description: "RSI เข้า Watch Buy หรือสินทรัพย์อยู่ใน Bullish Watchlist",
      empty: "ยังไม่มีรายการ Watch Buy",
      tone: "tone-watch-buy",
      summaryTone: "summary-watch-buy"
    },
    {
      key: "hold",
      title: "Hold",
      thai: "ถือ",
      description: "แนวโน้มหลักยังเป็นขาขึ้น แต่ยังไม่ใช่จุดไล่ซื้อ",
      empty: "ยังไม่มีรายการ Hold",
      tone: "tone-hold",
      summaryTone: "summary-hold"
    },
    {
      key: "watch_sell",
      title: "Watch Sell",
      thai: "เฝ้าระวังขาย",
      description: "RSI เข้า Watch Sell หรือสินทรัพย์อยู่ใน Bearish Watchlist",
      empty: "ยังไม่มีรายการ Watch Sell",
      tone: "tone-watch-sell",
      summaryTone: "summary-watch-sell"
    },
    {
      key: "sell_reduce",
      title: "Sell / Reduce Risk",
      thai: "ขาย / ลดความเสี่ยง",
      description: "RSI เป็น Sell Signal หรือเกิด New Bearish Signal",
      empty: "ยังไม่มีรายการ Sell / Reduce Risk",
      tone: "tone-sell",
      summaryTone: "summary-sell"
    },
    {
      key: "no_action",
      title: "No Action",
      thai: "ยังไม่ต้องทำอะไร",
      description: "สัญญาณยังไม่ชัดเจน หรือยังไม่เข้าเงื่อนไข action",
      empty: "ยังไม่มีรายการ No Action",
      tone: "tone-neutral",
      summaryTone: "summary-neutral"
    },
    {
      key: "insufficient",
      title: "Insufficient Data",
      thai: "ข้อมูลไม่พอ",
      description: "ข้อมูลราคาหรือข้อมูลย้อนหลังยังไม่พอสำหรับสรุป action",
      empty: "ไม่มีรายการที่ข้อมูลไม่พอ",
      tone: "tone-insufficient",
      summaryTone: "summary-insufficient"
    }
  ];

  const actionStatus = document.querySelector("#actionStatus");
  const marketRiskText = document.querySelector("#marketRiskText");
  const summaryRoot = document.querySelector("#actionSummaryCards");
  const conflictsRoot = document.querySelector("#signalConflicts");
  const portfolioPriorityRoot = document.querySelector("#portfolioPrioritySections");
  const sectionsRoot = document.querySelector("#actionSections");
  const refreshButton = document.querySelector("#refreshActionButton");
  const scopeTabs = document.querySelector("#actionScopeTabs");

  let persistedState = { userAssets: [], removedIds: [] };
  let assets = [];
  let marketRisk = null;
  let holdings = [];
  let allRows = [];
  let activeScope = "portfolio";

  function normalizeTicker(rawTicker) {
    return String(rawTicker || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  }

  function canonicalSymbolFromTicker(rawTicker) {
    const normalized = normalizeTicker(rawTicker);
    const compact = normalized.replace(/[^A-Z0-9]/g, "");
    return (
      THAI_INDEX_ALIASES[normalized] ||
      THAI_INDEX_ALIASES[compact] ||
      US_INDEX_ALIASES[normalized] ||
      US_INDEX_ALIASES[compact] ||
      THAI_MUTUAL_FUND_ALIASES[normalized] ||
      THAI_MUTUAL_FUND_ALIASES[compact] ||
      THAI_STOCK_ALIASES[normalized] ||
      THAI_STOCK_ALIASES[compact] ||
      normalized
    );
  }

  function readJsonArray(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (_error) {
      return [];
    }
  }

  function sanitizePersistedState(data) {
    const safe = data && typeof data === "object" ? data : {};
    const seen = new Set();
    const userAssets = (Array.isArray(safe.userAssets) ? safe.userAssets : []).filter((asset) => {
      const symbol = canonicalSymbolFromTicker(asset?.ticker);
      if (!symbol || seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    });
    return {
      userAssets,
      removedIds: Array.isArray(safe.removedIds) ? safe.removedIds : []
    };
  }

  async function loadPersistedState() {
    try {
      const response = await fetch("/api/ai-universe", { cache: "no-store" });
      if (!response.ok) throw new Error("state request failed");
      const payload = await response.json();
      persistedState = sanitizePersistedState(payload?.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState.userAssets));
      localStorage.setItem(REMOVED_KEY, JSON.stringify(persistedState.removedIds));
    } catch (_error) {
      persistedState = sanitizePersistedState({
        userAssets: readJsonArray(STORAGE_KEY),
        removedIds: readJsonArray(REMOVED_KEY)
      });
    }
  }

  function dedupeAssetsByCanonicalTicker(list) {
    const seen = new Set();
    const result = [];
    for (const asset of list) {
      const key = canonicalSymbolFromTicker(asset?.ticker);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({ ...asset, ticker: key });
    }
    return result;
  }

  function resetAssets() {
    const removedIds = new Set(persistedState.removedIds || []);
    assets = dedupeAssetsByCanonicalTicker([
      ...seed.ai_boom_universe
        .filter((asset) => !removedIds.has(asset.id))
        .filter((asset) => !LEGACY_HIDDEN_IDS.has(asset.id))
        .map((asset) => scoring.enrichAsset(asset)),
      ...(persistedState.userAssets || []).map((asset) => scoring.enrichAsset(asset))
    ]);
  }

  function getYahooSymbol(asset) {
    const canonicalTicker = canonicalSymbolFromTicker(asset?.ticker || "");
    const compactTicker = canonicalTicker.replace(/[^A-Z0-9]/g, "");
    if (THAI_INDEX_METADATA[canonicalTicker]) return canonicalTicker;
    if (asset?.asset_type === "THAI_MUTUAL_FUND") {
      return THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker] || canonicalTicker;
    }
    if (canonicalTicker.endsWith(".BK")) return canonicalTicker;
    if (canonicalTicker.startsWith("^")) return canonicalTicker;
    if (THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker]) {
      return THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker];
    }
    if (YAHOO_SYMBOLS[canonicalTicker]) return YAHOO_SYMBOLS[canonicalTicker];
    if (YAHOO_SYMBOLS[compactTicker]) return YAHOO_SYMBOLS[compactTicker];
    if (asset?.asset_type === "crypto" && (compactTicker === "BTC" || compactTicker === "BTCUSD")) return "BTC-USD";
    if (asset?.asset_type === "crypto" && compactTicker === "ETHUSD") return "ETH-USD";
    if (/(^|_)(RMF|SSF)($|_)/.test(compactTicker) || compactTicker.includes("RMF") || compactTicker.includes("SSF")) return canonicalTicker;
    if (canonicalTicker === "SCBNDQ" || canonicalTicker === "KKP_NDQ") return "^NDX";
    if (canonicalTicker === "SCB_GLOBAL_TECH" || canonicalTicker === "KKP_G_TECH" || canonicalTicker === "B_INNOTECH" || canonicalTicker === "ONE_UGG_RA") return "XLK";
    if (asset?.asset_type === "THAI_STOCK") return canonicalTicker.endsWith(".BK") ? canonicalTicker : `${canonicalTicker}.BK`;
    if (asset?.asset_type === "INDEX") return canonicalTicker.startsWith("^") ? canonicalTicker : `^${canonicalTicker}`;
    if (asset?.asset_type === "stock" || asset?.asset_type === "etf") return canonicalTicker;
    return canonicalTicker;
  }

  async function fetchMarketRisk() {
    try {
      const response = await fetch("/api/market-risk", { cache: "no-store" });
      if (!response.ok) throw new Error("market risk request failed");
      const payload = await response.json();
      marketRisk = payload?.risk || null;
    } catch (_error) {
      marketRisk = null;
    }
    return marketRisk;
  }

  async function fetchPriceHistory(asset, options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const symbol = getYahooSymbol(asset);
    if (!symbol) return emptyMarketData("", "No market data source");
    const cacheKey = `${symbol}:${asset.id || asset.ticker}`;
    if (!forceRefresh && priceCache.has(cacheKey)) return priceCache.get(cacheKey);
    try {
      const response = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}${forceRefresh ? "&refresh=1" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load market data");
      const payload = await response.json();
      const rows = [];
      const dates = Array.isArray(payload.dates) ? payload.dates : [];
      const closes = Array.isArray(payload.closes) ? payload.closes : [];
      for (let index = 0; index < Math.min(dates.length, closes.length); index += 1) {
        const date = String(dates[index] || "");
        const close = Number(closes[index]);
        if (!date || !Number.isFinite(close)) continue;
        rows.push({ date, close });
      }
      rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const result = {
        marketSymbol: symbol,
        source: payload.source || "",
        sourceType: payload.sourceType || "",
        provider: payload.provider || "",
        assetType: payload.assetType || "",
        fundName: payload.fundName || "",
        dates: rows.map((row) => row.date),
        closes: rows.map((row) => row.close),
        latestClose: rows.length ? rows[rows.length - 1].close : null,
        latestDate: rows.length ? rows[rows.length - 1].date : null,
        historyCount: rows.length
      };
      priceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      return emptyMarketData(symbol, error?.message || "Unable to load market data");
    }
  }

  function emptyMarketData(symbol, source) {
    return {
      marketSymbol: symbol,
      source,
      sourceType: "ERROR",
      provider: "",
      assetType: "",
      fundName: "",
      dates: [],
      closes: [],
      latestClose: null,
      latestDate: null,
      historyCount: 0
    };
  }

  function calculateRSI(closes, dates, period = RSI_PERIOD) {
    const clean = [];
    const cleanDates = [];
    for (let index = 0; index < closes.length; index += 1) {
      const close = Number(closes[index]);
      if (!Number.isFinite(close)) continue;
      clean.push(close);
      cleanDates.push(dates[index] || null);
    }
    if (clean.length < period + 1) {
      return {
        rsi: null,
        period,
        latestDate: cleanDates.length ? cleanDates[cleanDates.length - 1] : null,
        enoughData: false
      };
    }

    let gainSum = 0;
    let lossSum = 0;
    for (let index = 1; index <= period; index += 1) {
      const change = clean[index] - clean[index - 1];
      if (change >= 0) gainSum += change;
      else lossSum += Math.abs(change);
    }

    let averageGain = gainSum / period;
    let averageLoss = lossSum / period;
    for (let index = period + 1; index < clean.length; index += 1) {
      const change = clean[index] - clean[index - 1];
      averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
      averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    }

    let rsi = 50;
    if (averageLoss === 0 && averageGain > 0) rsi = 100;
    else if (averageGain === 0 && averageLoss > 0) rsi = 0;
    else if (averageLoss > 0) {
      const relativeStrength = averageGain / averageLoss;
      rsi = 100 - (100 / (1 + relativeStrength));
    }
    return { rsi, period, latestDate: cleanDates[cleanDates.length - 1] || null, enoughData: true };
  }

  function classifyRsi(rsiResult) {
    const rsi = rsiResult.rsi;
    if (!rsiResult.enoughData || !Number.isFinite(rsi)) {
      return {
        key: "insufficient",
        label: "Insufficient RSI Data",
        thai: "ข้อมูลไม่พอสำหรับ RSI14",
        reason: "ข้อมูลไม่พอสำหรับคำนวณ RSI14",
        tone: "badge-insufficient"
      };
    }
    if (rsi >= 70) {
      return { key: "sell_signal", label: "Sell Signal", thai: "สัญญาณขาย", reason: "RSI แตะหรือสูงกว่า 70", tone: "badge-sell" };
    }
    if (rsi <= 30) {
      return { key: "buy_signal", label: "Buy Signal", thai: "สัญญาณซื้อ", reason: "RSI แตะหรือต่ำกว่า 30", tone: "badge-buy" };
    }
    if (rsi >= 67 && rsi <= 69) {
      return { key: "watch_sell", label: "Watch Sell", thai: "เฝ้าระวังขาย", reason: "RSI ขึ้นใกล้เขต overbought", tone: "badge-watch-sell" };
    }
    if (rsi >= 31 && rsi <= 35) {
      return { key: "watch_buy", label: "Watch Buy", thai: "เฝ้าระวังซื้อ", reason: "RSI ลงมาใกล้เขต oversold", tone: "badge-watch-buy" };
    }
    return { key: "neutral", label: "Neutral RSI", thai: "RSI เป็นกลาง", reason: "RSI ยังไม่เข้าเขตซื้อหรือขาย", tone: "badge-neutral" };
  }

  function calculateTechnical(symbol, closes, dates) {
    if (!technical) {
      return {
        symbol,
        latestClose: closes.length ? closes[closes.length - 1] : null,
        latestDate: dates.length ? dates[dates.length - 1] : null,
        ema: { ema12: null, ema26: null, signal: "INSUFFICIENT_DATA", trend: "UNKNOWN", signalDate: null, recentCrossover: null },
        sma200: { sma200: null, signal: "INSUFFICIENT_DATA", status: "UNKNOWN", signalDate: null, recentCrossover: null }
      };
    }
    return technical.calculateTechnicalSignalsForAsset({ symbol, closes, dates });
  }

  function buildTrend(asset, marketData) {
    const info = calculateTechnical(asset.ticker, marketData.closes || [], marketData.dates || []);
    const latestClose = Number(info.latestClose);
    const hasLatestPrice = Number.isFinite(latestClose) && Boolean(info.latestDate);
    const ema12 = Number(info.ema.ema12);
    const ema26 = Number(info.ema.ema26);
    const sma200 = Number(info.sma200.sma200);
    const emaReady = Number.isFinite(ema12) && Number.isFinite(ema26);
    const smaReady = Number.isFinite(sma200);
    const emaBull = info.ema.trend === "BULLISH";
    const emaBear = info.ema.trend === "BEARISH";
    const smaAbove = info.sma200.status === "ABOVE_SMA200";
    const smaBelow = info.sma200.status === "BELOW_SMA200";
    const emaGapRatio = emaReady && ema26 !== 0 ? Math.abs((ema12 - ema26) / ema26) : null;
    const smaDistanceRatio = hasLatestPrice && smaReady && sma200 !== 0 ? Math.abs((latestClose - sma200) / sma200) : null;
    const freshBull = isFresh(info.ema.recentCrossover, "BUY") || isFresh(info.sma200.recentCrossover, "BULLISH_BREAKOUT");
    const freshBear = isFresh(info.ema.recentCrossover, "SELL") || isFresh(info.sma200.recentCrossover, "BEARISH_BREAKDOWN");
    const nearBull = (emaBear && Number.isFinite(emaGapRatio) && emaGapRatio <= NEAR_EMA_GAP) || (smaBelow && Number.isFinite(smaDistanceRatio) && smaDistanceRatio <= NEAR_SMA_DISTANCE);
    const nearBear = (emaBull && Number.isFinite(emaGapRatio) && emaGapRatio <= NEAR_EMA_GAP) || (smaAbove && Number.isFinite(smaDistanceRatio) && smaDistanceRatio <= NEAR_SMA_DISTANCE);
    const earlyBull = (emaBull && !smaAbove) || (smaAbove && !emaBull);
    const earlyBear = (emaBear && !smaBelow) || (smaBelow && !emaBear);
    const bullishCount = (emaBull ? 1 : 0) + (smaAbove ? 1 : 0);
    const bearishCount = (emaBear ? 1 : 0) + (smaBelow ? 1 : 0);

    let key = "neutral";
    let label = "Neutral / Sideway";
    let setup = "Mixed Signal";
    if (!emaReady && !smaReady) {
      key = hasLatestPrice ? "waiting_technical" : "insufficient";
      label = hasLatestPrice ? "Latest Price/NAV Available" : "Insufficient Data";
      setup = hasLatestPrice ? "ข้อมูลย้อนหลังยังไม่พอ" : "ข้อมูลไม่พอ";
    } else if (freshBear) {
      key = "new_bearish";
      label = "New Bearish Signal";
      setup = info.ema.recentCrossover?.signal === "SELL" ? "EMA Cross Down" : "SMA200 Breakdown";
    } else if (freshBull) {
      key = "new_bullish";
      label = "New Bullish Signal";
      setup = info.ema.recentCrossover?.signal === "BUY" ? "EMA Cross Up" : "SMA200 Reclaim";
    } else if (bullishCount > 0 && bearishCount === 0) {
      key = "ongoing_bullish";
      label = "Ongoing Bullish Trend";
      setup = emaBull && smaAbove ? "Strong Bullish Trend" : "Bullish Trend";
    } else if (bearishCount > 0 && bullishCount === 0) {
      key = "ongoing_bearish";
      label = "Ongoing Bearish Trend";
      setup = emaBear && smaBelow ? "Strong Bearish Trend" : "Bearish Trend";
    } else if (nearBull || earlyBull) {
      key = "bullish_watch";
      label = "Bullish Watchlist";
      setup = earlyBull ? "Early Bullish Setup" : "Near Bullish Trigger";
    } else if (nearBear || earlyBear) {
      key = "bearish_watch";
      label = "Bearish Watchlist";
      setup = earlyBear ? "Early Bearish Risk" : "Near Bearish Trigger";
    }

    return {
      key,
      label,
      setup,
      info,
      emaStatus: emaReady ? (emaBull ? "EMA Bullish" : emaBear ? "EMA Bearish" : "EMA Neutral") : "EMA Not Available",
      smaStatus: smaReady ? (smaAbove ? "Above SMA200" : smaBelow ? "Below SMA200" : "At SMA200") : "SMA200 Not Available"
    };
  }

  function isFresh(event, signal) {
    return event?.signal === signal && Number.isFinite(event.barsAgo) && event.barsAgo >= 0 && event.barsAgo <= FRESH_BARS;
  }

  function decideAction(row) {
    const riskLabel = marketRisk?.level?.label || "Unknown";
    const highRisk = riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk";
    const rsiKey = row.rsiClass.key;
    const trendKey = row.trend.key;
    let key = "no_action";
    let adjustment = "";
    let actionLabel = "";

    if (rsiKey === "buy_signal" && (trendKey === "new_bearish" || trendKey === "ongoing_bearish")) {
      key = "watch_buy";
      adjustment = "RSI เป็น Buy Signal แต่ trend ยังเสี่ยง จึงมองเป็นจังหวะเด้งสั้นมากกว่าซื้อเต็ม";
      actionLabel = "Watch Buy / Short rebound only";
    } else if (rsiKey === "sell_signal" || trendKey === "new_bearish") {
      key = "sell_reduce";
      actionLabel = "Sell / Reduce Risk";
    } else if (trendKey === "ongoing_bullish" && rsiKey === "watch_sell") {
      key = "hold";
      actionLabel = "Hold / Do not chase";
      adjustment = riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk"
        ? `Market Risk อยู่ระดับ ${riskLabel} จึงไม่ควรไล่ราคา`
        : "RSI เริ่มสูง จึงควรรอจังหวะย่อแทนการไล่ราคา";
    } else if (rsiKey === "watch_sell" || trendKey === "bearish_watch") {
      key = "watch_sell";
      actionLabel = "Watch Sell";
    } else if (rsiKey === "buy_signal") {
      if (highRisk) {
        key = "watch_buy";
        adjustment = `Market Risk อยู่ระดับ ${riskLabel} จึงลด Buy Now เป็น Watch Buy`;
        actionLabel = "Watch Buy";
      } else {
        key = "buy_now";
        actionLabel = "Buy Now";
      }
    } else if (rsiKey === "watch_buy" || trendKey === "bullish_watch") {
      key = "watch_buy";
      actionLabel = "Watch Buy";
    } else if (trendKey === "ongoing_bullish" && rsiKey === "neutral") {
      key = "hold";
      actionLabel = "Hold";
    } else if (rsiKey === "insufficient" && (trendKey === "insufficient" || trendKey === "waiting_technical")) {
      key = "insufficient";
      actionLabel = "Insufficient Data";
    } else {
      actionLabel = ACTIONS.find((action) => action.key === key)?.title || "No Action";
    }

    return {
      key,
      adjustment,
      explanation: explanationForAction(key, row, adjustment),
      actionLabel
    };
  }

  function explanationForAction(key, row, adjustment) {
    if (adjustment && adjustment.includes("trend ยังเสี่ยง")) return "RSI เข้าเขตซื้อ แต่ trend ยังเป็นลบ จึงเหมาะกับการเฝ้าดูเด้งสั้นมากกว่าซื้อเต็ม";
    if (adjustment && adjustment.includes("Market Risk")) return "มีสัญญาณซื้อ แต่สภาพตลาดเสี่ยงสูงขึ้น จึงควรรอจังหวะยืนยันก่อน";
    if (adjustment && adjustment.includes("RSI เริ่มสูง")) return "ราคายังอยู่ในขาขึ้น แต่ RSI เริ่มสูง จึงควรถือและไม่ไล่ราคา";
    if (adjustment) return adjustment;
    switch (key) {
      case "buy_now":
        return "RSI เข้าเขตซื้อ และภาพรวมความเสี่ยงตลาดยังไม่สูง";
      case "watch_buy":
        return "เริ่มมีเงื่อนไขฝั่งซื้อ แต่ยังควรรอ confirmation หรือจังหวะย่อ";
      case "hold":
        if (row.rsiClass.key === "watch_sell") return "ราคายังอยู่ในขาขึ้น แต่ RSI เริ่มสูง จึงควรถือและไม่ไล่ราคา";
        return "แนวโน้มหลักยังเป็นขาขึ้น และ RSI ยังไม่ร้อนเกินไป";
      case "watch_sell":
        return "เริ่มมีสัญญาณให้ระวังฝั่งขายหรือการอ่อนแรงของ trend";
      case "sell_reduce":
        return "มีสัญญาณขายหรือสัญญาณลบใหม่ ควรลดความเสี่ยงก่อน";
      case "insufficient":
        return "ข้อมูลยังไม่พอสำหรับสรุป action ที่น่าเชื่อถือ";
      default:
        return "ยังไม่มีสัญญาณที่ต้องลงมือชัดเจน";
    }
  }

  async function analyzeAsset(asset, forceRefresh) {
    const marketData = await fetchPriceHistory(asset, { forceRefresh });
    const rsi = calculateRSI(marketData.closes || [], marketData.dates || [], RSI_PERIOD);
    const rsiClass = classifyRsi(rsi);
    const trend = buildTrend(asset, marketData);
    const base = {
      asset,
      marketData,
      rsi,
      rsiClass,
      trend,
      symbol: displaySymbolForAsset(asset),
      name: displayNameForAsset(asset, marketData)
    };
    const action = decideAction(base);
    return { ...base, action };
  }

  function displaySymbolForAsset(asset) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    if (THAI_INDEX_METADATA[canonical]) return THAI_INDEX_METADATA[canonical].displaySymbol;
    if (asset?.asset_type === "THAI_STOCK" && canonical.endsWith(".BK")) return canonical.slice(0, -3);
    if (canonical === "BTC-USD") return "BTCUSD";
    return canonical || String(asset?.ticker || "");
  }

  function displayNameForAsset(asset, marketData) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    const compact = canonical.replace(/[^A-Z0-9]/g, "");
    if (marketData?.fundName) return marketData.fundName;
    if (THAI_INDEX_METADATA[canonical]) return THAI_INDEX_METADATA[canonical].displayName;
    if (DISPLAY_NAME_OVERRIDES[canonical]) return DISPLAY_NAME_OVERRIDES[canonical];
    if (DISPLAY_NAME_OVERRIDES[compact]) return DISPLAY_NAME_OVERRIDES[compact];
    const name = String(asset?.name || "").trim();
    if (name && !/placeholder$/i.test(name)) return name;
    return canonical || "";
  }

  function groupRows(rows) {
    const grouped = {};
    for (const action of ACTIONS) grouped[action.key] = [];
    for (const row of rows) grouped[row.action.key].push(row);
    for (const key of Object.keys(grouped)) {
      grouped[key].sort(window.PortfolioCore ? window.PortfolioCore.comparePortfolioPriority : ((a, b) => a.symbol.localeCompare(b.symbol)));
    }
    return grouped;
  }

  function scopeRows(rows) {
    if (activeScope === "portfolio") return rows.filter((row) => row.portfolio?.isHolding);
    if (activeScope === "watchlist") return rows.filter((row) => !row.portfolio?.isHolding);
    return rows;
  }

  function scopeLabel() {
    if (activeScope === "portfolio") return "Portfolio Only";
    if (activeScope === "watchlist") return "Watchlist Only";
    return "All assets";
  }

  function renderCurrentScope() {
    render(scopeRows(allRows));
    const totalPortfolioRows = allRows.filter((row) => row.portfolio?.isHolding).length;
    const totalWatchRows = allRows.length - totalPortfolioRows;
    actionStatus.textContent = `${scopeLabel()} · แสดง ${scopeRows(allRows).length} จาก ${allRows.length} รายการ · Holdings ${totalPortfolioRows} · Watchlist ${totalWatchRows}`;
  }

  function render(rows) {
    const grouped = groupRows(rows);
    summaryRoot.innerHTML = ACTIONS.map((action) => renderSummaryCard(action, grouped[action.key] || [])).join("");
    renderConflicts(rows);
    renderPortfolioPriority(allRows);
    sectionsRoot.innerHTML = ACTIONS.map((action) => renderSection(action, grouped[action.key] || [])).join("");
    bindSummaryScroll();
  }

  function renderPortfolioPriority(rows) {
    if (!portfolioPriorityRoot) return;
    const real = rows.filter((row) => row.portfolio?.isHolding).sort(window.PortfolioCore.comparePortfolioPriority);
    const watch = rows.filter((row) => !row.portfolio?.isHolding).sort(window.PortfolioCore.comparePortfolioPriority);
    const urgent = real.filter((row) => ["sell_reduce", "watch_sell"].includes(row.action.key) || row.action.adjustment);
    const watchHoldings = real.filter((row) => !urgent.includes(row)).slice(0, 12);
    const opportunities = watch.filter((row) => ["buy_now", "watch_buy"].includes(row.action.key));
    const risks = watch.filter((row) => ["sell_reduce", "watch_sell"].includes(row.action.key));
    const sections = [
      ["Urgent Portfolio Actions", "Real holdings with urgent or risk-adjusted signals", urgent],
      ["Watch Portfolio Holdings", "Real holdings that still deserve monitoring", watchHoldings],
      ["Watchlist Opportunities", "Watchlist-only assets with buy-side setup", opportunities],
      ["Watchlist Risks", "Watchlist-only assets with sell-side or bearish setup", risks]
    ];
    portfolioPriorityRoot.innerHTML = `
      <div class="conflict-heading">
        <div>
          <h2>Portfolio-Aware Priority</h2>
          <p>เรียง real holdings ก่อน แล้วค่อย watchlist-only เพื่อให้สัญญาณที่กระทบเงินจริงเด่นกว่า</p>
        </div>
      </div>
      ${sections.map(([title, description, list]) => `
        <div class="action-panel" style="box-shadow:none;margin-top:12px">
          <div class="section-heading">
            <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
            <span class="count-badge">${list.length}</span>
          </div>
          <div class="action-card-grid">${list.length ? list.slice(0, 8).map(renderActionCard).join("") : '<div class="empty-box">ยังไม่มีรายการ</div>'}</div>
        </div>`).join("")}`;
  }

  function renderConflicts(rows) {
    const conflicts = rows.map(detectSignalConflict).filter(Boolean)
      .sort((a, b) => (window.PortfolioCore ? window.PortfolioCore.comparePortfolioPriority(a.row, b.row) : 0));
    if (!conflictsRoot) return;
    if (!conflicts.length) {
      conflictsRoot.innerHTML = '<div class="empty-box">ยังไม่พบ signal conflict สำคัญตอนนี้</div>';
      return;
    }
    conflictsRoot.innerHTML = `
      <div class="conflict-heading">
        <div>
          <h2>Signal Conflicts</h2>
          <p>เคสที่ RSI, EMA/SMA หรือ trend ให้ข้อความไม่ตรงกัน ต้องอ่านแบบมี nuance · เรียง holdings และ position ใหญ่ก่อน</p>
        </div>
        <span class="count-badge">${conflicts.length}</span>
      </div>
      <div class="conflict-grid">
        ${conflicts.slice(0, 12).map(renderConflictCard).join("")}
      </div>`;
  }

  function detectSignalConflict(row) {
    const emaBullish = row.trend.emaStatus === "EMA Bullish";
    const emaBearish = row.trend.emaStatus === "EMA Bearish";
    const belowSma = row.trend.smaStatus === "Below SMA200";
    const aboveSma = row.trend.smaStatus === "Above SMA200";
    const ongoingBullish = row.trend.key === "ongoing_bullish";
    const ongoingBearish = row.trend.key === "ongoing_bearish";
    const newBearish = row.trend.key === "new_bearish";
    const rsiWatchSell = row.rsiClass.key === "watch_sell";
    const rsiBuy = row.rsiClass.key === "buy_signal";
    const rsiSell = row.rsiClass.key === "sell_signal";

    if (rsiBuy && (newBearish || ongoingBearish || emaBearish)) {
      return {
        row,
        reasons: ["RSI Buy", newBearish ? "New Bearish Signal" : "Bearish Trend"],
        summary: "มีโอกาสเด้งสั้น แต่ trend ยังเสี่ยง",
        tone: "badge-orange"
      };
    }
    if (ongoingBullish && rsiWatchSell) {
      return {
        row,
        reasons: ["Ongoing Bullish", "RSI Watch Sell"],
        summary: "ถือได้ แต่อย่าไล่ราคา",
        tone: "badge-amber"
      };
    }
    if (emaBullish && belowSma) {
      return {
        row,
        reasons: ["EMA Bullish", "Below SMA200"],
        summary: "เริ่มฟื้น แต่ยังไม่ confirm",
        tone: "badge-amber"
      };
    }
    if (emaBearish && aboveSma) {
      return {
        row,
        reasons: ["EMA Bearish", "Above SMA200"],
        summary: "โมเมนตัมเริ่มอ่อน แต่ราคายังไม่หลุดโครงสร้างหลัก",
        tone: "badge-orange"
      };
    }
    if (rsiSell && aboveSma) {
      return {
        row,
        reasons: ["RSI Sell", "Above SMA200"],
        summary: "ราคาอยู่เหนือเส้นหลัก แต่ RSI เริ่มร้อน ควรระวังการไล่ราคา",
        tone: "badge-orange"
      };
    }
    return null;
  }

  function renderConflictCard(conflict) {
    const row = conflict.row;
    const detailHref = `/ai-boom-universe?focus=${encodeURIComponent(row.asset.ticker || row.symbol)}`;
    return `
      <a class="conflict-card" href="${detailHref}" title="เปิดรายละเอียดใน Trend Signal dashboard">
        <div>
          <div class="conflict-symbol">${escapeHtml(row.symbol)}</div>
          <div class="card-name">${escapeHtml(row.name)}</div>
        </div>
        <div class="conflict-reasons">
          ${conflict.reasons.map((reason) => `<span class="badge ${conflict.tone}">${escapeHtml(reason)}</span>`).join("")}
        </div>
        <p class="conflict-summary">สรุป: ${escapeHtml(conflict.summary)}</p>
      </a>`;
  }

  function renderSummaryCard(action, rows) {
    return `
      <button class="summary-card ${action.summaryTone}" type="button" data-scroll-target="${sectionId(action.key)}">
        <span>${escapeHtml(action.title)}</span>
        <strong>${rows.length}</strong>
        <p>${escapeHtml(action.description)}</p>
        <p>คลิกเพื่อดูรายการ</p>
      </button>`;
  }

  function renderSection(action, rows) {
    const cards = rows.length ? rows.map(renderActionCard).join("") : `<div class="empty-box">${escapeHtml(action.empty)}</div>`;
    return `
      <section id="${sectionId(action.key)}" class="action-panel">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(action.title)} · ${escapeHtml(action.thai)}</h2>
            <p>${escapeHtml(action.description)}</p>
          </div>
          <span class="count-badge">${rows.length}</span>
        </div>
        <div class="action-card-grid">${cards}</div>
      </section>`;
  }

  function renderActionCard(row) {
    const action = ACTIONS.find((item) => item.key === row.action.key) || ACTIONS[ACTIONS.length - 2];
    const info = row.trend.info;
    const latestClose = Number.isFinite(Number(row.marketData.latestClose)) ? Number(row.marketData.latestClose) : info.latestClose;
    const latestDate = row.marketData.latestDate || info.latestDate || row.rsi.latestDate || "-";
    const detailHref = `/ai-boom-universe?focus=${encodeURIComponent(row.asset.ticker || row.symbol)}`;
    const emaTone = row.trend.emaStatus.includes("Bullish") ? "badge-green" : row.trend.emaStatus.includes("Bearish") ? "badge-red" : "badge-gray";
    const smaTone = row.trend.smaStatus.includes("Above") ? "badge-green" : row.trend.smaStatus.includes("Below") ? "badge-red" : "badge-gray";
    const riskLabel = marketRisk?.level?.label || "Unknown";
    const riskThai = marketRisk?.level?.thai || "";
    const portfolioLine = row.portfolio?.isHolding
      ? `${formatPrice(row.portfolio.marketValue)} ${row.holding.currency || "THB"} · ${row.portfolio.weight.toFixed(1)}% of portfolio`
      : "No portfolio impact";
    const hasTargetWeight = row.portfolio?.isHolding && Number.isFinite(row.portfolio.targetWeight) && row.portfolio.targetWeight > 0;
    const targetLine = hasTargetWeight && Number.isFinite(row.portfolio.gapVsTarget)
      ? `Target ${row.portfolio.targetWeight.toFixed(1)}% · ${row.portfolio.gapVsTarget >= 0 ? "Overweight" : "Underweight"} ${row.portfolio.gapVsTarget >= 0 ? "+" : ""}${row.portfolio.gapVsTarget.toFixed(1)}%`
      : "";
    return `
      <a class="action-card ${action.tone}" href="${detailHref}" title="เปิดรายละเอียดใน Trend Signal dashboard">
        <div class="card-top">
          <div>
            <div class="asset-360-title">${escapeHtml(row.symbol)} Asset 360</div>
            <div class="card-name">${escapeHtml(row.name)}</div>
          </div>
          <div class="card-price">
            ${escapeHtml(formatPrice(latestClose))}
            <div class="card-date">${escapeHtml(formatDate(latestDate))}</div>
          </div>
        </div>
        <div class="badge-row">
          <span class="badge ${row.portfolio?.isHolding ? "badge-blue" : "badge-gray"}">${row.portfolio?.isHolding ? "Holding" : "Watchlist Only"}</span>
          <span class="badge ${badgeToneForAction(row.action.key)}">${escapeHtml(row.action.actionLabel)}</span>
          <span class="badge ${row.rsiClass.tone}">${escapeHtml(row.rsiClass.label)}</span>
          <span class="badge ${badgeToneForTrend(row.trend.key)}">${escapeHtml(row.trend.label)}</span>
        </div>
        <div class="badge-row">
          <span class="badge ${emaTone}">${escapeHtml(row.trend.emaStatus)}</span>
          <span class="badge ${smaTone}">${escapeHtml(row.trend.smaStatus)}</span>
          ${row.action.adjustment ? `<span class="badge badge-orange">Risk adjusted</span>` : ""}
        </div>
        <div class="signal-stack" aria-label="Signal hierarchy">
          ${signalLayer("Primary trend", shortTrendLabel(row.trend), badgeToneForTrend(row.trend.key))}
          ${signalLayer("Timing", shortRsiLabel(row), row.rsiClass.tone)}
          ${signalLayer("Market condition", riskThai ? `${riskLabel} (${riskThai})` : riskLabel, riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk" ? "badge-orange" : "badge-gray")}
          ${signalLayer("Portfolio impact", row.portfolio?.isHolding ? `${row.portfolio.weight.toFixed(1)}% · ${formatPrice(row.portfolio.marketValue)} THB` : "Watchlist only", row.portfolio?.isHolding ? "badge-blue" : "badge-gray")}
        </div>
        <div class="asset-360-list">
          ${asset360Line("Price", formatPrice(latestClose))}
          ${asset360Line("Trend", shortTrendLabel(row.trend))}
          ${asset360Line("RSI", shortRsiLabel(row))}
          ${asset360Line("SMA200", shortSmaStatus(row.trend.smaStatus))}
          ${asset360Line("EMA", shortEmaStatus(row.trend.emaStatus))}
          ${asset360Line("Market Risk", riskThai ? `${riskLabel} (${riskThai})` : riskLabel)}
          ${asset360Line("Action", row.action.actionLabel)}
        </div>
        <div class="portfolio-mini">
          <strong>${escapeHtml(row.portfolio?.isHolding ? "Portfolio Position" : "Watchlist Only")}</strong>
          <span>${escapeHtml(portfolioLine)}</span>
          ${targetLine ? `<span>${escapeHtml(targetLine)}</span>` : ""}
        </div>
        <div class="reason-box">
          <strong>เหตุผล:</strong>
          <p>${escapeHtml(buildThaiReason(row))}</p>
        </div>
        <p class="card-explain">${escapeHtml(row.action.explanation)}</p>
        ${row.action.adjustment ? `<p class="card-explain">${escapeHtml(row.action.adjustment)}</p>` : ""}
        <div class="source-line">Source: ${escapeHtml(sourceLabel(row.marketData))}</div>
        <div class="action-card-footer">
          <span>${escapeHtml(action.thai)}</span>
          <span class="open-detail">เปิดรายละเอียด</span>
        </div>
      </a>`;
  }

  function metric(label, value) {
    return `<div><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`;
  }

  function signalLayer(label, value, tone) {
    return `
      <div class="signal-layer">
        <span>${escapeHtml(label)}</span>
        <strong class="badge ${tone}">${escapeHtml(value)}</strong>
      </div>`;
  }

  function asset360Line(label, value) {
    return `
      <div class="asset-360-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>`;
  }

  function shortTrendLabel(trend) {
    if (trend.key === "ongoing_bullish") return "Ongoing Bullish";
    if (trend.key === "ongoing_bearish") return "Ongoing Bearish";
    if (trend.key === "new_bullish") return "New Bullish";
    if (trend.key === "new_bearish") return "New Bearish";
    if (trend.key === "bullish_watch") return "Bullish Watchlist";
    if (trend.key === "bearish_watch") return "Bearish Watchlist";
    if (trend.key === "waiting_technical") return "Waiting Technical Data";
    if (trend.key === "insufficient") return "Insufficient Data";
    return "Neutral / Sideway";
  }

  function shortRsiLabel(row) {
    const value = Number.isFinite(row.rsi.rsi) ? ` (${row.rsi.rsi.toFixed(2)})` : "";
    if (row.rsiClass.key === "watch_sell") return `Watch Sell${value}`;
    if (row.rsiClass.key === "sell_signal") return `Sell Signal${value}`;
    if (row.rsiClass.key === "watch_buy") return `Watch Buy${value}`;
    if (row.rsiClass.key === "buy_signal") return `Buy Signal${value}`;
    if (row.rsiClass.key === "insufficient") return "Insufficient";
    return `Neutral${value}`;
  }

  function shortSmaStatus(status) {
    if (status === "Above SMA200") return "Above";
    if (status === "Below SMA200") return "Below";
    if (status === "At SMA200") return "At";
    return "Not Available";
  }

  function shortEmaStatus(status) {
    if (status === "EMA Bullish") return "Bullish";
    if (status === "EMA Bearish") return "Bearish";
    if (status === "EMA Neutral") return "Neutral";
    return "Not Available";
  }

  function buildThaiReason(row) {
    const parts = [];
    if (row.trend.key === "ongoing_bullish") parts.push("ราคายังอยู่ในขาขึ้น");
    else if (row.trend.key === "ongoing_bearish") parts.push("ราคายังอยู่ในขาลง");
    else if (row.trend.key === "new_bearish") parts.push("เพิ่งเกิดสัญญาณลบใหม่จาก EMA/SMA");
    else if (row.trend.key === "bullish_watch") parts.push("โครงสร้างเริ่มฟื้นแต่ยังต้องรอ confirmation");
    else if (row.trend.key === "bearish_watch") parts.push("โครงสร้างเริ่มอ่อนแรงและต้องเฝ้าระวัง");

    if (row.rsiClass.key === "watch_sell") parts.push("RSI เริ่มสูง");
    else if (row.rsiClass.key === "sell_signal") parts.push("RSI เข้าเขตขาย");
    else if (row.rsiClass.key === "watch_buy") parts.push("RSI เข้าเขตเฝ้าระวังซื้อ");
    else if (row.rsiClass.key === "buy_signal") parts.push("RSI เข้าเขตซื้อ");

    const riskLabel = marketRisk?.level?.label || "";
    if (riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk") {
      parts.push("ตลาดเริ่มมี risk จาก Market Risk Monitor");
    }

    return parts.length ? `${parts.join(" แต่ ")}.` : row.action.explanation;
  }

  function sourceLabel(marketData) {
    if (marketData.sourceType === "LIVE_MARKET_DATA") return "Live market data";
    if (marketData.sourceType === "SERVER_CACHED_DATA") return "Server cached data";
    if (marketData.sourceType === "FALLBACK_DATA") return "Fallback data";
    if (marketData.sourceType === "ERROR") return marketData.source || "Unable to load market data";
    return marketData.source || marketData.provider || "Market data";
  }

  function badgeToneForAction(key) {
    if (key === "buy_now") return "badge-buy";
    if (key === "watch_buy") return "badge-watch-buy";
    if (key === "hold") return "badge-hold";
    if (key === "watch_sell") return "badge-watch-sell";
    if (key === "sell_reduce") return "badge-sell";
    if (key === "insufficient") return "badge-insufficient";
    return "badge-neutral";
  }

  function badgeToneForTrend(key) {
    if (key === "new_bullish" || key === "ongoing_bullish") return "badge-green";
    if (key === "bullish_watch") return "badge-amber";
    if (key === "new_bearish" || key === "ongoing_bearish") return "badge-red";
    if (key === "bearish_watch") return "badge-orange";
    if (key === "waiting_technical") return "badge-blue";
    return "badge-gray";
  }

  function sectionId(key) {
    return `action-${key.replace(/_/g, "-")}`;
  }

  function bindSummaryScroll() {
    summaryRoot.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scrollTarget);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: number >= 1000 ? 2 : 2,
      maximumFractionDigits: number >= 1000 ? 2 : 4
    }).format(number);
  }

  function formatDate(value) {
    if (!value) return "-";
    return String(value).slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function updateRiskText() {
    const label = marketRisk?.level?.label || "Unknown";
    const thai = marketRisk?.level?.thai || "ไม่ทราบระดับความเสี่ยง";
    const score = Number.isFinite(marketRisk?.score) ? marketRisk.score : "-";
    marketRiskText.textContent = `Market Risk: ${label} (${thai}) · Score ${score}`;
  }

  async function loadActionCenter(options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    actionStatus.textContent = "กำลังโหลด watchlist และ market risk...";
    sectionsRoot.innerHTML = '<div class="empty-box">กำลังรวมสัญญาณจาก RSI, EMA/SMA และ Market Risk...</div>';
    await loadPersistedState();
    resetAssets();
    const holdingsResult = await window.PortfolioCore.loadHoldings();
    holdings = holdingsResult.holdings;
    await fetchMarketRisk();
    updateRiskText();
    actionStatus.textContent = `กำลังวิเคราะห์ ${assets.length} รายการ...`;
    const totalValue = window.PortfolioCore.totalMarketValue(holdings);
    const rowsRaw = await Promise.all(assets.map((asset) => analyzeAsset(asset, forceRefresh)));
    allRows = rowsRaw.map((row) => window.PortfolioCore.enrichWithHolding(row, holdings, totalValue));
    renderCurrentScope();
  }

  scopeTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scope]");
    if (!button) return;
    activeScope = button.dataset.scope || "portfolio";
    scopeTabs.querySelectorAll("[data-scope]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderCurrentScope();
  });

  refreshButton?.addEventListener("click", () => {
    priceCache.clear();
    loadActionCenter({ forceRefresh: true }).catch((error) => {
      actionStatus.textContent = error?.message || "โหลด Action Center ไม่สำเร็จ";
    });
  });

  loadActionCenter().catch((error) => {
    actionStatus.textContent = error?.message || "โหลด Action Center ไม่สำเร็จ";
    sectionsRoot.innerHTML = '<div class="empty-box">ไม่สามารถโหลด Action Center ได้</div>';
  });
})();
