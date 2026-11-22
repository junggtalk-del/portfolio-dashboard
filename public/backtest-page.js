(function () {
  const DEFAULT_SYMBOLS = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
    { symbol: "QQQ", name: "Invesco QQQ Trust" },
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "META", name: "Meta Platforms, Inc." },
    { symbol: "AMZN", name: "Amazon.com, Inc." },
    { symbol: "TSLA", name: "Tesla, Inc." },
    { symbol: "AVGO", name: "Broadcom Inc." },
    { symbol: "AMD", name: "Advanced Micro Devices, Inc." }
  ];
  const UNIVERSE_SYMBOLS = DEFAULT_SYMBOLS.map((item) => item.symbol);
  const STRATEGIES = [
    { id: "ema_trend_rsi_filter", name: "EMA Trend + RSI Filter" },
    { id: "rsi_pullback_recovery", name: "RSI Pullback Recovery" }
  ];

  const symbolSelect = document.querySelector("#symbolSelect");
  const strategySelect = document.querySelector("#strategySelect");
  const startDateInput = document.querySelector("#startDateInput");
  const endDateInput = document.querySelector("#endDateInput");
  const capitalInput = document.querySelector("#capitalInput");
  const slippageInput = document.querySelector("#slippageInput");
  const commissionInput = document.querySelector("#commissionInput");
  const runButton = document.querySelector("#runBacktestButton");
  const runUniverseButton = document.querySelector("#runUniverseButton");
  const exportRankingButton = document.querySelector("#exportRankingButton");
  const exportTradesButton = document.querySelector("#exportTradesButton");
  const exportEquityButton = document.querySelector("#exportEquityButton");
  const setupStatus = document.querySelector("#setupStatus");
  const resultSubtitle = document.querySelector("#resultSubtitle");
  const summaryCards = document.querySelector("#summaryCards");
  const periodCards = document.querySelector("#periodCards");
  const rankingRows = document.querySelector("#rankingRows");
  const tradeRows = document.querySelector("#tradeRows");
  const tradesSubtitle = document.querySelector("#tradesSubtitle");
  const equityCanvas = document.querySelector("#equityCanvas");
  const drawdownCanvas = document.querySelector("#drawdownCanvas");

  let lastPayload = null;
  let selectedResult = null;
  let isRunning = false;

  // ---- การ์ดแก้ว (glass-cards.css) — โค้ดใหม่เป็น ES5 ----
  // สีการ์ด = สถานะที่หน้าคำนวณอยู่แล้ว (คลาสเดิม good / warn / bad ของการ์ดตัวเลข) · ไม่มีสถานะ → gc-neutral
  var GC_TONE = { good: "gc-calm", warn: "gc-warning", bad: "gc-danger" };
  function gcTone(status) {
    return Object.prototype.hasOwnProperty.call(GC_TONE, status) ? GC_TONE[status] : "gc-neutral";
  }
  // การ์ดช่วงเวลา: overfit ที่หน้าติด is-warning ไว้มาก่อน · ช่วงที่ไม่มีเทรด (0 หรือไม่มีค่า — การ์ดแสดง "Trades: 0"
  // เช่นช่วงที่ไม่มีแท่งราคาเลย engine คืน 0%) หรือผลตอบแทนไม่มี/ไม่ใช่ตัวเลขจำกัด → ไม่มีสถานะ ·
  // ไม่งั้นกำไร/ขาดทุนของช่วงนั้นด้วยกติกาเดียวกับการ์ด "ผลตอบแทนรวม" (≥ 0 good · < 0 bad)
  function periodStatus(isWarning, totalReturnPct, tradeCount) {
    if (isWarning) return "warn";
    if (!(Number(tradeCount) > 0)) return "";
    if (totalReturnPct == null || totalReturnPct === "") return "";
    var value = Number(totalReturnPct);
    if (!isFinite(value)) return "";
    return value >= 0 ? "good" : "bad";
  }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // กราฟวางบนการ์ดแก้ว: ไม่ทาพื้นขาว · เส้นตาราง/ตัวหนังสือเป็นขาวโปร่ง (สีเส้นข้อมูลมาจาก renderCharts)
  var CHART_GRID = "rgba(255, 255, 255, 0.12)";
  var CHART_INK = "rgba(245, 245, 250, 0.8)";

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(Number(value))) return "-";
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatPct(value) {
    if (!Number.isFinite(Number(value))) return "-";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${formatNumber(number, 2)}%`;
  }

  function selectedOptions(select) {
    return [...select.selectedOptions].map((option) => option.value);
  }

  function setLoading(nextIsRunning, message) {
    isRunning = nextIsRunning;
    runButton.disabled = nextIsRunning;
    runUniverseButton.disabled = nextIsRunning;
    if (message) setupStatus.textContent = message;
  }

  function setExportEnabled(enabled) {
    exportRankingButton.disabled = !enabled;
    exportTradesButton.disabled = !enabled;
    exportEquityButton.disabled = !enabled;
  }

  function initControls() {
    symbolSelect.innerHTML = DEFAULT_SYMBOLS.map(
      (item, index) => `<option value="${item.symbol}" ${index < 2 ? "selected" : ""}>${item.symbol} - ${item.name}</option>`
    ).join("");
    strategySelect.innerHTML = STRATEGIES.map(
      (strategy) => `<option value="${strategy.id}" selected>${strategy.name}</option>`
    ).join("");
    endDateInput.value = new Date().toISOString().slice(0, 10);
  }

  function metricCard(label, value, note, tone) {
    return `
      <article class="metric-card ${tone || ""} gc-card gc-tile ${gcTone(tone)}">
        <span>${esc(label)}</span>
        <strong class="gc-num">${esc(value)}</strong>
        <small>${esc(note || "")}</small>
      </article>
    `;
  }

  function renderSummary(result) {
    if (!result) {
      summaryCards.innerHTML = `<div class="empty-box gc-card gc-neutral">ยังไม่มีผลลัพธ์</div>`;
      periodCards.innerHTML = "";
      return;
    }

    const metrics = result.metrics || {};
    resultSubtitle.textContent = `${result.symbol} · ${result.strategyName} · ${result.marketData?.source || "Market data"}`;
    summaryCards.innerHTML = [
      metricCard("ผลตอบแทนรวม", formatPct(metrics.totalReturnPct), `Net profit ${formatNumber(metrics.netProfit)}`, metrics.totalReturnPct >= 0 ? "good" : "bad"),
      metricCard("อัตราชนะ", formatPct(metrics.winRate), `${metrics.tradeCount || 0} trades`),
      metricCard("Profit Factor", metrics.profitFactor === null ? "∞" : formatNumber(metrics.profitFactor), "กำไรขั้นต้น / ขาดทุนขั้นต้น", metrics.profitFactor > 1.3 || metrics.profitFactor === null ? "good" : "warn"),
      metricCard("Max Drawdown", formatPct(metrics.maxDrawdown), "จุดลดลงสูงสุด", metrics.maxDrawdown < -25 ? "bad" : "warn"),
      metricCard("จำนวนครั้งที่เทรด", String(metrics.tradeCount || 0), `Avg hold ${formatNumber(metrics.averageHoldingPeriod, 1)} days`),
      metricCard("คะแนนกลยุทธ์", String(result.strategyScore || 0), result.verdict || "", result.strategyScore >= 70 ? "good" : "warn")
    ].join("");

    const periodEntries = [
      ["in_sample", "In-sample"],
      ["out_of_sample", "Out-of-sample"],
      ["recent", "Recent test"]
    ];
    periodCards.innerHTML = periodEntries.map(([key, label]) => {
      const period = result.periodResults?.[key];
      const m = period?.metrics || {};
      var isWarning = Boolean(result.overfitWarning && key === "out_of_sample");
      return `
        <article class="period-card ${isWarning ? "is-warning" : ""} gc-card gc-tile ${gcTone(periodStatus(isWarning, m.totalReturnPct, m.tradeCount))}">
          <strong>${label}</strong>
          <p>Total return: ${formatPct(m.totalReturnPct)}</p>
          <p>Win rate: ${formatPct(m.winRate)} · Trades: ${esc(m.tradeCount || 0)}</p>
          <p>PF: ${m.profitFactor === null ? "∞" : formatNumber(m.profitFactor)}</p>
        </article>
      `;
    }).join("");
    if (result.overfitWarning) {
      periodCards.insertAdjacentHTML(
        "beforeend",
        `<article class="period-card is-warning gc-card gc-tile gc-warning"><strong>Overfit warning</strong><p>กลยุทธ์นี้อาจ overfit เพราะผลลัพธ์ดีเฉพาะช่วงพัฒนา แต่ไม่ดีในช่วงทดสอบจริง</p></article>`
      );
    }
  }

  function renderRanking(payload) {
    const ranking = payload?.ranking || [];
    if (!ranking.length) {
      rankingRows.innerHTML = `<tr><td colspan="14">ยังไม่มี ranking</td></tr>`;
      return;
    }
    rankingRows.innerHTML = ranking.map((result, index) => {
      const metrics = result.metrics || {};
      const inSample = result.periodResults?.in_sample?.metrics || {};
      const outSample = result.periodResults?.out_of_sample?.metrics || {};
      const recent = result.periodResults?.recent?.metrics || {};
      return `
        <tr class="${selectedResult === result ? "is-selected" : ""}" data-rank-index="${index}">
          <td><button class="ranking-button" type="button" data-rank-index="${index}">${esc(result.symbol)}</button></td>
          <td>${esc(result.strategyName)}</td>
          <td class="gc-cell-num">${formatPct(metrics.totalReturnPct)}</td>
          <td class="gc-cell-num">${formatPct(inSample.totalReturnPct)}</td>
          <td class="gc-cell-num">${formatPct(outSample.totalReturnPct)}</td>
          <td class="gc-cell-num">${formatPct(recent.totalReturnPct)}</td>
          <td class="gc-cell-num">${formatPct(metrics.winRate)}</td>
          <td class="gc-cell-num">${metrics.profitFactor === null ? "∞" : formatNumber(metrics.profitFactor)}</td>
          <td class="gc-cell-num">${formatPct(metrics.maxDrawdown)}</td>
          <td class="gc-cell-num">${formatNumber(metrics.expectancy)}</td>
          <td class="gc-cell-num">${esc(metrics.tradeCount || 0)}</td>
          <td class="gc-cell-num">${esc(result.strategyScore || 0)}</td>
          <td>${esc(result.verdict || "-")}</td>
          <td>${result.overfitWarning ? "อาจ overfit" : "-"}</td>
        </tr>
      `;
    }).join("");
  }

  function renderTrades(result) {
    const trades = result?.trades || [];
    tradesSubtitle.textContent = result ? `${result.symbol} · ${result.strategyName}` : "แสดงรายการซื้อขายของผลลัพธ์ที่เลือกจาก ranking";
    if (!trades.length) {
      tradeRows.innerHTML = `<tr><td colspan="9">ไม่มีรายการซื้อขาย</td></tr>`;
      return;
    }
    tradeRows.innerHTML = trades.map((trade) => `
      <tr>
        <td>${esc(trade.entryDate)}</td>
        <td>${esc(trade.exitDate)}</td>
        <td class="gc-cell-num">${formatNumber(trade.entryPrice, 4)}</td>
        <td class="gc-cell-num">${formatNumber(trade.exitPrice, 4)}</td>
        <td class="gc-cell-num">${formatNumber(trade.shares, 4)}</td>
        <td class="gc-cell-num">${formatNumber(trade.pnl)}</td>
        <td class="gc-cell-num">${formatPct(trade.pnlPct)}</td>
        <td>${esc(trade.exitReason || "-")}</td>
        <td class="gc-cell-num">${esc(trade.holdingDays || 0)}</td>
      </tr>
    `).join("");
  }

  function drawLineChart(canvas, points, valueKey, color, fillColor, zeroLine) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const values = (points || []).map((point) => Number(point[valueKey])).filter(Number.isFinite);
    if (values.length < 2) {
      ctx.fillStyle = CHART_INK;
      ctx.font = "16px Inter, 'Noto Sans Thai', sans-serif";
      ctx.fillText("No chart data", 24, 42);
      return;
    }
    const padding = { left: 54, right: 18, top: 22, bottom: 34 };
    const min = Math.min(...values, zeroLine ? 0 : Infinity);
    const max = Math.max(...values, zeroLine ? 0 : -Infinity);
    const span = max - min || 1;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const xFor = (index) => padding.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const yFor = (value) => padding.top + (1 - (value - min) / span) * chartHeight;

    ctx.strokeStyle = CHART_GRID;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(Number(point[valueKey]));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.fillStyle = CHART_INK;
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(formatNumber(max, 2), 10, padding.top + 4);
    ctx.fillText(formatNumber(min, 2), 10, height - padding.bottom);
  }

  function renderCharts(result) {
    // equity = เส้นเดียว สีเดิม (teal) ไม่มีความหมาย → ขาวแบบ Macro · drawdown แดง = ขาดทุนจากจุดสูงสุด (มีความหมาย) → คงเดิม
    drawLineChart(equityCanvas, result?.equityCurve || [], "equity", "#ffffff", "rgba(255,255,255,0.08)", false);
    drawLineChart(drawdownCanvas, result?.drawdownCurve || [], "drawdown", "#c2413a", "rgba(194,65,58,0.09)", true);
  }

  function selectResultByRankingIndex(index) {
    selectedResult = lastPayload?.ranking?.[index] || lastPayload?.ranking?.[0] || null;
    renderSummary(selectedResult);
    renderTrades(selectedResult);
    renderCharts(selectedResult);
    renderRanking(lastPayload);
  }

  async function runBacktest(options = {}) {
    if (isRunning) return;
    const symbols = options.universe ? UNIVERSE_SYMBOLS : selectedOptions(symbolSelect);
    const strategies = options.universe ? STRATEGIES.map((strategy) => strategy.id) : selectedOptions(strategySelect);
    if (!symbols.length || !strategies.length) {
      setupStatus.textContent = "เลือกอย่างน้อย 1 ticker และ 1 strategy ก่อน";
      return;
    }

    setLoading(
      true,
      options.universe
        ? `กำลังรัน Universe Backtest ${symbols.length} symbols x ${strategies.length} strategies...`
        : "กำลังดึงข้อมูลราคาและรัน backtest..."
    );
    setExportEnabled(false);
    summaryCards.innerHTML = `<div class="empty-box gc-card gc-neutral">กำลังคำนวณ...</div>`;
    rankingRows.innerHTML = `<tr><td colspan="14">กำลังรัน backtest...</td></tr>`;

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbols,
          strategies,
          startDate: startDateInput.value,
          endDate: endDateInput.value,
          initialCapital: Number(capitalInput.value || 10000),
          slippagePct: Number(slippageInput.value || 0.1),
          commission: Number(commissionInput.value || 0)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Backtest failed");
      lastPayload = payload;
      selectedResult = payload.ranking?.[0] || null;
      renderRanking(payload);
      renderSummary(selectedResult);
      renderTrades(selectedResult);
      renderCharts(selectedResult);
      setupStatus.textContent = payload.errors?.length
        ? `เสร็จแล้ว แต่มีบาง ticker โหลดไม่ได้: ${payload.errors.map((item) => item.symbol).join(", ")}`
        : `เสร็จแล้ว ${payload.results.length} result · ${payload.generatedAt}`;
      setExportEnabled(Boolean(payload.ranking?.length));
    } catch (error) {
      setupStatus.textContent = String(error.message || error);
      summaryCards.innerHTML = `<div class="empty-box gc-card gc-neutral">Backtest failed: ${esc(String(error.message || error))}</div>`;
      rankingRows.innerHTML = `<tr><td colspan="14">Backtest failed</td></tr>`;
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv(filename, headers, rows) {
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportRankingCsv() {
    if (!lastPayload?.ranking?.length) return;
    const headers = [
      "Symbol",
      "Strategy",
      "Full Return %",
      "In-sample Return %",
      "Out-of-sample Return %",
      "Recent Return %",
      "Win Rate %",
      "Profit Factor",
      "Max Drawdown %",
      "Expectancy",
      "Trade Count",
      "Strategy Score",
      "Verdict",
      "Overfit Warning"
    ];
    const rows = lastPayload.ranking.map((result) => {
      const metrics = result.metrics || {};
      const inSample = result.periodResults?.in_sample?.metrics || {};
      const outSample = result.periodResults?.out_of_sample?.metrics || {};
      const recent = result.periodResults?.recent?.metrics || {};
      return [
        result.symbol,
        result.strategyName,
        metrics.totalReturnPct,
        inSample.totalReturnPct,
        outSample.totalReturnPct,
        recent.totalReturnPct,
        metrics.winRate,
        metrics.profitFactor === null ? "Infinity" : metrics.profitFactor,
        metrics.maxDrawdown,
        metrics.expectancy,
        metrics.tradeCount,
        result.strategyScore,
        result.verdict,
        result.overfitWarning ? "Possible overfit" : ""
      ];
    });
    downloadCsv(`backtest-ranking-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportTradesCsv() {
    if (!lastPayload?.ranking?.length) return;
    const headers = ["Symbol", "Strategy", "Entry Date", "Exit Date", "Entry Price", "Exit Price", "Shares", "P/L", "P/L %", "Reason", "Holding Days"];
    const rows = [];
    for (const result of lastPayload.ranking) {
      for (const trade of result.trades || []) {
        rows.push([
          result.symbol,
          result.strategyName,
          trade.entryDate,
          trade.exitDate,
          trade.entryPrice,
          trade.exitPrice,
          trade.shares,
          trade.pnl,
          trade.pnlPct,
          trade.exitReason,
          trade.holdingDays
        ]);
      }
    }
    downloadCsv(`backtest-trades-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function exportEquityCsv() {
    if (!lastPayload?.ranking?.length) return;
    const headers = ["Symbol", "Strategy", "Date", "Equity", "Drawdown %"];
    const rows = [];
    for (const result of lastPayload.ranking) {
      const drawdownByDate = new Map((result.drawdownCurve || []).map((point) => [point.date, point.drawdown]));
      for (const point of result.equityCurve || []) {
        rows.push([result.symbol, result.strategyName, point.date, point.equity, drawdownByDate.get(point.date)]);
      }
    }
    downloadCsv(`backtest-equity-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function bindEvents() {
    runButton.addEventListener("click", () => runBacktest());
    runUniverseButton.addEventListener("click", () => runBacktest({ universe: true }));
    exportRankingButton.addEventListener("click", exportRankingCsv);
    exportTradesButton.addEventListener("click", exportTradesCsv);
    exportEquityButton.addEventListener("click", exportEquityCsv);
    rankingRows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-rank-index]");
      if (!button) return;
      selectResultByRankingIndex(Number(button.dataset.rankIndex));
    });
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        document.querySelector(`#${button.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  initControls();
  bindEvents();
  renderCharts(null);
})();
