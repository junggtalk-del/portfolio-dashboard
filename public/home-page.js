(function () {
  "use strict";

  // ============================================================
  // Daily Portfolio Brief — answers "What do I need to look at today?"
  // SNAPSHOT-ONLY: never refetches market data on render. Sections are
  // computed LIVE from the snapshot via the shared scoring engine so Home
  // speaks the same signal language as Action Center / Asset 360.
  // ============================================================

  const $ = (id) => document.getElementById(id);
  let valueHidden = true; // portfolio value masked until the user reveals it
  let quarterly = null;   // raw "Dashboard การลงทุน" portfolio (/api/portfolio data)

  // ---------------------------------------------------------------- helpers
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }
  function fin(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function num(v, d = 2) { const n = fin(v); return n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d }); }
  function money(v, cur = "฿", d = 0) { const n = fin(v); return n == null ? "—" : `${cur}${n.toLocaleString("en-US", { maximumFractionDigits: d })}`; }
  function signedPct(v) { const n = fin(v); return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function snapshotApi() { return (typeof window !== "undefined" && window.PortfolioDataSnapshot) || null; }
  function readSnapshot() {
    try { const a = snapshotApi(); return (a && a.read && a.read()) || null; } catch (_e) { return null; }
  }
  function canon(s) {
    const a = snapshotApi();
    if (a && typeof a.canonicalSymbol === "function") return a.canonicalSymbol(s);
    return String(s || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  }

  const TECH_RE = /(tech|gtech|ndq|nasdaq|usxndq|qqq|\bai\b|semic|semiconductor|chip|nvda|nvidia|msft|googl|amzn|meta|tsla|amd|avgo|xlk|bitcoin|btc|crypto|foreign|ต่างประเทศ)/i;

  // Shown verbatim across every section when there is no snapshot yet.
  const LOAD_PROMPT = '<div class="mc-empty"><strong>Please load latest data first</strong>กรุณาโหลดข้อมูลล่าสุดก่อน · กด Load Latest Data</div>';

  // A Watchlist alert = an EMA12/26 or SMA200 cross that happened within this
  // many days (the two indicators the user weights). 0 = crossed today.
  const FRESH_CROSS_DAYS = 3;

  // ---------------------------------------------------------------- signal per symbol
  function signalFor(snapshot, key, isHolding, riskLevel) {
    const tech = (snapshot.technicalSignals && snapshot.technicalSignals[key]) || {};
    if (!window.Scoring || typeof window.Scoring.classifySignal !== "function") return { tech, signal: null, action: null, score: null, sma200Status: tech.sma200Status };
    const input = {
      canonicalSymbol: key,
      latestPrice: fin(tech.latestClose),
      latestDate: tech.latestDate,
      ema12: fin(tech.ema12), ema26: fin(tech.ema26), sma200: fin(tech.sma200),
      rsi14: fin(tech.rsi14),
      emaTrendStatus: tech.emaStatus, sma200Status: tech.sma200Status,
      volumeRatio: fin(tech.volumeRatio),
      daysSinceEmaBullishCross: fin(tech.daysSinceEmaBullishCross),
      daysSinceEmaBearishCross: fin(tech.daysSinceEmaBearishCross),
      daysSinceSma200Reclaim: fin(tech.daysSinceSma200Reclaim),
      daysSinceSma200Break: fin(tech.daysSinceSma200Break),
      isHolding: !!isHolding,
      marketRiskLevel: riskLevel
    };
    let signal = null, action = null, score = null;
    try {
      signal = window.Scoring.classifySignal(input);
      action = window.Scoring.actionFromSignal(signal, input);
      const t = window.Scoring.calculateTimingScore(input);
      score = t ? t.score : null;
    } catch (_e) { /* ignore */ }
    return { tech, signal, action, score, sma200Status: tech.sma200Status };
  }

  function drawdown(snapshot, key, lookback) {
    const h = snapshot.historicalData && snapshot.historicalData[key];
    const c = (h && Array.isArray(h.closes) ? h.closes.map(Number) : []).filter(Number.isFinite);
    if (c.length < 5) return null;
    const recent = c.slice(-(lookback || 60));
    const peak = Math.max.apply(null, recent);
    const last = recent[recent.length - 1];
    if (!(peak > 0)) return null;
    return ((last - peak) / peak) * 100;
  }

  // ---------------------------------------------------------------- portfolio (Dashboard การลงทุน)
  function cmpQuarter(a, b) {
    const pa = String(a).split("-Q").map(Number), pb = String(b).split("-Q").map(Number);
    return pa[0] === pb[0] ? (pa[1] || 0) - (pb[1] || 0) : (pa[0] || 0) - (pb[0] || 0);
  }
  function sumQ(arr) { return (arr || []).reduce((s, a) => s + (fin(a.snapshotValue != null ? a.snapshotValue : a.manualValue) || 0), 0); }
  // Map a quarterly asset (name / type / ticker) onto a snapshot technicals key
  // so trend-based guardrails (drawdown, below-SMA200) can be computed where the
  // bucket is a single tracked instrument (e.g. K-GTECHRMF). Generic buckets
  // (เงินสด, หุ้นต่างประเทศ) simply do not resolve and only feed value-based cards.
  function resolveKey(snapshot, a) {
    const ts = snapshot.technicalSignals || {};
    const cands = [a.ticker, a.symbol, a.name, a.type];
    for (let i = 0; i < cands.length; i++) { const k = canon(cands[i]); if (k && ts[k]) return k; }
    return null;
  }
  function buildPortfolio(data, snapshot, riskLevel) {
    const quarters = (data && data.quarters) || {};
    const keys = Object.keys(quarters).sort(cmpQuarter);
    if (!keys.length) return null;
    const latestKey = data && data.currentQuarter && quarters[data.currentQuarter] ? data.currentQuarter : keys[keys.length - 1];
    const idx = keys.indexOf(latestKey);
    const total = sumQ(quarters[latestKey] && quarters[latestKey].assets);
    const prev = idx > 0 ? sumQ(quarters[keys[idx - 1]].assets) : null;
    const qoq = prev && prev > 0 ? ((total - prev) / prev) * 100 : null;
    const assets = ((quarters[latestKey] && quarters[latestKey].assets) || [])
      .map((a) => ({ name: a.name || a.type || "asset", type: a.type || "", ticker: a.ticker || a.symbol || "", value: fin(a.snapshotValue != null ? a.snapshotValue : a.manualValue) || 0 }))
      .filter((a) => a.value > 0)
      .map((a) => {
        const key = resolveKey(snapshot, a);
        return {
          key, name: a.name, type: a.type, value: a.value,
          displaySymbol: a.name, providerSymbol: key || "",
          weight: total > 0 ? (a.value / total) * 100 : 0,
          s: key ? signalFor(snapshot, key, true, riskLevel) : null
        };
      })
      .sort((x, y) => y.value - x.value);
    return { total, qoq, assets };
  }

  function regimeFromScore(score) {
    if (!Number.isFinite(score)) return { key: "unknown", label: "Unknown", thai: "ไม่ทราบ", color: "var(--mc-muted)" };
    if (score < 25) return { key: "on", label: "Risk-on", thai: "ตลาดเปิดรับความเสี่ยง", color: "var(--mc-emerald)" };
    if (score < 50) return { key: "neutral", label: "Neutral", thai: "เป็นกลาง", color: "var(--mc-blue)" };
    if (score < 75) return { key: "caution", label: "Caution", thai: "ระวัง", color: "var(--mc-amber)" };
    return { key: "off", label: "Risk-off", thai: "หลีกเลี่ยงความเสี่ยง", color: "var(--mc-red)" };
  }
  function regimeReco(key) {
    switch (key) {
      case "on": return "ซื้อได้เฉพาะตัวที่สัญญาณคุณภาพดี ไม่ควรไล่ราคาที่ไกลฐาน";
      case "neutral": return "เลือกซื้อเฉพาะสัญญาณคุณภาพดี คุมขนาดไม้ ไม่ไล่ราคา";
      case "caution": return "ระวังการเพิ่มความเสี่ยง เน้นถือของดี ทยอยลดตัวที่อ่อนแรง";
      case "off": return "เน้นป้องกันพอร์ต ลดตัวที่หลุดแนวโน้ม งดไล่ซื้อ";
      default: return "กรุณาโหลดข้อมูลล่าสุดเพื่อประเมินความเสี่ยงตลาด";
    }
  }

  // ---------------------------------------------------------------- build brief
  function buildBrief(snapshot) {
    if (!snapshot) return null;
    const mr = snapshot.marketRisk || {};
    const risk = mr.risk || {};
    const riskScore = fin(risk.score);
    const riskLevel = (risk.level && (risk.level.label || risk.level.thai)) || null;
    const regime = regimeFromScore(riskScore);

    // ---- symbol meta (display name / provider) ----
    const meta = {};
    (snapshot.assets || []).forEach((a) => {
      const k = canon(a.canonicalSymbol || a.ticker || a.symbol);
      if (!k) return;
      meta[k] = { displaySymbol: a.ticker || a.symbol || k, name: a.name || a.assetName || "", providerSymbol: a.provider_symbol || a.providerSymbol || k, type: a.asset_type || a.assetType || "" };
    });
    const metaFor = (k) => meta[k] || { displaySymbol: k, name: "", providerSymbol: k, type: "" };

    // ---- portfolio from Dashboard การลงทุน (Quarterly Editor) ----
    const pf = buildPortfolio(quarterly, snapshot, riskLevel);
    const holdings = pf ? pf.assets : [];
    const total = pf ? pf.total : 0;
    const pvChange = pf ? pf.qoq : null; // quarter-over-quarter change

    // ---- urgent portfolio actions (priority logic) ----
    holdings.forEach((h) => {
      const a = h.s && h.s.action;
      let urg = 0, reason = "";
      if (a && a.key === "SELL_ALL") { urg = 5; reason = a.thaiReason || "ราคาต่ำกว่า SMA200 + EMA ตัดลง"; }
      else if (a && a.key === "SELL_FIRST") { urg = 4; reason = a.thaiReason || "EMA ตัดลง โมเมนตัมอ่อน"; }
      else if (h.weight > 35) { urg = 3; reason = `กระจุกตัวสูง ${h.weight.toFixed(1)}%`; }
      else if (h.s && h.s.sma200Status === "BELOW_SMA200") { urg = 2; reason = "ราคาต่ำกว่า SMA200"; }
      h.urg = urg; h.urgReason = reason;
    });
    const urgent = holdings.filter((h) => h.urg > 0).sort((a, b) => b.urg - a.urg || b.weight - a.weight).slice(0, 3);
    const urgentCount = holdings.filter((h) => h.urg > 0).length;

    // ---- New Bullish / New Bearish signals (fresh EMA12/26 or SMA200 cross, 1-3d) ----
    // DIRECTION comes from the shared engine (new_bullish / new_bearish), which is
    // whipsaw-guarded, so Home agrees with AI Boom / Action Center. Scan the loaded
    // universe (skip index symbols), tag holdings, label the actual fresh cross.
    const heldKeys = {};
    holdings.forEach((h) => { if (h.key) heldKeys[h.key] = true; });
    const inFresh = (n) => { const v = fin(n); return v != null && v >= 0 && v <= FRESH_CROSS_DAYS; };
    function freshCrossInfo(tech, dir) {
      const ev = [];
      if (dir === "buy") {
        if (inFresh(tech.daysSinceEmaBullishCross)) ev.push({ days: fin(tech.daysSinceEmaBullishCross), label: "EMA12/26 ตัดขึ้น" });
        if (inFresh(tech.daysSinceSma200Reclaim)) ev.push({ days: fin(tech.daysSinceSma200Reclaim), label: "ยืนเหนือ SMA200" });
      } else {
        if (inFresh(tech.daysSinceEmaBearishCross)) ev.push({ days: fin(tech.daysSinceEmaBearishCross), label: "EMA12/26 ตัดลง" });
        if (inFresh(tech.daysSinceSma200Break)) ev.push({ days: fin(tech.daysSinceSma200Break), label: "หลุด SMA200" });
      }
      if (!ev.length) return null;
      ev.sort((a, b) => a.days - b.days);
      return { days: ev[0].days, label: ev[0].label, extra: ev.slice(1).map((e) => e.label).join(" · ") };
    }
    const newBullish = [], newBearish = [];
    Object.keys(snapshot.technicalSignals || {}).forEach((key) => {
      if (/^\^/.test(key)) return; // skip index symbols (^VIX, ^GSPC, ^SET...)
      const isHold = !!heldKeys[key];
      const s = signalFor(snapshot, key, isHold, riskLevel);
      if (!s || !s.signal) return;
      const g = s.signal.groupKey;
      if (g !== "new_bullish" && g !== "new_bearish") return;
      const dir = g === "new_bullish" ? "buy" : "sell";
      const cross = freshCrossInfo(s.tech, dir);
      if (!cross) return;
      const m = metaFor(key);
      const entry = {
        key, displaySymbol: m.displaySymbol || key, name: m.name || "", providerSymbol: m.providerSymbol || key,
        days: cross.days, rule: cross.label, extra: cross.extra,
        action: (s.action && s.action.thaiAction) || (dir === "buy" ? "พิจารณาซื้อ" : "พิจารณาขาย / ลด"),
        score: s.score, isHolding: isHold
      };
      (dir === "buy" ? newBullish : newBearish).push(entry);
    });
    const cmpFresh = (a, b) => a.days - b.days || (b.score || 0) - (a.score || 0);
    newBullish.sort(cmpFresh);
    newBearish.sort(cmpFresh);
    const bullCount = newBullish.length, bearCount = newBearish.length;

    // ---- market breadth (% of universe above SMA200) ----
    let above = 0, tot = 0;
    Object.keys(snapshot.technicalSignals || {}).forEach((k) => {
      const st = snapshot.technicalSignals[k] && snapshot.technicalSignals[k].sma200Status;
      if (st === "ABOVE_SMA200") { above++; tot++; }
      else if (st === "BELOW_SMA200") { tot++; }
    });
    const breadth = tot ? Math.round((above / tot) * 100) : null;

    // ---- guardrails ----
    let ddPct = null;
    if (total > 0) {
      let acc = 0, w = 0;
      holdings.forEach((h) => { const d = drawdown(snapshot, h.key); if (d != null) { acc += d * h.value; w += h.value; } });
      ddPct = w > 0 ? acc / w : null;
    }
    function ddStatus(p) {
      if (p == null) return { t: "ไม่มีข้อมูล", c: "mc-chip-slate" };
      if (p >= -5) return { t: "ปกติ", c: "mc-chip-bull" };
      if (p >= -10) return { t: "เฝ้าดู", c: "mc-chip-cyan" };
      if (p >= -15) return { t: "ระวัง", c: "mc-chip-warn" };
      return { t: "ลดความเสี่ยง", c: "mc-chip-bear" };
    }
    const sortedW = holdings.slice().sort((a, b) => b.weight - a.weight);
    const topWeight = sortedW.length ? sortedW[0].weight : null;
    const top5 = sortedW.slice(0, 5).reduce((a, h) => a + h.weight, 0);
    function concStatus(w) {
      if (w == null) return { t: "ไม่มีข้อมูล", c: "mc-chip-slate" };
      if (w > 35) return { t: "ลดความเสี่ยง", c: "mc-chip-bear" };
      if (w > 25) return { t: "ระวัง", c: "mc-chip-warn" };
      if (w > 15) return { t: "เฝ้าดู", c: "mc-chip-cyan" };
      return { t: "ปกติ", c: "mc-chip-bull" };
    }
    let techVal = 0;
    holdings.forEach((h) => { if (TECH_RE.test(h.name) || TECH_RE.test(h.type) || TECH_RE.test(h.displaySymbol)) techVal += h.value; });
    const techPct = total > 0 ? (techVal / total) * 100 : null;
    function expStatus(p) {
      if (p == null) return { t: "ไม่มีข้อมูล", c: "mc-chip-slate" };
      if (p >= 55) return { t: "High", c: "mc-chip-bear" };
      if (p >= 30) return { t: "Medium", c: "mc-chip-warn" };
      return { t: "Low", c: "mc-chip-bull" };
    }
    const below = holdings.filter((h) => h.s && h.s.sma200Status === "BELOW_SMA200").sort((a, b) => b.weight - a.weight);
    function belowStatus(n) {
      if (!total) return { t: "ไม่มีข้อมูล", c: "mc-chip-slate" };
      if (n === 0) return { t: "ปกติ", c: "mc-chip-bull" };
      if (n <= 2) return { t: "เฝ้าดู", c: "mc-chip-cyan" };
      return { t: "ระวัง", c: "mc-chip-warn" };
    }

    const guardrails = {
      drawdown: { pct: ddPct, status: ddStatus(ddPct) },
      concentration: { topWeight, top5, status: concStatus(topWeight), topName: sortedW.length ? sortedW[0].displaySymbol : null },
      aiTech: { pct: techPct, status: expStatus(techPct) },
      belowSma: { count: below.length, names: below.slice(0, 3).map((h) => h.displaySymbol), status: belowStatus(below.length) }
    };

    return {
      total, pvChange,
      regime, riskScore, vix: mr.metrics ? fin(mr.metrics.vix) : null, breadth,
      reco: regimeReco(regime.key),
      urgent, urgentCount,
      newBullish: newBullish.slice(0, 5), newBearish: newBearish.slice(0, 5),
      bullCount, bearCount, alertCount: bullCount + bearCount,
      guardrails,
      hasPortfolio: holdings.length > 0,
      loadedAt: snapshot.loadedAt
    };
  }

  // ---------------------------------------------------------------- renderers
  function applyPvVisibility(total) {
    const el = $("mcPv"), btn = $("mcPvToggle");
    if (!el) return;
    if (!Number.isFinite(total) || total <= 0) el.textContent = "—";
    else el.textContent = valueHidden ? "฿ ••••••" : money(total);
    if (btn) btn.textContent = valueHidden ? "👁️" : "🙈";
  }

  function renderHero(b) {
    const root = $("mcHeroCards");
    if (!root) return;
    const regimeColor = b ? b.regime.color : "var(--mc-muted)";
    const regimeLabel = b ? b.regime.label : "—";
    const regimeThai = b ? b.regime.thai : "กรุณาโหลดข้อมูล";
    const urgent = b ? b.urgentCount : null;
    const bull = b ? b.bullCount : null;
    const bear = b ? b.bearCount : null;

    root.innerHTML = `
      <div class="mc-metric mc-glow">
        <div class="mc-label" style="display:flex;align-items:center;gap:6px;">
          <span>Portfolio Value</span>
          <button id="mcPvToggle" type="button" title="แสดง/ซ่อนมูลค่าพอร์ต" style="margin-left:auto;background:transparent;border:0;cursor:pointer;font-size:14px;line-height:1;padding:2px;color:inherit;">👁️</button>
        </div>
        <div class="mc-value mc-tnum" id="mcPv">—</div>
        <div class="mc-delta ${b && b.pvChange != null && b.pvChange < 0 ? "mc-down" : "mc-up"}">${b && b.pvChange != null ? `${signedPct(b.pvChange)} QoQ` : "จาก Dashboard การลงทุน"}</div>
      </div>
      <div class="mc-metric mc-glow">
        <div class="mc-label"><span>Market Regime</span></div>
        <div class="mc-value" style="font-size:22px;color:${regimeColor};">${esc(regimeLabel)}</div>
        <div class="mc-delta" style="color:var(--mc-muted)">${esc(regimeThai)}${b && b.riskScore != null ? ` · Risk ${Math.round(b.riskScore)}` : ""}</div>
      </div>
      <div class="mc-metric mc-glow">
        <div class="mc-label"><span>Urgent Actions</span></div>
        <div class="mc-value mc-tnum" style="color:${urgent ? "var(--mc-red)" : "var(--mc-text)"};">${urgent == null ? "—" : urgent}</div>
        <div class="mc-delta" style="color:var(--mc-muted)">ต้องดูในพอร์ตวันนี้</div>
      </div>
      <div class="mc-metric mc-glow">
        <div class="mc-label"><span>New Signals (1-3 วัน)</span></div>
        <div class="mc-value mc-tnum">${bull == null && bear == null ? "—" : (bull + bear)}</div>
        <div class="mc-delta"><span style="color:var(--mc-emerald)">▲ ${bull == null ? "—" : bull}</span> · <span style="color:var(--mc-red)">▼ ${bear == null ? "—" : bear}</span></div>
      </div>`;

    applyPvVisibility(b ? b.total : null);
    const btn = $("mcPvToggle");
    if (btn) btn.addEventListener("click", () => { valueHidden = !valueHidden; applyPvVisibility(b ? b.total : null); });
  }

  function focusCard(cls, title, count, countCls, rowsHtml, link) {
    return `<div class="mc-card mc-focus-card ${cls}">
      <div class="mc-focus-title"><span>${title}</span>${count != null ? `<span class="mc-count ${countCls}">${count}</span>` : ""}</div>
      ${rowsHtml || '<div class="mc-empty"><strong>ยังไม่มีรายการ</strong></div>'}
      ${link ? `<a class="mc-link" style="display:inline-block;margin-top:10px;" href="${link.href}">${link.text} →</a>` : ""}
    </div>`;
  }

  // One row for a fresh-cross signal (used by New Bullish / New Bearish).
  function signalRow(e) {
    const dayText = e.days === 0 ? "เพิ่งตัดล่าสุด" : `${e.days} วันก่อน`;
    const hold = e.isHolding ? ' <span class="mc-chip mc-chip-cyan">ถืออยู่</span>' : "";
    const sym = e.providerSymbol ? `<a class="asset-link" href="/asset/${encodeURIComponent(e.providerSymbol)}">${esc(e.displaySymbol)}</a>` : esc(e.displaySymbol);
    return `<div class="mc-focus-row"><div>
        <div class="mc-fr-sym">${sym}${hold}</div>
        <div class="mc-fr-act">${esc(e.rule)} · ${dayText}${e.extra ? " · " + esc(e.extra) : ""}</div></div>
      <div class="mc-fr-right">${e.score == null ? "" : `<span style="color:var(--mc-muted)">Score ${e.score}</span>`}<div style="margin-top:3px;font-size:10.5px;color:var(--mc-muted)">${esc(e.action)}</div></div></div>`;
  }

  // Priority Signals — the three things to look at FIRST: portfolio urgencies +
  // fresh bullish/bearish crossovers (the indicators the user weights).
  function renderPriority(b) {
    const root = $("mcPriority");
    if (!root) return;
    if (!b) {
      root.innerHTML = `<div class="mc-card mc-focus-card mc-accent-red" style="grid-column:1/-1">${LOAD_PROMPT}</div>`;
      return;
    }

    // 1) Urgent Action (holdings)
    let urgentRows = "";
    if (b.urgent.length) {
      urgentRows = b.urgent.map((h) => {
        const act = (h.s && h.s.action && h.s.action.thaiAction) || "ทบทวน / ลดน้ำหนัก";
        const chip = h.urg >= 4 ? "mc-chip-bear" : h.urg >= 2 ? "mc-chip-warn" : "mc-chip-slate";
        const sym = h.providerSymbol ? `<a class="asset-link" href="/asset/${encodeURIComponent(h.providerSymbol)}">${esc(h.displaySymbol)}</a>` : esc(h.displaySymbol);
        return `<div class="mc-focus-row"><div>
            <div class="mc-fr-sym">${sym}</div>
            <div class="mc-fr-act">${esc(act)} · ${esc(h.urgReason)}</div></div>
          <div class="mc-fr-right"><span class="mc-chip ${chip}">${h.weight.toFixed(1)}%</span></div></div>`;
      }).join("");
    } else if (b.hasPortfolio) {
      urgentRows = `<div class="mc-empty"><strong>พอร์ตยังไม่มีรายการเร่งด่วน</strong>ทุกตัวยังอยู่ในกรอบความเสี่ยงที่รับได้</div>`;
    } else {
      urgentRows = `<div class="mc-empty"><strong>ยังไม่มีข้อมูลพอร์ต</strong>เพิ่ม/แก้ไขได้ที่หน้า Dashboard การลงทุน</div>`;
    }

    // 2) New Bullish Signals
    const bullRows = b.newBullish.length
      ? b.newBullish.map(signalRow).join("")
      : `<div class="mc-empty"><strong>ยังไม่มีสัญญาณตัดขึ้นใหม่</strong>ไม่มี EMA12/26 หรือ SMA200 ตัดขึ้นใน 1-3 วัน</div>`;

    // 3) New Bearish Signals
    const bearRows = b.newBearish.length
      ? b.newBearish.map(signalRow).join("")
      : `<div class="mc-empty"><strong>ยังไม่มีสัญญาณตัดลงใหม่</strong>ไม่มี EMA12/26 หรือ SMA200 ตัดลงใน 1-3 วัน</div>`;

    root.innerHTML =
      focusCard("mc-accent-red", "🚨 Urgent Action", b.urgentCount, "mc-chip-bear", urgentRows, { href: "/action-center", text: "ดู Action Center" }) +
      focusCard("mc-accent-emerald", "🟢 New Bullish Signals", b.bullCount, "mc-chip-bull", bullRows, { href: "/ai-boom-universe", text: "ดู AI Boom Universe" }) +
      focusCard("mc-accent-amber", "🔴 New Bearish Signals", b.bearCount, "mc-chip-bear", bearRows, { href: "/ai-boom-universe", text: "ดู AI Boom Universe" });
  }

  function renderMarketRisk(b) {
    const root = $("mcMarketRisk");
    if (!root) return;
    if (!b) { root.innerHTML = LOAD_PROMPT; return; }
    const r = b.regime;
    root.innerHTML = `
      <div class="mc-mr-grid">
        <div><span>Market Regime</span><strong style="color:${r.color}">${esc(r.label)}</strong></div>
        <div><span>Risk Score</span><strong>${b.riskScore == null ? "—" : Math.round(b.riskScore)}</strong></div>
        <div><span>VIX</span><strong>${num(b.vix)}</strong></div>
        <div><span>Bullish Breadth</span><strong>${b.breadth == null ? "—" : b.breadth + "%"}</strong></div>
      </div>
      <p class="mc-mr-reco">💡 ${esc(b.reco)}</p>`;
  }

  function guardCard(label, value, color, status, sub) {
    return `<div class="mc-card mc-guard">
      <div class="mc-guard-label">${esc(label)}</div>
      <div class="mc-guard-value" style="color:${color}">${value}</div>
      <span class="mc-chip ${status.c}">${esc(status.t)}</span>
      ${sub ? `<div class="mc-guard-sub">${sub}</div>` : ""}
    </div>`;
  }

  function renderGuardrails(b) {
    const root = $("mcGuardrails");
    if (!root) return;
    if (!b) {
      root.innerHTML = `<div class="mc-card mc-guard" style="grid-column:1/-1">${LOAD_PROMPT}</div>`;
      return;
    }
    if (!b.hasPortfolio) {
      root.innerHTML = `<div class="mc-card mc-guard mc-empty" style="grid-column:1/-1"><strong>ยังไม่มีข้อมูลพอร์ต</strong>เพิ่ม/แก้ไขพอร์ตได้ที่หน้า Dashboard การลงทุน เพื่อดูกรอบความเสี่ยง</div>`;
      return;
    }
    const g = b.guardrails;
    const dd = g.drawdown, conc = g.concentration, ai = g.aiTech, bs = g.belowSma;
    root.innerHTML =
      guardCard("Drawdown Guard",
        dd.pct == null ? "—" : `${dd.pct >= 0 ? "+" : ""}${dd.pct.toFixed(1)}%`,
        dd.pct == null ? "var(--mc-muted)" : dd.pct <= -10 ? "var(--mc-red)" : dd.pct <= -5 ? "var(--mc-amber)" : "var(--mc-emerald)",
        dd.status, "จากจุดสูงสุดรอบล่าสุด") +
      guardCard("Concentration",
        conc.topWeight == null ? "—" : `${conc.topWeight.toFixed(1)}%`,
        conc.topWeight == null ? "var(--mc-muted)" : conc.topWeight > 35 ? "var(--mc-red)" : conc.topWeight > 25 ? "var(--mc-amber)" : "var(--mc-emerald)",
        conc.status, `${conc.topName ? esc(conc.topName) + " · " : ""}Top 5 = ${conc.top5 != null ? conc.top5.toFixed(0) + "%" : "—"}`) +
      guardCard("AI / Tech Exposure",
        ai.pct == null ? "—" : `${ai.pct.toFixed(0)}%`,
        ai.pct == null ? "var(--mc-muted)" : ai.pct >= 55 ? "var(--mc-red)" : ai.pct >= 30 ? "var(--mc-amber)" : "var(--mc-emerald)",
        ai.status, "สัดส่วนกลุ่มเทค/AI ในพอร์ต") +
      guardCard("Below SMA200",
        String(bs.count),
        bs.count === 0 ? "var(--mc-emerald)" : bs.count <= 2 ? "var(--mc-amber)" : "var(--mc-red)",
        bs.status, bs.names.length ? esc(bs.names.join(" · ")) : "ทุกตัวอยู่เหนือ SMA200");
  }

  function renderActivity(b) {
    const root = $("mcActivity");
    if (!root) return;
    if (!b) { root.innerHTML = LOAD_PROMPT; return; }
    const acts = [];
    if (b.loadedAt) acts.push({ ic: "🗂️", color: "#a855f7", title: "Data Snapshot", desc: `โหลดข้อมูลล่าสุด ${new Date(b.loadedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` });
    acts.push({ ic: "🛡️", color: b.regime.key === "off" || b.regime.key === "caution" ? "#f43f5e" : "#10b981", title: "Market Regime", desc: `${b.regime.label}${b.riskScore != null ? ` · Risk ${Math.round(b.riskScore)}` : ""}` });
    if (b.urgentCount) acts.push({ ic: "🚨", color: "#f43f5e", title: "Portfolio", desc: `มี ${b.urgentCount} รายการต้องดูในพอร์ต` });
    else acts.push({ ic: "✅", color: "#10b981", title: "Portfolio", desc: "ไม่มีรายการเร่งด่วนในพอร์ต" });
    root.innerHTML = acts.slice(0, 3).map((a) => `<div class="mc-act">
      <div class="mc-act-ic" style="background:${a.color}22;color:${a.color}">${a.ic}</div>
      <div><strong>${esc(a.title)}</strong><p>${esc(a.desc)}</p></div>
    </div>`).join("");
  }

  function renderAll() {
    const snapshot = readSnapshot();
    const b = buildBrief(snapshot);
    renderHero(b);
    renderPriority(b);
    renderGuardrails(b);
    renderMarketRisk(b);
    renderActivity(b);
  }

  // ---------------------------------------------------------------- snapshot bar
  function updateSnapBar() {
    const api = snapshotApi();
    const snap = readSnapshot();
    const t = $("mcSnapTime"), pill = $("mcSnapPill");
    if (t) t.textContent = snap && snap.loadedAt ? new Date(snap.loadedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
    const fr = api && api.freshness ? api.freshness(snap) : null;
    if (pill && fr) {
      pill.textContent = "● " + (fr.thai || fr.label);
      pill.className = "mc-pill " + (fr.key === "fresh" ? "mc-pill-fresh" : "mc-pill-stale");
    }
  }

  // Portfolio value/holdings come from "Dashboard การลงทุน" (/api/portfolio),
  // NOT market data — read once on load and after a snapshot refresh.
  async function loadQuarterly() {
    try {
      const r = await fetch("/api/portfolio", { cache: "no-store" });
      if (r.ok) { const d = await r.json(); quarterly = (d && d.data) || null; }
    } catch (_e) { /* ignore — portfolio cards degrade gracefully */ }
    renderAll();
  }

  async function loadLatest() {
    const api = snapshotApi();
    const btn = $("mcLoadLatest"), pill = $("mcSnapPill");
    if (!api || typeof api.loadLatestData !== "function") return;
    if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }
    if (pill) { pill.textContent = "● Loading"; pill.className = "mc-pill mc-pill-stale"; }
    try { await api.loadLatestData(); }
    catch (_e) { if (btn) btn.textContent = "Load failed"; }
    finally {
      if (btn) { btn.disabled = false; window.setTimeout(() => { btn.textContent = "Load Latest Data"; }, 1600); }
      updateSnapBar();
      await loadQuarterly();
    }
  }

  // ---------------------------------------------------------------- events
  const loadBtn = $("mcLoadLatest");
  if (loadBtn) loadBtn.addEventListener("click", loadLatest);
  const menuToggle = $("mcMenuToggle");
  if (menuToggle) menuToggle.addEventListener("click", () => { const s = $("mcSidebar"); if (s) s.classList.toggle("is-open"); });
  window.addEventListener("portfolio-data-snapshot", () => { try { updateSnapBar(); renderAll(); } catch (_e) {} });
  window.addEventListener("watchlist-updated", () => { try { renderAll(); } catch (_e) {} });

  // ---------------------------------------------------------------- init
  updateSnapBar();
  renderAll();
  loadQuarterly();
})();
