(function () {
  const core = window.PortfolioCore;
  const seed = window.AIBoomUniverseSeed || { ai_boom_universe: [] };
  const scoring = window.AIBoomScoring || { enrichAsset: (asset) => asset };
  const STORAGE_KEY = "aiBoomUniverseUserAssets";
  const REMOVED_KEY = "aiBoomUniverseRemovedAssetIds";
  const LEGACY_HIDDEN_IDS = new Set(["ai-scb-global-tech-fund", "ai-kkp-g-tech-fund", "ai-b-innotech-fund"]);

  const form = document.querySelector("#holdingForm");
  const rowsEl = document.querySelector("#holdingsRows");
  const summaryEl = document.querySelector("#holdingsSummary");
  const modeText = document.querySelector("#holdingModeText");
  const feedback = document.querySelector("#holdingFeedback");
  const modalFeedback = document.querySelector("#modalFeedback");
  const reloadButton = document.querySelector("#reloadHoldingsButton");
  const addButton = document.querySelector("#addHoldingButton");
  const modal = document.querySelector("#holdingModal");
  const modalTitle = document.querySelector("#holdingModalTitle");
  const modalKicker = document.querySelector("#holdingModalKicker");
  const cancelButtons = [
    document.querySelector("#cancelHoldingButton"),
    document.querySelector("#cancelHoldingButtonBottom")
  ].filter(Boolean);
  const dataList = document.querySelector("#aiAssetOptions");

  let holdings = [];
  let assetOptions = [];
  let editingSymbol = "";
  let storageMode = "loading";
  let assetSelectionToken = 0;
  let assetSelectionTimer = null;

  function input(id) {
    return document.querySelector(`#${id}`);
  }

  function numberValue(id) {
    const raw = input(id).value;
    if (raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  function setFeedback(target, message, tone = "") {
    target.textContent = message || "";
    target.classList.remove("is-error", "is-success", "is-warning");
    if (tone) target.classList.add(tone);
  }

  function readJsonArray(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (_error) {
      return [];
    }
  }

  function sanitizeAiState(data) {
    const safe = data && typeof data === "object" ? data : {};
    return {
      userAssets: Array.isArray(safe.userAssets) ? safe.userAssets : [],
      removedIds: Array.isArray(safe.removedIds) ? safe.removedIds : []
    };
  }

  async function loadAiUniverseState() {
    try {
      const response = await fetch("/api/ai-universe", { cache: "no-store" });
      if (!response.ok) throw new Error("AI universe state request failed");
      const payload = await response.json();
      return sanitizeAiState(payload?.data);
    } catch (_error) {
      setFeedback(feedback, "Unable to load AI Boom Universe assets. You can still add manually.", "is-error");
      return sanitizeAiState({
        userAssets: readJsonArray(STORAGE_KEY),
        removedIds: readJsonArray(REMOVED_KEY)
      });
    }
  }

  async function buildAssetOptions() {
    const state = await loadAiUniverseState();
    const removedIds = new Set(state.removedIds || []);
    const rawAssets = [
      ...seed.ai_boom_universe
        .filter((asset) => !removedIds.has(asset.id))
        .filter((asset) => !LEGACY_HIDDEN_IDS.has(asset.id))
        .map((asset) => scoring.enrichAsset(asset)),
      ...(state.userAssets || []).map((asset) => scoring.enrichAsset(asset))
    ];
    const seen = new Set();
    assetOptions = rawAssets.map(assetToOption).filter((option) => {
      if (!option.canonicalSymbol || seen.has(option.canonicalSymbol)) return false;
      seen.add(option.canonicalSymbol);
      return true;
    }).sort((a, b) => a.displaySymbol.localeCompare(b.displaySymbol));
    renderAssetDatalist();
  }

  function assetToOption(asset) {
    const canonicalSymbol = core.canonicalSymbolFromTicker(asset?.ticker);
    const displaySymbol = core.displaySymbolForCanonical(canonicalSymbol);
    const assetType = core.detectAssetType(canonicalSymbol, asset?.asset_type || "");
    const currency = asset?.currency || (assetType === "THAI_STOCK" || assetType === "THAI_INDEX" || assetType === "THAI_MUTUAL_FUND" ? "THB" : "USD");
    const providerSymbol = asset?.provider_symbol || providerSymbolFor(canonicalSymbol, assetType);
    const market = asset?.market || marketFor(assetType);
    const assetName = asset?.name || displaySymbol || canonicalSymbol;
    const aliases = aliasText(canonicalSymbol);
    return {
      canonicalSymbol,
      displaySymbol,
      assetName,
      assetType,
      providerSymbol,
      market,
      currency,
      aliases,
      label: `${displaySymbol} - ${assetName} - ${formatAssetType(assetType)}`
    };
  }

  function providerSymbolFor(symbol, assetType) {
    if (symbol === "BTCUSD") return "BTC-USD";
    if (assetType === "THAI_STOCK" || assetType === "THAI_INDEX") return symbol;
    return symbol;
  }

  function marketFor(assetType) {
    if (assetType === "THAI_STOCK" || assetType === "THAI_INDEX") return "SET";
    if (assetType === "THAI_MUTUAL_FUND") return "TH_FUND";
    if (assetType === "crypto") return "CRYPTO";
    return "US";
  }

  function aliasText(symbol) {
    if (symbol === "K-GTECHRMF") return "KGTECHRMF K GTECHRMF";
    if (symbol === "K-USXNDQRMF") return "KUSXNDQRMF K USXNDQRMF";
    if (symbol === "GULF.BK") return "GULF GULFBK";
    if (symbol === "^SET50.BK") return "SET50 SET50.BK SET50 INDEX";
    if (symbol === "^GSPC") return "SPX GSPC";
    if (symbol === "^IXIC") return "IXIC";
    if (symbol === "^NDX") return "NDX NDX01";
    if (symbol === "BTCUSD") return "BTC BTC-USD";
    return "";
  }

  function renderAssetDatalist() {
    dataList.innerHTML = assetOptions.map((option) =>
      `<option value="${escapeHtml(option.displaySymbol)}" label="${escapeHtml(option.label)}"></option>`
    ).join("");
  }

  async function load() {
    setFeedback(feedback, "กำลังโหลด holdings และ asset list...");
    await buildAssetOptions();
    const result = await core.loadHoldings();
    holdings = result.holdings;
    storageMode = result.mode;
    modeText.textContent = result.mode;
    render();
    setFeedback(feedback, `Loaded ${holdings.length} holdings`, "is-success");
  }

  function render() {
    const total = core.totalMarketValue(holdings);
    const holdingCount = holdings.filter((holding) => holding.isHolding).length;
    const watchCount = holdings.length - holdingCount;
    summaryEl.textContent = `Holding ${holdingCount} รายการ · Watchlist Only ${watchCount} รายการ · Total ${formatMoney(total)} THB`;
    rowsEl.innerHTML = holdings.length ? holdings.map((holding) => renderRow(holding, total)).join("") : '<tr><td colspan="5">ยังไม่มี holdings</td></tr>';
  }

  function renderRow(holding, total) {
    const weight = total > 0 && holding.isHolding ? (holding.marketValue / total) * 100 : 0;
    const gap = Number.isFinite(holding.targetWeight) ? weight - holding.targetWeight : null;
    const plPct = Number.isFinite(holding.costValue) && holding.costValue > 0
      ? ((holding.marketValue - holding.costValue) / holding.costValue) * 100
      : null;
    return `
      <tr id="holding-${escapeHtml(holding.canonicalSymbol.replace(/[^A-Z0-9]/g, "-"))}">
        <td><a href="/asset/${encodeURIComponent(holding.providerSymbol || holding.canonicalSymbol || holding.displaySymbol)}" class="asset-link"><strong>${escapeHtml(holding.displaySymbol)}</strong></a><small>${escapeHtml(holding.canonicalSymbol)}</small></td>
        <td>${escapeHtml(holding.assetName)}</td>
        <td><strong>${formatMoney(holding.marketValue)}</strong><small>THB</small></td>
        <td>${formatPercent(weight)}</td>
        <td>
          <div class="row-actions">
            <button class="edit-button" type="button" data-edit="${escapeHtml(holding.canonicalSymbol)}">แก้ไข</button>
            <button class="delete-button" type="button" data-delete="${escapeHtml(holding.canonicalSymbol)}">ลบ</button>
          </div>
        </td>
      </tr>`;
  }

  function openModal(mode, holding = null) {
    editingSymbol = mode === "edit" ? holding?.canonicalSymbol || "" : "";
    input("holdingMode").value = mode;
    modalKicker.textContent = mode === "edit" ? "Edit Holding" : "Add Holding";
    modalTitle.textContent = mode === "edit" ? "แก้ไขรายการลงทุน" : "เพิ่มรายการลงทุน";
    setFeedback(modalFeedback, "");
    form.reset();
    setAssetReadonly(mode === "edit");

    if (mode === "edit" && holding) {
      fillFormFromHolding(holding);
    } else {
      input("holdingStatus").value = "holding";
      input("holdingCurrency").value = "THB";
      input("holdingAssetType").value = "";
      input("holdingProviderSymbol").value = "";
      input("holdingLatestPrice").value = "";
      input("holdingAssetSearch").focus();
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    editingSymbol = "";
    form.reset();
  }

  function setAssetReadonly(readonly) {
    input("holdingAssetSearch").disabled = readonly;
    input("holdingSymbol").readOnly = readonly;
    input("holdingName").readOnly = readonly;
    input("holdingAssetType").readOnly = true;
    input("holdingProviderSymbol").readOnly = true;
    input("holdingLatestPrice").readOnly = true;
    document.querySelector("#assetHelpText").textContent = readonly
      ? "Asset identity is locked in edit mode. Delete and add again to change symbol."
      : "เลือกจาก AI Boom Universe หรือพิมพ์ symbol เองได้";
  }

  function fillFormFromHolding(holding) {
    input("holdingAssetSearch").value = `${holding.displaySymbol} - ${holding.assetName}`;
    input("holdingSymbol").value = holding.canonicalSymbol;
    input("holdingName").value = holding.assetName;
    input("holdingAssetType").value = holding.assetType || core.detectAssetType(holding.canonicalSymbol);
    input("holdingProviderSymbol").value = providerSymbolFor(holding.canonicalSymbol, holding.assetType);
    input("holdingLatestPrice").value = "";
    input("holdingStatus").value = holding.isHolding ? "holding" : "watchlist";
    input("holdingMarketValue").value = Number.isFinite(holding.marketValue) && holding.marketValue > 0 ? holding.marketValue : "";
    input("holdingCurrency").value = "THB";
    input("holdingTargetWeight").value = Number.isFinite(holding.targetWeight) ? holding.targetWeight : "";
    input("holdingQuantity").value = Number.isFinite(holding.quantity) ? holding.quantity : "";
    input("holdingAverageCost").value = Number.isFinite(holding.averageCost) ? holding.averageCost : "";
    input("holdingCostValue").value = Number.isFinite(holding.costValue) ? holding.costValue : "";
    input("holdingBucket").value = holding.portfolioBucket || "";
    input("holdingAccountType").value = holding.accountType || "";
    input("holdingNotes").value = holding.notes || "";
  }

  function findAssetOption(raw) {
    const text = String(raw || "").trim().toUpperCase();
    const canonical = core.canonicalSymbolFromTicker(text);
    return assetOptions.find((option) =>
      option.canonicalSymbol === canonical ||
      option.displaySymbol.toUpperCase() === text ||
      option.label.toUpperCase() === text ||
      option.aliases.toUpperCase().split(/\s+/).includes(text)
    ) || null;
  }

  function symbolFromForm() {
    const hiddenSymbol = input("holdingSymbol").value;
    if (hiddenSymbol) return core.canonicalSymbolFromTicker(hiddenSymbol);
    const typedSymbol = String(input("holdingAssetSearch").value || "").split(" - ")[0];
    return core.canonicalSymbolFromTicker(typedSymbol);
  }

  async function applyAssetSelection() {
    const token = ++assetSelectionToken;
    const option = findAssetOption(input("holdingAssetSearch").value || input("holdingSymbol").value);
    if (!option) return;
    input("holdingSymbol").value = option.canonicalSymbol;
    input("holdingName").value = option.assetName;
    input("holdingAssetType").value = option.assetType;
    input("holdingProviderSymbol").value = option.providerSymbol;
    input("holdingCurrency").value = "THB";
    input("holdingBucket").value = input("holdingBucket").value || defaultBucket(option.assetType);
    input("holdingAccountType").value = input("holdingAccountType").value || defaultAccount(option.assetType);
    input("holdingLatestPrice").value = "Loading...";
    const price = await fetchLatestPrice(option.providerSymbol || option.canonicalSymbol);
    if (token !== assetSelectionToken) return;
    input("holdingLatestPrice").value = price.value ? `${formatMoney(price.value)} (${price.date || "-"})` : "Not available";
  }

  function scheduleAssetSelection() {
    window.clearTimeout(assetSelectionTimer);
    assetSelectionTimer = window.setTimeout(() => {
      applyAssetSelection();
    }, 120);
  }

  async function fetchLatestPrice(symbol) {
    try {
      const response = await fetch(`/api/market-data?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("price request failed");
      const payload = await response.json();
      const closes = Array.isArray(payload.closes) ? payload.closes : [];
      const dates = Array.isArray(payload.dates) ? payload.dates : [];
      return {
        value: Number(closes[closes.length - 1]),
        date: dates[dates.length - 1] || null
      };
    } catch (_error) {
      return { value: null, date: null };
    }
  }

  function defaultBucket(assetType) {
    if (assetType === "THAI_MUTUAL_FUND") return "Thai RMF";
    if (assetType === "THAI_STOCK") return "Thai Stock";
    if (assetType === "THAI_INDEX" || assetType === "INDEX") return "Index";
    if (assetType === "crypto") return "Crypto";
    if (assetType === "etf") return "US ETF";
    return "US Stock";
  }

  function defaultAccount(assetType) {
    if (assetType === "THAI_MUTUAL_FUND") return "RMF";
    if (assetType === "crypto") return "Crypto";
    if (assetType === "etf") return "ETF";
    return "Direct";
  }

  function validateForm(mode) {
    const symbol = symbolFromForm();
    const isHolding = true;
    const marketValue = numberValue("holdingMarketValue");
    const targetWeight = numberValue("holdingTargetWeight");
    if (!symbol) return { ok: false, message: "Please enter or select a symbol" };
    if (!Number.isFinite(marketValue) || marketValue <= 0) {
      return { ok: false, message: "Please enter market value in THB" };
    }
    if (targetWeight !== null && (targetWeight < 0 || targetWeight > 100)) {
      return { ok: false, message: "Target weight must be 0-100" };
    }
    const duplicate = holdings.find((holding) => holding.canonicalSymbol === symbol);
    if (mode === "add" && duplicate) {
      return { ok: false, message: `${symbol} already exists in Portfolio Holdings`, duplicateSymbol: symbol };
    }
    return { ok: true, symbol };
  }

  function buildHoldingFromForm(symbol) {
    const isHolding = true;
    const quantity = numberValue("holdingQuantity");
    const averageCost = numberValue("holdingAverageCost");
    const explicitCostValue = numberValue("holdingCostValue");
    const costValue = explicitCostValue ?? (
      Number.isFinite(quantity) && Number.isFinite(averageCost) ? quantity * averageCost : null
    );
    return core.normalizeHolding({
      canonicalSymbol: symbol,
      displaySymbol: core.displaySymbolForCanonical(symbol),
      assetName: input("holdingName").value || symbol,
      assetType: input("holdingAssetType").value || core.detectAssetType(symbol),
      providerSymbol: input("holdingProviderSymbol").value || symbol,
      isHolding,
      watchlistOnly: !isHolding,
      quantity,
      averageCost,
      costValue,
      marketValue: numberValue("holdingMarketValue"),
      currency: "THB",
      targetWeight: numberValue("holdingTargetWeight"),
      portfolioBucket: input("holdingBucket").value,
      accountType: input("holdingAccountType").value,
      notes: input("holdingNotes").value,
      updatedAt: new Date().toISOString()
    });
  }

  async function persistHoldings(successMessage) {
    core.writeLocalHoldings(holdings);
    try {
      holdings = await core.saveHoldings(holdings);
      storageMode = "server";
      modeText.textContent = storageMode;
      setFeedback(feedback, successMessage, "is-success");
      return true;
    } catch (error) {
      storageMode = "local-cache";
      modeText.textContent = storageMode;
      setFeedback(feedback, `Saved locally only. Server sync failed: ${error.message || "unknown error"}`, "is-warning");
      console.warn("[portfolio-holdings] save fallback", error);
      return false;
    } finally {
      render();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const mode = input("holdingMode").value === "edit" ? "edit" : "add";
    console.log("Add holding clicked", { mode });
    setFeedback(modalFeedback, "");
    const validation = validateForm(mode);
    console.log("[portfolio-holdings] validation result", validation);
    if (!validation.ok) {
      setFeedback(modalFeedback, validation.message, "is-error");
      if (validation.duplicateSymbol) showExisting(validation.duplicateSymbol);
      return;
    }
    const symbol = mode === "edit" ? editingSymbol : validation.symbol;
    if (!input("holdingSymbol").value) {
      input("holdingSymbol").value = symbol;
      input("holdingName").value = input("holdingName").value || symbol;
      input("holdingAssetType").value = input("holdingAssetType").value || core.detectAssetType(symbol);
      input("holdingProviderSymbol").value = input("holdingProviderSymbol").value || symbol;
    }
    const next = buildHoldingFromForm(symbol);
    console.log("[portfolio-holdings] form values", next);
    holdings = core.dedupeHoldings([
      ...holdings.filter((holding) => holding.canonicalSymbol !== symbol),
      next
    ]);
    await persistHoldings(mode === "edit" ? "Holding updated successfully" : "Holding added successfully");
    console.log("[portfolio-holdings] save result", { mode: storageMode, symbol });
    closeModal();
  }

  function showExisting(symbol) {
    closeModal();
    const row = document.getElementById(`holding-${symbol.replace(/[^A-Z0-9]/g, "-")}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("is-highlight");
      window.setTimeout(() => row.classList.remove("is-highlight"), 1600);
    }
  }

  addButton.addEventListener("click", () => {
    console.log("Add holding clicked");
    openModal("add");
  });

  cancelButtons.forEach((button) => button.addEventListener("click", closeModal));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  form.addEventListener("submit", handleSubmit);
  input("holdingAssetSearch").addEventListener("input", scheduleAssetSelection);
  input("holdingAssetSearch").addEventListener("change", applyAssetSelection);
  input("holdingSymbol").addEventListener("change", applyAssetSelection);

  rowsEl.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    if (editButton) {
      const holding = holdings.find((item) => item.canonicalSymbol === editButton.dataset.edit);
      if (holding) openModal("edit", holding);
      return;
    }
    if (!deleteButton) return;
    const symbol = deleteButton.dataset.delete;
    try {
      const response = await fetch(`/api/portfolio-holdings?symbol=${encodeURIComponent(symbol)}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `delete failed (${response.status})`);
      }
      await load();
      setFeedback(feedback, "Holding deleted successfully", "is-success");
    } catch (error) {
      setFeedback(feedback, error?.message || "ลบ holding ไม่สำเร็จ", "is-error");
    }
  });

  reloadButton.addEventListener("click", load);

  function formatAssetType(assetType) {
    return String(assetType || "asset").replace(/_/g, " ");
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(number);
  }

  function formatPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)}%` : "-";
  }

  function formatSignedPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number >= 0 ? "+" : ""}${number.toFixed(2)}%` : "-";
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

  load().catch((error) => {
    setFeedback(feedback, error?.message || "โหลด holdings ไม่สำเร็จ", "is-error");
  });
})();
