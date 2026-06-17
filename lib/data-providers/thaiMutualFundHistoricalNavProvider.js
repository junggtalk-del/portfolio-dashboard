const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";

const THAI_FUND_SYMBOL_ALIASES = {
  "K-GTECHRMF": "K-GTECHRMF",
  KGTECHRMF: "K-GTECHRMF",
  "KGTECHRMF": "K-GTECHRMF",
  "K-USXNDQRMF": "K-USXNDQRMF",
  KUSXNDQRMF: "K-USXNDQRMF",
  "KUSXNDQRMF": "K-USXNDQRMF"
};

const THAI_FUND_PROVIDER_CONFIG = {
  "K-GTECHRMF": {
    name: "K Global Technology RMF",
    historicalUrl: "https://www.kasikornasset.com/kasset/en/mutual-fund/nav/Pages/excel.aspx",
    latestUrl: "https://www.kasikornasset.com/kasset/en/mutual-fund/fund-template/Pages/K-GTECHRMF.aspx"
  },
  "K-USXNDQRMF": {
    name: "K US Equity NDQ 100 Index RMF",
    historicalUrl: "https://www.kasikornasset.com/kasset/en/mutual-fund/nav/Pages/excel.aspx",
    latestUrl: "https://www.kasikornasset.com/kasset/en/mutual-fund/fund-template/Pages/K-USXNDQRMF.aspx"
  }
};

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function hasSupabaseCoreConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    "accept-profile": SCHEMA,
    "content-profile": SCHEMA,
    ...extra
  };
}

function normalizeTicker(rawTicker) {
  return String(rawTicker || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function canonicalSymbolFromTicker(rawTicker) {
  const normalized = normalizeTicker(rawTicker);
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  return THAI_FUND_SYMBOL_ALIASES[normalized] || THAI_FUND_SYMBOL_ALIASES[compact] || "";
}

function formatIsoDate(date) {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function latestBusinessDayIso(baseDate = new Date()) {
  const day = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return formatIsoDate(day);
}

function previousBusinessDayIso(baseDate = new Date()) {
  const day = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - 1);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return formatIsoDate(day);
}

function yearsAgoIso(years) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return formatIsoDate(date);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .trim();
}

function parseNumber(value) {
  const cleaned = decodeHtmlEntities(value).replace(/,/g, "").trim();
  if (!cleaned || cleaned.toUpperCase() === "N/A") return null;
  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseChangeValue(changeText) {
  const cleaned = decodeHtmlEntities(changeText);
  if (!cleaned) return { change: null, changePercent: null };
  const [changeRaw = "", percentRaw = ""] = cleaned.split("|").map((item) => item.trim());
  const change = parseNumber(changeRaw);
  const percentText = percentRaw.replace(/%/g, "");
  const changePercent = parseNumber(percentText);
  return { change, changePercent };
}

function parseKAssetDate(rawDate) {
  const text = String(rawDate || "").trim();
  if (!text) return null;
  const parsed = new Date(`${text} UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const months = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!day || !month || !year) return null;
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseKAssetHistoricalRows(html, canonicalSymbol) {
  const rows = [];
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  for (const tr of trMatches) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " "))
    );
    if (cells.length < 8) continue;
    if (canonicalSymbolFromTicker(cells[0]) !== canonicalSymbol) continue;

    const date = cells[2];
    const nav = parseNumber(cells[3]);
    if (!date || !Number.isFinite(nav)) continue;

    const { change, changePercent } = parseChangeValue(cells[4]);
    rows.push({
      date,
      nav,
      offer: parseNumber(cells[5]),
      bid: parseNumber(cells[6]),
      change,
      changePercent,
      totalNetAsset: parseNumber(cells[7])
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

async function fetchKAssetHistoricalNav(canonicalSymbol, options = {}) {
  const config = THAI_FUND_PROVIDER_CONFIG[canonicalSymbol];
  if (!config) {
    const error = new Error(`Unsupported Thai fund symbol: ${canonicalSymbol}`);
    error.code = "UNSUPPORTED_SYMBOL";
    throw error;
  }

  const from = options.from || yearsAgoIso(5);
  const to = options.to || formatIsoDate(new Date());
  const endpoint = new URL(config.historicalUrl);
  endpoint.searchParams.set("start_date", from);
  endpoint.searchParams.set("end_date", to);
  endpoint.searchParams.set("fund_codes", canonicalSymbol);
  endpoint.searchParams.set("recaptcha", "");

  const response = await fetch(endpoint.toString(), {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) {
    const error = new Error(`Unable to fetch historical NAV from KAsset (${response.status})`);
    error.code = "KASSET_FETCH_FAILED";
    throw error;
  }

  const html = await response.text();
  const navHistory = parseKAssetHistoricalRows(html, canonicalSymbol);
  if (!navHistory.length) {
    const error = new Error("Historical NAV endpoint not found");
    error.code = "HISTORICAL_NAV_ENDPOINT_NOT_FOUND";
    throw error;
  }

  const latest = navHistory[navHistory.length - 1];
  return {
    symbol: canonicalSymbol,
    canonicalSymbol,
    source: "KAsset",
    fundName: config.name,
    navHistory,
    latestNav: latest?.nav ?? null,
    latestNavDate: latest?.date || null,
    fetchedAt: new Date().toISOString()
  };
}

async function fetchKAssetLatestNav(canonicalSymbol) {
  const config = THAI_FUND_PROVIDER_CONFIG[canonicalSymbol];
  if (!config?.latestUrl) {
    const error = new Error(`Unsupported Thai fund symbol: ${canonicalSymbol}`);
    error.code = "UNSUPPORTED_SYMBOL";
    throw error;
  }
  const response = await fetch(config.latestUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) {
    const error = new Error(`Unable to fetch latest NAV from KAsset (${response.status})`);
    error.code = "KASSET_LATEST_FETCH_FAILED";
    throw error;
  }
  const html = await response.text();
  const navDateMatch = html.match(/Data as of\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  const navValueMatch = html.match(/NAV\s*[\r\n\s]*per unit\s*[\r\n\s]*([0-9][0-9,]*\.[0-9]+)/i);
  if (!navDateMatch || !navValueMatch) {
    const error = new Error("Unable to parse latest NAV payload");
    error.code = "KASSET_LATEST_PARSE_FAILED";
    throw error;
  }
  const navDate = parseKAssetDate(navDateMatch[1]);
  const nav = Number(String(navValueMatch[1]).replace(/,/g, ""));
  if (!navDate || !Number.isFinite(nav)) {
    const error = new Error("Invalid latest NAV payload");
    error.code = "KASSET_LATEST_PARSE_FAILED";
    throw error;
  }
  return {
    date: navDate,
    nav,
    offer: null,
    bid: null,
    change: null,
    changePercent: null,
    totalNetAsset: null
  };
}

async function fetchSettradeHistoricalNav(canonicalSymbol) {
  const error = new Error(`Unable to fetch historical NAV from Settrade for ${canonicalSymbol}`);
  error.code = "SETTRADE_PROVIDER_UNAVAILABLE";
  throw error;
}

function buildSupabaseNavRow(canonicalSymbol, row, source, fetchedAt) {
  return {
    symbol: canonicalSymbol,
    canonical_symbol: canonicalSymbol,
    nav_date: row.date,
    nav: row.nav,
    offer_price: row.offer,
    bid_price: row.bid,
    change_value: row.change,
    change_percent: row.changePercent,
    total_net_asset: row.totalNetAsset,
    source,
    fetched_at: fetchedAt
  };
}

async function upsertHistoricalRowsToSupabase(canonicalSymbol, rows, source, fetchedAt) {
  if (!hasSupabaseCoreConfig() || !rows.length) return { ok: false, reason: "supabase-not-configured" };
  const endpoint = `${getSupabaseUrl()}/rest/v1/fund_nav_history?on_conflict=canonical_symbol,nav_date`;
  const payload = rows.map((row) => buildSupabaseNavRow(canonicalSymbol, row, source, fetchedAt));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = new Error(await response.text());
    error.code = "SUPABASE_UPSERT_FAILED";
    throw error;
  }
  return { ok: true };
}

async function readHistoricalRowsFromSupabase(canonicalSymbol, options = {}) {
  if (!hasSupabaseCoreConfig()) return [];
  const endpoint = new URL(`${getSupabaseUrl()}/rest/v1/fund_nav_history`);
  endpoint.searchParams.set("canonical_symbol", `eq.${canonicalSymbol}`);
  if (options.from) endpoint.searchParams.set("nav_date", `gte.${options.from}`);
  if (options.to) endpoint.searchParams.set("nav_date", `lte.${options.to}`);
  endpoint.searchParams.set(
    "select",
    "canonical_symbol,nav_date,nav,offer_price,bid_price,change_value,change_percent,total_net_asset,source,fetched_at"
  );
  endpoint.searchParams.set("order", "nav_date.asc");

  const response = await fetch(endpoint.toString(), { headers: supabaseHeaders() });
  if (!response.ok) {
    const error = new Error(await response.text());
    error.code = "SUPABASE_READ_FAILED";
    throw error;
  }

  const rows = await response.json();
  return rows.map((row) => ({
    date: row.nav_date,
    nav: Number(row.nav),
    offer: Number.isFinite(Number(row.offer_price)) ? Number(row.offer_price) : null,
    bid: Number.isFinite(Number(row.bid_price)) ? Number(row.bid_price) : null,
    change: Number.isFinite(Number(row.change_value)) ? Number(row.change_value) : null,
    changePercent: Number.isFinite(Number(row.change_percent)) ? Number(row.change_percent) : null,
    totalNetAsset: Number.isFinite(Number(row.total_net_asset)) ? Number(row.total_net_asset) : null,
    source: row.source || "Cache",
    fetchedAt: row.fetched_at || null
  }));
}

function cacheIsFreshEnough(navHistory, minPoints) {
  if (!Array.isArray(navHistory) || navHistory.length < minPoints) return false;
  const latestRow = navHistory[navHistory.length - 1];
  if (!latestRow?.date) return false;
  const latestDate = latestRow.date;
  const latestBusinessDate = latestBusinessDayIso();
  const previousBusinessDate = previousBusinessDayIso();
  const hasRecentMarketDate = latestDate >= previousBusinessDate || latestDate >= latestBusinessDate;

  const fetchedAtCandidates = navHistory.map((row) => row.fetchedAt).filter(Boolean).sort();
  const fetchedAt = fetchedAtCandidates[fetchedAtCandidates.length - 1];
  if (!fetchedAt) return hasRecentMarketDate;
  const fetchedDay = formatIsoDate(new Date(fetchedAt));
  const today = formatIsoDate(new Date());
  return hasRecentMarketDate && fetchedDay === today;
}

function shapeResult(canonicalSymbol, source, navHistory, fundName) {
  const latest = navHistory[navHistory.length - 1] || null;
  return {
    symbol: canonicalSymbol,
    canonicalSymbol,
    source,
    navHistory,
    latestNav: latest ? latest.nav : null,
    latestNavDate: latest ? latest.date : null,
    fundName: fundName || THAI_FUND_PROVIDER_CONFIG[canonicalSymbol]?.name || canonicalSymbol,
    fetchedAt: new Date().toISOString()
  };
}

async function getHistoricalThaiFundNav(symbol, options = {}) {
  const canonicalSymbol = canonicalSymbolFromTicker(symbol);
  if (!canonicalSymbol) {
    const error = new Error(`Unsupported Thai fund symbol: ${symbol}`);
    error.code = "UNSUPPORTED_SYMBOL";
    throw error;
  }

  const from = options.from || yearsAgoIso(5);
  const to = options.to || formatIsoDate(new Date());
  const minPoints = Number.isFinite(Number(options.minPoints)) ? Number(options.minPoints) : 220;
  const forceRefresh = Boolean(options.forceRefresh);
  const cachedRows = await readHistoricalRowsFromSupabase(canonicalSymbol, { from, to }).catch(() => []);

  if (!forceRefresh && cacheIsFreshEnough(cachedRows, minPoints)) {
    return shapeResult(canonicalSymbol, "Cache", cachedRows, THAI_FUND_PROVIDER_CONFIG[canonicalSymbol]?.name);
  }

  let lastError = null;
  try {
    const live = await fetchKAssetHistoricalNav(canonicalSymbol, { from, to, minPoints });
    await upsertHistoricalRowsToSupabase(canonicalSymbol, live.navHistory, "KAsset", live.fetchedAt).catch(() => null);
    return shapeResult(canonicalSymbol, "KAsset", live.navHistory, live.fundName);
  } catch (error) {
    lastError = error;
  }

  try {
    const settrade = await fetchSettradeHistoricalNav(canonicalSymbol, { from, to, minPoints });
    await upsertHistoricalRowsToSupabase(canonicalSymbol, settrade.navHistory, "Settrade", settrade.fetchedAt).catch(() => null);
    return shapeResult(canonicalSymbol, "Settrade", settrade.navHistory, settrade.fundName);
  } catch (error) {
    if (!lastError) lastError = error;
  }

  if (cachedRows.length) {
    return shapeResult(canonicalSymbol, "Cache", cachedRows, THAI_FUND_PROVIDER_CONFIG[canonicalSymbol]?.name);
  }

  // Keep latest NAV visibility even when historical endpoint is unavailable.
  try {
    const latestOnly = await fetchKAssetLatestNav(canonicalSymbol);
    return shapeResult(
      canonicalSymbol,
      "KAssetLatestOnly",
      [latestOnly],
      THAI_FUND_PROVIDER_CONFIG[canonicalSymbol]?.name
    );
  } catch (_error) {
    // Fall through to explicit error below.
  }

  const finalError = lastError || new Error(`Unable to fetch historical NAV for ${canonicalSymbol}`);
  throw finalError;
}

async function refreshHistoricalThaiFundNav(symbols, options = {}) {
  const minPoints = Number.isFinite(Number(options.minPoints)) ? Number(options.minPoints) : 220;
  const forceRefresh = options.forceRefresh !== false;
  const result = [];
  for (const rawSymbol of symbols) {
    const canonicalSymbol = canonicalSymbolFromTicker(rawSymbol);
    if (!canonicalSymbol) {
      result.push({ symbol: String(rawSymbol || ""), ok: false, error: "Unsupported symbol" });
      continue;
    }
    try {
      const payload = await getHistoricalThaiFundNav(canonicalSymbol, { minPoints, forceRefresh });
      result.push({
        symbol: canonicalSymbol,
        ok: true,
        source: payload.source,
        historicalPoints: payload.navHistory.length,
        latestNavDate: payload.latestNavDate || null
      });
    } catch (error) {
      result.push({
        symbol: canonicalSymbol,
        ok: false,
        error: String(error.message || error),
        code: error.code || ""
      });
    }
  }
  return result;
}

module.exports = {
  THAI_FUND_SYMBOL_ALIASES,
  THAI_FUND_PROVIDER_CONFIG,
  canonicalSymbolFromTicker,
  getHistoricalThaiFundNav,
  refreshHistoricalThaiFundNav
};
