"use strict";

// Server-side guard for the Decision Journal doc (spec §6). Shared by
// api/portfolio.js (Vercel) and server.js (local dev) so both stay in sync.
// A doc that fails here is answered with 400 and never written, so a bad
// client can not replace the whole journal with garbage.
//
// Valid doc: plain object · v === 1 · entries/trades arrays · every item has
// no journalItemProblems · serialised JSON at most JOURNAL_MAX_BYTES UTF-8
// bytes. The cap is in bytes, not characters: Thai text is 3 bytes per char,
// so a char cap let a near-cap doc exceed Vercel's 4.5 MB request limit and
// get a bare 413 before this validator could answer (review-1 #14).
//
// The page mirrors journalItemProblems as DecisionJournal.itemProblems and
// JOURNAL_MAX_BYTES as MAX_DOC_BYTES, so it never creates an item the server
// would refuse (one such item would make every later save fail — review-1 #10).
const JOURNAL_STATE_ID = "decision_journal_main";
const JOURNAL_MAX_BYTES = 900000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// YYYY-MM-DD that is also a real calendar date (2026-02-30 and 2026-13-01 fail).
function isCalendarYmd(value) {
  if (typeof value !== "string" || !YMD_RE.test(value)) return false;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  const back = new Date(Date.UTC(y, m - 1, d));
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d;
}

// Problem codes for one entry/trade, in a fixed order. Not a plain object →
// ["not-object"] and nothing else; otherwise any of "id", "date", "symbol".
// [] means the item is acceptable.
function journalItemProblems(item) {
  if (!isPlainObject(item)) return ["not-object"];
  const problems = [];
  if (typeof item.id !== "string" || item.id.length === 0) problems.push("id");
  if (!isCalendarYmd(item.date)) problems.push("date");
  if (typeof item.symbol !== "string" || item.symbol.trim().length === 0) problems.push("symbol");
  return problems;
}

function everyItemValid(list) {
  for (let i = 0; i < list.length; i += 1) {
    if (journalItemProblems(list[i]).length !== 0) return false;
  }
  return true;
}

// Never throws: a cyclic or otherwise unserialisable doc is simply invalid.
function isValidJournalDoc(data) {
  try {
    if (!isPlainObject(data)) return false;
    if (data.v !== 1) return false;
    if (!Array.isArray(data.entries) || !Array.isArray(data.trades)) return false;
    if (!everyItemValid(data.entries) || !everyItemValid(data.trades)) return false;
    const text = JSON.stringify(data);
    if (typeof text !== "string") return false;
    return Buffer.byteLength(text, "utf8") <= JOURNAL_MAX_BYTES;
  } catch (error) {
    return false;
  }
}

module.exports = { isValidJournalDoc, journalItemProblems, JOURNAL_STATE_ID, JOURNAL_MAX_BYTES };
