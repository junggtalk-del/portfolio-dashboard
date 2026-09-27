(function () {
  "use strict";
  // ============================================================
  // Asset Allocation — หน้าเดียวที่ตอบ 5 คำถาม ภายในหน้าจอแรก
  //   1. เงินอยู่ใน ระยะสั้น / กลาง / ยาว อย่างละเท่าไหร่
  //   2. แต่ละพอร์ตตั้งเป้าผลตอบแทนไว้เท่าไหร่
  //   3. ผลตอบแทนจริง (หักเงินเติม/ถอนแล้ว) เป็นเท่าไหร่
  //   4. พอร์ตไหนนำเป้า / ตามเป้า / ตามหลังเป้า
  //   5. ถ้าตามหลัง จากนี้ต้องทำเท่าไหร่จึงจะกลับไปอยู่บนเส้นคาดหวัง
  //
  // หน้านี้แสดงข้อเท็จจริงจาก engine อย่างเดียว — ไม่มีคะแนน ไม่มีการจัดอันดับ
  // ไม่มีคำแนะนำให้ซื้อ/ขาย และไม่คำนวณตัวเลขเองนอกเหนือจากที่ engine ส่งมา
  //
  // แหล่งความจริงของ "เงิน" คือ GET /api/portfolio สด ๆ ไม่ใช่ snapshot
  // (snapshot.portfolioStatus เป็นสำเนาจากตอนกด Load Latest Data ครั้งล่าสุด
  //  ถ้าอ่านจากตรงนั้น การแก้ใน Quarterly Editor จะไม่ขึ้นที่หน้านี้)
  // ============================================================

  var ROOT_ID = "aaRoot";
  var DRAFT_KEY = "asset_allocation_draft_v1";
  var HORIZON_KEY = "asset_allocation_horizon_v1";
  var SAVE_DEBOUNCE_MS = 600;
  var REFETCH_AFTER_MS = 30000;

  var psCache = null, psFetchedAt = 0, psTried = false, loadError = null;
  // serverUpdatedAt = ฉบับของ server ที่การแก้ไขของเราตั้งต้นมา ใช้ตรวจว่ามีใครแก้แซงหรือเปล่า
  var allocation = null, serverUpdatedAt = null, conflict = null, forceOverwrite = false;
  var dirty = false, saving = false, saveTimer = null;
  var saveState = "idle", saveMsg = "";
  var horizonQuarters = 4;
  var draftNotice = null;

  function AA() { return window.AssetAllocation; }

  // ---------------------------------------------------------------- format
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  // ใช้รูปแบบ "฿1,234" เสมอ ห้ามใช้ "1,234 บาท" กับค่าติดลบ
  // เพราะ privacy.js ตัดเครื่องหมายลบทิ้งในรูปแบบ "บาท" (−60,000 บาท → XXX บาท)
  function thb(v) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    return "฿" + Math.round(n).toLocaleString("en-US");
  }
  function thbSigned(v) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    if (n === 0) return "฿0";
    return (n > 0 ? "+" : "−") + thb(Math.abs(n));
  }
  function pctOf(fraction, d) {
    var n = Number(fraction);
    if (!isFinite(n)) return "—";
    return (n * 100).toFixed(d == null ? 1 : d) + "%";
  }
  function pctSigned(fraction, d) {
    var n = Number(fraction);
    if (!isFinite(n)) return "—";
    return (n > 0 ? "+" : "") + (n * 100).toFixed(d == null ? 1 : d) + "%";
  }
  function num(v, d) {
    var n = Number(v);
    return isFinite(n) ? n.toFixed(d == null ? 1 : d) : "—";
  }
  // แถบรับเมาส์ทั้งคอลัมน์ — ชี้ตรงไหนก็ได้ในแนวตั้ง ไม่ต้องเล็งจุดเล็ก ๆ
  // เนื้อ tooltip เป็น HTML ที่ esc มาแล้ว เก็บใน attribute (เบราว์เซอร์ถอด entity ให้ตอนอ่าน)
  function hitBand(x, w, top, height, html) {
    return '<rect class="aa-hit" x="' + x.toFixed(1) + '" y="' + top + '" width="' + w.toFixed(1) +
      '" height="' + height + '" data-tip="' + esc(html) + '"></rect>';
  }
  function timeAgo(ms) {
    if (!ms) return "";
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "เมื่อครู่";
    if (m < 60) return m + " นาทีที่แล้ว";
    var h = Math.round(m / 60);
    return h < 24 ? h + " ชั่วโมงที่แล้ว" : Math.round(h / 24) + " วันที่แล้ว";
  }

  var STATUS_TH = {
    ahead: { label: "นำเป้า", cls: "is-ahead" },
    on: { label: "ตามเป้า", cls: "is-on" },
    behind: { label: "ตามหลังเป้า", cls: "is-behind" },
    "no-target": { label: "ยังไม่ตั้งเป้า", cls: "is-idle" },
    "no-data": { label: "ยังไม่มีข้อมูล", cls: "is-idle" }
  };
  var HORIZON_TH = { 4: "1 ปี", 8: "2 ปี", 12: "3 ปี" };
  // เกินกว่านี้ถือว่าไม่สมจริงพอจะเอาไปวางแผน — engine คำนวณได้ แต่ไม่มีประโยชน์ที่จะโชว์
  var PLAUSIBLE_RATE_PCT = 50;

  // ---------------------------------------------------------------- storage
  function readDraft() {
    try { return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { return null; }
  }
  function writeDraft() {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ allocation: allocation, savedAt: new Date().toISOString() })); } catch (e) {}
  }
  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }
  function readHorizon() {
    try {
      var v = Number(window.localStorage.getItem(HORIZON_KEY));
      return (v === 4 || v === 8 || v === 12) ? v : 4;
    } catch (e) { return 4; }
  }
  function writeHorizon(v) { try { window.localStorage.setItem(HORIZON_KEY, String(v)); } catch (e) {} }

  // ---------------------------------------------------------------- data
  function ensurePortfolioFetched(force) {
    if (psTried && !force) return;
    psTried = true;
    try {
      window.fetch("/api/portfolio", { cache: "no-store" })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("HTTP " + (r ? r.status : "?"));
          return r.json();
        })
        .then(function (j) {
          var data = j && (j.data || (j.quarters ? j : null));
          if (!data) throw new Error("ไม่มีข้อมูลพอร์ตกลับมา");
          psCache = { data: data };
          psFetchedAt = Date.now();
          loadError = null;
          adoptAllocation(data);
          render();
        })
        .catch(function (e) {
          loadError = (e && e.message) || "โหลดข้อมูลไม่สำเร็จ";
          render();
        });
    } catch (e) { loadError = String(e && e.message); }
  }

  // รับค่า allocation จาก server — แต่ถ้าผู้ใช้กำลังแก้อยู่ (dirty/saving) ห้ามทับ
  function adoptAllocation(data) {
    if (dirty || saving) return;
    var server = AA().normalizeAllocation(data && data.allocation);
    serverUpdatedAt = server.updatedAt;
    var draft = readDraft();
    var draftNewer = draft && draft.allocation &&
      (!server.updatedAt || String(draft.savedAt || "") > String(server.updatedAt));
    if (draftNewer) {
      allocation = AA().normalizeAllocation(draft.allocation);
      draftNotice = "พบการแก้ไขที่ยังไม่ได้บันทึกขึ้น server (เก็บไว้ในเครื่องเมื่อ " +
        esc(String(draft.savedAt || "").slice(0, 16).replace("T", " ")) + ") — กำลังลองบันทึกให้อีกครั้ง";
      persist();
    } else {
      allocation = server;
      if (draft) clearDraft();
      draftNotice = null;
    }
  }

  function refreshOnFocus() {
    if (typeof document !== "undefined" && document.hidden) return;
    if (dirty || saving) return;
    if (Date.now() - psFetchedAt > REFETCH_AFTER_MS) ensurePortfolioFetched(true);
  }

  // ---------------------------------------------------------------- save
  function setSaveState(s, msg) { saveState = s; saveMsg = msg || ""; }

  function scheduleSave() {
    dirty = true;
    setSaveState("idle");
    if (saveTimer) { try { window.clearTimeout(saveTimer); } catch (e) {} }
    saveTimer = window.setTimeout(function () { saveTimer = null; persist(); }, SAVE_DEBOUNCE_MS);
    render();
  }

  // GET → merge → PUT เสมอ เพื่อไม่ทับ quarters ที่อีกแท็บเพิ่งบันทึก
  // และเพื่อไม่ทับ allocation ที่ใหม่กว่าของเราเอง
  function persist() {
    if (saving) { dirty = true; return; }
    saving = true; dirty = false;
    setSaveState("saving");
    render();
    var mine = AA().normalizeAllocation(allocation);
    mine.updatedAt = new Date().toISOString();

    window.fetch("/api/portfolio", { cache: "no-store" })
      .then(function (r) {
        if (!r || !r.ok) throw new Error("อ่านข้อมูลก่อนบันทึกไม่สำเร็จ (HTTP " + (r ? r.status : "?") + ")");
        return r.json();
      })
      .then(function (j) {
        var data = j && (j.data || (j.quarters ? j : null));
        // กันเคสร้ายแรง: ถ้า server ตอบกลับมาแบบไม่มีไตรมาส การ PUT ทับจะลบพอร์ตทั้งก้อน
        if (!data || !data.quarters || !Object.keys(data.quarters).length) {
          throw new Error("ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย");
        }
        // มีคนแก้ allocation แซงระหว่างที่เราเปิดหน้าอยู่ (อีกเครื่อง/อีกแท็บ)
        // ห้ามทับเงียบ ๆ — เก็บร่างไว้แล้วถามผู้ใช้ก่อน
        var remote = AA().normalizeAllocation(data.allocation);
        var remoteNewer = remote.updatedAt && String(remote.updatedAt) > String(serverUpdatedAt || "");
        if (remoteNewer && !forceOverwrite) {
          writeDraft();
          conflict = { remoteUpdatedAt: remote.updatedAt, remote: remote };
          throw new Error("มีการแก้ไขจากที่อื่นใหม่กว่า (" + String(remote.updatedAt).slice(0, 16).replace("T", " ") + ") — ยังไม่บันทึกทับให้");
        }
        forceOverwrite = false;
        var next = {};
        Object.keys(data).forEach(function (k) { next[k] = data[k]; });   // quarters คงเดิมทุก byte
        next.allocation = mine;
        return window.fetch("/api/portfolio", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: next })
        }).then(function (r2) {
          if (!r2 || !r2.ok) throw new Error("บันทึกไม่สำเร็จ (HTTP " + (r2 ? r2.status : "?") + ")");
          allocation = mine;
          serverUpdatedAt = mine.updatedAt;
          psCache = { data: next };
          psFetchedAt = Date.now();
          clearDraft();
          draftNotice = null;
          conflict = null;
          setSaveState("saved");
        });
      })
      .catch(function (e) {
        writeDraft();
        setSaveState("failed", (e && e.message) || "บันทึกไม่สำเร็จ");
      })
      .then(function () {
        saving = false;
        if (dirty) persist(); else render();
      });
  }

  // ---------------------------------------------------------------- actions
  function cloneMap() {
    var m = {};
    Object.keys(allocation.map).forEach(function (k) {
      var s = allocation.map[k], c = {};
      AA().PORTS.forEach(function (p) { if (s[p] > 0) c[p] = s[p]; });
      m[k] = c;
    });
    return m;
  }
  // จัดทั้งก้อนไปพอร์ตเดียว (ทางลัดของกรณีที่พบบ่อยที่สุด)
  function assign(key, port) {
    if (!allocation) return;
    var m = cloneMap();
    if (AA().PORTS.indexOf(port) >= 0) { m[key] = {}; m[key][port] = 100; }
    else delete m[key];
    allocation.map = m;
    scheduleSave();
  }
  // แบ่งสัดส่วนทีละพอร์ต เช่น Bitcoin ระยะกลาง 30% ระยะยาว 70%
  function setSplit(key, port, pctValue) {
    if (!allocation || AA().PORTS.indexOf(port) < 0) return;
    var s = String(pctValue == null ? "" : pctValue).replace(/^\s+|\s+$/g, "");
    var n = s === "" ? 0 : Number(s);
    if (!isFinite(n) || n < 0) n = 0;
    if (n > 100) n = 100;
    var m = cloneMap();
    var cur = m[key] || {};
    if (n > 0) cur[port] = n; else delete cur[port];
    if (Object.keys(cur).length) m[key] = cur; else delete m[key];
    allocation.map = m;
    scheduleSave();
  }
  function setExpected(port, pctValue) {
    if (!allocation || AA().PORTS.indexOf(port) < 0) return;
    var s = String(pctValue == null ? "" : pctValue).replace(/^\s+|\s+$/g, "");
    var n = s === "" ? null : Number(s);
    allocation.ports[port].expectedReturnPct = (n === null || !isFinite(n)) ? null : n;
    scheduleSave();
  }
  // ตั้งค่าแผนเกษียณ: เงินเฟ้อ · ปีที่จะทำงานต่อ · ปีหลังเกษียณ · เงินเติมต่อปี
  function setRetirement(field, v) {
    if (!allocation) return;
    var ok = ["inflationPct", "workYears", "retireYears", "annualContribution", "currentAge", "postReturnPct"];
    if (ok.indexOf(field) < 0) return;
    var s = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "");
    var n = s === "" ? null : Number(s);
    if (n !== null && (!isFinite(n) || n < 0)) n = null;
    if (!allocation.retirement) allocation.retirement = {};
    allocation.retirement[field] = n;
    scheduleSave();
  }
  function setMonthlyExpense(v) {
    if (!allocation) return;
    var s = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "");
    var n = s === "" ? null : Number(s);
    allocation.monthlyExpense = (n === null || !isFinite(n) || n < 0) ? null : n;
    scheduleSave();
  }
  function setHorizon(q) {
    var n = Number(q);
    horizonQuarters = (n === 4 || n === 8 || n === 12) ? n : 4;
    writeHorizon(horizonQuarters);
    render();
  }
  function dropStaleKey(key) {
    if (!allocation) return;
    var m = {};
    Object.keys(allocation.map).forEach(function (k) { if (k !== key) m[k] = allocation.map[k]; });
    allocation.map = m;
    scheduleSave();
  }
  function discardDraft() {
    clearDraft(); draftNotice = null; conflict = null; dirty = false;
    psTried = false; ensurePortfolioFetched(true);
  }
  // ผู้ใช้ยืนยันเองว่าจะเอาของตัวเองทับฉบับที่ใหม่กว่า
  function overwriteRemote() {
    if (!conflict) { persist(); return; }
    serverUpdatedAt = conflict.remoteUpdatedAt;
    conflict = null;
    forceOverwrite = true;
    persist();
  }
  // เอาฉบับจาก server มาใช้แทน ทิ้งการแก้ไขของเรา
  function takeRemote() {
    if (conflict && conflict.remote) {
      allocation = conflict.remote;
      serverUpdatedAt = conflict.remoteUpdatedAt;
    }
    conflict = null; dirty = false;
    clearDraft();
    setSaveState("idle");
    render();
  }

  // ---------------------------------------------------------------- headline
  // ประโยคสรุปสร้างจาก engine ล้วน ๆ — ไม่มีการแต่งเรื่องหรือประเมินเพิ่ม
  function headline(R) {
    var P = AA().PORTS, clauses = [], tone = "on";
    var anyData = false;
    P.forEach(function (p) { if (R.ports[p].hasData) anyData = true; });
    if (!anyData) {
      return {
        tone: "on",
        text: R.totals.unassignedCount > 0
          ? "ยังไม่ได้จัดสินทรัพย์เข้าพอร์ตใดเลย — เริ่มจากหัวข้อ “จัดสินทรัพย์เข้าพอร์ต” ด้านล่าง"
          : "ยังไม่มีข้อมูลพอจะวัดผลตอบแทนของพอร์ตไหน"
      };
    }
    P.forEach(function (p) {
      var x = R.ports[p];
      if (x.trailing && x.trailing.warn) { clauses.push("พอร์ต" + x.label + "ตามหลังเส้นคาดหวังต่อเนื่อง " + x.trailing.count + " ไตรมาส"); tone = "behind"; }
    });
    if (!clauses.length) {
      P.forEach(function (p) {
        var x = R.ports[p];
        if (x.status === "behind") { clauses.push("พอร์ต" + x.label + "อยู่ต่ำกว่าเส้นคาดหวัง " + pctOf(Math.abs(x.gapRatio)) ); tone = "behind"; }
      });
    }
    var sh = R.ports.short;
    if (sh.runway && sh.runway.months !== null && clauses.length < 2) {
      clauses.push("พอร์ตระยะสั้นมีเงินพอใช้อีก ~" + num(sh.runway.months) + " เดือน");
    }
    if (!clauses.length) {
      P.forEach(function (p) {
        var x = R.ports[p];
        if (x.status === "ahead" && clauses.length < 2) { clauses.push("พอร์ต" + x.label + "นำเส้นคาดหวัง " + pctOf(x.gapRatio)); tone = "ahead"; }
      });
    }
    if (!clauses.length) {
      var onTarget = [];
      P.forEach(function (p) { if (R.ports[p].status === "on") onTarget.push(R.ports[p].label); });
      if (onTarget.length) return { tone: "on", text: "พอร์ต" + onTarget.join(" และ ") + "เดินตามเส้นคาดหวังอยู่" };
      return { tone: "on", text: "มีข้อมูลผลตอบแทนแล้ว แต่ยังไม่ได้ตั้งผลตอบแทนคาดหวังของพอร์ตไหน — ตั้งได้ที่หัวข้อ “ตั้งค่า”" };
    }
    return { tone: tone, text: clauses.slice(0, 2).join(" ขณะที่ ") };
  }

  // ---------------------------------------------------------------- sections
  function heroSection(R) {
    var h = headline(R);
    var fresh = psFetchedAt ? "ข้อมูลพอร์ตดึงเมื่อ " + esc(timeAgo(psFetchedAt)) : "";
    return '<section class="aa-hero"><div class="aa-hero-inner">' +
      '<h1 class="aa-title">ASSET ALLOCATION</h1>' +
      '<p class="aa-sub">แบ่งพอร์ตเป็น 3 ระยะ และติดตามผลตอบแทนจริงเทียบกับเป้าหมาย</p>' +
      '<div class="aa-headline is-' + h.tone + '">' + esc(h.text) + "</div>" +
      '<div class="aa-stats">' +
        '<div class="aa-stat"><div class="aa-stat-n">' + thb(R.totals.latest) + '</div>' +
          '<div class="aa-stat-l">มูลค่าพอร์ตรวม</div>' +
          '<div class="aa-stat-s">ไตรมาสล่าสุด ' + esc(R.latestKey) + "</div></div>" +
        '<div class="aa-stat"><div class="aa-stat-n">' + (R.totals.assignedPct === null ? "—" : pctOf(R.totals.assignedPct, 0)) + '</div>' +
          '<div class="aa-stat-l">จัดเข้าพอร์ตแล้ว</div>' +
          '<div class="aa-stat-s">' + thb(R.totals.assigned) + "</div></div>" +
        '<div class="aa-stat"><div class="aa-stat-n">' + R.totals.unassignedCount + ' รายการ</div>' +
          '<div class="aa-stat-l">ยังไม่จัด</div>' +
          '<div class="aa-stat-s">' + thb(R.totals.unassigned) + "</div>" +
          (R.totals.unassignedCount > 0 ? '<a class="aa-stat-link" href="#aaAssign">ไปจัดเลย →</a>' : "") + "</div>" +
        '<div class="aa-stat"><div class="aa-stat-n aa-num">' + R.quarters.length + '</div>' +
          '<div class="aa-stat-l">ไตรมาสที่มีข้อมูล</div>' +
          '<div class="aa-stat-s">' + esc(fresh) + "</div></div>" +
      "</div></div></section>";
  }

  function actualCell(P) {
    if (!P.hasData || P.cumReturn === null) return { n: "—", s: "ยังไม่มีไตรมาสให้เทียบ" };
    if (P.annReturn !== null) return { n: "~" + pctSigned(P.annReturn) + "/ปี", s: "สะสม " + pctSigned(P.cumReturn) + " ใน " + P.n + " ไตรมาส" };
    return { n: "~" + pctSigned(P.cumReturn) + " สะสม", s: esc(P.annNote || "") };
  }

  function portCard(P) {
    var st = STATUS_TH[P.status] || STATUS_TH["no-data"];
    var act = actualCell(P);
    var chips = "";
    if (P.gapRatio !== null) chips += '<span class="aa-chip">ห่างเส้นคาดหวัง ' + pctSigned(P.gapRatio) + "</span>";
    if (P.drawdown && P.drawdown.maxDrawdown !== null) {
      chips += '<span class="aa-chip" title="วัดจากดัชนีผลตอบแทนที่หักเงินเติม/ถอนแล้ว ไม่ใช่มูลค่าดิบ">ย่อลึกสุด ' + pctOf(P.drawdown.maxDrawdown) + "</span>";
    }
    if (P.assets.length) chips += '<span class="aa-chip">' + P.assets.length + " รายการ</span>";
    var runway = "";
    if (P.key === "short") {
      var rw = P.runway || {};
      var body = rw.months !== null && rw.months !== undefined
        ? '<div class="aa-runway-n">~' + num(rw.months) + ' เดือน</div><div class="aa-runway-s">ที่ค่าใช้จ่าย ' + thb(rw.monthlyExpense) + "/เดือน</div>"
        : (!P.hasData
          ? '<div class="aa-runway-s">ยังไม่มีข้อมูล</div>'
          : '<div class="aa-runway-s">ยังไม่ได้ตั้งค่าใช้จ่ายต่อเดือน</div>');
      runway = '<div class="aa-runway"><div class="aa-runway-l">RUNWAY</div>' + body + "</div>";
    }
    // ส่วนประกอบพร้อมสัดส่วน — ย้ายมาจากหัวข้อที่ตัดออก เพราะเป็นข้อมูลที่ต้องเห็น
    // โดยเฉพาะเมื่อสินทรัพย์ตัวหนึ่งถูกแบ่งข้ามพอร์ต
    var comp = P.assets.length
      ? '<div class="aa-comp">ประกอบด้วย: ' + P.assets.map(function (a) {
        return esc(a.name) + " " + num(a.weightPct, 0) + "% (" + thb(a.allocatedValue) + ")";
      }).join(" · ") + "</div>"
      : "";
    return '<article class="aa-card" data-port="' + esc(P.key) + '">' +
      '<div class="aa-card-top"><span class="aa-dot" style="background:' + P.color + '"></span>' +
        '<span class="aa-card-name">' + esc(P.label) + '</span>' +
        '<span class="aa-card-sub">' + esc(P.sub) + "</span></div>" +
      '<div><div class="aa-card-val">' + thb(P.latestValue) + "</div>" +
        '<div class="aa-card-share">' + (P.share === null ? "—" : pctOf(P.share) + " ของพอร์ตรวม") + "</div></div>" +
      '<div class="aa-vs">' +
        '<div class="aa-vs-cell"><div class="aa-vs-l">คาดหวัง</div>' +
          '<div class="aa-vs-n">' + (P.expectedReturnPct === null ? "—" : num(P.expectedReturnPct) + "%/ปี") + "</div>" +
          '<div class="aa-vs-s">' + (P.expectedReturnPct === null ? "ยังไม่ได้ตั้งเป้า" : "ทบต้นต่อปี") + "</div></div>" +
        '<div class="aa-vs-cell"><div class="aa-vs-l">ทำได้จริง</div>' +
          '<div class="aa-vs-n">' + act.n + "</div>" +
          '<div class="aa-vs-s">' + act.s + "</div></div>" +
      "</div>" +
      '<div><span class="aa-status ' + st.cls + '">' + esc(st.label) + "</span></div>" +
      (chips ? '<div class="aa-chips">' + chips + "</div>" : "") +
      comp + runway +
    "</article>";
  }

  function cardsSection(R) {
    return '<section class="aa-block"><div class="aa-block-head"><h2>เงินอยู่ตรงไหน และทำได้ตามเป้าหรือไม่</h2>' +
      '<span class="aa-block-sub">ผลตอบแทนจริงหักเงินเติม/ถอนแล้ว · “~” = ค่าประมาณ</span></div>' +
      '<div class="aa-cards">' + AA().PORTS.map(function (p) { return portCard(R.ports[p]); }).join("") + "</div></section>";
  }

  function fromHereSection(R) {
    var opts = [4, 8, 12].map(function (q) {
      return '<option value="' + q + '"' + (q === horizonQuarters ? " selected" : "") + ">" + HORIZON_TH[q] + "</option>";
    }).join("");
    var cards = AA().PORTS.map(function (p) {
      var P = R.ports[p];
      var body;
      if (P.expectedReturnPct === null) body = '<div class="aa-fh-na">ยังไม่ได้ตั้งผลตอบแทนคาดหวังของพอร์ตนี้ — ตั้งที่หัวข้อ “ตั้งค่า” ด้านล่าง</div>';
      else if (!P.hasData || P.n === 0) body = '<div class="aa-fh-na">ยังไม่มีไตรมาสให้เทียบ จึงยังคำนวณไม่ได้</div>';
      else if (!P.required || P.required.requiredAnn === null) body = '<div class="aa-fh-na">คำนวณไม่ได้จากข้อมูลที่มี</div>';
      else {
        body = '<div class="aa-fh-n">~' + pctSigned(P.required.requiredAnn) + "/ปี</div>" +
          '<div class="aa-fh-s">เพื่อกลับไปอยู่บนเส้นคาดหวังภายใน ' + P.required.horizonQuarters + " ไตรมาส (ถึง " + esc(P.required.targetKey || "—") + ")" +
          (P.status === "ahead" ? " · ตอนนี้นำเป้าอยู่ ตัวเลขนี้จึงต่ำกว่าเป้าที่ตั้งไว้" : "") + "</div>";
      }
      return '<div class="aa-fh"><div class="aa-fh-name"><span class="aa-dot" style="background:' + P.color + '"></span>' + esc(P.label) + "</div>" + body + "</div>";
    }).join("");
    return '<section class="aa-block"><div class="aa-block-head"><h2>จากนี้ต้องทำได้เท่าไหร่</h2>' +
      '<span class="aa-block-sub">คำนวณโดย engine จากดัชนีผลตอบแทนจริงเทียบเส้นคาดหวัง</span>' +
      '<span class="aa-horizon"><label for="aaHorizon">ภายใน</label>' +
      '<select class="aa-select" id="aaHorizon" data-horizon>' + opts + "</select></span></div>" +
      '<div class="aa-fromhere">' + cards + "</div></section>";
  }

  // ---------------------------------------------------------------- retirement
  var VERDICT_TH = {
    comfortable: { label: "สบาย", cls: "is-ahead" },
    tight: { label: "พอดีตัว", cls: "is-on" },
    short: { label: "เสี่ยง — เงินไม่พอ", cls: "is-behind" }
  };

  // กราฟเงินตามเวลา: ช่วงทำงานเงินโต · ช่วงเกษียณเงินลด · แตะศูนย์เมื่อไหร่คือเงินหมด
  function retireChart(RT) {
    var lines = [];
    if (RT.expected) lines.push({ s: RT.expected.series, color: "#22d3ee", label: "ถ้าทำได้ตามเป้า (~" + num(RT.expectedRatePct) + "%/ปี)", dash: "" });
    if (RT.actual) lines.push({ s: RT.actual.series, color: "#f59e0b", label: "ถ้าทำได้เท่าที่ผ่านมาจริง (~" + num(RT.actualRatePct) + "%/ปี)", dash: "5 4" });
    if (!lines.length) return "";
    var total = RT.workYears + RT.retireYears;
    // L กว้างกว่ากราฟพอร์ต เพราะแกนนี้เป็นเงินหลักล้าน และบนมือถือฟอนต์ใน SVG
    // ถูกขยายเป็น 26 หน่วย ป้ายอย่าง "160M" จึงกินที่มากกว่าดัชนี 3 หลัก
    var W = 940, H = 300, L = 96, Rr = 18, T = 16, B = 42;
    function X(t) { return L + (total === 0 ? 0 : (t / total) * (W - L - Rr)); }
    var maxV = 0;
    lines.forEach(function (ln) { ln.s.forEach(function (pt) { if (pt.wealth > maxV) maxV = pt.wealth; }); });
    if (!(maxV > 0)) maxV = 1;
    maxV = maxV * 1.08;
    function Y(v) { return T + (1 - v / maxV) * (H - T - B); }

    var svg = "";
    for (var g = 0; g <= 3; g++) {
      var gy = T + (g / 3) * (H - T - B), gv = maxV - (g / 3) * maxV;
      svg += '<line class="aa-grid" x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + gy.toFixed(1) + '" />';
      svg += '<text class="aa-axis" x="' + (L - 7) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end">' +
        (gv >= 1e7 ? Math.round(gv / 1e6) + "M"
          : gv >= 1e6 ? (gv / 1e6).toFixed(1) + "M"
          : gv >= 1000 ? Math.round(gv / 1000) + "k" : "0") + "</text>";
    }
    // เส้นแบ่งวันเกษียณ
    var rx = X(RT.workYears);
    svg += '<line class="aa-retire-line" x1="' + rx.toFixed(1) + '" y1="' + T + '" x2="' + rx.toFixed(1) + '" y2="' + (H - B) + '" />';
    svg += '<text class="aa-axis" x="' + rx.toFixed(1) + '" y="' + (T - 3) + '" text-anchor="middle">' +
      (RT.retireAge !== null ? "เกษียณ (อายุ " + RT.retireAge + ")" : "เกษียณ") + "</text>";

    lines.forEach(function (ln) {
      var pts = ln.s.map(function (pt) { return X(pt.year).toFixed(1) + "," + Y(pt.wealth).toFixed(1); });
      svg += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + ln.color + '" stroke-width="2.4" stroke-linejoin="round"' +
        (ln.dash ? ' stroke-dasharray="' + ln.dash + '"' : "") + " />";
      // จุดทุกปี (ไม่ข้ามปีแล้ว) เพื่อให้ชี้ได้ทุกจุดตามที่ต้องการ
      ln.s.forEach(function (pt) {
        svg += '<circle class="aa-pt" cx="' + X(pt.year).toFixed(1) + '" cy="' + Y(pt.wealth).toFixed(1) + '" r="2.4" fill="' + ln.color + '" />';
      });
    });
    // จุดที่เงินหมด
    [RT.expected, RT.actual].forEach(function (sc, idx) {
      if (!sc || sc.runsOutInYear === null) return;
      var c = idx === 0 ? "#22d3ee" : "#f59e0b";
      svg += '<circle cx="' + X(sc.runsOutInYear).toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" r="5" fill="none" stroke="' + c + '" stroke-width="2"><title>' +
        "เงินหมดปีที่ " + sc.runsOutInYear + (RT.startYear ? " (" + (RT.startYear + sc.runsOutInYear) + ")" : "") + "</title></circle>";
    });
    var step = Math.max(1, Math.ceil((total + 1) / 6));
    for (var t2 = 0; t2 <= total; t2 += step) {
      var anchor = t2 === 0 ? "start" : (t2 + step > total ? "end" : "middle");
      svg += '<text class="aa-axis" x="' + X(t2).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="' + anchor + '">' +
        (RT.currentAge !== null ? RT.currentAge + t2 : (RT.startYear ? RT.startYear + t2 : "ปี " + t2)) + "</text>";
    }
    // แถบรับเมาส์รายปี — tooltip เดียวบอกทั้งสองกรณีพร้อมกัน จะได้เทียบได้ในที่เดียว
    var bandW2 = total > 0 ? (W - L - Rr) / total : (W - L - Rr);
    for (var yr = 0; yr <= total; yr++) {
      var h2 = "<b>" + (RT.currentAge !== null ? "อายุ " + (RT.currentAge + yr) + " ปี" : "ปีที่ " + yr) +
        (RT.startYear ? " · " + (RT.startYear + yr) + " (พ.ศ. " + (RT.startYear + yr + 543) + ")" : "") + "</b>" +
        "<br>" + (yr === 0 ? "วันนี้" : yr <= RT.workYears ? "ยังทำงาน · ปีที่ " + yr : "หลังเกษียณ · ปีที่ " + (yr - RT.workYears));
      lines.forEach(function (ln) {
        var pt = ln.s[yr];
        if (!pt) return;
        h2 += "<br>" + esc(ln.label.split(" (")[0]) + " <b>" + thb(pt.wealth) + "</b>";
      });
      var f0 = RT.expected && RT.expected.series[yr] ? RT.expected.series[yr].flow : 0;
      if (yr > 0 && f0) h2 += "<br>" + (f0 > 0 ? "เติมปีนี้ " : "ใช้ปีนี้ ") + thbSigned(f0);
      if (yr === RT.workYears) h2 += "<br><i>ปีที่เกษียณ</i>";
      var bx2 = Math.max(L, Math.min(W - Rr - bandW2, X(yr) - bandW2 / 2));
      svg += hitBand(bx2, bandW2, T, H - T - B, h2);
    }
    return '<div class="aa-chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc("กราฟมูลค่าพอร์ตตั้งแต่วันนี้จนจบช่วงเกษียณ") + '">' + svg + '</svg><div class="aa-tip"></div></div>' +
      '<div class="aa-legend">' + lines.map(function (ln) {
        return '<span><i style="border-top-color:' + ln.color + (ln.dash ? ";border-top-style:dashed" : "") + '"></i>' + esc(ln.label) + "</span>";
      }).join("") + "</div>";
  }


  function retireInputs(RT) {
    function f(id, label, field, val, hint, step) {
      return '<div class="aa-field"><label class="aa-field-l" for="' + id + '">' + esc(label) + "</label>" +
        '<input class="aa-input" id="' + id + '" type="number" min="0" step="' + (step || 1) + '" inputmode="decimal" ' +
        (field === "monthlyExpense" ? "data-monthly-expense" : 'data-retire="' + field + '"') +
        ' value="' + (val === null || val === undefined ? "" : esc(val)) + '" />' +
        '<div class="aa-field-h">' + hint + "</div></div>";
    }
    var contribVal = allocation.retirement && allocation.retirement.annualContribution !== null
      ? allocation.retirement.annualContribution : null;
    var contribHint = contribVal === null && RT.observedAnnualFlow !== null
      ? "เว้นว่างไว้ = ใช้ค่าที่ระบบเห็นจากเงินเติม/ถอนจริง 4 ไตรมาสล่าสุด (" + thb(RT.observedAnnualFlow) + "/ปี)"
      : "เงินที่ตั้งใจเติมเข้าพอร์ตต่อปี · สมมติว่าโตตามเงินเฟ้อ";
    return '<div class="aa-retire-in">' +
      f("aaAge", "อายุตอนนี้ (ปี)", "currentAge", allocation.retirement.currentAge, "ใส่แล้วทุกอย่างจะแสดงเป็นอายุ ไม่ใช่แค่จำนวนปี", 1) +
      f("aaExpense", "ต้องใช้เงินเดือนละ (บาท · ค่าวันนี้)", "monthlyExpense", allocation.monthlyExpense, "ค่าใช้จ่ายที่ต้องการต่อเดือนในราคาปัจจุบัน ใช้คำนวณทั้ง runway และแผนเกษียณ", 1000) +
      f("aaInfl", "เงินเฟ้อ (%/ปี)", "inflationPct", allocation.retirement.inflationPct, "ค่าใช้จ่ายจะโตขึ้นปีละเท่านี้ · ไทยระยะยาวมักอยู่แถว 2-3%", 0.1) +
      f("aaWork", "จะทำงานต่ออีกกี่ปี", "workYears", allocation.retirement.workYears, "ช่วงที่ยังเติมเงินเข้าพอร์ตได้", 1) +
      f("aaRetire", "ใช้ชีวิตหลังเกษียณกี่ปี", "retireYears", allocation.retirement.retireYears, "ช่วงที่ต้องถอนเงินออกมาใช้", 1) +
      f("aaContrib", "เติมเงินเข้าพอร์ตปีละ (บาท)", "annualContribution", contribVal, contribHint, 10000) +
      f("aaPostRet", "ผลตอบแทนคาดหวังหลังเกษียณ (%/ปี)", "postReturnPct", allocation.retirement.postReturnPct,
        "เว้นว่าง = ใช้เท่ากับก่อนเกษียณ (" + num(RT.expectedRatePct) + "%/ปี) · ส่วนใหญ่หลังเกษียณจะลดความเสี่ยงลง ผลตอบแทนจึงต่ำกว่า", 0.1) +
      "</div>";
  }

  // ── ช่วงที่ 1 · ก่อนเกษียณ — ต้องทำอีกเท่าไหร่ถึงจะเกษียณได้
  function phase1(RT) {
    var sc = RT.expected;
    if (!sc) return "";
    var when = "อีก " + num(RT.workYears, 0) + " ปี" + (RT.retireAge !== null ? " (ถึงอายุ " + num(RT.retireAge, 0) + ")" : "");
    var short = sc.shortfallAtRetirement, enough = !(short > 0);
    var rows =
      '<div class="aa-gapcell"><div class="aa-vs-l">ต้องมี ณ วันเกษียณ</div><div class="aa-gap-n">' + thb(sc.requiredAtRetirement) + "</div>" +
        '<div class="aa-vs-s">เพื่อใช้ไปอีก ' + num(RT.retireYears, 0) + " ปี</div></div>" +
      '<div class="aa-gapcell"><div class="aa-vs-l">คาดว่าจะมี</div><div class="aa-gap-n">' + thb(sc.wealthAtRetirement) + "</div>" +
        '<div class="aa-vs-s">จากวันนี้ ' + thb(RT.startWealth) + " + เติมปีละ " + thb(RT.annualContribution) + "</div></div>" +
      '<div class="aa-gapcell ' + (enough ? "is-ok" : "is-short") + '"><div class="aa-vs-l">' + (enough ? "เกินเป้า" : "ยังขาดอีก") + "</div>" +
        '<div class="aa-gap-n">' + thb(enough ? Math.abs(sc.gapAtRetirement) : short) + "</div>" +
        '<div class="aa-vs-s">' + (enough ? "มากกว่าที่ต้องมี" : "คิดเป็น " + pctOf(short / sc.requiredAtRetirement, 0) + " ของเป้า") + "</div></div>";
    var how;
    if (enough) {
      how = '<p class="aa-sc-note">ถ้าเดินตามแผนนี้ เงินพอเกษียณแล้ว — ทำผลตอบแทนแค่ ~' +
        (sc.requiredRatePct === null || sc.requiredRatePct > PLAUSIBLE_RATE_PCT ? "—" : num(sc.requiredRatePct)) +
        "%/ปี ก็ถึงเป้า (ตอนนี้ตั้งเป้าไว้ " + num(RT.expectedRatePct) + "%/ปี)</p>";
    } else {
      var rateTxt = (sc.requiredRatePct === null || sc.requiredRatePct > PLAUSIBLE_RATE_PCT)
        ? "<b>สูงเกินจริง</b> — ปรับค่าใช้จ่ายหรือจำนวนปีแทน"
        : "ทำผลตอบแทนให้ได้ <b>~" + num(sc.requiredRatePct) + "%/ปี</b> (จาก " + num(RT.expectedRatePct) + "% · เพิ่มอีก " + num(sc.extraRatePp) + " จุด)";
      var contribTxt = sc.requiredAnnualContribution === null
        ? "—"
        : "เติมเข้าพอร์ตปีละ <b>" + thb(sc.requiredAnnualContribution) + "</b> (เพิ่มอีก " + thb(sc.extraContributionNeeded) + "/ปี)";
      how = '<p class="aa-sc-note is-warn">ปิดช่องว่างได้ 2 ทาง — ' + rateTxt + " <b>หรือ</b> " + contribTxt + "</p>";
    }
    return '<div class="aa-phase' + (enough ? " is-ok" : "") + '">' +
      '<div class="aa-phase-head"><span class="aa-phase-no">ช่วงที่ 1</span> ก่อนเกษียณ — ต้องทำอีกเท่าไหร่ถึงจะเกษียณได้' +
      ' <span class="aa-block-sub">' + esc(when) + " · ผลตอบแทนคาดหวัง " + num(RT.expectedRatePct) + "%/ปี</span></div>" +
      '<div class="aa-gap-grid">' + rows + "</div>" + how + "</div>";
  }

  // ── ช่วงที่ 2 · หลังเกษียณ — ใช้เท่าไหร่พอร์ตถึงอยู่ได้จนจบ
  function phase2(RT) {
    var sc = RT.expected;
    if (!sc || !sc.afterRetirement) return "";
    var AR = sc.afterRetirement;
    var when = (RT.retireAge !== null && RT.endAge !== null ? "อายุ " + num(RT.retireAge, 0) + " → " + num(RT.endAge, 0) + " · " : "") +
      num(RT.retireYears, 0) + " ปี · ด้วยเงิน " + thb(AR.wealthAtRetirement);
    function cell(cls, label, m, sub) {
      return '<div class="aa-gapcell ' + cls + '"><div class="aa-vs-l">' + label + "</div>" +
        '<div class="aa-gap-n">' + (m === null ? "—" : thb(m) + "<span class=\"aa-per\">/เดือน</span>") + "</div>" +
        '<div class="aa-vs-s">' + sub + "</div></div>";
    }
    var spendAll = AR.spendAll
      ? cell("", "ใช้จนหมดพอดี", AR.spendAll.monthlyToday,
        "ค่าเงินวันนี้ · ตอนนั้นคือ " + thb(AR.spendAll.monthlyNominal) + "/เดือน · เงินหมดพอดีตอนจบแผน")
      : cell("", "ใช้จนหมดพอดี", null, "คำนวณไม่ได้");
    var keep = AR.keepCapital
      ? cell("is-ok", "ไม่แตะต้นเงิน", AR.keepCapital.monthlyToday,
        "ค่าเงินวันนี้ · ใช้แค่ส่วนที่ผลตอบแทนชนะเงินเฟ้อ — เงินต้นคงค่าไว้ ไม่มีวันหมด")
      : cell("", "ไม่แตะต้นเงิน", null, "ผลตอบแทนยังไม่ชนะเงินเฟ้อ จึงไม่มีทางอยู่ได้ตลอด");
    var plannedSub, plannedCls;
    if (AR.planned.runsOutInYear === null) {
      plannedCls = "is-ok";
      plannedSub = "อยู่ได้ครบ " + num(RT.retireYears, 0) + " ปีตามแผน" +
        (AR.spendAll && AR.spendAll.monthlyToday > AR.planned.monthlyToday
          ? " · ยังเพิ่มได้อีก " + thb(AR.spendAll.monthlyToday - AR.planned.monthlyToday) + "/เดือน" : "");
    } else {
      plannedCls = "is-short";
      plannedSub = "เงินหมด" + (AR.planned.runsOutAtAge !== null ? "ตอนอายุ " + num(AR.planned.runsOutAtAge, 0) : "หลังเกษียณ " + num(AR.planned.lastsYears, 0) + " ปี") +
        " — อยู่ได้ " + num(AR.planned.lastsYears, 0) + " จาก " + num(RT.retireYears, 0) + " ปี";
    }
    var planned = cell(plannedCls, "ถ้าใช้ตามที่ตั้งไว้", AR.planned.monthlyToday, plannedSub);
    var note = "";
    if (RT.actual && RT.actual.afterRetirement && RT.actual.afterRetirement.spendAll) {
      note = '<p class="aa-sc-note">ถ้าทำผลตอบแทนได้เท่าที่ผ่านมาจริง (~' + num(RT.actualRatePct) + "%/ปี) จะมี <b>" +
        thb(RT.actual.afterRetirement.wealthAtRetirement) + "</b> ตอนเกษียณ และใช้ได้ <b>" +
        thb(RT.actual.afterRetirement.spendAll.monthlyToday) + "/เดือน</b> (ค่าเงินวันนี้)</p>";
    }
    return '<div class="aa-phase">' +
      '<div class="aa-phase-head"><span class="aa-phase-no">ช่วงที่ 2</span> หลังเกษียณ — ใช้เท่าไหร่พอร์ตถึงอยู่ได้จนจบ' +
      ' <span class="aa-block-sub">' + esc(when) + " · ผลตอบแทนคาดหวัง " + num(sc.postRatePct) + "%/ปี" +
      (RT.postReturnPct === null ? " (เท่ากับก่อนเกษียณ)" : "") + "</span></div>" +
      '<div class="aa-gap-grid">' + spendAll + keep + planned + "</div>" + note + "</div>";
  }


  function retirementSection(R) {
    var RT = R.retirement;
    var body;
    if (!RT.ready) {
      body = '<div class="aa-q-line">ยังตั้งค่าไม่ครบ — ต้องใส่: <b>' + esc(RT.missing.join(" · ")) + "</b></div>" +
        (RT.expectedRatePct === null ? '<div class="aa-q-line">ผลตอบแทนคาดหวังมาจากที่ตั้งไว้ในแต่ละพอร์ต (หัวข้อ “ตั้งค่า”) ถ่วงตามมูลค่าพอร์ตจริง</div>' : "");
    } else {
      var head = "";
      if (RT.expected) {
        var v = VERDICT_TH[RT.expected.verdict] || VERDICT_TH.tight;
        var msg = RT.expected.runsOutInYear !== null
          ? "ถ้าทำได้ตามเป้า เงินจะหมดก่อนครบกำหนด " + RT.expected.yearsShort + " ปี"
          : (RT.expected.verdict === "comfortable"
            ? "ถ้าทำได้ตามเป้า เงินพอใช้ครบ " + RT.retireYears + " ปี และยังเหลือ " + thb(RT.expected.endWealth)
            : "ถ้าทำได้ตามเป้า เงินพอใช้ครบ " + RT.retireYears + " ปี แต่เหลือไม่มาก");
        head = '<div class="aa-headline is-' + (RT.expected.verdict === "short" ? "behind" : RT.expected.verdict === "comfortable" ? "ahead" : "on") + '">' +
          "<b>" + esc(v.label) + "</b> — " + esc(msg) + "</div>";
      }
      var excl = RT.unassignedExcluded > 0
        ? '<div class="aa-banner">แผนนี้คิดจากเฉพาะเงินที่จัดเข้าพอร์ตแล้ว ' + thb(RT.startWealth) +
          " — ยังไม่รวมอีก " + thb(RT.unassignedExcluded) + " (" + num(RT.unassignedPct, 0) +
          "% ของพอร์ต) ที่ยังไม่ได้จัด เพราะยังไม่มีใครตั้งผลตอบแทนคาดหวังให้ส่วนนั้น" +
          ' <a href="#aaAssign">ไปจัดให้ครบ →</a></div>'
        : "";
      body = head + excl + phase1(RT) + phase2(RT) + retireChart(RT);
    }
    var ageLine = RT.currentAge !== null
      ? "อายุตอนนี้ " + num(RT.currentAge, 0) + " ปี" +
        (RT.retireAge !== null ? " · เกษียณตอนอายุ " + num(RT.retireAge, 0) : "") +
        (RT.endAge !== null ? " · วางแผนถึงอายุ " + num(RT.endAge, 0) : "") + " · "
      : "";
    return '<section class="aa-block" id="aaRetire"><div class="aa-block-head"><h2>ฉันมีเงินพอแล้วหรือยัง</h2>' +
      '<span class="aa-block-sub">' + esc(ageLine) + "เงินที่จัดเข้าพอร์ตแล้ว ณ " + esc(R.latestKey) + " " + thb(RT.startWealth) +
      " · ผลตอบแทนคาดหวังก่อนเกษียณ " + num(RT.expectedRatePct) + "%/ปี" +
      (RT.postRateUsedPct === null ? "" : " · หลังเกษียณ " + num(RT.postRateUsedPct) + "%/ปี") +
      " · ถ่วงตามสัดส่วนพอร์ตจริง · ทุกตัวเลขเป็นค่าประมาณ</span></div>" +
      '<div class="aa-retire">' + body + retireInputs(RT) + "</div></section>";
  }


  function quarterTable(P) {
    if (!P.quarters.length) return "";
    var rows = P.quarters.map(function (q) {
      var note = q.flags.length ? q.flags.join(" · ") : "";
      return "<tr><td>" + esc(q.key) + "</td>" +
        "<td>" + thb(q.vStart) + "</td>" +
        "<td>" + thbSigned(q.flow) + "</td>" +
        "<td>" + thb(q.vEnd) + "</td>" +
        "<td>" + (q.r === null ? "—" : "~" + pctSigned(q.r)) + "</td>" +
        "<td>" + (q.index === null ? "—" : q.index.toFixed(1)) + "</td>" +
        "<td>" + (q.expectedIndex === null ? "—" : q.expectedIndex.toFixed(1)) + "</td>" +
        "<td>" + esc(note) + "</td></tr>";
    }).join("");
    return '<details class="aa-details"><summary>ดูรายไตรมาสของพอร์ต' + esc(P.label) + " (" + P.quarters.length + " ไตรมาส)</summary>" +
      '<div class="aa-table-wrap"><table class="aa-table"><thead><tr>' +
      "<th>ไตรมาส</th><th>ต้นงวด</th><th>เติม/ถอน</th><th>ปลายงวด</th><th>~ผลตอบแทน</th><th>ดัชนีจริง</th><th>ดัชนีคาด</th><th>หมายเหตุ</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></details>";
  }



  // ---------------------------------------------------------------- assign
  // แถวแบ่งสัดส่วน: สินทรัพย์หนึ่งตัวกระจายไปได้ทั้ง 3 พอร์ตพร้อมกัน
  function splitRow(a) {
    var inputs = AA().PORTS.map(function (p) {
      var meta = AA().PORT_META[p];
      var v = a.split[p] || 0;
      return '<label class="aa-sp"><span class="aa-sp-l"><i class="aa-dot" style="background:' + meta.color + '"></i>' + esc(meta.label) + "</span>" +
        '<span class="aa-sp-in"><input class="aa-input aa-input-pct" type="number" min="0" max="100" step="1" inputmode="decimal" ' +
        'data-split="' + esc(a.key) + '" data-port="' + p + '" value="' + (v || "") + '" placeholder="0" ' +
        'aria-label="' + esc(a.name + " ในพอร์ต" + meta.label + " (%)") + '" />%</span>' +
        '<span class="aa-sp-v">' + (v > 0 ? thb(a.latestValue * v / 100) : "—") + "</span></label>";
    }).join("");
    var cls, txt;
    if (!a.valid) { cls = "is-bad"; txt = "รวม " + num(a.sumPct, 0) + "% — เกิน 100% จึงยังไม่ถูกนำไปคำนวณ"; }
    else if (a.sumPct >= 99.999) { cls = "is-ok"; txt = "รวม 100%"; }
    else if (a.sumPct <= 0.0001) { cls = "is-warn"; txt = "ยังไม่จัดเลย (" + thb(a.latestValue) + ")"; }
    else { cls = "is-warn"; txt = "รวม " + num(a.sumPct, 0) + "% · เหลือ " + num(100 - a.sumPct, 0) + "% (" + thb(a.latestValue * (100 - a.sumPct) / 100) + ") ยังไม่จัด"; }
    var preset = '<select class="aa-select aa-preset" data-assign="' + esc(a.key) + '" aria-label="' + esc("ตั้งทั้งก้อนของ " + a.name) + '">' +
      '<option value="">ตั้งทั้งก้อน…</option><option value="">ยังไม่จัด (ล้าง)</option>' +
      AA().PORTS.map(function (p) { return '<option value="' + p + '">100% ' + esc(AA().PORT_META[p].label) + "</option>"; }).join("") +
      "</select>";
    return '<div class="aa-arow" data-asset="' + esc(a.key) + '">' +
      '<div class="aa-arow-id"><div class="aa-row-name">' + esc(a.name) + "</div>" +
        '<div class="aa-row-type">' + esc(a.typeLabel || a.type) + " · " + thb(a.latestValue) +
        (a.lastSeenKey ? " · ล่าสุด " + esc(a.lastSeenKey) : "") + "</div></div>" +
      '<div class="aa-splits">' + inputs + "</div>" +
      '<div class="aa-arow-foot"><span class="aa-sum ' + cls + '">' + txt + "</span>" + preset + "</div>" +
    "</div>";
  }

  function assignSection(R) {
    var un = R.unassigned;
    var head = un.length
      ? "<strong>ยังจัดไม่ครบ</strong> · " + un.length + " รายการ · รวมส่วนที่ยังไม่จัด " + thb(R.totals.unassigned)
      : "<strong>จัดครบทุกรายการแล้ว</strong> · ทุกบาทอยู่ในพอร์ตใดพอร์ตหนึ่ง";
    var unBody = un.length
      ? un.map(function (a) {
        return '<div class="aa-q-line">' + esc(a.name) + " — " +
          (a.invalid ? "ตั้งสัดส่วนรวมเกิน 100% ยังไม่ถูกนำไปคำนวณ"
            : "เหลือ " + num(a.remainderPct, 0) + "% (" + thb(a.remainderValue) + ") ยังไม่จัด") + "</div>";
      }).join("")
      : "";
    var stale = "";
    if (R.meta.staleKeys.length) {
      stale = '<div class="aa-banner">มีการจัดพอร์ตที่ชี้ไปรายการซึ่งไม่มีอยู่ในไตรมาสไหนแล้ว ' + R.meta.staleKeys.length + " รายการ " +
        "(เกิดได้เมื่อเปลี่ยนชื่อรายการใน Quarterly Editor) — ระบบยังเก็บไว้ให้ ไม่ได้ลบเอง: " +
        R.meta.staleKeys.map(function (k) {
          return '<span class="aa-chip">' + esc(k) + ' <button class="aa-btn aa-btn-danger" data-drop-stale="' + esc(k) + '" type="button">ลบ</button></span>';
        }).join(" ") + "</div>";
    }
    var bad = "";
    if (R.meta.invalidSplits.length) {
      bad = '<div class="aa-banner">' + R.meta.invalidSplits.length + " รายการตั้งสัดส่วนรวมเกิน 100% — " +
        "ระบบไม่นำเข้าพอร์ตเลยเพื่อไม่ให้ยอดรวมของพอร์ตมากกว่ามูลค่าจริง: " +
        R.meta.invalidSplits.map(function (x) { return esc(x.name) + " (" + num(x.sum, 0) + "%)"; }).join(" · ") + "</div>";
    }
    return '<section class="aa-block" id="aaAssign"><div class="aa-block-head"><h2>แบ่งสัดส่วนเข้าพอร์ต</h2>' +
      '<span class="aa-block-sub">สินทรัพย์หนึ่งตัวแบ่งได้หลายพอร์ต เช่น Bitcoin ระยะกลาง 30% ระยะยาว 70% · ทุกรายการเริ่มที่ “ยังไม่จัด” ระบบไม่เดาให้</span></div>' +
      bad + stale +
      '<div class="aa-unassigned' + (un.length ? "" : " is-empty") + '"><div class="aa-q-line">' + head + "</div>" + unBody + "</div>" +
      '<div class="aa-atable">' + R.assetsAll.map(splitRow).join("") + "</div></section>";
  }

  function settingsSection(R) {
    var fields = AA().PORTS.map(function (p) {
      var P = R.ports[p];
      return '<div class="aa-field"><label class="aa-field-l" for="aaExp-' + p + '">' +
        "ผลตอบแทนคาดหวัง · " + esc(P.label) + " (%/ปี)</label>" +
        '<input class="aa-input" id="aaExp-' + p + '" type="number" step="0.1" inputmode="decimal" data-expected="' + p + '" value="' +
        (P.expectedReturnPct === null ? "" : esc(P.expectedReturnPct)) + '" placeholder="เช่น 6" />' +
        '<div class="aa-field-h">ใช้สร้างเส้นคาดหวังแบบทบต้น เว้นว่างได้ถ้ายังไม่อยากตั้ง</div></div>';
    }).join("");
    fields += '<div class="aa-field"><span class="aa-field-l">ค่าใช้จ่ายต่อเดือน · เงินเฟ้อ · แผนเกษียณ</span>' +
      '<div class="aa-field-h">ตั้งอยู่ที่หัวข้อ <a href="#aaRetire">“ฉันมีเงินพอแล้วหรือยัง”</a> ด้านบน เพราะใช้ร่วมกับการคำนวณเกษียณและ runway</div></div>';
    fields += '<div class="aa-field"><span class="aa-field-l">ช่วงเวลาเป้าหมาย</span>' +
      '<div class="aa-field-h">ตั้งอยู่ที่หัวข้อ “จากนี้ต้องทำได้เท่าไหร่” ด้านบน — ตอนนี้เลือกไว้ที่ ' + HORIZON_TH[horizonQuarters] + "</div></div>";
    return '<section class="aa-block"><div class="aa-block-head"><h2>ตั้งค่า</h2>' +
      '<span class="aa-block-sub">บันทึกเมื่อออกจากช่อง (ไม่บันทึกระหว่างพิมพ์)</span></div>' +
      '<div class="aa-settings">' + fields + "</div></section>";
  }

  // ── บันทึกผลตอบแทนย้อนหลัง: 3 พอร์ต + ทั้งพอร์ต เรียงในตารางเดียว
  // มีไว้เพื่อตอบว่า "ที่ผ่านมาแต่ละพอร์ตทำได้จริงเท่าไหร่" — ใช้ตรวจว่าเป้าที่ตั้งไว้สมจริงไหม
  function recordSection(R) {
    var R2 = R.record;
    if (!R2 || !R2.rows.length) {
      return '<section class="aa-block" id="aaRecord"><div class="aa-block-head"><h2>บันทึกผลตอบแทนย้อนหลัง</h2></div>' +
        '<div class="aa-quality"><div class="aa-q-line">ต้องมีอย่างน้อย 2 ไตรมาสที่มีมูลค่า จึงจะเริ่มบันทึกผลตอบแทนได้</div></div></section>';
    }
    function cell(x, flow, status, reason) {
      if (x === null) {
        return '<td class="aa-rec-na" title="' + esc(reason === "empty-start" ? "พอร์ตยังไม่มีเงินในไตรมาสก่อนหน้า" : reason === "inconsistent" ? "ถอนมากกว่ามูลค่าที่มี" : "ยังไม่มีข้อมูล") + '">—</td>';
      }
      var cls = x > 0.0005 ? "is-up" : (x < -0.0005 ? "is-down" : "");
      var mark = status === "missing" ? '<span class="aa-rec-flag" title="ไตรมาสนี้ไม่มีข้อมูลเงินเติม/ถอน — คิดเป็น 0">*</span>'
        : (status === "partial" ? '<span class="aa-rec-flag" title="มีข้อมูลเงินเติม/ถอนบางรายการ">*</span>' : "");
      return '<td class="' + cls + '" title="' + esc("เงินเติม/ถอน " + thbSigned(flow || 0)) + '">~' + pctSigned(x) + mark + "</td>";
    }
    var body = R2.rows.map(function (row) {
      return "<tr><td>" + esc(row.key) + "</td>" +
        AA().PORTS.map(function (p) {
          var c = row.ports[p];
          return cell(c.r, c.flow, c.flowStatus, c.rReason);
        }).join("") +
        cell(row.overall, row.overallFlow, "recorded", null) +
        "<td>" + thb(row.overallValue) + "</td></tr>";
    }).join("");
    function sumRow(label, pick, pickAll, note) {
      return '<tr class="aa-rec-sum"><td>' + label + "</td>" +
        AA().PORTS.map(function (p) {
          var v = pick(R.ports[p]);
          return "<td" + (v === null ? "" : ' class="' + (v > 0 ? "is-up" : v < 0 ? "is-down" : "") + '"') + ">" +
            (v === null ? "—" : "~" + pctSigned(v)) + "</td>";
        }).join("") +
        "<td" + (pickAll === null ? "" : ' class="' + (pickAll > 0 ? "is-up" : pickAll < 0 ? "is-down" : "") + '"') + ">" +
        (pickAll === null ? "—" : "~" + pctSigned(pickAll)) + "</td><td>" + (note || "") + "</td></tr>";
    }
    var anyMissing = R2.rows.some(function (row) {
      return AA().PORTS.some(function (p) { return row.ports[p].flowStatus === "missing" || row.ports[p].flowStatus === "partial"; });
    });
    return '<section class="aa-block" id="aaRecord"><div class="aa-block-head"><h2>บันทึกผลตอบแทนย้อนหลัง</h2>' +
      '<span class="aa-block-sub">แต่ละไตรมาสที่ผ่านมา แต่ละพอร์ตทำได้เท่าไหร่ (หักเงินเติม/ถอนแล้ว) · ใช้ตรวจว่าเป้าที่ตั้งไว้สมจริงไหม</span></div>' +
      '<div class="aa-table-wrap aa-rec-wrap"><table class="aa-table aa-rec"><thead><tr><th>ไตรมาส</th>' +
      AA().PORTS.map(function (p) { return '<th><span class="aa-dot" style="background:' + AA().PORT_META[p].color + '"></span> ' + esc(AA().PORT_META[p].label) + "</th>"; }).join("") +
      "<th>ทั้งพอร์ต</th><th title=\"ผลรวมของ 3 พอร์ต ไม่รวมรายการที่ยังไม่จัด\">มูลค่าที่จัดแล้ว</th></tr></thead><tbody>" + body +
      sumRow("สะสมทั้งช่วง", function (P) { return P.cumReturn; }, R2.overall.cumReturn, "") +
      sumRow("เฉลี่ยต่อปี", function (P) { return P.annReturn; }, R2.overall.annReturn,
        R2.overall.annReturn === null ? esc(R2.overall.annNote || "ยังไม่ครบปี") : "") +
      sumRow("เป้าที่ตั้งไว้", function (P) { return P.expectedReturnPct === null ? null : P.expectedReturnPct / 100; },
        R.retirement.expectedRatePct === null ? null : R.retirement.expectedRatePct / 100, "ถ่วงตามมูลค่าพอร์ต") +
      "</tbody></table></div>" +
      (anyMissing ? '<div class="aa-q-line">* ไตรมาสที่ไม่มีข้อมูลเงินเติม/ถอนครบ — ระบบคิดส่วนที่ขาดเป็น 0 ตัวเลขจึงอาจคลาดเคลื่อน</div>' : "") +
      '<div class="aa-q-line">“ทั้งพอร์ต” คิดจากมูลค่าและเงินเติม/ถอนรวมของทั้ง 3 พอร์ต ไม่ใช่การเฉลี่ยผลตอบแทน 3 ตัว</div>' +
      "</section>";
  }

  function qualitySection(R) {
    var body = AA().PORTS.map(function (p) {
      var P = R.ports[p];
      var lines = [];
      lines.push('<div class="aa-q-line">' + esc(P.flowCoverage.thai) + "</div>");
      P.warnings.forEach(function (w) { lines.push('<div class="aa-q-line is-warn">' + esc(w.thai) + "</div>"); });
      var imp = [], dis = [], nz = [], inc = [];
      P.quarters.forEach(function (q) {
        q.imputed.forEach(function (x) { imp.push(x.name + " (" + q.key + " · " + thb(x.value) + ")"); });
        q.disappeared.forEach(function (x) { dis.push(x.name + " (หายหลัง " + q.key + " · เคยมี " + thb(x.value) + ")"); });
        q.newZero.forEach(function (x) { nz.push(x.name + " (" + q.key + ")"); });
        if (q.rReason === "inconsistent") inc.push(q.key);
      });
      if (imp.length) lines.push('<div class="aa-q-line">ประมาณเงินเริ่มต้นให้: ' + esc(imp.join(" · ")) + "</div>");
      if (dis.length) lines.push('<div class="aa-q-line">รายการที่หายไปโดยไม่ได้บันทึกการถอน: ' + esc(dis.join(" · ")) + "</div>");
      if (nz.length) lines.push('<div class="aa-q-line">รายการใหม่ที่บันทึกเงินเติม = 0: ' + esc(nz.join(" · ")) + "</div>");
      if (inc.length) lines.push('<div class="aa-q-line is-warn">ไตรมาสที่ตัวเลขไม่สอดคล้อง (ถอนมากกว่ามูลค่าที่มี): ' + esc(inc.join(" · ")) + "</div>");
      return '<div class="aa-q-port"><div class="aa-q-name">' + esc(P.label) + "</div>" + lines.join("") + "</div>";
    }).join("");
    var skipped = R.skippedQuarters.length
      ? '<div class="aa-q-port"><div class="aa-q-name">ไตรมาสที่ข้ามไป</div><div class="aa-q-line">' +
        esc(R.skippedQuarters.join(" · ")) + " — ยังไม่มีมูลค่าสินทรัพย์ จึงไม่ถูกนำมาคิดผลตอบแทน</div></div>"
      : "";
    return '<section class="aa-block"><div class="aa-block-head"><h2>คุณภาพข้อมูล</h2>' +
      '<span class="aa-block-sub">ข้อจำกัดของตัวเลขบนหน้านี้ แสดงไว้ตรง ๆ ไม่ซ่อน</span></div>' +
      '<div class="aa-quality">' + body + skipped + "</div>" +
      AA().PORTS.map(function (p) { return quarterTable(R.ports[p]); }).join("") + "</section>";
  }

  function methodSection(R) {
    return '<section class="aa-block"><details class="aa-details"><summary>วิธีคำนวณ</summary>' +
      '<div class="aa-table-wrap"><ul class="aa-method">' +
      "<li>ผลตอบแทนแต่ละไตรมาสใช้วิธี <b>Modified Dietz</b>: (มูลค่าปลายงวด − มูลค่าต้นงวด − เงินเติม/ถอนสุทธิ) ÷ (มูลค่าต้นงวด + " + R.meta.dietzWeight + " × เงินเติม/ถอนสุทธิ)</li>" +
      "<li>น้ำหนัก " + R.meta.dietzWeight + " หมายถึงสมมติว่าเงินเข้า/ออก <b>กลางไตรมาส</b> เพราะระบบบันทึกเป็นยอดสุทธิทั้งไตรมาสโดยไม่มีวันที่ — ตัวเลขผลตอบแทนทุกตัวจึงมี “~” กำกับว่าเป็นค่าประมาณ</li>" +
      "<li>ดัชนีผลตอบแทนเริ่มที่ <b>100</b> ที่ไตรมาสแรกที่พอร์ตมีมูลค่า แล้วคูณต่อกันไปทีละไตรมาส</li>" +
      "<li>เส้นคาดหวังคือ 100 × (1 + ผลตอบแทนคาดหวังต่อปี) ยกกำลัง (จำนวนไตรมาส ÷ 4) — เป็นการทบต้น ไม่ใช่เส้นตรง</li>" +
      "<li>ตัวเลข “ต่อปี” จะแสดงเมื่อมีข้อมูลตั้งแต่ <b>4 ไตรมาสขึ้นไป</b> เท่านั้น ต่ำกว่านั้นแสดงเป็นผลตอบแทนสะสมพร้อมบอกว่ายังไม่ครบปี</li>" +
      "<li>การย่อลึกสุด (drawdown) วัดจาก<b>ดัชนีผลตอบแทนที่หักเงินเติม/ถอนแล้ว</b> ไม่ใช่มูลค่าพอร์ตดิบ — การถอนเงินไปใช้จึงไม่ถูกนับเป็นการขาดทุน</li>" +
      "<li>รายการเก่าที่ไม่มีข้อมูลเงินเติม/ถอนจะถูกคิดเป็น 0 และทำเครื่องหมายไว้ ส่วนรายการที่เพิ่งโผล่เข้าพอร์ตโดยไม่มีข้อมูลเดิมจะถูกประมาณว่ามูลค่าที่เห็นคือเงินที่ใส่เข้ามา (ไม่ใช่กำไร) และแจ้งไว้ในหัวข้อคุณภาพข้อมูล</li>" +
      "<li>สินทรัพย์หนึ่งตัวแบ่งเข้าได้หลายพอร์ตตามสัดส่วน เช่น Bitcoin ระยะกลาง 30% ระยะยาว 70% — ทั้ง<b>มูลค่าและเงินเติม/ถอน</b>ถูกหารด้วยสัดส่วนเดียวกัน ผลตอบแทนของแต่ละพอร์ตจึงไม่เพี้ยนจากการแบ่ง</li>" +
      "<li>ถ้าสัดส่วนรวมไม่ถึง 100% ส่วนที่เหลือถือว่ายังไม่จัด · ถ้ารวมเกิน 100% ระบบจะไม่นำรายการนั้นเข้าพอร์ตเลย เพื่อไม่ให้ยอดรวมของพอร์ตมากกว่ามูลค่าจริง</li>" +
      "<li>หน้านี้แสดงข้อเท็จจริงจากข้อมูลที่บันทึกไว้เท่านั้น ไม่ใช่คำแนะนำการลงทุน และไม่มีการให้คะแนนหรือจัดอันดับพอร์ต</li>" +
      "</ul></div></details></section>";
  }

  function saveBar() {
    var txt = { idle: dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "ข้อมูลตรงกับที่บันทึกไว้", saving: "กำลังบันทึก…", saved: "บันทึกแล้ว", failed: "บันทึกไม่สำเร็จ" }[saveState] || "";
    var extra = "";
    if (conflict) {
      extra = ' <span class="aa-muted">' + esc(saveMsg) + " — เก็บร่างของคุณไว้ในเครื่องแล้ว</span>" +
        ' <button class="aa-btn" type="button" data-take-remote>ใช้ฉบับจากที่อื่น (ทิ้งของฉัน)</button>' +
        ' <button class="aa-btn aa-btn-danger" type="button" data-overwrite-remote>เอาของฉันทับ</button>';
    } else if (saveState === "failed") {
      extra = ' <span class="aa-muted">' + esc(saveMsg) + " — เก็บร่างไว้ในเครื่องแล้ว</span>" +
        ' <button class="aa-btn" type="button" data-save-now>ลองบันทึกอีกครั้ง</button>' +
        ' <button class="aa-btn aa-btn-danger" type="button" data-discard-draft>ทิ้งร่าง</button>';
    } else if (saveState === "saved" && serverUpdatedAt) {
      extra = ' <span class="aa-muted">' + esc(String(serverUpdatedAt).slice(0, 16).replace("T", " ")) + "</span>";
    }
    return '<div class="aa-savebar" data-save-state="' + saveState + '"><span>' + esc(txt) + "</span>" + extra + "</div>";
  }

  function emptyState(R) {
    var msg = (R && R.reason === "no-values")
      ? "มีไตรมาสอยู่ แต่ยังไม่มีมูลค่าสินทรัพย์ — กรอกมูลค่าใน <a href=\"/\">Quarterly Editor</a> ก่อน"
      : "ยังไม่มีข้อมูลพอร์ตรายไตรมาส — เริ่มจากกรอกสินทรัพย์ของคุณใน <a href=\"/\">Quarterly Editor</a> แล้วกลับมาที่หน้านี้เพื่อแบ่งพอร์ตเป็น 3 ระยะ";
    if (loadError) msg = "โหลดข้อมูลพอร์ตไม่สำเร็จ (" + esc(loadError) + ") — ลองรีเฟรชหน้า";
    return '<section class="aa-hero"><div class="aa-hero-inner">' +
      '<h1 class="aa-title">ASSET ALLOCATION</h1>' +
      '<p class="aa-sub">แบ่งพอร์ตเป็น 3 ระยะ และติดตามผลตอบแทนจริงเทียบกับเป้าหมาย</p>' +
      '<p class="aa-empty-msg">' + msg + "</p></div></section>";
  }

  // ---------------------------------------------------------------- render
  function render() {
    var root = typeof document !== "undefined" && document.getElementById(ROOT_ID);
    if (!root) return;
    if (!AA()) { root.innerHTML = '<div class="mc-empty"><strong>ยังโหลด engine ไม่เสร็จ</strong></div>'; return; }
    if (!allocation) allocation = AA().normalizeAllocation(null);

    if (!psCache) {
      ensurePortfolioFetched(false);
      root.innerHTML = loadError ? emptyState(null) : '<div class="mc-empty"><strong>กำลังโหลดข้อมูลพอร์ต…</strong></div>';
      return;
    }
    var R;
    try { R = AA().compute(psCache, allocation, { horizonQuarters: horizonQuarters }); }
    catch (e) { root.innerHTML = '<div class="mc-empty"><strong>คำนวณไม่สำเร็จ:</strong> ' + esc(e && e.message) + "</div>"; return; }

    if (!R.available) { root.innerHTML = emptyState(R); return; }

    var banner = conflict
      ? '<div class="aa-banner">มีการแก้ไขการจัดพอร์ตจากที่อื่นใหม่กว่าของคุณ (' +
        esc(String(conflict.remoteUpdatedAt).slice(0, 16).replace("T", " ")) +
        ') — ระบบยังไม่บันทึกทับให้ และเก็บร่างของคุณไว้ในเครื่องแล้ว เลือกได้ที่แถบด้านล่างว่าจะใช้ฉบับไหน</div>'
      : draftNotice ? '<div class="aa-banner">' + esc(draftNotice) + "</div>" : "";
    root.innerHTML =
      banner +
      heroSection(R) +
      cardsSection(R) +
      retirementSection(R) +
      fromHereSection(R) +
      recordSection(R) +
      assignSection(R) +
      settingsSection(R) +
      qualitySection(R) +
      methodSection(R) +
      saveBar();
    wire(root);
  }

  // tooltip ตามเมาส์ของทุกกราฟ — ใช้ตำแหน่งเมาส์เทียบกล่อง จึงถูกต้องแม้ SVG ถูกย่อ
  function wireCharts(root) {
    var boxes = root.querySelectorAll(".aa-chart");
    for (var i = 0; i < boxes.length; i++) {
      (function (box) {
        var tip = box.querySelector(".aa-tip");
        if (!tip) return;
        function hide() { tip.style.display = "none"; }
        function show(ev) {
          var el = ev.target;
          var data = el && el.getAttribute ? el.getAttribute("data-tip") : null;
          if (!data) { hide(); return; }
          tip.innerHTML = data;
          tip.style.display = "block";
          var r = box.getBoundingClientRect();
          var x = ev.clientX - r.left, y = ev.clientY - r.top;
          var tw = tip.offsetWidth, th = tip.offsetHeight;
          var left = x + 14;
          if (left + tw > r.width) left = x - tw - 14;   // ชนขอบขวา → พลิกไปซ้าย
          if (left < 0) left = 0;
          var top = y - th - 12;
          if (top < 0) top = y + 18;                      // ชนขอบบน → ย้ายลงล่าง
          tip.style.left = left + "px";
          tip.style.top = top + "px";
        }
        box.addEventListener("mousemove", show);
        box.addEventListener("click", show);              // แตะบนมือถือ
        box.addEventListener("mouseleave", hide);
      })(boxes[i]);
    }
  }

  function wire(root) {
    if (!root || !root.querySelectorAll) return;
    wireCharts(root);
    var sp = root.querySelectorAll("[data-split]");
    for (var s0 = 0; s0 < sp.length; s0++) {
      (function (el) {
        el.addEventListener("change", function () { setSplit(el.getAttribute("data-split"), el.getAttribute("data-port"), el.value); });
      })(sp[s0]);
    }
    var sel = root.querySelectorAll("[data-assign]");
    for (var i = 0; i < sel.length; i++) {
      (function (el) {
        el.addEventListener("change", function () { assign(el.getAttribute("data-assign"), el.value); el.value = ""; });
      })(sel[i]);
    }
    var exp = root.querySelectorAll("[data-expected]");
    for (var j = 0; j < exp.length; j++) {
      (function (el) {
        el.addEventListener("change", function () { setExpected(el.getAttribute("data-expected"), el.value); });
      })(exp[j]);
    }
    var rt = root.querySelectorAll("[data-retire]");
    for (var r0 = 0; r0 < rt.length; r0++) {
      (function (el) {
        el.addEventListener("change", function () { setRetirement(el.getAttribute("data-retire"), el.value); });
      })(rt[r0]);
    }
    var me = root.querySelector("[data-monthly-expense]");
    if (me) me.addEventListener("change", function () { setMonthlyExpense(me.value); });
    var hz = root.querySelector("[data-horizon]");
    if (hz) hz.addEventListener("change", function () { setHorizon(hz.value); });
    var sn = root.querySelector("[data-save-now]");
    if (sn) sn.addEventListener("click", function () { persist(); });
    var dd = root.querySelector("[data-discard-draft]");
    if (dd) dd.addEventListener("click", function () { discardDraft(); });
    var tr = root.querySelector("[data-take-remote]");
    if (tr) tr.addEventListener("click", function () { takeRemote(); });
    var ow = root.querySelector("[data-overwrite-remote]");
    if (ow) ow.addEventListener("click", function () { overwriteRemote(); });
    var ds = root.querySelectorAll("[data-drop-stale]");
    for (var k = 0; k < ds.length; k++) {
      (function (el) {
        el.addEventListener("click", function () { dropStaleKey(el.getAttribute("data-drop-stale")); });
      })(ds[k]);
    }
  }

  function init() {
    horizonQuarters = readHorizon();
    allocation = AA() ? AA().normalizeAllocation(null) : null;
    render();
    ensurePortfolioFetched(false);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("portfolio-data-snapshot", function () { ensurePortfolioFetched(true); });
    window.addEventListener("focus", refreshOnFocus);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", refreshOnFocus);
    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
    window.AssetAllocationPage = {
      render: render,
      assign: assign,
      setSplit: setSplit,
      setExpected: setExpected,
      setMonthlyExpense: setMonthlyExpense,
      setRetirement: setRetirement,
      setHorizon: setHorizon,
      dropStaleKey: dropStaleKey,
      discardDraft: discardDraft,
      overwriteRemote: overwriteRemote,
      takeRemote: takeRemote,
      persistNow: persist
    };
  }
})();
