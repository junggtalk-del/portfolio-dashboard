(function () {
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const seed = window.AIBoomUniverseSeed || { theme: "AI_DataCenter_Supercycle", ai_boom_universe: [] };
  const scoring = window.AIBoomScoring || { enrichAsset: (asset) => asset };
  const priceCache = new Map();
  const LEGACY_HIDDEN_IDS = new Set([
    "ai-scb-global-tech-fund",
    "ai-kkp-g-tech-fund",
    "ai-b-innotech-fund"
  ]);

  const RSI_PERIOD = 14;
  const STARRED_SYMBOLS = new Set(["BTC", "BTCUSD", "BTC-USD", "QQQM", "SPY"]);
  const GROUPS = [
    {
      key: "buy_signal",
      sectionId: "rsi-buy-signal",
      title: "Buy Signal",
      thaiTitle: "สัญญาณซื้อ",
      description: "RSI <= 30",
      empty: "ยังไม่มีสินทรัพย์ที่เป็นสัญญาณซื้อ",
      tone: "tone-buy"
    },
    {
      key: "watch_buy",
      sectionId: "rsi-watch-buy",
      title: "Watch Buy",
      thaiTitle: "เฝ้าระวังซื้อ",
      description: "RSI 31-35",
      empty: "ยังไม่มีสินทรัพย์ที่เข้าเขตเฝ้าระวังซื้อ",
      tone: "tone-watch-buy"
    },
    {
      key: "watch_sell",
      sectionId: "rsi-watch-sell",
      title: "Watch Sell",
      thaiTitle: "เฝ้าระวังขาย",
      description: "RSI 67-69",
      empty: "ยังไม่มีสินทรัพย์ที่เข้าเขตเฝ้าระวังขาย",
      tone: "tone-watch-sell"
    },
    {
      key: "sell_signal",
      sectionId: "rsi-sell-signal",
      title: "Sell Signal",
      thaiTitle: "สัญญาณขาย",
      description: "RSI >= 70",
      empty: "ยังไม่มีสินทรัพย์ที่เป็นสัญญาณขาย",
      tone: "tone-sell"
    },
    {
      key: "neutral",
      sectionId: "rsi-neutral",
      title: "Neutral",
      thaiTitle: "ยังไม่มีสัญญาณ RSI",
      description: "RSI > 35 และ RSI < 67",
      empty: "ยังไม่มีสินทรัพย์ที่เป็น neutral RSI",
      tone: "tone-neutral"
    },
    {
      key: "insufficient",
      sectionId: "rsi-insufficient",
      title: "Insufficient RSI Data",
      thaiTitle: "ข้อมูลไม่พอสำหรับคำนวณ RSI",
      description: "ต้องมี daily close/NAV อย่างน้อย 15 จุด",
      empty: "ไม่มีรายการที่ข้อมูลไม่พอสำหรับ RSI14",
      tone: "tone-insufficient"
    }
  ];
  const FILTERS = [
    { key: "all", label: "All" },
    { key: "buy_signal", label: "Buy Signal" },
    { key: "watch_buy", label: "Watch Buy" },
    { key: "watch_sell", label: "Watch Sell" },
    { key: "sell_signal", label: "Sell Signal" },
    { key: "starred", label: "Starred Only" },
    { key: "neutral", label: "Neutral" },
    { key: "insufficient", label: "Insufficient Data" }
  ];
  const FILTER_GROUPS = {
    all: new Set(GROUPS.map((group) => group.key)),
    buy_signal: new Set(["buy_signal"]),
    watch_buy: new Set(["watch_buy"]),
    watch_sell: new Set(["watch_sell"]),
    sell_signal: new Set(["sell_signal"]),
    starred: new Set(GROUPS.map((group) => group.key)),
    neutral: new Set(["neutral"]),
    insufficient: new Set(["insufficient"])
  };

  const THAI_MUTUAL_FUND_ALIASES = {
    "K-GTECHRMF": "K-GTECHRMF",
    KGTECHRMF: "K-GTECHRMF",
    "K-USXNDQRMF": "K-USXNDQRMF",
    KUSXNDQRMF: "K-USXNDQRMF"
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
    "^SET.BK": { displaySymbol: "SET", displayName: "SET Index", market: "SET", currency: "THB" },
    "^SET50.BK": { displaySymbol: "SET50", displayName: "SET50 Index", market: "SET", currency: "THB" },
    "^SET100.BK": { displaySymbol: "SET100", displayName: "SET100 Index", market: "SET", currency: "THB" }
  };
  const US_INDEX_ALIASES = {
    SPX: "^GSPC",
    "^GSPC": "^GSPC",
    GSPC: "^GSPC",
    IXIC: "^IXIC",
    "^IXIC": "^IXIC",
    NDX: "^NDX",
    "^NDX": "^NDX"
  };
  const THAI_STOCK_ALIASES = {
    "GULF.BK": "GULF.BK",
    GULFBK: "GULF.BK",
    GULF: "GULF.BK"
  };
  const YAHOO_SYMBOLS = {
    NVDA: "NVDA",
    AMD: "AMD",
    MSFT: "MSFT",
    AMZN: "AMZN",
    GOOG: "GOOG",
    NDX01: "^NDX",
    BTC: "BTC-USD",
    BTCUSD: "BTC-USD",
    XBTUSD: "BTC-USD",
    ETHUSD: "ETH-USD"
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

  const summaryCards = document.querySelector("#rsiSummaryCards");
  const filterTabs = document.querySelector("#rsiFilterTabs");
  const scopeTabs = document.querySelector("#rsiScopeTabs");
  const sectionsRoot = document.querySelector("#rsiSections");
  const refreshButton = document.querySelector("#refreshRsiButton");

  let persistedState = { userAssets: [], removedIds: [] };
  let assets = [];
  let portfolioHoldings = [];
  let activeFilter = "all";
  let activeScope = "portfolio";
  let renderVersion = 0;
  const isDevClient = Boolean(location.hostname === "localhost" || location.hostname === "127.0.0.1");

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
    const canonicalTicker = canonicalSymbolFromTicker(asset.ticker || "");
    const compactTicker = canonicalTicker.replace(/[^A-Z0-9]/g, "");
    if (THAI_INDEX_METADATA[canonicalTicker]) return canonicalTicker;
    if (asset.asset_type === "THAI_MUTUAL_FUND") {
      return THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker] || canonicalTicker;
    }
    if (canonicalTicker.endsWith(".BK")) return canonicalTicker;
    if (canonicalTicker.startsWith("^")) return canonicalTicker;
    if (THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker]) {
      return THAI_MUTUAL_FUND_ALIASES[canonicalTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker];
    }
    if (YAHOO_SYMBOLS[canonicalTicker]) return YAHOO_SYMBOLS[canonicalTicker];
    if (YAHOO_SYMBOLS[compactTicker]) return YAHOO_SYMBOLS[compactTicker];
    if (asset.asset_type === "crypto" && (compactTicker === "BTC" || compactTicker === "BTCUSD")) return "BTC-USD";
    if (asset.asset_type === "crypto" && compactTicker === "ETHUSD") return "ETH-USD";
    if (/(^|_)(RMF|SSF)($|_)/.test(compactTicker) || compactTicker.includes("RMF") || compactTicker.includes("SSF")) return "^SET.BK";
    if (canonicalTicker === "SCBNDQ" || canonicalTicker === "KKP_NDQ") return "^NDX";
    if (canonicalTicker === "SCB_GLOBAL_TECH" || canonicalTicker === "KKP_G_TECH" || canonicalTicker === "B_INNOTECH" || canonicalTicker === "ONE_UGG_RA") return "XLK";
    if (asset.asset_type === "THAI_STOCK") return canonicalTicker.endsWith(".BK") ? canonicalTicker : `${canonicalTicker}.BK`;
    if (asset.asset_type === "INDEX") return canonicalTicker.startsWith("^") ? canonicalTicker : `^${canonicalTicker}`;
    if (asset.asset_type === "stock" || asset.asset_type === "etf") return canonicalTicker;
    return canonicalTicker;
  }

  async function fetchPriceHistory(asset, options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const symbol = getYahooSymbol(asset);
    if (!symbol) {
      return {
        marketSymbol: "",
        source: "No market data source",
        sourceType: "ERROR",
        dates: [],
        closes: [],
        latestClose: null,
        latestDate: null,
        historyCount: 0
      };
    }
    const cacheKey = `${symbol}:${asset.id || asset.ticker}`;
    if (!forceRefresh && priceCache.has(cacheKey)) return priceCache.get(cacheKey);

    const response = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}${forceRefresh ? "&refresh=1" : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load market data");
    const payload = await response.json();
    const dates = Array.isArray(payload.dates) ? payload.dates : [];
    const closes = Array.isArray(payload.closes) ? payload.closes : [];
    const rows = [];
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
      navStatus: payload.navStatus || "",
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
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      averageGain = ((averageGain * (period - 1)) + gain) / period;
      averageLoss = ((averageLoss * (period - 1)) + loss) / period;
    }

    let rsi = 50;
    if (averageLoss === 0 && averageGain > 0) rsi = 100;
    else if (averageGain === 0 && averageLoss > 0) rsi = 0;
    else if (averageLoss > 0) {
      const relativeStrength = averageGain / averageLoss;
      rsi = 100 - (100 / (1 + relativeStrength));
    }

    return {
      rsi,
      period,
      latestDate: cleanDates[cleanDates.length - 1] || null,
      enoughData: true
    };
  }

  function classifyRsi(rsiResult) {
    const rsi = rsiResult.rsi;
    if (!rsiResult.enoughData || !Number.isFinite(rsi)) {
      return {
        groupKey: "insufficient",
        label: "Insufficient RSI Data",
        thaiLabel: "ข้อมูลไม่พอสำหรับ RSI14",
        actionLabel: "ข้อมูลไม่พอสำหรับ RSI14",
        explanation: "ข้อมูลไม่พอสำหรับคำนวณ RSI14",
        zone: "Insufficient",
        distanceText: "-"
      };
    }
    if (rsi >= 70) {
      return {
        groupKey: "sell_signal",
        label: "Sell Signal",
        thaiLabel: "สัญญาณขาย",
        actionLabel: "ต้องขาย / Sell Signal",
        explanation: "RSI แตะหรือสูงกว่า 70 เข้าสู่เขต overbought",
        zone: "RSI >= 70",
        distanceText: `สูงกว่า 70 อยู่ ${formatNumber(rsi - 70)}`
      };
    }
    if (rsi <= 30) {
      return {
        groupKey: "buy_signal",
        label: "Buy Signal",
        thaiLabel: "สัญญาณซื้อ",
        actionLabel: "ต้องซื้อ / Buy Signal",
        explanation: "RSI แตะหรือต่ำกว่า 30 เข้าสู่เขต oversold",
        zone: "RSI <= 30",
        distanceText: `ต่ำกว่า 30 อยู่ ${formatNumber(30 - rsi)}`
      };
    }
    if (rsi >= 67 && rsi <= 69) {
      return {
        groupKey: "watch_sell",
        label: "Watch Sell",
        thaiLabel: "เฝ้าระวังขาย",
        actionLabel: "เฝ้าระวังเตรียมขาย / Watch Sell",
        explanation: "RSI ขึ้นใกล้เขต overbought เริ่มเฝ้าระวังจังหวะขาย",
        zone: "RSI 67-69",
        distanceText: `อีก ${formatNumber(70 - rsi)} ถึง Sell Signal`
      };
    }
    if (rsi >= 31 && rsi <= 35) {
      return {
        groupKey: "watch_buy",
        label: "Watch Buy",
        thaiLabel: "เฝ้าระวังซื้อ",
        actionLabel: "เฝ้าระวังเตรียมซื้อ / Watch Buy",
        explanation: "RSI ลงมาใกล้เขต oversold เริ่มเฝ้าระวังจังหวะซื้อ",
        zone: "RSI 31-35",
        distanceText: `อีก ${formatNumber(rsi - 30)} ถึง Buy Signal`
      };
    }
    return {
      groupKey: "neutral",
      label: "Neutral",
      thaiLabel: "ยังไม่มีสัญญาณ RSI",
      actionLabel: "ยังไม่มีสัญญาณ RSI / No RSI Signal",
      explanation: "RSI อยู่ระหว่างโซนซื้อและขาย ยังไม่มีสัญญาณ RSI ชัดเจน",
      zone: "RSI > 35 และ RSI < 67",
      distanceText: rsi < 50 ? `อีก ${formatNumber(rsi - 35)} ถึง Watch Buy` : `อีก ${formatNumber(67 - rsi)} ถึง Watch Sell`
    };
  }

  function isStarredAsset(asset, marketSymbol) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    const compact = canonical.replace(/[^A-Z0-9]/g, "");
    const market = String(marketSymbol || "").toUpperCase();
    return STARRED_SYMBOLS.has(canonical) || STARRED_SYMBOLS.has(compact) || STARRED_SYMBOLS.has(market);
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

  function formatPrice(value) {
    if (!Number.isFinite(value)) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: value >= 1000 ? 2 : 2,
      maximumFractionDigits: value >= 1000 ? 2 : 4
    }).format(value);
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "-";
    return Math.abs(value).toFixed(2);
  }

  function formatDate(value) {
    if (!value) return "-";
    return String(value).slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function analyzeAsset(asset, marketData) {
    const rsi = calculateRSI(marketData.closes || [], marketData.dates || [], RSI_PERIOD);
    const classification = classifyRsi(rsi);
    const starred = isStarredAsset(asset, marketData.marketSymbol);
    return {
      asset,
      marketData,
      rsi,
      classification,
      starred,
      displaySymbol: displaySymbolForAsset(asset),
      displayName: displayNameForAsset(asset, marketData)
    };
  }

  function groupRows(rows) {
    const grouped = {};
    for (const group of GROUPS) grouped[group.key] = [];
    for (const row of rows) {
      if (!grouped[row.classification.groupKey]) grouped[row.classification.groupKey] = [];
      grouped[row.classification.groupKey].push(row);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        if (window.PortfolioCore) {
          const priority = window.PortfolioCore.comparePortfolioPriority(a, b);
          if (priority) return priority;
        }
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        const ar = Number.isFinite(a.rsi.rsi) ? a.rsi.rsi : -1;
        const br = Number.isFinite(b.rsi.rsi) ? b.rsi.rsi : -1;
        if (key === "sell_signal" || key === "watch_sell") return br - ar;
        if (key === "buy_signal" || key === "watch_buy") return ar - br;
        return a.displaySymbol.localeCompare(b.displaySymbol);
      });
    }
    return grouped;
  }

  function scopeRows(rows) {
    if (activeScope === "portfolio") return rows.filter((row) => row.portfolio?.isHolding);
    if (activeScope === "watchlist") return rows.filter((row) => !row.portfolio?.isHolding);
    return rows;
  }

  function renderFilterTabs() {
    filterTabs.innerHTML = FILTERS.map((filter) =>
      `<button class="rsi-filter-tab ${filter.key === activeFilter ? "is-active" : ""}" type="button" data-filter="${escapeHtml(filter.key)}">${escapeHtml(filter.label)}</button>`
    ).join("");
  }

  function renderSummary(grouped) {
    const count = (key) => (grouped[key] || []).length;
    const actionableStarred = GROUPS
      .flatMap((group) => grouped[group.key] || [])
      .filter((row) => row.starred && row.classification.groupKey !== "neutral" && row.classification.groupKey !== "insufficient").length;
    const cards = [
      { title: "Buy Signal", count: count("buy_signal"), detail: "RSI <= 30", target: "rsi-buy-signal", tone: "tone-buy" },
      { title: "Watch Buy", count: count("watch_buy"), detail: "RSI 31-35", target: "rsi-watch-buy", tone: "tone-watch-buy" },
      { title: "Watch Sell", count: count("watch_sell"), detail: "RSI 67-69", target: "rsi-watch-sell", tone: "tone-watch-sell" },
      { title: "Sell Signal", count: count("sell_signal"), detail: "RSI >= 70", target: "rsi-sell-signal", tone: "tone-sell" },
      { title: "สินทรัพย์สำคัญที่มีสัญญาณ", count: actionableStarred, detail: "BTC / QQQM / SPY", target: "rsi-starred-actionable", tone: "tone-starred" }
    ];
    summaryCards.innerHTML = cards.map((card) => `
      <button class="rsi-summary-card ${card.tone}" type="button" data-summary-target="${escapeHtml(card.target)}">
        <span>${escapeHtml(card.title)}</span>
        <strong>${card.count}</strong>
        <small>${escapeHtml(card.detail)}</small>
        <em>คลิกเพื่อดูรายการ</em>
      </button>
    `).join("");
  }

  function badge(text, tone) {
    return `<span class="rsi-badge ${tone}">${escapeHtml(text)}</span>`;
  }

  function sourceLabel(row) {
    if (row.marketData.assetType === "Thai Mutual Fund") {
      if (String(row.marketData.navStatus || "").includes("LIVE")) return "Live NAV";
      if (String(row.marketData.navStatus || "").includes("CACHE")) return "Cached NAV";
      return row.marketData.source || "NAV data";
    }
    if (row.marketData.sourceType === "SERVER_CACHED_DATA") return "Server cached data";
    if (row.marketData.sourceType === "LIVE_MARKET_DATA") return "Live market data";
    return row.marketData.source || "Market data";
  }

  function renderCard(row) {
    const cls = row.classification;
    const group = GROUPS.find((item) => item.key === cls.groupKey) || GROUPS[GROUPS.length - 1];
    const star = row.starred ? `<span class="rsi-star" title="สินทรัพย์ที่เหมาะกับการติดตามสัญญาณ RSI เป็นพิเศษ">*</span>` : "";
    const dataType = row.marketData.assetType === "Thai Mutual Fund" ? "NAV" : "Price";
    return `
      <article class="rsi-card ${group.tone}" data-symbol="${escapeHtml(canonicalSymbolFromTicker(row.asset.ticker))}" data-starred="${row.starred ? "true" : "false"}">
        <div class="rsi-card-top">
          <div>
            <h3>${escapeHtml(row.displaySymbol)} ${star}</h3>
            <p>${escapeHtml(row.displayName)}</p>
          </div>
          <div class="rsi-price-block">
            <strong>${formatPrice(row.marketData.latestClose)}</strong>
            <span>${formatDate(row.marketData.latestDate)}</span>
          </div>
        </div>

        <div class="rsi-main-signal">
          <div>
            <span>RSI 14</span>
            <strong>${Number.isFinite(row.rsi.rsi) ? row.rsi.rsi.toFixed(1) : "-"}</strong>
          </div>
          <div class="rsi-signal-labels">
            ${badge(row.portfolio?.isHolding ? `Holding ${formatPrice(row.portfolio.marketValue)} · ${row.portfolio.weight.toFixed(1)}%` : "Watchlist Only", row.portfolio?.isHolding ? "tone-dark" : "tone-action")}
            ${badge(cls.thaiLabel, group.tone)}
            ${badge(cls.label, "tone-dark")}
          </div>
        </div>

        <div class="rsi-detail-grid">
          <span>RSI zone <strong>${escapeHtml(cls.zone)}</strong></span>
          <span>Distance <strong>${escapeHtml(cls.distanceText)}</strong></span>
          <span>${dataType} <strong>${formatPrice(row.marketData.latestClose)}</strong></span>
          <span>Source <strong>${escapeHtml(sourceLabel(row))}</strong></span>
        </div>

        <p class="rsi-explanation">${escapeHtml(cls.explanation)}</p>
        <footer>
          ${badge(cls.actionLabel, "tone-action")}
        </footer>
      </article>
    `;
  }

  function renderSection(group, rows) {
    const cards = rows.length
      ? `<div class="rsi-card-grid">${rows.map(renderCard).join("")}</div>`
      : `<div class="rsi-empty is-compact">${escapeHtml(group.empty)}</div>`;
    return `
      <section id="${escapeHtml(group.sectionId)}" class="rsi-section ${group.tone}">
        <header class="rsi-section-header">
          <div>
            <h2>${escapeHtml(group.title)}</h2>
            <p>${escapeHtml(group.thaiTitle)} · ${escapeHtml(group.description)}</p>
          </div>
          <span>${rows.length}</span>
        </header>
        ${cards}
      </section>
    `;
  }

  function renderSections(grouped) {
    const visibleGroups = FILTER_GROUPS[activeFilter] || FILTER_GROUPS.all;
    const sections = GROUPS
      .filter((group) => visibleGroups.has(group.key))
      .map((group) => {
        const rows = activeFilter === "starred"
          ? (grouped[group.key] || []).filter((row) => row.starred)
          : (grouped[group.key] || []);
        return renderSection(group, rows);
      })
      .join("");

    const starredRows = GROUPS
      .flatMap((group) => grouped[group.key] || [])
      .filter((row) => row.starred && row.classification.groupKey !== "neutral" && row.classification.groupKey !== "insufficient");
    const anchor = `<span id="rsi-starred-actionable" class="rsi-scroll-anchor"></span>`;
    sectionsRoot.innerHTML = anchor + (sections || `<div class="rsi-empty">ไม่พบรายการในตัวกรองนี้</div>`);
    if (activeFilter === "starred" && !starredRows.length) {
      sectionsRoot.insertAdjacentHTML("afterbegin", `<div class="rsi-empty is-compact">ยังไม่มี BTC / QQQM / SPY ที่มีสัญญาณ RSI ตอนนี้</div>`);
    }
  }

  async function renderDashboard(options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const myVersion = ++renderVersion;
    sectionsRoot.innerHTML = `<div class="rsi-empty">กำลังคำนวณ RSI14...</div>`;

    const rawAnalyses = await Promise.all(assets.map(async (asset) => {
      try {
        const marketData = await fetchPriceHistory(asset, { forceRefresh });
        const row = analyzeAsset(asset, marketData);
        if (isDevClient) {
          console.log("[rsi-debug]", {
            symbol: row.displaySymbol,
            marketSymbol: marketData.marketSymbol,
            historyCount: marketData.historyCount,
            rsi: row.rsi.rsi,
            group: row.classification.groupKey
          });
        }
        return row;
      } catch (error) {
        const empty = {
          marketSymbol: getYahooSymbol(asset),
          source: String(error.message || "Unable to load market data"),
          sourceType: "ERROR",
          dates: [],
          closes: [],
          latestClose: null,
          latestDate: null,
          historyCount: 0
        };
        return analyzeAsset(asset, empty);
      }
    }));
    if (myVersion !== renderVersion) return;
    const totalValue = window.PortfolioCore ? window.PortfolioCore.totalMarketValue(portfolioHoldings) : 0;
    const analyses = window.PortfolioCore
      ? rawAnalyses.map((row) => window.PortfolioCore.enrichWithHolding(row, portfolioHoldings, totalValue))
      : rawAnalyses;
    const scopedAnalyses = scopeRows(analyses);
    const grouped = groupRows(scopedAnalyses);
    renderSummary(grouped);
    renderFilterTabs();
    renderSections(grouped);
  }

  function scrollToTarget(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("is-highlight");
    window.setTimeout(() => target.classList.remove("is-highlight"), 1600);
  }

  function handleSummaryClick(event) {
    const button = event.target.closest("[data-summary-target]");
    if (!button) return;
    const target = button.dataset.summaryTarget;
    if (target === "rsi-starred-actionable") {
      activeFilter = "starred";
      renderDashboard();
      window.setTimeout(() => scrollToTarget(target), 160);
      return;
    }
    if (target) scrollToTarget(target);
  }

  function handleFilterClick(event) {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter || "all";
    renderDashboard();
  }

  function handleScopeClick(event) {
    const button = event.target.closest("[data-scope]");
    if (!button) return;
    activeScope = button.dataset.scope || "portfolio";
    scopeTabs.querySelectorAll("[data-scope]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderDashboard();
  }

  async function initialize() {
    await loadPersistedState();
    if (window.PortfolioCore) {
      const holdingResult = await window.PortfolioCore.loadHoldings();
      portfolioHoldings = holdingResult.holdings;
    }
    resetAssets();
    renderFilterTabs();
    renderDashboard();
  }

  summaryCards.addEventListener("click", handleSummaryClick);
  filterTabs.addEventListener("click", handleFilterClick);
  scopeTabs?.addEventListener("click", handleScopeClick);
  refreshButton.addEventListener("click", () => {
    priceCache.clear();
    renderDashboard({ forceRefresh: true });
  });
  initialize();
})();
