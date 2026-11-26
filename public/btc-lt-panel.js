(function () {
  "use strict";

  // ============================================================
  // Bitcoin Monitor · Long-term On-chain panel — the top block of the On-chain Deep Dive.
  // Plan docs/superpowers/plans/2026-11-26-btc-lt-onchain.md (Task 3) ·
  // spec docs/superpowers/specs/2026-11-26-btc-lt-onchain-design.md · styles public/btc-lt-panel.css
  //
  // window.BtcLtPanel = { model, html, wire, downsample, normUi }
  //   model({ onchain, history, livePrice, valuationZone, intelCycle, today }) → Model
  //     onchain = BtcOnchainLive.get() — BGeometrics: lthRealizedPrice · activeInvestorPrice · lthSopr · lthSupply
  //               (+ realizedPrice, used only when Coin Metrics has none)
  //     history = BtcLtHistory.get()   — Coin Metrics: price · mvrvZ (point-in-time) · realizedPrice ·
  //               Blockchain.com: puell
  //     Every score number comes from window.BtcLtSignal (read when model() runs). This file routes data,
  //     keeps the expensive history (score rows · backtests · cycle markers) until a series array changes,
  //     and draws. A throw inside the engine is recorded in model.errors and shown, never rethrown.
  //   html(model, ui) → string · ui = { range: 365|730|1461|"all", view: "price"|"score"|"mvrvZ"|"puell"|
  //     "lthSopr"|"lthSupply", showPrice } (anything else falls back to normUi's defaults)
  //   wire(rootEl, onChange) — range / view / price buttons → onChange(nextUi) + the chart hover read-out.
  //     Call it after every render: one listener set per element, the newest onChange wins.
  // No network, no storage. Missing data reads "ไม่มีข้อมูล" everywhere — never 0, never a made-up value.
  // Charts: hand-drawn SVG like the Deep Dive cards (bitcoin-monitor-page.js ddChart) · ≤ 600 points per
  // line (min/max per bucket, so a one-day spike survives) · time-based x axis (series start on different days).
  // ============================================================

  var DAY = 86400000;
  var MAX_PTS = 600;
  var MINUS = "−";
  var NA_TEXT = "ไม่มีข้อมูล";
  var NA = '<span class="btc-lt-na">' + NA_TEXT + "</span>";
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  var RANGES = [365, 730, 1461, "all"];
  var RANGE_LABEL = { 365: "1Y", 730: "2Y", 1461: "4Y", all: "ทั้งหมด" };
  var RANGE_NAME = { 365: "1 ปี", 730: "2 ปี", 1461: "4 ปี", all: "ทั้งหมด" };
  var VIEWS = ["price", "score", "mvrvZ", "puell", "lthSopr", "lthSupply"];
  var VIEW_LABEL = { price: "ราคา", score: "คะแนน", mvrvZ: "MVRV-Z", puell: "Puell", lthSopr: "LTH-SOPR", lthSupply: "LTH Supply" };
  var DEFAULT_UI = { range: 1461, view: "score", showPrice: true };

  // the plan's point-in-time rules (Task 2 inputsAt): a key's value on day d = its newest row dated ≤ d − lag,
  // and a row older than MAX_AGE_DAYS from there counts as missing
  var LAGS = { lthRealizedPrice: 7, activeInvestorPrice: 7, lthSopr: 7, lthSupply: 7, mvrvZ: 1, puell: 1, price: 0 };
  var MAX_AGE_DAYS = 21;
  var BG_KEYS = ["lthRealizedPrice", "activeInvestorPrice", "lthSopr", "lthSupply"];
  var LTH_FAMILY_KEYS = ["lthSopr", "lthSupply"];   // without one of these the "full" signal is only the core one
  var HORIZONS = [180, 365];

  // labels / order when the engine is not loaded — the engine's own STATES / WEIGHTS / labels win
  var STATES = [
    { key: "strong", min: 80, en: "Strong Accumulation", th: "น่าสะสมมาก" },
    { key: "accum", min: 65, en: "Accumulation", th: "น่าสะสม" },
    { key: "neutral", min: 45, en: "Neutral", th: "กลาง ๆ" },
    { key: "risk", min: 30, en: "Distribution Risk", th: "เสี่ยงช่วงแจกของ" },
    { key: "hot", min: 0, en: "Overheated / High Risk", th: "ร้อนแรง / เสี่ยงสูง" }
  ];
  var WEIGHTS = { valuation: 40, lth: 35, miner: 25 };
  // glass tone = the state the engine computed (glass-cards rule: middle = normal · no status = neutral)
  var STATE_TONE = { strong: "gc-calm", accum: "gc-calm", neutral: "gc-normal", risk: "gc-warning", hot: "gc-danger" };
  var ANSWER_TONE = { green: "gc-calm", gray: "gc-neutral", amber: "gc-warning", red: "gc-danger" };
  var FAMILIES = [["valuation", "มูลค่าเทียบต้นทุน"], ["lth", "พฤติกรรมผู้ถือระยะยาว (LTH)"], ["miner", "นักขุด"]];
  // why = what the number measures — the row already shows value · zone · score, so the line under it
  // explains instead of repeating them (the engine's own reason sentence restates all three)
  var MEMBER = {
    mvrvZ: { label: "MVRV Z-Score", src: "Coin Metrics · คิดเองแบบ point-in-time", fmt: "fix", alt: "mvrvZ",
      why: "มูลค่าตลาดห่างจากต้นทุนรวมของทุกเหรียญ (Realized Cap) กี่เท่าของความผันผวนสะสม — ใกล้ 0 = ราคาใกล้ต้นทุนรวม" },
    lthCostRatio: { label: "ราคา ÷ LTH Realized Price", src: "BGeometrics + ราคา", fmt: "ratio", alt: "lthRealizedPrice",
      why: "ราคาเป็นกี่เท่าของต้นทุนเฉลี่ยของคนถือเกิน 155 วัน — ต่ำกว่า 1× = ผู้ถือระยะยาวขาดทุนเฉลี่ย" },
    aipRatio: { label: "ราคา ÷ Active Investor Price", src: "BGeometrics + ราคา", fmt: "ratio", alt: "activeInvestorPrice",
      why: "ราคาเป็นกี่เท่าของต้นทุนเฉลี่ยของเหรียญที่ยังเคลื่อนไหว (True Market Mean) — ต่ำกว่า 1× = ต่ำกว่าต้นทุนนักลงทุนที่ยังอยู่ในตลาด" },
    lthSopr7: { label: "LTH-SOPR (เฉลี่ย 7 วัน)", src: "BGeometrics", fmt: "fix", alt: "lthSopr",
      why: "เหรียญที่ผู้ถือระยะยาวขายออก ขายได้กี่เท่าของทุนตอนได้มา — ต่ำกว่า 1 = ขายต่ำกว่าทุน" },
    lthNetPct: { label: "LTH Net Position (30 วัน)", src: "BGeometrics", fmt: "pct", alt: "lthSupply",
      why: "จำนวนเหรียญในมือผู้ถือระยะยาวเปลี่ยนไปกี่ % ใน 30 วัน — บวก = สะสมเพิ่ม · ลบ = ขายออก" },
    puell: { label: "Puell Multiple", src: "Blockchain.com · คิดเอง", fmt: "fix", alt: "puell",
      why: "รายได้จากการขุด (ไม่รวมค่าธรรมเนียม) เทียบค่าเฉลี่ย 365 วัน เฉลี่ย 7 วัน — ต่ำ = นักขุดรายได้ฝืด มักเกิดช่วงใกล้ก้น" }
  };
  var SERIES_LABEL = { price: "ราคา BTC", mvrvZ: "MVRV-Z", puell: "Puell Multiple", lthRealizedPrice: "LTH Realized Price",
    activeInvestorPrice: "Active Investor Price", lthSopr: "LTH-SOPR", lthSupply: "LTH Supply", realizedPrice: "Realized Price" };
  var COST_SW = { lthRealizedPrice: "is-lth", activeInvestorPrice: "is-aip", realizedPrice: "is-realized" };
  var BG_ERR = { "rate-limited": "โควตาฟรีหมด (ชั่วโมงละ 10 · วันละ 15 ต่อ IP)", blocked: "ไม่ตอบ — ส่วนใหญ่เพราะโควตาฟรีหมดหรือเน็ตหลุด", unreachable: "ติดต่อไม่สำเร็จ" };
  var SRC_STATUS = { ok: ["ปกติ", "ok"], partial: ["ได้บางส่วน", "warn"], stale: ["ใช้ข้อมูลเดิม", "warn"], error: ["ล้มเหลว", "err"], loading: ["กำลังโหลด", "muted"], none: [NA_TEXT, "muted"] };
  // what the score cannot know — shown on the card (the coordinator's three notes, 2026-11-26)
  var LIMITS = [
    "เกณฑ์ตั้งโดยรู้ผลรอบที่ผ่านมาแล้ว (in-sample) และหน้าต่างผลตอบแทนของวันติดกันซ้อนกัน — ผลย้อนหลังจึงดูดีกว่าที่จะเกิดจริง",
    "ยอดของแต่ละรอบต่ำลงเรื่อย ๆ คะแนนจึงอาจไม่ลงถึงโซนร้อนแรงตอนยอดรอบใหม่",
    "เกณฑ์ของกลุ่ม LTH และ Active Investor เป็นค่าเริ่มต้น ยังไม่ได้ตรวจกับข้อมูลหลายรอบ (ข้อมูลฟรีมีราว 4 ปี)"
  ];

  // ---------------------------------------------------------------- helpers
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function obj(v) { return v && typeof v === "object" ? v : null; }
  function msOf(d) { return Date.parse(d + "T00:00:00Z"); }
  function isoOf(t) { return new Date(t).toISOString().slice(0, 10); }
  function addDays(d, n) { return isoOf(msOf(d) + n * DAY); }
  function isDay(d) { return typeof d === "string" && DATE_RE.test(d) && isFinite(msOf(d)); }
  function dayOf(v) { var s = typeof v === "string" ? v.slice(0, 10) : ""; return isDay(s) ? s : null; }
  function round1(v) { return Math.round(v * 10) / 10; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function copy(o) { var r = {}; for (var k in o) if (has(o, k)) r[k] = o[k]; return r; }

  function fixed(v, d) { var s = Math.abs(v).toFixed(d); return (v < 0 && Number(s) !== 0 ? MINUS : "") + s; }
  function signed(v, d) { var s = Math.abs(v).toFixed(d); return (Number(s) === 0 ? "" : v > 0 ? "+" : MINUS) + s; }
  function fix2(v) { return fixed(v, 2); }
  function usd(v) {
    if (!isNum(v)) return NA_TEXT;
    var a = Math.abs(v);
    return (v < 0 ? MINUS : "") + "$" + (a >= 100 ? Math.round(a).toLocaleString("en-US") : a >= 1 ? a.toFixed(2) : String(Number(a.toPrecision(2))));
  }
  function trimNum(x) { return String(Number(x.toFixed(x < 10 ? 1 : 0))); }
  function usdAxis(v) { return v >= 1e6 ? "$" + trimNum(v / 1e6) + "M" : v >= 1e3 ? "$" + trimNum(v / 1e3) + "k" : v >= 1 ? "$" + trimNum(v) : "$" + Number(v.toPrecision(1)); }
  function btcM(v) { return fixed(v / 1e6, 2) + "M"; }
  function scoreTxt(v) { return String(Math.round(v)); }
  function pctTxt(v) { return signed(v, Math.abs(v) < 10 ? 1 : 0) + "%"; }
  function fmtMember(key, v) { var f = (MEMBER[key] || {}).fmt; return f === "ratio" ? fixed(v, 2) + "×" : f === "pct" ? signed(v, 2) + "%" : fixed(v, 2); }

  function thDate(d, o) { try { return new Date(msOf(d)).toLocaleDateString("th-TH", o); } catch (e) { return d; } }
  function thDay(d) { return thDate(d, { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }); }
  function thMonth(d) { return thDate(d, { month: "short", year: "2-digit", timeZone: "UTC" }); }
  function timeTag(d) { var x = dayOf(d); return x ? '<time datetime="' + x + '">' + esc(thDay(x)) + "</time>" : NA; }
  function whenTag(s) {
    var t = typeof s === "string" ? Date.parse(s) : NaN;
    if (!isFinite(t)) return NA;
    var txt;
    try { txt = new Date(t).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { txt = s; }
    return '<time datetime="' + esc(new Date(t).toISOString()) + '">' + esc(txt) + "</time>";
  }

  // ---------------------------------------------------------------- series
  // [[YYYY-MM-DD, finite number], …] oldest → newest, one row per day — anything else is dropped (a null is never a 0)
  function clean(rows) {
    if (!Array.isArray(rows)) return null;
    var out = [], sorted = true, prev = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !isDay(r[0]) || !isNum(r[1])) continue;
      if (prev != null && r[0] <= prev) sorted = false;
      prev = r[0];
      out.push(r);
    }
    if (!sorted) {
      out.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });   // stable: the later duplicate stays last
      out = out.filter(function (r, i) { return i === out.length - 1 || out[i + 1][0] !== r[0]; });
    }
    return out.length ? out : null;
  }
  function lastPos(rows) { if (!rows) return null; for (var i = rows.length - 1; i >= 0; i--) if (rows[i][1] > 0) return rows[i]; return null; }
  // the latest first day among the keys (needAll: null when one is missing)
  function laterStart(sm, keys, needAll) {
    var out = null;
    for (var i = 0; i < keys.length; i++) {
      var r = sm[keys[i]];
      if (!r) { if (needAll) return null; continue; }
      if (out == null || r[0][0] > out) out = r[0][0];
    }
    return out;
  }
  function edgeDay(sm, keys, last, pick) {
    var out = null;
    for (var i = 0; i < keys.length; i++) {
      var r = sm[keys[i]];
      if (!r) continue;
      var d = last ? r[r.length - 1][0] : r[0][0];
      if (out == null || (pick === "max" ? d > out : d < out)) out = d;
    }
    return out;
  }

  // ≤ max rows: the first and last kept, and per bucket its lowest and highest row in date order —
  // a one-day spike or crash survives the thinning (a plain stride would drop it)
  function downsample(rows, max) {
    if (!Array.isArray(rows)) return [];
    max = isNum(max) && max >= 4 ? Math.floor(max) : MAX_PTS;
    var n = rows.length;
    if (n <= max) return rows;
    var buckets = Math.floor((max - 2) / 2), inner = n - 2, out = [rows[0]];
    for (var b = 0; b < buckets; b++) {
      var s = 1 + Math.floor(b * inner / buckets), e = 1 + Math.floor((b + 1) * inner / buckets);
      if (e <= s) continue;
      var lo = s, hi = s;
      for (var i = s + 1; i < e; i++) { if (rows[i][1] < rows[lo][1]) lo = i; if (rows[i][1] > rows[hi][1]) hi = i; }
      if (lo === hi) out.push(rows[lo]);
      else if (lo < hi) { out.push(rows[lo]); out.push(rows[hi]); }
      else { out.push(rows[hi]); out.push(rows[lo]); }
    }
    out.push(rows[n - 1]);
    return out;
  }

  // ---------------------------------------------------------------- model
  function engine() {
    var S = typeof window !== "undefined" ? window.BtcLtSignal : null;
    return S && typeof S.inputsAt === "function" && typeof S.score === "function" ? S : null;
  }
  // one engine call — a throw is recorded (and shown) instead of breaking the whole Deep Dive
  function attempt(errors, what, fn) {
    try { return fn(); } catch (e) { errors.push(what + ": " + (e && e.message ? e.message : String(e))); return null; }
  }
  function liveOf(lp, today) {
    if (isNum(lp) && lp > 0) return { value: lp, asOf: today, source: "ราคาล่าสุดบนหน้านี้" };
    var o = obj(lp);
    if (o && isNum(o.value) && o.value > 0) return { value: o.value, asOf: dayOf(o.at) || today, source: typeof o.source === "string" && o.source ? o.source : "ราคาล่าสุดบนหน้านี้" };
    return null;
  }
  function sameRefs(a, b) { if (!a || !b || a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  var memo = null;   // { refs, hist, errors } — score rows / backtests / markers only change when a series array changes

  function historyOf(S, sm, today, opts, errors) {
    var h = { core: { rows: [], backtest: null }, full: { rows: [], backtest: null }, markers: [] };
    function rowsOf(v) { return Array.isArray(v) ? v : []; }
    if (typeof S.scoreSeries === "function") {
      // core = MVRV-Z + Puell (since ~2011): both must exist, from the later start + their 1-day lag
      var cs = laterStart(sm, ["mvrvZ", "puell"], true);
      if (cs) {
        h.core.rows = rowsOf(attempt(errors, "สัญญาณแกนย้อนหลัง", function () {
          return S.scoreSeries(sm, { from: addDays(cs, Math.max(LAGS.mvrvZ, LAGS.puell)), to: today, mode: "core", opts: opts });
        }));
      }
      // full = all 6 indicators — only with an LTH-family series, from the day every BGeometrics series present has
      // started (+ its 7-day lag) to the day they go stale (+ lag + max age): outside that it is the core signal again
      if (LTH_FAMILY_KEYS.some(function (k) { return !!sm[k]; })) {
        var fs = laterStart(sm, BG_KEYS, false), fe = edgeDay(sm, BG_KEYS, true, "min");
        var from = addDays(fs, LAGS.lthRealizedPrice), to = addDays(fe, LAGS.lthRealizedPrice + MAX_AGE_DAYS);
        if (to > today) to = today;
        if (from <= to) {
          h.full.rows = rowsOf(attempt(errors, "สัญญาณเต็มย้อนหลัง", function () {
            return S.scoreSeries(sm, { from: from, to: to, mode: "full", opts: opts });
          }));
        }
      }
    }
    if (sm.price) {
      if (typeof S.backtest === "function") {
        if (h.core.rows.length) h.core.backtest = obj(attempt(errors, "ผลย้อนหลังสัญญาณแกน", function () { return S.backtest(h.core.rows, sm.price, { horizons: HORIZONS.slice() }); }));
        if (h.full.rows.length) h.full.backtest = obj(attempt(errors, "ผลย้อนหลังสัญญาณเต็ม", function () { return S.backtest(h.full.rows, sm.price, { horizons: HORIZONS.slice() }); }));
      }
      if (typeof S.cycleMarkers === "function") h.markers = rowsOf(attempt(errors, "จุดยอด/ก้นของแต่ละรอบ", function () { return S.cycleMarkers(sm.price); }));
    }
    return h;
  }

  function costRow(key, label, sub, value, asOf, source, price) {
    var v = isNum(value) && value > 0 ? value : null;
    return { key: key, label: label, sub: sub, value: v, pct: v != null && price != null ? round1((price - v) / v * 100) : null,
      asOf: v != null ? dayOf(asOf) : null, source: v != null ? source : null };
  }

  function srcBg(oc, sm) {
    var have = BG_KEYS.filter(function (k) { return !!sm[k]; }), miss = BG_KEYS.filter(function (k) { return !sm[k]; });
    var err = typeof oc.error === "string" && oc.error ? oc.error : null;
    var status = have.length ? (err ? "stale" : miss.length ? "partial" : "ok") : oc.loading ? "loading" : err ? "error" : "none";
    var note = "กลุ่มผู้ถือระยะยาว + Active Investor · ฟรี ข้อมูลช้าราว 7 วัน";
    if (have.length && miss.length) note += " · ขาด: " + miss.map(function (k) { return SERIES_LABEL[k]; }).join(", ");
    if (err) note += " · " + (has(BG_ERR, err) ? BG_ERR[err] : "ผิดพลาด: " + err) + (have.length ? " — ใช้ข้อมูลล่าสุดที่เก็บไว้" : "");
    return { key: "bgeometrics", name: "BGeometrics (bitcoin-data.com)", at: typeof oc.fetchedAt === "string" ? oc.fetchedAt : null,
      latest: edgeDay(sm, BG_KEYS, true, "max"), ok: status === "ok", status: status, note: note };
  }
  function srcHist(hi, sm, key, name, keys, what) {
    var s = obj(obj(hi.sources) && hi.sources[key]) || {};
    var have = keys.some(function (k) { return !!sm[k]; });
    var err = typeof s.error === "string" && s.error ? s.error : null;
    var status = have ? (s.ok === false ? "stale" : "ok") : hi.loading ? "loading" : s.ok === false ? "error" : "none";
    var note = what + (status === "stale" ? " · ใช้ข้อมูลเดิม" + (err ? ": " + err : "") : status === "error" ? " · ดึงไม่สำเร็จ" + (err ? ": " + err : "") : "");
    return { key: key, name: name, at: typeof s.at === "string" && s.at ? s.at : null, latest: edgeDay(sm, keys, true, "max"), ok: status === "ok", status: status, note: note };
  }

  function model(args) {
    args = obj(args) || {};
    var oc = obj(args.onchain) || {}, hi = obj(args.history) || {};
    var ocs = obj(oc.series) || {}, his = obj(hi.series) || {};
    var today = isDay(args.today) ? args.today : isoOf(Date.now());
    var live = liveOf(args.livePrice, today);
    var S = engine(), errors = [];

    var sm = {};
    function put(k, rows) { var c = clean(rows); if (c) sm[k] = c; }
    put("price", his.price); put("mvrvZ", his.mvrvZ); put("puell", his.puell);
    for (var i = 0; i < BG_KEYS.length; i++) put(BG_KEYS[i], ocs[BG_KEYS[i]]);
    // Realized Price is display-only (the score does not use it): Coin Metrics' multi-cycle line first
    var realized = clean(his.realizedPrice), realizedSrc = "Coin Metrics (ราคา ÷ MVRV)";
    if (!realized) { realized = clean(ocs.realizedPrice); realizedSrc = "BGeometrics"; }

    var opts = { lags: copy(LAGS), maxAgeDays: MAX_AGE_DAYS };
    var liveOpts = { lags: copy(LAGS), maxAgeDays: MAX_AGE_DAYS };
    if (live) liveOpts.livePrice = live.value;

    var inputs = null, signal = null, trend = null, answers = [];
    var hist = { core: { rows: [], backtest: null }, full: { rows: [], backtest: null }, markers: [] };
    if (S) {
      inputs = obj(attempt(errors, "อินพุตของคะแนน", function () { return S.inputsAt(sm, today, liveOpts); }));
      // the engine stamps a live price with the cutoff (today) — the data line must say the price's own day
      if (inputs && live && obj(inputs.asOf)) inputs.asOf.price = live.asOf;
      if (inputs) signal = obj(attempt(errors, "คะแนน", function () { return S.score(inputs); }));
      if (signal && isNum(signal.total) && typeof S.trend === "function") {
        // the 30-day change runs on history prices (no live price in the past); "now" is the score on screen
        var tr = obj(attempt(errors, "แนวโน้ม 30 วัน", function () { return S.trend(sm, today, 30, opts); }));
        var then = tr && isNum(tr.then) ? tr.then : null;
        trend = { days: 30, now: signal.total, then: then, delta: then == null ? null : signal.total - then, thenDate: (tr && dayOf(tr.thenDate)) || addDays(today, -30) };
      }
      if (typeof S.answers === "function") {
        var a = attempt(errors, "5 คำถาม", function () {
          return S.answers({ inputs: inputs, result: signal, valuationZone: obj(args.valuationZone), intelCycle: typeof args.intelCycle === "string" && args.intelCycle ? args.intelCycle : null,
            priceSeries: sm.price || null, today: today });
        });
        answers = Array.isArray(a) ? a : [];
      }
      var refs = [S, today, his.price, his.mvrvZ, his.puell, ocs.lthRealizedPrice, ocs.activeInvestorPrice, ocs.lthSopr, ocs.lthSupply];
      if (memo && sameRefs(memo.refs, refs)) hist = memo.hist;
      else { var herr = []; hist = historyOf(S, sm, today, opts, herr); memo = { refs: refs, hist: hist, errors: herr }; }
      errors.push.apply(errors, memo.errors);
    }

    // cost basis = the values the score used (inputs.raw · asOf), so the rows and the score agree;
    // without the engine (or an engine without raw) the newest real rows
    var raw = inputs && obj(inputs.raw) ? inputs.raw : null, asOf = inputs && obj(inputs.asOf) ? inputs.asOf : {};
    var pRow = lastPos(sm.price);
    var price = live ? live.value : inputs && isNum(inputs.price) && inputs.price > 0 ? inputs.price : pRow ? pRow[1] : null;
    var priceAsOf = live ? live.asOf : inputs && isNum(inputs.price) && inputs.price > 0 ? dayOf(asOf.price) : pRow ? pRow[0] : null;
    function basis(k) {
      if (raw) return [raw[k], asOf[k]];
      var r = lastPos(sm[k]);
      return r ? [r[1], r[0]] : [null, null];
    }
    var bl = basis("lthRealizedPrice"), ba = basis("activeInvestorPrice"), br = lastPos(realized);
    var cost = {
      price: price, priceAsOf: priceAsOf, priceSource: price == null ? null : live ? live.source : "Coin Metrics",
      rows: [
        costRow("lthRealizedPrice", "LTH Realized Price", "ต้นทุนเฉลี่ยของผู้ถือระยะยาว (ถือเกิน 155 วัน)", bl[0], bl[1], "BGeometrics", price),
        costRow("activeInvestorPrice", "Active Investor Price", "ต้นทุนเฉลี่ยของเหรียญที่ยังเคลื่อนไหว (True Market Mean)", ba[0], ba[1], "BGeometrics", price),
        costRow("realizedPrice", "Realized Price", "ต้นทุนเฉลี่ยของทั้งตลาด", br ? br[1] : null, br ? br[0] : null, realizedSrc, price)
      ]
    };

    var sources = [
      srcBg(oc, sm),
      srcHist(hi, sm, "coinMetrics", "Coin Metrics (community)", ["price", "mvrvZ"], "ราคา · MVRV → Realized Price และ MVRV-Z (คิดเองแบบ point-in-time) · ย้อนได้หลายรอบ"),
      srcHist(hi, sm, "blockchain", "Blockchain.com", ["puell"], "รายได้นักขุด − ค่าธรรมเนียม → Puell Multiple (คิดเอง) · ย้อนได้หลายรอบ")
    ];

    return {
      today: today, inputs: inputs, signal: signal, trend: trend, answers: answers, cost: cost, hist: hist,
      series: { price: sm.price || null, realizedPrice: realized, activeInvestorPrice: sm.activeInvestorPrice || null, lthRealizedPrice: sm.lthRealizedPrice || null,
        mvrvZ: sm.mvrvZ || null, puell: sm.puell || null, lthSopr: sm.lthSopr || null, lthSupply: sm.lthSupply || null },
      states: S && Array.isArray(S.STATES) && S.STATES.length ? S.STATES : STATES,
      weights: S && obj(S.WEIGHTS) ? S.WEIGHTS : WEIGHTS,
      anchors: S && obj(S.ANCHORS) ? S.ANCHORS : null,
      sources: sources,
      loading: { history: !!hi.loading, onchain: !!oc.loading },
      engine: !!S,
      errors: errors
    };
  }

  // ---------------------------------------------------------------- ui
  function parseRange(v) {
    if (v === "all") return "all";
    var n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
    return RANGES.indexOf(n) >= 0 ? n : null;
  }
  function normUi(ui) {
    ui = obj(ui) || {};
    var r = parseRange(ui.range);
    return { range: r == null ? DEFAULT_UI.range : r, view: VIEWS.indexOf(ui.view) >= 0 ? ui.view : DEFAULT_UI.view, showPrice: ui.showPrice !== false };
  }

  // ---------------------------------------------------------------- html · states
  function statesOf(m) { return Array.isArray(m.states) && m.states.length ? m.states : STATES; }
  function stateFind(m, s) {
    var key = typeof s === "string" ? s : obj(s) ? s.key : null, list = statesOf(m);
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function stateByScore(m, v) { var list = statesOf(m); for (var i = 0; i < list.length; i++) if (v >= list[i].min) return list[i]; return list[list.length - 1]; }
  function stateChip(st) { return '<span class="btc-lt-state btc-lt-st-' + esc(st.key) + '" data-lt-state="' + esc(st.key) + '">' + esc(st.en + " · " + st.th) + "</span>"; }
  function coverageOf(r) {
    var c = r ? obj(r.coverage) : null;
    return {
      n: c ? (Array.isArray(c.families) ? c.families.length : isNum(c.families) ? c.families : null) : null,
      of: c && isNum(c.of) ? c.of : FAMILIES.length,
      missing: c && Array.isArray(c.missing) ? c.missing : []
    };
  }
  function memberLabel(r, key) {
    var fams = r ? obj(r.families) || {} : {};
    for (var f in fams) {
      if (!has(fams, f) || !obj(fams[f]) || !Array.isArray(fams[f].members)) continue;
      for (var i = 0; i < fams[f].members.length; i++) { var x = obj(fams[f].members[i]); if (x && x.key === key && typeof x.label === "string" && x.label) return x.label; }
    }
    return MEMBER[key] ? MEMBER[key].label : SERIES_LABEL[key] || String(key);
  }

  // ---------------------------------------------------------------- html · 1 Long-term Signal
  function naReason(m, r) {
    if (m.engine === false) return "เอนจินคะแนนยังไม่พร้อม — ยังคิดคะแนนไม่ได้";
    if (!r) return m.loading && (m.loading.history || m.loading.onchain) ? "กำลังโหลดข้อมูล…" : "ยังคิดคะแนนไม่ได้";
    var c = coverageOf(r);
    return "ข้อมูลไม่พอ — ต้องมีอย่างน้อย 2 จาก " + c.of + " กลุ่ม" + (c.n != null ? " (ตอนนี้มี " + c.n + ")" : "");
  }
  function deltaHtml(t) {
    var d = t && isNum(t.delta) ? Math.round(t.delta) : null;
    if (d == null) return '<div class="btc-lt-delta" data-lt-delta="">Δ 30 วัน: ' + NA_TEXT + "</div>";
    var txt = d === 0 ? "เท่ากับ 30 วันก่อน" : (d > 0 ? "▲ " : "▼ ") + Math.abs(d) + " จุด จาก 30 วันก่อน";
    return '<div class="btc-lt-delta" data-lt-delta="' + d + '">' + esc(txt) + (isNum(t.then) ? " <span>(เดิม " + esc(scoreTxt(t.then)) + ")</span>" : "") + "</div>";
  }
  // the score's own "last updated": the date of each source the inputs came from (BGeometrics = its oldest series)
  function asOfLine(m) {
    var a = m.inputs && obj(m.inputs.asOf) ? m.inputs.asOf : null;
    if (!a) return "";
    var bg = null, parts = [];
    BG_KEYS.forEach(function (k) { var d = dayOf(a[k]); if (d && (bg == null || d < bg)) bg = d; });
    if (dayOf(a.price)) parts.push("ราคา " + timeTag(a.price));
    if (dayOf(a.mvrvZ)) parts.push("Coin Metrics " + timeTag(a.mvrvZ));
    if (bg) parts.push("BGeometrics " + timeTag(bg));
    if (dayOf(a.puell)) parts.push("Blockchain.com " + timeTag(a.puell));
    return parts.length ? '<p class="btc-lt-asof">ข้อมูลที่ใช้คิดคะแนน: ' + parts.join(" · ") + "</p>" : "";
  }
  function memberHtml(m, x) {
    x = obj(x) || {};
    var key = typeof x.key === "string" ? x.key : "", meta = MEMBER[key] || {};
    var hasV = isNum(x.value), sc = isNum(x.score) ? x.score : null;
    var zone = typeof x.zone === "string" ? x.zone : obj(x.zone) ? x.zone.th || x.zone.label || "" : "";
    var a = m.inputs && obj(m.inputs.asOf) ? m.inputs.asOf : {};
    var asOf = hasV ? dayOf(a[key]) || (meta.alt ? dayOf(a[meta.alt]) : null) : null;
    var st = sc != null ? stateByScore(m, sc) : null;
    return '<li class="btc-lt-mem" data-lt-member="' + esc(key) + '">' +
      '<div class="btc-lt-mem-top"><span class="btc-lt-mem-name">' + esc(x.label || meta.label || key) + '</span><b class="btc-lt-mem-val">' + (hasV ? esc(fmtMember(key, x.value)) : NA) + "</b></div>" +
      (hasV ? '<div class="btc-lt-mem-mid">' + (zone ? '<span class="btc-lt-zone btc-lt-st-' + (st ? esc(st.key) : "neutral") + '">' + esc(zone) + "</span>" : "") +
        '<span class="btc-lt-mem-score">คะแนน ' + (sc != null ? esc(String(round1(sc))) : NA) + "</span></div>" : "") +
      (hasV && (meta.why || (typeof x.reason === "string" && x.reason)) ? '<p class="btc-lt-mem-why">' + esc(meta.why || x.reason) + "</p>" : "") +
      (hasV ? '<div class="btc-lt-mem-src">' + esc(meta.src || "แหล่งข้อมูลไม่ระบุ") + " · " + timeTag(asOf) + "</div>" : "") +
      "</li>";
  }
  function famsHtml(m, r) {
    var fams = r ? obj(r.families) || {} : {}, weights = obj(m.weights) || WEIGHTS;
    return '<div class="btc-lt-fams">' + FAMILIES.map(function (f) {
      var F = obj(fams[f[0]]);
      var sc = F && isNum(F.score) ? F.score : null;
      var w = F && isNum(F.weight) ? F.weight : weights[f[0]];
      var mem = F && Array.isArray(F.members) ? F.members : [];
      return '<div class="btc-lt-fam" data-lt-family="' + f[0] + '">' +
        '<div class="btc-lt-fam-head"><span class="btc-lt-fam-name">' + esc(F && typeof F.label === "string" && F.label ? F.label : f[1]) + "</span>" +
        '<span class="btc-lt-fam-w">น้ำหนัก ' + esc(String(w)) + "%</span>" +
        '<b class="btc-lt-fam-score">' + (sc != null ? esc(scoreTxt(sc)) : NA) + "</b></div>" +
        '<div class="btc-lt-bar" aria-hidden="true"><i style="width:' + (sc != null ? clamp(Math.round(sc), 0, 100) : 0) + '%"></i></div>' +
        (mem.length ? '<ul class="btc-lt-mems">' + mem.map(function (x) { return memberHtml(m, x); }).join("") + "</ul>" : '<p class="btc-lt-na-p">' + NA_TEXT + "</p>") +
        "</div>";
    }).join("") + "</div>";
  }
  function signalHtml(m) {
    var r = obj(m.signal);
    var total = r && isNum(r.total) ? Math.round(r.total) : null;
    var st = total != null ? stateFind(m, r.state) || stateByScore(m, total) : null;
    var cov = coverageOf(r);
    var disc = '<p class="btc-lt-disc"><b>ไม่ใช่การทำนายราคา</b> — คะแนนบอกว่าตอนนี้น่าสะสมแค่ไหน เมื่อเทียบราคากับต้นทุนและพฤติกรรมผู้ถือในอดีต</p>';
    var hero = total != null
      ? '<div class="btc-lt-hero"><div class="btc-lt-score"><b class="gc-num" data-lt-total="' + total + '">' + total + '</b><span class="gc-unit">/100</span></div>' +
        '<div class="btc-lt-hero-side">' + stateChip(st) + deltaHtml(m.trend) + disc + asOfLine(m) + "</div></div>"
      : '<div class="btc-lt-hero is-na"><div class="btc-lt-score"><b class="btc-lt-na-big" data-lt-total="">' + NA_TEXT + "</b></div>" +
        '<div class="btc-lt-hero-side"><p class="btc-lt-why-na">' + esc(naReason(m, r)) + "</p>" + disc + "</div></div>";
    var miss = r && cov.missing.length
      ? '<p class="btc-lt-covnote">ขาด: ' + esc(cov.missing.map(function (k) { return memberLabel(r, k); }).join(", ")) + (total != null ? " — คะแนนคิดจากกลุ่มที่มีข้อมูล" : "") + "</p>" : "";
    var reasons = r && Array.isArray(r.reasons) ? r.reasons.filter(function (s) { return typeof s === "string" && s; }) : [];
    return '<section data-lt-section="signal" class="btc-lt-sig gc-card gc-tile ' + (st ? STATE_TONE[st.key] || "gc-neutral" : "gc-neutral") + '" aria-labelledby="btcLtSigH">' +
      '<div class="btc-lt-head"><div><div class="btc-lt-kicker">On-chain ระยะยาว · แยกจากคะแนนจังหวะเดิม</div><h3 class="btc-lt-h" id="btcLtSigH">Long-term Signal</h3></div>' +
      (cov.n != null ? '<span class="btc-lt-cov" data-lt-coverage="' + cov.n + '">ครอบคลุม ' + cov.n + "/" + cov.of + " กลุ่ม</span>" : "") + "</div>" +
      hero + famsHtml(m, r) + miss +
      (reasons.length ? '<details class="btc-lt-why"><summary>เหตุผลแบบสรุป</summary><ul class="btc-lt-reasons">' + reasons.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></details>" : "") +
      '<ul class="btc-lt-limits" aria-label="ข้อจำกัดของคะแนน">' + LIMITS.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
      "</section>";
  }

  // ---------------------------------------------------------------- html · 2 five questions
  function evidenceText(e) {
    if (typeof e === "string") return e;
    if (Array.isArray(e)) return e.filter(function (x) { return x != null && x !== ""; }).map(String).join(" · ");
    if (isNum(e)) return String(e);
    return "";
  }
  // a gauge per answer (user 2026-11-26: "เห็นรูปแล้วรู้เลยว่าถูกหรือแพง") — needle at 1 − score/100 (left = cheap),
  // the 4 bands = the answer tones (score ≥ 65 green · ≥ 45 grey · ≥ 30 amber · else red); the evidence folds away
  var Q_SHORT = { lthCost: "ราคาเทียบต้นทุนสายยาว", lthFlow: "สายยาวสะสม/ขายออก", lthProfit: "สายยาวขายกำไร/ขาดทุน", value: "ถูก/แพงเทียบต้นทุน", cycle: "ช่วงของวัฏจักร" };
  // <details> the viewer opened — kept across html() (the page re-renders on data events) · filled by wire()
  var OPEN = {};
  function openAttr(key) { return ' data-lt-open="' + esc(key) + '"' + (OPEN[key] ? " open" : ""); }
  var TONE_CLS = { green: "g", gray: "y", amber: "a", red: "r" };
  var TONE_WORD = { green: "ถูก", gray: "กลาง ๆ", amber: "ระวัง", red: "แพง" };
  var GAUGE_BANDS = [[0, 0.35, "g"], [0.35, 0.55, "y"], [0.55, 0.7, "a"], [0.7, 1, "r"]];
  function verdictOf(s) { return s >= 80 ? "ถูกมาก" : s >= 65 ? "ถูก" : s >= 45 ? "กลาง ๆ" : s >= 30 ? "ระวัง" : s >= 15 ? "แพง" : "แพงมาก"; }
  function gaugePt(p, r) { var th = Math.PI * (1 - p); return (60 + r * Math.cos(th)).toFixed(2) + " " + (62 - r * Math.sin(th)).toFixed(2); }
  function gaugeSvg(score) {
    var arcs = GAUGE_BANDS.map(function (b) { return '<path class="btc-lt-gz is-' + b[2] + '" d="M' + gaugePt(b[0], 48) + " A48 48 0 0 1 " + gaugePt(b[1], 48) + '"/>'; }).join("");
    var needle = "";
    if (score != null) {
      var p = 1 - clamp(score, 0, 100) / 100, tip = gaugePt(p, 40).split(" ");
      needle = '<g class="btc-lt-gn" data-lt-needle="' + p.toFixed(3) + '"><line x1="60" y1="62" x2="' + tip[0] + '" y2="' + tip[1] + '"/><circle cx="60" cy="62" r="5"/></g>';
    }
    return '<svg class="btc-lt-gauge" viewBox="0 0 120 72" aria-hidden="true" focusable="false">' + arcs + needle +
      '<text class="btc-lt-gl is-g" x="6" y="71">ถูก</text><text class="btc-lt-gl is-r" x="114" y="71" text-anchor="end">แพง</text></svg>';
  }
  function questionsHtml(m) {
    var list = Array.isArray(m.answers) ? m.answers.filter(obj) : [];
    var title = '<h3 class="btc-lt-h" id="btcLtQsH">5 คำถามของนักลงทุนระยะยาว</h3>';
    if (!list.length) return '<section data-lt-section="questions" class="btc-lt-qs" aria-labelledby="btcLtQsH">' + title +
      '<p class="btc-lt-na-p">' + NA_TEXT + " — " + esc(m.engine === false ? "เอนจินคะแนนยังไม่พร้อม" : "ข้อมูลไม่พอ") + "</p></section>";
    var cnt = { g: 0, y: 0, a: 0, r: 0, n: 0 }, warn = [], dear = [], dots = [];
    var cards = list.map(function (q, i) {
      var tone = has(TONE_CLS, q.tone) ? q.tone : "gray";
      // score null = no data (no needle) · no score field at all (an older model) = no needle, the word follows the tone
      var sc = isNum(q.score) ? clamp(q.score, 0, 100) : null, noData = sc == null && q.score === null;
      var cls = noData ? "n" : TONE_CLS[tone];
      var word = noData ? NA_TEXT : sc != null ? verdictOf(sc) : TONE_WORD[tone];
      var name = Q_SHORT[q.id] || q.q || "";
      if (noData) cnt.n++; else if (tone === "green") cnt.g++; else if (tone === "gray") cnt.y++; else if (tone === "amber") { cnt.a++; warn.push(name); } else { cnt.r++; dear.push(name); }
      dots.push('<i class="is-' + cls + '"></i>');
      var ev = evidenceText(q.evidence), id = q.id || "q" + (i + 1);
      return '<article data-lt-q="' + esc(q.id || "q" + (i + 1)) + '" data-lt-tone="' + esc(q.tone || "gray") + '"' + (sc != null ? ' data-lt-score="' + round1(sc) + '"' : "") +
        ' class="btc-lt-q gc-card gc-tile ' + (ANSWER_TONE[q.tone] || "gc-neutral") + '"><p class="btc-lt-q-q">' + esc(q.q || "") + "</p>" + gaugeSvg(noData ? null : sc) +
        '<p class="btc-lt-q-v is-' + cls + '">' + esc(word) + '</p><p class="btc-lt-q-a">' + esc(q.a || NA_TEXT) + "</p>" +
        (ev ? '<details class="btc-lt-q-more"' + openAttr("q:" + id) + '><summary aria-label="' + esc("รายละเอียด: " + name) + '">รายละเอียด</summary><p class="btc-lt-q-ev">' + esc(ev) + "</p></details>" : "") + "</article>";
    }).join("");
    var parts = [];
    if (cnt.g) parts.push('<b class="is-g">' + cnt.g + " ข้อ</b> ชี้ว่าถูก");
    if (cnt.y) parts.push('<b class="is-y">' + cnt.y + " ข้อ</b> กลาง ๆ");
    if (cnt.a) parts.push('<b class="is-a">' + cnt.a + " ข้อ</b> ให้ระวัง (" + esc(warn.join(", ")) + ")");
    if (cnt.r) parts.push('<b class="is-r">' + cnt.r + " ข้อ</b> ชี้ว่าแพง (" + esc(dear.join(", ")) + ")");
    if (cnt.n) parts.push('<b class="is-n">' + cnt.n + " ข้อ</b> ไม่มีข้อมูล");
    var sum = '<div class="btc-lt-qsum" data-lt-qsum><span class="btc-lt-qdots" aria-hidden="true">' + dots.join("") + '</span><span class="btc-lt-qsum-t"><b>สรุป:</b> ' + parts.join(" · ") + "</span></div>";
    return '<section data-lt-section="questions" class="btc-lt-qs" aria-labelledby="btcLtQsH">' + title + sum + '<div class="btc-lt-qgrid">' + cards + "</div></section>";
  }

  // ---------------------------------------------------------------- charts (SVG by hand, like the Deep Dive cards)
  var REG = {};   // chart id → what the hover read-out needs (filled by html(), read by wire())

  function firstLast(rows, positive) {
    var a = null, b = null;
    if (!Array.isArray(rows)) return null;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r && typeof r[0] === "string" && isNum(r[1]) && (!positive || r[1] > 0)) { a = r; break; } }
    for (var j = rows.length - 1; j >= 0; j--) { var q = rows[j]; if (q && typeof q[0] === "string" && isNum(q[1]) && (!positive || q[1] > 0)) { b = q; break; } }
    return a && b && isDay(a[0]) && isDay(b[0]) ? [a[0], b[0]] : null;
  }
  function clip(rows, from, to, positive) {
    var out = [];
    if (!Array.isArray(rows)) return out;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || typeof r[0] !== "string" || r[0] < from || r[0] > to || !isNum(r[1]) || (positive && !(r[1] > 0))) continue;
      out.push(r);
    }
    return out;
  }
  function makeAxis(lines, log, fix) {
    var lo, hi;
    if (fix) { lo = fix[0]; hi = fix[1]; }
    else {
      lo = Infinity; hi = -Infinity;
      lines.forEach(function (l) { l.pts.forEach(function (p) { if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; }); });
      if (log) { var a = Math.log(lo), b = Math.log(hi), sp = b - a || 0.5; lo = Math.exp(a - sp * 0.06); hi = Math.exp(b + sp * 0.06); }
      else { var s = hi - lo || Math.abs(hi) || 1; lo -= s * 0.08; hi += s * 0.08; }
    }
    var la = Math.log(lo), lb = Math.log(hi);
    return { lo: lo, hi: hi, log: !!log, Y: log ? function (v) { return (1 - (Math.log(v) - la) / (lb - la)) * 100; } : function (v) { return (1 - (v - lo) / (hi - lo)) * 100; } };
  }
  function logTicks(lo, hi) {
    function gen(ms) {
      var o = [];
      for (var e = Math.floor(Math.log(lo) / Math.LN10) - 1; e <= Math.ceil(Math.log(hi) / Math.LN10); e++) {
        for (var i = 0; i < ms.length; i++) { var v = Number((ms[i] * Math.pow(10, e)).toPrecision(6)); if (v >= lo && v <= hi) o.push(v); }
      }
      return o;
    }
    var t = gen([1, 2, 5]);
    if (t.length > 6) { var d = gen([1]); if (d.length >= 2) t = d; }
    if (t.length < 3) t = gen([1, 1.5, 2, 3, 5, 7]);
    if (t.length > 7) t = t.filter(function (x, i) { return i % 2 === 0; });
    return t;
  }
  function niceTicks(lo, hi) {
    var raw = (hi - lo) / 4;
    if (!(raw > 0)) return [lo];
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    var step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(10)));
    return out;
  }
  function pathD(pts, X, Y, gap) {
    var d = "", prev = null;
    for (var i = 0; i < pts.length; i++) {
      var t = msOf(pts[i][0]);
      d += (prev == null || t - prev > gap ? "M" : "L") + X(t).toFixed(1) + " " + Y(pts[i][1]).toFixed(2);
      prev = t;
    }
    return d;
  }

  // spec = { id, range, log, fix: [lo, hi], ticks, fmt, tipFmt, bands: [{ a, b, key }], aria,
  //          lines: [{ key, label, cls, rows, main, overlay }], right: { log, fmt, tipFmt } (overlay axis),
  //          marks: [{ date, type, price, provisional }], markOn: "l" | "r" }
  // → { html, drawn } · null when the lines that set the window have < 2 points in it
  function chartHtml(spec) {
    var anchors = spec.lines.filter(function (l) { return !l.overlay; });
    var first = null, to = null;
    anchors.forEach(function (l) { var fl = firstLast(l.rows, spec.log); if (!fl) return; if (first == null || fl[0] < first) first = fl[0]; if (to == null || fl[1] > to) to = fl[1]; });
    if (to == null) return null;
    var from = spec.range === "all" ? first : addDays(to, -spec.range);
    if (from < first) from = first;
    var t0 = msOf(from), t1 = msOf(to), span = t1 - t0;
    if (!(span > 0)) return null;
    function X(t) { return (t - t0) / span * 1000; }

    var drawn = [];
    spec.lines.forEach(function (l) {
      if (l.overlay && !spec.right) return;
      var w = clip(l.rows, from, to, l.overlay ? spec.right.log : spec.log);
      if (w.length < 2) return;
      drawn.push({ key: l.key, label: l.label, cls: l.cls, main: !!l.main, overlay: !!l.overlay, pts: downsample(w, MAX_PTS) });
    });
    var left = drawn.filter(function (l) { return !l.overlay; }), right = drawn.filter(function (l) { return l.overlay; });
    if (!left.length) return null;
    var L = makeAxis(left, spec.log, spec.fix), R = right.length ? makeAxis(right, spec.right.log, null) : null;
    var main = left.filter(function (l) { return l.main; })[0] || left[left.length - 1];

    var svg = "";
    (spec.bands || []).forEach(function (b) {
      var lo = Math.max(b.a, L.lo), hi = Math.min(b.b, L.hi);
      if (!(hi > lo)) return;
      var y1 = L.Y(hi), y2 = L.Y(lo);
      svg += '<rect class="btc-lt-band is-' + esc(b.key) + '" data-lt-band="' + esc(b.key) + '" x="0" y="' + y1.toFixed(2) + '" width="1000" height="' + (y2 - y1).toFixed(2) + '"/>';
    });
    var edges = (spec.bands || []).map(function (b) { return b.b; }).filter(function (v) { return isFinite(v) && v > L.lo && v < L.hi; });
    var ticks = spec.ticks ? spec.ticks.filter(function (v) { return v >= L.lo && v <= L.hi; }) : edges.length >= 2 ? edges : L.log ? logTicks(L.lo, L.hi) : niceTicks(L.lo, L.hi);
    ticks.forEach(function (v) { var y = L.Y(v).toFixed(2); svg += '<line class="btc-lt-grid" x1="0" x2="1000" y1="' + y + '" y2="' + y + '" vector-effect="non-scaling-stroke"/>'; });
    var marks = (spec.marks || []).filter(function (k) { return obj(k) && isDay(k.date) && k.date >= from && k.date <= to && (k.type === "top" || k.type === "bottom"); });
    marks.forEach(function (k) {
      var x = X(msOf(k.date)).toFixed(1);
      svg += '<line class="btc-lt-mkl is-' + k.type + (k.provisional ? " is-prov" : "") + '" x1="' + x + '" x2="' + x + '" y1="0" y2="100" vector-effect="non-scaling-stroke"/>';
    });
    var order = right.concat(left.filter(function (l) { return l !== main; }), [main]);
    order.forEach(function (l) {
      var Y = l.overlay ? R.Y : L.Y;
      svg += '<path class="btc-lt-ln ' + l.cls + (l.overlay ? " is-overlay" : "") + '" data-lt-line="' + esc(l.key) + '" d="' + pathD(l.pts, X, Y, Math.max(45 * DAY, 4 * span / Math.max(1, l.pts.length))) + '" fill="none" vector-effect="non-scaling-stroke"/>';
    });

    var markY = spec.markOn === "r" && R ? R.Y : spec.markOn === "l" ? L.Y : null;
    var tags = marks.map(function (k) {
      var x = X(msOf(k.date)) / 10, edge = x < 8 ? " is-start" : x > 92 ? " is-end" : "";
      // the word hides on a narrow chart (CSS container query) — the glyph stays; the list under the chart has the details
      var tag = '<span class="btc-lt-mk is-' + k.type + (k.provisional ? " is-prov" : "") + edge + '" data-lt-mark="' + k.type + '" style="left:' + x.toFixed(2) + '%"><b aria-hidden="true">' +
        (k.type === "top" ? "▲" : "▼") + '</b><span class="btc-lt-mk-t">' + (k.type === "top" ? "ยอด" : "ก้น") + (k.provisional ? " (ชั่วคราว)" : "") + "</span></span>";
      var dot = markY && isNum(k.price) && k.price > 0 ? '<span class="btc-lt-mkdot is-' + k.type + '" style="left:' + x.toFixed(2) + "%;top:" + clamp(markY(k.price), 0, 100).toFixed(2) + '%"></span>' : "";
      return tag + dot;
    }).join("");
    var lp = main.pts[main.pts.length - 1];
    var dot = '<span class="btc-lt-dot" style="left:' + (X(msOf(lp[0])) / 10).toFixed(2) + "%;top:" + clamp(L.Y(lp[1]), 0, 100).toFixed(2) + '%"></span>';
    var yl = ticks.map(function (v) { return '<i style="top:' + L.Y(v).toFixed(1) + '%">' + esc(spec.fmt(v)) + "</i>"; }).join("");
    var yr = R ? (spec.right.log ? logTicks(R.lo, R.hi) : niceTicks(R.lo, R.hi)).map(function (v) { return '<i style="top:' + R.Y(v).toFixed(1) + '%">' + esc(spec.right.fmt(v)) + "</i>"; }).join("") : "";
    var xl = [0, 1 / 3, 2 / 3, 1].map(function (f) { return '<i style="left:' + (f * 100).toFixed(1) + '%">' + esc(thMonth(isoOf(t0 + f * span))) + "</i>"; }).join("");

    REG[spec.id] = { t0: t0, t1: t1, tol: Math.max(3 * DAY, 2 * span / Math.max(1, main.pts.length)),
      main: main, lines: [main].concat(order.filter(function (l) { return l !== main; })).map(function (l) {
        return { label: l.label, pts: l.pts, fmt: l.overlay ? spec.right.tipFmt : spec.tipFmt, main: l === main };
      }) };
    return {
      drawn: [main].concat(left.filter(function (l) { return l !== main; }), right),
      html: '<div class="btc-lt-chart' + (R ? " has-right" : "") + '">' +
        '<div class="btc-lt-yl" aria-hidden="true">' + yl + "</div>" +
        '<div class="btc-lt-plot" data-lt-chart="' + esc(spec.id) + '" data-lt-from="' + from + '" data-lt-to="' + to + '" role="img" aria-label="' + esc(spec.aria) + '">' +
        '<svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + svg + "</svg>" +
        tags + dot + '<span class="btc-lt-cross" hidden></span><span class="btc-lt-tip" hidden></span></div>' +
        (R ? '<div class="btc-lt-yr" aria-hidden="true">' + yr + "</div>" : "") +
        '<div class="btc-lt-xl" aria-hidden="true">' + xl + "</div></div>"
    };
  }
  function legendHtml(drawn, extra) {
    return '<div class="btc-lt-legend">' + drawn.map(function (l) {
      return '<span class="btc-lt-key"><i class="btc-lt-sw ' + esc(l.cls) + '" aria-hidden="true"></i>' + esc(l.label + (l.overlay ? " · แกนขวา" : "")) + "</span>";
    }).join("") + (extra || "") + "</div>";
  }
  function naBlock(m, what) {
    var loading = m.loading && (m.loading.history || m.loading.onchain);
    return '<p class="btc-lt-na-p">' + NA_TEXT + " — " + esc(what) + (loading ? " (กำลังโหลดข้อมูล…)" : "") + "</p>";
  }
  function segBtn(attr, val, label, on) {
    return '<button type="button" ' + attr + '="' + esc(String(val)) + '" aria-pressed="' + (on ? "true" : "false") + '"' + (on ? ' class="is-on"' : "") + ">" + esc(label) + "</button>";
  }
  function rangeBar(ui, label) {
    return '<div class="btc-lt-seg" role="group" aria-label="' + esc(label) + '">' + RANGES.map(function (r) { return segBtn("data-lt-range", r, RANGE_LABEL[r], r === ui.range); }).join("") + "</div>";
  }

  // ---------------------------------------------------------------- html · 3 Cost Basis
  function costHtml(m, ui) {
    var c = obj(m.cost) || {}, s = obj(m.series) || {};
    var rows = Array.isArray(c.rows) ? c.rows.filter(obj) : [];
    var hasP = isNum(c.price) && c.price > 0;
    var list = '<ul class="btc-lt-costrows">' +
      '<li class="btc-lt-crow" data-lt-cost="price"><div class="btc-lt-crow-top"><i class="btc-lt-sw is-price" aria-hidden="true"></i><span class="btc-lt-crow-l">ราคา BTC</span>' +
      '<b class="btc-lt-crow-v">' + (hasP ? esc(usd(c.price)) : NA) + "</b></div>" +
      (hasP ? '<div class="btc-lt-crow-src">' + esc(c.priceSource || "แหล่งข้อมูลไม่ระบุ") + " · " + timeTag(c.priceAsOf) + "</div>" : "") + "</li>" +
      rows.map(function (r) {
        var hv = isNum(r.value) && r.value > 0, pct = hv && isNum(r.pct) ? r.pct : null;
        return '<li class="btc-lt-crow" data-lt-cost="' + esc(r.key) + '"><div class="btc-lt-crow-top"><i class="btc-lt-sw ' + (COST_SW[r.key] || "is-main") + '" aria-hidden="true"></i>' +
          '<span class="btc-lt-crow-l">' + esc(r.label || r.key) + '</span><b class="btc-lt-crow-v">' + (hv ? esc(usd(r.value)) : NA) + "</b></div>" +
          (r.sub ? '<div class="btc-lt-crow-sub">' + esc(r.sub) + "</div>" : "") +
          (pct != null ? '<span class="btc-lt-pct" data-lt-pct="' + pct + '">' + (pct > 0 ? "เหนือ " : pct < 0 ? "ใต้ " : "ตรงต้นทุน ") + esc(pctTxt(pct)) + "</span>" : "") +
          (hv ? '<div class="btc-lt-crow-src">' + esc(r.source || "แหล่งข้อมูลไม่ระบุ") + " · " + timeTag(r.asOf) + "</div>" : "") + "</li>";
      }).join("") + "</ul>";
    var ch = chartHtml({
      id: "cost", range: ui.range, log: true, fmt: usdAxis, tipFmt: usd,
      lines: [
        { key: "realizedPrice", label: "Realized Price", cls: "is-realized", rows: s.realizedPrice },
        { key: "activeInvestorPrice", label: "Active Investor Price", cls: "is-aip", rows: s.activeInvestorPrice },
        { key: "lthRealizedPrice", label: "LTH Realized Price", cls: "is-lth", rows: s.lthRealizedPrice },
        { key: "price", label: "ราคา BTC", cls: "is-price", rows: s.price, main: true }
      ],
      aria: "กราฟราคา BTC เทียบเส้นต้นทุน ช่วง " + RANGE_NAME[ui.range] + " แกนราคาแบบ log"
    });
    return '<section data-lt-section="cost" class="btc-lt-cost gc-card gc-tile gc-neutral" aria-labelledby="btcLtCostH">' +
      '<div class="btc-lt-sechead"><div><div class="btc-lt-kicker">Cost Basis</div><h3 class="btc-lt-h" id="btcLtCostH">ราคาเทียบต้นทุนของแต่ละกลุ่ม</h3>' +
      '<p class="btc-lt-sub">ราคาอยู่เหนือเส้นไหน = คนกลุ่มนั้นมีกำไรเฉลี่ย · ใต้เส้น = ขาดทุนเฉลี่ย · แกนราคาแบบ log</p></div>' + rangeBar(ui, "ช่วงเวลาของกราฟต้นทุน") + "</div>" +
      list + (ch ? legendHtml(ch.drawn) + ch.html : naBlock(m, "กราฟราคาเทียบต้นทุน")) + "</section>";
  }

  // ---------------------------------------------------------------- html · 4 Historical
  // x where a piecewise-linear [[value, score], …] anchor list crosses score s (null when it never does)
  function crossAt(A, s) {
    for (var i = 1; i < A.length; i++) {
      var p = A[i - 1], q = A[i];
      if (!p || !q || !isNum(p[0]) || !isNum(p[1]) || !isNum(q[0]) || !isNum(q[1])) return null;
      if ((s - p[1]) * (s - q[1]) <= 0 && p[1] !== q[1]) return p[0] + (s - p[1]) * (q[0] - p[0]) / (q[1] - p[1]);
    }
    return null;
  }
  // background bands of a metric chart = where that indicator's own sub-score crosses the state edges (80 · 65 · 45 · 30)
  function anchorBands(m, key) {
    var A = obj(m.anchors) && Array.isArray(m.anchors[key]) ? m.anchors[key] : null;
    if (!A || A.length < 2) return null;
    var list = statesOf(m), edges = [];
    for (var i = 0; i < list.length - 1; i++) { var x = crossAt(A, list[i].min); if (x == null) return null; edges.push(x); }
    var dec = A[A.length - 1][1] < A[0][1];
    for (var j = 1; j < edges.length; j++) if (dec ? edges[j] < edges[j - 1] : edges[j] > edges[j - 1]) return null;
    var out = [];
    for (var k = 0; k < list.length; k++) {
      var e1 = k === 0 ? (dec ? -Infinity : Infinity) : edges[k - 1], e2 = k === list.length - 1 ? (dec ? Infinity : -Infinity) : edges[k];
      out.push({ a: Math.min(e1, e2), b: Math.max(e1, e2), key: list[k].key });
    }
    return out;
  }
  function stateBands(m) {
    var list = statesOf(m), out = [];
    for (var i = 0; i < list.length; i++) out.push({ a: list[i].min, b: i === 0 ? 100 : list[i - 1].min, key: list[i].key });
    return out;
  }
  function histSpec(m, ui) {
    var s = obj(m.series) || {}, h = obj(m.hist) || {};
    var core = obj(h.core) && Array.isArray(h.core.rows) ? h.core.rows : null, full = obj(h.full) && Array.isArray(h.full.rows) ? h.full.rows : null;
    var v = ui.view, spec;
    if (v === "price") spec = { lines: [{ key: "price", label: "ราคา BTC (Coin Metrics)", cls: "is-price", rows: s.price, main: true }], log: true, fmt: usdAxis, tipFmt: usd, markOn: "l", what: "ราคา BTC" };
    else if (v === "score") {
      spec = { lines: [{ key: "full", label: "สัญญาณเต็ม 6 ตัว", cls: "is-full", rows: full }, { key: "core", label: "สัญญาณแกน (MVRV-Z + Puell)", cls: "is-main", rows: core, main: true }],
        fix: [0, 100], ticks: statesOf(m).map(function (x) { return x.min; }).filter(function (x) { return x > 0; }), fmt: String, tipFmt: scoreTxt, bands: stateBands(m), what: "คะแนนย้อนหลัง" };
    }
    else if (v === "mvrvZ") spec = { lines: [{ key: "main", label: "MVRV-Z (point-in-time · Coin Metrics)", cls: "is-main", rows: s.mvrvZ, main: true }], fmt: fix2, tipFmt: fix2, bands: anchorBands(m, "mvrvZ"), what: "MVRV-Z" };
    else if (v === "puell") spec = { lines: [{ key: "main", label: "Puell Multiple (Blockchain.com)", cls: "is-main", rows: s.puell, main: true }], log: true, fmt: fix2, tipFmt: fix2, bands: anchorBands(m, "puell"), what: "Puell Multiple" };
    else if (v === "lthSopr") spec = { lines: [{ key: "main", label: "LTH-SOPR รายวัน (BGeometrics)", cls: "is-main", rows: s.lthSopr, main: true }], log: true, fmt: fix2, tipFmt: fix2, bands: anchorBands(m, "lthSopr7"), what: "LTH-SOPR" };
    else spec = { lines: [{ key: "main", label: "LTH Supply (BTC · BGeometrics)", cls: "is-main", rows: s.lthSupply, main: true }], fmt: btcM, tipFmt: btcM, what: "LTH Supply" };
    if (v !== "price" && ui.showPrice) {
      spec.lines.push({ key: "price", label: "ราคา BTC", cls: "is-price", rows: s.price, overlay: true });
      spec.right = { log: true, fmt: usdAxis, tipFmt: usd };
      spec.markOn = "r";
    }
    spec.id = "hist"; spec.range = ui.range; spec.marks = Array.isArray(h.markers) ? h.markers : [];
    spec.aria = "กราฟย้อนหลัง " + VIEW_LABEL[v] + " ช่วง " + RANGE_NAME[ui.range] + (spec.markOn ? " พร้อมจุดยอดและก้นของแต่ละรอบ" : "");
    return spec;
  }
  var VIEW_NOTE = {
    price: "แกนราคาแบบ log · ▲ ยอด / ▼ ก้น ของแต่ละรอบ halving",
    score: "เส้นขาว = สัญญาณแกน (MVRV-Z + Puell ย้อนได้หลายรอบ) · เส้นม่วง = สัญญาณเต็ม 6 ตัว (ราว 4 ปี) · พื้นสี = 5 สถานะ (เขียว น่าสะสม → แดง ร้อนแรง) · คิดแบบ point-in-time",
    mvrvZ: "MVRV-Z คิดเองแบบ point-in-time (ใช้แค่ข้อมูลถึงวันนั้น) จึงต่างจากค่าในการ์ดด้านล่างที่ใช้สูตรของ BGeometrics · พื้นสี = ช่วงคะแนนของตัวนี้",
    puell: "ค่ารายวัน (คะแนนใช้ค่าเฉลี่ย 7 วัน) · แกน log · พื้นสี = ช่วงคะแนนของตัวนี้",
    lthSopr: "ค่ารายวัน (คะแนนใช้ค่าเฉลี่ย 7 วัน) · แกน log · พื้นสี = ช่วงคะแนนของตัวนี้ · ข้อมูลฟรีย้อนได้ราว 4 ปี",
    lthSupply: "จำนวนเหรียญในมือผู้ถือเกิน 155 วัน · คะแนนใช้ % เปลี่ยนใน 30 วัน (Net Position) · ข้อมูลฟรีย้อนได้ราว 4 ปี"
  };
  function cycleListHtml(markers) {
    var list = (Array.isArray(markers) ? markers : []).filter(function (k) { return obj(k) && isDay(k.date) && (k.type === "top" || k.type === "bottom"); });
    if (!list.length) return "";
    return '<div class="btc-lt-cycles"><span class="btc-lt-cycles-h">ยอด / ก้นของแต่ละรอบ (ราคาปิด · ดูย้อนหลังเท่านั้น ไม่ได้ใช้ในคะแนน)</span><ul>' + list.map(function (k) {
      return '<li data-lt-cycle="' + k.type + '"><b class="is-' + k.type + '" aria-hidden="true">' + (k.type === "top" ? "▲" : "▼") + "</b> " + (k.type === "top" ? "ยอด" : "ก้น") + " " +
        timeTag(k.date) + " · " + esc(isNum(k.price) && k.price > 0 ? usd(k.price) : NA_TEXT) + (k.provisional ? " · ชั่วคราว" : "") + "</li>";
    }).join("") + "</ul></div>";
  }
  function btBlock(m, key, title, sub, x) {
    var bt = obj(x) && obj(x.backtest) && obj(x.backtest.byState) ? x.backtest : null;
    var period = bt && isDay(bt.from) && isDay(bt.to) ? "ข้อมูล " + timeTag(bt.from) + " – " + timeTag(bt.to) + " · " : "";
    var head = '<h4 class="btc-lt-acc-h">' + esc(title) + '</h4><p class="btc-lt-acc-sub">' + period + esc(sub) + "</p>";
    if (!bt) return '<div class="btc-lt-accb" data-lt-bt="' + key + '">' + head + '<p class="btc-lt-na-p">' + NA_TEXT + "</p></div>";
    var thead = '<thead><tr><th scope="col" rowspan="2">สถานะ</th><th scope="col" rowspan="2" class="gc-cell-num">วัน</th><th scope="col" rowspan="2" class="gc-cell-num">ช่วง</th>' +
      HORIZONS.map(function (d) { return '<th scope="colgroup" colspan="3">หลัง ' + d + " วัน</th>"; }).join("") + "</tr><tr>" +
      HORIZONS.map(function () { return '<th scope="col" class="gc-cell-num">มัธยฐาน</th><th scope="col" class="gc-cell-num">บวก</th><th scope="col" class="gc-cell-num">ร่วงลึกสุด*</th>'; }).join("") + "</tr></thead>";
    var body = statesOf(m).map(function (st) {
      var b = obj(bt.byState[st.key]);
      // short Thai chip in the (sticky) first column — the full "EN · TH" chip would push every number off a phone screen
      var lead = '<tr data-lt-bt-state="' + esc(st.key) + '"><th scope="row"><span class="btc-lt-state btc-lt-st-' + esc(st.key) + '">' + esc(st.th || st.en) + "</span></th>";
      if (!b || !isNum(b.days) || b.days <= 0) return lead + '<td colspan="' + (2 + HORIZONS.length * 3) + '" class="btc-lt-none">ไม่เกิดในช่วงนี้</td></tr>';
      return lead + '<td class="gc-cell-num">' + b.days + '</td><td class="gc-cell-num">' + (isNum(b.episodes) ? b.episodes : NA_TEXT) + "</td>" +
        HORIZONS.map(function (d) {
          var r = obj(b["h" + d]);
          if (!r || !isNum(r.n) || r.n <= 0) return '<td colspan="3" class="btc-lt-none">ยังไม่ครบช่วง</td>';
          return '<td class="gc-cell-num">' + (isNum(r.median) ? esc(signed(r.median * 100, 1)) + "%" : NA_TEXT) + " <small>n=" + r.n + "</small></td>" +
            '<td class="gc-cell-num">' + (isNum(r.posPct) ? Math.round(r.posPct) + "%" : NA_TEXT) + "</td>" +
            '<td class="gc-cell-num">' + (isNum(r.medianMaxDD) ? esc(signed(r.medianMaxDD * 100, 1)) + "%" : NA_TEXT) + "</td>";
        }).join("") + "</tr>";
    }).join("");
    return '<div class="btc-lt-accb" data-lt-bt="' + key + '">' + head +
      '<div class="gc-table-wrap" tabindex="0" role="region" aria-label="' + esc("ผลย้อนหลังของ" + title) + '"><table class="gc-table btc-lt-table">' + thead + "<tbody>" + body + "</tbody></table></div></div>";
  }
  // the accuracy picture (user 2026-11-26: "ไม่เข้าใจส่วนนี้ … อยากให้สื่อง่าย ๆ") — one question: in the past, when
  // the signal read like now, how did the price stand 1 year later? Uses the CORE signal (MVRV-Z + Puell, many cycles)
  // and says so · shows its base (episodes · days) · a thin sample draws no picture · 0 / 100 only when exact
  var ACC_TONE = { strong: "g", accum: "g", neutral: "y", risk: "a", hot: "r" };
  var ACC_MIN_EPISODES = 3, ACC_MIN_DAYS = 60;   // below this the picture would look as sure as 15 years of data
  function pctShort(x) { var v = x * 100, a1 = Math.round(Math.abs(v) * 10) / 10; return signed(v, a1 >= 10 ? 0 : 1) + "%"; }
  function medianText(md) { return md >= 0.0005 ? "ครึ่งหนึ่งขึ้นเกิน " + pctShort(md) : md <= -0.0005 ? "ครึ่งหนึ่งแย่กว่า " + pctShort(md) : "ค่ากลางแทบไม่เปลี่ยน (0%)"; }
  function grp(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function h365Of(bt, key) {
    var b = bt && obj(bt.byState) ? obj(bt.byState[key]) : null, r = b ? obj(b.h365) : null;
    var res = { days: b && isNum(b.days) ? b.days : 0, eps: b && isNum(b.episodes) ? b.episodes : null, r: r && isNum(r.n) && r.n > 0 && isNum(r.posPct) ? r : null };
    res.thin = !!res.r && ((res.eps != null && res.eps < ACC_MIN_EPISODES) || res.r.n < ACC_MIN_DAYS);
    return res;
  }
  // never 0 or 100 unless it is exactly that (99.6% is not "every time")
  function upOf(r) { var v = r.posPct; return v <= 0 ? 0 : v >= 100 ? 100 : clamp(Math.round(v), 1, 99); }
  function baseText(h) { return (h.eps != null ? h.eps + " ช่วง" : "") + (h.eps != null ? " (" : "") + grp(h.r.n) + " วัน" + (h.eps != null ? ")" : ""); }
  function thinText(h) { return "ตัวอย่างน้อย — เคยเกิด" + (h.eps != null ? "แค่ " + h.eps + " ช่วง (" + grp(h.r.n) + " วัน)" : " " + grp(h.r.n) + " วัน") + " ยังสรุปเป็นภาพไม่ได้"; }
  function accPicHtml(m, core) {
    var bt = obj(core) && obj(core.backtest) && obj(core.backtest.byState) ? core.backtest : null;
    var rows = obj(core) && Array.isArray(core.rows) ? core.rows : [];
    var last = rows.length && Array.isArray(rows[rows.length - 1]) ? rows[rows.length - 1] : null;
    var st = last ? stateFind(m, last[2]) : null;
    var head = '<h4 class="btc-lt-acc-h">ในอดีต ช่วงที่สัญญาณเป็นแบบนี้ 1 ปีต่อมาราคาเป็นยังไง?</h4><p class="btc-lt-acc-sub">ย้อนดูทุกวันตั้งแต่ ' + (bt && isDay(bt.from) ? timeTag(bt.from) : NA) +
      ": วันนั้นสัญญาณอยู่ระดับไหน → ถือต่อ 1 ปี ราคาสูงกว่าเดิมไหม (ใช้ MVRV-Z + Puell ที่ย้อนได้หลายรอบ)</p>";
    if (!bt || !st) return '<div class="btc-lt-accpic" data-lt-acc-pic>' + head + '<p class="btc-lt-na-p">' + NA_TEXT + "</p></div>";
    function chipOf(s) { return '<span class="btc-lt-state btc-lt-st-' + esc(s.key) + '">' + esc(s.th || s.en) + "</span>"; }
    var lines = "<p>ตอนนี้ สัญญาณแกน (MVRV-Z + Puell) อยู่ที่ " + chipOf(st) + " <small>(ณ " + timeTag(last[0]) + ")</small></p>";
    // the headline score above uses all 6 indicators — when its state differs, say so (and why this part does not use it)
    var sig = obj(m.signal), top = sig && sig.state ? stateFind(m, sig.state) : null;
    if (top && top.key !== st.key) {
      var yrs = isDay(bt.from) && isDay(bt.to) ? Math.round((msOf(bt.to) - msOf(bt.from)) / (365.25 * DAY)) : null, th = h365Of(bt, top.key);
      lines += '<p class="btc-lt-accalt">คะแนนรวม 6 ตัวด้านบนอยู่ที่ ' + chipOf(top) + " — ส่วนนี้ใช้สัญญาณแกน" + (yrs ? "เพราะย้อนได้ราว " + yrs + " ปี" : "") +
        (th.r && !th.thin ? " · ในอดีตช่วง" + esc(top.th || top.en) + " = " + upOf(th.r) + " ใน 100 ครั้ง" : "") + "</p>";
    }
    var now = h365Of(bt, st.key), nowHtml, tone = ACC_TONE[st.key] || "y";
    if (now.r && !now.thin) {
      var up = upOf(now.r), cells = "";
      for (var c = 0; c < 100; c++) cells += '<i class="is-' + (c < up ? "up" : "down") + '" data-lt-cell="' + (c < up ? "up" : "down") + '"></i>';
      var dd = now.r.medianMaxDD;
      nowHtml = '<div class="btc-lt-accnow" data-lt-acc-now="' + esc(st.key) + '"><div class="btc-lt-cells" aria-hidden="true">' + cells + '</div><div class="btc-lt-accnow-t">' + lines +
        '<p class="btc-lt-accbig is-' + tone + '"><b>' + up + " ใน 100 ครั้ง</b></p><p>ในอดีต ช่วงที่สัญญาณเป็นแบบนี้ 1 ปีต่อมาราคาสูงกว่าเดิม" +
        (isNum(now.r.median) ? " · " + esc(medianText(now.r.median)) : "") + "</p>" +
        '<p class="btc-lt-accbase">จาก ' + esc(baseText(now)).replace(/^(\d+ ช่วง)/, "$1ที่เคยเกิด") + " · วันติดกันนับซ้อนกัน</p>" +
        (isNum(dd) && Math.abs(dd) >= 0.005 ? '<p class="btc-lt-accdd">ระหว่างทางมักเคยต่ำกว่าราคาเริ่ม ราว ' + esc(pctShort(dd)) + "</p>" : "") + "</div></div>";
    } else {
      nowHtml = '<div class="btc-lt-accnow" data-lt-acc-now="' + esc(st.key) + '"><div class="btc-lt-accnow-t">' + lines +
        "<p>" + (now.r ? esc(thinText(now)) : "สถานะนี้ยังไม่มีผลครบ 1 ปีในอดีต — ยังบอกไม่ได้ว่าเคยเป็นยังไง") + "</p></div></div>";
    }
    var bars = statesOf(m).map(function (s) {
      var h = h365Of(bt, s.key), isNow = s.key === st.key;
      var lead = '<div class="btc-lt-accbar' + (isNow ? " is-now" : "") + '" data-lt-acc-bar="' + esc(s.key) + '"><span class="btc-lt-accbar-s">' + chipOf(s) +
        (isNow ? ' <b class="btc-lt-accnowtag">◀ ตอนนี้</b>' : "") + "</span>";
      if (!h.r) return lead + '<span class="btc-lt-accbar-x btc-lt-none">' + (h.days > 0 ? "ยังไม่ครบ 1 ปี" : "ไม่เกิดในช่วงนี้") + "</span></div>";
      if (h.thin) return lead + '<span class="btc-lt-accbar-x btc-lt-none">' + esc(thinText(h)) + "</span></div>";
      var r = h.r;
      return lead + '<div class="btc-lt-accbar-t" aria-hidden="true"><i class="is-' + (ACC_TONE[s.key] || "y") + '" style="width:' + upOf(r) + '%"></i></div>' +
        '<span class="btc-lt-accbar-x"><b>' + upOf(r) + " ใน 100 ครั้ง</b> ขึ้น" + (isNum(r.median) ? " · " + esc(medianText(r.median)) : "") +
        (isNum(r.medianMaxDD) && Math.abs(r.medianMaxDD) >= 0.005 ? " · จุดต่ำสุดระหว่างทาง ราว " + esc(pctShort(r.medianMaxDD)) : "") +
        " · " + esc(baseText(h)) + "</span></div>";
    }).join("");
    // the one-line takeaway is read off the numbers (never a fixed claim) · thin samples are left out
    function spanOf(keys) {
      var v = keys.map(function (k) { var h = h365Of(bt, k); return h.r && !h.thin ? upOf(h.r) : null; }).filter(function (x) { return x != null; });
      if (!v.length) return null;
      var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
      return lo === hi ? String(lo) : lo + "–" + hi;
    }
    var g = spanOf(["strong", "accum"]), rr = spanOf(["risk", "hot"]);
    var take = g && rr ? "อ่านง่าย ๆ: ช่วงสีเขียว 1 ปีต่อมาราคาสูงกว่าเดิม " + g + " ใน 100 ครั้ง · ช่วงสีส้ม/แดง " + rr + " ใน 100 ครั้ง · " : "";
    return '<div class="btc-lt-accpic" data-lt-acc-pic>' + head + nowHtml + '<p class="btc-lt-acc-k">เทียบทุกระดับ — โอกาสที่ 1 ปีต่อมาราคาสูงกว่าเดิม</p>' +
      '<div class="btc-lt-accbars">' + bars + "</div>" +
      '<p class="btc-lt-note">' + esc(take) + "นับเป็นวัน และวันติดกันใช้ช่วง 1 ปีที่ซ้อนกัน จึงไม่ใช่ 100 เหตุการณ์แยกกัน · เกณฑ์ตั้งโดยรู้ผลในอดีตแล้ว ผลจริงในอนาคตอาจด้อยกว่านี้ · อดีตไม่ได้รับประกันอนาคต</p></div>";
  }
  function histHtml(m, ui) {
    var h = obj(m.hist) || {}, spec = histSpec(m, ui), ch = chartHtml(spec);
    var notes = [];
    [h.core, h.full].forEach(function (x) { var n = obj(x) && obj(x.backtest) && typeof x.backtest.note === "string" ? x.backtest.note : ""; if (n && notes.indexOf(n) < 0) notes.push(n); });
    if (!notes.length) notes.push("หน้าต่างผลตอบแทนของวันติดกันซ้อนกัน (ไม่ใช่ตัวอย่างอิสระ) และเกณฑ์ตั้งจากข้อมูลช่วงเดียวกัน (in-sample) — ใช้ดูภาพรวม ไม่ใช่ความแม่นยำล่วงหน้า");
    var ptog = ui.view === "price" ? "" : '<button type="button" class="btc-lt-ptog" data-lt-price aria-pressed="' + (ui.showPrice ? "true" : "false") + '">' + (ui.showPrice ? "ซ่อนราคา BTC" : "แสดงราคา BTC") + "</button>";
    return '<section data-lt-section="history" class="btc-lt-hist gc-card gc-tile gc-neutral" aria-labelledby="btcLtHistH">' +
      '<div class="btc-lt-sechead"><div><div class="btc-lt-kicker">Historical · point-in-time</div><h3 class="btc-lt-h" id="btcLtHistH">ย้อนหลังหลายรอบ</h3>' +
      '<p class="btc-lt-sub">ทุกจุดคิดจากข้อมูลที่มีถึงวันนั้นเท่านั้น (เลื่อนวันตามความช้าของแหล่งข้อมูล) · ค่าเป็นข้อมูลฉบับปัจจุบันของแต่ละแหล่ง ไม่ใช่ฉบับที่เผยแพร่ในวันนั้น (ถ้าแหล่งแก้ย้อนหลัง จุดเก่าเปลี่ยนตาม) · MVRV-Z, Puell และราคาย้อนได้หลายรอบ · กลุ่ม LTH และ Active Investor ย้อนได้ราว 4 ปี</p></div></div>' +
      '<div class="btc-lt-ctrl"><div class="btc-lt-seg" role="group" aria-label="มุมมองกราฟย้อนหลัง">' + VIEWS.map(function (x) { return segBtn("data-lt-view", x, VIEW_LABEL[x], x === ui.view); }).join("") + "</div>" +
      rangeBar(ui, "ช่วงเวลาของกราฟย้อนหลัง") + ptog + "</div>" +
      (ch ? legendHtml(ch.drawn) + ch.html + '<p class="btc-lt-note">' + esc(VIEW_NOTE[ui.view]) + "</p>" : naBlock(m, spec.what)) +
      cycleListHtml(h.markers) +
      '<div class="btc-lt-acc">' + accPicHtml(m, h.core) +
      '<details class="btc-lt-accfull" data-lt-acc-full' + openAttr("acc-full") + '><summary>ดูตารางเต็ม (หลัง 180 / 365 วัน · สัญญาณเต็ม 6 ตัว ~4 ปี)</summary>' +
      btBlock(m, "core", "สัญญาณแกน · MVRV-Z + Puell", "ย้อนได้หลายรอบ (Coin Metrics + Blockchain.com)", h.core) +
      btBlock(m, "full", "สัญญาณเต็ม 6 ตัว", "ย้อนได้ราว 4 ปี — ข้อมูลฟรีของ BGeometrics มีแค่รอบเดียว", h.full) +
      '<p class="btc-lt-note">* มัธยฐานของจุดต่ำสุดระหว่างทาง เทียบราคาวันที่อยู่ในสถานะนั้น · ' + esc(notes.join(" · ")) + "</p></details></div>" +
      "</section>";
  }

  // ---------------------------------------------------------------- html · 5 sources
  function sourcesHtml(m) {
    var list = Array.isArray(m.sources) ? m.sources.filter(obj) : [];
    return '<section data-lt-section="sources" class="btc-lt-src" aria-labelledby="btcLtSrcH"><h3 class="btc-lt-h btc-lt-h-s" id="btcLtSrcH">แหล่งข้อมูลของส่วนนี้</h3>' +
      (list.length ? '<ul class="btc-lt-srcs">' + list.map(function (s) {
        var st = SRC_STATUS[s.status] || (s.ok ? SRC_STATUS.ok : SRC_STATUS.none);
        return '<li class="btc-lt-srci is-' + st[1] + '" data-lt-src="' + esc(s.key || s.name) + '">' +
          '<div class="btc-lt-srci-top"><b>' + esc(s.name) + '</b><span class="btc-lt-srcst">' + esc(st[0]) + "</span></div>" +
          '<div class="btc-lt-srci-meta">อัปเดตล่าสุด ' + whenTag(s.at) + " · ข้อมูลถึง " + timeTag(s.latest) + "</div>" +
          (s.note ? '<p class="btc-lt-srci-note">' + esc(s.note) + "</p>" : "") + "</li>";
      }).join("") + "</ul>" : '<p class="btc-lt-na-p">' + NA_TEXT + "</p>") + "</section>";
  }

  function html(m, ui) {
    m = obj(m) || {};
    ui = normUi(ui);
    var errs = Array.isArray(m.errors) && m.errors.length ? '<p class="btc-lt-status" role="status">คำนวณบางส่วนไม่สำเร็จ — ' + esc(m.errors.join(" · ")) + "</p>" : "";
    return '<div class="btc-lt" data-lt-root data-lt-ui-range="' + esc(String(ui.range)) + '" data-lt-ui-view="' + esc(ui.view) + '" data-lt-ui-price="' + (ui.showPrice ? "1" : "0") + '">' +
      errs + signalHtml(m) + questionsHtml(m) + costHtml(m, ui) + histHtml(m, ui) + sourcesHtml(m) + "</div>";
  }

  // ---------------------------------------------------------------- wire
  function hasAttr(n, a) { return !!n && n.nodeType === 1 && typeof n.hasAttribute === "function" && n.hasAttribute(a); }
  // the nearest element from n up to stop (inclusive) that passes test()
  function up(n, stop, test) { for (; n; n = n.parentNode) { if (test(n)) return n; if (n === stop) break; } return null; }
  function nearest(pts, t) {
    if (!pts || !pts.length) return -1;
    var lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (msOf(pts[mid][0]) <= t) lo = mid; else hi = mid; }
    return Math.abs(msOf(pts[lo][0]) - t) <= Math.abs(msOf(pts[hi][0]) - t) ? lo : hi;
  }
  function isControl(n) { return hasAttr(n, "data-lt-range") || hasAttr(n, "data-lt-view") || hasAttr(n, "data-lt-price"); }
  function isPlot(n) { return hasAttr(n, "data-lt-chart"); }

  function wire(root, onChange) {
    if (!root || typeof root.addEventListener !== "function") return;
    root.__btcLtOnChange = typeof onChange === "function" ? onChange : null;
    if (root.__btcLtWired) return;
    root.__btcLtWired = true;
    // an opened รายละเอียด / ดูตารางเต็ม survives the next html() — toggle does not bubble, so listen in the capture phase
    root.addEventListener("toggle", function (e) {
      var d = e && e.target, key = d && typeof d.getAttribute === "function" ? d.getAttribute("data-lt-open") : null;
      if (key) OPEN[key] = !!d.open;
    }, true);
    root.addEventListener("click", function (e) {
      var btn = up(e && e.target, root, isControl);
      var panel = btn && up(btn, root, function (n) { return hasAttr(n, "data-lt-root"); });
      if (!panel) return;
      var cur = normUi({ range: panel.getAttribute("data-lt-ui-range"), view: panel.getAttribute("data-lt-ui-view"), showPrice: panel.getAttribute("data-lt-ui-price") !== "0" });
      var next = { range: cur.range, view: cur.view, showPrice: cur.showPrice };
      if (hasAttr(btn, "data-lt-range")) next.range = btn.getAttribute("data-lt-range");
      else if (hasAttr(btn, "data-lt-view")) next.view = btn.getAttribute("data-lt-view");
      else next.showPrice = !cur.showPrice;
      // an unknown range / view falls back to the current one, not to the defaults
      if (parseRange(next.range) == null) next.range = cur.range;
      if (VIEWS.indexOf(next.view) < 0) next.view = cur.view;
      next = normUi(next);
      if (next.range === cur.range && next.view === cur.view && next.showPrice === cur.showPrice) return;
      if (root.__btcLtOnChange) root.__btcLtOnChange(next);
    });
    // hover: a dashed marker + every line's value on the nearest day of the main line
    root.addEventListener("mousemove", function (e) {
      var plot = up(e && e.target, root, isPlot);
      var reg = plot ? REG[plot.getAttribute("data-lt-chart")] : null;
      if (!reg || typeof plot.getBoundingClientRect !== "function") return;
      var rc = plot.getBoundingClientRect();
      if (!rc || !(rc.width > 0)) return;
      var f = clamp((e.clientX - rc.left) / rc.width, 0, 1);
      var i = nearest(reg.main.pts, reg.t0 + f * (reg.t1 - reg.t0));
      if (i < 0) return;
      var day = reg.main.pts[i][0], t = msOf(day), parts = [thDay(day)];
      reg.lines.forEach(function (l) {
        var j = nearest(l.pts, t);
        if (j >= 0 && Math.abs(msOf(l.pts[j][0]) - t) <= reg.tol) parts.push(l.label + " " + l.fmt(l.pts[j][1]));
      });
      var x = ((t - reg.t0) / (reg.t1 - reg.t0) * 100).toFixed(2) + "%";
      var cross = plot.querySelector(".btc-lt-cross"), tip = plot.querySelector(".btc-lt-tip");
      if (cross) { cross.hidden = false; cross.style.left = x; }
      if (tip) { tip.hidden = false; tip.style.left = x; tip.textContent = parts.join("\n"); tip.className = "btc-lt-tip" + (f > 0.6 ? " is-left" : ""); }
    });
    root.addEventListener("mouseout", function (e) {
      var plot = up(e && e.target, root, isPlot);
      if (!plot || (e.relatedTarget && typeof plot.contains === "function" && plot.contains(e.relatedTarget))) return;
      [".btc-lt-cross", ".btc-lt-tip"].forEach(function (s) { var n = plot.querySelector(s); if (n) n.hidden = true; });
    });
  }

  var BtcLtPanel = { model: model, html: html, wire: wire, downsample: downsample, normUi: normUi,
    RANGES: RANGES, VIEWS: VIEWS, LAGS: LAGS, MAX_AGE_DAYS: MAX_AGE_DAYS, MAX_PTS: MAX_PTS };
  if (typeof window !== "undefined") window.BtcLtPanel = BtcLtPanel;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcLtPanel;
})();
