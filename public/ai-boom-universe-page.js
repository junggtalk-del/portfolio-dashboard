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
  let assets = [];

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
  const rows = document.querySelector("#aiUniverseRows");
  const count = document.querySelector("#assetCount");
  const waitCount = document.querySelector("#waitCount");
  const accumulateCount = document.querySelector("#accumulateCount");
  const warningCount = document.querySelector("#warningCount");
  const activeFilterText = document.querySelector("#activeFilterText");

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
    dr: "DR / DRx",
    low: "ต่ำ",
    medium: "กลาง",
    high: "สูง",
    Accumulate: "น่าสะสม",
    Hold: "ถือ/ติดตาม",
    "Wait for pullback": "รอย่อราคา",
    Reduce: "ลดน้ำหนัก"
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

  function readJsonArray(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function loadUserAssets() {
    return readJsonArray(STORAGE_KEY).map((asset) => scoring.enrichAsset(asset));
  }

  function loadRemovedIds() {
    return new Set(readJsonArray(REMOVED_KEY));
  }

  function saveUserAssets() {
    const userAssets = assets.filter((asset) => asset.is_user_added);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userAssets));
  }

  function saveRemovedId(id) {
    const removedIds = loadRemovedIds();
    removedIds.add(id);
    localStorage.setItem(REMOVED_KEY, JSON.stringify([...removedIds]));
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

  function filterAssets() {
    const selected = currentFilters();
    return assets.filter((asset) => Object.entries(selected).every(([key, value]) => !value || asset[key] === value));
  }

  function renderSummary(filteredAssets) {
    count.textContent = filteredAssets.length;
    waitCount.textContent = filteredAssets.filter((asset) => asset.initial_action === "Wait for pullback").length;
    accumulateCount.textContent = filteredAssets.filter((asset) => asset.initial_action === "Accumulate").length;
    warningCount.textContent = filteredAssets.filter((asset) => asset.warning).length;

    const selected = Object.entries(currentFilters()).filter(([, value]) => value);
    activeFilterText.textContent = selected.length
      ? selected.map(([key, value]) => `${formatLabel(key)}: ${formatLabel(value)}`).join(" · ")
      : "แสดงรายการทั้งหมดในธีม AI Data Center";
  }

  function renderRows() {
    const filteredAssets = filterAssets();
    renderSummary(filteredAssets);
    rows.innerHTML = "";

    if (!filteredAssets.length) {
      rows.innerHTML = '<tr><td colspan="3">ไม่พบรายการที่ตรงกับตัวกรอง</td></tr>';
      return;
    }

    for (const asset of filteredAssets) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="ai-asset-name">
            <strong>${escapeHtml(asset.ticker)}</strong>
            <span>${escapeHtml(asset.name)} · ${escapeHtml(formatLabel(asset.asset_type))} · ${escapeHtml(asset.thai_access)}</span>
          </div>
        </td>
        <td><div class="technical-signal" data-signal-id="${escapeHtml(asset.id)}">กำลังคำนวณสัญญาณ...</div></td>
        <td class="ai-row-actions">
          <button class="ai-delete-button" type="button" data-delete-id="${escapeHtml(asset.id)}">ลบ</button>
        </td>`;
      rows.appendChild(row);

      if (asset.warning) {
        const warningRow = document.createElement("tr");
        warningRow.className = "ai-warning-row";
        warningRow.innerHTML = `<td colspan="3"><span class="ai-warning-box">สินทรัพย์แข็งแรง แต่ราคาอาจสะท้อนความคาดหวังสูงเกินไปแล้ว</span></td>`;
        rows.appendChild(warningRow);
      }
    }

    renderTechnicalCells(filteredAssets);
  }

  async function renderTechnicalCells(filteredAssets) {
    for (const asset of filteredAssets) {
      const signalCell = rows.querySelector(`[data-signal-id="${cssEscape(asset.id)}"]`);
      if (!signalCell) continue;
      const result = await getPriceSeries(asset);
      if (!rows.contains(signalCell)) continue;
      signalCell.innerHTML = renderTechnicalSummary(asset, result.technical, result.source);
    }
  }

  async function getPriceSeries(asset) {
    const cacheKey = `${asset.ticker}:${asset.layer}:${asset.id}`;
    if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);

    const symbol = getYahooSymbol(asset);
    if (!symbol) {
      const result = {
        closes: [],
        dates: [],
        technical: calculateTechnical(asset.ticker, [], []),
        source: "No market data source"
      };
      priceCache.set(cacheKey, result);
      return result;
    }

    try {
      const yahooSeries = await fetchPriceHistoryFromServer(symbol);
      const technicalResult = calculateTechnical(asset.ticker, yahooSeries.closes, yahooSeries.dates);
      const result = {
        closes: yahooSeries.closes,
        dates: yahooSeries.dates,
        technical: technicalResult,
        source: symbol === asset.ticker ? `Daily close (${symbol})` : `Daily close proxy (${symbol})`
      };
      priceCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result = {
        closes: [],
        dates: [],
        technical: calculateTechnical(asset.ticker, [], []),
        source: "Unable to load market data"
      };
      priceCache.set(cacheKey, result);
      return result;
    }
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

  function getYahooSymbol(asset) {
    const rawTicker = String(asset.ticker || "").trim().toUpperCase();
    const compactTicker = rawTicker.replace(/[^A-Z0-9]/g, "");
    if (YAHOO_SYMBOLS[rawTicker]) return YAHOO_SYMBOLS[rawTicker];
    if (YAHOO_SYMBOLS[compactTicker]) return YAHOO_SYMBOLS[compactTicker];
    if (asset.asset_type === "stock" && asset.country === "US") return asset.ticker;
    if (asset.asset_type === "crypto" && (compactTicker === "BTC" || compactTicker === "BTCUSD")) return "BTC-USD";
    if (asset.asset_type === "crypto" && compactTicker === "ETHUSD") return "ETH-USD";

    // Generic RMF/SSF Thai fund fallback proxy.
    if (/(^|_)(RMF|SSF)($|_)/.test(compactTicker) || compactTicker.includes("RMF") || compactTicker.includes("SSF")) {
      return "^SET.BK";
    }

    // Thai funds do not expose public daily NAV in Yahoo with stable tickers.
    // Use explicit benchmark proxies to keep technical panels actionable.
    if (asset.ticker === "SCBNDQ" || asset.ticker === "KKP_NDQ") return "^NDX";
    if (
      asset.ticker === "SCB_GLOBAL_TECH" ||
      asset.ticker === "KKP_G_TECH" ||
      asset.ticker === "B_INNOTECH" ||
      asset.ticker === "ONE_UGG_RA"
    ) {
      return "XLK";
    }
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
      closes: rows.map((row) => row.close)
    };
  }

  function renderTechnicalSummary(asset, result, source) {
    const signal = result || {};
    const latestClose = formatPrice(signal.latestClose);
    const latestDate = formatDate(signal.latestDate);
    const emaSignal = signal.ema?.signal || "INSUFFICIENT_DATA";
    const emaTrend = signal.ema?.trend || "UNKNOWN";
    const smaSignal = signal.sma200?.signal || "INSUFFICIENT_DATA";
    const smaStatus = signal.sma200?.status || "UNKNOWN";
    const recentAlert = buildRecentAlert(signal);

    return `
      <div class="technical-stack" aria-label="Daily technical signals for ${escapeHtml(asset.ticker)}">
        <div class="technical-header">
          <div class="technical-identity">
            <strong>${escapeHtml(asset.ticker)}</strong>
            <span>${escapeHtml(asset.name)}</span>
          </div>
          <div class="technical-close">
            <span>Close</span>
            <strong>${latestClose}</strong>
            <span>${latestDate}</span>
          </div>
        </div>
        <div class="technical-pair">
          <div class="technical-section">
            <small>EMA12 / EMA26</small>
            <div class="technical-values">
              <span>EMA12 ${formatIndicator(signal.ema?.ema12)}</span>
              <span>EMA26 ${formatIndicator(signal.ema?.ema26)}</span>
            </div>
            <div class="technical-badges">
              <span class="signal-pill ${toneClassForEmaSignal(emaSignal)}">${escapeHtml(emaSignal)}</span>
              <span class="signal-pill ${toneClassForTrend(emaTrend)}">${escapeHtml(emaTrend)}</span>
              <span class="signal-date">${formatDate(signal.ema?.signalDate)}</span>
            </div>
          </div>
          <div class="technical-section">
            <small>Close / SMA200</small>
            <div class="technical-values">
              <span>SMA200 ${formatIndicator(signal.sma200?.sma200)}</span>
            </div>
            <div class="technical-badges">
              <span class="signal-pill ${toneClassForSmaSignal(smaSignal)}">${escapeHtml(smaSignal)}</span>
              <span class="signal-pill ${toneClassForSmaStatus(smaStatus)}">${escapeHtml(smaStatus)}</span>
              <span class="signal-date">${formatDate(signal.sma200?.signalDate)}</span>
            </div>
          </div>
        </div>
        <div class="technical-alert ${recentAlert.toneClass}">${escapeHtml(recentAlert.text)}</div>
        <div class="technical-source">${escapeHtml(source || "-")}</div>
      </div>`;
  }

  function buildRecentAlert(signal) {
    const recentWindow = 5;
    const emaRecent = signal.ema?.recentCrossover;
    const smaRecent = signal.sma200?.recentCrossover;
    const chunks = [];
    let toneClass = "alert-neutral";

    if (emaRecent && Number.isFinite(emaRecent.barsAgo) && emaRecent.barsAgo <= recentWindow) {
      const days = emaRecent.barsAgo;
      chunks.push(`EMA ${emaRecent.signal} ล่าสุด ${days === 0 ? "วันนี้" : `${days} วันก่อน`}`);
      if (emaRecent.signal === "SELL") toneClass = "alert-risk";
      if (emaRecent.signal === "BUY" && toneClass !== "alert-risk") toneClass = "alert-good";
    }

    if (smaRecent && Number.isFinite(smaRecent.barsAgo) && smaRecent.barsAgo <= recentWindow) {
      const days = smaRecent.barsAgo;
      chunks.push(`SMA200 ${smaRecent.signal} ล่าสุด ${days === 0 ? "วันนี้" : `${days} วันก่อน`}`);
      if (smaRecent.signal === "BEARISH_BREAKDOWN") toneClass = "alert-risk";
      if (smaRecent.signal === "BULLISH_BREAKOUT" && toneClass !== "alert-risk") toneClass = "alert-good";
    }

    if (chunks.length) {
      return { text: `Alert: ${chunks.join(" | ")}`, toneClass };
    }

    return {
      text: `No recent crossover in last ${recentWindow} days · ใช้สถานะ trend ปกติ`,
      toneClass: "alert-neutral"
    };
  }

  function formatPrice(value) {
    if (!Number.isFinite(value)) return "-";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatIndicator(value) {
    if (!Number.isFinite(value)) return "-";
    return Number(value).toFixed(2);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-CA");
  }

  function toneClassForEmaSignal(signal) {
    if (signal === "BUY") return "signal-good";
    if (signal === "SELL") return "signal-risk";
    if (signal === "INSUFFICIENT_DATA") return "signal-muted";
    return "signal-hold";
  }

  function toneClassForSmaSignal(signal) {
    if (signal === "BULLISH_BREAKOUT") return "signal-good";
    if (signal === "BEARISH_BREAKDOWN") return "signal-risk";
    if (signal === "INSUFFICIENT_DATA") return "signal-muted";
    return "signal-hold";
  }

  function toneClassForTrend(trend) {
    if (trend === "BULLISH") return "signal-good";
    if (trend === "BEARISH") return "signal-risk";
    if (trend === "UNKNOWN") return "signal-muted";
    return "signal-hold";
  }

  function toneClassForSmaStatus(status) {
    if (status === "ABOVE_SMA200") return "signal-good";
    if (status === "BELOW_SMA200") return "signal-risk";
    if (status === "UNKNOWN") return "signal-muted";
    return "signal-hold";
  }

  function makeUserAsset(ticker, name, layer, assetType) {
    const upperTicker = ticker.trim().toUpperCase();
    const quality = layer === "upstream_ai" || layer === "data_center_cloud" ? 8 : 7;
    const hype = layer === "growth_optional" || layer === "upstream_ai" ? 7 : 5;
    const valuation = layer === "thai_funds" ? 5 : 6;
    return scoring.enrichAsset({
      id: `user-${upperTicker}-${Date.now()}`,
      ticker: upperTicker,
      name: name.trim() || `${upperTicker} placeholder`,
      asset_type: assetType,
      country: assetType === "fund" || assetType === "dr" ? "Thailand" : "US",
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
      thai_access: assetType === "fund" ? "Thai Fund" : assetType === "dr" ? "DR / DRx" : "Direct",
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
    const ticker = tickerInput.value.trim().toUpperCase();
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
    renderRows();
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
    renderRows();
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
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

  resetAssets();
  refreshFilterOptions();
  Object.values(filters).forEach((select) => select.addEventListener("change", renderRows));
  form.addEventListener("submit", handleAddTicker);
  rows.addEventListener("click", handleDelete);
  renderRows();
})();
