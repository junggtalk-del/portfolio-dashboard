(function () {
  "use strict";
  // ============================================================
  // HOME — "กฎ 3 ข้อบอกอะไรวันนี้" (การ์ดบนสุดของ /home)
  //
  // ผู้ใช้ (2026-10-30): หน้า home ควรสรุปสิ่งที่ต้องทำตามกฎที่ตั้งไว้ 3 ข้อ
  //   1. ซื้อ/ขายตาม EMA12 ตัด EMA26   2. ซื้อ/ขายตาม SMA200   3. buy the dip ≥ 20%
  //   สำหรับ BTCUSD · ETHUSD · หุ้นใน Current Portfolio ของ AI Portfolio Manager
  //
  // ไม่คิดกฎเอง: ทุกอย่างมาจาก window.DecisionJournal.evaluateRules (เอนจินเดียวกับหน้า
  // /decision-journal — กติกา dj-rules-1 · แถบแตะ ±3% · ยืนยัน 2 แท่ง · ย่อ 20%) บนราคาปิดของ
  // แท่งที่ปิดตลาดแล้ว ณ เวลากรุงเทพ · ราคามาจาก /api/ohlc โดยตรง ไม่รอ "Load Latest Data"
  //
  // สิ่งที่การ์ดบอก = ข้อเท็จจริงของกฎ (กฎไหนเข้าฝั่งซื้อ/ขาย) ไม่ใช่คำแนะนำการลงทุน
  // ES5 เท่านั้น · wire ผ่าน [data-hr-*] · ไม่แตะ state ของ mission-control-page.js
  // ============================================================

  var MOUNT_ID = "hrRoot";
  var CACHE_KEY = "home_rules_ohlc_v1";
  var HISTORY_DAYS = 730;          // ≈ 500 แท่ง → มี SMA200 + high 1 ปี (เหมือน decision-journal-page)
  var CONCURRENCY = 4;
  var ALWAYS = ["BTCUSD", "ETHUSD"];     // ผู้ใช้สั่งให้ติดตามเสมอ (คีย์ canonical ของเอนจิน · providerSymbol แปลงให้ /api/ohlc)
  var MAX_CACHE_SYMBOLS = 24;

  var state = {
    rows: [],            // { sym, provider, source, status, rules, verdictBuy, verdictSell, error }
    loading: false,
    loadedAt: null,      // nowBangkok ตอนคิดเสร็จ
    universeNote: null,  // ทำไมไม่มีหุ้นในพอร์ต (ถ้าไม่มี)
    nowOverride: null
  };

  // ---------------- helpers ----------------
  function D() { return window.DecisionJournal || null; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function each(list, fn) { for (var i = 0; i < (list ? list.length : 0); i++) fn(list[i], i); }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function fmtNum(n, dp) {
    if (!isNum(n)) return "—";
    var s = n.toFixed(dp);
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function fmtPct(n, dp) { return isNum(n) ? (n > 0 ? "+" : "") + n.toFixed(dp) + "%" : "—"; }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function wallClock() { return new Date(); }
  function nowBangkok() {
    if (typeof state.nowOverride === "string" && state.nowOverride) return state.nowOverride;
    if (typeof window.__DJ_NOW === "string" && window.__DJ_NOW) return window.__DJ_NOW;
    var d = wallClock();
    try {
      if (typeof Intl !== "undefined" && Intl && Intl.DateTimeFormat) {
        var fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        });
        var parts = fmt.formatToParts(d), p = {};
        for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
        var hh = p.hour === "24" ? "00" : p.hour;
        var s = p.year + "-" + p.month + "-" + p.day + "T" + hh + ":" + p.minute;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
      }
    } catch (e) { /* ตกไปใช้ UTC+7 */ }
    return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16);
  }
  function lsGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; } }

  // ---------------- universe: BTC · ETH · หุ้นใน Current Portfolio (AI Portfolio Manager) ----------------
  // กติกาเดียวกับ buildInputs ของ portfolio-manager-page.js: ธงแดง (isHolding) + sleeve foreign-stock
  //   (ไม่มี bucket → หุ้นไทย .BK = thai-stock · BTC = bitcoin · RMF/SSF = thai-fund · ที่เหลือ foreign-stock)
  //   GOOGL → GOOG เหมือน thesis KB
  function snapshot() {
    try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; }
  }
  function holdingsNow() {
    var core = window.PortfolioCore;
    var local = null;
    if (core && typeof core.readLocalHoldings === "function") {
      try { local = core.readLocalHoldings(); } catch (e) { local = null; }
    }
    if (local && local.length) return local;
    var snap = snapshot();
    var rows = snap && snap.portfolioHoldings && snap.portfolioHoldings.data;
    rows = Array.isArray(rows) ? rows : [];
    if (core && typeof core.dedupeHoldings === "function") { try { return core.dedupeHoldings(rows); } catch (e) { /* ใช้ดิบ */ } }
    return rows;
  }
  function canonical(t) {
    var core = window.PortfolioCore;
    if (core && typeof core.canonicalSymbolFromTicker === "function") { try { return String(core.canonicalSymbolFromTicker(t) || "").toUpperCase(); } catch (e) { /* ด้านล่าง */ } }
    return String(t || "").toUpperCase().replace(/^\s+|\s+$/g, "");
  }
  function bucketOf(h, raw) {
    if (h.portfolioBucket) return h.portfolioBucket;
    if (/\.BK$/.test(raw)) return "thai-stock";
    if (raw.indexOf("BTC") >= 0) return "bitcoin";
    var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
    return isThaiFund ? "thai-fund" : "foreign-stock";
  }
  // คืน [{ sym, source }] · sym = คีย์ canonical ของเอนจิน · source = "always" | "portfolio"
  function buildUniverse() {
    var out = [], seen = {};
    each(ALWAYS, function (p) { seen[p] = 1; out.push({ sym: p, source: "always" }); });
    var holdings = holdingsNow(), n = 0;
    each(holdings, function (h) {
      if (!h || !h.isHolding) return;
      var raw = canonical(h.canonicalSymbol || h.ticker);
      if (!raw) return;
      if (bucketOf(h, raw) !== "foreign-stock") return;
      var key = raw === "GOOGL" ? "GOOG" : raw;
      if (seen[key]) return;
      seen[key] = 1;
      n++;
      out.push({ sym: key, source: "portfolio" });
    });
    state.universeNote = n ? null : (holdings.length
      ? "ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ — ปักธงแดงที่ Action Center หรือ AI Portfolio Manager"
      : "ยังไม่มีรายการหุ้นในพอร์ต — กด Load Latest Data หรือเพิ่มที่ AI Portfolio Manager");
    return out;
  }

  // ---------------- ราคา: /api/ohlc + cache ในเครื่อง (คีย์เดียวกับ decision-journal: วัน + แท่งที่ปิด) ----------------
  function packBars(bars) { return bars.map(function (b) { return [b.date, b.open, b.high, b.low, b.close, b.volume]; }); }
  function unpackBars(rows) {
    return (rows || []).map(function (r) { return { date: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] }; });
  }
  function cacheRead() { try { var j = JSON.parse(lsGet(CACHE_KEY) || "{}"); return j && typeof j === "object" ? j : {}; } catch (e) { return {}; } }
  function cacheWrite(sym, entry) {
    var all = cacheRead();
    all[sym] = entry;
    var keys = [], k;
    for (k in all) if (Object.prototype.hasOwnProperty.call(all, k)) keys.push(k);
    if (keys.length > MAX_CACHE_SYMBOLS) {
      keys.sort(function (a, b) { return String(all[a].at) < String(all[b].at) ? -1 : 1; });
      while (keys.length > MAX_CACHE_SYMBOLS) delete all[keys.shift()];
    }
    lsSet(CACHE_KEY, JSON.stringify(all));
  }
  function cacheFits(c, start, ymd, cutoff) {
    return !!(c && c.at === ymd && c.cutoff === cutoff && c.start <= start && Array.isArray(c.bars));
  }
  function getJson(url) {
    var p;
    try { p = fetch(url, { cache: "no-store" }); } catch (e) { p = Promise.reject(e); }
    return p.then(function (r) {
      return r.text().then(function (t) {
        var body = null;
        try { body = JSON.parse(t); } catch (e) { body = null; }
        return { ok: !!r.ok, status: r.status, body: body };
      });
    }, function (e) { return { ok: false, status: 0, body: null, error: String((e && e.message) || e || "") }; });
  }
  var barsInflight = {};   // คำขอที่ค้างอยู่ (สัญลักษณ์ + วัน + แท่งที่ปิด) — refresh ซ้อน (boot + event) ใช้ promise เดิม ไม่ยิงซ้ำ
  function fetchBars(symbol) {
    var E = D();
    var sym = E.canonicalSymbol(symbol);
    var now = nowBangkok(), ymd = now.slice(0, 10);
    var cutoff = E.closedBarCutoff(E.marketOf(sym), now);
    var start = E.ymdAdd(ymd, -HISTORY_DAYS);
    var disk = cacheRead()[sym];
    if (cacheFits(disk, start, ymd, cutoff)) return Promise.resolve({ ok: true, bars: unpackBars(disk.bars), sourceType: disk.sourceType || null, cached: true });
    var key = sym + "|" + start + "|" + ymd + "|" + cutoff;
    if (barsInflight[key]) return barsInflight[key];
    var url = "/api/ohlc?symbol=" + encodeURIComponent(E.providerSymbol(sym)) + "&start=" + start + "&_ts=" + wallClock().getTime();
    var p = getJson(url).then(function (r) {
      var body = r.body && typeof r.body === "object" ? r.body : {};
      var bars = Array.isArray(body.bars) ? body.bars : null;
      var notFound = !r.ok && typeof body.error === "string" && /\(404\)/.test(body.error);
      if (!(r.ok && bars) && !notFound) {
        return { ok: false, bars: [], sourceType: null, error: r.error || (typeof body.error === "string" ? body.error : "HTTP " + r.status) };
      }
      var got = notFound ? [] : bars;
      var sourceType = notFound ? "NOT_FOUND" : (typeof body.sourceType === "string" ? body.sourceType : null);
      cacheWrite(sym, { at: ymd, start: start, cutoff: cutoff, sourceType: sourceType, bars: packBars(got) });
      return { ok: true, bars: got, sourceType: sourceType, notFound: notFound };
    });
    barsInflight[key] = p;
    function settle() { if (barsInflight[key] === p) delete barsInflight[key]; }
    p.then(settle, settle);
    return p;
  }
  function pool(items, limit, worker) {
    if (typeof window.mapWithConcurrency === "function") {
      try { return Promise.resolve(window.mapWithConcurrency(items, limit, worker)); } catch (e) { return Promise.resolve([]); }
    }
    return new Promise(function (resolve) {
      var n = items.length, next = 0, done = 0;
      if (!n) { resolve([]); return; }
      function finishOne() { done++; if (done === n) resolve([]); else runNext(); }
      function runNext() {
        if (next >= n) return;
        var i = next++;
        var p;
        try { p = Promise.resolve(worker(items[i], i)); } catch (e) { p = Promise.resolve(); }
        p.then(finishOne, finishOne);
      }
      for (var k = 0; k < Math.min(limit, n); k++) runNext();
    });
  }

  // ---------------- คิดกฎ ----------------
  // conviction (กฎ 3 ต้องติ๊ก "ศึกษามาดี") หน้า home ไม่รู้ → แสดง "ย่อถึง 20% แล้ว" เป็นข้อเท็จจริง แยกจากธงซื้อของเอนจิน
  function evalSymbol(u) {
    var E = D();
    var sym = E.canonicalSymbol(u.sym);
    var row = { sym: sym, source: u.source, status: "loading", rules: null, error: null, sourceType: null };
    return fetchBars(sym).then(function (res) {
      row.sourceType = res.sourceType;
      if (!res.ok) { row.status = "error"; row.error = res.error || "ดึงราคาไม่สำเร็จ"; return row; }
      var now = nowBangkok();
      var rules = E.evaluateRules(res.bars, { date: now.slice(0, 10), nowBangkok: now, symbol: sym, conviction: false });
      row.rules = rules;
      if (!rules.ok && rules.blocked === "no-bars") { row.status = "no-bars"; return row; }
      row.status = rules.ok ? "ok" : "stale";
      return row;
    }, function (e) {
      row.status = "error"; row.error = String((e && e.message) || e || "");
      return row;
    });
  }

  // ฝั่งที่กฎบอก (ตามนิยาม verdictFor ของเอนจิน): ซื้อ = r1.buy / r2.buy / กฎ 3 ย่อถึง · ขาย = r1.sell / r2.sell
  function sides(rules) {
    var r1 = rules.r1 || {}, r2 = rules.r2 || {}, r3 = rules.r3 || {};
    var buy = [], sell = [];
    if (r1.buy === true) buy.push("กฎ 1"); else if (r1.sell === true) sell.push("กฎ 1");
    if (r2.buy === true) buy.push("กฎ 2"); else if (r2.sell === true) sell.push("กฎ 2");
    if (r3.dipMet === true) buy.push("กฎ 3");
    return { buy: buy, sell: sell };
  }
  // ลำดับ: มีกฎบอกฝั่งไหนก่อน (ขายก่อน เพราะเป็นเรื่องต้องดูก่อน) · แล้วตามลำดับ universe เดิม
  function rank(row) {
    if (row.status !== "ok" && row.status !== "stale") return 9;
    var s = sides(row.rules);
    if (s.sell.length) return 0;
    if (s.buy.length) return 1;
    return 2;
  }

  // ---------------- render ----------------
  function chip(cls, text) { return '<span class="hr-chip ' + cls + '">' + esc(text) + "</span>"; }
  function rule1Cell(rules) {
    var r = rules.r1 || {};
    if (r.state === "na") return '<span class="hr-na">ข้อมูลไม่พอ</span>';
    var t = r.state === "bull" ? "EMA12 เหนือ EMA26" : (r.state === "bear" ? "EMA12 ใต้ EMA26" : "EMA เท่ากัน");
    var x = "";
    if (r.crossDir === "up" || r.crossDir === "down") {
      x = (r.crossDir === "up" ? "ตัดขึ้น" : "ตัดลง") + (r.crossBarsAgo === 0 ? "แท่งนี้" : "เมื่อ " + r.crossBarsAgo + " แท่งก่อน");
    }
    return chip(r.buy ? "is-buy" : (r.sell ? "is-sell" : "is-none"), t) + (x ? '<small class="hr-sub">' + esc(x) + "</small>" : "");
  }
  function rule2Cell(rules) {
    var E = D(), r = rules.r2 || {};
    if (r.state === "na") return '<span class="hr-na">ข้อมูลไม่พอ (ต้อง ≥ ' + E.MIN_SMA_BARS + " แท่ง)</span>";
    var rel = r.state === "above" ? "เหนือ" : (r.state === "below" ? "ใต้" : "ที่");
    var t = "ปิด" + rel + " SMA200" + (isNum(r.consecutive) ? " " + r.consecutive + " วัน" : "");
    var tags = [];
    if (r.breakConfirmed === true) tags.push("หลุดยืนยัน ≥ " + E.CONFIRM_BARS + " แท่ง");
    if (r.reclaimHeld === true) tags.push("ยืนได้ ≥ " + E.CONFIRM_BARS + " แท่ง");
    var tb = r.touchBounce || {};
    if (tb.met === true) tags.push("แตะหรือเข้าใกล้ (±" + E.TOUCH_BAND_PCT + "%) แล้วเด้ง");
    else if (tb.touchDate && r.state === "above") tags.push("เข้าใกล้เส้น " + tb.touchDate + " ยังไม่นับว่าเด้ง");
    if (r.state === "below" && r.breakConfirmed !== true) tags.push("ยังไม่ครบ " + E.CONFIRM_BARS + " แท่ง ไม่นับว่าหลุด");
    var dist = isNum(rules.close) && isNum(rules.sma200) && rules.sma200 > 0 ? (rules.close - rules.sma200) * 100 / rules.sma200 : null;
    return chip(r.buy ? "is-buy" : (r.sell ? "is-sell" : "is-none"), t) +
      '<small class="hr-sub">' + esc((isNum(dist) ? "ห่างเส้น " + fmtPct(dist, 1) : "") + (tags.length ? (isNum(dist) ? " · " : "") + tags.join(" · ") : "")) + "</small>";
  }
  function rule3Cell(rules) {
    var E = D(), r = rules.r3 || {};
    if (!isNum(r.dd1yPct)) return '<span class="hr-na">ข้อมูลไม่พอ</span>';
    var depth = Math.abs(E.DIP_PCT);
    var t = fmtPct(r.dd1yPct, 1) + " จาก high 1 ปี";
    var sub = r.dipMet === true ? "ย่อถึง " + depth + "% แล้ว — เข้ากฎเมื่อคุณศึกษามาดี/มั่นใจ" : "ยังย่อไม่ถึง " + depth + "%";
    if (isNum(rules.high1y) && rules.high1yDate) sub += " · high " + fmtNum(rules.high1y, 2) + " (" + rules.high1yDate + ")";
    if (isNum(rules.high1yWindowBars) && rules.high1yWindowBars < E.HIGH1Y_BARS) sub += " · ใช้ " + rules.high1yWindowBars + " แท่งเท่าที่มี";
    return chip(r.dipMet === true ? "is-buy" : "is-none", t) + '<small class="hr-sub">' + esc(sub) + "</small>";
  }
  function sumCell(row) {
    if (row.status !== "ok" && row.status !== "stale") return "";
    var s = sides(row.rules);
    if (!s.buy.length && !s.sell.length) return '<span class="hr-side is-none">ไม่มีกฎบอกฝั่งไหน</span>';
    var h = "";
    if (s.sell.length) h += '<span class="hr-side is-sell">ฝั่งขาย · ' + esc(s.sell.join(" + ")) + "</span>";
    if (s.buy.length) h += '<span class="hr-side is-buy">ฝั่งซื้อ · ' + esc(s.buy.join(" + ")) + "</span>";
    return h;
  }
  function rowHtml(row) {
    var E = D();
    var link = '/decision-journal';
    var head = '<div class="hr-sym"><a class="hr-sym-link" href="' + link + '" title="เปิด Decision Journal">' + esc(row.sym) + "</a>" +
      '<small class="hr-src">' + (row.source === "always" ? "ติดตามเสมอ" : "ในพอร์ต") + "</small></div>";
    if (row.status === "error") {
      return '<div class="hr-row is-err" data-hr-row="' + esc(row.sym) + '">' + head + '<div class="hr-msg">ดึงราคาไม่สำเร็จ · ' + esc(row.error) + "</div></div>";
    }
    if (row.status === "no-bars") {
      return '<div class="hr-row is-err" data-hr-row="' + esc(row.sym) + '">' + head + '<div class="hr-msg">' +
        (row.sourceType === "NOT_FOUND" ? "ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล" : "ไม่มีราคาย้อนหลัง") + "</div></div>";
    }
    if (row.status === "loading") {
      return '<div class="hr-row is-loading" data-hr-row="' + esc(row.sym) + '">' + head + '<div class="hr-msg">กำลังดึงราคา…</div></div>';
    }
    var rules = row.rules;
    var price = '<div class="hr-price"><b>' + esc(fmtNum(rules.close, rules.close < 1 ? 4 : 2)) + "</b><small>ปิด " + esc(rules.asOfBar || "—") +
      (row.status === "stale" ? ' · <span class="hr-warn">ราคาเก่ากว่า ' + E.MAX_STALE_DAYS + " วัน</span>" : "") +
      (row.sourceType === "SERVER_CACHED_DATA" ? ' · <span class="hr-warn">สำเนาบนเซิร์ฟเวอร์</span>' : "") + "</small></div>";
    return '<div class="hr-row" data-hr-row="' + esc(row.sym) + '">' + head + price +
      '<div class="hr-rule" data-hr-rule="1"><span class="hr-k">กฎ 1 EMA</span>' + rule1Cell(rules) + "</div>" +
      '<div class="hr-rule" data-hr-rule="2"><span class="hr-k">กฎ 2 SMA200</span>' + rule2Cell(rules) + "</div>" +
      '<div class="hr-rule" data-hr-rule="3"><span class="hr-k">กฎ 3 ย่อ</span>' + rule3Cell(rules) + "</div>" +
      '<div class="hr-sum">' + sumCell(row) + "</div></div>";
  }
  function html() {
    var E = D();
    if (!E) return "";
    var rows = state.rows.slice().sort(function (a, b) { return rank(a) - rank(b); });
    var body = "";
    if (!rows.length) {
      body = '<div class="hr-empty">' + esc(state.universeNote || "ยังไม่มีสัญลักษณ์ให้ตรวจ") + "</div>";
    } else {
      each(rows, function (r) { body += rowHtml(r); });
      if (state.universeNote) body += '<div class="hr-note">' + esc(state.universeNote) + "</div>";
    }
    var when = state.loading ? "กำลังดึงราคา…" : (state.loadedAt ? "คิดเมื่อ " + state.loadedAt.replace("T", " ") + " น. (เวลากรุงเทพ)" : "");
    return '<section class="hr-card mc-fade" aria-labelledby="hrTitle">' +
      '<div class="hr-head"><div><h2 id="hrTitle" class="hr-title">กฎ 3 ข้อบอกอะไรวันนี้</h2>' +
      '<p class="hr-sub-t">EMA12/26 · SMA200 (หลุดยืนยัน ' + E.CONFIRM_BARS + ' แท่ง · ยืนได้ · แตะ ±' + E.TOUCH_BAND_PCT + '% แล้วเด้ง) · ย่อ ≥ ' + Math.abs(E.DIP_PCT) +
      '% จาก high 1 ปี — ใช้ราคาปิดของแท่งที่ปิดตลาดแล้ว · BTC · ETH · หุ้นใน Current Portfolio</p></div>' +
      '<div class="hr-tools"><span class="hr-when" role="status">' + esc(when) + "</span>" +
      '<button type="button" class="mc-btn hr-btn" data-hr-refresh="1"' + (state.loading ? " disabled" : "") + ">ดึงราคาใหม่</button></div></div>" +
      '<div class="hr-rows">' + body + "</div>" +
      '<p class="hr-foot">กฎชุดเดียวกับ Decision Journal (' + esc(E.RULES_VERSION) + ") · บอกว่ากฎที่คุณตั้งเองพูดว่าอะไร ไม่ใช่คำแนะนำการลงทุน · " +
      'จดการตัดสินใจได้ที่ <a href="/decision-journal">Decision Journal</a></p></section>';
  }
  // การ์ดอยู่บนสุดใน <main id="mcRoot"> — mission-control-page.js เขียน innerHTML ของ mcRoot ทับทุกครั้งที่วาด
  //   จึงต้องเช็กทุกครั้งว่ากล่องยังอยู่ ไม่อยู่ก็สร้างใหม่แล้วแทรกเป็นลูกคนแรก
  function mount() {
    var root = document.getElementById("mcRoot");
    if (!root) return null;
    var el = document.getElementById(MOUNT_ID);
    if (el && el.parentNode === root) return el;
    el = document.createElement("div");
    el.id = MOUNT_ID;
    if (root.firstChild) root.insertBefore(el, root.firstChild); else root.appendChild(el);
    return el;
  }
  function render() {
    var el = mount();
    if (!el) return;
    el.innerHTML = html();
    var b = el.querySelector ? el.querySelector("[data-hr-refresh]") : null;
    if (b) b.addEventListener("click", function () { refresh(true); });
  }

  // ---------------- load ----------------
  var runSeq = 0;
  function refresh(force) {
    var E = D();
    if (!E) return Promise.resolve();
    if (force) { try { window.localStorage.removeItem(CACHE_KEY); } catch (e) { /* ไม่เป็นไร */ } }
    var seq = ++runSeq;
    var uni = buildUniverse();
    state.loading = true;
    state.rows = uni.map(function (u) { return { sym: E.canonicalSymbol(u.sym), source: u.source, status: "loading", rules: null, error: null }; });
    render();
    return pool(uni, CONCURRENCY, function (u, i) {
      return evalSymbol(u).then(function (row) {
        if (seq !== runSeq) return;
        state.rows[i] = row;
        render();
      });
    }).then(function () {
      if (seq !== runSeq) return;
      state.loading = false;
      state.loadedAt = nowBangkok();
      render();
    });
  }

  // mission-control-page.js วาด mcRoot ใหม่ (render ของมัน) → การ์ดหาย → ใส่กลับจาก state ที่มีอยู่ ไม่ดึงราคาใหม่
  function watchRoot() {
    var root = document.getElementById("mcRoot");
    if (!root || typeof MutationObserver !== "function") return;
    try {
      new MutationObserver(function () {
        if (!document.getElementById(MOUNT_ID)) render();
      }).observe(root, { childList: true });
    } catch (e) { /* ไม่มี observer ก็ยังวาดครั้งแรกได้ */ }
  }
  function boot() {
    render();
    watchRoot();
    refresh(false);
    // พอร์ตเปลี่ยน (ปักธงแดง/Load Latest Data) → universe เปลี่ยน
    try { window.addEventListener("portfolio-holdings-updated", function () { refresh(false); }); } catch (e) { /* ไม่เป็นไร */ }
    try { window.addEventListener("portfolio-data-snapshot", function () { refresh(false); }); } catch (e) { /* ไม่เป็นไร */ }
  }

  window.HomeRules = {
    refresh: refresh,
    render: render,
    _state: state,
    _buildUniverse: buildUniverse,
    _sides: sides,
    _rank: rank,
    _html: html
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
