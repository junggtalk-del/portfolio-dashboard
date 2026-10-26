"use strict";
// ============================================================
// DECISION JOURNAL — เทสต์ชั้นเก็บข้อมูล (?doc=journal)
//   node scripts/journal-api-test.js
//
// สิ่งที่ล็อกไว้ (spec §6):
//   1. isValidJournalDoc ทุกกรณี: v===1, entries/trades array,
//      ทุก item มี id/date(YYYY-MM-DD)/symbol, JSON ไม่เกิน JOURNAL_MAX_BYTES
//      (ไบต์ UTF-8 · section D ล็อกขอบ ±1 ไบต์ และ journalItemProblems)
//   2. api/portfolio.js: ?doc=journal → แถว decision_journal_main,
//      ไม่ใส่ doc → แถว main (พฤติกรรมเดิม), doc อื่น → 400,
//      doc ไม่ผ่าน → 400 และไม่เขียน, รหัสผ่านผิด → 401
//   3. server.js ต้อง mirror branch เดียวกัน (ตรวจเป็นข้อความ
//      เพราะ server.js เริ่ม listen ทันทีที่ require)
// ============================================================
var fs = require("fs");
var path = require("path");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

function finish() {
  var total = pass + fail;
  console.log(total + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

// ---- Section A: validator ----------------------------------
console.log("== A. validator ==");
var V = require("../lib/journal-validation.js");

t("empty doc is valid", V.isValidJournalDoc({ v: 1, entries: [], trades: [] }));
t("v must be 1", !V.isValidJournalDoc({ v: 2, entries: [], trades: [] }));
t("entries must be array", !V.isValidJournalDoc({ v: 1, entries: {}, trades: [] }));
t("entry needs id/date/symbol", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-10-25" }], trades: [] }));
t("bad date rejected", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "25/10/2026", symbol: "NVDA" }], trades: [] }));
t("null/array/string rejected", !V.isValidJournalDoc(null) && !V.isValidJournalDoc([]) && !V.isValidJournalDoc("x"));
// UPDATED 2026-10-26 (Task 7b-A): the cap is now JOURNAL_MAX_BYTES (UTF-8 bytes)
// instead of JOURNAL_MAX_CHARS, which was dropped. Padding by the byte cap keeps
// this test checking what its name says. Exact ±1-byte boundaries: section D.
t("oversize rejected", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA", note: "x".repeat(V.JOURNAL_MAX_BYTES) }], trades: [] }));
t("state id fixed", V.JOURNAL_STATE_ID === "decision_journal_main");
// pinned by Interfaces, beyond the plan's named cases
// UPDATED 2026-10-26 (Task 7b-A): was `JOURNAL_MAX_CHARS === 1500000`; the plan
// replaces it with a 900,000-byte cap and drops the char constant.
t("max bytes fixed (char cap dropped)", V.JOURNAL_MAX_BYTES === 900000 && !("JOURNAL_MAX_CHARS" in V), { bytes: V.JOURNAL_MAX_BYTES, chars: V.JOURNAL_MAX_CHARS });
t("valid entry + trade accepted", V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA" }], trades: [{ id: "t_1", date: "2026-10-25", symbol: "PTT.BK" }] }));
t("trades must be array", !V.isValidJournalDoc({ v: 1, entries: [], trades: "x" }));
t("trade item validated too", !V.isValidJournalDoc({ v: 1, entries: [], trades: [{ id: "t_1", date: "2026-10-25", symbol: "" }] }));
t("empty id rejected", !V.isValidJournalDoc({ v: 1, entries: [{ id: "", date: "2026-10-25", symbol: "NVDA" }], trades: [] }));
t("non-object item rejected", !V.isValidJournalDoc({ v: 1, entries: ["e_1"], trades: [] }) && !V.isValidJournalDoc({ v: 1, entries: [null], trades: [] }));
t("validator never throws (cyclic doc → false)", (function () {
  var cyc = { v: 1, entries: [], trades: [] };
  cyc.self = cyc;
  try { return V.isValidJournalDoc(cyc) === false; } catch (e) { return false; }
})());

// ---- Section B: Vercel handler with fake fetch / req / res ---
console.log("== B. api/portfolio.js handler ==");
process.env.SUPABASE_URL = "https://sb.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.APP_PASSWORD = "pw";
var handler = require("../api/portfolio.js");

var calls = [];
global.fetch = function (url, init) {
  calls.push({ url: String(url), method: (init && init.method) || "GET", body: init && init.body });
  return Promise.resolve({
    ok: true,
    json: function () { return Promise.resolve([{ data: { marker: 1 } }]); },
    text: function () { return Promise.resolve(""); }
  });
};

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    setHeader: function (k, v) { this.headers[k] = v; },
    end: function (s) { this.body = JSON.parse(s); }
  };
}

function run(method, url, body, password) {
  calls = [];
  var req = { method: method, url: url, headers: { "x-portfolio-password": password === undefined ? "pw" : password }, body: body };
  var res = makeRes();
  return Promise.resolve(handler(req, res)).then(function () { return { res: res, calls: calls }; });
}

var validDoc = { v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA" }], trades: [] };

function sectionB() {
  return run("GET", "/api/portfolio?doc=journal")
    .then(function (x) {
      t("GET journal reads journal row", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.decision_journal_main") > 0 && x.res.statusCode === 200, { status: x.res.statusCode, calls: x.calls });
      t("GET journal returns row data", x.res.body && x.res.body.data && x.res.body.data.marker === 1, x.res.body);
      return run("GET", "/api/portfolio");
    })
    .then(function (x) {
      t("GET default reads main", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.main") > 0, x.calls);
      return run("PUT", "/api/portfolio?doc=journal", { data: validDoc });
    })
    .then(function (x) {
      var row = x.calls.length === 1 && x.calls[0].body ? JSON.parse(x.calls[0].body)[0] : null;
      t("PUT journal writes journal row", x.res.statusCode === 200 && row && row.id === "decision_journal_main" && row.data.v === 1, { status: x.res.statusCode, body: x.res.body, row: row });
      t("PUT journal uses POST upsert and echoes the same data", row && x.calls[0].method === "POST" && JSON.stringify(row.data) === JSON.stringify(validDoc), row);
      // journal doc has no `quarters` — must not be validated as portfolio
      t("journal PUT does not require quarters", x.res.statusCode === 200, x.res.body);
      return run("PUT", "/api/portfolio?doc=journal", { data: { v: 1, entries: [{ id: "e_1", date: "25/10/2026", symbol: "NVDA" }], trades: [] } });
    })
    .then(function (x) {
      t("PUT bad journal → 400 and nothing written", x.res.statusCode === 400 && x.calls.length === 0, { status: x.res.statusCode, calls: x.calls });
      t("PUT bad journal message", x.res.body && x.res.body.error === "Refusing to save: journal data is malformed.", x.res.body);
      return run("PUT", "/api/portfolio?doc=journal", { data: null });
    })
    .then(function (x) {
      t("PUT null journal → 400 and nothing written", x.res.statusCode === 400 && x.calls.length === 0, { status: x.res.statusCode });
      return run("GET", "/api/portfolio?doc=other");
    })
    .then(function (x) {
      t("unknown doc → 400", x.res.statusCode === 400 && /Unknown doc/.test(x.res.body.error), x.res.body);
      t("unknown doc → no fetch", x.calls.length === 0, x.calls);
      return run("PUT", "/api/portfolio?doc=other", { data: validDoc });
    })
    .then(function (x) {
      t("unknown doc on PUT → 400, nothing written", x.res.statusCode === 400 && /Unknown doc/.test(x.res.body.error) && x.calls.length === 0, { status: x.res.statusCode });
      return run("GET", "/api/portfolio?doc=journal", undefined, "wrong");
    })
    .then(function (x) {
      t("journal still password-gated", x.res.statusCode === 401, { status: x.res.statusCode });
      t("401 happens before any fetch", x.calls.length === 0, x.calls);
      return run("PUT", "/api/portfolio", { data: validDoc });
    })
    .then(function (x) {
      // default path unchanged: a journal doc has no quarters → portfolio validator rejects it
      t("default PUT still uses portfolio validator", x.res.statusCode === 400 && /portfolio data/.test(x.res.body.error) && x.calls.length === 0, x.res.body);
      return run("PUT", "/api/portfolio", { data: { quarters: { "2026Q3": {} } } });
    })
    .then(function (x) {
      var row = x.calls.length === 1 && x.calls[0].body ? JSON.parse(x.calls[0].body)[0] : null;
      t("default PUT still writes row main", x.res.statusCode === 200 && row && row.id === "main", { status: x.res.statusCode, row: row });
    });
}

// ---- Section C: server.js mirror guard ----------------------
function sectionC() {
  console.log("== C. server.js mirror ==");
  var srv = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  t("server.js requires journal validation", /require\("\.\/lib\/journal-validation"\)/.test(srv));
  t("server.js GET and PUT both branch on doc=journal", (srv.match(/doc === "journal"/g) || []).length >= 2, (srv.match(/doc === "journal"/g) || []).length);
  t("server.js uses JOURNAL_STATE_ID for the row", /JOURNAL_STATE_ID/.test(srv));
  t("server.js local-fallback has a journal file", /decision-journal\.json/.test(srv));
  t("server.js uses isValidJournalDoc", /isValidJournalDoc\(/.test(srv));
  t("server.js rejects unknown doc", /Unknown doc\./.test(srv));
  t("server.js journal 400 message mirrors api", /Refusing to save: journal data is malformed\./.test(srv));
}

// ---- Section D: byte-size cap + journalItemProblems (Task 7b-A) ----
// Section C above stays as a cheap source guard; the behavioural coverage of
// server.js (row id, validator, local file, UTF-8, 413) is in
// scripts/server-portfolio-test.js.
function sectionD() {
  console.log("== D. byte cap + journalItemProblems ==");
  var MAX = V.JOURNAL_MAX_BYTES;
  function bytes(doc) { return Buffer.byteLength(JSON.stringify(doc), "utf8"); }
  function padded(fill, count) {
    return { v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA", note: fill.repeat(count) }], trades: [] };
  }

  // ASCII: 1 char = 1 byte, so pad the note until the whole doc is exactly MAX bytes.
  var base = bytes(padded("x", 0));
  var exact = padded("x", MAX - base);
  var over = padded("x", MAX - base + 1);
  t("ASCII doc padded to exactly JOURNAL_MAX_BYTES bytes is valid", bytes(exact) === MAX && V.isValidJournalDoc(exact), { bytes: bytes(exact) });
  t("ASCII doc of JOURNAL_MAX_BYTES + 1 bytes is invalid", bytes(over) === MAX + 1 && !V.isValidJournalDoc(over), { bytes: bytes(over) });

  // Thai: "ก" is 1 UTF-16 char but 3 UTF-8 bytes. 300,001 of them →
  // chars = 300,001 + base(~70) < 900,000 but bytes = 900,003 + base > 900,000.
  var thai = padded("ก", 300001);
  var thaiChars = JSON.stringify(thai).length;
  t("Thai doc under 900,000 chars but over 900,000 bytes is invalid", thaiChars < 900000 && bytes(thai) > MAX && !V.isValidJournalDoc(thai), { chars: thaiChars, bytes: bytes(thai) });
  // 299,000 × 3 = 897,000 bytes + base < 900,000 → still valid (Thai is not rejected as such)
  var thaiOk = padded("ก", 299000);
  t("Thai doc under the byte cap is valid", bytes(thaiOk) <= MAX && V.isValidJournalDoc(thaiOk), { bytes: bytes(thaiOk) });

  // journalItemProblems matrix (codes and order are the contract; the engine
  // mirror E.itemProblems is cross-checked in 7b-join)
  var P = V.journalItemProblems;
  t("journalItemProblems is exported", typeof P === "function");
  if (typeof P !== "function") return;
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  var matrix = [
    ["null → not-object", null, ["not-object"]],
    ["[] → not-object", [], ["not-object"]],
    ["{} → id,date,symbol", {}, ["id", "date", "symbol"]],
    ["2026-02-30 → date (not a calendar date)", { id: "e_1", date: "2026-02-30", symbol: "NVDA" }, ["date"]],
    ["blank symbol → symbol", { id: "e_1", date: "2026-10-25", symbol: "  " }, ["symbol"]],
    ["valid → []", { id: "e_1", date: "2026-10-25", symbol: "NVDA" }, []],
    // beyond the plan's named rows
    ["string → not-object", "e_1", ["not-object"]],
    ["numeric id → id", { id: 7, date: "2026-10-25", symbol: "NVDA" }, ["id"]],
    ["2026-13-01 → date", { id: "e_1", date: "2026-13-01", symbol: "NVDA" }, ["date"]],
    ["2024-02-29 leap day → []", { id: "e_1", date: "2024-02-29", symbol: "NVDA" }, []],
    ["2026-02-29 → date", { id: "e_1", date: "2026-02-29", symbol: "NVDA" }, ["date"]],
    ["25/10/2026 → date", { id: "e_1", date: "25/10/2026", symbol: "NVDA" }, ["date"]],
    ["numeric symbol → symbol", { id: "e_1", date: "2026-10-25", symbol: 5 }, ["symbol"]],
    ["empty id + bad date → id,date (order)", { id: "", date: "2026-00-10", symbol: "PTT.BK" }, ["id", "date"]]
  ];
  matrix.forEach(function (row) {
    var got = P(row[1]);
    t("journalItemProblems: " + row[0], same(got, row[2]), got);
  });
  t("journalItemProblems never throws on junk", (function () {
    try { P(undefined); P(42); P(Object.create(null)); return true; } catch (e) { return false; }
  })());

  // isValidJournalDoc uses the same item rules
  t("doc with a 2026-02-30 entry is invalid", !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-02-30", symbol: "NVDA" }], trades: [] }));
  t("doc with a blank-symbol trade is invalid", !V.isValidJournalDoc({ v: 1, entries: [], trades: [{ id: "t_1", date: "2026-10-25", symbol: "  " }] }));
  t("doc with a leap-day entry is valid", V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2024-02-29", symbol: "NVDA" }], trades: [] }));
}

// ---- Section E: engine mirror == server rules (Task 7b-join) ----
// The page runs DecisionJournal.itemProblems before every PUT and warns from
// docBytes / MAX_DOC_BYTES; if either drifts from lib/journal-validation.js
// the page can create an item the server refuses forever (review-1 #10).
function sectionE() {
  console.log("== E. engine mirror (itemProblems / MAX_DOC_BYTES / docBytes) ==");
  var E = require("../public/decision-journal-engine.js");
  t("engine exports itemProblems", typeof E.itemProblems === "function");
  t("engine exports docBytes", typeof E.docBytes === "function");
  if (typeof E.itemProblems !== "function" || typeof E.docBytes !== "function") return;
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  var fullEntry = {
    id: "e_kq3x9a", date: "2026-10-20", symbol: "NVDA",
    createdAt: "2026-10-20T09:15:00+07:00", updatedAt: "2026-10-20T09:15:00+07:00",
    view: { direction: "up", horizonDays: 30 }, action: { kind: "buy" },
    rules: { asOfBar: "2026-10-17", close: 183.2 }, note: "ย่อตามตลาด 😀", review: { reviewedAt: null }
  };
  var fullTrade = {
    id: "t_kq3xb2", date: "2026-10-21", symbol: "PTT.BK", side: "buy", qty: 100, price: 33.5, fee: 15,
    currency: "THB", createdAt: "2026-10-21T10:00:00+07:00", updatedAt: "2026-10-21T10:00:00+07:00"
  };
  var tombstoned = Object.assign({}, fullEntry, { id: "e_tomb", deletedAt: "2026-10-22T08:00:00+07:00", updatedAt: "2026-10-22T08:00:00+07:00" });
  function withField(base, k, v) { var o = Object.assign({}, base); o[k] = v; return o; }

  // [name, item, expected codes per the 7b-A contract] — both sides must equal the expectation and each other
  var matrix = [
    ["null", null, ["not-object"]],
    ["undefined", undefined, ["not-object"]],
    ["[]", [], ["not-object"]],
    ["string", "e_1", ["not-object"]],
    ["number", 5, ["not-object"]],
    ["{}", {}, ["id", "date", "symbol"]],
    ["fully valid entry", fullEntry, []],
    ["fully valid trade", fullTrade, []],
    ["tombstoned valid entry (still checked, still valid)", tombstoned, []],
    ["tombstoned entry with bad date (tombstones are not exempt)", withField(tombstoned, "date", "2026-02-30"), ["date"]],
    ["numeric id 5", withField(fullEntry, "id", 5), ["id"]],
    ["empty id \"\"", withField(fullTrade, "id", ""), ["id"]],
    ["2026-13-01", withField(fullEntry, "date", "2026-13-01"), ["date"]],
    ["2024-02-29 valid leap day", withField(fullEntry, "date", "2024-02-29"), []],
    ["2026-02-29 not a leap year", withField(fullTrade, "date", "2026-02-29"), ["date"]],
    ["date with time suffix", withField(fullEntry, "date", "2026-10-20T00:00"), ["date"]],
    ["date as number", withField(fullEntry, "date", 20261020), ["date"]],
    ["symbol \"   \"", withField(fullEntry, "symbol", "   "), ["symbol"]],
    ["symbol tab/newline only", withField(fullTrade, "symbol", "\t\n"), ["symbol"]],
    ["symbol \"ปตท\" (non-empty string is valid at item level)", withField(fullTrade, "symbol", "ปตท"), []],
    ["symbol number", withField(fullEntry, "symbol", 5), ["symbol"]],
    ["all three bad (order id,date,symbol)", { id: 0, date: "", symbol: null }, ["id", "date", "symbol"]],
    ["Object.create(null) empty", Object.create(null), ["id", "date", "symbol"]]
  ];
  t("join matrix has >= 12 cases", matrix.length >= 12, matrix.length);
  matrix.forEach(function (row) {
    var server = V.journalItemProblems(row[1]);
    var engine = E.itemProblems(row[1]);
    t("join: " + row[0] + " — engine deep-equals server", same(engine, server), { engine: engine, server: server });
    t("join: " + row[0] + " — matches the 7b-A contract", same(server, row[2]), { server: server, want: row[2] });
  });

  t("E.MAX_DOC_BYTES === V.JOURNAL_MAX_BYTES", E.MAX_DOC_BYTES === V.JOURNAL_MAX_BYTES, { engine: E.MAX_DOC_BYTES, server: V.JOURNAL_MAX_BYTES });
  t("E.MAX_DOC_BYTES is 900000", E.MAX_DOC_BYTES === 900000, E.MAX_DOC_BYTES);

  // Mixed ASCII / Thai (3 bytes) / emoji (surrogate pair, 4 bytes) / 2-byte Latin
  var mixed = {
    v: 1, updatedAt: "2026-10-26T08:00:00+07:00",
    entries: [fullEntry, tombstoned, withField(fullEntry, "note", "ตลาดกลัว 😱🚀 แต่ยังถือ · café ± ñ")],
    trades: [fullTrade, withField(fullTrade, "note", "ซื้อเพิ่ม 👍🏽 (skin-tone = 2 pairs)")]
  };
  function nodeBytes(doc) { return Buffer.byteLength(JSON.stringify(doc), "utf8"); }
  t("E.docBytes(mixed Thai/emoji doc) === Buffer.byteLength", E.docBytes(mixed) === nodeBytes(mixed), { engine: E.docBytes(mixed), node: nodeBytes(mixed) });
  t("mixed doc really is multi-byte (bytes > chars)", nodeBytes(mixed) > JSON.stringify(mixed).length);
  var ascii = { v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA", note: "abc" }], trades: [] };
  t("E.docBytes(ASCII-only doc) === Buffer.byteLength", E.docBytes(ascii) === nodeBytes(ascii), { engine: E.docBytes(ascii), node: nodeBytes(ascii) });
  // "ก" = 3 bytes, "😀" = 4 bytes: {"a":"ก😀"} has 8 ASCII chars ({ " a " : " " }) = 8 bytes, + 3 + 4 = 15
  t("E.docBytes({a:\"ก😀\"}) === 15 (hand count)", E.docBytes({ a: "ก😀" }) === 15 && nodeBytes({ a: "ก😀" }) === 15,{ engine: E.docBytes({ a: "ก😀" }), node: nodeBytes({ a: "ก😀" }) });
  // Lone surrogate: JSON.stringify escapes it to "\udc00" (6 ASCII bytes) in Node 12+, so both sides agree
  var lone = { a: "x\uDC00y" };
  t("E.docBytes(lone surrogate) === Buffer.byteLength", E.docBytes(lone) === nodeBytes(lone), { engine: E.docBytes(lone), node: nodeBytes(lone) });
}

// ---- Section F: tombstones vs the validator (review-2) ----
// The server never exempts tombstones (a doc with a deleted 2026-02-30 item is
// refused). The cure is client-side: E.tombstone strips the item to
// id/date/symbol/createdAt/updatedAt/deletedAt and repairs an unusable date or
// symbol, so deleting a bad item makes the doc valid again, and deleting a big
// item frees space when the doc is over JOURNAL_MAX_BYTES.
function sectionF() {
  console.log("== F. tombstones vs the validator (review-2) ==");
  var E = require("../public/decision-journal-engine.js");
  t("doc with a TOMBSTONED 2026-02-30 entry is still invalid (tombstones are not exempt)",
    !V.isValidJournalDoc({ v: 1, entries: [{ id: "e_1", date: "2026-02-30", symbol: "NVDA", deletedAt: "2026-10-26T00:00:00Z", updatedAt: "2026-10-26T00:00:00Z" }], trades: [] }));
  t("doc with a tombstoned blank-symbol trade is still invalid",
    !V.isValidJournalDoc({ v: 1, entries: [], trades: [{ id: "t_1", date: "2026-10-25", symbol: "", deletedAt: "2026-10-26T00:00:00Z" }] }));

  // poison pill: a bad item reached the local draft (e.g. symbol "" from canonicalSymbol("ปตท")).
  var bad = { id: "e_bad", date: "2026-02-30", symbol: "", createdAt: "2026-10-25T09:00:00Z", updatedAt: "2026-10-25T09:00:00Z", context: { event: "ข่าว" } };
  var doc = { v: 1, updatedAt: null, entries: [bad, { id: "e_ok", date: "2026-10-25", symbol: "PTT.BK" }], trades: [] };
  t("poison pill: doc with the bad item is refused", !V.isValidJournalDoc(doc));
  E.tombstone(bad, "2026-10-26T03:00:00.000Z");
  t("poison pill: after E.tombstone(bad) the same doc is accepted", V.isValidJournalDoc(doc), bad);
  t("poison pill: the cured tombstone has no server problems and stays deleted", V.journalItemProblems(bad).length === 0 && bad.deletedAt === "2026-10-26T03:00:00.000Z" && E.liveEntries(doc).length === 1);

  // dead end at the size cap: one big Thai entry pushes the doc over 900,000 bytes
  // (300,001 × "ก" = 900,003 bytes of note alone); deleting it must bring the doc under the cap.
  var big = { id: "e_big", date: "2026-10-20", symbol: "NVDA", createdAt: "c", updatedAt: "u", context: { note: new Array(300002).join("ก") } };
  var full = { v: 1, updatedAt: null, entries: [big, { id: "e_ok", date: "2026-10-25", symbol: "PTT.BK" }], trades: [] };
  var before = Buffer.byteLength(JSON.stringify(full), "utf8");
  t("size cap: doc over JOURNAL_MAX_BYTES is refused", before > V.JOURNAL_MAX_BYTES && !V.isValidJournalDoc(full), before);
  E.tombstone(big, "2026-10-26T03:00:00.000Z");
  var after = Buffer.byteLength(JSON.stringify(full), "utf8");
  t("size cap: deleting the big entry brings the doc under the cap and it is accepted", after < 1000 && V.isValidJournalDoc(full) && E.docBytes(full) === after, after);
}

sectionB()
  .then(function () { sectionC(); sectionD(); sectionE(); sectionF(); finish(); })
  .catch(function (error) {
    fail++;
    console.error("  ✗ section B threw  → " + (error && error.stack || error));
    sectionC();
    sectionD();
    sectionE();
    sectionF();
    finish();
  });
