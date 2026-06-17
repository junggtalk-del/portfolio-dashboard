(function () {
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const seed = window.AIBoomUniverseSeed || { ai_boom_universe: [] };
  const scoring = window.AIBoomScoring || { enrichAsset: (asset) => asset };
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
    SET50: "^SET50.BK",
    "SET50.BK": "^SET50.BK",
    "^SET50.BK": "^SET50.BK",
    SET100: "^SET100.BK",
    "SET100.BK": "^SET100.BK",
    "^SET100.BK": "^SET100.BK"
  };
  const US_INDEX_ALIASES = {
    SPX: "^GSPC",
    GSPC: "^GSPC",
    "^GSPC": "^GSPC",
    IXIC: "^IXIC",
    "^IXIC": "^IXIC",
    NDX: "^NDX",
    "^NDX": "^NDX",
    NDX01: "^NDX"
  };
  const THAI_STOCK_ALIASES = {
    GULF: "GULF.BK",
    GULFBK: "GULF.BK",
    "GULF.BK": "GULF.BK"
  };
  const DISPLAY_SYMBOLS = {
    "^SET.BK": "SET",
    "^SET50.BK": "SET50",
    "^SET100.BK": "SET100",
    "^GSPC": "SPX",
    "^IXIC": "IXIC",
    "^NDX": "NDX",
    "BTC-USD": "BTCUSD"
  };

  const EXPOSURE_GROUPS = [
    {
      key: "ai_semiconductor",
      title: "AI / Semiconductor",
      thai: "AI และ Semiconductor",
      description: "ชิป, GPU, AI infrastructure และหุ้นที่ได้ประโยชน์จาก data center",
      baseTags: ["AI", "Semiconductor"]
    },
    {
      key: "big_tech",
      title: "Big Tech",
      thai: "หุ้นเทคขนาดใหญ่",
      description: "Mega-cap technology platform เช่น Microsoft, Amazon, Meta, Google",
      baseTags: ["Big Tech", "US Tech"]
    },
    {
      key: "nasdaq_100",
      title: "Nasdaq-100",
      thai: "Nasdaq-100",
      description: "สินทรัพย์ที่มี exposure ซ้อนกับ Nasdaq-100 หรือ US growth tech",
      baseTags: ["Nasdaq-100"]
    },
    {
      key: "sp_500",
      title: "S&P 500",
      thai: "ตลาดหุ้นสหรัฐกว้าง",
      description: "Exposure ตลาดสหรัฐผ่าน S&P 500 หรือ large-cap US market",
      baseTags: ["S&P 500", "US Market"]
    },
    {
      key: "thai_stocks",
      title: "Thai Stocks",
      thai: "หุ้นไทย",
      description: "หุ้นหรือดัชนีไทยที่ผูกกับตลาด SET",
      baseTags: ["Thai Stock", "Thai Index"]
    },
    {
      key: "thai_mutual_funds",
      title: "Thai Mutual Funds",
      thai: "กองทุนไทย",
      description: "กองทุนไทย / RMF / SSF ที่อาจถือสินทรัพย์ต่างประเทศซ้ำกับ ETF หรือหุ้นตรง",
      baseTags: ["Thai RMF", "Thai Mutual Fund"]
    },
    {
      key: "crypto",
      title: "Crypto",
      thai: "คริปโต",
      description: "สินทรัพย์ดิจิทัล เช่น BTC",
      baseTags: ["Crypto"]
    },
    {
      key: "defensive_cash",
      title: "Defensive / Cash-like",
      thai: "ตั้งรับ / คล้ายเงินสด",
      description: "สินทรัพย์ defensive, cash-like หรือรายการที่ไม่ได้ผูกกับ growth theme ชัดเจน",
      baseTags: ["Defensive", "Cash-like"]
    }
  ];

  const statusEl = document.querySelector("#exposureStatus");
  const subtitleEl = document.querySelector("#exposureSubtitle");
  const riskSummary = document.querySelector("#riskSummary");
  const warningPanel = document.querySelector("#warningPanel");
  const sectionsRoot = document.querySelector("#exposureSections");
  const refreshButton = document.querySelector("#refreshExposureButton");

  let persistedState = { userAssets: [], removedIds: [] };
  let assets = [];
  let holdings = [];
  let usingHoldings = false;

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

  function analyzeExposure(asset, holding = null) {
    const symbol = canonicalSymbolFromTicker(holding?.canonicalSymbol || asset?.ticker || "");
    const compact = symbol.replace(/[^A-Z0-9]/g, "");
    const tags = new Set();
    const groups = new Set();
    const nameText = `${asset?.name || ""} ${asset?.sub_theme || ""} ${asset?.layer || ""}`.toUpperCase();
    const type = String(asset?.asset_type || "").toUpperCase();

    addBySymbol(symbol, compact, tags, groups);
    addByType(type, symbol, tags, groups);
    addByText(nameText, tags, groups);

    if (!groups.size) {
      tags.add("Defensive");
      groups.add("defensive_cash");
    }

    return {
      asset,
      holding,
      symbol,
      displaySymbol: holding?.displaySymbol || displaySymbol(symbol, asset),
      displayName: holding?.assetName || displayName(asset, symbol),
      marketValue: Number(holding?.marketValue) || 0,
      currency: holding?.currency || asset?.currency || "THB",
      tags: [...tags].sort(),
      groups: [...groups]
    };
  }

  function addBySymbol(symbol, compact, tags, groups) {
    if (["NVDA", "AMD", "AVGO"].includes(symbol)) {
      tags.add("AI");
      tags.add("Semiconductor");
      tags.add("US Tech");
      groups.add("ai_semiconductor");
      groups.add("nasdaq_100");
    }
    if (["MSFT", "AMZN", "GOOG", "GOOGL", "META", "AAPL", "TSLA"].includes(symbol)) {
      tags.add("Big Tech");
      tags.add("US Tech");
      tags.add("Nasdaq-100");
      groups.add("big_tech");
      groups.add("nasdaq_100");
    }
    if (["QQQ", "QQQM", "^NDX", "NDX01"].includes(symbol) || compact === "NDX") {
      tags.add("Nasdaq-100");
      tags.add("US Tech");
      tags.add("Growth");
      groups.add("nasdaq_100");
    }
    if (["SPY", "VOO", "IVV", "^GSPC"].includes(symbol)) {
      tags.add("S&P 500");
      tags.add("US Market");
      groups.add("sp_500");
    }
    if (["BTC", "BTCUSD", "BTC-USD", "XBTUSD"].includes(symbol) || compact === "BTCUSD") {
      tags.add("Crypto");
      tags.add("Bitcoin");
      groups.add("crypto");
    }
    if (symbol === "K-USXNDQRMF") {
      tags.add("Nasdaq-100");
      tags.add("Thai RMF");
      tags.add("US Tech");
      groups.add("nasdaq_100");
      groups.add("thai_mutual_funds");
    }
    if (symbol === "K-GTECHRMF") {
      tags.add("Global Tech");
      tags.add("Thai RMF");
      tags.add("US Tech");
      groups.add("big_tech");
      groups.add("thai_mutual_funds");
    }
    if (symbol.endsWith(".BK")) {
      tags.add("Thai Stock");
      groups.add("thai_stocks");
    }
    if (symbol.startsWith("^SET")) {
      tags.add("Thai Index");
      groups.add("thai_stocks");
    }
  }

  function addByType(type, symbol, tags, groups) {
    if (type === "CRYPTO") {
      tags.add("Crypto");
      groups.add("crypto");
    }
    if (type === "THAI_MUTUAL_FUND" || type === "FUND" || symbol.includes("RMF") || symbol.includes("SSF")) {
      tags.add("Thai Mutual Fund");
      if (symbol.includes("RMF")) tags.add("Thai RMF");
      groups.add("thai_mutual_funds");
    }
    if (type === "THAI_STOCK") {
      tags.add("Thai Stock");
      groups.add("thai_stocks");
    }
    if (type === "THAI_INDEX") {
      tags.add("Thai Index");
      groups.add("thai_stocks");
    }
  }

  function addByText(text, tags, groups) {
    if (/AI|GPU|ACCELERATOR|SEMICONDUCTOR|CHIP/.test(text)) {
      tags.add("AI");
      groups.add("ai_semiconductor");
    }
    if (/CLOUD|ENTERPRISE|HYPERSCALE|TECH|SOFTWARE/.test(text)) {
      tags.add("US Tech");
      groups.add("big_tech");
    }
    if (/DEFENSIVE|CASH|BOND|MONEY MARKET/.test(text)) {
      tags.add("Defensive");
      groups.add("defensive_cash");
    }
  }

  function groupAnalyses(analyses) {
    const grouped = {};
    for (const group of EXPOSURE_GROUPS) grouped[group.key] = [];
    for (const row of analyses) {
      for (const groupKey of row.groups) {
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(row);
      }
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.displaySymbol.localeCompare(b.displaySymbol));
    }
    return grouped;
  }

  function calculateRisk(analyses, grouped) {
    const totalValue = analyses.reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
    const total = analyses.length || 1;
    const maxValue = Math.max(...Object.values(grouped).map((rows) => rows.reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0)), 0);
    const maxCount = Math.max(...Object.values(grouped).map((rows) => rows.length), 0);
    const maxRatio = totalValue > 0 ? maxValue / totalValue : maxCount / total;
    const overlapValue = analyses.filter((row) => row.groups.length >= 3).reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
    const overlapRows = analyses.filter((row) => row.groups.length >= 3).length;
    let score = Math.round((maxRatio * 65) + ((totalValue > 0 ? overlapValue / totalValue : overlapRows / total) * 35));
    score = Math.max(0, Math.min(100, score));
    let level = { label: "Low", thai: "ต่ำ", tone: "tone-low" };
    if (score >= 75) level = { label: "Extreme", thai: "สูงมาก", tone: "tone-extreme" };
    else if (score >= 55) level = { label: "High", thai: "สูง", tone: "tone-high" };
    else if (score >= 30) level = { label: "Medium", thai: "ปานกลาง", tone: "tone-medium" };
    return { score, level, maxCount, maxRatio, overlapRows, totalValue, maxValue };
  }

  function buildWarnings(analyses, grouped) {
    const warnings = [];
    for (const group of EXPOSURE_GROUPS) {
      const rows = grouped[group.key] || [];
      const groupValue = rows.reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
      const totalValue = analyses.reduce((sum, row) => sum + (Number(row.marketValue) || 0), 0);
      if (rows.length >= 4 || (totalValue > 0 && groupValue / totalValue > 0.35)) {
        warnings.push({
          title: `${group.title} concentration สูง`,
          text: `${rows.slice(0, 6).map((row) => row.displaySymbol).join(", ")} มี exposure อยู่ในกลุ่ม ${group.thai} ${totalValue > 0 ? `คิดเป็น ${((groupValue / totalValue) * 100).toFixed(1)}% ของพอร์ตจริง` : "จำนวนมาก"} ควรระวังธีมเดียวกันขยับพร้อมกัน`
        });
      }
    }

    const nasdaqOverlap = analyses.filter((row) => row.tags.includes("Nasdaq-100"));
    const targetNasdaq = nasdaqOverlap.filter((row) => ["QQQM", "^NDX", "K-USXNDQRMF"].includes(row.symbol) || row.displaySymbol === "NDX");
    if (targetNasdaq.length >= 2) {
      warnings.push({
        title: "Nasdaq-100 overlap warning",
        text: `${targetNasdaq.map((row) => row.displaySymbol).join(", ")} มี exposure ซ้อนกันสูง เพราะอิง Nasdaq-100 / US growth tech คล้ายกัน`
      });
    } else if (nasdaqOverlap.length >= 4) {
      warnings.push({
        title: "Nasdaq-100 overlap warning",
        text: `${nasdaqOverlap.slice(0, 6).map((row) => row.displaySymbol).join(", ")} มี exposure ซ้อนกันกับ Nasdaq-100 สูง`
      });
    }

    const thaiFundTech = analyses.filter((row) => row.tags.includes("Thai RMF") && (row.tags.includes("US Tech") || row.tags.includes("Nasdaq-100")));
    if (thaiFundTech.length >= 2) {
      warnings.push({
        title: "Thai RMF ซ้อนกับ US Tech",
        text: `${thaiFundTech.map((row) => row.displaySymbol).join(", ")} เป็นกองทุนไทยที่ยังซ้อน exposure กับ US tech / Nasdaq อยู่`
      });
    }

    return warnings;
  }

  function render(analyses) {
    const grouped = groupAnalyses(analyses);
    const risk = calculateRisk(analyses, grouped);
    const warnings = buildWarnings(analyses, grouped);
    renderRiskSummary(analyses, grouped, risk);
    renderWarnings(warnings);
    sectionsRoot.innerHTML = EXPOSURE_GROUPS.map((group) => renderGroup(group, grouped[group.key] || [])).join("");
    statusEl.textContent = `จัดกลุ่ม exposure แล้ว ${analyses.length} รายการ`;
    subtitleEl.textContent = `Concentration risk: ${risk.level.label} (${risk.level.thai})`;
  }

  function renderRiskSummary(analyses, grouped, risk) {
    const tiles = EXPOSURE_GROUPS.map((group) => `
      <div class="summary-tile">
        <span>${escapeHtml(group.title)}</span>
        <strong>${(grouped[group.key] || []).length}</strong>
      </div>`).join("");
    riskSummary.innerHTML = `
      <article class="risk-score-card">
        <span>Concentration Risk Score</span>
        <strong>${risk.score}</strong>
        <div class="risk-level ${risk.level.tone}">${escapeHtml(risk.level.label)} · ${escapeHtml(risk.level.thai)}</div>
        <p class="risk-copy">${escapeHtml(riskExplanation(risk, analyses.length))}</p>
        <p class="risk-copy">${usingHoldings ? `ใช้ real holdings มูลค่ารวม ${formatMoney(risk.totalValue)} THB` : "ยังไม่มี real holdings จึงแสดงจาก watchlist count ชั่วคราว"}</p>
      </article>
      <div class="exposure-summary-grid">${tiles}</div>`;
  }

  function renderWarnings(warnings) {
    if (!warnings.length) {
      warningPanel.innerHTML = '<div class="empty-box">ยังไม่พบ overlap warning ชัดเจนจาก watchlist ตอนนี้</div>';
      return;
    }
    warningPanel.innerHTML = `
      <div class="panel-heading">
        <div>
          <h2>Overlap Warnings</h2>
          <p>รายการที่มี underlying exposure ซ้อนกันสูง</p>
        </div>
        <span class="count-badge">${warnings.length}</span>
      </div>
      <div class="warning-list">
        ${warnings.map((warning) => `
          <article class="warning-item">
            <strong>${escapeHtml(warning.title)}</strong>
            <p>${escapeHtml(warning.text)}</p>
          </article>`).join("")}
      </div>`;
  }

  function renderGroup(group, rows) {
    const cards = rows.length ? rows.map((row) => renderAssetCard(row, group.key)).join("") : `<div class="empty-box">ไม่มีรายการในกลุ่มนี้</div>`;
    return `
      <section class="exposure-panel" id="exposure-${escapeHtml(group.key)}">
        <div class="panel-heading">
          <div>
            <h2>${escapeHtml(group.title)} · ${escapeHtml(group.thai)}</h2>
            <p>${escapeHtml(group.description)}</p>
          </div>
          <span class="count-badge">${rows.length}</span>
        </div>
        <div class="asset-grid">${cards}</div>
      </section>`;
  }

  function renderAssetCard(row, activeGroup) {
    const detailHref = `/ai-boom-universe?focus=${encodeURIComponent(row.symbol)}`;
    const tags = row.tags.map((tag) => `<span class="tag ${isOverlapTag(tag, activeGroup) ? "is-overlap" : ""}">${escapeHtml(tag)}</span>`).join("");
    return `
      <a class="asset-card" href="${detailHref}" title="เปิดรายละเอียดใน AI Boom Universe">
        <div class="asset-top">
          <div>
            <div class="asset-symbol">${escapeHtml(row.displaySymbol)}</div>
            <div class="asset-name">${escapeHtml(row.displayName)}</div>
          </div>
          <span class="count-badge">${row.groups.length}</span>
        </div>
        <div class="asset-meta">${escapeHtml(row.holding ? `${formatMoney(row.marketValue)} ${row.currency}` : formatAssetType(row.asset))}</div>
        <div class="tag-row">${tags}</div>
      </a>`;
  }

  function riskExplanation(risk, total) {
    if (risk.level.label === "Extreme") return `มี exposure กระจุกสูงมาก โดยกลุ่มใหญ่สุดคิดเป็น ${risk.maxCount}/${total} รายการ${risk.totalValue > 0 ? ` หรือ ${((risk.maxValue / risk.totalValue) * 100).toFixed(1)}% ของพอร์ต` : ""} ควรลดการนับซ้ำก่อนเพิ่ม position`;
    if (risk.level.label === "High") return `พอร์ตมีธีมหลักซ้อนกันค่อนข้างมาก กลุ่มใหญ่สุดมี ${risk.maxCount}/${total} รายการ${risk.totalValue > 0 ? ` หรือ ${((risk.maxValue / risk.totalValue) * 100).toFixed(1)}% ของพอร์ต` : ""} ควรเช็กว่าสินทรัพย์เหล่านี้ขยับจาก driver เดียวกันหรือไม่`;
    if (risk.level.label === "Medium") return `มี concentration บางกลุ่ม แต่ยังไม่รุนแรง ควรใช้หน้านี้ช่วยดู overlap ก่อนเพิ่มสินทรัพย์ใหม่`;
    return "watchlist กระจาย exposure ค่อนข้างดีจากจำนวนรายการปัจจุบัน";
  }

  function isOverlapTag(tag, activeGroup) {
    const group = EXPOSURE_GROUPS.find((item) => item.key === activeGroup);
    return Boolean(group?.baseTags.includes(tag));
  }

  function displaySymbol(symbol, asset) {
    if (DISPLAY_SYMBOLS[symbol]) return DISPLAY_SYMBOLS[symbol];
    if (asset?.asset_type === "THAI_STOCK" && symbol.endsWith(".BK")) return symbol.slice(0, -3);
    return symbol || String(asset?.ticker || "");
  }

  function displayName(asset, symbol) {
    const name = String(asset?.name || "").trim();
    if (name && !/placeholder$/i.test(name)) return name;
    if (symbol === "K-GTECHRMF") return "K Global Technology RMF";
    if (symbol === "K-USXNDQRMF") return "K US Equity NDQ 100 Index RMF";
    if (symbol === "BTCUSD" || symbol === "BTC-USD") return "Bitcoin";
    return displaySymbol(symbol, asset);
  }

  function formatAssetType(asset) {
    const type = String(asset?.asset_type || "").replace(/_/g, " ");
    const market = asset?.market ? ` · ${asset.market}` : "";
    const currency = asset?.currency ? ` · ${asset.currency}` : "";
    return `${type || "asset"}${market}${currency}`;
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

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
  }

  async function loadExposureMap() {
    statusEl.textContent = "กำลังโหลด watchlist...";
    await loadPersistedState();
    resetAssets();
    const holdingResult = await window.PortfolioCore.loadHoldings();
    holdings = holdingResult.holdings;
    const realHoldings = holdings.filter((holding) => holding.isHolding);
    usingHoldings = realHoldings.length > 0;
    const assetBySymbol = new Map(assets.map((asset) => [canonicalSymbolFromTicker(asset.ticker), asset]));
    const analyses = usingHoldings
      ? realHoldings.map((holding) => analyzeExposure(assetBySymbol.get(holding.canonicalSymbol) || { ticker: holding.canonicalSymbol, name: holding.assetName, asset_type: holding.assetType }, holding))
      : assets.map((asset) => analyzeExposure(asset));
    render(analyses);
  }

  refreshButton?.addEventListener("click", () => {
    loadExposureMap().catch((error) => {
      statusEl.textContent = error?.message || "โหลด Exposure Map ไม่สำเร็จ";
    });
  });

  loadExposureMap().catch((error) => {
    statusEl.textContent = error?.message || "โหลด Exposure Map ไม่สำเร็จ";
    sectionsRoot.innerHTML = '<div class="empty-box">ไม่สามารถโหลด exposure map ได้</div>';
  });
})();
