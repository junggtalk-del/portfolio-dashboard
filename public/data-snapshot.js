(function () {
  try {
  const STORAGE_KEY = "portfolio_dashboard_data_snapshot";
  const DATA_VERSION = "2026-06-portfolio-dashboard-v1";
  const REQUIRED_SYMBOLS = ["SPY", "QQQM", "XLK", "^GSPC", "^VIX", "^VVIX", "^VIXEQ"];
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  let memorySnapshot = null;
  let isLoading = false;

  function normalizeTicker(rawTicker) {
    return String(rawTicker || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  }

  function canonicalSymbol(rawTicker) {
    const value = normalizeTicker(rawTicker);
    const compact = value.replace(/[^A-Z0-9]/g, "");
    const aliases = {
      BTC: "BTCUSD",
      "BTC-USD": "BTCUSD",
      KGTECHRMF: "K-GTECHRMF",
      "K GTECHRMF": "K-GTECHRMF",
      KUSXNDQRMF: "K-USXNDQRMF",
      "K USXNDQRMF": "K-USXNDQRMF",
      SET50: "^SET50.BK",
      "SET50.BK": "^SET50.BK",
      SET100: "^SET100.BK",
      "SET100.BK": "^SET100.BK",
      SET: "^SET.BK",
      "SET.BK": "^SET.BK",
      SPX: "^GSPC",
      GSPC: "^GSPC",
      IXIC: "^IXIC",
      NDX: "^NDX"
    };
    return aliases[value] || aliases[compact] || value;
  }

  function providerSymbol(symbol) {
    const canonical = canonicalSymbol(symbol);
    if (canonical === "BTCUSD") return "BTC-USD";
    return canonical;
  }

  function readSnapshot() {
    if (memorySnapshot) return memorySnapshot;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed?.dataVersion === DATA_VERSION) {
        memorySnapshot = parsed;
        return memorySnapshot;
      }
    } catch (_error) {
      return null;
    }
    return null;
  }

  function writeSnapshot(snapshot) {
    memorySnapshot = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      // Keep in-memory snapshot when browser storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("portfolio-data-snapshot", { detail: snapshot }));
    return snapshot;
  }

  function snapshotAgeMinutes(snapshot = readSnapshot()) {
    if (!snapshot?.loadedAt) return Infinity;
    return Math.max(0, (Date.now() - new Date(snapshot.loadedAt).getTime()) / 60000);
  }

  function freshness(snapshot = readSnapshot()) {
    const age = snapshotAgeMinutes(snapshot);
    if (!Number.isFinite(age)) return { key: "missing", label: "No snapshot", thai: "ยังไม่มีข้อมูลล่าสุด" };
    if (age <= 30) return { key: "fresh", label: "Fresh", thai: "ข้อมูลสด" };
    if (age <= 360) return { key: "recent", label: "Recently loaded", thai: "ข้อมูลล่าสุด" };
    if (age <= 1440) return { key: "stale", label: "Stale", thai: "ข้อมูลเริ่มเก่า" };
    return { key: "outdated", label: "Outdated", thai: "ข้อมูลเก่า ควรโหลดใหม่" };
  }

  function emitProgress(detail) {
    window.dispatchEvent(new CustomEvent("portfolio-data-snapshot-progress", { detail }));
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "x-data-snapshot": "true" }
    });
  }

  function marketPayloadFromSnapshot(symbol) {
    const snapshot = readSnapshot();
    const key = canonicalSymbol(symbol);
    const item = snapshot?.historicalData?.[key] || snapshot?.historicalData?.[providerSymbol(key)];
    if (!item) return null;
    return {
      ...item,
      snapshotId: snapshot.snapshotId,
      sourceType: item.sourceType || "DATA_SNAPSHOT",
      source: item.source || "Data Snapshot",
      loadedAt: snapshot.loadedAt
    };
  }

  function shouldBypassSnapshot(url) {
    return url.searchParams.get("refresh") === "1" || url.searchParams.get("snapshot") === "bypass";
  }

  if (originalFetch) {
    window.fetch = async function snapshotFetch(input, init) {
      const requestUrl = typeof input === "string" ? input : input?.url;
      if (requestUrl) {
        const url = new URL(requestUrl, window.location.origin);
        if (url.origin === window.location.origin && !shouldBypassSnapshot(url)) {
          if (url.pathname === "/api/market-data") {
            const symbol = url.searchParams.get("symbol");
            const payload = marketPayloadFromSnapshot(symbol);
            if (payload) return jsonResponse(payload);
            return jsonResponse({ error: "NO_DATA_SNAPSHOT", dates: [], closes: [], latestClose: null, latestDate: null, sourceType: "NO_DATA_SNAPSHOT", source: "ยังไม่มีข้อมูลล่าสุด กรุณากด Load Latest Data" }, 428);
          }
          if (url.pathname === "/api/market-risk") {
            const snapshot = readSnapshot();
            if (snapshot?.marketRisk) return jsonResponse({ ...snapshot.marketRisk, snapshotId: snapshot.snapshotId, loadedAt: snapshot.loadedAt });
            return jsonResponse({ error: "NO_DATA_SNAPSHOT", source: "ยังไม่มีข้อมูลล่าสุด กรุณากด Load Latest Data" }, 428);
          }
        }
      }
      return originalFetch(input, init);
    };
  }

  function calculateSMA(values, period) {
    if (!Array.isArray(values) || values.length < period) return null;
    const slice = values.slice(-period).map(Number).filter(Number.isFinite);
    if (slice.length < period) return null;
    return slice.reduce((sum, value) => sum + value, 0) / period;
  }

  function calculateEMA(values, period) {
    const nums = (Array.isArray(values) ? values : []).map(Number);
    if (nums.length < period || nums.slice(0, period).some((value) => !Number.isFinite(value))) return null;
    let ema = nums.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    const multiplier = 2 / (period + 1);
    for (let index = period; index < nums.length; index += 1) {
      if (!Number.isFinite(nums[index])) return null;
      ema = (nums[index] - ema) * multiplier + ema;
    }
    return ema;
  }

  // Full EMA series (one value per bar; nulls until the period warms up).
  function emaSeries(values, period) {
    const nums = (Array.isArray(values) ? values : []).map(Number);
    const out = new Array(nums.length).fill(null);
    if (nums.length < period) return out;
    let ema = nums.slice(0, period).reduce((s, v) => s + v, 0) / period;
    out[period - 1] = ema;
    const k = 2 / (period + 1);
    for (let i = period; i < nums.length; i += 1) {
      if (!Number.isFinite(nums[i])) return out;
      ema = (nums[i] - ema) * k + ema;
      out[i] = ema;
    }
    return out;
  }

  // Bars since the most recent EMA12×EMA26 bullish / bearish cross (null if none found).
  function crossDays(closes) {
    const e12 = emaSeries(closes, 12);
    const e26 = emaSeries(closes, 26);
    let bull = null, bear = null;
    for (let i = closes.length - 1; i > 0 && (bull === null || bear === null); i -= 1) {
      const a = e12[i], b = e26[i], pa = e12[i - 1], pb = e26[i - 1];
      if (a == null || b == null || pa == null || pb == null) continue;
      if (bull === null && pa <= pb && a > b) bull = closes.length - 1 - i;
      if (bear === null && pa >= pb && a < b) bear = closes.length - 1 - i;
    }
    return { bull, bear };
  }

  // Rolling SMA200 series (null until 200 bars), then bars since price reclaimed / broke it.
  function sma200Series(values) {
    const nums = (Array.isArray(values) ? values : []).map(Number);
    const out = new Array(nums.length).fill(null);
    if (nums.length < 200) return out;
    let sum = 0;
    for (let i = 0; i < 200; i += 1) sum += nums[i];
    out[199] = sum / 200;
    for (let i = 200; i < nums.length; i += 1) { sum += nums[i] - nums[i - 200]; out[i] = sum / 200; }
    return out;
  }
  function smaReclaimDays(closes) {
    const s = sma200Series(closes);
    let reclaim = null, brk = null;
    for (let i = closes.length - 1; i > 0 && (reclaim === null || brk === null); i -= 1) {
      const p = closes[i], sp = s[i], pp = closes[i - 1], psp = s[i - 1];
      if (sp == null || psp == null || !Number.isFinite(p) || !Number.isFinite(pp)) continue;
      if (reclaim === null && pp <= psp && p > sp) reclaim = closes.length - 1 - i;
      if (brk === null && pp >= psp && p < sp) brk = closes.length - 1 - i;
    }
    return { reclaim, brk };
  }

  function calculateRSI(values, period = 14) {
    const nums = (Array.isArray(values) ? values : []).map(Number);
    if (nums.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let index = nums.length - period; index < nums.length; index += 1) {
      const change = nums[index] - nums[index - 1];
      if (!Number.isFinite(change)) return null;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  function classifyRsi(rsi) {
    if (!Number.isFinite(rsi)) return "INSUFFICIENT_RSI_DATA";
    if (rsi <= 30) return "BUY_SIGNAL";
    if (rsi >= 31 && rsi <= 35) return "WATCH_BUY";
    if (rsi >= 67 && rsi <= 69) return "WATCH_SELL";
    if (rsi >= 70) return "SELL_SIGNAL";
    return "NEUTRAL";
  }

  function calculateSignals(history) {
    const closes = history?.closes || [];
    const latestClose = Number(closes[closes.length - 1]);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const sma200 = calculateSMA(closes, 200);
    const rsi14 = calculateRSI(closes, 14);
    // Volume ratio = latest volume / average of the previous 5 sessions (for volume confirmation).
    let volumeRatio = null;
    const volumes = Array.isArray(history?.volumes) ? history.volumes.map(Number) : [];
    if (volumes.length >= 6) {
      const latestVol = volumes[volumes.length - 1];
      const prior = volumes.slice(-6, -1).filter((v) => Number.isFinite(v) && v > 0);
      const avg = prior.length ? prior.reduce((s, v) => s + v, 0) / prior.length : null;
      if (Number.isFinite(latestVol) && latestVol > 0 && avg && avg > 0) volumeRatio = Math.round((latestVol / avg) * 100) / 100;
    }
    const numCloses = closes.map(Number);
    const cross = crossDays(numCloses);
    const smaCross = smaReclaimDays(numCloses);
    return {
      latestClose: Number.isFinite(latestClose) ? latestClose : null,
      latestDate: history?.dates?.[history.dates.length - 1] || null,
      ema12,
      ema26,
      sma200,
      rsi14,
      volumeRatio,
      daysSinceEmaBullishCross: cross.bull,
      daysSinceEmaBearishCross: cross.bear,
      daysSinceSma200Reclaim: smaCross.reclaim,
      daysSinceSma200Break: smaCross.brk,
      rsiSignal: classifyRsi(rsi14),
      emaStatus: Number.isFinite(ema12) && Number.isFinite(ema26) ? (ema12 > ema26 ? "EMA_BULLISH" : ema12 < ema26 ? "EMA_BEARISH" : "EMA_NEUTRAL") : "EMA_NOT_AVAILABLE",
      sma200Status: Number.isFinite(sma200) && Number.isFinite(latestClose) ? (latestClose > sma200 ? "ABOVE_SMA200" : latestClose < sma200 ? "BELOW_SMA200" : "AT_SMA200") : "SMA200_NOT_AVAILABLE"
    };
  }

  async function loadUniverseAssets() {
    const assets = [];
    const seedAssets = window.AIBoomUniverseSeed?.ai_boom_universe || [];
    assets.push(...seedAssets);
    try {
      const response = await originalFetch("/api/ai-universe?snapshot=bypass", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      assets.push(...(payload?.data?.userAssets || []));
    } catch (_error) {}
    try {
      const response = await originalFetch("/api/portfolio-holdings", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      for (const holding of payload?.data || []) {
        assets.push({
          ticker: holding.canonicalSymbol,
          name: holding.assetName,
          asset_type: holding.assetType,
          provider_symbol: holding.providerSymbol
        });
      }
    } catch (_error) {}
    for (const symbol of REQUIRED_SYMBOLS) assets.push({ ticker: symbol, name: symbol, asset_type: symbol.startsWith("^") ? "INDEX" : "ETF" });
    const seen = new Set();
    return assets.filter((asset) => {
      const key = canonicalSymbol(asset?.ticker);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      asset.canonicalSymbol = key;
      asset.providerSymbol = asset.provider_symbol || providerSymbol(key);
      return true;
    });
  }

  async function fetchMarketData(asset, index, total) {
    const symbol = asset.providerSymbol || providerSymbol(asset.canonicalSymbol || asset.ticker);
    emitProgress({ step: 2, stepLabel: "Fetching historical data", completedAssets: index, totalAssets: total, currentSymbol: symbol });
    const response = await originalFetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}&refresh=1`, { cache: "no-store" });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `market data failed (${response.status})`);
    return JSON.parse(text);
  }

  async function loadLatestData(options = {}) {
    if (isLoading) return readSnapshot();
    isLoading = true;
    const previous = readSnapshot();
    const retrySymbols = options.retryFailed ? new Set((previous?.errors || []).map((error) => canonicalSymbol(error.symbol))) : null;
    const loadedAt = new Date().toISOString();
    const snapshot = {
      snapshotId: `snapshot-${Date.now()}`,
      dataVersion: DATA_VERSION,
      loadedAt,
      status: "loading",
      assets: [],
      prices: {},
      historicalData: {},
      technicalSignals: {},
      rsiSignals: {},
      marketRisk: null,
      portfolioHoldings: null,
      portfolioStatus: null,
      exposureMap: null,
      errors: []
    };
    try {
      emitProgress({ step: 1, stepLabel: "Loading asset universe", completedAssets: 0, totalAssets: 0 });
      const assets = await loadUniverseAssets();
      const loadAssets = retrySymbols ? assets.filter((asset) => retrySymbols.has(canonicalSymbol(asset.ticker))) : assets;
      snapshot.assets = retrySymbols ? (previous?.assets || assets) : assets;
      let completed = 0;
      for (const asset of loadAssets) {
        const key = canonicalSymbol(asset.ticker);
        try {
          const payload = await fetchMarketData(asset, completed, loadAssets.length);
          const history = {
            ...payload,
            symbol: key,
            providerSymbol: asset.providerSymbol || payload.marketSymbol || providerSymbol(key),
            source: payload.source || payload.provider || "Market data",
            sourceType: payload.sourceType || "LIVE_MARKET_DATA"
          };
          snapshot.historicalData[key] = history;
          snapshot.prices[key] = { latestClose: payload.latestClose, latestDate: payload.latestDate, source: history.source };
          const signals = calculateSignals(history);
          snapshot.technicalSignals[key] = signals;
          snapshot.rsiSignals[key] = { rsi14: signals.rsi14, signal: signals.rsiSignal, latestDate: signals.latestDate };
        } catch (error) {
          snapshot.errors.push({ symbol: key, provider: asset.providerSymbol || providerSymbol(key), errorMessage: String(error.message || error), failedAt: new Date().toISOString() });
        } finally {
          completed += 1;
          emitProgress({ step: 3, stepLabel: "Calculating signals", completedAssets: completed, totalAssets: loadAssets.length, currentSymbol: key, failedAssets: snapshot.errors.length });
        }
      }
      if (retrySymbols && previous) {
        snapshot.historicalData = { ...(previous.historicalData || {}), ...snapshot.historicalData };
        snapshot.prices = { ...(previous.prices || {}), ...snapshot.prices };
        snapshot.technicalSignals = { ...(previous.technicalSignals || {}), ...snapshot.technicalSignals };
        snapshot.rsiSignals = { ...(previous.rsiSignals || {}), ...snapshot.rsiSignals };
        snapshot.errors = snapshot.errors;
      }
      emitProgress({ step: 4, stepLabel: "Loading market risk", completedAssets: completed, totalAssets: loadAssets.length });
      try {
        const riskResponse = await originalFetch("/api/market-risk?snapshot=bypass", { cache: "no-store" });
        snapshot.marketRisk = riskResponse.ok ? await riskResponse.json() : { error: await riskResponse.text() };
      } catch (error) {
        snapshot.marketRisk = { error: String(error.message || error) };
      }
      emitProgress({ step: 5, stepLabel: "Loading portfolio holdings", completedAssets: completed, totalAssets: loadAssets.length });
      try {
        const holdingsResponse = await originalFetch("/api/portfolio-holdings", { cache: "no-store" });
        snapshot.portfolioHoldings = holdingsResponse.ok ? await holdingsResponse.json() : { error: await holdingsResponse.text() };
      } catch (error) {
        snapshot.portfolioHoldings = { error: String(error.message || error) };
      }
      // --- Scoring: Timing Score + Signal Quality Score + Action + Quadrant ---
      try {
        snapshot.scoring = { bySymbol: {}, calculatedAt: new Date().toISOString() };
        if (typeof window !== "undefined" && window.Scoring && typeof window.Scoring.calculateTimingScore === "function") {
          const riskLevel = snapshot.marketRisk && snapshot.marketRisk.risk && snapshot.marketRisk.risk.level
            ? (snapshot.marketRisk.risk.level.label || snapshot.marketRisk.risk.level.thai) : null;
          const calcAt = snapshot.scoring.calculatedAt;
          // Map holdings -> isHolding so the action is holding-aware.
          const holdingsByKey = {};
          const hData = snapshot.portfolioHoldings && snapshot.portfolioHoldings.data;
          if (Array.isArray(hData)) hData.forEach((h) => { const hk = canonicalSymbol(h.canonicalSymbol || h.ticker || ""); if (hk) holdingsByKey[hk] = h; });
          Object.keys(snapshot.technicalSignals || {}).forEach((key) => {
            const sig = snapshot.technicalSignals[key] || {};
            const holding = holdingsByKey[key];
            const input = {
              canonicalSymbol: key,
              latestPrice: sig.latestClose,
              latestDate: sig.latestDate,
              ema12: sig.ema12,
              ema26: sig.ema26,
              sma200: sig.sma200,
              rsi14: sig.rsi14,
              emaTrendStatus: sig.emaStatus,
              sma200Status: sig.sma200Status,
              volumeRatio: sig.volumeRatio,
              daysSinceEmaBullishCross: sig.daysSinceEmaBullishCross,
              daysSinceEmaBearishCross: sig.daysSinceEmaBearishCross,
              daysSinceSma200Reclaim: sig.daysSinceSma200Reclaim,
              daysSinceSma200Break: sig.daysSinceSma200Break,
              isNewBullishSignal: sig.daysSinceEmaBullishCross != null && sig.daysSinceEmaBullishCross <= 3,
              isHolding: holding ? !!holding.isHolding : false,
              marketRiskLevel: riskLevel
            };
            try {
              const t = window.Scoring.calculateTimingScore(input);
              const action = window.Scoring.recommendAction(input, t);
              const g = t.gates || {};
              const c = t.components || {};
              const thaiWarnings = (t.warnings || []).map((w) => w.thaiMessage || w.message || "").filter(Boolean);
              snapshot.scoring.bySymbol[key] = {
                // --- new gate-driven Signal Score ---
                signalScore: t.score,
                signalLabel: t.label,
                thaiSignalLabel: t.thaiLabel,
                color: t.color,
                emaScore: c.ema, sma200Score: c.sma200, volumeScore: c.volume,
                emaGate: g.ema ? g.ema.status : null,
                sma200Gate: g.sma200 ? g.sma200.status : null,
                volumeGate: g.volume ? g.volume.status : null,
                gates: g,
                finalAction: action.action,
                thaiFinalAction: action.thaiAction,
                actionKey: action.key,
                actionSection: action.section,
                actionCategory: action.actionCategory,
                actionPriority: action.priority,
                reasons: t.reasons,
                thaiReasons: t.thaiReasons,
                warnings: t.warnings,
                thaiWarnings: thaiWarnings,
                calculationExplanation: t.calculationExplanation,
                thaiCalculationExplanation: t.thaiCalculationExplanation,
                componentDetail: t.componentDetail,
                isHolding: input.isHolding,
                // --- backward-compatible aliases (existing consumers) ---
                timingScore: t.score,
                thaiTimingLabel: t.thaiLabel,
                action: action.action,
                thaiAction: action.thaiAction,
                signalQualityScore: t.score,
                signalQualityLabel: t.label,
                thaiSignalQualityLabel: t.thaiLabel,
                signalQualityColor: t.color,
                signalQualityBreakdown: { emaScore: c.ema, sma200Score: c.sma200, volumeScore: c.volume },
                signalQualityReasons: t.thaiReasons,
                signalQualityWarnings: thaiWarnings,
                thaiSignalQualityExplanation: action.thaiExplanation,
                calculatedAt: calcAt
              };
            } catch (_perSymbolError) { /* skip this symbol */ }
          });
        }
      } catch (_scoringError) { /* scoring is best-effort */ }

      emitProgress({ step: 6, stepLabel: "Saving snapshot", completedAssets: completed, totalAssets: loadAssets.length, failedAssets: snapshot.errors.length });
      snapshot.status = snapshot.errors.length ? "partial" : "ready";
      return writeSnapshot(snapshot);
    } finally {
      isLoading = false;
    }
  }

  window.PortfolioDataSnapshot = {
    STORAGE_KEY,
    DATA_VERSION,
    read: readSnapshot,
    write: writeSnapshot,
    freshness,
    ageMinutes: snapshotAgeMinutes,
    loadLatestData,
    retryFailed: () => loadLatestData({ retryFailed: true }),
    canonicalSymbol,
    normalizeTicker,
    providerSymbol,
    originalFetch
  };
  } catch (error) {
    window.PortfolioDataSnapshot = {
      STORAGE_KEY: "portfolio_dashboard_data_snapshot",
      DATA_VERSION: "2026-06-portfolio-dashboard-v1",
      read: () => null,
      write: (snapshot) => snapshot,
      freshness: () => ({ key: "error", label: "Load failed", thai: "โหลดไม่สำเร็จ" }),
      ageMinutes: () => Infinity,
      canonicalSymbol: (s) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, ""),
      loadLatestData: async () => {
        throw error;
      },
      retryFailed: async () => {
        throw error;
      },
      originalFetch: window.fetch ? window.fetch.bind(window) : null,
      initError: String(error?.message || error)
    };
  }
})();
