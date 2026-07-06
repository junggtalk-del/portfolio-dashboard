(function () {
  "use strict";

  // ============================================================
  // Watchlist — "Which assets I personally selected have FRESH signals today?"
  // Snapshot-only. Sections are driven by the shared scoring engine:
  //   1. Fresh EMA12/26 cross up (<= 3 trading days)
  //   2. Near EMA cross (EMA12 within 0.5% below EMA26)
  //   3. Holding Risk Watch (real holdings turning risky)
  //   4. No Fresh Signal / All items (collapsed)
  // This is NOT AI Boom Universe (full universe) — it shows selected items +
  // highlights fresh actionable signals only.
  // ============================================================

  const root = document.getElementById("watchlistRoot");
  const WL = window.Watchlist;

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function fin(v) { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  function num(v, d = 2) { const n = fin(v); return n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d }); }
  function enc(s) { return encodeURIComponent(s); }
  function getSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function scoreColor(s) { return (s != null && window.Scoring && typeof window.Scoring.scoreColor === "function") ? window.Scoring.scoreColor(s) : "var(--mc-text)"; }
  function curFor(item, key) {
    if (item && item.currency === "USD") return "$";
    if (item && item.currency === "THB") return "฿";
    const k = WL.canonicalize((item && item.canonicalSymbol) || key || "");
    if (k.endsWith(".BK") || k.startsWith("^SET") || /RMF|SSF/i.test(k) || /^K-/.test(k)) return "฿";
    return "$";
  }

  const FRESH = 3;
  const SECTIONS = [
    { key: "fresh", title: "Fresh EMA Cross ≤ 3 Days", thai: "เพิ่งตัดขึ้นไม่เกิน 3 วัน", acc: "wl-acc-fresh" },
    { key: "near", title: "Near EMA Cross", thai: "ใกล้ตัดขึ้น", acc: "wl-acc-near" },
    { key: "risk", title: "Holding Risk Watch", thai: "ถืออยู่และเริ่มเสี่ยง", acc: "wl-acc-risk" },
    { key: "none", title: "No Fresh Signal / All Watchlist Items", thai: "ยังไม่มีสัญญาณสด / รายการทั้งหมด", acc: "wl-acc-none" }
  ];

  // Default view = fresh signals only; section 4 stays collapsed.
  const filters = { freshness: "fresh3", market: "all", signalType: "all", confirm: "all", search: "" };
  let analyzed = [];
  let rootWired = false;
  let lastSuggestions = [];

  // ---------------------------------------------------------------- analysis
  function holdingsMap(snapshot) {
    const map = {};
    const data = (snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [];
    data.forEach((h) => { const k = WL.canonicalize(h.canonicalSymbol || h.ticker || ""); if (k) map[k] = h; });
    return map;
  }

  function analyze(item, snapshot, holds, riskLevel) {
    const key = WL.canonicalize(item.canonicalSymbol);
    const tech = (snapshot.technicalSignals && snapshot.technicalSignals[key]) || {};
    const sc = (snapshot.scoring && snapshot.scoring.bySymbol && snapshot.scoring.bySymbol[key]) || null;
    const priceSnap = snapshot.prices && snapshot.prices[key];
    const price = fin(tech.latestClose) != null ? fin(tech.latestClose) : (priceSnap ? fin(priceSnap.latestClose) : null);
    const holding = holds[key];
    const isHolding = !!(holding && holding.isHolding);
    const weight = holding ? fin(holding.targetWeight) : null;
    const ema12 = fin(tech.ema12), ema26 = fin(tech.ema26), sma200 = fin(tech.sma200);
    const daysBull = fin(tech.daysSinceEmaBullishCross);
    const daysBear = fin(tech.daysSinceEmaBearishCross);
    const emaBull = tech.emaStatus === "EMA_BULLISH" || (ema12 != null && ema26 != null && ema12 > ema26);
    const emaBear = tech.emaStatus === "EMA_BEARISH" || (ema12 != null && ema26 != null && ema12 < ema26);
    const above = tech.sma200Status === "ABOVE_SMA200" || (price != null && sma200 != null && price > sma200);
    const below = tech.sma200Status === "BELOW_SMA200" || (price != null && sma200 != null && price < sma200);
    const emaGapPct = (ema12 != null && ema26 != null && ema26 !== 0) ? Math.abs(ema12 - ema26) / ema26 : null;
    const emaNear = (ema12 != null && ema26 != null) && !emaBull && emaGapPct != null && emaGapPct <= 0.005; // EMA12 within 0.5% of (and not above) EMA26 — matches engine derive()

    const input = {
      canonicalSymbol: key, latestPrice: price, latestDate: tech.latestDate,
      ema12, ema26, sma200, rsi14: fin(tech.rsi14),
      emaTrendStatus: tech.emaStatus, sma200Status: tech.sma200Status, volumeRatio: fin(tech.volumeRatio),
      daysSinceEmaBullishCross: daysBull, daysSinceEmaBearishCross: daysBear,
      daysSinceSma200Reclaim: fin(tech.daysSinceSma200Reclaim), daysSinceSma200Break: fin(tech.daysSinceSma200Break),
      isHolding, marketRiskLevel: riskLevel
    };
    let timing = null, signal = null, action = null;
    if (window.Scoring) {
      try { timing = window.Scoring.calculateTimingScore(input); } catch (e) { /* ignore */ }
      try { signal = window.Scoring.classifySignal(input); action = window.Scoring.actionFromSignal(signal, input); } catch (e) { /* ignore */ }
    }
    const gates = timing ? timing.gates : null;
    const score = timing ? timing.score : (sc ? fin(sc.signalScore != null ? sc.signalScore : sc.timingScore) : null);
    const volRatio = fin(tech.volumeRatio);

    const freshBull = emaBull && daysBull != null && daysBull >= 0 && daysBull <= FRESH;
    const freshBear = emaBear && daysBear != null && daysBear >= 0 && daysBear <= FRESH;
    const sellAction = !!(action && (action.key === "SELL_ALL" || action.key === "SELL_FIRST"));
    const bothGatesFail = !!(gates && gates.ema && gates.sma200 && gates.ema.status === "FAIL" && gates.sma200.status === "FAIL");
    const riskStrong = isHolding && (freshBear || sellAction || (score != null && score < 35) || bothGatesFail);

    // Section precedence: real risk first, then fresh bull, then near, then mild
    // holding risk (below SMA200), else no fresh signal. Watchlist-only items can
    // never enter "risk".
    let section;
    if (riskStrong) section = "risk";
    else if (freshBull) section = "fresh";
    else if (emaNear) section = "near";
    else if (isHolding && below) section = "risk";
    else section = "none";

    const hasData = ema12 != null || ema26 != null || price != null;
    return {
      item, key, tech, sc, price, isHolding, weight, ema12, ema26, sma200,
      emaBull, emaBear, above, below, emaNear, emaGapPct, daysBull, daysBear,
      freshBull, freshBear, timing, signal, action, gates, score, volRatio, section, hasData,
      displaySymbol: item.displaySymbol || key, name: item.assetName || "",
      providerSymbol: item.providerSymbol || key, currency: curFor(item, key)
    };
  }

  function marketOf(a) {
    const k = a.key, t = (a.item.assetType || "").toLowerCase();
    if (/btc|eth|usdt|crypto|bitcoin/i.test(k) || t === "crypto") return "crypto";
    if (/rmf|ssf/i.test(k) || /^K-/.test(k) || t.indexOf("fund") >= 0) return "fund";
    if (a.item.market && String(a.item.market).toLowerCase() === "mai") return "mai";
    if (k.endsWith(".BK") || k.startsWith("^SET")) return "thai";
    return "us";
  }

  function volStrength(a) { const s = a.gates && a.gates.volume ? a.gates.volume.status : null; return s === "STRONG" ? 3 : s === "CONFIRMED" ? 2 : s === "NEAR" ? 1 : 0; }
  function volConfirmed(a) { return volStrength(a) >= 2; }
  function smaPass(a) { return (a.gates && a.gates.sma200 && a.gates.sma200.status === "PASS") ? 1 : 0; }
  function emaPass(a) { return (a.gates && a.gates.ema && a.gates.ema.status === "PASS") ? 1 : 0; }
  function riskRank(a) { return a.action && a.action.key === "SELL_ALL" ? 2 : a.action && a.action.key === "SELL_FIRST" ? 1 : 0; }

  // ---------------------------------------------------------------- filtering
  function passes(a) {
    // market
    if (filters.market !== "all" && marketOf(a) !== filters.market) return false;
    // signal type
    if (filters.signalType !== "all") {
      const want = { bullish: "fresh", near: "near", risk: "risk", nofresh: "none" }[filters.signalType];
      if (a.section !== want) return false;
    }
    // confirmation — only narrows the actionable bullish sections (fresh/near);
    // applying "Above SMA200" to Holding Risk would silently empty it.
    if (filters.confirm !== "all" && (a.section === "fresh" || a.section === "near")) {
      if (filters.confirm === "volconfirm" && !volConfirmed(a)) return false;
      if (filters.confirm === "abovesma" && !a.above) return false;
      if (filters.confirm === "allpass" && !(emaPass(a) && smaPass(a) && volConfirmed(a))) return false;
    }
    // freshness
    const f = filters.freshness;
    if (f === "d1" && !(a.section === "fresh" && a.daysBull != null && a.daysBull <= 1)) return false;
    if (f === "d2" && !(a.section === "fresh" && a.daysBull === 2)) return false;
    if (f === "d3" && !(a.section === "fresh" && a.daysBull === 3)) return false;
    if (f === "near" && a.section !== "near") return false;
    // fresh3 / all impose no per-item restriction here (section grouping handles focus)
    // search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (String(a.displaySymbol).toLowerCase().indexOf(q) < 0 && String(a.name).toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }

  function sortSection(key, list) {
    const a = list.slice();
    if (key === "fresh") {
      a.sort((x, y) => (x.daysBull - y.daysBull) || (y.score || 0) - (x.score || 0) || volStrength(y) - volStrength(x) || (smaPass(y) - smaPass(x)) || (y.volRatio || 0) - (x.volRatio || 0));
    } else if (key === "near") {
      a.sort((x, y) => (x.emaGapPct == null ? 1 : x.emaGapPct) - (y.emaGapPct == null ? 1 : y.emaGapPct) || (smaPass(y) - smaPass(x)) || (y.volRatio || 0) - (x.volRatio || 0) || (y.score || 0) - (x.score || 0));
    } else if (key === "risk") {
      a.sort((x, y) => riskRank(y) - riskRank(x) || ((y.weight || 0) - (x.weight || 0)) || ((x.daysBear == null ? 99 : x.daysBear) - (y.daysBear == null ? 99 : y.daysBear)) || ((x.score == null ? 999 : x.score) - (y.score == null ? 999 : y.score)));
    } else {
      a.sort((x, y) => String(x.displaySymbol).localeCompare(String(y.displaySymbol)));
    }
    return a;
  }

  // ---------------------------------------------------------------- card
  function freshLabel(a) {
    if (a.section === "fresh") return a.daysBull === 0 ? "EMA12 ตัดขึ้น EMA26 วันนี้" : `EMA12 ตัดขึ้น EMA26 มาแล้ว ${a.daysBull} วัน`;
    if (a.section === "near") return "EMA ใกล้ตัดขึ้น";
    if (a.section === "risk") {
      if (a.freshBear) return a.daysBear === 0 ? "EMA12 ตัดลง EMA26 วันนี้" : `EMA12 ตัดลง EMA26 มาแล้ว ${a.daysBear} วัน`;
      if (a.below) return "ราคาต่ำกว่า SMA200";
      return "เริ่มมีความเสี่ยง";
    }
    return "ยังไม่มีสัญญาณสด";
  }
  function gateText(g) { return g && g.thaiLabel ? g.thaiLabel : "—"; }
  function chipsFor(a) {
    const out = [];
    if (a.freshBull) out.push(["EMA Cross Up", "bull"]);
    else if (a.emaNear) out.push(["EMA Near Cross", "near"]);
    else if (a.freshBear) out.push(["EMA Cross Down", "bear"]);
    if (a.above) out.push(["Above SMA200", "bull"]);
    else if (a.below) out.push(["Below SMA200", "bear"]);
    if (volStrength(a) === 3) out.push(["Strong Volume", "bull"]);
    else if (volStrength(a) === 2) out.push(["Volume Confirmed", "bull"]);
    if (a.section === "risk") out.push(["Holding Risk", "bear"]);
    return out.slice(0, 3);
  }

  function rsiLabel(v) {
    if (v <= 30) return "ขายมากเกินไป (oversold)";
    if (v >= 70) return "ซื้อมากเกินไป (overbought)";
    if (v <= 40) return "ค่อนข้างต่ำ";
    if (v >= 60) return "ค่อนข้างสูง";
    return "ปานกลาง";
  }
  // Plain-language reason for WHY this item is in its section.
  function sectionWhy(a) {
    if (a.section === "fresh") {
      const dayWord = a.daysBull === 0 ? "วันนี้" : `${a.daysBull} วัน`;
      return `EMA12 ตัดขึ้น EMA26 มาแล้ว ${dayWord} → จัดอยู่กลุ่ม "เพิ่งตัดขึ้น ≤3 วัน"` +
        (a.above ? " และราคาอยู่เหนือ SMA200 (เทรนด์ใหญ่หนุน) จึงเข้าเงื่อนไขซื้อเพิ่ม"
                 : " แต่ราคายังต่ำกว่า SMA200 จึงควรซื้อไม้แรกเล็ก ๆ / เฝ้าดูก่อน");
    }
    if (a.section === "near") {
      const gp = a.emaGapPct != null ? (a.emaGapPct * 100).toFixed(2) : "—";
      return `EMA12 อยู่ต่ำกว่า EMA26 เพียง ${gp}% (≤0.5%) → "ใกล้ตัดขึ้น" ยังไม่ใช่สัญญาณซื้อ ให้เฝ้าดูใกล้ชิด`;
    }
    if (a.section === "risk") {
      const bits = [];
      if (a.freshBear) bits.push(`EMA12 ตัดลง EMA26 มาแล้ว ${a.daysBear === 0 ? "วันนี้" : a.daysBear + " วัน"}`);
      if (a.below) bits.push("ราคาต่ำกว่า SMA200");
      if (a.action && a.action.key === "SELL_ALL") bits.push("ระบบแนะนำให้ขายหมด / ออก");
      else if (a.action && a.action.key === "SELL_FIRST") bits.push("ระบบแนะนำให้ลดน้ำหนัก");
      if (a.score != null && a.score < 35) bits.push(`Signal Score ต่ำ (${a.score})`);
      return `เป็นสินทรัพย์ที่ "ถืออยู่" และเริ่มเสี่ยง: ${bits.join(" · ") || "สัญญาณอ่อนลง"}`;
    }
    return 'ยังไม่มี EMA12/26 ตัดใหม่ภายใน 3 วัน และไม่ใช่หุ้นถือที่เสี่ยง → กลุ่ม "ยังไม่มีสัญญาณสด"';
  }
  // Expandable explanation: section reason + gate detail + score breakdown + RSI.
  function whyHtml(a) {
    const g = a.gates || {};
    const cd = (a.timing && a.timing.componentDetail) || {};
    const rsi = a.tech ? fin(a.tech.rsi14) : null;
    const actExp = (a.action && (a.action.thaiExplanation || a.action.thaiReason)) || "";
    const gateRow = (label, gate) => gate ? `<div><span>${label}</span><b>${esc(gate.thaiLabel || "—")}</b> · ${esc(gate.thaiDetail || "")}</div>` : "";
    const calcRow = (txt) => txt ? `<div class="wl-why-calc">• ${esc(txt)}</div>` : "";
    return `<details class="wl-why">
      <summary>🔍 ทำไมถึงเป็นแบบนี้?</summary>
      <div class="wl-why-body">
        <p class="wl-why-top">${esc(sectionWhy(a))}</p>
        <div class="wl-why-gates">${gateRow("EMA12/26", g.ema)}${gateRow("SMA200", g.sma200)}${gateRow("Volume", g.volume)}</div>
        ${(cd.ema || cd.sma200 || cd.volume) ? `<div class="wl-why-calc-head">วิธีคิด Signal Score${a.score != null ? ` (รวม ${a.score}/100)` : ""}:</div>${calcRow(cd.ema)}${calcRow(cd.sma200)}${calcRow(cd.volume)}` : ""}
        ${rsi != null ? `<div class="wl-why-rsi">RSI(14): ${rsi.toFixed(1)} · ${esc(rsiLabel(rsi))} <em>(ข้อมูลเสริม ไม่ใช่สัญญาณหลัก)</em></div>` : ""}
        ${actExp ? `<div class="wl-why-action"><b>คำแนะนำ:</b> ${esc(actExp)}</div>` : ""}
      </div>
    </details>`;
  }

  function card(a) {
    const acc = a.section === "fresh" ? "wl-acc-fresh" : a.section === "near" ? "wl-acc-near" : a.section === "risk" ? "wl-acc-risk" : "wl-acc-none";
    const action = a.action ? a.action.thaiAction : (a.sc ? (a.sc.thaiFinalAction || a.sc.thaiAction) : "—");
    const reason = (a.action && a.action.thaiReason) || "";
    const hold = a.isHolding ? ' <span class="wl-hold-tag">ถืออยู่</span>' : "";
    const chips = chipsFor(a).map((c) => `<span class="wl-chip wl-chip-${c[1]}">${esc(c[0])}</span>`).join("");
    return `<article class="mc-card wl-card2 ${acc}">
      <div class="wl-card-head">
        <div class="wl-card-id">
          <a class="wl-sym asset-link" href="/asset/${enc(a.providerSymbol)}">${esc(a.displaySymbol)}</a>${hold}
          <span class="wl-name">${esc(a.name)}</span>
        </div>
        <div class="wl-price">${a.currency}${num(a.price)}</div>
      </div>
      <div class="wl-fresh">${esc(freshLabel(a))}</div>
      <div class="wl-gates">
        <div><span>EMA</span><strong>${esc(gateText(a.gates && a.gates.ema))}</strong></div>
        <div><span>SMA200</span><strong>${esc(gateText(a.gates && a.gates.sma200))}</strong></div>
        <div><span>Volume</span><strong>${esc(gateText(a.gates && a.gates.volume))}</strong></div>
        <div><span>Signal Score</span><strong style="color:${scoreColor(a.score)}">${a.score == null ? "—" : a.score}</strong></div>
      </div>
      <div class="wl-action">${esc(action)}</div>
      ${reason ? `<p class="wl-card-reason">${esc(reason)}</p>` : ""}
      ${chips ? `<div class="wl-chips">${chips}</div>` : ""}
      ${whyHtml(a)}
      <div class="wl-card-actions">
        <a href="/asset/${enc(a.providerSymbol)}">ดู Asset 360 →</a>
        <button type="button" data-edit="${esc(a.item.id)}">แก้ไข</button>
        <button type="button" data-remove="${esc(a.item.id)}">ลบ</button>
      </div>
    </article>`;
  }

  // ---------------------------------------------------------------- sections render
  function renderSections() {
    const host = document.getElementById("wlSections");
    if (!host) return;
    const passing = analyzed.filter(passes);
    const groups = { fresh: [], near: [], risk: [], none: [] };
    passing.forEach((a) => { (groups[a.section] || groups.none).push(a); });

    const focusSection = filters.signalType !== "all" ? ({ bullish: "fresh", near: "near", risk: "risk", nofresh: "none" })[filters.signalType] : null;
    const freshFocus = (filters.freshness === "d1" || filters.freshness === "d2" || filters.freshness === "d3") ? "fresh" : filters.freshness === "near" ? "near" : null;
    function sectionVisible(key) {
      if (focusSection) return key === focusSection;
      if (freshFocus) return key === freshFocus;
      return true;
    }
    const openNone = filters.freshness === "all" || filters.signalType === "nofresh";

    let html = "";
    SECTIONS.forEach((meta) => {
      if (!sectionVisible(meta.key)) return;
      const items = sortSection(meta.key, groups[meta.key]);
      if (meta.key === "none") {
        if (!items.length) return;
        html += `<details id="wlsec-none" class="mc-card mc-panel wl-section wl-acc-none"${openNone ? " open" : ""}>
          <summary class="wl-none-summary"><span><strong>${esc(meta.title)}</strong> <span class="mc-sub">${esc(meta.thai)}</span></span><span class="wl-sec-count">${items.length}</span></summary>
          <div class="wl-grid" style="margin-top:14px;">${items.map(card).join("")}</div>
        </details>`;
        return;
      }
      if (!items.length) {
        html += `<section id="wlsec-${meta.key}" class="mc-card mc-panel wl-section ${meta.acc}">
          <div class="mc-panel-head"><div><h2>${esc(meta.title)}</h2><span class="mc-sub">${esc(meta.thai)}</span></div></div>
          ${meta.key === "fresh" ? freshEmpty() : `<div class="mc-empty"><strong>—</strong>ไม่มีรายการในส่วนนี้ตอนนี้</div>`}
        </section>`;
        return;
      }
      html += `<section id="wlsec-${meta.key}" class="mc-card mc-panel wl-section ${meta.acc}">
        <div class="mc-panel-head"><div><h2>${esc(meta.title)}</h2><span class="mc-sub">${esc(meta.thai)}</span></div><span class="wl-sec-count">${items.length}</span></div>
        <div class="wl-grid">${items.map(card).join("")}</div>
      </section>`;
    });
    if (!html) html = `<section class="mc-card mc-panel"><div class="mc-empty"><strong>ไม่มีรายการตรงกับตัวกรอง</strong>ลองเปลี่ยนตัวกรอง หรือเลือก "รายการทั้งหมด"</div></section>`;
    host.innerHTML = html;
  }

  function freshEmpty() {
    return `<div class="mc-empty"><strong>No fresh EMA cross in your Watchlist today.</strong>วันนี้ยังไม่มีรายการ Watchlist ที่ EMA12 ตัดขึ้น EMA26 ภายใน 3 วัน
      <div style="margin-top:12px;"><button class="mc-btn" type="button" id="wlViewAll">ดูรายการทั้งหมด</button></div></div>`;
  }

  // ---------------------------------------------------------------- chrome
  function metric(label, thai, value, cls, jump) {
    const j = jump ? ` wl-jump" data-jump="${jump}` : "";
    return `<div class="mc-card mc-metric mc-glow${j}"><div class="mc-label"><span>${esc(label)}</span></div>
      <div class="mc-value">${esc(String(value))}</div><div class="mc-delta ${cls || ""}">${esc(thai)}</div></div>`;
  }
  function hero(c) {
    return `<section class="mc-page-hero mc-fade">
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start;">
        <div style="position:relative;z-index:1;">
          <p class="mc-eyebrow">Watchlist</p>
          <h1>Watchlist · รายการติดตาม</h1>
          <p class="mc-hero-sub">ติดตามเฉพาะสินทรัพย์ที่เลือกไว้ และเน้นสัญญาณสดที่เพิ่งเกิดภายใน 1–3 วันทำการ</p>
        </div>
        <div class="a360-hero-cards" style="position:relative;z-index:1;min-width:min(620px,100%);display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
          ${metric("Fresh Cross ≤ 3 Days", "ตัดขึ้นไม่เกิน 3 วัน", c.fresh, c.fresh ? "mc-up" : "", "fresh")}
          ${metric("Near Cross", "ใกล้ตัดขึ้น", c.near, "", "near")}
          ${metric("Holding Risk", "ถืออยู่และเริ่มเสี่ยง", c.risk, c.risk ? "mc-down" : "", "risk")}
          ${metric("No Fresh Signal", "ยังไม่มีสัญญาณสด", c.none, "", "none")}
        </div>
      </div>
    </section>`;
  }
  function summary(c) {
    const cells = [
      ["Fresh Cross ≤ 3 Days", "ตัดขึ้นไม่เกิน 3 วัน", c.fresh, "fresh"],
      ["Crossed Today / 1 Day", "ตัดขึ้นวันนี้", c.today, "fresh"],
      ["Near Cross", "ใกล้ตัดขึ้น", c.near, "near"],
      ["Volume Confirmed", "วอลุ่มยืนยัน", c.vol, "fresh"],
      ["Holding Risk", "ถืออยู่และเริ่มเสี่ยง", c.risk, "risk"],
      ["No Fresh Signal", "ยังไม่มีสัญญาณสด", c.none, "none"]
    ];
    return `<section class="mc-card mc-panel mc-fade"><div class="mc-panel-head"><div><h2>Watchlist Summary</h2><span class="mc-sub">นับเฉพาะรายการที่ติดตามอยู่ · กดเพื่อไปยังกลุ่ม</span></div></div>
      <div class="a360-ind-grid" style="grid-template-columns:repeat(6,1fr);">${cells.map(([l, t, v, j]) => `<div class="a360-ind wl-jump" data-jump="${j}"><h4>${esc(l)}</h4><div class="a360-big">${v}</div><div class="a360-sub">${esc(t)}</div></div>`).join("")}</div></section>`;
  }

  function filterBar() {
    const fresh = [["fresh3", "เฉพาะสัญญาณสด ≤ 3 วัน"], ["d1", "วันนี้ / 1 วัน"], ["d2", "2 วัน"], ["d3", "3 วัน"], ["near", "ใกล้ตัดขึ้น"], ["all", "รายการทั้งหมด"]];
    const market = [["all", "ทุกตลาด"], ["us", "US"], ["thai", "ไทย"], ["mai", "mai"], ["crypto", "Crypto"], ["fund", "RMF / Fund"]];
    const sigType = [["all", "ทุกสัญญาณ"], ["bullish", "Bullish Cross"], ["near", "Near Cross"], ["risk", "Holding Risk"], ["nofresh", "No Fresh Signal"]];
    const confirm = [["all", "ทั้งหมด"], ["volconfirm", "Volume Confirmed"], ["abovesma", "Above SMA200"], ["allpass", "EMA+SMA200+Volume ผ่านครบ"]];
    const opt = (list, cur) => list.map(([v, t]) => `<option value="${v}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("");
    return `<section class="mc-card mc-panel mc-fade wl-filterbar">
      <label class="wl-filter"><span>สัญญาณสด</span><select data-filter="freshness">${opt(fresh, filters.freshness)}</select></label>
      <label class="wl-filter"><span>ตลาด</span><select data-filter="market">${opt(market, filters.market)}</select></label>
      <label class="wl-filter"><span>ประเภทสัญญาณ</span><select data-filter="signalType">${opt(sigType, filters.signalType)}</select></label>
      <label class="wl-filter"><span>การยืนยัน</span><select data-filter="confirm">${opt(confirm, filters.confirm)}</select></label>
      <label class="wl-filter wl-filter-search"><span>ค้นหา</span><input type="text" data-filter="search" placeholder="symbol หรือชื่อ..." value="${esc(filters.search)}" /></label>
    </section>`;
  }

  function addBar() {
    return `<section class="mc-card mc-panel mc-fade wl-addbar">
      <div><strong>เพิ่ม / ซิงก์รายการติดตาม</strong><div class="mc-sub">AI Boom Universe จะถูก sync เข้ามาอัตโนมัติเมื่อกด Load Latest Data</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="mc-btn" id="wlSyncBtn" type="button">🔄 Sync AI Boom Universe</button>
        <button class="mc-btn mc-btn-primary" id="wlAddBtn" type="button">+ เพิ่มเอง</button>
      </div>
    </section>`;
  }

  function archivedSection(archived) {
    if (!archived.length) return "";
    return `<details class="mc-card mc-panel wl-section wl-acc-none">
      <summary class="wl-none-summary"><span><strong>Archived / Inactive</strong> <span class="mc-sub">รายการที่ปิดติดตาม</span></span><span class="wl-sec-count">${archived.length}</span></summary>
      <table class="wl-table" style="margin-top:12px;"><thead><tr><th>Symbol</th><th>หมวด</th><th></th></tr></thead>
      <tbody>${archived.map((it) => `<tr><td>${esc(it.displaySymbol)}</td><td>${esc((WL.CATEGORIES[it.watchCategory] || {}).thai || "")}</td><td><span class="wl-act" data-activate="${esc(it.id)}">เปิดใหม่</span> · <span class="wl-act" data-remove="${esc(it.id)}">ลบถาวร</span></td></tr>`).join("")}</tbody></table>
    </details>`;
  }

  // ---------------------------------------------------------------- empty states
  function emptyNoSnapshot() {
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:40px 22px;">
      <div style="font-size:42px;line-height:1;">🛰️</div>
      <h2 style="margin:12px 0 6px;">กรุณาโหลดข้อมูลล่าสุดก่อน</h2>
      <p style="color:var(--mc-muted);max-width:560px;margin:0 auto 18px;">Watchlist ใช้ข้อมูลจาก Data Snapshot เท่านั้น — กดเพื่อโหลดราคาและสัญญาณล่าสุด</p>
      <button class="mc-btn mc-btn-primary" id="wlLoadBtn" type="button" style="padding:10px 22px;">Load Latest Data</button>
    </section>`;
  }
  function emptyNoItems(snapshot) {
    const sugg = suggestions(snapshot);
    lastSuggestions = sugg;
    const suggHtml = sugg.length
      ? `<div style="margin-top:24px;text-align:left;"><h3 style="font-size:14px;margin:0 0 4px;">แนะนำให้ติดตาม <span style="color:var(--mc-muted);font-weight:600;">(จาก Signal Score ล่าสุด)</span></h3>
           <div class="wl-sugg-grid">${sugg.map((s) => `<button type="button" class="wl-sugg" data-qadd="${esc(s.canonicalSymbol)}">
             <span class="wl-sugg-sym">${esc(s.displaySymbol)}</span><span class="wl-sugg-timing" style="color:${scoreColor(s.timing)};">${s.timing}</span>
             <span class="wl-sugg-act">${esc(s.thaiAction || "")}</span><span class="wl-sugg-add">+ เพิ่ม</span></button>`).join("")}</div></div>`
      : "";
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:34px 22px;">
      <div style="font-size:42px;line-height:1;">👁️</div>
      <h2 style="margin:12px 0 6px;">Your Watchlist is empty</h2>
      <p style="color:var(--mc-muted);max-width:580px;margin:0 auto 18px;">เพิ่มสินทรัพย์ที่อยากจับตา เพื่อให้ระบบช่วยเตือนเมื่อมีสัญญาณสด — หรือ Sync จาก AI Boom Universe</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="mc-btn mc-btn-primary" id="wlAddBtn2" type="button" style="padding:10px 20px;">+ Add Asset to Watchlist</button>
        <button class="mc-btn" id="wlSyncBtn2" type="button" style="padding:10px 20px;">🔄 Sync จาก AI Boom Universe</button>
      </div>${suggHtml}</section>`;
  }
  function inferCur(k) { k = WL.canonicalize(k || ""); return (k.endsWith(".BK") || k.startsWith("^SET") || /RMF|SSF/i.test(k)) ? "THB" : "USD"; }
  function suggestions(snapshot) {
    if (!snapshot || !snapshot.scoring || !snapshot.scoring.bySymbol) return [];
    const have = {}; WL.read().forEach((i) => { have[WL.canonicalize(i.canonicalSymbol)] = 1; });
    const meta = {}; (snapshot.assets || []).forEach((a) => { const k = WL.canonicalize(a.canonicalSymbol || a.ticker || ""); if (k) meta[k] = a; });
    return Object.keys(snapshot.scoring.bySymbol).map((k) => {
      const sc = snapshot.scoring.bySymbol[k], m = meta[k] || {};
      return { canonicalSymbol: k, displaySymbol: m.display_symbol || m.ticker || k, assetName: m.name || m.assetName || "", assetType: m.asset_type || m.assetType || "", providerSymbol: m.providerSymbol || k, currency: inferCur(k), timing: fin(sc.signalScore != null ? sc.signalScore : sc.timingScore), thaiAction: sc.thaiFinalAction || sc.thaiAction || "" };
    }).filter((x) => !have[x.canonicalSymbol] && x.timing != null).sort((a, b) => (b.timing || 0) - (a.timing || 0)).slice(0, 8);
  }

  // ---------------------------------------------------------------- render
  function render() {
    if (!WL) { root.innerHTML = `<section class="mc-card mc-panel"><div class="mc-empty"><strong>โหลด engine ไม่สำเร็จ</strong></div></section>`; return; }
    const snapshot = getSnapshot();
    const all = WL.read();
    const active = all.filter((i) => i.isActive !== false);
    const archived = all.filter((i) => i.isActive === false);

    if (!snapshot) {
      root.innerHTML = hero({ fresh: "—", near: "—", risk: "—", none: "—" }) + emptyNoSnapshot();
      wire();
      return;
    }
    if (!active.length) {
      root.innerHTML = hero({ fresh: 0, near: 0, risk: 0, none: 0 }) + emptyNoItems(snapshot) + archivedSection(archived);
      wire();
      return;
    }

    const holds = holdingsMap(snapshot);
    const riskLevel = snapshot.marketRisk && snapshot.marketRisk.risk && snapshot.marketRisk.risk.level ? (snapshot.marketRisk.risk.level.label || snapshot.marketRisk.risk.level.thai) : null;
    analyzed = active.map((item) => analyze(item, snapshot, holds, riskLevel));

    const counts = {
      fresh: analyzed.filter((a) => a.section === "fresh").length,
      near: analyzed.filter((a) => a.section === "near").length,
      risk: analyzed.filter((a) => a.section === "risk").length,
      none: analyzed.filter((a) => a.section === "none").length,
      today: analyzed.filter((a) => a.section === "fresh" && a.daysBull != null && a.daysBull <= 1).length,
      vol: analyzed.filter((a) => volConfirmed(a)).length
    };

    root.innerHTML = hero(counts) + addBar() + summary(counts) + filterBar() + `<div id="wlSections"></div>` + archivedSection(archived);
    renderSections();
    wire();
  }

  // ---------------------------------------------------------------- sync / toast
  function showToast(msg) {
    const prev = document.getElementById("wl-toast"); if (prev) prev.remove();
    const t = document.createElement("div"); t.id = "wl-toast"; t.textContent = msg;
    document.body.appendChild(t); window.setTimeout(() => { if (t.parentNode) t.remove(); }, 4500);
  }
  async function syncNow(btn) {
    if (!window.AIBoomWatchlistSync || typeof window.AIBoomWatchlistSync.sync !== "function") { showToast("ระบบ sync ยังไม่พร้อม"); return; }
    const label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "กำลัง sync..."; }
    try {
      const res = await window.AIBoomWatchlistSync.sync({ archiveMissing: true });
      if (!res) showToast("ไม่พบข้อมูล AI Boom Universe");
      else if (res.complete === false && !res.added && !res.archived) showToast("Sync บางส่วน — ลองกด Load Latest Data ก่อน");
      else showToast(`Sync สำเร็จ · เพิ่ม ${res.added} · อัปเดต ${res.updated} · เก็บเข้าคลัง ${res.archived}`);
    } catch (e) { showToast("Sync ไม่สำเร็จ"); }
    finally { if (btn) { btn.disabled = false; btn.textContent = label; } }
  }
  async function loadLatest(btn) {
    const api = window.PortfolioDataSnapshot;
    if (!api || typeof api.loadLatestData !== "function") return;
    if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }
    try { await api.loadLatestData(); } catch (e) { showToast("โหลดข้อมูลไม่สำเร็จ"); }
    finally { if (btn) { btn.disabled = false; btn.textContent = "Load Latest Data"; } render(); }
  }

  // ---------------------------------------------------------------- wire
  function wire() {
    const byId = (id) => document.getElementById(id);
    [["wlAddBtn"], ["wlAddBtn2"]].forEach(([id]) => { const b = byId(id); if (b) b.addEventListener("click", () => WL.openModal({})); });
    [["wlSyncBtn"], ["wlSyncBtn2"]].forEach(([id]) => { const b = byId(id); if (b) b.addEventListener("click", () => syncNow(b)); });
    const loadBtn = byId("wlLoadBtn"); if (loadBtn) loadBtn.addEventListener("click", () => loadLatest(loadBtn));

    // filter controls (recreated on every full render -> safe to (re)bind here)
    root.querySelectorAll("[data-filter]").forEach((el) => {
      const key = el.getAttribute("data-filter");
      if (el.tagName === "SELECT") el.addEventListener("change", () => { filters[key] = el.value; renderSections(); });
      else el.addEventListener("input", () => { filters[key] = el.value; renderSections(); });
    });

    // delegated actions — bind ONCE (root is a persistent element)
    if (!rootWired) {
      rootWired = true;
      root.addEventListener("click", (e) => {
        const viewAll = e.target.closest("#wlViewAll");
        const jump = e.target.closest("[data-jump]");
        const qadd = e.target.closest("[data-qadd]");
        const edit = e.target.closest("[data-edit]");
        const remove = e.target.closest("[data-remove]");
        const activate = e.target.closest("[data-activate]");
        if (jump) {
          // Hero / Summary stat card -> jump to that section (where the reasons live).
          const key = jump.getAttribute("data-jump");
          const target = document.getElementById("wlsec-" + key);
          if (target) {
            if (target.tagName === "DETAILS") target.open = true;
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        else if (viewAll) {
          filters.freshness = "all"; filters.signalType = "all";
          const s = root.querySelector('[data-filter="freshness"]'); if (s) s.value = "all";
          const t = root.querySelector('[data-filter="signalType"]'); if (t) t.value = "all";
          renderSections();
        }
        else if (qadd) { const s = lastSuggestions.find((x) => x.canonicalSymbol === qadd.dataset.qadd); if (s) WL.openModal(s); }
        else if (edit) { const it = WL.read().find((x) => x.id === edit.dataset.edit); if (it) WL.openModal(it); }
        else if (remove) { if (window.confirm("ลบรายการนี้ออกจาก Watchlist?")) WL.remove(remove.dataset.remove); }
        else if (activate) { WL.activate(activate.dataset.activate); }
        else {
          // Click anywhere on a card (except links / edit-remove buttons / the why
          // box itself) -> open the "why / สาเหตุ" details and jump to it.
          const cardEl = e.target.closest(".wl-card2");
          if (cardEl && !e.target.closest("a, button, .wl-why")) {
            const det = cardEl.querySelector("details.wl-why");
            if (det) {
              det.open = !det.open;
              if (det.open) { try { det.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_e) {} }
            }
          }
        }
      });
    }
  }

  window.addEventListener("watchlist-updated", render);
  window.addEventListener("portfolio-data-snapshot", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
