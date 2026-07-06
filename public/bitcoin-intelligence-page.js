(function () {
  "use strict";

  // ============================================================
  // Bitcoin Intelligence — Phase 2 UI (read-only research terminal).
  // Renders snapshot.bitcoinIntelligence (built by the engine ONLY on Load Latest
  // Data). No indicator recomputation here — horizon selection and context filters
  // just re-aggregate the pre-computed per-occurrence returns for presentation.
  // Exposes window.BitcoinIntelligenceUI = { html(snap), wire(bodyEl) }.
  // ============================================================

  const HORIZONS = [7, 30, 60, 90, 180, 365];
  const S = { horizon: 90, timelineH: 90, filters: {}, sel: null, overlayWin: 90, libHorizon: 90, libSearch: "", replay: null, research: false }; // ui state
  let biLoading = false, biStatus = "", biError = null, biDone = 0, biListenersWired = false;

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function fin(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function snapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function BI(snap) { return (snap || snapshot()) && (snap || snapshot()).bitcoinIntelligence; }
  function mean(a) { const f = a.filter(Number.isFinite); return f.length ? f.reduce((s, v) => s + v, 0) / f.length : null; }
  function median(a) { const f = a.filter(Number.isFinite).slice().sort((x, y) => x - y); if (!f.length) return null; const m = Math.floor(f.length / 2); return f.length % 2 ? f[m] : (f[m - 1] + f[m]) / 2; }
  function stdev(a) { const f = a.filter(Number.isFinite); if (f.length < 2) return 0; const m = mean(f); return Math.sqrt(f.reduce((s, v) => s + (v - m) * (v - m), 0) / f.length); }
  function r1(v) { const n = fin(v); return n == null ? "—" : (Math.round(n * 10) / 10); }
  function pctStr(v, signed) { const n = fin(v); if (n == null) return "—"; return (signed && n > 0 ? "+" : "") + n.toFixed(1) + "%"; }
  function pctCls(v) { const n = fin(v); return n == null ? "" : n > 0 ? "bi-pos" : n < 0 ? "bi-neg" : ""; }

  // ---- client-side filtering + aggregation of pre-computed occurrences ----
  function matchFilter(o) {
    const f = S.filters;
    if (f.risk && o.ctx.risk !== f.risk) return false;
    if (f.market && !(o.ctx.market === f.market || (f.market === "bull" && o.ctx.market === "recovery") || (f.market === "bear" && o.ctx.market === "decline"))) return false;
    if (f.sma && o.ctx.sma !== f.sma) return false;
    if (f.weekly && o.ctx.weekly !== f.weekly) return false;
    if (f.halving === "pre" && String(o.ctx.halving).indexOf("pre") !== 0) return false;
    if (f.halving === "post" && String(o.ctx.halving).indexOf("post") !== 0) return false;
    return true;
  }
  function filteredOccurrences(occ) { return (S.filters && Object.keys(S.filters).length) ? occ.filter(matchFilter) : occ; }
  function aggAt(occ, h) {
    const rets = [], dds = [];
    occ.forEach((o) => { const r = o.returns[h]; if (Number.isFinite(r)) { rets.push(r); if (Number.isFinite(o.maxDD90) && h === 90) dds.push(o.maxDD90); } });
    if (!rets.length) return { samples: 0 };
    const pos = rets.filter((r) => r > 0).length;
    return { samples: rets.length, positivePct: pos / rets.length * 100, negativePct: (rets.length - pos) / rets.length * 100, avg: mean(rets), median: median(rets), best: Math.max.apply(null, rets), worst: Math.min.apply(null, rets), stdev: stdev(rets), rets };
  }
  // avg/max drawdown per horizon needs per-occurrence dd; occurrences only carry maxDD90.
  // For other horizons we surface the engine's byHorizon aggregate (unfiltered) drawdown.

  // ============================================================ SECTIONS
  function section(id, title, sub, bodyHtml, extraHead) {
    return `<section class="mc-card mc-panel mc-fade bi-sec" id="${id}">
      <div class="mc-panel-head"><div><h2>${title}</h2>${sub ? `<span class="mc-sub">${esc(sub)}</span>` : ""}</div>${extraHead || ""}</div>
      ${bodyHtml}</section>`;
  }

  // 1 — Current Market Intelligence (hero)
  function heroSection(bi) {
    const ps = bi.patternScore, conf = bi.confidence, mc = bi.marketContext, cp = bi.currentPattern;
    const scoreColor = ps.total >= 66 ? "var(--mc-emerald)" : ps.total >= 40 ? "var(--mc-amber)" : "var(--mc-red)";
    const confCls = conf.level === "Very High" ? "bi-vhigh" : conf.level === "High" ? "bi-high" : conf.level === "Medium" ? "bi-med" : "bi-low";
    const badges = (cp.patterns || []).map((p) => `<span class="bi-badge bi-badge-${p.bullish ? "bull" : p.bearish ? "bear" : "muted"}">${esc(p.label)}</span>`).join("")
      + (Number.isFinite(cp.rsi) ? `<span class="bi-badge bi-badge-muted">RSI ${r1(cp.rsi)}</span>` : "")
      + (Number.isFinite(cp.volumeRatio) ? `<span class="bi-badge bi-badge-${cp.volumeRatio >= 1 ? "bull" : "muted"}">Volume ${cp.volumeRatio.toFixed(2)}x</span>` : "");
    return `<section class="mcx-hero mc-fade bi-hero">
      <div class="bi-hero-score">
        <div class="bi-hero-num" style="color:${scoreColor}">${ps.total}</div>
        <div class="bi-hero-den">Pattern Score / 100</div>
      </div>
      <div class="bi-hero-body">
        <p class="mc-eyebrow">Bitcoin Intelligence · Historical Decision Engine</p>
        <h1 class="bi-hero-title">${esc(bi.decision.setup.label)}</h1>
        <div class="bi-hero-meta">
          <div class="mcx-meta-cell"><small>Confidence</small><strong class="${confCls}">${esc(conf.level)}</strong></div>
          <div class="mcx-meta-cell"><small>Market</small><strong>${esc(mc.marketType)} · ${mc.riskProxy === "risk-on" ? "Risk-On" : "Risk-Off"}</strong></div>
          <div class="mcx-meta-cell"><small>Cycle</small><strong>${esc(mc.halving.phase)}</strong></div>
          <div class="mcx-meta-cell"><small>As of</small><strong>${esc(cp.date)}</strong></div>
        </div>
        <div class="bi-badges">${badges}</div>
      </div>
    </section>`;
  }

  // 11 — Market Context Filter (placed high so it visibly drives the stats below)
  function filterSection(bi) {
    const chips = [
      { dim: "risk", val: "risk-on", label: "Risk On" }, { dim: "risk", val: "risk-off", label: "Risk Off" },
      { dim: "market", val: "bull", label: "Bull" }, { dim: "market", val: "bear", label: "Bear" },
      { dim: "sma", val: "above", label: "Above SMA200" }, { dim: "sma", val: "below", label: "Below SMA200" },
      { dim: "halving", val: "pre", label: "Pre-Halving" }, { dim: "halving", val: "post", label: "Post-Halving" },
      { dim: "weekly", val: "wbull", label: "Weekly Bull" }, { dim: "weekly", val: "wbear", label: "Weekly Bear" }
    ];
    const active = Object.keys(S.filters).length;
    const html = chips.map((c) => `<button type="button" class="bi-chip${S.filters[c.dim] === c.val ? " is-active" : ""}" data-filter="${c.dim}" data-val="${c.val}">${esc(c.label)}</button>`).join("");
    const total = bi.decision.setup.occurrences.length;
    const shown = filteredOccurrences(bi.decision.setup.occurrences).length;
    return section("bi-filter", "🎚️ Market Context Filter", `กรองกรณีในอดีต — สถิติทุกส่วนจะอัปเดตตามตัวกรอง (${shown}/${total} กรณี)`,
      `<div class="bi-chips">${html}</div>${active ? `<button type="button" class="bi-chip bi-chip-clear" data-filter="clear" data-val="">ล้างตัวกรอง</button>` : ""}`);
  }

  // 2 — Historical Probability (the key card)
  function probabilitySection(bi) {
    const occ = filteredOccurrences(bi.decision.setup.occurrences);
    const a = aggAt(occ, S.horizon);
    const eng = bi.decision.setup.byHorizon[S.horizon] || {};
    const hbtns = HORIZONS.map((h) => `<button type="button" class="bi-hbtn${h === S.horizon ? " is-active" : ""}" data-horizon="${h}">${h}D</button>`).join("");
    if (!a.samples) return section("bi-prob", "📊 Historical Probability", "โครงสร้างวันนี้เคยเกิดในอดีตแล้วเป็นอย่างไร", `<div class="bi-hsel" id="biHsel">${hbtns}</div><div class="mc-empty"><strong>ไม่มีกรณีตรงตัวกรอง</strong>ลองล้างตัวกรอง</div>`);
    const cell = (label, val, cls) => `<div class="bi-stat"><small>${esc(label)}</small><strong class="${cls || ""}">${val}</strong></div>`;
    // drawdown: filtered-set exact for 90D; engine aggregate for other horizons
    const avgDD = (S.horizon === 90) ? mean(occ.map((o) => o.maxDD90)) : (eng.avgDrawdown);
    const maxDD = (S.horizon === 90) ? Math.min.apply(null, occ.map((o) => o.maxDD90).filter(Number.isFinite).concat([0])) : (eng.maxDrawdown);
    return section("bi-prob", "📊 Historical Probability", "โครงสร้างวันนี้เคยเกิดในอดีตแล้วเป็นอย่างไร (เลือกช่วงเวลาถือ)",
      `<div class="bi-hsel" id="biHsel">${hbtns}</div>
      <div class="bi-statgrid">
        ${cell("Occurrences", a.samples)}
        ${cell("Positive", a.positivePct.toFixed(0) + "%", "bi-pos")}
        ${cell("Negative", a.negativePct.toFixed(0) + "%", "bi-neg")}
        ${cell("Average", pctStr(a.avg, true), pctCls(a.avg))}
        ${cell("Median", pctStr(a.median, true), pctCls(a.median))}
        ${cell("Best", pctStr(a.best, true), "bi-pos")}
        ${cell("Worst", pctStr(a.worst, true), "bi-neg")}
        ${cell("Avg Drawdown", pctStr(avgDD), "bi-neg")}
        ${cell("Max Drawdown", pctStr(maxDD), "bi-neg")}
      </div>`);
  }

  // 4 — Historical Ranking
  function rankingSection(bi) {
    const rk = bi.decision.ranking;
    return section("bi-rank", "🏅 Historical Ranking", "อันดับความแข็งแรงของโครงสร้างวันนี้เทียบทุกวันในอดีต",
      `<div class="bi-rank-row">
        <div class="bi-rank-big">#${rk.rank}<small> / ${rk.total.toLocaleString()}</small></div>
        <div class="bi-rank-meta">
          <div><small>Percentile</small><strong>${rk.percentile}</strong></div>
          <div><small>Top</small><strong>${rk.topPct}%</strong></div>
          <div><small>Pattern Score</small><strong>${rk.value}</strong></div>
        </div>
      </div>
      <p class="mcx-foot-note">Pattern Score ${rk.value} อยู่อันดับ ${rk.rank} จาก ${rk.total.toLocaleString()} วัน (เปอร์เซ็นไทล์ที่ ${rk.percentile})</p>`);
  }

  // 5 — Probability Matrix
  function matrixSection(bi) {
    const occ = filteredOccurrences(bi.decision.setup.occurrences);
    const rows = HORIZONS.map((h) => {
      const a = aggAt(occ, h); const eng = bi.decision.setup.byHorizon[h] || {};
      if (!a.samples) return `<tr><td>${h}D</td><td colspan="6" class="bi-muted">—</td></tr>`;
      const dd = (h === 90) ? mean(occ.map((o) => o.maxDD90)) : eng.avgDrawdown;
      return `<tr><td><strong>${h}D</strong></td>
        <td class="bi-pos">${a.positivePct.toFixed(0)}%</td>
        <td class="${pctCls(a.avg)}">${pctStr(a.avg, true)}</td>
        <td class="${pctCls(a.median)}">${pctStr(a.median, true)}</td>
        <td class="bi-neg">${pctStr(a.worst, true)}</td>
        <td class="bi-pos">${pctStr(a.best, true)}</td>
        <td class="bi-neg">${pctStr(dd)}</td></tr>`;
    }).join("");
    return section("bi-matrix", "🔢 Probability Matrix", "สรุปผลตอบแทนทุกช่วงเวลาถือ",
      `<table class="bi-table bi-matrix-t"><thead><tr><th>Horizon</th><th>Positive</th><th>Avg</th><th>Median</th><th>Worst</th><th>Best</th><th>Drawdown</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  // 6 — Return Distribution (histogram)
  function distributionSection(bi) {
    const occ = filteredOccurrences(bi.decision.setup.occurrences);
    const a = aggAt(occ, S.horizon);
    if (!a.samples) return section("bi-dist", "📈 Return Distribution", `${S.horizon}D`, `<div class="mc-empty"><strong>ไม่มีข้อมูล</strong></div>`);
    const rets = a.rets, lo = Math.min.apply(null, rets), hi = Math.max.apply(null, rets);
    const nB = 21, span = (hi - lo) || 1, bins = new Array(nB).fill(0);
    rets.forEach((r) => { let b = Math.floor((r - lo) / span * nB); if (b >= nB) b = nB - 1; if (b < 0) b = 0; bins[b]++; });
    const maxB = Math.max.apply(null, bins) || 1;
    const zeroIdx = Math.floor((0 - lo) / span * nB);
    const meanIdx = Math.floor((a.avg - lo) / span * nB);
    const bars = bins.map((c, i) => `<span class="bi-bin${i === meanIdx ? " bi-bin-mean" : ""}" style="height:${(c / maxB * 100).toFixed(1)}%;background:${(lo + (i + 0.5) / nB * span) >= 0 ? "var(--mc-emerald)" : "var(--mc-red)"}" title="${(lo + i / nB * span).toFixed(1)}% .. ${(lo + (i + 1) / nB * span).toFixed(1)}% · ${c} cases"></span>`).join("");
    return section("bi-dist", "📈 Return Distribution", `การกระจายผลตอบแทน ${S.horizon} วัน (${a.samples} กรณี)`,
      `<div class="bi-hist"><div class="bi-hist-bars">${bars}</div>${zeroIdx >= 0 && zeroIdx < nB ? `<span class="bi-hist-zero" style="left:${(zeroIdx / nB * 100).toFixed(1)}%"></span>` : ""}</div>
      <div class="bi-dist-meta"><span>Mean <b class="${pctCls(a.avg)}">${pctStr(a.avg, true)}</b></span><span>Median <b class="${pctCls(a.median)}">${pctStr(a.median, true)}</b></span><span>Std Dev <b>${r1(a.stdev)}%</b></span><span>Range <b>${pctStr(a.worst, true)} .. ${pctStr(a.best, true)}</b></span></div>`);
  }

  // 7 — Historical Timeline
  function timelineSection(bi) {
    const occ = filteredOccurrences(bi.decision.setup.occurrences);
    const first = bi.meta.firstDate, last = bi.meta.lastDate;
    const t0 = Date.parse(first), t1 = Date.parse(last), span = (t1 - t0) || 1;
    const dots = occ.map((o) => {
      const r = o.returns[S.horizon]; if (r == null) return "";
      const x = (Date.parse(o.date) - t0) / span * 100;
      const col = r > 0 ? "var(--mc-emerald)" : "var(--mc-red)";
      const sel = S.sel === o.date ? " bi-dot-sel" : "";
      return `<span class="bi-dot${sel}" data-date="${esc(o.date)}" style="left:${x.toFixed(2)}%;background:${col}" title="${esc(o.date)} · ${S.horizon}D ${pctStr(r, true)} · ${esc(o.ctx.market)}"></span>`;
    }).join("");
    const selO = S.sel ? occ.find((o) => o.date === S.sel) : null;
    const detail = selO ? `<div class="bi-tl-detail">${esc(selO.date)} · ${esc(selO.ctx.market)} · ${esc(selO.ctx.risk)} · ${esc(selO.ctx.halving)} — ${HORIZONS.map((h) => `${h}D <b class="${pctCls(selO.returns[h])}">${pctStr(selO.returns[h], true)}</b>`).join(" · ")}</div>` : "";
    const years = [];
    for (let y = new Date(t0).getUTCFullYear(); y <= new Date(t1).getUTCFullYear(); y += 2) { years.push(`<span style="left:${((Date.parse(y + "-01-01") - t0) / span * 100).toFixed(1)}%">${y}</span>`); }
    return section("bi-timeline", "🕰️ Historical Timeline", `ทุกกรณีในอดีต 2014 → ปัจจุบัน (สีเขียว = ${S.horizon}D บวก · แดง = ลบ) — คลิกเพื่อดูรายละเอียด`,
      `<div class="bi-timeline"><div class="bi-tl-track" id="biTlTrack">${dots}</div><div class="bi-tl-axis">${years.join("")}</div></div>${detail}`);
  }

  // 3 + 8 — Pattern Similarity table (with expandable cases)
  function similaritySection(bi) {
    const top = (bi.similarCases || []).slice(0, 10);
    if (!top.length) return section("bi-sim", "🧭 Pattern Similarity", "", `<div class="mc-empty"><strong>ไม่มีข้อมูล</strong></div>`);
    const rows = top.map((s, idx) => {
      const rr = s.returns || {};
      const detail = `<tr class="bi-sim-detail" data-idx="${idx}" hidden><td colspan="9">
        <div class="bi-sim-detailbody">Market: <b>${esc(s.marketPhase)}</b> · Halving: <b>${esc(s.context ? s.context.halvingPhase : "-")}</b> · Pattern Score: <b>${s.patternScore}</b> · Max Drawdown (90D): <b class="bi-neg">${pctStr(s.maxDrawdown90)}</b>
        <div class="bi-sim-cmp">Current close ${bi.currentPattern.close ? "$" + Math.round(bi.currentPattern.close).toLocaleString() : "-"} vs historical $${Math.round(s.close).toLocaleString()}</div></div></td></tr>`;
      return `<tr class="bi-sim-row" data-idx="${idx}">
        <td><span class="bi-simbar" style="width:${s.similarity}%"></span><b>${s.similarity}</b></td>
        <td>${esc(s.date)}</td><td>${esc(s.marketPhase)}</td><td>${s.patternScore}</td>
        <td class="${pctCls(rr[7])}">${pctStr(rr[7], true)}</td>
        <td class="${pctCls(rr[30])}">${pctStr(rr[30], true)}</td>
        <td class="${pctCls(rr[90])}">${pctStr(rr[90], true)}</td>
        <td class="${pctCls(rr[180])}">${pctStr(rr[180], true)}</td>
        <td class="${pctCls(rr[365])}">${pctStr(rr[365], true)}</td>
      </tr>${detail}`;
    }).join("");
    return section("bi-sim", "🧭 Pattern Similarity — Top 10 Similar Cases", "วันในอดีตที่โครงสร้างเหมือนวันนี้ที่สุด (คลิกแถวเพื่อดูรายละเอียด)",
      `<table class="bi-table bi-sim-t"><thead><tr><th>Similarity</th><th>Date</th><th>Phase</th><th>Score</th><th>7D</th><th>30D</th><th>90D</th><th>180D</th><th>365D</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  // 10 — Pattern Evolution
  function evolutionSection(bi) {
    const ev = bi.decision.evolution;
    if (!ev || !ev.available || !ev.top.length) return section("bi-evo", "🧬 Pattern Evolution", "", `<div class="mc-empty"><strong>ยังไม่พอข้อมูล</strong></div>`);
    const rows = ev.top.map((e) => `<div class="bi-evo-row">
      <span class="bi-evo-label">${esc(e.label)}</span>
      <div class="bi-evo-bar"><i style="width:${e.confidence}%"></i></div>
      <span class="bi-evo-pct">${e.confidence}%</span></div>`).join("");
    return section("bi-evo", "🧬 Pattern Evolution", "โครงสร้างปัจจุบันกำลังคล้ายวัฏจักรใดในอดีต (ไม่ใช่การพยากรณ์)",
      `<div class="bi-evo">${rows}</div><p class="mcx-foot-note">${esc(ev.note)}</p>`);
  }

  // 12 — Multi-Timeframe
  function mtfSection(bi) {
    const mtf = bi.multiTimeframe, wk = bi.decision.weeklyStats;
    const dailyProb = (bi.decision.setup.byHorizon[90] || {}).positivePct;
    const col = (title, sc, bias, prob, samples) => `<div class="bi-mtf-col">
      <div class="bi-mtf-title">${esc(title)}</div>
      <div class="bi-mtf-score">${sc == null ? "—" : sc}<small>score</small></div>
      <div class="bi-mtf-line">Bias <b class="bi-bias-${bias}">${esc(bias)}</b></div>
      <div class="bi-mtf-line">Hist. Positive <b>${prob == null ? "—" : prob + "%"}</b>${samples ? ` <small>(${samples})</small>` : ""}</div>
    </div>`;
    const combinedScore = (bi.patternScore.total != null && wk.available && wk.patternScore != null) ? Math.round((bi.patternScore.total + wk.patternScore) / 2) : bi.patternScore.total;
    return section("bi-mtf", "🧱 Multi-Timeframe", "รวมสัญญาณ Weekly + Daily",
      `<div class="bi-mtf">
        ${col("Weekly", wk.available ? wk.patternScore : null, wk.available ? wk.bias : "neutral", wk.available ? wk.positive13w : null, wk.available ? wk.samples13w : null)}
        ${col("Daily", bi.patternScore.total, mtf.daily.bias || "neutral", dailyProb == null ? null : Math.round(dailyProb), (bi.decision.setup.byHorizon[90] || {}).samples)}
        ${col("Combined", combinedScore, mtf.combined.bias || "neutral", null)}
      </div>
      <p class="mcx-foot-note">Agreement: <b>${esc(mtf.combined.agreement)}</b></p>`);
  }

  // 13 — Historical Heatmap
  function heatmapSection(bi) {
    const rows = (bi.decision.heatmap || []).map((h) => `<tr>
      <td><strong>${esc(h.row)}</strong></td>
      <td>${h.current}</td><td class="bi-muted">${h.historicalAvg}</td>
      <td><span class="bi-heat bi-heat-${h.tone}">${h.rankPct}%</span></td></tr>`).join("");
    return section("bi-heat", "🌡️ Historical Heatmap", "แต่ละองค์ประกอบเทียบค่าเฉลี่ยในอดีต + เปอร์เซ็นไทล์ปัจจุบัน",
      `<table class="bi-table bi-heat-t"><thead><tr><th>Component</th><th>Current</th><th>Hist. Avg</th><th>Current Rank</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  // 14 — Decision Engine
  function decisionSection(bi) {
    const d = bi.decision.decision;
    const tone = d.tone === "bull" ? "bull" : d.tone === "bear" ? "bear" : d.tone === "warn" ? "warn" : "neutral";
    return section("bi-decision", "🧠 Decision Engine", "สรุปจากหลักฐาน — ไม่ใช้คำว่า Buy/Sell",
      `<div class="bi-decision bi-decision-${tone}">
        <div class="bi-decision-label">${esc(d.label)}</div>
        <ul class="mcx-ul">${d.rationale.map((x) => `<li>• ${esc(x)}</li>`).join("")}</ul>
        <div class="bi-decision-basis">พิจารณาจาก: ${(d.basis || []).map((b) => `<span>${esc(b)}</span>`).join("")}</div>
      </div>`);
  }

  // 9 — Decision Summary
  function summarySection(bi) {
    return section("bi-summary", "📝 Decision Summary", "สรุปเชิงหลักฐาน (สูงสุด 8 บรรทัด)",
      `<div class="bi-summary">${(bi.decision.summary || []).map((l) => `<p>${esc(l)}</p>`).join("")}</div>`);
  }

  // 15 — Data Quality
  function dataQualitySection(bi) {
    const dq = bi.decision.dataQuality;
    const cell = (l, v) => `<div class="bi-dq"><small>${esc(l)}</small><strong>${esc(v)}</strong></div>`;
    return section("bi-dq", "🗄️ Data Quality", "ความครบถ้วนของข้อมูลย้อนหลัง",
      `<div class="bi-dqgrid">
        ${cell("Historical Samples", dq.samples.toLocaleString() + " candles")}
        ${cell("Coverage", dq.coverage + "%")}
        ${cell("Setup Occurrences", dq.occurrences)}
        ${cell("Missing Data", dq.missingData)}
        ${cell("Range", dq.firstDate + " → " + dq.lastDate)}
        ${cell("Last Updated", bi.updatedAt ? new Date(bi.updatedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—")}
      </div>`);
  }

  function modeThai(mode) {
    const m = String(mode || "");
    if (m.indexOf("full") === 0) return "ดาวน์โหลดครั้งแรก (2014–ปัจจุบัน)";
    if (m.indexOf("incremental") === 0) return "อัปเดตเฉพาะข้อมูลใหม่";
    if (m.indexOf("cache") === 0) return "ใช้ข้อมูลแคช (ดึงใหม่ไม่สำเร็จ)";
    return m;
  }
  // status/refresh bar — shown above the sections when data exists
  function refreshBar(bi) {
    const m = bi.meta || {};
    const info = biLoading
      ? `<span class="bi-rb-status" id="biLoadStatus">${esc(biStatus || "กำลังดึงข้อมูล…")}</span>`
      : `<span class="bi-rb-info">${(m.bars || 0).toLocaleString()} แท่ง · 2014–${esc(m.lastDate || "-")} · ${esc(modeThai(m.mode))}${bi.updatedAt ? " · อัปเดต " + new Date(bi.updatedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : ""}${(Date.now() - biDone < 6000) ? ' <b class="bi-pos">✓ อัปเดตแล้ว</b>' : ""}</span>`;
    return `<div class="bi-refreshbar">${info}<button type="button" class="mc-btn mc-btn-primary bi-refresh-btn" data-bi-load="1"${biLoading ? " disabled" : ""}>${biLoading ? "⏳ กำลังดึงข้อมูล…" : "↻ อัปเดตข้อมูล Bitcoin"}</button></div>`;
  }
  function emptyNoIntel() {
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:44px 22px;">
      <div style="font-size:44px">🧠</div><h2 style="margin:12px 0 6px;">Bitcoin Intelligence</h2>
      <p style="color:var(--mc-muted);max-width:600px;margin:0 auto 16px;">Historical Decision Engine — "ในอดีตเมื่อโครงสร้างตลาดแบบวันนี้เกิดขึ้น มักเกิดอะไรตามมา" · กด <b>Load Latest Data</b> เพื่อสร้างฐานข้อมูลย้อนหลัง (2014–ปัจจุบัน) และประมวลผล</p>
      ${biLoading
        ? `<div class="bi-loadcard"><div class="bi-spinner"></div><div id="biLoadStatus">${esc(biStatus || "กำลังดึงข้อมูลย้อนหลังและประมวลผล…")}</div><small>ครั้งแรกอาจใช้เวลาสักครู่ (ดาวน์โหลด 2014–ปัจจุบัน)</small></div>`
        : `<button class="mc-btn mc-btn-primary" data-bi-load="1" type="button" style="padding:10px 22px;">Load Latest Data</button>`}
      ${biError ? `<p class="bi-neg" style="margin-top:12px">ดึงข้อมูลไม่สำเร็จ: ${esc(biError)}</p>` : ""}</section>`;
  }
  function notReady(bi) {
    return `<section class="mc-card mc-panel mc-fade">${refreshBar(bi)}<div class="mc-empty"><strong>กำลังเตรียมข้อมูล Intelligence</strong>${esc((bi && bi.reason) || "ข้อมูลย้อนหลังยังไม่พอ")} — กด "อัปเดตข้อมูลล่าสุด" อีกครั้ง</div></section>`;
  }

  // ---------------------------------------------------------------- load control
  // BTC-ONLY refresh: this tab's update button runs the BitcoinIntelligence engine directly —
  // it fetches ONLY BTC-USD candles (incrementally, from its own cache) and rewrites just
  // snapshot.bitcoinIntelligence via PortfolioDataSnapshot.write(). No full-portfolio reload.
  // Falls back to the full loadLatestData() only when no snapshot exists yet (first run).
  async function runLoad() {
    if (biLoading) return;
    const api = window.PortfolioDataSnapshot;
    if (!api) { biError = "ตัวโหลดข้อมูลยังไม่พร้อม (ลองรีเฟรชหน้า)"; rerender(); return; }
    const engine = window.BitcoinIntelligence;
    const snap = (typeof api.read === "function") ? api.read() : null;
    biLoading = true; biError = null;
    try {
      if (snap && engine && typeof engine.run === "function" && typeof api.write === "function") {
        biStatus = "กำลังดึงข้อมูล Bitcoin (เฉพาะ BTC ไม่โหลดพอร์ตทั้งหมด)…"; rerender();
        const bi = await engine.run(snap, {});
        snap.bitcoinIntelligence = bi;
        api.write(snap); // persists + fires the portfolio-data-snapshot event (loadedAt untouched — พอร์ตส่วนอื่นไม่ถูกแตะ)
        biDone = Date.now();
      } else if (typeof api.loadLatestData === "function") {
        biStatus = "กำลังเริ่มดึงข้อมูลครั้งแรก (โหลดเต็ม)…"; rerender();
        await api.loadLatestData();
        biDone = Date.now();
      } else { biError = "ตัวโหลดข้อมูลยังไม่พร้อม (ลองรีเฟรชหน้า)"; }
    }
    catch (e) { biError = String(e && e.message ? e.message : e); }
    finally { biLoading = false; rerender(); }
  }
  function wireLoadListeners() {
    if (biListenersWired) return;
    biListenersWired = true;
    // reflect load progress from whichever button started it (inline or header)
    window.addEventListener("portfolio-data-snapshot-progress", (e) => {
      if (!biLoading) { biLoading = true; rerender(); }
      const d = (e && e.detail) || {};
      biStatus = (d.stepLabel || "กำลังประมวลผล") + (d.totalAssets ? ` (${d.completedAssets || 0}/${d.totalAssets})` : "") + (d.currentSymbol ? " · " + d.currentSymbol : "");
      const el = document.getElementById("biLoadStatus"); if (el) el.textContent = biStatus;
    });
    window.addEventListener("portfolio-data-snapshot", () => { if (biLoading) { biLoading = false; biDone = Date.now(); rerender(); } });
  }

  // ---------------------------------------------------------------- render body
  // ---- Cycle Intelligence (Phase 3) ----
  const CYCLE_COLORS = { "Capitulation": "#ef4444", "Accumulation": "#eab308", "Early Expansion": "#84cc16", "Expansion": "#22c55e", "Late Expansion": "#06b6d4", "Distribution": "#f97316" };
  function cyclePhaseColor(p) { return CYCLE_COLORS[p] || "var(--mc-muted)"; }
  function cycleSection(bi) {
    const c = bi.cycle;
    if (!c || !c.current) return "";
    const col = cyclePhaseColor(c.current.state);
    // current + score
    const alts = c.current.alternatives.map((a) => `<div class="bi-cyc-alt"><span class="bi-cyc-dot" style="background:${cyclePhaseColor(a.state)}"></span><span class="bi-cyc-alt-name">${esc(a.state)}</span><div class="bi-cyc-alt-bar"><i style="width:${a.confidence}%;background:${cyclePhaseColor(a.state)}"></i></div><b>${a.confidence}%</b></div>`).join("");
    const comp = c.score.components, cmax = { trend: 25, momentum: 20, similarity: 20, patternScore: 15, macro: 10, volume: 10 };
    const compLbl = { trend: "Trend", momentum: "Momentum", similarity: "Hist. Similarity", patternScore: "Pattern Score", macro: "Macro Regime", volume: "Volume" };
    const compRows = Object.keys(cmax).map((k) => `<div class="bi-cyc-comp"><span>${compLbl[k]}</span><div class="bi-cyc-comp-bar"><i style="width:${(comp[k] / cmax[k] * 100).toFixed(0)}%"></i></div><b>${comp[k]}<small>/${cmax[k]}</small></b></div>`).join("");
    // timeline strip
    const tl = c.timeline || [], t0 = Date.parse(tl.length ? tl[0].from : c.marketStructure ? c.marketStructure.resembles : "2014-09-17"), tN = Date.parse(bi.meta.lastDate), span = (tN - t0) || 1;
    const bands = tl.map((s, i) => { const x = (Date.parse(s.from) - t0) / span * 100, w = (Date.parse(s.to) - Date.parse(s.from)) / span * 100; return `<span class="bi-cyc-band${i === tl.length - 1 ? " bi-cyc-band-cur" : ""}" style="left:${x.toFixed(2)}%;width:${Math.max(0.3, w).toFixed(2)}%;background:${cyclePhaseColor(s.phase)}" title="${esc(s.phase)} · ${esc(s.from)}→${esc(s.to)} · ${s.days}d · ${s.ret == null ? "" : (s.ret > 0 ? "+" : "") + s.ret + "%"}"></span>`; }).join("");
    const years = []; for (let y = new Date(t0).getUTCFullYear(); y <= new Date(tN).getUTCFullYear(); y += 2) years.push(`<span style="left:${((Date.parse(y + "-01-01") - t0) / span * 100).toFixed(1)}%">${y}</span>`);
    const legend = Object.keys(CYCLE_COLORS).map((p) => `<span class="bi-cyc-leg"><i style="background:${CYCLE_COLORS[p]}"></i>${esc(p)}</span>`).join("");
    // similarity + paths
    const sim = (c.similarity || []).map((s) => `<div class="bi-cyc-simrow"><span class="bi-cyc-sim-name">${esc(s.label)}</span><div class="bi-cyc-sim-bar"><i style="width:${s.similarity}%"></i></div><b>${s.similarity}%</b><span class="bi-cyc-sim-meta">${s.duration}d · <b class="${pctCls(s.avgReturn)}">${pctStr(s.avgReturn, true)}</b></span></div>`).join("");
    const paths = (c.paths || []).map((p, i) => `<div class="bi-cyc-path"><span class="bi-cyc-path-tag">${["A", "B", "C"][i] || "•"}</span><span class="bi-cyc-path-name">${esc(p.scenario)}</span><div class="bi-cyc-sim-bar"><i style="width:${p.probability}%;background:linear-gradient(90deg,var(--mc-violet,#a855f7),var(--mc-cyan))"></i></div><b>${p.probability}%</b><span class="bi-cyc-sim-meta">90D <b class="${pctCls(p.avgForward90)}">${pctStr(p.avgForward90, true)}</b> · 180D <b class="${pctCls(p.avgForward180)}">${pctStr(p.avgForward180, true)}</b></span></div>`).join("");
    // distribution
    const distMax = Math.max.apply(null, c.distribution.map((d) => d.pct)) || 1;
    const dist = c.distribution.map((d) => `<div class="bi-cyc-dist${d.current ? " bi-cyc-dist-cur" : ""}"><div class="bi-cyc-dist-bar" style="height:${(d.pct / distMax * 100).toFixed(0)}%;background:${cyclePhaseColor(d.phase)}"></div><span class="bi-cyc-dist-pct">${d.pct}%</span><span class="bi-cyc-dist-lbl">${esc(d.phase)}</span></div>`).join("");
    const ms = c.marketStructure;
    const dtone = c.decision.tone === "bull" ? "bull" : c.decision.tone === "bear" ? "bear" : c.decision.tone === "warn" ? "warn" : "neutral";
    return `<section class="mc-card mc-panel mc-fade bi-sec" id="bi-cycle">
      <div class="mc-panel-head"><div><h2>🌀 Cycle Intelligence</h2><span class="mc-sub">Bitcoin อยู่ช่วงไหนของวัฏจักรตลาดในเชิงสถิติ (ไม่ใช่การพยากรณ์)</span></div>
        <span class="bi-cyc-badge" style="color:${col};border-color:${col}">${esc(c.current.state)} · ${c.current.confidence}%</span></div>
      <div class="bi-cyc-grid">
        <div class="bi-cyc-card">
          <div class="bi-cyc-cur"><div class="bi-cyc-cur-state" style="color:${col}">${esc(c.current.state)}</div><div class="bi-cyc-cur-conf">Confidence <b>${c.current.confidence}%</b></div></div>
          <div class="bi-cyc-alts">${alts}</div>
        </div>
        <div class="bi-cyc-card">
          <div class="bi-cyc-score-head">Cycle Score <b style="color:${c.score.total >= 60 ? "var(--mc-emerald)" : c.score.total >= 40 ? "var(--mc-amber)" : "var(--mc-red)"}">${c.score.total}</b><small>/100</small></div>
          <div class="bi-cyc-comps">${compRows}</div>
        </div>
      </div>
      <div class="bi-cyc-tl-wrap">
        <div class="bi-cyc-tl-head">Cycle Timeline (2014 → ปัจจุบัน) · <b style="color:${col}">ตอนนี้: ${esc(c.current.state)}</b></div>
        <div class="bi-cyc-tl">${bands}</div>
        <div class="bi-cyc-tl-axis">${years.join("")}</div>
        <div class="bi-cyc-legend">${legend}</div>
      </div>
      ${ms ? `<div class="bi-cyc-struct">📐 โครงสร้างตลาดปัจจุบันใกล้เคียง <b>${esc(ms.resembles)}</b> มากที่สุด · similarity <b>${ms.similarity}%</b> · เฟสนี้ในอดีตกินเวลา ~<b>${ms.duration} วัน</b> · ผลตอบแทนเฉลี่ย <b class="${pctCls(ms.avgReturn)}">${pctStr(ms.avgReturn, true)}</b> · ย่อลึกสุด <b class="bi-neg">${pctStr(ms.maxDrawdown)}</b></div>` : ""}
      <div class="bi-cyc-grid">
        <div class="bi-cyc-card"><div class="bi-cyc-subhead">🧭 Cycle Similarity (เทียบทั้งช่วง ไม่ใช่รายวัน)</div>${sim || '<span class="bi-muted">—</span>'}</div>
        <div class="bi-cyc-card"><div class="bi-cyc-subhead">🛣️ Historical Paths (เส้นทางที่คล้ายในอดีต — ไม่ใช่การพยากรณ์)</div>${paths || '<span class="bi-muted">—</span>'}</div>
      </div>
      <div class="bi-cyc-subhead">📊 Cycle Distribution (ความถี่แต่ละเฟสในอดีต · ปัจจุบันไฮไลต์)</div>
      <div class="bi-cyc-distrow">${dist}</div>
      <div class="bi-cyc-foot">
        <div class="bi-cyc-decision bi-decision-${dtone}">🎯 วัฏจักรปัจจุบันในอดีตมักเอื้อต่อ: <b>${esc(c.decision.label)}</b></div>
        <div class="bi-cyc-halving">⛏️ Halving: <b>${esc(c.halving.bucket)}</b>${c.halving.daysSince != null ? ` · ${c.halving.daysSince} วันหลัง halving ${esc(c.halving.lastHalving || "")}` : ""}</div>
      </div>
      <div class="bi-cyc-summary">${(c.summary || []).map((l) => `<p>${esc(l)}</p>`).join("")}</div>
    </section>`;
  }

  // ---- Bitcoin Playbook (Phase 4) — the signature institutional handbook ----
  function pbDotClass(s) { return s === "Green" ? "bi-pb-g" : s === "Red" ? "bi-pb-r" : "bi-pb-y"; }
  function lvlDotClass(l) { return l === "High" ? "bi-pb-g" : l === "Medium" ? "bi-pb-y" : "bi-pb-r"; }
  function playbookSection(bi) {
    const p = bi.playbook;
    if (!p || !p.state) return "";
    const col = cyclePhaseColor(p.state);
    const evTone = (p.evidenceStrength === "Very Strong" || p.evidenceStrength === "Strong") ? "bull" : p.evidenceStrength === "Moderate" ? "warn" : "neutral";
    const dtone = p.tone === "bull" ? "bull" : p.tone === "bear" ? "bear" : p.tone === "warn" ? "warn" : "neutral";
    // 2 — historical characteristics
    const chars = p.characteristics.map((c) => `<div class="bi-pb-char ${c.ok ? "is-ok" : "is-no"}"><span>${c.ok ? "✓" : "✗"}</span>${esc(c.label)}</div>`).join("");
    // 3 — historical statistics
    const st = p.statistics, stCell = (l, v) => `<div class="bi-pb-stat"><small>${esc(l)}</small><strong>${v}</strong></div>`;
    const stats = [
      stCell("Avg Duration", st.avgDuration == null ? "—" : st.avgDuration + "d"),
      stCell("Median Duration", st.medianDuration == null ? "—" : st.medianDuration + "d"),
      stCell("Avg Return", st.avgReturn == null ? "—" : `<span class="${pctCls(st.avgReturn)}">${pctStr(st.avgReturn, true)}</span>`),
      stCell("Median Return", st.medianReturn == null ? "—" : `<span class="${pctCls(st.medianReturn)}">${pctStr(st.medianReturn, true)}</span>`),
      stCell("Typical Drawdown", st.typicalDrawdown == null ? "—" : `<span class="bi-neg">${pctStr(st.typicalDrawdown)}</span>`),
      stCell("Worst Drawdown", st.worstDrawdown == null ? "—" : `<span class="bi-neg">${pctStr(st.worstDrawdown)}</span>`),
      stCell("Historical Win Rate", st.winRate == null ? "—" : st.winRate + "%"),
      stCell("Occurrences", st.occurrences)
    ].join("");
    // 4/5 — typical + suggested behaviour
    const typ = p.typicalBehaviour.map((t) => `<li>• ${esc(t)}</li>`).join("");
    const sug = p.suggestedBehaviour.map((s) => `<div class="bi-pb-sug"><b>${esc(s.action)}</b><span>${esc(s.th)}</span></div>`).join("");
    // 6 — risk checklist
    const risk = p.riskChecklist.map((r) => `<div class="bi-pb-risk"><span class="bi-pb-dot ${pbDotClass(r.status)}"></span><span class="bi-pb-risk-lbl">${esc(r.label)}</span><span class="bi-pb-risk-val">${esc(r.value)}</span><span class="bi-pb-risk-st ${pbDotClass(r.status)}">${esc(r.status)}</span></div>`).join("");
    // 7 — what usually ends this phase
    const ends = p.whatEndsPhase.map((e) => `<li>• ${esc(e)}</li>`).join("");
    // 8 — transition probability
    const trMax = Math.max.apply(null, p.transition.map((t) => t.probability)) || 1;
    const trans = p.transition.map((t) => `<div class="bi-pb-tr${t.remain ? " is-remain" : ""}"><span class="bi-pb-tr-lbl">${esc(t.label)}</span><div class="bi-pb-tr-bar"><i style="width:${(t.probability / trMax * 100).toFixed(0)}%;background:${cyclePhaseColor(t.to)}"></i></div><b>${t.probability}%</b></div>`).join("");
    // 9 — typical remaining duration
    const rd = p.remainingDuration;
    const remaining = `<div class="bi-pb-remain-big" style="color:${col}">${rd.median == null ? "—" : rd.median}<small> วัน (median)</small></div>
      <div class="bi-pb-remain-meta">ช่วงในอดีต <b>${rd.rangeLow == null ? "—" : rd.rangeLow} → ${rd.rangeHigh == null ? "—" : rd.rangeHigh}</b> วัน · ผ่านมาแล้ว <b>${rd.elapsed}</b> วัน · เฉลี่ยทั้งเฟส ~<b>${rd.typicalTotal == null ? "—" : rd.typicalTotal}</b> วัน</div>`;
    // Current Match
    const cm = p.currentMatch;
    const match = `<div class="bi-pb-match-score" style="color:${col}">${cm.score}<small>/100</small></div>
      <div class="bi-pb-remain-meta">${cm.topPct != null ? `Top <b>${cm.topPct}%</b> ของ setup ในอดีต` : ""}${cm.rank != null ? ` · อันดับ <b>#${cm.rank}</b>/${(cm.total || 0).toLocaleString()}` : ""}${cm.percentile != null ? ` · เปอร์เซ็นไทล์ <b>${cm.percentile}</b>` : ""}</div>`;
    // Playbook timeline
    const tlp = p.timeline;
    const pbTl = `<div class="bi-pb-flow">
      <span class="bi-pb-flow-node" style="border-color:${cyclePhaseColor(tlp.current)};color:${cyclePhaseColor(tlp.current)}">${esc(tlp.current)}</span>
      <span class="bi-pb-flow-arr">→</span>
      <span class="bi-pb-flow-node" style="border-color:${cyclePhaseColor(tlp.next)};color:${cyclePhaseColor(tlp.next)}">${esc(tlp.next)}</span>
      <span class="bi-pb-flow-arr">→</span>
      <span class="bi-pb-flow-node" style="border-color:${cyclePhaseColor(tlp.following)};color:${cyclePhaseColor(tlp.following)}">${esc(tlp.following)}</span></div>`;
    // Do / Don't
    const doL = p.doDont.do.map((d) => `<li class="bi-pb-do">✔ ${esc(d)}</li>`).join("");
    const dontL = p.doDont.dont.map((d) => `<li class="bi-pb-dont">✖ ${esc(d)}</li>`).join("");
    // Historical examples
    const ex = p.examples.length ? p.examples.map((e) => `<div class="bi-pb-ex">
      <div class="bi-pb-ex-head"><b>${esc(e.date)}</b>${e.similarity != null ? `<span class="bi-pb-ex-sim">${e.similarity}%</span>` : ""}</div>
      <div class="bi-pb-ex-cyc">${esc(e.cycle)}</div>
      <div class="bi-pb-ex-row"><span>Return <b class="${pctCls(e.ret)}">${pctStr(e.ret, true)}</b></span><span>Max DD <b class="bi-neg">${pctStr(e.maxDD)}</b></span></div>
      <div class="bi-pb-ex-out">${esc(e.outcome)} · ${e.days}d</div></div>`).join("") : '<span class="bi-muted">ยังไม่มีตัวอย่างเฟสนี้ที่สมบูรณ์ในอดีต</span>';
    // Playbook confidence
    const reasons = p.playbookConfidence.reasons.map((r) => `<div class="bi-pb-cf"><span class="bi-pb-dot ${lvlDotClass(r.level)}"></span><span class="bi-pb-cf-lbl">${esc(r.label)}</span><span class="bi-pb-cf-val">${esc(r.value)}</span><b>${esc(r.level)}</b></div>`).join("");

    return `<section class="mc-card mc-panel mc-fade bi-sec bi-pb" id="bi-playbook">
      <div class="mc-panel-head"><div><h2>📘 Bitcoin Playbook</h2><span class="mc-sub">แนวทางที่นักลงทุนในอดีตบริหาร Bitcoin ในสภาวะตลาดคล้ายปัจจุบัน · อ้างอิงหลักฐานเชิงสถิติ ไม่ใช่คำแนะนำการลงทุน</span></div>
        <span class="bi-cyc-badge" style="color:${col};border-color:${col}">${esc(p.state)} · ${p.confidence}%</span></div>

      <div class="bi-pb-hero" style="border-color:${col}">
        <div class="bi-pb-hero-main">
          <div class="bi-pb-hero-title" style="color:${col}">${esc(p.state)} Playbook</div>
          <div class="bi-pb-hero-stance">แนวโน้มเชิงสถิติ (อดีต): <b class="bi-decision-${dtone}" style="padding:2px 10px;border-radius:8px">${esc(p.stance)}</b></div>
        </div>
        <div class="bi-pb-hero-metrics">
          <div><small>Confidence</small><strong>${p.confidence}%</strong></div>
          <div><small>Historical Match</small><strong>${p.historicalMatch}%</strong></div>
          <div><small>Evidence</small><strong class="bi-decision-${evTone}">${esc(p.evidenceStrength)}</strong></div>
        </div>
      </div>

      <div class="bi-pb-grid">
        <div class="bi-pb-block"><div class="bi-pb-h">✅ Historical Characteristics</div><div class="bi-pb-chars">${chars}</div></div>
        <div class="bi-pb-block"><div class="bi-pb-h">📊 Historical Statistics</div><div class="bi-pb-stats">${stats}</div></div>
      </div>

      <div class="bi-pb-grid">
        <div class="bi-pb-block"><div class="bi-pb-h">🔁 Typical Behaviour (ในอดีต)</div><ul class="bi-pb-ul">${typ}</ul></div>
        <div class="bi-pb-block"><div class="bi-pb-h">🧭 Suggested Behaviour <small>(อ้างอิงหลักฐานในอดีต)</small></div><div class="bi-pb-sugs">${sug}</div></div>
      </div>

      <div class="bi-pb-grid">
        <div class="bi-pb-block"><div class="bi-pb-h">🛡️ Risk Checklist</div><div class="bi-pb-risks">${risk}</div></div>
        <div class="bi-pb-block"><div class="bi-pb-h">⚠️ สิ่งที่ในอดีตมักจบเฟสนี้</div><ul class="bi-pb-ul">${ends}</ul></div>
      </div>

      <div class="bi-pb-grid">
        <div class="bi-pb-block"><div class="bi-pb-h">🔀 Transition Probability <small>(อดีต · +${p.transitionHorizon}วัน)</small></div><div class="bi-pb-trs">${trans}</div></div>
        <div class="bi-pb-block"><div class="bi-pb-h">⏳ Typical Remaining Duration</div>${remaining}<div class="bi-pb-h" style="margin-top:12px">🎯 Current Match</div>${match}</div>
      </div>

      <div class="bi-pb-block"><div class="bi-pb-h">🗺️ Playbook Timeline <small>(เฟสปัจจุบัน → เฟสถัดไปที่พบบ่อยในอดีต)</small></div>${pbTl}</div>

      <div class="bi-pb-grid">
        <div class="bi-pb-block bi-pb-do-col"><div class="bi-pb-h">✔ Historically Favoured</div><ul class="bi-pb-ul">${doL}</ul></div>
        <div class="bi-pb-block bi-pb-dont-col"><div class="bi-pb-h">✖ Historically Discouraged</div><ul class="bi-pb-ul">${dontL}</ul></div>
      </div>

      <div class="bi-pb-block"><div class="bi-pb-h">🏛️ Historical Examples (Top 5)</div><div class="bi-pb-exs">${ex}</div></div>

      <div class="bi-pb-block"><div class="bi-pb-h">🔎 Playbook Confidence — <b>${esc(p.playbookConfidence.level)}</b></div><div class="bi-pb-cfs">${reasons}</div></div>

      <div class="bi-cyc-summary">${(p.summary || []).map((l) => `<p>${esc(l)}</p>`).join("")}</div>
    </section>`;
  }

  // ============================================================ DECISION-FIRST REFACTOR (UI only)
  // Reuses existing engine outputs. Any extra data is PRESENTATION-derived in this view layer
  // (normalized price paths from the engine's own localStorage price cache; per-dimension
  // decomposition from patternScore.components). No engine/calculation/provider is touched.

  // Read the price history the engine already cached (columnar {d,c,...}) — display only.
  function readHistoryCache() {
    try {
      const raw = window.localStorage && window.localStorage.getItem("btc_intelligence_history_v1");
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.d) && Array.isArray(o.c) && o.d.length > 60) return { dates: o.d, closes: o.c };
    } catch (e) {}
    return null;
  }
  function findIdxByDate(cache, date) {
    const i = cache.dates.indexOf(date);
    if (i >= 0) return i;
    let res = -1; for (let k = 0; k < cache.dates.length; k++) { if (cache.dates[k] <= date) res = k; else break; }
    return res;
  }
  // presentation-only SMA50 position for the DNA badge (plain average of last 50 closes)
  function sma50State(cache, close) {
    if (!cache || !Number.isFinite(close) || cache.closes.length < 50) return null;
    const c = cache.closes; let s = 0; for (let k = c.length - 50; k < c.length; k++) s += c[k];
    const sma = s / 50; return close > sma ? "above" : close < sma ? "below" : "at";
  }

  // SECTION 1 — Current Market DNA (badges only, no paragraphs)
  function dnaSection(bi) {
    const cp = bi.currentPattern, ps = bi.patternScore, mtf = bi.multiTimeframe, mc = bi.marketContext;
    const scoreColor = ps.total >= 66 ? "var(--mc-emerald)" : ps.total >= 40 ? "var(--mc-amber)" : "var(--mc-red)";
    const s50 = sma50State(readHistoryCache(), cp.close);
    const has = (k) => (cp.patterns || []).some((p) => p.pattern === k);
    const badge = (txt, tone) => `<span class="bi-dna-badge bi-dna-${tone}">${esc(txt)}</span>`;
    const b = [];
    const trend = mtf.combined.bias || "neutral";
    b.push(badge("Trend · " + trend, trend.indexOf("bull") >= 0 ? "bull" : trend.indexOf("bear") >= 0 ? "bear" : "muted"));
    b.push(badge(cp.emaState === "bull" ? "EMA12 > EMA26" : cp.emaState === "bear" ? "EMA12 < EMA26" : "EMA12 = EMA26", cp.emaState === "bull" ? "bull" : cp.emaState === "bear" ? "bear" : "muted"));
    if (has("EMA12_BULL_CROSS")) b.push(badge("Bullish Cross", "bull"));
    if (has("EMA12_BEAR_CROSS")) b.push(badge("Bearish Cross", "bear"));
    if (s50) b.push(badge(s50 === "above" ? "Above SMA50" : "Below SMA50", s50 === "above" ? "bull" : "bear"));
    b.push(badge(cp.smaState === "above" ? "Above SMA200" : cp.smaState === "below" ? "Below SMA200" : "At SMA200", cp.smaState === "above" ? "bull" : cp.smaState === "below" ? "bear" : "muted"));
    if (mtf.weekly && mtf.weekly.available) {
      b.push(badge(mtf.weekly.smaState === "above" ? "Above Weekly SMA200" : "Below Weekly SMA200", mtf.weekly.smaState === "above" ? "bull" : "bear"));
      b.push(badge("Weekly " + (mtf.weekly.bias === "bullish" ? "Bull" : mtf.weekly.bias === "bearish" ? "Bear" : "Neutral"), mtf.weekly.bias === "bullish" ? "bull" : mtf.weekly.bias === "bearish" ? "bear" : "muted"));
    }
    if (Number.isFinite(cp.rsi)) b.push(badge("RSI " + r1(cp.rsi), (cp.rsi >= 45 && cp.rsi <= 65) ? "bull" : (cp.rsi > 70 || cp.rsi < 30) ? "bear" : "muted"));
    if (has("BULLISH_RSI_DIVERGENCE")) b.push(badge("Bullish Divergence", "bull"));
    if (has("BEARISH_RSI_DIVERGENCE")) b.push(badge("Bearish Divergence", "bear"));
    if (Number.isFinite(cp.volumeRatio)) b.push(badge("Volume " + cp.volumeRatio.toFixed(2) + "x", cp.volumeRatio >= 1 ? "bull" : "muted"));
    return `<section class="mcx-hero mc-fade bi-hero bi-dna" id="bi-dna">
      <div class="bi-hero-score"><div class="bi-hero-num" style="color:${scoreColor}">${ps.total}</div><div class="bi-hero-den">Pattern Score / 100</div></div>
      <div class="bi-hero-body">
        <p class="mc-eyebrow">Current Market DNA · โครงสร้างบิตคอยน์วันนี้</p>
        <h1 class="bi-hero-title">เมื่อบิตคอยน์หน้าตาแบบนี้ ในอดีตเกิดอะไรตามมา?</h1>
        <div class="bi-dna-badges">${b.join("")}</div>
        <div class="bi-dna-foot"><small>ณ ${esc(cp.date)} · ${cp.close ? "$" + Math.round(cp.close).toLocaleString() : "-"} · ${esc(mc.marketType)} · ${mc.riskProxy === "risk-on" ? "Risk-On" : "Risk-Off"}</small></div>
      </div></section>`;
  }

  // ★ Pattern Forecast — analog projection (current 45-bar shape + monitored signals → 30/60/90d)
  function fcSignalBadges(s, week) {
    const b = [], add = (t, tone) => b.push(`<span class="bi-fc-sig bi-dna-${tone}">${esc(t)}</span>`);
    if (s.divBull) add("Bullish Divergence" + (s.divBullAgo != null ? " · " + s.divBullAgo + "d" : ""), "bull");
    else if (s.divBear) add("Bearish Divergence" + (s.divBearAgo != null ? " · " + s.divBearAgo + "d" : ""), "bear");
    else add("No Divergence", "muted");
    if (s.ema.dir > 0) add("EMA12 ตัดขึ้น EMA26 · " + s.ema.ago + "d", "bull");
    else if (s.ema.dir < 0) add("EMA12 ตัดลง EMA26 · " + s.ema.ago + "d", "bear");
    else add("EMA12 " + (s.ema.state === "bull" ? ">" : s.ema.state === "bear" ? "<" : "=") + " EMA26", "muted");
    const smaDay = (o, name) => { if (o.dir > 0) add("ตัดขึ้น " + name + " · " + o.ago + "d", "bull"); else if (o.dir < 0) add("ตัดลง " + name + " · " + o.ago + "d", "bear"); else add((o.pos > 0 ? "เหนือ " : "ใต้ ") + name, o.pos > 0 ? "bull" : "bear"); };
    smaDay(s.sma50, "SMA50·D"); smaDay(s.sma200, "SMA200·D");
    if (week) { const smaWk = (o, name) => { if (o.dir > 0) add("W ตัดขึ้น " + name, "bull"); else if (o.dir < 0) add("W ตัดลง " + name, "bear"); else add("W " + (o.pos > 0 ? "เหนือ " : "ใต้ ") + name, o.pos > 0 ? "bull" : "bear"); }; smaWk(week.sma50, "SMA50"); smaWk(week.sma200, "SMA200"); }
    if (Number.isFinite(s.rsi)) { const arr = s.rsiSlope > 0 ? "↑" : s.rsiSlope < 0 ? "↓" : "→"; add("RSI " + r1(s.rsi) + " " + arr + (s.rsiSlope != null ? Math.abs(s.rsiSlope) : ""), (s.rsi >= 45 && s.rsi <= 65) ? "bull" : (s.rsi > 70 || s.rsi < 30) ? "bear" : "muted"); }
    return b.join("");
  }
  function analogForecastSection(bi) {
    const f = bi.analogForecast, cf = f && f.conditionForecast;
    if (!cf || !cf.current) return "";
    const biasTone = cf.bias === "bullish" ? "bull" : cf.bias === "bearish" ? "bear" : "neutral";
    const biasTh = cf.bias === "bullish" ? "เอนไปทางขึ้น" : cf.bias === "bearish" ? "เอนไปทางลง" : "ก้ำกึ่ง";
    const lines = cf.lines || [], L = cf.windowDays, cur = cf.current.path, PH = cf.projHorizon;
    const head = `<div class="mc-panel-head"><div><h2>🔮 Pattern Forecast</h2><span class="mc-sub">ฉายผล 30/60/90 วัน จาก "เงื่อนไขที่พบตอนนี้" แต่ละอัน — Divergence · ตัด SMA50/200 (D/W) · EMA12×26 · RSI (&lt;30 ซื้อสะสม · &gt;70 ระวัง) · เงื่อนไขที่ไม่พบจะไม่มีเส้น · อ้างอิงสถิติ ไม่รับประกันผล</span></div>
      <span class="bi-cyc-badge bi-decision-${biasTone}">${biasTh}</span></div>`;
    if (!lines.length) return `<section class="mc-card mc-panel mc-fade bi-sec bi-fc" id="bi-forecast">${head}<div class="mc-empty"><strong>ไม่พบเงื่อนไขที่ติดตามในปัจจุบัน</strong>ยังไม่มีเส้นคาดการณ์ — รอสัญญาณ (Divergence / ตัดเส้นค่าเฉลี่ย / EMA cross / RSI เข้าโซน)</div></section>`;
    // --- chart: current 45d actual (x −44..0) + one median line per PRESENT condition (x 0..90) ---
    const W2 = 1000, H2 = 340, x0 = 8;
    const ys = cur.slice(); lines.forEach((ln) => ln.path.forEach((p) => ys.push(p.median)));
    let minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys); const pad = (maxY - minY) * 0.06 || 5; minY -= pad; maxY += pad;
    const X = (day) => x0 + (day + L) / (L + PH) * (W2 - x0 - 10);
    const Y = (v) => 10 + (1 - (v - minY) / (maxY - minY)) * (H2 - 34);
    const curPathD = "M" + cur.map((v, j) => X(j - (L - 1)).toFixed(1) + " " + Y(v).toFixed(1)).join(" L");
    const linePaths = lines.map((ln) => `<path d="M${ln.path.map((p) => X(p.k).toFixed(1) + " " + Y(p.median).toFixed(1)).join(" L")}" fill="none" stroke="${ln.color}" stroke-width="2.2" opacity=".92"/>`).join("");
    const zx = X(0), y100 = Y(100);
    const axis = [{ d: -(L - 1), t: "−" + (L - 1) + "d" }, { d: 0, t: "วันนี้" }, { d: 30, t: "+30" }, { d: 60, t: "+60" }, { d: 90, t: "+90" }]
      .map((a) => `<text x="${X(a.d).toFixed(1)}" y="${H2 - 4}" fill="var(--mc-muted)" font-size="11" text-anchor="middle">${a.t}</text>`).join("");
    // hover points (actual $ from the engine's own price cache when available)
    const cache = readHistoryCache();
    let curCloses = null, todayClose = null;
    if (cache && cache.closes.length >= L) { curCloses = cache.closes.slice(cache.closes.length - L); todayClose = cache.closes[cache.closes.length - 1]; }
    const money = (v) => "$" + Math.round(v).toLocaleString();
    const pts = [];
    cur.forEach((v, j) => { const day = j - (L - 1), price = curCloses ? curCloses[j] : null; pts.push({ x: +X(day).toFixed(1), y: +Y(v).toFixed(1), t: "ราคาจริง · " + (day === 0 ? "วันนี้" : day + "d"), s: (price != null ? money(price) + " · " : "") + (v - 100 >= 0 ? "+" : "") + (v - 100).toFixed(1) + "% เทียบวันนี้" }); });
    lines.forEach((ln) => ln.path.forEach((p) => { if (p.k % 2 && p.k !== PH) return; const mp = todayClose ? todayClose * p.median / 100 : null; pts.push({ x: +X(p.k).toFixed(1), y: +Y(p.median).toFixed(1), t: esc(ln.label) + " · +" + p.k + "d", s: (mp != null ? money(mp) + " · " : "") + "median " + (p.median >= 100 ? "+" : "") + (p.median - 100).toFixed(1) + "%" }); }));
    const ptsAttr = JSON.stringify(pts).replace(/'/g, "&#39;").replace(/</g, "&lt;");
    const chart = `<svg viewBox="0 0 ${W2} ${H2}" class="bi-fc-svg bi-hoverchart" data-cw="${W2}" data-ch="${H2}" data-pts='${ptsAttr}' preserveAspectRatio="none">
      <line x1="${x0}" y1="${y100.toFixed(1)}" x2="${W2}" y2="${y100.toFixed(1)}" stroke="var(--mc-border)" stroke-dasharray="3 3"/>
      ${linePaths}
      <path d="${curPathD}" fill="none" stroke="var(--mc-text)" stroke-width="2.8"/>
      <line x1="${zx.toFixed(1)}" y1="0" x2="${zx.toFixed(1)}" y2="${H2 - 18}" stroke="var(--mc-muted)" stroke-width="1.4"/>
      <line class="bi-cross" x1="0" y1="6" x2="0" y2="${H2 - 18}" stroke="var(--mc-cyan)" stroke-width="1" stroke-dasharray="2 3" style="display:none"/>
      <circle class="bi-crossdot" r="4.5" fill="var(--mc-cyan)" stroke="#0b1220" stroke-width="1.5" style="display:none"/>
      ${axis}</svg>`;
    const legend = `<span class="bi-fc-leg"><i style="background:var(--mc-text)"></i>ราคาจริง 45 วันล่าสุด</span>` + lines.map((ln) => `<span class="bi-fc-leg"><i style="background:${ln.color}"></i>${esc(ln.label)}</span>`).join("");
    // per-condition outcome cards
    const cards = lines.map((ln) => `<div class="bi-fc-cl" style="border-left-color:${ln.color}">
      <div class="bi-fc-cl-name"><span class="bi-fc-cl-dot" style="background:${ln.color}"></span>${esc(ln.label)} <small>${ln.occurrences} ครั้งในอดีต</small></div>
      <div class="bi-fc-cl-rows">${[30, 60, 90].map((H) => { const o = ln.outcome[H]; return `<div class="bi-fc-cl-h"><small>${H}D</small><b class="${pctCls(o.median)}">${o.median > 0 ? "+" : ""}${o.median}%</b><span>บวก ${o.positivePct}%</span></div>`; }).join("")}</div></div>`).join("");
    return `<section class="mc-card mc-panel mc-fade bi-sec bi-fc" id="bi-forecast">
      ${head}
      <div class="bi-fc-chart-wrap">${chart}</div>
      <div class="bi-fc-legend">${legend}</div>
      <div class="bi-fc-cls">${cards}</div>
      <div class="bi-cyc-summary">${(cf.summary || []).map((l) => `<p>${esc(l)}</p>`).join("")}</div>
    </section>`;
  }

  // SECTION 9 — Interpretation (decision-first synthesis; no Buy/Sell, no certainty)
  function interpretationSection(bi) {
    const d = bi.decision.decision;
    const map = { "Accumulation": { w: "Accumulation", th: "ทยอยสะสม", tone: "bull" }, "Neutral": { w: "Patience", th: "อดทนรอ", tone: "neutral" }, "Wait": { w: "Patience", th: "อดทนรอ", tone: "warn" }, "Reduce Risk": { w: "Risk Reduction", th: "ลดความเสี่ยง", tone: "bear" }, "Distribution": { w: "Risk Reduction", th: "ลดความเสี่ยง", tone: "bear" } };
    const m = map[d.label] || { w: d.label, th: "", tone: "neutral" };
    const b90 = bi.decision.setup.byHorizon[90] || {};
    return section("bi-interpret", "🎯 Interpretation", "สังเคราะห์จากหลักฐานในอดีต — ไม่ใช่คำแนะนำการลงทุน และไม่ใช่การพยากรณ์",
      `<div class="bi-interp bi-decision-${m.tone}">
        <div class="bi-interp-eyebrow">หลักฐานในอดีตขณะนี้โน้มเอียงไปทาง</div>
        <div class="bi-interp-verdict">${esc(m.w)}${m.th ? ` · ${esc(m.th)}` : ""}</div>
        <ul class="mcx-ul bi-interp-why">${(d.rationale || []).map((x) => `<li>• ${esc(x)}</li>`).join("")}</ul>
        <div class="bi-interp-basis">อ้างอิงจาก: ${(d.basis || []).map((x) => `<span>${esc(x)}</span>`).join("")}</div>
        <p class="bi-interp-disc">Historically similar setups${b90.samples ? ` (${b90.samples} กรณี) ให้ผล 90 วันเป็นบวก ${b90.positivePct}%` : ""} — เป็นสถิติจากอดีต ไม่รับประกันอนาคต</p>
      </div>`);
  }

  // Condition Monitor — each monitored condition as ใช่/ไม่ใช่ + how many days it has held.
  // No weighted scoring (per user request); reads bi.analogForecast.current.conditions/weekCond.
  function conditionMonitorSection(bi) {
    const f = bi.analogForecast;
    if (!f || !f.current || !f.current.conditions) return "";
    const conds = f.current.conditions, wk = f.current.weekCond;
    const daysN = (d) => d == null ? "—" : d.toLocaleString() + " วัน";
    const rowHtml = (label, met, meta, extra) => {
      const cls = met === true ? "is-yes" : met === false ? "is-no" : "is-neutral";
      const tag = met === true ? "✓ ใช่" : met === false ? "✗ ไม่ใช่" : "—";
      return `<div class="bi-cm-row ${cls}"><span class="bi-cm-lbl">${esc(label)}${extra ? ` <b class="bi-cm-extra">${esc(extra)}</b>` : ""}</span><span class="bi-cm-tag">${tag}</span><span class="bi-cm-days">${esc(meta)}</span></div>`;
    };
    const rows = [];
    conds.forEach((c) => {
      if (c.key === "rsi") rows.push(rowHtml("RSI · " + c.zone, null, "อยู่โซนนี้ต่อเนื่อง " + daysN(c.days), c.value != null ? String(c.value) : ""));
      else if (c.key === "divBull" || c.key === "divBear") rows.push(rowHtml(c.label, c.met, c.days == null ? "ไม่พบล่าสุด" : "เกิดเมื่อ " + daysN(c.days) + "ก่อน"));
      else rows.push(rowHtml(c.label, c.met, "ต่อเนื่องมา " + daysN(c.days)));
    });
    if (wk) {
      if (wk.sma50 && wk.sma50.above != null) rows.push(rowHtml("ราคาอยู่เหนือ SMA50 (Week)", wk.sma50.above, "ต่อเนื่องมา " + wk.sma50.weeks + " สัปดาห์"));
      if (wk.sma200 && wk.sma200.above != null) rows.push(rowHtml("ราคาอยู่เหนือ SMA200 (Week)", wk.sma200.above, "ต่อเนื่องมา " + wk.sma200.weeks + " สัปดาห์"));
    }
    return `<section class="mc-card mc-panel mc-fade bi-sec" id="bi-conditions">
      <div class="mc-panel-head"><div><h2>🎯 เงื่อนไขที่ติดตาม (Condition Monitor)</h2><span class="mc-sub">แต่ละเงื่อนไข "ใช่ / ไม่ใช่" และเข้าเงื่อนไขมาแล้วกี่วัน — ไม่มีการให้คะแนนถ่วงน้ำหนัก</span></div></div>
      <div class="bi-cm-rows">${rows.join("")}</div></section>`;
  }

  // SECTION 3 — Most Similar Historical Cases (large clickable cards → Replay)
  function similarCasesSection(bi) {
    const cases = (bi.similarCases || []).slice(0, 10); if (!cases.length) return "";
    const ret = (rr, h) => `<div class="bi-case-ret"><small>${h}D</small><b class="${pctCls(rr[h])}">${pctStr(rr[h], true)}</b></div>`;
    const cards = cases.map((s, idx) => {
      const rr = s.returns || {};
      return `<button type="button" class="bi-case" data-replay="${idx}">
        <div class="bi-case-top"><span class="bi-case-date">${esc(s.date)}</span><span class="bi-case-sim">${s.similarity}%</span></div>
        <div class="bi-case-meta">${esc(s.marketPhase)} · ${esc(s.context ? s.context.halvingPhase : "")} · PS ${s.patternScore}</div>
        <div class="bi-case-rets">${ret(rr, 30)}${ret(rr, 90)}${ret(rr, 180)}${ret(rr, 365)}</div>
        <div class="bi-case-dd">Max DD 90D <b class="bi-neg">${pctStr(s.maxDrawdown90)}</b><span class="bi-case-open">Replay →</span></div>
      </button>`;
    }).join("");
    return `<section class="mc-card mc-panel mc-fade bi-sec" id="bi-cases">
      <div class="mc-panel-head"><div><h2>🏛️ Most Similar Historical Cases</h2><span class="mc-sub">10 วันในอดีตที่ DNA เหมือนวันนี้ที่สุด — คลิกการ์ดเพื่อดู Historical Replay</span></div></div>
      <div class="bi-cases-grid">${cards}</div></section>`;
  }

  // SECTION 4 — Price Overlay (normalized historical analog comparison; NOT prediction)
  function overlaySection(bi) {
    const cases = (bi.similarCases || []).slice(0, 3); if (!cases.length) return "";
    const W = S.overlayWin, cache = readHistoryCache();
    const winBtns = [30, 60, 90, 180, 365].map((w) => `<button type="button" class="bi-hbtn${w === W ? " is-active" : ""}" data-overlay-win="${w}">${w}D</button>`).join("");
    const colors = ["var(--mc-cyan)", "#a855f7", "#f97316"];
    const width = 1000, height = 300, x0 = 8;
    let chart = "", legend = "";
    const series = [];
    if (cache) {
      const c = cache.closes, n = c.length, base = c[n - 1];
      const cur = []; if (base > 0) for (let k = -W; k <= 0; k++) { const idx = n - 1 + k; if (idx >= 0 && c[idx] > 0) cur.push({ k, pct: c[idx] / base * 100 }); }
      if (cur.length > 1) series.push({ name: "Current · วันนี้", color: "var(--mc-text)", pts: cur, cur: true });
      cases.forEach((cs, i) => { const di = findIdxByDate(cache, cs.date); if (di < 0) return; const bpx = c[di]; if (!(bpx > 0)) return; const pts = []; for (let k = 0; k <= W; k++) { const idx = di + k; if (idx < n && c[idx] > 0) pts.push({ k, pct: c[idx] / bpx * 100 }); } if (pts.length > 1) series.push({ name: cs.date + " · " + cs.marketPhase, color: colors[i], pts, dash: true }); });
      if (series.length) {
        let minP = 100, maxP = 100; series.forEach((s) => s.pts.forEach((p) => { if (p.pct < minP) minP = p.pct; if (p.pct > maxP) maxP = p.pct; }));
        const pad = (maxP - minP) * 0.08 || 5; minP -= pad; maxP += pad;
        const X = (k) => x0 + (k + W) / (2 * W) * (width - x0 - 10);
        const Y = (pct) => 10 + (1 - (pct - minP) / (maxP - minP)) * (height - 30);
        const paths = series.map((s) => `<path d="${s.pts.map((p, ix) => (ix ? "L" : "M") + X(p.k).toFixed(1) + " " + Y(p.pct).toFixed(1)).join(" ")}" fill="none" stroke="${s.color}" stroke-width="${s.cur ? 3 : 2}" ${s.dash ? 'stroke-dasharray="5 4"' : ""} opacity="${s.cur ? 1 : 0.85}"/>`).join("");
        const zx = X(0), y100 = Y(100);
        const ovPts = [];
        series.forEach((s) => s.pts.forEach((p) => { const dl = p.k === 0 ? "Day 0 (วันนี้)" : (p.k > 0 ? "+" : "") + p.k + "d"; let sub = p.pct.toFixed(1) + "% (Day0=100)"; if (s.cur) { const idx = n - 1 + p.k; if (c[idx] > 0) sub = "$" + Math.round(c[idx]).toLocaleString() + " · " + p.pct.toFixed(1) + "%"; } ovPts.push({ x: +X(p.k).toFixed(1), y: +Y(p.pct).toFixed(1), t: esc(String(s.name).split(" · ")[0]), s: dl + " · " + sub }); }));
        chart = `<svg viewBox="0 0 ${width} ${height}" class="bi-ov-svg bi-hoverchart" data-cw="${width}" data-ch="${height}" data-pts='${JSON.stringify(ovPts).replace(/'/g, "&#39;").replace(/</g, "&lt;")}' preserveAspectRatio="none">
          <line x1="${x0}" y1="${y100.toFixed(1)}" x2="${width}" y2="${y100.toFixed(1)}" stroke="var(--mc-border)" stroke-dasharray="3 3"/>
          <line x1="${zx.toFixed(1)}" y1="0" x2="${zx.toFixed(1)}" y2="${height - 20}" stroke="var(--mc-muted)" stroke-width="1.4"/>
          <text x="${zx.toFixed(1)}" y="${height - 5}" fill="var(--mc-muted)" font-size="12" text-anchor="middle">Day 0</text>
          <text x="${x0 + 4}" y="${height - 5}" fill="var(--mc-muted)" font-size="11">−${W}d</text>
          <text x="${width - 4}" y="${height - 5}" fill="var(--mc-muted)" font-size="11" text-anchor="end">+${W}d</text>
          ${paths}
          <line class="bi-cross" x1="0" y1="6" x2="0" y2="${height - 20}" stroke="var(--mc-cyan)" stroke-width="1" stroke-dasharray="2 3" style="display:none"/>
          <circle class="bi-crossdot" r="4.5" fill="var(--mc-cyan)" stroke="#0b1220" stroke-width="1.5" style="display:none"/></svg>`;
      }
    } else {
      // fallback (no price cache): stepped forward paths from each case's returns bundle
      const hs = [0, 30, 60, 90, 180, 365].filter((h) => h <= W);
      cases.forEach((cs, i) => { const rr = cs.returns || {}; const pts = hs.map((h) => ({ k: h, pct: h === 0 ? 100 : (rr[h] != null ? 100 * (1 + rr[h] / 100) : null) })).filter((p) => p.pct != null); if (pts.length > 1) series.push({ name: cs.date + " · " + cs.marketPhase, color: colors[i], pts, dash: true }); });
      if (series.length) {
        let minP = 100, maxP = 100; series.forEach((s) => s.pts.forEach((p) => { if (p.pct < minP) minP = p.pct; if (p.pct > maxP) maxP = p.pct; }));
        const pad = (maxP - minP) * 0.08 || 5; minP -= pad; maxP += pad;
        const X = (k) => x0 + k / W * (width - x0 - 10);
        const Y = (pct) => 10 + (1 - (pct - minP) / (maxP - minP)) * (height - 30);
        const paths = series.map((s) => `<path d="${s.pts.map((p, ix) => (ix ? "L" : "M") + X(p.k).toFixed(1) + " " + Y(p.pct).toFixed(1)).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="5 4"/>`).join("");
        const ovPts = [];
        series.forEach((s) => s.pts.forEach((p) => { ovPts.push({ x: +X(p.k).toFixed(1), y: +Y(p.pct).toFixed(1), t: esc(String(s.name).split(" · ")[0]), s: "+" + p.k + "d · " + p.pct.toFixed(1) + "% (Day0=100)" }); }));
        chart = `<svg viewBox="0 0 ${width} ${height}" class="bi-ov-svg bi-hoverchart" data-cw="${width}" data-ch="${height}" data-pts='${JSON.stringify(ovPts).replace(/'/g, "&#39;").replace(/</g, "&lt;")}' preserveAspectRatio="none">
          <line x1="${x0}" y1="${Y(100).toFixed(1)}" x2="${width}" y2="${Y(100).toFixed(1)}" stroke="var(--mc-border)" stroke-dasharray="3 3"/>
          <circle cx="${X(0).toFixed(1)}" cy="${Y(100).toFixed(1)}" r="4" fill="var(--mc-text)"/>
          <text x="${X(0).toFixed(1)}" y="${height - 5}" fill="var(--mc-muted)" font-size="12">Day 0</text>
          <text x="${width - 4}" y="${height - 5}" fill="var(--mc-muted)" font-size="11" text-anchor="end">+${W}d</text>
          ${paths}
          <line class="bi-cross" x1="0" y1="6" x2="0" y2="${height - 20}" stroke="var(--mc-cyan)" stroke-width="1" stroke-dasharray="2 3" style="display:none"/>
          <circle class="bi-crossdot" r="4.5" fill="var(--mc-cyan)" stroke="#0b1220" stroke-width="1.5" style="display:none"/></svg>`;
      }
    }
    legend = series.map((s) => `<span class="bi-ov-leg"><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("");
    return section("bi-overlay", "🧬 Price Overlay — Historical Analog Comparison", (cache ? "ทาบเส้นราคาปัจจุบัน (ก่อนถึงวันนี้) กับกรณีที่คล้ายที่สุด 3 กรณี (เดินหน้าหลังวันคล้าย)" : "เปรียบเทียบกรณีที่คล้ายที่สุด 3 กรณี (เดินหน้าหลังวันคล้าย)") + " · ทุกเส้น = 100% ที่ Day 0 · ไม่ใช่การพยากรณ์",
      `<div class="bi-hsel">${winBtns}</div><div class="bi-ov-wrap">${chart || '<div class="mc-empty"><strong>ข้อมูลราคายังไม่พร้อม</strong>กด Load Latest Data</div>'}</div><div class="bi-ov-legend">${legend}</div>`);
  }

  // SECTION 5 — Historical Outcome (prose summary instead of a raw matrix)
  function outcomeSection(bi) {
    const N = bi.decision.setup.occurrenceCount || 0;
    const b = bi.decision.setup.byHorizon[90] || {};
    if (!b.samples) return "";
    const cell = (l, v, cls) => `<div class="bi-out-cell"><small>${esc(l)}</small><strong class="${cls || ""}">${v}</strong></div>`;
    const dir = b.positivePct >= 55 ? "มักเป็นบวก" : b.positivePct >= 45 ? "ให้ผลก้ำกึ่ง" : "มักเป็นลบ";
    const vol = (b.worstReturn != null && b.worstReturn < -25) ? "พร้อมความผันผวนสูง" : "ด้วยความผันผวนปานกลาง";
    const sentence = `ในอดีต โครงสร้างแบบนี้${dir} (${b.avgReturn > 0 ? "+" : ""}${b.avgReturn}% เฉลี่ยใน 90 วัน) ${vol} — เป็นหลักฐานเชิงสถิติ ไม่ใช่การพยากรณ์`;
    return section("bi-outcome", "📈 Historical Outcome", "สรุปสิ่งที่เคยเกิดหลังโครงสร้างแบบวันนี้ (แทนตาราง Probability)",
      `<div class="bi-out-head">ในบรรดา <b>${N.toLocaleString()}</b> กรณีที่โครงสร้างคล้ายวันนี้ในอดีต</div>
       <div class="bi-out-grid">
         ${cell("Positive 90D", b.positivePct + "%", b.positivePct >= 50 ? "bi-pos" : "bi-neg")}
         ${cell("Average", pctStr(b.avgReturn, true), pctCls(b.avgReturn))}
         ${cell("Median", pctStr(b.medianReturn, true), pctCls(b.medianReturn))}
         ${cell("Avg Drawdown", pctStr(b.avgDrawdown), "bi-neg")}
         ${cell("Worst", pctStr(b.worstReturn, true), "bi-neg")}
         ${cell("Best", pctStr(b.bestReturn, true), "bi-pos")}
       </div>
       <p class="bi-out-sentence">${esc(sentence)}</p>`);
  }

  // SECTION 6 — Pattern Library. Each signal's historical EDGE over baseline ("hold on a random
  // day"), a plain verdict, and a "● firing now" marker → answers "does this signal give an
  // advantage, and is it happening right now?". Sorted by strongest edge.
  function patternLibrarySection(bi) {
    const ps = bi.patternStatistics || {};
    const order = ["BULLISH_RSI_DIVERGENCE", "BEARISH_RSI_DIVERGENCE", "EMA12_BULL_CROSS", "EMA12_BEAR_CROSS", "PRICE_ABOVE_SMA200", "PRICE_BELOW_SMA200", "GOLDEN_CROSS", "DEATH_CROSS", "RSI_BELOW_30", "RSI_ABOVE_70"];
    const h = S.libHorizon;
    const base = (ps._baseline && ps._baseline.byHorizon[h]) || null;
    const baseWin = base && base.positivePct != null ? base.positivePct : 50, baseAvg = base && base.avgReturn != null ? base.avgReturn : 0;
    const hbtns = [30, 90, 180, 365].map((x) => `<button type="button" class="bi-hbtn${x === h ? " is-active" : ""}" data-lib-horizon="${x}">${x}D</button>`).join("");
    const q = (S.libSearch || "").trim().toLowerCase();
    // which patterns are firing RIGHT NOW (from the condition forecast + current conditions)
    const cf = bi.analogForecast && bi.analogForecast.conditionForecast;
    const conds = bi.analogForecast && bi.analogForecast.current && bi.analogForecast.current.conditions;
    const active = {}; const keyMap = { divBull: "BULLISH_RSI_DIVERGENCE", divBear: "BEARISH_RSI_DIVERGENCE", emaBull: "EMA12_BULL_CROSS", emaBear: "EMA12_BEAR_CROSS", rsiLow: "RSI_BELOW_30", rsiHigh: "RSI_ABOVE_70" };
    if (cf && cf.lines) cf.lines.forEach((l) => { if (keyMap[l.key]) active[keyMap[l.key]] = 1; });
    if (conds) { const s2 = conds.find((c) => c.key === "sma200"); if (s2) active[s2.met ? "PRICE_ABOVE_SMA200" : "PRICE_BELOW_SMA200"] = 1; }
    const rowsData = order.filter((k) => ps[k]).map((k) => {
      const p = ps[k], bh = p.byHorizon[h] || {}, wr = bh.positivePct, ar = bh.avgReturn;
      const edgeWin = wr != null ? Math.round(wr - baseWin) : null, edgeAvg = ar != null ? ar - baseAvg : null;
      let verdict, vtone, vicon;
      if (p.occurrences < 15 || wr == null) { verdict = "ตัวอย่างน้อย"; vtone = "muted"; vicon = "🔍"; }
      else if (edgeWin >= 8 || (edgeAvg != null && edgeAvg >= 3)) { verdict = "สถิติได้เปรียบ"; vtone = "bull"; vicon = "📈"; }
      else if (edgeWin <= -8 || (edgeAvg != null && edgeAvg <= -3)) { verdict = "เสียเปรียบ · ระวัง"; vtone = "bear"; vicon = "📉"; }
      else { verdict = "พอ ๆ กับปกติ"; vtone = "muted"; vicon = "➖"; }
      const sortKey = (p.occurrences < 15 || edgeWin == null) ? -999 : edgeWin + (active[k] ? 0.5 : 0);
      return { k, p, wr, ar, edgeWin, verdict, vtone, vicon, sortKey };
    }).sort((a, b) => b.sortKey - a.sortKey);
    const rows = rowsData.map((d) => {
      const { k, p, wr, ar, edgeWin, verdict, vtone, vicon } = d;
      const label = String(p.label).toLowerCase(), hidden = q && label.indexOf(q) < 0 ? " hidden" : "";
      const edgeChip = edgeWin == null ? "" : `<i class="bi-lib-edge ${edgeWin >= 3 ? "up" : edgeWin <= -3 ? "dn" : "flat"}">${edgeWin > 0 ? "+" : ""}${edgeWin}% vs ปกติ</i>`;
      return `<div class="bi-lib-row2" data-pname="${esc(label)}"${hidden}>
        <span class="bi-lib-name">${active[k] ? '<span class="bi-lib-live" title="สัญญาณนี้กำลังเกิดตอนนี้">●</span>' : ""}${esc(p.label)}${p.bullish ? '<i class="bi-lib-tag bull">bull</i>' : p.bearish ? '<i class="bi-lib-tag bear">bear</i>' : ""}</span>
        <span class="bi-lib-occ">${p.occurrences}<small> ครั้ง</small></span>
        <div class="bi-lib-wr"><div class="bi-lib-wrbar"><i class="${wr >= baseWin ? "bull" : "bear"}" style="width:${wr == null ? 0 : wr}%"></i><b class="bi-lib-basemark" style="left:${Math.round(baseWin)}%" title="เกณฑ์ปกติ ${baseWin}%"></b></div><b>${wr == null ? "—" : wr + "%"}</b>${edgeChip}</div>
        <span class="bi-lib-ar ${pctCls(ar)}">${pctStr(ar, true)}</span>
        <span class="bi-lib-verdict bi-lib-v-${vtone}">${vicon} ${esc(verdict)}</span></div>`;
    }).join("");
    return section("bi-library", "📚 Pattern Library",
      `หลังเกิดแต่ละสัญญาณ ในอดีตราคา "ได้เปรียบ" กว่าการถือปกติแค่ไหน (@ ${h}D) · <b style="color:var(--mc-cyan)">●</b> = กำลังเกิดตอนนี้ · เรียงจากได้เปรียบมากสุด`,
      `<div class="bi-lib-baseline">📏 เกณฑ์ปกติ: ถือ BTC สุ่มวันไหนก็ได้ ${h} วัน → ชนะ <b>${baseWin}%</b> · เฉลี่ย <b class="${pctCls(baseAvg)}">${pctStr(baseAvg, true)}</b>. สัญญาณที่ "ดี" ต้อง <b>ชนะสูงกว่า / เฉลี่ยสูงกว่า</b> เส้นนี้</div>
       <div class="bi-lib-head"><input type="text" class="bi-lib-search" placeholder="ค้นหาสัญญาณ…" data-lib-search="1" value="${esc(S.libSearch)}"/><div class="bi-hsel">${hbtns}</div></div>
       <div class="bi-lib-cols2"><span>สัญญาณ (● = ตอนนี้)</span><span>เคย</span><span>Win Rate เทียบเกณฑ์ (|=ปกติ)</span><span>Avg</span><span>สรุป (ใช้ทำอะไร)</span></div>
       <div class="bi-lib-rows" id="biLibRows">${rows}</div>`);
  }

  // SECTION 7 — Pattern Combination (multi-signal combos from the engine's COMBO_* stats)
  function patternCombinationSection(bi) {
    const ps = bi.patternStatistics || {};
    const combos = ["COMBO_BULL_MOMENTUM", "COMBO_BULL_REVERSAL", "COMBO_GOLDEN_TREND", "COMBO_BEAR_MOMENTUM", "COMBO_BEAR_REVERSAL"].filter((k) => ps[k]);
    if (!combos.length) return "";
    const h = S.libHorizon;
    const cards = combos.map((k) => {
      const p = ps[k], bh = p.byHorizon[h] || {}, wr = bh.positivePct, ar = bh.avgReturn;
      return `<div class="bi-combo ${p.bullish ? "bull" : "bear"}">
        <div class="bi-combo-name">${esc(p.label)}</div>
        <div class="bi-combo-stats"><div><small>Occurrences</small><b>${p.occurrences}</b></div><div><small>Win Rate</small><b class="${wr >= 50 ? "bi-pos" : "bi-neg"}">${wr == null ? "—" : wr + "%"}</b></div><div><small>Avg ${h}D</small><b class="${pctCls(ar)}">${pctStr(ar, true)}</b></div></div></div>`;
    }).join("");
    return section("bi-combo", "🧩 Pattern Combination", `ประเมินหลายสัญญาณร่วมกัน แทนตัวชี้วัดเดี่ยว (@ ${h}D)`, `<div class="bi-combo-grid">${cards}</div>`);
  }

  // SECTION 8 — Historical Replay (modal opened from a case card)
  function replayModal(bi) {
    if (S.replay == null) return "";
    const cs = (bi.similarCases || [])[S.replay]; if (!cs) return "";
    const rr = cs.returns || {}, hs = [0, 30, 60, 90, 180, 365];
    const money = (v) => "$" + Math.round(v).toLocaleString();
    const cache = readHistoryCache();
    const LEAD = 90, FWD = 365, W2 = 720, H2 = 264, x0 = 8; // current lead-in compared over 90 days
    let chart = "", legend = "", note = "";
    // Overlay: current price shape vs the historical case (aligned at Day 0 = match/today),
    // then the historical forward path out to 365 days. Both normalized to 100 at Day 0.
    if (cache && cache.closes.length > LEAD + 5) {
      const cl = cache.closes, n = cl.length, ci = findIdxByDate(cache, cs.date);
      const lead = Math.min(LEAD, ci), fwdAvail = Math.min(FWD, n - 1 - ci);
      if (ci > 0 && lead >= 10 && cl[ci] > 0 && cl[n - 1] > 0) {
        const hbase = cl[ci], cbase = cl[n - 1];
        const hist = []; for (let k = -lead; k <= fwdAvail; k++) if (cl[ci + k] > 0) hist.push({ k, pct: cl[ci + k] / hbase * 100, price: cl[ci + k] });
        const curr = []; for (let k = -lead; k <= 0; k++) { const idx = n - 1 + k; if (idx >= 0 && cl[idx] > 0) curr.push({ k, pct: cl[idx] / cbase * 100, price: cl[idx] }); }
        const xmin = -lead, xmax = Math.max(1, fwdAvail);
        const ys = hist.map((p) => p.pct).concat(curr.map((p) => p.pct));
        let minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys); const pad = (maxY - minY) * 0.06 || 5; minY -= pad; maxY += pad;
        const X = (k) => x0 + (k - xmin) / (xmax - xmin) * (W2 - x0 - 10);
        const Y = (v) => 10 + (1 - (v - minY) / (maxY - minY)) * (H2 - 30);
        const histD = "M" + hist.map((p) => X(p.k).toFixed(1) + " " + Y(p.pct).toFixed(1)).join(" L");
        const currD = "M" + curr.map((p) => X(p.k).toFixed(1) + " " + Y(p.pct).toFixed(1)).join(" L");
        const zx = X(0), y100 = Y(100);
        const marks = [30, 90, 180, 365].filter((h) => h <= fwdAvail).map((h) => `<line x1="${X(h).toFixed(1)}" y1="8" x2="${X(h).toFixed(1)}" y2="${H2 - 20}" stroke="var(--mc-border)" stroke-dasharray="2 4"/><text x="${X(h).toFixed(1)}" y="${H2 - 4}" fill="var(--mc-muted)" font-size="10" text-anchor="middle">+${h}</text>`).join("");
        const pts = [];
        curr.forEach((p) => pts.push({ x: +X(p.k).toFixed(1), y: +Y(p.pct).toFixed(1), t: "ปัจจุบัน · " + (p.k === 0 ? "วันนี้" : p.k + "d"), s: money(p.price) + " · " + (p.pct - 100 >= 0 ? "+" : "") + (p.pct - 100).toFixed(1) + "%" }));
        hist.forEach((p) => pts.push({ x: +X(p.k).toFixed(1), y: +Y(p.pct).toFixed(1), t: "อดีต " + esc(cs.date) + " · " + (p.k === 0 ? "Day 0" : (p.k > 0 ? "+" : "") + p.k + "d"), s: money(p.price) + " · " + (p.pct - 100 >= 0 ? "+" : "") + (p.pct - 100).toFixed(1) + "%" }));
        const ptsAttr = JSON.stringify(pts).replace(/'/g, "&#39;").replace(/</g, "&lt;");
        chart = `<svg viewBox="0 0 ${W2} ${H2}" class="bi-rp-svg bi-hoverchart" data-cw="${W2}" data-ch="${H2}" data-pts='${ptsAttr}' preserveAspectRatio="none">
          <line x1="${x0}" y1="${y100.toFixed(1)}" x2="${W2}" y2="${y100.toFixed(1)}" stroke="var(--mc-border)" stroke-dasharray="3 3"/>
          ${marks}
          <path d="${histD}" fill="none" stroke="var(--mc-cyan)" stroke-width="2" stroke-dasharray="5 4" opacity=".9"/>
          <path d="${currD}" fill="none" stroke="var(--mc-text)" stroke-width="2.8"/>
          <line x1="${zx.toFixed(1)}" y1="0" x2="${zx.toFixed(1)}" y2="${H2 - 18}" stroke="var(--mc-muted)" stroke-width="1.4"/>
          <text x="${zx.toFixed(1)}" y="${H2 - 4}" fill="var(--mc-muted)" font-size="10" text-anchor="middle">Day 0</text>
          <line class="bi-cross" x1="0" y1="6" x2="0" y2="${H2 - 18}" stroke="var(--mc-cyan)" stroke-width="1" stroke-dasharray="2 3" style="display:none"/>
          <circle class="bi-crossdot" r="4.5" fill="var(--mc-cyan)" stroke="#0b1220" stroke-width="1.5" style="display:none"/></svg>`;
        legend = `<div class="bi-rp-legend"><span class="bi-fc-leg"><i style="background:var(--mc-text)"></i>ปัจจุบัน (90 วันล่าสุด)</span><span class="bi-fc-leg"><i class="bi-fc-leg-dash"></i>อดีต ${esc(cs.date)} (ก่อน + หลัง)</span><span class="bi-fc-leg" style="color:var(--mc-muted)">ทาบกันที่ Day 0 = 100%</span></div>`;
        if (fwdAvail < FWD) note = `<div class="bi-rp-note">* เคสนี้มีข้อมูลหลังวันคล้ายเพียง ${fwdAvail} วัน (ยังไม่ครบ 365)</div>`;
      }
    }
    if (!chart) { // fallback: stepped path from the returns bundle (no price cache)
      const pts = hs.map((h) => ({ h, pct: h === 0 ? 100 : (rr[h] != null ? 100 * (1 + rr[h] / 100) : null) })).filter((p) => p.pct != null);
      if (pts.length > 1) {
        const width = 700, height = 170, x0b = 8, maxH = hs[hs.length - 1];
        let minP = Math.min.apply(null, pts.map((p) => p.pct)), maxP = Math.max.apply(null, pts.map((p) => p.pct)); if (minP === maxP) { minP -= 1; maxP += 1; }
        const X = (h) => x0b + h / maxH * (width - 2 * x0b), Y = (pct) => 8 + (1 - (pct - minP) / (maxP - minP)) * (height - 26);
        const d = pts.map((p, i) => (i ? "L" : "M") + X(p.h).toFixed(1) + " " + Y(p.pct).toFixed(1)).join(" ");
        const dots = pts.map((p) => `<circle cx="${X(p.h).toFixed(1)}" cy="${Y(p.pct).toFixed(1)}" r="3.2" fill="${p.pct >= 100 ? "var(--mc-emerald)" : "var(--mc-red)"}"/>`).join("");
        chart = `<svg viewBox="0 0 ${width} ${height}" class="bi-rp-svg" preserveAspectRatio="none"><line x1="${x0b}" y1="${Y(100).toFixed(1)}" x2="${width - x0b}" y2="${Y(100).toFixed(1)}" stroke="var(--mc-border)" stroke-dasharray="3 3"/><path d="${d}" fill="none" stroke="var(--mc-cyan)" stroke-width="2.5"/>${dots}</svg>`;
        note = `<div class="bi-rp-note">* ยังไม่มีข้อมูลราคาแคช — แสดงเฉพาะจุด 30/90/180/365 (กดอัปเดตข้อมูลเพื่อดูกราฟทาบเต็ม)</div>`;
      }
    }
    const steps = hs.map((h) => { const rv = h === 0 ? 0 : (rr[h] != null ? rr[h] : null); return `<div class="bi-rp-step"><span class="bi-rp-day">Day ${h}</span><span class="bi-rp-val ${h === 0 ? "" : pctCls(rv)}">${h === 0 ? "100%" : (rv == null ? "—" : pctStr(rv, true))}</span></div>`; }).join("");
    return `<div class="bi-modal"><div class="bi-modal-card bi-modal-wide">
      <div class="bi-modal-head"><div><h3>Historical Replay · ${esc(cs.date)}</h3><span class="mc-sub">${esc(cs.marketPhase)} · Similarity ${cs.similarity}% · PS ${cs.patternScore} — ทาบรูปราคาปัจจุบันกับอดีต แล้วดูผลจริง 30/90/180/365 วัน · ไม่ใช่การพยากรณ์</span></div><button type="button" class="bi-modal-x">✕</button></div>
      ${chart}
      ${legend}
      <div class="bi-rp-steps">${steps}</div>
      ${note}
      <div class="bi-rp-foot">Max Drawdown 90D <b class="bi-neg">${pctStr(cs.maxDrawdown90)}</b></div>
    </div></div>`;
  }

  // Research accordion — raw statistics moved out of the main decision flow (collapsed by default)
  function researchAccordion(bi) {
    const open = S.research;
    const inner = open ? (filterSection(bi) + probabilitySection(bi) + matrixSection(bi) + distributionSection(bi) + timelineSection(bi) + rankingSection(bi) + heatmapSection(bi) + mtfSection(bi) + evolutionSection(bi) + similaritySection(bi) + dataQualitySection(bi)) : "";
    return `<section class="mc-card mc-panel mc-fade bi-research" id="bi-research">
      <button type="button" class="bi-research-toggle" data-research="1"><span>🔬 Research &amp; Raw Statistics</span><span class="bi-research-chev">${open ? "▲" : "▼"}</span></button>
      <div class="bi-research-caption">Ranking · Probability Matrix · Distribution · Timeline · Heatmap · Multi-Timeframe · Pattern Evolution — เชิงลึก (ซ่อนไว้โดยค่าเริ่มต้น)</div>
      ${open ? `<div class="bi-research-body">${inner}</div>` : ""}</section>`;
  }

  function body(bi) {
    return refreshBar(bi) +
      dnaSection(bi) +               // 1 · Current Market DNA
      conditionMonitorSection(bi) +  // ✓/✗ conditions + days-in-condition (no weighted score)
      analogForecastSection(bi) +    // ★ Pattern Forecast (analog projection 30/60/90d)
      interpretationSection(bi) +    // 9 · Interpretation (decision-first)
      similarCasesSection(bi) +      // 3 · Most Similar Historical Cases
      overlaySection(bi) +           // 4 · Price Overlay
      outcomeSection(bi) +           // 5 · Historical Outcome
      playbookSection(bi) +          // Phase 4 · signature handbook
      cycleSection(bi) +             // Phase 3 · cycle context
      patternLibrarySection(bi) +    // 6 · Pattern Library
      patternCombinationSection(bi) +// 7 · Pattern Combination
      researchAccordion(bi) +        // research (collapsed)
      replayModal(bi);               // 8 · Historical Replay (modal)
  }

  function rerender() {
    const el = document.getElementById("btcTabBody");
    if (el) el.innerHTML = window.BitcoinIntelligenceUI.html(snapshot());
  }

  // ---------------------------------------------------------------- chart hover tooltip
  let _tip = null;
  function showTip(x, y, t, s) {
    if (!_tip) { _tip = document.createElement("div"); _tip.className = "bi-chart-tip"; document.body.appendChild(_tip); }
    _tip.innerHTML = `<b>${t}</b>${s ? `<span>${s}</span>` : ""}`;
    _tip.style.display = "block";
    const w = _tip.offsetWidth, h = _tip.offsetHeight, o = 16;
    let px = x + o, py = y + o;
    if (px + w > window.innerWidth - 8) px = x - w - o;
    if (py + h > window.innerHeight - 8) py = y - h - o;
    _tip.style.left = Math.max(4, px) + "px"; _tip.style.top = Math.max(4, py) + "px";
  }
  function hideTip() { if (_tip) _tip.style.display = "none"; }
  function handleChartHover(e) {
    const svg = e.target && e.target.closest ? e.target.closest(".bi-hoverchart") : null;
    if (!svg) { hideTip(); return; }
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) { hideTip(); return; }
    let pts = svg._pts;
    if (!pts) { try { pts = JSON.parse(svg.getAttribute("data-pts") || "[]"); } catch (_) { pts = []; } svg._pts = pts; }
    if (!pts.length) { hideTip(); return; }
    const vbW = Number(svg.dataset.cw) || 1000, vbH = Number(svg.dataset.ch) || 300;
    const mx = (e.clientX - rect.left) / rect.width * vbW, my = (e.clientY - rect.top) / rect.height * vbH;
    let best = null, bd = Infinity;
    for (const p of pts) { const dx = p.x - mx, dy = (p.y != null ? p.y - my : 0), d = dx * dx * 8 + dy * dy; if (d < bd) { bd = d; best = p; } }
    if (!best) { hideTip(); return; }
    showTip(e.clientX, e.clientY, best.t, best.s || "");
    const cross = svg.querySelector(".bi-cross"); if (cross) { cross.setAttribute("x1", best.x); cross.setAttribute("x2", best.x); cross.style.display = ""; }
    const dot = svg.querySelector(".bi-crossdot"); if (dot && best.y != null) { dot.setAttribute("cx", best.x); dot.setAttribute("cy", best.y); dot.style.display = ""; }
  }

  window.BitcoinIntelligenceUI = {
    html(snap) {
      const bi = BI(snap);
      if (!bi) return emptyNoIntel();
      if (!bi.available || !bi.decision) return notReady(bi);
      return body(bi);
    },
    wire(bodyEl) {
      wireLoadListeners();
      if (!bodyEl || bodyEl._biWired) return;
      bodyEl._biWired = true;
      bodyEl.addEventListener("click", (e) => {
        // Historical Replay modal: close on ✕ or backdrop; ignore clicks inside the card
        if (e.target.closest(".bi-modal")) { if (e.target.closest(".bi-modal-x") || e.target.classList.contains("bi-modal")) { S.replay = null; rerender(); } return; }
        const lb = e.target.closest("[data-bi-load]");
        if (lb) { runLoad(); return; }
        const rp = e.target.closest("[data-replay]");
        if (rp) { S.replay = Number(rp.dataset.replay); rerender(); return; }
        const ow = e.target.closest("[data-overlay-win]");
        if (ow) { S.overlayWin = Number(ow.dataset.overlayWin); rerender(); return; }
        const lh = e.target.closest("[data-lib-horizon]");
        if (lh) { S.libHorizon = Number(lh.dataset.libHorizon); rerender(); return; }
        const rt = e.target.closest("[data-research]");
        if (rt) { S.research = !S.research; rerender(); return; }
        const hb = e.target.closest("[data-horizon]");
        if (hb) { S.horizon = Number(hb.dataset.horizon); rerender(); return; }
        const fb = e.target.closest("[data-filter]");
        if (fb) {
          const dim = fb.dataset.filter, val = fb.dataset.val;
          if (dim === "clear") S.filters = {};
          else if (S.filters[dim] === val) delete S.filters[dim];
          else S.filters[dim] = val;
          rerender(); return;
        }
        const dot = e.target.closest("[data-date]");
        if (dot) { S.sel = (S.sel === dot.dataset.date) ? null : dot.dataset.date; rerender(); return; }
        const srow = e.target.closest(".bi-sim-row");
        if (srow) { const d = bodyEl.querySelector(`.bi-sim-detail[data-idx="${srow.dataset.idx}"]`); if (d) d.hidden = !d.hidden; return; }
      });
      // Pattern Library search: filter rows live (no rerender → input keeps focus)
      bodyEl.addEventListener("input", (e) => {
        const si = e.target.closest("[data-lib-search]");
        if (!si) return;
        S.libSearch = si.value;
        const q = si.value.trim().toLowerCase();
        bodyEl.querySelectorAll("#biLibRows .bi-lib-row2").forEach((r) => { r.hidden = !!q && String(r.dataset.pname).indexOf(q) < 0; });
      });
      // Chart hover: show the price/value at the hovered point (forecast + overlay charts)
      bodyEl.addEventListener("mousemove", handleChartHover);
      bodyEl.addEventListener("mouseleave", hideTip);
    }
  };
})();
