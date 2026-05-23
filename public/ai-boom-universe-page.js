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
      title: "New Bullish Signals",
      description: "สัญญาณบวกใหม่ในช่วง 1-3 วันทำการ",
      empty: "ยังไม่มี bullish signal ใหม่",
      tone: "group-green"
    },
    {
      key: "new_bearish",
      panel: "focus",
      title: "New Bearish Signals",
      description: "สัญญาณลบใหม่ในช่วง 1-3 วันทำการ",
      empty: "ยังไม่มี bearish signal ใหม่",
      tone: "group-red"
    },
    {
      key: "bullish_watch",
      panel: "focus",
      title: "Bullish Watchlist",
      description: "ใกล้ยืนยันขาขึ้น แต่ยังต้องรอ confirmation",
      empty: "ยังไม่มีตัวที่เข้า bullish watchlist",
      tone: "group-amber"
    },
    {
      key: "bearish_watch",
      panel: "focus",
      title: "Bearish Watchlist",
      description: "เริ่มอ่อนแรงหรือใกล้หลุดแนวรับหลัก",
      empty: "ยังไม่มีตัวที่เข้า bearish watchlist",
      tone: "group-orange"
    },
    {
      key: "ongoing_bullish",
      panel: "trend",
      title: "Ongoing Bullish Trend",
      description: "แนวโน้มบวกต่อเนื่อง แต่ยังไม่มี cross ใหม่",
      empty: "ยังไม่มีตัวที่อยู่ในขาขึ้นต่อเนื่อง",
      tone: "group-bluegreen"
    },
    {
      key: "ongoing_bearish",
      panel: "trend",
      title: "Ongoing Bearish Trend",
      description: "แนวโน้มลบต่อเนื่อง ต้องระวังความเสี่ยง",
      empty: "ยังไม่มีตัวที่อยู่ในขาลงต่อเนื่อง",
      tone: "group-redgray"
    },
    {
      key: "neutral",
      panel: "trend",
      title: "Neutral / Sideway",
      description: "สัญญาณยังผสมและยังไม่ชัดเจน",
      empty: "ยังไม่มีตัวที่เป็น neutral / sideway",
      tone: "group-gray"
    },
    {
      key: "insufficient",
      panel: "trend",
      title: "Insufficient Data",
      description: "ข้อมูลยังไม่ถึงเกณฑ์คำนวณสัญญาณครบชุด",
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
    insufficient: new Set(["insufficient"])
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
  const count = document.querySelector("#assetCount");
  const waitCount = document.querySelector("#waitCount");
  const accumulateCount = document.querySelector("#accumulateCount");
  const warningCount = document.querySelector("#warningCount");
  const activeFilterText = document.querySelector("#activeFilterText");

  let assets = [];
  let activeSignalFilter = "all";
  let renderVersion = 0;
  let persistedState = { userAssets: [], removedIds: [] };
  let storageMode = "supabase";

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
    return {
      userAssets: Array.isArray(safe.userAssets) ? safe.userAssets : [],
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
      storageMode = "local-cache";
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
    assets = [
      ...seed.ai_boom_universe
        .filter((asset) => !removedIds.has(asset.id))
        .filter((asset) => !LEGACY_HIDDEN_IDS.has(asset.id))
        .map((asset) => scoring.enrichAsset(asset)),
      ...loadUserAssets()
    ];
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

  function filterAssetsBySelects() {
    const selected = currentFilters();
    return assets.filter((asset) => Object.entries(selected).every(([key, value]) => !value || asset[key] === value));
  }

  function renderSummary(allRows, shownCount) {
    count.textContent = shownCount;
    waitCount.textContent = allRows.filter((row) => row.asset.initial_action === "Wait for pullback").length;
    accumulateCount.textContent = allRows.filter((row) => row.asset.initial_action === "Accumulate").length;
    warningCount.textContent = allRows.filter((row) => row.asset.warning).length;
    const selected = Object.entries(currentFilters()).filter(([, value]) => value);
    const activeFilterLabel = SIGNAL_FILTERS.find((item) => item.key === activeSignalFilter)?.label || "All";
    activeFilterText.textContent = selected.length
      ? `${selected.map(([key, value]) => `${formatLabel(key)}: ${formatLabel(value)}`).join(" · ")} · ${activeFilterLabel}`
      : `แสดง ${activeFilterLabel} ในธีม AI Data Center`;
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
    if (info.ema.recentCrossover?.signal === "BUY") {
      bullish.push({
        kind: "NEW_BULLISH_CROSS",
        date: info.ema.recentCrossover.signalDate,
        barsAgo: info.ema.recentCrossover.barsAgo,
        explanation: "EMA12 ตัดขึ้น EMA26"
      });
    }
    if (info.ema.recentCrossover?.signal === "SELL") {
      bearish.push({
        kind: "NEW_BEARISH_CROSS",
        date: info.ema.recentCrossover.signalDate,
        barsAgo: info.ema.recentCrossover.barsAgo,
        explanation: "EMA12 ตัดลง EMA26"
      });
    }
    if (info.sma200.recentCrossover?.signal === "BULLISH_BREAKOUT") {
      bullish.push({
        kind: "PRICE_RECLAIM_SMA200",
        date: info.sma200.recentCrossover.signalDate,
        barsAgo: info.sma200.recentCrossover.barsAgo,
        explanation: "Close ตัดขึ้น SMA200"
      });
    }
    if (info.sma200.recentCrossover?.signal === "BEARISH_BREAKDOWN") {
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

  function classifySignal(asset, info, events) {
    const latestClose = safeNumber(info.latestClose);
    const ema12 = safeNumber(info.ema.ema12);
    const ema26 = safeNumber(info.ema.ema26);
    const sma200 = safeNumber(info.sma200.sma200);
    const insufficient = info.ema.signal === "INSUFFICIENT_DATA" || info.sma200.signal === "INSUFFICIENT_DATA";

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
      const isThaiFund = isThaiMutualFundAsset(asset);
      return {
        groupKey: "insufficient",
        mainClassification: "Insufficient Data",
        mainSetup: isThaiFund ? "รอข้อมูล NAV" : "Insufficient Data",
        mainStatus: "Insufficient Data",
        actionLabel: "Wait for more data",
        explanation: isThaiFund ? "ข้อมูลยังไม่พอสำหรับคำนวณ SMA200 และกำลังรอข้อมูล NAV" : coreExplanation,
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
      if (nearEmaBear) reasons.push({ text: SIGNAL_LABELS.NEAR_EMA_DOWN, tone: "badge-red" });
      if (nearSmaBear) reasons.push({ text: SIGNAL_LABELS.NEAR_SMA_BREAKDOWN, tone: "badge-red" });
      if (earlyBearish) reasons.push({ text: SIGNAL_LABELS.EARLY_BEARISH, tone: "badge-red" });
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
    const classification = classifySignal(asset, info, events);
    return {
      asset,
      source: marketData.source,
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

  function indicatorLine(label, value) {
    return `<span>${escapeHtml(label)} <strong>${escapeHtml(value)}</strong></span>`;
  }

  function renderCard(row) {
    const info = row.technical;
    const cls = row.classification;
    const trendTone = trendToneForGroup(cls.groupKey);
    const displayName = row.fundName || row.asset.name || row.asset.ticker;
    const displayAssetType = row.asset.asset_type === "THAI_MUTUAL_FUND" ? "Thai Mutual Fund" : formatLabel(row.asset.asset_type);
    const sourceBadge =
      row.navStatus === "CACHED_NAV"
        ? SignalBadge("Cached NAV", "badge-orange")
        : row.navStatus === "FALLBACK_NAV"
          ? SignalBadge("Fallback NAV", "badge-redgray")
          : "";
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
    const showSmaExplain = cls.groupKey === "insufficient";
    const groupClass = `signal-card-item ${cls.groupKey}`;

    return `
      <article class="${groupClass}">
        <div class="signal-card-top-row">
          <h4>${escapeHtml(row.asset.ticker)}</h4>
          <strong>${formatPrice(info.latestClose)}</strong>
        </div>

        <div class="signal-card-second-row">
          <p>${escapeHtml(displayName)}</p>
          <span>${formatDate(info.latestDate)}</span>
        </div>

        <div class="signal-meta-row">
          <span>${escapeHtml(displayAssetType)}</span>
          <span>${escapeHtml(row.source || "-")}</span>
        </div>

        <div class="signal-main-line">
          ${SignalBadge(cls.mainClassification, trendTone)}
        </div>

        <div class="signal-main-line">
          ${SignalBadge(cls.mainSetup, "badge-navy")}
        </div>

        ${badges ? `<div class="signal-badges-wrap">${badges}</div>` : ""}

        ${sourceBadge ? `<div class="signal-badges-wrap">${sourceBadge}</div>` : ""}

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
        ${showSmaExplain ? '<p class="signal-description is-muted">ต้องมีข้อมูลอย่างน้อย 200 วันทำการเพื่อคำนวณ SMA200</p>' : ""}

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
      <section class="signal-section-row ${group.tone}" data-group-key="${group.key}">
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
    return String(rawTicker || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }

  function isThaiMutualFundAsset(asset) {
    return asset.asset_type === "THAI_MUTUAL_FUND" || asset.asset_type === "fund";
  }

  async function getPriceSeries(asset) {
    const cacheKey = `${asset.ticker}:${asset.layer}:${asset.id}`;
    if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);

    const symbol = getYahooSymbol(asset);
    if (!symbol) {
      const empty = {
        marketSymbol: "",
        source: isThaiMutualFundAsset(asset) ? "รอข้อมูล NAV" : "No market data source",
        historyCount: 0,
        technical: calculateTechnical(asset.ticker, [], [])
      };
      priceCache.set(cacheKey, empty);
      return empty;
    }

    try {
      const history = await fetchPriceHistoryFromServer(symbol);
      const sourceText = history.source
        ? `${history.source}${history.navStatus === "CACHED_NAV" ? " · Cached NAV" : history.navStatus === "FALLBACK_NAV" ? " · Fallback NAV" : ""}`
        : symbol === asset.ticker
          ? `Daily close (${symbol})`
          : `Daily close proxy (${symbol})`;
      const result = {
        marketSymbol: symbol,
        source: sourceText,
        navStatus: history.navStatus || "",
        assetType: history.assetType || "",
        fundName: history.fundName || "",
        historyCount: history.closes.length,
        technical: calculateTechnical(asset.ticker, history.closes, history.dates)
      };
      priceCache.set(cacheKey, result);
      return result;
    } catch (_error) {
      const empty = {
        marketSymbol: symbol,
        source: isThaiMutualFundAsset(asset) ? "รอข้อมูล NAV" : "Unable to load market data",
        navStatus: "",
        assetType: isThaiMutualFundAsset(asset) ? "Thai Mutual Fund" : "",
        fundName: "",
        historyCount: 0,
        technical: calculateTechnical(asset.ticker, [], [])
      };
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
    const rawTicker = String(asset.ticker || "").trim().toUpperCase();
    const compactTicker = rawTicker.replace(/[^A-Z0-9]/g, "");
    if (asset.asset_type === "THAI_MUTUAL_FUND") {
      return THAI_MUTUAL_FUND_ALIASES[rawTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker] || rawTicker;
    }
    if (THAI_MUTUAL_FUND_ALIASES[rawTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker]) {
      return THAI_MUTUAL_FUND_ALIASES[rawTicker] || THAI_MUTUAL_FUND_ALIASES[compactTicker];
    }
    if (YAHOO_SYMBOLS[rawTicker]) return YAHOO_SYMBOLS[rawTicker];
    if (YAHOO_SYMBOLS[compactTicker]) return YAHOO_SYMBOLS[compactTicker];
    if (asset.asset_type === "stock" && asset.country === "US") return rawTicker;
    if (asset.asset_type === "crypto" && (compactTicker === "BTC" || compactTicker === "BTCUSD")) return "BTC-USD";
    if (asset.asset_type === "crypto" && compactTicker === "ETHUSD") return "ETH-USD";
    if (/(^|_)(RMF|SSF)($|_)/.test(compactTicker) || compactTicker.includes("RMF") || compactTicker.includes("SSF")) return "^SET.BK";
    if (rawTicker === "SCBNDQ" || rawTicker === "KKP_NDQ") return "^NDX";
    if (rawTicker === "SCB_GLOBAL_TECH" || rawTicker === "KKP_G_TECH" || rawTicker === "B_INNOTECH" || rawTicker === "ONE_UGG_RA") return "XLK";
    return "";
  }

  async function fetchPriceHistoryFromServer(symbol) {
    const url = `/api/price-history?symbol=${encodeURIComponent(symbol)}`;
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error("price request failed");
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
      assetType: payload.assetType || "",
      fundName: payload.fundName || ""
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
    return grouped;
  }

  async function renderDashboard() {
    const myRenderVersion = ++renderVersion;
    const baseFilteredAssets = filterAssetsBySelects();
    assetCardGrid.innerHTML = '<div class="asset-card-empty">กำลังคำนวณสัญญาณ...</div>';

    const analyses = await Promise.all(
      baseFilteredAssets.map(async (asset) => {
        const marketData = await getPriceSeries(asset);
        return analyzeAsset(asset, marketData);
      })
    );
    if (myRenderVersion !== renderVersion) return;

    signalFilterTabs.innerHTML = SignalFilterTabs();
    const grouped = groupRows(analyses);
    const visibleGroups = FILTER_GROUP_VISIBILITY[activeSignalFilter] || FILTER_GROUP_VISIBILITY.all;
    const shownCount = Object.entries(grouped)
      .filter(([key]) => visibleGroups.has(key))
      .reduce((sum, [, list]) => sum + list.length, 0);
    renderSummary(analyses, shownCount);

    assetCardGrid.innerHTML = MarketSignalDashboard(grouped);
  }

  function makeUserAsset(ticker, name, layer, assetType) {
    const upperTicker = normalizeTicker(ticker);
    const resolvedAssetType = THAI_MUTUAL_FUND_ALIASES[upperTicker] ? "THAI_MUTUAL_FUND" : assetType;
    const quality = layer === "upstream_ai" || layer === "data_center_cloud" ? 8 : 7;
    const hype = layer === "growth_optional" || layer === "upstream_ai" ? 7 : 5;
    const valuation = layer === "thai_funds" ? 5 : 6;
    return scoring.enrichAsset({
      id: `user-${upperTicker}-${Date.now()}`,
      ticker: upperTicker,
      name: name.trim() || `${upperTicker} placeholder`,
      asset_type: resolvedAssetType,
      country: resolvedAssetType === "fund" || resolvedAssetType === "dr" || resolvedAssetType === "THAI_MUTUAL_FUND" ? "Thailand" : "US",
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
      thai_access: resolvedAssetType === "fund" || resolvedAssetType === "THAI_MUTUAL_FUND" ? "Thai Fund" : resolvedAssetType === "dr" ? "DR / DRx" : "Direct",
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

  function handleAddTicker(event) {
    event.preventDefault();
    const ticker = normalizeTicker(tickerInput.value);
    if (!ticker) return;
    const exists = assets.some((asset) => asset.ticker === ticker && asset.layer === newLayerInput.value);
    if (exists) {
      tickerInput.setCustomValidity("Ticker นี้มีอยู่ในกลุ่มนี้แล้ว");
      tickerInput.reportValidity();
      return;
    }
    tickerInput.setCustomValidity("");
    assets.push(makeUserAsset(ticker, nameInput.value, newLayerInput.value, newAssetTypeInput.value));
    saveUserAssets();
    form.reset();
    refreshFilterOptions();
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
    resetAssets();
    refreshFilterOptions();
    renderDashboard();
  }

  Object.values(filters).forEach((select) => select.addEventListener("change", renderDashboard));
  form.addEventListener("submit", handleAddTicker);
  assetCardGrid.addEventListener("click", handleDelete);
  signalFilterTabs.addEventListener("click", handleSignalTabClick);
  initialize();
})();
