(function () {
  "use strict";

  // ============================================================
  // Mission Control — decision-first institutional homepage.
  // Order: Today's Decision -> Alignment -> Regime -> Money Flow -> Lead-Lag
  //        -> Portfolio Impact -> Suggested Allocation -> Action Queue
  //        -> Portfolio Health -> Regime History.
  // PRESENTATION ONLY. Consumes window.MarketRegime + the snapshot read-only;
  // no engine / snapshot / provider / calculation changes.
  // ============================================================

  const root = document.getElementById("mcRoot");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function fin(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function pct(v, d) { const n = fin(v); return n == null ? "—" : n.toFixed(d == null ? 0 : d) + "%"; }
  function snapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function regime() { try { return window.MarketRegime && window.MarketRegime.compute ? window.MarketRegime.compute(snapshot()) : null; } catch (e) { return null; } }
  const ARROW = { up: "▲", down: "▼", flat: "→" };

  // ---------------------------------------------------------------- holdings / exposure
  const STARS = { AI: 5, Bitcoin: 5, "US Tech": 4, Gold: 3, Healthcare: 2, Utilities: 2, Defensive: 2, Cash: 1, Other: 3 };
  // Quarterly Editor asset types (see public/app.js TYPE_LABELS) → display label + color.
  const Q_TYPES = {
    bitcoin: { label: "Bitcoin", color: "#f59e0b" },
    "foreign-stock": { label: "หุ้นต่างประเทศ", color: "#3b82f6" },
    "thai-stock": { label: "หุ้นไทย", color: "#a855f7" },
    "provident-fund": { label: "เงินสำรองเลี้ยงชีพ", color: "#14b8a6" },
    "rmf-jang": { label: "RMF-จัง", color: "#0ea5e9" },
    "rmf-tum": { label: "RMF-ตุ๋ม", color: "#8b5cf6" },
    cash: { label: "เงินสด", color: "#94a3b8" },
    custom: { label: "อื่นๆ", color: "#64748b" }
  };
  let qpCache = null, qpTried = false; // one-time direct /api/portfolio fetch if the snapshot lacks it
  function ensureQuarterly() {
    if (qpTried) return;
    const snap = snapshot(), ps = snap && snap.portfolioStatus;
    if (ps && (ps.data || ps.quarters)) return; // snapshot already carries it
    qpTried = true;
    try {
      (window.fetch)("/api/portfolio", { cache: "no-store" })
        .then((r) => (r && r.ok ? r.json() : null))
        .then((j) => { if (j) { qpCache = j; render(); } })
        .catch(() => {});
    } catch (e) {}
  }
  // Current-quarter holdings from the Quarterly Editor (grouped by type + per-asset).
  function quarterlyPortfolio() {
    const snap = snapshot(), ps = (snap && snap.portfolioStatus) || qpCache;
    const data = ps && (ps.data || (ps.quarters ? ps : null));
    if (!data || !data.quarters || typeof data.quarters !== "object") return null;
    const keys = Object.keys(data.quarters);
    if (!keys.length) return null;
    const key = (data.currentQuarter && data.quarters[data.currentQuarter]) ? data.currentQuarter : keys.slice().sort().reverse()[0];
    const quarter = data.quarters[key];
    const assets = (quarter && Array.isArray(quarter.assets)) ? quarter.assets : [];
    const rows = assets.map((a) => {
      const gross = fin(a.snapshotValue) != null ? fin(a.snapshotValue) : (fin(a.manualValue) || 0);
      const t = Q_TYPES[a.type] || { label: a.type || "อื่นๆ", color: "#64748b" };
      const inv = a.type === "cash" ? 0 : Math.max(0, Math.min(100, fin(a.investedPercent) || 0));
      return { name: a.name || t.label, type: a.type, typeLabel: t.label, color: t.color, gross: gross || 0, invested: inv };
    }).filter((r) => r.gross > 0);
    if (!rows.length) return null;
    const total = rows.reduce((s, r) => s + r.gross, 0) || 1;
    rows.forEach((r) => { r.pct = r.gross / total * 100; });
    rows.sort((a, b) => b.gross - a.gross);
    const bt = {};
    rows.forEach((r) => { const g = bt[r.type] || (bt[r.type] = { type: r.type, label: r.typeLabel, color: r.color, gross: 0 }); g.gross += r.gross; });
    const byType = Object.values(bt).map((g) => ({ type: g.type, label: g.label, color: g.color, gross: g.gross, pct: g.gross / total * 100 })).sort((a, b) => b.gross - a.gross);
    let cashSum = 0, investedSum = 0;
    rows.forEach((r) => { if (r.type === "cash") cashSum += r.gross; else { investedSum += r.gross * r.invested / 100; cashSum += r.gross * (1 - r.invested / 100); } });
    return { key, rows, byType, total, count: rows.length, cashSum, investedSum };
  }
  function categorize(h) {
    const s = String(h.canonicalSymbol || h.symbol || "").toUpperCase();
    const n = String(h.assetName || h.name || "").toUpperCase();
    const t = String(h.assetType || "").toUpperCase();
    const blob = s + " " + n + " " + t;
    if (/BTC|BITCOIN|CRYPTO|ETH|DIGITAL ASSET/.test(blob)) return "Bitcoin";
    if (/GLD|IAU|\bGOLD\b|ทอง|XAU|GC=F/.test(blob)) return "Gold";
    if (/CASH|เงินสด|MONEY MARKET|T-?BILL|TREASURY BILL|กองทุนตลาดเงิน/.test(blob)) return "Cash";
    if (/AI|ARTIFICIAL|SEMICONDUCT|ROBOT|NVDA|NVIDIA|CHIP|GTECH|GENOMIC/.test(blob)) return "AI";
    if (/NASDAQ|NDQ|QQ|XLK|USXNDQ|TECH|SOFTWARE|^IXIC|^NDX/.test(blob)) return "US Tech";
    if (/HEALTH|XLV|PHARMA|BIOTECH|MEDICAL|สุขภาพ/.test(blob)) return "Healthcare";
    if (/UTILIT|XLU|สาธารณูปโภค|INFRA/.test(blob)) return "Utilities";
    if (/BOND|พันธบัตร|FIXED INCOME|DEFENS|VALUE|DIVIDEND/.test(blob)) return "Defensive";
    return "Other";
  }
  function readHoldings() {
    const snap = snapshot();
    const ph = snap && snap.portfolioHoldings;
    let arr = (ph && Array.isArray(ph.data) && ph.data) || (Array.isArray(ph) ? ph : null);
    if (!arr || !arr.length) return null;
    arr = arr.filter((h) => h && (h.isHolding == null || h.isHolding) && (fin(h.marketValue) || fin(h.targetWeight)));
    if (!arr.length) return null;
    const useMv = arr.some((h) => fin(h.marketValue));
    const total = arr.reduce((s, h) => s + (useMv ? (fin(h.marketValue) || 0) : (fin(h.targetWeight) || 0)), 0) || 1;
    const buckets = {};
    arr.forEach((h) => {
      const cat = categorize(h);
      const w = (useMv ? (fin(h.marketValue) || 0) : (fin(h.targetWeight) || 0)) / total * 100;
      buckets[cat] = (buckets[cat] || 0) + w;
    });
    const top = arr.map((h) => (useMv ? (fin(h.marketValue) || 0) : (fin(h.targetWeight) || 0)) / total * 100).sort((a, b) => b - a)[0] || 0;
    return { buckets, count: arr.length, top };
  }
  // current portfolio collapsed into the engine's 5 suggested buckets
  function currentBuckets(H) {
    if (!H) return null;
    return {
      cash: H.buckets.Cash || 0,
      usTech: (H.buckets["US Tech"] || 0) + (H.buckets.AI || 0),
      bitcoin: H.buckets.Bitcoin || 0,
      gold: H.buckets.Gold || 0,
      defensive: (H.buckets.Healthcare || 0) + (H.buckets.Utilities || 0) + (H.buckets.Defensive || 0) + (H.buckets.Other || 0)
    };
  }

  // ---------------------------------------------------------------- gauge + bits
  function gauge(score, color, size) {
    size = size || 220;
    const r = 82, C = 2 * Math.PI * r, prog = Math.max(0, Math.min(100, score)) / 100 * C;
    return `<svg class="mcx-gauge-svg" viewBox="0 0 200 200" width="${size}" height="${size}">
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(148,163,184,0.14)" stroke-width="14"/>
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${prog.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 100 100)" style="transition:stroke-dasharray .9s cubic-bezier(.22,1,.36,1)"/>
      <text x="100" y="92" text-anchor="middle" class="mcx-gauge-num" fill="${color}">${score}</text>
      <text x="100" y="120" text-anchor="middle" class="mcx-gauge-den">/ 100</text>
    </svg>`;
  }
  function trendChip(t) { const m = { up: ["bull", "▲"], down: ["bear", "▼"], flat: ["muted", "→"] }[t] || ["muted", "→"]; return `<span class="mcx-tr mcx-tr-${m[0]}">${m[1]}</span>`; }
  function toneColor(t) { return t === "bull" ? "var(--mc-emerald)" : t === "bear" ? "var(--mc-red)" : t === "warn" ? "var(--mc-amber)" : t === "watch-bull" ? "var(--mc-amber)" : t === "neutral" ? "var(--mc-blue)" : "var(--mc-muted)"; }

  // ============================================================ SECTIONS

  // ---- 1. Today's Decision (hero) ----
  function decisionHero(R) {
    if (!R) return "";
    const a = R.action, conf = R.confidence;
    const reasons = (R.reasons.length ? R.reasons : ["ยังไม่มีสัญญาณเด่นพอ"]).slice(0, 4);
    return `<section class="mcx-decision mcx-acc-${a.tone} mc-fade">
      <p class="mc-eyebrow">Today's Decision · Market Regime</p>
      <div class="mcx-decision-top">
        <div class="mcx-decision-action" style="color:${toneColor(a.tone)}">
          <small>Today's Portfolio Action</small>
          <strong>${esc(a.thai)}</strong>
          <span>${esc(a.label)}</span>
        </div>
        <div class="mcx-decision-score">
          <div class="mcx-ds-num" style="color:${R.color}">${R.score}</div>
          <div class="mcx-ds-regime" style="color:${R.color}">${esc(R.regime.label)}</div>
          <div class="mcx-ds-conf">Confidence <b class="mcx-conf-${conf.key}">${esc(conf.label)}</b></div>
        </div>
      </div>
      <div class="mcx-reason-chips">${reasons.map((r) => `<span class="mcx-reason-chip">✓ ${esc(r)}</span>`).join("")}</div>
    </section>`;
  }

  // ---- 2. Portfolio Alignment ----
  function alignmentDetail(H, R) {
    if (!H || !R) return null;
    const cur = currentBuckets(H);
    const sug = {}; R.suggestedAllocation.forEach((a) => { sug[a.key] = a.pct; });
    const names = { usTech: "US Tech (incl. AI)", bitcoin: "Bitcoin", gold: "Gold", cash: "Cash", defensive: "Defensive" };
    let totalAbs = 0;
    const rows = ["usTech", "bitcoin", "gold", "cash", "defensive"].map((k) => {
      const c = cur[k] || 0, s = sug[k] || 0, d = c - s; totalAbs += Math.abs(d);
      const tag = d > 6 ? { k: "over", t: "Overweight" } : d < -6 ? { k: "under", t: "Underweight" } : { k: "bal", t: "Balanced" };
      return { name: names[k], cur: c, sug: s, diff: d, tag };
    });
    const score = Math.max(0, Math.min(100, Math.round(100 - totalAbs / 2)));
    const label = score >= 85 ? "Excellent" : score >= 65 ? "Good" : "Needs Rebalance";
    const key = score >= 85 ? "good" : score >= 65 ? "ok" : "poor";
    return { score, label, key, rows };
  }
  function alignmentSection() {
    const P = quarterlyPortfolio();
    if (!P) return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🧭 Portfolio Alignment</h2><span class="mc-sub">สินทรัพย์จริงในพอร์ต (Quarterly Editor)</span></div></div>
      <div class="mc-empty"><strong>ยังไม่มีข้อมูลพอร์ตจาก Quarterly Editor</strong>กด Load Latest Data — หรือไปเพิ่มสินทรัพย์ที่หน้า Quarterly Editor ก่อน</div></section>`;
    const money = (v) => "฿" + Math.round(v).toLocaleString();
    const investedPct = P.total > 0 ? P.investedSum / P.total * 100 : 0, cashPct = 100 - investedPct;
    const typeBars = P.byType.map((g) => `<div class="mcx-pf-row">
      <span class="mcx-pf-dot" style="background:${g.color}"></span>
      <span class="mcx-pf-name">${esc(g.label)}</span>
      <div class="mcx-pf-bar"><i style="width:${g.pct.toFixed(1)}%;background:${g.color}"></i></div>
      <span class="mcx-pf-pct">${g.pct.toFixed(1)}%</span>
      <span class="mcx-pf-val">${money(g.gross)}</span>
    </div>`).join("");
    const assetRows = P.rows.map((r) => `<div class="mcx-pf-arow">
      <span class="mcx-pf-adot" style="background:${r.color}"></span>
      <span class="mcx-pf-aname">${esc(r.name)}<small>${esc(r.typeLabel)}</small></span>
      <span class="mcx-pf-aval">${money(r.gross)}</span>
      <span class="mcx-pf-apct">${r.pct.toFixed(1)}%</span>
    </div>`).join("");
    return `<section class="mc-card mc-panel mc-fade mcx-pf">
      <div class="mc-panel-head"><div><h2>🧭 Portfolio Alignment</h2><span class="mc-sub">สินทรัพย์จริงในพอร์ต · ไตรมาส ${esc(P.key)}</span></div></div>
      <div class="mcx-pf-hero">
        <div><small>มูลค่ารวม</small><strong>${money(P.total)}</strong></div>
        <div><small>สินทรัพย์</small><strong>${P.count} รายการ</strong></div>
        <div><small>ลงทุน / เงินสด</small><strong>${investedPct.toFixed(0)}% / ${cashPct.toFixed(0)}%</strong></div>
      </div>
      <div class="mcx-pf-splitbar" title="ลงทุน ${investedPct.toFixed(0)}% · เงินสด ${cashPct.toFixed(0)}%"><i style="width:${investedPct.toFixed(1)}%"></i></div>
      <div class="mcx-pf-subhead">สัดส่วนตามประเภท</div>
      <div class="mcx-pf-types">${typeBars}</div>
      <div class="mcx-pf-subhead">รายการสินทรัพย์ (${P.count})</div>
      <div class="mcx-pf-assets">${assetRows}</div>
    </section>`;
  }

  // ---- 3. Market Regime (gauge + component contributions + expand) ----
  function regimeSection(R) {
    if (!R) return "";
    const contribRows = R.components.map((c) => {
      if (!c.available) return `<div class="mcx-contrib-row mcx-contrib-off">
        <span class="mcx-contrib-name">${esc(c.label)}</span>
        <span class="mcx-contrib-w">${c.weight}%</span>
        <div class="mcx-contrib-bar"></div>
        <span class="mcx-pill mcx-pill-muted">Plug-in</span></div>`;
      const fillPct = Math.max(0, Math.min(100, (c.contribution / c.weight) * 100));
      return `<div class="mcx-contrib-row">
        <span class="mcx-contrib-name">${esc(c.label)} <em>${esc(c.displayValue || "")}</em></span>
        <span class="mcx-contrib-w">${c.weight}%</span>
        <div class="mcx-contrib-bar"><i style="width:${fillPct.toFixed(0)}%;background:${c.status === "improving" ? "var(--mc-emerald)" : c.status === "weakening" ? "var(--mc-red)" : "var(--mc-amber)"}"></i></div>
        <span class="mcx-contrib-val">${trendChip(c.trend1m)} ${c.contribution}</span></div>`;
    }).join("");
    const gold = R.gold;
    const detail = `<div class="mcx-regime-detail">
      ${R.reasons.length ? `<div><h4>เหตุผลสนับสนุน</h4><ul class="mcx-ul">${R.reasons.map((x) => `<li>✓ ${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${R.warnings.length ? `<div><h4>ข้อควรระวัง</h4><ul class="mcx-ul mcx-ul-warn">${R.warnings.map((x) => `<li>⚠ ${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <div><h4>ส่วนเสริม</h4><ul class="mcx-ul">
        <li>Gold (safe haven): ${gold.available ? esc(gold.displayValue) + " · 3M " + (gold.trend3m === "up" ? "▲" : gold.trend3m === "down" ? "▼" : "→") : "ยังไม่เชื่อมข้อมูล"}</li>
        <li>Data coverage: ${R.coverage}% · GLI & Fed Net Liquidity ยังเป็น plug-in (renormalised)</li>
      </ul></div>
    </div>`;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🌐 Market Regime</h2><span class="mc-sub">คะแนน · ความเชื่อมั่น · ส่วนประกอบที่ถ่วงน้ำหนัก</span></div></div>
      <div class="mcx-regime">
        <div class="mcx-regime-gauge">${gauge(R.score, R.color, 180)}<div class="mcx-hero-band" style="color:${R.color}">${esc(R.regime.label)}</div>
          <div class="mcx-ds-conf">Confidence <b class="mcx-conf-${R.confidence.key}">${esc(R.confidence.label)}</b></div></div>
        <div class="mcx-contrib">${contribRows}</div>
      </div>
      <details class="mcx-expand"><summary>ดูรายละเอียดส่วนประกอบ (เหตุผล · Gold · coverage)</summary>${detail}</details>
    </section>`;
  }

  // ---- 4. Money Flow ----
  function moneyFlowSection(R) {
    const dxy = R ? R.components.find((c) => c.key === "dxy" && c.available) : null;
    const dollarWeak = dxy && dxy.trend3m === "down";
    const liqUp = R && R.score >= 50;
    const btc = R && R.components.find((c) => c.key === "btcMa200" && c.available);
    const nas = R && R.components.find((c) => c.key === "nasdaqHH" && c.available);
    const toneOf = (st) => st === true || st === "improving" ? "bull" : st === false || st === "weakening" ? "bear" : "neutral";
    const nodes = [
      { t: "Liquidity", tone: toneOf(liqUp) },
      { t: "Dollar", tone: toneOf(dollarWeak ? "improving" : dxy && dxy.trend3m === "up" ? "weakening" : "neutral") },
      { t: "Risk Assets", tone: toneOf(liqUp && (dollarWeak || !dxy)) },
      { t: "Technology", tone: nas ? toneOf(nas.status) : "neutral" },
      { t: "Bitcoin", tone: btc ? toneOf(btc.status) : "neutral" },
      { t: "Gold", tone: toneOf(R && R.gold.available ? (R.gold.trend3m === "up" ? "improving" : R.gold.trend3m === "down" ? "weakening" : "neutral") : "neutral") }
    ];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>💧 Money Flow</h2><span class="mc-sub">เส้นทางเงินทุน (เขียว=หนุน · เหลือง=กลาง · แดง=กดดัน)</span></div></div>
      <div class="mcx-flow">${nodes.map((n, i) => `
        <div class="mcx-flow-node mcx-flow-${n.tone}">${esc(n.t)}</div>
        ${i < nodes.length - 1 ? `<div class="mcx-flow-arrow mcx-flow-${nodes[i + 1].tone}">→</div>` : ""}`).join("")}</div>
      <p class="mcx-foot-note">${dollarWeak ? "ดอลลาร์อ่อน → เปิดทางสินทรัพย์เสี่ยง" : "ดอลลาร์แข็ง/สภาพคล่องตึง → ระวังแรงกดดัน"}</p>
    </section>`;
  }

  // ---- 5. Lead-Lag (with current stage) ----
  function leadLagSection(R) {
    const btc = R && R.components.find((c) => c.key === "btcMa200" && c.available);
    const nas = R && R.components.find((c) => c.key === "nasdaqHH" && c.available);
    let activeIdx = R && R.score >= 50 ? 0 : -1;            // Liquidity
    if (btc && btc.status === "improving") activeIdx = Math.max(activeIdx, 1);
    if (nas && nas.status !== "weakening") activeIdx = Math.max(activeIdx, 2);
    const steps = [
      { t: "Global Liquidity", d: "จุดเริ่มของวัฏจักร", lag: "" },
      { t: "Bitcoin", d: "มักนำสินทรัพย์เสี่ยง", lag: "ตามสภาพคล่อง ~6–10 สัปดาห์" },
      { t: "Nasdaq / Tech", d: "หุ้นเติบโตตามมา", lag: "ตาม BTC ~2–6 สัปดาห์" },
      { t: "Economy", d: "เศรษฐกิจจริงตามหลัง", lag: "ตามตลาด ~3–6 เดือน" }
    ];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>⏱️ Lead–Lag Timeline</h2><span class="mc-sub">ลำดับการส่งผ่านที่ "มักเกิดในอดีต" — ข้อมูลประกอบ ไม่ใช่การพยากรณ์</span></div></div>
      <div class="mcx-leadlag">${steps.map((s, i) => `
        <div class="mcx-ll-step${i === activeIdx ? " mcx-ll-active" : ""}">
          <div class="mcx-ll-dot">${i + 1}</div>
          <div class="mcx-ll-body"><strong>${esc(s.t)}${i === activeIdx ? ' <span class="mcx-ll-now">ตอนนี้</span>' : ""}</strong><span>${esc(s.d)}</span>${s.lag ? `<em class="mcx-ll-lag">${esc(s.lag)}</em>` : ""}</div>
        </div>${i < steps.length - 1 ? '<div class="mcx-ll-arrow">↓</div>' : ""}`).join("")}</div>
      <p class="mcx-foot-note">Typical historical lead-lag relationship · ใช้ประกอบการตัดสินใจ</p>
    </section>`;
  }

  // ---- 6. Portfolio Impact ----
  function portfolioImpactSection(R) {
    const H = readHoldings();
    if (!H) return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>📊 Portfolio Impact</h2><span class="mc-sub">macro กระทบพอร์ตคุณแค่ไหน</span></div></div>
      <div class="mc-empty"><strong>ยังไม่มีข้อมูลพอร์ต</strong>กด Load Latest Data เพื่อดึงสัดส่วนการถือครองจริง</div></section>`;
    const order = ["AI", "US Tech", "Bitcoin", "Gold", "Healthcare", "Utilities", "Defensive", "Cash", "Other"];
    const rows = order.filter((k) => H.buckets[k] > 0.05).map((k) => {
      const w = H.buckets[k], stars = STARS[k] || 3;
      return `<div class="mcx-imp-row">
        <span class="mcx-imp-cat">${esc(k)}</span>
        <div class="mcx-imp-bar"><i style="width:${Math.min(100, w).toFixed(1)}%"></i></div>
        <span class="mcx-imp-pct">${w.toFixed(0)}%</span>
        <span class="mcx-imp-stars" title="ความไวต่อ macro">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span>
      </div>`;
    }).join("");
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>📊 Portfolio Impact</h2><span class="mc-sub">สัดส่วนจริง × ความไวต่อ macro</span></div></div>
      <div class="mcx-imp">${rows}</div>
      <p class="mcx-foot-note">ดาวมาก = ยิ่งได้รับผลจาก regime ปัจจุบันมาก (AI/Bitcoin ไวสุด · Cash ไวน้อยสุด)</p>
    </section>`;
  }

  // ---- 7. Suggested Allocation ----
  function allocationSection(R) {
    if (!R) return "";
    const H = readHoldings();
    const cur = currentBuckets(H);
    const rows = R.suggestedAllocation.map((a) => {
      const c = cur ? (cur[a.key] || 0) : null;
      let tag = "";
      if (c != null) { const d = c - a.pct; tag = d > 6 ? `<span class="mcx-tag mcx-tag-over">+${d.toFixed(0)}</span>` : d < -6 ? `<span class="mcx-tag mcx-tag-under">${d.toFixed(0)}</span>` : `<span class="mcx-tag mcx-tag-bal">≈</span>`; }
      return `<div class="mcx-alloc-row">
        <span class="mcx-alloc-name">${esc(a.label)}</span>
        <div class="mcx-alloc-track"><i class="mcx-alloc-sug" style="width:${a.pct}%"></i>${c != null ? `<i class="mcx-alloc-cur" style="width:${Math.min(100, c).toFixed(1)}%"></i>` : ""}</div>
        <span class="mcx-alloc-pct">${a.pct}%${c != null ? ` <small>(${c.toFixed(0)}%)</small>` : ""}</span>${tag}
      </div>`;
    }).join("");
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🎚️ Suggested Allocation</h2><span class="mc-sub">Regime ${R.score} · แนะนำ vs ปัจจุบัน · ไม่เทรดอัตโนมัติ</span></div></div>
      <div class="mcx-alloc-legend"><span><i class="mcx-lg-sug"></i> แนะนำ</span>${cur ? '<span><i class="mcx-lg-cur"></i> ปัจจุบัน</span>' : ""}</div>
      <div class="mcx-alloc">${rows}</div>
    </section>`;
  }

  // ---- 8. Action Queue (reads existing snapshot.scoring + watchlist; no new calc) ----
  const MACRO_RE = /^\^|^DX-Y|^GLD$|^IAU$|^SPY$|^QQQM$|^XLK$/;
  function buildActionQueue(R) {
    const snap = snapshot();
    const items = [], seen = {};
    const trig = (snap && snap.watchlist && snap.watchlist.triggeredToday) || [];
    trig.forEach((t) => {
      const sym = t.displaySymbol || t.canonicalSymbol; if (!sym || seen[sym]) return; seen[sym] = 1;
      items.push({ verb: "WATCH", sym, reason: (t.ev && t.ev.thaiReason) || "เข้าเงื่อนไข watchlist", score: t.ev && t.ev.timingScore, prio: 85, tone: "watch-bull" });
    });
    const sc = (snap && snap.scoring && snap.scoring.bySymbol) || {};
    Object.keys(sc).forEach((k) => {
      if (MACRO_RE.test(k) || seen[k]) return;
      const e = sc[k] || {}; const tag = String(e.actionCategory || "") + " " + String(e.action || "") + " " + String(e.thaiAction || "");
      let verb = null, tone = "neutral";
      if (/BUY|ADD|ACCUMULAT|ซื้อ|สะสม|เพิ่ม/i.test(tag)) { verb = e.isHolding ? "ADD" : "BUY"; tone = "bull"; }
      else if (/SELL|TRIM|REDUCE|EXIT|ขาย|ลด/i.test(tag)) { verb = "TRIM"; tone = "bear"; }
      else if (/WATCH|จับตา|เฝ้า/i.test(tag)) { verb = "WATCH"; tone = "watch-bull"; }
      if (!verb) return; seen[k] = 1;
      const ts = fin(e.timingScore);
      items.push({ verb, sym: k, reason: e.thaiAction || e.action || (ts != null ? "Timing Score " + ts : "สัญญาณรายตัว"), score: ts, prio: (fin(e.actionPriority) || 0) * 10 + (ts != null ? ts / 10 : 0), tone });
    });
    const H = readHoldings();
    if (H && R) {
      const sug = {}; R.suggestedAllocation.forEach((a) => sug[a.key] = a.pct);
      const cur = currentBuckets(H); const names = { usTech: "US Tech/AI", bitcoin: "Bitcoin", gold: "Gold" };
      ["usTech", "bitcoin", "gold"].forEach((k) => {
        const over = (cur[k] || 0) - (sug[k] || 0); const key = "b:" + k;
        if (over > 10 && R.score < 55 && !seen[key]) { seen[key] = 1; items.push({ verb: "TRIM", sym: names[k], reason: "พอร์ตเกินน้ำหนัก +" + over.toFixed(0) + "% · regime อ่อนลง", score: null, prio: 75, tone: "warn" }); }
      });
    }
    items.sort((a, b) => (b.prio || 0) - (a.prio || 0));
    return items.slice(0, 5);
  }
  function actionQueueSection(R) {
    const q = buildActionQueue(R);
    const verbCls = { BUY: "bull", ADD: "bull", TRIM: "bear", WATCH: "warn" };
    const body = q.length ? q.map((it) => `<div class="mcx-q-item">
      <span class="mcx-q-verb mcx-q-${verbCls[it.verb] || "muted"}">${esc(it.verb)}</span>
      <span class="mcx-q-sym">${esc(it.sym)}</span>
      <span class="mcx-q-reason">${esc(it.reason)}</span>
      ${it.score != null ? `<span class="mcx-q-score">Score ${Math.round(it.score)}</span>` : '<span class="mcx-q-score"></span>'}
    </div>`).join("")
      : `<div class="mc-empty"><strong>ไม่มีรายการเร่งด่วน</strong>พอร์ตนิ่ง — กด Load Latest Data เพื่อประเมินสัญญาณรายตัวล่าสุด</div>`;
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>✅ Action Queue</h2><span class="mc-sub">รายการที่ควรลงมือ (สูงสุด 5) — เรียงตามความเร่งด่วน</span></div></div>
      <div class="mcx-queue">${body}</div>
    </section>`;
  }

  // ---- 9. Portfolio Health ----
  function donut(label, valuePct, color) {
    const r = 30, C = 2 * Math.PI * r, prog = Math.max(0, Math.min(100, valuePct)) / 100 * C;
    return `<div class="mcx-donut">
      <svg viewBox="0 0 80 80" width="86" height="86">
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="rgba(148,163,184,0.14)" stroke-width="8"/>
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${prog.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/>
        <text x="40" y="45" text-anchor="middle" class="mcx-donut-num">${Math.round(valuePct)}%</text>
      </svg>
      <span class="mcx-donut-label">${esc(label)}</span>
    </div>`;
  }
  function healthSection(R) {
    const H = readHoldings();
    if (!H) return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🩺 Portfolio Health</h2><span class="mc-sub">สุขภาพพอร์ต</span></div></div>
      <div class="mc-empty"><strong>ยังไม่มีข้อมูลพอร์ต</strong>กด Load Latest Data</div></section>`;
    const ai = (H.buckets.AI || 0) + (H.buckets["US Tech"] || 0);
    const crypto = H.buckets.Bitcoin || 0, cash = H.buckets.Cash || 0;
    const nBuckets = Object.keys(H.buckets).filter((k) => H.buckets[k] > 0.05).length;
    const diversification = Math.max(0, Math.min(100, nBuckets * 16 - (H.top - 25)));
    const concentration = H.top;
    const riskMult = R ? (R.score >= 60 ? 0.85 : R.score >= 40 ? 1 : 1.2) : 1;
    const ddEst = Math.min(75, (crypto * 0.6 + ai * 0.45 + (H.buckets.Gold || 0) * 0.2 + (H.buckets.Defensive || 0) * 0.12 + (H.buckets.Healthcare || 0) * 0.15) * riskMult);
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🩺 Portfolio Health</h2><span class="mc-sub">การกระจาย · การกระจุก · AI · Crypto · เงินสด · drawdown ประมาณการ</span></div></div>
      <div class="mcx-health">
        ${donut("Diversification", diversification, "#22c55e")}
        ${donut("Concentration", concentration, concentration > 40 ? "#f97316" : "#84cc16")}
        ${donut("AI / Tech", ai, "#a855f7")}
        ${donut("Crypto", crypto, "#f7931a")}
        ${donut("Cash", cash, "#38bdf8")}
        ${donut("Max DD est.", ddEst, ddEst > 45 ? "#ef4444" : ddEst > 30 ? "#f97316" : "#eab308")}
      </div>
      <p class="mcx-foot-note">Max Drawdown เป็นค่าประมาณจากสัดส่วนสินทรัพย์ × ความเสี่ยง regime — กรอบเตือน ไม่ใช่ค่าจริง</p>
    </section>`;
  }

  // ---- 10. Regime History (Today / Yesterday / Last Week / Last Month + timeline) ----
  let histRange = "1Y";
  function regimeTrendStrip(R, hist) {
    const today = new Date().toISOString().slice(0, 10);
    const now = R ? R.score : (hist.length ? hist[hist.length - 1].score : null);
    let store = null; try { store = JSON.parse(window.localStorage.getItem("mcx_regime_prev") || "null"); } catch (e) {}
    if (now != null) {
      if (!store) store = { date: today, score: now, prevDate: null, prevScore: null };
      else if (store.date !== today) store = { date: today, score: now, prevDate: store.date, prevScore: store.score };
      else store.score = now;
      try { window.localStorage.setItem("mcx_regime_prev", JSON.stringify(store)); } catch (e) {}
    }
    const yesterday = store ? store.prevScore : null;
    const wk = hist.length >= 2 ? hist[hist.length - 2].score : null;       // weekly step ≈ 1wk
    const mo = hist.length >= 5 ? hist[hist.length - 5].score : null;        // ≈ 4wk
    const cell = (label, val) => {
      const d = (val != null && now != null) ? now - val : null;
      const arr = d == null ? "" : d > 0 ? `<span class="mcx-arr-up">▲ +${d}</span>` : d < 0 ? `<span class="mcx-arr-down">▼ ${d}</span>` : `<span class="mcx-arr-flat">→ 0</span>`;
      return `<div class="mcx-trend-cell"><small>${esc(label)}</small><strong>${val == null ? "—" : val}</strong>${arr}</div>`;
    };
    return `<div class="mcx-trend">
      <div class="mcx-trend-cell mcx-trend-now"><small>Today</small><strong style="color:${R ? R.color : "var(--mc-text)"}">${now == null ? "—" : now}</strong></div>
      ${cell("Yesterday", yesterday)}${cell("Last Week", wk)}${cell("Last Month", mo)}
    </div>`;
  }
  function historySection(R) {
    const hist = (window.MarketRegime && window.MarketRegime.history) ? window.MarketRegime.history(snapshot(), 24) : [];
    if (!hist.length) return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🗓️ Regime History</h2><span class="mc-sub">ไทม์ไลน์ regime ย้อนหลัง</span></div></div>
      ${regimeTrendStrip(R, hist)}
      <div class="mc-empty"><strong>ยังไม่พอข้อมูลย้อนหลัง</strong>กด Load Latest Data เพื่อสร้างไทม์ไลน์ regime</div></section>`;
    const monthsBack = { "3M": 3, "6M": 6, "1Y": 12, "2Y": 24 }[histRange] || 12;
    const view = hist.slice(Math.max(0, hist.length - Math.round(monthsBack * 4.33)));
    const col = (s) => s >= 60 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444";
    const n = view.length;
    const bars = view.map((h, i) => `<span class="mcx-hist-bar" style="left:${(i / Math.max(1, n) * 100).toFixed(2)}%;width:${(100 / n).toFixed(2)}%;height:${Math.max(8, h.score).toFixed(0)}%;background:${col(h.score)}" title="${esc(h.date)} · ${h.score}"></span>`).join("");
    const ranges = ["3M", "6M", "1Y", "2Y"];
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🗓️ Regime History</h2><span class="mc-sub">สร้างใหม่จากข้อมูลในอดีต (BTC·Nasdaq·DXY·10Y)</span></div>
        <div class="mcx-hist-ranges" id="mcxHistRanges">${ranges.map((r) => `<button type="button" class="${r === histRange ? "is-active" : ""}" data-r="${r}">${r}</button>`).join("")}</div></div>
      ${regimeTrendStrip(R, hist)}
      <div class="mcx-hist"><div class="mcx-hist-track">${bars}</div>
        <div class="mcx-hist-axis"><span style="color:#22c55e">Risk-On</span><span style="color:#eab308">Neutral</span><span style="color:#ef4444">Risk-Off</span></div></div>
    </section>`;
  }

  function emptyState() {
    return `<section class="mcx-hero mc-fade"><div class="mcx-hero-body" style="text-align:center;width:100%">
      <div style="font-size:48px">🛰️</div><h1 class="mcx-hero-title">Mission Control</h1>
      <p class="mcx-hero-sub">กด <b>Load Latest Data</b> เพื่อประเมิน Global Market Regime จากสภาพคล่อง ดอลลาร์ ผลตอบแทน และโครงสร้างตลาด</p>
      <button class="mc-btn mc-btn-primary" id="mcxLoad" type="button" style="margin-top:14px;padding:11px 26px">Load Latest Data</button>
    </div></section>`;
  }

  // ---------------------------------------------------------------- render (decision-first order)
  function render() {
    ensureQuarterly();
    const R = regime();
    if (!R || R.snapshotMissing) { root.innerHTML = emptyState(); wire(); return; }
    root.innerHTML =
      decisionHero(R) +                                                       // 1
      alignmentSection() +                                                    // 2 · your quarterly holdings
      regimeSection(R) +                                                      // 3
      `<div class="mcx-grid2">${moneyFlowSection(R)}${leadLagSection(R)}</div>` + // 4 + 5
      `<div class="mcx-grid2">${portfolioImpactSection(R)}${allocationSection(R)}</div>` + // 6 + 7
      actionQueueSection(R) +                                                 // 8
      healthSection(R) +                                                      // 9
      historySection(R);                                                      // 10
    wire();
  }

  // ---------------------------------------------------------------- snapshot bar + header
  function updateSnapBar() {
    const api = window.PortfolioDataSnapshot;
    const snap = snapshot();
    const t = $("mcSnapTime"), pill = $("mcSnapPill");
    if (t) t.textContent = snap && snap.loadedAt ? new Date(snap.loadedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
    const fr = api && api.freshness ? api.freshness(snap) : null;
    if (pill && fr) { pill.textContent = "● " + (fr.thai || fr.label); pill.className = "mc-pill " + (fr.key === "fresh" ? "mc-pill-fresh" : "mc-pill-stale"); }
  }
  async function loadLatest() {
    const api = window.PortfolioDataSnapshot;
    const btn = $("mcLoadLatest") || $("mcxLoad"), pill = $("mcSnapPill");
    if (!api || typeof api.loadLatestData !== "function") return;
    if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }
    if (pill) { pill.textContent = "● Loading"; pill.className = "mc-pill mc-pill-stale"; }
    try { await api.loadLatestData(); } catch (e) { if (btn) btn.textContent = "Load failed"; }
    finally { if (btn) { btn.disabled = false; window.setTimeout(() => { btn.textContent = "Load Latest Data"; }, 1600); } updateSnapBar(); render(); }
  }

  function wire() {
    const lb = $("mcLoadLatest"); if (lb && !lb._wired) { lb._wired = true; lb.addEventListener("click", loadLatest); }
    const xb = $("mcxLoad"); if (xb) xb.addEventListener("click", loadLatest);
    const mt = $("mcMenuToggle"); if (mt && !mt._wired) { mt._wired = true; mt.addEventListener("click", () => { const s = $("mcSidebar"); if (s) s.classList.toggle("is-open"); }); }
    const hr = $("mcxHistRanges"); if (hr) hr.addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; histRange = b.dataset.r; render(); });
  }

  window.addEventListener("portfolio-data-snapshot", () => { try { updateSnapBar(); render(); } catch (e) {} });
  updateSnapBar();
  render();
})();
