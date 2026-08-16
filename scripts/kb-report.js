// KB reporter — อ่านอย่างเดียว ไม่แก้ไฟล์ใด ๆ (ใช้แทน node -e "..." แบบพิมพ์สดทุกครั้ง)
//
// วิธีใช้:
//   node scripts/kb-report.js state <TICKER>        สรุปสถานะ KB ของตัวนั้น (years/quarters/whatChanged/forwardView)
//   node scripts/kb-report.js validate <TICKER>     ตรวจกติกา schema + forwardView + nextEarnings
//   node scripts/kb-report.js val <TICKER> [price]  ผล Valuation Engine (ใส่ราคาเพื่อจำลอง live)
//   node scripts/kb-report.js regress               เทียบ thesis output ทุก ticker กับ HEAD ว่า byte-identical
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
const D = require(path.join(ROOT, "public", "thesis-data.js"));
const TE = require(path.join(ROOT, "public", "thesis-engine.js"));
const VE = require(path.join(ROOT, "public", "valuation-engine.js"));

const cmd = process.argv[2];
const T = process.argv[3];

function company(t) {
  const c = D.companies[t];
  if (!c) { console.error("unknown ticker: " + t); process.exit(1); }
  return c;
}

if (cmd === "state") {
  const c = company(T);
  console.log("asOf: " + c.asOf + " · nextEarnings: " + (c.nextEarnings || "—") + " · forwardView: " + !!c.forwardView);
  console.log("epsBasis: " + ((c.history && c.history.epsBasis) || "(ไม่มี)"));
  console.log("thesis: " + TE.compute(T, {}, { data: D }).thesis.score);
  console.log("=== years ===");
  (c.history.years || []).forEach((y) => console.log("  " + y.fy + " " + y.endYm + " rev " + y.revenueB + " eps " + y.epsAdj + " px " + y.priceFYEnd));
  console.log("=== quarters (6 ล่าสุด) ===");
  (c.history.quarters || []).slice(-6).forEach((q) => console.log("  " + q.q + " " + q.endYm + " rev " + q.revenueB + " eps " + q.epsAdj + " px " + q.priceQEnd));
  console.log("=== whatChanged ===");
  (c.whatChanged || []).forEach((w) => console.log("  - " + w.metric + ": " + w.prev + " → " + w.now));
  if (c.forwardView) {
    const F = c.forwardView;
    console.log("=== forwardView (asOf " + F.asOf + ") ===");
    console.log("  estimateHistory: " + F.estimateHistory.length + " แถว · guidanceTrack: " + F.guidanceTrack.length + " แถว");
    F.consensus.forEach((x) => console.log("  consensus " + x.fy + ": rev " + x.revenue + " eps " + x.eps + " (" + x.confidence + " · " + (x.basis || "unknown") + ")"));
  }
  process.exit(0);
}

if (cmd === "validate") {
  const c = company(T);
  const fail = [];
  if (c.fundamentals.length !== 10) fail.push("fundamentals ไม่ครบ 10");
  if (c.competitive.factors.length !== 8) fail.push("factors ไม่ครบ 8");
  const seg = c.revenueQuality.segments.reduce((a, x) => a + x.sharePct, 0);
  if (Math.abs(seg - 100) > 12) fail.push("segments รวม " + seg + "%");
  if (c.whatChanged.length < 4 || c.whatChanged.length > 6) fail.push("whatChanged " + c.whatChanged.length + " รายการ");
  if (c.nextEarnings) {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(c.nextEarnings)) fail.push("nextEarnings รูปแบบผิด");
    if (c.nextEarnings.slice(0, 7) < c.asOf) fail.push("nextEarnings เก่ากว่า asOf");
  }
  const F = c.forwardView;
  if (F) {
    if (!/^\d{4}-\d{2}$/.test(F.asOf) || F.asOf < c.asOf) fail.push("forwardView.asOf");
    if (F.estimateHistory.length > 16) fail.push("estimateHistory > 16");
    const asofs = F.estimateHistory.map((r) => r.asOf);
    if (new Set(asofs).size !== asofs.length) fail.push("estimateHistory asOf ซ้ำ");
    if (JSON.stringify(asofs) !== JSON.stringify(asofs.slice().sort())) fail.push("estimateHistory ไม่เรียงเก่า→ใหม่");
    if (F.guidanceTrack.length > 12) fail.push("guidanceTrack > 12");
    const pairs = F.guidanceTrack.map((r) => r.quarter + "|" + r.metric);
    if (new Set(pairs).size !== pairs.length) fail.push("guidanceTrack คู่ (quarter,metric) ซ้ำ");
    F.guidanceTrack.forEach((r) => {
      if (["beat", "inline", "miss", "noGuidance"].indexOf(r.result) < 0) fail.push("result ผิด: " + r.quarter);
      if (r.result !== "noGuidance" && typeof r.magnitudePct !== "number") fail.push("ขาด magnitudePct: " + r.quarter);
    });
    const lastFy = c.history.years[c.history.years.length - 1].fy;
    F.consensus.forEach((x) => {
      if (x.fy <= lastFy) fail.push("consensus " + x.fy + " ทับปีที่มี actual (" + lastFy + ")");
      if (x.basis && ["GAAP", "non-GAAP", "unknown"].indexOf(x.basis) < 0) fail.push("basis ผิด: " + x.fy);
    });
    const ng = F.guidanceTrack.filter((g) => g.result !== "noGuidance");
    console.log("§15 preview: " + ng.length + " แถวมี guidance" + (ng.length < 4 ? " (<4 → ข้อมูลน้อยเกินสรุป)" : ""));
  }
  const s = JSON.stringify(c);
  ["ควรซื้อ", "ควรขาย", "น่าเข้า"].forEach((w) => { if (s.indexOf(w) >= 0) fail.push("คำต้องห้าม: " + w); });
  console.log(fail.length ? "FAIL: " + fail.join(" · ") : "ALL VALIDATION PASS (segments " + Math.round(seg) + "% · fundamentals 10 · factors 8)");
  process.exit(fail.length ? 1 : 0);
}

if (cmd === "val") {
  const px = Number(process.argv[4]);
  const snap = isFinite(px) && px > 0 ? { historicalData: {} } : {};
  if (snap.historicalData) snap.historicalData[T] = { dates: [new Date().toISOString().slice(0, 10)], closes: [px] };
  const V = VE.compute(T, snap, { data: D });
  if (!V.available) { console.log(T + ": ไม่มีข้อมูล (" + V.reason + ")"); process.exit(0); }
  console.log(T + ": P/E " + V.pe.current + " · median " + V.history.median + " (" + V.history.sampleCount + " obs) · percentile " +
    (V.percentile.value == null ? "n/a" : V.percentile.value + " " + V.percentile.label) +
    " · premium " + (V.premiumVsMedianPct == null ? "—" : V.premiumVsMedianPct + "%") + " → " + V.classification);
  console.log("  price " + V.price.value + " (" + V.price.asOf + " · " + V.price.source + ") · TTM EPS " + V.eps.ttm + " (" + V.eps.asOf + ")");
  console.log("  quality: price=" + V.quality.price + " eps=" + V.quality.eps + " adr=" + V.quality.adr + (V.warnings.length ? " · warnings: " + V.warnings.join(",") : ""));
  if (V.forwardPe) console.log("  forward P/E " + V.forwardPe.pe + " (" + V.forwardPe.fy + " · " + V.forwardPe.epsBasis + ")");
  process.exit(0);
}

if (cmd === "regress") {
  // เทียบ thesis output ปัจจุบันกับ HEAD — ต้อง byte-identical ถ้าแก้เฉพาะชั้นที่ไม่กระทบ score
  const { execSync } = require("child_process");
  const fs = require("fs");
  const os = require("os");
  const tmp = path.join(os.tmpdir(), "kb-head-" + Date.now() + ".js");
  execSync('git show HEAD:public/thesis-data.js', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", fs.openSync(tmp, "w"), "inherit"] });
  const OLD = require(tmp);
  const NOW = 1765000000000;
  let same = true;
  Object.keys(D.companies).forEach((t) => {
    if (!OLD.companies[t]) { console.log("NEW ticker: " + t); return; }
    const a = JSON.stringify(TE.compute(t, {}, { data: OLD, nowMs: NOW }));
    const b = JSON.stringify(TE.compute(t, {}, { data: D, nowMs: NOW }));
    if (a !== b) { same = false; console.log("THESIS DIFF: " + t); }
  });
  fs.unlinkSync(tmp);
  console.log(same ? "Investment Thesis output BYTE-IDENTICAL vs HEAD" : "มี ticker ที่ผลลัพธ์เปลี่ยน (ดูรายการด้านบน)");
  process.exit(0);
}

console.error("usage: node scripts/kb-report.js state|validate|val|regress <TICKER> [price]");
process.exit(1);
