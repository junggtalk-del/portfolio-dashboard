(function () {
  "use strict";

  // ============================================================
  // Mission Control — 3-question homepage:
  //   1) วันนี้ต้องทำอะไร (regime action + per-asset queue, reconciled)
  //   2) พอร์ตเป็นไง (Quarterly Editor holdings)
  //   3) ตลาดเป็นไง (regime gauge + trend + history + BTC chip)
  //   + collapsed "เจาะลึกตลาด" accordion (Money Flow · Lead-Lag · Regime components)
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
  let qpCache = null, qpTried = false; // fresh /api/portfolio fetch (source of truth)
  function ensureQuarterly() {
    // ALWAYS fetch fresh once per page load — snapshot.portfolioStatus is only a
    // copy from the last Load Latest Data; edits in the Quarterly Editor would
    // otherwise never show up here until the next full Load.
    if (qpTried) return;
    qpTried = true;
    try {
      (window.fetch)("/api/portfolio", { cache: "no-store" })
        .then((r) => (r && r.ok ? r.json() : null))
        .then((j) => { if (j && (j.data || j.quarters)) { qpCache = j; render(); } })
        .catch(() => {});
    } catch (e) {}
  }
  // Current-quarter holdings from the Quarterly Editor (grouped by type + per-asset).
  // Fresh fetch (qpCache) wins over the snapshot's possibly-stale copy.
  function quarterlyPortfolio() {
    const snap = snapshot(), ps = qpCache || (snap && snap.portfolioStatus);
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
    rows.forEach((r) => {
      const g = bt[r.type] || (bt[r.type] = { type: r.type, label: r.typeLabel, color: r.color, gross: 0, invested: 0 });
      g.gross += r.gross;
      g.invested += r.type === "cash" ? 0 : r.gross * r.invested / 100;
    });
    const byType = Object.values(bt).map((g) => ({
      type: g.type, label: g.label, color: g.color, gross: g.gross, pct: g.gross / total * 100,
      invested: g.invested, cash: g.gross - g.invested,
      investedPct: g.gross > 0 ? g.invested / g.gross * 100 : 0
    })).sort((a, b) => b.gross - a.gross);
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

  // ---- Market Regime detail (gauge + component contributions + expand; shown in รายละเอียดเพิ่มเติม) ----
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
        <li>Data coverage: ${R.coverage}% · สภาพคล่องใช้ตัวแทนตลาดฟรี: เครดิต HYG · บอนด์ MOVE · VIX</li>
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

  // ---- Money Flow (each node: what it's measured from + current reading) ----
  function moneyFlowSection(R) {
    const dxy = R ? R.components.find((c) => c.key === "dxy" && c.available) : null;
    const dollarWeak = dxy && dxy.trend3m === "down";
    const liqUp = R && R.score >= 50;
    const btc = R && R.components.find((c) => c.key === "btcMa200" && c.available);
    const nas = R && R.components.find((c) => c.key === "nasdaqHH" && c.available);
    const yld = R ? R.components.find((c) => (c.key === "us10yReal" || c.key === "realYield" || /10y/i.test(c.key || "")) && c.available) : null;
    const toneOf = (st) => st === true || st === "improving" ? "bull" : st === false || st === "weakening" ? "bear" : "neutral";
    const toneTh = { bull: "หนุน", bear: "กดดัน", neutral: "กลาง" };
    const trendTh = (t) => t === "up" ? "ขึ้น" : t === "down" ? "ลง" : "ทรงตัว";
    const nodes = [
      { t: "Liquidity", tone: toneOf(liqUp), src: "Regime score รวม (เครดิต HYG + บอนด์ MOVE + VIX + DXY + 10Y)", now: R ? `score ${R.score}/100${yld ? " · 10Y " + esc(yld.displayValue || "") : ""}` : "—" },
      { t: "Dollar", tone: toneOf(dollarWeak ? "improving" : dxy && dxy.trend3m === "up" ? "weakening" : "neutral"), src: "ดัชนีดอลลาร์ DXY (แนวโน้ม 3 เดือน)", now: dxy ? `${esc(dxy.displayValue || "")} · 3M ${trendTh(dxy.trend3m)}${dollarWeak ? " (อ่อน = ดีต่อสินทรัพย์เสี่ยง)" : dxy.trend3m === "up" ? " (แข็ง = กดดัน)" : ""}` : "ยังไม่มีข้อมูล" },
      { t: "Risk Assets", tone: toneOf(liqUp && (dollarWeak || !dxy)), src: "สรุปจากสภาพคล่อง + ดอลลาร์ (2 ข้อบน)", now: liqUp && (dollarWeak || !dxy) ? "เงื่อนไขเอื้อ" : "เงื่อนไขยังไม่เอื้อ" },
      { t: "Technology", tone: nas ? toneOf(nas.status) : "neutral", src: "Nasdaq ทำ higher-high / ยืนเหนือค่าเฉลี่ย", now: nas ? `${esc(nas.displayValue || "")} · ${nas.status === "improving" ? "โครงสร้างดีขึ้น" : nas.status === "weakening" ? "โครงสร้างอ่อนลง" : "ทรงตัว"}` : "ยังไม่มีข้อมูล" },
      { t: "Bitcoin", tone: btc ? toneOf(btc.status) : "neutral", src: "BTC เทียบเส้นค่าเฉลี่ย 200 วัน", now: btc ? `${esc(btc.displayValue || "")} · ${btc.status === "improving" ? "เหนือ/ฟื้นตัว" : btc.status === "weakening" ? "ใต้/อ่อนแรง" : "ก้ำกึ่ง"}` : "ยังไม่มีข้อมูล" },
      { t: "Gold", tone: toneOf(R && R.gold.available ? (R.gold.trend3m === "up" ? "improving" : R.gold.trend3m === "down" ? "weakening" : "neutral") : "neutral"), src: "ราคาทอง GLD (แนวโน้ม 3 เดือน) — เงินหนีเสี่ยงมักไหลเข้าทอง", now: R && R.gold.available ? `${esc(R.gold.displayValue || "")} · 3M ${trendTh(R.gold.trend3m)}` : "ยังไม่มีข้อมูล" }
    ];
    const detailRows = nodes.map((n) => `<div class="mcx-flowd-row">
      <span class="mcx-flowd-dot mcx-flow-${n.tone}"></span>
      <span class="mcx-flowd-name">${esc(n.t)}</span>
      <span class="mcx-flowd-src">${esc(n.src)}</span>
      <span class="mcx-flowd-now">${n.now}</span>
      <span class="mcx-flowd-tone mcx-flowd-${n.tone}">${toneTh[n.tone]}</span>
    </div>`).join("");
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>💧 Money Flow</h2><span class="mc-sub">เงินทุนไหลจากสภาพคล่อง → สินทรัพย์เสี่ยง — แต่ละโหนดวัดจากข้อมูลจริงใน snapshot (เขียว=หนุน เหลือง=กลาง แดง=กดดัน)</span></div></div>
      <div class="mcx-flow">${nodes.map((n, i) => `
        <div class="mcx-flow-node mcx-flow-${n.tone}">${esc(n.t)}</div>
        ${i < nodes.length - 1 ? `<div class="mcx-flow-arrow mcx-flow-${nodes[i + 1].tone}">→</div>` : ""}`).join("")}</div>
      <div class="mcx-flowd-head"><span></span><span>โหนด</span><span>วัดจาก</span><span>ค่าปัจจุบัน</span><span>สถานะ</span></div>
      <div class="mcx-flowd">${detailRows}</div>
      <p class="mcx-foot-note">${dollarWeak ? "ดอลลาร์อ่อน → เงินทุนเปิดทางเข้าสินทรัพย์เสี่ยง" : "ดอลลาร์แข็ง/สภาพคล่องตึง → เงินทุนยังไม่ไหลเข้าสินทรัพย์เสี่ยง"}</p>
    </section>`;
  }

  // ---- Lead-Lag (per-step: measured-from + current reading + what to watch) ----
  function leadLagSection(R) {
    const btc = R && R.components.find((c) => c.key === "btcMa200" && c.available);
    const nas = R && R.components.find((c) => c.key === "nasdaqHH" && c.available);
    const bi = snapshot() && snapshot().bitcoinIntelligence;
    let activeIdx = R && R.score >= 50 ? 0 : -1;            // Liquidity
    if (btc && btc.status === "improving") activeIdx = Math.max(activeIdx, 1);
    if (nas && nas.status !== "weakening") activeIdx = Math.max(activeIdx, 2);
    const stTh = (c) => !c ? "ยังไม่มีข้อมูล" : c.status === "improving" ? "กำลังดีขึ้น ✓" : c.status === "weakening" ? "กำลังอ่อนลง ✗" : "ทรงตัว";
    const btcNow = btc ? `${esc(btc.displayValue || "")} · ${stTh(btc)}` + (bi && bi.available && bi.cycleState ? ` · เฟสวัฏจักร: ${esc(bi.cycleState)}` : "") : "ยังไม่มีข้อมูล";
    const steps = [
      { t: "Global Liquidity", d: "จุดเริ่มของวัฏจักร — เงินในระบบมาก่อนราคาสินทรัพย์เสมอ", lag: "", src: "วัดจากตัวแทนตลาด: เครดิต HYG + บอนด์ MOVE + VIX + DXY + 10Y", now: R ? `score ${R.score}/100 = ${R.score >= 60 ? "สภาพคล่องหนุน" : R.score >= 40 ? "กลาง ๆ" : "สภาพคล่องตึง"}` : "—", watch: "จับตา: HYG ยืนเหนือ MA50 + MOVE ต่ำ + DXY อ่อน = สภาพคล่องกำลังกลับมา" },
      { t: "Bitcoin", d: "ไวต่อสภาพคล่องที่สุด จึงมักฟื้น \"ก่อน\" สินทรัพย์เสี่ยงอื่น", lag: "ตามสภาพคล่อง ~6–10 สัปดาห์", src: "BTC เทียบ MA200 + เฟสวัฏจักรจาก Bitcoin Intelligence", now: btcNow, watch: "จับตา: BTC ยืนเหนือ MA200 ได้ = สัญญาณนำรอบใหม่" },
      { t: "Nasdaq / Tech", d: "หุ้นเติบโตตอบสนองถัดมา เมื่อความเสี่ยงเริ่มถูกยอมรับ", lag: "ตาม BTC ~2–6 สัปดาห์", src: "โครงสร้างราคา Nasdaq (higher-high)", now: nas ? `${esc(nas.displayValue || "")} · ${stTh(nas)}` : "ยังไม่มีข้อมูล", watch: "จับตา: Nasdaq ทำ higher-high ตาม BTC = ยืนยันรอบ" },
      { t: "Economy", d: "เศรษฐกิจจริงรับรู้ช้าสุด — ข่าวดี/ร้ายจริงมาหลังตลาดขยับไปแล้ว", lag: "ตามตลาด ~3–6 เดือน", src: "ไม่มีตัววัดตรงในระบบ — ใช้เป็นกรอบเวลา", now: "อย่ารอข่าวเศรษฐกิจเพื่อตัดสินใจ ตลาดนำหน้าไปก่อนแล้ว", watch: "" }
    ];
    const cur = activeIdx >= 0 ? steps[activeIdx].t : "ยังไม่เริ่มรอบ (สภาพคล่องยังตึง)";
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>⏱️ Lead–Lag Timeline</h2><span class="mc-sub">ลำดับการส่งผ่านของวัฏจักร "ที่มักเกิดในอดีต" · ตอนนี้อยู่ขั้น: <b>${esc(cur)}</b> — ข้อมูลประกอบ ไม่ใช่การพยากรณ์</span></div></div>
      <div class="mcx-leadlag">${steps.map((s, i) => `
        <div class="mcx-ll-step${i === activeIdx ? " mcx-ll-active" : ""}">
          <div class="mcx-ll-dot">${i + 1}</div>
          <div class="mcx-ll-body">
            <strong>${esc(s.t)}${i === activeIdx ? ' <span class="mcx-ll-now">ตอนนี้</span>' : ""}${s.lag ? ` <em class="mcx-ll-lag">${esc(s.lag)}</em>` : ""}</strong>
            <span>${esc(s.d)}</span>
            <div class="mcx-ll-meta"><small>วัดจาก: ${esc(s.src)}</small><small>ตอนนี้: ${s.now}</small>${s.watch ? `<small class="mcx-ll-watch">${esc(s.watch)}</small>` : ""}</div>
          </div>
        </div>${i < steps.length - 1 ? '<div class="mcx-ll-arrow">↓</div>' : ""}`).join("")}</div>
      <p class="mcx-foot-note">วิธีใช้: ถ้าขั้น 1–2 เริ่มเขียว (สภาพคล่องฟื้น + BTC ยืน MA200) มักเป็นช่วง "เริ่มสะสม" ก่อนหุ้นเทคขยับตาม — ประวัติศาสตร์ ไม่ใช่คำรับประกัน</p>
    </section>`;
  }

  // ---- Action Queue data (reads existing snapshot.scoring + watchlist; no new calc) ----
  const MACRO_RE = /^\^|^DX-Y|^GLD$|^IAU$|^SPY$|^QQQM$|^XLK$/;
  function buildActionQueue(R, defensive) {
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
    // defensive regime: bring TRIM/WATCH to the front BEFORE truncating to top-5 (else a TRIM can be dropped)
    if (defensive) items.sort((x, y) => { const w = (v) => v === "TRIM" ? 0 : v === "WATCH" ? 1 : 2; return w(x.verb) - w(y.verb) || (y.prio || 0) - (x.prio || 0); });
    return items.slice(0, 5);
  }
  // ---- Regime trend strip (Today / Yesterday / Last Week / Last Month) ----
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
      <div class="mcx-trend-cell mcx-trend-now"><small>วันนี้</small><strong style="color:${R ? R.color : "var(--mc-text)"}">${now == null ? "—" : now}</strong></div>
      ${cell("เมื่อวาน", yesterday)}${cell("สัปดาห์ก่อน", wk)}${cell("เดือนก่อน", mo)}
    </div>`;
  }
  function emptyState() {
    return `<section class="mcx-hero mc-fade"><div class="mcx-hero-body" style="text-align:center;width:100%">
      <div style="font-size:48px">🛰️</div><h1 class="mcx-hero-title">Mission Control</h1>
      <p class="mcx-hero-sub">กด <b>Load Latest Data</b> เพื่อประเมิน Global Market Regime จากสภาพคล่อง ดอลลาร์ ผลตอบแทน และโครงสร้างตลาด</p>
      <button class="mc-btn mc-btn-primary" id="mcxLoad" type="button" style="margin-top:14px;padding:11px 26px">Load Latest Data</button>
    </div></section>`;
  }

  // ============================================================ 3-QUESTION LAYOUT
  // The home answers exactly three questions, one card each, no duplication:
  //   1) ต้อง action อะไร  2) พอร์ตเป็นไง  3) ตลาดเป็นไง
  // Market deep-dive (money flow, lead-lag, regime components) lives in a collapsed
  // "เจาะลึกตลาด" accordion. Allocation/Impact/Health were removed per user request.

  // ---- 1 · 🎯 วันนี้ต้องทำอะไร (merged Today's Decision + Action Queue) ----
  function actionSection(R) {
    if (!R) return "";
    const a = R.action, conf = R.confidence;
    const reasons = (R.reasons.length ? R.reasons : ["ยังไม่มีสัญญาณเด่นพอ"]).slice(0, 3);
    const defensive = a.tone === "bear" || a.tone === "warn"; // แนวทางหลัก = ลดเสี่ยง/ระวัง
    const q = buildActionQueue(R, defensive); // defensive → TRIM/WATCH ranked before the top-5 cut
    const verbCls = { BUY: "bull", ADD: "bull", TRIM: "bear", WATCH: "warn" };
    const hasCounterBuy = defensive && q.some((it) => it.verb === "BUY" || it.verb === "ADD");
    const qBody = q.length ? q.map((it) => {
      const counter = defensive && (it.verb === "BUY" || it.verb === "ADD");
      return `<div class="mcx-q-item${counter ? " mcx-q-counterrow" : ""}">
      <span class="mcx-q-verb mcx-q-${verbCls[it.verb] || "muted"}">${esc(it.verb)}</span>
      <span class="mcx-q-sym">${esc(it.sym)}</span>
      <span class="mcx-q-reason">${counter ? '<b class="mcx-q-counter">⚠ สวนแนวทางหลัก — ถ้าซื้อให้ไม้เล็ก</b> ' : ""}${esc(it.reason)}</span>
      ${it.score != null ? `<span class="mcx-q-score">Score ${Math.round(it.score)}</span>` : '<span class="mcx-q-score"></span>'}
    </div>`;
    }).join("") : `<div class="mcx-q-none">ไม่มีรายการเร่งด่วนรายตัววันนี้ — ทำตามแนวทางหลักด้านบนพอ</div>`;
    const note = hasCounterBuy ? `<div class="mcx-q-note">💡 แนวทางหลักมาจาก "ภาพรวมตลาด" (macro) แต่รายการด้านล่างมาจาก "สัญญาณรายตัว" (timing) — สองมุมนี้ขัดกันได้ เมื่อตลาดโหมดลดเสี่ยง รายการ BUY = หุ้นที่แข็งกว่าตลาด ควรรอจังหวะ/ใช้ไม้เล็กเท่านั้น</div>` : "";
    return `<section class="mcx-decision mcx-acc-${a.tone} mc-fade">
      <p class="mc-eyebrow">1 · วันนี้ต้องทำอะไร</p>
      <div class="mcx-decision-top">
        <div class="mcx-decision-action" style="color:${toneColor(a.tone)}">
          <small>แนวทางหลักวันนี้ (จากภาพรวมตลาด)</small>
          <strong>${esc(a.thai)}</strong>
          <span>${esc(a.label)} · Confidence <b class="mcx-conf-${conf.key}">${esc(conf.label)}</b></span>
        </div>
        <div class="mcx-reason-chips mcx-act-reasons">${reasons.map((r) => `<span class="mcx-reason-chip">✓ ${esc(r)}</span>`).join("")}</div>
      </div>
      <div class="mcx-act-qhead">สัญญาณรายตัว (สูงสุด 5${defensive ? " · โหมดลดเสี่ยง: เรียง TRIM/WATCH ก่อน" : " · เรียงตามความเร่งด่วน"})</div>
      <div class="mcx-queue">${qBody}</div>
      ${note}
    </section>`;
  }

  // ---- 2 · 💼 พอร์ตเป็นไง (quarterly holdings, single portfolio card) ----
  function portfolioSection() {
    const P = quarterlyPortfolio();
    if (!P) return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>💼 2 · พอร์ตเป็นไง</h2><span class="mc-sub">สินทรัพย์จริงจาก Quarterly Editor</span></div></div>
      <div class="mc-empty"><strong>ยังไม่มีข้อมูลพอร์ต</strong>กด Load Latest Data — หรือเพิ่มสินทรัพย์ที่หน้า Quarterly Editor ก่อน</div></section>`;
    const money = (v) => "฿" + Math.round(v).toLocaleString();
    const investedPct = P.total > 0 ? P.investedSum / P.total * 100 : 0, cashPct = 100 - investedPct;
    const top = P.rows[0], topWarn = top && top.pct > 40;
    // bar = invested (solid type color) + cash-in-type (dimmed gray); length still = share of portfolio
    const typeBars = P.byType.map((g) => `<div class="mcx-pf-row">
      <span class="mcx-pf-dot" style="background:${g.color}"></span>
      <span class="mcx-pf-name">${esc(g.label)}</span>
      <div class="mcx-pf-bar" title="ลงทุน ${money(g.invested)} · เงินสด ${money(g.cash)}">
        <i style="width:${(g.pct * g.investedPct / 100).toFixed(1)}%;background:${g.color}"></i><i class="mcx-pf-cashseg" style="width:${(g.pct * (100 - g.investedPct) / 100).toFixed(1)}%"></i>
      </div>
      <span class="mcx-pf-inv">${g.type === "cash" ? "สด 100%" : `ลงทุน ${g.investedPct.toFixed(0)}%`}</span>
      <span class="mcx-pf-pct">${g.pct.toFixed(1)}%</span>
      <span class="mcx-pf-val">${money(g.gross)}</span>
    </div>`).join("");
    return `<section class="mc-card mc-panel mc-fade mcx-pf">
      <div class="mc-panel-head"><div><h2>💼 2 · พอร์ตเป็นไง</h2><span class="mc-sub">สินทรัพย์จริง · ไตรมาส ${esc(P.key)} · แก้ไขได้ที่ Quarterly Editor</span></div>
        ${topWarn ? `<span class="mcx-pf-warn">⚠ กระจุกตัว: ${esc(top.name)} ${top.pct.toFixed(0)}%</span>` : ""}</div>
      <div class="mcx-pf-hero">
        <div><small>มูลค่ารวม</small><strong>${money(P.total)}</strong></div>
        <div><small>สินทรัพย์</small><strong>${P.count} รายการ</strong></div>
        <div><small>ลงทุน / เงินสด</small><strong>${investedPct.toFixed(0)}% / ${cashPct.toFixed(0)}%</strong></div>
      </div>
      <div class="mcx-pf-splitbar" title="ลงทุน ${investedPct.toFixed(0)}% · เงินสด ${cashPct.toFixed(0)}%"><i style="width:${investedPct.toFixed(1)}%"></i></div>
      <div class="mcx-pf-subhead">สัดส่วนตามประเภท</div>
      <div class="mcx-pf-types">${typeBars}</div>
    </section>`;
  }

  // ---- 3 · 🌍 ตลาดเป็นไง (regime gauge + trend + history + BTC chip, one card) ----
  function marketSection(R) {
    if (!R) return "";
    const hist = (window.MarketRegime && window.MarketRegime.history) ? window.MarketRegime.history(snapshot(), 24) : [];
    const reasons = (R.reasons || []).slice(0, 3).map((x) => `<li>✓ ${esc(x)}</li>`).join("");
    const warns = (R.warnings || []).slice(0, 2).map((x) => `<li>⚠ ${esc(x)}</li>`).join("");
    // BTC one-liner from the intelligence snapshot (already computed; links to the BTC page)
    const bi = snapshot() && snapshot().bitcoinIntelligence;
    const btcChip = bi && bi.available ? `<a class="mcx-mkt-btc" href="/bitcoin-monitor">₿ Bitcoin: <b>${esc(bi.cycleState || "-")}</b>${bi.forecastBias ? ` · คาดการณ์ 90D <b class="${bi.forecastBias === "bullish" ? "mcx-pos" : bi.forecastBias === "bearish" ? "mcx-neg" : ""}">${bi.forecastBias === "bullish" ? "เอนขึ้น" : bi.forecastBias === "bearish" ? "เอนลง" : "ก้ำกึ่ง"}${bi.forecast90Median != null ? " (median " + (bi.forecast90Median > 0 ? "+" : "") + bi.forecast90Median + "%)" : ""}</b>` : ""} →</a>` : "";
    // history bars (reuse existing renderer internals)
    let histHtml = "";
    if (hist.length) {
      const monthsBack = { "3M": 3, "6M": 6, "1Y": 12, "2Y": 24 }[histRange] || 12;
      const view = hist.slice(Math.max(0, hist.length - Math.round(monthsBack * 4.33)));
      const col = (s) => s >= 60 ? "#22c55e" : s >= 40 ? "#eab308" : "#ef4444";
      const n = view.length;
      const bars = view.map((h, i) => `<span class="mcx-hist-bar" style="left:${(i / Math.max(1, n) * 100).toFixed(2)}%;width:${(100 / n).toFixed(2)}%;height:${Math.max(8, h.score).toFixed(0)}%;background:${col(h.score)}" title="${esc(h.date)} · ${h.score}"></span>`).join("");
      const ranges = ["3M", "6M", "1Y", "2Y"];
      histHtml = `<div class="mcx-mkt-histhead"><span>ย้อนหลัง</span><div class="mcx-hist-ranges" id="mcxHistRanges">${ranges.map((r) => `<button type="button" class="${r === histRange ? "is-active" : ""}" data-r="${r}">${r}</button>`).join("")}</div></div>
        <div class="mcx-hist"><div class="mcx-hist-track">${bars}</div>
        <div class="mcx-hist-axis"><span style="color:#22c55e">Risk-On</span><span style="color:#eab308">Neutral</span><span style="color:#ef4444">Risk-Off</span></div></div>`;
    }
    // one-sentence Thai interpretation of the score (what it MEANS, not just the number)
    const meaning = R.score >= 60
      ? "ตลาดเปิดรับความเสี่ยง — สภาพแวดล้อมหนุนสินทรัพย์เสี่ยง ลงทุนตามแผนได้"
      : R.score >= 40
        ? "ตลาดก้ำกึ่ง — สัญญาณผสม เลือกเฉพาะตัวที่แข็งแรง และถือเงินสดบางส่วน"
        : "ตลาดโหมดระวังตัว — สภาพแวดล้อมกดดันสินทรัพย์เสี่ยง เน้นรักษาเงินต้น ถือเงินสดมากขึ้น รอจังหวะ";
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>🌍 3 · ตลาดเป็นไง</h2><span class="mc-sub">คะแนนสภาพตลาดโลก 0–100 · คำนวณจาก ดอลลาร์ (DXY) · ดอกเบี้ย 10Y · BTC เทียบ MA200 · Nasdaq</span></div></div>
      <div class="mcx-mkt-verdict" style="border-left-color:${R.color}"><b style="color:${R.color}">${esc(R.regime.label)} · ${R.score}/100</b> — ${esc(meaning)}</div>
      <div class="mcx-mkt">
        <div class="mcx-regime-gauge">${gauge(R.score, R.color, 170)}
          <div class="mcx-ds-conf">Confidence <b class="mcx-conf-${R.confidence.key}">${esc(R.confidence.label)}</b></div>
          <div class="mcx-mkt-scale"><span style="color:#ef4444">0–39 ลดเสี่ยง</span><span style="color:#eab308">40–59 กลาง</span><span style="color:#22c55e">60+ ลงทุนได้</span></div></div>
        <div class="mcx-mkt-side">
          <div class="mcx-mkt-sub">คะแนนเทียบช่วงก่อนหน้า (คะแนนขึ้น = ตลาดดีขึ้น)</div>
          ${regimeTrendStrip(R, hist)}
          ${reasons || warns ? `<div class="mcx-mkt-sub">เพราะอะไร</div><ul class="mcx-ul mcx-mkt-why">${reasons}${warns}</ul>` : ""}
          ${btcChip}
        </div>
      </div>
      ${histHtml ? `<div class="mcx-mkt-sub" style="margin-top:10px">คะแนนย้อนหลัง (แท่งละ ~1 สัปดาห์ · เขียว=ลงทุนได้ เหลือง=กลาง แดง=ลดเสี่ยง)</div>` + histHtml : ""}
    </section>`;
  }

  // ---- รายละเอียดเพิ่มเติม (everything else, collapsed — no duplication in the main view) ----
  function moreAccordion(R) {
    return `<details class="mc-card mc-panel mc-fade mcx-more">
      <summary><h2 style="display:inline">🔬 เจาะลึกตลาด</h2><span class="mc-sub"> · Money Flow (เงินไหลจากไหนไปไหน) · Lead–Lag (ใครนำใครตาม) · Regime components</span></summary>
      <div class="mcx-more-body">
        <div class="mcx-grid2">${moneyFlowSection(R)}${leadLagSection(R)}</div>
        ${regimeSection(R)}
      </div>
    </details>`;
  }

  // ---------------------------------------------------------------- render (3 questions + more)
  function render() {
    ensureQuarterly();
    const R = regime();
    if (!R || R.snapshotMissing) { root.innerHTML = emptyState(); wire(); return; }
    root.innerHTML =
      actionSection(R) +      // 1 · 🎯 วันนี้ต้องทำอะไร (decision + action queue)
      portfolioSection() +    // 2 · 💼 พอร์ตเป็นไง (quarterly holdings)
      marketSection(R) +      // 3 · 🌍 ตลาดเป็นไง (regime + trend + history + BTC)
      moreAccordion(R);       // 🔬 รายละเอียดเพิ่มเติม (collapsed)
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

  // Load Latest Data refreshed snapshot.portfolioStatus from the server — drop the
  // page-load fetch so the (equally fresh) snapshot copy takes over.
  window.addEventListener("portfolio-data-snapshot", () => { try { qpCache = null; updateSnapBar(); render(); } catch (e) {} });
  updateSnapBar();
  render();
})();
