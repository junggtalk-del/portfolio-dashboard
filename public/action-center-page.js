(function () {
  const seed = window.AIBoomUniverseSeed || { ai_boom_universe: [] };
  const core = window.PortfolioCore || {};
  const snapshotApi = window.PortfolioDataSnapshot || {};

  const SECTION_DEFS = [
    {
      key: "urgent",
      title: "Urgent Portfolio Actions",
      thai: "สิ่งที่ควรดูด่วนในพอร์ต",
      description: "ถือจริงและเริ่มมีสัญญาณเสี่ยง หรือมีผลต่อพอร์ตมาก",
      empty: "ยังไม่มีสิ่งที่ต้องดูด่วนในพอร์ต",
      tone: "decision-urgent"
    },
    {
      key: "buy",
      title: "Buy / Add Opportunities",
      thai: "โอกาสทยอยซื้อ / เพิ่ม",
      description: "สัญญาณฝั่งบวกที่ผ่านตัวกรอง trend, RSI, volume และ market risk",
      empty: "ยังไม่มีโอกาสเพิ่มที่ชัดเจน",
      tone: "decision-buy"
    },
    {
      key: "watch",
      title: "Watch Closely",
      thai: "เฝ้าดูใกล้ชิด",
      description: "สัญญาณผสม ใกล้ trigger หรือควรรอ confirmation ก่อนลงมือ",
      empty: "ยังไม่มีรายการที่ต้องเฝ้าดูใกล้ชิด",
      tone: "decision-watch"
    },
    {
      key: "none",
      title: "No Action / Information",
      thai: "ยังไม่ต้องทำอะไร",
      description: "ถือดูข้อมูล หรือยังไม่มีสัญญาณที่ต้องตัดสินใจ",
      empty: "ยังไม่มีรายการ No Action",
      tone: "decision-none"
    }
  ];

  const SUMMARY_DEFS = [
    ["urgent", "Urgent Actions", "ต้องดูด่วน"],
    ["buy", "Buy Opportunities", "โอกาสเพิ่ม"],
    ["watch", "Watch Closely", "เฝ้าดู"],
    ["none", "No Action", "ยังไม่ต้องทำอะไร"],
    ["conflicts", "Conflicts", "สัญญาณขัดแย้ง"],
    ["high", "High Confidence", "ความมั่นใจสูง"]
  ];

  const FILTERS = {
    portfolio: [
      ["all", "All"],
      ["holdings", "Holdings only"],
      ["watchlist", "Watchlist only"]
    ],
    action: [
      ["all", "All"],
      ["buy", "Buy / Add"],
      ["watch", "Watch"],
      ["review", "Review / Trim"],
      ["none", "No Action"]
    ],
    confidence: [
      ["all", "All"],
      ["high", "High conviction only"],
      ["good", "Good setup and above"],
      ["mixed", "Mixed only"]
    ],
    conflict: [
      ["all", "All"],
      ["only", "Show conflicts only"],
      ["hide", "Hide conflicts"]
    ],
    market: [
      ["all", "All"],
      ["us", "US"],
      ["thai", "Thai"],
      ["crypto", "Crypto"],
      ["fund", "RMF / Fund"]
    ]
  };

  const actionStatus = document.querySelector("#actionStatus");
  const marketRiskText = document.querySelector("#marketRiskText");
  const summaryRoot = document.querySelector("#actionSummaryCards");
  const filtersRoot = document.querySelector("#actionFilters");
  const sectionsRoot = document.querySelector("#actionSections");
  const freshRoot = document.querySelector("#freshSignals");
  const refreshButton = document.querySelector("#refreshActionButton");

  const state = {
    rows: [],
    filters: {
      portfolio: "all",
      action: "all",
      confidence: "all",
      conflict: "all",
      market: "all"
    },
    snapshot: null
  };

  function canonical(raw) {
    if (core.canonicalSymbolFromTicker) return core.canonicalSymbolFromTicker(raw);
    return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  }

  // ============================================================
  // Universe list management (merged in from AI Boom Universe page).
  // The Action Center now OWNS the focus list: add/remove persists to
  // /api/ai-universe (+ localStorage cache, same keys as before so existing
  // data carries over). Load Latest Data picks new assets up automatically.
  // ============================================================
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const WATCHLIST_STORE_KEY = "portfolio_dashboard_watchlist";
  const WATCHLIST_MIGRATED_KEY = "watchlistMigratedToUniverse_v1";

  let persistedState = { userAssets: [], removedIds: [] };
  let universeStorageMode = "loading";

  function readJsonArrayLocal(key) {
    try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch (_e) { return []; }
  }
  function sanitizeUniverseState(raw) {
    const safe = raw && typeof raw === "object" ? raw : {};
    const seenTickers = new Set();
    const userAssets = (Array.isArray(safe.userAssets) ? safe.userAssets : []).filter((a) => {
      const t = canonical(a && a.ticker);
      if (!t || seenTickers.has(t)) return false;
      seenTickers.add(t);
      return true;
    });
    return { userAssets, removedIds: Array.isArray(safe.removedIds) ? safe.removedIds : [] };
  }
  async function loadUniverseState() {
    try {
      const response = await fetch("/api/ai-universe", { cache: "no-store" });
      if (!response.ok) throw new Error("state request failed");
      const payload = await response.json();
      persistedState = sanitizeUniverseState(payload?.data);
      universeStorageMode = payload?.mode || "supabase";
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState.userAssets));
        localStorage.setItem(REMOVED_KEY, JSON.stringify(persistedState.removedIds));
      } catch (_e) { /* cache best-effort */ }
    } catch (_error) {
      persistedState = sanitizeUniverseState({ userAssets: readJsonArrayLocal(STORAGE_KEY), removedIds: readJsonArrayLocal(REMOVED_KEY) });
      universeStorageMode = "local-cache";
    }
  }
  async function saveUniverseState() {
    persistedState = sanitizeUniverseState(persistedState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState.userAssets));
      localStorage.setItem(REMOVED_KEY, JSON.stringify(persistedState.removedIds));
    } catch (_e) { /* cache best-effort */ }
    try {
      const response = await fetch("/api/ai-universe", {
        method: "PUT",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ data: persistedState })
      });
      if (!response.ok) throw new Error("save state failed");
      universeStorageMode = "supabase";
    } catch (_error) {
      universeStorageMode = "local-cache";
    }
  }

  function makeUserAssetLite(ticker, name) {
    const t = canonical(ticker);
    const assetType = core.detectAssetType ? core.detectAssetType(t) : "stock";
    const enrich = window.AIBoomScoring && typeof window.AIBoomScoring.enrichAsset === "function"
      ? window.AIBoomScoring.enrichAsset.bind(window.AIBoomScoring)
      : (a) => a;
    return enrich({
      id: `user-${t}-${Date.now()}`,
      ticker: t,
      name: (name || "").trim() || t,
      asset_type: assetType,
      provider_symbol: t,
      layer: "growth_optional",
      sub_theme: "User added via Action Center",
      is_user_added: true
    });
  }

  function removedTickerSet() {
    const removedIds = new Set(persistedState.removedIds || []);
    const tickers = new Set();
    (seed.ai_boom_universe || []).forEach((asset) => {
      if (asset && removedIds.has(asset.id)) {
        const key = canonical(asset.ticker);
        if (key) tickers.add(key);
      }
    });
    return tickers;
  }

  function userAssetByTicker(ticker) {
    const key = canonical(ticker);
    return (persistedState.userAssets || []).find((a) => canonical(a.ticker) === key) || null;
  }

  async function addUserAsset(ticker, name) {
    const key = canonical(ticker);
    if (!key) return { ok: false, message: "กรุณาใส่ ticker" };
    const inSeed = (seed.ai_boom_universe || []).some((a) => canonical(a?.ticker) === key);
    if (userAssetByTicker(key) || (inSeed && !removedTickerSet().has(key))) return { ok: false, message: key + " อยู่ใน list แล้ว" };
    // re-adding a removed seed asset → just un-remove it
    if (inSeed) {
      const seedAsset = (seed.ai_boom_universe || []).find((a) => canonical(a?.ticker) === key);
      persistedState.removedIds = (persistedState.removedIds || []).filter((id) => id !== seedAsset.id);
    } else {
      persistedState.userAssets = (persistedState.userAssets || []).concat([makeUserAssetLite(key, name)]);
    }
    await saveUniverseState();
    return { ok: true, message: "เพิ่ม " + key + " แล้ว — กด Load Latest Data เพื่อดึงสัญญาณ" };
  }

  async function removeAssetFromList(symbol) {
    const key = canonical(symbol);
    const userAsset = userAssetByTicker(key);
    if (userAsset) {
      persistedState.userAssets = (persistedState.userAssets || []).filter((a) => canonical(a.ticker) !== key);
    } else {
      const seedAsset = (seed.ai_boom_universe || []).find((a) => canonical(a?.ticker) === key);
      if (!seedAsset) return false;
      const ids = new Set(persistedState.removedIds || []);
      ids.add(seedAsset.id);
      persistedState.removedIds = [...ids];
    }
    await saveUniverseState();
    return true;
  }

  // One-time migration: manually-added Watchlist items (the old separate store)
  // move into the unified universe list, then the old store is left untouched
  // (read-only) so nothing is destroyed. Runs once per browser.
  async function migrateWatchlistOnce() {
    try {
      if (localStorage.getItem(WATCHLIST_MIGRATED_KEY)) return 0;
      const items = readJsonArrayLocal(WATCHLIST_STORE_KEY);
      const manual = items.filter((it) => it && it.source !== "ai_boom" && it.isActive !== false);
      let added = 0;
      manual.forEach((it) => {
        const key = canonical(it.canonicalSymbol || it.displaySymbol || it.symbol);
        if (!key || userAssetByTicker(key)) return;
        const inSeed = (seed.ai_boom_universe || []).some((a) => canonical(a?.ticker) === key);
        if (inSeed) return;
        persistedState.userAssets.push(makeUserAssetLite(key, it.assetName || it.name || key));
        added += 1;
      });
      localStorage.setItem(WATCHLIST_MIGRATED_KEY, new Date().toISOString());
      if (added > 0) await saveUniverseState();
      return added;
    } catch (_e) {
      return 0;
    }
  }

  function readSnapshot() {
    const snap = snapshotApi.read?.();
    if (snap) return snap;
    try {
      return JSON.parse(localStorage.getItem("portfolio_dashboard_data_snapshot") || "null");
    } catch (_error) {
      return null;
    }
  }

  function buildAssetMap(snapshot) {
    const map = new Map();
    const seedMeta = new Map();
    (seed.ai_boom_universe || []).forEach((asset) => {
      const key = canonical(asset?.ticker);
      if (key) seedMeta.set(key, asset);
    });
    const addAsset = (asset = {}) => {
      const key = canonical(asset.canonicalSymbol || asset.ticker || asset.symbol || asset.providerSymbol || asset.provider_symbol);
      if (!key) return;
      const previous = map.get(key) || {};
      const seeded = seedMeta.get(key) || {};
      map.set(key, {
        ...previous,
        canonicalSymbol: key,
        displaySymbol: asset.displaySymbol || asset.display_symbol || previous.displaySymbol || displaySymbol(key),
        name: asset.assetName || asset.asset_name || asset.name || previous.name || seeded.name || displaySymbol(key),
        assetType: asset.assetType || asset.asset_type || previous.assetType || seeded.asset_type || core.detectAssetType?.(key) || "",
        providerSymbol: asset.providerSymbol || asset.provider_symbol || previous.providerSymbol || key,
        market: asset.market || previous.market || inferMarket(key),
        currency: asset.currency || previous.currency || (isThai(key) ? "THB" : "USD")
      });
    };

    (snapshot?.assets || []).forEach(addAsset);
    Object.keys(snapshot?.technicalSignals || {}).forEach((symbol) => addAsset({ ticker: symbol }));
    Object.keys(snapshot?.rsiSignals || {}).forEach((symbol) => addAsset({ ticker: symbol }));
    for (const holding of holdingsFromSnapshot(snapshot)) {
      addAsset({
        ticker: holding.canonicalSymbol,
        displaySymbol: holding.displaySymbol,
        assetName: holding.assetName,
        assetType: holding.assetType,
        providerSymbol: holding.providerSymbol,
        currency: holding.currency
      });
    }
    for (const item of scannerItems(snapshot)) {
      addAsset({
        ticker: item.providerSymbol || item.canonicalSymbol || item.displaySymbol,
        displaySymbol: item.displaySymbol,
        assetName: item.name,
        assetType: "THAI_STOCK",
        providerSymbol: item.providerSymbol,
        market: item.market || "SET",
        currency: "THB"
      });
    }
    // User-added assets appear immediately (even before the next Load fills
    // in their technicals); assets the user removed disappear unless held.
    (persistedState.userAssets || []).forEach((asset) => addAsset(asset));
    const holdingKeys = new Set(holdingsFromSnapshot(snapshot).map((h) => canonical(h.canonicalSymbol)));
    removedTickerSet().forEach((key) => { if (!holdingKeys.has(key)) map.delete(key); });
    return map;
  }

  function holdingsFromSnapshot(snapshot) {
    const rows = snapshot?.portfolioHoldings?.data || [];
    return core.dedupeHoldings ? core.dedupeHoldings(rows) : rows;
  }

  function scannerItems(snapshot) {
    const groups = snapshot?.thaiStockScanners || {};
    const rows = [];
    Object.values(groups).forEach((scan) => {
      rows.push(...(scan?.results || []), ...(scan?.near || []));
    });
    return rows;
  }

  function buildRows(snapshot) {
    const assets = buildAssetMap(snapshot);
    const holdings = holdingsFromSnapshot(snapshot);
    const holdingMap = new Map(holdings.map((holding) => [holding.canonicalSymbol, holding]));
    const scannerMap = new Map();
    scannerItems(snapshot).forEach((item) => {
      const key = canonical(item.providerSymbol || item.canonicalSymbol || item.displaySymbol);
      if (key && !scannerMap.has(key)) scannerMap.set(key, item);
    });

    const rows = [];
    for (const [symbol, asset] of assets.entries()) {
      const tech = snapshot?.technicalSignals?.[symbol] || {};
      const rsi = snapshot?.rsiSignals?.[symbol] || {};
      const price = snapshot?.prices?.[symbol] || {};
      const history = snapshot?.historicalData?.[symbol] || {};
      const scanner = scannerMap.get(symbol) || null;
      const holding = holdingMap.get(symbol) || null;
      const exposureInfo = snapshot?.exposureMap?.assetExposures?.[symbol] || {};
      const totalValue = core.totalMarketValue ? core.totalMarketValue(holdings) : holdings.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
      const baseRow = {
        symbol,
        displaySymbol: asset.displaySymbol,
        name: asset.name,
        assetType: asset.assetType,
        market: asset.market,
        currency: asset.currency,
        providerSymbol: asset.providerSymbol,
        latestClose: firstNumber(tech.latestClose, price.latestClose, history.latestClose, scanner?.close),
        latestDate: tech.latestDate || price.latestDate || history.latestDate || scanner?.latestDate || scanner?.date || null,
        source: price.source || history.source || scanner?.source || "Data Snapshot",
        tech,
        rsi,
        scanner,
        exposureTags: exposureInfo.tags || core.exposureTagsForSymbol?.(symbol, asset.assetType) || [],
        holding: holding || null
      };
      const enriched = core.enrichWithHolding ? core.enrichWithHolding(baseRow, holdings, totalValue) : enrichWithHoldingFallback(baseRow, holding, totalValue);
      rows.push(resolveDecision(enriched, snapshot));
    }
    return rows.sort(compareRows);
  }

  const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  const ACTION_CODE = {
    SELL_ALL: { code: "review", thai: "ขายหมด / ออกจากสถานะ" },
    SELL_FIRST: { code: "review", thai: "ขายไม้แรก / ลดน้ำหนัก" },
    BUY_MORE: { code: "buy", thai: "ซื้อเพิ่ม / เพิ่มน้ำหนัก" },
    HOLD_ADD: { code: "buy", thai: "ถือต่อ / เพิ่มได้" },
    BUY_FIRST_WAIT_VOLUME: { code: "watch", thai: "ซื้อไม้แรก / รอวอลุ่ม" },
    BUY_FIRST_SMALL: { code: "watch", thai: "ซื้อไม้แรกเล็ก ๆ / เฝ้าดู" },
    WATCH_CLOSELY: { code: "watch", thai: "เฝ้าดูใกล้ชิด" },
    WATCH_WAIT: { code: "watch", thai: "เฝ้าดู / รอก่อน" },
    AVOID_WAIT: { code: "avoid", thai: "รอก่อน" },
    DATA_WAITING: { code: "hold", thai: "รอข้อมูล" }
  };

  const SECTION_REASON = {
    urgent: "เป็นสินทรัพย์ที่ถือจริง และเริ่มมีสัญญาณเสี่ยงต่อพอร์ต",
    buy: "ผ่านตัวกรอง trend / volume / market risk แล้ว",
    watch: "สัญญาณยังผสมหรือยังไม่ confirm ควรเฝ้าดูก่อน",
    none: "ยังไม่มีสัญญาณที่ต้องลงมือชัดเจน"
  };

  // Single source of truth for the per-asset TimingScoreInput.
  function scoringInput(row, facts) {
    facts = facts || {};
    return {
      latestPrice: row.latestClose,
      latestDate: row.latestDate,
      ema12: firstNumber(row.tech?.ema12),
      ema26: firstNumber(row.tech?.ema26),
      sma200: firstNumber(row.tech?.sma200),
      rsi14: firstNumber(row.rsi?.rsi14, row.tech?.rsi14),
      emaTrendStatus: facts.emaBull ? "EMA_BULLISH" : facts.emaBear ? "EMA_BEARISH" : undefined,
      sma200Status: facts.aboveSma ? "ABOVE_SMA200" : facts.belowSma ? "BELOW_SMA200" : undefined,
      volumeRatio: Number.isFinite(facts.volumeRatio) ? facts.volumeRatio : undefined,
      daysSinceEmaBullishCross: firstNumber(row.scanner?.daysSinceCrossover),
      isNewBullishSignal: !!facts.newBullish,
      isNewBearishSignal: !!facts.newBearish,
      isBullishWatchlist: !!facts.bullishWatch,
      isOngoingBullishTrend: !!(facts.emaBull && facts.aboveSma),
      isOngoingBearishTrend: !!(facts.emaBear && facts.belowSma),
      marketRiskLevel: facts.marketRiskLabel,
      isHolding: !!row.portfolio?.isHolding,
      portfolioWeight: Number(row.portfolio?.weight) || 0,
      marketValue: Number(row.portfolio?.marketValue) || 0,
      assetType: row.assetType,
      displaySymbol: row.displaySymbol,
      canonicalSymbol: row.symbol
    };
  }

  function resolveDecision(row, snapshot) {
    const facts = signalFacts(row, snapshot);
    if (window.Scoring && typeof window.Scoring.calculateTimingScore === "function") {
      try {
        return resolveDecisionScored(row, facts);
      } catch (_error) {
        /* fall back to legacy logic below */
      }
    }
    return resolveDecisionLegacy(row, facts);
  }

  // Decision driven PRIMARILY by the signal state (AI Boom taxonomy, shared
  // engine). The numeric Signal Score is kept only as a secondary supporting
  // detail — it no longer decides the section/action.
  function resolveDecisionScored(row, facts) {
    const input = scoringInput(row, facts);
    if (input.isHolding === undefined) input.isHolding = !!(row.portfolio && row.portfolio.isHolding);
    // PRIMARY: which signal state is this asset in right now?
    const signal = window.Scoring.classifySignal(input);
    const rec = window.Scoring.actionFromSignal(signal, input);
    // SECONDARY: the score is still computed, shown as a supporting chip only.
    const timing = window.Scoring.calculateTimingScore(input);
    const conflicts = (timing.conflicts || []).map((c) => ({
      label: c.code,
      reason: c.thaiMessage || c.message,
      severity: c.severity
    }));
    const meta = ACTION_CODE[rec.key] || { code: "watch", thai: rec.thaiAction || "เฝ้าดู" };
    const warnings = (rec.warnings || []).map((w) => w.thaiMessage || w.message || "").filter(Boolean);
    const reason = rec.thaiExplanation || rec.thaiReason || SECTION_REASON[rec.section];

    if (isDev) {
      console.debug("[action-center]", row.symbol, { signal: signal.groupKey, action: rec.key, section: rec.section, score: timing.score });
    }

    return {
      ...row,
      facts,
      conflicts,
      score: timing.score,
      scoreLabel: scoreQuality(timing.score),
      timing,
      gates: timing.gates,
      signal,
      recommendation: rec,
      signalQualityScore: timing.score,
      decision: {
        action: meta.code,
        actionThai: rec.thaiAction || meta.thai,
        actionKey: rec.key,
        section: rec.section,
        signalGroup: signal.groupKey,
        signalLabel: signal.thaiLabel,
        signalTone: signal.tone,
        reason,
        warnings,
        keySignals: keySignals(facts).slice(0, 3)
      }
    };
  }

  // Legacy heuristic decision, used only when window.Scoring is unavailable OR
  // resolveDecisionScored throws. Still attach the signal state when the engine
  // is present (the throw path) so the chip + conviction filter keep working.
  function resolveDecisionLegacy(row, facts) {
    const conflicts = detectConflicts(row, facts);
    let signal = null;
    if (window.Scoring && typeof window.Scoring.classifySignal === "function") {
      try { signal = window.Scoring.classifySignal(scoringInput(row, facts)); } catch (_e) { /* ignore */ }
    }
    let score = scoreDecision(row, facts);
    let action = "avoid";
    let actionThai = "รอก่อน";
    let section = "none";
    let reason = "ยังไม่มีสัญญาณที่ต้องลงมือชัดเจน";

    const holding = Boolean(row.portfolio?.isHolding);
    const highRisk = facts.marketRiskHigh || facts.marketRiskVeryHigh;
    const alignedBullish = facts.newBullish && facts.volumeConfirmed && facts.aboveSma;
    const negativeHolding = holding && (facts.newBearish || facts.rsiSell || facts.rsiWatchSell || (facts.emaBear && facts.belowSma) || (highRisk && facts.weight >= 10));

    if (negativeHolding) {
      section = "urgent";
      action = "review";
      actionThai = "ทบทวน / ลดน้ำหนัก";
      reason = "เป็นสินทรัพย์ที่ถือจริง และเริ่มมีสัญญาณเสี่ยงต่อพอร์ต";
    } else if (conflicts.length) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = conflicts[0].reason;
    } else if ((facts.rsiSell || facts.newBearish) && !holding) {
      section = "watch";
      action = "avoid";
      actionThai = "รอก่อน";
      reason = "มีสัญญาณลบ จึงยังไม่ควรเพิ่มความเสี่ยง";
    } else if (alignedBullish && !highRisk) {
      section = "buy";
      action = holding ? "buy" : "consider";
      actionThai = holding ? "ทยอยซื้อ / เพิ่ม" : "พิจารณาเพิ่ม";
      reason = "EMA ตัดขึ้น พร้อมวอลุ่มยืนยัน และราคาอยู่เหนือ SMA200";
    } else if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish || facts.bullishWatch) && !highRisk) {
      section = holding ? "watch" : "buy";
      action = facts.aboveSma && facts.emaBull ? "consider" : "watch";
      actionThai = action === "consider" ? "พิจารณาเพิ่ม" : "เฝ้าดู";
      reason = holding ? "มีสัญญาณฝั่งบวก แต่ควรรอจุดเพิ่มที่ดีกว่า" : "มี setup น่าสนใจใน watchlist แต่ยังไม่กระทบพอร์ตจริง";
    } else if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish) && highRisk) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = "มีสัญญาณซื้อ แต่ Market Risk สูง จึงลดระดับเป็น Watch";
      score = Math.min(score, 59);
    } else if (holding && facts.emaBull && facts.aboveSma && facts.rsiNeutral) {
      section = "none";
      action = "hold";
      actionThai = "ถือต่อ";
      reason = "แนวโน้มหลักยังดี แต่ยังไม่มีจุด action ใหม่";
    } else if (facts.insufficient) {
      section = "none";
      action = "avoid";
      actionThai = "รอก่อน";
      reason = "ข้อมูลยังไม่พอสำหรับสรุป action";
    } else if (facts.emaBull || facts.aboveSma || facts.emaBear || facts.belowSma) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = "มีข้อมูล trend บางส่วน แต่สัญญาณยังไม่ครบพอให้ลงมือ";
    }

    return {
      ...row,
      facts,
      conflicts,
      score,
      scoreLabel: scoreQuality(score),
      signal,
      decision: {
        action,
        actionThai,
        section,
        signalGroup: signal ? signal.groupKey : null,
        signalLabel: signal ? signal.thaiLabel : null,
        signalTone: signal ? signal.tone : null,
        reason,
        keySignals: keySignals(facts).slice(0, 3)
      }
    };
  }

  function conflictSeverityRank(row) {
    return (row.conflicts || []).reduce((max, c) => {
      const rank = c.severity === "high" ? 3 : c.severity === "medium" ? 2 : c.severity === "low" ? 1 : 0;
      return Math.max(max, rank);
    }, 0);
  }

  function sortRowsForSection(key, rows) {
    const w = (r) => Number(r.portfolio?.weight) || 0;
    const hold = (r) => Number(Boolean(r.portfolio?.isHolding));
    const vol = (r) => (r.facts && r.facts.volumeConfirmed ? 1 : 0);
    const above = (r) => (r.facts && r.facts.aboveSma ? 1 : 0);
    const sorters = {
      urgent: (a, b) => conflictSeverityRank(b) - conflictSeverityRank(a) || w(b) - w(a) || a.score - b.score || (Number(Boolean(b.facts?.newBearish)) - Number(Boolean(a.facts?.newBearish))),
      buy: (a, b) => b.score - a.score || vol(b) - vol(a) || above(b) - above(a) || hold(b) - hold(a),
      watch: (a, b) => hold(b) - hold(a) || conflictSeverityRank(b) - conflictSeverityRank(a) || b.score - a.score,
      none: (a, b) => hold(b) - hold(a) || w(b) - w(a) || b.score - a.score
    };
    return rows.slice().sort(sorters[key] || ((a, b) => b.score - a.score));
  }

  function signalFacts(row, snapshot) {
    const emaStatus = String(row.tech?.emaStatus || "");
    const smaStatus = String(row.tech?.sma200Status || "");
    const rsiSignal = String(row.rsi?.signal || row.tech?.rsiSignal || "");
    const scannerSignal = String(row.scanner?.signal || "");
    const risk = snapshot?.marketRisk?.risk || snapshot?.marketRisk || {};
    const riskLabel = risk?.level?.label || risk?.label || "Unknown";
    const volumeRatio = firstNumber(row.scanner?.volumeRatio, row.scanner?.latestVolumeRatio);
    const weight = Number(row.portfolio?.weight) || 0;
    const concentration = highConcentrationForRow(row, snapshot);

    return {
      emaBull: emaStatus === "EMA_BULLISH" || emaStatus === "BULLISH" || Number(row.tech?.ema12) > Number(row.tech?.ema26),
      emaBear: emaStatus === "EMA_BEARISH" || emaStatus === "BEARISH" || Number(row.tech?.ema12) < Number(row.tech?.ema26),
      aboveSma: smaStatus === "ABOVE_SMA200" || Number(row.latestClose) > Number(row.tech?.sma200),
      belowSma: smaStatus === "BELOW_SMA200" || Number(row.latestClose) < Number(row.tech?.sma200),
      newBullish: scannerSignal === "EMA_BULLISH_CROSS" || row.tech?.ema?.signal === "BUY" || row.tech?.sma200?.signal === "BULLISH_BREAKOUT",
      newBearish: row.tech?.ema?.signal === "SELL" || row.tech?.sma200?.signal === "BEARISH_BREAKDOWN",
      bullishWatch: scannerSignal === "NEAR_EMA_CROSS_UP",
      rsiBuy: rsiSignal === "BUY_SIGNAL",
      rsiWatchBuy: rsiSignal === "WATCH_BUY",
      rsiSell: rsiSignal === "SELL_SIGNAL",
      rsiWatchSell: rsiSignal === "WATCH_SELL",
      rsiNeutral: rsiSignal === "NEUTRAL",
      volumeConfirmed: Number.isFinite(volumeRatio) && volumeRatio >= 1,
      strongVolume: Number.isFinite(volumeRatio) && volumeRatio >= 1.5,
      volumeNotConfirmed: Number.isFinite(volumeRatio) && volumeRatio < 1,
      volumeRatio,
      marketRiskHigh: riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk",
      marketRiskVeryHigh: riskLabel === "Hedge / Reduce Risk",
      marketRiskLabel: riskLabel,
      marketRiskThai: risk?.level?.thai || risk?.thai || "",
      weight,
      concentration,
      insufficient: !Number.isFinite(Number(row.latestClose)) && !Number.isFinite(Number(row.tech?.ema12)) && !Number.isFinite(Number(row.tech?.ema26))
    };
  }

  function highConcentrationForRow(row, snapshot) {
    const themeExposures = snapshot?.exposureMap?.themeExposures || {};
    const tags = row.exposureTags || [];
    return tags
      .map((tag) => ({ tag, percent: Number(themeExposures[tag]?.percent) || 0, risk: themeExposures[tag]?.risk?.label || "" }))
      .filter((item) => item.percent >= 60 || item.risk === "High")
      .sort((a, b) => b.percent - a.percent)[0] || null;
  }

  function detectConflicts(row, facts) {
    const conflicts = [];
    if ((facts.rsiBuy || facts.rsiWatchBuy) && (facts.emaBear || facts.belowSma)) {
      conflicts.push({
        label: "RSI Buy vs Bearish Trend",
        reason: "RSI อยู่โซนซื้อ แต่แนวโน้มหลักยังเป็นขาลง"
      });
    }
    if (facts.emaBull && facts.belowSma) {
      conflicts.push({
        label: "EMA Bullish but Below SMA200",
        reason: "โมเมนตัมเริ่มดีขึ้น แต่ราคายังต่ำกว่า SMA200"
      });
    }
    if ((facts.rsiSell || facts.rsiWatchSell) && (facts.emaBull || facts.aboveSma)) {
      conflicts.push({
        label: "RSI Hot but Trend Holds",
        reason: "แนวโน้มระยะยาวยังดี แต่ RSI เริ่มสูง จึงไม่ควรไล่ราคา"
      });
    }
    if (row.portfolio?.isHolding && (facts.rsiSell || facts.rsiWatchSell) && facts.marketRiskHigh) {
      conflicts.push({
        label: "Holding Risk Elevated",
        reason: "เป็นสินทรัพย์ที่ถือจริง และเริ่มมีสัญญาณเสี่ยง"
      });
    }
    if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish) && facts.concentration) {
      conflicts.push({
        label: "Concentration Risk",
        reason: `${facts.concentration.tag} exposure ในพอร์ตสูงอยู่แล้ว`
      });
    }
    return conflicts;
  }

  function scoreDecision(row, facts) {
    let score = 35;
    if (row.portfolio?.isHolding) score += 25;
    if (facts.weight >= 10) score += 15;
    if (facts.emaBull) score += 15;
    if (facts.newBullish) score += 20;
    if (facts.aboveSma) score += 15;
    if (facts.rsiBuy || facts.rsiWatchBuy) score += 10;
    if (facts.volumeConfirmed) score += 10;
    if (facts.strongVolume) score += 15;
    if (!facts.marketRiskHigh && facts.marketRiskLabel !== "Unknown") score += 10;
    if (facts.marketRiskHigh) score -= 20;
    if (facts.marketRiskVeryHigh) score -= 10;
    if (facts.belowSma) score -= 15;
    if (facts.emaBear) score -= 15;
    if (facts.newBearish) score -= 25;
    if (facts.rsiSell || facts.rsiWatchSell) score -= facts.rsiSell ? 15 : 10;
    if (facts.rsiSell && facts.rsiSignal === "STRONG_SELL") score -= 10;
    if (facts.volumeNotConfirmed) score -= 5;
    if (facts.concentration) score -= 10;
    if (facts.insufficient) score = Math.min(score, 25);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function keySignals(facts) {
    const signals = [];
    if (facts.newBearish) signals.push("New Bearish Signal");
    if (facts.newBullish) signals.push("New Bullish Signal");
    if (facts.rsiSell) signals.push("RSI Sell");
    else if (facts.rsiWatchSell) signals.push("RSI Watch Sell");
    else if (facts.rsiBuy) signals.push("RSI Buy");
    else if (facts.rsiWatchBuy) signals.push("RSI Watch Buy");
    if (facts.emaBull) signals.push("EMA Bullish");
    if (facts.emaBear) signals.push("EMA Bearish");
    if (facts.aboveSma) signals.push("Above SMA200");
    if (facts.belowSma) signals.push("Below SMA200");
    if (facts.strongVolume) signals.push("Strong Volume");
    else if (facts.volumeConfirmed) signals.push("Volume Confirmed");
    if (facts.marketRiskHigh) signals.push("Market Risk High");
    if (facts.concentration) signals.push(`${facts.concentration.tag} exposure high`);
    return [...new Set(signals)];
  }

  // Label for the SECONDARY numeric score (worded as score strength, not
  // "confidence" — conviction now comes from the signal state, see convictionOf).
  function scoreQuality(score) {
    if (score >= 80) return { label: "Score Very High", thai: "คะแนนสูงมาก", tone: "score-high" };
    if (score >= 60) return { label: "Score Good", thai: "คะแนนค่อนข้างดี", tone: "score-good" };
    if (score >= 40) return { label: "Score Mixed", thai: "คะแนนปานกลาง", tone: "score-mixed" };
    if (score >= 20) return { label: "Score Weak", thai: "คะแนนอ่อน", tone: "score-weak" };
    return { label: "Score Low", thai: "คะแนนต่ำ", tone: "score-avoid" };
  }

  // PRIMARY conviction comes from the signal STATE, not the score (Finding 5):
  // high  = a fresh crossover that the major trend (SMA200) confirms, no hard conflict
  // good  = an aligned ongoing trend, or a fresh cross not yet trend-confirmed
  // mixed = watch / neutral / waiting
  function convictionOf(row) {
    const s = row.signal || {};
    const g = s.groupKey;
    const highConflict = (row.conflicts || []).some((c) => c.severity === "high");
    if (!highConflict && ((g === "new_bullish" && s.aboveSma) || (g === "new_bearish" && s.belowSma))) return "high";
    if (g === "new_bullish" || g === "new_bearish" || g === "ongoing_bullish" || g === "ongoing_bearish") return "good";
    return "mixed";
  }

  // ============================================================
  // Fresh Technical Signals — ONLY signals that occurred within the last
  // 3 trading days (EMA12/26 cross · SMA200 breakout/breakdown). Reuses the
  // snapshot's own daysSince* bar-counts (computed in data-snapshot.js), so
  // stale signals drop off automatically on every render and NO history is
  // deleted (Trend Status + Asset Detail keep the full record).
  // ============================================================
  const FRESH_WINDOW = 3; // trading days (0 = latest bar … 3 = 3 bars ago)
  const FRESH_GROUPS = [
    ["holdings", "Portfolio Holdings", "ในพอร์ต"],
    ["aiBoom", "AI Boom Universe", "AI Boom"],
    ["thailand", "Thailand", "หุ้นไทย"],
    ["crypto", "Crypto", "คริปโต"]
  ];

  function ageLabel(n) {
    return n === 0 ? "Today" : n === 1 ? "Yesterday" : n + " days ago";
  }
  function ageLabelThai(n) {
    return n === 0 ? "วันนี้" : n === 1 ? "เมื่อวาน" : n + " วันก่อน";
  }
  function isFreshAge(n) {
    return Number.isFinite(n) && n >= 0 && n <= FRESH_WINDOW;
  }
  function freshGroupOf(row) {
    if (row.portfolio?.isHolding) return "holdings";
    const g = marketGroup(row);
    if (g === "crypto") return "crypto";
    if (g === "thai") return "thailand";
    return "aiBoom"; // us / fund / other non-holding
  }

  // Data quality per symbol — a fresh cross can only be trusted when the snapshot
  // holds enough DENSE history for that indicator. A sparse/partial series (e.g. a
  // ticker loaded before its history backfilled) yields a wrong SMA200 and phantom
  // breakouts, so we require ≥200 dense bars for SMA200 and ≥30 for EMA.
  function freshDataQuality(symbol) {
    const hist = (state.snapshot && state.snapshot.historicalData && state.snapshot.historicalData[symbol]) || {};
    const closes = Array.isArray(hist.closes) ? hist.closes : [];
    const dates = Array.isArray(hist.dates) ? hist.dates : [];
    const limited = hist.historicalSourceLimited === true;
    const n = closes.length;
    const spanDays = (k) => {
      if (dates.length < k || k < 2) return Infinity;
      const a = Date.parse(dates[dates.length - k]);
      const b = Date.parse(dates[dates.length - 1]);
      return Number.isFinite(a) && Number.isFinite(b) ? (b - a) / 86400000 : Infinity;
    };
    // 200 trading days ≈ 290 calendar days; >600 ⇒ sparse/weekly ⇒ SMA200 unreliable.
    return {
      smaOk: !limited && n >= 200 && spanDays(200) <= 600,
      emaOk: !limited && n >= 30 && spanDays(30) <= 120
    };
  }

  // Cross ages are recomputed HERE from the snapshot's own closes — never trusted
  // from the precomputed daysSince* fields (partial Loads can leave those out of
  // sync with the price history, producing phantom "Today" breakouts on assets
  // that never crossed, e.g. GULF above its SMA200 for 100+ bars).
  // Anti-glitch rule: a cross only counts when ≥2 of the 10 bars BEFORE it sat on
  // the origin side — a single bad bar dipping across the line cannot fire a signal.
  let freshFactsCache = new Map();
  function freshSeriesFacts(symbol) {
    if (freshFactsCache.has(symbol)) return freshFactsCache.get(symbol);
    const hist = (state.snapshot && state.snapshot.historicalData && state.snapshot.historicalData[symbol]) || {};
    const closes = (Array.isArray(hist.closes) ? hist.closes : []).map(Number);
    let out = null;
    if (closes.length >= 30) {
      const n = closes.length;
      const emaSeries = (p) => {
        const arr = new Array(n).fill(null);
        if (n < p) return arr;
        let e = 0; for (let i = 0; i < p; i++) e += closes[i]; e /= p;
        arr[p - 1] = e; const k = 2 / (p + 1);
        for (let i = p; i < n; i++) { if (!Number.isFinite(closes[i])) return arr; e = (closes[i] - e) * k + e; arr[i] = e; }
        return arr;
      };
      const e12 = emaSeries(12), e26 = emaSeries(26);
      const s200 = (() => {
        const arr = new Array(n).fill(null);
        if (n < 200) return arr;
        let sum = 0; for (let i = 0; i < 200; i++) sum += closes[i];
        arr[199] = sum / 200;
        for (let i = 200; i < n; i++) { sum += closes[i] - closes[i - 200]; arr[i] = sum / 200; }
        return arr;
      })();
      // most recent cross of a over b in direction dir (+1 up / -1 down), with persistence
      const crossAge = (aArr, bArr, dir) => {
        for (let i = n - 1; i > 0; i--) {
          const a = aArr[i], b = bArr[i], pa = aArr[i - 1], pb = bArr[i - 1];
          if (a == null || b == null || pa == null || pb == null) continue;
          const crossed = dir > 0 ? (pa <= pb && a > b) : (pa >= pb && a < b);
          if (!crossed) continue;
          let originSide = 0;
          for (let j = i - 1; j >= Math.max(1, i - 10); j--) {
            const aj = aArr[j], bj = bArr[j];
            if (aj == null || bj == null) continue;
            if (dir > 0 ? aj <= bj : aj >= bj) originSide++;
          }
          return originSide >= 2 ? n - 1 - i : null; // 1-bar glitch cross → no signal
        }
        return null;
      };
      out = {
        emaBullAge: crossAge(e12, e26, +1), emaBearAge: crossAge(e12, e26, -1),
        smaUpAge: crossAge(closes, s200, +1), smaDownAge: crossAge(closes, s200, -1),
        lastClose: closes[n - 1], lastSma: s200[n - 1], lastE12: e12[n - 1], lastE26: e26[n - 1]
      };
    }
    freshFactsCache.set(symbol, out);
    return out;
  }

  // Build one card per asset per side (buy/sell). If BOTH the EMA cross and the
  // SMA200 breakout/breakdown are fresh, they merge into one Strong Setup card.
  // Gates: (A) cross recomputed from the same closes + persistence (above),
  // (B) STATE-AGREEMENT — still in effect on those closes, (C) DATA-QUALITY.
  function buildFreshCard(row, side) {
    const facts = row.facts || {};
    const q = freshDataQuality(row.symbol);
    const F = freshSeriesFacts(row.symbol);
    if (!F) return null;
    const emaInEffect = F.lastE12 != null && F.lastE26 != null && (side === "buy" ? F.lastE12 > F.lastE26 : F.lastE12 < F.lastE26);
    const smaInEffect = F.lastSma != null && Number.isFinite(F.lastClose) && (side === "buy" ? F.lastClose > F.lastSma : F.lastClose < F.lastSma);
    const emaAge = side === "buy" ? F.emaBullAge : F.emaBearAge;
    const smaAge = side === "buy" ? F.smaUpAge : F.smaDownAge;
    const signals = [];
    if (isFreshAge(emaAge) && emaInEffect && q.emaOk) {
      signals.push({ kind: "ema", age: emaAge, text: side === "buy" ? "EMA12 crossed above EMA26" : "EMA12 crossed below EMA26" });
    }
    if (isFreshAge(smaAge) && smaInEffect && q.smaOk) {
      signals.push({ kind: "sma", age: smaAge, text: side === "buy" ? "Price closed above SMA200" : "Price closed below SMA200" });
    }
    if (!signals.length) return null;
    signals.sort((a, b) => a.age - b.age); // newest first
    const combined = signals.length >= 2;
    const hasEma = signals.some((s) => s.kind === "ema");
    const hasSma = signals.some((s) => s.kind === "sma");
    // confidence: both fresh → Very High; a single signal already confirmed by the
    // OTHER (trend-aligned) indicator → High; a lone unconfirmed signal → Medium.
    let confidence = "Medium";
    if (combined) confidence = "Very High";
    else if (side === "buy" && ((hasEma && facts.aboveSma) || (hasSma && facts.emaBull))) confidence = "High";
    else if (side === "sell" && ((hasEma && facts.belowSma) || (hasSma && facts.emaBear))) confidence = "High";
    let title;
    if (combined) title = side === "buy" ? "Strong Buy Setup" : "Strong Sell Setup";
    else if (hasEma) title = side === "buy" ? "EMA Bullish Cross" : "EMA Bearish Cross";
    else title = side === "buy" ? "SMA200 Breakout" : "SMA200 Breakdown";
    return {
      row, side, signals, combined, confidence, title,
      age: signals[0].age,
      group: freshGroupOf(row),
      weight: Number(row.portfolio?.weight) || 0
    };
  }

  function computeFreshSignals(rows) {
    freshFactsCache = new Map(); // per-render — snapshot data may have changed
    const empty = () => Object.fromEntries(FRESH_GROUPS.map(([k]) => [k, []]));
    const buy = empty(), sell = empty();
    (rows || []).forEach((row) => {
      const b = buildFreshCard(row, "buy");
      if (b) buy[b.group].push(b);
      const s = buildFreshCard(row, "sell");
      if (s) sell[s.group].push(s);
    });
    const sortCards = (arr) => arr.sort((a, b) => a.age - b.age || b.weight - a.weight
      || String(a.row.displaySymbol || a.row.symbol).localeCompare(String(b.row.displaySymbol || b.row.symbol)));
    FRESH_GROUPS.forEach(([k]) => { sortCards(buy[k]); sortCards(sell[k]); });
    const total = (obj) => FRESH_GROUPS.reduce((sum, [k]) => sum + obj[k].length, 0);
    return {
      buy, sell,
      buyTotal: total(buy), sellTotal: total(sell),
      pfBuy: buy.holdings.length, pfSell: sell.holdings.length
    };
  }

  function renderFreshCard(card) {
    const row = card.row;
    const detailHref = `/asset/${encodeURIComponent(row.providerSymbol || row.symbol)}`;
    const holding = row.portfolio?.isHolding;
    const mark = card.side === "buy" ? "✓" : "✕";
    const lines = card.signals.map((s) =>
      `<div class="fresh-line">${mark} ${escapeHtml(s.text)} <span class="fresh-line-age">(${escapeHtml(ageLabel(s.age))})</span></div>`
    ).join("");
    return `
      <article class="fresh-card fresh-${card.side}${card.combined ? " fresh-strong" : ""}">
        <div class="fresh-card-top">
          <a class="fresh-symbol asset-link" href="${detailHref}">${escapeHtml(row.displaySymbol || row.symbol)}</a>
          <span class="fresh-age-chip fresh-age-${card.age}">${escapeHtml(ageLabel(card.age))} · ${escapeHtml(ageLabelThai(card.age))}</span>
        </div>
        <div class="fresh-title">${escapeHtml(card.title)}</div>
        <div class="fresh-lines">${lines}</div>
        <div class="fresh-conf">Confidence: <strong>${escapeHtml(card.confidence)}</strong></div>
        <div class="fresh-card-foot">
          <span class="badge ${holding ? "badge-blue" : "badge-gray"}">${holding ? "Holding" : "Watchlist"}</span>
          <span class="fresh-price">${escapeHtml(formatPrice(row.latestClose))}</span>
          <span class="card-name">${escapeHtml(row.name || row.symbol)}</span>
        </div>
      </article>`;
  }

  function renderFreshBlock(side, groups) {
    const total = FRESH_GROUPS.reduce((sum, [k]) => sum + groups[k].length, 0);
    if (!total) return "";
    const heading = side === "buy" ? "Buy Signals · สัญญาณซื้อใหม่" : "Sell Signals · สัญญาณขายใหม่";
    const groupsHtml = FRESH_GROUPS.map(([key, label, thai]) => {
      const cards = groups[key];
      if (!cards.length) return "";
      return `
        <div class="fresh-group" id="fresh-${side}-${key}">
          <div class="fresh-group-head"><h4>${escapeHtml(label)} · ${escapeHtml(thai)}</h4><span class="fresh-group-count">${cards.length}</span></div>
          <div class="fresh-card-grid">${cards.map(renderFreshCard).join("")}</div>
        </div>`;
    }).join("");
    return `
      <div class="fresh-block fresh-block-${side}" id="fresh-${side}">
        <div class="fresh-block-head"><h3>${escapeHtml(heading)}</h3><span class="fresh-block-count">${total}</span></div>
        ${groupsHtml}
      </div>`;
  }

  function renderFreshSignals() {
    if (!freshRoot) return;
    const data = computeFreshSignals(state.rows);
    const grandTotal = data.buyTotal + data.sellTotal;
    const summary = `
      <div class="fresh-head">
        <div>
          <h2>Fresh Technical Signals</h2>
          <p>สัญญาณเทคนิคใหม่ภายใน 3 วันทำการล่าสุด — EMA12/26 cross และ SMA200 breakout / breakdown เท่านั้น</p>
        </div>
      </div>
      <div class="fresh-summary">
        <button type="button" class="fresh-sum-card fresh-sum-buy" data-fresh-jump="fresh-buy"><span>Fresh Buy Signals</span><strong>${data.buyTotal}</strong><em>สัญญาณซื้อใหม่</em></button>
        <button type="button" class="fresh-sum-card fresh-sum-sell" data-fresh-jump="fresh-sell"><span>Fresh Sell Signals</span><strong>${data.sellTotal}</strong><em>สัญญาณขายใหม่</em></button>
        <button type="button" class="fresh-sum-card fresh-sum-pfbuy" data-fresh-jump="fresh-buy-holdings"><span>Portfolio Buy Signals</span><strong>${data.pfBuy}</strong><em>ซื้อ (ในพอร์ต)</em></button>
        <button type="button" class="fresh-sum-card fresh-sum-pfsell" data-fresh-jump="fresh-sell-holdings"><span>Portfolio Sell Signals</span><strong>${data.pfSell}</strong><em>ขาย (ในพอร์ต)</em></button>
      </div>`;
    if (grandTotal === 0) {
      freshRoot.innerHTML = summary +
        '<div class="fresh-empty">No fresh technical signals detected during the last 3 trading days.<span>ไม่มีสัญญาณเทคนิคใหม่ในช่วง 3 วันทำการล่าสุด</span></div>';
      return;
    }
    freshRoot.innerHTML = summary +
      '<div class="fresh-body">' + renderFreshBlock("buy", data.buy) + renderFreshBlock("sell", data.sell) + "</div>";
  }

  function render() {
    state.snapshot = readSnapshot();
    if (!state.snapshot) {
      renderMissingSnapshot();
      return;
    }
    state.rows = buildRows(state.snapshot);
    updateHeader();
    renderFreshSignals();
    renderFilters();
    renderSummary();
    renderSections();
  }

  function renderMissingSnapshot() {
    actionStatus.textContent = "กรุณาโหลดข้อมูลล่าสุดก่อน";
    marketRiskText.textContent = "Please load latest data first.";
    summaryRoot.innerHTML = '<div class="empty-box">ยังไม่มี Data Snapshot · กด Load Latest Data ด้านบนก่อน</div>';
    if (freshRoot) freshRoot.innerHTML = '<div class="empty-box">ยังไม่มี Data Snapshot · กด Load Latest Data เพื่อดูสัญญาณเทคนิคใหม่</div>';
    if (filtersRoot) filtersRoot.innerHTML = "";
    sectionsRoot.innerHTML = '<div class="empty-box">Please load latest data first. / กรุณาโหลดข้อมูลล่าสุดก่อน</div>';
  }

  function updateHeader() {
    const freshness = snapshotApi.freshness?.(state.snapshot) || { thai: "ไม่ทราบสถานะ" };
    const risk = state.snapshot?.marketRisk?.risk || state.snapshot?.marketRisk || {};
    const level = risk?.level?.label || risk?.label || "Unknown";
    const thai = risk?.level?.thai || risk?.thai || "ไม่ทราบระดับความเสี่ยง";
    actionStatus.textContent = `ใช้ Data Snapshot · ${state.rows.length} รายการ · ${freshness.thai}`;
    marketRiskText.textContent = `Market Risk: ${level} (${thai})`;
  }

  function filteredRows() {
    return state.rows.filter((row) => {
      if (state.filters.portfolio === "holdings" && !row.portfolio?.isHolding) return false;
      if (state.filters.portfolio === "watchlist" && row.portfolio?.isHolding) return false;
      if (state.filters.action === "buy" && !["buy", "consider"].includes(row.decision.action)) return false;
      if (state.filters.action === "watch" && row.decision.action !== "watch") return false;
      if (state.filters.action === "review" && row.decision.action !== "review") return false;
      if (state.filters.action === "none" && !["hold", "avoid"].includes(row.decision.action)) return false;
      if (state.filters.confidence !== "all") {
        const conv = convictionOf(row);
        if (state.filters.confidence === "high" && conv !== "high") return false;
        if (state.filters.confidence === "good" && conv === "mixed") return false;
        if (state.filters.confidence === "mixed" && conv !== "mixed") return false;
      }
      if (state.filters.conflict === "only" && !row.conflicts.length) return false;
      if (state.filters.conflict === "hide" && row.conflicts.length) return false;
      if (state.filters.market !== "all" && marketGroup(row) !== state.filters.market) return false;
      return true;
    });
  }

  function renderFilters() {
    if (!filtersRoot) return;
    filtersRoot.innerHTML = Object.entries(FILTERS).map(([key, options]) => `
      <label class="filter-field">
        <span>${filterLabel(key)}</span>
        <select data-filter="${key}">
          ${options.map(([value, label]) => `<option value="${value}" ${state.filters[key] === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>
    `).join("");
  }

  function renderSummary() {
    const rows = filteredRows();
    const counts = {
      urgent: rows.filter((row) => row.decision.section === "urgent").length,
      buy: rows.filter((row) => row.decision.section === "buy").length,
      watch: rows.filter((row) => row.decision.section === "watch").length,
      none: rows.filter((row) => row.decision.section === "none").length,
      conflicts: rows.filter((row) => row.conflicts.length).length,
      high: rows.filter((row) => convictionOf(row) === "high").length
    };
    summaryRoot.innerHTML = SUMMARY_DEFS.map(([key, title, thai]) => {
      const isFilterCard = key === "conflicts" || key === "high";
      const active = (key === "conflicts" && state.filters.conflict === "only")
        || (key === "high" && state.filters.confidence === "high");
      const hint = isFilterCard
        ? (active ? "✓ กำลังกรอง · กดเพื่อยกเลิก" : "คลิกเพื่อกรอง")
        : "คลิกเพื่อดูรายการ";
      return `
      <button class="summary-card decision-summary-${key}${active ? " is-active" : ""}" type="button" data-summary="${key}">
        <span>${escapeHtml(title)}</span>
        <strong>${counts[key] || 0}</strong>
        <p>${escapeHtml(thai)}</p>
        <p>${escapeHtml(hint)}</p>
      </button>`;
    }).join("");
  }

  function renderSections() {
    const rows = filteredRows();
    const grouped = Object.fromEntries(SECTION_DEFS.map((section) => [section.key, []]));
    rows.forEach((row) => grouped[row.decision.section]?.push(row));
    SECTION_DEFS.forEach((section) => {
      grouped[section.key] = sortRowsForSection(section.key, grouped[section.key]);
    });
    sectionsRoot.innerHTML = SECTION_DEFS.map((section) => `
      <section id="decision-${section.key}" class="decision-section ${section.tone}">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(section.title)} · ${escapeHtml(section.thai)}</h2>
            <p>${escapeHtml(section.description)}</p>
          </div>
          <span class="count-badge">${grouped[section.key].length}</span>
        </div>
        <div class="decision-card-grid">
          ${grouped[section.key].length ? grouped[section.key].map(renderCard).join("") : `<div class="empty-box">${escapeHtml(section.empty)}</div>`}
        </div>
      </section>
    `).join("");
  }

  function timingInputForRow(row) {
    return scoringInput(row, row.facts || {});
  }

  function timingChipHtml(row) {
    if (!window.Scoring) return "";
    try {
      const input = timingInputForRow(row);
      const timing = window.Scoring.calculateTimingScore(input);
      const action = window.Scoring.recommendAction(input, timing);
      const chip = window.Scoring.renderTimingChip(timing);
      const actionLabel = action?.thaiAction
        ? `<span class="ts-action-chip" title="${escapeHtml(action.action || "")}">${escapeHtml(action.thaiAction)}</span>`
        : "";
      return `<div class="ts-chip-row">${chip}${actionLabel}</div>`;
    } catch (_error) {
      return "";
    }
  }

  function renderCard(row) {
    const holding = row.portfolio?.isHolding;
    const detailHref = `/asset/${encodeURIComponent(row.providerSymbol || row.symbol)}`;
    const scoreTone = row.scoreLabel.tone;
    const signals = row.decision.keySignals.length ? row.decision.keySignals : ["No clear signal"];
    return `
      <article class="decision-card ${decisionTone(row)}">
        <div class="decision-card-top">
          <div>
            <a class="decision-symbol asset-link" href="${detailHref}">${escapeHtml(row.displaySymbol || row.symbol)}</a>
            ${window.Scoring ? timingChipHtml(row) : ""}
            <p class="card-name">${escapeHtml(row.name || row.symbol)}</p>
          </div>
          <div class="decision-price">
            <strong>${escapeHtml(formatPrice(row.latestClose))}</strong>
            <span>${escapeHtml(formatDate(row.latestDate))}</span>
          </div>
        </div>
        <div class="badge-row">
          <span class="badge ${holding ? "badge-blue" : "badge-gray"}">${holding ? "Holding" : "Watchlist Only"}</span>
          ${holding ? `<span class="badge badge-blue">${escapeHtml(formatHolding(row))}</span>` : '<span class="badge badge-gray">No portfolio impact</span>'}
        </div>
        ${signalStateChip(row)}
        <div class="decision-action-row">
          <div>
            <span class="action-label">${escapeHtml(actionTitle(row.decision.action))}</span>
            <strong>${escapeHtml(row.decision.actionThai)}</strong>
          </div>
          <div class="score-pill score-pill-secondary ${scoreTone}" title="Signal Score เป็นตัวประกอบ (secondary)">
            <strong>${row.score}</strong>
            <span>/100</span>
          </div>
        </div>
        <div class="quality-line">${escapeHtml(row.scoreLabel.label)} · ${escapeHtml(row.scoreLabel.thai)}</div>
        <p class="decision-reason">${escapeHtml(row.decision.reason)}</p>
        <div class="badge-row">
          ${signals.map((signal) => `<span class="badge ${badgeTone(signal)}">${escapeHtml(signal)}</span>`).join("")}
        </div>
        ${row.conflicts.length ? `<div class="conflict-warning"><strong>Conflict:</strong> ${escapeHtml(row.conflicts[0].reason)}</div>` : ""}
        <details class="decision-details">
          <summary>ดูรายละเอียด / View details</summary>
          <div class="details-grid">
            ${detailItem("EMA", row.facts.emaBull ? "EMA Bullish" : row.facts.emaBear ? "EMA Bearish" : "EMA Not Available")}
            ${detailItem("SMA200", row.facts.aboveSma ? "Above SMA200" : row.facts.belowSma ? "Below SMA200" : "SMA200 Not Available")}
            ${detailItem("RSI", rsiLabel(row))}
            ${detailItem("Volume", volumeLabel(row))}
            ${detailItem("Market Risk", row.facts.marketRiskThai ? `${row.facts.marketRiskLabel} (${row.facts.marketRiskThai})` : row.facts.marketRiskLabel)}
            ${detailItem("Source", row.source || "Data Snapshot")}
          </div>
          ${holding ? "" : `<button class="asset-remove-btn" data-remove="${escapeHtml(row.symbol)}" type="button">🗑 เอา ${escapeHtml(row.displaySymbol || row.symbol)} ออกจาก list</button>`}
        </details>
      </article>
    `;
  }

  function compareRows(a, b) {
    const sectionDiff = sectionRank(a.decision.section) - sectionRank(b.decision.section);
    if (sectionDiff) return sectionDiff;
    const holdingDiff = Number(Boolean(b.portfolio?.isHolding)) - Number(Boolean(a.portfolio?.isHolding));
    if (holdingDiff) return holdingDiff;
    const valueDiff = (Number(b.portfolio?.marketValue) || 0) - (Number(a.portfolio?.marketValue) || 0);
    if (valueDiff) return valueDiff;
    return b.score - a.score || String(a.displaySymbol || a.symbol).localeCompare(String(b.displaySymbol || b.symbol));
  }

  function sectionRank(key) {
    return { urgent: 1, buy: 2, watch: 3, none: 4 }[key] || 9;
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function enrichWithHoldingFallback(row, holding, totalValue) {
    const marketValue = holding?.isHolding ? Number(holding.marketValue) || 0 : 0;
    return {
      ...row,
      portfolio: {
        isHolding: Boolean(holding?.isHolding),
        watchlistOnly: !holding?.isHolding,
        marketValue,
        weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0
      }
    };
  }

  function displaySymbol(symbol) {
    if (core.displaySymbolForCanonical) return core.displaySymbolForCanonical(symbol);
    if (symbol === "BTC-USD") return "BTCUSD";
    if (String(symbol).endsWith(".BK")) return String(symbol).slice(0, -3);
    return symbol;
  }

  function inferMarket(symbol) {
    if (symbol.includes("RMF")) return "RMF";
    if (symbol.endsWith(".BK") || symbol.startsWith("^SET")) return "SET";
    if (symbol === "BTCUSD" || symbol === "BTC-USD") return "CRYPTO";
    return "US";
  }

  function isThai(symbol) {
    return symbol.endsWith(".BK") || symbol.startsWith("^SET") || symbol.includes("RMF");
  }

  function marketGroup(row) {
    const type = String(row.assetType || "").toUpperCase();
    if (type.includes("MUTUAL") || type.includes("FUND") || row.symbol.includes("RMF")) return "fund";
    if (type.includes("CRYPTO") || row.symbol.includes("BTC")) return "crypto";
    if (row.symbol.endsWith(".BK") || row.symbol.startsWith("^SET") || type.includes("THAI")) return "thai";
    return "us";
  }

  function actionTitle(action) {
    return {
      buy: "Buy / Add",
      consider: "Consider Add",
      hold: "Hold",
      watch: "Watch",
      review: "Review / Trim",
      avoid: "Avoid / Wait"
    }[action] || "No Action";
  }

  function filterLabel(key) {
    return {
      portfolio: "Portfolio impact",
      action: "Action type",
      confidence: "Confidence",
      conflict: "Conflict",
      market: "Market"
    }[key] || key;
  }

  function decisionTone(row) {
    if (row.decision.action === "review") return "tone-review";
    if (["buy", "consider"].includes(row.decision.action)) return "tone-buy";
    if (row.decision.action === "watch") return "tone-watch";
    if (row.decision.action === "hold") return "tone-hold";
    return "tone-neutral";
  }

  function badgeTone(signal) {
    if (/Bearish|Sell|Risk High|Below/i.test(signal)) return "badge-red";
    if (/Bullish|Buy|Above|Volume Confirmed|Strong Volume/i.test(signal)) return "badge-green";
    if (/Watch|Volume/i.test(signal)) return "badge-amber";
    return "badge-gray";
  }

  // PRIMARY headline chip: the AI-Boom-style signal state, rendered by the
  // shared engine so every page looks identical.
  function signalStateChip(row) {
    if (!window.Scoring || !row.signal) return "";
    const chip = window.Scoring.renderSignalChip(row.signal);
    return chip ? `<div class="signal-state-row">${chip}</div>` : "";
  }

  function detailItem(label, value) {
    return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function rsiLabel(row) {
    const signal = row.rsi?.signal || row.tech?.rsiSignal || "Unknown";
    const value = Number(row.rsi?.rsi14 ?? row.tech?.rsi14);
    return `${signal}${Number.isFinite(value) ? ` (${value.toFixed(1)})` : ""}`;
  }

  function volumeLabel(row) {
    if (!Number.isFinite(row.facts.volumeRatio)) return "No volume signal";
    return `${row.facts.volumeRatio.toFixed(2)}x`;
  }

  function formatHolding(row) {
    const value = Number(row.portfolio?.marketValue) || 0;
    const weight = Number(row.portfolio?.weight) || 0;
    return `${formatPrice(value)} THB · ${weight.toFixed(1)}%`;
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: number >= 100 ? 2 : 4 }).format(number);
  }

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : "-";
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

  filtersRoot?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-filter]");
    if (!select) return;
    state.filters[select.dataset.filter] = select.value;
    renderSummary();
    renderSections();
  });

  summaryRoot?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-summary]");
    if (!card) return;
    const key = card.dataset.summary;

    // Conflicts / High Confidence are cross-cutting → toggle a filter instead of
    // scrolling to a section (they are not sections).
    if (key === "conflicts") {
      const turningOn = state.filters.conflict !== "only";
      state.filters.conflict = turningOn ? "only" : "all";
      renderFilters();
      renderSummary();
      renderSections();
      if (turningOn) sectionsRoot?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (key === "high") {
      const turningOn = state.filters.confidence !== "high";
      state.filters.confidence = turningOn ? "high" : "all";
      renderFilters();
      renderSummary();
      renderSections();
      if (turningOn) sectionsRoot?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Section cards (urgent / buy / watch / none) → scroll to that section.
    document.querySelector(`#decision-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refreshButton?.addEventListener("click", () => {
    actionStatus.textContent = "กำลัง refresh จาก Data Snapshot...";
    render();
  });

  // Fresh-signals summary cards scroll to the matching block/group (falls back to
  // the parent buy/sell block when the specific portfolio group is empty).
  freshRoot?.addEventListener("click", (event) => {
    const card = event.target.closest?.("[data-fresh-jump]");
    if (!card) return;
    const targetId = card.dataset.freshJump;
    let el = document.getElementById(targetId);
    if (!el && targetId.startsWith("fresh-buy")) el = document.getElementById("fresh-buy");
    if (!el && targetId.startsWith("fresh-sell")) el = document.getElementById("fresh-sell");
    (el || freshRoot).scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- list management wiring (remove buttons live inside section cards) ----
  sectionsRoot?.addEventListener("click", async (event) => {
    const btn = event.target.closest?.("[data-remove]");
    if (!btn) return;
    const symbol = btn.getAttribute("data-remove");
    if (!window.confirm("เอา " + symbol + " ออกจาก list ที่ติดตาม?")) return;
    btn.disabled = true;
    await removeAssetFromList(symbol);
    render();
  });

  function openAddAssetModal() {
    const prev = document.getElementById("acAddModal");
    if (prev) prev.remove();
    const back = document.createElement("div");
    back.id = "acAddModal";
    back.className = "ac-modal-back";
    back.innerHTML = `
      <div class="ac-modal" role="dialog" aria-modal="true">
        <h3>เพิ่มสินทรัพย์เข้า list</h3>
        <label>Ticker <input id="acAddTicker" type="text" placeholder="เช่น PLTR, GULF.BK, ETH-USD" autocomplete="off" /></label>
        <label>ชื่อ (ไม่บังคับ) <input id="acAddName" type="text" placeholder="ชื่อที่อยากให้แสดง" /></label>
        <p class="ac-modal-note">เพิ่มแล้วรายการจะเข้า list ทันที และถูกดึงสัญญาณเมื่อกด Load Latest Data ครั้งถัดไป</p>
        <div class="ac-modal-actions">
          <button type="button" id="acAddCancel">ยกเลิก</button>
          <button type="button" id="acAddSave" class="ac-primary">เพิ่ม</button>
        </div>
        <p class="ac-modal-msg" id="acAddMsg"></p>
      </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    back.querySelector("#acAddCancel").addEventListener("click", close);
    const tickerInput = back.querySelector("#acAddTicker");
    tickerInput.focus();
    const save = async () => {
      const msg = back.querySelector("#acAddMsg");
      const result = await addUserAsset(tickerInput.value, back.querySelector("#acAddName").value);
      msg.textContent = result.message;
      msg.className = "ac-modal-msg " + (result.ok ? "ok" : "err");
      if (result.ok) { window.setTimeout(close, 900); render(); }
    };
    back.querySelector("#acAddSave").addEventListener("click", save);
    tickerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
  }
  document.querySelector("#addAssetButton")?.addEventListener("click", openAddAssetModal);

  window.addEventListener("portfolio-data-snapshot", render);
  window.addEventListener("portfolio-holdings-updated", render);

  async function boot() {
    await loadUniverseState();
    const migrated = await migrateWatchlistOnce();
    render();
    if (migrated > 0 && actionStatus) {
      actionStatus.textContent = "ย้ายรายการจาก Watchlist เดิมเข้า list แล้ว " + migrated + " รายการ";
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { boot(); });
  else boot();
})();
