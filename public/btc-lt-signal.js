(function () {
  "use strict";

  // ============================================================
  // Bitcoin Long-term Signal engine — pure scoring, no fetch / DOM / storage.
  // Plan: docs/superpowers/plans/2026-11-26-btc-lt-onchain.md (Task 2)
  // Spec: docs/superpowers/specs/2026-11-26-btc-lt-onchain-design.md
  //
  // A 0–100 "how attractive is long-term accumulation" reading from on-chain data
  // only. It is NOT a price forecast and gives no trading advice; the five state
  // names are fixed by the plan. Separate from the page's technical zone score
  // (computeBuyZone in bitcoin-monitor-page.js), which this file never touches.
  //
  // Families (collinear metrics are averaged INSIDE a family, so one underlying
  // signal is counted once):
  //   valuation 40 · MVRV-Z (point-in-time) · price ÷ LTH Realized Price · price ÷ Active Investor Price
  //   lth       35 · LTH-SOPR 7-day mean · LTH supply % change over 30 days (net position)
  //   miner     25 · Puell Multiple
  // family score = mean of the members that have a value · total = Σ w·s ÷ Σ w of the
  // families that have a score · fewer than 2 families → total null ("ไม่มีข้อมูล", never 0).
  //
  // Series everywhere: [["YYYY-MM-DD", number], …] oldest → newest, one row per day.
  // Point-in-time: the value of a key on date d is the newest row dated ≤ d − lag
  // (lag = how late the source publishes: BGeometrics 7 days, Coin Metrics /
  // Blockchain.com 1 day, price 0), and a row older than maxAgeDays from d − lag is
  // treated as missing. Nothing dated after d − lag is ever read, so appending
  // future rows can never change an earlier day (tested in scripts/btc-lt-signal-test.js).
  //
  // ---------------------------------------------------------------- ANCHORS evidence
  // The plan's starting anchors were checked against real multi-cycle data on
  // 2026-11-26 (one-off fetch for calibration only, never at runtime):
  //   · MVRV-Z point-in-time from Coin Metrics community (CapMVRVCur, CapMrktCurUSD):
  //     (mcap − mcap/mvrv) ÷ population std of mcap over every row up to that day,
  //     from the 365th row (2011-07-17) — 5,610 days to 2026-11-24
  //   · Puell from Blockchain.com: (miners-revenue − transaction-fees-usd) ÷ mean of the
  //     trailing 365 calendar days (≥ 300 values) — 5,581 days to 2026-11-25
  //   · Puell is SCORED as `puell7`, the mean of the 7 newest daily values (ruling
  //     2026-11-26, same treatment as LTH-SOPR 7): daily Puell swings with block luck
  //     (median day-to-day move 0.086, p90 0.21) and the raw value made the core state change
  //     564 times in 5,580 days (118 since 2024); with puell7 it changes 234 times (44).
  //   Both read as known the day before (lag 1). Core signal = MVRV-Z + Puell7 only:
  //     date        kind     close (USD)  MVRV-Z  Puell7  → core  state
  //     2013-12-04  top          1,135      7.33    9.62  →   0   hot
  //     2015-01-14  bottom         176     −0.40    0.46  →  98   strong
  //     2017-12-16  top         19,641      8.43    5.75  →   0   hot
  //     2018-12-15  bottom       3,185     −0.49    0.35  → 100   strong
  //     2020-03-12  crash low    4,959      0.64    1.01  →  74   accum   (raw day 0.74 was a one-day dip)
  //     2021-04-13  top         63,446      5.00    2.66  →  14   hot
  //     2021-11-08  top         67,542      3.19    1.55  →  37   risk
  //     2022-11-09  bottom      15,758     −0.18    0.60  →  92   strong
  //     2024-03-13  high        73,082      2.98    2.14  →  34   risk
  //     2025-10-06  top        124,824      2.49    1.20  →  49   neutral   ← see limitation
  //     2026-11-25  latest      60,268      0.22    0.92  →  81   strong
  //   Bottoms all score ≥ 80 and the 2013/2017/early-2021 tops < 30, so the anchors
  //   were kept as the plan set them (no change was clearly needed).
  //   Core backtest 2011-08-17 → 2026-11-25 (5,580 days), median 365-day return / % positive:
  //   strong +99.3% / 92% (15 episodes) · accum +127.9% / 79% (33) · neutral +32.0% / 57% (37)
  //   · risk +21.8% / 54% (29) · hot +7.5% / 53% (6) — in-sample, overlapping windows.
  //   Limitation (PEAK_NOTE): cycle peaks shrink — max point-in-time MVRV-Z per halving cycle
  //   was 10.66 → 10.09 → 7.15 → 3.35 and max Puell 14.45 → 6.67 → 3.41 → 1.57 — so with fixed
  //   anchors the 2025 top only reached "neutral" on the core signal. The LTH family
  //   (lthSopr7 / lthNetPct) and the two cost-basis ratios could not be checked here:
  //   their only free source is BGeometrics (~4 years, not fetched during development);
  //   their anchors are the plan's starting values.
  // HALVINGS must gain the next date (~2028) when it happens; until then the 2024 cycle
  // simply stays open (provisional).
  // ============================================================

  var VERSION = "1.1.0";   // 1.1.0 (2026-11-26): answers() carry a gauge score · Q5 mean of zone + cycle

  var WEIGHTS = { valuation: 40, lth: 35, miner: 25 };

  var STATES = [
    { key: "strong", min: 80, en: "Strong Accumulation", th: "น่าสะสมมาก" },
    { key: "accum", min: 65, en: "Accumulation", th: "น่าสะสม" },
    { key: "neutral", min: 45, en: "Neutral", th: "กลาง ๆ" },
    { key: "risk", min: 30, en: "Distribution Risk", th: "เสี่ยงช่วงแจกของ" },
    { key: "hot", min: 0, en: "Overheated / High Risk", th: "ร้อนแรง / เสี่ยงสูง" }
  ];

  // straight lines between [value, score] points · outside the range = the end score
  var ANCHORS = {
    mvrvZ: [[-0.5, 100], [0, 95], [1, 75], [2, 55], [3.5, 30], [5, 12], [7, 0]],
    lthCostRatio: [[0.8, 100], [1, 90], [1.5, 70], [2.5, 45], [3.5, 20], [5, 0]],
    aipRatio: [[0.7, 100], [0.9, 85], [1.1, 60], [1.5, 35], [2, 15], [2.6, 0]],
    lthSopr7: [[0.8, 100], [1, 85], [1.5, 65], [3, 45], [6, 20], [10, 0]],
    lthNetPct: [[-3, 10], [-1.5, 30], [0, 50], [1.5, 75], [3, 95]],
    puell: [[0.4, 100], [0.6, 85], [1, 60], [1.5, 40], [2.5, 20], [4, 0]]
  };

  var FAMILIES = [
    { key: "valuation", members: ["mvrvZ", "lthCostRatio", "aipRatio"] },
    { key: "lth", members: ["lthSopr7", "lthNetPct"] },
    { key: "miner", members: ["puell"] }
  ];
  // core = the multi-cycle signal (data since ~2011): MVRV-Z alone for valuation + miners, no LTH family
  var CORE_FAMILIES = [
    { key: "valuation", members: ["mvrvZ"] },
    { key: "miner", members: ["puell"] }
  ];

  var FAMILY_LABELS = { valuation: "มูลค่าเทียบต้นทุน", lth: "พฤติกรรมผู้ถือระยะยาว (LTH)", miner: "นักขุด" };
  var LABELS = {
    mvrvZ: "MVRV Z-Score",
    lthCostRatio: "ราคา ÷ LTH Realized Price",
    aipRatio: "ราคา ÷ Active Investor Price",
    lthSopr7: "LTH-SOPR (เฉลี่ย 7 วัน)",
    lthNetPct: "LTH Net Position (30 วัน)",
    puell: "Puell Multiple"
  };

  // zone wording per member: first [upper bound (exclusive), text] whose bound is above the value
  var ZONES = {
    mvrvZ: [[0, "ต่ำกว่าต้นทุนรวมของตลาด"], [1, "ใกล้ต้นทุนรวมของตลาด"], [2, "ปกติ"], [3.5, "เริ่มแพง"], [5, "แพง"], [Infinity, "ร้อนแรง"]],
    lthCostRatio: [[1, "ใต้ต้นทุน LTH"], [1.5, "เหนือต้นทุน LTH เล็กน้อย"], [2.5, "เหนือต้นทุน LTH ปานกลาง"], [3.5, "เหนือต้นทุน LTH มาก"], [Infinity, "เหนือต้นทุน LTH สูงมาก"]],
    aipRatio: [[1, "ใต้ต้นทุนนักลงทุนที่เคลื่อนไหว"], [1.5, "เหนือต้นทุนเล็กน้อย"], [2, "เหนือต้นทุนมาก"], [Infinity, "เหนือต้นทุนสูงมาก"]],
    lthSopr7: [[1, "ขายขาดทุน"], [1.5, "ขายกำไรเล็กน้อย"], [3, "ขายทำกำไรปานกลาง"], [6, "ขายทำกำไรมาก"], [Infinity, "ขายทำกำไรสูงมาก"]],
    lthNetPct: [[-1.5, "ขายออกชัดเจน"], [-0.25, "ขายออกเล็กน้อย"], [0.25, "ทรงตัว"], [1.5, "สะสมเล็กน้อย"], [Infinity, "สะสมชัดเจน"]],
    puell: [[0.6, "รายได้นักขุดต่ำมาก"], [1, "ต่ำกว่าค่าเฉลี่ยปี"], [1.5, "ใกล้ค่าเฉลี่ยปี"], [2.5, "สูงกว่าค่าเฉลี่ยปี"], [Infinity, "สูงมาก"]]
  };

  // how many days after the date a source publishes (point-in-time shift)
  var DEFAULT_LAGS = { lthRealizedPrice: 7, activeInvestorPrice: 7, lthSopr: 7, lthSupply: 7, mvrvZ: 1, puell: 1, price: 0 };
  var MAX_AGE_DAYS = 21;
  var SERIES_KEYS = ["price", "mvrvZ", "lthRealizedPrice", "activeInvestorPrice", "lthSopr", "lthSupply", "puell"];
  var CORE_KEYS = ["price", "mvrvZ", "puell"];
  var RANGE_KEYS = { full: SERIES_KEYS, core: ["mvrvZ", "puell"] };
  // values that must be > 0 to mean anything (prices, supply, ratios' bases); MVRV-Z may be negative
  var POSITIVE = { price: true, lthRealizedPrice: true, activeInvestorPrice: true, lthSopr: true, lthSupply: true, puell: true };

  var DEFAULT_HORIZONS = [180, 365];
  var EPISODE_GAP_DAYS = 7;
  // shown with every backtest (and exported for the panel): fixed anchors vs shrinking cycle peaks
  var PEAK_NOTE = "ยอดของแต่ละรอบต่ำลงเรื่อย ๆ (MVRV-Z แบบ point-in-time สูงสุดต่อรอบ 10.7 → 10.1 → 7.2 → 3.4) " +
    "เกณฑ์ที่ตายตัวจึงอาจให้คะแนนยอดรอบใหม่ไม่ต่ำพอ — ยอดเดือน 2025-10 สัญญาณแกนอ่านได้เพียง Neutral";

  var HALVINGS = ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"];
  // Cycle markers: the top is searched only in the first 730 days after a halving.
  // Evidence (Coin Metrics closes): tops came 371 (2013-12-04), 525 (2017-12-16),
  // 546 (2021-11-08) and 534 (2025-10-06) days after their halvings. Without the
  // window, "highest close of the cycle" would put the 2020–2024 cycle top on
  // 2024-03-13 (73,082, the pre-halving rally — above 2021-11-08's 67,542) and its
  // "bottom" on 2024-04-17 instead of 2022-11-09.
  var TOP_WINDOW_DAYS = 730;
  // a bottom must sit at least 20% under its top, so a still-rising current cycle
  // does not get a "bottom" a few days after its latest high
  var BOTTOM_MIN_DRAWDOWN = 0.2;
  // a cycle is only marked if the price history reaches back to its halving (± 7 days)
  var COVER_TOLERANCE_DAYS = 7;

  var ZONE_TONE = { deep: "green", accum: "green", recovery: "gray", expansion: "amber", overheated: "red" };
  var CYCLE_TONE = { "Capitulation": "green", "Accumulation": "green", "Early Expansion": "green", "Expansion": "gray", "Late Expansion": "amber", "Distribution": "red" };
  // the gauge position for question 5 — each value sits inside its tone's band (toneOf(score) === tone)
  var ZONE_SCORE = { deep: 90, accum: 75, recovery: 55, expansion: 37, overheated: 15 };
  var CYCLE_SCORE = { "Capitulation": 90, "Accumulation": 75, "Early Expansion": 68, "Expansion": 55, "Late Expansion": 37, "Distribution": 15 };
  var NO_DATA = "ข้อมูลไม่พอ";
  var MINUS = "−";

  // ---------------------------------------------------------------- utils
  // A real number or a numeric string only. Number(null) / Number("") / Number(false)
  // are 0, which would turn a MISSING value into a real reading — never allow that.
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;
  // "YYYY-MM-DD" → whole UTC days since 1970-01-01 (null if not a real calendar day)
  function dayNum(s) {
    if (typeof s !== "string") return null;
    var m = DATE_RE.exec(s);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    if (!isFinite(t)) return null;
    var dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return Math.round(t / 86400000);
  }
  function dayStr(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
  function older(a, b) { if (a == null) return b; if (b == null) return a; return a < b ? a : b; }

  // Series → { d: [day numbers], v: [values] } ascending; junk rows dropped, the last
  // row of a day wins, input never mutated. null when nothing usable is left.
  function prep(series, positiveOnly) {
    if (!Array.isArray(series)) return null;
    var tmp = [], i;
    for (i = 0; i < series.length; i++) {
      var r = series[i];
      if (!Array.isArray(r) || r.length < 2) continue;
      var dn = dayNum(r[0]), v = num(r[1]);
      if (dn == null || v == null) continue;
      if (positiveOnly && !(v > 0)) continue;
      tmp.push([dn, v, i]);
    }
    var sorted = true;
    for (i = 1; i < tmp.length; i++) { if (tmp[i][0] < tmp[i - 1][0]) { sorted = false; break; } }
    if (!sorted) tmp.sort(function (a, b) { return a[0] - b[0] || a[2] - b[2]; });
    var out = { d: [], v: [] };
    for (i = 0; i < tmp.length; i++) {
      var n = out.d.length;
      if (n && out.d[n - 1] === tmp[i][0]) { out.v[n - 1] = tmp[i][1]; continue; }
      out.d.push(tmp[i][0]); out.v.push(tmp[i][1]);
    }
    return out.d.length ? out : null;
  }
  function prepMap(map, keys) {
    var out = {}, ok = map && typeof map === "object";
    for (var i = 0; i < keys.length; i++) out[keys[i]] = ok ? prep(map[keys[i]], has(POSITIVE, keys[i])) : null;
    return out;
  }
  // index of the newest row dated ≤ dn, or −1
  function lastLE(P, dn) {
    var lo = 0, hi = P.d.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (P.d[mid] <= dn) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  // index of the oldest row dated ≥ dn, or −1
  function firstGE(P, dn) {
    var lo = 0, hi = P.d.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (P.d[mid] >= dn) { ans = mid; hi = mid - 1; } else lo = mid + 1; }
    return ans;
  }
  // newest row ≤ cutoff that is not older than maxAge days from the cutoff, or −1
  function freshIdx(P, cutoff, maxAge) {
    if (!P) return -1;
    var i = lastLE(P, cutoff);
    return i >= 0 && cutoff - P.d[i] <= maxAge ? i : -1;
  }
  function median(list) {
    if (!list.length) return null;
    var s = list.slice().sort(function (a, b) { return a - b; });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ---- number formatting for Thai copy (U+2212 for negatives)
  function fx(v, d) {
    var s = Math.abs(v).toFixed(d);
    return v < 0 && Number(s) !== 0 ? MINUS + s : s;
  }
  function signedPct(v, d) {
    var s = Math.abs(v).toFixed(d);
    if (Number(s) === 0) return s + "%";
    return (v > 0 ? "+" : MINUS) + s + "%";
  }
  function groupInt(n) {
    var s = String(Math.round(Math.abs(n))), out = "";
    while (s.length > 3) { out = "," + s.slice(s.length - 3) + out; s = s.slice(0, s.length - 3); }
    return (n < 0 ? MINUS : "") + s + out;
  }
  function usd(v) { return Math.abs(v) < 100 ? (v < 0 ? MINUS : "") + "$" + Math.abs(v).toFixed(2) : (v < 0 ? MINUS : "") + "$" + groupInt(Math.abs(v)); }

  // ---------------------------------------------------------------- states / sub-scores
  function stateOf(total) {
    var t = num(total);
    if (t == null) return null;
    for (var i = 0; i < STATES.length; i++) {
      if (t >= STATES[i].min) return { key: STATES[i].key, min: STATES[i].min, en: STATES[i].en, th: STATES[i].th };
    }
    var last = STATES[STATES.length - 1];
    return { key: last.key, min: last.min, en: last.en, th: last.th };
  }
  function stateKeyOf(total) { var s = stateOf(total); return s ? s.key : null; }

  function interp(pts, v) {
    var n = pts.length;
    if (v <= pts[0][0]) return pts[0][1];
    if (v >= pts[n - 1][0]) return pts[n - 1][1];
    for (var i = 0; i < n - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      if (v >= a[0] && v <= b[0]) return a[1] + (v - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
    }
    return null;
  }
  // 0–100 (1 decimal) for one indicator value · missing value or unknown key → null
  function subScore(key, value) {
    if (typeof key !== "string" || !has(ANCHORS, key)) return null;
    var v = num(value);
    if (v == null) return null;
    var s = interp(ANCHORS[key], v);
    return s == null ? null : round(s, 1);
  }
  function zoneText(key, v) {
    var z = ZONES[key];
    for (var i = 0; i < z.length; i++) if (v < z[i][0]) return z[i][1];
    return z[z.length - 1][1];
  }
  // shared colour language with answers(): ≥ 65 green · ≥ 45 grey · ≥ 30 amber · else red · missing grey
  function toneOf(score) {
    var s = num(score);
    if (s == null) return "gray";
    return s >= 65 ? "green" : s >= 45 ? "gray" : s >= 30 ? "amber" : "red";
  }

  // ---------------------------------------------------------------- inputs (point in time)
  function normOpts(opts) {
    var o = { lags: {}, maxAge: MAX_AGE_DAYS, livePrice: null }, k;
    for (k in DEFAULT_LAGS) if (has(DEFAULT_LAGS, k)) o.lags[k] = DEFAULT_LAGS[k];
    if (opts && typeof opts === "object") {
      if (opts.lags && typeof opts.lags === "object") {
        for (k in o.lags) {
          if (!has(o.lags, k)) continue;
          var n = num(opts.lags[k]);
          if (n != null && n >= 0) o.lags[k] = Math.round(n);
        }
      }
      var m = num(opts.maxAgeDays);
      if (m != null && m >= 0) o.maxAge = m;
      var lp = num(opts.livePrice);
      if (lp != null && lp > 0) o.livePrice = lp;
    }
    return o;
  }
  function emptyInputs(date) {
    return {
      date: date, price: null, mvrvZ: null, lthCostRatio: null, aipRatio: null, lthSopr7: null, lthNetPct: null, puell: null, puell7: null,
      asOf: { price: null, mvrvZ: null, puell: null, puell7: null, lthCostRatio: null, aipRatio: null, lthSopr7: null, lthNetPct: null,
        lthRealizedPrice: null, activeInvestorPrice: null, lthSopr: null, lthSupply: null, lthSupplyBase: null },
      raw: { lthRealizedPrice: null, activeInvestorPrice: null, lthSopr: null, lthSupply: null, lthSupplyBase: null }
    };
  }
  // mean of up to 7 rows from index i backwards, leaving out rows older than maxAge from the cutoff
  // (LTH-SOPR 7 and Puell 7 — fewer than 7 usable rows → the mean of the rows there are)
  function mean7(P, i, cutoff, maxAge) {
    var sum = 0, n = 0;
    for (var j = i; j >= 0 && n < 7 && cutoff - P.d[j] <= maxAge; j--) { sum += P.v[j]; n++; }
    return sum / n;
  }
  // PM = prepared series map · dn = day number · o = normOpts · light = skip the asOf strings (history loops)
  function inputsCore(PM, dn, o, light) {
    var out = emptyInputs(dn == null ? null : (light ? null : dayStr(dn)));
    if (dn == null) return out;
    var L = o.lags, M = o.maxAge, A = out.asOf, i, P;

    if (o.livePrice != null) { out.price = o.livePrice; if (!light) A.price = dayStr(dn); }
    else {
      i = freshIdx(PM.price, dn - L.price, M);
      if (i >= 0) { out.price = PM.price.v[i]; if (!light) A.price = dayStr(PM.price.d[i]); }
    }
    i = freshIdx(PM.mvrvZ, dn - L.mvrvZ, M);
    if (i >= 0) { out.mvrvZ = PM.mvrvZ.v[i]; if (!light) A.mvrvZ = dayStr(PM.mvrvZ.d[i]); }
    // Puell: `puell` = the raw day (display) · `puell7` = 7-row mean, the value that is SCORED —
    // daily issuance swings with block luck (median day-to-day move 0.086), which made the state flicker
    var cp = dn - L.puell;
    i = freshIdx(PM.puell, cp, M);
    if (i >= 0) {
      out.puell = PM.puell.v[i];
      out.puell7 = mean7(PM.puell, i, cp, M);
      if (!light) { A.puell = dayStr(PM.puell.d[i]); A.puell7 = A.puell; }
    }

    i = freshIdx(PM.lthRealizedPrice, dn - L.lthRealizedPrice, M);
    if (i >= 0) {
      out.raw.lthRealizedPrice = PM.lthRealizedPrice.v[i];
      if (!light) A.lthRealizedPrice = dayStr(PM.lthRealizedPrice.d[i]);
      if (out.price != null) { out.lthCostRatio = out.price / out.raw.lthRealizedPrice; if (!light) A.lthCostRatio = older(A.price, A.lthRealizedPrice); }
    }
    i = freshIdx(PM.activeInvestorPrice, dn - L.activeInvestorPrice, M);
    if (i >= 0) {
      out.raw.activeInvestorPrice = PM.activeInvestorPrice.v[i];
      if (!light) A.activeInvestorPrice = dayStr(PM.activeInvestorPrice.d[i]);
      if (out.price != null) { out.aipRatio = out.price / out.raw.activeInvestorPrice; if (!light) A.aipRatio = older(A.price, A.activeInvestorPrice); }
    }

    // LTH-SOPR: mean of the 7 newest rows ≤ cutoff (rows older than maxAge from the cutoff are left out)
    P = PM.lthSopr;
    var cs = dn - L.lthSopr;
    i = freshIdx(P, cs, M);
    if (i >= 0) {
      out.lthSopr7 = mean7(P, i, cs, M);
      out.raw.lthSopr = P.v[i];
      if (!light) { A.lthSopr7 = dayStr(P.d[i]); A.lthSopr = A.lthSopr7; }
    }

    // LTH net position: % change of LTH supply over the 30 days ending at the row actually used — anchored
    // on that row, not on the cutoff, so a stale series cannot shrink the window (and a base more than 7 days
    // before row − 30 = no value, so a hole cannot stretch it) · same rule as the page card's lthNetChange
    P = PM.lthSupply;
    var cq = dn - L.lthSupply;
    i = freshIdx(P, cq, M);
    if (i >= 0) {
      out.raw.lthSupply = P.v[i];
      if (!light) A.lthSupply = dayStr(P.d[i]);
      var b = freshIdx(P, P.d[i] - 30, 7);
      if (b >= 0) {
        out.raw.lthSupplyBase = P.v[b];
        out.lthNetPct = (P.v[i] - P.v[b]) / P.v[b] * 100;
        if (!light) { A.lthSupplyBase = dayStr(P.d[b]); A.lthNetPct = A.lthSupply; }
      }
    }
    return out;
  }

  // Inputs for one date: { date, price, mvrvZ, lthCostRatio, aipRatio, lthSopr7, lthNetPct, puell, puell7,
  //   asOf: { key: "YYYY-MM-DD" | null }, raw: { lthRealizedPrice, activeInvestorPrice, lthSopr, lthSupply, lthSupplyBase } }
  function inputsAt(seriesMap, date, opts) {
    var dn = dayNum(date);
    if (dn == null) return emptyInputs(typeof date === "string" ? date : null);
    return inputsCore(prepMap(seriesMap, SERIES_KEYS), dn, normOpts(opts), false);
  }

  // ---------------------------------------------------------------- score
  function familiesFor(mode) { return mode === "core" ? CORE_FAMILIES : FAMILIES; }
  // The miner member keeps the key "puell" (panel contract) but scores the 7-row mean `puell7`.
  // When the inputs carry a puell7 field (every inputsAt result does) it is authoritative, even
  // when null; only hand-made inputs WITHOUT that field fall back to `puell`.
  function smoothedPuell(src) { return has(src, "puell7"); }
  function memberValue(src, key) {
    if (key === "puell") return smoothedPuell(src) ? num(src.puell7) : num(src.puell);
    return num(src[key]);
  }
  // numbers only (shared by score / scoreSeries / trend so every path uses the same rule)
  function calc(inputs, mode) {
    var fams = familiesFor(mode), list = [], acc = 0, wsum = 0, count = 0;
    var src = inputs && typeof inputs === "object" ? inputs : {};
    for (var f = 0; f < fams.length; f++) {
      var mem = [], sum = 0, n = 0;
      for (var m = 0; m < fams[f].members.length; m++) {
        var key = fams[f].members[m], v = memberValue(src, key), s = v == null ? null : subScore(key, v);
        mem.push({ key: key, value: s == null ? null : v, score: s, smoothed: key === "puell" && smoothedPuell(src) });
        if (s != null) { sum += s; n++; }
      }
      var fs = n ? sum / n : null, w = WEIGHTS[fams[f].key];
      list.push({ key: fams[f].key, weight: w, score: fs, members: mem });
      if (fs != null) { acc += w * fs; wsum += w; count++; }
    }
    return { list: list, count: count, wsum: wsum, total: count >= 2 ? Math.round(acc / wsum) : null };
  }

  function memberReason(key, v, s, smoothed) {
    if (v == null) return "ไม่มีข้อมูล";
    var z = zoneText(key, v), txt;
    if (key === "mvrvZ") txt = "MVRV Z-Score " + fx(v, 2) + " — " + z;
    else if (key === "lthCostRatio") txt = "ราคาเป็น " + fx(v, 2) + " เท่าของต้นทุนผู้ถือระยะยาว (LTH Realized Price) — " + z;
    else if (key === "aipRatio") txt = "ราคาเป็น " + fx(v, 2) + " เท่าของต้นทุนนักลงทุนที่เคลื่อนไหว (Active Investor Price) — " + z;
    else if (key === "lthSopr7") txt = "LTH-SOPR เฉลี่ย 7 วัน " + fx(v, 2) + " — " + z + " (ต่ำกว่า 1 = ผู้ถือระยะยาวขายต่ำกว่าทุน)";
    else if (key === "lthNetPct") txt = "LTH supply เปลี่ยน " + signedPct(v, 2) + " ใน 30 วัน — " + z;
    else txt = "Puell Multiple " + (smoothed ? "เฉลี่ย 7 วัน " : "") + fx(v, 2) + " — " + z + " (รายได้นักขุดเทียบค่าเฉลี่ย 365 วัน)";
    return txt + " · คะแนน " + fx(s, 1);
  }

  // Result = { total, state, families: { valuation|lth|miner: { key, label, score, weight, share, members } },
  //   coverage: { families, of, members, missing, missingFamilies }, reasons: [ไทย], unavailable, mode }
  // mode "core" = MVRV-Z + Puell only (the multi-cycle signal)
  function score(inputs, mode) {
    mode = mode === "core" ? "core" : "full";
    var c = calc(inputs, mode), families = {}, zonesOf = {}, missing = [], missingFamilies = [], present = 0, i, j;
    var state = c.total == null ? null : stateOf(c.total);
    for (i = 0; i < c.list.length; i++) {
      var F = c.list[i], members = [], zones = [];
      for (j = 0; j < F.members.length; j++) {
        var M = F.members[j];
        var zone = M.value == null ? null : zoneText(M.key, M.value);
        // the label says when Puell is the 7-day mean (the page card next to it shows the daily value)
        members.push({ key: M.key, label: LABELS[M.key] + (M.smoothed ? " (เฉลี่ย 7 วัน)" : ""), value: M.value, score: M.score, zone: zone, reason: memberReason(M.key, M.value, M.score, M.smoothed), tone: toneOf(M.score) });
        if (M.value == null) missing.push(M.key); else { present++; zones.push(LABELS[M.key] + " " + zone); }
      }
      if (F.score == null) missingFamilies.push(F.key);
      zonesOf[F.key] = zones;
      families[F.key] = {
        key: F.key, label: FAMILY_LABELS[F.key], weight: F.weight,
        score: F.score == null ? null : round(F.score, 1),
        share: F.score == null || !c.wsum ? null : round(F.weight / c.wsum * 100, 1),
        members: members
      };
    }
    var reasons = [];
    if (c.total != null) reasons.push("คะแนนรวม " + c.total + "/100 → " + state.en + " (" + state.th + ")");
    else reasons.push(NO_DATA + "สำหรับคิดคะแนน — มีข้อมูล " + c.count + " จาก " + c.list.length + " กลุ่ม (ต้องมีอย่างน้อย 2 กลุ่ม)");
    for (i = 0; i < c.list.length; i++) {
      var fam = families[c.list[i].key];
      if (fam.score != null) reasons.push(fam.label + " " + fx(fam.score, 1) + "/100 (น้ำหนัก " + fam.weight + ") — " + zonesOf[fam.key].join(" · "));
      else reasons.push(fam.label + " — ไม่มีข้อมูล (ไม่นับในคะแนน)");
    }
    if (c.total != null && c.count < c.list.length) reasons.push("คิดคะแนนจาก " + c.count + " จาก " + c.list.length + " กลุ่มที่มีข้อมูล (ปรับน้ำหนักตามสัดส่วน)");
    if (missing.length) reasons.push("ไม่มีข้อมูล: " + missing.map(function (k) { return LABELS[k]; }).join(", "));
    return {
      total: c.total, state: state, families: families,
      coverage: { families: c.count, of: c.list.length, members: present, missing: missing, missingFamilies: missingFamilies },
      reasons: reasons, unavailable: c.total == null, mode: mode
    };
  }

  // ---------------------------------------------------------------- trend / history
  // { now, then, delta } — then = the same rules `days` earlier; a live price is never applied to the past
  function trend(seriesMap, date, days, opts) {
    var dn = dayNum(date), k = days == null ? 30 : num(days);
    var mode = opts && opts.mode === "core" ? "core" : "full";
    if (dn == null || k == null || k < 0) return { now: null, then: null, delta: null, date: null, thenDate: null };
    k = Math.round(k);
    var PM = prepMap(seriesMap, SERIES_KEYS), o = normOpts(opts), past = normOpts(opts);
    past.livePrice = null;
    var now = calc(inputsCore(PM, dn, o, true), mode).total;
    var then = calc(inputsCore(PM, dn - k, past, true), mode).total;
    return { now: now, then: then, delta: now != null && then != null ? now - then : null, date: dayStr(dn), thenDate: dayStr(dn - k) };
  }

  // [[date, total, stateKey], …] for each day with a score (days without one are skipped).
  // Default range: from the day every given series of the mode has started (full = the
  // ~4-year LTH window, core = MVRV-Z + Puell since ~2011) to the newest data day.
  function scoreSeries(seriesMap, cfg) {
    cfg = cfg && typeof cfg === "object" ? cfg : {};
    var mode = cfg.mode === "core" ? "core" : "full";
    var PM = prepMap(seriesMap, mode === "core" ? CORE_KEYS : SERIES_KEYS);
    var o = normOpts(cfg.opts);
    o.livePrice = null;
    var keys = RANGE_KEYS[mode], firstMin = null, firstMax = null, lastMax = null, maxLag = 0, k;
    for (var i = 0; i < keys.length; i++) {
      var P = PM[keys[i]];
      if (!P) continue;
      var a = P.d[0], b = P.d[P.d.length - 1];
      if (firstMin == null || a < firstMin) firstMin = a;
      if (firstMax == null || a > firstMax) firstMax = a;
      if (lastMax == null || b > lastMax) lastMax = b;
    }
    if (firstMin == null) return [];
    for (k in o.lags) if (has(o.lags, k) && o.lags[k] > maxLag) maxLag = o.lags[k];
    var from = dayNum(cfg.from), to = dayNum(cfg.to);
    if (from == null) from = firstMax;
    if (to == null) to = lastMax;
    if (from < firstMin) from = firstMin;                       // nothing can score before the data
    if (to > lastMax + o.maxAge + maxLag) to = lastMax + o.maxAge + maxLag;
    var rows = [];
    for (var dn = from; dn <= to; dn++) {
      var total = calc(inputsCore(PM, dn, o, true), mode).total;
      if (total == null) continue;
      rows.push([dayStr(dn), total, stateKeyOf(total)]);
    }
    return rows;
  }

  // ---------------------------------------------------------------- backtest
  // rows from scoreSeries · return(h) = first price dated ≥ d + h ÷ price on d − 1 (only
  // complete windows) · maxDD(h) = lowest price in (d, d + h] ÷ price on d − 1 (never > 0)
  // · episodes = runs of one state, rows ≤ 7 days apart join. median / medianMaxDD are
  // fractions (0.25 = +25%), posPct is a percentage (0–100).
  function backtest(rows, priceSeries, cfg) {
    var horizons = [], i, h;
    var hs = cfg && Array.isArray(cfg.horizons) && cfg.horizons.length ? cfg.horizons : DEFAULT_HORIZONS;
    for (i = 0; i < hs.length; i++) { h = num(hs[i]); if (h != null && h > 0 && horizons.indexOf(Math.round(h)) < 0) horizons.push(Math.round(h)); }
    if (!horizons.length) horizons = DEFAULT_HORIZONS.slice();
    var P = prep(priceSeries, true);
    var validKeys = {};
    for (i = 0; i < STATES.length; i++) validKeys[STATES[i].key] = true;
    var list = [];
    if (Array.isArray(rows)) {
      for (i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!Array.isArray(r)) continue;
        var dn = dayNum(r[0]);
        if (dn == null || typeof r[2] !== "string" || !has(validKeys, r[2])) continue;
        list.push([dn, r[2], i]);
      }
    }
    list.sort(function (a, b) { return a[0] - b[0] || a[2] - b[2]; });
    var acc = {}, byState = {}, lastDay = {};
    for (i = 0; i < STATES.length; i++) {
      var key = STATES[i].key;
      byState[key] = { days: 0, episodes: 0 };
      acc[key] = {};
      for (var q = 0; q < horizons.length; q++) acc[key][horizons[q]] = { rets: [], dds: [] };
    }
    for (i = 0; i < list.length; i++) {
      var d = list[i][0], s = list[i][1], st = byState[s];
      st.days++;
      if (!has(lastDay, s) || d - lastDay[s] > EPISODE_GAP_DAYS) st.episodes++;
      lastDay[s] = d;
      if (!P) continue;
      var ei = freshIdx(P, d, MAX_AGE_DAYS);
      if (ei < 0) continue;
      var entry = P.v[ei];
      for (var x = 0; x < horizons.length; x++) {
        h = horizons[x];
        var xi = firstGE(P, d + h);
        if (xi < 0) continue;                                    // window not complete yet
        var low = Infinity;
        for (var j = lastLE(P, d) + 1; j < P.d.length && P.d[j] <= d + h; j++) if (P.v[j] < low) low = P.v[j];
        acc[s][h].rets.push(P.v[xi] / entry - 1);
        acc[s][h].dds.push(low === Infinity ? 0 : Math.min(0, low / entry - 1));
      }
    }
    for (i = 0; i < STATES.length; i++) {
      var k2 = STATES[i].key;
      for (var y = 0; y < horizons.length; y++) {
        var a = acc[k2][horizons[y]], n = a.rets.length, pos = 0;
        for (var z = 0; z < n; z++) if (a.rets[z] > 0) pos++;
        byState[k2]["h" + horizons[y]] = {
          n: n,
          median: n ? round(median(a.rets), 4) : null,
          posPct: n ? round(pos / n * 100, 1) : null,
          medianMaxDD: n ? round(median(a.dds), 4) : null
        };
      }
    }
    return {
      byState: byState,
      from: list.length ? dayStr(list[0][0]) : null,
      to: list.length ? dayStr(list[list.length - 1][0]) : null,
      horizons: horizons,
      note: "ผลตอบแทน = ราคาวันแรกที่ครบช่วงหลังวันสัญญาณ ÷ ราคาวันสัญญาณ − 1 นับเฉพาะวันที่ครบช่วงแล้ว · " +
        "หน้าต่างของวันติดกันซ้อนทับกันเกือบทั้งหมด จึงไม่ใช่ตัวอย่างอิสระ (ดูจำนวนช่วงต่อเนื่องประกอบ) · " +
        "เกณฑ์คะแนนตรวจกับข้อมูลชุดเดียวกัน (in-sample) ผลย้อนหลังจึงอาจดูดีกว่าที่จะเกิดจริง · " + PEAK_NOTE + " · อดีตไม่ได้รับประกันอนาคต"
    };
  }

  // ---------------------------------------------------------------- cycle markers
  // Per halving cycle: top = highest close in the first TOP_WINDOW_DAYS after the halving ·
  // bottom = lowest close after that top, before the next halving (and ≥ 20% under the top) ·
  // the current cycle (or one the history has not finished) is provisional. Hindsight by
  // nature — chart decoration only, never an input to the score.
  function cycleMarkers(priceSeries) {
    var P = prep(priceSeries, true), out = [];
    if (!P) return out;
    var first = P.d[0], last = P.d[P.d.length - 1];
    for (var i = 0; i < HALVINGS.length; i++) {
      var h = dayNum(HALVINGS[i]);
      var next = i + 1 < HALVINGS.length ? dayNum(HALVINGS[i + 1]) : null;
      if (first > h + COVER_TOLERANCE_DAYS) continue;            // history does not reach back to this halving
      var end = next == null ? Infinity : next;
      var topEnd = Math.min(h + TOP_WINDOW_DAYS, end);
      var provisional = next == null || last < next;
      var start = firstGE(P, h), ti = -1, j;
      if (start < 0) continue;
      for (j = start; j < P.d.length && P.d[j] < topEnd; j++) if (ti < 0 || P.v[j] > P.v[ti]) ti = j;
      if (ti < 0) continue;
      out.push({ date: dayStr(P.d[ti]), type: "top", price: P.v[ti], provisional: provisional });
      var bi = -1;
      for (j = ti + 1; j < P.d.length && P.d[j] < end; j++) if (bi < 0 || P.v[j] < P.v[bi]) bi = j;
      if (bi >= 0 && P.v[bi] <= P.v[ti] * (1 - BOTTOM_MIN_DRAWDOWN)) {
        out.push({ date: dayStr(P.d[bi]), type: "bottom", price: P.v[bi], provisional: provisional });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- 5 questions
  // score = the gauge position 0–100 (high = cheap / accumulation side) · null = no needle · toneOf(score) === tone
  function ans(id, q, a, tone, evidence, score) { return { id: id, q: q, a: a, tone: tone, evidence: evidence || "", score: score == null ? null : round(score, 1) }; }
  function asOfNote(inputs, key) {
    var d = inputs && inputs.asOf && typeof inputs.asOf[key] === "string" ? inputs.asOf[key] : null;
    return d ? " (ข้อมูล ณ " + d + ")" : "";
  }
  function rawOf(inputs, key) { return inputs && inputs.raw && typeof inputs.raw === "object" ? num(inputs.raw[key]) : null; }

  // ctx = { inputs, result, valuationZone: { key, thai } | null, intelCycle: string | null, priceSeries, today }
  function answers(ctx) {
    ctx = ctx && typeof ctx === "object" ? ctx : {};
    var inp = ctx.inputs && typeof ctx.inputs === "object" ? ctx.inputs : {};
    var res = ctx.result && typeof ctx.result === "object" && ctx.result.families ? ctx.result : score(inp);
    var price = num(inp.price), out = [], v, s, e;

    // 1 · above / below the LTH cost basis
    var Q1 = "ราคาอยู่เหนือหรือใต้ต้นทุนของผู้ถือระยะยาว (LTH)?";
    v = num(inp.lthCostRatio);
    if (v == null || !(v > 0)) out.push(ans("lthCost", Q1, NO_DATA, "gray", "ยังไม่มี LTH Realized Price ที่สดพอ"));
    else {
      var pct = (v - 1) * 100;
      var a1 = Math.abs(pct) < 0.5 ? "ใกล้ต้นทุน LTH (" + signedPct(pct, 1) + ")" : pct > 0 ? "เหนือต้นทุน LTH " + signedPct(pct, 1) : "ใต้ต้นทุน LTH " + signedPct(pct, 1);
      var rp = rawOf(inp, "lthRealizedPrice");
      if (rp == null && price != null) rp = price / v;
      e = price != null && rp != null ? "ราคา " + usd(price) + " เทียบ LTH Realized Price " + usd(rp) + asOfNote(inp, "lthRealizedPrice") : "ราคา ÷ LTH Realized Price = " + fx(v, 2);
      s = subScore("lthCostRatio", v);
      out.push(ans("lthCost", Q1, a1, toneOf(s), e + " · ต่ำกว่าต้นทุน LTH ในอดีตมักเกิดช่วงใกล้ก้นรอบ", s));
    }

    // 2 · LTH accumulating or distributing
    var Q2 = "ผู้ถือระยะยาวกำลังสะสมหรือทยอยขายออก?";
    v = num(inp.lthNetPct);
    if (v == null) out.push(ans("lthFlow", Q2, NO_DATA, "gray", "ยังไม่มี LTH supply ย้อนหลังครบ 30 วัน"));
    else {
      var sup = rawOf(inp, "lthSupply"), base = rawOf(inp, "lthSupplyBase");
      e = (sup != null && base != null ? "LTH supply " + groupInt(sup) + " BTC เทียบ 30 วันก่อน " + groupInt(base) + " BTC" : "LTH supply") +
        " · เปลี่ยน " + signedPct(v, 2) + " ใน 30 วัน" + asOfNote(inp, "lthNetPct");
      s = subScore("lthNetPct", v);
      out.push(ans("lthFlow", Q2, zoneText("lthNetPct", v) + " (" + signedPct(v, 2) + " ใน 30 วัน)", toneOf(s), e, s));
    }

    // 3 · LTH selling at a profit or at a loss
    var Q3 = "ผู้ถือระยะยาวที่ขายอยู่ ขายได้กำไรหรือขาดทุน?";
    v = num(inp.lthSopr7);
    if (v == null || !(v > 0)) out.push(ans("lthProfit", Q3, NO_DATA, "gray", "ยังไม่มี LTH-SOPR ที่สดพอ"));
    else {
      s = subScore("lthSopr7", v);
      out.push(ans("lthProfit", Q3, zoneText("lthSopr7", v) + " (LTH-SOPR 7 วัน " + fx(v, 2) + ")", toneOf(s),
        "LTH-SOPR เฉลี่ย 7 วัน " + fx(v, 2) + asOfNote(inp, "lthSopr7") + " · ต่ำกว่า 1 = ขายต่ำกว่าทุน · ยิ่งสูง = ทำกำไรมาก", s));
    }

    // 4 · cheap or expensive vs cost basis (valuation family)
    var Q4 = "ตอนนี้ถูกหรือแพงเมื่อเทียบกับต้นทุน?";
    var vf = res.families && res.families.valuation ? res.families.valuation : null;
    s = vf ? num(vf.score) : null;
    if (s == null) out.push(ans("value", Q4, NO_DATA, "gray", "ยังไม่มีข้อมูลกลุ่มมูลค่าเทียบต้นทุน"));
    else {
      s = round(s, 1);   // tone + words from the score the gauge shows
      // the same cut-offs as the panel's gauge word (≥80 · ≥65 · ≥45 · ≥30 · ≥15)
      var a4 = s >= 80 ? "ถูกมาก" : s >= 65 ? "ค่อนข้างถูก" : s >= 45 ? "กลาง ๆ" : s >= 30 ? "ค่อนข้างแพง" : s >= 15 ? "แพง" : "แพงมาก";
      var parts = ["คะแนนกลุ่มมูลค่า " + fx(s, 1) + "/100"];
      var mm = Array.isArray(vf.members) ? vf.members : [];
      for (var i = 0; i < mm.length; i++) {
        var mv = mm[i] ? num(mm[i].value) : null;
        if (mv == null) continue;
        parts.push(mm[i].key === "mvrvZ" ? "MVRV-Z " + fx(mv, 2) : mm[i].key === "lthCostRatio" ? "ราคา ÷ ต้นทุน LTH " + fx(mv, 2) : mm[i].key === "aipRatio" ? "ราคา ÷ Active Investor " + fx(mv, 2) : (mm[i].label || mm[i].key) + " " + fx(mv, 2));
      }
      out.push(ans("value", Q4, a4, toneOf(s), parts.join(" · "), s));
    }

    // 5 · where in the cycle (existing Valuation Zone + Intelligence cycle — not recomputed here)
    var Q5 = "ตอนนี้อยู่ช่วงไหนของวัฏจักร?";
    var vz = ctx.valuationZone && typeof ctx.valuationZone === "object" ? ctx.valuationZone : null;
    var ic = typeof ctx.intelCycle === "string" && ctx.intelCycle ? ctx.intelCycle : null;
    var aparts = [];
    if (vz && (vz.thai || vz.key)) aparts.push(String(vz.thai || vz.key));
    if (ic) aparts.push("Intelligence: " + ic);
    // both known → the mean of the two positions (a green "ถูก" beside "Intelligence: Distribution" would contradict itself)
    var zs = vz && typeof vz.key === "string" && has(ZONE_SCORE, vz.key) ? ZONE_SCORE[vz.key] : null;
    var cs = ic && has(CYCLE_SCORE, ic) ? CYCLE_SCORE[ic] : null;
    var score5 = zs != null && cs != null ? (zs + cs) / 2 : zs != null ? zs : cs;
    var tone5 = score5 != null ? toneOf(score5) : "gray";
    var ev = [], tdn = dayNum(ctx.today) != null ? dayNum(ctx.today) : dayNum(inp.date);
    if (zs != null && cs != null && toneOf(zs) !== toneOf(cs)) ev.push("โซนมูลค่ากับ Intelligence ไม่ตรงกัน — เข็มอยู่กลางระหว่างสองค่า");
    if (tdn != null) {
      var lastH = null;
      for (var k = 0; k < HALVINGS.length; k++) if (dayNum(HALVINGS[k]) <= tdn) lastH = HALVINGS[k];
      if (lastH) ev.push("ผ่าน halving (" + lastH + ") มาแล้ว " + (tdn - dayNum(lastH)) + " วัน");
    }
    var PX = prep(ctx.priceSeries, true);
    if (PX) {
      var upto = tdn == null ? PX.d.length - 1 : lastLE(PX, tdn), top = -1;
      for (var t = 0; t <= upto; t++) if (top < 0 || PX.v[t] > PX.v[top]) top = t;
      var px = price != null ? price : upto >= 0 ? PX.v[upto] : null;
      if (top >= 0 && px != null) {
        var topTxt = usd(PX.v[top]) + " (" + dayStr(PX.d[top]) + ")";
        ev.push(px < PX.v[top] ? "ต่ำกว่ายอดปิดสูงสุด " + topTxt + " " + fx((1 - px / PX.v[top]) * 100, 1) + "%" : "ราคาอยู่ที่ยอดปิดสูงสุดเดิม " + topTxt + " หรือสูงกว่า");
      }
    }
    out.push(ans("cycle", Q5, aparts.length ? aparts.join(" · ") : NO_DATA, aparts.length ? tone5 : "gray", ev.join(" · "), aparts.length ? score5 : null));
    return out;
  }

  // ---------------------------------------------------------------- export
  var BtcLtSignal = {
    VERSION: VERSION,
    WEIGHTS: WEIGHTS,
    STATES: STATES,
    ANCHORS: ANCHORS,
    FAMILIES: FAMILIES,
    CORE_FAMILIES: CORE_FAMILIES,
    FAMILY_LABELS: FAMILY_LABELS,
    LABELS: LABELS,
    DEFAULT_LAGS: DEFAULT_LAGS,
    MAX_AGE_DAYS: MAX_AGE_DAYS,
    DEFAULT_HORIZONS: DEFAULT_HORIZONS,
    HALVINGS: HALVINGS,
    TOP_WINDOW_DAYS: TOP_WINDOW_DAYS,
    BOTTOM_MIN_DRAWDOWN: BOTTOM_MIN_DRAWDOWN,
    PEAK_NOTE: PEAK_NOTE,
    subScore: subScore,
    zoneText: zoneText,   // the zone words — the page's LTH Supply card reuses them (one number, one reading)
    stateOf: stateOf,
    toneOf: toneOf,
    inputsAt: inputsAt,
    score: score,
    trend: trend,
    scoreSeries: scoreSeries,
    backtest: backtest,
    cycleMarkers: cycleMarkers,
    answers: answers
  };

  if (typeof window !== "undefined") window.BtcLtSignal = BtcLtSignal;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcLtSignal;
})();
