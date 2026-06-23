"use strict";

// Smoke tests for the gate-driven Signal Score engine (public/scoring.js).
// Weight: EMA12/26 = 50, SMA200 = 35, Volume = 15. Volume never overrides trend.
// Run: node scripts/scoring-smoke-test.js

const Scoring = require("../public/scoring");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + detail + ")" : ""}`); }
}
function act(input) { const ts = Scoring.calculateTimingScore(input); return Scoring.recommendAction(input, ts); }

// Test 1: EMA>EMA26, price>SMA200, vol 1.2 -> Buy More/Add (watchlist), Hold/Add (holding)
(function () {
  const base = { ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 1.2 };
  const ts = Scoring.calculateTimingScore(base);
  const wl = Scoring.recommendAction(base, ts);
  const hold = Scoring.recommendAction(Object.assign({}, base, { isHolding: true }), ts);
  console.log(`\n[1] EMA+ SMA+ vol1.2 -> score=${ts.score} wl=${wl.key} hold=${hold.key}`);
  check("watchlist = BUY_MORE", wl.key === "BUY_MORE", wl.key);
  check("holding = HOLD_ADD", hold.key === "HOLD_ADD", hold.key);
  check("score reasonably high (>=60)", ts.score >= 60, ts.score);
  check("section = buy", wl.section === "buy");
})();

// Test 2: EMA>EMA26, price<SMA200, vol 1.8 -> Buy First Tranche Small / Watch (NOT Buy More)
(function () {
  const input = { ema12: 105, ema26: 100, latestPrice: 95, sma200: 100, volumeRatio: 1.8 };
  const a = act(input);
  console.log(`\n[2] EMA+ SMA- vol1.8 -> ${a.key} (${a.action})`);
  check("= BUY_FIRST_SMALL", a.key === "BUY_FIRST_SMALL", a.key);
  check("NOT buy more", a.key !== "BUY_MORE" && a.key !== "HOLD_ADD");
  check("not in buy section", a.section !== "buy", a.section);
})();

// Test 3: EMA<EMA26, price>SMA200, vol 2.0 -> Sell First (holding) / Watch (watchlist). Volume must not override.
(function () {
  const base = { ema12: 98, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 2.0 };
  const hold = Scoring.recommendAction(Object.assign({}, base, { isHolding: true }));
  const wl = Scoring.recommendAction(base);
  console.log(`\n[3] EMA- SMA+ vol2.0 -> hold=${hold.key} wl=${wl.key}`);
  check("holding = SELL_FIRST", hold.key === "SELL_FIRST", hold.key);
  check("watchlist = WATCH_WAIT", wl.key === "WATCH_WAIT", wl.key);
  check("strong volume did NOT create buy", hold.key !== "BUY_MORE" && wl.key !== "BUY_MORE");
})();

// Test 4: EMA>EMA26, price>SMA200, vol 0.7 -> Buy First Tranche / Wait for Volume
(function () {
  const a = act({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 0.7 });
  console.log(`\n[4] EMA+ SMA+ vol0.7 -> ${a.key}`);
  check("= BUY_FIRST_WAIT_VOLUME", a.key === "BUY_FIRST_WAIT_VOLUME", a.key);
})();

// Test 5: EMA<EMA26, price<SMA200, vol 2.0 -> Sell All (holding) / Avoid (watchlist). Strong vol no buy.
(function () {
  const base = { ema12: 98, ema26: 100, latestPrice: 90, sma200: 100, volumeRatio: 2.0 };
  const hold = Scoring.recommendAction(Object.assign({}, base, { isHolding: true }));
  const wl = Scoring.recommendAction(base);
  console.log(`\n[5] EMA- SMA- vol2.0 -> hold=${hold.key} wl=${wl.key}`);
  check("holding = SELL_ALL", hold.key === "SELL_ALL", hold.key);
  check("watchlist = AVOID_WAIT", wl.key === "AVOID_WAIT", wl.key);
  check("strong volume did NOT create buy", hold.key !== "BUY_MORE" && wl.key !== "BUY_MORE");
})();

// Test 6: Missing EMA -> Data Waiting, no crash
(function () {
  let ok = true, ts, a;
  try { ts = Scoring.calculateTimingScore({ ema12: null, ema26: null, latestPrice: 110, sma200: 100, volumeRatio: 1.2 }); a = Scoring.recommendAction({ ema12: null, ema26: null, latestPrice: 110, sma200: 100, volumeRatio: 1.2 }, ts); }
  catch (e) { ok = false; }
  console.log(`\n[6] missing EMA -> ${ok ? a.key + " score=" + ts.score : "THREW"}`);
  check("no crash", ok);
  check("= DATA_WAITING", ok && a.key === "DATA_WAITING", ok && a.key);
})();

// Score weighting + gates sanity
(function () {
  const ts = Scoring.calculateTimingScore({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 2.0, daysSinceEmaBullishCross: 1, daysSinceSma200Reclaim: 1 });
  console.log(`\n[w] fresh+strong -> score=${ts.score} (ema=${ts.components.ema}/50 sma=${ts.components.sma200}/35 vol=${ts.components.volume}/15)`);
  check("EMA max 50 (fresh day1)", ts.components.ema === 50, ts.components.ema);
  check("SMA max 35 (fresh reclaim)", ts.components.sma200 === 35, ts.components.sma200);
  check("Volume max 15 (>=2x)", ts.components.volume === 15, ts.components.volume);
  check("breakdown sums to score", ts.components.ema + ts.components.sma200 + ts.components.volume === ts.score);
  check("gates EMA PASS / SMA PASS / Vol STRONG", ts.gates.ema.status === "PASS" && ts.gates.sma200.status === "PASS" && ts.gates.volume.status === "STRONG");
})();

// --- Signal-state classification (AI Boom taxonomy, shared) ---
(function () {
  const freshAbove = Scoring.classifySignal({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, daysSinceEmaBullishCross: 1 });
  const freshBelow = Scoring.classifySignal({ ema12: 105, ema26: 100, latestPrice: 95, sma200: 100, daysSinceEmaBullishCross: 1 });
  const ongoing = Scoring.classifySignal({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100 });
  const nearUp = Scoring.classifySignal({ ema12: 99.5, ema26: 100, latestPrice: 110, sma200: 100 });
  const freshBear = Scoring.classifySignal({ ema12: 98, ema26: 100, latestPrice: 90, sma200: 100, daysSinceEmaBearishCross: 1 });
  const missing = Scoring.classifySignal({ ema12: null, ema26: null, latestPrice: null, sma200: null });
  console.log(`\n[cls] ${freshAbove.groupKey} / ${freshBelow.groupKey} / ${ongoing.groupKey} / ${nearUp.groupKey} / ${freshBear.groupKey} / ${missing.groupKey}`);
  check("fresh cross = new_bullish", freshAbove.groupKey === "new_bullish");
  check("ongoing (no fresh) = ongoing_bullish", ongoing.groupKey === "ongoing_bullish");
  check("near cross = bullish_watch", nearUp.groupKey === "bullish_watch", nearUp.groupKey);
  check("fresh bear = new_bearish", freshBear.groupKey === "new_bearish");
  check("missing = insufficient", missing.groupKey === "insufficient");
})();

// --- AI Boom parity: hasLatestPrice needs price AND a date (regression guard) ---
(function () {
  // insufficient EMA/SMA + finite price but NO date -> insufficient (not waiting)
  const noDateInsuff = Scoring.classifySignal({ ema12: null, ema26: null, sma200: null, latestPrice: 12.34, latestDate: null });
  // same but WITH a date -> nav_waiting_technical
  const datedInsuff = Scoring.classifySignal({ ema12: null, ema26: null, sma200: null, latestPrice: 12.34, latestDate: "2026-06-22" });
  // EMA present, SMA missing, finite price, NO date -> ongoing_bullish (not waiting)
  const noDateOngoing = Scoring.classifySignal({ ema12: 105, ema26: 100, sma200: null, latestPrice: 110, latestDate: null });
  // EMA present, SMA missing, finite price, WITH date -> nav_waiting_technical
  const datedWaiting = Scoring.classifySignal({ ema12: 105, ema26: 100, sma200: null, latestPrice: 110, latestDate: "2026-06-22" });
  console.log(`\n[date] noDateInsuff=${noDateInsuff.groupKey} datedInsuff=${datedInsuff.groupKey} noDateOngoing=${noDateOngoing.groupKey} datedWaiting=${datedWaiting.groupKey}`);
  check("price+no-date+insufficient = insufficient", noDateInsuff.groupKey === "insufficient", noDateInsuff.groupKey);
  check("price+date+insufficient = nav_waiting_technical", datedInsuff.groupKey === "nav_waiting_technical", datedInsuff.groupKey);
  check("EMA only + no date = ongoing_bullish", noDateOngoing.groupKey === "ongoing_bullish", noDateOngoing.groupKey);
  check("EMA only + date = nav_waiting_technical", datedWaiting.groupKey === "nav_waiting_technical", datedWaiting.groupKey);
})();

// --- whipsaw guard: a stale cross that has since reversed must NOT read fresh ---
(function () {
  // reclaimed SMA200 2 days ago but price is now BELOW + fresh break today, EMA bearish
  const whip = Scoring.classifySignal({ ema12: 98, ema26: 100, latestPrice: 95, sma200: 100, latestDate: "2026-06-22", daysSinceSma200Reclaim: 2, daysSinceSma200Break: 0 });
  // stale reclaim only (now below, no other fresh event) -> ongoing bearish, NOT new_bullish
  const staleReclaim = Scoring.classifySignal({ ema12: 98, ema26: 100, latestPrice: 95, sma200: 100, latestDate: "2026-06-22", daysSinceSma200Reclaim: 2 });
  // stale EMA up-cross that has reversed (now ema bearish) -> not new_bullish
  const staleEma = Scoring.classifySignal({ ema12: 99, ema26: 100, latestPrice: 95, sma200: 100, latestDate: "2026-06-22", daysSinceEmaBullishCross: 1 });
  console.log(`\n[whip] whip=${whip.groupKey} staleReclaim=${staleReclaim.groupKey} staleEma=${staleEma.groupKey}`);
  check("whipsaw reclaim now-below = new_bearish (not new_bullish)", whip.groupKey === "new_bearish", whip.groupKey);
  check("stale reclaim now-below != new_bullish", staleReclaim.groupKey !== "new_bullish", staleReclaim.groupKey);
  check("stale EMA up-cross now-bearish != new_bullish", staleEma.groupKey !== "new_bullish", staleEma.groupKey);
})();

// --- neutral section consistency (section must match WATCH_WAIT action code) ---
(function () {
  const neutral = Scoring.classifySignal({ ema12: 100, ema26: 100, latestPrice: 100, sma200: 100, latestDate: "2026-06-22" });
  const rec = Scoring.actionFromSignal(neutral, { ema12: 100, ema26: 100, latestPrice: 100, sma200: 100, latestDate: "2026-06-22" });
  console.log(`\n[neutral] group=${neutral.groupKey} key=${rec.key} section=${rec.section}`);
  check("flat EMA & price=SMA = neutral", neutral.groupKey === "neutral", neutral.groupKey);
  check("neutral -> WATCH_WAIT/watch (consistent)", rec.key === "WATCH_WAIT" && rec.section === "watch", `${rec.key}/${rec.section}`);
})();

// --- Action driven by signal state (holding-aware) ---
(function () {
  const newBullAbove = { ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, daysSinceEmaBullishCross: 1 };
  const newBullBelow = { ema12: 105, ema26: 100, latestPrice: 95, sma200: 100, daysSinceEmaBullishCross: 1 };
  const newBearBelow = { ema12: 98, ema26: 100, latestPrice: 90, sma200: 100, daysSinceEmaBearishCross: 1 };
  const aWl = Scoring.actionFromSignal(null, newBullAbove);
  const aHold = Scoring.actionFromSignal(null, Object.assign({}, newBullAbove, { isHolding: true }));
  const aSmall = Scoring.actionFromSignal(null, newBullBelow);
  const aSellHold = Scoring.actionFromSignal(null, Object.assign({}, newBearBelow, { isHolding: true }));
  const aSellWl = Scoring.actionFromSignal(null, newBearBelow);
  console.log(`\n[act] wl=${aWl.key}/${aWl.section} hold=${aHold.key} small=${aSmall.key}/${aSmall.section} sellHold=${aSellHold.key}/${aSellHold.section} sellWl=${aSellWl.key}`);
  check("new bull + above + watchlist = BUY_MORE/buy", aWl.key === "BUY_MORE" && aWl.section === "buy");
  check("new bull + above + holding = HOLD_ADD", aHold.key === "HOLD_ADD");
  check("new bull + below = BUY_FIRST_SMALL/watch", aSmall.key === "BUY_FIRST_SMALL" && aSmall.section === "watch");
  check("new bear + below + holding = SELL_ALL/urgent", aSellHold.key === "SELL_ALL" && aSellHold.section === "urgent");
  check("new bear + below + watchlist = AVOID_WAIT/none", aSellWl.key === "AVOID_WAIT" && aSellWl.section === "none");
})();

// --- shared UI helpers (used by every page for one consistent look) ---
(function () {
  const sum = Scoring.summarizeAsset({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, latestDate: "2026-06-22", daysSinceEmaBullishCross: 1 });
  console.log(`\n[ui] summarize signal=${sum && sum.signal && sum.signal.groupKey} score=${sum && sum.score}`);
  check("summarizeAsset returns signal+action+score", !!(sum && sum.signal && sum.action && Number.isFinite(sum.score)));
  check("summary signal = new_bullish", sum.signal.groupKey === "new_bullish");
  const chip = Scoring.renderSignalChip(sum.signal);
  check("renderSignalChip emits sig-bull chip", /signal-state-chip/.test(chip) && /sig-bull/.test(chip), chip);
  check("renderSignalChip has thai label", /สัญญาณตัดขึ้นใหม่/.test(chip));
  check("renderSignalChip empty for null", Scoring.renderSignalChip(null) === "");
  check("signalToneClass maps bear", Scoring.signalToneClass("bear") === "sig-bear");
  check("signalToneClass default = neutral", Scoring.signalToneClass("???") === "sig-neutral");
})();

console.log(`\n================  ${passed} passed, ${failed} failed  ================`);
process.exit(failed ? 1 : 0);
