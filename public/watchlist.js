/*
 * watchlist.js — shared in-app Watchlist + Alert Rules engine.
 * Persistence: localStorage (Phase 1). Evaluation is pure and reusable.
 * Consumed by the Watchlist page, Asset 360, Action Center, Home, and the
 * Data Snapshot loader. No LINE / external notifications (in-app only).
 *
 * window.Watchlist = { store CRUD, CATEGORIES, RULE_TYPES, defaultRulesFor,
 *   evaluate, contextFromSnapshot, history, openModal, ... }
 */
(function (global) {
  "use strict";

  var STORE_KEY = "portfolio_dashboard_watchlist";
  var HISTORY_KEY = "portfolio_dashboard_watchlist_alert_history";
  var HISTORY_MAX = 200;

  function fin(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function lc(v) { return String(v == null ? "" : v).toLowerCase(); }
  function nowIso() { return new Date().toISOString(); }
  function uid() { return "wl-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36); }

  var ALIAS = {
    SET: "^SET.BK", "SET.BK": "^SET.BK", SET50: "^SET50.BK", "SET50.BK": "^SET50.BK", SET100: "^SET100.BK", "SET100.BK": "^SET100.BK",
    SPX: "^GSPC", GSPC: "^GSPC", IXIC: "^IXIC", NDX: "^NDX", BTC: "BTCUSD", "BTC-USD": "BTCUSD", KGTECHRMF: "K-GTECHRMF", KUSXNDQRMF: "K-USXNDQRMF"
  };
  function canonicalize(raw) {
    var up = String(raw || "").toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
    var compact = up.replace(/[^A-Z0-9]/g, "");
    return ALIAS[up] || ALIAS[compact] || up;
  }

  // ----------------------------------------------------------------- categories
  var CATEGORIES = {
    buy: { label: "Buy Watch", thai: "เฝ้าซื้อ", defaults: [
      { type: "timingScore", value: 65 }, { type: "emaBullCross" }, { type: "volumeConfirm", value: 1.0 }, { type: "rsiBuy", value: 40 }, { type: "nearSupport", value: 3 }, { type: "signalQuality", value: 70 }
    ] },
    sell: { label: "Sell Watch", thai: "เฝ้าขาย", defaults: [
      { type: "rsiSell", value: 70 }, { type: "emaBearCross" }, { type: "sma200Breakdown" }, { type: "priceTargetSell" }
    ] },
    breakout: { label: "Breakout Watch", thai: "เฝ้าเบรกเอาท์", defaults: [
      { type: "breakResistance" }, { type: "volumeConfirm", value: 1.5 }, { type: "timingScore", value: 75 }, { type: "signalQuality", value: 70 }
    ] },
    pullback: { label: "Pullback Watch", thai: "รอย่อ", defaults: [
      { type: "nearSupport", value: 3 }, { type: "rsiBuy", value: 40 }, { type: "timingScore", value: 55 }
    ] },
    risk: { label: "Risk Watch", thai: "เฝ้าระวังความเสี่ยง", defaults: [
      { type: "newBearish" }, { type: "marketRiskHigh" }, { type: "sma200Breakdown" }, { type: "timingScoreBelow", value: 45 }
    ] },
    longterm: { label: "Long-term Watch", thai: "ติดตามระยะยาว", defaults: [
      { type: "timingScore", value: 65 }, { type: "nearSupport", value: 5 }, { type: "sma200Reclaim" }, { type: "signalQuality", value: 70 }
    ] },
    custom: { label: "Custom", thai: "กำหนดเอง", defaults: [] }
  };
  function defaultRulesFor(category) {
    var cat = CATEGORIES[category] || CATEGORIES.buy;
    return cat.defaults.map(function (r) { return Object.assign({}, r); });
  }

  // ----------------------------------------------------------------- rule types
  // Each rule: evaluate(ctx, rule) -> { triggered, near, detail, thaiDetail, severity }
  function pct(a, b) { return b ? ((a - b) / b) * 100 : null; }

  var RULE_TYPES = {
    timingScore: {
      label: "Timing Score >=", thai: "จังหวะ >=", defaultValue: 65, severity: "medium",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 65, s = fin(ctx.timingScore);
        if (s == null) return { missing: true };
        return { triggered: s >= v, near: s < v && s >= v - 5, detail: "Timing " + s + " (>= " + v + ")", thaiDetail: "Timing " + s + " (เป้า " + v + ")" };
      }
    },
    timingScoreBelow: {
      label: "Timing Score <", thai: "จังหวะ <", defaultValue: 45, severity: "high",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 45, s = fin(ctx.timingScore);
        if (s == null) return { missing: true };
        return { triggered: s < v, near: s >= v && s <= v + 5, detail: "Timing " + s + " (< " + v + ")", thaiDetail: "Timing " + s + " ต่ำกว่า " + v };
      }
    },
    emaBullCross: {
      label: "EMA12 crosses above EMA26", thai: "EMA12 ตัดขึ้น EMA26", severity: "medium",
      evaluate: function (ctx) {
        var e12 = fin(ctx.ema12), e26 = fin(ctx.ema26);
        var trig = !!ctx.isNewBullishSignal || (fin(ctx.daysSinceEmaBullishCross) != null && ctx.daysSinceEmaBullishCross >= 1 && ctx.daysSinceEmaBullishCross <= 3);
        var near = false;
        if (!trig && e12 != null && e26 != null && e26 !== 0) near = e12 < e26 && Math.abs(e12 - e26) / e26 <= 0.005;
        return { triggered: trig, near: near, detail: "EMA12 x EMA26 up", thaiDetail: "EMA12 ตัดขึ้น EMA26" };
      }
    },
    emaBearCross: {
      label: "EMA12 crosses below EMA26", thai: "EMA12 ตัดลง EMA26", severity: "high",
      evaluate: function (ctx) {
        var e12 = fin(ctx.ema12), e26 = fin(ctx.ema26);
        var trig = !!ctx.isNewBearishSignal || (fin(ctx.daysSinceEmaBearishCross) != null && ctx.daysSinceEmaBearishCross >= 1 && ctx.daysSinceEmaBearishCross <= 3);
        var near = false;
        if (!trig && e12 != null && e26 != null && e26 !== 0) near = e12 > e26 && Math.abs(e12 - e26) / e26 <= 0.005;
        return { triggered: trig, near: near, detail: "EMA12 x EMA26 down", thaiDetail: "EMA12 ตัดลง EMA26" };
      }
    },
    volumeConfirm: {
      label: "Volume ratio >=", thai: "วอลุ่ม confirm >=", defaultValue: 1.0, severity: "low",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 1.0, vr = fin(ctx.volumeRatio);
        if (vr == null) return { missing: true };
        return { triggered: vr >= v, near: vr < v && vr >= v - 0.15, detail: "Vol " + vr.toFixed(2) + "x (>= " + v + ")", thaiDetail: "วอลุ่ม " + vr.toFixed(2) + "x" };
      }
    },
    rsiBuy: {
      label: "RSI <=", thai: "RSI เข้าโซนซื้อ <=", defaultValue: 35, severity: "medium",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 35, rsi = fin(ctx.rsi14);
        if (rsi == null) return { missing: true };
        return { triggered: rsi <= v, near: rsi > v && rsi <= v + 5, detail: "RSI " + rsi.toFixed(1) + " (<= " + v + ")", thaiDetail: "RSI " + rsi.toFixed(1) };
      }
    },
    rsiSell: {
      label: "RSI >=", thai: "RSI เข้าโซนขาย >=", defaultValue: 70, severity: "high",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 70, rsi = fin(ctx.rsi14);
        if (rsi == null) return { missing: true };
        return { triggered: rsi >= v, near: rsi < v && rsi >= v - 5, detail: "RSI " + rsi.toFixed(1) + " (>= " + v + ")", thaiDetail: "RSI " + rsi.toFixed(1) };
      }
    },
    sma200Reclaim: {
      label: "Price reclaims SMA200", thai: "ราคากลับขึ้นเหนือ SMA200", severity: "medium",
      evaluate: function (ctx) {
        var d = fin(ctx.distanceToSma200Pct);
        var above = ctx.sma200Status === "ABOVE_SMA200" || (d != null && d > 0);
        if (d == null && !ctx.sma200Status) return { missing: true };
        return { triggered: above && d != null && d >= 0 && d <= 2, near: !above && d != null && d >= -2 && d < 0, detail: "vs SMA200 " + (d != null ? d.toFixed(1) + "%" : "-"), thaiDetail: "ยืนเหนือ SMA200" };
      }
    },
    sma200Breakdown: {
      label: "Price breaks below SMA200", thai: "ราคาหลุด SMA200", severity: "high",
      evaluate: function (ctx) {
        var d = fin(ctx.distanceToSma200Pct);
        var below = ctx.sma200Status === "BELOW_SMA200" || (d != null && d < 0);
        if (d == null && !ctx.sma200Status) return { missing: true };
        return { triggered: below && d != null && d <= 0 && d >= -2, near: !below && d != null && d > 0 && d <= 2, detail: "vs SMA200 " + (d != null ? d.toFixed(1) + "%" : "-"), thaiDetail: "หลุด SMA200" };
      }
    },
    priceTargetBuy: {
      label: "Price <= target buy", thai: "ถึงราคาซื้อเป้าหมาย", severity: "medium",
      evaluate: function (ctx) {
        var p = fin(ctx.price), t = fin(ctx.targetBuyZone);
        if (p == null || t == null) return { missing: true };
        return { triggered: p <= t, near: p > t && pct(p, t) <= 3, detail: "Price " + p + " (<= " + t + ")", thaiDetail: "ถึงราคาซื้อ" };
      }
    },
    priceTargetSell: {
      label: "Price >= target sell", thai: "ถึงราคาขายเป้าหมาย", severity: "medium",
      evaluate: function (ctx) {
        var p = fin(ctx.price), t = fin(ctx.targetSellZone);
        if (p == null || t == null) return { missing: true };
        return { triggered: p >= t, near: p < t && pct(t, p) <= 3, detail: "Price " + p + " (>= " + t + ")", thaiDetail: "ถึงราคาขาย" };
      }
    },
    breakResistance: {
      label: "Price breaks resistance", thai: "ราคาเบรกแนวต้าน", severity: "medium",
      evaluate: function (ctx) {
        var p = fin(ctx.price), r = fin(ctx.resistance);
        if (p == null || r == null) return { missing: true };
        return { triggered: p >= r, near: p < r && pct(r, p) <= 3, detail: "Resistance " + r, thaiDetail: "เบรกแนวต้าน " + r };
      }
    },
    nearSupport: {
      label: "Price near support (within %)", thai: "ใกล้แนวรับ", defaultValue: 3, severity: "low",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 3, p = fin(ctx.price), sup = fin(ctx.support);
        if (p == null || sup == null) return { missing: true };
        var dist = Math.abs(pct(p, sup));
        return { triggered: dist <= v, near: dist > v && dist <= v + 2, detail: "Support " + sup + " (" + dist.toFixed(1) + "%)", thaiDetail: "ใกล้แนวรับ " + sup };
      }
    },
    nearResistance: {
      label: "Price near resistance (within %)", thai: "ใกล้แนวต้าน", defaultValue: 3, severity: "low",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? r.value : 3, p = fin(ctx.price), res = fin(ctx.resistance);
        if (p == null || res == null) return { missing: true };
        var dist = Math.abs(pct(p, res));
        return { triggered: dist <= v, near: dist > v && dist <= v + 2, detail: "Resistance " + res + " (" + dist.toFixed(1) + "%)", thaiDetail: "ใกล้แนวต้าน " + res };
      }
    },
    newBearish: {
      label: "New bearish signal", thai: "สัญญาณขาลงใหม่", severity: "high",
      evaluate: function (ctx) { return { triggered: !!ctx.isNewBearishSignal, near: false, detail: "New bearish", thaiDetail: "สัญญาณขาลงใหม่" }; }
    },
    marketRiskHigh: {
      label: "Market risk High / Very High", thai: "ความเสี่ยงตลาดสูง", severity: "medium",
      evaluate: function (ctx) {
        var l = lc(ctx.marketRiskLevel);
        var vhigh = l.indexOf("very high") >= 0 || l.indexOf("hedge") >= 0;
        var high = vhigh || l.indexOf("high") >= 0 || l.indexOf("caution") >= 0;
        return { triggered: high, near: false, severity: vhigh ? "high" : "medium", detail: "Market risk: " + (ctx.marketRiskLevel || "-"), thaiDetail: "ความเสี่ยงตลาดสูง" };
      }
    },
    signalQuality: {
      label: "Signal Quality >=", thai: "คุณภาพสัญญาณ >=", defaultValue: 70, severity: "medium",
      evaluate: function (ctx, r) {
        var v = fin(r.value) != null ? fin(r.value) : 70, s = fin(ctx.signalQualityScore);
        if (s == null) return { missing: true };
        return { triggered: s >= v, near: s < v && s >= v - 5, detail: "Signal Quality " + s + " (>= " + v + ")", thaiDetail: "คุณภาพสัญญาณ " + s + " (เป้า " + v + ")" };
      }
    }
  };

  function ruleLabel(rule) { var d = RULE_TYPES[rule.type]; return d ? d.thai + (rule.value != null && />=|<=|<|%|=/.test("") ? "" : (rule.value != null ? " " + rule.value : "")) : rule.type; }

  // ----------------------------------------------------------------- evaluate
  function evaluate(item, ctx) {
    item = item || {};
    ctx = ctx || {};
    var rules = (item.alertRules && item.alertRules.length) ? item.alertRules : defaultRulesFor(item.watchCategory || "buy");
    var triggeredRules = [], nearTriggerRules = [], warnings = [];
    var hasPrice = fin(ctx.price) != null;

    rules.forEach(function (rule) {
      var def = RULE_TYPES[rule.type];
      if (!def) return;
      var res;
      try { res = def.evaluate(ctx, rule) || {}; } catch (e) { res = { missing: true }; }
      if (res.missing) { warnings.push(rule.type); return; }
      var entry = { type: rule.type, label: def.thai, detail: res.thaiDetail || res.detail, severity: res.severity || def.severity || "low" };
      if (res.triggered) triggeredRules.push(entry);
      else if (res.near) nearTriggerRules.push(entry);
    });

    var status, severity = "low", reason = "", thaiReason = "";
    if (!hasPrice) {
      status = "missing"; reason = "Price data not available"; thaiReason = "ข้อมูลราคาไม่พอ";
    } else if (triggeredRules.length) {
      status = "triggered";
      severity = triggeredRules.some(function (r) { return r.severity === "high"; }) ? "high" : "medium";
      thaiReason = "เข้าเงื่อนไข: " + triggeredRules.map(function (r) { return r.detail; }).slice(0, 2).join(" · ");
      reason = "Triggered: " + triggeredRules.map(function (r) { return r.label; }).slice(0, 2).join(", ");
    } else if (nearTriggerRules.length) {
      status = "near"; severity = "low";
      thaiReason = "ใกล้เข้าเงื่อนไข: " + nearTriggerRules.map(function (r) { return r.detail; }).slice(0, 2).join(" · ");
      reason = "Near: " + nearTriggerRules.map(function (r) { return r.label; }).slice(0, 2).join(", ");
    } else {
      // derive improving / risk / none from context
      var s = fin(ctx.timingScore);
      var riskish = !!ctx.isNewBearishSignal || ctx.sma200Status === "BELOW_SMA200" || (s != null && s < 45) || lc(ctx.marketRiskLevel).indexOf("high") >= 0;
      var improving = (s != null && s >= 55) || (!!ctx.emaBull && ctx.sma200Status === "ABOVE_SMA200");
      if (riskish) { status = "risk"; severity = "medium"; thaiReason = "เริ่มมีความเสี่ยง"; reason = "Risk building"; }
      else if (improving) { status = "improving"; thaiReason = "สัญญาณเริ่มดีขึ้น"; reason = "Improving"; }
      else { status = "none"; thaiReason = "ยังไม่ต้องทำอะไร"; reason = "No action"; }
    }

    return {
      triggered: triggeredRules.length > 0,
      triggeredRules: triggeredRules,
      nearTriggerRules: nearTriggerRules,
      warnings: warnings,
      status: status,
      severity: severity,
      reason: reason,
      thaiReason: thaiReason,
      evaluatedAt: nowIso()
    };
  }
  var STATUS_THAI = { triggered: "เข้าเงื่อนไข", near: "ใกล้เข้าเงื่อนไข", improving: "สัญญาณเริ่มดีขึ้น", risk: "เริ่มมีความเสี่ยง", none: "ยังไม่ต้องทำอะไร", missing: "ข้อมูลไม่พอ" };

  // ----------------------------------------------------------------- context
  function nearestSR(closes, price) {
    if (!Array.isArray(closes) || price == null) return { support: null, resistance: null };
    var n = closes.length, levels = [];
    [20, 50, 100].forEach(function (w) {
      var slice = closes.slice(Math.max(0, n - w)).map(Number).filter(Number.isFinite);
      if (slice.length) { levels.push(Math.min.apply(null, slice)); levels.push(Math.max.apply(null, slice)); }
    });
    var support = null, resistance = null;
    levels.forEach(function (l) {
      if (!Number.isFinite(l)) return;
      if (l < price && (support == null || l > support)) support = l;
      if (l > price && (resistance == null || l < resistance)) resistance = l;
    });
    return { support: support, resistance: resistance };
  }
  function contextFromSnapshot(canonical, snapshot, item) {
    snapshot = snapshot || {};
    var tech = (snapshot.technicalSignals && snapshot.technicalSignals[canonical]) || {};
    var rsi = (snapshot.rsiSignals && snapshot.rsiSignals[canonical]) || {};
    var hist = (snapshot.historicalData && snapshot.historicalData[canonical]) || {};
    var sc = (snapshot.scoring && snapshot.scoring.bySymbol && snapshot.scoring.bySymbol[canonical]) || null;
    var risk = (snapshot.marketRisk && snapshot.marketRisk.risk) || {};
    var closes = Array.isArray(hist.closes) ? hist.closes.map(Number) : [];
    var price = fin(tech.latestClose) != null ? fin(tech.latestClose) : fin(closes[closes.length - 1]);
    var sma200 = fin(tech.sma200);
    var distSma = price != null && sma200 != null && sma200 !== 0 ? ((price - sma200) / sma200) * 100 : null;
    var sr = nearestSR(closes, price);
    // Compute the Signal Score LIVE from the shared engine so it matches Asset 360 /
    // Action Center exactly (do not rely on a possibly-stale precomputed snapshot value).
    var scoreInput = {
      latestPrice: price,
      latestDate: tech.latestDate || (Array.isArray(hist.dates) ? hist.dates[hist.dates.length - 1] : null),
      ema12: fin(tech.ema12), ema26: fin(tech.ema26), sma200: sma200,
      rsi14: fin(rsi.rsi14) != null ? fin(rsi.rsi14) : fin(tech.rsi14),
      emaTrendStatus: tech.emaStatus, sma200Status: tech.sma200Status,
      volumeRatio: fin(tech.volumeRatio),
      daysSinceEmaBullishCross: fin(tech.daysSinceEmaBullishCross),
      daysSinceEmaBearishCross: fin(tech.daysSinceEmaBearishCross),
      daysSinceSma200Reclaim: fin(tech.daysSinceSma200Reclaim),
      daysSinceSma200Break: fin(tech.daysSinceSma200Break),
      marketRiskLevel: risk.level && (risk.level.label || risk.level.thai)
    };
    var timingScore = null;
    // PRIMARY: signal-state classification (AI Boom taxonomy) so the watchlist
    // speaks the same signal language as Asset 360 / Action Center / AI Boom.
    var signal = null, signalAction = null;
    if (global.Scoring && price != null) {
      try { timingScore = global.Scoring.calculateTimingScore(scoreInput).score; } catch (e) { /* ignore */ }
      try {
        signal = global.Scoring.classifySignal(scoreInput);
        signalAction = global.Scoring.actionFromSignal(signal, scoreInput);
      } catch (e) { /* ignore */ }
    }
    if (timingScore == null && sc) timingScore = fin(sc.signalScore != null ? sc.signalScore : sc.timingScore);
    var signalQualityScore = timingScore; // one merged Signal Score (secondary)
    return {
      price: price,
      ema12: fin(tech.ema12), ema26: fin(tech.ema26), sma200: sma200,
      rsi14: fin(rsi.rsi14) != null ? fin(rsi.rsi14) : fin(tech.rsi14),
      sma200Status: tech.sma200Status,
      distanceToSma200Pct: distSma,
      emaBull: tech.emaStatus === "EMA_BULLISH",
      isNewBullishSignal: tech.emaStatus === "EMA_BULLISH" && (tech.ema && tech.ema.signal === "BUY"),
      isNewBearishSignal: tech.emaStatus === "EMA_BEARISH" && (tech.ema && tech.ema.signal === "SELL"),
      volumeRatio: fin(tech.volumeRatio),
      timingScore: timingScore,
      signalQualityScore: signalQualityScore,
      signal: signal,
      signalGroup: signal ? signal.groupKey : null,
      signalLabel: signal ? signal.thaiLabel : null,
      signalTone: signal ? signal.tone : null,
      signalAction: signalAction,
      marketRiskLevel: risk.level && (risk.level.label || risk.level.thai),
      support: sr.support, resistance: sr.resistance,
      targetBuyZone: item ? fin(item.targetBuyZone) : null,
      targetSellZone: item ? fin(item.targetSellZone) : null
    };
  }

  // ----------------------------------------------------------------- store
  function read() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function write(items) {
    try { global.localStorage.setItem(STORE_KEY, JSON.stringify(items || [])); } catch (e) {}
    if (global.dispatchEvent) global.dispatchEvent(new CustomEvent("watchlist-updated", { detail: { items: items } }));
    return items;
  }
  function getBySymbol(symbol) {
    var key = canonicalize(symbol);
    return read().find(function (i) { return canonicalize(i.canonicalSymbol) === key; }) || null;
  }
  function has(symbol) { return !!getBySymbol(symbol); }
  function add(item) {
    var items = read();
    var key = canonicalize(item.canonicalSymbol || item.displaySymbol || item.symbol);
    var existing = items.find(function (i) { return canonicalize(i.canonicalSymbol) === key; });
    var record = Object.assign({
      id: uid(), canonicalSymbol: key, displaySymbol: item.displaySymbol || key,
      assetName: item.assetName || item.displaySymbol || key, assetType: item.assetType || "", market: item.market || "",
      providerSymbol: item.providerSymbol || key, currency: item.currency || "",
      watchReason: item.watchReason || "", watchCategory: item.watchCategory || "buy",
      targetBuyZone: fin(item.targetBuyZone), targetSellZone: fin(item.targetSellZone),
      supportLevel: fin(item.supportLevel), resistanceLevel: fin(item.resistanceLevel),
      alertRules: item.alertRules && item.alertRules.length ? item.alertRules : defaultRulesFor(item.watchCategory || "buy"),
      isActive: item.isActive !== false, notes: item.notes || "",
      source: item.source || "manual", inUniverse: item.inUniverse === true,
      createdAt: nowIso(), updatedAt: nowIso()
    }, {});
    if (existing) { Object.assign(existing, record, { id: existing.id, createdAt: existing.createdAt, source: existing.source || record.source, inUniverse: existing.inUniverse || record.inUniverse, updatedAt: nowIso() }); }
    else { items.push(record); }
    write(items);
    return existing || record;
  }
  function update(id, patch) {
    var items = read();
    var it = items.find(function (i) { return i.id === id; });
    if (it) { Object.assign(it, patch, { updatedAt: nowIso() }); write(items); }
    return it;
  }
  function remove(id) { write(read().filter(function (i) { return i.id !== id; })); }
  function archive(id) { return update(id, { isActive: false }); }
  function activate(id) { return update(id, { isActive: true }); }

  // Default watch category for an auto-synced universe asset.
  function universeCategory(d) {
    var t = lc(d && d.assetType);
    if (t.indexOf("index") >= 0) return "longterm";
    return "buy";
  }

  // Sync a list of universe descriptors into the watchlist (e.g. AI Boom Universe).
  // - New symbols are added (source: "ai_boom") with default rules for their category.
  // - Existing symbols get METADATA-ONLY updates; user-tuned category/rules/targets/
  //   notes and isActive are preserved (never clobbered).
  // - opts.archiveMissing: archive "ai_boom"-sourced items no longer in the universe
  //   (manual items are never touched).
  // descriptor: { canonicalSymbol|ticker, displaySymbol, assetName, assetType, market,
  //               providerSymbol, currency, watchCategory? }
  function syncFromUniverse(descriptors, opts) {
    opts = opts || {};
    descriptors = Array.isArray(descriptors) ? descriptors : [];
    var items = read();
    var byKey = {};
    items.forEach(function (i) { byKey[canonicalize(i.canonicalSymbol)] = i; });
    var incoming = {};
    var added = 0, updated = 0, archived = 0;
    descriptors.forEach(function (d) {
      var key = canonicalize(d.canonicalSymbol || d.displaySymbol || d.symbol || d.ticker);
      if (!key) return;
      incoming[key] = true;
      var ex = byKey[key];
      if (ex) {
        if (d.displaySymbol) ex.displaySymbol = d.displaySymbol;
        if (d.assetName) ex.assetName = d.assetName;
        if (d.assetType) ex.assetType = d.assetType;
        if (d.market) ex.market = d.market;
        if (d.providerSymbol) ex.providerSymbol = d.providerSymbol;
        if (d.currency) ex.currency = d.currency;
        ex.inUniverse = true;
        ex.updatedAt = nowIso();
        updated += 1;
      } else {
        var category = d.watchCategory || opts.category || universeCategory(d);
        items.push({
          id: uid(), canonicalSymbol: key,
          displaySymbol: d.displaySymbol || key,
          assetName: d.assetName || d.displaySymbol || key,
          assetType: d.assetType || "", market: d.market || "",
          providerSymbol: d.providerSymbol || key, currency: d.currency || "",
          watchReason: d.watchReason || "ติดตามจาก AI Boom Universe",
          watchCategory: category,
          targetBuyZone: fin(d.targetBuyZone), targetSellZone: fin(d.targetSellZone),
          supportLevel: null, resistanceLevel: null,
          alertRules: defaultRulesFor(category),
          isActive: true, notes: d.notes || "",
          source: "ai_boom", inUniverse: true,
          createdAt: nowIso(), updatedAt: nowIso()
        });
        added += 1;
      }
    });
    if (opts.archiveMissing) {
      items.forEach(function (i) {
        var key = canonicalize(i.canonicalSymbol);
        if (i.source === "ai_boom" && i.isActive !== false && !incoming[key]) {
          i.isActive = false; i.inUniverse = false; i.updatedAt = nowIso(); archived += 1;
        }
      });
    }
    write(items);
    return {
      added: added, updated: updated, archived: archived,
      total: descriptors.length,
      active: items.filter(function (i) { return i.isActive !== false; }).length
    };
  }

  // ----------------------------------------------------------------- history
  function readHistory() {
    try { var raw = JSON.parse(global.localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(raw) ? raw : []; } catch (e) { return []; }
  }
  function appendHistory(events) {
    if (!events || !events.length) return;
    var hist = readHistory();
    var next = events.concat(hist).slice(0, HISTORY_MAX);
    try { global.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  // Evaluate all active items against a snapshot; returns {evaluationsBySymbol, triggeredToday}
  function evaluateAll(snapshot) {
    var items = read().filter(function (i) { return i.isActive !== false; });
    var evaluationsBySymbol = {}, triggeredToday = [];
    items.forEach(function (item) {
      var key = canonicalize(item.canonicalSymbol);
      var ctx = contextFromSnapshot(key, snapshot, item);
      var ev = evaluate(item, ctx);
      ev.timingScore = ctx.timingScore;
      ev.price = ctx.price;
      evaluationsBySymbol[key] = ev;
      if (ev.triggered) triggeredToday.push({ canonicalSymbol: key, displaySymbol: item.displaySymbol, ev: ev });
    });
    return { evaluationsBySymbol: evaluationsBySymbol, triggeredToday: triggeredToday };
  }

  // ----------------------------------------------------------------- modal (browser)
  function openModal(prefill) {
    if (!global.document) return;
    prefill = prefill || {};
    var key = canonicalize(prefill.canonicalSymbol || prefill.displaySymbol || prefill.symbol || "");
    var existing = key ? getBySymbol(key) : null;
    var data = existing || prefill;
    if (document.getElementById("wl-modal")) document.getElementById("wl-modal").remove();

    var overlay = document.createElement("div");
    overlay.id = "wl-modal";
    overlay.className = "wl-modal-overlay";
    var catOptions = Object.keys(CATEGORIES).map(function (k) {
      return '<option value="' + k + '"' + ((data.watchCategory || "buy") === k ? " selected" : "") + ">" + CATEGORIES[k].label + " · " + CATEGORIES[k].thai + "</option>";
    }).join("");
    overlay.innerHTML =
      '<div class="wl-modal-card">' +
        '<div class="wl-modal-head"><strong>' + (existing ? "แก้ไข Watchlist" : "เพิ่มเข้า Watchlist") + '</strong>' +
        (existing ? '<span class="wl-already">อยู่ใน Watchlist แล้ว</span>' : "") + '</div>' +
        '<label>Symbol<input id="wlSym" value="' + esc(data.displaySymbol || key) + '" ' + (existing ? "readonly" : "") + '></label>' +
        '<label>ชื่อสินทรัพย์<input id="wlName" value="' + esc(data.assetName || "") + '"></label>' +
        '<label>หมวด (Category)<select id="wlCat">' + catOptions + '</select></label>' +
        '<label>เหตุผลที่ติดตาม<input id="wlReason" value="' + esc(data.watchReason || "") + '" placeholder="เช่น รอ EMA ตัดขึ้น"></label>' +
        '<div class="wl-modal-grid">' +
          '<label>เป้าซื้อ (Buy)<input id="wlBuy" type="number" step="any" value="' + (data.targetBuyZone != null ? data.targetBuyZone : "") + '"></label>' +
          '<label>เป้าขาย (Sell)<input id="wlSell" type="number" step="any" value="' + (data.targetSellZone != null ? data.targetSellZone : "") + '"></label>' +
        '</div>' +
        '<label>โน้ต<input id="wlNotes" value="' + esc(data.notes || "") + '"></label>' +
        '<p class="wl-modal-hint">Alert rules จะใช้ค่าเริ่มต้นตามหมวดที่เลือก (แก้ละเอียดได้ภายหลังในหน้า Watchlist)</p>' +
        '<div class="wl-modal-actions">' +
          (existing ? '<button class="wl-btn wl-btn-danger" id="wlRemove">ลบออก</button>' : "") +
          '<button class="wl-btn" id="wlCancel">ยกเลิก</button>' +
          '<button class="wl-btn wl-btn-primary" id="wlSave">' + (existing ? "บันทึก" : "เพิ่ม") + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    var cancel = document.getElementById("wlCancel"); if (cancel) cancel.addEventListener("click", close);
    var rm = document.getElementById("wlRemove");
    if (rm) rm.addEventListener("click", function () { if (existing) remove(existing.id); close(); });
    document.getElementById("wlSave").addEventListener("click", function () {
      var cat = document.getElementById("wlCat").value;
      add({
        canonicalSymbol: key || canonicalize(document.getElementById("wlSym").value),
        displaySymbol: data.displaySymbol || document.getElementById("wlSym").value,
        assetName: document.getElementById("wlName").value,
        assetType: data.assetType, providerSymbol: data.providerSymbol, currency: data.currency, market: data.market,
        watchCategory: cat,
        watchReason: document.getElementById("wlReason").value,
        notes: document.getElementById("wlNotes").value,
        targetBuyZone: document.getElementById("wlBuy").value,
        targetSellZone: document.getElementById("wlSell").value,
        alertRules: existing && existing.watchCategory === cat ? existing.alertRules : defaultRulesFor(cat),
        // Editing must not change archived/origin state; a fresh add defaults to active+manual.
        isActive: existing ? existing.isActive : true,
        source: existing ? existing.source : "manual",
        inUniverse: existing ? existing.inUniverse : false
      });
      close();
    });
  }

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }

  var api = {
    STORE_KEY: STORE_KEY, HISTORY_KEY: HISTORY_KEY,
    CATEGORIES: CATEGORIES, RULE_TYPES: RULE_TYPES, STATUS_THAI: STATUS_THAI,
    canonicalize: canonicalize, defaultRulesFor: defaultRulesFor, ruleLabel: ruleLabel,
    evaluate: evaluate, contextFromSnapshot: contextFromSnapshot, evaluateAll: evaluateAll, nearestSR: nearestSR,
    read: read, write: write, getBySymbol: getBySymbol, has: has, add: add, update: update, remove: remove, archive: archive, activate: activate,
    syncFromUniverse: syncFromUniverse, universeCategory: universeCategory,
    readHistory: readHistory, appendHistory: appendHistory, openModal: openModal
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global) global.Watchlist = api;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
