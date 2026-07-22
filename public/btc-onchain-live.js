(function () {
  "use strict";

  // ============================================================
  // BGeometrics (bitcoin-data.com) on-chain live fetcher — free, no key.
  //
  // Provides EXACT daily on-chain metrics for the Bitcoin Monitor deep-dive
  // cards: MVRV Z-Score, Realized Price, NUPL, SOPR, SSR, LTH Supply.
  //
  // HARD CONSTRAINT: the free tier allows only ~10 requests/HOUR per IP
  // (X-RateLimit-Limit-Hour: 10). Data is DAILY (D-1/D-2), so:
  //   - fetch at most ONCE per calendar day (localStorage day-cache)
  //   - on failure, retry no sooner than the next hour (attempt guard)
  //   - fetch runs in the BROWSER (per-user IP); routing this through the
  //     Vercel serverless IP would burn the shared limit instantly.
  // If the API is unreachable/CORS-blocked, consumers keep their existing
  // Coin Metrics derived values — this module only upgrades, never degrades.
  // ============================================================

  var BASE = "https://bitcoin-data.com/v1/";
  var CACHE_KEY = "btc_bgeo_v1";
  var EVENT = "btc-onchain-live";

  // key → endpoint candidates (first that answers 200 wins; the winner is
  // remembered in the cache so later days spend exactly one request per metric)
  var METRICS = {
    mvrvZScore: { eps: ["mvrv-zscore/last"], pick: /zscore/i },
    realizedPrice: { eps: ["realized-price/last"], pick: /realized/i },
    nupl: { eps: ["nupl/last"], pick: /nupl/i },
    sopr: { eps: ["sopr/last"], pick: /sopr/i },
    ssr: { eps: ["ssr/last"], pick: /ssr/i },
    // exact endpoint name unverified (free-tier rate limit blocked discovery);
    // candidates ordered by likelihood — chart page is supply_lth_sth.html
    lthSupply: { eps: ["lth-supply/last", "supply-lth-sth/last", "lth-sth-supply/last"], pick: /lth/i }
  };

  function today() { return new Date().toISOString().slice(0, 10); }
  function readCache() { try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null") || null; } catch (e) { return null; } }
  function writeCache(c) { try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} }

  // Pull the metric value out of a /last response like
  // {"d":"2026-07-20","unixTs":...,"mvrvZscore":0.4071}. Field names vary per
  // endpoint, so prefer a field matching `pick`, else the first finite number
  // that is not the date/timestamp.
  function parseLast(json, pick) {
    if (!json || typeof json !== "object") return null;
    var date = typeof json.d === "string" ? json.d.slice(0, 10) : null;
    var keys = Object.keys(json).filter(function (k) { return k !== "d" && k !== "unixTs"; });
    var key = null;
    for (var i = 0; i < keys.length; i++) { if (pick && pick.test(keys[i]) && isFinite(Number(json[keys[i]]))) { key = keys[i]; break; } }
    if (!key) { for (var j = 0; j < keys.length; j++) { if (isFinite(Number(json[keys[j]])) && json[keys[j]] !== null) { key = keys[j]; break; } } }
    if (!key) return null;
    var v = Number(json[key]);
    return isFinite(v) ? { value: v, date: date, field: key } : null;
  }

  var state = { loading: false, metrics: {}, fetchedAt: null, error: null };

  function emit() { try { window.dispatchEvent(new CustomEvent(EVENT)) } catch (e) {} }

  async function fetchMetric(key, cfg, resolvedEp) {
    var eps = resolvedEp ? [resolvedEp] : cfg.eps;
    for (var i = 0; i < eps.length; i++) {
      try {
        var res = await window.fetch(BASE + eps[i], { cache: "no-store" });
        if (res.status === 404) continue;             // wrong endpoint candidate
        if (!res.ok) return { rateLimited: res.status === 429 };
        var parsed = parseLast(await res.json(), cfg.pick);
        if (parsed) return { value: parsed.value, date: parsed.date, ep: eps[i] };
        return null;
      } catch (e) { return null; }                     // network/CORS — give up quietly
    }
    return null;
  }

  async function load(force) {
    var cache = readCache() || {};
    if (!force && cache.u === today() && cache.metrics) {
      state.metrics = cache.metrics; state.fetchedAt = cache.at || null;
      emit(); return state;
    }
    // budget guard: never attempt more than once per hour (free tier = 10 req/hr)
    var nowH = Date.now();
    if (!force && cache.lastAttempt && nowH - cache.lastAttempt < 3600000 && cache.u !== today()) {
      state.metrics = cache.metrics || {}; state.fetchedAt = cache.at || null;
      emit(); return state;
    }
    if (state.loading) return state;
    state.loading = true;
    cache.lastAttempt = nowH; writeCache(cache);

    var eps = cache.eps || {};
    var out = {}; var got = 0; var limited = false;
    var keys = Object.keys(METRICS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (limited) break;
      var r = await fetchMetric(k, METRICS[k], eps[k]);
      if (r && r.rateLimited) { limited = true; break; }
      if (r && r.value != null) { out[k] = { value: r.value, date: r.date }; eps[k] = r.ep; got += 1; }
    }

    if (got > 0) {
      // merge over yesterday's values so a partial day never loses metrics
      var merged = Object.assign({}, cache.metrics || {}, out);
      cache = { u: today(), at: new Date().toISOString(), metrics: merged, eps: eps, lastAttempt: nowH };
      writeCache(cache);
      state.metrics = merged; state.fetchedAt = cache.at;
    } else {
      // total failure (rate limit / CORS / offline) — keep stale values, retry next hour
      state.metrics = cache.metrics || {};
      state.fetchedAt = cache.at || null;
      state.error = limited ? "rate-limited" : "unreachable";
    }
    state.loading = false;
    emit();
    return state;
  }

  function get() { return { metrics: state.metrics || {}, fetchedAt: state.fetchedAt, error: state.error }; }

  var BtcOnchainLive = { load: load, get: get, parseLast: parseLast, METRICS: METRICS, EVENT: EVENT, CACHE_KEY: CACHE_KEY };
  if (typeof window !== "undefined") window.BtcOnchainLive = BtcOnchainLive;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcOnchainLive;
})();
