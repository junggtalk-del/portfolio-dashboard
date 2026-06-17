(function () {
  const NAV_GROUPS = [
    {
      key: "dashboard",
      label: "Dashboard",
      pages: [
        { path: "/", label: "Dashboard" },
        { path: "/action-center", label: "Action Center" }
      ]
    },
    {
      key: "portfolio",
      label: "Portfolio",
      pages: [
        { path: "/portfolio-status", label: "Status" },
        { path: "/portfolio-holdings", label: "Holdings" },
        { path: "/exposure-map", label: "Exposure Map" },
        { path: "/market-risk", label: "Market Risk" }
      ]
    },
    {
      key: "universe",
      label: "Universe",
      pages: [
        { path: "/ai-boom-universe", label: "AI Boom Universe" }
      ]
    },
    {
      key: "signals",
      label: "Signals",
      pages: [
        { path: "/technical-signals", label: "Technical Signals" }
      ]
    },
    {
      key: "tools",
      label: "Tools",
      pages: [
        { path: "/backtest", label: "Backtest Lab" }
      ]
    }
  ];

  const HEADER_SELECTORS = [
    ".topbar",
    ".action-topbar",
    ".holdings-topbar",
    ".status-topbar",
    ".exposure-topbar",
    ".risk-topbar",
    ".ai-topbar",
    ".signal-topbar",
    ".backtest-topbar"
  ];
  const SNAPSHOT_STORAGE_KEY = "portfolio_dashboard_data_snapshot";
  const SNAPSHOT_DATA_VERSION = "2026-06-portfolio-dashboard-v1";
  const REQUIRED_SNAPSHOT_SYMBOLS = ["SPY", "QQQM", "XLK", "^GSPC", "^VIX", "^VVIX", "^VIXEQ"];

  function normalizePath(pathname) {
    const path = String(pathname || "/").replace(/\/+$/, "") || "/";
    return path === "/index.html" ? "/" : path;
  }

  function findCurrentPage(pathname) {
    const path = normalizePath(pathname);
    for (const group of NAV_GROUPS) {
      const page = group.pages.find((item) => normalizePath(item.path) === path);
      if (page) return { group, page };
    }
    return { group: NAV_GROUPS[0], page: NAV_GROUPS[0].pages[0] };
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

  function renderPrimary(activeGroup) {
    return `
      <nav class="app-primary-nav" aria-label="Primary navigation">
        ${NAV_GROUPS.map((group) => {
          const href = group.pages[0]?.path || "/";
          const active = group.key === activeGroup.key ? " is-active" : "";
          return `<a class="${active.trim()}" href="${escapeHtml(href)}">${escapeHtml(group.label)}</a>`;
        }).join("")}
      </nav>`;
  }

  function renderSecondary(group, currentPage) {
    if (!group.pages || group.pages.length <= 1) return "";
    return `
      <nav class="app-secondary-nav" aria-label="Secondary navigation">
        ${group.pages.map((page) => {
          const active = normalizePath(page.path) === normalizePath(currentPage.path) ? " is-active" : "";
          return `<a class="${active.trim()}" href="${escapeHtml(page.path)}">${escapeHtml(page.label)}</a>`;
        }).join("")}
      </nav>`;
  }

  function renderDataStatusBar() {
    return `
      <section class="app-data-status" aria-label="Data snapshot status">
        <div>
          <strong>Data Snapshot</strong>
          <span id="appDataLoadedAt">ยังไม่มีข้อมูลล่าสุด</span>
          <span id="appDataCounts">Assets loaded: -</span>
          <span id="appDataFreshness">Status: -</span>
        </div>
        <div class="app-data-actions">
          <button id="appLoadDataButton" type="button">โหลดข้อมูลล่าสุด</button>
          <button id="appRetryFailedButton" type="button" hidden>ลองโหลดรายการที่ล้มเหลวอีกครั้ง</button>
        </div>
      </section>`;
  }

  function formatDateTime(value) {
    if (!value) return "ยังไม่มีข้อมูลล่าสุด";
    try {
      return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
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
    if (loadedAt) loadedAt.textContent = current?.loadedAt ? `โหลดล่าสุด: ${formatDateTime(current.loadedAt)}` : "ยังไม่มีข้อมูลล่าสุด";
    const total = current?.assets?.length || 0;
    const failed = current?.errors?.length || 0;
    const success = Math.max(0, total - failed);
    if (counts) counts.textContent = total ? `โหลดสำเร็จ: ${success} / ${total} · ล้มเหลว: ${failed}` : "Assets loaded: -";
    if (freshness) {
      freshness.textContent = `สถานะ: ${fresh.thai}`;
      freshness.dataset.freshness = fresh.key;
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
      counts.textContent = `กำลังโหลด: ${completed} / ${total}${detail.currentSymbol ? ` · ${detail.currentSymbol}` : ""}${failed ? ` · ล้มเหลว ${failed}` : ""}`;
    }
    if (freshness) freshness.textContent = `Step ${detail.step || "-"} / 6: ${detail.stepLabel || "Loading data"}`;
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
        loadButton.textContent = "กำลังโหลดข้อมูล...";
      }
      if (retryButton) retryButton.disabled = true;
      try {
        const snapshot = mode === "retry" ? await api.retryFailed() : await api.loadLatestData();
        updateDataStatus(snapshot);
        if (loadButton) loadButton.textContent = "โหลดข้อมูลแล้ว";
        window.setTimeout(() => {
          if (loadButton) loadButton.textContent = "โหลดข้อมูลล่าสุด";
        }, 1800);
      } catch (error) {
        if (loadButton) loadButton.textContent = "โหลดไม่สำเร็จ";
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

  function mountNavigation() {
    const header = HEADER_SELECTORS.map((selector) => document.querySelector(selector)).find(Boolean);
    if (!header || header.querySelector(".app-premium-nav")) return;
    const { group, page } = findCurrentPage(window.location.pathname);
    const nav = document.createElement("div");
    nav.className = "app-premium-nav";
    nav.innerHTML = `
      ${renderPrimary(group)}
      <div class="app-page-context" aria-label="Page context">
        <span>${escapeHtml(group.label)}</span><span aria-hidden="true">/</span><span>${escapeHtml(page.label)}</span>
      </div>
      ${renderSecondary(group, page)}
      ${renderDataStatusBar()}
    `;
    header.insertBefore(nav, header.firstChild);
    document.body.classList.add("has-premium-nav");
    wireDataStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountNavigation);
  } else {
    mountNavigation();
  }
})();
