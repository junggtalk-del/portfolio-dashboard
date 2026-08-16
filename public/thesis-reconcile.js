(function () {
  "use strict";

  // ============================================================
  // Thesis ⊗ Technical reconciliation — SHARED module. One rule matrix used by
  // BOTH Action Center and Asset 360 so the two pages can never disagree
  // (user: "ข้อมูลควรล้อกัน"). Pure logic here; pages adapt the result onto
  // their own decision objects. Deterministic — no LLM, no fetch.
  //
  // Sell-side matrix (held + covered + technical SELL_ALL/SELL_FIRST):
  //  1) thesis <55 / broken            → keep technical action (aligned)
  //  2) ≥70 + cheap/fair + external dip (macro/rotation/healthy)
  //     + trend not deteriorating + gates open → BUY_DIP (cap ≤10% of bucket
  //     when a Quarterly-Editor gross basis exists; else uncapped w/ note)
  //  3) ≥70 + cheap/fair (conditions incomplete) → HOLD_CORE
  //  4) 55-69 → SELL_ALL demoted to SELL_FIRST (partial reduce)
  // ============================================================

  var BUY_DIP_MAX_PCT = 10;
  var VAL_TH = { cheap: "ถูก", fair: "สมเหตุสมผล", premium: "พรีเมียม", expensive: "แพง" };

  // th = summary from summarize(); alloc = {pct, basis, quarterly} | null; origReason = string
  function reconcileSell(actionKey, th, alloc, origReason) {
    if (!th) return null;
    if (actionKey !== "SELL_ALL" && actionKey !== "SELL_FIRST") return null;
    var valGood = th.valLevel === "cheap" || th.valLevel === "fair";
    var dipExternal = th.dipClassKey === "macro" || th.dipClassKey === "rotation" || th.dipClassKey === "healthy";
    var valTxt = VAL_TH[th.valLevel] || th.valLevel || "-";
    var orig = origReason || "";

    if (th.score < 55 || th.dipClassKey === "broken") {
      return {
        unchanged: true, key: actionKey, code: "review", section: "urgent", thaiAction: null,
        reason: "Thesis อ่อนสอดคล้องสัญญาณขาย (" + th.score + "/100 · " + th.decisionLabel + ") · " + orig,
        conflict: null
      };
    }
    if (th.score >= 70 && valGood && dipExternal && th.trendKey !== "deteriorating"
      && th.gateOpen === true && th.macroOk !== false) {
      var conflictBuy = { label: "THESIS", severity: "medium", reason: "เทคนิคเป็นสัญญาณขาย แต่ Thesis จัดเป็นการย่อภายนอก (" + th.dipClassLabel + ") — ซื้อเพิ่มแบบมีเพดาน" };
      if (!alloc || !alloc.quarterly) {
        return {
          unchanged: false, key: "BUY_DIP", code: "buy", section: "buy",
          thaiAction: "ทยอยซื้อเพิ่ม (Buy the Dip)",
          reason: "ย่อจาก " + th.dipClassLabel + " — พื้นฐานแข็ง (Thesis " + th.score + ") valuation " + valTxt + " เกต Mega Trend/Macro เปิด · เพดาน " + BUY_DIP_MAX_PCT + "% จะคุมให้เมื่อกำหนดมูลค่า bucket ในหน้า Portfolio (Quarterly Editor)",
          conflict: conflictBuy
        };
      }
      if (alloc.pct < BUY_DIP_MAX_PCT) {
        return {
          unchanged: false, key: "BUY_DIP", code: "buy", section: "buy",
          thaiAction: "ทยอยซื้อเพิ่ม (Buy the Dip)",
          reason: "ย่อจาก " + th.dipClassLabel + " — พื้นฐานแข็ง (Thesis " + th.score + ") valuation " + valTxt + " เกต Mega Trend/Macro เปิด · จำกัดน้ำหนักรวม ≤" + BUY_DIP_MAX_PCT + "% ของ" + alloc.basis + " (ตอนนี้ " + alloc.pct.toFixed(1) + "% · เหลือ " + (BUY_DIP_MAX_PCT - alloc.pct).toFixed(1) + "pp)",
          conflict: conflictBuy
        };
      }
      return {
        unchanged: false, key: "HOLD_LIMIT", code: "watch", section: "watch",
        thaiAction: "ถือ — เต็มเพดาน " + BUY_DIP_MAX_PCT + "% แล้ว",
        reason: "เข้าเกณฑ์ซื้อเพิ่ม (ย่อจาก " + th.dipClassLabel + " · Thesis " + th.score + " · valuation " + valTxt + ") แต่น้ำหนักปัจจุบัน " + alloc.pct.toFixed(1) + "% ชนเพดาน " + BUY_DIP_MAX_PCT + "% ของ" + alloc.basis,
        conflict: null
      };
    }
    if (th.score >= 70 && valGood) {
      var why = th.dipClassKey === "fundamental" ? "การย่อมีกลิ่นปัญหาเฉพาะตัว — รอความชัดเจนของงบ"
        : th.trendKey === "deteriorating" ? "ผลประกอบการล่าสุดแผ่วลง — รอไตรมาสยืนยัน"
        : th.gateOpen === false ? "เกต Mega Trend ปิด" : th.macroOk === false ? "Macro Risk-Off" : "เงื่อนไขสะสมยังไม่ครบ";
      return {
        unchanged: false, key: "HOLD_CORE", code: "watch", section: "watch",
        thaiAction: "ถือ Core / ลดเฉพาะ Tactical — พื้นฐานยังแข็ง",
        reason: "Thesis " + th.score + "/100 (" + th.statusLabel + ") valuation " + valTxt + " — ไม่ขายทิ้งทั้งหมดจากเทคนิคเดี่ยว ๆ · " + why,
        conflict: { label: "THESIS", severity: "medium", reason: "เทคนิคขาย แต่ Thesis " + th.score + " + valuation " + valTxt + " — ลดได้เฉพาะส่วน tactical" }
      };
    }
    // 55-69 กลาง ๆ / valuation แพง
    var demoted = actionKey === "SELL_ALL";
    return {
      unchanged: !demoted, key: demoted ? "SELL_FIRST" : actionKey, code: "review", section: "urgent",
      thaiAction: demoted ? "ลดน้ำหนักบางส่วน — Thesis กลาง (" + th.score + ")" : null,
      reason: demoted ? "Thesis " + th.score + "/100 ยังไม่เสีย — ไม่ต้องออกทั้งหมด ลดบางส่วนพอ · " + orig : orig,
      conflict: { label: "THESIS", severity: "medium", reason: "Thesis " + th.score + "/100 (" + th.statusLabel + ") — สัญญาณขายเทคนิคควรใช้แบบลดบางส่วน" }
    };
  }

  function reviewOverride(th) {
    return Boolean(th && (th.decisionKey === "review-thesis" || th.score < 55));
  }

  // Extract the reconcile-relevant summary from a full ThesisEngine.compute()
  // output (browser: engines must be loaded; returns null when not covered).
  function summarize(symbol, snapshot) {
    var TE = typeof window !== "undefined" ? window.ThesisEngine : null;
    var TD = typeof window !== "undefined" ? window.ThesisData : null;
    if (!TE || typeof TE.compute !== "function" || !TD) return null;
    var key = String(symbol || "").trim().toUpperCase();
    var covered = {};
    (TE.companiesFrom ? TE.companiesFrom(TD) : []).forEach(function (c) { covered[String(c.ticker).toUpperCase()] = true; });
    if (!covered[key]) {
      if (key === "GOOGL" && covered.GOOG) key = "GOOG";
      else return null;
    }
    try {
      var o = TE.compute(key, snapshot || {}, {});
      if (!o || !o.available) return null;
      return {
        ticker: key,
        score: o.thesis.score,
        statusLabel: o.thesis.status ? o.thesis.status.label : "",
        statusThai: o.thesis.status ? o.thesis.status.thai : "",
        trendKey: o.thesis.trend ? o.thesis.trend.key : null,
        trendThai: o.thesis.trend ? o.thesis.trend.thai : "",
        decisionKey: o.decision.key,
        decisionLabel: o.decision.label,
        decisionThai: o.decision.thai,
        answer: o.finalVerdict ? o.finalVerdict.answer : "WAIT",
        dipClassKey: o.dipClass ? o.dipClass.key : null,
        dipClassLabel: o.dipClass ? o.dipClass.label : "",
        valLevel: o.valuationView ? o.valuationView.level : null,
        gateOpen: o.inputs && o.inputs.megaTrend ? o.inputs.megaTrend.gateOpen : null,
        macroOk: o.inputs && o.inputs.regime ? o.inputs.regime.score >= 40 : null,
        stale: Boolean(o.stale),
        staleMonths: o.staleMonths
      };
    } catch (_e) { return null; }
  }

  // สัดส่วนตำแหน่ง (% ของ bucket) จาก snapshot — ให้ทุกหน้าใช้เพดาน 10% เดียวกัน
  // (เดิม Action Center คิดเองหน้าเดียว → Asset 360/Home ไม่เคยติดเพดาน แนะนำสวนกัน)
  // denominator: PMEngine.quarterlyBuckets ถ้ามี → fallback ผลรวมหุ้นธงแดง bucket เดียวกัน
  function allocOf(symbol, snapshot) {
    try {
      var hs = snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data;
      if (!Array.isArray(hs) || !hs.length) return null;
      var K = String(symbol || "").toUpperCase();
      var match = function (c) { return c === K || (K === "GOOG" && c === "GOOGL") || (K === "GOOGL" && c === "GOOG"); };
      var bucketOf = function (h, c) {
        return h.portfolioBucket || (c.indexOf(".BK") >= 0 ? "thai-stock" : (c.indexOf("BTC") >= 0 ? "bitcoin" : "foreign-stock"));
      };
      var value = 0, bucket = null, bucketSum = 0;
      hs.forEach(function (h) {
        if (!h || !h.isHolding) return;
        var c = String(h.canonicalSymbol || h.ticker || "").toUpperCase();
        var mv = Number(h.marketValue); if (!isFinite(mv) || mv <= 0) mv = 0;
        if (match(c)) { value += mv; if (!bucket) bucket = bucketOf(h, c); }
      });
      if (value <= 0 || !bucket) return null;
      hs.forEach(function (h) {
        if (!h || !h.isHolding) return;
        var c = String(h.canonicalSymbol || h.ticker || "").toUpperCase();
        var mv = Number(h.marketValue); if (!isFinite(mv) || mv <= 0) return;
        if (bucketOf(h, c) === bucket) bucketSum += mv;
      });
      var PME = typeof window !== "undefined" ? window.PMEngine : null;
      var denom = 0, basis = bucket, quarterly = false;
      if (PME && typeof PME.quarterlyBuckets === "function") {
        try {
          var qb = PME.quarterlyBuckets(snapshot);
          var g = qb && qb[bucket] != null ? Number(qb[bucket]) : (qb && qb.buckets && qb.buckets[bucket] != null ? Number(qb.buckets[bucket]) : NaN);
          if (isFinite(g) && g > 0) { denom = g; quarterly = true; }
        } catch (eq) { }
      }
      if (!denom && bucketSum > 0) { denom = bucketSum; basis = bucket + " (เฉพาะที่ปักธง)"; }
      if (!denom) return null;
      return { value: value, pct: (value / denom) * 100, basis: basis, quarterly: quarterly };
    } catch (e) { return null; }
  }

  // Asset 360 adapter: reconcile a raw Scoring action object for a symbol.
  // Returns { thesis, action (possibly replaced), note } — action keeps the
  // same shape the asset page renders ({key, action, thaiAction, thaiReason}).
  // alloc: optional — ไม่ส่ง = คำนวณจาก snapshot อัตโนมัติ (เพดาน 10% ทำงานทุกหน้า)
  function forAsset(symbol, snapshot, action, isHolding, alloc) {
    var th = summarize(symbol, snapshot);
    if (!th) return { thesis: null, action: action, note: null };
    if (isHolding && reviewOverride(th)) {
      return {
        thesis: th,
        action: {
          key: "REVIEW_THESIS", action: "Review Holding",
          thaiAction: "ทบทวนการถือ — Thesis อ่อน (" + th.score + "/100)",
          thaiReason: "Investment Thesis อ่อน (" + th.score + "/100 · " + th.decisionLabel + ") — ทบทวนเหตุผลการถือก่อนตัดสินใจใด ๆ"
        },
        note: "Thesis " + th.score + "/100 (" + th.statusLabel + ") — " + th.decisionThai
      };
    }
    if (isHolding && action && (action.key === "SELL_ALL" || action.key === "SELL_FIRST")) {
      if (alloc === undefined) alloc = allocOf(symbol, snapshot);
      var res = reconcileSell(action.key, th, alloc || null, action.thaiReason || "");
      if (res && !res.unchanged) {
        return {
          thesis: th,
          action: { key: res.key, action: res.key === "BUY_DIP" ? "Buy the Dip (capped)" : res.key === "HOLD_CORE" ? "Hold Core / Trim Tactical" : res.key === "HOLD_LIMIT" ? "Hold (at cap)" : "Reduce Partial", thaiAction: res.thaiAction, thaiReason: res.reason },
          note: res.conflict ? res.conflict.reason : null
        };
      }
      if (res) return { thesis: th, action: { key: action.key, action: action.action, thaiAction: action.thaiAction, thaiReason: res.reason }, note: null };
    }
    return { thesis: th, action: action, note: null };
  }

  var api = { BUY_DIP_MAX_PCT: BUY_DIP_MAX_PCT, VAL_TH: VAL_TH, reconcileSell: reconcileSell, reviewOverride: reviewOverride, summarize: summarize, forAsset: forAsset, allocOf: allocOf };
  if (typeof window !== "undefined") window.ThesisReconcile = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
