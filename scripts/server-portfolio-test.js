"use strict";
// ============================================================
// server.js /api/portfolio — behavioural tests (Task 7b-A)
//   node scripts/server-portfolio-test.js
//
// Replaces the string-matching guard (journal-api-test.js section C) with
// real calls into server.js handlePortfolio / getRequestBody:
//   1. require("../server.js") must not open a port
//   2. Supabase path: row id + validator per ?doc, unknown doc, 401
//   3. local-fallback path: decision-journal.json vs portfolio.json
//   4. getRequestBody decodes UTF-8 once (Thai char split across chunks)
//   5. body over 1,000,000 bytes → 413 JSON (no connection reset)
//
// Safety: env is set BEFORE require (empty strings stop local-env.js from
// loading the real .env values — it never overrides a key that is set),
// LOCAL_DATA_DIR points at a fresh temp dir, and global.fetch is a recording
// stub. A fetch to anything but https://sb.test fails the run. The repo's
// .local-data folder is fingerprinted before and after.
// ============================================================
const fs = require("fs");
const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");

let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

// ---- environment (before require) ---------------------------
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dj-server-test-"));
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.APP_PASSWORD = "pw";
process.env.ENABLE_LOCAL_FALLBACK = "true";
process.env.LOCAL_DATA_DIR = TMP;
// belt and braces: should an old server.js still listen on require, it takes a
// random free port instead of colliding with the dev server on 4173
process.env.PORT = "0";

const REPO_LOCAL_DATA = path.join(__dirname, "..", ".local-data");
function fingerprint(dir) {
  if (!fs.existsSync(dir)) return "(missing)";
  return fs.readdirSync(dir).sort().map((name) => {
    const st = fs.statSync(path.join(dir, name));
    return name + ":" + st.size + ":" + st.mtimeMs;
  }).join("|");
}
const repoBefore = fingerprint(REPO_LOCAL_DATA);

let calls = [];
let escaped = [];
let nextRows = [{ data: { marker: 1 } }];
global.fetch = function (url, init) {
  const u = String(url);
  calls.push({ url: u, method: (init && init.method) || "GET", body: init && init.body });
  if (u.indexOf("https://sb.test/") !== 0) {
    escaped.push(u);
    return Promise.reject(new Error("network blocked by test: " + u));
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(nextRows),
    text: () => Promise.resolve("")
  });
};

const S = require("../server.js");

// ---- fakes ---------------------------------------------------
// req: EventEmitter + { method, url, headers }; body chunks are emitted on
// setImmediate, after handlePortfolio has attached its listeners.
function makeReq(method, url, chunks, password) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { host: "localhost:4173" };
  if (password !== null) req.headers["x-portfolio-password"] = password === undefined ? "pw" : password;
  req.destroyed = false;
  req.destroy = function () { this.destroyed = true; };
  setImmediate(() => {
    (chunks || []).forEach((c) => req.emit("data", c));
    req.emit("end");
  });
  return req;
}

function makeRes() {
  return {
    status: null,
    head: null,
    raw: null,
    ended: false,
    writeHead(s, h) { this.status = s; this.head = h; },
    end(b) { this.ended = true; this.raw = b; },
    json() { try { return JSON.parse(this.raw); } catch (e) { return null; } }
  };
}

async function call(method, url, body, password) {
  calls = [];
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body), "utf8")];
  const req = makeReq(method, url, chunks, password);
  const res = makeRes();
  await S.handlePortfolio(req, res);
  return { req, res, body: res.json(), calls: calls.slice() };
}

function useSupabase(on) {
  process.env.SUPABASE_URL = on ? "https://sb.test" : "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = on ? "k" : "";
}

const journalDoc = { v: 1, entries: [{ id: "e_1", date: "2026-10-25", symbol: "NVDA", note: "กลัวตกรถ" }], trades: [{ id: "t_1", date: "2026-10-25", symbol: "PTT.BK" }] };
// passes isValidPortfolioData (plain object, non-empty quarters) but is no journal (no v)
const portfolioBlob = { quarters: { "2026Q3": { assets: [] } } };
const badJournal = { v: 1, entries: [{ id: "e_1", date: "2026-02-30", symbol: "NVDA" }], trades: [] };

function postedRow(c) {
  try { return JSON.parse(c.body)[0]; } catch (e) { return null; }
}

async function sectionModule() {
  console.log("== A. module shape ==");
  t("require does not listen", S.server && S.server.listening === false, S.server && S.server.listening);
  t("exports handlePortfolio + getRequestBody", typeof S.handlePortfolio === "function" && typeof S.getRequestBody === "function");
}

async function sectionSupabase() {
  console.log("== B. Supabase path ==");
  useSupabase(true);
  nextRows = [{ data: { marker: 1 } }];

  let x = await call("GET", "/api/portfolio?doc=journal");
  t("GET journal reads row decision_journal_main", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.decision_journal_main") > 0 && x.res.status === 200, x.calls);
  t("GET journal returns the row data", x.body && x.body.data && x.body.data.marker === 1, x.body);

  x = await call("GET", "/api/portfolio");
  t("GET without doc reads row main", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.main&") > 0 && x.res.status === 200, x.calls);

  x = await call("PUT", "/api/portfolio?doc=journal", { data: journalDoc });
  let row = x.calls.length === 1 ? postedRow(x.calls[0]) : null;
  t("PUT journal (no quarters) → 200", x.res.status === 200 && x.body && x.body.ok === true, x.body);
  t("PUT journal posts row decision_journal_main with the same data", row && x.calls[0].method === "POST" && row.id === "decision_journal_main" && JSON.stringify(row.data) === JSON.stringify(journalDoc), row);

  x = await call("PUT", "/api/portfolio?doc=journal", { data: portfolioBlob });
  t("PUT journal with a portfolio-shaped blob → 400, no fetch", x.res.status === 400 && x.calls.length === 0 && x.body.error === "Refusing to save: journal data is malformed.", { status: x.res.status, body: x.body, calls: x.calls.length });

  x = await call("PUT", "/api/portfolio?doc=journal", { data: badJournal });
  t("PUT invalid journal → 400 malformed, no fetch", x.res.status === 400 && x.body.error === "Refusing to save: journal data is malformed." && x.calls.length === 0, { status: x.res.status, body: x.body });

  x = await call("GET", "/api/portfolio?doc=nope");
  t("GET ?doc=nope → 400 Unknown doc., no fetch", x.res.status === 400 && x.body.error === "Unknown doc." && x.calls.length === 0, x.body);
  x = await call("PUT", "/api/portfolio?doc=nope", { data: journalDoc });
  t("PUT ?doc=nope → 400 Unknown doc., no fetch", x.res.status === 400 && x.body.error === "Unknown doc." && x.calls.length === 0, x.body);

  x = await call("GET", "/api/portfolio?doc=journal", undefined, "wrong");
  t("wrong password → 401, no fetch", x.res.status === 401 && x.calls.length === 0, { status: x.res.status });
  x = await call("PUT", "/api/portfolio?doc=journal", { data: journalDoc }, null);
  t("missing password on PUT → 401, no fetch", x.res.status === 401 && x.calls.length === 0, { status: x.res.status });

  // default path unchanged
  x = await call("PUT", "/api/portfolio", { data: journalDoc });
  t("PUT without doc still uses the portfolio validator (journal doc → 400)", x.res.status === 400 && /portfolio data/.test(x.body.error) && x.calls.length === 0, x.body);
  x = await call("PUT", "/api/portfolio", { data: portfolioBlob });
  row = x.calls.length === 1 ? postedRow(x.calls[0]) : null;
  t("PUT without doc writes row main", x.res.status === 200 && row && row.id === "main", row);

  // getRequestBody errors keep their status through the catch
  x = await call("PUT", "/api/portfolio?doc=journal", "{not json");
  t("bad JSON body → 400 Invalid JSON body., no fetch", x.res.status === 400 && x.body.error === "Invalid JSON body." && x.calls.length === 0, { status: x.res.status, body: x.body });
}

async function sectionLocal() {
  console.log("== C. local-fallback path ==");
  useSupabase(false);
  const jFile = path.join(TMP, "decision-journal.json");
  const pFile = path.join(TMP, "portfolio.json");

  let x = await call("GET", "/api/portfolio?doc=journal");
  t("GET journal with no file → { data: null, mode: local-fallback }", x.res.status === 200 && x.body && x.body.data === null && x.body.mode === "local-fallback", x.body);

  x = await call("PUT", "/api/portfolio?doc=journal", { data: journalDoc });
  t("PUT journal → 200 local-fallback", x.res.status === 200 && x.body.ok === true && x.body.mode === "local-fallback", x.body);
  t("PUT journal writes <LOCAL_DATA_DIR>/decision-journal.json", fs.existsSync(jFile));
  t("PUT journal does not create portfolio.json", !fs.existsSync(pFile));
  t("local fallback never fetches", x.calls.length === 0);

  x = await call("GET", "/api/portfolio?doc=journal");
  t("GET journal returns the saved doc (Thai intact)", x.body && JSON.stringify(x.body.data) === JSON.stringify(journalDoc), x.body);

  x = await call("GET", "/api/portfolio");
  t("GET without doc does not return the journal", x.res.status === 200 && x.body.data === null, x.body);

  x = await call("PUT", "/api/portfolio", { data: portfolioBlob });
  t("PUT without doc writes portfolio.json", x.res.status === 200 && fs.existsSync(pFile));
  x = await call("GET", "/api/portfolio");
  t("GET without doc returns the portfolio", x.body && JSON.stringify(x.body.data) === JSON.stringify(portfolioBlob), x.body);
  x = await call("GET", "/api/portfolio?doc=journal");
  t("GET journal still returns the journal after a portfolio save", x.body && JSON.stringify(x.body.data) === JSON.stringify(journalDoc), x.body);

  const before = fingerprint(TMP);
  x = await call("PUT", "/api/portfolio?doc=journal", { data: badJournal });
  t("local PUT invalid journal → 400, file untouched", x.res.status === 400 && x.body.error === "Refusing to save: journal data is malformed." && fingerprint(TMP) === before, x.body);
  x = await call("PUT", "/api/portfolio?doc=nope", { data: journalDoc });
  t("local unknown doc → 400 and no file written", x.res.status === 400 && x.body.error === "Unknown doc." && fingerprint(TMP) === before, { body: x.body, files: fs.readdirSync(TMP) });
  x = await call("GET", "/api/portfolio?doc=nope");
  t("local GET unknown doc → 400", x.res.status === 400 && x.body.error === "Unknown doc.", x.body);
}

async function sectionUtf8() {
  console.log("== D. getRequestBody UTF-8 ==");
  // ~85 KB of Thai text: each entry note is 100 Thai chars (300 bytes)
  const doc = { v: 1, entries: [], trades: [] };
  const note = "ราคาลงแรงแต่ยังเชื่อในธุรกิจ ซื้อเพิ่มตามแผนที่วางไว้ ".repeat(2).slice(0, 100);
  for (let i = 0; Buffer.byteLength(JSON.stringify(doc), "utf8") < 85000; i += 1) {
    doc.entries.push({ id: "e_" + i, date: "2026-10-25", symbol: "PTT.BK", note: note, context: { event: "งบไตรมาส " + i } });
  }
  const buf = Buffer.from(JSON.stringify(doc), "utf8");
  // split right after the lead byte (0xE0) of a 3-byte Thai character past the middle
  let cut = -1;
  for (let i = Math.floor(buf.length / 2); i < buf.length - 2; i += 1) {
    if (buf[i] === 0xe0 && (buf[i + 1] & 0xc0) === 0x80 && (buf[i + 2] & 0xc0) === 0x80) { cut = i + 1; break; }
  }
  const a = buf.slice(0, cut), b = buf.slice(cut);
  t("fixture: ~85 KB, cut lands inside a 3-byte character", buf.length >= 85000 && cut > 0 && (buf[cut] & 0xc0) === 0x80, { len: buf.length, cut });
  t("fixture: naive per-chunk string concat would corrupt it", (String(a) + String(b)).indexOf("�") >= 0);

  const req = new EventEmitter();
  setImmediate(() => { req.emit("data", a); req.emit("data", b); req.emit("end"); });
  const got = await S.getRequestBody(req);
  t("split Thai body decodes to the original object", JSON.stringify(got) === JSON.stringify(doc));
  t("no U+FFFD in the decoded body", JSON.stringify(got).indexOf("�") < 0);

  const req2 = new EventEmitter();
  setImmediate(() => { req2.emit("data", '{"a":'); req2.emit("data", '"ก"}'); req2.emit("end"); });
  const got2 = await S.getRequestBody(req2);
  t("string chunks are accepted too", got2 && got2.a === "ก", got2);

  const req3 = new EventEmitter();
  setImmediate(() => req3.emit("end"));
  const got3 = await S.getRequestBody(req3);
  t("empty body → {}", got3 && typeof got3 === "object" && Object.keys(got3).length === 0, got3);

  const req4 = new EventEmitter();
  setImmediate(() => { req4.emit("data", Buffer.from("{oops")); req4.emit("end"); });
  let err4 = null;
  try { await S.getRequestBody(req4); } catch (e) { err4 = e; }
  t("bad JSON → Error('Invalid JSON body.') with statusCode 400", err4 && err4.message === "Invalid JSON body." && err4.statusCode === 400, err4 && { m: err4.message, s: err4.statusCode });
}

// JSON body of exactly `size` bytes: {"data":{"v":1,"entries":[],"trades":[],"pad":"xxx…"}}
function bodyOfBytes(size) {
  const head = '{"data":{"v":1,"entries":[],"trades":[],"pad":"';
  const tail = '"}}';
  return head + "x".repeat(size - head.length - tail.length) + tail;
}

async function sectionOversize() {
  console.log("== E. oversize body ==");
  useSupabase(true);
  const big = Buffer.from(bodyOfBytes(1000001), "utf8");
  t("fixture: 1,000,001 bytes of valid JSON", big.length === 1000001 && JSON.parse(big.toString("utf8")).data.v === 1);
  calls = [];
  // three chunks so the cap trips mid-stream and the remaining chunk is dropped
  const req = makeReq("PUT", "/api/portfolio?doc=journal", [big.slice(0, 400000), big.slice(400000, 800000), big.slice(800000)]);
  const res = makeRes();
  await S.handlePortfolio(req, res);
  const body = res.json();
  t("1,000,001-byte PUT → writeHead(413)", res.status === 413, res.status);
  t("413 body is JSON { error: Request body is too large. }", body && body.error === "Request body is too large." && Object.keys(body).length === 1, res.raw && res.raw.slice(0, 200));
  t("413: end called, no fetch, connection not destroyed", res.ended === true && calls.length === 0 && req.destroyed === false, { ended: res.ended, calls: calls.length, destroyed: req.destroyed });

  // exactly 1,000,000 bytes passes the transport cap and reaches the journal
  // validator, whose 900,000-byte cap is the binding one → 400, not 413
  const atCap = Buffer.from(bodyOfBytes(1000000), "utf8");
  calls = [];
  const req2 = makeReq("PUT", "/api/portfolio?doc=journal", [atCap]);
  const res2 = makeRes();
  await S.handlePortfolio(req2, res2);
  t("1,000,000-byte journal PUT → 400 from the validator (not 413), no fetch", atCap.length === 1000000 && res2.status === 400 && res2.json().error === "Refusing to save: journal data is malformed." && calls.length === 0, { status: res2.status, body: res2.json() });

  // local-fallback path answers 413 too and writes nothing
  useSupabase(false);
  const before = fingerprint(TMP);
  calls = [];
  const req3 = makeReq("PUT", "/api/portfolio?doc=journal", [big]);
  const res3 = makeRes();
  await S.handlePortfolio(req3, res3);
  t("local-fallback oversize → 413 and nothing written", res3.status === 413 && res3.json().error === "Request body is too large." && fingerprint(TMP) === before, { status: res3.status });
}

(async () => {
  try {
    await sectionModule();
    // Only a server.js that exports a non-listening server honours
    // LOCAL_DATA_DIR; anything else could write into the repo's .local-data,
    // so the I/O sections are skipped (and counted as a failure) instead.
    if (!(S.server && S.server.listening === false && typeof S.handlePortfolio === "function")) {
      t("server.js exports a non-listening server (I/O sections skipped)", false);
    } else {
      await sectionSupabase();
      await sectionLocal();
      await sectionUtf8();
      await sectionOversize();
    }
  } catch (error) {
    fail++;
    console.error("  ✗ suite threw  → " + (error && error.stack || error));
  }

  // ---- safety + summary (new sections go above this line) ----
  t("no fetch ever left https://sb.test", escaped.length === 0, escaped);
  t("repo .local-data untouched", fingerprint(REPO_LOCAL_DATA) === repoBefore);
  t("server still not listening at the end", S.server && S.server.listening === false);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* temp dir cleanup is best-effort */ }
  const total = pass + fail;
  console.log(total + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
