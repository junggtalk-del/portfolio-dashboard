(function () {
  "use strict";

  const grid = document.querySelector("#signalHotGrid");
  const statusEl = document.querySelector("#signalHotStatus");
  const summaryEl = document.querySelector("#signalHotSummary");
  const refreshBtn = document.querySelector("#signalHotRefresh");
  const tabsEl = document.querySelector("#signalHotTabs");

  let selectedUniverse = "ALL";
  let busy = false;
  const resultsCache = {}; // universe key -> array of result items

  function universesFor(selection) {
    return selection === "ALL" ? ["SET100", "NASDAQ100"] : [selection];
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function fmt(value, digits = 2) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("en-US", { maximumFractionDigits: digits }) : "-";
  }

  function signedPct(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
  }

  function isUs(item) {
    return item.market === "NASDAQ" || item.currency === "USD";
  }

  function priceText(item) {
    const symbol = isUs(item) ? "$" : "฿";
    return `${symbol}${fmt(item.close)}`;
  }

  // "Hotness": volume-confirmed first, then freshest crossover, then above SMA200.
  function hotScore(item) {
    let score = 0;
    const ratio = Number(item.latestVolumeRatio);
    if (Number.isFinite(ratio)) score += Math.min(ratio, 4) * 10;
    const days = Number(item.daysSinceCrossover);
    if (Number.isFinite(days)) score += Math.max(0, 4 - days) * 5;
    if (item.sma200Status === "ABOVE_SMA200") score += 8;
    return score;
  }

  function cardHtml(item) {
    const ratio = Number(item.latestVolumeRatio);
    const volClass = Number.isFinite(ratio) && ratio >= 1 ? "is-strong" : "is-weak";
    const volLabel = item.volumeConfirmationThai || "ไม่มีข้อมูลวอลุ่ม";
    const ratioText = Number.isFinite(ratio) ? ` (${fmt(ratio)}x)` : "";
    const days = Number(item.daysSinceCrossover);
    const daysText = Number.isFinite(days) ? `${days} วันก่อน` : "-";
    const flag = isUs(item) ? "🇺🇸" : "🇹🇭";
    const ts = window.Scoring ? window.Scoring.calculateTimingScore(window.Scoring.fromScannerItem(item)) : null;
    const tsChip = ts ? window.Scoring.renderTimingChip(ts) : "";
    return `
      <article class="signal-card">
        <div class="signal-card-head">
          <div>
            <strong class="signal-symbol"><a href="/asset/${encodeURIComponent(item.providerSymbol || item.canonicalSymbol || item.symbol || item.displaySymbol || "")}" class="asset-link">${escapeHtml(item.displaySymbol || item.symbol || "")}</a><span class="signal-market">${flag}</span></strong>
            <span class="signal-name">${escapeHtml(item.name || "")}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
            <span class="signal-badge">🔼 ${escapeHtml(item.signalThai || "EMA ตัดขึ้น")}</span>
            ${tsChip}
          </div>
        </div>
        <div class="signal-metrics">
          <div><span>ราคา</span><strong>${priceText(item)}</strong></div>
          <div><span>เปลี่ยนวันนี้</span><strong>${signedPct(item.dailyReturnPct)}</strong></div>
          <div><span>ตัดขึ้นเมื่อ</span><strong>${daysText}</strong></div>
          <div><span>vs SMA200</span><strong>${signedPct(item.distanceToSma200Pct)}</strong></div>
        </div>
        <div class="signal-vol ${volClass}">วอลุ่ม: ${escapeHtml(volLabel)}${ratioText}</div>
        <p class="signal-action">${escapeHtml(item.action || "")}</p>
      </article>`;
  }

  function combinedSelectedResults() {
    const list = [];
    for (const universe of universesFor(selectedUniverse)) {
      if (Array.isArray(resultsCache[universe])) list.push(...resultsCache[universe]);
    }
    return list;
  }

  function renderSelected(isScanning) {
    const results = combinedSelectedResults();
    if (!results.length) {
      grid.innerHTML = `<div class="signal-empty">${isScanning ? "กำลังสแกน..." : "ยังไม่พบหุ้นที่ EMA ตัดขึ้นในรอบนี้"}</div>`;
      return;
    }
    const sorted = [...results].sort((a, b) => hotScore(b) - hotScore(a));
    grid.innerHTML = sorted.map(cardHtml).join("");
  }

  async function scanUniverse(universe, forceRefresh) {
    const results = [];
    let offset = 0;
    let total = 0;
    let scanned = 0;
    let guard = 0;
    while (guard < 30) {
      guard += 1;
      const params = new URLSearchParams({ universe, offset: String(offset), limit: "20" });
      if (forceRefresh) params.set("refresh", "1");
      const response = await fetch(`/api/thai-stock-scanner?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `สแกนไม่สำเร็จ (${response.status})`);
      }
      const data = await response.json();
      total = data.total || total;
      scanned += data.scanned || 0;
      (data.results || []).forEach((row) => results.push(row));
      resultsCache[universe] = results.slice();
      statusEl.textContent = `กำลังสแกน ${universe}: ${scanned}/${total} • พบ ${combinedSelectedResults().length} รายการ`;
      renderSelected(true);
      if (data.done || data.nextOffset == null) break;
      offset = data.nextOffset;
    }
    resultsCache[universe] = results;
    return results;
  }

  async function scanAll(forceRefresh) {
    if (busy) return;
    busy = true;
    refreshBtn.disabled = true;
    summaryEl.textContent = "";
    renderSelected(true);
    try {
      for (const universe of universesFor(selectedUniverse)) {
        if (!forceRefresh && Array.isArray(resultsCache[universe])) continue;
        await scanUniverse(universe, forceRefresh);
      }
      renderSelected(false);
      const found = combinedSelectedResults().length;
      statusEl.textContent = found ? `พบ ${found} หุ้นที่ EMA12 ตัดขึ้น EMA26` : "ไม่พบสัญญาณในรอบนี้";
      summaryEl.textContent = `ตลาด: ${selectedUniverse === "ALL" ? "SET100 + NASDAQ" : selectedUniverse}`;
    } catch (error) {
      statusEl.textContent = `เกิดข้อผิดพลาด: ${error.message || error}`;
    } finally {
      busy = false;
      refreshBtn.disabled = false;
    }
  }

  tabsEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-universe]");
    if (!button || busy) return;
    selectedUniverse = button.dataset.universe;
    tabsEl.querySelectorAll("[data-universe]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    scanAll(false);
  });

  refreshBtn.addEventListener("click", () => scanAll(true));
  scanAll(false);
})();
