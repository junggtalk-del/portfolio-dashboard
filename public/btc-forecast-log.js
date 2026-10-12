(function () {
  "use strict";
  // ============================================================
  // BTC FORECAST LOG — เก็บ "คำทำนายตอนที่ทำนาย" ไว้เทียบกับราคาจริงภายหลัง
  //
  // หลักการเดียวที่ห้ามละเมิด:
  //   snapshot ต้องถูกแช่แข็งไว้ ณ วันที่ทำนาย ห้ามคำนวณย้อนหลังใหม่
  //   ถ้าเปิดหน้าใหม่แล้วตัวเลขคำทำนายเก่าขยับ = track record ไร้ความหมาย
  //   ราคาจริงต้องมาจากข้อมูลราคาจริงเท่านั้น ห้ามเอาโมเดลมาเติมให้ตัวเอง
  //
  // ชั้นนี้เป็น pure logic — ไม่แตะ DOM / fetch / localStorage
  // การอ่านเขียน storage อยู่ที่ global-liquidity-page.js
  // ============================================================

  var VERSION = 1;
  var MAX_ENTRIES = 400;          // ~8 ปีถ้าบันทึกสัปดาห์ละครั้ง
  var WEEK_MS = 7 * 24 * 3600 * 1000;

  function fin(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function r2(v) { return v == null || !isFinite(v) ? null : Math.round(v * 100) / 100; }
  function isYmd(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function ymdMs(s) {
    if (!isYmd(s)) return null;
    var ms = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return isFinite(ms) ? ms : null;
  }
  function toYmd(ms) {
    if (!isFinite(ms)) return null;
    return new Date(ms).toISOString().slice(0, 10);
  }

  // ------------------------------------------------------------
  // สร้าง snapshot จากผลของ global-liquidity-engine
  //   result   = ผลลัพธ์ของ GlobalLiquidity.compute()
  //   takenAt  = วันที่บันทึก (YYYY-MM-DD) — ปกติคือวันนี้
  // คืน null ถ้าไม่มีอะไรให้บันทึก (ไม่สร้างของปลอมขึ้นมา)
  // ------------------------------------------------------------
  function buildSnapshot(result, takenAt) {
    if (!result || !result.available || !result.projection) return null;
    var P = result.projection;
    if (!P.points || !P.points.length) return null;
    if (!isYmd(takenAt)) return null;

    var weeks = result.weeks || [];
    var lastW = null;
    for (var i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i] && weeks[i].btcClose != null) { lastW = weeks[i]; break; }
    }
    if (!lastW) return null;

    var pts = [];
    for (var p = 0; p < P.points.length; p++) {
      var pt = P.points[p];
      if (pt.price == null) continue;
      // วันเป้าหมาย = สัปดาห์ล่าสุดที่มีราคาจริง + จำนวนสัปดาห์ข้างหน้า
      var tgtMs = ymdMs(lastW.date);
      if (tgtMs == null) continue;
      tgtMs += pt.weeksAhead * WEEK_MS;
      pts.push({
        targetDate: toYmd(tgtMs),
        weeksAhead: pt.weeksAhead,
        price: r2(pt.price),
        lo68: pt.priceLo68 == null ? null : r2(pt.priceLo68),
        hi68: pt.priceHi68 == null ? null : r2(pt.priceHi68),
        lo95: pt.priceLo95 == null ? null : r2(pt.priceLo95),
        hi95: pt.priceHi95 == null ? null : r2(pt.priceHi95),
        basis: pt.priceBasis
      });
    }
    if (!pts.length) return null;

    return {
      v: VERSION,
      takenAt: takenAt,
      // ราคาจริง ณ ตอนทำนาย — จุดอ้างอิงว่า "ตอนนั้นราคาเท่านี้"
      spotAt: lastW.date,
      spot: r2(lastW.btcClose),
      lagWeeks: P.lagWeeks,
      // เก็บความแม่นของโมเดลไว้ด้วย จะได้รู้ว่าตอนนั้นโมเดลมั่นใจแค่ไหน
      r2Pct: P.explainedPct,
      slope: P.slope,
      n: P.n,
      points: pts
    };
  }

  // ------------------------------------------------------------
  // ควรบันทึกใหม่ไหม — สัปดาห์ละครั้ง
  // เทียบจาก takenAt ของรายการล่าสุด ไม่ใช่เวลาที่เปิดหน้า
  // ------------------------------------------------------------
  function shouldCapture(log, todayYmd, minDays) {
    if (!isYmd(todayYmd)) return false;
    var gap = minDays == null ? 7 : minDays;
    var entries = (log && log.entries) || [];
    if (!entries.length) return true;
    var newest = null;
    for (var i = 0; i < entries.length; i++) {
      var d = ymdMs(entries[i].takenAt);
      if (d != null && (newest == null || d > newest)) newest = d;
    }
    if (newest == null) return true;
    var today = ymdMs(todayYmd);
    if (today == null) return false;
    // วันในอนาคตเทียบกับรายการล่าสุด (นาฬิกาเพี้ยน) → ไม่บันทึกซ้ำ
    if (today < newest) return false;
    return (today - newest) / 86400000 >= gap;
  }

  // ------------------------------------------------------------
  // เพิ่ม snapshot ลง log — append only
  // ถ้า takenAt ซ้ำกับรายการเดิม ให้แทนที่รายการนั้น (กันกดซ้ำในวันเดียว)
  // ------------------------------------------------------------
  function addSnapshot(log, snap) {
    var base = { v: VERSION, entries: [] };
    if (log && Array.isArray(log.entries)) base.entries = log.entries.slice();
    if (!snap || !isYmd(snap.takenAt)) return base;

    var replaced = false;
    for (var i = 0; i < base.entries.length; i++) {
      if (base.entries[i] && base.entries[i].takenAt === snap.takenAt) {
        base.entries[i] = snap; replaced = true; break;
      }
    }
    if (!replaced) base.entries.push(snap);

    base.entries.sort(function (a, b) {
      var x = ymdMs(a && a.takenAt) || 0, y = ymdMs(b && b.takenAt) || 0;
      return x - y;
    });
    if (base.entries.length > MAX_ENTRIES) {
      base.entries = base.entries.slice(base.entries.length - MAX_ENTRIES);
    }
    return base;
  }

  // ------------------------------------------------------------
  // หาราคาจริง ณ วันเป้าหมาย จากแท่งราคาจริง
  // ใช้ "ราคาล่าสุดที่ไม่เกินวันนั้น" และต้องไม่ห่างเกิน maxGapDays
  // คืน null ถ้ายังไม่ถึงวัน หรือข้อมูลขาด — ห้ามเดา
  // ------------------------------------------------------------
  function actualAt(bars, targetYmd, maxGapDays) {
    if (!Array.isArray(bars) || !bars.length || !isYmd(targetYmd)) return null;
    var gap = maxGapDays == null ? 10 : maxGapDays;
    var tgt = ymdMs(targetYmd);
    if (tgt == null) return null;
    var best = null;
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (!b || !isYmd(b.date)) continue;
      var c = fin(b.close);
      if (c == null || !(c > 0)) continue;
      var ms = ymdMs(b.date);
      if (ms == null || ms > tgt) continue;
      if (best == null || ms > best.ms) best = { ms: ms, date: b.date, close: c };
    }
    if (!best) return null;
    if ((tgt - best.ms) / 86400000 > gap) return null;
    return { date: best.date, close: best.close };
  }

  // ------------------------------------------------------------
  // ประเมินผล: เทียบคำทำนายที่ถึงกำหนดแล้วกับราคาจริง
  //   log  = { entries: [...] }
  //   bars = [{date, close}] ราคาจริงรายวัน
  // จุดที่ยังไม่ถึงกำหนด = pending (ไม่นับเข้าสถิติ)
  // ------------------------------------------------------------
  function evaluate(log, bars, todayYmd, opts) {
    var o = opts || {};
    var maxGap = o.maxGapDays == null ? 10 : o.maxGapDays;
    var entries = (log && log.entries) || [];
    var rows = [];
    var today = isYmd(todayYmd) ? ymdMs(todayYmd) : null;

    for (var e = 0; e < entries.length; e++) {
      var en = entries[e];
      if (!en || !Array.isArray(en.points)) continue;
      for (var p = 0; p < en.points.length; p++) {
        var pt = en.points[p];
        if (!pt || pt.price == null || !isYmd(pt.targetDate)) continue;
        var tMs = ymdMs(pt.targetDate);
        var due = today == null ? true : tMs <= today;
        var act = due ? actualAt(bars, pt.targetDate, maxGap) : null;

        var row = {
          takenAt: en.takenAt,
          targetDate: pt.targetDate,
          weeksAhead: pt.weeksAhead,
          basis: pt.basis,
          spot: en.spot,
          predicted: pt.price,
          lo68: pt.lo68, hi68: pt.hi68,
          lo95: pt.lo95, hi95: pt.hi95,
          r2Pct: en.r2Pct,
          status: due ? (act ? "scored" : "no-data") : "pending",
          actual: act ? r2(act.close) : null,
          actualDate: act ? act.date : null,
          diffUsd: null, diffPct: null, absPct: null,
          in68: null, in95: null, direction: null, naiveDiffPct: null, beatNaive: null
        };

        if (act) {
          var a = act.close;
          row.diffUsd = r2(pt.price - a);                      // + = โมเดลทายสูงไป
          row.diffPct = r2(((pt.price - a) / a) * 100);
          row.absPct = r2(Math.abs(row.diffPct));
          row.in68 = (pt.lo68 != null && pt.hi68 != null) ? (a >= pt.lo68 && a <= pt.hi68) : null;
          row.in95 = (pt.lo95 != null && pt.hi95 != null) ? (a >= pt.lo95 && a <= pt.hi95) : null;
          // ทายทิศถูกไหม — เทียบกับราคาตอนทำนาย
          if (en.spot != null) {
            var predUp = pt.price > en.spot, realUp = a > en.spot;
            row.direction = (predUp === realUp) ? "ถูกทิศ" : "ผิดทิศ";
            // เกณฑ์เปรียบเทียบ: เดาว่า "ราคาไม่เปลี่ยน" แม่นกว่าโมเดลไหม
            row.naiveDiffPct = r2(((en.spot - a) / a) * 100);
            row.beatNaive = Math.abs(row.diffPct) < Math.abs(row.naiveDiffPct);
          }
        }
        rows.push(row);
      }
    }

    rows.sort(function (a, b) {
      var x = ymdMs(a.targetDate) || 0, y = ymdMs(b.targetDate) || 0;
      if (x !== y) return y - x;
      return (a.weeksAhead || 0) - (b.weeksAhead || 0);
    });

    return { rows: rows, summary: summarize(rows), byHorizon: byHorizon(rows) };
  }

  function summarize(rows) {
    var scored = rows.filter(function (r) { return r.status === "scored"; });
    var s = {
      total: rows.length,
      scored: scored.length,
      pending: rows.filter(function (r) { return r.status === "pending"; }).length,
      noData: rows.filter(function (r) { return r.status === "no-data"; }).length,
      maePct: null, medianAbsPct: null, biasPct: null,
      hit68Pct: null, hit95Pct: null,
      directionPct: null, beatNaivePct: null,
      worst: null, best: null
    };
    if (!scored.length) return s;

    var sumAbs = 0, sumSigned = 0, abs = [];
    for (var i = 0; i < scored.length; i++) {
      sumAbs += scored[i].absPct;
      sumSigned += scored[i].diffPct;
      abs.push(scored[i].absPct);
    }
    s.maePct = r2(sumAbs / scored.length);
    s.biasPct = r2(sumSigned / scored.length);
    abs.sort(function (a, b) { return a - b; });
    var m = Math.floor(abs.length / 2);
    s.medianAbsPct = r2(abs.length % 2 ? abs[m] : (abs[m - 1] + abs[m]) / 2);

    var w68 = scored.filter(function (r) { return r.in68 !== null; });
    var w95 = scored.filter(function (r) { return r.in95 !== null; });
    if (w68.length) s.hit68Pct = r2(w68.filter(function (r) { return r.in68; }).length / w68.length * 100);
    if (w95.length) s.hit95Pct = r2(w95.filter(function (r) { return r.in95; }).length / w95.length * 100);

    var wd = scored.filter(function (r) { return r.direction != null; });
    if (wd.length) s.directionPct = r2(wd.filter(function (r) { return r.direction === "ถูกทิศ"; }).length / wd.length * 100);
    var wn = scored.filter(function (r) { return r.beatNaive != null; });
    if (wn.length) s.beatNaivePct = r2(wn.filter(function (r) { return r.beatNaive; }).length / wn.length * 100);

    var sorted = scored.slice().sort(function (a, b) { return b.absPct - a.absPct; });
    s.worst = sorted[0];
    s.best = sorted[sorted.length - 1];
    return s;
  }

  function byHorizon(rows) {
    var map = {}, out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.status !== "scored") continue;
      var k = r.weeksAhead;
      if (!map[k]) map[k] = [];
      map[k].push(r);
    }
    for (var k2 in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k2)) continue;
      var g = map[k2], sum = 0, hits = 0, hasB = 0;
      for (var j = 0; j < g.length; j++) {
        sum += g[j].absPct;
        if (g[j].in95) hits++;
        if (g[j].in95 !== null) hasB++;
      }
      out.push({
        weeksAhead: Number(k2),
        n: g.length,
        maePct: r2(sum / g.length),
        hit95Pct: hasB ? r2(hits / hasB * 100) : null
      });
    }
    out.sort(function (a, b) { return a.weeksAhead - b.weeksAhead; });
    return out;
  }

  // ------------------------------------------------------------
  // ตรวจความถูกต้องของ log ที่นำเข้ามา (ไฟล์อาจถูกแก้มา)
  // ------------------------------------------------------------
  function sanitize(raw) {
    var out = { v: VERSION, entries: [] };
    if (!raw || !Array.isArray(raw.entries)) return out;
    for (var i = 0; i < raw.entries.length; i++) {
      var e = raw.entries[i];
      if (!e || !isYmd(e.takenAt) || !Array.isArray(e.points)) continue;
      var pts = [];
      for (var p = 0; p < e.points.length; p++) {
        var pt = e.points[p];
        if (!pt || !isYmd(pt.targetDate)) continue;
        var pr = fin(pt.price);
        if (pr == null || !(pr > 0)) continue;
        pts.push({
          targetDate: pt.targetDate,
          weeksAhead: fin(pt.weeksAhead) || 0,
          price: r2(pr),
          lo68: fin(pt.lo68), hi68: fin(pt.hi68),
          lo95: fin(pt.lo95), hi95: fin(pt.hi95),
          basis: pt.basis === "observed" || pt.basis === "chained" ? pt.basis : null
        });
      }
      if (!pts.length) continue;
      out.entries.push({
        v: VERSION,
        takenAt: e.takenAt,
        spotAt: isYmd(e.spotAt) ? e.spotAt : null,
        spot: fin(e.spot),
        lagWeeks: fin(e.lagWeeks),
        r2Pct: fin(e.r2Pct),
        slope: fin(e.slope),
        n: fin(e.n),
        points: pts
      });
    }
    out.entries.sort(function (a, b) { return (ymdMs(a.takenAt) || 0) - (ymdMs(b.takenAt) || 0); });
    if (out.entries.length > MAX_ENTRIES) out.entries = out.entries.slice(out.entries.length - MAX_ENTRIES);
    return out;
  }

  var API = {
    VERSION: VERSION,
    MAX_ENTRIES: MAX_ENTRIES,
    buildSnapshot: buildSnapshot,
    shouldCapture: shouldCapture,
    addSnapshot: addSnapshot,
    actualAt: actualAt,
    evaluate: evaluate,
    sanitize: sanitize,
    _internal: { summarize: summarize, byHorizon: byHorizon, ymdMs: ymdMs, toYmd: toYmd }
  };

  if (typeof window !== "undefined") window.BtcForecastLog = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
