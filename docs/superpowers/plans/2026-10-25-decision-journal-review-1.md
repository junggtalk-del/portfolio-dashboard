# Decision Journal — Opus holistic review of tasks 1-7 (2026-10-25)

Reviewer verdict: approved = false · HEAD unchanged = true · 14 issues.
These must be applied by the "consolidate" step before page tasks 8-13 start (see the plan's Progress section).

## Tests the reviewer ran
- PASS `node scripts/decision-journal-test.js` → 212 checks · 212 passed · 0 failed
- PASS `node scripts/journal-api-test.js` → 38 checks · 38 passed · 0 failed
- PASS `node --check api/portfolio.js && node --check server.js && node --check public/decision-journal-engine.js` → all three parse
- FAIL `node <scratchpad>/probe1.js` → Edge-case probe of the real engine. For probe rows, passed=false means the probed property does NOT hold. Findings: P1 confirmed break (10 closes at 80 under SMA ~99.4) then ONE close at 101 gives r2.touchBounce.met=true, r2.buy=true, verdict buy per-rule with why 'แตะ SMA200 แล้วเด้ง'. P2 1538 of 4000 exact −20% 2-decimal price pairs are classified NOT dip; 144 of 290 exact +1% pairs are not flat. P3 a US entry's +7 horizon is 'scored' at 0% from the D−1 close at 2026-10-23T10:00 and 2026-10-24T04:00, then becomes +10% 'right/good' at 06:00. P4 an invalid nowBangkok or entry date gives blocked 'no-bars', which the page is told to allow saving. P5 a THB buy at 3500 matched by a USD sell at 110 gives silent realized −3390 USD with no warning. P6 a negative fee is accepted. P7 a same-day sell entered before its buy gives a phantom oversell plus a phantom open lot.
- FAIL `node <scratchpad>/probe-utf8.js` → Runs a verbatim copy of server.js getRequestBody on a throwaway port. An 85 KB Thai journal PUT arrives in 2 chunks (65350 + 20167 bytes). The parsed doc differs from what was sent and contains 3 U+FFFD, but it is still valid JSON, so the validator accepts it.
- FAIL `node <scratchpad>/mutate.js, mutate2.js, mutate3.js, mutate4.js` → 24 mutants were applied to scratchpad copies of the files only; the repo was never written and every copy was restored. Baseline on the copies: 212/212 and 38/38. 15 mutants were caught and 9 survived (see mutants).

## Mutants
- **SURVIVED** — engine: TH/ASIA close hour 17 -> 18
- **SURVIVED** — engine: TH-only close hour 17 -> 16 (would use an unclosed Thai bar at 16:xx)
- **SURVIVED** — engine: US close hour 5 -> 6
- caught — engine: US close hour 5 -> 3
- caught — engine: CRYPTO close hour 7 -> 8
- caught — engine: touch window shrinks to 4 bars
- caught — engine: touch ignores 'as-of close > close[t]'
- **SURVIVED** — engine: touch drops 'as-of close > sma200' condition
- caught — engine: touch band 1.02 -> 1.021
- caught — engine: reclaim barsAgo <= 9 -> < 9
- caught — engine: breakConfirmed needs 3 closes
- caught — engine: dd1y formula back to (c/h − 1)×100
- caught — engine: high1y window 252 -> 251
- caught — engine: stale threshold > 7 -> >= 7
- **SURVIVED** — engine: stale threshold > 7 -> > 8 (spec §9 names the 8-day case)
- caught — engine: outcomes ignores closed-bar cutoff
- caught — engine: merge tie -> a wins
- caught — engine: lot fee charged in full per sell
- caught — engine: sell opposes includes r3
- caught — engine: stats sell dirPct not negated
- **SURVIVED** — server.js: Supabase GET ?doc=journal reads row main
- **SURVIVED** — server.js: Supabase PUT journal validated as portfolio
- **SURVIVED** — server.js: local-fallback GET journal returns portfolio file
- caught — api/portfolio.js: unknown doc falls back to portfolio

## Issues

### 1. [major] public/decision-journal-engine.js:322

Touch-and-bounce lets a buy count as per-rule after just one close back above SMA200, which skips rule 2's 2-close confirmation. The touch test is only `low[t] <= sma[t]×1.02`, with no lower bound. So any bar below the SMA, including bars during a confirmed break, counts as a 'touch'. Probe: 200 bars at 100, then 10 closes at 80 (breakConfirmed), then one close at 101. Result: reclaimHeld=false (consecutive 1) but touchBounce.met=true, r2.buy=true, compliance per-rule, why 'กฎ 2: แตะ SMA200 แล้วเด้ง'. A crash bar 30% under the SMA followed by one close above gives the same result. This matches the spec §3 formula word for word, but it contradicts 'touch within 2%' and the 2-close reclaim rule. Verdicts are frozen under dj-rules-1, so the definition must be settled before the first record is saved.

**Fix:** Ask the user to pick the intended definition before the UI ships. Options: (a) the touch bar must stay inside the band on both sides, `sma[t]×0.98 <= low[t] <= sma[t]×1.02`; (b) the touch bar must close at or above the SMA; (c) no touch counts if bars t..asOf−1 contain 2+ consecutive closes below the SMA. Then update spec §3 and the touchBounce comment, and add a test: '10 closes under SMA then one close above → touchBounce.met false, r2.buy false'. Check whether the 'flat bar sitting on its SMA' and 'several touches' tests still describe the chosen rule.

### 2. [major] public/decision-journal-engine.js:668

outcomes() marks a horizon 'scored' as soon as the Bangkok calendar reaches the target date (`target > today`), before the target-date bar has closed. In that window it scores from the previous close, then the number changes once the bar closes. Probe: a US entry 2026-10-16 with +7 target 2026-10-23. At 10-23T10:00 and 10-24T04:00 it is 'scored' 0% from the 10-22 close (predicted flat, action flat, reviewDue true). At 10-24T06:00 it becomes +10% (right/good). For US symbols the window is about 29 hours; for TH it is 00:00–17:00. The review card appears during that window, so the user writes a lesson against a number that later flips. This hits spec §2's failure case ('บันทึกเก่าเปลี่ยนตัวเลขเมื่อเปิดหน้าใหม่') and the intent of 'pending (ยังไม่ถึงวัน)'.

**Fix:** Treat a horizon as pending while `cutoff === null || target > cutoff`, where cutoff = closedBarCutoff(marketOf(symbol), now) is already computed at line 639. Weekend targets still resolve to the Friday close once Saturday's cutoff passes. Running this fix as a mutant on a scratchpad copy breaks exactly 3 tests that pin the provisional behaviour; update them to expect 'pending', with the arithmetic shown. Line 303: at 10-25T02:00 the US cutoff is 10-23, earlier than target 10-24. Line 305: same case. Lines 344-348: at TH 10-23T10:00 the cutoff is 10-22, earlier than target 10-23. reviewDue then follows automatically.

### 3. [major] server.js:319

getRequestBody does `body += chunk` on raw Buffers, so a Thai character split across a socket chunk boundary is decoded as U+FFFD. The result is still valid JSON, passes isValidJournalDoc and is written to the real Supabase row through the local dev server. A verbatim copy on a throwaway port corrupted an 85 KB, 120-entry Thai journal (3 U+FFFD). Journal docs pass 64 KB after a few dozen entries. The damaged text sits in frozen fields (context.event/note), and the next GET on any device loads the corrupted copy. This bug existed before this change and also affects the portfolio blob. The Vercel path (parseJsonBody on a full body) is fine.

**Fix:** In getRequestBody, call `req.setEncoding("utf8")` before attaching 'data' (StringDecoder keeps split multi-byte sequences together). Alternatively, collect Buffers and decode once with Buffer.concat(chunks).toString("utf8"). The 1,000,000-character cap check stays the same. Add a regression test that pushes a split 3-byte Thai sequence through the reader.

### 4. [major] public/decision-journal-engine.js:867

fifo() silently subtracts across currencies when a sell's currency differs from the lots it matches. Realized P&L is recorded in the sell's currency, and the only mismatch warning (line 888) covers open lots. Probe: buy NVDA 1 @3500 with currency THB, then sell 1 @110 with the default USD. Result: realized −3390 USD (−96.9%), totals.USD.realized −3390, warnings []. Currency can be edited per trade (spec §5.5), so this is easy to trigger, and it puts a wrong number into the realized P&L summary. It also contradicts the stated behaviour that warnings cover mixed currencies.

**Fix:** While matching, check whether lot.currency matches tr.currency. On a mismatch, push '<sym>: สกุลเงินไม้ขายไม่ตรงกับไม้ซื้อ (ไม้ <date>)', set that realized row's pnl/pnlPct to null (or mark it) and leave it out of totals, rather than summing it. Add a test for a THB buy against a USD sell expecting a warning and no contribution to totals.

### 5. [minor] public/decision-journal-engine.js:454

Exact-boundary comparisons are sensitive to floating-point error. dipMet `dd <= -20`: 1538 of 4000 exact −20% price pairs with 2-decimal prices (e.g. 100.05 → 80.04 gives −19.999999999999993) are 'not dip', while the page will show −20.0%. The flat band `|pct| <= 1` (lines 610/619): 144 of 290 exact +1% pairs (e.g. 13 → 13.13 gives 1.000000000000006) score right/good instead of flat. BASIS_TOLERANCE has the same issue (line 661). The '−20.0 exactly' test only covers 125→100, which happens to be exact.

**Fix:** Compare with a tiny tolerance, e.g. `dd <= DIP_PCT + 1e-9`, `Math.abs(pct) <= FLAT_BAND_PCT + 1e-9` and `> BASIS_TOLERANCE_PCT + 1e-9`. Add tests for 100.05→80.04 and 13→13.13.

### 6. [minor] public/decision-journal-engine.js:184

toNum(' ') and toNum('\t') return 0, which breaks the 'unknown = null, never 0' contract. A trade with price ' ' becomes a valid buy at 0: buy @' ' then sell @100 gives realized +100 with no warning. A bar with low ' ' would become low 0 and register a false SMA touch.

**Fix:** Return null for whitespace-only strings: `if (typeof v === 'string' && /^\s*$/.test(v)) return null;`. Also treat a non-positive low as missing (fall back to close) in normalizeBar and touchBounce.

### 7. [minor] public/decision-journal-engine.js:227

An invalid nowBangkok (e.g. '2027-06-01 12:00' with a space) or an invalid entry date gives blocked 'no-bars'. That is the same signal as 'symbol has no price history', and the page is told to allow saving no-bars with compliance 'unknown'. A page clock or format bug would therefore silently freeze 'unknown' verdicts for symbols that do have prices. Separately, an entry date in the future is accepted (+5 days gives ok=true). parseNow (line 110) also accepts a trailing 'Z' or offset, so passing toISOString() by mistake is read as Bangkok time, 7 hours off.

**Fix:** Return a separate blocked value (e.g. 'bad-input') with ok=false when parseNow or isYmd(date) fails, and 'future' when date > now.ymd, so the page refuses to save in both cases. Make parseNow reject strings ending in 'Z' or carrying an offset other than +07:00. Add tests for each.

### 8. [minor] public/decision-journal-engine.js:1124

stats() does not give the per-feeling prediction accuracy that spec §5.6 asks for ('ตามอารมณ์: จำนวน · สัดส่วนคาดถูก'). byFeeling.goodN is the action result for buy/sell only, and hold/none entries never count as scored. stats() also does not skip tombstoned entries: a deleted entry passed in is counted (probe: against n=1, prediction right=1).

**Fix:** Add rightN/wrongN/judgedN for predictions to each S bucket, or tell the page builder explicitly not to label goodN as 'คาดถูก'. Skip items with deletedAt inside stats() as a defensive measure.

### 9. [minor] public/decision-journal-engine.js:858

FIFO edge cases. (1) Negative fees are accepted (fee −50 adds 50 to pnl, no warning). (2) An oversell charges the full sell fee even though only part was matched (sell 20 with fee 20, 5 matched → −20 rather than −5); the 'compute only the matched part' wording suggests pro-rating. (3) A same-day sell entered before its buy (ordering is date, then createdAt) gives a phantom oversell warning and a phantom open lot. createdAt cannot be edited, so the user can only fix it by changing the date.

**Fix:** Treat fee < 0 as an invalid trade and warn. Decide with the user whether to pro-rate the oversell fee by matchedQty/qty. Consider ordering buys before sells within the same date, or give trades a sequence field the user can edit. Pin whatever is decided in tests.

### 10. [minor] lib/journal-validation.js:19

Poison-pill risk: the server rejects the WHOLE doc if any single item, including a tombstoned one, has an empty symbol or a malformed date. For example, canonicalSymbol('ปตท') returns ''. One bad item kept in the local draft would make every later save fail with 400 forever, and deleting it does not help because tombstones stay in the doc. The engine has no client-side mirror of the server's item rules.

**Fix:** Export a client-side `isValidItem` mirror (or reuse the same rules) from the engine so the page refuses to create such items. Optionally, mergeDocs could set aside invalid items into a quarantine list that is shown to the user rather than sent to the server.

### 11. [minor] public/decision-journal-engine.js:616

actionResult applies the ±1% flat band first, which comes from the plan. Spec §5.4 says buy is good when pct > 0 and sell is good when pct < 0, with no band. A +0.5% buy is therefore 'flat' here but 'good' under the spec.

**Fix:** Keep the plan's behaviour, since the plan is the contract, but state it in the #djMethod copy and update spec §5.4 so the two documents agree.

### 12. [minor] scripts/journal-api-test.js:149

Section C is string matching only. The test named 'server.js GET and PUT both branch on doc=journal' just checks for at least 2 of the 5 occurrences of `doc === "journal"`. Three server.js mutants survive: Supabase GET journal reading row main, Supabase PUT journal validated as portfolio, and local-fallback GET returning portfolio.json. The first of these would lose data on local dev: GET returns the portfolio blob, merge(server, local) keeps only the local entries, and the PUT overwrites the journal row.

**Fix:** Test handlePortfolio behaviourally. Either move it into a module that server.js and the test both require, or start server.js in a child process with PORT=0, a stubbed fetch and fake SUPABASE env (never the real .env). Assert the row id, the validator and the local file for GET and PUT.

### 13. [minor] scripts/decision-journal-test.js:67

Engine tests that don't check what their names claim. (a) Closed-bar cutoff tests use 02:00/06:00 (US) and 10:00/18:00 (TH), so mutants TH 17→18, TH-only 17→16 (which would use an unclosed Thai bar at 16:xx) and US 5→6 survive. (b) Spec §9 names the '8 days stale' case, but the test uses 9 days, so a `> 8` mutant survives. (c) Line 174, 'touched but as-of closes below SMA → not met', fails for a second reason too (as-of close 99 is not above any touch-bar close), so removing the `cAsOf > sAsOf` condition survives. (d) Line 89, 'weekend record date → last weekday bar', uses a record date a year after the fixture's last bar, so it never exercises the weekend case.

**Fix:** Add exact-boundary cases: TH 16:59→D−1 and 17:00→D, US 04:59→D−2 and 05:00→D−1, CRYPTO 06:59/07:00. Add an 8-days-stale → blocked case. Add a touch case where the as-of close is above the touch close but at or below the SMA200. For the weekend test, use a fixture that ends on Friday with a record dated the following Sunday.

### 14. [minor] server.js:319

Size caps. On local dev, an oversize journal triggers req.destroy(), so the browser sees a connection reset rather than a 400. On Vercel, JOURNAL_MAX_CHARS of 1.5M UTF-16 characters of Thai text is about 4.5 MB of UTF-8, right at Vercel's 4.5 MB request-body limit, so a near-cap doc would get Vercel's 413 before the validator runs.

**Fix:** Make sure the page treats a network error or 413 as 'not saved, draft kept'. Optionally lower JOURNAL_MAX_CHARS or measure Buffer.byteLength, so the binding limit is the validator's and produces a clear message.

## Reviewer notes

I'm not approving this: there are four major issues and several minor ones. Both suites pass (212/212 engine, 38/38 API) and node --check is clean on all three files. HEAD is still 8c47c8c and the working tree has the same 36 dirty paths as at the start; every probe and mutation ran on copies in the scratchpad (scripts under C:/Users/mtl87429/AppData/Local/Temp/claude/c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard/f4e56c25-9f1d-4447-bdd3-8034f986cfec/scratchpad: probe1.js, probe-utf8.js, mutate.js to mutate4.js; mirror in m/).

What blocks approval:
1. **Touch-and-bounce skips rule 2's 2-close confirmation.** After a confirmed break, one close back above SMA200 counts as a per-rule buy. The code matches the spec §3 formula exactly, so this needs the user's decision before any verdict is frozen under dj-rules-1.
2. **Outcomes score too early.** A horizon shows as 'scored' from the previous close before the target-date bar closes, then the number changes. Running the proposed fix on a scratchpad copy breaks exactly 3 tests, which currently lock in the provisional behaviour.
3. **Local dev server corrupts Thai text on save.** server.js getRequestBody splits multi-byte characters at chunk boundaries; an 85 KB Thai journal came through with 3 U+FFFD and still passed validation. This bug existed before the journal work and Vercel is unaffected, but journal text is mostly Thai and frozen.
4. **FIFO silently mixes currencies in realized P&L.** A THB buy matched by a USD sell gives −3390 USD with no warning.

Checked and fine:
- **Default portfolio path:** behaves the same in api/portfolio.js and server.js. Auth still runs before doc parsing.
- **Fetch interceptors:** data-snapshot.js only intercepts market-data and market-risk, and api-auth.js adds the password header to every /api/ path, so ?doc=journal is not hijacked.
- **Storage:** every app_state query filters by id, and the schema accepts any text id.
- **Engine hygiene:** ES5 with no Object.assign, repeat, startsWith, endsWith, padStart or findIndex. It is pure (the only Date use is new Date(ms) for date arithmetic) and has no advisory wording.
- **Rules:** rule 1 (EMA state and cross), rule 2 break and reclaim, rule 3 window and dd formula, and the closed-bar cutoff table all match spec §3/§5.2.
- **Verdicts:** match the §4 table, including the user's own case.
- **FIFO math:** fee pro-rating and the QTY_EPS handling are correct.
- **Merging:** per-item last-write-wins with tombstones behaves as spec §6 describes.
- **Plan correction:** the implementer changed one plan value, at test line 303. Their arithmetic holds (8-day gap > 7 → no-data); finding #2 would change that test again.

Unverified, for the page builder: /api/ohlc sets end and Yahoo period2 to UTC midnight. So today's Thai bar probably does not show up until about 07:00 Bangkok the next day, and a Thai entry made at 18:00 will likely use the previous close. I did not call /api/ohlc to confirm, because it writes a cache file.
