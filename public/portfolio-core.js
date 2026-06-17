(function () {
  const HOLDINGS_STORAGE_KEY = "portfolioHoldingsDraft";
  const THAI_MUTUAL_FUND_ALIASES = {
    "K-GTECHRMF": "K-GTECHRMF",
    KGTECHRMF: "K-GTECHRMF",
    "K-USXNDQRMF": "K-USXNDQRMF",
    KUSXNDQRMF: "K-USXNDQRMF"
  };
  const THAI_INDEX_ALIASES = {
    SET: "^SET.BK",
    "SET.BK": "^SET.BK",
    "^SET.BK": "^SET.BK",
    SETINDEX: "^SET.BK",
    SET50: "^SET50.BK",
    "SET50.BK": "^SET50.BK",
    "^SET50.BK": "^SET50.BK",
    SET50INDEX: "^SET50.BK",
    SET100: "^SET100.BK",
    "SET100.BK": "^SET100.BK",
    "^SET100.BK": "^SET100.BK",
    SET100INDEX: "^SET100.BK"
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

  function displaySymbolForCanonical(symbol) {
    if (DISPLAY_SYMBOLS[symbol]) return DISPLAY_SYMBOLS[symbol];
    if (String(symbol || "").endsWith(".BK")) return symbol.slice(0, -3);
    return symbol || "";
  }

  function detectAssetType(symbol, fallback = "") {
    if (symbol.includes("RMF") || symbol.includes("SSF")) return "THAI_MUTUAL_FUND";
    if (symbol.startsWith("^SET")) return "THAI_INDEX";
    if (symbol.endsWith(".BK")) return "THAI_STOCK";
    if (symbol.startsWith("^")) return "INDEX";
    if (symbol === "BTCUSD" || symbol === "BTC-USD" || symbol === "ETHUSD") return "crypto";
    return fallback || "stock";
  }

  function toNumberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeHolding(input) {
    const canonicalSymbol = canonicalSymbolFromTicker(input?.canonicalSymbol || input?.canonical_symbol || input?.symbol || input?.ticker);
    const isHolding = Boolean(input?.isHolding ?? input?.is_holding);
    const quantity = toNumberOrNull(input?.quantity);
    const averageCost = toNumberOrNull(input?.averageCost ?? input?.average_cost);
    const costValue = toNumberOrNull(input?.costValue ?? input?.cost_value) ?? (
      Number.isFinite(quantity) && Number.isFinite(averageCost) ? quantity * averageCost : null
    );
    return {
      canonicalSymbol,
      displaySymbol: input?.displaySymbol || input?.display_symbol || displaySymbolForCanonical(canonicalSymbol),
      assetName: input?.assetName || input?.asset_name || input?.name || canonicalSymbol,
      assetType: input?.assetType || input?.asset_type || detectAssetType(canonicalSymbol),
      providerSymbol: input?.providerSymbol || input?.provider_symbol || canonicalSymbol,
      isHolding,
      watchlistOnly: Boolean(input?.watchlistOnly ?? input?.watchlist_only ?? !isHolding),
      quantity,
      averageCost,
      costValue,
      marketValue: isHolding ? (toNumberOrNull(input?.marketValue ?? input?.market_value) ?? 0) : 0,
      currency: input?.currency || "THB",
      latestPrice: toNumberOrNull(input?.latestPrice ?? input?.latest_price),
      latestPriceDate: input?.latestPriceDate || input?.latest_price_date || null,
      targetWeight: toNumberOrNull(input?.targetWeight ?? input?.target_weight),
      portfolioBucket: input?.portfolioBucket || input?.portfolio_bucket || "",
      accountType: input?.accountType || input?.account_type || "",
      notes: input?.notes || "",
      createdAt: input?.createdAt || input?.created_at || null,
      updatedAt: input?.updatedAt || input?.updated_at || null
    };
  }

  function dedupeHoldings(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map(normalizeHolding)
      .filter((holding) => {
        if (!holding.canonicalSymbol || seen.has(holding.canonicalSymbol)) return false;
        seen.add(holding.canonicalSymbol);
        return true;
      });
  }

  function readLocalHoldings() {
    try {
      return dedupeHoldings(JSON.parse(localStorage.getItem(HOLDINGS_STORAGE_KEY) || "[]"));
    } catch (_error) {
      return [];
    }
  }

  function writeLocalHoldings(holdings) {
    const clean = dedupeHoldings(holdings);
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(clean));
    updateSnapshotHoldings(clean);
  }

  function updateSnapshotHoldings(holdings) {
    const clean = dedupeHoldings(holdings);
    const snapshotApi = window.PortfolioDataSnapshot;
    let snapshot = snapshotApi?.read?.() || null;
    if (!snapshot) {
      try {
        snapshot = JSON.parse(localStorage.getItem("portfolio_dashboard_data_snapshot") || "null");
      } catch (_error) {
        snapshot = null;
      }
    }
    if (snapshot?.dataVersion) {
      const nextSnapshot = {
        ...snapshot,
        portfolioHoldings: {
          ...(snapshot.portfolioHoldings || {}),
          data: clean,
          mode: snapshot.portfolioHoldings?.mode || "local-update",
          updatedAt: new Date().toISOString()
        }
      };
      if (snapshotApi?.write) {
        snapshotApi.write(nextSnapshot);
      } else {
        try {
          localStorage.setItem("portfolio_dashboard_data_snapshot", JSON.stringify(nextSnapshot));
        } catch (_error) {}
      }
    }
    window.dispatchEvent(new CustomEvent("portfolio-holdings-updated", { detail: { holdings: clean } }));
  }

  async function loadHoldings() {
    try {
      const response = await fetch("/api/portfolio-holdings", { cache: "no-store" });
      if (!response.ok) throw new Error(`holdings request failed (${response.status})`);
      const payload = await response.json();
      const holdings = dedupeHoldings(payload?.data);
      writeLocalHoldings(holdings);
      return { holdings, mode: payload?.mode || "server" };
    } catch (_error) {
      return { holdings: readLocalHoldings(), mode: "local-cache" };
    }
  }

  async function saveHoldings(holdings) {
    const clean = dedupeHoldings(holdings);
    writeLocalHoldings(clean);
    const response = await fetch("/api/portfolio-holdings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: clean })
    });
    if (!response.ok) {
      let message = `Unable to save portfolio holdings (${response.status})`;
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch (_jsonError) {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch (_textError) {
          // Keep the status-based message when the response body cannot be read.
        }
      }
      throw new Error(message);
    }
    updateSnapshotHoldings(clean);
    return clean;
  }

  function holdingsMap(holdings) {
    return new Map(dedupeHoldings(holdings).map((holding) => [holding.canonicalSymbol, holding]));
  }

  function totalMarketValue(holdings) {
    return dedupeHoldings(holdings)
      .filter((holding) => holding.isHolding)
      .reduce((sum, holding) => sum + (Number(holding.marketValue) || 0), 0);
  }

  function getHoldingForSymbol(holdings, symbol) {
    return holdingsMap(holdings).get(canonicalSymbolFromTicker(symbol)) || null;
  }

  function enrichWithHolding(row, holdings, totalValue = totalMarketValue(holdings)) {
    const symbol = canonicalSymbolFromTicker(row?.asset?.ticker || row?.symbol || row?.ticker || row?.canonicalSymbol);
    const holding = getHoldingForSymbol(holdings, symbol);
    const isHolding = Boolean(holding?.isHolding);
    const marketValue = isHolding ? Number(holding.marketValue) || 0 : 0;
    const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
    const targetWeight = toNumberOrNull(holding?.targetWeight);
    return {
      ...row,
      holding: holding || {
        canonicalSymbol: symbol,
        displaySymbol: displaySymbolForCanonical(symbol),
        assetName: row?.name || row?.asset?.name || symbol,
        isHolding: false,
        watchlistOnly: true,
        marketValue: 0,
        currency: "THB"
      },
      portfolio: {
        isHolding,
        watchlistOnly: !isHolding,
        marketValue,
        weight,
        targetWeight,
        gapVsTarget: Number.isFinite(targetWeight) ? weight - targetWeight : null,
        totalValue
      }
    };
  }

  function signalSeverity(row) {
    const text = [
      row?.action?.actionLabel,
      row?.action?.key,
      row?.rsiClass?.label,
      row?.rsiClass?.key,
      row?.trend?.label,
      row?.trend?.key,
      row?.classification?.mainClassification,
      row?.classification?.groupKey
    ].join(" ");
    if (/Strong Sell|new_bearish|New Bearish/i.test(text)) return 50;
    if (/Sell Signal|sell_signal/i.test(text)) return 40;
    if (/Strong Buy/i.test(text)) return 40;
    if (/Buy Signal|buy_signal/i.test(text)) return 35;
    if (/Watch Sell|watch_sell|bearish_watch/i.test(text)) return 25;
    if (/Watch Buy|watch_buy|bullish_watch/i.test(text)) return 20;
    if (/Ongoing Bullish|ongoing_bullish/i.test(text)) return 10;
    return 0;
  }

  function priorityScore(row) {
    const weight = Number(row?.portfolio?.weight) || 0;
    const holdingScore = row?.portfolio?.isHolding ? 100 : 0;
    const positionSizeScore = weight >= 15 ? 40 : weight >= 10 ? 30 : weight >= 5 ? 20 : weight > 0 ? 10 : 0;
    const starredScore = row?.starred ? 10 : 0;
    return holdingScore + positionSizeScore + signalSeverity(row) + starredScore;
  }

  function comparePortfolioPriority(a, b) {
    const scoreDiff = priorityScore(b) - priorityScore(a);
    if (scoreDiff) return scoreDiff;
    const valueDiff = (Number(b?.portfolio?.marketValue) || 0) - (Number(a?.portfolio?.marketValue) || 0);
    if (valueDiff) return valueDiff;
    return String(a?.symbol || a?.displaySymbol || "").localeCompare(String(b?.symbol || b?.displaySymbol || ""));
  }

  function exposureTagsForSymbol(symbol, assetType = "") {
    const canonical = canonicalSymbolFromTicker(symbol);
    const tags = new Set();
    if (["NVDA", "AMD", "AVGO"].includes(canonical)) {
      tags.add("AI");
      tags.add("Semiconductor");
      tags.add("Big Tech");
    }
    if (["MSFT", "AMZN", "GOOG", "GOOGL", "META", "AAPL", "TSLA"].includes(canonical)) {
      tags.add("Big Tech");
      tags.add("Nasdaq-100");
    }
    if (["QQQ", "QQQM", "^NDX"].includes(canonical)) {
      tags.add("Nasdaq-100");
      tags.add("Big Tech");
      tags.add("Growth");
    }
    if (["SPY", "VOO", "IVV", "^GSPC"].includes(canonical)) {
      tags.add("S&P 500");
      tags.add("US Market");
    }
    if (canonical === "K-USXNDQRMF") {
      tags.add("Thai RMF");
      tags.add("Nasdaq-100");
      tags.add("Big Tech");
    }
    if (canonical === "K-GTECHRMF") {
      tags.add("Thai RMF");
      tags.add("Global Tech");
    }
    if (canonical.endsWith(".BK") || canonical.startsWith("^SET")) tags.add("Thai Equity");
    if (canonical.includes("RMF") || assetType === "THAI_MUTUAL_FUND") tags.add("Thai RMF");
    if (canonical === "BTCUSD" || canonical === "BTC-USD" || assetType === "crypto") tags.add("Crypto");
    if (!tags.size) tags.add("Cash / Defensive");
    return [...tags];
  }

  window.PortfolioCore = {
    canonicalSymbolFromTicker,
    displaySymbolForCanonical,
    detectAssetType,
    normalizeHolding,
    dedupeHoldings,
    loadHoldings,
    saveHoldings,
    readLocalHoldings,
    writeLocalHoldings,
    holdingsMap,
    totalMarketValue,
    getHoldingForSymbol,
    enrichWithHolding,
    priorityScore,
    comparePortfolioPriority,
    exposureTagsForSymbol
  };
})();
