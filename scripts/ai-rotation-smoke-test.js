const E = require("../public/ai-rotation-engine.js");
let pass = 0, fail = 0;
function ok(n, c) { if (c) { pass++; } else { fail++; console.log("  FAIL " + n); } }

// mock snapshot: holds NVDA (gpu) heavy, MSFT (cloud), plus a broad fund + a non-AI (GLD)
const snap = {
  portfolioHoldings: { data: [
    { canonicalSymbol: "NVDA", isHolding: true, marketValue: 500000 },
    { canonicalSymbol: "MSFT", isHolding: true, marketValue: 300000 },
    { canonicalSymbol: "QQQM", isHolding: true, marketValue: 200000 },
    { canonicalSymbol: "GLD", isHolding: true, marketValue: 100000 }
  ] }
};
const r = E.compute(snap, { now: "2026-07-14T00:00:00Z" });

console.log("=== phase ===");
console.log("  current:", r.phase.current.name, "| next:", r.phase.next.name, "| confidence:", r.phase.confidence, "| evidenceMet:", r.phase.evidenceMet + "%");
ok("current phase = Inference Expansion", r.phase.current.name === "Inference Expansion");
ok("next phase = Power Expansion", r.phase.next.name === "Power Expansion");
ok("confidence in 60-95", r.phase.confidence >= 60 && r.phase.confidence <= 95);

console.log("=== timeline ===");
console.log("  " + r.timeline.map(t => t.name + "[" + t.status + "]").join(" → "));
ok("exactly one current", r.timeline.filter(t => t.status === "current").length === 1);
ok("exactly one next", r.timeline.filter(t => t.status === "next").length === 1);

console.log("=== rotation ranking (top 5) ===");
r.rotation.ranked.slice(0, 6).forEach(l => console.log("  " + l.name.padEnd(20), "rot=" + String(l.rotationScore).padStart(3), l.direction.padEnd(6), l.trendLabel));
ok("power/utility rotating in (high next affinity)", r.layers.filter(l => (l.key === "power" || l.key === "utility") && l.direction === "in").length === 2);
ok("all rotation 0-100", r.layers.every(l => l.rotationScore >= 0 && l.rotationScore <= 100));

console.log("=== allocation (sums to 100 with cash) ===");
const allocSum = r.allocation.suggested.reduce((s, a) => s + a.pct, 0) + r.allocation.cashPct;
console.log("  alloc sum + cash =", allocSum.toFixed(1), "| cash:", r.allocation.cashPct, "| top:", r.allocation.suggested.slice(0, 3).map(a => a.name + " " + a.pct + "%").join(", "));
ok("allocation+cash ≈ 100", Math.abs(allocSum - 100) < 1.5);
ok("no layer > 20% cap", r.allocation.suggested.every(a => a.pct <= 20.5));

console.log("=== exposure ===");
console.log("  aiValue:", r.exposure.totalAiValue, "| nonAi:", r.exposure.nonAiValue, "| alignment:", r.exposure.alignmentScore);
const gpuExp = r.exposure.byLayer.find(e => e.key === "gpu");
console.log("  gpu current%:", gpuExp.currentPct, "suggested%:", gpuExp.suggestedPct, "status:", gpuExp.status);
ok("GLD counted as non-AI (100k)", r.exposure.nonAiValue === 100000);
ok("QQQM broad-spread into AI value", r.exposure.totalAiValue === 1000000); // 500+300+200 broad
ok("gpu overweight (NVDA heavy)", gpuExp.status === "over");
ok("alignment 0-100", r.exposure.alignmentScore >= 0 && r.exposure.alignmentScore <= 100);

console.log("=== rotation plan (Increase/Maintain/Reduce only) ===");
const actions = new Set(r.rotationPlan.map(p => p.action));
console.log("  actions used:", [...actions].join(" | "));
ok("only Increase/Maintain/Reduce", [...actions].every(a => ["Increase Exposure", "Maintain", "Reduce Exposure"].includes(a)));

console.log("=== no Buy/Sell anywhere in output ===");
const blob = JSON.stringify(r);
ok("no 'Buy'", !/\bBuy\b/.test(blob));
ok("no 'Sell'", !/\bSell\b/.test(blob));
ok("no price/technical words (RSI/EMA/SMA)", !/\bRSI\b|\bEMA\b|\bSMA\b/.test(blob));

console.log("=== opportunities (reuse AIBoom finalScore) ===");
console.log("  top:", r.opportunities.slice(0, 5).map(o => o.ticker + "(" + o.finalPct + ")").join(" "));
ok("owned companies sorted first in opportunities", (() => { const owned = r.opportunities.map(o => o.owned); const li = owned.lastIndexOf(true); return li < 0 || owned.slice(0, li + 1).every(Boolean); })());
const nvda = r.layers.find(l => l.key === "gpu").companies.find(co => co.ticker === "NVDA");
ok("NVDA owned overlay works (500k)", nvda.owned === true && nvda.marketValue === 500000);
ok("owned NVDA surfaced despite GPU rotating out (req 6)", r.opportunities.some(o => o.ticker === "NVDA" && o.owned));
ok("portfolioScore present + graded (3 comps)", typeof r.portfolioScore.score === "number" && /[ABCD]/.test(r.portfolioScore.grade) && r.portfolioScore.components.length === 3);
ok("concentration flags gpu overweight", r.concentration.score >= 0 && r.concentration.overweightLayers.some(o => o.key === "gpu"));
ok("rotationRadar 10 axes (rotation+exposure)", r.rotationRadar.axes.length === 10 && r.rotationRadar.axes.every(a => "rotation" in a && "exposure" in a));
ok("rotationPaths overweight→underweight", r.rotationPaths.length > 0 && r.rotationPaths.every(p => p.pp >= 2 && p.from && p.to));
ok("every layer has exposure current/ideal/diff", r.layers.every(l => l.exposure && "currentPct" in l.exposure && "idealPct" in l.exposure && "diffPp" in l.exposure));

console.log("=== next-phase checklist + actions + why ===");
console.log("  checklist:", r.nextPhaseChecklist.met + "/" + r.nextPhaseChecklist.total, "for", r.nextPhaseChecklist.nextPhase);
r.nextPhaseChecklist.items.forEach(x => console.log("   " + (x.status === "met" ? "✓" : "○") + " " + x.label + " — " + x.detail));
ok("checklist has pending (power not fully entered)", r.nextPhaseChecklist.met < r.nextPhaseChecklist.total);
ok("actions non-empty", r.actions.length >= 3);
ok("phase.why explains", r.phase.why.length >= 2 && r.layers[0].why.length >= 2);

console.log("=== edge: empty snapshot ===");
const empty = E.compute({}, {});
ok("empty → still available", empty.available === true);
ok("empty → action prompts to add holdings", empty.actions.some(a => /เพิ่ม Holdings/.test(a.detail)));

console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
