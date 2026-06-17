(function () {
  const core = window.PortfolioCore;
  const technical = window.AITechnicalIndicators;
  const statusText = document.querySelector("#statusText");
  const cardsRoot = document.querySelector("#statusCards");
  const summaryRoot = document.querySelector("#healthSummary");
  const rowsRoot = document.querySelector("#holdingSignalRows");
  const refreshButton = document.querySelector("#refreshStatusButton");

  function yahooSymbol(symbol) {
    if (symbol === "BTCUSD") return "BTC-USD";
    return symbol;
  }

  async function fetchHistory(symbol) {
    try {
      const response = await fetch(`/api/market-data?symbol=${encodeURIComponent(yahooSymbol(symbol))}`, { cache: "no-store" });
      if (!response.ok) throw new Error("market data failed");
      const payload = await response.json();
      return {
        dates: Array.isArray(payload.dates) ? payload.dates : [],
        closes: Array.isArray(payload.closes) ? payload.closes : []
      };
    } catch (_error) {
      return { dates: [], closes: [] };
    }
  }

  function calculateRSI(closes, period = 14) {
    const clean = closes.map(Number).filter(Number.isFinite);
    if (clean.length < period + 1) return null;
    let gainSum = 0;
    let lossSum = 0;
    for (let index = 1; index <= period; index += 1) {
      const change = clean[index] - clean[index - 1];
      if (change >= 0) gainSum += change;
      else lossSum += Math.abs(change);
    }
    let averageGain = gainSum / period;
    let averageLoss = lossSum / period;
    for (let index = period + 1; index < clean.length; index += 1) {
      const change = clean[index] - clean[index - 1];
      averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
      averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    }
    if (averageLoss === 0 && averageGain > 0) return 100;
    if (averageGain === 0 && averageLoss > 0) return 0;
    return 100 - (100 / (1 + (averageGain / averageLoss)));
  }

  function classifyTrend(info) {
    if (info.ema.signal === "BUY" || info.sma200.signal === "BULLISH_BREAKOUT") return "bullish";
    if (info.ema.signal === "SELL" || info.sma200.signal === "BEARISH_BREAKDOWN") return "bearish";
    const emaBull = info.ema.trend === "BULLISH";
    const emaBear = info.ema.trend === "BEARISH";
    const above = info.sma200.status === "ABOVE_SMA200";
    const below = info.sma200.status === "BELOW_SMA200";
    if (emaBull || above) return "bullish";
    if (emaBear || below) return "bearish";
    return "neutral";
  }

  function classifyRsi(rsi) {
    if (!Number.isFinite(rsi)) return "insufficient";
    if (rsi <= 35) return "buy";
    if (rsi >= 67) return "sell";
    return "neutral";
  }

  async function analyzeHolding(holding, totalValue) {
    const history = await fetchHistory(holding.canonicalSymbol);
    const info = technical.calculateTechnicalSignalsForAsset({
      symbol: holding.canonicalSymbol,
      closes: history.closes,
      dates: history.dates
    });
    const rsi = calculateRSI(history.closes);
    return {
      holding,
      trend: classifyTrend(info),
      rsiState: classifyRsi(rsi),
      rsi,
      tags: core.exposureTagsForSymbol(holding.canonicalSymbol, holding.assetType),
      weight: totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0
    };
  }

  function sumBy(rows, predicate) {
    return rows.filter(predicate).reduce((sum, row) => sum + (Number(row.holding.marketValue) || 0), 0);
  }

  function pct(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
  }

  async function loadStatus() {
    statusText.textContent = "กำลังโหลด holdings...";
    const { holdings } = await core.loadHoldings();
    const realHoldings = holdings.filter((holding) => holding.isHolding);
    const watchCount = holdings.length - realHoldings.length;
    const total = core.totalMarketValue(realHoldings);
    statusText.textContent = `กำลังคำนวณสัญญาณสำหรับ ${realHoldings.length} holdings...`;
    const rows = await Promise.all(realHoldings.map((holding) => analyzeHolding(holding, total)));
    render(rows, total, watchCount);
    statusText.textContent = `Portfolio Status พร้อมแล้ว ${realHoldings.length} holdings`;
  }

  function render(rows, total, watchCount) {
    const bullish = pct(sumBy(rows, (row) => row.trend === "bullish"), total);
    const bearish = pct(sumBy(rows, (row) => row.trend === "bearish"), total);
    const neutral = pct(sumBy(rows, (row) => row.trend === "neutral"), total);
    const rsiBuy = pct(sumBy(rows, (row) => row.rsiState === "buy"), total);
    const rsiSell = pct(sumBy(rows, (row) => row.rsiState === "sell"), total);
    const techAi = pct(sumBy(rows, (row) => row.tags.some((tag) => ["AI", "Semiconductor", "Big Tech", "Global Tech"].includes(tag))), total);
    const nasdaq = pct(sumBy(rows, (row) => row.tags.includes("Nasdaq-100")), total);

    cardsRoot.innerHTML = [
      metric("Total Portfolio Value", formatMoney(total)),
      metric("Bullish Exposure %", `${bullish.toFixed(1)}%`),
      metric("Bearish Exposure %", `${bearish.toFixed(1)}%`),
      metric("Neutral Exposure %", `${neutral.toFixed(1)}%`),
      metric("RSI Buy Exposure %", `${rsiBuy.toFixed(1)}%`),
      metric("RSI Sell Exposure %", `${rsiSell.toFixed(1)}%`),
      metric("Tech / AI Exposure %", `${techAi.toFixed(1)}%`),
      metric("Nasdaq Exposure %", `${nasdaq.toFixed(1)}%`),
      metric("Watchlist Only Count", String(watchCount))
    ].join("");

    summaryRoot.textContent = buildSummary(total, bullish, rsiSell, techAi);
    rowsRoot.innerHTML = rows.length ? rows
      .sort((a, b) => b.holding.marketValue - a.holding.marketValue)
      .map(renderHoldingCard)
      .join("") : '<div class="empty-box">ยังไม่มี real holdings กรุณาเพิ่มในหน้า Portfolio Holdings</div>';
  }

  function buildSummary(total, bullish, rsiSell, techAi) {
    if (!total) return "ยังไม่มีข้อมูล Holding จริง จึงยังสรุป portfolio health ไม่ได้";
    const parts = [`พอร์ตจริงตอนนี้มีมูลค่า ${formatMoney(total)} โดย ${bullish.toFixed(0)}% อยู่ในสินทรัพย์ที่เป็นขาขึ้นหรือเริ่มฟื้น`];
    if (rsiSell > 0) parts.push(`มี ${rsiSell.toFixed(0)}% ของพอร์ตที่ RSI เข้าโซนเฝ้าระวังขาย`);
    if (techAi > 50) parts.push(`และมี exposure ต่อหุ้นเทค/AI สูงกว่า 50% จึงควรถือได้แต่ไม่ควรไล่ราคา`);
    return `${parts.join(" ")}.`;
  }

  function metric(label, value) {
    return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function renderHoldingCard(row) {
    const tone = row.trend === "bullish" ? "green" : row.trend === "bearish" ? "red" : "gray";
    const rsiTone = row.rsiState === "buy" ? "green" : row.rsiState === "sell" ? "amber" : "gray";
    return `
      <article class="holding-card">
        <h3>${escapeHtml(row.holding.displaySymbol)}</h3>
        <p>${escapeHtml(row.holding.assetName)}</p>
        <div class="badge-row">
          <span class="badge ${tone}">${escapeHtml(row.trend)}</span>
          <span class="badge ${rsiTone}">RSI ${escapeHtml(row.rsiState)}</span>
          <span class="badge gray">${row.weight.toFixed(1)}% of portfolio</span>
        </div>
        <p>Market value: ${formatMoney(row.holding.marketValue)} ${escapeHtml(row.holding.currency)}</p>
      </article>`;
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
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

  refreshButton.addEventListener("click", loadStatus);
  loadStatus().catch((error) => {
    statusText.textContent = error?.message || "โหลด Portfolio Status ไม่สำเร็จ";
  });
})();
