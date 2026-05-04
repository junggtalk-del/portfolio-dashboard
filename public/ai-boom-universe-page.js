(function () {
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const seed = window.AIBoomUniverseSeed || { theme: "AI_DataCenter_Supercycle", ai_boom_universe: [] };
  const scoring = window.AIBoomScoring;
  let assets = seed.ai_boom_universe.map((asset) => scoring.enrichAsset(asset));

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

  function loadUserAssets() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.map((asset) => scoring.enrichAsset(asset));
    } catch (error) {
      return [];
    }
  }

  function saveUserAssets() {
    const userAssets = assets.filter((asset) => asset.is_user_added);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userAssets));
  }

  function resetAssets() {
    assets = [
      ...seed.ai_boom_universe.map((asset) => scoring.enrichAsset(asset)),
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

  function scoreClass(value, type) {
    if (type === "risk") {
      if (value >= 8) return "ai-risky";
      if (value >= 6) return "ai-neutral";
      return "ai-good";
    }
    if (value >= 8) return "ai-good";
    if (value >= 6) return "ai-neutral";
    return "ai-risky";
  }

  function actionClass(action) {
    if (action === "Accumulate") return "ai-good";
    if (action === "Wait for pullback" || action === "Reduce") return "ai-risky";
    return "ai-neutral";
  }

  function riskClass(level) {
    if (level === "low") return "ai-good";
    if (level === "high") return "ai-risky";
    return "ai-neutral";
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
    return assets.filter((asset) => {
      return Object.entries(selected).every(([key, value]) => !value || asset[key] === value);
    });
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
      rows.innerHTML = '<tr><td colspan="6">ไม่พบรายการที่ตรงกับตัวกรอง</td></tr>';
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
        <td>${escapeHtml(formatLabel(asset.layer))}</td>
        <td><span class="ai-score ${scoreClass(asset.quality_score, "quality")}">${asset.quality_score}</span></td>
        <td><span class="ai-score ${scoreClass(asset.hype_risk_score, "risk")}">${asset.hype_risk_score}</span></td>
        <td>
          <span class="ai-action ${actionClass(asset.initial_action)}">${escapeHtml(formatLabel(asset.initial_action))}</span>
          <span class="ai-risk ${riskClass(asset.risk_level)}">${escapeHtml(formatLabel(asset.risk_level))}</span>
        </td>
        <td class="ai-row-actions">
          <button class="ai-delete-button" type="button" data-delete-id="${escapeHtml(asset.id)}">ลบ</button>
        </td>`;
      rows.appendChild(row);

      if (asset.warning) {
        const warningRow = document.createElement("tr");
        warningRow.className = "ai-warning-row";
        warningRow.innerHTML = `<td colspan="6"><span class="ai-warning-box">สินทรัพย์แข็งแรง แต่ราคาอาจสะท้อนความคาดหวังสูงเกินไปแล้ว</span></td>`;
        rows.appendChild(warningRow);
      }
    }
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
    assets = assets.filter((item) => item.id !== id);
    saveUserAssets();
    refreshFilterOptions();
    renderRows();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
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
