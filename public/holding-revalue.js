(function (root) {
  "use strict";
  // ============================================================
  // HoldingRevalue — the THB market value of each USD-priced foreign stock in the
  // AI Portfolio Manager "Current Portfolio" follows the daily close (USD close ×
  // USD/THB) from the moment the user typed it (user ask 2026-11-24: "ถ้ามูลค่าหุ้น
  // แต่ละวันเปลี่ยน ก็ให้มูลค่าใน Current Portfolio เปลี่ยนตามไปด้วย · แก้เองได้เหมือนเดิม").
  //
  // Anchor (columns that already exist on the holding row, unused before):
  //   latestPriceDate = the US close the value corresponds to · latestPrice = THB per share then
  //   (the holding's currency is THB). Typing a value clears both.
  // Only FINAL closes count: a bar is final after 21:30 UTC of its day (16:00 New York, EST + margin)
  //   — a Load Latest Data during the US session sees a live bar; using it would lose the gap
  //   between that live price and the real close for good (review C1, 2026-11-24).
  // A value typed in the last 5 days is anchored at the last final close BEFORE the typing time,
  //   and only from a price series fetched after the typing (its lastUpdated; an older one cannot know that close) —
  //   then it is moved to the newest close in the same pass. So a stale snapshot never makes a
  //   move count twice, and moves between typing and the first good run are not dropped (C2/I2).
  //   Older un-anchored rows (before this feature) are anchored at the newest close without moving.
  // Revalue: value × close(now)/close(anchor day) × fx(now)/fx(anchor day), both closes from the
  //   SAME series, exact days only (split-adjusted → a split does not crater the value). No close on
  //   the anchor day → stored THB price, refusing moves > 35% (a split would look like that).
  // Only forward in time · idempotent · writes ONLY the changed rows: fresh GET → PUT {data: changed},
  //   inside PortfolioCore's holdings lock so a value typed in this tab is never overwritten (I1).
  //   The PUT answer is checked: if the database dropped the anchor columns the page says so (I3).
  // USD/THB: ECB via frankfurter.dev (free, CORS), cached per date (only once that date is fixed).
  // ES5 only.
  // ============================================================

  var FX_KEY = "holding_revalue_fx_v1";      // { "YYYY-MM-DD": THB per USD }
  var LAST_KEY = "holding_revalue_last_v1";  // { at, priceDate, changed, skipped: { SYM: reason }, anchorLost: [SYM] } — PM page note
  var SYNC_KEY = "holding_revalue_sync_v1";  // values moved on some page → the PM page re-syncs the quarter's foreign-stock row
  var FX_URL = "https://api.frankfurter.dev/v1/";
  var MAX_MOVE = 0.35;           // fallback path only (no anchor-day close in the series)
  var RECENT_TYPED_MS = 5 * 86400000;
  var DAY_MS = 86400000;

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
    return null;
  }
  function ymd(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null; }
  function closeTime(day) { return Date.parse(day + "T21:30:00Z"); }   // a US daily bar is final after this
  function assign(a, b) { var o = {}, k; for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k]; for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k]; return o; }
  function upper(s) { return String(s || "").trim().toUpperCase(); }
  function round2(v) { return Math.round(v * 100) / 100; }

  // same bucket rule as the PM page's Current Portfolio (portfolio-manager-page.js buildInputs)
  function bucketOf(h) {
    if (h.portfolioBucket) return h.portfolioBucket;
    var raw = upper(h.canonicalSymbol);
    var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
    return /\.BK$/.test(raw) ? "thai-stock" : raw.indexOf("BTC") >= 0 ? "bitcoin" : isThaiFund ? "thai-fund" : "foreign-stock";
  }
  // a held, valued foreign stock priced in USD (an exchange suffix such as .HK/.T means a local currency → skipped)
  function eligible(h) {
    if (!h || !h.isHolding || bucketOf(h) !== "foreign-stock") return false;
    var sym = upper(h.canonicalSymbol);
    if (!sym || sym.indexOf(".") >= 0 || /USD$/.test(sym)) return false;
    var mv = num(h.marketValue);
    return mv != null && mv > 0;
  }

  // snapshot → price lookup for a holding, FINAL bars only (nowMs):
  //   { key, close, date (newest final), fetchedAt (ms the series came from Yahoo), closeOn(day) exact,
  //     lastBefore(ms) → newest final bar closed by then }
  // fetchedAt = the series' own lastUpdated, not the snapshot's loadedAt: "retry failed" keeps older series
  //   under a new loadedAt, and the server answers its cache when Yahoo fails — both look fresh by loadedAt
  function priceSource(snapshot, nowMs) {
    var tech = (snapshot && snapshot.technicalSignals) || {};
    var hist = (snapshot && snapshot.historicalData) || {};
    var now = nowMs || Date.now();
    var snapAt = Date.parse((snapshot && snapshot.loadedAt) || "");
    function fetchedOf(key) {
      var t = hist[key] ? Date.parse(hist[key].lastUpdated || "") : NaN;
      return isFinite(t) ? t : (isFinite(snapAt) ? snapAt : null);
    }
    function keysFor(h) {
      var k = [upper(h.canonicalSymbol), upper(h.providerSymbol), upper(h.displaySymbol)];
      if (k[0] === "GOOG") k.push("GOOGL"); else if (k[0] === "GOOGL") k.push("GOOG");
      return k.filter(function (x, i) { return x && k.indexOf(x) === i; });
    }
    function barsOf(key) {
      var H = hist[key], out = [];
      var dates = H && Array.isArray(H.dates) ? H.dates : [], closes = H && Array.isArray(H.closes) ? H.closes : [];
      for (var i = 0; i < dates.length; i++) {
        var d = ymd(String(dates[i])), c = num(closes[i]);
        if (d && c != null && c > 0 && closeTime(d) <= now) out.push([d, c]);
      }
      out.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
      if (!out.length) {   // no series: the snapshot's latest close, if that bar is final
        var t = tech[key], tc = t && num(t.latestClose), td = t && ymd(t.latestDate);
        if (tc != null && tc > 0 && td && closeTime(td) <= now) out.push([td, tc]);
      }
      return out;
    }
    return function (h) {
      var keys = keysFor(h);
      for (var i = 0; i < keys.length; i++) {
        var bars = barsOf(keys[i]);
        if (!bars.length) continue;
        var last = bars[bars.length - 1];
        return {
          key: keys[i], close: last[1], date: last[0], fetchedAt: fetchedOf(keys[i]),
          closeOn: function (day) { for (var j = bars.length - 1; j >= 0; j--) { if (bars[j][0] === day) return bars[j][1]; if (bars[j][0] < day) return null; } return null; },
          lastBefore: function (ms) { for (var j = bars.length - 1; j >= 0; j--) if (closeTime(bars[j][0]) <= ms) return { date: bars[j][0], close: bars[j][1] }; return null; }
        };
      }
      return null;
    };
  }

  // pure: which rows change and how (no I/O) · fxOf(date) → THB per USD or null
  // ctx: { nowIso, nowMs, loadedAtMs (fallback when a price carries no fetchedAt) }
  function plan(holdings, priceOf, fxOf, ctx) {
    ctx = ctx || {};
    var nowMs = ctx.nowMs || Date.now(), nowIso = ctx.nowIso || new Date(nowMs).toISOString();
    var loadedAtMs = num(ctx.loadedAtMs);
    var changes = [], skipped = {};
    (holdings || []).forEach(function (h) {
      if (!eligible(h)) return;
      var sym = upper(h.canonicalSymbol);
      var p = priceOf(h);
      if (!p) { skipped[sym] = "no-price"; return; }
      var fxNow = fxOf(p.date);
      if (!(fxNow > 0)) { skipped[sym] = "no-fx"; return; }
      var thbNow = Math.round(p.close * fxNow * 1e6) / 1e6;
      var mv = num(h.marketValue);
      var aPrice = num(h.latestPrice), aDate = ymd(h.latestPriceDate);
      if (aPrice == null || aPrice <= 0 || !aDate) {
        var typedAt = Date.parse(h.updatedAt || "");
        if (isFinite(typedAt) && nowMs - typedAt <= RECENT_TYPED_MS) {
          // typed lately: the value holds the last close before the typing — knowable only from a series
          // fetched after the typing (an older one may miss that close and anchor too early → double count)
          var seriesAt = num(p.fetchedAt);
          if (seriesAt == null) seriesAt = loadedAtMs;
          if (!(seriesAt >= typedAt)) { skipped[sym] = "stale-price"; return; }
          var a = p.lastBefore(typedAt);
          if (!a) { skipped[sym] = "stale-price"; return; }
          var fxA = fxOf(a.date);
          if (!(fxA > 0)) { skipped[sym] = "no-fx"; return; }
          if (a.date >= p.date) {
            changes.push({ symbol: sym, kind: "anchor", from: mv, to: mv, priceDate: a.date,
              row: assign(h, { latestPrice: Math.round(a.close * fxA * 1e6) / 1e6, latestPriceDate: a.date }) });
          } else {
            var next0 = round2(mv * (p.close / a.close) * (fxNow / fxA));
            changes.push({ symbol: sym, kind: "revalue", from: mv, to: next0, priceDate: p.date, anchorDate: a.date,
              row: assign(h, { marketValue: next0, latestPrice: thbNow, latestPriceDate: p.date, updatedAt: nowIso }) });
          }
          return;
        }
        // older value (before this feature): start following from the newest close, without a move
        changes.push({ symbol: sym, kind: "anchor", from: mv, to: mv, priceDate: p.date,
          row: assign(h, { latestPrice: thbNow, latestPriceDate: p.date }) });
        return;
      }
      if (p.date <= aDate) return;                    // already at this close or a newer one
      var ratio, cThen = p.closeOn(aDate), fxThen = fxOf(aDate);
      if (cThen != null && fxThen > 0) ratio = (p.close / cThen) * (fxNow / fxThen);   // split-safe
      else {
        ratio = thbNow / aPrice;                      // fallback: stored THB price
        if (!(ratio > 0) || Math.abs(ratio - 1) > MAX_MOVE) { skipped[sym] = "big-move:" + Math.round((ratio - 1) * 100); return; }
      }
      if (!(ratio > 0) || !isFinite(ratio)) { skipped[sym] = "bad-ratio"; return; }
      var next = round2(mv * ratio);
      changes.push({ symbol: sym, kind: "revalue", from: mv, to: next, priceDate: p.date, anchorDate: aDate,
        row: assign(h, { marketValue: next, latestPrice: thbNow, latestPriceDate: p.date, updatedAt: nowIso }) });
    });
    return { changes: changes, skipped: skipped };
  }

  // the USD/THB dates a plan will ask for (dry run with a recording fxOf)
  function fxDates(holdings, priceOf, ctx) {
    var want = [];
    plan(holdings, priceOf, function (d) { if (d && want.indexOf(d) < 0) want.push(d); return 1; }, ctx);
    return want;
  }

  // ---------------------------------------------------------------- I/O
  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function readJson(k) { try { var s = store(); return s ? JSON.parse(s.getItem(k) || "null") : null; } catch (e) { return null; } }
  function writeJson(k, v) { try { var s = store(); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function removeKey(k) { try { var s = store(); if (s) s.removeItem(k); } catch (e) {} }
  function lastResult() { return readJson(LAST_KEY) || { skipped: {} }; }

  function fxFor(dates) {
    var cache = readJson(FX_KEY) || {}, fresh = {};
    var want = dates.filter(function (d, i) { return d && dates.indexOf(d) === i && !(num(cache[d]) > 0); });
    var today = new Date().toISOString().slice(0, 10);
    return Promise.all(want.map(function (d) {
      return root.fetch(FX_URL + d + "?base=USD&symbols=THB", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var v = j && j.rates && num(j.rates.THB);
          if (!(v > 0)) return;
          fresh[d] = v;
          // ECB answers the last fixing on or before d: final for a past day or a fixed day — but for today
          // before ECB publishes it is yesterday's rate, so use it this time and do not keep it (review M4)
          if (ymd(j.date) === d || d < today) cache[d] = v;
        }, function () {});
    })).then(function () {
      var keys = Object.keys(cache).sort();
      if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(function (k) { delete cache[k]; });
      writeJson(FX_KEY, cache);
      return function (d) { var v = num(cache[d]); if (!(v > 0)) v = num(fresh[d]); return v > 0 ? v : null; };
    });
  }
  function readSnapshot() {
    try { if (root.PortfolioDataSnapshot && root.PortfolioDataSnapshot.read) return root.PortfolioDataSnapshot.read(); } catch (e) {}
    return readJson("portfolio_dashboard_data_snapshot");
  }
  function localHoldings(snapshot) {
    var core = root.PortfolioCore;
    var rows = null;
    try { if (core && core.readLocalHoldings) rows = core.readLocalHoldings(); } catch (e) {}
    if (!rows || !rows.length) rows = (snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [];
    return rows;
  }
  function ctxOf(snapshot) {
    var nowMs = Date.now();
    return { nowMs: nowMs, nowIso: new Date(nowMs).toISOString(), loadedAtMs: Date.parse((snapshot && snapshot.loadedAt) || "") };
  }
  // does anything need work? (local check — no network when nothing is due)
  function due(holdings, priceOf, ctx) {
    var last = lastResult();
    // the database dropped the anchor columns lately → do not re-save every page load (the PM page says why)
    if (last.anchorLost && last.anchorLost.length && last.at && Date.now() - Date.parse(last.at) < DAY_MS) return false;
    var out = plan(holdings, priceOf, function () { return 1; }, ctx);
    return out.changes.length > 0;
  }
  function sameRows(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  var inflight = null, again = false, noCoreTries = 0;
  function run(opts) {
    opts = opts || {};
    if (inflight) { again = true; return inflight; }   // asked during a run (e.g. right after a save) → run once more after it
    var snapshot = readSnapshot();
    var ctx = ctxOf(snapshot);
    var priceOf = priceSource(snapshot, ctx.nowMs);
    var core = root.PortfolioCore;
    if (!core || !core.normalizeHolding || !root.fetch) {
      // portfolio-core.js is injected next to this file on most pages — give it a moment (a few tries)
      if (noCoreTries < 5) { noCoreTries += 1; soon(2000); }
      return Promise.resolve({ ran: false, reason: "no-core" });
    }
    if (!opts.force && !due(localHoldings(snapshot), priceOf, ctx)) return Promise.resolve({ ran: false, reason: "nothing-due" });
    var lock = core.withHoldingsLock ? core.withHoldingsLock : function (task) { return task(); };
    // USD/THB first (no lock held during the network wait), from the local list
    inflight = fxFor(fxDates(localHoldings(snapshot), priceOf, ctx)).then(function () {
      return lock(function () {
        return root.fetch("/api/portfolio-holdings", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("holdings " + r.status); return r.json(); })
          .then(function (payload) {
            var fresh = core.dedupeHoldings ? core.dedupeHoldings(payload && payload.data) : ((payload && payload.data) || []);
            return fxFor(fxDates(fresh, priceOf, ctx)).then(function (fxOf) {   // dates only the server list needs (usually cached)
              var out = plan(fresh, priceOf, fxOf, ctx);
              var last = { at: new Date().toISOString(), priceDate: out.changes.length ? out.changes[0].priceDate : null, changed: out.changes.length, skipped: out.skipped, anchorLost: [] };
              if (!out.changes.length) {
                writeJson(LAST_KEY, last);
                // nothing to move, but a stale local copy is repaired from the server (review M2)
                if (core.writeLocalHoldings && !sameRows(fresh, core.dedupeHoldings ? core.dedupeHoldings(localHoldings(snapshot)) : localHoldings(snapshot))) core.writeLocalHoldings(fresh);
                return { ran: true, changes: [], skipped: out.skipped };
              }
              var rows = out.changes.map(function (c) { return core.normalizeHolding(c.row); });
              return root.fetch("/api/portfolio-holdings", {
                method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: rows })
              }).then(function (r) {
                if (!r.ok) throw new Error("save " + r.status);
                return r.json().then(function (j) { return j; }, function () { return null; });
              }).then(function (saved) {
                // did the database keep the anchor? (a table without latest_price columns drops them silently)
                var back = {};
                ((saved && saved.data) || []).forEach(function (x) { if (x && x.canonicalSymbol) back[upper(x.canonicalSymbol)] = x; });
                rows.forEach(function (x) { var b = back[upper(x.canonicalSymbol)]; if (b && x.latestPriceDate && !b.latestPriceDate) last.anchorLost.push(upper(x.canonicalSymbol)); });
                writeJson(LAST_KEY, last);
                var bySym = {};
                rows.forEach(function (x) { bySym[x.canonicalSymbol] = x; });
                var merged = fresh.map(function (h) { return bySym[h.canonicalSymbol] || h; });
                if (core.writeLocalHoldings) core.writeLocalHoldings(merged);   // local copy + snapshot + "portfolio-holdings-updated"
                if (out.changes.some(function (c) { return c.kind === "revalue"; })) writeJson(SYNC_KEY, { at: last.at });
                try { root.dispatchEvent(new root.CustomEvent("holdings-revalued", { detail: { changes: out.changes } })); } catch (e) {}
                return { ran: true, changes: out.changes, skipped: out.skipped, anchorLost: last.anchorLost };
              });
            });
          });
      });
    }).then(function (res) { return finish(res); }, function (err) { return finish({ ran: false, reason: String(err && err.message || err) }); });
    return inflight;
  }
  function finish(res) {
    inflight = null;
    if (again) { again = false; soon(300); }
    return res;
  }

  // runs by itself on every page that loads it: shortly after load, and whenever a new snapshot is written
  // (Load Latest Data) — a no-op without network when nothing is due
  var timer = null;
  function soon(ms) {
    if (typeof root.setTimeout !== "function") return;
    if (timer) root.clearTimeout(timer);
    timer = root.setTimeout(function () { timer = null; run(); }, ms);
  }
  if (typeof root.addEventListener === "function" && root.document) {
    root.addEventListener("portfolio-data-snapshot", function () { soon(1500); });
    soon(2500);
  }

  var HoldingRevalue = { run: run, plan: plan, eligible: eligible, bucketOf: bucketOf, priceSource: priceSource, lastResult: lastResult,
    takeSyncFlag: function () { var f = readJson(SYNC_KEY); if (f) removeKey(SYNC_KEY); return !!f; },
    FX_KEY: FX_KEY, LAST_KEY: LAST_KEY, SYNC_KEY: SYNC_KEY, MAX_MOVE: MAX_MOVE, RECENT_TYPED_MS: RECENT_TYPED_MS };
  root.HoldingRevalue = HoldingRevalue;
  if (typeof module !== "undefined" && module.exports) module.exports = HoldingRevalue;
})(typeof window !== "undefined" ? window : this);
