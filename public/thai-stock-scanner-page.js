(function () {
  const state = {
    universe: "SET100",
    customSymbols: "",
    results: [],
    near: [],
    failed: [],
    insufficient: [],
    scanned: 0,
    scannedByMarket: { SET: 0, mai: 0 },
    totalByMarket: { SET: 0, mai: 0 },
    total: 0,
    lastScannedAt: null,
    ageFilter: "all",
    marketFilter: "SET",
    smaFilter: "all",
    volumeFilter: "all",
    liquidityFilter: "all",
    requireVolumeConfirmation: false,
    search: "",
    sortKey: "daysSinceCrossover",
    sortDirection: "asc"
  };

  const els = {};
  const scannerCache = {};

  function $(selector) {
    return document.querySelector(selector);
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

  function scannerKey(universe = state.universe) {
    return `thai_stock_scanner_${String(universe || "SET100").toUpperCase()}`;
  }

  function emptyScannerData(universe = state.universe) {
    return {
      universe,
      customSymbols: universe === "CUSTOM" ? state.customSymbols : "",
      scanned: 0,
      scannedByMarket: { SET: 0, mai: 0 },
      totalByMarket: { SET: 0, mai: 0 },
      total: 0,
      generatedAt: null,
      results: [],
      near: [],
      failed: [],
      insufficient: []
    };
  }

  function dataFromState() {
    return {
      universe: state.universe,
      customSymbols: state.customSymbols,
      scanned: state.scanned,
      scannedByMarket: state.scannedByMarket,
      totalByMarket: state.totalByMarket,
      total: state.total,
      generatedAt: state.lastScannedAt,
      results: state.results,
      near: state.near,
      failed: state.failed,
      insufficient: state.insufficient
    };
  }

  function applyScannerData(data) {
    const safe = data || emptyScannerData();
    state.results = safe.results || [];
    state.near = safe.near || [];
    state.failed = safe.failed || [];
    state.insufficient = safe.insufficient || [];
    state.scanned = safe.scanned || safe.total || 0;
    state.scannedByMarket = safe.scannedByMarket || { SET: 0, mai: 0 };
    state.totalByMarket = safe.totalByMarket || { SET: 0, mai: 0 };
    state.total = safe.total || 0;
    state.lastScannedAt = safe.generatedAt || null;
    if (safe.customSymbols && state.universe === "CUSTOM") {
      state.customSymbols = safe.customSymbols;
      if (els.customSymbols) els.customSymbols.value = safe.customSymbols;
    }
  }

  function rememberCurrentScanner() {
    scannerCache[scannerKey()] = dataFromState();
  }

  function universeLabel(value = state.universe) {
    const labels = {
      SET100: "SET100",
      MAI: "mai",
      SET100_MAI: "SET100 + mai",
      CUSTOM: "กำหนดเอง"
    };
    return labels[value] || "SET100";
  }

  function scanButtonText() {
    if (state.universe === "MAI") return "สแกนหุ้น mai";
    if (state.universe === "SET100_MAI") return "สแกน SET100 + mai";
    if (state.universe === "CUSTOM") return "สแกนรายการที่กำหนดเอง";
    return "สแกนหุ้น SET100";
  }

  function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return number.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function formatCompact(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(number);
  }

  function formatPct(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return `${number > 0 ? "+" : ""}${formatNumber(number, 2)}%`;
  }

  function formatRatio(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return `${formatNumber(number, 2)}x`;
  }

  function readSnapshotScanner() {
    const cached = scannerCache[scannerKey()];
    if (cached) {
      applyScannerData(cached);
      return true;
    }
    const snapshot = window.PortfolioDataSnapshot?.read?.();
    const keyed = snapshot?.thaiStockScanners?.[scannerKey()];
    const legacy = snapshot?.thaiStockScanner?.universe === state.universe ? snapshot.thaiStockScanner : null;
    const data = keyed || legacy;
    if (!data) {
      applyScannerData(emptyScannerData());
      return false;
    }
    scannerCache[scannerKey()] = data;
    applyScannerData(data);
    return true;
  }

  function saveScannerToSnapshot() {
    const api = window.PortfolioDataSnapshot;
    if (!api?.write) return;
    const previous = api.read?.() || {
      snapshotId: `snapshot-${Date.now()}`,
      dataVersion: api.DATA_VERSION || "2026-06-portfolio-dashboard-v1",
      loadedAt: new Date().toISOString(),
      status: "scanner-only",
      assets: [],
      prices: {},
      historicalData: {},
      technicalSignals: {},
      rsiSignals: {},
      errors: []
    };
    const generatedAt = new Date().toISOString();
    state.lastScannedAt = state.lastScannedAt || generatedAt;
    const data = { ...dataFromState(), generatedAt: state.lastScannedAt };
    scannerCache[scannerKey()] = data;
    api.write({
      ...previous,
      thaiStockScanner: data,
      thaiStockScanners: {
        ...(previous.thaiStockScanners || {}),
        ...scannerCache,
        [scannerKey()]: data
      }
    });
  }

  function rememberScannerProgress() {
    scannerCache[scannerKey()] = dataFromState();
    saveScannerToSnapshot();
  }

  function renderFilterGroup(container, options, activeKey, attr) {
    container.innerHTML = options.map(([key, label]) => (
      `<button class="${activeKey === key ? "is-active" : ""}" data-${attr}="${key}" type="button">${escapeHtml(label)}</button>`
    )).join("");
  }

  function renderFilters() {
    renderFilterGroup(els.ageFilters, [["all", "All"], ["1", "1 day"], ["2", "2 days"], ["3", "3 days"]], state.ageFilter, "age");
    renderFilterGroup(els.marketFilters, [["all", "All"], ["SET", "SET"], ["mai", "mai"]], state.marketFilter, "market");
    renderFilterGroup(els.smaFilters, [["all", "All"], ["above", "Above SMA200"], ["below", "Below SMA200"], ["na", "SMA200 N/A"]], state.smaFilter, "sma");
    renderFilterGroup(els.volumeFilters, [
      ["all", "ทั้งหมด"],
      ["confirmed", "เฉพาะวอลุ่ม confirm"],
      ["strong", "เฉพาะวอลุ่มแรง"],
      ["very_strong", "เฉพาะวอลุ่มแรงมาก"],
      ["not_confirmed", "วอลุ่มยังไม่ confirm"],
      ["missing", "ไม่มีข้อมูลวอลุ่ม"]
    ], state.volumeFilter, "volume");
    renderFilterGroup(els.liquidityFilters, [["all", "All"], ["high", "High liquidity only"], ["available", "Volume available"], ["missing", "Volume not available"]], state.liquidityFilter, "liquidity");
  }

  function isVolumeConfirmed(item, threshold = 1) {
    return Number(item.volumeRatio) >= threshold;
  }

  function volumeMissing(item) {
    return !Number.isFinite(Number(item.volumeRatio));
  }

  function summaryCounts() {
    return {
      total: state.total || state.scanned,
      setScanned: Number(state.scannedByMarket?.SET) || 0,
      maiScanned: Number(state.scannedByMarket?.mai) || 0,
      crossTotal: state.results.length,
      day1: state.results.filter((item) => item.daysSinceCrossover === 1).length,
      day2: state.results.filter((item) => item.daysSinceCrossover <= 2).length,
      day3: state.results.filter((item) => item.daysSinceCrossover <= 3).length,
      confirmed: state.results.filter((item) => isVolumeConfirmed(item, 1)).length,
      strong: state.results.filter((item) => isVolumeConfirmed(item, 1.5)).length,
      veryStrong: state.results.filter((item) => isVolumeConfirmed(item, 2)).length,
      notConfirmed: state.results.filter((item) => Number(item.volumeRatio) < 1).length,
      missing: state.results.filter(volumeMissing).length,
      failed: state.failed.length + state.insufficient.length
    };
  }

  function renderSummary() {
    const counts = summaryCounts();
    const cards = [
      ["จำนวนหุ้นที่สแกน", counts.total, `Selected universe: ${universeLabel()}`],
      ["SET", counts.setScanned, "SET scanned"],
      ["mai", counts.maiScanned, "mai scanned"],
      ["ตัดขึ้นทั้งหมด", counts.crossTotal, "EMA Cross Up Total"],
      ["ตัดขึ้นวันนี้", counts.day1, "EMA bullish cross today"],
      ["ตัดขึ้นใน 2 วัน", counts.day2, "Crossed within 2 trading days"],
      ["ตัดขึ้นใน 3 วัน", counts.day3, "Crossed within 3 trading days"],
      ["วอลุ่ม confirm", counts.confirmed, "Volume ratio >= 1.0x"],
      ["วอลุ่มแรง", counts.strong, "Volume ratio >= 1.5x"],
      ["วอลุ่มแรงมาก", counts.veryStrong, "Volume ratio >= 2.0x"],
      ["วอลุ่มยังไม่ confirm", counts.notConfirmed, "Volume ratio < 1.0x"],
      ["ไม่มีข้อมูลวอลุ่ม", counts.missing, "Volume missing"],
      ["ข้อมูลไม่พอ / โหลดไม่สำเร็จ", counts.failed, "Failed / insufficient data"]
    ];
    els.summary.innerHTML = cards
      .filter(([label]) => !(state.universe === "SET100" && label === "mai") && !(state.universe === "MAI" && label === "SET"))
      .map(([label, count, desc]) => `
        <article class="summary-card">
          <span>${escapeHtml(label)}</span>
          <strong>${Number(count || 0).toLocaleString("en-US")}</strong>
          <small>${escapeHtml(desc)}</small>
        </article>
      `).join("");
  }

  function passesFilters(item) {
    const query = state.search.trim().toUpperCase();
    if (query && !`${item.displaySymbol} ${item.name}`.toUpperCase().includes(query)) return false;
    if (state.ageFilter !== "all" && Number(item.daysSinceCrossover) !== Number(state.ageFilter)) return false;
    if (state.marketFilter !== "all" && item.market !== state.marketFilter) return false;
    if (state.smaFilter === "above" && item.sma200Status !== "ABOVE_SMA200") return false;
    if (state.smaFilter === "below" && item.sma200Status !== "BELOW_SMA200") return false;
    if (state.smaFilter === "na" && item.sma200Status !== "SMA200_NOT_AVAILABLE") return false;
    if (state.requireVolumeConfirmation && !isVolumeConfirmed(item, 1)) return false;
    if (state.volumeFilter === "confirmed" && !isVolumeConfirmed(item, 1)) return false;
    if (state.volumeFilter === "strong" && !isVolumeConfirmed(item, 1.5)) return false;
    if (state.volumeFilter === "very_strong" && !isVolumeConfirmed(item, 2)) return false;
    if (state.volumeFilter === "not_confirmed" && !(Number(item.volumeRatio) < 1)) return false;
    if (state.volumeFilter === "missing" && !volumeMissing(item)) return false;
    if (state.liquidityFilter === "high" && !(Number(item.crossoverVolume || item.volume) >= 1_000_000)) return false;
    if (state.liquidityFilter === "available" && volumeMissing(item)) return false;
    if (state.liquidityFilter === "missing" && !volumeMissing(item)) return false;
    return true;
  }

  function sortedResults(items) {
    return [...items].sort((a, b) => {
      if (state.sortKey === "daysSinceCrossover") {
        const dayDiff = (Number(a.daysSinceCrossover) || 99) - (Number(b.daysSinceCrossover) || 99);
        if (dayDiff) return state.sortDirection === "asc" ? dayDiff : -dayDiff;
        const volumeDiff = (Number(b.volumeRatio) || -1) - (Number(a.volumeRatio) || -1);
        if (volumeDiff) return volumeDiff;
        return (Number(b.emaGapPct) || 0) - (Number(a.emaGapPct) || 0);
      }
      const key = state.sortKey;
      const av = a[key];
      const bv = b[key];
      if (typeof av === "string" || typeof bv === "string") {
        return state.sortDirection === "asc"
          ? String(av || "").localeCompare(String(bv || ""))
          : String(bv || "").localeCompare(String(av || ""));
      }
      const diff = (Number(av) || 0) - (Number(bv) || 0);
      return state.sortDirection === "asc" ? diff : -diff;
    });
  }

  function marketBadge(item) {
    return `<span class="market-badge ${item.market === "mai" ? "is-mai" : "is-set"}">${escapeHtml(item.market || "SET")}</span>`;
  }

  function volumeBadge(item) {
    const key = item.volumeConfirmation || "VOLUME_DATA_NOT_AVAILABLE";
    return `<span class="volume-badge ${escapeHtml(key.toLowerCase())}">${escapeHtml(item.volumeConfirmationThai || "ไม่มีข้อมูลวอลุ่ม")}</span>`;
  }

  function volumeBlock(item, near = false) {
    return `
      <div class="volume-box">
        <strong>${near ? "Latest Volume" : "Volume วันที่ตัดขึ้น"}</strong>
        <div>วันที่ตัดขึ้น: ${formatCompact(item.crossoverVolume ?? item.volume)}</div>
        <div>เฉลี่ย 5 วัน: ${formatCompact(item.averageVolume5D)}</div>
        <div>Volume ratio: ${formatRatio(item.volumeRatio ?? item.latestVolumeRatio)}</div>
        ${volumeBadge(item)}
      </div>
    `;
  }

  function stockCard(item, near = false) {
    return `
      <article class="stock-card ${near ? "is-near" : ""} ${item.market === "mai" ? "is-mai" : ""}">
        <div class="stock-top">
          <div>
            <div class="symbol-row"><span class="stock-symbol">${escapeHtml(item.displaySymbol)}</span>${marketBadge(item)}</div>
            <div class="stock-name">${escapeHtml(item.name)}</div>
          </div>
          <div class="stock-price">
            ${formatNumber(item.close)}
            <small>${escapeHtml(item.latestDate || "-")}</small>
          </div>
        </div>
        <span class="status-badge signal">${escapeHtml(item.signalThai || "EMA12 ตัดขึ้น EMA26")}</span>
        ${near ? "" : `<p class="stock-action">ตัดขึ้นมาแล้ว ${item.daysSinceCrossover} วัน · วันที่ตัดขึ้น ${escapeHtml(item.crossoverDate || "-")}</p>`}
        <div class="metric-grid">
          <div class="metric"><span>EMA12</span><strong>${formatNumber(item.ema12)}</strong></div>
          <div class="metric"><span>EMA26</span><strong>${formatNumber(item.ema26)}</strong></div>
          <div class="metric"><span>EMA gap</span><strong>${formatPct(item.emaGapPct)}</strong></div>
          <div class="metric"><span>SMA200</span><strong>${formatNumber(item.sma200)}</strong></div>
          <div class="metric"><span>Distance to SMA200</span><strong>${formatPct(item.distanceToSma200Pct)}</strong></div>
          <div class="metric"><span>Source</span><strong>${escapeHtml(item.source || "-")}</strong></div>
        </div>
        ${volumeBlock(item, near)}
        ${item.market === "mai" ? `<p class="liquidity-warning">หุ้น mai อาจมีสภาพคล่องต่ำและผันผวนสูง ควรดู volume ประกอบ</p>` : ""}
        <p class="stock-action">${escapeHtml(item.action || "เริ่มมีสัญญาณฟื้นตัว / เฝ้าดูต่อ")}</p>
      </article>
    `;
  }

  function renderTable(items) {
    if (!items.length) {
      els.tableBody.innerHTML = `<tr><td colspan="17">ยังไม่มีหุ้นที่เข้าเงื่อนไข</td></tr>`;
      return;
    }
    els.tableBody.innerHTML = sortedResults(items).map((item) => `
      <tr>
        <td>${escapeHtml(item.displaySymbol)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.market || "-")}</td>
        <td>${formatNumber(item.close)}</td>
        <td>${escapeHtml(item.latestDate || "-")}</td>
        <td>${escapeHtml(item.daysSinceCrossover || "-")}</td>
        <td>${escapeHtml(item.crossoverDate || "-")}</td>
        <td>${formatNumber(item.ema12)}</td>
        <td>${formatNumber(item.ema26)}</td>
        <td>${formatPct(item.emaGapPct)}</td>
        <td>${formatNumber(item.sma200)}</td>
        <td>${formatPct(item.distanceToSma200Pct)}</td>
        <td>${formatCompact(item.crossoverVolume)}</td>
        <td>${formatCompact(item.averageVolume5D)}</td>
        <td>${formatRatio(item.volumeRatio)}</td>
        <td>${escapeHtml(item.volumeConfirmationThai || "ไม่มีข้อมูลวอลุ่ม")}</td>
        <td>${escapeHtml(item.source || "-")}</td>
      </tr>
    `).join("");
  }

  function renderFailed() {
    const items = [
      ...state.insufficient.map((item) => ({ ...item, errorMessage: item.reason || "ข้อมูลไม่พอ" })),
      ...state.failed
    ];
    els.failedCount.textContent = items.length;
    if (!items.length) {
      els.failedList.innerHTML = `<div class="scanner-empty">ไม่มีรายการที่ล้มเหลว</div>`;
      return;
    }
    els.failedList.innerHTML = items.map((item) => `
      <div class="failed-item">
        <strong>${escapeHtml(item.displaySymbol)}</strong>
        <span>${escapeHtml(item.name || "")}</span>
        <span>${escapeHtml(item.market || "")}</span>
        <div>${escapeHtml(item.errorMessage || "Unable to scan")}</div>
      </div>
    `).join("");
  }

  function render() {
    if (els.currentUniverseLabel) els.currentUniverseLabel.textContent = `Current universe: ${universeLabel()}`;
    if (els.currentUniverseTitle) els.currentUniverseTitle.textContent = `กำลังสแกนหุ้นใน ${universeLabel()}`;
    if (els.scanButton) els.scanButton.textContent = scanButtonText();
    if (els.customSymbolsWrap) els.customSymbolsWrap.hidden = state.universe !== "CUSTOM";
    renderFilters();
    renderSummary();
    const filtered = state.results.filter(passesFilters);
    els.resultsCount.textContent = filtered.length;
    els.resultsGrid.innerHTML = filtered.length
      ? sortedResults(filtered).map((item) => stockCard(item)).join("")
      : `<div class="scanner-empty">ยังไม่มีหุ้นที่ EMA12 ตัดขึ้น EMA26 ใน 1–3 วันล่าสุด</div>`;
    const nearFiltered = state.near.filter((item) => {
      const query = state.search.trim().toUpperCase();
      if (query && !`${item.displaySymbol} ${item.name}`.toUpperCase().includes(query)) return false;
      if (state.marketFilter !== "all" && item.market !== state.marketFilter) return false;
      return true;
    });
    els.nearCount.textContent = nearFiltered.length;
    els.nearGrid.innerHTML = nearFiltered.length
      ? sortedResults(nearFiltered).map((item) => stockCard(item, true)).join("")
      : `<div class="scanner-empty">ยังไม่มีหุ้นที่ใกล้ตัดขึ้น</div>`;
    renderTable(filtered);
    renderFailed();
  }

  async function scanThaiStocks(options = {}) {
    const retryOnly = Boolean(options.retryOnly);
    const batchLimit = state.universe === "SET100_MAI" ? 6 : 8;
    els.scanButton.disabled = true;
    els.scanButton.textContent = retryOnly ? "Retrying..." : "Scanning...";
    els.progress.hidden = false;
    if (!retryOnly) {
      state.results = [];
      state.near = [];
      state.failed = [];
      state.insufficient = [];
      state.scanned = 0;
      state.scannedByMarket = { SET: 0, mai: 0 };
      state.totalByMarket = { SET: 0, mai: 0 };
      state.total = 0;
      state.lastScannedAt = null;
      scannerCache[scannerKey()] = dataFromState();
    }
    try {
      let offset = 0;
      let done = false;
      while (!done) {
        const params = new URLSearchParams({
          universe: state.universe,
          offset: String(offset),
          limit: String(batchLimit)
        });
        if (state.universe === "CUSTOM") params.set("symbols", state.customSymbols);
        const response = await fetch(`/api/thai-stock-scanner?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || `Scan failed (${response.status})`);
        state.total = payload.total || state.total;
        state.totalByMarket = payload.totalByMarket || state.totalByMarket;
        state.scanned = Math.min(state.total, (state.scanned || 0) + (payload.scanned || 0));
        state.scannedByMarket = {
          SET: (Number(state.scannedByMarket.SET) || 0) + (Number(payload.scannedByMarket?.SET) || 0),
          mai: (Number(state.scannedByMarket.mai) || 0) + (Number(payload.scannedByMarket?.mai) || 0)
        };
        state.results.push(...(payload.results || []));
        state.near.push(...(payload.near || []));
        state.insufficient.push(...(payload.insufficient || []));
        state.failed.push(...(payload.failed || []));
        scannerCache[scannerKey()] = dataFromState();
        els.progressText.textContent = `กำลังสแกน ${state.scanned} / ${state.total} รายการ`;
        render();
        done = Boolean(payload.done);
        offset = payload.nextOffset || state.total;
      }
      state.lastScannedAt = new Date().toISOString();
      rememberScannerProgress();
      els.retryButton.hidden = !state.failed.length;
    } catch (error) {
      els.progressText.textContent = `Scan failed: ${error.message || error}`;
    } finally {
      els.scanButton.disabled = false;
      els.scanButton.textContent = scanButtonText();
      window.setTimeout(() => {
        els.progress.hidden = true;
      }, 1800);
    }
  }

  function bindEvents() {
    els.scanButton.addEventListener("click", () => scanThaiStocks());
    els.retryButton.addEventListener("click", () => scanThaiStocks({ retryOnly: true }));
    els.universe.addEventListener("change", () => {
      rememberCurrentScanner();
      state.universe = els.universe.value || "SET100";
      state.marketFilter = state.universe === "MAI" ? "mai" : state.universe === "SET100" ? "SET" : "all";
      readSnapshotScanner();
      render();
    });
    els.customSymbols.addEventListener("input", () => {
      state.customSymbols = els.customSymbols.value;
    });
    els.requireVolume.addEventListener("change", () => {
      state.requireVolumeConfirmation = els.requireVolume.checked;
      render();
    });
    els.ageFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-age]");
      if (!button) return;
      state.ageFilter = button.dataset.age;
      render();
    });
    els.marketFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-market]");
      if (!button) return;
      state.marketFilter = button.dataset.market;
      render();
    });
    els.smaFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sma]");
      if (!button) return;
      state.smaFilter = button.dataset.sma;
      render();
    });
    els.volumeFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-volume]");
      if (!button) return;
      state.volumeFilter = button.dataset.volume;
      render();
    });
    els.liquidityFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-liquidity]");
      if (!button) return;
      state.liquidityFilter = button.dataset.liquidity;
      render();
    });
    els.search.addEventListener("input", () => {
      state.search = els.search.value;
      render();
    });
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        else {
          state.sortKey = key;
          state.sortDirection = key === "daysSinceCrossover" ? "asc" : "desc";
        }
        render();
      });
    });
  }

  function init() {
    els.summary = $("#scannerSummary");
    els.resultsGrid = $("#resultsGrid");
    els.nearGrid = $("#nearGrid");
    els.failedList = $("#failedList");
    els.tableBody = $("#scannerTableBody");
    els.ageFilters = $("#ageFilters");
    els.marketFilters = $("#marketFilters");
    els.smaFilters = $("#smaFilters");
    els.volumeFilters = $("#volumeFilters");
    els.liquidityFilters = $("#liquidityFilters");
    els.requireVolume = $("#requireVolumeConfirmation");
    els.search = $("#scannerSearch");
    els.scanButton = $("#scanButton");
    els.retryButton = $("#retryScanButton");
    els.progress = $("#scanProgress");
    els.progressText = $("#scanProgressText");
    els.universe = $("#scanUniverse");
    els.customSymbols = $("#customSymbols");
    els.customSymbolsWrap = $("#customSymbolsWrap");
    els.currentUniverseLabel = $("#currentUniverseLabel");
    els.currentUniverseTitle = $("#currentUniverseTitle");
    els.resultsCount = $("#resultsCount");
    els.nearCount = $("#nearCount");
    els.failedCount = $("#failedCount");
    readSnapshotScanner();
    bindEvents();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
