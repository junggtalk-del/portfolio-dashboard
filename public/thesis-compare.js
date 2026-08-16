(function () {
  "use strict";
  // ============================================================
  // Thesis Compare — เทียบหุ้นใน Investment Thesis KB แบบ side-by-side
  // pure HTML-string builder: render(tickers, snapshot, deps?) → html
  // อ่านจาก ThesisEngine / ValuationEngine / ThesisData เท่านั้น (read-only)
  // ไม่มีสูตรใหม่ — ทุกตัวเลขมาจาก engine เดิม ตัวไหนไม่มีข้อมูล = "—" ไม่เดา
  // ============================================================

  // 7 สีที่แยกออกจากกันบนพื้นเข้ม — index ตรงกับลำดับที่ผู้ใช้เลือก (ชิป/หัวคอลัมน์/เรดาร์ ใช้ชุดเดียวกัน)
  var TCOLORS = ["#38bdf8", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#fb7185", "#22d3ee"];
  var MAXSEL = 7;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fin(v) { v = Number(v); return isFinite(v) ? v : null; }
  function fmt(v, suffix) { return v == null ? "—" : v + (suffix || ""); }
  function r1(v) { return v == null ? null : Math.round(v * 10) / 10; }
  function avg(arr) { var a = arr.filter(function (v) { return v != null; }); return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : null; }
  function scoreColor(v) { return v == null ? "#64748b" : v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#f43f5e"; }

  function getDeps(deps) {
    deps = deps || {};
    var W = typeof window !== "undefined" ? window : {};
    return {
      TE: deps.TE || W.ThesisEngine,
      VE: deps.VE || W.ValuationEngine,
      D: deps.data || W.ThesisData
    };
  }

  // ---- รวบข้อมูลต่อ ticker จาก engine เดิมทั้งหมด (null-safe ทุกชั้น) ----
  function packOf(T, snapshot, dp) {
    var p = { ticker: T, name: T, ok: false };
    var cfg = dp.D && dp.D.companies ? dp.D.companies[T] : null;
    if (cfg) p.name = cfg.name || T;
    var R = null, H = null, V = null;
    try { R = dp.TE.compute(T, snapshot || {}, { data: dp.D }); } catch (e) { R = null; }
    if (!R || !R.available) return p;
    p.ok = true;
    try { H = dp.TE.computeHistory(T, snapshot || {}, { data: dp.D, thesisScore: R.thesis ? R.thesis.score : null }); } catch (e2) { H = null; }
    try { V = dp.VE && dp.VE.compute ? dp.VE.compute(T, snapshot || {}, { data: dp.D }) : null; } catch (e3) { V = null; }

    p.layer = cfg ? cfg.layer : null;
    p.asOf = R.asOf || null;
    p.thesis = R.thesis ? fin(R.thesis.score) : null;
    p.statusTh = R.thesis && R.thesis.status ? R.thesis.status.thai : null;
    p.statusTone = R.thesis && R.thesis.status ? R.thesis.status.tone : "neutral";
    p.decisionTh = R.decision && R.decision.action ? (R.decision.action.thai || R.decision.action.label) : null;
    p.confidence = R.confidence ? fin(R.confidence.score) : null;
    p.riskCount = cfg && cfg.risks ? cfg.risks.length : null;
    p.nextEarnings = cfg ? (cfg.nextEarnings || null) : null;

    // fundamentals: 10 คีย์ + ค่าเฉลี่ย
    p.fund = {};
    var fsum = [];
    ((cfg && cfg.fundamentals) || []).forEach(function (f) {
      if (!f || !f.key) return;
      p.fund[f.key] = { score: fin(f.score), trend: f.trend || null, current: f.current || null };
      fsum.push(fin(f.score));
    });
    p.fundAvg = avg(fsum);
    p.valuationCurated = p.fund.valuation ? p.fund.valuation.score : null;

    p.aiExec = cfg && cfg.aiExecution ? fin(cfg.aiExecution.score) : null;
    p.consistency = cfg && cfg.revenueQuality ? fin(cfg.revenueQuality.consistency) : null;
    p.acceleration = cfg && cfg.revenueQuality ? cfg.revenueQuality.acceleration : null;
    p.capAlloc = cfg && cfg.capitalAllocation ? fin(cfg.capitalAllocation.score) : null;
    p.moatOverall = cfg && cfg.competitive ? cfg.competitive.overall : null;
    p.moatStrengthening = cfg && cfg.competitive && cfg.competitive.factors
      ? cfg.competitive.factors.filter(function (f) { return f.status === "strengthening"; }).length : null;

    // growth (Business Growth vs Price)
    if (H && H.available && H.metrics) {
      p.revCagr = fin(H.metrics.revCagrPct);
      p.epsCagr = fin(H.metrics.epsCagrPct);
      p.priceCagr = fin(H.metrics.priceCagrPct);
      p.gapPp = fin(H.metrics.gapPp);
      p.growthVerdict = H.verdict ? H.verdict.thai : null;
      p.growthYears = H.window ? H.window.years : null;
    }

    // valuation engine (คำนวณสด)
    if (V && V.available) {
      p.pe = V.pe ? V.pe.current : null;
      p.peMedian = V.history ? V.history.median : null;
      p.peObs = V.history ? V.history.sampleCount : null;
      p.premium = V.premiumVsMedianPct;
      p.pctile = V.percentile ? V.percentile.value : null;
      p.pctileLabel = V.percentile ? V.percentile.label : null;
      p.valClass = V.classification || null;
      p.fwdPe = V.forwardPe ? V.forwardPe.pe : null;
      p.fwdBasis = V.forwardPe ? V.forwardPe.epsBasis : null;
      p.priceStale = V.price ? !!V.price.stale : false;
    }

    // forwardView
    var FV = cfg ? cfg.forwardView : null;
    if (FV) {
      var c0 = (FV.consensus || []).filter(function (c) { return c && c.fy && (c.eps != null || c.revenue != null); })[0] || null;
      if (c0) p.consensus = { fy: c0.fy, eps: c0.eps, revenue: c0.revenue, basis: c0.basis || "unknown" };
      var ng = (FV.guidanceTrack || []).filter(function (g) { return g.result !== "noGuidance"; });
      var mags = ng.filter(function (g) { return g.magnitudePct != null && isFinite(Number(g.magnitudePct)); }).map(function (g) { return Number(g.magnitudePct); });
      if (ng.length) {
        p.beatRatio = Math.round(100 * ng.filter(function (g) { return g.result === "beat"; }).length / ng.length);
        p.beatN = ng.length;
        if (mags.length) {
          var s = mags.slice().sort(function (a, b) { return a - b; });
          p.beatMedian = r1(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
        }
      } else if ((FV.guidanceTrack || []).length) {
        p.noGuidance = true; // บริษัทไม่ให้ guidance เป็นนโยบาย
      }
    }
    return p;
  }

  // ---- cell helpers ----
  function scoreCell(v, best) {
    if (v == null) return "<td>—</td>";
    var w = Math.max(0, Math.min(100, v));
    return '<td class="' + (best ? "thc-best" : "") + '"><span class="th-bar thc-bar"><i style="width:' + w + "%;background:" + scoreColor(v) + '"></i></span><b>' + v + "</b></td>";
  }
  function textCell(v, best, sub) {
    return '<td class="' + (best ? "thc-best" : "") + '">' + (v == null || v === "" ? "—" : "<b>" + v + "</b>") + (sub ? '<small class="thc-sub">' + sub + "</small>" : "") + "</td>";
  }
  function bestIdx(vals, dir) { // dir: "max" | "min" — คืน index เดียวเมื่อชนะเด็ดขาด (เสมอ = ไม่ highlight)
    var bi = -1, bv = null;
    vals.forEach(function (v, i) {
      if (v == null) return;
      if (bv == null || (dir === "min" ? v < bv : v > bv)) { bv = v; bi = i; }
    });
    if (bi < 0) return -1;
    var ties = vals.filter(function (v) { return v != null && v === bv; }).length;
    return ties > 1 ? -1 : bi;
  }
  function row(label, cellsHtml, hint) {
    return "<tr><th>" + label + (hint ? '<small class="thc-sub">' + hint + "</small>" : "") + "</th>" + cellsHtml + "</tr>";
  }
  function groupRow(title, n) { return '<tr class="thc-group"><td colspan="' + (n + 1) + '">' + title + "</td></tr>"; }

  // ---- radar 6 แกน (SVG) ----
  var RADAR_AXES = [
    { key: "thesis", label: "Thesis" },
    { key: "fundAvg", label: "พื้นฐาน" },
    { key: "aiExec", label: "AI Exec" },
    { key: "consistency", label: "คุณภาพรายได้" },
    { key: "capAlloc", label: "Capital" },
    { key: "valuationCurated", label: "Valuation" }
  ];
  function radar(packs) {
    var W = 340, H = 300, cx = W / 2, cy = H / 2 + 4, R0 = 108;
    var n = RADAR_AXES.length;
    function pt(i, v) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      var r = R0 * Math.max(0, Math.min(100, v)) / 100;
      return [(cx + r * Math.cos(ang)).toFixed(1), (cy + r * Math.sin(ang)).toFixed(1)];
    }
    var out = '<svg class="thc-radar" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [25, 50, 75, 100].forEach(function (lvl) {
      var ring = [];
      for (var i = 0; i < n; i++) ring.push(pt(i, lvl).join(","));
      out += '<polygon points="' + ring.join(" ") + '" fill="none" stroke="rgba(148,163,184,' + (lvl === 100 ? ".35" : ".14") + ')" stroke-width="1"/>';
    });
    for (var i = 0; i < n; i++) {
      var pAx = pt(i, 100), pLb = pt(i, 128);
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pAx[0] + '" y2="' + pAx[1] + '" stroke="rgba(148,163,184,.14)" stroke-width="1"/>';
      out += '<text x="' + pLb[0] + '" y="' + pLb[1] + '" text-anchor="middle" class="thc-radar-lbl">' + esc(RADAR_AXES[i].label) + "</text>";
    }
    var fillOp = packs.length >= 5 ? ".05" : ".10"; // หลายตัวซ้อนกัน — ลดพื้นทึบไม่ให้เละ
    packs.forEach(function (p, pi) {
      var pts = [], has = false;
      for (var i = 0; i < n; i++) {
        var v = p[RADAR_AXES[i].key];
        if (v != null) has = true;
        pts.push(pt(i, v == null ? 0 : v).join(","));
      }
      if (!has) return;
      var col = TCOLORS[pi % TCOLORS.length];
      out += '<polygon points="' + pts.join(" ") + '" fill="' + col + '" fill-opacity="' + fillOp + '" stroke="' + col + '" stroke-width="' + (packs.length >= 5 ? 1.7 : 2) + '"><title>' + esc(p.ticker) + "</title></polygon>";
    });
    out += "</svg>";
    return out;
  }

  function render(tickers, snapshot, deps) {
    var dp = getDeps(deps);
    if (!dp.TE || !dp.D) return '<div class="mc-empty"><strong>Compare ไม่พร้อม</strong> — โหลดสคริปต์ไม่ครบ</div>';
    var list = (tickers || []).slice(0, MAXSEL);
    if (list.length < 2) {
      return '<div class="thc-empty mc-empty"><strong>โหมดเทียบหุ้น</strong><br>เลือกบริษัทจากแถบด้านบน 2-' + MAXSEL + " ตัว (กดชิปเพื่อเลือก/เอาออก) แล้วตารางเทียบจะขึ้นที่นี่</div>";
    }
    // ตารางกว้างขึ้นเมื่อเลือกหลายตัว — ให้เลื่อนแนวนอนแทนการบีบคอลัมน์จนอ่านไม่ออก
    var manyCls = list.length >= 5 ? " thc-many" : "";
    var packs = list.map(function (t) { return packOf(t, snapshot, dp); });
    var bad = packs.filter(function (p) { return !p.ok; });
    packs = packs.filter(function (p) { return p.ok; });
    if (packs.length < 2) {
      return '<div class="thc-empty mc-empty"><strong>เทียบไม่ได้</strong><br>' +
        esc(bad.map(function (b) { return b.ticker; }).join(", ")) + " ยังคำนวณไม่ได้ (ไม่มีข้อมูล thesis) — เลือกตัวอื่นเพิ่ม</div>";
    }
    var n = packs.length;

    // ---- การ์ดหัว ต่อ ticker ----
    var heads = packs.map(function (p, i) {
      var col = TCOLORS[i % TCOLORS.length];
      return '<div class="thc-head" style="border-top:3px solid ' + col + '">' +
        '<div class="thc-head-t"><b style="color:' + col + '">' + esc(p.ticker) + "</b><span>" + esc(p.name) + "</span></div>" +
        '<div class="thc-head-score" style="color:' + scoreColor(p.thesis) + '">' + fmt(p.thesis) + "<small>/100</small></div>" +
        '<div class="thc-head-sub">' + esc(p.statusTh || "—") + (p.layer ? " · " + esc(p.layer) : "") + "</div>" +
        (p.decisionTh ? '<div class="thc-head-dec">' + esc(p.decisionTh) + "</div>" : "") +
        "</div>";
    }).join("");

    // ---- ตารางเทียบ ----
    var TH = "<tr><th></th>" + packs.map(function (p, i) {
      return '<th class="thc-col" style="color:' + TCOLORS[i % TCOLORS.length] + '">' + esc(p.ticker) + "</th>";
    }).join("") + "</tr>";
    var rows = "";

    function scoreRow(label, key, hint) {
      var vals = packs.map(function (p) { return p[key]; });
      var bi = bestIdx(vals, "max");
      rows += row(label, packs.map(function (p, i) { return scoreCell(vals[i], i === bi); }).join(""), hint);
    }

    rows += groupRow("ภาพรวม thesis", n);
    scoreRow("Thesis Score", "thesis");
    scoreRow("Confidence", "confidence");
    rows += row("ชี้ขาดตอนนี้", packs.map(function (p) { return textCell(p.decisionTh && esc(p.decisionTh)); }).join(""));
    rows += row("ความเสี่ยงที่จดไว้", packs.map(function (p) { return textCell(p.riskCount != null ? p.riskCount + " ข้อ" : null); }).join(""));
    rows += row("ข้อมูล ณ / งบถัดไป", packs.map(function (p) { return textCell(esc(p.asOf || "—"), false, p.nextEarnings ? "งบ ~" + esc(p.nextEarnings) : null); }).join(""));

    rows += groupRow("Valuation (คำนวณสดจาก Valuation Engine)", n);
    (function () {
      var vals = packs.map(function (p) { return p.pe; });
      rows += row("P/E ปัจจุบัน (TTM)", packs.map(function (p, i) {
        return textCell(p.pe != null ? "~" + p.pe : null, false, p.priceStale ? "⚠ ราคา stale" : null);
      }).join(""), "ต่ำ ≠ ดีเสมอ — ดูคู่กับโน้ตฐานกำไร");
      var bi = bestIdx(packs.map(function (p) { return p.premium; }), "min");
      rows += row("เทียบ median อดีตตัวเอง", packs.map(function (p, i) {
        return textCell(p.premium != null ? (p.premium >= 0 ? "+" : "") + p.premium + "%" : null, i === bi, p.peMedian != null ? "median ~" + p.peMedian + " (" + p.peObs + " ปี)" : null);
      }).join(""), "ติดลบ = ถูกกว่าค่ากลางอดีตของตัวมันเอง");
      rows += row("Percentile / สถานะ", packs.map(function (p) {
        return textCell(p.valClass ? esc(p.valClass.replace(/_/g, " ")) : null, false, p.pctile != null ? "pct " + p.pctile + " (" + esc(p.pctileLabel || "") + ")" : "percentile ไม่พอ");
      }).join(""));
      rows += row("Forward P/E", packs.map(function (p) {
        return textCell(p.fwdPe != null ? "~" + p.fwdPe : null, false, p.fwdBasis ? "ฐาน " + esc(p.fwdBasis) : null);
      }).join(""));
    })();

    rows += groupRow("การเติบโตเทียบราคา (Business Growth vs Price)", n);
    (function () {
      var bi = bestIdx(packs.map(function (p) { return p.revCagr; }), "max");
      rows += row("Revenue CAGR", packs.map(function (p, i) { return textCell(p.revCagr != null ? "~" + p.revCagr + "%/ปี" : null, i === bi, p.growthYears ? p.growthYears + " ปี" : null); }).join(""));
      bi = bestIdx(packs.map(function (p) { return p.epsCagr; }), "max");
      rows += row("EPS CAGR", packs.map(function (p, i) { return textCell(p.epsCagr != null ? "~" + p.epsCagr + "%/ปี" : null, i === bi); }).join(""));
      rows += row("Price CAGR", packs.map(function (p) { return textCell(p.priceCagr != null ? "~" + p.priceCagr + "%/ปี" : null); }).join(""));
      bi = bestIdx(packs.map(function (p) { return p.gapPp; }), "min");
      rows += row("Gap ราคา−พื้นฐาน", packs.map(function (p, i) {
        return textCell(p.gapPp != null ? (p.gapPp >= 0 ? "+" : "") + p.gapPp + "pp/ปี" : null, i === bi, p.growthVerdict ? esc(p.growthVerdict) : null);
      }).join(""), "ติดลบ = ธุรกิจวิ่งนำราคา");
    })();

    rows += groupRow("คุณภาพธุรกิจ (curated)", n);
    scoreRow("พื้นฐานเฉลี่ย 10 ด้าน", "fundAvg");
    scoreRow("AI Execution", "aiExec");
    scoreRow("คุณภาพรายได้ (consistency)", "consistency");
    rows += row("ทิศทางรายได้", packs.map(function (p) {
      var a = p.acceleration;
      return textCell(a === "accelerating" ? "เร่งขึ้น" : a === "steady" ? "ทรงตัว" : a === "decelerating" ? "แผ่วลง" : null);
    }).join(""));
    scoreRow("Capital Allocation", "capAlloc");
    scoreRow("Valuation (curated · ถูก=สูง)", "valuationCurated");
    rows += row("Moat", packs.map(function (p) {
      var o = p.moatOverall;
      return textCell(o === "strengthening" ? "แข็งขึ้น" : o === "stable" ? "ทรงตัว" : o === "weakening" ? "อ่อนลง" : null,
        false, p.moatStrengthening != null ? p.moatStrengthening + "/8 ปัจจัยแข็งขึ้น" : null);
    }).join(""));

    rows += groupRow("ความคาดหวังข้างหน้า (forwardView)", n);
    rows += row("Consensus ปีหน้า", packs.map(function (p) {
      var c = p.consensus;
      return textCell(c && c.eps != null ? "EPS ~$" + c.eps : (c && c.revenue != null ? "rev ~$" + c.revenue + "B" : null),
        false, c ? esc(c.fy) + (c.revenue != null && c.eps != null ? " · rev ~$" + c.revenue + "B" : "") + " · ฐาน " + esc(c.basis) : "ยังไม่มี forwardView");
    }).join(""));
    rows += row("วินัย guidance", packs.map(function (p) {
      if (p.noGuidance) return textCell("ไม่ให้ guidance", false, "นโยบายบริษัท");
      return textCell(p.beatRatio != null ? "beat " + p.beatRatio + "%" : null,
        false, p.beatRatio != null ? p.beatN + " ไตรมาส" + (p.beatMedian != null ? " · median +" + p.beatMedian + "%" : "") : null);
    }).join(""));

    // ---- fundamentals รายคีย์ (พับเก็บ) ----
    var FUND_LABELS = { revenueGrowth: "การเติบโตรายได้", epsGrowth: "การเติบโตกำไร", fcf: "กระแสเงินสดอิสระ", margin: "อัตรากำไร", roic: "ROIC", cash: "เงินสด", debt: "หนี้", dilution: "Dilution", capitalAllocation: "จัดสรรทุน", valuation: "Valuation (ถูก=สูง)" };
    var fundRows = "";
    Object.keys(FUND_LABELS).forEach(function (k) {
      var vals = packs.map(function (p) { return p.fund[k] ? p.fund[k].score : null; });
      var bi = bestIdx(vals, "max");
      fundRows += row(FUND_LABELS[k], packs.map(function (p, i) {
        var f = p.fund[k];
        return f && f.score != null
          ? '<td class="' + (i === bi ? "thc-best" : "") + '"><span class="th-bar thc-bar"><i style="width:' + Math.max(0, Math.min(100, f.score)) + "%;background:" + scoreColor(f.score) + '"></i></span><b>' + f.score + "</b>" + (f.trend ? ' <span class="thc-trend">' + (f.trend === "up" ? "▲" : f.trend === "down" ? "▼" : "▬") + "</span>" : "") + (f.current ? '<small class="thc-sub">' + esc(f.current) + "</small>" : "") + "</td>"
          : "<td>—</td>";
      }).join(""));
    });
    var fundDetail = '<details class="th-fw-src thc-funds"><summary>เจาะพื้นฐานรายด้าน — 10 ด้าน (คะแนน curated + ค่าปัจจุบัน)</summary>' +
      '<div class="th-table-wrap"><table class="th-table thc-table' + manyCls + '">' + TH + fundRows + "</table></div></details>";

    return '<section class="th-sec thc-wrap">' +
      '<div class="th-sec-head"><span class="th-sec-n">⇄</span><div><h2>เทียบหุ้น (' + packs.map(function (p) { return esc(p.ticker); }).join(" vs ") + ")</h2>" +
      "<p>ทุกตัวเลขมาจาก engine เดิม — วงแหวนไฮไลต์ = เด่นสุดในแถวนั้น (เสมอกัน = ไม่ไฮไลต์) · ไม่ใช่คำแนะนำซื้อขาย</p></div></div>" +
      '<div class="thc-heads">' + heads + "</div>" +
      '<div class="thc-radarwrap">' + radar(packs) +
      '<div class="thc-radar-legend">' + packs.map(function (p, i) { return '<span><i style="background:' + TCOLORS[i % TCOLORS.length] + '"></i>' + esc(p.ticker) + "</span>"; }).join("") +
      '<div class="th-hint">เรดาร์ 6 แกน (0-100): Thesis · พื้นฐานเฉลี่ย · AI Execution · คุณภาพรายได้ · Capital Allocation · Valuation curated</div></div></div>' +
      '<div class="th-table-wrap"><table class="th-table thc-table' + manyCls + '">' + TH + rows + "</table></div>" +
      fundDetail +
      (bad.length ? '<div class="th-hint">ไม่ได้เทียบ: ' + esc(bad.map(function (b) { return b.ticker; }).join(", ")) + " (คำนวณไม่ได้)</div>" : "") +
      "</section>";
  }

  var ThesisCompare = { render: render, MAXSEL: MAXSEL, COLORS: TCOLORS };
  if (typeof window !== "undefined") window.ThesisCompare = ThesisCompare;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisCompare;
})();
