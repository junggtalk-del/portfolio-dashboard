"use strict";

// Smoke tests for the Investment Thesis engine (public/thesis-engine.js).
// Run: node scripts/thesis-smoke-test.js

const TE = require("../public/thesis-engine");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + JSON.stringify(detail) + ")" : ""}`); }
}

// ---------------------------------------------------------------- fixtures
function mkCfg(overrides = {}) {
  const F = (key, score, impact = "positive", trend = "up") => ({ key, label: key, current: "~x", trend, score, impact, why: "..." });
  return Object.assign({
    ticker: "TEST", name: "TestCo", layer: "gpu",
    thesis: { statement: "ผู้นำ AI compute", pillars: ["a", "b"] },
    fundamentals: ["revenueGrowth", "epsGrowth", "fcf", "margin", "roic", "cash", "debt", "dilution", "capitalAllocation", "valuation"].map((k) => F(k, overrides.fundScore != null ? overrides.fundScore : 85)),
    revenueQuality: { acceleration: overrides.accel || "accelerating", consistency: 85, recurringPct: 40, note: "...", segments: [{ name: "DC", sharePct: 80, growthNote: "~+60%", trend: "up" }] },
    aiExecution: { score: overrides.aiScore != null ? overrides.aiScore : 90, items: [{ item: "Blackwell", status: "executing", evidence: "..." }] },
    competitive: { overall: overrides.comp || "strengthening", moat: "CUDA", factors: [{ key: "moat", label: "moat", status: overrides.comp || "strengthening", note: "..." }] },
    capitalAllocation: { score: 80, items: [{ label: "CapEx", current: "~", assessment: "good", why: "..." }], verdict: "ดี" },
    valuationView: { level: overrides.val || "fair", note: "..." },
    whatChanged: overrides.whatChanged || [{ metric: "DC rev", prev: "+50%", now: "+60%", direction: "positive" }],
    risks: ["r1"], asOf: "2026-01"
  }, overrides.raw || {});
}
const DATA = (cfg) => ({ asOf: "2026-01", companies: { TEST: cfg } });
// closes helpers
const flat = (n, v) => Array.from({ length: n }, () => v);
function dipSeries(depthPct) { // 90d: high 100 then falls to 100-depth
  const c = flat(60, 100);
  for (let i = 0; i < 40; i++) c.push(100 - depthPct * (i + 1) / 40);
  return c;
}
function snap(stockCloses, marketCloses) {
  return {
    historicalData: {
      TEST: { closes: stockCloses },
      "^GSPC": { closes: marketCloses || flat(100, 100) },
      "^IXIC": { closes: marketCloses || flat(100, 100) },
      "^TNX": { closes: flat(30, 4.0) }
    },
    technicalSignals: { TEST: { latestClose: stockCloses[stockCloses.length - 1], sma200: 80, ema12: 95, ema26 : 90 } },
    scoring: { bySymbol: { TEST: { signalScore: 72, thaiSignalLabel: "Bullish" } } }
  };
}
const MEGA_OK = { available: true, megaTrend: { score: 82, state: { label: "Strong" } }, gate: { open: true }, inputs: { rates: { score: 90, severe: false, pts: 1 } } };
const MEGA_WEAK = { available: true, megaTrend: { score: 45, state: { label: "Weak" } }, gate: { open: false }, inputs: { rates: { score: 90, severe: false, pts: 1 } } };
const REGIME_ON = { available: true, score: 70, regime: { key: "risk-on", label: "Risk-On" } };
const REGIME_OFF = { available: true, score: 30, regime: { key: "risk-off", label: "Risk-Off" } };
const R_EMPTY = { available: true, layers: [] };
const OPTS = (over = {}) => Object.assign({ data: DATA(mkCfg(over.cfg || {})), mega: over.mega !== undefined ? over.mega : MEGA_OK, regime: over.regime !== undefined ? over.regime : REGIME_ON, R: R_EMPTY }, over.opts || {});

// [1] thesis scoring + status
(function () {
  console.log("\n[1] thesis score + status + trend");
  const out = TE.compute("TEST", snap(dipSeries(10)), OPTS());
  check("available", out.available === true, out.reason || out.error);
  check("thesis score high (≥85) → Very Strong", out.thesis.score >= 85 && out.thesis.status.key === "very-strong", out.thesis.score);
  check("trend improving (pos>neg)", out.thesis.trend.key === "improving");
  const det = TE.compute("TEST", snap(dipSeries(10)), OPTS({ cfg: { whatChanged: [{ metric: "m", prev: "a", now: "b", direction: "negative" }, { metric: "n", prev: "a", now: "b", direction: "negative" }] } }));
  check("trend deteriorating (neg>pos)", det.thesis.trend.key === "deteriorating");
  const weak = TE.compute("TEST", snap(dipSeries(10)), OPTS({ cfg: { fundScore: 30, aiScore: 30, comp: "weakening", accel: "decelerating" } }));
  check("weak config → thesis <55", weak.thesis.score < 55, weak.thesis.score);
})();

// [2] falling decomposition
(function () {
  console.log("\n[2] drawdown decomposition");
  // stock -15%, market flat → company-specific dominant (peers fallback = nasdaq flat)
  const out = TE.compute("TEST", snap(dipSeries(15), flat(100, 100)), OPTS());
  check("drawdown ≈ -15%", out.falling.drawdownPct <= -14 && out.falling.drawdownPct >= -16, out.falling.drawdownPct);
  check("primary = company-specific", out.falling.primary && out.falling.primary.key === "company", out.falling.causes.map((c) => c.key));
  // stock -10%, market -9% → market-wide dominant
  const out2 = TE.compute("TEST", snap(dipSeries(10), dipSeries(9)), OPTS());
  check("market fell too → primary market-wide", out2.falling.primary && out2.falling.primary.key === "market", out2.falling.causes.map((c) => [c.key, c.magnitude]));
  // no closes → hasData false
  const s3 = snap(dipSeries(10)); delete s3.historicalData.TEST;
  const out3 = TE.compute("TEST", s3, OPTS());
  check("no stock closes → hasData false, dip no-data", out3.falling.hasData === false && out3.dipClass.key === null);
})();

// [3] dip classification
(function () {
  console.log("\n[3] dip classification");
  const small = TE.compute("TEST", snap(dipSeries(5)), OPTS());
  check("-5% → Healthy Pullback", small.dipClass.key === "healthy", small.dipClass);
  const macro = TE.compute("TEST", snap(dipSeries(12), dipSeries(11)), OPTS());
  check("-12% with market -11% → Macro Pullback", macro.dipClass.key === "macro", macro.dipClass);
  const broken = TE.compute("TEST", snap(dipSeries(20)), OPTS({ cfg: { fundScore: 20, aiScore: 20, comp: "weakening", accel: "decelerating" } }));
  check("thesis <40 → Broken Thesis", broken.dipClass.key === "broken", { score: broken.thesis.score, dip: broken.dipClass.key });
  const fundw = TE.compute("TEST", snap(dipSeries(15), flat(100, 100)), OPTS({ cfg: { fundScore: 55, aiScore: 55, comp: "stable", accel: "steady", whatChanged: [{ metric: "m", prev: "a", now: "b", direction: "negative" }, { metric: "n", prev: "c", now: "d", direction: "negative" }] } }));
  check("company-specific + deteriorating → Fundamental Weakness", fundw.dipClass.key === "fundamental", fundw.dipClass);
  check("never says Oversold", JSON.stringify(small.dipClass).indexOf("Oversold") < 0);
})();

// [4] decision engine + verdict
(function () {
  console.log("\n[4] decision cascade + final verdict");
  // strong thesis + deep dip + fair valuation + all gates open → Strong Accumulate → YES
  const sa = TE.compute("TEST", snap(dipSeries(10), dipSeries(9)), OPTS());
  check("Strong Accumulate when thesis ≥85 + dip ≥8% + fair val", sa.decision.key === "strong-accumulate", sa.decision);
  check("verdict YES", sa.finalVerdict.answer === "YES");
  // small dip → Wait (ยังไม่ย่อพอ)
  const w = TE.compute("TEST", snap(dipSeries(3)), OPTS());
  check("dip <5% → Wait", w.decision.key === "wait", w.decision);
  // mega gate closed → Wait even with everything else good
  const gated = TE.compute("TEST", snap(dipSeries(10), dipSeries(9)), OPTS({ mega: MEGA_WEAK }));
  check("gate closed → Wait (technical never overrides)", gated.decision.key === "wait", gated.decision);
  check("verdict WAIT", gated.finalVerdict.answer === "WAIT");
  // risk-off + expensive + broken trend + mid thesis → Reduce Tactical
  const s = snap(dipSeries(12), dipSeries(4));
  s.technicalSignals.TEST = { latestClose: 88, sma200: 95, ema12: 85, ema26: 90 };
  const rt = TE.compute("TEST", s, OPTS({ regime: REGIME_OFF, cfg: { fundScore: 62, aiScore: 60, comp: "stable", accel: "steady", val: "expensive" } }));
  check("risk-off + expensive + trend broken + thesis<70 → Reduce Tactical", rt.decision.key === "reduce-tactical", rt.decision);
  check("verdict NO for reduce", rt.finalVerdict.answer === "NO");
  // review thesis
  const rev = TE.compute("TEST", snap(dipSeries(10)), OPTS({ cfg: { fundScore: 30, aiScore: 30, comp: "weakening", accel: "decelerating" } }));
  check("thesis <55 → Review Thesis → NO", rev.decision.key === "review-thesis" && rev.finalVerdict.answer === "NO");
  // no Buy/Sell words in decision vocabulary
  const vocab = [sa, w, gated, rt, rev].map((o) => o.decision.label + o.decision.thai).join(" ");
  check("no Buy/Sell in decision labels", !/\b(buy|sell)\b/i.test(vocab), vocab);
})();

// [5] confidence + explainability + pm summary
(function () {
  console.log("\n[5] confidence + explain + pm");
  const out = TE.compute("TEST", snap(dipSeries(10), dipSeries(9)), OPTS());
  check("confidence 0-100 + label", out.confidence.score >= 0 && out.confidence.score <= 100 && out.confidence.label != null, out.confidence);
  check("5 confidence parts, weights sum 100", out.confidence.parts.length === 5 && out.confidence.parts.reduce((s, p) => s + p.weight, 0) === 100);
  check("allow list non-empty when accumulating", out.explain.allow.length > 0);
  check("pmSummary mentions name + decision", out.finalVerdict.pmSummary.indexOf("TestCo") >= 0 && out.finalVerdict.pmSummary.indexOf(out.decision.label) >= 0);
  const w2 = TE.compute("TEST", snap(dipSeries(3)), OPTS());
  check("discourage list non-empty when waiting", w2.explain.discourage.length > 0);
})();

// [6] degenerate inputs
(function () {
  console.log("\n[6] degenerate inputs");
  check("unknown ticker → unavailable", TE.compute("ZZZZ", {}, { data: { companies: {} }, mega: null, regime: null, R: null }).available === false);
  check("compute(null) no throw", TE.compute(null, null, { data: null, mega: null, regime: null, R: null }).available === false);
  const noLive = TE.compute("TEST", {}, OPTS({ mega: null, regime: null, opts: { R: null } }));
  check("no live engines → still available (curated core)", noLive.available === true, noLive.reason || noLive.error);
  check("no live → verdict WAIT-ish not YES", noLive.finalVerdict.answer !== "YES", noLive.finalVerdict.answer);
  check("renormalised confidence without macro", noLive.confidence.score != null);
})();

// [7] staleness + companiesFrom + computeLite
(function () {
  console.log("\n[7] staleness + coverage helpers + Lite view");
  // staleMonthsOf deterministic via nowMs
  const jul2026 = Date.UTC(2026, 6, 28); // 2026-07-28
  check("asOf 2026-01 @2026-07 → 6 เดือน", TE.staleMonthsOf("2026-01", jul2026) === 6, TE.staleMonthsOf("2026-01", jul2026));
  check("asOf 2026-07 @2026-07 → 0 เดือน", TE.staleMonthsOf("2026-07", jul2026) === 0);
  check("garbage asOf → null", TE.staleMonthsOf("x", jul2026) === null && TE.staleMonthsOf(null, jul2026) === null);
  // stale flag in compute output (threshold 3)
  check("STALE_MONTHS = 3", TE.STALE_MONTHS === 3, TE.STALE_MONTHS);
  const outStale = TE.compute("TEST", snap(dipSeries(10)), (() => { const o = OPTS(); o.nowMs = jul2026; return o; })());
  check("compute carries staleMonths + stale=true (asOf 2026-01, 6mo ≥ 3)", outStale.staleMonths === 6 && outStale.stale === true, { m: outStale.staleMonths, s: outStale.stale });
  const bound = TE.compute("TEST", snap(dipSeries(10)), (() => { const o = OPTS(); o.nowMs = Date.UTC(2026, 3, 15); return o; })());
  check("3 เดือนพอดี → stale=true (boundary)", bound.staleMonths === 3 && bound.stale === true, bound.staleMonths);
  const fresh = TE.compute("TEST", snap(dipSeries(10)), (() => { const o = OPTS(); o.nowMs = Date.UTC(2026, 2, 15); return o; })());
  check("2 เดือน → stale=false", fresh.staleMonths === 2 && fresh.stale === false, fresh.staleMonths);
  // companiesFrom
  const cf = TE.companiesFrom({ companies: { AAA: { name: "Alpha" }, GOOG: {} } });
  check("companiesFrom ใช้คีย์จาก data + ชื่อจาก cfg/fallback", cf.length === 2 && cf[0].name === "Alpha" && cf[1].name === "Alphabet", cf);
  check("companiesFrom(null) → fallback 8 ตัว", TE.companiesFrom(null).length === 8);
  // computeLite: live-only, no verdict/decision
  const lite = TE.computeLite("TEST", snap(dipSeries(12), dipSeries(11)), { mega: MEGA_OK, regime: REGIME_ON, AP: null });
  check("lite available + lite:true", lite.available === true && lite.lite === true, lite.reason || lite.error);
  check("lite ไม่มี decision/finalVerdict/thesis", !("decision" in lite) && !("finalVerdict" in lite) && !("thesis" in lite));
  check("lite มี technical + falling + inputs", lite.inputs.technical != null && lite.falling.drawdownPct <= -11, { dd: lite.falling.drawdownPct });
  check("lite primary cause = market (ตลาดย่อพอกัน)", lite.falling.primary && lite.falling.primary.key === "market", lite.falling.causes.map((c) => c.key));
  // no price data → graceful
  const noData = TE.computeLite("ZZZZ", {}, { mega: null, regime: null, AP: null });
  check("lite ไม่มีราคา → unavailable พร้อมคำแนะนำ", noData.available === false && noData.reason === "no-price-data", noData.reason);
  check("computeLite(null) no throw", TE.computeLite(null, null, { mega: null, regime: null, AP: null }).available === false);
})();

// [8] Business Growth vs Stock Price (computeHistory)
(function () {
  console.log("\n[8] computeHistory — Business Growth vs Stock Price (5Y)");
  const Yr = (fy, endYm, rev, eps, margin, fcf, price) => ({ fy, endYm, revenueB: rev, epsAdj: eps, opMarginPct: margin, fcfB: fcf, priceFYEnd: price });
  const hist = (revs, epss, margins, fcfs, prices) => ({
    fyNote: "ปีบัญชีสิ้นสุด ธ.ค.", epsBasis: "diluted GAAP", notes: "test",
    years: revs.map((r, i) => Yr("FY202" + (1 + i), `202${1 + i}-12`, r, epss[i], margins[i], fcfs[i], prices[i]))
  });
  const histOpts = (h) => ({ data: DATA(mkCfg({ raw: { history: h } })), thesisScore: 80 });
  const G = [100, 110, 121, 133.1, 146.4];
  const E10 = [1, 1.1, 1.21, 1.331, 1.4641];
  const M30 = [30, 30, 30, 30, 30];
  const FCF = [30, 32, 34, 37, 40];

  // aligned: ราคาโตเท่าพื้นฐานพอดี
  const al = TE.computeHistory("TEST", {}, histOpts(hist(G, E10, M30, FCF, G)));
  check("aligned: available + revCagr ≈10%", al.available === true && Math.abs(al.metrics.revCagrPct - 10) < 0.2, al.metrics);
  check("aligned: gap ≈0 → Well Aligned", Math.abs(al.metrics.gapPp) < 1 && al.verdict.key === "aligned", { gap: al.metrics.gapPp, v: al.verdict.key });
  check("aligned: priceSupport part = 100", al.alignment.parts.find((p) => p.key === "priceSupport").value === 100, al.alignment.parts);
  const sum = al.attribution.drivers.reduce((s, d) => s + d.pp, 0);
  check("attribution identity ถือแบบ exact (residual rounding)", Math.abs(sum - al.attribution.totalPp) < 0.0001, { sum, total: al.attribution.totalPp });
  check("alignment weights รวม 100", al.alignment.parts.reduce((s, p) => s + p.weight, 0) === 100);
  check("indexed ฐาน 100 + 5 labels", al.indexed.revenue[0] === 100 && al.indexed.labels.length === 5, al.indexed);

  // ราคาวิ่ง ×4 ขณะ EPS ×1.46 → Significantly Ahead + ตัวขับหลัก = multiple
  const ahead = TE.computeHistory("TEST", {}, histOpts(hist(G, E10, M30, FCF, [100, 140, 200, 280, 400])));
  check("ราคา ×4 → Price Significantly Ahead + valuation driver", ahead.verdict.key === "significantly-ahead" && ahead.attribution.mainDriver.key === "valuation", { v: ahead.verdict.key, d: ahead.attribution.mainDriver.key });
  check("significantly-ahead → alignment ไม่เกิน Fair (cap 64)", ahead.alignment.score <= 64, ahead.alignment.score);

  // gap ~+6pp → Slightly Ahead
  const slight = TE.computeHistory("TEST", {}, histOpts(hist(G, E10, M30, FCF, [100, 115, 135, 157, 181.1])));
  check("gap ~+6pp → Price Slightly Ahead", slight.verdict.key === "slightly-ahead", { gap: slight.metrics.gapPp });

  // ราคาแช่ + ธุรกิจโต → Business Ahead of Price
  const biz = TE.computeHistory("TEST", {}, histOpts(hist(G, E10, M30, FCF, [100, 100, 100, 100, 100])));
  check("ราคานิ่ง + ธุรกิจโต → Business Ahead of Price", biz.verdict.key === "business-ahead", { gap: biz.metrics.gapPp });

  // รายได้/กำไร/margin แผ่วพร้อมกัน → Fundamentals Deteriorating
  const det = TE.computeHistory("TEST", {}, histOpts(hist([100, 120, 130, 125, 112], [2, 2.2, 2.0, 1.6, 1.2], [30, 29, 28, 27, 24], [20, 18, 15, 12, 8], [100, 120, 110, 100, 90])));
  check("พื้นฐานแผ่ว → Fundamentals Deteriorating", det.verdict.key === "deteriorating", { q: det.quality.score, v: det.verdict.key });
  check("quality label = Weakening", det.quality.label.key === "weakening", det.quality.score);

  // ฐาน EPS ติดลบ (แบบ HOOD) → inflection mode, ไม่ throw
  const turn = TE.computeHistory("TEST", {}, histOpts(hist([1.8, 1.4, 1.9, 3.0, 4.3], [-7.49, -1.17, -0.61, 1.56, 2.0], [-100, -75, -25, 25, 30], [-1, 0.5, 1.0, 1.5, 2.0], [17.8, 8.1, 12.7, 37.3, 101])));
  check("EPS ฐานติดลบ → turnaround + attribution inflection", turn.available === true && turn.metrics.epsCagrPct === null && turn.metrics.epsTurnaround === true && turn.attribution.mode === "inflection", turn.metrics);
  check("turnaround → EPS part = 75 (พลิกกำไรนับเป็นแรงหนุน)", turn.alignment.parts.find((p) => p.key === "epsGrowth").value === 75);
  check("indexed.eps = null เมื่อมีปีขาดทุน", turn.indexed.eps === null);

  // ราคา live ต่อซีรีส์ถึงปัจจุบัน (nowMs deterministic)
  const liveSnap = { historicalData: { TEST: { closes: flat(35, 200) } } };
  const live = TE.computeHistory("TEST", liveSnap, Object.assign(histOpts(hist(G, E10, M30, FCF, G)), { nowMs: Date.UTC(2026, 5, 15) }));
  check("live price → basis live + CAGR ถึงราคาล่าสุด", live.metrics.priceBasis === "live" && live.metrics.currentPrice === 200 && Math.abs(live.metrics.priceCagrPct - 16.6) < 0.8, live.metrics);
  check("indexed.priceNow = 200", live.indexed.priceNow === 200, live.indexed.priceNow);

  // ไม่มี history block → graceful + ชี้ /thesis-update
  const none = TE.computeHistory("TEST", {}, { data: DATA(mkCfg({})) });
  check("ไม่มี history → unavailable + ชี้ /thesis-update", none.available === false && none.reason === "no-history" && none.thai.indexOf("/thesis-update") >= 0, none.reason);
  check("computeHistory(null) no throw", TE.computeHistory(null, null, { data: null }).available === false);

  // ราคาลงเพราะ multiple หด → ตัวขับหลักต้องเป็น valuation (|pp| ไม่ใช่ค่าบวกสุด)
  const dn = TE.computeHistory("TEST", {}, histOpts(hist(G, [1, 1.05, 1.1, 1.15, 1.2], M30, FCF, [100, 90, 80, 72, 65.6])));
  check("ราคาลงจาก multiple หด → mainDriver = valuation", dn.attribution.mainDriver.key === "valuation" && dn.attribution.mainDriver.pp < 0, dn.attribution);

  // KB สะสมเกิน 5 ปี → default ใช้ 5 ปีล่าสุด
  const h6 = hist(G, E10, M30, FCF, G);
  h6.years.unshift({ fy: "FY2020", endYm: "2020-12", revenueB: 90, epsAdj: 0.9, opMarginPct: 30, fcfB: 28, priceFYEnd: 90 });
  const six = TE.computeHistory("TEST", {}, histOpts(h6));
  check("6 ปีใน KB → default ใช้ 5 ปีล่าสุด (ปีแรก = FY2021)", six.years[0].fy === "FY2021" && six.years.length === 5, six.years.map((y) => y.fy));
  check("window: default years=5 · available=6 · max=6", six.window.years === 5 && six.window.available === 6 && six.window.maxYears === 6 && six.window.minYears === 2, six.window);
  // เลือกช่วงปีได้ 2-6
  const w6 = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6), { years: 6 }));
  check("years:6 → ใช้ครบ 6 ปี (ปีแรก = FY2020)", w6.window.years === 6 && w6.years.length === 6 && w6.years[0].fy === "FY2020", w6.years.map((y) => y.fy));
  const w2 = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6), { years: 2 }));
  check("years:2 → ใช้ 2 ปีล่าสุด + verdict ยังคำนวณได้", w2.window.years === 2 && w2.years.length === 2 && w2.verdict != null, w2.window);
  const wClampLo = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6), { years: 1 }));
  check("years:1 → clamp เป็น 2 (ต้อง ≥2 จุด)", wClampLo.window.years === 2, wClampLo.window);
  const wClampHi = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6), { years: 10 }));
  check("years:10 → clamp เป็น 6 (เท่าที่มีจริง)", wClampHi.window.years === 6, wClampHi.window);
  const w5only = TE.computeHistory("TEST", {}, Object.assign(histOpts(hist(G, E10, M30, FCF, G)), { years: 6 }));
  check("มี 5 ปี ขอ 6 → clamp เป็น 5 · maxYears=5", w5only.window.years === 5 && w5only.window.maxYears === 5, w5only.window);
  // ราคาแยกจากธุรกิจ → gap ต่างกันตามช่วงปี (พิสูจน์ว่า recompute จริงต่อ window)
  const h6div = hist(G, E10, M30, FCF, [140, 200, 280, 400, 560]);
  h6div.years.unshift({ fy: "FY2020", endYm: "2020-12", revenueB: 90, epsAdj: 0.9, opMarginPct: 30, fcfB: 28, priceFYEnd: 100 });
  const d2 = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6div), { years: 2 }));
  const d6 = TE.computeHistory("TEST", {}, Object.assign(histOpts(h6div), { years: 6 }));
  check("gap คำนวณใหม่ตามช่วงปี (2yr ≠ 6yr เมื่อราคาแยกจากธุรกิจ)", d2.metrics.gapPp !== d6.metrics.gapPp, [d2.metrics.gapPp, d6.metrics.gapPp]);
  check("disclosure สะท้อนช่วงปีที่เลือก (2 ปี)", /2 ปี/.test(w2.disclosure), w2.disclosure.slice(0, 20));

  // ราคาปีฐานหาย → verdict = Not Measurable (ไม่แอบใช้ Well Aligned)
  const noP = TE.computeHistory("TEST", {}, histOpts(hist(G, E10, M30, FCF, [null, 110, 121, 133, 146])));
  check("ราคาปีฐานหาย → Not Measurable", noP.available === true && noP.verdict.key === "insufficient", noP.verdict.key);

  // วินัยภาษา: ไม่มี Buy/Sell — "ราคาเป้าหมาย" ปรากฏได้เฉพาะใน disclaimer ปฏิเสธ ("ไม่มีราคาเป้าหมาย")
  const txt = JSON.stringify(al) + JSON.stringify(turn) + JSON.stringify(det) + JSON.stringify(ahead);
  check("ไม่มีคำ Buy/Sell ใน output", !/\b(buy|sell)\b/i.test(txt));
  check("ราคาเป้าหมาย ปรากฏเฉพาะแบบปฏิเสธ", txt.split("ราคาเป้าหมาย").slice(0, -1).every((s) => /ไม่มี[^]{0,12}$/.test(s)));
})();

// [9] earnings-aware reload signal (earningsStatusOf)
(function () {
  console.log("\n[9] earningsStatusOf — earnings-aware reload reminder");
  const now = Date.UTC(2026, 6, 28); // 2026-07-28
  const E = (asOf, ne) => TE.earningsStatusOf(asOf, ne, now);
  check("EARNINGS_LEAD_DAYS = 7 + ESTIMATED_GRACE_DAYS = 12", TE.EARNINGS_LEAD_DAYS === 7 && TE.ESTIMATED_GRACE_DAYS === 12);
  const far = E("2026-07", "2026-08-27");
  check("confirmed 30d ahead → current, ไม่ stale/dueSoon", far.state === "current" && far.stale === false && far.dueSoon === false && far.daysToEarnings === 30, far);
  const soon = E("2026-07", "2026-08-01");
  check("confirmed 4d ahead → due-soon (dueSoon, ไม่ stale)", soon.state === "due-soon" && soon.dueSoon === true && soon.stale === false, soon);
  const over = E("2026-04", "2026-07-20");
  check("งบผ่าน 8 วัน + data ก่อนงบ → overdue + stale", over.state === "overdue" && over.stale === true && over.daysToEarnings === -8, over);
  const covered = E("2026-07", "2026-07-20");
  check("งบผ่านแต่ asOf ครอบแล้ว (เดือนเท่ากัน) → current ไม่ overdue", covered.state === "current" && covered.stale === false, covered);
  const estFar = E("2026-07", "2026-08");
  check("estimated เดือน (ยังไม่ถึง) → current + estimated=true", estFar.estimated === true && estFar.state === "current" && estFar.hasDate === true, estFar);
  const estOver = E("2026-06", "2026-07"); // mid=15 → 13 วันก่อน > grace 12
  check("estimated เลย grace 12 วัน → overdue", estOver.state === "overdue" && estOver.stale === true, estOver);
  const estGrace = TE.earningsStatusOf("2026-06", "2026-07", Date.UTC(2026, 6, 20)); // 5 วันหลัง mid → ยังไม่ overdue
  check("estimated ภายใน grace → ยังไม่ overdue", estGrace.state === "current" && estGrace.stale === false, estGrace);
  const both = E("2026-01", "2026-07-29"); // เก่า 6 เดือน + งบพรุ่งนี้
  check("stale ปฏิทิน + งบใกล้ออก → state=stale (ปฏิทินมาก่อน) แต่ dueSoon=true", both.state === "stale" && both.stale === true && both.dueSoon === true, both);
  const noneStale = E("2026-01", null);
  check("ไม่มี nextEarnings + เก่า 6 เดือน → stale (fallback)", noneStale.state === "stale" && noneStale.stale === true && noneStale.hasDate === false, noneStale);
  const noneFresh = E("2026-07", null);
  check("ไม่มี nextEarnings + สด → current", noneFresh.state === "current" && noneFresh.stale === false, noneFresh);
  check("garbage nextEarnings → ใช้ fallback ปฏิทิน", E("2026-07", "soon").hasDate === false && E("2026-07", "soon").state === "current");
  // compute() carries the earnings block
  const co = TE.compute("TEST", snap(dipSeries(10)), (() => { const o = OPTS({ cfg: { raw: { asOf: "2026-07", nextEarnings: "2026-08-01" } } }); o.nowMs = now; return o; })());
  check("compute() แนบก้อน earnings (due-soon จาก nextEarnings)", co.earnings && co.earnings.state === "due-soon" && co.earnings.dueSoon === true, co.earnings);
  check("compute() ไม่มี nextEarnings → earnings.state=stale (asOf 2026-01)", (() => { const o = OPTS(); o.nowMs = now; return TE.compute("TEST", snap(dipSeries(10)), o); })().earnings.state === "stale");
})();

console.log(`\n${passed + failed} checks · ${passed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
