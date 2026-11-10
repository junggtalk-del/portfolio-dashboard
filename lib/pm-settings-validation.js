"use strict";

// Server-side guard for the AI Portfolio Manager settings doc (?doc=pm).
// Shared by api/portfolio.js (Vercel) and server.js (local dev) so both stay
// in sync. A doc that fails here is answered with 400 and never written.
//
// The doc carries the four settings that used to live only in the browser's
// localStorage of public/portfolio-manager-page.js (same shapes, same keys):
//   tierConfig    ← pmTierConfig_v1   { map: { TICKER: "A"|"B"|"C" }, tiers: { A|B|C: { min, target, max } } }
//   entryProgress ← pmEntryProgress_v1 { TICKER: { "1": true, ... } }   ({} after un-ticking)
//   megaStance    ← pmMegaStance_v1   "bullish" | "bearish"
//   allocPolicy   ← pmAllocPolicy_v1  { indexTicker, indexPct, maxSinglePct, splitMethod }
// pmCurrentView_v1 (table view) stays per device and is not a key here.
//
// Valid doc: plain object · v === 1 · only the keys below · every key optional ·
// numbers finite and inside the ranges the page itself accepts (setTierParam
// 0–100 · setAllocField indexPct 0–100, maxSinglePct >0–100) · ticker keys
// 1–PM_KEY_MAX_LEN chars · indexTicker 1–PM_KEY_MAX_LEN ticker characters
// [A-Z0-9.^-] · serialised JSON at most PM_MAX_BYTES UTF-8 bytes (Thai is 3
// bytes per char).
//
// The page mirrors these rules in normalizePmSetting (it only sends shapes this
// validator accepts) and keeps a typed indexTicker to ticker characters before
// cutting it at PM_KEY_MAX_LEN, so a value the page can write is never refused
// here (and a surrogate pair can not be split by the cut).
// scripts/pm-settings-validation-test.js locks both sides together.
const PM_STATE_ID = "pm_settings_main";
const PM_MAX_BYTES = 200000;
const PM_KEY_MAX_LEN = 64;
const DOC_KEYS = ["v", "tierConfig", "entryProgress", "megaStance", "allocPolicy", "updatedAt"];
const TIER_KEYS = ["A", "B", "C"];
const TIER_FIELDS = ["min", "target", "max"];
const STANCES = ["bullish", "bearish"];
const SPLIT_METHODS = ["conviction", "equal"];
const ALLOC_KEYS = ["indexTicker", "indexPct", "maxSinglePct", "splitMethod"];
const ENTRY_N_RE = /^\d{1,3}$/;
const INDEX_TICKER_RE = /^[A-Z0-9.^-]+$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function onlyKeys(obj, allowed) {
  return Object.keys(obj).every((k) => allowed.indexOf(k) >= 0);
}

// "__proto__" can arrive as an own key from JSON.parse; the page can never
// persist one (assigning it changes the prototype instead), so refuse it.
function isTickerKey(key) {
  return typeof key === "string" && key.length > 0 && key.length <= PM_KEY_MAX_LEN && key !== "__proto__";
}

function isNumberIn(value, lo, hi, loExclusive) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  return (loExclusive ? value > lo : value >= lo) && value <= hi;
}

function isValidTierConfig(value) {
  if (!isPlainObject(value) || !onlyKeys(value, ["map", "tiers"])) return false;
  if (has(value, "map")) {
    if (!isPlainObject(value.map)) return false;
    for (const ticker of Object.keys(value.map)) {
      if (!isTickerKey(ticker) || TIER_KEYS.indexOf(value.map[ticker]) < 0) return false;
    }
  }
  if (has(value, "tiers")) {
    if (!isPlainObject(value.tiers) || !onlyKeys(value.tiers, TIER_KEYS)) return false;
    for (const tier of Object.keys(value.tiers)) {
      const def = value.tiers[tier];
      if (!isPlainObject(def) || !onlyKeys(def, TIER_FIELDS)) return false;
      for (const field of Object.keys(def)) {
        if (!isNumberIn(def[field], 0, 100)) return false;
      }
    }
  }
  return true;
}

function isValidEntryProgress(value) {
  if (!isPlainObject(value)) return false;
  for (const ticker of Object.keys(value)) {
    const done = value[ticker];
    if (!isTickerKey(ticker) || !isPlainObject(done)) return false;
    for (const n of Object.keys(done)) {
      if (!ENTRY_N_RE.test(n) || done[n] !== true) return false;
    }
  }
  return true;
}

function isValidAllocPolicy(value) {
  if (!isPlainObject(value) || !onlyKeys(value, ALLOC_KEYS)) return false;
  if (has(value, "indexTicker")) {
    const t = value.indexTicker;
    if (typeof t !== "string" || t.length === 0 || t.length > PM_KEY_MAX_LEN || !INDEX_TICKER_RE.test(t)) return false;
  }
  if (has(value, "indexPct") && !isNumberIn(value.indexPct, 0, 100)) return false;
  if (has(value, "maxSinglePct") && !isNumberIn(value.maxSinglePct, 0, 100, true)) return false;
  if (has(value, "splitMethod") && SPLIT_METHODS.indexOf(value.splitMethod) < 0) return false;
  return true;
}

function isValidUpdatedAt(value) {
  return typeof value === "string" && value.length <= PM_KEY_MAX_LEN && Number.isFinite(Date.parse(value));
}

// Never throws: a cyclic or otherwise unserialisable doc is simply invalid.
function isValidPmSettingsDoc(data) {
  try {
    if (!isPlainObject(data) || data.v !== 1) return false;
    if (!onlyKeys(data, DOC_KEYS)) return false;
    if (has(data, "tierConfig") && !isValidTierConfig(data.tierConfig)) return false;
    if (has(data, "entryProgress") && !isValidEntryProgress(data.entryProgress)) return false;
    if (has(data, "megaStance") && STANCES.indexOf(data.megaStance) < 0) return false;
    if (has(data, "allocPolicy") && !isValidAllocPolicy(data.allocPolicy)) return false;
    if (has(data, "updatedAt") && !isValidUpdatedAt(data.updatedAt)) return false;
    const text = JSON.stringify(data);
    if (typeof text !== "string") return false;
    return Buffer.byteLength(text, "utf8") <= PM_MAX_BYTES;
  } catch (error) {
    return false;
  }
}

module.exports = { isValidPmSettingsDoc, PM_STATE_ID, PM_MAX_BYTES, PM_KEY_MAX_LEN };
