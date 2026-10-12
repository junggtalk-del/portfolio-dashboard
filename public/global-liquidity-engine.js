(function () {
  "use strict";
  // ============================================================
  // GLOBAL LIQUIDITY (BALI) → BITCOIN
  //
  // คำถามเดียวที่ตอบ: "สภาพคล่องรวมของธนาคารกลางใหญ่สามแห่งกำลังเร่งหรือชะลอ
  // และที่ผ่านมามันนำราคา Bitcoin จริงไหม กี่สัปดาห์"
  //
  // BALI = Fed + ECB + BOJ รวมเป็นสกุล USD แล้วดู %เปลี่ยนแปลง N สัปดาห์
  //
  // สิ่งที่โมดูลนี้ "ไม่ใช่":
  //   • ไม่ใช่สัญญาณซื้อขาย · ไม่มีคะแนน · ไม่จัดอันดับ
  //   • ไม่ใช่การพยากรณ์ — ความสัมพันธ์ในอดีตไม่ใช่คำมั่นว่าจะเกิดซ้ำ
  //   • ไม่เติมข้อมูลที่ไม่มี — สัปดาห์ไหนธนาคารกลางยังไม่ออกตัวเลข จะถูกทำเครื่องหมาย
  //     ว่า "ไม่ครบ" และไม่ถูกนำไปคิด %เปลี่ยนแปลง
  //
  // ข้อจำกัดที่ต้องบอกผู้ใช้เสมอ (ไม่ใช่ซ่อนไว้):
  //   • BOJ เป็นข้อมูล "รายเดือน" — ระหว่างเดือนใช้ค่าเดิมลากไป (carry-forward)
  //   • ECB ออกช้ากว่า Fed ราว 1-2 สัปดาห์ — สัปดาห์ท้าย ๆ จึงมักยังไม่ครบ
  //   • ห้ามออก NaN / Infinity / undefined จากทุกฟิลด์ที่เป็นตัวเลข
  // ============================================================

  var VERSION = "1.0.0";

  var DEFAULTS = {
    changeWeeks: 6,      // หน้าต่าง %เปลี่ยนแปลง (กราฟต้นฉบับใช้ 6 สัปดาห์)
    leadWeeks: 14,       // เลื่อน BALI ไปข้างหน้ากี่สัปดาห์ตอนแสดงผล
    maxEcbGapDays: 14,   // ECB เก่ากว่านี้ = สัปดาห์นั้นไม่ครบ
    maxBojGapDays: 50,   // BOJ รายเดือน — ยอมให้เก่าได้ถึง ~7 สัปดาห์
    maxFxGapDays: 10,
    lagScanMax: 26       // ไล่หา lag ที่สัมพันธ์สูงสุด 0-26 สัปดาห์
  };

  // ---------------- utils ----------------
  function fin(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function r2(v) { return v == null || !isFinite(v) ? null : Math.round(v * 100) / 100; }
  function isYmd(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function ymdMs(s) {
    if (!isYmd(s)) return null;
    var ms = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return isFinite(ms) ? ms : null;
  }
  function daysBetween(a, b) {
    var x = ymdMs(a), y = ymdMs(b);
    return x == null || y == null ? null : Math.round((y - x) / 86400000);
  }

  // หาค่าล่าสุดที่ "ไม่ใหม่กว่า" วันที่กำหนด — ห้ามมองอนาคต
  // rows ต้องเรียงจากเก่าไปใหม่แล้ว
  function latestAtOrBefore(rows, date) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var lo = 0, hi = rows.length - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (rows[mid].date <= date) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    if (best < 0) return null;
    var row = rows[best];
    var v = fin(row.value);
    if (v == null) return null;
    return { date: row.date, value: v, ageDays: daysBetween(row.date, date) };
  }

  function rowsOf(payload, key) {
    var s = payload && payload.series && payload.series[key];
    if (!s || s.ok === false || !Array.isArray(s.rows)) return [];
    return s.rows;
  }

  // สหสัมพันธ์เพียร์สัน — คืน null เมื่อข้อมูลน้อยเกินไปหรือไม่มีความแปรปรวน
  function pearson(xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 8) return null;
    var sx = 0, sy = 0, i;
    for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
    var mx = sx / n, my = sy / n;
    var num = 0, dx = 0, dy = 0;
    for (i = 0; i < n; i++) {
      var a = xs[i] - mx, b = ys[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    if (!(dx > 0) || !(dy > 0)) return null;
    var r = num / Math.sqrt(dx * dy);
    return isFinite(r) ? r : null;
  }

  // ถดถอยเชิงเส้นอย่างง่าย — คืน null เมื่อข้อมูลน้อยหรือ x ไม่มีความแปรปรวน
  function ols(xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 10) return null;
    var sx = 0, sy = 0, i;
    for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
    var mx = sx / n, my = sy / n;
    var sxx = 0, sxy = 0, syy = 0;
    for (i = 0; i < n; i++) {
      var dx = xs[i] - mx, dy = ys[i] - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    }
    if (!(sxx > 0) || !(syy > 0)) return null;
    var slope = sxy / sxx;
    var intercept = my - slope * mx;
    // ความคลาดเคลื่อนมาตรฐานของส่วนที่เหลือ
    var ss = 0;
    for (i = 0; i < n; i++) {
      var e = ys[i] - (intercept + slope * xs[i]);
      ss += e * e;
    }
    var se = Math.sqrt(ss / Math.max(1, n - 2));
    var r = sxy / Math.sqrt(sxx * syy);
    if (!isFinite(slope) || !isFinite(intercept) || !isFinite(se) || !isFinite(r)) return null;
    return { slope: slope, intercept: intercept, se: se, r: r, r2: r * r, n: n, meanX: mx, sxx: sxx };
  }

  // ช่วงพยากรณ์ของ "ค่าสังเกตใหม่" (ไม่ใช่ช่วงของค่าเฉลี่ย) — จึงมี 1 + ... ในราก
  function predictBand(fit, x0) {
    var yhat = fit.intercept + fit.slope * x0;
    var lev = 1 + 1 / fit.n + Math.pow(x0 - fit.meanX, 2) / fit.sxx;
    var sd = fit.se * Math.sqrt(lev);
    return {
      fit: yhat,
      lo68: yhat - sd, hi68: yhat + sd,
      lo95: yhat - 1.96 * sd, hi95: yhat + 1.96 * sd
    };
  }

  // ============================================================
  // compute
  //   payload = ผลจาก /api/global-liquidity
  //   btcBars = [{date, close}] รายวัน (เรียงเก่า → ใหม่)
  // ============================================================
  function compute(payload, btcBars, opts) {
    var o = {};
    var k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) o[k] = DEFAULTS[k];
    if (opts) for (k in opts) if (Object.prototype.hasOwnProperty.call(opts, k) && fin(opts[k]) != null) o[k] = fin(opts[k]);

    var empty = {
      version: VERSION, available: false, reason: "no-data", weeks: [], latest: null,
      asOf: null, options: o, notes: [], lagScan: [], bestLag: null, projection: null, coverage: null
    };
    if (!payload || !payload.series) { empty.reason = "no-payload"; return empty; }

    var fed = rowsOf(payload, "fed");
    var ecb = rowsOf(payload, "ecb");
    var boj = rowsOf(payload, "boj");
    var fxEur = rowsOf(payload, "usdPerEur");
    var fxJpy = rowsOf(payload, "jpyPerUsd");
    if (!fed.length) { empty.reason = "no-fed"; return empty; }

    // ---- ราคา BTC: ยุบเป็นรายสัปดาห์ด้วย "ราคาปิดล่าสุดที่ไม่เกินวันนั้น" ----
    var btcRows = [];
    if (Array.isArray(btcBars)) {
      for (var b = 0; b < btcBars.length; b++) {
        var bar = btcBars[b];
        if (!bar || !isYmd(bar.date)) continue;
        var c = fin(bar.close);
        if (c == null || !(c > 0)) continue;
        btcRows.push({ date: bar.date, value: c });
      }
    }

    // ---- กริดรายสัปดาห์ยึดตาม Fed (WALCL ถี่สุดและสดสุด) ----
    var weeks = [];
    for (var i = 0; i < fed.length; i++) {
      var d = fed[i].date;
      if (!isYmd(d)) continue;
      var fedV = fin(fed[i].value);
      if (fedV == null) continue;

      var e = latestAtOrBefore(ecb, d);
      var j = latestAtOrBefore(boj, d);
      var fe = latestAtOrBefore(fxEur, d);
      var fj = latestAtOrBefore(fxJpy, d);

      // แปลงเป็นล้าน USD ทุกก้อน
      //   Fed : WALCL เป็นล้าน USD อยู่แล้ว
      //   ECB : ล้าน EUR × (USD ต่อ EUR)
      //   BOJ : 100 ล้าน JPY × 100 = ล้าน JPY แล้วหารด้วย (JPY ต่อ USD)
      var ecbUsd = e && fe && fe.value > 0 ? e.value * fe.value : null;
      var bojUsd = j && fj && fj.value > 0 ? (j.value * 100) / fj.value : null;

      var ecbFresh = !!(e && fe && e.ageDays != null && e.ageDays <= o.maxEcbGapDays &&
        fe.ageDays != null && fe.ageDays <= o.maxFxGapDays);
      var bojFresh = !!(j && fj && j.ageDays != null && j.ageDays <= o.maxBojGapDays &&
        fj.ageDays != null && fj.ageDays <= o.maxFxGapDays);
      var complete = ecbUsd != null && bojUsd != null && ecbFresh && bojFresh;

      var btc = latestAtOrBefore(btcRows, d);

      weeks.push({
        date: d,
        fedUsd: fedV,
        ecbUsd: ecbUsd,
        bojUsd: bojUsd,
        totalUsd: complete ? fedV + ecbUsd + bojUsd : null,
        complete: complete,
        ecbDate: e ? e.date : null, ecbAgeDays: e ? e.ageDays : null,
        bojDate: j ? j.date : null, bojAgeDays: j ? j.ageDays : null,
        bojCarried: !!(j && j.ageDays != null && j.ageDays > 7),
        btcClose: btc ? btc.value : null,
        btcDate: btc ? btc.date : null,
        baliPct: null, btcPct: null
      });
    }
    if (!weeks.length) { empty.reason = "no-weeks"; return empty; }

    // ---- %เปลี่ยนแปลง N สัปดาห์ (คิดเฉพาะเมื่อ "ครบทั้งสองปลาย") ----
    var W = Math.max(1, Math.round(o.changeWeeks));
    for (var w = 0; w < weeks.length; w++) {
      var cur = weeks[w], prev = weeks[w - W];
      if (prev && cur.complete && prev.complete && prev.totalUsd > 0) {
        var bp = (cur.totalUsd / prev.totalUsd - 1) * 100;
        cur.baliPct = isFinite(bp) ? bp : null;
      }
      if (prev && cur.btcClose != null && prev.btcClose != null && prev.btcClose > 0) {
        var tp = (cur.btcClose / prev.btcClose - 1) * 100;
        cur.btcPct = isFinite(tp) ? tp : null;
      }
    }

    // ---- ไล่หา lag ที่สัมพันธ์สูงสุด: BALI(t) เทียบ BTC(t+lag) ----
    // ทำไมต้องมี: เลข 14 สัปดาห์เป็น "สมมติฐานของกราฟต้นฉบับ" ไม่ใช่ข้อเท็จจริง
    // ถ้าข้อมูลจริงบอกตัวเลขอื่น ผู้ใช้ควรเห็น ไม่ใช่เชื่อตามโดยไม่ตรวจ
    var lagScan = [];
    var maxLag = Math.max(0, Math.round(o.lagScanMax));
    for (var L = 0; L <= maxLag; L++) {
      var xs = [], ys = [];
      for (var t = 0; t + L < weeks.length; t++) {
        var a = weeks[t].baliPct, y = weeks[t + L].btcPct;
        if (a == null || y == null) continue;
        xs.push(a); ys.push(y);
      }
      var corr = pearson(xs, ys);
      lagScan.push({ lagWeeks: L, corr: corr == null ? null : r2(corr * 100) / 100, n: xs.length });
    }
    var bestLag = null;
    for (var s = 0; s < lagScan.length; s++) {
      var row = lagScan[s];
      if (row.corr == null) continue;
      if (!bestLag || row.corr > bestLag.corr) bestLag = { weeks: row.lagWeeks, corr: row.corr, n: row.n };
    }

    // ---- เส้นถดถอย + ช่วงความน่าจะเป็น สำหรับโซนล่วงหน้า ----
    // ใช้ lag ที่ fit ที่สุดจากข้อมูล ไม่ใช่เลขที่ตั้งไว้เอง
    // สำคัญ: r² ต่ำ ⇒ ช่วงจะกว้างมาก — นั่นคือ "คำตอบ" ไม่ใช่ข้อบกพร่องที่ต้องซ่อน
    var projection = null;
    if (bestLag && bestLag.weeks >= 0) {
      var PL = bestLag.weeks;
      var px = [], py = [];
      for (var ft = 0; ft + PL < weeks.length; ft++) {
        var fx = weeks[ft].baliPct, fy = weeks[ft + PL].btcPct;
        if (fx == null || fy == null) continue;
        px.push(fx); py.push(fy);
      }
      var fit = ols(px, py);
      if (fit) {
        var pts = [];
        // แปลง %เปลี่ยนเป็น "ราคา" ต้องมีฐานที่ถูกตัวเท่านั้น:
        //   btcPct[j] = close[j]/close[j-W] - 1   ⇒   close[j] = close[j-W] × (1+pct)
        // ฐานคือราคาเมื่อ W สัปดาห์ก่อนช่องนั้น ไม่ใช่ "ราคาล่าสุด"
        // ถ้าฐานตกอยู่ในโซนล่วงหน้าเอง = ต้องเอาค่าประมาณมาเป็นฐานของค่าประมาณ
        // ความคลาดเคลื่อนจะทบกันสองชั้น จึงติดธง priceBasis ไว้ให้หน้าเว็บแยกแสดง
        var estClose = {};      // plotIndex → ราคาประมาณ (ใช้ต่อฐานสำหรับช่องถัดไป)
        function baseCloseAt(idx) {
          if (idx >= 0 && idx < weeks.length && weeks[idx].btcClose != null) {
            return { value: weeks[idx].btcClose, real: true };
          }
          if (estClose[idx] != null) return { value: estClose[idx], real: false };
          return null;
        }
        function priceOf(base, pct) {
          if (base == null || pct == null) return null;
          var v = base * (1 + pct / 100);
          return isFinite(v) && v > 0 ? v : null;
        }
        // ทุกช่องที่ "รู้ BALI แล้วแต่ยังไม่มี BTC" = โซนล่วงหน้าที่ประมาณการได้
        for (var sIdx2 = weeks.length - PL; sIdx2 < weeks.length; sIdx2++) {
          if (sIdx2 < 0) continue;
          var srcW = weeks[sIdx2];
          if (srcW.baliPct == null) continue;
          var ahead = sIdx2 + PL - (weeks.length - 1);   // ห่างจากสัปดาห์ล่าสุดกี่สัปดาห์
          var band = predictBand(fit, srcW.baliPct);
          var plotI = sIdx2 + PL;
          var baseInfo = baseCloseAt(plotI - W);
          var bv = baseInfo ? baseInfo.value : null;
          var pFit = priceOf(bv, band.fit);
          if (pFit != null) estClose[plotI] = pFit;
          pts.push({
            sourceDate: srcW.date,
            sourceIndex: sIdx2,
            plotIndex: plotI,
            weeksAhead: ahead,
            baliPct: r2(srcW.baliPct),
            fitPct: r2(band.fit),
            lo68: r2(band.lo68), hi68: r2(band.hi68),
            lo95: r2(band.lo95), hi95: r2(band.hi95),
            // ---- ราคา BTC ที่ %เปลี่ยนข้างบนแปลว่าอะไร ----
            baseClose: bv == null ? null : r2(bv),
            baseIndex: plotI - W,
            // "observed" = ฐานเป็นราคาจริงที่เกิดขึ้นแล้ว
            // "chained"  = ฐานเป็นค่าประมาณอีกที (คลาดเคลื่อนทบสองชั้น)
            priceBasis: baseInfo == null ? null : (baseInfo.real ? "observed" : "chained"),
            price: pFit == null ? null : r2(pFit),
            priceLo68: priceOf(bv, band.lo68) == null ? null : r2(priceOf(bv, band.lo68)),
            priceHi68: priceOf(bv, band.hi68) == null ? null : r2(priceOf(bv, band.hi68)),
            priceLo95: priceOf(bv, band.lo95) == null ? null : r2(priceOf(bv, band.lo95)),
            priceHi95: priceOf(bv, band.hi95) == null ? null : r2(priceOf(bv, band.hi95))
          });
        }
        projection = {
          lagWeeks: PL,
          slope: r2(fit.slope), intercept: r2(fit.intercept),
          r: r2(fit.r), r2: r2(fit.r2 * 100) / 100,
          residualSd: r2(fit.se), n: fit.n,
          explainedPct: r2(fit.r2 * 100),
          points: pts,
          // กว้างของช่วง 95% โดยเฉลี่ย — ตัวเลขเดียวที่บอกได้ว่า "ใช้ตัดสินใจไม่ได้"
          typicalBand95: pts.length ? r2((pts[0].hi95 - pts[0].lo95)) : null,
          // ราคาเป็นบาท/ดอลลาร์คิดจากฐาน W สัปดาห์ก่อนหน้าช่องนั้น
          priceAnchorWeeks: W,
          observedBasisCount: (function () {
            var c = 0;
            for (var i2 = 0; i2 < pts.length; i2++) if (pts[i2].priceBasis === "observed") c++;
            return c;
          })(),
          method: "OLS ของ BTC %เปลี่ยน " + W + " สัปดาห์ ที่ t+" + PL + " เทียบ BALI ที่ t",
          warning: fit.r2 < 0.1
            ? "ความสัมพันธ์อธิบายได้เพียง " + r2(fit.r2 * 100) + "% ของความเคลื่อนไหว — เส้นประนี้มีค่าเท่ากับ 'ค่าเฉลี่ยที่เอียงเล็กน้อย' ไม่ใช่การพยากรณ์ที่ใช้ตัดสินใจได้"
            : null
        };
      }
    }

    // ---- ความครบถ้วนของข้อมูล ----
    var completeCount = 0, carriedCount = 0;
    for (var cI = 0; cI < weeks.length; cI++) {
      if (weeks[cI].complete) completeCount++;
      if (weeks[cI].bojCarried) carriedCount++;
    }
    var lastComplete = null;
    for (var lc = weeks.length - 1; lc >= 0; lc--) if (weeks[lc].complete) { lastComplete = weeks[lc]; break; }

    var sFed = payload.series.fed || {}, sEcb = payload.series.ecb || {},
      sBoj = payload.series.boj || {}, sFx = payload.series.usdPerEur || {};
    var asOf = {
      fed: sFed.lastDate || null,
      ecb: sEcb.lastDate || null,
      boj: sBoj.lastDate || null,
      fx: sFx.lastDate || null,
      combined: lastComplete ? lastComplete.date : null
    };

    var notes = [];
    notes.push("BALI = งบดุล Fed + ECB + BOJ แปลงเป็น USD แล้วดู %เปลี่ยนแปลง " + W + " สัปดาห์");
    if (carriedCount) {
      notes.push("BOJ เป็นข้อมูลรายเดือน — " + carriedCount + " สัปดาห์ใช้ค่าเดือนก่อนหน้าลากมา (carry-forward) ไม่ใช่ตัวเลขใหม่รายสัปดาห์");
    }
    if (asOf.fed && asOf.ecb && asOf.fed > asOf.ecb) {
      notes.push("ECB ออกช้ากว่า Fed — ล่าสุด Fed ถึง " + asOf.fed + " แต่ ECB ถึง " + asOf.ecb +
        " สัปดาห์หลังจากนั้นจึงยังไม่ครบสามธนาคารและไม่ถูกนำมาคิด");
    }
    notes.push("เส้น BALI ถูกเลื่อนไปข้างหน้า " + Math.round(o.leadWeeks) +
      " สัปดาห์ตอนแสดงผล — เป็นสมมติฐานเรื่องความนำ ไม่ใช่การพยากรณ์ราคา");

    return {
      version: VERSION,
      available: true,
      reason: null,
      options: o,
      weeks: weeks,
      latest: lastComplete,
      asOf: asOf,
      coverage: {
        totalWeeks: weeks.length,
        completeWeeks: completeCount,
        bojCarriedWeeks: carriedCount,
        incompleteTail: weeks.length - (lastComplete ? weeks.indexOf(lastComplete) + 1 : 0)
      },
      lagScan: lagScan,
      bestLag: bestLag,
      projection: projection,
      notes: notes,
      disclaimer: "ความสัมพันธ์ที่วัดได้เป็นข้อเท็จจริงเชิงสถิติในอดีต ไม่ใช่คำแนะนำการลงทุนและไม่รับประกันว่าจะเกิดซ้ำ"
    };
  }

  // จุดบนกราฟ: BALI ของสัปดาห์ t ถูกวางที่สัปดาห์ t + leadWeeks
  // คืน "คู่วันที่" ให้ชั้นแสดงผลใช้ตรง ๆ ไม่ต้องคำนวณเอง
  function leadSeries(result) {
    if (!result || !result.available) return [];
    var lead = Math.max(0, Math.round(result.options.leadWeeks));
    var weeks = result.weeks, out = [];
    for (var i = 0; i < weeks.length; i++) {
      if (weeks[i].baliPct == null) continue;
      var target = weeks[i + lead];
      out.push({
        sourceDate: weeks[i].date,
        plotDate: target ? target.date : null,     // null = เลยปลายข้อมูลไปแล้ว (โซนล่วงหน้า)
        plotIndex: i + lead,
        baliPct: weeks[i].baliPct,
        future: !target
      });
    }
    return out;
  }

  var GlobalLiquidity = {
    VERSION: VERSION,
    DEFAULTS: DEFAULTS,
    compute: compute,
    leadSeries: leadSeries,
    _internal: { fin: fin, latestAtOrBefore: latestAtOrBefore, pearson: pearson, daysBetween: daysBetween, ols: ols, predictBand: predictBand }
  };

  if (typeof window !== "undefined") window.GlobalLiquidity = GlobalLiquidity;
  if (typeof module !== "undefined" && module.exports) module.exports = GlobalLiquidity;
})();
