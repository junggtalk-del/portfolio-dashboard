# Decision Journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `/decision-journal` page that freezes what the user thought/felt/did and what their 3 trading rules said at decision time, scores it later against real prices, and logs real trades with FIFO P&L.

**Architecture:** Pure ES5 engine (`public/decision-journal-engine.js`, no DOM/fetch/storage) + ES5 page (`public/decision-journal-page.js`) rendering into `#djRoot`, following the Thai DR Monitor pattern. Storage is a separate Supabase `app_state` row reached through the existing `/api/portfolio?doc=journal` branch (mirrored in `server.js`). Prices come only from `/api/ohlc`; EMA/SMA come only from `window.AITechnicalIndicators`.

**Tech Stack:** Vanilla JS (ES5 for engine/page), Node test scripts (`scripts/*.js`, `t(name, cond, extra)` counters, exit 1 on failure), VM-sandbox view tests, Supabase REST via existing handlers.

**Spec:** `docs/superpowers/specs/2026-10-25-decision-journal-design.md` (Thai). Read it first; section numbers below (§) refer to it.

## Global Constraints

- **Do NOT `git commit` or `git push` at any step.** The user commits only when they say "put git". Every "Commit" step in the usual template is replaced by "Leave changes uncommitted".
- Engine and page files are **strict ES5**: no `=>`, no `const`/`let`, no template literals, no `class`, no optional chaining, no `Array.prototype.includes`/`fill` (use `indexOf`/loops). Tests enforce this with the regex in `scripts/thai-dr-monitor-test.js:401-415`.
- Engine is **pure**: no DOM, fetch, storage, `Date.now()`, or wall clock. Any "now" is a parameter (`nowBangkok`, string `YYYY-MM-DDTHH:mm`).
- Unknown values are `null`, never `NaN`/`Infinity`/`undefined`/`0`. Round only in the page.
- **Never write a new EMA/SMA formula.** Resolve `calculateEMA`/`calculateSMA` from `window.AITechnicalIndicators` or `require("./technical-indicators.js")` exactly like `public/sma200-reclaim.js:108-121`; if unavailable, rules 1 and 2 are `na`.
- Copy rules (§7): Thai copy; ซื้อ/ขาย allowed as recorded actions; forbidden anywhere in rendered HTML or source: `ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน` and `\b(Buy|Sell)\b`; the method section must contain `ไม่ใช่คำแนะนำการลงทุน`. Estimates carry `~`.
- Money: baht as `฿1,234` (never `1,234 บาท`); never put money amounts in `title`/`aria-label` attributes; while `window.PortfolioPrivacy.isLocked()` the page renders personal amounts (qty, cost, P&L, any currency) as `XXX`.
- Shared `?v=` strings in HTML must stay single-valued across all `public/*.html` (`scripts/site-integrity-test.js:44-58`). New page files use `?v=20261025-dj-1`. `app-navigation.js` bumps to `20261025-nav-26` and `privacy.js` to `20261025-pv-2` in **every** HTML file that references them.
- No new file under `api/` (Vercel limit 12/12). The `?doc=journal` branch lives inside `api/portfolio.js` and `server.js`.
- Do not edit `document-specialist-skill/` and do not `git add` it.
- Windows shell caveat (from project memory): never pass regex/backslashes through `node -e` or Bash heredocs; write scripts with the Write tool and run `node file.js`.

## Review Focus

Input classes the spec implies but no requirement names explicitly. Each line's test is pinned to its owning task below.

1. **Record date on a weekend/holiday** (user journals on Saturday about Friday's move): as-of bar must be the last closed bar ≤ that date, and outcome targets that land on weekends must take the prior close within 7 days — Task 3 (`asOfBars` weekend test) and Task 5 (`actualAt` weekend test).
2. **Symbol typed sloppily** (`btc`, `nvda `, `ptt` without `.BK`): canonical/provider mapping must be deterministic, and a symbol that returns 0 bars must still be savable as `unknown` with a visible notice rather than silently producing another ticker's rules — Task 2 (`canonicalSymbol` cases) and Task 9 (view test "0 bars → unknown").
3. **Two devices editing offline** (entry added on phone, review written on desktop before sync): merge must be per-id and tombstones must win — Task 7 (`mergeDocs` matrix).
4. **Doc grows past the size cap or the server rejects**: the page must keep a local draft, say plainly it is not saved, and retry on next load — Task 1 (400 on oversize) and Task 9 (view test "PUT fails → draft").
5. **Fractional quantities** (BTC `0.0123`) and fees in FIFO: P&L must not round quantities and must subtract fees once — Task 6 (`fifo` decimal/fee tests).

---

### Task 1: Server storage branch `?doc=journal`

**Files:**
- Create: `lib/journal-validation.js`
- Modify: `api/portfolio.js` (whole handler, lines 25-80)
- Modify: `server.js:509-577` (`handlePortfolio`), plus local-fallback helpers near `server.js:380-399`
- Test: `scripts/journal-api-test.js`

**Interfaces:**
- Produces: `lib/journal-validation.js` exports `{ isValidJournalDoc(data) -> boolean, JOURNAL_STATE_ID: "decision_journal_main", JOURNAL_MAX_CHARS: 1500000 }`. **(Superseded by Task 7b-A: `JOURNAL_MAX_BYTES = 900000` UTF-8 bytes plus `journalItemProblems`; `JOURNAL_MAX_CHARS` no longer exists.)**
- Produces: `GET /api/portfolio?doc=journal` → `{ data: doc|null }`; `PUT /api/portfolio?doc=journal` body `{ data: doc }` → `{ ok: true }` or `400 { error: "Refusing to save: journal data is malformed." }`; `?doc=<anything else>` → `400 { error: "Unknown doc." }`; no `doc` → unchanged behaviour (row `main`, `isValidPortfolioData`).
- Valid doc (§6): plain object, `v === 1`, `entries` and `trades` arrays, every item a plain object with `id` string (non-empty), `date` matching `/^\d{4}-\d{2}-\d{2}$/`, `symbol` string (non-empty); `JSON.stringify(data).length <= JOURNAL_MAX_CHARS`.

- [ ] **Step 1: Write the failing tests** in `scripts/journal-api-test.js`

Structure: `t(name, cond, extra)` counter like `scripts/thai-dr-monitor-test.js:19`; at the end print `N checks · P passed · F failed` and `process.exit(fail ? 1 : 0)`.

Section A — validator (require `../lib/journal-validation.js`):
```js
t("empty doc is valid", V.isValidJournalDoc({ v: 1, entries: [], trades: [] }));
t("v must be 1", !V.isValidJournalDoc({ v: 2, entries: [], trades: [] }));
t("entries must be array", !V.isValidJournalDoc({ v: 1, entries: {}, trades: [] }));
t("entry needs id/date/symbol", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-10-25" }], trades: [] }));
t("bad date rejected", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "25/10/2026", symbol: "NVDA" }], trades: [] }));
t("null/array/string rejected", !V.isValidJournalDoc(null) && !V.isValidJournalDoc([]) && !V.isValidJournalDoc("x"));
t("oversize rejected", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA", note: "x".repeat(V.JOURNAL_MAX_CHARS) }], trades: [] }));
t("state id fixed", V.JOURNAL_STATE_ID === "decision_journal_main");
```

Section B — Vercel handler. Set `process.env.SUPABASE_URL = "https://sb.test"`, `SUPABASE_SERVICE_ROLE_KEY = "k"`, `APP_PASSWORD = "pw"` **before** `require("../api/portfolio.js")`. Replace `global.fetch` with a stub that records `{ url, method, body }` and returns `{ ok: true, json: () => Promise.resolve([{ data: { marker: 1 } }]), text: () => Promise.resolve("") }`. Build `req = { method, url, headers: { "x-portfolio-password": "pw" }, body }` and `res = { statusCode: 0, headers: {}, setHeader(k, v), end(s) { this.body = JSON.parse(s); } }`. Await `handler(req, res)` for each case:
```js
// GET ?doc=journal → reads row decision_journal_main
t("GET journal reads journal row", calls[0].url.indexOf("id=eq.decision_journal_main") > 0 && res.statusCode === 200);
// GET without doc → row main (unchanged)
t("GET default reads main", calls[0].url.indexOf("id=eq.main") > 0);
// PUT valid journal → POST with id decision_journal_main and the same data
t("PUT journal writes journal row", res.statusCode === 200 && JSON.parse(calls[0].body)[0].id === "decision_journal_main" && JSON.parse(calls[0].body)[0].data.v === 1);
// PUT invalid journal → 400, no fetch
t("PUT bad journal → 400 and nothing written", res.statusCode === 400 && calls.length === 0);
// PUT journal must NOT be validated as portfolio (no quarters needed)
t("journal PUT does not require quarters", res.statusCode === 200);   // same valid-doc case
// ?doc=other → 400
t("unknown doc → 400", res.statusCode === 400 && /Unknown doc/.test(res.body.error));
// wrong password still 401 for journal
t("journal still password-gated", res.statusCode === 401);
```

Section C — server.js mirror guard (string checks, since `server.js` starts listening on require):
```js
var srv = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
t("server.js requires journal validation", /require\("\.\/lib\/journal-validation"\)/.test(srv));
t("server.js GET and PUT both branch on doc=journal", (srv.match(/doc === "journal"/g) || []).length >= 2);
t("server.js uses JOURNAL_STATE_ID for the row", /JOURNAL_STATE_ID/.test(srv));
t("server.js local-fallback has a journal file", /decision-journal\.json/.test(srv));
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/journal-api-test.js`
Expected: FAIL — `Cannot find module '../lib/journal-validation.js'`.

- [ ] **Step 3: Implement `lib/journal-validation.js`**

CommonJS like `lib/portfolio-validation.js`. Export the three names from Interfaces. `isValidJournalDoc` must never throw (wrap `JSON.stringify` in try/catch → false).

- [ ] **Step 4: Implement the branch in `api/portfolio.js`**

Parse `const doc = new URL(req.url || "/", "http://localhost").searchParams.get("doc")` after the password check. Refactor `readState()`/`writeState(data)` to `readState(id)`/`writeState(id, data)`. `doc === "journal"` → use `JOURNAL_STATE_ID` and `isValidJournalDoc`, 400 message `"Refusing to save: journal data is malformed."`; any other non-empty `doc` → `400 { error: "Unknown doc." }`; no `doc` → existing code path with `STATE_ID` and `isValidPortfolioData`.

- [ ] **Step 5: Mirror in `server.js` `handlePortfolio`**

Same parsing from `new URL(req.url, "http://" + req.headers.host)`. Supabase path: same row/validator switch. Local-fallback path (`ENABLE_LOCAL_FALLBACK`): add `LOCAL_JOURNAL_FILE = path.join(LOCAL_DATA_DIR, "decision-journal.json")` with `readLocalJournalData()/writeLocalJournalData(data)` shaped like `readLocalPortfolioData/writeLocalPortfolioData` (`server.js:380-399`). Keep the 1,000,000-char body cap as is (it is below `JOURNAL_MAX_CHARS`; note this in a comment — the local dev cap is the binding one).

- [ ] **Step 6: Run tests**

Run: `node scripts/journal-api-test.js` → all pass. Then `node --check api/portfolio.js server.js`.
Then restart the local server (background task `bgc1fwk7q` — stop it with TaskStop, start `node server.js` again) and verify the route is live: `curl -s -i "http://localhost:4173/api/portfolio?doc=journal" | head -1` → `HTTP/1.1 401` (password-gated; the branch is reached). `curl -s -i "http://localhost:4173/api/portfolio?doc=nope" | head -1` → also `401` (auth precedes doc parsing) — acceptable.

- [ ] **Step 7: Leave changes uncommitted**

---

### Task 2: Engine scaffold, symbols, markets, closed-bar cutoff

**Files:**
- Create: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (new; sections are appended by later tasks)

**Interfaces:**
- Produces (`window.DecisionJournal` and `module.exports`, plus `_internal`):
  - constants: `VERSION = 1`, `RULES_VERSION = "dj-rules-1"`, `HORIZONS = [7, 30, 90]`, `FLAT_BAND_PCT = 2` (was 1 until 7b-bands, user decision 2026-10-26), `DIP_PCT = -20`, `TOUCH_BAND_PCT = 3` (was 2 until 7b-bands), `TOUCH_LOOKBACK_BARS = 5`, `RECLAIM_MAX_BARS_AGO = 9`, `CONFIRM_BARS = 2`, `MIN_STAT_N = 3`, `MAX_STALE_DAYS = 7`, `MAX_GAP_DAYS = 7`, `BASIS_TOLERANCE_PCT = 0.5`, `MIN_EMA_BARS = 26`, `MIN_SMA_BARS = 200`, `HIGH1Y_BARS = 252`
  - `FEELINGS = [{key:"fear",thai:"กลัว"},{key:"greed",thai:"โลภ"},{key:"fomo",thai:"กลัวตกรถ"},{key:"confident",thai:"มั่นใจ"},{key:"unsure",thai:"ลังเล"},{key:"bored",thai:"เบื่อ"},{key:"regret",thai:"เสียดาย"},{key:"calm",thai:"นิ่ง"}]`
  - `ACTIONS = [{key:"buy",thai:"ซื้อ"},{key:"sell",thai:"ขาย"},{key:"hold",thai:"ถือต่อ"},{key:"none",thai:"ไม่ทำอะไร"}]`, `DIRECTIONS = [{key:"up",thai:"ขึ้น"},{key:"down",thai:"ลง"},{key:"unsure",thai:"ไม่แน่ใจ"}]`
  - `isYmd(s) -> boolean`; `ymdAdd(ymd, days) -> ymd|null` (UTC arithmetic); `daysBetween(a, b) -> number|null` (b − a in days)
  - `canonicalSymbol(raw) -> string` — trim, upper-case, strip chars outside `A-Z0-9.^-`; aliases `BTC`, `BTC-USD`, `BTCUSD` → `BTCUSD`
  - `providerSymbol(canonical) -> string` — `BTCUSD → BTC-USD`, else unchanged
  - `marketOf(symbol) -> "TH"|"ASIA"|"US"|"CRYPTO"` — `.BK` → TH; suffix in `.HK .T .SS .SZ .TW .SI` → ASIA; `BTCUSD` or ending `-USD` → CRYPTO; else US
  - `currencyOf(symbol) -> "THB"|"USD"` — TH → THB, else USD
  - `closedBarCutoff(market, nowBangkok) -> ymd|null` — latest bar **date** considered closed at `nowBangkok` (`"YYYY-MM-DDTHH:mm"`): TH/ASIA: hour ≥ 17 → today, else yesterday; US: hour ≥ 5 → yesterday, else day-before-yesterday; CRYPTO: hour ≥ 7 → yesterday, else day-before-yesterday. Invalid input → `null`.
  - `newId(prefix) -> string` — `prefix + "_" + 8 base36 chars` (uses `Math.random`; this is the one impure helper, kept out of all computations)
  - `parseNow(nowBangkok) -> { ymd, hour, minute }|null` (in `_internal`)

- [ ] **Step 1: Write the failing tests** (file header: `"use strict"`, `var E = require("../public/decision-journal-engine.js")`, `t`/`tNear` helpers, final summary/exit as in Task 1)

```js
console.log("== symbols ==");
t("canonical upper/trim", E.canonicalSymbol(" nvda ") === "NVDA");
t("BTC aliases → BTCUSD", ["btc", "BTC-USD", "btcusd"].every(function (s) { return E.canonicalSymbol(s) === "BTCUSD"; }));
t("provider BTCUSD → BTC-USD, others unchanged", E.providerSymbol("BTCUSD") === "BTC-USD" && E.providerSymbol("PTT.BK") === "PTT.BK");
t("strips junk but keeps . ^ -", E.canonicalSymbol("brk b/") === "BRKB" && E.canonicalSymbol("^set.bk") === "^SET.BK");
t("markets", E.marketOf("PTT.BK") === "TH" && E.marketOf("0700.HK") === "ASIA" && E.marketOf("7203.T") === "ASIA" && E.marketOf("BTCUSD") === "CRYPTO" && E.marketOf("ETH-USD") === "CRYPTO" && E.marketOf("NVDA") === "US");
t("currency", E.currencyOf("PTT.BK") === "THB" && E.currencyOf("NVDA") === "USD" && E.currencyOf("BTCUSD") === "USD");
console.log("== closed-bar cutoff (Bangkok wall clock) ==");
t("US 02:00 D+1 → bar D not closed", E.closedBarCutoff("US", "2026-10-25T02:00") === "2026-10-23");
t("US 06:00 D+1 → bar D closed", E.closedBarCutoff("US", "2026-10-25T06:00") === "2026-10-24");
t("TH 10:00 → today's bar not closed", E.closedBarCutoff("TH", "2026-10-25T10:00") === "2026-10-24");
t("TH 18:00 → today's bar closed", E.closedBarCutoff("TH", "2026-10-25T18:00") === "2026-10-25");
t("ASIA same as TH", E.closedBarCutoff("ASIA", "2026-10-25T16:59") === "2026-10-24");
t("CRYPTO 06:30 → yesterday not closed", E.closedBarCutoff("CRYPTO", "2026-10-25T06:30") === "2026-10-23");
t("CRYPTO 07:30 → yesterday closed", E.closedBarCutoff("CRYPTO", "2026-10-25T07:30") === "2026-10-24");
t("month boundary", E.closedBarCutoff("US", "2026-11-01T03:00") === "2026-10-30");
t("bad now → null", E.closedBarCutoff("US", "nope") === null && E.closedBarCutoff("US", null) === null);
console.log("== dates/ids ==");
t("ymdAdd", E.ymdAdd("2026-02-27", 3) === "2026-03-02" && E.ymdAdd("x", 1) === null);
t("daysBetween", E.daysBetween("2026-10-01", "2026-10-10") === 9);
t("newId prefix + unique", /^e_[a-z0-9]{8}$/.test(E.newId("e")) && E.newId("t") !== E.newId("t"));
t("constants exported", E.RULES_VERSION === "dj-rules-1" && E.HORIZONS.join() === "7,30,90" && E.DIP_PCT === -20 && E.TOUCH_BAND_PCT === 2 && E.MAX_STALE_DAYS === 7 && E.FEELINGS.length === 8);
```

- [ ] **Step 2: Run to verify it fails** — `node scripts/decision-journal-test.js` → `Cannot find module`.

- [ ] **Step 3: Implement the scaffold** in `public/decision-journal-engine.js`

IIFE with `"use strict"`, header comment in Thai stating the contract (pure · ES5 · unknown = null · frozen records must never be recomputed · not advice), the constants, helpers, and the tail:
```js
if (typeof window !== "undefined") window.DecisionJournal = DecisionJournal;
if (typeof module !== "undefined" && module.exports) module.exports = DecisionJournal;
```
`_internal` holds `parseNow` and future helpers.

- [ ] **Step 4: Run tests** → all pass. `node --check public/decision-journal-engine.js`.

- [ ] **Step 5: Leave changes uncommitted**

---

### Task 3: Engine — as-of bars and `evaluateRules`

**Files:**
- Modify: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (append section `== rules ==`)

**Interfaces:**
- Consumes: Task 2 helpers; `AITechnicalIndicators.calculateEMA(prices, period)` / `calculateSMA(prices, period)` (arrays, `null` before warm-up) resolved by `_internal.indicators()` → object or `null`.
- Produces:
  - `asOfBars(bars, entryDate, nowBangkok, symbol) -> { bars: Bar[], asOfBar: ymd|null, partialBarDropped: boolean, staleDays: number|null }` — keeps bars with `isYmd(date)` and finite `close > 0`, sorted ascending by date, `date <= entryDate` and `date <= closedBarCutoff(marketOf(symbol), nowBangkok)`; `partialBarDropped` = at least one input bar with `date <= entryDate` was excluded by the cutoff; `staleDays = daysBetween(asOfBar, entryDate)`.
  - `evaluateRules(bars, opts) -> Rules` where `opts = { date, nowBangkok, symbol, conviction }` and `Rules` is exactly §5.3 plus `{ ok: boolean, blocked: string|null, staleSource: boolean }`:
    - `blocked = "stale"` when `staleDays > MAX_STALE_DAYS` (and `ok = false`); `blocked = "no-bars"` when zero usable bars (all rule states `na`, `ok = false`); otherwise `ok = true`, `staleSource = staleDays > 0 && staleDays <= MAX_STALE_DAYS` is **not** the stale flag — `staleSource` is set by the page from `/api/ohlc.sourceType`; the engine sets it `false`.
    - Rule 1 (needs ≥ `MIN_EMA_BARS` closes and indicators): `state` from the last EMA pair (`bull`/`bear`/`flat`), most recent cross either direction with the plain `prev <= && now >` / `prev >= && now <` test, `crossBarsAgo` 0-based from the as-of bar, `buy = state==="bull"`, `sell = state==="bear"`; otherwise all `null` with `state: "na"`.
    - Rule 2 (needs ≥ `MIN_SMA_BARS`): `state` from close vs SMA200 on the as-of bar (`above`/`below`/`at`), `consecutive` = trailing bars with the same state (an `at` bar breaks a streak), last cross either direction (`crossDir`, `crossBarsAgo`), `breakConfirmed = state==="below" && consecutive >= CONFIRM_BARS`, `reclaimHeld = state==="above" && consecutive >= CONFIRM_BARS && crossDir==="up" && crossBarsAgo <= RECLAIM_MAX_BARS_AGO`, `touchBounce` per §3 using `low` (a bar without finite `low` uses its `close`), `sell = breakConfirmed`, `buy = reclaimHeld || touchBounce.met`.
    - Rule 3 (needs ≥ 5 closes): `high1y` = max close over the last `min(HIGH1Y_BARS, n)` bars including as-of, `high1yDate`, `high1yWindowBars`, `dd1yPct = (close/high1y − 1) × 100` unrounded, `dipMet = dd1yPct <= DIP_PCT`, `buy = dipMet && conviction === true`, `conviction` echoed.
    - Top-level `close, ema12, ema26, sma200` are the as-of values (`null` when unavailable); `version = RULES_VERSION`, `source = "yahoo:/api/ohlc"`, `barsUsed`, `asOfBar`, `partialBarDropped`.

- [ ] **Step 1: Write the failing tests**

Add a fixture helper at the top of the test file: `mkBars(startYmd, closes, lows)` → consecutive **weekdays** starting at `startYmd`, `open = high = close`, `low = lows ? lows[i] : close`, `volume = 1000`. Compute expected EMA/SMA facts with `require("../public/technical-indicators.js")` (the site's shared calculator — allowed as a cross-check, it is not the engine).

```js
console.log("== rules: as-of bars ==");
var flat = mkBars("2025-01-06", rep(100, 205));                      // rep(v, n) → array
var cut = E.asOfBars(flat.concat([{ date: "2026-10-25", close: 50, low: 50 }]), "2026-10-25", "2026-10-25T02:00", "NVDA");
t("US at 02:00: bar dated today excluded and flagged", cut.partialBarDropped === true && cut.bars[cut.bars.length - 1].date !== "2026-10-25");
t("weekend record date → last weekday bar", E.asOfBars(flat, "2026-10-25", "2026-10-26T12:00", "NVDA").asOfBar === flat[flat.length - 1].date);  // 2026-10-25 is a Sunday; fixture ends on a weekday
t("stale 9 days → blocked", E.evaluateRules(mkBars("2026-01-05", rep(100, 30)), { date: E.ymdAdd(lastDate(mkBars("2026-01-05", rep(100, 30))), 9), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" }).blocked === "stale");
t("zero bars → no-bars, all na, ok false", (function () { var r = E.evaluateRules([], { date: "2026-10-01", nowBangkok: "2026-10-25T12:00", symbol: "K-GTECHRMF" }); return r.blocked === "no-bars" && r.r1.state === "na" && r.r2.state === "na" && r.r3.dipMet === null && r.ok === false; })());

console.log("== rule 1 EMA ==");
var NOW = "2027-01-01T12:00";
function evalFlat(bars, extra) { return E.evaluateRules(bars, Object.assign({ date: lastDate(bars), nowBangkok: NOW, symbol: "NVDA" }, extra || {})); }
var up = mkBars("2025-01-06", rep(100, 40).concat([101,102,103,104,105,106,107,108]));
var r = evalFlat(up);
t("rising → bull, buy supported, sell not", r.r1.state === "bull" && r.r1.buy === true && r.r1.sell === false);
// expected cross index from the shared calculator (prev<= && now>)
t("crossBarsAgo matches plain cross on shared EMA", r.r1.crossDir === "up" && r.r1.crossBarsAgo === expectedCrossAgo(up.map(function (b) { return b.close; })));
t("150 bars → r1 computed but r2 na (not 0)", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 150))); return x.r1.state !== "na" && x.r2.state === "na" && x.r2.consecutive === null && x.sma200 === null; })());
t("25 bars → r1 na", evalFlat(mkBars("2026-01-05", rep(100, 25))).r1.state === "na");

console.log("== rule 2 SMA200 ==");
var drop1 = mkBars("2025-01-06", rep(100, 204).concat([90]));
var drop2 = mkBars("2025-01-06", rep(100, 203).concat([90, 90]));
t("below 1 bar → not confirmed", (function () { var x = evalFlat(drop1); return x.r2.state === "below" && x.r2.consecutive === 1 && x.r2.breakConfirmed === false && x.r2.sell === false; })());
t("below 2 bars → confirmed sell", (function () { var x = evalFlat(drop2); return x.r2.consecutive === 2 && x.r2.breakConfirmed === true && x.r2.sell === true && x.r2.crossDir === "down" && x.r2.crossBarsAgo === 1; })());
tNear("sma200 hand value (198×100 + 2×90)/200", evalFlat(drop2).sma200, 99.9, 1e-9);
var reclaim = mkBars("2025-01-06", rep(100, 200).concat([95,95,95,95,95,101,101]));
t("reclaim held 2 bars, cross 1 bar ago → buy", (function () { var x = evalFlat(reclaim); return x.r2.state === "above" && x.r2.consecutive === 2 && x.r2.crossDir === "up" && x.r2.crossBarsAgo === 1 && x.r2.reclaimHeld === true && x.r2.buy === true; })());
var oldReclaim = mkBars("2025-01-06", rep(100, 200).concat(rep(101, 20)));
t("above for 20 bars, cross 19 bars ago → not reclaimHeld, no touch → r2.buy false but state above", (function () { var x = evalFlat(oldReclaim); return x.r2.state === "above" && x.r2.crossBarsAgo === 19 && x.r2.reclaimHeld === false && x.r2.touchBounce.met === false && x.r2.buy === false && x.r2.sell === false; })());
// touch & bounce: 200 flat, then touch bar (low within 2% of SMA), then two higher closes
var base = rep(100, 200);
var tb = mkBars("2025-01-06", base.concat([101, 102, 103]), base.concat([100.5, 101.5, 102.5]));
t("touch within 2% then higher close → met", (function () { var x = evalFlat(tb); return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === tb[200].date && x.r2.buy === true; })());
var noTouch = mkBars("2025-01-06", base.concat([104, 105, 106]), base.concat([103.5, 104.5, 105.5]));
t("low more than 2% above SMA → not a touch", evalFlat(noTouch).r2.touchBounce.met === false);
var touchNoBounce = mkBars("2025-01-06", base.concat([101, 99, 99]), base.concat([100.5, 98, 98]));
t("touched but as-of closes below SMA → not met", evalFlat(touchNoBounce).r2.touchBounce.met === false);
t("touch older than 5 bars → ignored", (function () { var b = mkBars("2025-01-06", base.concat([101,102,103,104,105,106,107]), base.concat([100.5,102,103,104,105,106,107])); return evalFlat(b).r2.touchBounce.met === false; })());

console.log("== rule 3 dip ==");
var dipExact = mkBars("2025-01-06", rep(100, 100).concat([125]).concat(rep(100, 151)));   // 252 bars, high 125, last 100 → −20.0
t("−20.0 exactly → dipMet", (function () { var x = evalFlat(dipExact, { conviction: true }); return Math.abs(x.r3.dd1yPct - (-20)) < 1e-12 && x.r3.dipMet === true && x.r3.buy === true && x.high1y === 125; })());
t("conviction false → dipMet but not buy", evalFlat(dipExact, { conviction: false }).r3.buy === false);
t("−19.92 → not dip (raw, unrounded)", evalFlat(mkBars("2025-01-06", rep(100, 100).concat([125]).concat(rep(100, 150)).concat([100.1]))).r3.dipMet === false);
t("high outside 252-bar window ignored", (function () { var b = mkBars("2025-01-06", [200].concat(rep(100, 252))); var x = evalFlat(b); return x.high1y === 100 && x.r3.high1yWindowBars === 252; })());
t("cross-check: round1(dd1yPct) === ThesisEngine.drawdownPct(closes, 252)", (function () { var TE = require("../public/thesis-engine.js"); var c = dipExact.map(function (b) { return b.close; }); var x = evalFlat(dipExact); return Math.round(x.r3.dd1yPct * 10) / 10 === TE.drawdownPct(c, 252); })());
t("rules frozen fields present", (function () { var x = evalFlat(up); return x.version === "dj-rules-1" && x.source === "yahoo:/api/ohlc" && typeof x.barsUsed === "number" && E.isYmd(x.asOfBar) && x.partialBarDropped === false; })());
```
Helpers to add in the test: `rep(v, n)`, `lastDate(bars)`, `expectedCrossAgo(closes)` (uses `TI.calculateEMA` 12/26 and the plain cross scan).

- [ ] **Step 2: Run to verify it fails** — new section fails with `E.asOfBars is not a function`.

- [ ] **Step 3: Implement `asOfBars` and `evaluateRules`**

Indicator resolution copies `sma200-reclaim.js:108-121` (window first, then `require("./technical-indicators.js")`). Build `closes`, `lows` arrays from the as-of bars; call `calculateEMA(closes, 12)`, `calculateEMA(closes, 26)`, `calculateSMA(closes, 200)` once each. `_internal` exposes `lastCross(aArr, bArr)` (returns `{dir, barsAgo}|null`), `trailingState(closes, sma)`, `touchBounce(bars, sma)`.

- [ ] **Step 4: Run tests** → all pass.

- [ ] **Step 5: Leave changes uncommitted**

---

### Task 4: Engine — verdict

**Files:**
- Modify: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (append `== verdict ==`)

**Interfaces:**
- Produces: `verdictFor(actionKind, rules) -> { compliance: "per-rule"|"against"|"n/a"|"unknown", supports: string[], opposes: string[], rulesSay: "buy"|"sell"|"mixed"|"none", why: string }` per §4. `rules` may be the full object from Task 3 or a minimal `{ r1:{buy,sell,state}, r2:{buy,sell,state}, r3:{buy} }`. `why` is Thai, one line per rule, e.g. `"กฎ 1: EMA12 ยังเหนือ EMA26 · กฎ 2: ยังไม่หลุด SMA200"`; for `na` rules: `"กฎ 2: ข้อมูลไม่พอ"`.

- [ ] **Step 1: Write the failing tests**

```js
function R(r1b, r1s, r2b, r2s, r3b, na) { return { r1: { buy: r1b, sell: r1s, state: na ? "na" : (r1b ? "bull" : r1s ? "bear" : "flat") }, r2: { buy: r2b, sell: r2s, state: na ? "na" : "above" }, r3: { buy: r3b, dipMet: r3b } }; }
t("user case: sold on bad news while bull & above → against, opposes r1", (function () { var v = E.verdictFor("sell", R(true,false,false,false,false)); return v.compliance === "against" && v.opposes.join() === "r1" && v.supports.length === 0 && /กฎ 1/.test(v.why); })());
t("sell after confirmed break → per-rule", E.verdictFor("sell", R(false,true,false,true,false)).compliance === "per-rule");
t("buy on dip with conviction, EMA bear → per-rule (supports r3) and opposes r1 listed", (function () { var v = E.verdictFor("buy", R(false,true,false,false,true)); return v.compliance === "per-rule" && v.supports.join() === "r3" && v.opposes.join() === "r1"; })());
t("buy with nothing supporting → against", E.verdictFor("buy", R(false,false,false,false,false)).compliance === "against");
t("hold → n/a but rulesSay filled", (function () { var v = E.verdictFor("hold", R(true,false,false,false,false)); return v.compliance === "n/a" && v.rulesSay === "buy"; })());
t("rulesSay mixed when both sides supported", E.verdictFor("none", R(true,false,false,true,false)).rulesSay === "mixed");
t("rulesSay none", E.verdictFor("none", R(false,false,false,false,false)).rulesSay === "none");
t("r1 and r2 both na → unknown", E.verdictFor("sell", R(null,null,null,null,false,true)).compliance === "unknown");
t("unknown action kind → n/a", E.verdictFor("wat", R(true,false,false,false,false)).compliance === "n/a");
```

- [ ] **Step 2: Run to verify it fails.** — `E.verdictFor is not a function`.
- [ ] **Step 3: Implement `verdictFor`** per the §4 table.
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 5: Engine — outcomes and review due

**Files:**
- Modify: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (append `== outcomes ==`)

**Interfaces:**
- Produces:
  - `actualAt(bars, targetYmd, maxGapDays) -> { date, close }|null` — same contract as `public/btc-forecast-log.js:141` (latest bar with `date <= target`, gap ≤ `maxGapDays`, default `MAX_GAP_DAYS`), ignoring bars with non-finite or ≤0 close.
  - `outcomes(entry, bars, nowBangkok) -> Outcome` with:
    ```
    { refClose: number|null, refSource: "fresh"|"frozen"|null, priceBasisChanged: boolean,
      horizons: { "7": H, "30": H, "90": H }, dueDate: ymd, predicted: "right"|"wrong"|"flat"|"pending"|"no-data"|"n/a",
      actionResult: "good"|"bad"|"flat"|"pending"|"no-data"|"n/a", lastClosedBar: ymd|null }
    H = { target: ymd, status: "pending"|"scored"|"no-data", date: ymd|null, close: number|null, pct: number|null }
    ```
    Bars considered are only those with `date <= closedBarCutoff(marketOf(entry.symbol), nowBangkok)` (§5.4). `refClose` = close of the fresh series on `entry.rules.asOfBar` (`refSource: "fresh"`); if absent, `entry.rules.close` (`"frozen"`); `priceBasisChanged = |refClose/rules.close − 1| × 100 > BASIS_TOLERANCE_PCT` when both exist. `H.status`: `pending` if `target > today(nowBangkok)`; else `scored` when `actualAt` finds a bar, else `no-data`. `predicted` uses the horizon `entry.view.horizonDays`: `up` right when `pct > FLAT_BAND_PCT`, `down` right when `pct < −FLAT_BAND_PCT`, `|pct| <= FLAT_BAND_PCT` → `flat`, `unsure` → `n/a`. `actionResult`: `buy` good when `pct > 0`, `sell` good when `pct < 0`, `|pct| <= FLAT_BAND_PCT` → `flat` (checked first), `hold/none` → `n/a`. `dueDate = ymdAdd(entry.date, entry.view.horizonDays)`.
  - `reviewDue(entry, outcome) -> boolean` — `!entry.review.reviewedAt && outcome.horizons[String(entry.view.horizonDays)].status !== "pending"`.

- [ ] **Step 1: Write the failing tests**

```js
function entry(o) { return Object.assign({ id: "e_1", date: "2026-09-01", symbol: "NVDA", view: { direction: "up", horizonDays: 7 }, action: { kind: "buy" }, rules: { asOfBar: "2026-08-31", close: 100 }, review: { reviewedAt: null } }, o); }
var B = [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 103 }, { date: "2026-10-01", close: 95 }, { date: "2026-10-23", close: 97 }];
var o = E.outcomes(entry(), B, "2026-10-25T12:00");
t("+7 scored +3.0 on 2026-09-08", o.horizons["7"].status === "scored" && o.horizons["7"].date === "2026-09-08" && Math.abs(o.horizons["7"].pct - 3) < 1e-9);
t("+30 target 2026-10-01 → −5.0", o.horizons["30"].status === "scored" && Math.abs(o.horizons["30"].pct + 5) < 1e-9);
t("+90 target 2026-11-30 → pending", o.horizons["90"].status === "pending" && o.horizons["90"].target === "2026-11-30");
t("predicted up at +7 → right; dueDate 2026-09-08", o.predicted === "right" && o.dueDate === "2026-09-08");
t("ref from fresh series, basis unchanged", o.refSource === "fresh" && o.refClose === 100 && o.priceBasisChanged === false);
t("sell with horizon 30 → good (price fell)", E.outcomes(entry({ view: { direction: "down", horizonDays: 30 }, action: { kind: "sell" } }), B, "2026-10-25T12:00").actionResult === "good");
t("flat band: +0.5% → flat for both", (function () { var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 100.5 }], "2026-10-25T12:00"); return x.predicted === "flat" && x.actionResult === "flat"; })());
t("unsure → n/a; hold → n/a", (function () { var x = E.outcomes(entry({ view: { direction: "unsure", horizonDays: 7 }, action: { kind: "hold" } }), B, "2026-10-25T12:00"); return x.predicted === "n/a" && x.actionResult === "n/a"; })());
t("gap > 7 days → no-data", E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-20", close: 110 }], "2026-10-25T12:00").horizons["7"].status === "no-data");
t("weekend target takes prior close within 7 days", (function () { var x = E.outcomes(entry({ date: "2026-09-04" }), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-10", close: 104 }], "2026-10-25T12:00"); return x.horizons["7"].target === "2026-09-11" && x.horizons["7"].date === "2026-09-10"; })());
t("split-adjusted history → ref from fresh series and basis flag", (function () { var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 10 }, { date: "2026-09-08", close: 9.5 }], "2026-10-25T12:00"); return x.refClose === 10 && x.priceBasisChanged === true && Math.abs(x.horizons["7"].pct + 5) < 1e-9; })());
t("as-of bar missing in fresh series → frozen close used", E.outcomes(entry(), [{ date: "2026-09-08", close: 103 }], "2026-10-25T12:00").refSource === "frozen");
t("unclosed bar never used as actual (US at 02:00)", (function () { var x = E.outcomes(entry({ date: "2026-10-17" }), [{ date: "2026-10-16", close: 100 }, { date: "2026-10-24", close: 120 }], "2026-10-25T02:00"); return x.horizons["7"].date === "2026-10-16"; })());   // target 2026-10-24: that bar is not closed yet → falls back within 7 days
t("reviewDue only after own horizon and when unreviewed", E.reviewDue(entry(), o) === true && E.reviewDue(entry({ view: { direction: "up", horizonDays: 90 } }), E.outcomes(entry({ view: { direction: "up", horizonDays: 90 } }), B, "2026-10-25T12:00")) === false && E.reviewDue(entry({ review: { reviewedAt: "2026-10-01T00:00:00Z" } }), o) === false);
t("no NaN/undefined in outcome", !/NaN|undefined|Infinity/.test(JSON.stringify(o)));
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `actualAt`, `outcomes`, `reviewDue`.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 6: Engine — FIFO trades and buy-back

**Files:**
- Modify: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (append `== trades ==`)

**Interfaces:**
- Produces:
  - `fifo(trades, lastCloses) -> { realized: Realized[], open: Open[], totals: { [ccy]: { realized, floating } }, warnings: string[] }` — `trades` filtered to `!deletedAt`, grouped by `symbol`, ordered by `(date, createdAt)`; `lastCloses = { [symbol]: { close, date, closed: boolean } }`.
    - `Realized = { tradeId, symbol, date, qty, matchedQty, pnl, pnlPct, currency, oversell: boolean }` where `pnl = Σ(sellPrice − lotPrice) × matched − sellFee − Σ(lotFee × matched/lotQty)`, `pnlPct = pnl / Σ(lotPrice × matched) × 100` (null when nothing matched).
    - `Open = { symbol, qty, avgCost, cost, currency, lastClose, lastDate, lastBarClosed, floating, floatingPct }` (`floating` null when no last close).
    - `warnings` gets `"<symbol>: ขายมากกว่าที่บันทึกซื้อไว้ (ไม้ <date>)"` for each oversell.
  - `buyBack(entry, trades) -> { sellTradeId, buyTradeId, sellPrice, buyPrice, diffPerUnit, diffPct }|null` — for an entry with `action.kind === "sell"` whose `action.tradeIds` include one sell and a later buy of the same symbol; `diffPct = (buyPrice/sellPrice − 1) × 100`.

- [ ] **Step 1: Write the failing tests**

```js
function tr(o) { return Object.assign({ id: E.newId("t"), createdAt: "2026-01-01T00:00:00Z", deletedAt: null, fee: 0, currency: null }, o); }
var T = [tr({ id: "t1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100 }), tr({ id: "t2", date: "2026-02-01", symbol: "NVDA", side: "buy", qty: 10, price: 120 }), tr({ id: "t3", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 15, price: 130, fee: 10 })];
var f = E.fifo(T, { NVDA: { close: 110, date: "2026-10-24", closed: true } });
t("FIFO matches 10@100 + 5@120: pnl 340", f.realized.length === 1 && f.realized[0].matchedQty === 15 && Math.abs(f.realized[0].pnl - 340) < 1e-9 && f.realized[0].currency === "USD");
tNear("pnlPct = 340 / (1000+600)", f.realized[0].pnlPct, 340 / 1600 * 100, 1e-9);
t("open lot 5@120, floating −50", f.open.length === 1 && f.open[0].qty === 5 && f.open[0].avgCost === 120 && Math.abs(f.open[0].floating + 50) < 1e-9 && f.open[0].lastBarClosed === true);
t("totals per currency", Math.abs(f.totals.USD.realized - 340) < 1e-9 && Math.abs(f.totals.USD.floating + 50) < 1e-9 && !f.totals.THB);
t("oversell flagged, pnl on matched only", (function () { var x = E.fifo(T.concat([tr({ id: "t4", date: "2026-04-01", symbol: "NVDA", side: "sell", qty: 20, price: 100 })]), {}); var r = x.realized[1]; return r.oversell === true && r.matchedQty === 5 && Math.abs(r.pnl - (-100)) < 1e-9 && x.warnings.length === 1 && /ขายมากกว่าที่บันทึกซื้อไว้/.test(x.warnings[0]); })());
t("fractional BTC qty and buy-side fee", (function () { var x = E.fifo([tr({ id: "b1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.0123, price: 80000, fee: 2 }), tr({ id: "s1", date: "2026-02-05", symbol: "BTCUSD", side: "sell", qty: 0.0123, price: 90000, fee: 3 })], {}); return Math.abs(x.realized[0].pnl - (10000 * 0.0123 - 3 - 2)) < 1e-9; })());
t("THB by symbol, currency override respected", (function () { var x = E.fifo([tr({ id: "p1", date: "2026-01-05", symbol: "PTT.BK", side: "buy", qty: 100, price: 40 }), tr({ id: "u1", date: "2026-01-05", symbol: "AAPL", side: "buy", qty: 1, price: 1, currency: "THB" })], {}); return x.open[0].currency === "THB" && x.open[1].currency === "THB"; })());
t("deleted trades ignored; no last close → floating null", (function () { var x = E.fifo([tr({ id: "d1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 1, deletedAt: "2026-01-06T00:00:00Z" }), tr({ id: "k1", date: "2026-01-05", symbol: "AMD", side: "buy", qty: 1, price: 1 })], {}); return x.open.length === 1 && x.open[0].symbol === "AMD" && x.open[0].floating === null; })());
t("buy-back: sold 130 then bought 140 → +7.7%", (function () { var e = { action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }; var x = E.buyBack(e, T.concat([tr({ id: "t5", date: "2026-03-10", symbol: "NVDA", side: "buy", qty: 15, price: 140 })])); return x && x.diffPerUnit === 10 && Math.abs(x.diffPct - 7.6923076923) < 1e-6; })());
t("buy-back null when no later buy", E.buyBack({ action: { kind: "sell", tradeIds: ["t3"] }, symbol: "NVDA" }, T) === null);
t("no NaN in fifo output", !/NaN|undefined|Infinity/.test(JSON.stringify(f)));
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `fifo` and `buyBack`.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 7: Engine — stats, doc merge, hygiene tests

**Files:**
- Modify: `public/decision-journal-engine.js`
- Test: `scripts/decision-journal-test.js` (append `== stats ==`, `== merge ==`, `== hygiene ==`)

**Interfaces:**
- Produces:
  - `emptyDoc() -> { v: 1, updatedAt: null, entries: [], trades: [] }`
  - `mergeDocs(a, b) -> doc` — union of `entries` and `trades` by `id`; for duplicates keep the one with the greater `updatedAt` (string compare of ISO; ties → `b`); result `entries` sorted by `date` desc then `createdAt` desc, `trades` by `date` asc then `createdAt` asc; `updatedAt` = max of inputs. Never drops tombstoned items.
  - `touch(item, nowIso) -> item` (sets `updatedAt`), `tombstone(item, nowIso) -> item` (sets `deletedAt` and `updatedAt`).
  - `liveEntries(doc)`, `liveTrades(doc)` → items without `deletedAt`.
  - `stats(entries, outcomeById) -> { byCompliance: { "per-rule": S, "against": S }, byFeeling: { [key]: S }, byPrediction: { right, wrong, flat, judged, enough } }` where `S = { n, scoredN, goodN, avgPct: number|null, enough: boolean }`; `scoredN` counts entries whose own-horizon status is `scored` and `actionResult` is `good|bad|flat`; `goodN` counts `good`; `avgPct` = mean of `pct` **in the action's direction** (sell → `−pct`), `null` unless `enough = scoredN >= MIN_STAT_N`. `byFeeling` counts an entry once per feeling it has. `byPrediction.enough = judged >= MIN_STAT_N` where `judged = right + wrong + flat`.

- [ ] **Step 1: Write the failing tests**

```js
console.log("== stats ==");
function en(id, comp, kind, feelings, out) { return { e: { id: id, verdict: { compliance: comp }, action: { kind: kind }, context: { feelings: feelings }, view: { horizonDays: 7 } }, o: out }; }
function sc(pct, res) { return { horizons: { "7": { status: "scored", pct: pct } }, actionResult: res, predicted: res === "good" ? "right" : res === "bad" ? "wrong" : "flat" }; }
var rows = [en("a", "against", "sell", ["fear"], sc(5, "bad")), en("b", "against", "sell", ["fear", "regret"], sc(3, "bad")), en("c", "against", "buy", ["fear"], sc(-2, "bad")), en("d", "per-rule", "buy", ["calm"], sc(4, "good")), en("e", "per-rule", "buy", ["calm"], { horizons: { "7": { status: "pending" } }, actionResult: "pending", predicted: "pending" })];
var S = E.stats(rows.map(function (r) { return r.e; }), rows.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
t("against: n 3, scored 3, good 0, avg in action direction = (−5 −3 −2)/3", S.byCompliance.against.n === 3 && S.byCompliance.against.scoredN === 3 && S.byCompliance.against.goodN === 0 && Math.abs(S.byCompliance.against.avgPct + 10 / 3) < 1e-9 && S.byCompliance.against.enough === true);
t("per-rule: n 2 but scored 1 → not enough, avg null", S.byCompliance["per-rule"].n === 2 && S.byCompliance["per-rule"].scoredN === 1 && S.byCompliance["per-rule"].enough === false && S.byCompliance["per-rule"].avgPct === null);
t("feeling fear counted 3 times, regret once", S.byFeeling.fear.n === 3 && S.byFeeling.regret.n === 1 && S.byFeeling.regret.enough === false);
t("prediction totals", S.byPrediction.wrong === 3 && S.byPrediction.right === 1 && S.byPrediction.judged === 4 && S.byPrediction.enough === true);

console.log("== merge ==");
var A = { v: 1, updatedAt: "2026-10-01T00:00:00Z", entries: [{ id: "e1", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z", review: { lesson: "old" } }], trades: [{ id: "t1", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", createdAt: "x" }] };
var Bd = { v: 1, updatedAt: "2026-10-02T00:00:00Z", entries: [{ id: "e1", updatedAt: "2026-10-02T10:00:00Z", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z", deletedAt: "2026-10-02T10:00:00Z" }, { id: "e2", updatedAt: "2026-10-02T11:00:00Z", date: "2026-10-02", createdAt: "2026-10-02T11:00:00Z" }], trades: [] };
var M = E.mergeDocs(A, Bd);
t("union by id, newer wins, tombstone kept", M.entries.length === 2 && M.entries.filter(function (x) { return x.id === "e1"; })[0].deletedAt && M.trades.length === 1);
t("sorted entries date desc", M.entries[0].id === "e2");
t("updatedAt = max", M.updatedAt === "2026-10-02T00:00:00Z");
t("merge with null → copy", E.mergeDocs(null, A).entries.length === 1 && E.mergeDocs(A, null).trades.length === 1);
t("merge is idempotent", JSON.stringify(E.mergeDocs(M, M)) === JSON.stringify(M));
t("liveEntries hides tombstones", E.liveEntries(M).length === 1);
t("tombstone sets both stamps", (function () { var x = E.tombstone({ id: "z" }, "2026-10-03T00:00:00Z"); return x.deletedAt === "2026-10-03T00:00:00Z" && x.updatedAt === "2026-10-03T00:00:00Z"; })());

console.log("== hygiene ==");
var src = fs.readFileSync(path.join(__dirname, "..", "public", "decision-journal-engine.js"), "utf8");
var code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
t("ES5 only", !/=>/.test(code) && !/\bconst\s/.test(code) && !/\blet\s/.test(code) && code.indexOf("`") < 0);
t("no advisory wording", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(src) && !/\b(Buy|Sell)\b/.test(code));
t("no Date.now / new Date() in computations (pure)", !/Date\.now\(|new Date\(\)/.test(code));
t("engine does not touch DOM/fetch/storage", !/document\.|fetch\(|localStorage/.test(code));
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement** `emptyDoc`, `mergeDocs`, `touch`, `tombstone`, `liveEntries`, `liveTrades`, `stats`.
- [ ] **Step 4: Run tests** → pass. Also run `node scripts/thai-dr-monitor-test.js` to confirm nothing shared broke (it should not; sanity).
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 7b: Consolidate — fixes from the Opus review (`2026-10-25-decision-journal-review-1.md`)

Added 2026-10-26. Contract changes below are decided (spec updated the same day); do not re-litigate them. Two tracks touch disjoint files and may run in parallel; a short join step adds the cross-check.

**7b-A (server)** — Files: `lib/journal-validation.js`, `server.js`, `api/portfolio.js` (only if needed), `scripts/journal-api-test.js`, new `scripts/server-portfolio-test.js`.

- `lib/journal-validation.js` exports `{ isValidJournalDoc, journalItemProblems, JOURNAL_STATE_ID: "decision_journal_main", JOURNAL_MAX_BYTES: 900000 }` (drop `JOURNAL_MAX_CHARS`). Size = `Buffer.byteLength(JSON.stringify(data), "utf8")`, valid when `<= JOURNAL_MAX_BYTES`. `journalItemProblems(item) -> string[]`, codes in this order: not a plain object → `["not-object"]` (stop); `"id"` when id is not a non-empty string; `"date"` when not `/^\d{4}-\d{2}-\d{2}$/` **or** not a real calendar date (`Date.UTC` round-trip); `"symbol"` when not a string or empty after trim. `isValidJournalDoc` = shape checks + every entry/trade has `journalItemProblems(x).length === 0` + size cap; never throws.
- `server.js`:
  - `getRequestBody`: collect `Buffer` chunks (`Buffer.isBuffer(c) ? c : Buffer.from(String(c))`), count bytes; above `1_000_000` bytes stop collecting (do **not** `req.destroy()`), and on `end` reject with `Error("Request body is too large.")` carrying `statusCode: 413`; otherwise decode once with `Buffer.concat(chunks).toString("utf8")`; empty → `{}`; bad JSON → `Error("Invalid JSON body.")` with `statusCode: 400`. Update the comment above it (journal cap is now 900,000 bytes, below the 1,000,000-byte transport cap).
  - `handlePortfolio` catch → `sendJson(res, error.statusCode || 500, { error: error.message })`.
  - `const LOCAL_DATA_DIR = process.env.LOCAL_DATA_DIR ? path.resolve(process.env.LOCAL_DATA_DIR) : path.join(__dirname, ".local-data");`
  - Wrap `server.listen(...)` in `if (require.main === module) { ... }` and add `module.exports = { handlePortfolio, getRequestBody, server };` at the end. `node server.js` must behave exactly as before.
- `scripts/server-portfolio-test.js` (new, behavioural — replaces the string-matching "Section C" of `journal-api-test.js`, which may be deleted): before `require("../server.js")` set `process.env.SUPABASE_URL = ""`, `SUPABASE_SERVICE_ROLE_KEY = ""`, `APP_PASSWORD = "pw"`, `ENABLE_LOCAL_FALLBACK = "true"`, `LOCAL_DATA_DIR = <fresh dir under os.tmpdir()>` (empty strings stop `local-env.js` from loading the real `.env` values, it never overrides set keys) and replace `global.fetch` with a recording stub — **the test must never reach the network or the repo's `.local-data`**. Drive `handlePortfolio(req, res)` with `req` = `EventEmitter` + `{ method, url, headers }` emitting body chunks on `setImmediate`, `res` = `{ writeHead(s, h), end(b) }`. Assert:
  - `S.server.listening === false` after require.
  - Supabase path (set `SUPABASE_URL="https://sb.test"`, key `"k"` per test): GET `?doc=journal` → fetch URL contains `id=eq.decision_journal_main`; GET no doc → `id=eq.main`; PUT `?doc=journal` valid doc without `quarters` → 200 and POST body `[0].id === "decision_journal_main"` with the same data; PUT `?doc=journal` with a portfolio-shaped blob (`quarters`, no `v`) → 400, no fetch; PUT invalid journal → 400 `"Refusing to save: journal data is malformed."`, no fetch; `?doc=nope` → 400 `"Unknown doc."`, no fetch; wrong password → 401, no fetch.
  - Local-fallback path (clear `SUPABASE_URL`/key): GET journal with no file → `{ data: null, mode: "local-fallback" }`; PUT journal → writes `<LOCAL_DATA_DIR>/decision-journal.json` and does **not** create `portfolio.json`; GET journal returns the saved doc; GET without doc does not return the journal; unknown doc → 400 and no file written.
  - UTF-8: `getRequestBody` given one 85 KB Thai JSON split into two Buffers in the middle of a 3-byte character returns an object deep-equal to the original and containing no `�`.
  - Oversize: a PUT body of 1,000,001 bytes → `writeHead(413)` and JSON `{ error: "Request body is too large." }`, no fetch, `end` called.
- `scripts/journal-api-test.js`: size tests in bytes — a doc padded with ASCII to exactly `JOURNAL_MAX_BYTES` bytes is valid, `+1` byte invalid; a Thai doc whose `JSON.stringify(...).length` is under 900,000 characters but whose UTF-8 size is over 900,000 bytes is invalid; `journalItemProblems` matrix: `null` → `["not-object"]`, `[]` → `["not-object"]`, `{}` → `["id","date","symbol"]`, `{id:"e_1",date:"2026-02-30",symbol:"NVDA"}` → `["date"]`, `{id:"e_1",date:"2026-10-25",symbol:"  "}` → `["symbol"]`, valid → `[]`.

**7b-B (engine)** — Files: `public/decision-journal-engine.js`, `scripts/decision-journal-test.js`. Each change gets hand-computed tests (arithmetic in a comment); tests that pinned the old behaviour are updated, never deleted, and the reason is written next to them.

1. **Touch & bounce** = spec §3 (ก)(ข)(ค): band `sma[t]×0.98 <= low[t] <= sma[t]×1.02`; `belowStreakBeforeAsOf` = consecutive closes below SMA200 ending at `asOf−1` must be `< CONFIRM_BARS`; as-of close `> sma200` and `> close[t]`. Report the deepest qualifying touch. Export `TOUCH_BAND_PCT = 2` (unchanged) and use it for both sides. Tests (insulate fixtures with 5 bars whose lows sit above the band, as the existing touch tests do):
   - 200 closes at 100, then 99/99 (lows 98.5) then as-of 101 → streak before as-of = 2 → `met false`, `r2.buy false` (SMA at the three bars 99.995 / 99.99 / 99.995).
   - 200 at 100, 5 insulating bars at 103 (low 103), then one close 99 low 98.5, then as-of 101 → `met true`, `touchDate` = the 99 bar, `r2.buy true`.
   - 200 at 100, 5 insulating bars at 103, crash close 79 low 78, as-of 104 → low 78 below `99.97×0.98 = 97.97` → `met false`.
   - as-of close above the touch close but `<= sma200` → `met false` (pins the first half of (ค), which a reviewer mutant showed was unprotected).
2. **Outcomes pending until the target bar has closed**: `H.status = "pending"` while `cutoff === null || target > cutoff` (cutoff = `closedBarCutoff(marketOf(symbol), now)`). `no-data` horizons have `date/close/pct = null`. Update the three tests that pinned provisional scoring (US entry 2026-10-17 at `2026-10-25T02:00`; TH entry at `2026-10-23T10:00`) to expect `pending`. New tests: US entry 2026-10-16 (+7 → 2026-10-23): `2026-10-24T04:59` → pending, `2026-10-24T05:00` → scored with the 2026-10-23 bar; TH entry 2026-10-16: `2026-10-23T16:59` → pending, `17:00` → scored; Saturday target (entry 2026-09-05 → 2026-09-12) for US at `2026-09-13T06:00` → scored with the Friday 2026-09-11 close.
3. **`EPS_PCT = 1e-9`** (exported): `dipMet = dd1yPct <= DIP_PCT + EPS_PCT`; flat when `Math.abs(pct) <= FLAT_BAND_PCT + EPS_PCT`; `priceBasisChanged` when `> BASIS_TOLERANCE_PCT + EPS_PCT`. Tests: high 100.05 → close 80.04 → `dipMet true`; 13 → 13.13 → `predicted "flat"`, `actionResult "flat"`.
4. **`toNum`**: whitespace-only strings → `null`. Bars with `low <= 0` or missing low use `close` for the touch test. Tests: trade price `" "` → skipped with the invalid-trade warning; bar low `" "` and `0` both behave as low = close.
5. **Blocked states**: `parseNow` accepts only `YYYY-MM-DDTHH:mm` with optional `:ss` and optional `+07:00` (rejects `Z`, other offsets, a space instead of `T`); `evaluateRules` returns `blocked: "bad-input"` (ok false) when `parseNow` fails or `opts.date` is not a calendar-valid `YYYY-MM-DD`, and `blocked: "future"` (ok false) when `opts.date > now.ymd`; `"no-bars"` is only for a valid request with zero usable bars. `isYmd` also rejects impossible dates (`2026-02-30`). Tests for each, plus the spec §9 case: as-of 8 days before the record date → `blocked "stale"`; 7 days → `ok true`.
6. **FIFO**: order `(date, buys before sells on the same date, createdAt, input index)`; one currency per symbol = the first valid trade's currency (`trade.currency` if set, else `currencyOf(symbol)`); a trade in another currency is skipped with `"<SYM>: สกุลเงินไม่ตรงกับไม้ก่อนหน้า ไม่ได้นำมาคิด (ไม้ <date>)"`; `fee < 0` → invalid trade (skipped, warned); oversell sell-fee pro-rated by `matchedQty / qty`; invalid-trade copy becomes `"ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง ไม่ได้นำมาคิด"`; fix the `QTY_EPS` comment to cite `0.0157 − 0.0057 − 0.01 ≈ −1.7e-18`. `buyBack` treats a buy on the same date as the sell as a buy-back only when its `createdAt` is later. Tests: THB buy NVDA 1 @3500 + USD sell 1 @110 → sell skipped with the currency warning, no realized row, `totals.USD` absent; fee −50 → skipped + warning; hold 5 @100 then sell 20 @110 fee 20 → matched 5, `pnl = 50 − 20×5/20 = 45`, oversell; same date 2026-03-01 sell 10 @110 (created first) and buy 10 @100 (created second) → realized +100, no oversell, no open lot.
7. **Stats**: every `S` gets `rightN`, `wrongN`, `judgedN` (`judgedN = right + wrong + flat`, own horizon scored only); entries with `deletedAt` are ignored. With the existing 5-row stats fixture: against → `rightN 0, wrongN 3, judgedN 3`; per-rule → `rightN 1, judgedN 1`; fear → `wrongN 3, judgedN 3`; calm → `rightN 1, judgedN 1`; regret → `wrongN 1, judgedN 1`; adding a tombstoned copy of row d changes nothing.
8. **Client-side mirror of the server rules**: export `itemProblems(item) -> string[]` with exactly the codes/order of `journalItemProblems` (above), `MAX_DOC_BYTES = 900000`, and `docBytes(doc) -> number` (UTF-8 byte length of `JSON.stringify(doc)` computed in ES5, surrogate pairs = 4 bytes). Tests: `"abc"`-only doc vs `Buffer.byteLength`, a doc with `"ก"` and `"😀"` equals `Buffer.byteLength(JSON.stringify(doc), "utf8")`; the same `itemProblems` matrix as 7b-A.
9. **Boundary tests** for `closedBarCutoff`: TH `16:59 → D−1`, `17:00 → D`; US `04:59 → D−2`, `05:00 → D−1`; CRYPTO `06:59 → D−2`, `07:00 → D−1`; weekend record date with a fixture that ends on a Friday and a record dated the following Sunday.

**7b-join** — after both tracks are approved: in `scripts/journal-api-test.js` require the engine and assert `E.itemProblems(x)` deep-equals `V.journalItemProblems(x)` over a ≥ 12-case matrix (including tombstoned items, numbers as ids, `"2026-13-01"`, `"2024-02-29"` valid, `"2026-02-29"` invalid), `E.MAX_DOC_BYTES === V.JOURNAL_MAX_BYTES`, and `E.docBytes(doc) === Buffer.byteLength(JSON.stringify(doc), "utf8")` on a mixed Thai/emoji doc.

**7b-bands** — added 2026-10-26 after 7b-A/7b-B/7b-join were approved. The user answered the two open questions: *"ถ้าแตะ แล้วเด้ง หรือ เข้าไปใกล้ๆแล้วเด้ง ใช้ได้หมด 3% ได้เลย"* and *"ขยับ +-2% ถือว่า ทรงๆตัว"*. Files: `public/decision-journal-engine.js`, `scripts/decision-journal-test.js` (and `scripts/journal-api-test.js` only if something there depends on the bands).

- `TOUCH_BAND_PCT = 3` → band `sma[t] × 0.97 <= low[t] <= sma[t] × 1.03` (both sides from the one constant, as now). "Near then bounce" (the low stays above the line but within 3%) counts the same as a touch. The confirmed-break guard (ข) and condition (ค) are unchanged. Verdict/why copy for this rule reads `แตะหรือเข้าใกล้ SMA200 (±3%) แล้วเด้ง`, with the number taken from the constant.
- `FLAT_BAND_PCT = 2` → `|pct| <= 2 (+EPS_PCT)` is `flat` for both `predicted` and `actionResult`; `up` is right only above +2, `down` only below −2.
- Every fixture/assertion whose arithmetic depends on the old 2% touch band or the old 1% flat band is **recomputed and updated, not deleted**, with the new arithmetic in a comment and the test name updated (e.g. "+1.0% exactly → flat" becomes "+2.0% exactly → flat", "+1.01% → right" becomes "+2.01% → right"; a +1.5% move that used to be right/good is now flat — add that as its own test). Insulating bars in touch fixtures must now sit above `SMA × 1.03` (103 is no longer enough when the SMA is ≈ 100; use ≥ 104.5) — recheck every touch fixture.
- New tests: (1) near-from-above: lows stay above the line but come within 3% (e.g. SMA ≈ 100.17, low 102.5 ≤ 103.17), as-of closes above the line and above that bar's close → `met true`; (2) dip 2.9% below the line then bounce → `met true`; (3) dip 3.5% below → `met false` (insulated); (4) band edges inclusive: `_internal.touchBounce` with `low = sma × 1.03` and `low = sma × 0.97` are touches; (5) EPS at the new flat edge: find a price pair for which **the engine's own pct formula** is not exact at +2% (print the float value in a comment, e.g. found by a small search script) and assert it is `flat`; (6) `+2.01%` → `predicted "right"`, `actionResult "good"` for an up/buy entry; `−2.01%` → `"right"`/`"good"` for a down/sell entry.
- Spec §3 and §5.4 already describe the new numbers. Run all three suites green at the end.

**Page tasks pick up these contracts:** Task 9 must also show `blocked "future"` (`วันที่บันทึกอยู่ในอนาคต`) and `"bad-input"` with save disabled, refuse a symbol whose canonical form is empty (`สัญลักษณ์ต้องเป็นตัวอักษรภาษาอังกฤษ เช่น PTT.BK`, no fetch), run `itemProblems` on new items before PUT, and treat 400/413/500/network failure as "draft kept, not saved" (tests for 413 and a rejected fetch). Task 10 renders horizons from `H.status` only. Task 13 warns when `docBytes(doc) >= 0.8 × MAX_DOC_BYTES` (`พื้นที่บันทึกใช้ไปแล้ว x%`) and the method text explains the ±`FLAT_BAND_PCT`% flat band (= ±2% after 7b-bands; built from the constant, never typed) for both "คาดถูก/ผิด" and "ผลของ action".

---

### Task 8: Page skeleton — HTML, CSS, nav, rewrite, privacy event, boot

**Files:**
- Create: `public/decision-journal.html`, `public/decision-journal.css`, `public/decision-journal-page.js`
- Modify: `public/app-navigation.js:514-517` (SIDEBAR Portfolio group) and `:540-556` (PAGE_META)
- Modify: `vercel.json` (insert before the catch-all at the end)
- Modify: `public/privacy.js` (`lock()` / `doUnlock()` dispatch event; see `:108-115`)
- Modify: every `public/*.html` referencing `app-navigation.js?v=20261012-nav-25` → `20261025-nav-26` and `privacy.js?v=20260728-pv-1` → `20261025-pv-2` (18 files each; use a Write-tool script, not sed with regex)
- Test: `scripts/decision-journal-view-test.js` (new; later tasks append)

**Interfaces:**
- Produces: `window.DecisionJournalPage = { render, load(force) -> Promise, _state, _nowBangkok() }`. `_state = { doc, holdings: [], symbols: [], form: {...}, preview: null, outcomesById: {}, pricesBySymbol: {}, syncState: "idle"|"loading"|"saving"|"saved"|"draft"|"error", syncNote: string|null, draft: null, filters: {}, locked: boolean, loadError: string|null }`.
- HTML: head identical to `public/thai-dr-monitor.html:1-17` with title `Decision Journal · AI Investment Mission Control`, page CSS `/decision-journal.css?v=20261025-dj-1`, and (after privacy.js) nothing else. Body: `<main id="djRoot" class="dj-page"><div class="dj-empty"><strong>กำลังโหลด Decision Journal…</strong></div></main>` then scripts in this exact order: `/technical-indicators.js?v=20260617-action-priority`, `/decision-journal-engine.js?v=20261025-dj-1`, `/decision-journal-page.js?v=20261025-dj-1`, `/app-navigation.js?v=20261025-nav-26`.
- Render order inside `#djRoot` (section ids): `djSummary`, `djReview`, `djNew`, `djLog`, `djTrades`, `djStats`, `djMethod`. No page-level hero (shell hero from PAGE_META).
- Nav: SIDEBAR Portfolio group gets `{ p: "/decision-journal", i: "📓", t: "Decision Journal" }` as its first item; PAGE_META `"/decision-journal": { category: "Portfolio", title: "📓 Decision Journal", subtitle: "บันทึกสิ่งที่คิดตอนตัดสินใจ — กฎบอกว่าอะไร · ทำจริงอะไร · ผ่านไปแล้วถูกหรือผิด · ไม้จริงกำไรหรือขาดทุน" }`.
- `privacy.js`: after `locked = true` in `lock()` and after `locked = false` in `doUnlock()`, add `try { document.dispatchEvent(new CustomEvent("portfolio-privacy-changed", { detail: { locked: locked } })); } catch (e) {}`.
- `_nowBangkok()` returns `"YYYY-MM-DDTHH:mm"` from the real clock using `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", ... })` with a fallback to UTC+7 arithmetic; it is the only clock access in the page and is injectable via `_state.nowOverride` for tests.

- [ ] **Step 1: Write the failing view test** `scripts/decision-journal-view-test.js`

Clone the harness from `scripts/thai-dr-monitor-view-test.js:95-255` (mkEl, collectAttr/fakeNodes keyed on `data-dj-*`, `els` by id, `handlers`, `clickAttr/changeAttr`, `store`, `fetch` router, `SKIP` list, scripts read from `public/decision-journal.html`, `flush()`, watchdog, `finish()`). Additions: `win.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; }`, `doc.dispatchEvent`/`doc.addEventListener` that store listeners by type in `docListeners` and let the test fire `fireDoc("portfolio-privacy-changed")`, `win.PortfolioPrivacy = { isLocked: function () { return privacyLocked; } }` (test toggles `privacyLocked`), `win.sessionStorage` same shape as localStorage, `win.Intl` present. Fetch router (record every call in `fetchCalls` with `{url, method, body}`):
  - `/api/portfolio?doc=journal` GET → `{ data: JOURNAL }` (fixture: 2 entries + 2 trades defined in the test; `JOURNAL` may be replaced per test); PUT → push body, respond `{ ok: true }` unless `failPut`.
  - `/api/portfolio-holdings` → `{ data: [{ canonicalSymbol: "NVDA", isHolding: true }, { canonicalSymbol: "PTT.BK", isHolding: true }, { canonicalSymbol: "K-GTECHRMF", isHolding: true }] }` (check the real field names in `api/portfolio-holdings.js:117-136` and match them).
  - `/api/ohlc?symbol=X&...` → `{ bars: BARS[X] || [] , sourceType: "LIVE" }` where `BARS.NVDA` = 260 weekday bars built with the same `mkBars` helper as the engine test (ending 2026-10-23, flat 100 then last 8 rising), `BARS["BTC-USD"]` similar, `BARS["K-GTECHRMF"]` = `[]`.
  Time: before boot set `win.__DJ_NOW = "2026-10-25T12:00"` and have the page use it when present (`_nowBangkok()` checks `window.__DJ_NOW` first).

Boot assertions:
```js
t("boots", bootOk);
t("scripts from HTML: technical-indicators → engine → page", HTML_SCRIPTS.join() === "technical-indicators.js,decision-journal-engine.js,decision-journal-page.js");
t("globals", !!win.DecisionJournal && !!win.DecisionJournalPage && !!win.AITechnicalIndicators);
// after load(false):
t("GET journal doc on load", fetchCalls.some(function (c) { return /\/api\/portfolio\?doc=journal/.test(c.url) && c.method === "GET"; }));
var order = ["djSummary", "djReview", "djNew", "djLog", "djTrades", "djStats", "djMethod"].map(function (id) { return html().indexOf('id="' + id + '"'); });
t("sections in decision-first order", order.every(function (p, i) { return p >= 0 && (i === 0 || p > order[i - 1]); }), order);
t("no page hero (shell hero only)", html().indexOf("dj-hero") < 0 && html().indexOf("mc-page-hero") < 0);
t("disclaimer present", html().indexOf("ไม่ใช่คำแนะนำการลงทุน") >= 0);
t("no NaN/undefined", !/(NaN|undefined|Infinity|\[object )/.test(html()));
t("no advisory wording", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(html()) && !/\b(Buy|Sell)\b/.test(html()));
t("page is ES5", esFive(pageSrc) && esFive(cssFreeEngineSrc));   // same regex as the engine hygiene test
```

Also assert, by reading files: `public/app-navigation.js` contains `"/decision-journal"` in both SIDEBAR and PAGE_META; `vercel.json` has the rewrite **before** the catch-all; `public/privacy.js` contains `portfolio-privacy-changed`; every HTML that references `app-navigation.js` uses `20261025-nav-26` and every one that references `privacy.js` uses `20261025-pv-2`.

- [ ] **Step 2: Run to verify it fails** — `node scripts/decision-journal-view-test.js` → cannot read `public/decision-journal.html`.

- [ ] **Step 3: Create the HTML, CSS, page skeleton, nav/rewrite/privacy edits and version bumps**

Page skeleton renders all seven sections with placeholder bodies (`djNew` with the form markup is Task 9's job; here render section shells with headings: `ภาพรวม`, `ถึงกำหนดทบทวน`, `บันทึกใหม่`, `บันทึกทั้งหมด`, `ไม้จริง`, `สถิติ`, `วิธีคิด`). `load(force)` fetches the doc and holdings (holdings failure is non-fatal: `_state.symbols` from entries only), sets `syncState`, renders. CSS: use `--mc-*` tokens; classes prefixed `dj-`; mobile `@media (max-width: 600px)` single column; `.dj-table-wrap { overflow-x: auto }`.

Version bump script (Write tool, e.g. scratchpad `bump-v.js`): for each `public/*.html`, string-replace the two old `?v=` values; print the count per file; expect 18 and 18.

- [ ] **Step 4: Run tests**

`node scripts/decision-journal-view-test.js` → pass. `node scripts/site-integrity-test.js` and `node scripts/nav-shell-test.js` → pass (they auto-discover the new HTML). `node scripts/thai-dr-monitor-view-test.js` and `node scripts/privacy-smoke-test.js` → still pass.
Manual: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/decision-journal` → `200`.

- [ ] **Step 5: Leave changes uncommitted**

---

### Task 9: Page — new-entry form, rule preview, save with merge + draft

**Files:**
- Modify: `public/decision-journal-page.js`, `public/decision-journal.css`
- Test: `scripts/decision-journal-view-test.js` (append `== form/save ==`)

**Interfaces:**
- Consumes: `DecisionJournal.evaluateRules/verdictFor/newId/mergeDocs/touch/canonicalSymbol/providerSymbol/currencyOf/FEELINGS/ACTIONS/DIRECTIONS/HORIZONS`.
- Produces page API: `_previewRules() -> Promise<void>`, `_save() -> Promise<boolean>`, `_fetchBars(symbol, startYmd) -> Promise<{bars, sourceType}>` (cache in `_state.pricesBySymbol[canonical] = { bars, sourceType, at: ymd }` and `localStorage decision_journal_ohlc_v1` keyed by canonical with Bangkok `ymd`; `/api/ohlc?symbol=<provider>&start=<ymd>&_ts=<ms>`), `_putDoc(doc) -> Promise<boolean>` (GET fresh `?doc=journal` → `mergeDocs(server, doc)` → PUT; on failure write `localStorage decision_journal_draft_v1 = { doc, savedAt }` and set `syncState: "draft"`, `syncNote: "ยังไม่ถึงเซิร์ฟเวอร์ — เก็บร่างไว้ในเครื่องนี้ จะลองส่งใหม่เมื่อเปิดหน้า"`), `_readDraft()`, `_clearDraft()`.
- Form element ids (page reads them with `document.getElementById`): `djSymbol` (input, `list="djSymbols"`), `djDate`, `djEvent` (textarea), feelings as `<button type="button" data-dj-feel="<key>" class="dj-chip[ is-on]">`, `djDirection` (select up/down/unsure), `djHorizon` (select 7/30/90), `djAction` (select buy/sell/hold/none), `djConviction` (checkbox, shown only when action = buy), `djPlan` (textarea), `djWithTrade` (checkbox) revealing `djQty`, `djPrice`, `djFee`, `djCurrency`; buttons `data-dj-preview` and `data-dj-save` (the save button has `disabled` until a preview succeeded for the current symbol+date). Preview panel id `djRulePanel` shows: `ใช้ราคาปิด <asOfBar>` (+ `แท่งวันนี้ยังไม่ปิด จึงไม่ใช้` when `partialBarDropped`), 3 rule rows (กฎ 1/2/3 with state text and `สนับสนุน ซื้อ/ขาย` chips), the verdict pill (`ตามกฎ` green / `แหกกฎ` red / `ตัดสินไม่ได้` grey / `ไม่เกี่ยว` for hold/none) and `why`. Blocked (`stale`) → panel shows `ราคายังไม่มาถึงวันที่บันทึก (ล่าสุด <asOfBar>)` and save stays disabled. `no-bars` → panel shows `ไม่มีราคาย้อนหลังพอ ตัดสินกฎไม่ได้` and save is **enabled** (`unknown`).
- Saved entry = §5.1 shape with `createdAt/updatedAt = new Date().toISOString()` (the page's clock), `rules` = preview rules (minus `ok/blocked`), `verdict`, `review: { reviewedAt: null, selfVerdict: null, lesson: "" }`; if `djWithTrade`, a `Trade` with `entryId` and the entry's `action.tradeIds = [trade.id]`. After a successful save: form reset, `syncState: "saved"`, `syncNote: "บันทึกบนเซิร์ฟเวอร์แล้ว"`.

- [ ] **Step 1: Write the failing tests**

```js
console.log("== form/save ==");
t("form fields present with datalist from holdings", /id="djSymbol"[^>]*list="djSymbols"/.test(html()) && /<option value="NVDA">/.test(html()) && /<option value="PTT\.BK">/.test(html()));
t("feelings chips rendered from engine list", countOf(/data-dj-feel="/g) === 8);
t("save disabled before preview", /data-dj-save[^>]*disabled/.test(html()));
setVal("djSymbol", "nvda"); setVal("djDate", "2026-10-24"); setVal("djEvent", "ข่าวร้าย ตลาดลง"); clickAttr("data-dj-feel", "fear");
setVal("djDirection", "down"); setVal("djHorizon", "30"); setVal("djAction", "sell");
return P._previewRules().then(function () {
  t("fetched /api/ohlc for NVDA with start ~2 years back", fetchCalls.some(function (c) { return /\/api\/ohlc\?symbol=NVDA&start=2024-10-2/.test(c.url); }));
  t("panel shows as-of bar and three rules", /ใช้ราคาปิด 2026-10-23/.test(html()) && /กฎ 1/.test(html()) && /กฎ 2/.test(html()) && /กฎ 3/.test(html()));
  t("user case → แหกกฎ with why", /แหกกฎ/.test(html()) && /EMA12 ยังเหนือ EMA26/.test(html()));
  t("save enabled after preview", !/data-dj-save[^>]*disabled/.test(html()));
  return P._save();
}).then(function (ok) {
  var put = fetchCalls.filter(function (c) { return c.method === "PUT"; })[0];
  t("PUT to ?doc=journal", ok === true && put && /\?doc=journal/.test(put.url));
  var body = JSON.parse(put.body).data;
  var e = body.entries[0];
  t("merged doc keeps fixture entries + new one", body.entries.length === 3 && body.trades.length === 2);
  t("new entry frozen fields", e.symbol === "NVDA" && e.date === "2026-10-24" && e.context.feelings.join() === "fear" && e.view.direction === "down" && e.view.horizonDays === 30 && e.action.kind === "sell" && e.rules.version === "dj-rules-1" && e.rules.asOfBar === "2026-10-23" && e.verdict.compliance === "against" && e.review.reviewedAt === null);
  t("sync note says saved on server", /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
  t("form reset after save", getVal("djEvent") === "" && /data-dj-save[^>]*disabled/.test(html()));
});
// 0-bar symbol
setVal("djSymbol", "K-GTECHRMF"); setVal("djDate", "2026-10-24"); setVal("djAction", "buy");
P._previewRules().then(function () {
  t("0 bars → unknown notice and save enabled", /ไม่มีราคาย้อนหลังพอ/.test(html()) && !/data-dj-save[^>]*disabled/.test(html()));
});
// stale
BARS.STALE = mkBars("2025-01-06", rep(100, 260)).slice(0, 200);   // ends long before 2026-10-24
setVal("djSymbol", "STALE"); P._previewRules().then(function () { t("stale → blocked, save disabled", /ราคายังไม่มาถึงวันที่บันทึก/.test(html()) && /data-dj-save[^>]*disabled/.test(html())); });
// failed PUT → draft
failPut = true; (fill form again, preview, save) → t("PUT fails → draft kept, honest note", ok === false && store.decision_journal_draft_v1 && /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()) && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
// draft retried on next load
failPut = false; fetchCalls.length = 0; P.load(true).then(...) → t("draft re-sent on load and cleared", fetchCalls.some(c => c.method === "PUT") && !store.decision_journal_draft_v1);
```
(`setVal(id, v)` sets `els[id].value`; `getVal(id)`; feelings chips are `[data-dj-feel]` buttons toggled by click.)

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement the form, preview, save, draft, and price fetch.** The page never computes rules itself; it only calls the engine with `nowBangkok = _nowBangkok()`.
- [ ] **Step 4: Run tests** → pass (view + engine + site-integrity).
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 10: Page — timeline log, filters, outcomes, delete

**Files:**
- Modify: `public/decision-journal-page.js`, `public/decision-journal.css`
- Test: `scripts/decision-journal-view-test.js` (append `== log ==`)

**Interfaces:**
- Consumes: `outcomes`, `liveEntries`, `tombstone`, `buyBack`, `FEELINGS`.
- Produces: `_loadOutcomes() -> Promise<void>` (for each distinct live symbol fetch bars from `min(entry.date) − 7 days` via `_fetchBars`, max 4 concurrent using `window.mapWithConcurrency` when present else a simple pool, then `_state.outcomesById[id] = outcomes(entry, bars, nowBangkok)`), `_deleteEntry(id) -> Promise<boolean>` (tombstone + `_putDoc`), `_setFilter(key, value)`.
- Log card markup: `<article class="dj-card" data-dj-entry="<id>">` with: date · symbol · action chip (`ซื้อ/ขาย/ถือต่อ/ไม่ทำอะไร`) · compliance pill (`ตามกฎ`/`แหกกฎ`/`ตัดสินไม่ได้`/`ไม่เกี่ยว`) · `กฎบอกว่า:` three chips (`กฎ 1 bull/bear`, `กฎ 2 above/below + หลุด/ยืน/เด้ง`, `กฎ 3 −x.x%`) · `คาดว่า <ขึ้น/ลง/ไม่แน่ใจ> ใน <7 วัน/1 เดือน/3 เดือน>` · event text · feelings chips · outcome row `+7 <pct> · +30 <pct> · +90 <pct>` with `รอ` for pending and `—` for no-data, the own-horizon cell marked `is-due` and the predicted result (`คาดถูก`/`คาดผิด`/`ทรงตัว`) · `priceBasisChanged` note `ราคาย้อนหลังถูกปรับ (เช่น แตกพาร์) เทียบจากชุดราคาปัจจุบัน` · buy-back line when applicable · lesson (if reviewed) · `<button data-dj-del="<id>">ลบ</button>` with a confirm step (`data-dj-del-confirm`).
- Filters: `<select data-dj-filter="symbol|feeling|compliance|action">` wired on `change`.

- [ ] **Step 1: Write the failing tests** — fixture has entry `e_fix1` (NVDA, 2026-09-01, sell, against, feelings fear, horizon 7, rules.asOfBar 2026-08-31 close 100) and `e_fix2` (PTT.BK, 2026-10-20, buy, per-rule, horizon 90). `BARS.NVDA` includes 2026-08-31 close 100 and 2026-09-08 close 103.
```js
return P._loadOutcomes().then(function () {
  t("cards rendered for live entries", countOf(/data-dj-entry="/g) === 2);
  t("e_fix1 shows +7 = +3.0% and คาดผิด (predicted down, price up)", /\+3\.0%/.test(cardOf("e_fix1")) && /คาดผิด/.test(cardOf("e_fix1")));
  t("e_fix2 +90 pending shows รอ", /รอ/.test(cardOf("e_fix2")));
  t("compliance pills", /แหกกฎ/.test(cardOf("e_fix1")) && /ตามกฎ/.test(cardOf("e_fix2")));
  t("filter by symbol hides others", (changeAttr("data-dj-filter", "symbol", "PTT.BK"), countOf(/data-dj-entry="/g) === 1));
  changeAttr("data-dj-filter", "symbol", "");
  t("delete requires confirm then tombstones and PUTs", (function () { clickAttr("data-dj-del", "e_fix1"); var confirmShown = /data-dj-del-confirm="e_fix1"/.test(html()); clickAttr("data-dj-del-confirm", "e_fix1"); return confirmShown; })());
  return flush();
}).then(function () {
  var put = lastPut(); var e1 = put.entries.filter(function (x) { return x.id === "e_fix1"; })[0];
  t("deleted entry kept as tombstone in PUT, hidden from log", !!e1.deletedAt && countOf(/data-dj-entry="/g) === 1);
  t("ohlc fetched at most once per symbol with concurrency pool", fetchCalls.filter(function (c) { return /\/api\/ohlc\?symbol=NVDA/.test(c.url); }).length === 1);
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 11: Page — review queue

**Files:**
- Modify: `public/decision-journal-page.js`, `public/decision-journal.css`
- Test: `scripts/decision-journal-view-test.js` (append `== review ==`)

**Interfaces:**
- Consumes: `reviewDue`, `touch`.
- Produces: `_saveReview(id, { selfVerdict, lesson }) -> Promise<boolean>`; section `djReview` lists due entries (hidden with `dj-hidden` class when none) as `<article data-dj-review="<id>">` showing what was thought, `กฎบอกว่า`, `ราคาตอนนั้น <refClose> → ที่กำหนด <close> (<pct>)`, auto result (`คาดถูก/คาดผิด/ทรงตัว`), a `<textarea id="djLesson-<id>">`, three buttons `data-dj-review-verdict="<id>:right|wrong|mixed"` and `data-dj-review-save="<id>"`. Summary strip counts `รอทบทวน N`.

- [ ] **Step 1: Write the failing tests** — with fixture time `2026-10-25T12:00`, `e_fix1` (horizon 7 from 2026-09-01) is due; `e_fix2` (horizon 90 from 2026-10-20) is not. (Note: Task 10 tombstoned `e_fix1`; reset the doc fixture at the start of this section by calling `P.load(true)` with a fresh `JOURNAL`.)
```js
t("review queue lists only due entries", countOf(/data-dj-review="/g) === 1 && /data-dj-review="e_fix1"/.test(html()));
t("summary says รอทบทวน 1", /รอทบทวน<\/[^>]+>\s*<[^>]+>1/.test(html()) || /รอทบทวน 1/.test(html()));
setVal("djLesson-e_fix1", "ขายเพราะกลัว แล้วเด้ง"); clickAttr("data-dj-review-verdict", "e_fix1:wrong"); clickAttr("data-dj-review-save", "e_fix1");
return flush().then(function () {
  var e1 = lastPut().entries.filter(function (x) { return x.id === "e_fix1"; })[0];
  t("review saved with stamp, verdict, lesson; frozen fields untouched", e1.review.reviewedAt && e1.review.selfVerdict === "wrong" && e1.review.lesson === "ขายเพราะกลัว แล้วเด้ง" && e1.rules.asOfBar === "2026-08-31" && e1.verdict.compliance === "against");
  t("queue empties and log card shows the lesson", countOf(/data-dj-review="/g) === 0 && /ขายเพราะกลัว แล้วเด้ง/.test(cardOf("e_fix1")));
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 12: Page — trades section and privacy masking

**Files:**
- Modify: `public/decision-journal-page.js`, `public/decision-journal.css`
- Test: `scripts/decision-journal-view-test.js` (append `== trades/privacy ==`)

**Interfaces:**
- Consumes: `fifo`, `liveTrades`, `currencyOf`, `newId`, `tombstone`, `touch`, `closedBarCutoff`.
- Produces: `_addTrade({ date, symbol, side, qty, price, fee, currency, note, entryId }) -> Promise<boolean>`, `_updateTrade(id, patch)`, `_deleteTrade(id)`; `_lastCloses()` builds `{ [symbol]: { close, date, closed } }` from `_state.pricesBySymbol` (closed = `date <= closedBarCutoff(marketOf(symbol), nowBangkok)`); `_money(amount, currency, personal)` → `personal && _state.locked ? "XXX" : formatted` (`฿1,234` / `$1,234.56`; qty formatted up to 8 decimals trimmed). Section `djTrades`: open positions table (`data-dj-open-row="<symbol>"`), all trades table (`data-dj-trade="<id>"`, edit button `data-dj-trade-edit`, delete with confirm `data-dj-trade-del` / `data-dj-trade-del-confirm`), add form ids `djTDate djTSymbol djTSide djTQty djTPrice djTFee djTCurrency djTNote djTEntry` + `data-dj-trade-add`; warnings from `fifo().warnings` rendered in `.dj-warn`. Privacy: page sets `_state.locked = PortfolioPrivacy.isLocked()` on render and re-renders on `document` event `portfolio-privacy-changed`.

- [ ] **Step 1: Write the failing tests** — fixture trades: `t_fix1` NVDA buy 10 @100 (2026-01-05), `t_fix2` NVDA sell 4 @130 (2026-03-01).
```js
t("open position NVDA 6 @100 with floating vs last close", /data-dj-open-row="NVDA"/.test(html()) && /\b6\b/.test(openRow("NVDA")));
t("realized pnl for the sell = +120", /\+\$120/.test(tradeRow("t_fix2")));
setVal("djTDate", "2026-10-01"); setVal("djTSymbol", "btc"); setVal("djTSide", "buy"); setVal("djTQty", "0.0123"); setVal("djTPrice", "80000"); setVal("djTFee", "2"); clickAttr("data-dj-trade-add", "1");
return flush().then(function () {
  var tr = lastPut().trades.filter(function (x) { return x.symbol === "BTCUSD"; })[0];
  t("trade saved canonical symbol, decimals kept, USD", tr && tr.qty === 0.0123 && tr.currency === "USD" && tr.fee === 2);
  privacyLocked = true; fireDoc("portfolio-privacy-changed");
  t("locked: personal amounts XXX, market price still visible", /XXX/.test(openRow("NVDA")) && !/\$120/.test(tradeRow("t_fix2")) && /100\.00|\$100/.test(html()));
  t("no money in title attributes", !/title="[^"]*[฿$]\s?[\d,]/.test(html()));
  privacyLocked = false; fireDoc("portfolio-privacy-changed");
  t("unlocked again shows amounts", /\+\$120/.test(tradeRow("t_fix2")));
  clickAttr("data-dj-trade-del", "t_fix2"); clickAttr("data-dj-trade-del-confirm", "t_fix2"); return flush();
}).then(function () { t("deleted trade tombstoned and open qty back to 10", lastPut().trades.filter(function (x) { return x.id === "t_fix2"; })[0].deletedAt && /\b10\b/.test(openRow("NVDA"))); });
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 13: Page — summary strip, stats, method, export/import

**Files:**
- Modify: `public/decision-journal-page.js`, `public/decision-journal.css`
- Test: `scripts/decision-journal-view-test.js` (append `== stats/method/export ==`)

**Interfaces:**
- Consumes: `stats`, `reviewDue`, `fifo`, `mergeDocs`, `HORIZONS`, `DIP_PCT`, `TOUCH_BAND_PCT`, `CONFIRM_BARS`, `MIN_STAT_N`.
- Produces: `_exportPayload() -> { v: 1, exportedAt, doc }`, `_importPayload(obj) -> Promise<boolean>` (validates `obj.doc` shape loosely, merges by id via `mergeDocs`, PUTs), buttons `data-dj-export` / file input `data-dj-import`. `djSummary` tiles: `รอทบทวน`, `ตามกฎ x / y` (entries with compliance per-rule or against), `คาดถูก a / b` (judged), `ไม้เปิดอยู่ n`, `กำไร/ขาดทุนรับรู้` per currency (personal → masked), sync status text. `djStats`: three tables from `stats()`; any `enough === false` row shows `ยังน้อยเกินสรุป` instead of averages. `djMethod` `<details>`: rule definitions in Thai with the exported constants interpolated (`หลุด SMA200 ติดต่อกัน ≥ 2 วัน`, `แตะหรือเข้าใกล้เส้น ±3%` from `TOUCH_BAND_PCT` — was "แตะไม่เกิน 2%" before 7b-bands, `ย่อ ≥ 20% จากจุดสูงสุด 1 ปี`), as-of bar rule, FIFO, split note (`ถ้ามีการแตกพาร์ ให้แก้จำนวน/ราคาไม้เองตามโบรกเกอร์`), and `ไม่ใช่คำแนะนำการลงทุน`.

- [ ] **Step 1: Write the failing tests**
```js
t("summary tiles", /รอทบทวน/.test(sec("djSummary")) && /ตามกฎ/.test(sec("djSummary")) && /คาดถูก/.test(sec("djSummary")) && /ไม้เปิดอยู่/.test(sec("djSummary")));
t("stats shows ยังน้อยเกินสรุป when n < 3", /ยังน้อยเกินสรุป/.test(sec("djStats")));
t("method shows constants, not hardcoded copies", /≥ 2 วัน/.test(sec("djMethod")) && /2%/.test(sec("djMethod")) && /20%/.test(sec("djMethod")) && /แตกพาร์/.test(sec("djMethod")));
var payload = P._exportPayload();
t("export payload has doc with entries and trades", payload.v === 1 && payload.doc && payload.doc.entries.length >= 1 && E.isYmd(payload.exportedAt.slice(0, 10)));
return P._importPayload({ v: 1, doc: { v: 1, entries: [{ id: "e_imp", date: "2026-10-01", symbol: "AMD", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", context: { feelings: [] }, view: { direction: "up", horizonDays: 7 }, action: { kind: "none" }, rules: {}, verdict: { compliance: "n/a" }, review: {} }], trades: [] } }).then(function (ok) {
  t("import merges by id and PUTs", ok && lastPut().entries.some(function (x) { return x.id === "e_imp"; }));
  return P._importPayload({ nope: 1 });
}).then(function (ok) { t("bad import rejected without PUT", ok === false); });
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests** → pass.
- [ ] **Step 5: Leave changes uncommitted**

---

### Task 14: Mutation tests, full regression, headless probe, memory

**Files:**
- Create (scratchpad only, not in repo): `mut-journal.js`, `probe-journal.js` under the session scratchpad directory
- Modify: `C:\Users\mtl87429\.claude\projects\c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard\memory\` (new `decision-journal.md` + `MEMORY.md` index line)

- [ ] **Step 1: Mutation test** — write `mut-journal.js` like the session's `mut-split.js`: for each mutant, patch source via unique-anchor string replace, run `node scripts/decision-journal-test.js` then the view test, restore, print ✓/✗. Required mutants (all must be caught): CONFIRM_BARS 2→1 · touch band 3→5 · touch band 3→2 · DIP_PCT −20→−25 · cutoff US 05→00 · cutoff CRYPTO 07→00 · reclaim max bars 9→99 · remove `partialBarDropped` logic · verdict: `against` when supports empty → `per-rule` · outcomes: `refClose` always frozen · flat band 2→1 · flat band 2→0 · FIFO: LIFO instead of FIFO · fee not subtracted · merge: older wins · tombstone dropped on merge · stats avg without direction flip · page: save enabled before preview · page: PUT without `?doc=journal` · page: `บันทึกบนเซิร์ฟเวอร์แล้ว` shown on failed PUT · page: personal amounts not masked when locked · api: journal PUT validated with `isValidPortfolioData`.
  Expected: every mutant caught; fix tests for any survivor before continuing.

- [ ] **Step 2: Full regression** — run every `scripts/*test*.js` (36 existing + 3 new); all must pass. `node --check` on all changed JS. ES5 grep on the two new public files returns nothing.

- [ ] **Step 3: Headless Chrome probe** (scratchpad `probe-journal.js`, pattern of this session's `probe-gap.js`: CDP `Fetch.enable` on `*/api/*`, synthetic doc/holdings/ohlc fixtures, hide `#portfolio-auth-overlay`): open `http://localhost:4173/decision-journal` at 1440 and 390 px; assert no `Runtime.exceptionThrown`, sections in order, `scrollWidth === clientWidth` on `document.documentElement` at 390, fill the form → preview → save → PUT captured with `?doc=journal`; screenshots of summary+form and the log; read them with the Read tool and fix layout problems found (one bounded fix round).

- [ ] **Step 4: Memory** — write `decision-journal.md` (type: project): rules version `dj-rules-1` and the approved definitions, as-of cutoff table, storage row `decision_journal_main` via `?doc=journal` (mirror in `server.js`), merge-by-id/tombstone, privacy event `portfolio-privacy-changed`, versions used; add the index line to `MEMORY.md`.

- [ ] **Step 5: Report to the user in Thai** — what was built, how it was verified (counts), what to look at (`Ctrl+F5` on `/decision-journal`), known limits (split handling in trades, no FX), and that nothing is committed.

---

## Progress (paused 2026-10-25 ~16:30 Bangkok, user shut down the machine)

- **Done + approved by an independent reviewer:** Tasks 1-7 (server branch, engine). `node scripts/decision-journal-test.js` → 212/212, `node scripts/journal-api-test.js` → 38/38. Nothing committed (HEAD `8c47c8c`).
- **Opus holistic review of tasks 1-7:** NOT approved — 4 major + 10 minor issues, saved in `docs/superpowers/plans/2026-10-25-decision-journal-review-1.md`. Key majors: touch-and-bounce has no lower bound (a bar deep below SMA counts as a "touch", bypassing the 2-close confirmation); `outcomes()` scores a horizon before the target-date bar has closed; `server.js getRequestBody` concatenates raw Buffers (Thai chars split across chunks become U+FFFD); `fifo()` mixes currencies across lots silently.
- **Next step ("consolidate"):** apply those 14 issues + the task-reviewer follow-ups (TH 17:00 / US 05:00 boundary tests; size-cap boundary test; QTY_EPS comment; invalid-trade warning copy; add `rightN`/`judgedN` to every stats bucket per spec §5.6), each with hand-computed tests, then an independent re-review. The interrupted consolidate attempt may have left small edits in `public/decision-journal-engine.js` (tests still green at pause time).
- **Then:** Tasks 8-13 (page) one by one with a reviewer each, then Task 14 (mutation + full regression), then restart the local server, run `probe-journal.js` (scratchpad) at 1440/390 px, update memory, report. All agents on Opus (user request 2026-10-25).
- **Decisions the user may want to revisit (from the review):** touch band lower bound (e.g. low must be ≥ SMA200 × 0.98, or the close before the touch was above the SMA); whether `buy` +0.5% counts as "flat" (plan) or "good" (spec §5.4, no band).
- **2026-10-26 resume:** the user said "รันต่อได้เลย" without answering, so the assistant applied its stated defaults: touch = low within ±2% of SMA200 and no confirmed break (≥ 2 closes below) right before the bounce; ±1% flat band also applies to the action result. Spec §3/§5.2/§5.4/§5.5/§5.6/§6 updated; all review-1 issues turned into **Task 7b** below. Order now: 7b (A ∥ B → join → Opus re-review) → 8-13 → 14.
- **2026-10-26 DONE (uncommitted):** every task 1-14 implemented and approved by an independent reviewer (all agents Opus). Second adversarial review found 2 majors (outcomes scored before the feed delivered the target bar; floating P&L across currencies) + 10 minors → fixed in `7b-cleanup`, approved. Task 14: 47/47 mutants caught; 40/40 suites green. Orchestrator browser check (headless Chrome, synthetic data, 1440 + 390 px) found and fixed: the trade table's screen-reader label stretched the page to 635px on phones (`.dj-table-wrap { position: relative }`), dates splitting mid-token in outcome tiles (`.dj-nw`), the cryptic "ไม้เปิดอยู่" sub-line (now lists symbols), the import copy that promised it never deletes, and the file label not looking disabled while saving — each with view tests and mutants; assets bumped to `20261026-dj-2`. Known and not fixed (pre-existing, site-wide): the shared top bar is ~674px wide on a 390px phone on every page. Known limit: `/api/ohlc` delivers bar D at ~07:00 Bangkok D+1, so a decision saved in the evening uses the previous close (shown on screen).
- **2026-10-26 later:** 7b-A, 7b-B, 7b-join done and approved (suites 289 / 117 / 45 green). The user then answered: touch band **±3%** ("แตะ หรือเข้าใกล้แล้วเด้ง ใช้ได้หมด") and flat band **±2%**. The workflow was stopped during the second adversarial review and resumed with a new **7b-bands** step before that review, so the review sees the final constants.

## Self-review notes

- Spec coverage: §1-§2 → Tasks 8-13 copy/structure; §3 → Task 3; §4 → Task 4; §5.1 → Tasks 7, 9; §5.2 → Tasks 2, 3, 9; §5.3 → Task 3; §5.4 → Task 5, 10; §5.5 → Tasks 6, 12; §5.6 → Tasks 7, 13; §6 → Tasks 1, 9, 13; §7 → Tasks 8-13; §8 → Tasks 1, 8; §9 → every task + Task 14.
- Names used consistently: `evaluateRules`, `verdictFor`, `outcomes`, `reviewDue`, `fifo`, `buyBack`, `stats`, `mergeDocs`, `touch`, `tombstone`, `liveEntries/liveTrades`, `closedBarCutoff`, `asOfBars`, `canonicalSymbol`, `providerSymbol`, `marketOf`, `currencyOf`, `actualAt`; page hooks `_previewRules`, `_save`, `_putDoc`, `_fetchBars`, `_loadOutcomes`, `_deleteEntry`, `_saveReview`, `_addTrade`, `_updateTrade`, `_deleteTrade`, `_exportPayload`, `_importPayload`, `_nowBangkok`.
- Review Focus items 1-5 are pinned in Tasks 3/5, 2/9, 7, 1/9, 6 respectively.
