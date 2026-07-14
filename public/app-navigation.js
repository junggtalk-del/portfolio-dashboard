(function () {
  // ============================================================
  // Shared "Mission Control" AppShell + Data Snapshot system.
  // The snapshot logic below is unchanged business logic; only the
  // navigation chrome was rebuilt to match the Home page shell.
  // ============================================================

  const SNAPSHOT_STORAGE_KEY = "portfolio_dashboard_data_snapshot";
  const SNAPSHOT_DATA_VERSION = "2026-06-portfolio-dashboard-v1";
  const REQUIRED_SNAPSHOT_SYMBOLS = ["SPY", "QQQM", "XLK", "^GSPC", "^VIX", "^VVIX", "^VIXEQ", "BTC-USD", "^IXIC", "DX-Y.NYB", "^TNX", "GLD"];

  function normalizePath(pathname) {
    const path = String(pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/index.html" ? "/" : path;
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
    return canonical === "BTCUSD" ? "BTC-USD" : canonical;
  }

  // NOTE: the old AI Boom Universe → Watchlist sync engine was removed when the
  // Watchlist merged into the Action Center (one unified focus list, no more
  // separate store to keep in sync).

  function emitSnapshotProgress(detail) {
    window.dispatchEvent(new CustomEvent("portfolio-data-snapshot-progress", { detail }));
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", "x-data-snapshot": "true" }
    });
  }

  function makeSnapshotApiFallback() {
    const originalFetch = window.fetch ? window.fetch.bind(window) : null;
    let memorySnapshot = null;
    let isLoading = false;

    function read() {
      if (memorySnapshot) return memorySnapshot;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(SNAPSHOT_STORAGE_KEY) || "null");
        if (parsed?.dataVersion === SNAPSHOT_DATA_VERSION) {
          memorySnapshot = parsed;
          return parsed;
        }
      } catch (_error) {}
      return null;
    }

    function write(snapshot) {
      memorySnapshot = snapshot;
      try {
        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch (_error) {}
      window.dispatchEvent(new CustomEvent("portfolio-data-snapshot", { detail: snapshot }));
      return snapshot;
    }

    function ageMinutes(snapshot = read()) {
      if (!snapshot?.loadedAt) return Infinity;
      return Math.max(0, (Date.now() - new Date(snapshot.loadedAt).getTime()) / 60000);
    }

    function freshness(snapshot = read()) {
      const age = ageMinutes(snapshot);
      if (!Number.isFinite(age)) return { key: "missing", label: "No snapshot", thai: "ยังไม่มีข้อมูลล่าสุด" };
      if (age <= 30) return { key: "fresh", label: "Fresh", thai: "ข้อมูลสด" };
      if (age <= 360) return { key: "recent", label: "Recently loaded", thai: "ข้อมูลล่าสุด" };
      if (age <= 1440) return { key: "stale", label: "Stale", thai: "ข้อมูลเริ่มเก่า" };
      return { key: "outdated", label: "Outdated", thai: "ข้อมูลเก่า ควรโหลดใหม่" };
    }

    function patchFetch() {
      if (!originalFetch || window.__portfolioSnapshotFetchPatched) return;
      window.__portfolioSnapshotFetchPatched = true;
      window.fetch = async function snapshotFetch(input, init) {
        const requestUrl = typeof input === "string" ? input : input?.url;
        if (requestUrl) {
          const url = new URL(requestUrl, window.location.origin);
          const bypass = url.searchParams.get("refresh") === "1" || url.searchParams.get("snapshot") === "bypass";
          if (url.origin === window.location.origin && !bypass) {
            if (url.pathname === "/api/market-data") {
              const symbol = canonicalSymbol(url.searchParams.get("symbol"));
              const snapshot = read();
              const payload = snapshot?.historicalData?.[symbol] || snapshot?.historicalData?.[providerSymbol(symbol)];
              if (payload) return jsonResponse({ ...payload, snapshotId: snapshot.snapshotId, loadedAt: snapshot.loadedAt });
              return jsonResponse({ error: "NO_DATA_SNAPSHOT", dates: [], closes: [], latestClose: null, latestDate: null, sourceType: "NO_DATA_SNAPSHOT", source: "ยังไม่มีข้อมูลล่าสุด กรุณากด Load Latest Data" }, 428);
            }
            if (url.pathname === "/api/market-risk") {
              const snapshot = read();
              if (snapshot?.marketRisk) return jsonResponse({ ...snapshot.marketRisk, snapshotId: snapshot.snapshotId, loadedAt: snapshot.loadedAt });
              return jsonResponse({ error: "NO_DATA_SNAPSHOT", source: "ยังไม่มีข้อมูลล่าสุด กรุณากด Load Latest Data" }, 428);
            }
          }
        }
        return originalFetch(input, init);
      };
    }

    async function loadUniverseAssets() {
      if (!originalFetch) throw new Error("Fetch API is not available in this browser");
      const assets = [];
      assets.push(...(window.AIBoomUniverseSeed?.ai_boom_universe || []));
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
      for (const symbol of REQUIRED_SNAPSHOT_SYMBOLS) assets.push({ ticker: symbol, name: symbol });
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

    function calculateSMA(values, period) {
      if (!Array.isArray(values) || values.length < period) return null;
      const slice = values.slice(-period).map(Number).filter(Number.isFinite);
      return slice.length === period ? slice.reduce((sum, value) => sum + value, 0) / period : null;
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
      const avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      return 100 - 100 / (1 + (gains / period) / avgLoss);
    }

    function calculateSignals(history) {
      const closes = history?.closes || [];
      const latestClose = Number(closes[closes.length - 1]);
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      const sma200 = calculateSMA(closes, 200);
      const rsi14 = calculateRSI(closes, 14);
      return {
        latestClose: Number.isFinite(latestClose) ? latestClose : null,
        latestDate: history?.dates?.[history.dates.length - 1] || null,
        ema12,
        ema26,
        sma200,
        rsi14,
        emaStatus: Number.isFinite(ema12) && Number.isFinite(ema26) ? (ema12 > ema26 ? "EMA_BULLISH" : ema12 < ema26 ? "EMA_BEARISH" : "EMA_NEUTRAL") : "EMA_NOT_AVAILABLE",
        sma200Status: Number.isFinite(sma200) && Number.isFinite(latestClose) ? (latestClose > sma200 ? "ABOVE_SMA200" : latestClose < sma200 ? "BELOW_SMA200" : "AT_SMA200") : "SMA200_NOT_AVAILABLE",
        rsiSignal: Number.isFinite(rsi14) ? (rsi14 <= 30 ? "BUY_SIGNAL" : rsi14 <= 35 ? "WATCH_BUY" : rsi14 >= 70 ? "SELL_SIGNAL" : rsi14 >= 67 ? "WATCH_SELL" : "NEUTRAL") : "INSUFFICIENT_RSI_DATA"
      };
    }

    async function loadLatestData(options = {}) {
      if (isLoading) return read();
      isLoading = true;
      try {
        patchFetch();
        emitSnapshotProgress({ step: 1, stepLabel: "Loading asset universe", completedAssets: 0, totalAssets: 0 });
        const previous = read();
        const retrySymbols = options.retryFailed ? new Set((previous?.errors || []).map((error) => canonicalSymbol(error.symbol))) : null;
        const assets = await loadUniverseAssets();
        const loadAssets = retrySymbols ? assets.filter((asset) => retrySymbols.has(canonicalSymbol(asset.ticker))) : assets;
        const snapshot = {
          snapshotId: `snapshot-${Date.now()}`,
          dataVersion: SNAPSHOT_DATA_VERSION,
          loadedAt: new Date().toISOString(),
          status: "loading",
          assets: retrySymbols ? (previous?.assets || assets) : assets,
          prices: retrySymbols ? { ...(previous?.prices || {}) } : {},
          historicalData: retrySymbols ? { ...(previous?.historicalData || {}) } : {},
          technicalSignals: retrySymbols ? { ...(previous?.technicalSignals || {}) } : {},
          rsiSignals: retrySymbols ? { ...(previous?.rsiSignals || {}) } : {},
          marketRisk: previous?.marketRisk || null,
          portfolioHoldings: previous?.portfolioHoldings || null,
          portfolioStatus: previous?.portfolioStatus || null,
          exposureMap: previous?.exposureMap || null,
          errors: []
        };
        let completed = 0;
        for (const asset of loadAssets) {
          const key = canonicalSymbol(asset.ticker);
          const symbol = asset.providerSymbol || providerSymbol(key);
          try {
            emitSnapshotProgress({ step: 2, stepLabel: "Fetching latest prices and history", completedAssets: completed, totalAssets: loadAssets.length, currentSymbol: symbol, failedAssets: snapshot.errors.length });
            const response = await originalFetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}&refresh=1`, { cache: "no-store" });
            const text = await response.text();
            if (!response.ok) throw new Error(text || `market data failed (${response.status})`);
            const payload = JSON.parse(text);
            const history = {
              ...payload,
              symbol: key,
              providerSymbol: symbol,
              source: payload.source || payload.provider || "Market data",
              sourceType: payload.sourceType || "LIVE_MARKET_DATA"
            };
            snapshot.historicalData[key] = history;
            snapshot.prices[key] = { latestClose: payload.latestClose, latestDate: payload.latestDate, source: history.source };
            const signals = calculateSignals(history);
            snapshot.technicalSignals[key] = signals;
            snapshot.rsiSignals[key] = { rsi14: signals.rsi14, signal: signals.rsiSignal, latestDate: signals.latestDate };
          } catch (error) {
            snapshot.errors.push({ symbol: key, provider: symbol, errorMessage: String(error.message || error), failedAt: new Date().toISOString() });
          } finally {
            completed += 1;
            emitSnapshotProgress({ step: 3, stepLabel: "Calculating technical signals", completedAssets: completed, totalAssets: loadAssets.length, currentSymbol: key, failedAssets: snapshot.errors.length });
          }
        }
        emitSnapshotProgress({ step: 4, stepLabel: "Calculating market risk", completedAssets: completed, totalAssets: loadAssets.length, failedAssets: snapshot.errors.length });
        try {
          const response = await originalFetch("/api/market-risk?snapshot=bypass", { cache: "no-store" });
          snapshot.marketRisk = response.ok ? await response.json() : { error: await response.text() };
        } catch (error) {
          snapshot.marketRisk = { error: String(error.message || error) };
        }
        emitSnapshotProgress({ step: 5, stepLabel: "Loading portfolio holdings", completedAssets: completed, totalAssets: loadAssets.length, failedAssets: snapshot.errors.length });
        try {
          const response = await originalFetch("/api/portfolio-holdings", { cache: "no-store" });
          snapshot.portfolioHoldings = response.ok ? await response.json() : { error: await response.text() };
        } catch (error) {
          snapshot.portfolioHoldings = { error: String(error.message || error) };
        }
        emitSnapshotProgress({ step: 6, stepLabel: "Calculating timing scores", completedAssets: completed, totalAssets: loadAssets.length, failedAssets: snapshot.errors.length });
        try {
          if (window.Scoring && typeof window.Scoring.scoreAsset === "function") {
            const riskLevel = snapshot.marketRisk?.risk?.level?.label || snapshot.marketRisk?.risk?.level?.thai || null;
            const riskScore = snapshot.marketRisk?.risk?.score ?? null;
            const holdingsByKey = {};
            const hData = snapshot.portfolioHoldings?.data;
            if (Array.isArray(hData)) for (const h of hData) holdingsByKey[canonicalSymbol(h.canonicalSymbol)] = h;
            const calculatedAt = new Date().toISOString();
            snapshot.scoring = { bySymbol: {}, calculatedAt };
            for (const key of Object.keys(snapshot.technicalSignals || {})) {
              const sig = snapshot.technicalSignals[key] || {};
              const holding = holdingsByKey[key];
              const result = window.Scoring.scoreAsset({
                canonicalSymbol: key,
                latestPrice: sig.latestClose,
                latestDate: sig.latestDate,
                ema12: sig.ema12,
                ema26: sig.ema26,
                sma200: sig.sma200,
                rsi14: sig.rsi14,
                emaTrendStatus: sig.emaStatus,
                sma200Status: sig.sma200Status,
                marketRiskLevel: riskLevel,
                marketRiskScore: riskScore,
                isHolding: holding ? !!holding.isHolding : false,
                portfolioWeight: holding ? holding.targetWeight : null,
                marketValue: holding ? holding.marketValue : null
              });
              snapshot.scoring.bySymbol[key] = {
                timingScore: result.timing.score,
                timingGrade: result.timing.grade,
                timingLabel: result.timing.label,
                thaiTimingLabel: result.timing.thaiLabel,
                color: result.timing.color,
                quadrant: result.quadrant.quadrant,
                action: result.recommendation.action,
                thaiAction: result.recommendation.thaiAction,
                actionCategory: result.recommendation.actionCategory,
                actionPriority: result.recommendation.priority,
                reasons: result.timing.reasons,
                warnings: result.timing.warnings,
                conflicts: result.timing.conflicts,
                calculatedAt
              };
            }
          }
        } catch (_scoringError) {}
        // Bitcoin Intelligence (Phase 1) — extend the snapshot with one new object,
        // computed only during Load Latest Data. Best-effort; never blocks a load.
        try {
          if (window.BitcoinIntelligence && typeof window.BitcoinIntelligence.run === "function") {
            snapshot.bitcoinIntelligence = await window.BitcoinIntelligence.run(snapshot, { fetch: originalFetch });
          }
        } catch (_biError) { /* intelligence is best-effort */ }
        // Wave 3 Setup — Early Wave 3 detection; extend the snapshot with one new object,
        // computed only during Load Latest Data. Best-effort; never blocks a load.
        try {
          if (window.Wave3Engine && typeof window.Wave3Engine.run === "function") {
            snapshot.wave3 = await window.Wave3Engine.run(snapshot, { fetch: originalFetch, now: new Date().toISOString() });
          }
        } catch (_w3Error) { /* wave3 is best-effort */ }
        emitSnapshotProgress({ step: 6, stepLabel: "Saving snapshot", completedAssets: completed, totalAssets: loadAssets.length, failedAssets: snapshot.errors.length });
        snapshot.status = snapshot.errors.length ? "partial" : "ready";
        return write(snapshot);
      } finally {
        isLoading = false;
      }
    }

    patchFetch();
    return {
      STORAGE_KEY: SNAPSHOT_STORAGE_KEY,
      DATA_VERSION: SNAPSHOT_DATA_VERSION,
      read,
      write,
      freshness,
      ageMinutes,
      loadLatestData,
      retryFailed: () => loadLatestData({ retryFailed: true }),
      originalFetch
    };
  }

  function ensureSnapshotApi() {
    if (window.PortfolioDataSnapshot?.loadLatestData) return window.PortfolioDataSnapshot;
    window.PortfolioDataSnapshot = makeSnapshotApiFallback();
    return window.PortfolioDataSnapshot;
  }

  function formatDateTime(value) {
    if (!value) return "ยังไม่มีข้อมูลล่าสุด";
    try {
      return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch (_error) {
      return String(value);
    }
  }

  function updateDataStatus(snapshot) {
    const api = ensureSnapshotApi();
    const current = snapshot || api?.read?.();
    const fresh = api?.freshness?.(current) || { label: "No snapshot", thai: "ยังไม่มีข้อมูลล่าสุด", key: "missing" };
    const loadedAt = document.querySelector("#appDataLoadedAt");
    const counts = document.querySelector("#appDataCounts");
    const freshness = document.querySelector("#appDataFreshness");
    const retry = document.querySelector("#appRetryFailedButton");
    if (loadedAt) loadedAt.textContent = current?.loadedAt ? formatDateTime(current.loadedAt) : "ยังไม่มีข้อมูลล่าสุด";
    const total = current?.assets?.length || 0;
    const failed = current?.errors?.length || 0;
    const success = Math.max(0, total - failed);
    if (counts) counts.textContent = total ? `${success}/${total}${failed ? ` · ล้มเหลว ${failed}` : ""}` : "";
    if (freshness) {
      freshness.textContent = `● ${fresh.thai}`;
      freshness.dataset.freshness = fresh.key;
      freshness.className = "mc-pill " + (fresh.key === "fresh" ? "mc-pill-fresh" : "mc-pill-stale");
    }
    if (retry) retry.hidden = !failed;
  }

  function updateProgress(detail = {}) {
    const counts = document.querySelector("#appDataCounts");
    const freshness = document.querySelector("#appDataFreshness");
    if (counts) {
      const completed = detail.completedAssets ?? 0;
      const total = detail.totalAssets ?? 0;
      const failed = detail.failedAssets ?? 0;
      counts.textContent = `${completed}/${total}${detail.currentSymbol ? ` · ${detail.currentSymbol}` : ""}${failed ? ` · ล้มเหลว ${failed}` : ""}`;
    }
    if (freshness) {
      freshness.textContent = `● Step ${detail.step || "-"}/6`;
      freshness.className = "mc-pill mc-pill-stale";
    }
  }

  function wireDataStatus() {
    const api = ensureSnapshotApi();
    updateDataStatus();
    const loadButton = document.querySelector("#appLoadDataButton");
    const retryButton = document.querySelector("#appRetryFailedButton");
    async function runLoad(mode) {
      if (!api) return;
      const button = mode === "retry" ? retryButton : loadButton;
      if (loadButton) {
        loadButton.disabled = true;
        loadButton.textContent = "Loading...";
      }
      if (retryButton) retryButton.disabled = true;
      try {
        const snapshot = mode === "retry" ? await api.retryFailed() : await api.loadLatestData();
        updateDataStatus(snapshot);
        if (loadButton) loadButton.textContent = "Loaded ✓";
        window.setTimeout(() => {
          if (loadButton) loadButton.textContent = "Load Latest Data";
        }, 1800);
      } catch (error) {
        if (loadButton) loadButton.textContent = "Load failed";
        const freshness = document.querySelector("#appDataFreshness");
        if (freshness) freshness.textContent = error?.message || "Load failed";
      } finally {
        if (loadButton) loadButton.disabled = false;
        if (retryButton) retryButton.disabled = false;
        if (button) button.blur();
      }
    }
    loadButton?.addEventListener("click", () => runLoad("all"));
    retryButton?.addEventListener("click", () => runLoad("retry"));
    window.addEventListener("portfolio-data-snapshot", (event) => updateDataStatus(event.detail));
    window.addEventListener("portfolio-data-snapshot-progress", (event) => updateProgress(event.detail));
  }

  // ---------------------------------------------------------------- shell
  const SIDEBAR = [
    { label: "Mission Control", items: [
      { p: "/home", i: "🛰️", t: "Home" },
      { p: "/market-risk", i: "🌐", t: "Macro Dashboard" }
    ] },
    { label: "Wave 3 Radar", items: [
      { p: "/wave3", i: "🌊", t: "Wave 3 Setup" }
    ] },
    { label: "Portfolio", items: [
      { p: "/portfolio", i: "📊", t: "Portfolio Position" },
      { p: "/", i: "🗓️", t: "Quarterly Editor" }
    ] },
    { label: "Signals", items: [
      { p: "/action-center", i: "🎯", t: "Action Center" },
      { p: "/scanner", i: "🔎", t: "Market Scanner" }
    ] },
    { label: "Research", items: [
      { p: "/bitcoin-monitor", i: "₿", t: "Bitcoin Monitor" },
      { p: "#", i: "⚖️", t: "Compare", soon: true }
    ] },
    { label: "Lab", items: [
      { p: "/backtest", i: "🧪", t: "Backtest Lab" },
      { p: "#", i: "🪄", t: "Magic Formula", soon: true }
    ] },
    { label: "System", items: [
      { p: "#", i: "🗂️", t: "Data Snapshot", soon: true },
      { p: "#", i: "⚙️", t: "Settings", soon: true }
    ] }
  ];

  const PAGE_META = {
    "/": { category: "Portfolio Command Center", title: "Dashboard การลงทุน", subtitle: "ภาพรวมพอร์ตการลงทุนรายไตรมาส" },
    "/action-center": { category: "Decision Center", title: "Action Center", subtitle: "list สินทรัพย์ที่ติดตาม + ควรทำอะไรกับแต่ละตัวตามสัญญาณของระบบ" },
    "/scanner": { category: "Signals", title: "🔎 Market Scanner", subtitle: "สแกนสัญญาณซื้อ (EMA ตัดขึ้น + วอลุ่ม) — หุ้นไทย SET100+mai · หุ้นนอกที่มี DR ไทย · Crypto Top 10" },
    "/portfolio": { category: "Portfolio", title: "📊 Portfolio Position", subtitle: "ภาพจริงของพอร์ต: สัดส่วน มูลค่า ไส้ใน และสภาวะสัญญาณของแต่ละสินทรัพย์" },
    "/market-risk": { category: "Risk Monitor", title: "Market Risk", subtitle: "VIX / VVIX / VIXEQ และระดับความเสี่ยงของตลาด" },
    "/wave3": { category: "Opportunity Radar", title: "🌊 Wave 3 Setup", subtitle: "สินทรัพย์ที่ใกล้เข้าสู่ Major Wave 3 — Portfolio · AI Boom · ไทย · Crypto (Readiness / Quality / Confidence)" },
    "/backtest": { category: "Strategy Research", title: "Backtest Lab", subtitle: "ทดสอบกลยุทธ์ย้อนหลังด้วยข้อมูลราคาในอดีต" }
  };

  function buildSidebar(activePath) {
    const groups = SIDEBAR.map((group) => {
      const items = group.items.map((it) => {
        const active = !it.soon && normalizePath(it.p) === normalizePath(activePath) ? " is-active" : "";
        const soon = it.soon ? " is-soon" : "";
        return `<a class="mc-nav-item${active}${soon}" href="${escapeHtml(it.p)}"><span class="mc-ic">${it.i}</span> ${escapeHtml(it.t)}</a>`;
      }).join("");
      return `<div class="mc-nav-group-label">${escapeHtml(group.label)}</div>${items}`;
    }).join("");
    return `
      <div class="mc-logo">
        <div class="mc-logo-mark">Λ</div>
        <div class="mc-logo-text"><strong>AI Investment</strong><span>Mission Control</span></div>
      </div>
      <nav class="mc-nav">${groups}</nav>
      <div class="mc-assistant">
        <div class="mc-assistant-badge">AI</div>
        <strong>AI Investment Assistant</strong>
        <p>Your intelligent co-pilot for smarter investment decisions</p>
        <button type="button" onclick="window.location.href='/action-center'">Ask AI Assistant</button>
      </div>`;
  }

  function buildHeader() {
    return `
      <button class="mc-icon-btn mc-menu-toggle" id="mcMenuToggle" type="button">☰</button>
      <div class="mc-search"><span>🔍</span><input type="text" placeholder="Search assets, pages, signals, actions..." /><span class="mc-kbd">⌘ K</span></div>
      <div class="mc-header-right">
        <span id="appRegimeChip"></span>
        <div class="mc-snap"><small>Data Snapshot</small><span id="appDataLoadedAt">—</span></div>
        <span class="mc-pill mc-pill-stale" id="appDataFreshness">—</span>
        <span class="mc-snap-counts mc-tnum" id="appDataCounts"></span>
        <button class="mc-btn mc-btn-primary" id="appLoadDataButton" type="button">Load Latest Data</button>
        <button class="mc-btn" id="appRetryFailedButton" type="button" hidden>Retry Failed</button>
        <a class="mc-icon-btn" href="/home" title="Home">🛰️</a>
      </div>`;
  }

  function buildHero(activePath) {
    const meta = PAGE_META[normalizePath(activePath)];
    if (!meta) return "";
    return `
      <section class="mc-page-hero mc-fade">
        <p class="mc-eyebrow">${escapeHtml(meta.category)}</p>
        <h1>${escapeHtml(meta.title)}</h1>
        <p class="mc-hero-sub">${escapeHtml(meta.subtitle)}</p>
      </section>`;
  }

  function ensureStylesheet(href) {
    if (document.querySelector(`link[href^="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    const base = src.split("?")[0];
    if (document.querySelector(`script[src^="${base}"]`)) return;
    const s = document.createElement("script");
    s.src = src;
    document.head.appendChild(s);
  }

  // Every page consumes the Global Market Regime via a compact header chip.
  function renderRegimeChip() {
    const el = document.getElementById("appRegimeChip");
    if (!el || !window.MarketRegime || typeof window.MarketRegime.compute !== "function") return;
    let R = null;
    try { R = window.MarketRegime.compute(); } catch (_e) { return; }
    if (!R || R.snapshotMissing) { el.innerHTML = ""; return; }
    el.innerHTML = `<a class="mcx-regime-chip" href="/home" title="Global Market Regime — ${escapeHtml(R.regime.label)} (confidence ${escapeHtml(R.confidence.label)})">
      <span class="mcx-regime-dot" style="background:${R.color};color:${R.color}"></span>
      <span>Regime <b style="color:${R.color}">${R.score}</b> · ${escapeHtml(R.regime.label)}</span></a>`;
  }

  function wireRegimeChip() {
    let tries = 0;
    const tick = () => { if (window.MarketRegime && window.MarketRegime.compute) { renderRegimeChip(); return; } if (tries++ < 40) window.setTimeout(tick, 60); };
    tick();
    window.addEventListener("portfolio-data-snapshot", renderRegimeChip);
  }

  function mountShell() {
    if (document.getElementById("mc-shell")) return;
    ensureStylesheet("/mission-control.css?v=20260623-mc-7");
    ensureScript("/scoring.js?v=20260623-scoring-10");
    ensureScript("/signal-quality.js?v=20260621-sq-5");
    // The AI Boom Universe is the monitor list — keep its seed available on every
    // page so snapshot loads see the full universe consistently.
    ensureScript("/ai-boom-universe-data.js?v=20260524-summary-1");
    // Global Market Regime engine + chip styles available on EVERY page.
    ensureStylesheet("/mission-control-v2.css?v=20260630-mcx-1");
    ensureScript("/market-regime.js?v=20260630-regime-1");
    // Bitcoin Intelligence engine — available wherever Load Latest Data can run, so
    // the snapshot loader can extend snapshot.bitcoinIntelligence. Runs only on load.
    ensureScript("/bitcoin-intelligence.js?v=20260704-btcintel-12");
    // Wave 3 Setup engine — available wherever Load Latest Data can run, so the snapshot
    // loader can extend snapshot.wave3. Reuses BitcoinIntelligence.Indicators; load after it.
    ensureScript("/wave3-engine.js?v=20260711-w3-1");

    const activePath = window.location.pathname;

    // Some pages (e.g. Home) render their own hardcoded Mission Control shell.
    // Don't rebuild it — but DO refresh the sidebar from the single canonical
    // SIDEBAR config so menu items never drift / go missing.
    const existingSidebar = document.getElementById("mcSidebar");
    if (existingSidebar && document.querySelector(".mc-app")) {
      existingSidebar.innerHTML = buildSidebar(activePath);
      // NOTE: a hardcoded-shell page (Home) wires its own #mcMenuToggle — don't
      // double-bind it here or the two toggles cancel out.
      wireRegimeChip();
      return;
    }

    const movable = Array.from(document.body.children).filter(
      (el) => el.tagName !== "SCRIPT" && el.tagName !== "LINK" && el.id !== "app-theme-toggle"
    );

    const app = document.createElement("div");
    app.id = "mc-shell";
    app.className = "mc-app";

    const sidebar = document.createElement("aside");
    sidebar.className = "mc-sidebar";
    sidebar.id = "mcSidebar";
    sidebar.innerHTML = buildSidebar(activePath);

    const mainCol = document.createElement("div");
    mainCol.className = "mc-main";

    const header = document.createElement("header");
    header.className = "mc-header";
    header.innerHTML = buildHeader();

    const content = document.createElement("main");
    content.className = "mc-content";

    const heroHtml = buildHero(activePath);
    if (heroHtml) {
      const hero = document.createElement("div");
      hero.innerHTML = heroHtml;
      content.appendChild(hero.firstElementChild);
    }
    movable.forEach((el) => content.appendChild(el));

    mainCol.appendChild(header);
    mainCol.appendChild(content);
    app.appendChild(sidebar);
    app.appendChild(mainCol);
    document.body.appendChild(app);
    document.body.classList.add("mc-body", "mc-shell-active");

    const toggle = document.getElementById("mcMenuToggle");
    if (toggle) toggle.addEventListener("click", () => sidebar.classList.toggle("is-open"));

    wireDataStatus();
    wireRegimeChip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountShell);
  } else {
    mountShell();
  }
})();
