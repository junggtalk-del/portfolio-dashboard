(function () {
  const seed = window.AIBoomUniverseSeed || { ai_boom_universe: [] };
  const core = window.PortfolioCore || {};
  const snapshotApi = window.PortfolioDataSnapshot || {};

  const SECTION_DEFS = [
    {
      key: "urgent",
      title: "Urgent Portfolio Actions",
      thai: "สิ่งที่ควรดูด่วนในพอร์ต",
      description: "ถือจริงและเริ่มมีสัญญาณเสี่ยง หรือมีผลต่อพอร์ตมาก",
      empty: "ยังไม่มีสิ่งที่ต้องดูด่วนในพอร์ต",
      tone: "decision-urgent"
    },
    {
      key: "buy",
      title: "Buy / Add Opportunities",
      thai: "โอกาสทยอยซื้อ / เพิ่ม",
      description: "สัญญาณฝั่งบวกที่ผ่านตัวกรอง trend, RSI, volume และ market risk",
      empty: "ยังไม่มีโอกาสเพิ่มที่ชัดเจน",
      tone: "decision-buy"
    },
    {
      key: "watch",
      title: "Watch Closely",
      thai: "เฝ้าดูใกล้ชิด",
      description: "สัญญาณผสม ใกล้ trigger หรือควรรอ confirmation ก่อนลงมือ",
      empty: "ยังไม่มีรายการที่ต้องเฝ้าดูใกล้ชิด",
      tone: "decision-watch"
    },
    {
      key: "none",
      title: "No Action / Information",
      thai: "ยังไม่ต้องทำอะไร",
      description: "ถือดูข้อมูล หรือยังไม่มีสัญญาณที่ต้องตัดสินใจ",
      empty: "ยังไม่มีรายการ No Action",
      tone: "decision-none"
    }
  ];

  const SUMMARY_DEFS = [
    ["urgent", "Urgent Actions", "ต้องดูด่วน"],
    ["buy", "Buy Opportunities", "โอกาสเพิ่ม"],
    ["watch", "Watch Closely", "เฝ้าดู"],
    ["none", "No Action", "ยังไม่ต้องทำอะไร"],
    ["conflicts", "Conflicts", "สัญญาณขัดแย้ง"],
    ["high", "High Confidence", "ความมั่นใจสูง"]
  ];

  const FILTERS = {
    portfolio: [
      ["all", "All"],
      ["holdings", "Holdings only"],
      ["watchlist", "Watchlist only"]
    ],
    action: [
      ["all", "All"],
      ["buy", "Buy / Add"],
      ["watch", "Watch"],
      ["review", "Review / Trim"],
      ["none", "No Action"]
    ],
    confidence: [
      ["all", "All"],
      ["high", "High conviction only"],
      ["good", "Good setup and above"],
      ["mixed", "Mixed only"]
    ],
    conflict: [
      ["all", "All"],
      ["only", "Show conflicts only"],
      ["hide", "Hide conflicts"]
    ],
    market: [
      ["all", "All"],
      ["us", "US"],
      ["thai", "Thai"],
      ["crypto", "Crypto"],
      ["fund", "RMF / Fund"]
    ]
  };

  const actionStatus = document.querySelector("#actionStatus");
  const marketRiskText = document.querySelector("#marketRiskText");
  const summaryRoot = document.querySelector("#actionSummaryCards");
  const filtersRoot = document.querySelector("#actionFilters");
  const sectionsRoot = document.querySelector("#actionSections");
  const refreshButton = document.querySelector("#refreshActionButton");

  const state = {
    rows: [],
    filters: {
      portfolio: "all",
      action: "all",
      confidence: "all",
      conflict: "all",
      market: "all"
    },
    snapshot: null
  };

  function canonical(raw) {
    if (core.canonicalSymbolFromTicker) return core.canonicalSymbolFromTicker(raw);
    return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  }

  function readSnapshot() {
    const snap = snapshotApi.read?.();
    if (snap) return snap;
    try {
      return JSON.parse(localStorage.getItem("portfolio_dashboard_data_snapshot") || "null");
    } catch (_error) {
      return null;
    }
  }

  function buildAssetMap(snapshot) {
    const map = new Map();
    const seedMeta = new Map();
    (seed.ai_boom_universe || []).forEach((asset) => {
      const key = canonical(asset?.ticker);
      if (key) seedMeta.set(key, asset);
    });
    const addAsset = (asset = {}) => {
      const key = canonical(asset.canonicalSymbol || asset.ticker || asset.symbol || asset.providerSymbol || asset.provider_symbol);
      if (!key) return;
      const previous = map.get(key) || {};
      const seeded = seedMeta.get(key) || {};
      map.set(key, {
        ...previous,
        canonicalSymbol: key,
        displaySymbol: asset.displaySymbol || asset.display_symbol || previous.displaySymbol || displaySymbol(key),
        name: asset.assetName || asset.asset_name || asset.name || previous.name || seeded.name || displaySymbol(key),
        assetType: asset.assetType || asset.asset_type || previous.assetType || seeded.asset_type || core.detectAssetType?.(key) || "",
        providerSymbol: asset.providerSymbol || asset.provider_symbol || previous.providerSymbol || key,
        market: asset.market || previous.market || inferMarket(key),
        currency: asset.currency || previous.currency || (isThai(key) ? "THB" : "USD")
      });
    };

    (snapshot?.assets || []).forEach(addAsset);
    Object.keys(snapshot?.technicalSignals || {}).forEach((symbol) => addAsset({ ticker: symbol }));
    Object.keys(snapshot?.rsiSignals || {}).forEach((symbol) => addAsset({ ticker: symbol }));
    for (const holding of holdingsFromSnapshot(snapshot)) {
      addAsset({
        ticker: holding.canonicalSymbol,
        displaySymbol: holding.displaySymbol,
        assetName: holding.assetName,
        assetType: holding.assetType,
        providerSymbol: holding.providerSymbol,
        currency: holding.currency
      });
    }
    for (const item of scannerItems(snapshot)) {
      addAsset({
        ticker: item.providerSymbol || item.canonicalSymbol || item.displaySymbol,
        displaySymbol: item.displaySymbol,
        assetName: item.name,
        assetType: "THAI_STOCK",
        providerSymbol: item.providerSymbol,
        market: item.market || "SET",
        currency: "THB"
      });
    }
    return map;
  }

  function holdingsFromSnapshot(snapshot) {
    const rows = snapshot?.portfolioHoldings?.data || [];
    return core.dedupeHoldings ? core.dedupeHoldings(rows) : rows;
  }

  function scannerItems(snapshot) {
    const groups = snapshot?.thaiStockScanners || {};
    const rows = [];
    Object.values(groups).forEach((scan) => {
      rows.push(...(scan?.results || []), ...(scan?.near || []));
    });
    return rows;
  }

  function buildRows(snapshot) {
    const assets = buildAssetMap(snapshot);
    const holdings = holdingsFromSnapshot(snapshot);
    const holdingMap = new Map(holdings.map((holding) => [holding.canonicalSymbol, holding]));
    const scannerMap = new Map();
    scannerItems(snapshot).forEach((item) => {
      const key = canonical(item.providerSymbol || item.canonicalSymbol || item.displaySymbol);
      if (key && !scannerMap.has(key)) scannerMap.set(key, item);
    });

    const rows = [];
    for (const [symbol, asset] of assets.entries()) {
      const tech = snapshot?.technicalSignals?.[symbol] || {};
      const rsi = snapshot?.rsiSignals?.[symbol] || {};
      const price = snapshot?.prices?.[symbol] || {};
      const history = snapshot?.historicalData?.[symbol] || {};
      const scanner = scannerMap.get(symbol) || null;
      const holding = holdingMap.get(symbol) || null;
      const exposureInfo = snapshot?.exposureMap?.assetExposures?.[symbol] || {};
      const totalValue = core.totalMarketValue ? core.totalMarketValue(holdings) : holdings.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
      const baseRow = {
        symbol,
        displaySymbol: asset.displaySymbol,
        name: asset.name,
        assetType: asset.assetType,
        market: asset.market,
        currency: asset.currency,
        providerSymbol: asset.providerSymbol,
        latestClose: firstNumber(tech.latestClose, price.latestClose, history.latestClose, scanner?.close),
        latestDate: tech.latestDate || price.latestDate || history.latestDate || scanner?.latestDate || scanner?.date || null,
        source: price.source || history.source || scanner?.source || "Data Snapshot",
        tech,
        rsi,
        scanner,
        exposureTags: exposureInfo.tags || core.exposureTagsForSymbol?.(symbol, asset.assetType) || [],
        holding: holding || null
      };
      const enriched = core.enrichWithHolding ? core.enrichWithHolding(baseRow, holdings, totalValue) : enrichWithHoldingFallback(baseRow, holding, totalValue);
      rows.push(resolveDecision(enriched, snapshot));
    }
    return rows.sort(compareRows);
  }

  function resolveDecision(row, snapshot) {
    const facts = signalFacts(row, snapshot);
    const conflicts = detectConflicts(row, facts);
    let score = scoreDecision(row, facts);
    let action = "avoid";
    let actionThai = "รอก่อน";
    let section = "none";
    let reason = "ยังไม่มีสัญญาณที่ต้องลงมือชัดเจน";

    const holding = Boolean(row.portfolio?.isHolding);
    const highRisk = facts.marketRiskHigh || facts.marketRiskVeryHigh;
    const alignedBullish = facts.newBullish && facts.volumeConfirmed && facts.aboveSma;
    const negativeHolding = holding && (facts.newBearish || facts.rsiSell || facts.rsiWatchSell || (facts.emaBear && facts.belowSma) || (highRisk && facts.weight >= 10));

    if (negativeHolding) {
      section = "urgent";
      action = "review";
      actionThai = "ทบทวน / ลดน้ำหนัก";
      reason = "เป็นสินทรัพย์ที่ถือจริง และเริ่มมีสัญญาณเสี่ยงต่อพอร์ต";
    } else if (conflicts.length) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = conflicts[0].reason;
    } else if ((facts.rsiSell || facts.newBearish) && !holding) {
      section = "watch";
      action = "avoid";
      actionThai = "รอก่อน";
      reason = "มีสัญญาณลบ จึงยังไม่ควรเพิ่มความเสี่ยง";
    } else if (alignedBullish && !highRisk) {
      section = "buy";
      action = holding ? "buy" : "consider";
      actionThai = holding ? "ทยอยซื้อ / เพิ่ม" : "พิจารณาเพิ่ม";
      reason = "EMA ตัดขึ้น พร้อมวอลุ่มยืนยัน และราคาอยู่เหนือ SMA200";
    } else if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish || facts.bullishWatch) && !highRisk) {
      section = holding ? "watch" : "buy";
      action = facts.aboveSma && facts.emaBull ? "consider" : "watch";
      actionThai = action === "consider" ? "พิจารณาเพิ่ม" : "เฝ้าดู";
      reason = holding ? "มีสัญญาณฝั่งบวก แต่ควรรอจุดเพิ่มที่ดีกว่า" : "มี setup น่าสนใจใน watchlist แต่ยังไม่กระทบพอร์ตจริง";
    } else if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish) && highRisk) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = "มีสัญญาณซื้อ แต่ Market Risk สูง จึงลดระดับเป็น Watch";
      score = Math.min(score, 59);
    } else if (holding && facts.emaBull && facts.aboveSma && facts.rsiNeutral) {
      section = "none";
      action = "hold";
      actionThai = "ถือต่อ";
      reason = "แนวโน้มหลักยังดี แต่ยังไม่มีจุด action ใหม่";
    } else if (facts.insufficient) {
      section = "none";
      action = "avoid";
      actionThai = "รอก่อน";
      reason = "ข้อมูลยังไม่พอสำหรับสรุป action";
    } else if (facts.emaBull || facts.aboveSma || facts.emaBear || facts.belowSma) {
      section = "watch";
      action = "watch";
      actionThai = "เฝ้าดู";
      reason = "มีข้อมูล trend บางส่วน แต่สัญญาณยังไม่ครบพอให้ลงมือ";
    }

    const scoreLabel = scoreQuality(score);
    return {
      ...row,
      facts,
      conflicts,
      score,
      scoreLabel,
      decision: {
        action,
        actionThai,
        section,
        reason,
        keySignals: keySignals(facts).slice(0, 3)
      }
    };
  }

  function signalFacts(row, snapshot) {
    const emaStatus = String(row.tech?.emaStatus || "");
    const smaStatus = String(row.tech?.sma200Status || "");
    const rsiSignal = String(row.rsi?.signal || row.tech?.rsiSignal || "");
    const scannerSignal = String(row.scanner?.signal || "");
    const risk = snapshot?.marketRisk?.risk || snapshot?.marketRisk || {};
    const riskLabel = risk?.level?.label || risk?.label || "Unknown";
    const volumeRatio = firstNumber(row.scanner?.volumeRatio, row.scanner?.latestVolumeRatio);
    const weight = Number(row.portfolio?.weight) || 0;
    const concentration = highConcentrationForRow(row, snapshot);

    return {
      emaBull: emaStatus === "EMA_BULLISH" || emaStatus === "BULLISH" || Number(row.tech?.ema12) > Number(row.tech?.ema26),
      emaBear: emaStatus === "EMA_BEARISH" || emaStatus === "BEARISH" || Number(row.tech?.ema12) < Number(row.tech?.ema26),
      aboveSma: smaStatus === "ABOVE_SMA200" || Number(row.latestClose) > Number(row.tech?.sma200),
      belowSma: smaStatus === "BELOW_SMA200" || Number(row.latestClose) < Number(row.tech?.sma200),
      newBullish: scannerSignal === "EMA_BULLISH_CROSS" || row.tech?.ema?.signal === "BUY" || row.tech?.sma200?.signal === "BULLISH_BREAKOUT",
      newBearish: row.tech?.ema?.signal === "SELL" || row.tech?.sma200?.signal === "BEARISH_BREAKDOWN",
      bullishWatch: scannerSignal === "NEAR_EMA_CROSS_UP",
      rsiBuy: rsiSignal === "BUY_SIGNAL",
      rsiWatchBuy: rsiSignal === "WATCH_BUY",
      rsiSell: rsiSignal === "SELL_SIGNAL",
      rsiWatchSell: rsiSignal === "WATCH_SELL",
      rsiNeutral: rsiSignal === "NEUTRAL",
      volumeConfirmed: Number.isFinite(volumeRatio) && volumeRatio >= 1,
      strongVolume: Number.isFinite(volumeRatio) && volumeRatio >= 1.5,
      volumeNotConfirmed: Number.isFinite(volumeRatio) && volumeRatio < 1,
      volumeRatio,
      marketRiskHigh: riskLabel === "Caution" || riskLabel === "Hedge / Reduce Risk",
      marketRiskVeryHigh: riskLabel === "Hedge / Reduce Risk",
      marketRiskLabel: riskLabel,
      marketRiskThai: risk?.level?.thai || risk?.thai || "",
      weight,
      concentration,
      insufficient: !Number.isFinite(Number(row.latestClose)) && !Number.isFinite(Number(row.tech?.ema12)) && !Number.isFinite(Number(row.tech?.ema26))
    };
  }

  function highConcentrationForRow(row, snapshot) {
    const themeExposures = snapshot?.exposureMap?.themeExposures || {};
    const tags = row.exposureTags || [];
    return tags
      .map((tag) => ({ tag, percent: Number(themeExposures[tag]?.percent) || 0, risk: themeExposures[tag]?.risk?.label || "" }))
      .filter((item) => item.percent >= 60 || item.risk === "High")
      .sort((a, b) => b.percent - a.percent)[0] || null;
  }

  function detectConflicts(row, facts) {
    const conflicts = [];
    if ((facts.rsiBuy || facts.rsiWatchBuy) && (facts.emaBear || facts.belowSma)) {
      conflicts.push({
        label: "RSI Buy vs Bearish Trend",
        reason: "RSI อยู่โซนซื้อ แต่แนวโน้มหลักยังเป็นขาลง"
      });
    }
    if (facts.emaBull && facts.belowSma) {
      conflicts.push({
        label: "EMA Bullish but Below SMA200",
        reason: "โมเมนตัมเริ่มดีขึ้น แต่ราคายังต่ำกว่า SMA200"
      });
    }
    if ((facts.rsiSell || facts.rsiWatchSell) && (facts.emaBull || facts.aboveSma)) {
      conflicts.push({
        label: "RSI Hot but Trend Holds",
        reason: "แนวโน้มระยะยาวยังดี แต่ RSI เริ่มสูง จึงไม่ควรไล่ราคา"
      });
    }
    if (row.portfolio?.isHolding && (facts.rsiSell || facts.rsiWatchSell) && facts.marketRiskHigh) {
      conflicts.push({
        label: "Holding Risk Elevated",
        reason: "เป็นสินทรัพย์ที่ถือจริง และเริ่มมีสัญญาณเสี่ยง"
      });
    }
    if ((facts.rsiBuy || facts.rsiWatchBuy || facts.newBullish) && facts.concentration) {
      conflicts.push({
        label: "Concentration Risk",
        reason: `${facts.concentration.tag} exposure ในพอร์ตสูงอยู่แล้ว`
      });
    }
    return conflicts;
  }

  function scoreDecision(row, facts) {
    let score = 35;
    if (row.portfolio?.isHolding) score += 25;
    if (facts.weight >= 10) score += 15;
    if (facts.emaBull) score += 15;
    if (facts.newBullish) score += 20;
    if (facts.aboveSma) score += 15;
    if (facts.rsiBuy || facts.rsiWatchBuy) score += 10;
    if (facts.volumeConfirmed) score += 10;
    if (facts.strongVolume) score += 15;
    if (!facts.marketRiskHigh && facts.marketRiskLabel !== "Unknown") score += 10;
    if (facts.marketRiskHigh) score -= 20;
    if (facts.marketRiskVeryHigh) score -= 10;
    if (facts.belowSma) score -= 15;
    if (facts.emaBear) score -= 15;
    if (facts.newBearish) score -= 25;
    if (facts.rsiSell || facts.rsiWatchSell) score -= facts.rsiSell ? 15 : 10;
    if (facts.rsiSell && facts.rsiSignal === "STRONG_SELL") score -= 10;
    if (facts.volumeNotConfirmed) score -= 5;
    if (facts.concentration) score -= 10;
    if (facts.insufficient) score = Math.min(score, 25);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function keySignals(facts) {
    const signals = [];
    if (facts.newBearish) signals.push("New Bearish Signal");
    if (facts.newBullish) signals.push("New Bullish Signal");
    if (facts.rsiSell) signals.push("RSI Sell");
    else if (facts.rsiWatchSell) signals.push("RSI Watch Sell");
    else if (facts.rsiBuy) signals.push("RSI Buy");
    else if (facts.rsiWatchBuy) signals.push("RSI Watch Buy");
    if (facts.emaBull) signals.push("EMA Bullish");
    if (facts.emaBear) signals.push("EMA Bearish");
    if (facts.aboveSma) signals.push("Above SMA200");
    if (facts.belowSma) signals.push("Below SMA200");
    if (facts.strongVolume) signals.push("Strong Volume");
    else if (facts.volumeConfirmed) signals.push("Volume Confirmed");
    if (facts.marketRiskHigh) signals.push("Market Risk High");
    if (facts.concentration) signals.push(`${facts.concentration.tag} exposure high`);
    return [...new Set(signals)];
  }

  function scoreQuality(score) {
    if (score >= 80) return { label: "High Conviction", thai: "ความมั่นใจสูง", tone: "score-high" };
    if (score >= 60) return { label: "Good Setup", thai: "สัญญาณค่อนข้างดี", tone: "score-good" };
    if (score >= 40) return { label: "Mixed / Watch", thai: "สัญญาณผสม / เฝ้าดู", tone: "score-mixed" };
    if (score >= 20) return { label: "Weak", thai: "สัญญาณอ่อน", tone: "score-weak" };
    return { label: "Avoid / No Action", thai: "รอก่อน / ยังไม่ควรทำอะไร", tone: "score-avoid" };
  }

  function render() {
    state.snapshot = readSnapshot();
    if (!state.snapshot) {
      renderMissingSnapshot();
      return;
    }
    state.rows = buildRows(state.snapshot);
    updateHeader();
    renderFilters();
    renderSummary();
    renderSections();
  }

  function renderMissingSnapshot() {
    actionStatus.textContent = "กรุณาโหลดข้อมูลล่าสุดก่อน";
    marketRiskText.textContent = "Please load latest data first.";
    summaryRoot.innerHTML = '<div class="empty-box">ยังไม่มี Data Snapshot · กด Load Latest Data ด้านบนก่อน</div>';
    if (filtersRoot) filtersRoot.innerHTML = "";
    sectionsRoot.innerHTML = '<div class="empty-box">Please load latest data first. / กรุณาโหลดข้อมูลล่าสุดก่อน</div>';
  }

  function updateHeader() {
    const freshness = snapshotApi.freshness?.(state.snapshot) || { thai: "ไม่ทราบสถานะ" };
    const risk = state.snapshot?.marketRisk?.risk || state.snapshot?.marketRisk || {};
    const level = risk?.level?.label || risk?.label || "Unknown";
    const thai = risk?.level?.thai || risk?.thai || "ไม่ทราบระดับความเสี่ยง";
    actionStatus.textContent = `ใช้ Data Snapshot · ${state.rows.length} รายการ · ${freshness.thai}`;
    marketRiskText.textContent = `Market Risk: ${level} (${thai})`;
  }

  function filteredRows() {
    return state.rows.filter((row) => {
      if (state.filters.portfolio === "holdings" && !row.portfolio?.isHolding) return false;
      if (state.filters.portfolio === "watchlist" && row.portfolio?.isHolding) return false;
      if (state.filters.action === "buy" && !["buy", "consider"].includes(row.decision.action)) return false;
      if (state.filters.action === "watch" && row.decision.action !== "watch") return false;
      if (state.filters.action === "review" && row.decision.action !== "review") return false;
      if (state.filters.action === "none" && !["hold", "avoid"].includes(row.decision.action)) return false;
      if (state.filters.confidence === "high" && row.score < 80) return false;
      if (state.filters.confidence === "good" && row.score < 60) return false;
      if (state.filters.confidence === "mixed" && (row.score < 40 || row.score > 59)) return false;
      if (state.filters.conflict === "only" && !row.conflicts.length) return false;
      if (state.filters.conflict === "hide" && row.conflicts.length) return false;
      if (state.filters.market !== "all" && marketGroup(row) !== state.filters.market) return false;
      return true;
    });
  }

  function renderFilters() {
    if (!filtersRoot) return;
    filtersRoot.innerHTML = Object.entries(FILTERS).map(([key, options]) => `
      <label class="filter-field">
        <span>${filterLabel(key)}</span>
        <select data-filter="${key}">
          ${options.map(([value, label]) => `<option value="${value}" ${state.filters[key] === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>
    `).join("");
  }

  function renderSummary() {
    const rows = filteredRows();
    const counts = {
      urgent: rows.filter((row) => row.decision.section === "urgent").length,
      buy: rows.filter((row) => row.decision.section === "buy").length,
      watch: rows.filter((row) => row.decision.section === "watch").length,
      none: rows.filter((row) => row.decision.section === "none").length,
      conflicts: rows.filter((row) => row.conflicts.length).length,
      high: rows.filter((row) => row.score >= 80).length
    };
    summaryRoot.innerHTML = SUMMARY_DEFS.map(([key, title, thai]) => `
      <button class="summary-card decision-summary-${key}" type="button" data-summary="${key}">
        <span>${escapeHtml(title)}</span>
        <strong>${counts[key] || 0}</strong>
        <p>${escapeHtml(thai)}</p>
        <p>คลิกเพื่อดูรายการ</p>
      </button>
    `).join("");
  }

  function renderSections() {
    const rows = filteredRows();
    const grouped = Object.fromEntries(SECTION_DEFS.map((section) => [section.key, []]));
    rows.forEach((row) => grouped[row.decision.section]?.push(row));
    sectionsRoot.innerHTML = SECTION_DEFS.map((section) => `
      <section id="decision-${section.key}" class="decision-section ${section.tone}">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(section.title)} · ${escapeHtml(section.thai)}</h2>
            <p>${escapeHtml(section.description)}</p>
          </div>
          <span class="count-badge">${grouped[section.key].length}</span>
        </div>
        <div class="decision-card-grid">
          ${grouped[section.key].length ? grouped[section.key].map(renderCard).join("") : `<div class="empty-box">${escapeHtml(section.empty)}</div>`}
        </div>
      </section>
    `).join("");
  }

  function renderCard(row) {
    const holding = row.portfolio?.isHolding;
    const detailHref = `/ai-boom-universe?focus=${encodeURIComponent(row.symbol)}`;
    const scoreTone = row.scoreLabel.tone;
    const signals = row.decision.keySignals.length ? row.decision.keySignals : ["No clear signal"];
    return `
      <article class="decision-card ${decisionTone(row)}">
        <div class="decision-card-top">
          <div>
            <a class="decision-symbol" href="${detailHref}">${escapeHtml(row.displaySymbol || row.symbol)}</a>
            <p class="card-name">${escapeHtml(row.name || row.symbol)}</p>
          </div>
          <div class="decision-price">
            <strong>${escapeHtml(formatPrice(row.latestClose))}</strong>
            <span>${escapeHtml(formatDate(row.latestDate))}</span>
          </div>
        </div>
        <div class="badge-row">
          <span class="badge ${holding ? "badge-blue" : "badge-gray"}">${holding ? "Holding" : "Watchlist Only"}</span>
          ${holding ? `<span class="badge badge-blue">${escapeHtml(formatHolding(row))}</span>` : '<span class="badge badge-gray">No portfolio impact</span>'}
        </div>
        <div class="decision-action-row">
          <div>
            <span class="action-label">${escapeHtml(actionTitle(row.decision.action))}</span>
            <strong>${escapeHtml(row.decision.actionThai)}</strong>
          </div>
          <div class="score-pill ${scoreTone}">
            <strong>${row.score}</strong>
            <span>/100</span>
          </div>
        </div>
        <div class="quality-line">${escapeHtml(row.scoreLabel.label)} · ${escapeHtml(row.scoreLabel.thai)}</div>
        <p class="decision-reason">${escapeHtml(row.decision.reason)}</p>
        <div class="badge-row">
          ${signals.map((signal) => `<span class="badge ${badgeTone(signal)}">${escapeHtml(signal)}</span>`).join("")}
        </div>
        ${row.conflicts.length ? `<div class="conflict-warning"><strong>Conflict:</strong> ${escapeHtml(row.conflicts[0].reason)}</div>` : ""}
        <details class="decision-details">
          <summary>ดูรายละเอียด / View details</summary>
          <div class="details-grid">
            ${detailItem("EMA", row.facts.emaBull ? "EMA Bullish" : row.facts.emaBear ? "EMA Bearish" : "EMA Not Available")}
            ${detailItem("SMA200", row.facts.aboveSma ? "Above SMA200" : row.facts.belowSma ? "Below SMA200" : "SMA200 Not Available")}
            ${detailItem("RSI", rsiLabel(row))}
            ${detailItem("Volume", volumeLabel(row))}
            ${detailItem("Market Risk", row.facts.marketRiskThai ? `${row.facts.marketRiskLabel} (${row.facts.marketRiskThai})` : row.facts.marketRiskLabel)}
            ${detailItem("Source", row.source || "Data Snapshot")}
          </div>
        </details>
      </article>
    `;
  }

  function compareRows(a, b) {
    const sectionDiff = sectionRank(a.decision.section) - sectionRank(b.decision.section);
    if (sectionDiff) return sectionDiff;
    const holdingDiff = Number(Boolean(b.portfolio?.isHolding)) - Number(Boolean(a.portfolio?.isHolding));
    if (holdingDiff) return holdingDiff;
    const valueDiff = (Number(b.portfolio?.marketValue) || 0) - (Number(a.portfolio?.marketValue) || 0);
    if (valueDiff) return valueDiff;
    return b.score - a.score || String(a.displaySymbol || a.symbol).localeCompare(String(b.displaySymbol || b.symbol));
  }

  function sectionRank(key) {
    return { urgent: 1, buy: 2, watch: 3, none: 4 }[key] || 9;
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function enrichWithHoldingFallback(row, holding, totalValue) {
    const marketValue = holding?.isHolding ? Number(holding.marketValue) || 0 : 0;
    return {
      ...row,
      portfolio: {
        isHolding: Boolean(holding?.isHolding),
        watchlistOnly: !holding?.isHolding,
        marketValue,
        weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0
      }
    };
  }

  function displaySymbol(symbol) {
    if (core.displaySymbolForCanonical) return core.displaySymbolForCanonical(symbol);
    if (symbol === "BTC-USD") return "BTCUSD";
    if (String(symbol).endsWith(".BK")) return String(symbol).slice(0, -3);
    return symbol;
  }

  function inferMarket(symbol) {
    if (symbol.includes("RMF")) return "RMF";
    if (symbol.endsWith(".BK") || symbol.startsWith("^SET")) return "SET";
    if (symbol === "BTCUSD" || symbol === "BTC-USD") return "CRYPTO";
    return "US";
  }

  function isThai(symbol) {
    return symbol.endsWith(".BK") || symbol.startsWith("^SET") || symbol.includes("RMF");
  }

  function marketGroup(row) {
    const type = String(row.assetType || "").toUpperCase();
    if (type.includes("MUTUAL") || type.includes("FUND") || row.symbol.includes("RMF")) return "fund";
    if (type.includes("CRYPTO") || row.symbol.includes("BTC")) return "crypto";
    if (row.symbol.endsWith(".BK") || row.symbol.startsWith("^SET") || type.includes("THAI")) return "thai";
    return "us";
  }

  function actionTitle(action) {
    return {
      buy: "Buy / Add",
      consider: "Consider Add",
      hold: "Hold",
      watch: "Watch",
      review: "Review / Trim",
      avoid: "Avoid / Wait"
    }[action] || "No Action";
  }

  function filterLabel(key) {
    return {
      portfolio: "Portfolio impact",
      action: "Action type",
      confidence: "Confidence",
      conflict: "Conflict",
      market: "Market"
    }[key] || key;
  }

  function decisionTone(row) {
    if (row.decision.action === "review") return "tone-review";
    if (["buy", "consider"].includes(row.decision.action)) return "tone-buy";
    if (row.decision.action === "watch") return "tone-watch";
    if (row.decision.action === "hold") return "tone-hold";
    return "tone-neutral";
  }

  function badgeTone(signal) {
    if (/Bearish|Sell|Risk High|Below/i.test(signal)) return "badge-red";
    if (/Bullish|Buy|Above|Volume Confirmed|Strong Volume/i.test(signal)) return "badge-green";
    if (/Watch|Volume/i.test(signal)) return "badge-amber";
    return "badge-gray";
  }

  function detailItem(label, value) {
    return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function rsiLabel(row) {
    const signal = row.rsi?.signal || row.tech?.rsiSignal || "Unknown";
    const value = Number(row.rsi?.rsi14 ?? row.tech?.rsi14);
    return `${signal}${Number.isFinite(value) ? ` (${value.toFixed(1)})` : ""}`;
  }

  function volumeLabel(row) {
    if (!Number.isFinite(row.facts.volumeRatio)) return "No volume signal";
    return `${row.facts.volumeRatio.toFixed(2)}x`;
  }

  function formatHolding(row) {
    const value = Number(row.portfolio?.marketValue) || 0;
    const weight = Number(row.portfolio?.weight) || 0;
    return `${formatPrice(value)} THB · ${weight.toFixed(1)}%`;
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: number >= 100 ? 2 : 4 }).format(number);
  }

  function formatDate(value) {
    return value ? String(value).slice(0, 10) : "-";
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

  filtersRoot?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-filter]");
    if (!select) return;
    state.filters[select.dataset.filter] = select.value;
    renderSummary();
    renderSections();
  });

  summaryRoot?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-summary]");
    if (!card) return;
    const key = card.dataset.summary;
    const target = document.querySelector(key === "conflicts" || key === "high" ? "#decision-watch" : `#decision-${key}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  refreshButton?.addEventListener("click", () => {
    actionStatus.textContent = "กำลัง refresh จาก Data Snapshot...";
    render();
  });

  window.addEventListener("portfolio-data-snapshot", render);
  window.addEventListener("portfolio-holdings-updated", render);
  document.addEventListener("DOMContentLoaded", render);
})();
