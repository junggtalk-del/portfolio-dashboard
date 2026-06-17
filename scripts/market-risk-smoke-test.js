"use strict";

const assert = require("assert");
const { __internals } = require("../api/market-risk");

function rows(start, end, count = 22) {
  return Array.from({ length: count }, (_, index) => {
    const close = start + ((end - start) * index) / (count - 1);
    return {
      date: new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
      open: close,
      high: close,
      low: close,
      close,
      volume: 0
    };
  });
}

const payload = __internals.calculateRisk({
  spx: { ok: true, bars: rows(100, 106, 22) },
  xlk: { ok: true, bars: rows(100, 125, 22) },
  vix: { ok: true, bars: rows(16, 14, 22) },
  vvix: { ok: true, bars: rows(82, 96, 22) },
  vixeq: { ok: true, bars: rows(30, 45, 22) }
});

assert.strictEqual(payload.metrics.spxOneMonthReturn, 6);
assert.strictEqual(payload.metrics.xlkOneMonthReturn, 25);
assert.strictEqual(payload.metrics.techLeadershipSpread, 19);
assert.ok(payload.flags.some((flag) => flag.id === "high-tech"));
assert.ok(payload.flags.some((flag) => flag.id === "hidden-hedge"));
assert.ok(payload.flags.some((flag) => flag.id === "single-stock-vol"));
assert.ok(payload.risk.score >= 50, "multiple warnings should lift risk to caution or higher");

console.log("Market risk smoke tests passed");
