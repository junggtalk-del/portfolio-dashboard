(function () {
  "use strict";

  // ============================================================
  // BGeometrics (bitcoin-data.com) on-chain live fetcher — free, no key.
  //
  // Provides EXACT daily on-chain metrics for the Bitcoin Monitor deep-dive
  // cards: MVRV Z-Score, Realized Price, NUPL, RUP, SOPR, SSR, LTH Supply —
  // plus (2026-11-26, for the long-term signal) LTH Realized Price, LTH-SOPR and
  // the Active Investor Price — the latest value AND ~4 years of daily history.
  // One history request per endpoint replaces the old /last request (same
  // request count); the newest row is the latest value.
  // Every row must fall inside PLAUSIBLE (the range the metric can really take):
  // a wrong unit / wrong field is dropped while parsing, so it never becomes the
  // latest value or a chart point — nothing left = no value (Data Unavailable).
  //
  // HARD CONSTRAINT: the free tier allows only ~10 requests/HOUR and 15/DAY per IP
  // (X-RateLimit-Limit-Hour: 10 · X-RateLimit-Limit-Day: 15, seen 2026-11-23) —
  // this module spends 11 a day (one per endpoint; LTH Supply = 2) and sends at most
  // RUN_MAX_REQ = 10 in one run (the hourly allowance) — the 11th goes an hour later
  // by itself, so the loader never causes a 429. A full run is the whole hourly
  // allowance: another tab or device on the same IP within that hour gets 429s, and
  // what it missed stays pending for the next hour. A 429 carries no CORS header, so
  // the browser logs it as a CORS error.
  // Data is DAILY (D-1/D-2), so:
  //   - fetch at most ONCE per calendar day (localStorage day-cache)
  //   - on failure, retry no sooner than the next hour (attempt guard)
  //   - fetch runs in the BROWSER (per-user IP); routing this through the
  //     Vercel serverless IP would burn the shared limit instantly.
  // History lives in IndexedDB (window.BigCache) — never localStorage, whose
  // 5M-character quota already broke the data snapshot once (2026-11-10).
  // If the API is unreachable/CORS-blocked, consumers keep their existing
  // Coin Metrics derived values — this module only upgrades, never degrades.
  // ============================================================

  var BASE = "https://bitcoin-data.com/v1/";
  var CACHE_KEY = "btc_bgeo_v1";            // latest values + bookkeeping (small)
  var CACHE_V = 2;                          // 2 = history mode (v1 day-caches fetched /last only)
  var SERIES_KEY = "btc_bgeo_hist_v1:";     // + metric key → { at, rows: [[YYYY-MM-DD, value], …] } in BigCache
  var HIST_DAYS = 1461;                     // the free tier serves ~4 years
  var EVENT = "btc-onchain-live";

  // key → history endpoint(s) and the value field (`pick`). Several parts are
  // summed day by day. Endpoint names + fields verified in
  // api.bgeometrics.com/v3/api-docs (2026-11-23); the 4 added 2026-11-26 were read
  // from a saved copy of that spec (their /last schemas name the fields) — no request.
  // Request order = this order (a rate limit mid-run leaves the rest pending).
  var METRICS = {
    mvrvZScore: { parts: [{ ep: "mvrv-zscore", pick: /zscore/i }] },
    realizedPrice: { parts: [{ ep: "realized-price", pick: /realized/i }] },
    nupl: { parts: [{ ep: "nupl", pick: /nupl/i }] },
    // RUP (Relative Unrealized Profit) — BGeometrics calls it NUP "Net Unrealized
    // Profit": unrealized profit of coins in profit ÷ market cap · field nupProfit
    rup: { parts: [{ ep: "nup", pick: /nup/i }] },
    sopr: { parts: [{ ep: "sopr", pick: /sopr/i }] },
    ssr: { parts: [{ ep: "ssr", pick: /ssr/i }] },
    // LTH supply (BTC) = LTH coins in profit + LTH coins in loss — the pair verified live on 2026-11-23.
    // (BGeometrics' single long-term-hodler-supply-btc endpoint was never called for real, so the existing
    // card stays on the verified pair; switch only after comparing the two on overlapping days.)
    lthSupply: { parts: [{ ep: "supply-profit-lth", pick: /profit/i }, { ep: "supply-loss-lth", pick: /loss/i }] },
    // long-term holders' cost basis · field lthRealizedPrice
    lthRealizedPrice: { parts: [{ ep: "lth-realized-price", pick: /realized|price/i }] },
    // SOPR of long-term holders' spent coins · field lthSopr
    lthSopr: { parts: [{ ep: "lth-sopr", pick: /sopr/i }] },
    // Active Investor Price — BGeometrics names it True Market Mean · field trueMarketMean
    activeInvestorPrice: { parts: [{ ep: "true-market-mean", pick: /mean|price/i }] }
  };

  // The range each metric can really take. A row outside it is a wrong unit or a
  // wrong field (e.g. satoshis for BTC, a ratio in a price field) and is dropped —
  // on parse, on restore from IndexedDB, and for values cached before this gate.
  var PLAUSIBLE = {
    mvrvZScore: [-5, 25], realizedPrice: [1e3, 1e6], nupl: [-1, 1], rup: [0, 1.5], sopr: [0.3, 3], ssr: [0, 500],
    lthSupply: [5e6, 2.1e7], lthRealizedPrice: [1e3, 1e6], lthSopr: [0.1, 100], activeInvestorPrice: [1e3, 1e6]
  };
  function plausible(key, v) {
    if (!Object.prototype.hasOwnProperty.call(PLAUSIBLE, key)) return true;
    return typeof v === "number" && v >= PLAUSIBLE[key][0] && v <= PLAUSIBLE[key][1];
  }
  function keepPlausible(rows, key) { return (rows || []).filter(function (r) { return plausible(key, r[1]); }); }
  // { key: {value, date} } from the day-cache → only values that pass the gate
  function plausibleMetrics(m) {
    var out = {};
    Object.keys(m || {}).forEach(function (k) { if (m[k] && plausible(k, m[k].value)) out[k] = m[k]; });
    return out;
  }

  function today() { return new Date().toISOString().slice(0, 10); }
  function startDay() { return new Date(Date.now() - HIST_DAYS * 86400000).toISOString().slice(0, 10); }
  function readCache() { try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null") || null; } catch (e) { return null; } }
  function writeCache(c) { try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} }

  // a real number or numeric string only — Number(null) / Number("") / Number(false)
  // are 0, which would show a missing value as a real 0 (responses carry `delayed:false`)
  function isNum(x) { return typeof x === "number" ? isFinite(x) : typeof x === "string" && x.trim() !== "" && isFinite(Number(x)); }

  // One row like {"d":"2026-07-20","unixTs":...,"mvrvZscore":0.4071} → {value, date, field}.
  // Field names vary per endpoint, so prefer a field matching `pick`, else the
  // first number that is not the date/timestamp.
  function parseLast(json, pick) {
    if (!json || typeof json !== "object") return null;
    var date = typeof json.d === "string" ? json.d.slice(0, 10) : null;
    var keys = Object.keys(json).filter(function (k) { return k !== "d" && k !== "unixTs"; });
    var key = null;
    for (var i = 0; i < keys.length; i++) { if (pick && pick.test(keys[i]) && isNum(json[keys[i]])) { key = keys[i]; break; } }
    if (!key && pick && keys.some(function (k) { return pick.test(k); })) return null;   // the metric's own field is empty
    if (!key) { for (var j = 0; j < keys.length; j++) { if (isNum(json[keys[j]])) { key = keys[j]; break; } } }
    if (!key) return null;
    var v = Number(json[key]);
    return isFinite(v) ? { value: v, date: date, field: key } : null;
  }

  // A history response (array of rows · or a page object {content:[…]}) →
  // [[YYYY-MM-DD, value], …] ascending, one row per day, empty values dropped.
  function parseSeries(json, pick) {
    var rows = Array.isArray(json) ? json : json && Array.isArray(json.content) ? json.content : json && Array.isArray(json.data) ? json.data : null;
    if (!rows) { var one = parseLast(json, pick); return one && one.date ? [[one.date, one.value]] : []; }
    var byDay = {};
    rows.forEach(function (r) { var p = parseLast(r, pick); if (p && p.date) byDay[p.date] = p.value; });
    return Object.keys(byDay).sort().map(function (d) { return [d, byDay[d]]; });
  }

  // parts summed by date — only days every part has (a half-summed day would be a fake dip)
  function sumByDate(lists) {
    if (lists.length === 1) return lists[0];
    var maps = lists.map(function (l) { var m = {}; l.forEach(function (r) { m[r[0]] = r[1]; }); return m; });
    return lists[0].filter(function (r) { return maps.every(function (m) { return Object.prototype.hasOwnProperty.call(m, r[0]); }); })
      .map(function (r) { return [r[0], maps.reduce(function (s, m) { return s + m[r[0]]; }, 0)]; });
  }

  var state = { loading: false, metrics: {}, series: {}, fetchedAt: null, error: null, retryAt: null };
  var RETRY_MS = 3600000;          // once per hour at most (free tier 10/hour)
  var RUN_MAX_REQ = 10;            // requests in one run (= the hourly allowance) — the rest wait for the next hour
  var retryTimer = null;
  // while metrics are still missing, try again by itself when the hourly guard opens
  // (the viewer does not have to reload) · one timer at a time
  // Several open tabs share one quota: a random 0–90 s spread lets the first tab's attempt
  // (it stamps lastAttempt before fetching) hold the others back; a tab that sees another
  // tab's attempt from the last 3 minutes looks again in 2 minutes to pick up its result.
  function scheduleRetry(lastAttempt, soonMs) {
    state.retryAt = (lastAttempt || Date.now()) + RETRY_MS;
    if (retryTimer || typeof window.setTimeout !== "function") return;
    var wait = soonMs || Math.max(60000, state.retryAt - Date.now() + 5000 + Math.floor(Math.random() * 90000));
    retryTimer = window.setTimeout(function () { retryTimer = null; load(false); }, wait);
  }

  function emit() { try { window.dispatchEvent(new CustomEvent(EVENT)); } catch (e) {} }
  function bigCache() { return window.BigCache && typeof window.BigCache.get === "function" ? window.BigCache : null; }
  function saveSeries(k, rows) { var bc = bigCache(); if (bc) bc.set(SERIES_KEY + k, { at: new Date().toISOString(), rows: rows }); }
  // series not fetched in this page view come from IndexedDB (yesterday's are fine — trends move slowly)
  function loadSeries(keys) {
    var bc = bigCache();
    var want = keys.filter(function (k) { return !state.series[k]; });
    if (!bc || !want.length) return Promise.resolve();
    return Promise.all(want.map(function (k) {
      return bc.get(SERIES_KEY + k).then(function (v) {
        var rows = v && Array.isArray(v.rows) ? keepPlausible(v.rows, k) : [];
        if (rows.length) state.series[k] = rows;
      }, function () {});
    }));
  }

  async function fetchMetric(key) {
    var cfg = METRICS[key];
    var lists = [];
    for (var i = 0; i < cfg.parts.length; i++) {
      var part = cfg.parts[i];
      try {
        var res = await window.fetch(BASE + part.ep + "?startday=" + startDay() + "&size=2000", { cache: "no-store" });
        if (!res.ok) return res.status === 429 ? { rateLimited: true } : null;
        var rows = parseSeries(await res.json(), part.pick);
        if (!rows.length) return null;
        lists.push(rows);
      } catch (e) {
        // In a browser a 429 arrives WITHOUT a CORS header, so it surfaces here as a network
        // error — indistinguishable from offline. Either way the next request would fail too:
        // stop the whole run (seen 2026-11-23: 8 blocked requests in a row while the quota was out).
        return { blocked: true };
      }
    }
    var series = keepPlausible(sumByDate(lists), key);   // the newest PLAUSIBLE row is the latest value
    if (!series.length) return null;
    var last = series[series.length - 1];
    return { value: last[1], date: last[0], series: series };
  }

  async function load(force) {
    var cache = readCache() || {};
    if (cache.metrics) cache.metrics = plausibleMetrics(cache.metrics);
    var keys = Object.keys(METRICS);
    var fresh = cache.u === today() && cache.v === CACHE_V && !!cache.metrics;
    // `tried` = metrics already requested today. A metric added after today's fetch
    // (or cut off by a rate limit) is requested alone later the same day — the
    // others are never re-requested (free tier ~10/hour · 15/day per IP).
    var tried = fresh ? (cache.tried || []) : [];
    var pending = keys.filter(function (k) { return tried.indexOf(k) < 0; });
    if (!force && fresh && pending.length === 0) {
      state.metrics = cache.metrics; state.fetchedAt = cache.at || null;
      state.error = null; state.retryAt = null;
      await loadSeries(keys);
      emit(); return state;
    }
    // budget guard: never attempt more than once per hour (free tier = 10 req/hr)
    var nowH = Date.now();
    if (!force && cache.lastAttempt && nowH - cache.lastAttempt < RETRY_MS) {
      state.metrics = cache.metrics || {}; state.fetchedAt = cache.at || null;
      state.error = cache.err || null;              // why the last attempt came back short (kept across reloads)
      scheduleRetry(cache.lastAttempt, nowH - cache.lastAttempt < 180000 ? 120000 : 0);
      await loadSeries(keys);
      emit(); return state;
    }
    if (state.loading) return state;
    state.loading = true;
    cache.lastAttempt = nowH; writeCache(cache);

    var out = {}; var got = 0; var limited = false;
    var toFetch = fresh && !force ? pending : keys;
    var done = [], reqs = 0;
    for (var i = 0; i < toFetch.length; i++) {
      var k = toFetch[i];
      // never past the hourly allowance in one run: what is left stays owed → scheduleRetry below
      if (reqs + METRICS[k].parts.length > RUN_MAX_REQ) break;
      reqs += METRICS[k].parts.length;
      var r = await fetchMetric(k);
      if (r && (r.rateLimited || r.blocked)) { limited = r.rateLimited ? "rate-limited" : "blocked"; break; }
      done.push(k);
      if (r && r.value != null) {
        out[k] = { value: r.value, date: r.date }; got += 1;
        state.series[k] = r.series; saveSeries(k, r.series);
      }
    }
    var triedNow = (fresh && !force ? tried : []).concat(done);   // pending ∩ tried = ∅
    var err = limited || (got < done.length ? "unreachable" : null);

    if (got > 0) {
      // merge over yesterday's values so a partial day never loses metrics
      var merged = Object.assign({}, cache.metrics || {}, out);
      cache = { v: CACHE_V, u: today(), at: new Date().toISOString(), metrics: merged, lastAttempt: nowH, tried: triedNow, err: limited ? err : null };
      writeCache(cache);
      state.metrics = merged; state.fetchedAt = cache.at;
      state.error = cache.err;
    } else if (fresh) {
      // today's values stay; the new metric answered nothing (404 / no value) — not again today
      cache.tried = triedNow; cache.err = err; writeCache(cache);
      state.metrics = cache.metrics; state.fetchedAt = cache.at || null;
      state.error = err;
    } else {
      // total failure (rate limit / CORS / offline) — keep stale values, retry next hour
      cache.err = err || "unreachable"; writeCache(cache);
      state.metrics = cache.metrics || {};
      state.fetchedAt = cache.at || null;
      state.error = cache.err;
    }
    // metrics still owed today (cut by a rate limit, or a failed day) → try again in an hour by itself
    if (cache.u !== today() || keys.some(function (k) { return triedNow.indexOf(k) < 0; })) scheduleRetry(nowH);
    else state.retryAt = null;
    await loadSeries(keys);
    state.loading = false;
    emit();
    return state;
  }

  function get() { return { metrics: state.metrics || {}, series: state.series || {}, fetchedAt: state.fetchedAt, error: state.error, retryAt: state.retryAt, loading: state.loading }; }

  var BtcOnchainLive = { load: load, get: get, parseLast: parseLast, parseSeries: parseSeries, sumByDate: sumByDate,
    keepPlausible: keepPlausible, METRICS: METRICS, PLAUSIBLE: PLAUSIBLE, EVENT: EVENT, CACHE_KEY: CACHE_KEY, SERIES_KEY: SERIES_KEY };
  if (typeof window !== "undefined") window.BtcOnchainLive = BtcOnchainLive;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcOnchainLive;
})();
