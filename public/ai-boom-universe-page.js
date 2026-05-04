(function () {
  const seed = window.AIBoomUniverseSeed || { theme: "AI_DataCenter_Supercycle", ai_boom_universe: [] };
  const scoring = window.AIBoomScoring;
  const assets = seed.ai_boom_universe.map((asset) => scoring.enrichAsset(asset));
  const filters = {
    layer: document.querySelector("#layerFilter"),
    assetType: document.querySelector("#assetTypeFilter"),
    riskLevel: document.querySelector("#riskLevelFilter"),
    action: document.querySelector("#actionFilter")
  };
  const rows = document.querySelector("#aiUniverseRows");
  const count = document.querySelector("#assetCount");
  const waitCount = document.querySelector("#waitCount");
  const accumulateCount = document.querySelector("#accumulateCount");
  const warningCount = document.querySelector("#warningCount");
  const activeFilterText = document.querySelector("#activeFilterText");

  function uniqueValues(key) {
    return [...new Set(assets.map((asset) => asset[key]).filter(Boolean))].sort();
  }

  function fillSelect(select, values, label) {
    select.innerHTML = `<option value="">${label}</option>`;
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatLabel(value);
      select.appendChild(option);
    }
  }

  function formatLabel(value) {
    return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      : "Showing full AI Data Center Supercycle seed universe";
  }

  function renderRows() {
    const filteredAssets = filterAssets();
    renderSummary(filteredAssets);
    rows.innerHTML = "";

    if (!filteredAssets.length) {
      rows.innerHTML = '<tr><td colspan="7">No assets match the selected filters.</td></tr>';
      return;
    }

    for (const asset of filteredAssets) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="ai-asset-name">
            <strong>${escapeHtml(asset.ticker)}</strong>
            <span>${escapeHtml(asset.name)} · ${escapeHtml(asset.thai_access)}</span>
          </div>
        </td>
        <td>${escapeHtml(formatLabel(asset.layer))}</td>
        <td><span class="ai-score ${scoreClass(asset.quality_score, "quality")}">${asset.quality_score}</span></td>
        <td><span class="ai-score ${scoreClass(asset.hype_risk_score, "risk")}">${asset.hype_risk_score}</span></td>
        <td><span class="ai-score ${scoreClass(asset.valuation_risk_score, "risk")}">${asset.valuation_risk_score}</span></td>
        <td><span class="ai-score ${scoreClass(asset.final_score + 5, "quality")}">${asset.final_score}</span></td>
        <td>
          <span class="ai-action ${actionClass(asset.initial_action)}">${escapeHtml(asset.initial_action)}</span>
          <span class="ai-risk ${riskClass(asset.risk_level)}">${escapeHtml(asset.risk_level)}</span>
        </td>`;
      rows.appendChild(row);

      if (asset.warning) {
        const warningRow = document.createElement("tr");
        warningRow.className = "ai-warning-row";
        warningRow.innerHTML = `<td colspan="7"><span class="ai-warning-box">${escapeHtml(asset.warning)}</span></td>`;
        rows.appendChild(warningRow);
      }
    }
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

  fillSelect(filters.layer, uniqueValues("layer"), "All layers");
  fillSelect(filters.assetType, uniqueValues("asset_type"), "All asset types");
  fillSelect(filters.riskLevel, uniqueValues("risk_level"), "All risk levels");
  fillSelect(filters.action, uniqueValues("initial_action"), "All actions");

  Object.values(filters).forEach((select) => select.addEventListener("change", renderRows));
  renderRows();
})();
