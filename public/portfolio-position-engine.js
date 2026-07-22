(function () {
  "use strict";

  // ============================================================
  // Portfolio Position — engine (facts only, no advice).
  //
  // Builds ONE truthful picture of the portfolio anchored on the Quarterly
  // Editor (source of truth for money): actual proportions per bucket,
  // invested vs cash, QoQ change, plus the FACTUAL indicator state of each
  // held ticker (reused verbatim from snapshot.scoring / wave3 — no new
  // signal logic, no rebalance targets, no money-moving recommendations).
  //
  // Pure aggregation of precomputed data → computed ON RENDER (MarketRegime
  // pattern), never during Load. No DOM, no fetch. Safe headless via
  // module.exports for Node smoke tests.
  // ============================================================

  // Quarterly Editor asset types (public/app.js TYPE_LABELS) → label + color.
  // Copy of mission-control-page.js Q_TYPES (that module is page-private).
  var Q_TYPES = {
    bitcoin: { label: "Bitcoin", color: "#f59e0b" },
    "foreign-stock": { label: "หุ้นต่างประเทศ", color: "#3b82f6" },
    "thai-stock": { label: "หุ้นไทย", color: "#a855f7" },
    "provident-fund": { label: "เงินสำรองเลี้ยงชีพ", color: "#14b8a6" },
    "rmf-jang": { label: "RMF-จัง", color: "#0ea5e9" },
    "rmf-tum": { label: "RMF-ตุ๋ม", color: "#8b5cf6" },
    cash: { label: "เงินสด", color: "#94a3b8" },
    custom: { label: "อื่นๆ", color: "#64748b" }
  };
  var BUCKET_KEYS = Object.keys(Q_TYPES);

  // Market proxies used ONLY when a bucket has no mapped holdings with scores.
  // Labeled as index-based facts, never advice. Keys must exist in
  // snapshot.technicalSignals (REQUIRED_SYMBOLS; BTC's canonical key = BTCUSD).
  var BUCKET_PROXIES = {
    bitcoin: [{ symbol: "BTCUSD", weight: 1 }],
    "foreign-stock": [{ symbol: "QQQM", weight: 0.6 }, { symbol: "SPY", weight: 0.4 }],
    "thai-stock": [], // no SET index in the snapshot universe → no signal
    "provident-fund": [{ symbol: "SPY", weight: 0.5 }, { symbol: "GLD", weight: 0.5 }],
    "rmf-jang": [{ symbol: "QQQM", weight: 1 }],
    "rmf-tum": [{ symbol: "QQQM", weight: 1 }],
    cash: [],
    custom: []
  };

  // 4-asset composition model — the "+ เพิ่ม ในก้อนนี้" flow adds one of these by % held.
  // Each maps to a canonical signal source. Bitcoin uses the Buy Zone Score (same as the
  // Bitcoin Monitor / bitcoin bucket) so it stays consistent app-wide; the rest use the
  // snapshot timing signal on their proxy symbol. Cash carries no market signal (neutral).
  var ASSET_MODEL = {
    bitcoin: { label: "Bitcoin", display: "BTC", symbol: "BTCUSD", buyZone: true },
    qqqm: { label: "QQQM · Nasdaq 100", display: "QQQM", symbol: "QQQM" },
    set50: { label: "SET50 · หุ้นไทย", display: "SET50", symbol: "^SET50.BK", noSignal: true },
    cash: { label: "เงินสด", display: "Cash", symbol: null, cash: true }
  };
  var ASSET_KEYS = Object.keys(ASSET_MODEL);

  // scoring for a 4-asset composition item (returns a scoring-like object or null)
  function assetScoring(assetKey, snapshot) {
    var a = ASSET_MODEL[assetKey];
    if (!a) return null;
    if (a.cash) return { signalScore: null, thaiSignalLabel: "เงินสด (สภาพคล่อง)", thaiFinalAction: "", color: "#94a3b8", warnings: [], cash: true };
    if (a.buyZone) {
      var bz = readBuyZone();
      if (bz && bz.score != null) {
        return { signalScore: Math.round(bz.score), thaiSignalLabel: "BTC Buy Zone" + (bz.mode ? " · " + bz.mode : ""), thaiFinalAction: "", color: toneColor(bz.score), warnings: [], source: "buyzone" };
      }
    }
    var st = a.symbol ? tickerState(a.symbol, snapshot) : null;
    if (st) return st;
    // no signal available. SET50/Thai indices have too little free history for EMA/SMA200/RSI —
    // say so plainly (Load won't fix it) instead of the generic "press Load" prompt.
    if (a.noSignal) return { signalScore: null, thaiSignalLabel: "ไม่มีสัญญาณ (ข้อมูลหุ้นไทยไม่พอ)", thaiFinalAction: "", color: "#94a3b8", warnings: [], noData: true };
    return null;
  }
  function toneColor(score) { return score == null ? "#94a3b8" : score >= 60 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"; }

  // Legacy values the old holdings modal's defaultBucket() used to write.
  var LEGACY_BUCKET_ALIASES = {
    crypto: "bitcoin",
    "thai stock": "thai-stock",
    "us stock": "foreign-stock",
    "us etf": "foreign-stock",
    index: "foreign-stock",
    "thai rmf": null // ambiguous between rmf-jang / rmf-tum — needs user assignment
  };

  function fin(v) { var n = Number(v); return Number.isFinite(n) ? n : null; }
  function round(v, d) { var n = Number(v); if (!Number.isFinite(n)) return null; var p = Math.pow(10, d == null ? 0 : d); return Math.round(n * p) / p; }

  // ---------------------------------------------------------- quarterly (source of truth)
  // Port of mission-control-page.js quarterlyPortfolio() with two additions:
  // current quarter prefers manualValue (the editor's live number) while
  // PREVIOUS quarters prefer snapshotValue (frozen at "บันทึกไตรมาสนี้"),
  // and it derives per-bucket + total QoQ vs the immediately previous quarter.
  function deriveQuarterly(portfolioStatus) {
    var ps = portfolioStatus || null;
    var data = ps && (ps.data || (ps.quarters ? ps : null));
    if (!data || !data.quarters || typeof data.quarters !== "object") return null;
    var keys = Object.keys(data.quarters).sort(); // "YYYY-Qn" sorts chronologically
    if (!keys.length) return null;
    var key = (data.currentQuarter && data.quarters[data.currentQuarter]) ? data.currentQuarter : keys[keys.length - 1];
    var prevKey = keys[keys.indexOf(key) - 1] || null;

    function grossOf(asset, preferManual) {
      var m = fin(asset.manualValue), s = fin(asset.snapshotValue);
      return preferManual ? (m != null ? m : (s || 0)) : (s != null ? s : (m || 0));
    }
    function rowsOf(quarter, preferManual) {
      var assets = (quarter && Array.isArray(quarter.assets)) ? quarter.assets : [];
      return assets.map(function (a) {
        var t = Q_TYPES[a.type] || { label: a.type || "อื่นๆ", color: "#64748b" };
        var inv = a.type === "cash" ? 0 : Math.max(0, Math.min(100, fin(a.investedPercent) || 0));
        return { name: a.name || t.label, type: Q_TYPES[a.type] ? a.type : "custom", typeLabel: t.label, color: t.color, gross: grossOf(a, preferManual) || 0, invested: inv };
      }).filter(function (r) { return r.gross > 0; });
    }

    var rows = rowsOf(data.quarters[key], true);
    if (!rows.length) return null;
    var total = rows.reduce(function (s, r) { return s + r.gross; }, 0) || 1;
    rows.forEach(function (r) { r.pct = r.gross / total * 100; });
    rows.sort(function (a, b) { return b.gross - a.gross; });

    // group current quarter by type (bucket = type)
    var bt = {};
    rows.forEach(function (r) {
      var g = bt[r.type] || (bt[r.type] = { type: r.type, label: r.typeLabel, color: r.color, gross: 0, invested: 0, assets: [] });
      g.gross += r.gross;
      g.invested += r.type === "cash" ? 0 : r.gross * r.invested / 100;
      g.assets.push({ name: r.name, gross: r.gross, pct: r.pct, investedPct: r.invested });
    });

    // previous quarter (frozen values) grouped by type for QoQ
    var prevByType = {}, prevTotal = 0;
    if (prevKey) {
      rowsOf(data.quarters[prevKey], false).forEach(function (r) {
        prevByType[r.type] = (prevByType[r.type] || 0) + r.gross;
        prevTotal += r.gross;
      });
    }
    function qoq(curr, prev) {
      if (!prevKey || fin(prev) == null) return null;
      return { thb: round(curr - prev), pct: prev > 0 ? round((curr - prev) / prev * 100, 1) : null };
    }

    var byType = Object.keys(bt).map(function (t) {
      var g = bt[t];
      return {
        type: g.type, label: g.label, color: g.color,
        gross: g.gross, pct: g.gross / total * 100,
        invested: g.invested, cash: g.gross - g.invested,
        investedPct: g.gross > 0 ? g.invested / g.gross * 100 : 0,
        qoq: qoq(g.gross, prevByType[g.type] != null ? prevByType[g.type] : (prevKey ? 0 : null)),
        assets: g.assets
      };
    }).sort(function (a, b) { return b.gross - a.gross; });

    var investedSum = 0, cashSum = 0;
    rows.forEach(function (r) {
      if (r.type === "cash") cashSum += r.gross;
      else { investedSum += r.gross * r.invested / 100; cashSum += r.gross * (1 - r.invested / 100); }
    });

    return {
      key: key, prevKey: prevKey, rows: rows, byType: byType,
      total: total, count: rows.length,
      investedSum: investedSum, cashSum: cashSum,
      qoqTotal: prevKey && prevTotal > 0 ? { thb: round(total - prevTotal), pct: round((total - prevTotal) / prevTotal * 100, 1) } : null
    };
  }

  // ---------------------------------------------------------- holdings → buckets
  function bucketForHolding(h) {
    if (!h) return null;
    var pb = String(h.portfolioBucket || "").trim();
    if (BUCKET_KEYS.indexOf(pb) >= 0) return pb; // explicit assignment wins
    var alias = LEGACY_BUCKET_ALIASES[pb.toLowerCase()];
    if (alias !== undefined) return alias;
    var t = String(h.assetType || "").toUpperCase();
    if (t === "CRYPTO") return "bitcoin";
    if (t === "THAI_STOCK" || t === "THAI_INDEX") return "thai-stock";
    if (t === "STOCK" || t === "ETF" || t === "INDEX") return "foreign-stock";
    return null; // THAI_MUTUAL_FUND and unknowns need a user decision (rmf-jang vs rmf-tum)
  }

  function mapHoldings(portfolioHoldings) {
    var arr = portfolioHoldings && Array.isArray(portfolioHoldings.data) ? portfolioHoldings.data
      : (Array.isArray(portfolioHoldings) ? portfolioHoldings : []);
    var held = [], watchlist = [], unassigned = [], byBucket = {};
    arr.forEach(function (h) {
      if (!h || !h.canonicalSymbol) return;
      if (h.isHolding === false || h.watchlistOnly === true) { watchlist.push(h); return; }
      held.push(h);
      var b = bucketForHolding(h);
      if (!b) { unassigned.push(h); return; }
      (byBucket[b] || (byBucket[b] = [])).push(h);
    });
    return { held: held, watchlist: watchlist, unassigned: unassigned, byBucket: byBucket };
  }

  // ---------------------------------------------------------- factual state per ticker
  function tickerState(sym, snapshot) {
    var s = snapshot || {};
    var sc = s.scoring && s.scoring.bySymbol && s.scoring.bySymbol[sym];
    if (!sc && s.technicalSignals && s.technicalSignals[sym] && typeof window !== "undefined" && window.Scoring && typeof window.Scoring.calculateTimingScore === "function") {
      // one-off compute for symbols outside the scored universe — same engine, holding-aware
      try {
        var ts = s.technicalSignals[sym];
        var inp = { ema12: ts.ema12, ema26: ts.ema26, latestPrice: ts.latestClose, sma200: ts.sma200, volumeRatio: ts.volumeRatio, rsi14: ts.rsi14, isHolding: true };
        var timing = window.Scoring.calculateTimingScore(inp);
        var action = window.Scoring.recommendAction(inp, timing);
        sc = {
          signalScore: timing.score, thaiSignalLabel: timing.thaiLabel, color: timing.color,
          thaiFinalAction: action.thaiAction, actionKey: action.key,
          warnings: timing.warnings || []
        };
      } catch (_e) { sc = null; }
    }
    if (!sc) return null;
    return {
      signalScore: fin(sc.signalScore != null ? sc.signalScore : sc.timingScore),
      thaiSignalLabel: sc.thaiSignalLabel || sc.thaiTimingLabel || sc.signalLabel || "",
      thaiFinalAction: sc.thaiFinalAction || sc.thaiAction || "",
      actionKey: sc.actionKey || "",
      color: sc.color || "",
      warnings: (sc.warnings || []).map(function (w) { return w && (w.thaiMessage || w.message) || String(w); }).slice(0, 3)
    };
  }

  function wave3Map(snapshot) {
    var out = {};
    var w3 = snapshot && snapshot.wave3;
    if (!w3 || !w3.universes) return out;
    ["portfolio", "aiBoom", "thailand", "crypto"].forEach(function (u) {
      var sec = w3.universes[u];
      (sec && sec.items || []).forEach(function (it) {
        if (it && it.symbol && !out[it.symbol]) out[it.symbol] = { status: it.status, readiness: it.readiness, quality: it.quality };
      });
    });
    return out;
  }

  // tone bands over the existing 0-100 signal score (facts about the score, not advice)
  function toneOf(score) { return score == null ? null : score >= 60 ? "bull" : score >= 40 ? "neutral" : "bear"; }

  // ---------------------------------------------------------- bucket signal (facts)
  // Bitcoin's canonical score = the Buy Zone Score cached by the Bitcoin Monitor
  // page (Technical + Cycle/MVRV + Holder/Sentiment + Free Stress). Reused here so
  // the Bitcoin bucket matches that page instead of a separate technical calc.
  function readBuyZone() {
    try { var s = (typeof window !== "undefined" && window.localStorage) ? window.localStorage.getItem("portfolio_dashboard_btc_buyzone") : null; return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  function bucketSignal(bucketType, tickers, snapshot) {
    // 4-asset composition present → blend each asset's signal weighted by % held
    // (normalised over the entered %). Cash counts as neutral 50; assets with no data
    // are shown but excluded from the blend (renormalise over what has data).
    var pctItems = (tickers || []).filter(function (t) { return t.percent != null && t.percent > 0; });
    if (pctItems.length) {
      var wsum = 0, acc = 0, cnt = { bull: 0, neutral: 0, bear: 0 }, syms = [];
      pctItems.forEach(function (t) {
        var sc = t.scoring && t.scoring.signalScore != null ? t.scoring.signalScore : null;
        var eff = sc != null ? sc : (t.asset === "cash" ? 50 : null);
        syms.push({ symbol: t.displaySymbol || t.symbol, weight: t.percent, score: eff });
        if (eff == null) return; // no data (and not cash) → excluded from blend
        wsum += t.percent; acc += eff * t.percent;
        var tone = toneOf(eff); if (tone) cnt[tone] += 1;
      });
      return {
        health: wsum > 0 ? Math.round(acc / wsum) : null,
        source: "assets", counts: cnt,
        thai: "จากสัดส่วนสินทรัพย์ " + pctItems.length + " ก้อน (ถ่วงตาม %)",
        symbols: syms
      };
    }
    if (bucketType === "bitcoin") {
      var bz = readBuyZone();
      if (bz && bz.score != null) {
        var tnbz = toneOf(bz.score); var cbz = { bull: 0, neutral: 0, bear: 0 }; if (tnbz) cbz[tnbz] += 1;
        return { health: Math.round(bz.score), source: "buyzone", counts: cbz,
          thai: "จาก BTC Buy Zone Score · " + (bz.mode || "เทคนิค"),
          symbols: [{ symbol: "Buy Zone", weight: 1, score: Math.round(bz.score) }] };
      }
    }
    var scored = (tickers || []).filter(function (t) { return t.scoring && t.scoring.signalScore != null; });
    if (scored.length) {
      var wsum = 0, acc = 0, counts = { bull: 0, neutral: 0, bear: 0 };
      scored.forEach(function (t) {
        var w = fin(t.marketValue) || 0; if (!(w > 0)) w = 1; // equal-weight fallback when values are missing
        wsum += w; acc += t.scoring.signalScore * w;
        var tone = toneOf(t.scoring.signalScore); if (tone) counts[tone] += 1;
      });
      return {
        health: wsum > 0 ? Math.round(acc / wsum) : null,
        source: "holdings", counts: counts,
        thai: "จากตั๋วจริง " + scored.length + " ตัว (ถ่วงน้ำหนักตามมูลค่า)",
        symbols: scored.map(function (t) { return { symbol: t.symbol, weight: fin(t.marketValue) || 0, score: t.scoring.signalScore }; })
      };
    }
    var proxies = BUCKET_PROXIES[bucketType] || [];
    var avail = proxies.map(function (p) {
      var st = tickerState(p.symbol, snapshot);
      return st && st.signalScore != null ? { symbol: p.symbol, weight: p.weight, score: st.signalScore } : null;
    }).filter(Boolean);
    if (avail.length) {
      var wsum2 = 0, acc2 = 0;
      avail.forEach(function (p) { wsum2 += p.weight; acc2 += p.score * p.weight; });
      var health = wsum2 > 0 ? Math.round(acc2 / wsum2) : null;
      var c2 = { bull: 0, neutral: 0, bear: 0 }; var tn = toneOf(health); if (tn) c2[tn] += 1;
      return {
        health: health, source: "proxy", counts: c2,
        thai: "อิงดัชนีตลาด " + avail.map(function (p) { return p.symbol; }).join("+") + " (ยังไม่ระบุไส้ใน)",
        symbols: avail
      };
    }
    return { health: null, source: "none", counts: { bull: 0, neutral: 0, bear: 0 }, thai: "ไม่มีข้อมูลสัญญาณ", symbols: [] };
  }

  // ---------------------------------------------------------- ticker rows per bucket
  function tickerRows(holdings, snapshot, w3map) {
    var rows = (holdings || []).map(function (h) {
      var isAsset = !!h.__asset;
      return {
        symbol: h.canonicalSymbol,
        displaySymbol: h.displaySymbol || h.canonicalSymbol,
        name: h.assetName || h.canonicalSymbol,
        assetType: h.assetType || "",
        marketValue: fin(h.marketValue) || 0,
        percent: h.__percent != null ? fin(h.__percent) : null,   // 4-asset composition (% held)
        asset: h.__asset || null,
        notes: h.notes || "",
        bucket: bucketForHolding(h),
        scoring: isAsset ? assetScoring(h.__asset, snapshot) : tickerState(h.canonicalSymbol, snapshot),
        wave3: isAsset ? null : (w3map[h.canonicalSymbol] || null),
        manual: !!h.__manual, itemId: h.__id || null
      };
    });
    // weight within the bucket: by % when composition items exist, else by market value
    var pctSum = rows.reduce(function (s, r) { return s + (r.percent || 0); }, 0);
    var mvSum = rows.reduce(function (s, r) { return s + r.marketValue; }, 0);
    rows.forEach(function (r) {
      if (r.percent != null && pctSum > 0) r.weightInBucket = round(r.percent / pctSum * 100, 1);
      else r.weightInBucket = mvSum > 0 ? round(r.marketValue / mvSum * 100, 1) : null;
    });
    rows.sort(function (a, b) {
      var av = a.percent != null ? a.percent : a.marketValue;
      var bv = b.percent != null ? b.percent : b.marketValue;
      return bv - av;
    });
    return rows;
  }

  // ============================================================ compute
  function compute(snapshot, opts) {
    opts = opts || {};
    try {
      if (!snapshot || typeof snapshot !== "object") return { available: false, reason: "no-snapshot" };
      var q = deriveQuarterly(snapshot.portfolioStatus);
      if (!q) return { available: false, reason: "no-quarterly", thai: "ยังไม่มีข้อมูลใน Quarterly Editor — กรอกพอร์ตรายไตรมาสก่อน" };

      var H = mapHoldings(snapshot.portfolioHoldings);
      // Portfolio-Position manual per-bucket placements (localStorage overlay via opts).
      // The SAME ticker can live in several buckets — each is its own line item. They
      // flow through tickerRows/bucketSignal like holdings; base ticker drives the signal.
      var manualItems = opts.bucketItems || {};
      Object.keys(manualItems).forEach(function (bk) {
        (manualItems[bk] || []).forEach(function (it) {
          if (!it) return;
          if (it.asset && ASSET_MODEL[it.asset]) {
            // 4-asset composition item: added by % held, signal from the asset's canonical source
            var a = ASSET_MODEL[it.asset];
            var pctv = fin(it.percent); if (pctv == null || !(pctv >= 0)) return;
            (H.byBucket[bk] || (H.byBucket[bk] = [])).push({
              canonicalSymbol: a.symbol || ("CASH-" + bk), displaySymbol: a.display, assetName: a.label,
              assetType: "", marketValue: 0, notes: it.notes || "",
              portfolioBucket: bk, isHolding: true, __manual: true, __id: it.id, __asset: it.asset, __percent: pctv
            });
            return;
          }
          // legacy shape (symbol + THB value) — kept working for older overlay entries
          var sym = String((it.symbol || it.canonicalSymbol) || "").trim().toUpperCase(); if (!sym) return;
          (H.byBucket[bk] || (H.byBucket[bk] = [])).push({
            canonicalSymbol: sym, displaySymbol: it.displaySymbol || sym, assetName: it.name || sym,
            assetType: it.assetType || "", marketValue: fin(it.marketValue) || 0, notes: it.notes || "",
            portfolioBucket: bk, isHolding: true, __manual: true, __id: it.id
          });
        });
      });
      var w3map = wave3Map(snapshot);

      var buckets = q.byType.map(function (g) {
        var tickers = tickerRows(H.byBucket[g.type] || [], snapshot, w3map);
        return {
          type: g.type, label: g.label, color: g.color,
          gross: round(g.gross), pct: round(g.pct, 1),
          invested: round(g.invested), cash: round(g.cash),
          investedPct: round(g.investedPct, 1),
          qoq: g.qoq,
          quarterAssets: g.assets,
          signal: bucketSignal(g.type, tickers, snapshot),
          tickers: tickers
        };
      });

      // buckets that have mapped holdings but no quarterly row → still surface them (facts)
      Object.keys(H.byBucket).forEach(function (t) {
        if (buckets.some(function (b) { return b.type === t; })) return;
        var meta = Q_TYPES[t] || { label: t, color: "#64748b" };
        var tickers = tickerRows(H.byBucket[t], snapshot, w3map);
        buckets.push({
          type: t, label: meta.label, color: meta.color,
          gross: 0, pct: 0, invested: 0, cash: 0, investedPct: 0, qoq: null,
          quarterAssets: [], noQuarterRow: true,
          signal: bucketSignal(t, tickers, snapshot),
          tickers: tickers
        });
      });

      return {
        available: true,
        generatedAt: opts.now || snapshot.loadedAt || snapshot.generatedAt || null,
        quarterKey: q.key, prevQuarterKey: q.prevKey,
        totals: {
          total: round(q.total), investedSum: round(q.investedSum), cashSum: round(q.cashSum),
          investedPct: round(q.investedSum / q.total * 100, 1),
          cashPct: round(q.cashSum / q.total * 100, 1),
          assetCount: q.count, qoq: q.qoqTotal
        },
        buckets: buckets,
        unassigned: tickerRows(H.unassigned, snapshot, w3map),
        watchlistOnly: tickerRows(H.watchlist, snapshot, w3map),
        meta: {
          holdingsCount: H.held.length,
          mappedCount: H.held.length - H.unassigned.length,
          proxyBuckets: buckets.filter(function (b) { return b.signal.source === "proxy"; }).map(function (b) { return b.type; })
        }
      };
    } catch (e) {
      return { available: false, reason: "error", error: String(e && e.message || e) };
    }
  }

  var PortfolioPosition = {
    compute: compute,
    deriveQuarterly: deriveQuarterly,
    mapHoldings: mapHoldings,
    bucketForHolding: bucketForHolding,
    bucketSignal: bucketSignal,
    tickerState: tickerState,
    Q_TYPES: Q_TYPES,
    BUCKET_KEYS: BUCKET_KEYS,
    BUCKET_PROXIES: BUCKET_PROXIES,
    ASSET_MODEL: ASSET_MODEL,
    ASSET_KEYS: ASSET_KEYS,
    assetScoring: assetScoring
  };

  if (typeof window !== "undefined") window.PortfolioPosition = PortfolioPosition;
  if (typeof module !== "undefined" && module.exports) module.exports = PortfolioPosition;
})();
