(function () {
  "use strict";
  // ============================================================
  // GLOBAL LIQUIDITY — ชั้นแสดงผล (แท็บใน Bitcoin Monitor)
  // อ่านผลจาก global-liquidity-engine.js มาวาด ไม่คิดตรรกะใหม่ที่นี่
  // ============================================================

  var state = { loading: false, error: null, result: null, raw: null, fetchedAt: null, leadWeeks: 14 };
  var YEARS = 8;                 // ดึงย้อนหลังเท่านี้เพื่อให้หา lag ได้มีความหมาย
  var SHOW_WEEKS = 160;          // แสดงบนกราฟราว 3 ปี

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function GL() { return window.GlobalLiquidity; }
  function pct(v, d) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : "") + v.toFixed(d == null ? 1 : d) + "%"; }
  function tn(v) { return v == null || !isFinite(v) ? "—" : "$" + (v / 1e6).toFixed(2) + "T"; }
  // ราคา BTC — ปัดเป็นจำนวนเต็มดอลลาร์พอ ทศนิยมไม่มีความหมายเมื่อช่วงกว้างเป็นหมื่น
  function usd(v) {
    if (v == null || !isFinite(v)) return "—";
    return "$" + Math.round(v).toLocaleString("en-US");
  }
  function thDate(d) {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00Z").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
    } catch (e) { return String(d); }
  }

  // ---------------- โหลดข้อมูล ----------------
  function load(force) {
    if (state.loading) return Promise.resolve();
    state.loading = true; state.error = null;
    emit();
    var start = new Date(Date.now() - (YEARS + 1) * 365.25 * 86400000).toISOString().slice(0, 10);
    return Promise.all([
      fetch("/api/global-liquidity?years=" + YEARS + (force ? "&force=1" : "")).then(function (r) {
        if (!r.ok && r.status !== 503) throw new Error("สภาพคล่อง: HTTP " + r.status);
        return r.json();
      }),
      fetch("/api/ohlc?symbol=BTC-USD&start=" + start).then(function (r) {
        if (!r.ok) throw new Error("ราคา BTC: HTTP " + r.status);
        return r.json();
      })
    ]).then(function (res) {
      var payload = res[0], btc = res[1];
      if (payload && payload.complete === false) {
        throw new Error("ข้อมูลธนาคารกลางยังไม่ครบ (" + (payload.missing || []).join(", ") + ")");
      }
      var bars = (btc && Array.isArray(btc.bars)) ? btc.bars : [];
      state.raw = payload;
      state.bars = bars;                 // เก็บไว้ใช้หาราคาจริงตอนเทียบผลคำทำนาย
      state.result = GL() ? GL().compute(payload, bars, { leadWeeks: state.leadWeeks }) : null;
      state.fetchedAt = new Date().toISOString();
      autoCapture();                     // บันทึกคำทำนายสัปดาห์ละครั้ง
      state.loading = false; emit();
    }).catch(function (e) {
      state.error = String((e && e.message) || e);
      state.loading = false; emit();
    });
  }
  function emit() {
    try { window.dispatchEvent(new CustomEvent("global-liquidity-updated")); } catch (e) {}
  }

  // ---------------- กราฟ ----------------
  function chart(R) {
    var weeks = R.weeks;
    var lead = Math.round(R.options.leadWeeks);
    // ช่วงที่แสดง: ท้าย ๆ SHOW_WEEKS สัปดาห์ แล้วต่อโซนล่วงหน้าอีก lead ช่อง
    var from = Math.max(0, weeks.length - SHOW_WEEKS);
    var n = weeks.length - from + lead;
    if (n < 10) return '<div class="mc-empty">ข้อมูลยังไม่พอวาดกราฟ</div>';

    var W = 960, H = 380, padL = 52, padR = 56, padT = 18, padB = 34;
    var iw = W - padL - padR, ih = H - padT - padB;

    // จุดของ BALI วางที่ตำแหน่ง (index ต้นทาง + lead)
    var baliPts = [], btcPts = [];
    var bMin = null, bMax = null, tMin = null, tMax = null;
    var gi, wk;
    for (gi = 0; gi < n; gi++) {
      var srcIdx = from + gi - lead;        // BALI ที่จะโผล่ตรงช่องนี้ มาจากสัปดาห์ไหน
      if (srcIdx >= 0 && srcIdx < weeks.length) {
        var bv = weeks[srcIdx].baliPct;
        if (bv != null) {
          baliPts.push({ gi: gi, v: bv, src: weeks[srcIdx].date });
          if (bMin == null || bv < bMin) bMin = bv;
          if (bMax == null || bv > bMax) bMax = bv;
        }
      }
      var curIdx = from + gi;
      if (curIdx < weeks.length) {
        wk = weeks[curIdx];
        if (wk.btcPct != null) {
          btcPts.push({ gi: gi, v: wk.btcPct, date: wk.date });
          if (tMin == null || wk.btcPct < tMin) tMin = wk.btcPct;
          if (tMax == null || wk.btcPct > tMax) tMax = wk.btcPct;
        }
      }
    }
    if (!baliPts.length) return '<div class="mc-empty">ยังไม่มีสัปดาห์ที่ข้อมูลครบทั้งสามธนาคาร</div>';
    if (bMin === bMax) { bMin -= 1; bMax += 1; }
    if (tMin == null) { tMin = -1; tMax = 1; } else if (tMin === tMax) { tMin -= 1; tMax += 1; }

    // จุดประมาณการในโซนล่วงหน้า — ต้องนับเข้าในช่วงแกนขวาด้วย
    // ไม่งั้นแถบความน่าจะเป็นจะถูกตัดขอบ แล้วดูแคบกว่าความจริง
    var proj = [];
    if (R.projection && R.projection.points) {
      for (var pI = 0; pI < R.projection.points.length; pI++) {
        var pp = R.projection.points[pI];
        var pgi = pp.plotIndex - from;
        if (pgi < 0 || pgi >= n) continue;
        proj.push({ gi: pgi, fit: pp.fitPct, lo68: pp.lo68, hi68: pp.hi68, lo95: pp.lo95, hi95: pp.hi95,
          src: pp.sourceDate, ahead: pp.weeksAhead, bali: pp.baliPct,
          price: pp.price, pLo68: pp.priceLo68, pHi68: pp.priceHi68,
          pLo95: pp.priceLo95, pHi95: pp.priceHi95,
          basis: pp.priceBasis, baseClose: pp.baseClose });
        if (pp.lo95 != null && pp.lo95 < tMin) tMin = pp.lo95;
        if (pp.hi95 != null && pp.hi95 > tMax) tMax = pp.hi95;
      }
    }

    function x(gi2) { return padL + (n <= 1 ? 0 : (gi2 / (n - 1)) * iw); }
    function yB(v) { return padT + ih - ((v - bMin) / (bMax - bMin)) * ih; }
    function yT(v) { return padT + ih - ((v - tMin) / (tMax - tMin)) * ih; }

    function poly(pts, yf, cls) {
      var d = [];
      for (var i = 0; i < pts.length; i++) d.push(x(pts[i].gi).toFixed(1) + "," + yf(pts[i].v).toFixed(1));
      return '<polyline class="' + cls + '" points="' + d.join(" ") + '" />';
    }

    // โซนเทา = ช่วงที่ BALI ล่วงหน้าไปแล้วแต่ยังไม่มี BTC ให้เทียบ
    var lastBtcGi = btcPts.length ? btcPts[btcPts.length - 1].gi : 0;
    var zoneX = x(lastBtcGi), zoneW = Math.max(0, x(n - 1) - zoneX);

    // แถบความน่าจะเป็น + เส้นประ — ต่อจากจุด BTC จริงจุดสุดท้ายเพื่อให้เส้นไม่ขาด
    function bandPath(loKey, hiKey) {
      if (proj.length < 2) return "";
      var up = [], dn = [];
      for (var i2 = 0; i2 < proj.length; i2++) {
        if (proj[i2][hiKey] == null || proj[i2][loKey] == null) continue;
        up.push(x(proj[i2].gi).toFixed(1) + "," + yT(proj[i2][hiKey]).toFixed(1));
        dn.unshift(x(proj[i2].gi).toFixed(1) + "," + yT(proj[i2][loKey]).toFixed(1));
      }
      if (up.length < 2) return "";
      return up.concat(dn).join(" ");
    }
    var b95 = bandPath("lo95", "hi95");
    var b68 = bandPath("lo68", "hi68");
    var projLine = "";
    if (proj.length) {
      var lp = [];
      if (btcPts.length) {
        var lastB = btcPts[btcPts.length - 1];
        lp.push(x(lastB.gi).toFixed(1) + "," + yT(lastB.v).toFixed(1));
      }
      for (var i3 = 0; i3 < proj.length; i3++) {
        if (proj[i3].fit == null) continue;
        lp.push(x(proj[i3].gi).toFixed(1) + "," + yT(proj[i3].fit).toFixed(1));
      }
      if (lp.length >= 2) projLine = '<polyline class="gl-line-proj" points="' + lp.join(" ") + '" />';
    }

    // เส้นศูนย์ของแกนซ้าย
    var zeroY = (bMin <= 0 && bMax >= 0) ? yB(0) : null;

    // ป้ายปีบนแกนนอน
    var ticks = "";
    var seenYear = {};
    for (gi = 0; gi < n; gi++) {
      var idx = from + gi;
      var dt = idx < weeks.length ? weeks[idx].date : null;
      if (!dt) continue;
      var yr = dt.slice(0, 4), mo = dt.slice(5, 7);
      var keyY = yr + "-" + (mo <= "06" ? "H1" : "H2");
      if (seenYear[keyY]) continue;
      seenYear[keyY] = 1;
      ticks += '<text class="gl-tick" x="' + x(gi).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' +
        esc((mo <= "06" ? "ต้น" : "กลาง") + " " + yr.slice(2)) + "</text>";
    }

    // แถบ hover ต่อสัปดาห์ — ใช้ <title> ของ SVG ไม่ต้องผูก JS
    var bands = "";
    var bw = n > 1 ? iw / (n - 1) : iw;
    for (gi = 0; gi < n; gi++) {
      var ci = from + gi, sIdx = from + gi - lead;
      var cw = ci < weeks.length ? weeks[ci] : null;
      var sw = (sIdx >= 0 && sIdx < weeks.length) ? weeks[sIdx] : null;
      if (!cw && !sw) continue;
      var pj = null;
      for (var pk = 0; pk < proj.length; pk++) if (proj[pk].gi === gi) { pj = proj[pk]; break; }
      var tip = (cw ? "สัปดาห์ " + thDate(cw.date) : "ช่วงล่วงหน้า · อีก " + (pj ? pj.ahead : "?") + " สัปดาห์") +
        (sw && sw.baliPct != null ? "\nBALI (จาก " + thDate(sw.date) + "): " + pct(sw.baliPct, 2) : "") +
        (cw && cw.btcPct != null ? "\nBTC 6 สัปดาห์: " + pct(cw.btcPct, 1) : "") +
        (pj ? (pj.price != null
            ? "\n\nราคา BTC ที่โมเดลให้: " + usd(pj.price) +
              "\nโอกาส 68% อยู่ระหว่าง " + usd(pj.pLo68) + " – " + usd(pj.pHi68) +
              "\nโอกาส 95% อยู่ระหว่าง " + usd(pj.pLo95) + " – " + usd(pj.pHi95) +
              (pj.basis === "chained"
                ? "\n⚠ ฐานราคาเป็นค่าประมาณอีกที — คลาดเคลื่อนทบสองชั้น"
                : "\n(คิดจากราคาจริง " + usd(pj.baseClose) + " เมื่อ 6 สัปดาห์ก่อนช่องนี้)")
            : "") +
          "\n\n%เปลี่ยน 6 สัปดาห์ที่โมเดลให้: " + pct(pj.fit, 1) +
          "\nโอกาส 68%: " + pct(pj.lo68, 0) + " ถึง " + pct(pj.hi68, 0) +
          "\nโอกาส 95%: " + pct(pj.lo95, 0) + " ถึง " + pct(pj.hi95, 0) +
          "\n⚠ ช่วงกว้างขนาดนี้ = แทบไม่บอกอะไร" : "") +
        (cw && cw.totalUsd != null ? "\nงบดุลรวม: " + tn(cw.totalUsd) : "") +
        (cw && cw.bojCarried ? "\n⚠ BOJ ใช้ค่าเดือนก่อนลากมา" : "");
      bands += '<rect class="gl-band" x="' + (x(gi) - bw / 2).toFixed(1) + '" y="' + padT +
        '" width="' + Math.max(1, bw).toFixed(1) + '" height="' + ih + '"><title>' + esc(tip) + "</title></rect>";
    }

    return '<div class="gl-chartwrap"><svg class="gl-chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="กราฟสภาพคล่องธนาคารกลางเทียบกับ Bitcoin">' +
      (zoneW > 2 ? '<rect class="gl-zone" x="' + zoneX.toFixed(1) + '" y="' + padT + '" width="' + zoneW.toFixed(1) + '" height="' + ih + '" />' +
        '<text class="gl-zone-label" x="' + (zoneX + 6).toFixed(1) + '" y="' + (padT + 14) + '">โซนล่วงหน้า · ยังไม่มีราคามาเทียบ</text>' : "") +
      (zeroY != null ? '<line class="gl-zero" x1="' + padL + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + zeroY.toFixed(1) + '" />' : "") +
      (b95 ? '<polygon class="gl-band95" points="' + b95 + '" />' : "") +
      (b68 ? '<polygon class="gl-band68" points="' + b68 + '" />' : "") +
      poly(btcPts, yT, "gl-line-btc") +
      projLine +
      poly(baliPts, yB, "gl-line-bali") +
      '<text class="gl-axis" x="6" y="' + (padT + 10) + '">' + pct(bMax, 1) + "</text>" +
      '<text class="gl-axis" x="6" y="' + (padT + ih) + '">' + pct(bMin, 1) + "</text>" +
      '<text class="gl-axis gl-axis-r" x="' + (W - 6) + '" y="' + (padT + 10) + '" text-anchor="end">' + pct(tMax, 0) + "</text>" +
      '<text class="gl-axis gl-axis-r" x="' + (W - 6) + '" y="' + (padT + ih) + '" text-anchor="end">' + pct(tMin, 0) + "</text>" +
      ticks + bands +
      "</svg></div>" +
      '<div class="gl-legend">' +
      '<span class="gl-key gl-key-bali">เส้นน้ำเงิน — BALI (Fed+ECB+BOJ) %เปลี่ยน ' + R.options.changeWeeks + ' สัปดาห์ · เลื่อนหน้า ' + lead + ' สัปดาห์</span>' +
      '<span class="gl-key gl-key-btc">เส้นส้ม — BTC %เปลี่ยน ' + R.options.changeWeeks + ' สัปดาห์ (แกนขวา)</span>' +
      (proj.length ? '<span class="gl-key gl-key-proj">เส้นประ — ค่ากลางจากสมการถดถอย (lag ' +
        R.projection.lagWeeks + ' สัปดาห์)</span>' +
        '<span class="gl-key gl-key-band">แถบจาง — ช่วงที่ผลจริงมีโอกาสตกอยู่ 68% / 95%</span>' : "") +
      "</div>";
  }

  // ---------------- ส่วนประกอบข้อความ ----------------
  function statCards(R) {
    var L = R.latest || {};
    var bl = R.bestLag;
    var claimed = R.lagScan[Math.round(R.options.leadWeeks)];
    return '<div class="gl-cards">' +
      '<div class="gl-card"><small>สภาพคล่องรวม (Fed+ECB+BOJ)</small><b>' + tn(L.totalUsd) + "</b>" +
      "<em>ณ " + thDate(L.date) + "</em></div>" +
      '<div class="gl-card"><small>BALI · %เปลี่ยน ' + R.options.changeWeeks + " สัปดาห์</small><b class=\"" +
      (L.baliPct != null && L.baliPct < 0 ? "gl-neg" : "gl-pos") + '">' + pct(L.baliPct, 2) + "</b>" +
      "<em>" + (L.baliPct != null && L.baliPct < 0 ? "สภาพคล่องกำลังหด" : "สภาพคล่องกำลังเพิ่ม") + "</em></div>" +
      '<div class="gl-card"><small>BTC · %เปลี่ยน ' + R.options.changeWeeks + " สัปดาห์</small><b class=\"" +
      (L.btcPct != null && L.btcPct < 0 ? "gl-neg" : "gl-pos") + '">' + pct(L.btcPct, 1) + "</b>" +
      "<em>ราคาปิด " + (L.btcClose != null ? "$" + Math.round(L.btcClose).toLocaleString("en-US") : "—") + "</em></div>" +
      '<div class="gl-card"><small>ความนำที่ข้อมูลบอกเอง</small><b>' +
      (bl ? bl.weeks + " สัปดาห์" : "—") + "</b>" +
      "<em>" + (bl ? "สหสัมพันธ์ " + bl.corr.toFixed(2) + " · ที่ " + Math.round(R.options.leadWeeks) + " สัปดาห์ = " +
        (claimed && claimed.corr != null ? claimed.corr.toFixed(2) : "—") : "ข้อมูลไม่พอ") + "</em></div>" +
      "</div>";
  }

  function honestyBlock(R) {
    var bl = R.bestLag;
    var P = R.projection;
    var strength = !bl ? null : (Math.abs(bl.corr) < 0.3 ? "อ่อน" : Math.abs(bl.corr) < 0.5 ? "ปานกลาง" : "ชัด");
    var r2v = bl ? (bl.corr * bl.corr * 100) : null;
    var projLi = "";
    if (P && P.points.length) {
      var last = P.points[P.points.length - 1];
      projLi =
        "<li><b>เส้นประในโซนเทาไม่ใช่การพยากรณ์</b> — มันคือค่ากลางของสมการ " +
        "<code>BTC% = " + P.intercept.toFixed(1) + " + " + P.slope.toFixed(2) + " × BALI%</code> " +
        "ที่ fit จากอดีต " + P.n + " จุด</li>" +
        "<li>ลองดูความกว้างของแถบ: อีก " + last.weeksAhead + " สัปดาห์ ค่ากลางคือ " + pct(last.fitPct, 1) +
        " แต่โอกาส 95% กินตั้งแต่ <b>" + pct(last.lo95, 0) + "</b> ถึง <b>" + pct(last.hi95, 0) + "</b> " +
        "— กว้าง " + Math.round(last.hi95 - last.lo95) + " จุด ซึ่งแทบครอบคลุมทุกอย่างที่ BTC เคยทำได้ใน 6 สัปดาห์</li>" +
        (P.warning ? "<li class=\"gl-warn\">" + esc(P.warning) + "</li>" : "");
    }
    return '<div class="gl-honest">' +
      "<h4>อ่านกราฟนี้ยังไง (และอย่าอ่านยังไง)</h4>" +
      "<ul>" + projLi +
      (bl ? "<li>ข้อมูลจริงบอกว่าความนำที่สัมพันธ์สูงสุดอยู่ที่ <b>" + bl.weeks + " สัปดาห์</b> " +
        "(สหสัมพันธ์ " + bl.corr.toFixed(2) + " จาก " + bl.n + " จุด) — ใกล้เคียงกับ 14 สัปดาห์ที่กราฟต้นฉบับใช้</li>" : "") +
      (bl ? "<li>แต่ความแรงอยู่ระดับ <b>" + strength + "</b> — อธิบายความเคลื่อนไหวของราคาได้ราว <b>" +
        r2v.toFixed(0) + "%</b> เท่านั้น อีก " + (100 - r2v).toFixed(0) + "% มาจากเรื่องอื่น " +
        "ใช้เป็นบริบทฉากหลังได้ <b>ใช้เป็นสัญญาณเข้าออกไม่ได้</b></li>" : "") +
      "<li>เส้นน้ำเงินในโซนเทาคือค่าที่<b>รู้แล้ว</b>จากอดีต ไม่ใช่การพยากรณ์ — มันแค่ถูกเลื่อนไปวางตรงสัปดาห์ที่ยังมาไม่ถึง</li>" +
      "<li>ความสัมพันธ์ไม่ใช่เหตุเป็นผล และช่วงที่วัดได้ก็สั้นเกินกว่าจะสรุปเป็นกฎ</li>" +
      "</ul></div>";
  }

  function dataBlock(R) {
    var s = (state.raw && state.raw.series) || {};
    function row(label, ser, extra) {
      return "<tr><td>" + esc(label) + "</td><td>" + esc((ser && ser.id) || "—") + "</td><td>" +
        esc(ser && ser.freq === "monthly" ? "รายเดือน" : ser && ser.freq === "weekly" ? "รายสัปดาห์" : "รายวัน") +
        "</td><td>" + thDate(ser && ser.lastDate) + "</td><td>" + esc(extra || "") + "</td></tr>";
    }
    return '<details class="gl-data"><summary>ที่มาของข้อมูลและข้อจำกัด</summary>' +
      '<div class="gl-tablewrap"><table class="gl-table"><thead><tr>' +
      "<th>ชุดข้อมูล</th><th>รหัส FRED</th><th>ความถี่</th><th>ล่าสุด</th><th>หมายเหตุ</th>" +
      "</tr></thead><tbody>" +
      row("Fed — งบดุลรวม", s.fed, "ใช้เป็นกริดหลักของกราฟ") +
      row("ECB — งบดุลรวม", s.ecb, "แปลงจาก EUR ด้วย DEXUSEU") +
      row("BOJ — งบดุลรวม", s.boj, "รายเดือน → ลากค่าเดิมระหว่างเดือน") +
      row("USD/EUR", s.usdPerEur, "") +
      row("JPY/USD", s.jpyPerUsd, "") +
      "</tbody></table></div>" +
      "<ul class=\"gl-notes\">" +
      R.notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      "<li>ครบทั้งสามธนาคาร " + R.coverage.completeWeeks + " จาก " + R.coverage.totalWeeks + " สัปดาห์" +
      (R.coverage.bojCarriedWeeks ? " · BOJ ลากค่า " + R.coverage.bojCarriedWeeks + " สัปดาห์" : "") + "</li>" +
      "</ul>" +
      '<p class="gl-src">แหล่ง: <a href="https://fred.stlouisfed.org/" target="_blank" rel="noopener">FRED</a> ' +
      "(Fed / ECB / BOJ / FX) · ราคา BTC จาก Yahoo Finance</p></details>";
  }

  // ---------------- html ----------------
  // ---------------- บันทึกคำทำนาย vs ราคาจริง ----------------
  function trackRecord(R) {
    var FL = window.BtcForecastLog;
    if (!FL) return "";
    var log = state.log || readLog();
    state.log = log;
    var ev = FL.evaluate(log, state.bars || [], todayYmd());
    var S = ev.summary;

    var head = '<div class="gl-tr-head"><div>' +
      "<h3>📓 บันทึกคำทำนาย เทียบราคาจริง</h3>" +
      "<p>เก็บราคาที่โมเดลให้ไว้ ณ วันที่ทำนาย แล้วรอดูว่าเวลาผ่านไปจริง ๆ ราคาต่างกันแค่ไหน " +
      "<strong>ตัวเลขคำทำนายถูกแช่แข็งไว้ ไม่คำนวณใหม่ย้อนหลัง</strong></p></div>" +
      '<div class="gl-tr-btns">' +
      '<button type="button" class="mc-btn" data-gl-save="1">เก็บคำทำนายวันนี้</button>' +
      '<button type="button" class="mc-btn" data-gl-export="1">ส่งออก</button>' +
      '<button type="button" class="mc-btn" data-gl-import="1">นำเข้า</button>' +
      "</div></div>";

    var warn = "";
    if (state.logError) {
      warn += '<p class="gl-warn">⚠ ' + esc(state.logError) + "</p>";
    }
    warn += '<p class="gl-tr-note">⚠ เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น — ' +
      "ล้างข้อมูลเว็บไซต์หรือเปลี่ยนเครื่องแล้วบันทึกจะหาย ใช้ปุ่ม <strong>ส่งออก</strong> สำรองไว้เป็นระยะ</p>";

    if (!log.entries.length) {
      return '<div class="gl-sub gl-track">' + head + warn +
        '<div class="mc-empty">ยังไม่มีคำทำนายที่บันทึกไว้ — ระบบจะเก็บให้อัตโนมัติสัปดาห์ละครั้ง ' +
        "หรือกด “เก็บคำทำนายวันนี้” เพื่อเริ่มเลย</div></div>";
    }

    // สรุปผล
    var cards = "";
    if (S.scored > 0) {
      cards = '<div class="gl-tr-cards">' +
        trCard("พลาดเฉลี่ย", S.maePct == null ? "—" : S.maePct.toFixed(1) + "%",
          "ค่าเฉลี่ยของขนาดความพลาด (ไม่สนทิศ) · จาก " + S.scored + " คำทำนาย") +
        trCard("ค่ากลางความพลาด", S.medianAbsPct == null ? "—" : S.medianAbsPct.toFixed(1) + "%",
          "ครึ่งหนึ่งพลาดน้อยกว่านี้ · ทนค่าสุดโต่งได้ดีกว่าค่าเฉลี่ย") +
        trCard("เอนไปทางไหน", S.biasPct == null ? "—" :
          (S.biasPct > 0 ? "+" : "") + S.biasPct.toFixed(1) + "%",
          S.biasPct == null ? "—" : (S.biasPct > 0 ? "โมเดลมักทายสูงกว่าความจริง" :
            S.biasPct < 0 ? "โมเดลมักทายต่ำกว่าความจริง" : "ไม่เอนไปทางไหน")) +
        trCard("ราคาจริงตกในช่วง 95%", S.hit95Pct == null ? "—" : S.hit95Pct.toFixed(0) + "%",
          "ถ้าโมเดลประเมินความไม่แน่นอนถูก ควรใกล้ 95%") +
        trCard("ทายถูกทิศ", S.directionPct == null ? "—" : S.directionPct.toFixed(0) + "%",
          "ขึ้น/ลง เทียบกับราคาตอนทำนาย · โยนหัวก้อย = 50%") +
        trCard("ชนะการเดาว่า “ไม่เปลี่ยน”", S.beatNaivePct == null ? "—" : S.beatNaivePct.toFixed(0) + "%",
          "ต่ำกว่า 50% = ทายว่าราคาเท่าเดิมยังแม่นกว่าโมเดล") +
        "</div>";
    }

    // แยกตามระยะ
    var horiz = "";
    if (ev.byHorizon.length) {
      var hrows = "";
      for (var h = 0; h < ev.byHorizon.length; h++) {
        var hh = ev.byHorizon[h];
        hrows += "<tr><td>อีก " + hh.weeksAhead + " สัปดาห์</td><td>" + hh.n + "</td><td>" +
          hh.maePct.toFixed(1) + "%</td><td>" +
          (hh.hit95Pct == null ? "—" : hh.hit95Pct.toFixed(0) + "%") + "</td></tr>";
      }
      horiz = '<details class="gl-tr-det"><summary>ความแม่นแยกตามระยะล่วงหน้า</summary>' +
        '<div class="gl-tablewrap"><table class="gl-table"><thead><tr>' +
        "<th>ระยะ</th><th>จำนวน</th><th>พลาดเฉลี่ย</th><th>ตกในช่วง 95%</th>" +
        "</tr></thead><tbody>" + hrows + "</tbody></table></div></details>";
    }

    // ตารางรายคำทำนาย
    var rows = "";
    var shown = ev.rows.slice(0, 60);
    for (var i = 0; i < shown.length; i++) {
      var r = shown[i];
      var statusTxt, cls;
      if (r.status === "pending") { statusTxt = "รอผล"; cls = "gl-tr-pending"; }
      else if (r.status === "no-data") { statusTxt = "ไม่มีราคา"; cls = "gl-tr-nodata"; }
      else {
        statusTxt = r.in95 ? (r.in68 ? "ในช่วง 68%" : "ในช่วง 95%") : "หลุดช่วง";
        cls = r.in95 ? (r.in68 ? "gl-tr-in68" : "gl-tr-in95") : "gl-tr-out";
      }
      rows += "<tr>" +
        "<td>" + esc(thDate(r.takenAt)) + "</td>" +
        "<td>" + esc(thDate(r.targetDate)) + "<small> (อีก " + r.weeksAhead + " สป.)</small></td>" +
        "<td>" + usd(r.spot) + "</td>" +
        "<td>" + usd(r.predicted) + "</td>" +
        "<td>" + (r.actual == null ? "—" : usd(r.actual)) + "</td>" +
        "<td>" + (r.diffPct == null ? "—" :
          (r.diffPct > 0 ? "+" : "") + r.diffPct.toFixed(1) + "%") + "</td>" +
        "<td>" + (r.diffUsd == null ? "—" :
          (r.diffUsd > 0 ? "+" : "-") + usd(Math.abs(r.diffUsd)).slice(1)) + "</td>" +
        '<td class="' + cls + '">' + esc(statusTxt) + "</td>" +
        "<td>" + (r.direction == null ? "—" : esc(r.direction)) + "</td>" +
        "</tr>";
    }
    var more = ev.rows.length > shown.length
      ? "<p class=\"gl-tr-note\">แสดง " + shown.length + " จาก " + ev.rows.length + " รายการ</p>" : "";

    var table = '<div class="gl-tablewrap"><table class="gl-table gl-tr-table"><thead><tr>' +
      "<th>วันที่ทำนาย</th><th>เป้าหมาย</th><th>ราคาตอนนั้น</th><th>โมเดลทาย</th>" +
      "<th>ราคาจริง</th><th>ต่าง %</th><th>ต่าง $</th><th>ช่วง</th><th>ทิศ</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" + more;

    var counts = '<p class="gl-tr-note">เก็บไว้ ' + log.entries.length + " ครั้ง · " +
      "ให้คะแนนแล้ว " + S.scored + " · รอผล " + S.pending +
      (S.noData ? " · ไม่มีราคาเทียบ " + S.noData : "") + "</p>";

    return '<div class="gl-sub gl-track">' + head + warn + counts + cards + horiz + table + "</div>";
  }

  function trCard(label, value, note) {
    return '<div class="gl-tr-card"><div class="gl-tr-label">' + esc(label) + "</div>" +
      '<div class="gl-tr-value">' + esc(value) + "</div>" +
      '<div class="gl-tr-note2">' + esc(note) + "</div></div>";
  }

  function html() {
    if (state.loading && !state.result) {
      return '<div class="mc-empty"><strong>กำลังโหลดข้อมูลสภาพคล่องธนาคารกลาง…</strong>ดึงจาก FRED (Fed · ECB · BOJ)</div>';
    }
    if (state.error) {
      return '<div class="mc-empty"><strong>โหลดข้อมูลไม่สำเร็จ</strong>' + esc(state.error) +
        '<br><button type="button" class="mc-btn" data-gl-reload="1">ลองอีกครั้ง</button></div>';
    }
    var R = state.result;
    if (!R) {
      return '<div class="mc-empty"><strong>ยังไม่ได้โหลดข้อมูล</strong>' +
        '<br><button type="button" class="mc-btn" data-gl-reload="1">โหลดข้อมูล</button></div>';
    }
    if (!R.available) {
      return '<div class="mc-empty"><strong>คำนวณไม่ได้</strong>' + esc(R.reason || "") + "</div>";
    }
    return '<section class="gl-sec">' +
      '<div class="gl-head"><div>' +
      "<h2>🌊 สภาพคล่องธนาคารกลาง (BALI) กับ Bitcoin</h2>" +
      "<p>งบดุลรวมของ Fed + ECB + BOJ แปลงเป็นดอลลาร์ แล้วดูว่า %เปลี่ยนแปลง " + R.options.changeWeeks +
      " สัปดาห์ของมัน นำราคา Bitcoin หรือไม่ · <strong>เป็นบริบทฉากหลัง ไม่ใช่สัญญาณซื้อขาย</strong></p>" +
      "</div>" +
      '<button type="button" class="mc-btn" data-gl-reload="1">' + (state.loading ? "กำลังโหลด…" : "โหลดใหม่") + "</button>" +
      "</div>" +
      statCards(R) + chart(R) + honestyBlock(R) + trackRecord(R) + dataBlock(R) +
      '<p class="gl-foot">' + esc(R.disclaimer) + "</p>" +
      "</section>";
  }

  function wire(root) {
    if (!root) return;
    var btns = root.querySelectorAll("[data-gl-reload]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () { load(true); });
    }
    var saveBtns = root.querySelectorAll("[data-gl-save]");
    for (var s = 0; s < saveBtns.length; s++) {
      saveBtns[s].addEventListener("click", function () { captureNow(); });
    }
    var expBtns = root.querySelectorAll("[data-gl-export]");
    for (var e = 0; e < expBtns.length; e++) {
      expBtns[e].addEventListener("click", function () { exportLog(); });
    }
    var impBtns = root.querySelectorAll("[data-gl-import]");
    for (var m = 0; m < impBtns.length; m++) {
      impBtns[m].addEventListener("click", function () { importLog(); });
    }
  }

  // ---------------- เก็บ log ไว้ในเครื่อง ----------------
  // อยู่ใน localStorage เท่านั้น = ผูกกับเบราว์เซอร์เครื่องนี้
  // ล้าง cache แล้วหาย จึงมีปุ่มส่งออก/นำเข้าไว้ย้ายเครื่องและสำรอง
  var LOG_KEY = "btc_forecast_log_v1";

  function todayYmd() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function readLog() {
    var FL = window.BtcForecastLog;
    try {
      var raw = window.localStorage && window.localStorage.getItem(LOG_KEY);
      if (!raw) return FL ? FL.sanitize(null) : { v: 1, entries: [] };
      return FL ? FL.sanitize(JSON.parse(raw)) : { v: 1, entries: [] };
    } catch (e) {
      return FL ? FL.sanitize(null) : { v: 1, entries: [] };
    }
  }
  function writeLog(log) {
    try {
      window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
      state.logError = null;
    } catch (e) {
      // พื้นที่เต็มหรือปิด storage — ต้องบอกผู้ใช้ ไม่ใช่เงียบแล้วคิดว่าเก็บแล้ว
      state.logError = "บันทึกลงเครื่องไม่ได้ (" + (e && e.name ? e.name : "ไม่ทราบสาเหตุ") + ")";
    }
    state.log = log;
  }

  // บันทึกอัตโนมัติสัปดาห์ละครั้ง — เรียกหลังคำนวณผลเสร็จ
  function autoCapture() {
    var FL = window.BtcForecastLog;
    if (!FL || !state.result) return;
    var log = readLog();
    if (!FL.shouldCapture(log, todayYmd())) { state.log = log; return; }
    var snap = FL.buildSnapshot(state.result, todayYmd());
    if (!snap) { state.log = log; return; }
    writeLog(FL.addSnapshot(log, snap));
    state.autoSaved = true;
  }

  // ---------------- บันทึก/ส่งออกคำทำนาย ----------------
  function captureNow() {
    if (!state.result) return;
    var FL = window.BtcForecastLog;
    if (!FL) return;
    var snap = FL.buildSnapshot(state.result, todayYmd());
    if (!snap) return;
    writeLog(FL.addSnapshot(readLog(), snap));
    state.justSaved = true;
    emit();
  }

  function exportLog() {
    var log = readLog();
    if (!log || !log.entries.length) return;
    try {
      var blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "btc-forecast-log-" + todayYmd() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { /* ดาวน์โหลดไม่ได้ก็ไม่ทำให้หน้าพัง */ }
  }

  function importLog() {
    var FL = window.BtcForecastLog;
    if (!FL) return;
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var incoming = FL.sanitize(JSON.parse(String(rd.result)));
          // รวมกับของเดิม ไม่ทับทิ้ง — ของที่วันซ้ำกันให้ไฟล์ที่นำเข้าชนะ
          var merged = readLog();
          for (var i = 0; i < incoming.entries.length; i++) {
            merged = FL.addSnapshot(merged, incoming.entries[i]);
          }
          writeLog(merged);
          emit();
        } catch (e) { /* ไฟล์เสียก็ไม่ทำอะไร */ }
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  window.GlobalLiquidityUI = {
    html: html, wire: wire, load: load,
    ensure: function () { if (!state.result && !state.loading && !state.error) load(false); },
    _state: state
  };
})();
