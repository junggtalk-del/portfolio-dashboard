"use strict";

// Merge all FREE BTC data sources into a per-metric best-available map + coverage.
// Priority is free-first: Binance (price/derivatives) > Coin Metrics Community
// (MVRV/NUPL/realized-price proxy) > Blockchain.com (miner/network proxies) >
// DefiLlama (SSR proxy) > Alternative.me (Fear & Greed). Optional paid providers
// (Glassnode/CryptoQuant) only take priority for EXACT metrics IF their key is set;
// the page works fully without them.
//
// Each metric => { value, date, source, freshness, status, isStale, isMissing,
//                  derived, proxy, referenceLinks }.

const { getReferenceLinks } = require("./bitcoinPublicReferenceProvider");

function nn(v) { return v != null && Number.isFinite(Number(v)) ? Number(v) : null; }

function mergeFreeBitcoinData(inp) {
  inp = inp || {};
  const { binance, futures, coinMetrics, blockchain, defillama, fearGreed, glass, cq } = inp;
  const hasGlass = !!inp.hasGlass, hasCq = !!inp.hasCq;
  const nowMs = inp.nowMs || 0;
  const d = new Date(nowMs);
  const todayMid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  function daysOld(dateStr) {
    if (!dateStr) return null;
    const t = Date.parse(String(dateStr).slice(0, 10) + "T00:00:00Z");
    if (!Number.isFinite(t)) return null;
    return Math.round((todayMid - t) / 86400000);
  }
  function freshnessDaily(dateStr) {
    const o = daysOld(dateStr);
    if (o == null) return null;
    if (o <= 0) return "D0";
    if (o === 1) return "D1";
    if (o === 2) return "D2";
    return "stale";
  }

  function merge(metricKey, candidates) {
    const links = getReferenceLinks(metricKey);
    for (const c of candidates) {
      const v = nn(c.value);
      if (v != null) {
        const fresh = c.group === "price" ? "near_real_time" : freshnessDaily(c.date);
        return {
          value: v, date: c.date || null, source: c.source,
          freshness: fresh, status: fresh === "stale" ? "stale" : "live",
          isStale: fresh === "stale", isMissing: false, derived: !!c.derived, proxy: !!c.proxy,
          referenceLinks: links
        };
      }
    }
    const gatedUnconfigured = candidates.some((c) => c.needsKey && !c.keyConfigured);
    let freshness;
    if (gatedUnconfigured) freshness = "not_connected";
    else if (links.length) freshness = "public_chart_only";
    else freshness = "missing";
    return { value: null, date: null, source: null, freshness, status: freshness, isStale: false, isMissing: true, derived: false, proxy: false, referenceLinks: links };
  }

  const bin = binance && !binance._error ? binance : null;
  const fut = futures || {};
  const cmL = (coinMetrics && coinMetrics.latest) || {};
  const bc = (blockchain && blockchain.latest) || {};
  const bcD = (blockchain && blockchain.dates) || {};
  const gm = (glass && glass.metrics) || {}, gd = (glass && glass.dates) || {};
  const cm = (cq && cq.metrics) || {}, cd = (cq && cq.dates) || {};
  const fg = fearGreed || {};

  const techDate = bin ? (bin.completeDate || bin.latestDate) : null;
  const binCand = (key, date) => bin ? [{ source: "Binance", value: bin[key], date: date, group: "price" }] : [];

  // SSR proxy = BTC market cap / total stablecoin market cap
  const btcMcap = nn(cmL.marketCap);
  const stableMcap = nn(defillama && defillama.totalStablecoinMcap);
  const ssrProxyVal = (btcMcap != null && stableMcap != null && stableMcap > 0) ? Math.round((btcMcap / stableMcap) * 100) / 100 : null;
  // SSR proxy blends a (possibly D-1) Coin Metrics market cap with a (D-0) DefiLlama
  // stablecoin cap — label it with the OLDER of the two so freshness isn't overstated.
  const ssrDates = [defillama && defillama.date, cmL.date].filter(Boolean).sort();
  const ssrDate = ssrDates.length ? ssrDates[0] : null;

  const metrics = {
    // --- technical (Binance, near real-time) ---
    price: merge("price", bin ? [{ source: "Binance", value: bin.latestPrice, date: bin.latestDate, group: "price" }] : []),
    ema12: merge("ema12", binCand("ema12", techDate)),
    ema26: merge("ema26", binCand("ema26", techDate)),
    sma200: merge("sma200", binCand("sma200", techDate)),
    rsi14: merge("rsi14", binCand("rsi14", techDate)),
    volumeRatio5D: merge("volumeRatio5D", binCand("volumeRatio5D", techDate)),

    // --- cycle valuation (Glassnode key > Coin Metrics free > reference) ---
    mvrvZScore: merge("mvrvZScore", [
      { source: "Glassnode", value: gm.mvrvZScore, date: gd.mvrvZScore, group: "daily", needsKey: true, keyConfigured: hasGlass },
      { source: "Coin Metrics Community", value: cmL.mvrvZScore, date: cmL.date, group: "daily", derived: true }
    ]),
    mvrvRatio: merge("mvrvRatio", [
      { source: "Glassnode", value: gm.mvrv, date: gd.mvrv, group: "daily", needsKey: true, keyConfigured: hasGlass },
      { source: "Coin Metrics Community", value: cmL.mvrvRatio, date: cmL.date, group: "daily" },
      { source: "CryptoQuant", value: cm.mvrv, date: cd.mvrv, group: "daily", needsKey: true, keyConfigured: hasCq }
    ]),
    nupl: merge("nupl", [
      { source: "Glassnode", value: gm.nupl, date: gd.nupl, group: "daily", needsKey: true, keyConfigured: hasGlass },
      { source: "Coin Metrics Community", value: cmL.nupl, date: cmL.date, group: "daily", derived: true, proxy: true }
    ]),
    realizedPriceProxy: merge("realizedPriceProxy", [
      { source: "Coin Metrics Community", value: cmL.realizedPriceProxy, date: cmL.date, group: "daily", proxy: true }
    ]),
    puellMultiple: merge("puellMultiple", [
      { source: "Glassnode", value: gm.puellMultiple, date: gd.puellMultiple, group: "daily", needsKey: true, keyConfigured: hasGlass }
    ]),

    // --- holder behavior EXACT (Glassnode only; reference link otherwise) ---
    sthRealizedPrice: merge("sthRealizedPrice", [{ source: "Glassnode", value: gm.sthRealizedPrice, date: gd.sthRealizedPrice, group: "daily", needsKey: true, keyConfigured: hasGlass }]),
    lthRealizedPrice: merge("lthRealizedPrice", [{ source: "Glassnode", value: gm.lthRealizedPrice, date: gd.lthRealizedPrice, group: "daily", needsKey: true, keyConfigured: hasGlass }]),
    sthSopr: merge("sthSopr", [
      { source: "Glassnode", value: gm.sthSopr, date: gd.sthSopr, group: "daily", needsKey: true, keyConfigured: hasGlass },
      { source: "CryptoQuant", value: cm.sthSopr, date: cd.sthSopr, group: "daily", needsKey: true, keyConfigured: hasCq }
    ]),
    lthSopr: merge("lthSopr", [{ source: "Glassnode", value: gm.lthSopr, date: gd.lthSopr, group: "daily", needsKey: true, keyConfigured: hasGlass }]),

    // --- sentiment (Alternative.me, free) ---
    fearGreed: merge("fearGreed", [{ source: "Alternative.me", value: fg.value, date: fg.date, group: "daily" }]),

    // --- free market stress (Binance Futures > CryptoQuant > reference) ---
    fundingRate: merge("fundingRate", [
      { source: "Binance Futures", value: fut.fundingRate, date: fut.fundingDate, group: "price" },
      { source: "CryptoQuant", value: cm.fundingRate, date: cd.fundingRate, group: "daily", needsKey: true, keyConfigured: hasCq }
    ]),
    openInterest: merge("openInterest", [
      { source: "Binance Futures", value: fut.openInterest, date: fut.openInterestDate, group: "daily" },
      { source: "CryptoQuant", value: cm.openInterest, date: cd.openInterest, group: "daily", needsKey: true, keyConfigured: hasCq }
    ]),
    // OI/taker/long-short come from Binance's DAILY futures-stats endpoints, so they are
    // day-bucketed (D0/D1) rather than near-real-time like the current funding rate.
    takerBuySellRatio: merge("takerBuySellRatio", [{ source: "Binance Futures", value: fut.takerBuySellRatio, date: fut.takerDate, group: "daily" }]),
    longShortRatio: merge("longShortRatio", [{ source: "Binance Futures", value: fut.longShortRatio, date: fut.lsrDate, group: "daily" }]),
    ssrProxy: merge("ssrProxy", [{ source: "DefiLlama + Coin Metrics", value: ssrProxyVal, date: ssrDate, group: "daily", proxy: true }]),
    minerRevenueMultipleProxy: merge("minerRevenueMultipleProxy", [{ source: "Blockchain.com", value: bc.minerRevenueMultipleProxy, date: bc.minerRevenueDate, group: "daily", proxy: true }]),
    hashRate: merge("hashRate", [{ source: "Blockchain.com", value: bc.hashRate, date: bcD.hashRate, group: "daily" }]),
    difficulty: merge("difficulty", [{ source: "Blockchain.com", value: bc.difficulty, date: bcD.difficulty, group: "daily" }]),
    minersRevenueUsd: merge("minersRevenueUsd", [{ source: "Blockchain.com", value: bc.minersRevenueUsd, date: bcD.minersRevenueUsd, group: "daily" }]),

    // --- optional paid-only metrics (reference link when no key) ---
    estimatedLeverageRatio: merge("estimatedLeverageRatio", [{ source: "CryptoQuant", value: cm.estimatedLeverageRatio, date: cd.estimatedLeverageRatio, group: "daily", needsKey: true, keyConfigured: hasCq }]),
    exchangeNetflow: merge("exchangeNetflow", [{ source: "CryptoQuant", value: cm.exchangeNetflow, date: cd.exchangeNetflow, group: "daily", needsKey: true, keyConfigured: hasCq }])
  };

  function comp(keys, label) {
    const hit = keys.map((k) => metrics[k]).find((m) => m && m.value != null);
    return { connected: !!hit, source: hit ? hit.source : null, freshness: hit ? hit.freshness : null, proxy: hit ? !!hit.proxy : false, label: label };
  }
  // Coverage key sets mirror computeBuyZone's component-availability EXACTLY (the page
  // renders the panel from componentScores, but external consumers read this block):
  //   cycle    -> mvrvZScore|mvrvRatio|nupl|puellMultiple   (cycleAvail)
  //   holder   -> fearGreed|realizedPriceProxy|sthRealizedPrice|sthSopr  (holderAvail)
  //   stress   -> fundingRate|takerBuySellRatio|ssrProxy|minerRevenueMultipleProxy  (stressAvail;
  //               openInterest is display-only and does NOT flip availability)
  const coverage = {
    technical: comp(["price", "ema12", "sma200", "rsi14"], "Technical"),
    cycle: comp(["mvrvZScore", "mvrvRatio", "nupl", "puellMultiple"], "Cycle valuation"),
    holderSentiment: comp(["fearGreed", "realizedPriceProxy", "sthRealizedPrice", "sthSopr"], "Holder / Sentiment proxy"),
    stress: comp(["fundingRate", "takerBuySellRatio", "ssrProxy", "minerRevenueMultipleProxy"], "Free market stress"),
    sentiment: comp(["fearGreed"], "Sentiment")
  };

  return { metrics, coverage };
}

module.exports = { mergeFreeBitcoinData, nn };
