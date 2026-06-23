(function () {
  "use strict";

  const root = document.getElementById("watchlistRoot");
  const WL = window.Watchlist;

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
  function fin(v) { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
  function num(v, d = 2) { const n = fin(v); return n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d }); }
  function getSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function curFor(item) {
    const k = WL.canonicalize(item.canonicalSymbol || "");
    if (item.currency === "USD") return "$";
    if (item.currency === "THB") return "฿";
    if (k.endsWith(".BK") || k.startsWith("^SET") || k.includes("RMF")) return "฿";
    return "$";
  }

  const STATUS_GROUPS = [
    { key: "triggered", title: "Triggered Today", thai: "เข้าเงื่อนไขวันนี้" },
    { key: "near", title: "Near Trigger", thai: "ใกล้เข้าเงื่อนไข" },
    { key: "improving", title: "Improving", thai: "สัญญาณเริ่มดีขึ้น" },
    { key: "risk", title: "Risk Building", thai: "เริ่มมีความเสี่ยง" },
    { key: "none", title: "No Action", thai: "ยังไม่ต้องทำอะไร" }
  ];
  const SEV_RANK = { high: 3, medium: 2, low: 1 };

  function evalFor(item, snapshot) {
    const key = WL.canonicalize(item.canonicalSymbol);
    const pre = snapshot && snapshot.watchlist && snapshot.watchlist.evaluationsBySymbol && snapshot.watchlist.evaluationsBySymbol[key];
    if (pre) {
      // Precomputed evals predate signal-state; enrich (without mutating the snapshot).
      if (pre.signal || pre.signalLabel) return pre;
      try {
        const c = WL.contextFromSnapshot(key, snapshot || {}, item);
        return Object.assign({}, pre, { signal: c.signal, signalLabel: c.signalLabel, signalTone: c.signalTone, signalGroup: c.signalGroup, signalAction: c.signalAction });
      } catch (e) { return pre; }
    }
    const ctx = WL.contextFromSnapshot(key, snapshot || {}, item);
    const ev = WL.evaluate(item, ctx);
    ev.timingScore = ctx.timingScore;
    ev.price = ctx.price;
    ev.signalQualityScore = ctx.signalQualityScore != null ? ctx.signalQualityScore : null;
    ev.signal = ctx.signal;
    ev.signalLabel = ctx.signalLabel;
    ev.signalTone = ctx.signalTone;
    ev.signalGroup = ctx.signalGroup;
    ev.signalAction = ctx.signalAction;
    return ev;
  }
  function scoringFor(item, snapshot) {
    const key = WL.canonicalize(item.canonicalSymbol);
    return (snapshot && snapshot.scoring && snapshot.scoring.bySymbol && snapshot.scoring.bySymbol[key]) || null;
  }

  let lastSuggestions = [];
  function timingColor(t) {
    if (t != null && window.Scoring && typeof window.Scoring.scoreColor === "function") return window.Scoring.scoreColor(t);
    return "var(--mc-text)";
  }
  function inferCur(k) {
    k = WL.canonicalize(k || "");
    return (k.endsWith(".BK") || k.startsWith("^SET") || k.includes("RMF") || k.includes("SSF")) ? "THB" : "USD";
  }
  function suggestions(snapshot) {
    if (!snapshot || !snapshot.scoring || !snapshot.scoring.bySymbol) return [];
    const have = new Set(WL.read().map((i) => WL.canonicalize(i.canonicalSymbol)));
    const meta = {};
    (snapshot.assets || []).forEach((a) => { const k = WL.canonicalize(a.canonicalSymbol || a.ticker || ""); if (k) meta[k] = a; });
    return Object.keys(snapshot.scoring.bySymbol).map((k) => {
      const sc = snapshot.scoring.bySymbol[k]; const m = meta[k] || {};
      return {
        canonicalSymbol: k,
        displaySymbol: m.display_symbol || m.ticker || k,
        assetName: m.name || m.assetName || "",
        assetType: m.asset_type || m.assetType || "",
        providerSymbol: m.providerSymbol || k,
        currency: inferCur(k),
        timing: fin(sc.timingScore),
        thaiAction: sc.thaiAction || ""
      };
    }).filter((x) => !have.has(x.canonicalSymbol) && x.timing != null)
      .sort((a, b) => (b.timing || 0) - (a.timing || 0))
      .slice(0, 8);
  }

  function render() {
    if (!WL) { root.innerHTML = panel("Watchlist", "", `<div class="mc-empty"><strong>โหลด engine ไม่สำเร็จ</strong></div>`); return; }
    const snapshot = getSnapshot();
    const all = WL.read();
    const active = all.filter((i) => i.isActive !== false);
    const archived = all.filter((i) => i.isActive === false);
    const rows = active.map((item) => ({ item, ev: evalFor(item, snapshot), sc: scoringFor(item, snapshot) }));

    const counts = {
      active: active.length,
      triggered: rows.filter((r) => r.ev.status === "triggered").length,
      buy: active.filter((i) => i.watchCategory === "buy" || i.watchCategory === "breakout" || i.watchCategory === "pullback").length,
      risk: active.filter((i) => i.watchCategory === "sell" || i.watchCategory === "risk").length,
      high: rows.filter((r) => fin(r.ev.timingScore) != null && r.ev.timingScore >= 65).length,
      missing: rows.filter((r) => r.ev.status === "missing").length
    };

    const parts = [hero(counts)];
    if (active.length) {
      parts.push(addBar(), summary(counts), dailyCards(rows), recentlyTriggered(), tableSection(rows), archivedSection(archived));
    } else {
      parts.push(emptyState(snapshot));
      if ((WL.readHistory() || []).length) parts.push(recentlyTriggered());
      if (archived.length) parts.push(archivedSection(archived));
    }
    root.innerHTML = parts.join("");
    wire(snapshot);
  }

  function emptyState(snapshot) {
    const sugg = suggestions(snapshot);
    lastSuggestions = sugg;
    const suggHtml = sugg.length
      ? `<div style="margin-top:24px;text-align:left;">
           <h3 style="font-size:14px;margin:0 0 4px;">แนะนำให้ติดตาม <span style="color:var(--mc-muted);font-weight:600;">(จาก Timing Score ล่าสุด)</span></h3>
           <p style="font-size:12px;color:var(--mc-muted);margin:0 0 14px;">คลิกเพื่อเพิ่มเข้า Watchlist พร้อมกฎแจ้งเตือนเริ่มต้น</p>
           <div class="wl-sugg-grid">
             ${sugg.map((s) => `<button type="button" class="wl-sugg" data-qadd="${esc(s.canonicalSymbol)}">
               <span class="wl-sugg-sym">${esc(s.displaySymbol)}</span>
               <span class="wl-sugg-timing" style="color:${timingColor(s.timing)};">${s.timing}</span>
               <span class="wl-sugg-act">${esc(s.thaiAction || "")}</span>
               <span class="wl-sugg-add">+ เพิ่ม</span>
             </button>`).join("")}
           </div>
         </div>`
      : `<p style="font-size:12.5px;color:var(--mc-muted);margin-top:18px;">💡 กด <strong>Load Latest Data</strong> ด้านบนก่อน เพื่อให้ระบบแนะนำสินทรัพย์ที่น่าติดตามตาม Timing Score</p>`;
    return `<section class="mc-card mc-panel mc-fade" style="text-align:center;padding:34px 22px;">
      <div style="font-size:42px;line-height:1;">👁️</div>
      <h2 style="margin:12px 0 6px;">ยังไม่มีรายการใน Watchlist</h2>
      <p style="color:var(--mc-muted);max-width:580px;margin:0 auto 18px;">กด <strong>Sync จาก AI Boom Universe</strong> เพื่อดึงหุ้นที่คุณ monitor เข้ามาทั้งหมด (ทำอัตโนมัติทุกครั้งที่ Load Latest Data ด้วย) — หรือเพิ่มเองทีละตัวจากหน้า Asset 360 / Scanner / Signal</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="mc-btn mc-btn-primary" id="wlSyncBtn2" type="button" style="padding:10px 20px;">🔄 Sync จาก AI Boom Universe</button>
        <button class="mc-btn" id="wlAddBtn2" type="button" style="padding:10px 20px;">+ เพิ่มเอง</button>
      </div>
      ${suggHtml}
    </section>`;
  }

  function hero(c) {
    return `<section class="mc-page-hero mc-fade">
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start;">
        <div style="position:relative;z-index:1;">
          <p class="mc-eyebrow">Watchlist</p>
          <h1>รายการติดตาม</h1>
          <p class="mc-hero-sub">ติดตามสินทรัพย์ที่น่าสนใจ พร้อมสัญญาณ Timing Score และ Alert Rules</p>
        </div>
        <div class="a360-hero-cards" style="position:relative;z-index:1;min-width:min(560px,100%);display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
          ${metric("Active Watchlist", c.active, "รายการที่ติดตาม")}
          ${metric("Triggered Today", c.triggered, "เข้าเงื่อนไขวันนี้", c.triggered ? "mc-up" : "")}
          ${metric("Buy Watch", c.buy, "เฝ้าซื้อ")}
          ${metric("Risk Watch", c.risk, "เฝ้าขาย / เสี่ยง")}
        </div>
      </div>
    </section>`;
  }
  function metric(label, value, sub, cls) {
    return `<div class="mc-card mc-metric mc-glow"><div class="mc-label"><span>${esc(label)}</span></div>
      <div class="mc-value">${esc(String(value))}</div><div class="mc-delta ${cls || ""}">${esc(sub)}</div></div>`;
  }

  function summary(c) {
    const cells = [
      ["Active Watchlist", "รายการที่ติดตาม", c.active],
      ["Triggered Today", "แจ้งเตือนวันนี้", c.triggered],
      ["Buy Watch", "เฝ้าซื้อ", c.buy],
      ["Sell / Risk", "เฝ้าขาย / เสี่ยง", c.risk],
      ["High Timing", "จังหวะดี", c.high],
      ["Missing Data", "ข้อมูลไม่พอ", c.missing]
    ];
    return panel("Watchlist Summary", "ภาพรวมรายการติดตาม",
      `<div class="a360-ind-grid" style="grid-template-columns:repeat(6,1fr);">${cells.map(([l, t, v]) => `<div class="a360-ind"><h4>${esc(l)}</h4><div class="a360-big">${v}</div><div class="a360-sub">${esc(t)}</div></div>`).join("")}</div>`);
  }

  function addBar() {
    return `<section class="mc-card mc-panel mc-fade" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div><strong style="font-size:14px;">Watchlist sync กับ AI Boom Universe</strong><div style="font-size:12px;color:var(--mc-muted);">หุ้นใน AI Boom Universe จะถูก sync เข้ามาอัตโนมัติเมื่อกด Load Latest Data — หรือกด Sync เดี๋ยวนี้</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="mc-btn" id="wlSyncBtn" type="button">🔄 Sync AI Boom Universe</button>
        <button class="mc-btn mc-btn-primary" id="wlAddBtn" type="button">+ เพิ่มเอง</button>
      </div>
    </section>`;
  }

  function showToast(msg) {
    const prev = document.getElementById("wl-toast");
    if (prev) prev.remove();
    const t = document.createElement("div");
    t.id = "wl-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    window.setTimeout(() => { if (t.parentNode) t.remove(); }, 4500);
  }

  async function syncNow(btn) {
    if (!window.AIBoomWatchlistSync || typeof window.AIBoomWatchlistSync.sync !== "function") { showToast("ระบบ sync ยังไม่พร้อม"); return; }
    const label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "กำลัง sync..."; }
    try {
      const res = await window.AIBoomWatchlistSync.sync({ archiveMissing: true });
      if (!res) showToast("ไม่พบข้อมูล AI Boom Universe");
      else if (res.complete === false && !res.added && !res.archived) showToast("Sync บางส่วน (โหลด universe ไม่ครบ) — ลองกด Load Latest Data ก่อน");
      else showToast(`Sync สำเร็จ · เพิ่ม ${res.added} · อัปเดต ${res.updated} · เก็บเข้าคลัง ${res.archived}`);
    } catch (e) { showToast("Sync ไม่สำเร็จ"); }
    finally { if (btn) { btn.disabled = false; btn.textContent = label; } }
    // render() re-runs via the 'watchlist-updated' event fired by the sync write.
  }

  function dailyCards(rows) {
    if (!rows.length) {
      return panel("Daily Watch", "การ์ดติดตามรายวัน", `<div class="mc-empty"><strong>ยังไม่มีรายการใน Watchlist</strong>กด "เพิ่มเข้า Watchlist" หรือกดปุ่ม Add to Watchlist จากหน้า Asset / Scanner</div>`);
    }
    const groups = {};
    STATUS_GROUPS.forEach((g) => { groups[g.key] = []; });
    rows.forEach((r) => { (groups[r.ev.status] || (groups[r.ev.status] = [])).push(r); });
    const sections = STATUS_GROUPS.map((g) => {
      const list = (groups[g.key] || []).sort((a, b) => (SEV_RANK[b.ev.severity] || 0) - (SEV_RANK[a.ev.severity] || 0) || (fin(b.ev.timingScore) || 0) - (fin(a.ev.timingScore) || 0));
      if (!list.length) return "";
      return `<div style="margin-bottom:8px;"><h3 style="font-size:14px;margin:14px 0 8px;">${esc(g.title)} · ${esc(g.thai)} <span style="color:var(--mc-muted);font-weight:600;">(${list.length})</span></h3>
        <div class="wl-grid">${list.map(card).join("")}</div></div>`;
    }).join("");
    // missing data group at end
    const missing = rows.filter((r) => r.ev.status === "missing");
    const missingSec = missing.length ? `<div><h3 style="font-size:14px;margin:14px 0 8px;color:var(--mc-muted);">ข้อมูลไม่พอ (${missing.length})</h3><div class="wl-grid">${missing.map(card).join("")}</div></div>` : "";
    return panel("Daily Watch", "การ์ดติดตามรายวัน — เรียงตามสถานะ", sections + missingSec);
  }

  function card(r) {
    const it = r.item, ev = r.ev, sc = r.sc;
    const cur = curFor(it);
    const cat = (WL.CATEGORIES[it.watchCategory] || WL.CATEGORIES.buy);
    const timing = fin(ev.timingScore);
    const action = ev.signalAction ? ev.signalAction.thaiAction : (sc ? sc.thaiAction : "—");
    const sigChip = ev.signal && window.Scoring ? window.Scoring.renderSignalChip(ev.signal, { size: "sm" }) : "";
    const rules = (ev.triggeredRules || []).map((x) => `<span class="wl-rule">${esc(x.label)}</span>`)
      .concat((ev.nearTriggerRules || []).map((x) => `<span class="wl-rule near">~${esc(x.label)}</span>`)).slice(0, 3).join("");
    return `<article class="mc-card wl-card">
      <div class="wl-card-head">
        <div>
          <a class="wl-sym asset-link" href="/asset/${encodeURIComponent(it.providerSymbol || it.canonicalSymbol)}">${esc(it.displaySymbol)}</a>
          <span class="wl-name">${esc(it.assetName || "")}</span>
          <span class="wl-cat">${esc(cat.thai)}${it.source === "ai_boom" ? ' · <span class="wl-src">AI Boom</span>' : ""}</span>
        </div>
        <span class="wl-status-chip wl-st-${ev.status}">${esc(WL.STATUS_THAI[ev.status] || ev.status)}</span>
      </div>
      ${sigChip ? `<div class="signal-state-row" style="margin:8px 0 2px;">${sigChip}</div>` : ""}
      <div class="wl-card-metrics">
        <div><span>ราคา/NAV</span> <strong>${cur}${num(ev.price)}</strong></div>
        <div><span>Signal Score (ตัวประกอบ)</span> <strong>${timing == null ? "—" : timing}</strong></div>
        <div><span>Action</span> <strong>${esc(action)}</strong></div>
        <div><span>Severity</span> <strong>${esc(ev.severity || "-")}</strong></div>
      </div>
      <p class="wl-card-reason">${esc(ev.thaiReason || "")}</p>
      ${rules ? `<div class="wl-rules">${rules}</div>` : ""}
      <div class="wl-card-actions">
        <a href="/asset/${encodeURIComponent(it.providerSymbol || it.canonicalSymbol)}">ดู Asset 360 →</a>
        <button type="button" data-edit="${esc(it.id)}">แก้ไข</button>
        <button type="button" data-remove="${esc(it.id)}">ลบ</button>
      </div>
    </article>`;
  }

  function recentlyTriggered() {
    const hist = (WL.readHistory() || []).slice(0, 20);
    if (!hist.length) return panel("Recently Triggered Alerts", "ประวัติแจ้งเตือนล่าสุด", `<div class="mc-empty"><strong>ยังไม่มีประวัติแจ้งเตือน</strong>จะบันทึกเมื่อกด Load Latest Data แล้วมีรายการเข้าเงื่อนไข</div>`);
    return panel("Recently Triggered Alerts", "ประวัติแจ้งเตือนล่าสุด", `<table class="wl-table">
      <thead><tr><th>เวลา</th><th>Symbol</th><th>Alert</th><th>รายละเอียด</th><th class="num">Timing</th><th>สถานะ</th></tr></thead>
      <tbody>${hist.map((h) => `<tr><td>${esc(String(h.at || "").slice(5, 16).replace("T", " "))}</td><td>${esc(h.displaySymbol || h.canonicalSymbol)}</td><td>${esc(h.alert || "")}</td><td>${esc(h.detail || "")}</td><td class="num">${esc(String(h.timingScore == null ? "—" : h.timingScore))}</td><td>${esc(h.status || "")}</td></tr>`).join("")}</tbody>
    </table>`);
  }

  function tableSection(rows) {
    if (!rows.length) return "";
    const sorted = rows.slice().sort((a, b) => {
      const ord = { triggered: 0, near: 1, risk: 2, improving: 3, none: 4, missing: 5 };
      return (ord[a.ev.status] - ord[b.ev.status]) || (SEV_RANK[b.ev.severity] || 0) - (SEV_RANK[a.ev.severity] || 0) || (fin(b.ev.timingScore) || 0) - (fin(a.ev.timingScore) || 0);
    });
    return panel("Watchlist Table", "ตารางรวม", `<table class="wl-table">
      <thead><tr><th>Symbol</th><th>หมวด</th><th class="num">ราคา</th><th class="num">Timing</th><th>สถานะ</th><th>เข้าเงื่อนไข</th><th></th></tr></thead>
      <tbody>${sorted.map((r) => {
        const it = r.item, ev = r.ev, cur = curFor(it);
        return `<tr>
          <td><a class="asset-link" href="/asset/${encodeURIComponent(it.providerSymbol || it.canonicalSymbol)}"><strong>${esc(it.displaySymbol)}</strong></a></td>
          <td>${esc((WL.CATEGORIES[it.watchCategory] || {}).thai || "")}</td>
          <td class="num">${cur}${num(ev.price)}</td>
          <td class="num">${ev.timingScore == null ? "—" : ev.timingScore}</td>
          <td><span class="wl-status-chip wl-st-${ev.status}">${esc(WL.STATUS_THAI[ev.status] || ev.status)}</span></td>
          <td>${(ev.triggeredRules || []).map((x) => esc(x.label)).slice(0, 2).join(", ") || "—"}</td>
          <td><span class="wl-act" data-edit="${esc(it.id)}">แก้ไข</span> · <span class="wl-act" data-remove="${esc(it.id)}">ลบ</span></td>
        </tr>`;
      }).join("")}</tbody></table>`);
  }

  function archivedSection(archived) {
    if (!archived.length) return "";
    return panel("Archived / Inactive", "รายการที่ปิดติดตาม", `<table class="wl-table">
      <thead><tr><th>Symbol</th><th>หมวด</th><th></th></tr></thead>
      <tbody>${archived.map((it) => `<tr><td>${esc(it.displaySymbol)}</td><td>${esc((WL.CATEGORIES[it.watchCategory] || {}).thai || "")}</td><td><span class="wl-act" data-activate="${esc(it.id)}">เปิดใหม่</span> · <span class="wl-act" data-remove="${esc(it.id)}">ลบถาวร</span></td></tr>`).join("")}</tbody></table>`);
  }

  function panel(title, sub, body) {
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>${esc(title)}</h2>${sub ? `<span class="mc-sub">${esc(sub)}</span>` : ""}</div></div>
      ${body}
    </section>`;
  }

  function wire() {
    const addBtn = document.getElementById("wlAddBtn");
    if (addBtn) addBtn.addEventListener("click", () => WL.openModal({}));
    const addBtn2 = document.getElementById("wlAddBtn2");
    if (addBtn2) addBtn2.addEventListener("click", () => WL.openModal({}));
    const syncBtn = document.getElementById("wlSyncBtn");
    if (syncBtn) syncBtn.addEventListener("click", () => syncNow(syncBtn));
    const syncBtn2 = document.getElementById("wlSyncBtn2");
    if (syncBtn2) syncBtn2.addEventListener("click", () => syncNow(syncBtn2));
    root.addEventListener("click", (e) => {
      const qadd = e.target.closest("[data-qadd]");
      const edit = e.target.closest("[data-edit]");
      const remove = e.target.closest("[data-remove]");
      const activate = e.target.closest("[data-activate]");
      if (qadd) { const s = lastSuggestions.find((x) => x.canonicalSymbol === qadd.dataset.qadd); if (s) WL.openModal(s); }
      else if (edit) { const it = WL.read().find((x) => x.id === edit.dataset.edit); if (it) WL.openModal(it); }
      else if (remove) { if (window.confirm("ลบรายการนี้ออกจาก Watchlist?")) WL.remove(remove.dataset.remove); }
      else if (activate) { WL.activate(activate.dataset.activate); }
    });
  }

  window.addEventListener("watchlist-updated", render);
  window.addEventListener("portfolio-data-snapshot", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
