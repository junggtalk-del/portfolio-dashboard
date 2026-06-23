(function () {
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const seed = window.AIBoomUniverseSeed || { theme: "AI_DataCenter_Supercycle", ai_boom_universe: [] };
  const scoring = window.AIBoomScoring;
  const technical = window.AITechnicalIndicators;
  const priceCache = new Map();
  const LEGACY_HIDDEN_IDS = new Set([
    "ai-scb-global-tech-fund",
    "ai-kkp-g-tech-fund",
    "ai-b-innotech-fund"
  ]);

  const FRESH_SIGNAL_DAYS = 3;
  const NEAR_EMA_GAP = 0.01;
  const NEAR_SMA_DISTANCE = 0.015;
  const SIGNAL_FILTERS = [
    { key: "all", label: "All" },
    { key: "new", label: "New Signals" },
    { key: "watchlist", label: "Watchlist" },
    { key: "ongoing", label: "Ongoing Trends" },
    { key: "bullish", label: "Bullish" },
    { key: "bearish", label: "Bearish" },
    { key: "neutral", label: "Neutral" },
    { key: "insufficient", label: "Insufficient Data" }
  ];

  const GROUPS = [
    {
      key: "new_bullish",
      panel: "focus",
      sectionId: "new-bullish-signals",
      title: "New Bullish Signals",
      description: "สัญญาณบวกใหม่ในช่วง 1-3 วันทำการ",
      empty: "ยังไม่มี bullish signal ใหม่",
      tone: "group-green"
    },
    {
      key: "new_bearish",
      panel: "focus",
      sectionId: "new-bearish-signals",
      title: "New Bearish Signals",
      description: "สัญญาณลบใหม่ในช่วง 1-3 วันทำการ",
      empty: "ยังไม่มี bearish signal ใหม่",
      tone: "group-red"
    },
    {
      key: "bullish_watch",
      panel: "focus",
      sectionId: "bullish-watchlist",
      title: "Bullish Watchlist",
      description: "ใกล้เกิดสัญญาณบวก / เริ่มฟื้น แต่ยังไม่ confirm",
      empty: "ยังไม่มีตัวที่เข้า bullish watchlist",
      tone: "group-amber"
    },
    {
      key: "bearish_watch",
      panel: "focus",
      sectionId: "bearish-watchlist",
      title: "Bearish Watchlist",
      description: "ใกล้เกิดสัญญาณลบ / เริ่มอ่อนแรง แต่ยังไม่ confirm",
      empty: "ยังไม่มีตัวที่เข้า bearish watchlist",
      tone: "group-orange"
    },
    {
      key: "ongoing_bullish",
      panel: "trend",
      sectionId: "ongoing-bullish-trend",
      title: "Ongoing Bullish Trend",
      description: "ขาขึ้นต่อเนื่อง ยังไม่มีสัญญาณตัดใหม่",
      empty: "ยังไม่มีตัวที่อยู่ในขาขึ้นต่อเนื่อง",
      tone: "group-bluegreen"
    },
    {
      key: "ongoing_bearish",
      panel: "trend",
      sectionId: "ongoing-bearish-trend",
      title: "Ongoing Bearish Trend",
      description: "ขาลงต่อเนื่อง ยังไม่มีสัญญาณกลับตัวใหม่",
      empty: "ยังไม่มีตัวที่อยู่ในขาลงต่อเนื่อง",
      tone: "group-redgray"
    },
    {
      key: "neutral",
      panel: "trend",
      sectionId: "neutral-sideway",
      title: "Neutral / Sideway",
      description: "สัญญาณยังผสมและยังไม่ชัดเจน",
      empty: "ยังไม่มีตัวที่เป็น sideway / neutral",
      tone: "group-gray"
    },
    {
      key: "nav_waiting_technical",
      panel: "trend",
      sectionId: "latest-nav-waiting-technical-data",
      title: "Latest Price/NAV Available / Waiting for Technical Data",
      description: "มีราคาหรือ NAV ล่าสุดแล้ว แต่ข้อมูลย้อนหลังยังไม่พอสำหรับคำนวณ EMA/SMA200",
      empty: "ยังไม่มีตัวที่มีราคาหรือ NAV ล่าสุดแต่ข้อมูลเทคนิคยังไม่พอ",
      tone: "group-slate"
    },
    {
      key: "insufficient",
      panel: "trend",
      sectionId: "insufficient-data",
      title: "Insufficient Data",
      description: "ยังไม่มีทั้งราคาปัจจุบันหรือข้อมูลพอสำหรับคำนวณสัญญาณ",
      empty: "ไม่มีรายการที่ข้อมูลไม่พอ",
      tone: "group-lightgray"
    }
  ];

  const FILTER_GROUP_VISIBILITY = {
    all: new Set(GROUPS.map((group) => group.key)),
    new: new Set(["new_bullish", "new_bearish"]),
    watchlist: new Set(["bullish_watch", "bearish_watch"]),
    ongoing: new Set(["ongoing_bullish", "ongoing_bearish"]),
    bullish: new Set(["new_bullish", "bullish_watch", "ongoing_bullish"]),
    bearish: new Set(["new_bearish", "bearish_watch", "ongoing_bearish"]),
    neutral: new Set(["neutral"]),
    insufficient: new Set(["nav_waiting_technical", "insufficient"])
  };

  const LABELS = {
    layer: "กลุ่มธุรกิจ",
    asset_type: "ประเภทสินทรัพย์",
    risk_level: "ระดับความเสี่ยง",
    initial_action: "สถานะ",
    upstream_ai: "ต้นน้ำ AI",
    data_center_cloud: "Data center / Cloud",
    etf: "ETF / DR",
    growth_optional: "ตัวเลือกเติบโตสูง",
    thai_funds: "กองทุนไทย",
    stock: "หุ้น",
    THAI_STOCK: "หุ้นไทย (SET)",
    THAI_INDEX: "ดัชนีไทย (SET)",
    INDEX: "ดัชนี",
    crypto: "Crypto",
    fund: "กองทุน",
    THAI_MUTUAL_FUND: "Thai Mutual Fund",
    dr: "DR / DRx",
    low: "ต่ำ",
    medium: "กลาง",
    high: "สูง",
    Accumulate: "น่าสะสม",
    Hold: "ถือ/ติดตาม",
    "Wait for pullback": "รอย่อราคา",
    Reduce: "ลดน้ำหนัก"
  };

  const SIGNAL_LABELS = {
    NEW_BULLISH_CROSS: "EMA Cross Up",
    PRICE_RECLAIM_SMA200: "SMA200 Reclaim",
    NEW_BEARISH_CROSS: "EMA Cross Down",
    PRICE_LOST_SMA200: "SMA200 Breakdown",
    NEAR_EMA_UP: "Near EMA Cross Up",
    NEAR_SMA_RECLAIM: "Near SMA200 Reclaim",
    EARLY_BULLISH: "Early Bullish Setup",
    NEAR_EMA_DOWN: "Near EMA Cross Down",
    NEAR_SMA_BREAKDOWN: "Near SMA200 Breakdown",
    EARLY_BEARISH: "Early Bearish Risk",
    BULLISH_TREND: "Bullish Trend",
    BEARISH_TREND: "Bearish Trend",
    STRONG_BULLISH: "Strong Bullish Trend",
    STRONG_BEARISH: "Strong Bearish Trend",
    NEUTRAL: "Neutral / Sideway",
    INSUFFICIENT: "Insufficient Data"
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
    "^SET.BK": {
      displaySymbol: "SET",
      displayName: "SET Index",
      assetType: "THAI_INDEX",
      market: "SET",
      currency: "THB"
    },
    "^SET50.BK": {
      displaySymbol: "SET50",
      displayName: "SET50 Index",
      assetType: "THAI_INDEX",
      market: "SET",
      currency: "THB"
    },
    "^SET100.BK": {
      displaySymbol: "SET100",
      displayName: "SET100 Index",
      assetType: "THAI_INDEX",
      market: "SET",
      currency: "THB"
    }
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

  const filters = {
    layer: document.querySelector("#layerFilter"),
    assetType: document.querySelector("#assetTypeFilter"),
    riskLevel: document.querySelector("#riskLevelFilter"),
    action: document.querySelector("#actionFilter")
  };
  const form = document.querySelector("#tickerForm");
  const tickerInput = document.querySelector("#tickerInput");
  const nameInput = document.querySelector("#nameInput");
  const newLayerInput = document.querySelector("#newLayerInput");
  const newAssetTypeInput = document.querySelector("#newAssetTypeInput");
  const assetCardGrid = document.querySelector("#assetCardGrid");
  const signalFilterTabs = document.querySelector("#signalFilterTabs");
  const refreshMarketDataButton = document.querySelector("#refreshMarketDataButton");
  const syncWatchlistButton = document.querySelector("#syncWatchlistButton");
  const tickerFeedback = document.querySelector("#tickerFeedback");
  const summaryGrid = document.querySelector("#summaryCards");
  const accumulateCount = document.querySelector("#accumulateCount");

  let assets = [];
  let activeSignalFilter = "all";
  let renderVersion = 0;
  let latestAnalysesByCanonical = new Map();
  let pendingRevealCanonical = "";
  let persistedState = { userAssets: [], removedIds: [] };
  let portfolioHoldings = [];
  let storageMode = "supabase";
  const isDevClient = Boolean(location.hostname === "localhost" || location.hostname === "127.0.0.1");
  const isProductionClient = !isDevClient;

  function readJsonArray(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (_error) {
      return [];
    }
  }

  function loadUserAssets() {
    return (persistedState.userAssets || []).map((asset) => scoring.enrichAsset(asset));
  }

  function loadRemovedIds() {
    return new Set(persistedState.removedIds || []);
  }

  function sanitizePersistedState(data) {
    const safe = data && typeof data === "object" ? data : {};
    const seen = new Set();
    const dedupedUserAssets = (Array.isArray(safe.userAssets) ? safe.userAssets : []).filter((asset) => {
      const key = canonicalSymbolFromTicker(asset?.ticker);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      userAssets: dedupedUserAssets,
      removedIds: Array.isArray(safe.removedIds) ? safe.removedIds : []
    };
  }

  function readLocalPersistedState() {
    return sanitizePersistedState({
      userAssets: readJsonArray(STORAGE_KEY),
      removedIds: readJsonArray(REMOVED_KEY)
    });
  }

  function writeLocalPersistedState(state) {
    const safe = sanitizePersistedState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe.userAssets));
    localStorage.setItem(REMOVED_KEY, JSON.stringify(safe.removedIds));
  }

  async function loadPersistedState() {
    try {
      const response = await fetch("/api/ai-universe", { cache: "no-store" });
      if (!response.ok) throw new Error("state request failed");
      const payload = await response.json();
      persistedState = sanitizePersistedState(payload?.data);
      storageMode = payload?.mode || "supabase";
      writeLocalPersistedState(persistedState);
      return;
    } catch (_error) {
      if (isProductionClient) {
        persistedState = { userAssets: [], removedIds: [] };
        storageMode = "server-unavailable";
        return;
      }
      persistedState = readLocalPersistedState();
      storageMode = "local-cache";
    }
  }

  async function savePersistedState() {
    persistedState = sanitizePersistedState(persistedState);
    writeLocalPersistedState(persistedState);

    try {
      const response = await fetch("/api/ai-universe", {
        method: "PUT",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ data: persistedState })
      });
      if (!response.ok) throw new Error("save state failed");
      storageMode = "supabase";
    } catch (_error) {
      storageMode = isProductionClient ? "server-unavailable" : "local-cache";
    }
  }

  function saveUserAssets() {
    persistedState.userAssets = assets.filter((asset) => asset.is_user_added);
    savePersistedState();
  }

  function saveRemovedId(id) {
    const removedIds = new Set(persistedState.removedIds || []);
    removedIds.add(id);
    persistedState.removedIds = [...removedIds];
    savePersistedState();
  }

  function resetAssets() {
    const removedIds = loadRemovedIds();
    assets = dedupeAssetsByCanonicalTicker([
      ...seed.ai_boom_universe
        .filter((asset) => !removedIds.has(asset.id))
        .filter((asset) => !LEGACY_HIDDEN_IDS.has(asset.id))
        .map((asset) => scoring.enrichAsset(asset)),
      ...loadUserAssets()
    ]);
  }

  function uniqueValues(key) {
    return [...new Set(assets.map((asset) => asset[key]).filter(Boolean))].sort();
  }

  function fillSelect(select, values, label, selectedValue) {
    select.innerHTML = `<option value="">${label}</option>`;
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatLabel(value);
      select.appendChild(option);
    }
    if (selectedValue && values.includes(selectedValue)) select.value = selectedValue;
  }

  function refreshFilterOptions() {
    const selected = currentFilters();
    fillSelect(filters.layer, uniqueValues("layer"), "ทุกกลุ่มธุรกิจ", selected.layer);
    fillSelect(filters.assetType, uniqueValues("asset_type"), "ทุกประเภท", selected.asset_type);
    fillSelect(filters.riskLevel, uniqueValues("risk_level"), "ทุกระดับความเสี่ยง", selected.risk_level);
    fillSelect(filters.action, uniqueValues("initial_action"), "ทุกสถานะ", selected.initial_action);
  }

  function formatLabel(value) {
    return LABELS[value] || String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function currentFilters() {
    return {
      layer: filters.layer.value,
      asset_type: filters.assetType.value,
      risk_level: filters.riskLevel.value,
      initial_action: filters.action.value
    };
  }

  function assetMatchesSelects(asset, selected) {
    return Object.entries(selected).every(([key, value]) => !value || asset[key] === value);
  }

  function filterAssetsBySelects() {
    const selected = currentFilters();
    return assets.filter((asset) => assetMatchesSelects(asset, selected));
  }

  function renderSummary(groupedRows) {
    if (!summaryGrid) return;
    const cards = GROUPS.map((group) => {
      const count = (groupedRows[group.key] || []).length;
      return `
        <button type="button" class="ai-card summary-card ${group.tone}" data-summary-target="${escapeHtml(group.sectionId || "")}">
          <span>${escapeHtml(group.title)}</span>
          <strong>${count}</strong>
          <small>${escapeHtml(group.description)}</small>
          <small class="summary-hint">คลิกเพื่อดูรายการ</small>
        </button>`;
    }).join("");
    summaryGrid.innerHTML = cards;

    const focusedCount = [
      "new_bullish",
      "new_bearish",
      "bullish_watch",
      "bearish_watch"
    ].reduce((sum, key) => sum + (groupedRows[key] || []).length, 0);
    accumulateCount.textContent = String(focusedCount);
  }

  function safeNumber(value) {
    return Number.isFinite(value) ? Number(value) : null;
  }

  function formatPrice(value) {
    if (!Number.isFinite(value)) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-CA");
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  function isFresh(event) {
    return event && Number.isFinite(event.barsAgo) && event.barsAgo >= 0 && event.barsAgo <= FRESH_SIGNAL_DAYS;
  }

  function trendToneForGroup(groupKey) {
    if (groupKey === "new_bullish") return "badge-green";
    if (groupKey === "new_bearish") return "badge-red";
    if (groupKey === "bullish_watch") return "badge-yellow";
    if (groupKey === "bearish_watch") return "badge-orange";
    if (groupKey === "ongoing_bullish") return "badge-bluegreen";
    if (groupKey === "ongoing_bearish") return "badge-redgray";
    if (groupKey === "nav_waiting_technical") return "badge-slate";
    if (groupKey === "neutral") return "badge-gray";
    return "badge-light";
  }

  function getEmaCoreStatus(ema12, ema26) {
    if (!Number.isFinite(ema12) || !Number.isFinite(ema26)) {
      return {
        key: "EMA_NOT_AVAILABLE",
        badge: { text: "EMA Not Available", tone: "badge-light" }
      };
    }
    if (ema12 > ema26) {
      return {
        key: "EMA_BULLISH",
        badge: { text: "EMA Bullish", tone: "badge-green" }
      };
    }
    if (ema12 < ema26) {
      return {
        key: "EMA_BEARISH",
        badge: { text: "EMA Bearish", tone: "badge-red" }
      };
    }
    return {
      key: "EMA_NEUTRAL",
      badge: { text: "EMA Neutral", tone: "badge-gray" }
    };
  }

  function getSmaCoreStatus(close, sma200, smaStatus) {
    if (!Number.isFinite(close) || !Number.isFinite(sma200)) {
      return {
        key: "SMA_NOT_AVAILABLE",
        badge: { text: "SMA200 Not Available", tone: "badge-light" }
      };
    }
    const ratio = Math.abs((close - sma200) / Math.abs(sma200 || 1));
    if (ratio <= 0.001 || smaStatus === "AT_SMA200") {
      return {
        key: "AT_SMA200",
        badge: { text: "At SMA200", tone: "badge-gray" }
      };
    }
    if (close > sma200) {
      return {
        key: "ABOVE_SMA200",
        badge: { text: "Above SMA200", tone: "badge-green" }
      };
    }
    return {
      key: "BELOW_SMA200",
      badge: { text: "Below SMA200", tone: "badge-red" }
    };
  }

  function getCoreExplanation(emaKey, smaKey) {
    if (smaKey === "SMA_NOT_AVAILABLE") return "ข้อมูลยังไม่พอสำหรับคำนวณ SMA200";
    if (emaKey === "EMA_BULLISH" && smaKey === "ABOVE_SMA200") return "EMA เป็นขาขึ้น และราคายืนเหนือ SMA200";
    if (emaKey === "EMA_BULLISH" && smaKey === "BELOW_SMA200") return "EMA เป็นขาขึ้นแล้ว แต่ราคายังต่ำกว่า SMA200 จึงยังไม่ confirm เต็ม";
    if (emaKey === "EMA_BEARISH" && smaKey === "ABOVE_SMA200") return "EMA เริ่มอ่อนแรง แต่ราคายังยืนเหนือ SMA200";
    if (emaKey === "EMA_BEARISH" && smaKey === "BELOW_SMA200") return "EMA เป็นขาลง และราคาต่ำกว่า SMA200";
    if (emaKey === "EMA_NOT_AVAILABLE") return "ข้อมูล EMA ยังไม่พอสำหรับสรุปแนวโน้ม";
    return "สัญญาณยังไม่ชัดเจน";
  }

  function buildEvents(info) {
    const bullish = [];
    const bearish = [];
    // Only count a cross as a live event if the trend is still on the matching
    // side NOW — otherwise a whipsaw (e.g. reclaimed SMA200 then fell back below)
    // would surface a stale bullish badge on a name that has since turned bearish.
    const emaBull = info.ema.trend === "BULLISH";
    const emaBear = info.ema.trend === "BEARISH";
    const aboveSma = info.sma200.status === "ABOVE_SMA200";
    const belowSma = info.sma200.status === "BELOW_SMA200";
    if (emaBull && info.ema.recentCrossover?.signal === "BUY") {
      bullish.push({
        kind: "NEW_BULLISH_CROSS",
        date: info.ema.recentCrossover.signalDate,
        barsAgo: info.ema.recentCrossover.barsAgo,
        explanation: "EMA12 ตัดขึ้น EMA26"
      });
    }
    if (emaBear && info.ema.recentCrossover?.signal === "SELL") {
      bearish.push({
        kind: "NEW_BEARISH_CROSS",
        date: info.ema.recentCrossover.signalDate,
        barsAgo: info.ema.recentCrossover.barsAgo,
        explanation: "EMA12 ตัดลง EMA26"
      });
    }
    if (aboveSma && info.sma200.recentCrossover?.signal === "BULLISH_BREAKOUT") {
      bullish.push({
        kind: "PRICE_RECLAIM_SMA200",
        date: info.sma200.recentCrossover.signalDate,
        barsAgo: info.sma200.recentCrossover.barsAgo,
        explanation: "Close ตัดขึ้น SMA200"
      });
    }
    if (belowSma && info.sma200.recentCrossover?.signal === "BEARISH_BREAKDOWN") {
      bearish.push({
        kind: "PRICE_LOST_SMA200",
        date: info.sma200.recentCrossover.signalDate,
        barsAgo: info.sma200.recentCrossover.barsAgo,
        explanation: "Close ตัดลง SMA200"
      });
    }
    bullish.sort((a, b) => a.barsAgo - b.barsAgo);
    bearish.sort((a, b) => a.barsAgo - b.barsAgo);
    return { bullish, bearish };
  }

  function classifySignal(asset, info, events, marketData = null) {
    const latestClose = safeNumber(info.latestClose);
    const hasLatestPrice = Number.isFinite(latestClose) && Boolean(info.latestDate);
    const ema12 = safeNumber(info.ema.ema12);
    const ema26 = safeNumber(info.ema.ema26);
    const sma200 = safeNumber(info.sma200.sma200);
    const emaInsufficient = info.ema.signal === "INSUFFICIENT_DATA" || !Number.isFinite(ema12) || !Number.isFinite(ema26);
    const smaInsufficient = info.sma200.signal === "INSUFFICIENT_DATA" || !Number.isFinite(sma200);
    const insufficient = emaInsufficient && smaInsufficient;

    const emaBull = info.ema.trend === "BULLISH";
    const emaBear = info.ema.trend === "BEARISH";
    const smaAbove = info.sma200.status === "ABOVE_SMA200";
    const smaBelow = info.sma200.status === "BELOW_SMA200";

    const emaGapPct =
      Number.isFinite(ema12) && Number.isFinite(ema26) && ema26 !== 0
        ? ((ema12 - ema26) / Math.abs(ema26)) * 100
        : null;
    const absEmaGapRatio = Number.isFinite(emaGapPct) ? Math.abs(emaGapPct) / 100 : null;

    const smaDistancePct =
      Number.isFinite(latestClose) && Number.isFinite(sma200) && sma200 !== 0
        ? ((latestClose - sma200) / Math.abs(sma200)) * 100
        : null;
    const absSmaDistanceRatio = Number.isFinite(smaDistancePct) ? Math.abs(smaDistancePct) / 100 : null;

    const freshBullishEvents = events.bullish.filter(isFresh);
    const freshBearishEvents = events.bearish.filter(isFresh);
    const hasFreshBullish = freshBullishEvents.length > 0;
    const hasFreshBearish = freshBearishEvents.length > 0;

    const nearEmaBull = emaBear && Number.isFinite(absEmaGapRatio) && absEmaGapRatio <= NEAR_EMA_GAP;
    const nearEmaBear = emaBull && Number.isFinite(absEmaGapRatio) && absEmaGapRatio <= NEAR_EMA_GAP;
    const nearSmaBull = smaBelow && Number.isFinite(absSmaDistanceRatio) && absSmaDistanceRatio <= NEAR_SMA_DISTANCE;
    const nearSmaBear = smaAbove && Number.isFinite(absSmaDistanceRatio) && absSmaDistanceRatio <= NEAR_SMA_DISTANCE;

    const earlyBullish = (emaBull && !smaAbove) || (smaAbove && !emaBull);
    const earlyBearish = (emaBear && !smaBelow) || (smaBelow && !emaBear);

    const bullishCount = (emaBull ? 1 : 0) + (smaAbove ? 1 : 0);
    const bearishCount = (emaBear ? 1 : 0) + (smaBelow ? 1 : 0);

    const ongoingBullish = bullishCount > 0 && bearishCount === 0 && !hasFreshBullish;
    const ongoingBearish = bearishCount > 0 && bullishCount === 0 && !hasFreshBearish;

    const emaStatus = getEmaCoreStatus(ema12, ema26);
    const smaStatus = getSmaCoreStatus(latestClose, sma200, info.sma200.status);
    const coreExplanation = getCoreExplanation(emaStatus.key, smaStatus.key);
    const isNavAsset = isThaiMutualFundAsset(asset) || marketData?.marketAssetType === "Thai Mutual Fund";
    const waitingExplanation = isNavAsset
      ? "มี NAV ล่าสุดแล้ว แต่ข้อมูลย้อนหลังยังไม่พอสำหรับคำนวณ EMA/SMA200"
      : marketData?.historicalSourceLimited
        ? "มีราคาล่าสุดแล้ว แต่ผู้ให้บริการยังส่งข้อมูลย้อนหลังของสินทรัพย์นี้จำกัด ระบบจะสะสมย้อนหลังรายวันให้อัตโนมัติ"
        : "มีราคาล่าสุดแล้ว แต่ข้อมูลย้อนหลังยังไม่พอสำหรับคำนวณ EMA/SMA200";

    if (hasLatestPrice && !emaInsufficient && smaInsufficient) {
      return {
        groupKey: "nav_waiting_technical",
        mainClassification: "Latest Price/NAV Available",
        mainSetup: "Partial Technical Data Available",
        mainStatus: "Partial Technical Data Available",
        actionLabel: "รอข้อมูลย้อนหลัง",
        explanation: "มีข้อมูลเพียงพอสำหรับ EMA แต่ยังไม่พอสำหรับ SMA200",
        reasonBadges: [{ text: "SMA200 Not Available", tone: "badge-gray" }],
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (hasFreshBullish) {
      const primary = freshBullishEvents[0];
      return {
        groupKey: "new_bullish",
        mainClassification: "New Bullish Signal",
        mainSetup: SIGNAL_LABELS[primary?.kind] || "Bullish Setup",
        mainStatus: "New Bullish Signal",
        actionLabel: "Follow / Watch for pullback",
        explanation: coreExplanation,
        reasonBadges: freshBullishEvents.map((event) => ({
          text: SIGNAL_LABELS[event.kind],
          tone: "badge-green"
        })),
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: freshBullishEvents[0]?.date || info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (hasFreshBearish) {
      const primary = freshBearishEvents[0];
      return {
        groupKey: "new_bearish",
        mainClassification: "New Bearish Signal",
        mainSetup: SIGNAL_LABELS[primary?.kind] || "Bearish Setup",
        mainStatus: "New Bearish Signal",
        actionLabel: "Caution / Reduce risk",
        explanation: coreExplanation,
        reasonBadges: freshBearishEvents.map((event) => ({
          text: SIGNAL_LABELS[event.kind],
          tone: "badge-red"
        })),
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: freshBearishEvents[0]?.date || info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (insufficient) {
      if (hasLatestPrice) {
        const waitingBadges = [{ text: "Insufficient Historical Data", tone: "badge-gray" }];
        if (marketData?.historicalSourceLimited) {
          waitingBadges.unshift({ text: "Historical feed limited", tone: "badge-slate" });
        }
        return {
          groupKey: "nav_waiting_technical",
          mainClassification: isNavAsset ? "มี NAV ล่าสุด" : "มีราคาล่าสุด",
          mainSetup: "ข้อมูลย้อนหลังยังไม่พอ",
          mainStatus: "Latest Price/NAV Available",
          actionLabel: "รอข้อมูลย้อนหลัง",
          explanation: waitingExplanation,
          reasonBadges: waitingBadges,
          coreStatusBadges: [emaStatus.badge, smaStatus.badge],
          signalDate: info.latestDate,
          emaGapPct,
          smaDistancePct
        };
      }
      return {
        groupKey: "insufficient",
        mainClassification: "Insufficient Data",
        mainSetup: isNavAsset ? "NAV Not Available" : "Insufficient Data",
        mainStatus: "Insufficient Data",
        actionLabel: "Wait for more data",
        explanation:
          isNavAsset && marketData?.sourceType === "ERROR"
            ? (marketData.source || "Unable to fetch historical NAV from KAsset")
            : isNavAsset
              ? "ยังไม่พบ NAV ล่าสุดของกองทุน กรุณาลองรีเฟรชอีกครั้ง"
              : coreExplanation,
        reasonBadges: [],
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (!ongoingBullish && !ongoingBearish && (nearEmaBull || nearSmaBull || earlyBullish)) {
      const reasons = [];
      if (nearEmaBull) reasons.push({ text: SIGNAL_LABELS.NEAR_EMA_UP, tone: "badge-yellow" });
      if (nearSmaBull) reasons.push({ text: SIGNAL_LABELS.NEAR_SMA_RECLAIM, tone: "badge-yellow" });
      if (earlyBullish) reasons.push({ text: SIGNAL_LABELS.EARLY_BULLISH, tone: "badge-yellow" });
      const primarySetup = earlyBullish ? SIGNAL_LABELS.EARLY_BULLISH : SIGNAL_LABELS.NEAR_EMA_UP;
      return {
        groupKey: "bullish_watch",
        mainClassification: "Bullish Watchlist",
        mainSetup: primarySetup,
        mainStatus: "Bullish Watchlist",
        actionLabel: "Wait for confirmation",
        explanation: coreExplanation,
        reasonBadges: reasons,
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (!ongoingBullish && !ongoingBearish && (nearEmaBear || nearSmaBear || earlyBearish)) {
      const reasons = [];
      if (nearEmaBear) reasons.push({ text: SIGNAL_LABELS.NEAR_EMA_DOWN, tone: "badge-orange" });
      if (nearSmaBear) reasons.push({ text: SIGNAL_LABELS.NEAR_SMA_BREAKDOWN, tone: "badge-orange" });
      if (earlyBearish) reasons.push({ text: SIGNAL_LABELS.EARLY_BEARISH, tone: "badge-orange" });
      const primarySetup = earlyBearish ? SIGNAL_LABELS.EARLY_BEARISH : SIGNAL_LABELS.NEAR_EMA_DOWN;
      return {
        groupKey: "bearish_watch",
        mainClassification: "Bearish Watchlist",
        mainSetup: primarySetup,
        mainStatus: "Bearish Watchlist",
        actionLabel: "Watch risk",
        explanation: coreExplanation,
        reasonBadges: reasons,
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (ongoingBullish) {
      const isStrong = emaBull && smaAbove;
      const badges = [];
      if (emaBull) badges.push({ text: "EMA Bullish", tone: "badge-green" });
      if (smaAbove) badges.push({ text: "Above SMA200", tone: "badge-green" });
      return {
        groupKey: "ongoing_bullish",
        mainClassification: "Ongoing Bullish Trend",
        mainSetup: isStrong ? "Strong Bullish Trend" : "Bullish Trend",
        mainStatus: isStrong ? "Strong Bullish Trend" : "Bullish Trend",
        actionLabel: "Hold / Wait for pullback / Do not chase",
        explanation: "ขาขึ้นต่อเนื่อง ยังไม่มีสัญญาณตัดใหม่ใน 1-3 วัน",
        reasonBadges: badges,
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    if (ongoingBearish) {
      const isStrong = emaBear && smaBelow;
      const badges = [];
      if (emaBear) badges.push({ text: "EMA Bearish", tone: "badge-red" });
      if (smaBelow) badges.push({ text: "Below SMA200", tone: "badge-red" });
      return {
        groupKey: "ongoing_bearish",
        mainClassification: "Ongoing Bearish Trend",
        mainSetup: isStrong ? "Strong Bearish Trend" : "Bearish Trend",
        mainStatus: isStrong ? "Strong Bearish Trend" : "Bearish Trend",
        actionLabel: "Caution / Reduce risk",
        explanation: "ขาลงต่อเนื่อง ยังไม่มีสัญญาณกลับตัวใหม่",
        reasonBadges: badges,
        coreStatusBadges: [emaStatus.badge, smaStatus.badge],
        signalDate: info.latestDate,
        emaGapPct,
        smaDistancePct
      };
    }

    return {
      groupKey: "neutral",
      mainClassification: "Neutral / Sideway",
      mainSetup: "Mixed Signal",
      mainStatus: "Neutral / Sideway",
      actionLabel: "Wait / No action",
      explanation: coreExplanation,
      reasonBadges: [{ text: SIGNAL_LABELS.NEUTRAL, tone: "badge-gray" }],
      coreStatusBadges: [emaStatus.badge, smaStatus.badge],
      signalDate: info.latestDate,
      emaGapPct,
      smaDistancePct
    };
  }

  function analyzeAsset(asset, marketData) {
    const info = marketData.technical;
    const events = buildEvents(info);
    const classification = classifySignal(asset, info, events, marketData);
    // Single source of truth: defer the group decision to the shared engine
    // (window.Scoring.classifySignal) so AI Boom + Action Center stay identical.
    if (window.Scoring && typeof window.Scoring.classifySignal === "function") {
      try {
        const cx = info.ema.recentCrossover || {};
        const sx = info.sma200.recentCrossover || {};
        const shared = window.Scoring.classifySignal({
          ema12: info.ema.ema12, ema26: info.ema.ema26, sma200: info.sma200.sma200,
          latestPrice: info.latestClose, latestDate: info.latestDate,
          emaTrendStatus: info.ema.trend === "BULLISH" ? "EMA_BULLISH" : info.ema.trend === "BEARISH" ? "EMA_BEARISH" : undefined,
          sma200Status: info.sma200.status,
          daysSinceEmaBullishCross: cx.signal === "BUY" ? cx.barsAgo : null,
          daysSinceEmaBearishCross: cx.signal === "SELL" ? cx.barsAgo : null,
          daysSinceSma200Reclaim: sx.signal === "BULLISH_BREAKOUT" ? sx.barsAgo : null,
          daysSinceSma200Break: sx.signal === "BEARISH_BREAKDOWN" ? sx.barsAgo : null
        });
        if (shared && shared.groupKey) classification.groupKey = shared.groupKey;
      } catch (_e) { /* keep local classification */ }
    }
    return {
      asset,
      source: marketData.source,
      sourceType: marketData.sourceType || "",
      lastUpdated: marketData.lastUpdated || null,
      historicalSourceLimited: Boolean(marketData.historicalSourceLimited),
      latestLiveRows: Number.isFinite(marketData.latestLiveRows) ? marketData.latestLiveRows : null,
      sourceRange: marketData.sourceRange || null,
      marketSymbol: marketData.marketSymbol,
      navStatus: marketData.navStatus || "",
      fundName: marketData.fundName || "",
      marketAssetType: marketData.assetType || "",
      historyCount: marketData.historyCount,
      technical: info,
      events,
      classification
    };
  }

  function SignalFilterTabs() {
    return SIGNAL_FILTERS.map(
      (filter) =>
        `<button type="button" class="filter-tab ${filter.key === activeSignalFilter ? "is-active" : ""}" data-signal-filter="${filter.key}">${escapeHtml(filter.label)}</button>`
    ).join("");
  }

  function SignalBadge(text, tone) {
    return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
  }

  function sourceLabelForRow(row) {
    if (row.marketAssetType === "Thai Mutual Fund") {
      if (row.navStatus === "LIVE_NAV_KASSET" || row.navStatus === "LIVE_NAV_SETTRADE" || row.navStatus === "LIVE_NAV") return { text: "Live NAV", tone: "badge-bluegreen" };
      if (row.navStatus === "CACHED_NAV_HISTORY" || row.navStatus === "CACHED_NAV") return { text: "Cached NAV", tone: "badge-slate" };
      if (row.navStatus === "FALLBACK_NAV") return { text: "Fallback NAV", tone: "badge-orange" };
      return { text: "NAV Not Available", tone: "badge-light" };
    }
    switch (row.sourceType) {
      case "LIVE_MARKET_DATA":
        return { text: "Live market data", tone: "badge-green" };
      case "SERVER_CACHED_DATA":
        return { text: "Server cached data", tone: "badge-yellow" };
      case "BROWSER_CACHED_DATA":
        return { text: "Browser cached data", tone: "badge-bluegreen" };
      case "FALLBACK_DATA":
        return { text: "Fallback data", tone: "badge-redgray" };
      case "ERROR":
        return { text: "Unable to load market data", tone: "badge-light" };
      default:
        return { text: row.source || "Unknown source", tone: "badge-light" };
    }
  }

  function indicatorLine(label, value) {
    return `<span>${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
  }

  function renderCard(row) {
    const info = row.technical;
    const cls = row.classification;
    const trendTone = trendToneForGroup(cls.groupKey);
    const displayTicker = displaySymbolForAsset(row.asset);
    const displayName = row.fundName || displayNameForAsset(row.asset) || row.asset.ticker;
    const displayAssetType = row.asset.asset_type === "THAI_MUTUAL_FUND" ? "Thai Mutual Fund" : formatLabel(row.asset.asset_type);
    const reasonBadges = Array.isArray(cls.reasonBadges) ? cls.reasonBadges : [];
    const coreStatusBadges = Array.isArray(cls.coreStatusBadges) ? cls.coreStatusBadges : [];
    const coreStatusTexts = new Set(coreStatusBadges.map((badge) => badge.text));
    const dedupedReasonBadges = reasonBadges
      .filter((badge, index, array) => array.findIndex((x) => x.text === badge.text) === index)
      .filter((badge) => badge.text !== cls.mainStatus)
      .filter((badge) => badge.text !== cls.mainClassification)
      .filter((badge) => badge.text !== cls.mainSetup)
      .filter((badge) => !coreStatusTexts.has(badge.text))
      .slice(0, 3);
    const badges = dedupedReasonBadges.length ? dedupedReasonBadges.map((badge) => SignalBadge(badge.text, badge.tone)).join("") : "";
    const coreBadges = coreStatusBadges.length ? coreStatusBadges.map((badge) => SignalBadge(badge.text, badge.tone)).join("") : `${SignalBadge("EMA Not Available", "badge-light")}${SignalBadge("SMA200 Not Available", "badge-light")}`;
    const emaDays = Number.isFinite(info.ema.consecutiveTrendDays) && info.ema.consecutiveTrendDays > 0
      ? `${info.ema.consecutiveTrendDays} วัน`
      : "-";
    const smaDays = Number.isFinite(info.sma200.consecutiveStatusDays) && info.sma200.consecutiveStatusDays > 0
      ? `${info.sma200.consecutiveStatusDays} วัน`
      : "-";
    const showSmaExplain = cls.groupKey === "insufficient" || cls.groupKey === "nav_waiting_technical";
    const waitingExplainByAsset =
      row.marketAssetType === "Thai Mutual Fund" || isThaiMutualFundAsset(row.asset)
        ? "มี NAV ล่าสุดแล้ว แต่ข้อมูลย้อนหลังยังไม่พอสำหรับคำนวณ EMA/SMA200"
        : "มีราคาล่าสุดแล้ว แต่ข้อมูลย้อนหลังยังไม่พอสำหรับคำนวณ EMA/SMA200";
    const smaExplainText =
      cls.groupKey === "nav_waiting_technical"
        ? waitingExplainByAsset
        : "ต้องมีข้อมูลอย่างน้อย 200 วันทำการเพื่อคำนวณ SMA200";
    const groupClass = `signal-card-item ${cls.groupKey}`;
    const sourceLabel = sourceLabelForRow(row);
    const canonical = canonicalSymbolFromTicker(row.asset.ticker);

    const timingChip = window.Scoring
      ? (function () {
          try {
            const emaStatusKey =
              info.ema.trend === "BULLISH" ? "EMA_BULLISH" : info.ema.trend === "BEARISH" ? "EMA_BEARISH" : undefined;
            const sma200StatusKey =
              info.sma200.status === "ABOVE_SMA200" || info.sma200.status === "BELOW_SMA200" || info.sma200.status === "AT_SMA200"
                ? info.sma200.status
                : undefined;
            const timingInput = {
              latestPrice: safeNumber(info.latestClose),
              latestDate: info.latestDate || null,
              ema12: safeNumber(info.ema.ema12),
              ema26: safeNumber(info.ema.ema26),
              sma200: safeNumber(info.sma200.sma200),
              emaTrendStatus: emaStatusKey,
              sma200Status: sma200StatusKey,
              isNewBullishSignal: cls.groupKey === "new_bullish",
              isNewBearishSignal: cls.groupKey === "new_bearish",
              isBullishWatchlist: cls.groupKey === "bullish_watch",
              isOngoingBullishTrend: cls.groupKey === "ongoing_bullish",
              isOngoingBearishTrend: cls.groupKey === "ongoing_bearish",
              isHolding: Boolean(row.portfolio?.isHolding),
              portfolioWeight: safeNumber(row.portfolio?.weight),
              marketValue: safeNumber(row.portfolio?.marketValue),
              assetType: row.asset.asset_type,
              displaySymbol: displayTicker,
              canonicalSymbol: canonical
            };
            return window.Scoring.renderTimingChip(window.Scoring.calculateTimingScore(timingInput));
          } catch (_error) {
            return "";
          }
        })()
      : "";

    return `
      <article class="${groupClass}" data-canonical-symbol="${escapeHtml(canonical)}" data-group-key="${escapeHtml(cls.groupKey)}">
        <div class="signal-card-top-row">
          <h4><a href="/asset/${encodeURIComponent(row.marketSymbol || canonical || row.asset.ticker)}" class="asset-link">${escapeHtml(displayTicker)}</a></h4>
          ${timingChip}
          <strong>${formatPrice(info.latestClose)}</strong>
        </div>

        <div class="signal-card-second-row">
          <p>${escapeHtml(displayName)}</p>
          <span>${formatDate(info.latestDate)}</span>
        </div>

        <div class="signal-meta-row">
          <span>${escapeHtml(displayAssetType)}${row.asset.market ? ` · ${escapeHtml(row.asset.market)}` : ""}${row.asset.currency ? ` · ${escapeHtml(row.asset.currency)}` : ""}</span>
          <span>${escapeHtml(row.marketSymbol ? `Provider ${row.marketSymbol}` : row.lastUpdated ? `Updated ${formatDate(row.lastUpdated)}` : row.source || "-")}</span>
        </div>

        <div class="signal-main-line">
          ${SignalBadge(cls.mainClassification, trendTone)}
          ${
            row.portfolio?.isHolding
              ? SignalBadge(`Holding ${formatPrice(row.portfolio.marketValue)} · ${row.portfolio.weight.toFixed(1)}%`, "badge-blue")
              : SignalBadge("Watchlist Only", "badge-light")
          }
        </div>

        <div class="signal-main-line">
          ${SignalBadge(cls.mainSetup, "badge-navy")}
        </div>

        ${badges ? `<div class="signal-badges-wrap">${badges}</div>` : ""}

        <div class="signal-badges-wrap">
          ${SignalBadge(sourceLabel.text, sourceLabel.tone)}
        </div>

        <div class="core-status-wrap">
          <span>Core Status</span>
          <div class="core-status-badges">
            ${coreBadges}
          </div>
        </div>

        <div class="signal-indicators">
          ${indicatorLine("EMA12", Number.isFinite(info.ema.ema12) ? info.ema.ema12.toFixed(2) : "-")}
          ${indicatorLine("EMA26", Number.isFinite(info.ema.ema26) ? info.ema.ema26.toFixed(2) : "-")}
          ${indicatorLine("SMA200", Number.isFinite(info.sma200.sma200) ? info.sma200.sma200.toFixed(2) : "-")}
          ${indicatorLine("EMA gap", formatPercent(cls.emaGapPct))}
          ${indicatorLine("Distance to SMA200", formatPercent(cls.smaDistancePct))}
        </div>

        <div class="signal-extra">
          <span>วันที่สัญญาณ: ${formatDate(cls.signalDate)}</span>
          <span>EMA trend ต่อเนื่อง: ${emaDays}</span>
          <span>SMA status ต่อเนื่อง: ${smaDays}</span>
        </div>

        <p class="signal-description">${escapeHtml(cls.explanation)}</p>
        ${showSmaExplain ? `<p class="signal-description is-muted">${escapeHtml(smaExplainText)}</p>` : ""}

        <footer class="signal-card-footer">
          ${SignalBadge(cls.actionLabel, "badge-navy")}
          <button class="ai-delete-button" type="button" data-delete-id="${escapeHtml(row.asset.id)}">ลบ</button>
        </footer>
      </article>`;
  }

  function EmptySignalState(text) {
    return `<div class="signal-empty">${escapeHtml(text)}</div>`;
  }

  function SignalSectionRow(group, rows) {
    const cards = rows.length
      ? `<div class="signal-cards-wrap">${rows.map((row) => renderCard(row)).join("")}</div>`
      : EmptySignalState(group.empty);
    return `
      <section id="${escapeHtml(group.sectionId || "")}" class="signal-section-row ${group.tone}" data-group-key="${group.key}">
        <header class="signal-section-header">
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.description || "")}</p>
          </div>
          <span class="section-count">${rows.length}</span>
        </header>
        ${cards}
      </section>`;
  }

  function SignalFocusPanel(groupedRows, visibleGroups) {
    const focusRows = GROUPS
      .filter((group) => group.panel === "focus")
      .filter((group) => visibleGroups.has(group.key))
      .map((group) => SignalSectionRow(group, groupedRows[group.key] || []))
      .join("");
    if (!focusRows) return "";
    return `
      <section class="dashboard-panel focus-panel">
        <div class="dashboard-panel-title">
          <h2>Signal Focus</h2>
          <p>เฉพาะรายการที่เพิ่งเกิดสัญญาณหรือกำลังเข้าใกล้จุด trigger</p>
        </div>
        ${focusRows}
      </section>`;
  }

  function TrendStatusPanel(groupedRows, visibleGroups) {
    const trendRows = GROUPS
      .filter((group) => group.panel === "trend")
      .filter((group) => visibleGroups.has(group.key))
      .map((group) => SignalSectionRow(group, groupedRows[group.key] || []))
      .join("");
    if (!trendRows) return "";
    return `
      <section class="dashboard-panel trend-panel">
        <div class="dashboard-panel-title">
          <h2>Trend Status</h2>
          <p>แนวโน้มที่ดำเนินต่อเนื่อง และรายการที่ยังไม่ชัดเจน</p>
        </div>
        ${trendRows}
      </section>`;
  }

  function MarketSignalDashboard(groupedRows) {
    const visibleGroups = FILTER_GROUP_VISIBILITY[activeSignalFilter] || FILTER_GROUP_VISIBILITY.all;
    const focusPanel = SignalFocusPanel(groupedRows, visibleGroups);
    const trendPanel = TrendStatusPanel(groupedRows, visibleGroups);
    const content = `${focusPanel}${trendPanel}`.trim();
    return content || '<div class="asset-card-empty">ไม่พบรายการในหมวดที่เลือก</div>';
  }

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

  function validateTickerInput(rawTicker) {
    const input = String(rawTicker || "");
    if (!input.trim()) {
      return { ok: false, reason: "Ticker is empty." };
    }
    if (/[^A-Za-z0-9.^\-\s]/.test(input)) {
      return {
        ok: false,
        reason: "Ticker contains invalid characters. Allowed: letters, numbers, dot (.), caret (^), hyphen (-)."
      };
    }
    const normalized = normalizeTicker(input);
    if (!normalized) {
      return { ok: false, reason: "Ticker is invalid after normalization." };
    }
    return { ok: true, normalized, canonical: canonicalSymbolFromTicker(normalized) };
  }

  function detectAssetTypeBySymbol(symbol, selectedAssetType) {
    const canonical = canonicalSymbolFromTicker(symbol);
    const compact = canonical.replace(/[^A-Z0-9]/g, "");
    if (THAI_INDEX_METADATA[canonical]) return "THAI_INDEX";
    if (US_INDEX_ALIASES[canonical] || US_INDEX_ALIASES[compact] || canonical.startsWith("^")) return "INDEX";
    if (canonical.endsWith(".BK")) return "THAI_STOCK";
    if (THAI_MUTUAL_FUND_ALIASES[canonical] || THAI_MUTUAL_FUND_ALIASES[compact] || compact.includes("RMF")) {
      return "THAI_MUTUAL_FUND";
    }
    return selectedAssetType || "stock";
  }

  function providerRouteForAsset(asset) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    const compact = canonical.replace(/[^A-Z0-9]/g, "");
    if (!canonical) {
      return { provider: "none", providerSymbol: "", market: "", currency: "" };
    }
    if (THAI_INDEX_METADATA[canonical]) {
      return {
        provider: "yahoo-thai-index",
        providerSymbol: canonical,
        market: THAI_INDEX_METADATA[canonical].market,
        currency: THAI_INDEX_METADATA[canonical].currency
      };
    }
    if (canonical.startsWith("^")) {
      return { provider: "yahoo-index", providerSymbol: canonical, market: "INDEX", currency: "USD" };
    }
    if (canonical.endsWith(".BK")) {
      return { provider: "yahoo-thai-stock", providerSymbol: canonical, market: "SET", currency: "THB" };
    }
    if (THAI_MUTUAL_FUND_ALIASES[canonical] || THAI_MUTUAL_FUND_ALIASES[compact]) {
      return { provider: "kasset-thai-mutual-fund", providerSymbol: canonical, market: "TH_FUND", currency: "THB" };
    }
    return { provider: "yahoo-us-market", providerSymbol: canonical, market: "US", currency: "USD" };
  }

  function displaySymbolForAsset(asset) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    if (THAI_INDEX_METADATA[canonical]) return THAI_INDEX_METADATA[canonical].displaySymbol;
    if (asset?.asset_type === "THAI_STOCK" && canonical.endsWith(".BK")) return canonical.slice(0, -3);
    return canonical || String(asset?.ticker || "");
  }

  function displayNameForAsset(asset) {
    const canonical = canonicalSymbolFromTicker(asset?.ticker || "");
    if (THAI_INDEX_METADATA[canonical]) return THAI_INDEX_METADATA[canonical].displayName;
    return asset?.name || canonical || "";
  }

  function dedupeAssetsByCanonicalTicker(list) {
    const seen = new Set();
    const result = [];
    for (const asset of list) {
      const key = canonicalSymbolFromTicker(asset?.ticker);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(asset);
    }
    return result;
  }

  function isThaiMutualFundAsset(asset) {
    return asset.asset_type === "THAI_MUTUAL_FUND" || asset.asset_type === "fund";
  }

  async function getPriceSeries(asset, options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const cacheKey = `${asset.ticker}:${asset.layer}:${asset.id}`;
    const route = providerRouteForAsset(asset);
    if (!forceRefresh && priceCache.has(cacheKey)) {
      const cached = priceCache.get(cacheKey);
      return {
        ...cached,
        sourceType: "BROWSER_CACHED_DATA",
        source: "Browser cached data",
        lastUpdated: cached.lastUpdated || null
      };
    }

    const symbol = getYahooSymbol(asset);
    if (isDevClient) {
      console.log("[add-ticker-debug:provider-route]", {
        rawInput: asset.ticker,
        normalizedSymbol: normalizeTicker(asset.ticker),
        canonicalSymbol: canonicalSymbolFromTicker(asset.ticker),
        displaySymbol: displaySymbolForAsset(asset),
        assetType: asset.asset_type,
        providerSymbol: route.providerSymbol || symbol,
        providerSelected: route.provider || "unknown",
        validationResult: Boolean(symbol)
      });
    }
    if (!symbol) {
      const empty = {
        marketSymbol: "",
        source: isThaiMutualFundAsset(asset) ? "รอข้อมูล NAV" : "No market data source",
        sourceType: "ERROR",
        lastUpdated: null,
        historyCount: 0,
        technical: calculateTechnical(asset.ticker, [], [])
      };
      priceCache.set(cacheKey, empty);
      return empty;
    }

    try {
      const history = await fetchPriceHistoryFromServer(symbol, { forceRefresh });
      const sourceText = history.source || (symbol === asset.ticker ? `Daily close (${symbol})` : `Daily close proxy (${symbol})`);
      const result = {
        marketSymbol: symbol,
        source: sourceText,
        sourceType: history.sourceType || "LIVE_MARKET_DATA",
        lastUpdated: history.lastUpdated || null,
        historicalSourceLimited: Boolean(history.historicalSourceLimited),
        latestLiveRows: Number.isFinite(history.latestLiveRows) ? history.latestLiveRows : null,
        sourceRange: history.sourceRange || null,
        navStatus: history.navStatus || "",
        assetType: history.assetType || "",
        fundName: history.fundName || "",
        historyCount: history.closes.length,
        technical: calculateTechnical(asset.ticker, history.closes, history.dates)
      };
      if (isDevClient) {
        console.log("[add-ticker-debug:fetch-result]", {
          symbol: asset.ticker,
          displaySymbol: displaySymbolForAsset(asset),
          providerSymbol: symbol,
          fetchResult: "ok",
          sourceType: result.sourceType,
          historyCount: result.historyCount
        });
      }
      priceCache.set(cacheKey, result);
      return result;
    } catch (_error) {
      const errorMessage = _error && _error.message ? String(_error.message) : "Unable to load market data";
      const errorCode = _error && _error.code ? String(_error.code) : "";
      const empty = {
        marketSymbol: symbol,
        source: isThaiMutualFundAsset(asset) ? errorMessage : "Unable to load market data",
        sourceType: "ERROR",
        lastUpdated: null,
        historicalSourceLimited: false,
        latestLiveRows: null,
        sourceRange: null,
        errorCode,
        navStatus: "",
        assetType: isThaiMutualFundAsset(asset) ? "Thai Mutual Fund" : "",
        fundName: "",
        historyCount: 0,
        technical: calculateTechnical(asset.ticker, [], [])
      };
      if (isDevClient) {
        console.log("[add-ticker-debug:fetch-result]", {
          symbol: asset.ticker,
          displaySymbol: displaySymbolForAsset(asset),
          providerSymbol: symbol,
          fetchResult: "error",
          errorMessage,
          errorCode
        });
      }
      priceCache.set(cacheKey, empty);
      return empty;
    }
  }

  function calculateTechnical(symbol, closes, dates) {
    if (!technical) {
      return {
        symbol,
        latestClose: closes.length ? closes[closes.length - 1] : null,
        latestDate: dates.length ? dates[dates.length - 1] : null,
        ema: {
          ema12: null,
          ema26: null,
          signal: "INSUFFICIENT_DATA",
          trend: "UNKNOWN",
          signalDate: null,
          recentCrossover: null,
          consecutiveTrendDays: 0
        },
        sma200: {
          sma200: null,
          signal: "INSUFFICIENT_DATA",
          status: "UNKNOWN",
          signalDate: null,
          recentCrossover: null,
          consecutiveStatusDays: 0
        }
      };
    }
    return technical.calculateTechnicalSignalsForAsset({ symbol, closes, dates });
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
    return "";
  }

  async function fetchPriceHistoryFromServer(symbol, options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const url = `/api/market-data?symbol=${encodeURIComponent(symbol)}${forceRefresh ? "&refresh=1" : ""}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      let errorMessage = "price request failed";
      let errorCode = "";
      try {
        const errorPayload = await response.json();
        errorMessage = errorPayload?.error || errorMessage;
        errorCode = errorPayload?.code || "";
      } catch (_error) {
        // Ignore parse errors and keep fallback message
      }
      const requestError = new Error(errorMessage);
      requestError.code = errorCode;
      throw requestError;
    }
    const payload = await response.json();
    const dates = Array.isArray(payload.dates) ? payload.dates : [];
    const closes = Array.isArray(payload.closes) ? payload.closes : [];
    const rows = [];
    for (let index = 0; index < Math.min(dates.length, closes.length); index += 1) {
      const date = String(dates[index] || "");
      const close = closes[index];
      if (!date || !Number.isFinite(close)) continue;
      rows.push({ date, close: Number(close) });
    }
    rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return {
      dates: rows.map((row) => row.date),
      closes: rows.map((row) => row.close),
      source: payload.source || "",
      provider: payload.provider || "",
      navStatus: payload.navStatus || "",
      sourceType: payload.sourceType || "",
      lastUpdated: payload.lastUpdated || null,
      assetType: payload.assetType || "",
      fundName: payload.fundName || "",
      historicalSourceLimited: Boolean(payload.historicalSourceLimited),
      latestLiveRows: Number.isFinite(payload.latestLiveRows) ? Number(payload.latestLiveRows) : null,
      sourceRange: payload.sourceRange || null
    };
  }

  function groupRows(analyses) {
    const grouped = {};
    for (const group of GROUPS) grouped[group.key] = [];
    for (const row of analyses) {
      const key = row.classification.groupKey;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    if (window.PortfolioCore) {
      for (const key of Object.keys(grouped)) grouped[key].sort(window.PortfolioCore.comparePortfolioPriority);
    }
    return grouped;
  }

  async function renderDashboard(options = {}) {
    const forceRefresh = Boolean(options.forceRefresh);
    const myRenderVersion = ++renderVersion;
    const selectedFilters = currentFilters();
    const allAssets = dedupeAssetsByCanonicalTicker(assets);
    assetCardGrid.innerHTML = '<div class="asset-card-empty">กำลังคำนวณสัญญาณ...</div>';

    const analyzeOne = async (asset) => {
      const marketData = await getPriceSeries(asset, { forceRefresh });
      const analysis = analyzeAsset(asset, marketData);
      if (isDevClient) {
        console.log("[market-data-debug]", {
          symbol: analysis.asset.ticker,
          sourceUsed: analysis.sourceType || "UNKNOWN",
          lastUpdated: analysis.lastUpdated || null,
          error: analysis.sourceType === "ERROR" ? analysis.source : ""
        });
      }
      return analysis;
    };
    const rawAnalyses = window.mapWithConcurrency
      ? await window.mapWithConcurrency(allAssets, 5, analyzeOne)
      : await Promise.all(allAssets.map(analyzeOne));
    const totalValue = window.PortfolioCore ? window.PortfolioCore.totalMarketValue(portfolioHoldings) : 0;
    const analyses = window.PortfolioCore
      ? rawAnalyses.map((row) => window.PortfolioCore.enrichWithHolding(row, portfolioHoldings, totalValue))
      : rawAnalyses;
    if (myRenderVersion !== renderVersion) return;

    latestAnalysesByCanonical = new Map();
    for (const row of analyses) {
      latestAnalysesByCanonical.set(canonicalSymbolFromTicker(row.asset.ticker), row);
    }

    const visibleBySelectRows = analyses.filter((row) => assetMatchesSelects(row.asset, selectedFilters));

    signalFilterTabs.innerHTML = SignalFilterTabs();
    const grouped = groupRows(visibleBySelectRows);
    renderSummary(grouped);

    assetCardGrid.innerHTML = MarketSignalDashboard(grouped);

    if (pendingRevealCanonical) {
      const target = [...assetCardGrid.querySelectorAll("[data-canonical-symbol]")].find(
        (node) => node.dataset.canonicalSymbol === pendingRevealCanonical
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("is-highlight");
        window.setTimeout(() => target.classList.remove("is-highlight"), 1500);
      }
      pendingRevealCanonical = "";
    }
  }

  function makeUserAsset(ticker, name, layer, assetType) {
    const upperTicker = canonicalSymbolFromTicker(ticker);
    const resolvedAssetType = detectAssetTypeBySymbol(upperTicker, assetType);
    const route = providerRouteForAsset({ ticker: upperTicker, asset_type: resolvedAssetType });
    const isThailandAsset =
      resolvedAssetType === "fund" ||
      resolvedAssetType === "dr" ||
      resolvedAssetType === "THAI_MUTUAL_FUND" ||
      resolvedAssetType === "THAI_STOCK" ||
      resolvedAssetType === "THAI_INDEX";
    const quality = layer === "upstream_ai" || layer === "data_center_cloud" ? 8 : 7;
    const hype = layer === "growth_optional" || layer === "upstream_ai" ? 7 : 5;
    const valuation = layer === "thai_funds" ? 5 : 6;
    const defaultDisplayName =
      THAI_INDEX_METADATA[upperTicker]?.displayName ||
      `${displaySymbolForAsset({ ticker: upperTicker, asset_type: resolvedAssetType })} placeholder`;
    return scoring.enrichAsset({
      id: `user-${upperTicker}-${Date.now()}`,
      ticker: upperTicker,
      name: name.trim() || defaultDisplayName,
      asset_type: resolvedAssetType,
      country: isThailandAsset ? "Thailand" : "US",
      market: route.market || "",
      currency: route.currency || "",
      provider_symbol: route.providerSymbol || upperTicker,
      theme: seed.theme,
      sub_theme: "User added watchlist item",
      layer,
      investment_thesis: "เพิ่มเองเพื่อเฝ้าดูในธีม AI Data Center Supercycle",
      risk_level: hype >= 7 ? "high" : "medium",
      quality_score: quality,
      momentum_score: 4,
      hype_risk_score: hype,
      valuation_risk_score: valuation,
      final_score: null,
      initial_action: null,
      thai_access:
        resolvedAssetType === "fund" || resolvedAssetType === "THAI_MUTUAL_FUND"
          ? "Thai Fund"
          : resolvedAssetType === "THAI_INDEX"
            ? "Thai Index"
            : resolvedAssetType === "dr"
              ? "DR / DRx"
              : "Direct",
      notes: "รายการที่ผู้ใช้เพิ่มเอง คะแนนเป็นค่าเริ่มต้นแบบ mock",
      mock_signals: {
        price_vs_moving_averages: hype,
        valuation_vs_historical_average: valuation,
        rsi: hype,
        sentiment: hype,
        outperformance_vs_benchmark: 5
      },
      is_user_added: true,
      created_at: new Date().toISOString()
    });
  }

  function getGroupTitle(groupKey) {
    return GROUPS.find((group) => group.key === groupKey)?.title || "watchlist";
  }

  function clearTickerFeedback() {
    if (!tickerFeedback) return;
    tickerFeedback.innerHTML = "";
    tickerFeedback.classList.remove("is-error", "is-info");
  }

  function setTickerFeedback(message, options = {}) {
    if (!tickerFeedback) return;
    const tone = options.tone || "info";
    tickerFeedback.classList.remove("is-error", "is-info");
    tickerFeedback.classList.add(tone === "error" ? "is-error" : "is-info");
    const actionButton = options.showExistingSymbol
      ? `<button type="button" class="ticker-feedback-action" data-show-symbol="${escapeHtml(options.showExistingSymbol)}">Show existing item</button>`
      : "";
    tickerFeedback.innerHTML = `<span>${escapeHtml(message)}</span>${actionButton}`;
  }

  function findExistingAsset(symbol) {
    const canonicalSymbol = canonicalSymbolFromTicker(symbol);
    if (!canonicalSymbol) {
      return { exists: false, canonicalSymbol: "" };
    }

    const existingAsset = assets.find((asset) => canonicalSymbolFromTicker(asset.ticker) === canonicalSymbol);
    if (!existingAsset) {
      return { exists: false, canonicalSymbol };
    }

    const analysis = latestAnalysesByCanonical.get(canonicalSymbol);
    const section = analysis ? getGroupTitle(analysis.classification.groupKey) : undefined;
    const selected = currentFilters();
    const visibleBySelect = assetMatchesSelects(existingAsset, selected);
    const visibleGroups = FILTER_GROUP_VISIBILITY[activeSignalFilter] || FILTER_GROUP_VISIBILITY.all;
    const visibleBySignal = analysis ? visibleGroups.has(analysis.classification.groupKey) : false;

    return {
      exists: true,
      canonicalSymbol,
      section,
      source: storageMode === "supabase" ? "database" : storageMode === "local-cache" ? "localStorage" : "server",
      visibleInCurrentFilter: Boolean(visibleBySelect && visibleBySignal)
    };
  }

  async function fetchServerStateDirect() {
    const response = await fetch("/api/ai-universe", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      state: sanitizePersistedState(payload?.data),
      mode: payload?.mode || "supabase"
    };
  }

  async function clearStaleLocalDuplicate(canonicalSymbol) {
    try {
      const remote = await fetchServerStateDirect();
      if (!remote || remote.mode !== "supabase") return false;

      const remoteSet = new Set(
        (remote.state.userAssets || []).map((asset) => canonicalSymbolFromTicker(asset?.ticker)).filter(Boolean)
      );
      if (remoteSet.has(canonicalSymbol)) return false;

      const localHas = (persistedState.userAssets || []).some(
        (asset) => canonicalSymbolFromTicker(asset?.ticker) === canonicalSymbol
      );
      if (!localHas) return false;

      persistedState.userAssets = (persistedState.userAssets || []).filter(
        (asset) => canonicalSymbolFromTicker(asset?.ticker) !== canonicalSymbol
      );
      assets = dedupeAssetsByCanonicalTicker(
        assets.filter((asset) => !(asset.is_user_added && canonicalSymbolFromTicker(asset.ticker) === canonicalSymbol))
      );
      writeLocalPersistedState(persistedState);
      storageMode = "supabase";
      return true;
    } catch (_error) {
      return false;
    }
  }

  function revealExistingAsset(canonicalSymbol) {
    Object.values(filters).forEach((select) => {
      select.value = "";
    });
    activeSignalFilter = "all";
    pendingRevealCanonical = canonicalSymbol;
    refreshFilterOptions();
    renderDashboard();
  }

  function scrollToSection(sectionId) {
    const target = sectionId ? document.getElementById(sectionId) : null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("is-summary-highlight");
    window.setTimeout(() => target.classList.remove("is-summary-highlight"), 1600);
  }

  async function handleAddTicker(event) {
    event.preventDefault();
    clearTickerFeedback();
    const rawInput = tickerInput.value;
    const validation = validateTickerInput(rawInput);
    if (!validation.ok) {
      tickerInput.setCustomValidity(validation.reason || "Invalid ticker");
      tickerInput.reportValidity();
      if (isDevClient) {
        console.log("[add-ticker-debug]", {
          rawInput,
          normalizedSymbol: normalizeTicker(rawInput),
          canonicalSymbol: "",
          displaySymbol: "",
          assetType: "",
          providerSymbol: "",
          providerSelected: "",
          validationResult: false,
          fetchResult: "not-run",
          errorMessage: validation.reason || "Invalid ticker"
        });
      }
      return;
    }
    tickerInput.setCustomValidity("");
    const ticker = validation.canonical;
    const detectedAssetType = detectAssetTypeBySymbol(ticker, newAssetTypeInput.value);
    const route = providerRouteForAsset({ ticker, asset_type: detectedAssetType });
    const displaySymbol = displaySymbolForAsset({ ticker, asset_type: detectedAssetType });
    if (isDevClient) {
      console.log("[add-ticker-debug]", {
        rawInput,
        normalizedSymbol: validation.normalized,
        canonicalSymbol: ticker,
        displaySymbol,
        assetType: detectedAssetType,
        providerSymbol: route.providerSymbol,
        providerSelected: route.provider,
        validationResult: true,
        fetchResult: "pending",
        errorMessage: ""
      });
    }

    const existing = findExistingAsset(ticker);
    if (existing.exists) {
      const staleCleared = await clearStaleLocalDuplicate(existing.canonicalSymbol);
      if (staleCleared) {
        tickerInput.setCustomValidity("");
        setTickerFeedback(`${existing.canonicalSymbol}: ล้าง cache เก่าแล้ว สามารถเพิ่มใหม่ได้`, { tone: "info" });
      } else {
        const inSection = existing.section ? ` under ${existing.section}` : "";
        const hiddenMessage = existing.visibleInCurrentFilter
          ? `${existing.canonicalSymbol} already exists in your watchlist${inSection}.`
          : `${existing.canonicalSymbol} already exists but is hidden by the current filter. Switch to All to view it.`;
        tickerInput.setCustomValidity(hiddenMessage);
        setTickerFeedback(hiddenMessage, {
          tone: "error",
          showExistingSymbol: existing.canonicalSymbol
        });
        tickerInput.reportValidity();
        return;
      }
    }

    const existsAfterCleanup = findExistingAsset(ticker);
    if (existsAfterCleanup.exists) {
      tickerInput.setCustomValidity(`${existsAfterCleanup.canonicalSymbol} already exists in your watchlist.`);
      tickerInput.reportValidity();
      return;
    }

    tickerInput.setCustomValidity("");
    assets = dedupeAssetsByCanonicalTicker([
      ...assets,
      makeUserAsset(ticker, nameInput.value, newLayerInput.value, detectedAssetType)
    ]);
    saveUserAssets();
    form.reset();
    refreshFilterOptions();
    setTickerFeedback(`เพิ่ม ${ticker} สำเร็จ`, { tone: "info", showExistingSymbol: ticker });
    renderDashboard();
  }

  function handleDelete(event) {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;
    const id = button.dataset.deleteId;
    const asset = assets.find((item) => item.id === id);
    if (!asset) return;
    if (!asset.is_user_added) saveRemovedId(id);
    assets = assets.filter((item) => item.id !== id);
    saveUserAssets();
    refreshFilterOptions();
    renderDashboard();
  }

  function handleSignalTabClick(event) {
    const button = event.target.closest("[data-signal-filter]");
    if (!button) return;
    const nextFilter = button.dataset.signalFilter;
    if (!nextFilter || nextFilter === activeSignalFilter) return;
    activeSignalFilter = nextFilter;
    renderDashboard();
  }

  function handleRefreshMarketData() {
    priceCache.clear();
    renderDashboard({ forceRefresh: true });
  }

  function handleSummaryCardClick(event) {
    const button = event.target.closest("[data-summary-target]");
    if (!button) return;
    const sectionId = String(button.dataset.summaryTarget || "");
    if (!sectionId) return;
    const target = document.getElementById(sectionId);
    if (target) {
      scrollToSection(sectionId);
      return;
    }
    activeSignalFilter = "all";
    renderDashboard();
    window.setTimeout(() => scrollToSection(sectionId), 180);
  }

  function handleTickerFeedbackClick(event) {
    const button = event.target.closest("[data-show-symbol]");
    if (!button) return;
    const symbol = canonicalSymbolFromTicker(button.dataset.showSymbol);
    if (!symbol) return;
    revealExistingAsset(symbol);
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

  async function initialize() {
    await loadPersistedState();
    if (window.PortfolioCore) {
      const holdingResult = await window.PortfolioCore.loadHoldings();
      portfolioHoldings = holdingResult.holdings;
    }
    resetAssets();
    refreshFilterOptions();
    const focusSymbol = new URLSearchParams(window.location.search).get("focus");
    if (focusSymbol) pendingRevealCanonical = canonicalSymbolFromTicker(focusSymbol);
    renderDashboard();
  }

  Object.values(filters).forEach((select) => select.addEventListener("change", renderDashboard));
  tickerInput.addEventListener("input", () => {
    tickerInput.setCustomValidity("");
    clearTickerFeedback();
  });
  form.addEventListener("submit", handleAddTicker);
  if (tickerFeedback) tickerFeedback.addEventListener("click", handleTickerFeedbackClick);
  assetCardGrid.addEventListener("click", handleDelete);
  signalFilterTabs.addEventListener("click", handleSignalTabClick);
  if (summaryGrid) summaryGrid.addEventListener("click", handleSummaryCardClick);
  if (refreshMarketDataButton) refreshMarketDataButton.addEventListener("click", handleRefreshMarketData);
  if (syncWatchlistButton) {
    syncWatchlistButton.addEventListener("click", async () => {
      if (!window.AIBoomWatchlistSync || typeof window.AIBoomWatchlistSync.sync !== "function") {
        if (tickerFeedback) tickerFeedback.textContent = "ระบบ Watchlist ยังไม่พร้อม ลองรีเฟรชหน้า";
        return;
      }
      const label = syncWatchlistButton.textContent;
      syncWatchlistButton.disabled = true;
      syncWatchlistButton.textContent = "กำลัง sync...";
      try {
        const res = await window.AIBoomWatchlistSync.sync({ archiveMissing: true });
        if (tickerFeedback) {
          tickerFeedback.textContent = res
            ? `Sync เข้า Watchlist แล้ว · เพิ่ม ${res.added} · อัปเดต ${res.updated} · เก็บเข้าคลัง ${res.archived} (ดูที่เมนู Watchlist)`
            : "ไม่พบข้อมูลให้ sync";
        }
      } catch (_error) {
        if (tickerFeedback) tickerFeedback.textContent = "Sync ไม่สำเร็จ";
      } finally {
        syncWatchlistButton.disabled = false;
        syncWatchlistButton.textContent = label;
      }
    });
  }
  initialize();
})();
