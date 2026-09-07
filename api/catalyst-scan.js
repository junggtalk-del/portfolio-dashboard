"use strict";
// THAI CATALYST HUNTER — price-plane scanner (server)
// REUSE เท่านั้น: universe เดิม (lib/config/thaiStockUniverse) + ตัวดึงราคาเดิม
// (api/price-history __internals) — ไม่มี provider ใหม่ ไม่มี universe ใหม่
// คืน "price facts" ดิบให้ฝั่ง client เอาไปเข้า catalyst-engine (ตรรกะอยู่ที่เดียว)

const { getThaiStockUniverse } = require("../lib/config/thaiStockUniverse.js");
// ทะเบียนเต็มทั้งตลาด (SET + mai) — ลิสต์ hard-code เดิมไม่ครบและมี ticker ที่เพิกถอนแล้ว
const { getFullUniverse, FULL_KEYS } = require("../lib/thaiUniverseFull.js");
// ระนาบหลักฐาน (story plane) — จำแนกฝั่ง server เพราะข้อมูลเผยแพร่มีหลักหมื่นรายการ
const evidenceAdapters = require("../lib/evidence/adapters.js");
const EvidenceClassifier = require("../public/evidence-classifier.js");
// ระนาบค้นพบ (PHASE 3) — สร้าง LEAD/NARRATIVE_EMERGING ได้ แต่ยก C3 ไม่ได้
const discoveryRegistry = require("../lib/discovery/registry.js");
const { fetchDailyHistoryByRange, fetchMarketHistoryWithServerCache } = require("./price-history").__internals;

const BENCH_SYMBOL = "^SET.BK";
const RANGE = "5y";               // ต้องการ 3-5 ปีเพื่อคิด drawdown ระยะยาว
const MAX_LIMIT = 24;
const EVIDENCE_MONTHS = 24;
const DISCOVERY_PAGES = 3;       // ข่าวล่าสุด ~150 ชิ้น + ค้นคำ catalyst      // ย้อนหลัง 2 ปี — พอเห็นพัฒนาการของ story

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

// แปลง rows ให้เป็น arrays ที่ engine ใช้ (closes/volumes/dates)
function toSeries(rows) {
  const dates = [], closes = [], volumes = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const close = Number(row && row.close);
    if (!Number.isFinite(close)) return;
    dates.push(row.date || null);
    closes.push(close);
    const vol = Number(row && row.volume);
    volumes.push(Number.isFinite(vol) && vol > 0 ? vol : null);
  });
  return { dates, closes, volumes };
}

// ดึงราคา 5 ปี — ถ้าล้มเหลว ใช้ cache ฝั่ง server ของระบบเดิม (ยอมได้แค่ ~2 ปี)
async function fetchHistory(providerSymbol) {
  try {
    const rows = await fetchDailyHistoryByRange(providerSymbol, RANGE);
    if (Array.isArray(rows) && rows.length) {
      return { ...toSeries(rows), source: "Yahoo Finance", sourceType: "LIVE_MARKET_DATA", range: RANGE };
    }
  } catch (error) {
    // ตกไปใช้ cache ด้านล่าง
  }
  const cached = await fetchMarketHistoryWithServerCache(providerSymbol);
  const dates = Array.isArray(cached && cached.dates) ? cached.dates : [];
  const closes = Array.isArray(cached && cached.closes) ? cached.closes : [];
  const volumes = Array.isArray(cached && cached.volumes) ? cached.volumes : dates.map(() => null);
  return {
    dates, closes, volumes,
    source: (cached && cached.source) || "Server cached data",
    sourceType: (cached && cached.sourceType) || "SERVER_CACHED_DATA",
    range: (cached && cached.sourceRange) || "cache",
    rangeWarning: "ใช้ข้อมูลจาก cache — ช่วงเวลาอาจสั้นกว่า 5 ปี",
  };
}

let benchCache = { at: 0, closes: null, source: null };
async function fetchBenchmark() {
  const TEN_MIN = 10 * 60 * 1000;
  if (benchCache.closes && Date.now() - benchCache.at < TEN_MIN) return benchCache;
  try {
    const rows = await fetchDailyHistoryByRange(BENCH_SYMBOL, RANGE);
    const { closes } = toSeries(rows);
    benchCache = { at: Date.now(), closes, source: BENCH_SYMBOL };
  } catch (error) {
    benchCache = { at: Date.now(), closes: null, source: null, error: String((error && error.message) || error) };
  }
  return benchCache;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }
  const query = req.query || {};
  // SET + mai เท่านั้นตามสเปค (ไม่รวม US/DR/crypto/ETF/กองทุน)
  const universeKey = String(query.universe || "THAI_ALL").toUpperCase();
  const legacy = ["SET50", "SET100", "MAI", "SET100_MAI", "CUSTOM"];
  const allowed = FULL_KEYS.concat(legacy);
  const universe = allowed.includes(universeKey) ? universeKey : "THAI_ALL";
  const customSymbols = String(query.symbols || "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);

  // ค่าเริ่มต้น = ทั้งตลาด (SET + mai) · key เดิมยังเรียกได้เพื่อความเข้ากันได้ย้อนหลัง
  let stocks, universeMeta;
  if (FULL_KEYS.includes(universe)) {
    const full = await getFullUniverse(universe);
    stocks = full.stocks;
    universeMeta = { source: full.source, asOf: full.asOf, degraded: full.degraded,
      note: full.note, counts: full.counts };
  } else {
    stocks = getThaiStockUniverse(universe, { customSymbols });
    universeMeta = { source: "ลิสต์ hard-code เดิม (lib/config/thaiStockUniverse)", asOf: null,
      degraded: true, note: "ไม่ใช่ทั้งตลาด — เป็นลิสต์ย่อยที่ตรึงไว้ในโค้ด", counts: null };
  }

  const offset = Math.max(0, Number.parseInt(query.offset || "0", 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit || "12", 10) || 12));
  const batch = stocks.slice(offset, offset + limit);

  const bench = await fetchBenchmark();

  // โหลดคลังข้อมูลเผยแพร่ครั้งเดียวต่อคำขอ (bulk) แล้วแจกให้แต่ละ ticker
  // ถ้าโหลดไม่สำเร็จ evidenceInspected = false → ทุกตัวต้องเป็น CATALYST_UNAVAILABLE
  let evidenceReady = false, evidenceMeta = null;
  {
    const probeSym = batch.length ? batch[0].displaySymbol : "PTT";
    const sources = {};
    let anyOk = false;
    for (const [key, fn] of [["companyEvents", evidenceAdapters.fetchThaiCompanyEvents],
      ["filings", evidenceAdapters.fetchThaiFilings]]) {
      try {
        const r = await fn(probeSym, null, { months: EVIDENCE_MONTHS });
        sources[key] = { inspected: !!r.inspected, source: r.source || null, asOf: r.asOf || null,
          coverage: r.coverage || null, degraded: !!r.degraded, reason: r.reason || null };
        if (r.inspected) anyOk = true;
      } catch (error) {
        sources[key] = { inspected: false, source: null, asOf: null, coverage: null,
          degraded: true, reason: "DATA_UNAVAILABLE: " + String((error && error.message) || error) };
      }
    }
    evidenceReady = anyOk;
    const ce = sources.companyEvents || {};
    evidenceMeta = { source: ce.source || null, asOf: ce.asOf || null, coverage: ce.coverage || null,
      degraded: !!ce.degraded, reason: ce.reason || null, sources };
  }

  // §1 โหลดสัญญาณค้นพบครั้งเดียว (bulk) แล้วแจกตาม ticker
  let discoveryByTicker = null, discoveryMeta = null;
  try {
    const disc = await discoveryRegistry.collectDiscovery({ pages: DISCOVERY_PAGES });
    discoveryMeta = { inspected: !!disc.inspected, total: disc.items.length,
      perSource: disc.perSource, sources: disc.sources };
    if (disc.inspected) {
      discoveryByTicker = { __raw: disc.items };
    }
  } catch (error) {
    discoveryMeta = { inspected: false, total: 0, perSource: null, sources: discoveryRegistry.discoverySourceStatus(),
      reason: "DATA_UNAVAILABLE: " + String((error && error.message) || error) };
  }

  const items = [], failed = [];
  for (const stock of batch) {
    try {
      const hist = await fetchHistory(stock.providerSymbol);
      if (!hist.closes.length) throw new Error("ไม่มีข้อมูลราคา");

      // ---- ระนาบหลักฐาน ----
      let evidence = null;
      if (evidenceReady) {
        const collected = await evidenceAdapters.collectRawEvidence(
          stock.displaySymbol, null, { months: EVIDENCE_MONTHS }, EvidenceClassifier
        );
        if (collected.inspected) {
          const ce = collected.perSource.companyEvents || {};
          const fi = collected.perSource.filings || {};
          evidence = {
            inspected: true,
            totalDisclosures: ce.count == null ? null : ce.count,
            routineCount: ce.routine == null ? null : ce.routine,
            unknownCount: ce.unknown == null ? null : ce.unknown,
            filingsCount: fi.count == null ? null : fi.count,
            perSource: collected.perSource,
            // PHASE 3.1 — ส่งผล inflection ไปให้ชั้น qualification ฝั่ง client
            financialInflection: collected.inflection || null,
            // PHASE 3.2 — value trap จากงบไทย + insider activity (ประเมินฝั่ง server)
            valueTrapThai: collected.valueTrap || null,
            insiderActivity: collected.insider || null,
            items: collected.items,
            note: "ตรวจข้อมูลเผยแพร่ " + (ce.count || 0) + " รายการ · เอกสาร ก.ล.ต. " + (fi.count || 0) + " รายการ",
          };
        }
      }
      if (!evidence) {
        evidence = { inspected: false, totalDisclosures: null, routineCount: null,
          unknownCount: null, filingsCount: null, perSource: null, items: [],
          note: (evidenceMeta && evidenceMeta.reason) || "DATA_UNAVAILABLE: ยังตรวจแหล่งหลักฐานไม่สำเร็จ" };
      }

      // ส่งสัญญาณค้นพบดิบทั้งชุดไปให้ฝั่ง client จัดกลุ่ม (ticker ถูกสกัดที่นั่นด้วยกฎเดียวกัน)
      items.push({
        evidence,
        ticker: stock.displaySymbol,
        providerSymbol: stock.providerSymbol,
        name: stock.name,
        market: stock.market,
        universe: stock.universe,
        currency: stock.currency,
        dates: hist.dates,
        closes: hist.closes,
        volumes: hist.volumes,
        source: hist.source,
        sourceType: hist.sourceType,
        range: hist.range,
        rangeWarning: hist.rangeWarning || null,
        bars: hist.closes.length,
      });
    } catch (error) {
      failed.push({ ticker: stock.displaySymbol, name: stock.name, market: stock.market,
        errorMessage: String((error && error.message) || error) });
    }
  }

  send(res, 200, {
    universe,
    universeMeta,
    discoveryMeta,
    // สัญญาณค้นพบเป็นชุดกลาง (ไม่แยกตาม ticker) เพราะ ticker ถูกสกัดฝั่ง client
    // ด้วยกฎอนุรักษ์นิยมเดียวกัน — ส่งครั้งเดียวไม่ซ้ำต่อ ticker
    discoverySignals: discoveryByTicker ? discoveryByTicker.__raw : [],
    evidenceMeta: Object.assign({ ready: evidenceReady, months: EVIDENCE_MONTHS,
      adapters: evidenceAdapters.adapterStatus() }, evidenceMeta || {}),
    total: stocks.length,
    offset,
    limit,
    scanned: batch.length,
    nextOffset: offset + batch.length < stocks.length ? offset + batch.length : null,
    done: offset + batch.length >= stocks.length,
    generatedAt: new Date().toISOString(),
    benchmark: { symbol: BENCH_SYMBOL, closes: bench.closes || null,
      available: Array.isArray(bench.closes) && bench.closes.length > 0,
      note: bench.closes ? null : "ดึงดัชนี SET ไม่สำเร็จ — relative strength จะไม่ถูกคำนวณ" },
    items,
    failed,
  });
};

module.exports.__internals = { toSeries, fetchHistory, BENCH_SYMBOL, RANGE };
