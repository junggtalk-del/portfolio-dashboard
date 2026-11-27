(function () {
  "use strict";

  // ============================================================
  // BtcLtHistory — multi-cycle Bitcoin history for the long-term on-chain signal
  // (Bitcoin Monitor · On-chain Deep Dive) · window.BtcLtHistory + module.exports · ES5
  //
  // Two free, key-less, CORS-open sources, fetched from the BROWSER, each at most once per UTC day:
  //   Coin Metrics community — CapMVRVCur · CapMrktCurUSD · PriceUSD, daily since 2010-07-18
  //     (one page: 5,975 rows on 2026-11-26) → price · mvrv · realizedPrice · mvrvZ (point-in-time, see deriveCm)
  //   Blockchain.com charts — miners-revenue − transaction-fees-usd (USD per day; sampled=false = one point per
  //     day since 2009) → puell (Puell Multiple, see puell)
  // Never BGeometrics: its free quota (10/hour · 15/day per IP) belongs to btc-onchain-live.js.
  //
  // Series = [["YYYY-MM-DD", number], …] ascending, one row per day. Coin Metrics sends numbers as STRINGS;
  // "" / null / junk / ≤ 0 are skipped — never turned into 0 (Number(null) === 0, Number("") === 0).
  //
  // Cache: the whole state sits in IndexedDB (window.BigCache key "btc_lt_hist_v1"), never localStorage
  //   (its 5M-character quota broke the data snapshot once, see big-cache.js). A source pulled today (UTC) is not
  //   pulled again. A failed source keeps its previous series, says why (sources.<name>.ok false + error) and is
  //   not asked again for 10 minutes. load({ force: true }) skips both guards. The two sources succeed or fail
  //   independently; a source succeeds only when every series it feeds came back.
  //
  // State — get(), and what load() resolves to:
  //   { at, series: { price, mvrv, realizedPrice, mvrvZ, puell },   a key is absent until it has rows
  //     sources: { coinMetrics: { at, ok, error, asOf }, blockchain: { at, ok, error, asOf } },
  //     error, loading }
  //   sources.*.at = ISO time of the last SUCCESSFUL pull (Last Updated) · ok = the last attempt worked
  //   (null = not tried yet) · error = why it did not · asOf = newest data day · at = newest of the two ·
  //   error = "Coin Metrics: HTTP 503 · Blockchain.com: timeout" (failing sources only) or null.
  //   The series arrays are shared, not copied — read them, do not change them.
  // EVENT "btc-lt-history" fires when a pull starts (loading true — cached series are already in, so the page can
  // draw them) and when load() ends. Call load() once per page view or from a refresh button — not from the
  // EVENT handler (every load() that is not already running ends with an EVENT).
  // ============================================================

  // 2026-11-27: OUR server is asked first — some networks reset every connection to crypto sites, but our own domain
  // always answers (api/bitcoin.js ?lt=history pulls both sources with this file's own functions, CDN-cached).
  // A source the server could not give (or gave unclean) is pulled directly as before. sources.<name>.via says how.
  var SERVER_URL = "/api/bitcoin?lt=history";
  var CM_HOST = "https://community-api.coinmetrics.io/";
  var CM_URL = CM_HOST + "v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur,CapMrktCurUSD,PriceUSD&frequency=1d&page_size=10000&sort=time";
  function BC_URL(chart) { return "https://api.blockchain.info/charts/" + chart + "?timespan=all&sampled=false&format=json&cors=true"; }
  var CHARTS = { revenue: "miners-revenue", fees: "transaction-fees-usd" };
  var EVENT = "btc-lt-history";
  var CACHE_KEY = "btc_lt_hist_v1";
  var CACHE_V = 1;
  var Z_MIN_ROWS = 365;          // mvrvZ starts once σ has a year of market caps behind it
  var PUELL_DAYS = 365;          // Puell window = the dates in [t − 364, t]
  var PUELL_MIN = 300;           // … holding at least 300 issuance values
  var RETRY_MS = 10 * 60000;     // a source that just failed is not asked again for 10 minutes (unless forced)
  var TIMEOUT_MS = 60000;        // one request, headers and body, settles within this
  var CM_MAX_PAGES = 10;         // today one page holds everything; stopping early would keep the OLDEST rows
  var SOURCES = ["coinMetrics", "blockchain"];
  var NAMES = { coinMetrics: "Coin Metrics", blockchain: "Blockchain.com" };
  var SERIES_OF = { coinMetrics: ["price", "mvrv", "realizedPrice", "mvrvZ"], blockchain: ["puell"] };
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var DAY_MS = 86400000;

  // ---------------------------------------------------------- helpers
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  // a finite number from a number or a non-blank numeric string — null / "" / "  " / booleans are NOT 0
  function num(x) {
    if (typeof x === "number") return isFinite(x) ? x : null;
    if (typeof x !== "string" || x.replace(/^\s+|\s+$/g, "") === "") return null;
    var n = Number(x);
    return isFinite(n) ? n : null;
  }
  function positive(x) { var n = num(x); return n !== null && n > 0 ? n : null; }
  function toSeries(byDay) { return Object.keys(byDay).sort().map(function (d) { return [d, byDay[d]]; }); }
  // valid [date, number] rows only, ascending by date — inputs may come from anywhere
  function rowsOf(s) {
    if (!Array.isArray(s)) return [];
    return s.filter(function (r) {
      return Array.isArray(r) && typeof r[0] === "string" && DATE_RE.test(r[0]) && typeof r[1] === "number" && isFinite(r[1]);
    }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  }
  function mapOf(rows) { var m = {}; rows.forEach(function (r) { m[r[0]] = r[1]; }); return m; }
  function dayNum(d) { return Math.round(Date.parse(d + "T00:00:00Z") / DAY_MS); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function str(x) { return typeof x === "string" && x ? x : null; }
  function errText(e) { return e && e.message ? String(e.message) : String(e || "error"); }

  // ---------------------------------------------------------- Coin Metrics
  // { data: [{ time: "2010-07-18T00:00:00.000000000Z", CapMVRVCur: "146.03", CapMrktCurUSD: "295959.15", PriceUSD: "0.0858" }, …] }
  // → { price, mvrv, marketCap } · each metric on its own (a row may carry one and not another) · a later row of the same day wins
  function parseCoinMetrics(json) {
    var rows = json && Array.isArray(json.data) ? json.data : [];
    var price = {}, mvrv = {}, mcap = {};
    rows.forEach(function (r) {
      if (!r || typeof r.time !== "string") return;
      var d = r.time.slice(0, 10), v;
      if (!DATE_RE.test(d)) return;
      if ((v = positive(r.PriceUSD)) !== null) price[d] = v;
      if ((v = positive(r.CapMVRVCur)) !== null) mvrv[d] = v;
      if ((v = positive(r.CapMrktCurUSD)) !== null) mcap[d] = v;
    });
    return { price: toSeries(price), mvrv: toSeries(mvrv), marketCap: toSeries(mcap) };
  }

  // realizedPrice = price ÷ MVRV (= realized cap ÷ supply), on days that have both
  // mvrvZ = POINT-IN-TIME MVRV Z-Score: (marketCap − realizedCap) ÷ σ, realizedCap = marketCap ÷ MVRV and σ = the
  //   population standard deviation of EVERY market-cap row up to and including that day (Welford, running) — a day
  //   never sees a later row, so a backtest cannot peek. Charts that divide by the σ of the whole history (later rows
  //   included) show other values; this one is for scoring and backtests — the Deep Dive card keeps BGeometrics' value.
  //   Starts at the 365th market-cap row · σ 0 → no value · a day without MVRV has no Z but its market cap enters σ.
  function deriveCm(cm) {
    cm = cm || {};
    var price = rowsOf(cm.price), mvrv = rowsOf(cm.mvrv), mcap = rowsOf(cm.marketCap);
    var mv = mapOf(mvrv);
    var realizedPrice = [];
    price.forEach(function (r) { if (has(mv, r[0]) && mv[r[0]] > 0) realizedPrice.push([r[0], r[1] / mv[r[0]]]); });
    var mvrvZ = [], n = 0, mean = 0, m2 = 0;
    mcap.forEach(function (r) {
      var x = r[1], delta = x - mean;
      n += 1;
      mean += delta / n;
      m2 += delta * (x - mean);
      if (n < Z_MIN_ROWS || !has(mv, r[0]) || !(mv[r[0]] > 0)) return;
      var sd = Math.sqrt(m2 / n);
      if (!(sd > 0)) return;
      var z = (x - x / mv[r[0]]) / sd;
      if (isFinite(z)) mvrvZ.push([r[0], z]);
    });
    return { price: price, mvrv: mvrv, realizedPrice: realizedPrice, mvrvZ: mvrvZ };
  }

  // ---------------------------------------------------------- Blockchain.com
  // { values: [{ x: unix SECONDS, y }, …] } → Series by UTC day · the day's latest point wins (ties: the later one listed)
  // a stamp in milliseconds would land in another millennium → its date is not YYYY-MM-DD → dropped
  function parseBlockchain(json) {
    var vals = json && Array.isArray(json.values) ? json.values : [];
    var by = {}, at = {};
    vals.forEach(function (p) {
      if (!p) return;
      var x = num(p.x), y = num(p.y);
      if (x === null || y === null || !(Math.abs(x) <= 8.64e12)) return;   // outside Date's range → toISOString would throw
      var d = new Date(x * 1000).toISOString().slice(0, 10);
      if (!DATE_RE.test(d) || (has(at, d) && at[d] > x)) return;
      at[d] = x;
      by[d] = y;
    });
    return toSeries(by);
  }

  // Puell Multiple = daily issuance (USD) ÷ the mean daily issuance of the dates in [t − 364, t]
  //   issuance = miners' revenue − transaction fees, only on days where both are > 0 and revenue > fees
  //   the window counts DATES, not rows (a gap shrinks it) · a value needs ≥ 300 issuance days in its window
  //   only past days enter the window → point-in-time by construction
  function puell(revenue, fees) {
    var fee = mapOf(rowsOf(fees)), iss = [];
    rowsOf(revenue).forEach(function (r) {
      if (!(r[1] > 0) || !has(fee, r[0]) || !(fee[r[0]] > 0)) return;
      var v = r[1] - fee[r[0]];
      if (v > 0) iss.push([r[0], v, dayNum(r[0])]);
    });
    var out = [], left = 0, sum = 0;
    for (var i = 0; i < iss.length; i++) {
      sum += iss[i][1];
      while (iss[left][2] < iss[i][2] - (PUELL_DAYS - 1)) { sum -= iss[left][1]; left += 1; }
      var n = i - left + 1;
      if (n >= PUELL_MIN) out.push([iss[i][0], iss[i][1] / (sum / n)]);
    }
    return out;
  }

  // ---------------------------------------------------------- loader
  function blankSource() { return { at: null, ok: null, error: null, asOf: null, tried: null, via: null }; }
  var state = { at: null, series: {}, sources: { coinMetrics: blankSource(), blockchain: blankSource() }, error: null, loading: false };
  var hydrated = false;
  var inflight = null;

  function bigCache() { return window.BigCache && typeof window.BigCache.get === "function" && typeof window.BigCache.set === "function" ? window.BigCache : null; }
  function emit() { try { window.dispatchEvent(new CustomEvent(EVENT)); } catch (e) { /* no window events here */ } }

  // one request, headers and body, settles within TIMEOUT_MS — a hung connection must not leave the panel loading forever
  function getJson(url) {
    return new Promise(function (resolve, reject) {
      var done = false, timer = null;
      function settle(fn, v) {
        if (done) return;
        done = true;
        if (timer !== null && typeof window.clearTimeout === "function") window.clearTimeout(timer);
        fn(v);
      }
      if (typeof window.setTimeout === "function") timer = window.setTimeout(function () { settle(reject, new Error("timeout")); }, TIMEOUT_MS);
      Promise.resolve().then(function () { return window.fetch(url, { cache: "no-store" }); }).then(function (res) {
        if (!res || !res.ok) throw new Error("HTTP " + (res ? res.status : "?"));
        return res.json();
      }).then(function (j) { settle(resolve, j); }, function (e) { settle(reject, e); });
    });
  }

  function fetchCoinMetrics() {
    var rows = [], pages = 0;
    function page(url) {
      pages += 1;
      return getJson(url).then(function (json) {
        if (!json || !Array.isArray(json.data)) throw new Error("unexpected response");
        rows = rows.concat(json.data);
        var next = json.next_page_url;
        if (next == null || next === "") return null;
        // more rows on another page — follow it on Coin Metrics only, a few pages at most
        if (typeof next !== "string" || next.indexOf(CM_HOST) !== 0 || pages >= CM_MAX_PAGES) throw new Error("incomplete (more pages)");
        return page(next);
      });
    }
    return page(CM_URL).then(function () {
      var d = deriveCm(parseCoinMetrics({ data: rows }));
      if (!d.price.length || !d.mvrv.length || !d.realizedPrice.length || !d.mvrvZ.length) return { ok: false, error: "no usable rows" };
      return { ok: true, series: { price: d.price, mvrv: d.mvrv, realizedPrice: d.realizedPrice, mvrvZ: d.mvrvZ } };
    }, function (e) { return { ok: false, error: errText(e) }; });
  }

  function fetchBlockchain() {
    return Promise.all([getJson(BC_URL(CHARTS.revenue)), getJson(BC_URL(CHARTS.fees))]).then(function (js) {
      var p = puell(parseBlockchain(js[0]), parseBlockchain(js[1]));
      return p.length ? { ok: true, series: { puell: p } } : { ok: false, error: "no usable rows" };
    }, function (e) { return { ok: false, error: errText(e) }; });
  }

  // the server's rows are trusted only when clean: [day, finite number], days strictly ascending
  function cleanRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!Array.isArray(r) || typeof r[0] !== "string" || !DATE_RE.test(r[0]) || typeof r[1] !== "number" || !isFinite(r[1])) return null;
      if (i > 0 && !(rows[i - 1][0] < r[0])) return null;
    }
    return rows;
  }
  function fromServer(j, name) {
    var r = j && typeof j === "object" ? j[name] : null;
    if (!r || r.ok !== true || !r.series || typeof r.series !== "object") return null;
    var series = {};
    for (var i = 0; i < SERIES_OF[name].length; i++) {
      var k = SERIES_OF[name][i], rows = cleanRows(r.series[k]);
      if (!rows) return null;
      series[k] = rows;
    }
    return { ok: true, series: series, via: "server" };
  }
  function viaDirect(p) { return p.then(function (r) { r.via = "direct"; return r; }); }

  function summarize() {
    var at = null, errs = [];
    SOURCES.forEach(function (s) {
      var src = state.sources[s];
      if (src.at && (!at || src.at > at)) at = src.at;
      if (src.ok === false) errs.push(NAMES[s] + ": " + (src.error || "error"));
    });
    state.at = at;
    state.error = errs.length ? errs.join(" · ") : null;
  }

  // a pull's result → state: success replaces every series of that source; failure keeps the old ones
  function apply(name, r, at) {
    var src = state.sources[name], asOf = null;
    src.tried = at;
    if (!r.ok) { src.ok = false; src.error = r.error || "error"; return; }
    SERIES_OF[name].forEach(function (k) {
      var rows = r.series[k];
      state.series[k] = rows;
      if (!asOf || rows[rows.length - 1][0] > asOf) asOf = rows[rows.length - 1][0];
    });
    src.at = at; src.ok = true; src.error = null; src.asOf = asOf; src.via = r.via || null;
  }

  // a source is due unless it was pulled today (UTC) or failed less than RETRY_MS ago
  function due(src, day, now) {
    if (src.at && src.at.slice(0, 10) === day) return false;
    var ago = src.ok === false && src.tried ? now - Date.parse(src.tried) : NaN;
    return !(ago >= 0 && ago < RETRY_MS);
  }

  // yesterday's (or today's) pull from IndexedDB — once per page view
  function hydrate() {
    if (hydrated) return Promise.resolve();
    hydrated = true;
    var bc = bigCache();
    if (!bc) return Promise.resolve();
    return Promise.resolve().then(function () { return bc.get(CACHE_KEY); }).then(function (rec) {
      if (!rec || rec.v !== CACHE_V || !rec.series || typeof rec.series !== "object") return;
      SOURCES.forEach(function (s) {
        SERIES_OF[s].forEach(function (k) { var rows = rec.series[k]; if (Array.isArray(rows) && rows.length) state.series[k] = rows; });
        var r = rec.sources && rec.sources[s];
        if (r && typeof r === "object") state.sources[s] = { at: str(r.at), ok: typeof r.ok === "boolean" ? r.ok : null, error: str(r.error), asOf: str(r.asOf), tried: str(r.tried), via: str(r.via) };
      });
      summarize();
    }, function () { /* IndexedDB unreadable → start empty */ });
  }

  function save() {
    var bc = bigCache();
    if (!bc) return Promise.resolve(false);
    var series = {}, sources = {};
    Object.keys(state.series).forEach(function (k) { series[k] = state.series[k]; });
    SOURCES.forEach(function (s) { var x = state.sources[s]; sources[s] = { at: x.at, ok: x.ok, error: x.error, asOf: x.asOf, tried: x.tried, via: x.via }; });
    return Promise.resolve().then(function () {
      return bc.set(CACHE_KEY, { v: CACHE_V, at: state.at, series: series, sources: sources });
    }).then(null, function () { return false; });
  }

  // load({ force }) → Promise<State> · a call while one is running gets that same promise
  function load(opts) {
    if (inflight) return inflight;
    var force = !!(opts && opts.force);
    var p = hydrate().then(function () {
      var day = today(), now = Date.now();
      var want = SOURCES.filter(function (s) { return force || due(state.sources[s], day, now); });
      if (!want.length) return false;
      state.loading = true;
      emit();
      // our server first (one request, both sources) · what it could not give comes directly from the source
      return getJson(SERVER_URL).then(null, function () { return null; }).then(function (sj) {
        return Promise.all(want.map(function (s) {
          return fromServer(sj, s) || viaDirect(s === "coinMetrics" ? fetchCoinMetrics() : fetchBlockchain());
        }));
      }).then(function (results) {
        var at = new Date().toISOString();
        want.forEach(function (s, i) { apply(s, results[i], at); });
        summarize();
        return true;
      });
    }).then(function (pulled) {
      state.loading = false;
      inflight = null;
      emit();
      return pulled ? save() : null;
    }, function (e) {
      // not expected (each pull settles to { ok:false }) — keep what we have and say so
      state.loading = false;
      inflight = null;
      state.error = state.error || errText(e);
      emit();
      return null;
    }).then(function () { return get(); });
    inflight = p;
    return p;
  }

  function get() {
    var series = {};
    Object.keys(state.series).forEach(function (k) { series[k] = state.series[k]; });
    function pub(s) { return { at: s.at, ok: s.ok, error: s.error, asOf: s.asOf, via: s.via }; }
    return { at: state.at, series: series, sources: { coinMetrics: pub(state.sources.coinMetrics), blockchain: pub(state.sources.blockchain) }, error: state.error, loading: state.loading };
  }

  var BtcLtHistory = {
    CM_URL: CM_URL, BC_URL: BC_URL, CHARTS: CHARTS, EVENT: EVENT, CACHE_KEY: CACHE_KEY, NAMES: NAMES,
    Z_MIN_ROWS: Z_MIN_ROWS, PUELL_DAYS: PUELL_DAYS, PUELL_MIN: PUELL_MIN, RETRY_MS: RETRY_MS,
    parseCoinMetrics: parseCoinMetrics, deriveCm: deriveCm, parseBlockchain: parseBlockchain, puell: puell,
    load: load, get: get
  };
  if (typeof window !== "undefined") window.BtcLtHistory = BtcLtHistory;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcLtHistory;
})();
