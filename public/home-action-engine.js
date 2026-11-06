/* ============================================================
 * HOME ACTION ENGINE — เอนจิน "กล่อง Action ประจำวัน" บน /home
 *
 * สัญญาของไฟล์นี้ (ละเมิดข้อใดข้อหนึ่ง = บั๊ก):
 *   · pure — ไม่แตะ DOM / fetch / localStorage / นาฬิกาเครื่อง
 *     "ตอนนี้" ต้องส่งเข้ามาเป็นพารามิเตอร์ nowBangkok ("YYYY-MM-DDTHH:mm" เวลากรุงเทพ)
 *   · ES5 เท่านั้น — ใช้ได้ทั้งในเบราว์เซอร์ (window.HomeActionEngine) และ Node (module.exports)
 *   · ค่าที่ไม่รู้ = null เสมอ ห้ามเป็น NaN / Infinity / undefined
 *   · ไม่คิดกฎเอง — ผลกฎทุกข้อมาจาก DecisionJournal.evaluateRules (กติกาเดียวกับ /decision-journal)
 *     รับเอนจินผ่าน opts.D หรือ window.DecisionJournal / require("./decision-journal-engine.js")
 *     แท่งที่ "ปิดตลาดแล้ว" ใช้ closedBarCutoff + asOfBars ของเอนจินนั้น (แท่งที่ยังไม่ปิดไม่นับ)
 *   · ไม่ใช่คำแนะนำการลงทุน — บอกแค่ว่ากฎที่ผู้ใช้ตั้งเอง "เพิ่งพูด" อะไรบนแท่งไหน
 *
 * สัญญาณ = เหตุการณ์ ไม่ใช่สถานะ (สเปก 2026-11-06 ข้อ 1 + 3):
 *   ไล่ทีละแท่งย้อนหลัง LOOKBACK_BARS แท่งที่ปิดแล้ว · เหตุการณ์เกิดบนแท่งที่เงื่อนไขพลิกจาก "ไม่จริง" (แท่งก่อนหน้า)
 *   เป็น "จริง" (แท่งนี้) · วันสัญญาณ = วันที่ของแท่งนั้น · ราคาปิดของแท่งนั้น = ฐานวัดผล
 *   กฎ 1 : แท่งที่ EMA12 ตัด EMA26 (r1.crossBarsAgo === 0) → cross-up = ซื้อ · cross-down = ขาย
 *   กฎ 2 : ขาย = แท่งแรกที่ r2.breakConfirmed เป็นจริง (แท่งยืนยัน ไม่ใช่แท่งที่ข้าม) → break
 *          ซื้อ = แท่งแรกที่ r2.reclaimHeld หรือ r2.touchBounce.met เป็นจริง → หนึ่งเหตุการณ์
 *          reclaim (ยืนได้ · ชนะเมื่อเกิดแท่งเดียวกับเด้ง) ไม่งั้น bounce (แตะแล้วเด้ง)
 *   กฎ 3 : แท่งแรกที่ r3.dipMet เป็นจริงในรอบย่อ → dip · รอบย่อจบเมื่อ dd1yPct ฟื้นดีกว่า DIP_RESET_PCT
 *          (hysteresis กันสัญญาณซ้ำตอนราคาแกว่งแถว −20%) · รอบย่อที่เริ่มก่อนช่วงไล่ไม่นับเป็นเหตุการณ์
 *          (สถานะตอนเข้าช่วงไล่ = แท่งชี้ขาดล่าสุดก่อนช่วงไล่ ดู armedAtStart — ไม่ใช่เดาจากแท่งแรกของช่วงไล่)
 *   แท่งแรกของข้อมูลทั้งหมด (ไม่มีแท่งก่อนหน้า) เกิดได้เฉพาะกฎ 1
 * ============================================================ */
(function () {
  "use strict";

  // ---------- ค่าคงที่ (ส่งออกทั้งหมด เพื่อให้หน้าเว็บพิมพ์ "วิธีคิด" จากค่าจริง) ----------
  var VERSION = "ha-1";
  var WINDOW_DAYS = 3;        // หน้าต่างให้ติ๊ก = วันปฏิทินกรุงเทพหลังแท่งสัญญาณปิด ถึงสิ้นวัน D+3
  var LOOKBACK_BARS = 45;     // ไล่ย้อนหลังกี่แท่งที่ปิดแล้ว (≥ 30 วันปฏิทินตามสเปก แม้เป็นคริปโตที่มีแท่งทุกวัน)
  var DIP_RESET_PCT = -10;    // กฎ 3: drawdown ต้องฟื้นดีกว่านี้ก่อนจึงเริ่มรอบย่อใหม่ได้
  var SUMMARY_DAYS = 90;      // ช่วงสัญญาณของสรุป (ตายตัว)
  var HORIZONS = [7, 30];     // ช่วงวัดผลที่สลับได้ในสรุป
  var SOURCE = "home-action"; // ป้าย source ของ entry ในเอกสาร Decision Journal
  var RULE_LABEL = { 1: "กฎ 1 EMA12/26", 2: "กฎ 2 SMA200", 3: "กฎ 3 ย่อ ≥20%" };

  // ---------- เอนจินกฎ ----------
  // ลำดับ: opts.D → window.DecisionJournal (เบราว์เซอร์) → require (Node) · หาไม่เจอ = null (ผลว่าง ไม่เดา)
  function resolveD(d) {
    if (d && typeof d.evaluateRules === "function") return d;
    if (typeof window !== "undefined" && window.DecisionJournal && typeof window.DecisionJournal.evaluateRules === "function") {
      return window.DecisionJournal;
    }
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try { return require("./decision-journal-engine.js"); } catch (e) { return null; }
    }
    return null;
  }

  function emptyResult() {
    return { ok: false, asOfBar: null, latest: null, events: [] };
  }

  // ผลกฎ ณ แท่ง i (ใช้แท่ง 0..i ของชุดที่ปิดแล้ว · conviction ไม่เกี่ยวกับการหาเหตุการณ์)
  function evalAt(D, closed, i, nowBangkok, sym) {
    return D.evaluateRules(closed, { date: closed[i].date, nowBangkok: nowBangkok, symbol: sym, conviction: false });
  }

  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  // วันที่ของแท่งที่ราคาปิดข้าม SMA200 (crossBarsAgo นับจากแท่ง i) · ไม่รู้ = null
  function crossDateOf(closed, i, barsAgo) {
    if (!isNum(barsAgo) || barsAgo < 0 || i - barsAgo < 0) return null;
    return closed[i - barsAgo].date;
  }

  // ฝั่งซื้อของกฎ 2 = ยืนได้ หรือ แตะแล้วเด้ง (ตรงกับ r2.buy ของเอนจิน) · na = ไม่จริง
  function r2BuyOn(res) {
    var r2 = res && res.r2;
    if (!r2) return false;
    return r2.reclaimHeld === true || (!!r2.touchBounce && r2.touchBounce.met === true);
  }

  function mkEvent(sym, rule, side, date, close, kind, detail) {
    return {
      symbol: sym,
      rule: rule,
      side: side,
      date: date,
      close: isNum(close) ? close : null,
      kind: kind,
      detail: detail
    };
  }

  // กฎ 3: "พร้อมยิง" ไหม ตอนเข้าแท่งแรกของช่วงไล่ (แท่ง start) = ผลของแท่งชี้ขาดล่าสุดก่อนหน้านั้น
  //   ไล่ย้อนจากแท่ง start − 1: dipMet → อยู่ในรอบย่อ (ไม่พร้อม) · dd ดีกว่า DIP_RESET_PCT หรือไม่รู้ dd → พร้อม
  //   dd อยู่ระหว่าง −20% กับ DIP_RESET_PCT ยังตัดสินไม่ได้ (รอบย่ออาจยังไม่เริ่ม) → ย้อนต่อ
  //   ย้อนไม่เกิน HIGH1Y_BARS แท่ง · ไม่เจอแท่งชี้ขาด / ไม่มีแท่งก่อนหน้า → พร้อม
  //   (กติกาเดียวกับ hysteresis ในลูปหลัก — ช่วงไล่ที่เลื่อนไปหนึ่งแท่งต้องได้เหตุการณ์ชุดเดิม ไม่ให้สัญญาณที่เห็นแล้วหายกลางหน้าต่าง)
  //   prevRes = ผลของแท่ง start − 1 ที่คิดไว้แล้ว (ไม่คิดซ้ำ)
  function armedAtStart(D, closed, start, prevRes, nowBangkok, sym) {
    var cap = isNum(D.HIGH1Y_BARS) && D.HIGH1Y_BARS > 0 ? D.HIGH1Y_BARS : 252;
    var stop = Math.max(0, start - cap);
    var j, rj, r3;
    for (j = start - 1; j >= stop; j--) {
      rj = (j === start - 1 && prevRes) ? prevRes : evalAt(D, closed, j, nowBangkok, sym);
      r3 = (rj && rj.r3) ? rj.r3 : {};
      if (r3.dipMet === true) return false;
      if (!isNum(r3.dd1yPct) || r3.dd1yPct > DIP_RESET_PCT) return true;
    }
    return true;
  }

  // ---------- detectEvents ----------
  // opts = { symbol, nowBangkok, D? }
  // → { ok, asOfBar, latest: ผล evaluateRules ของแท่ง as-of | null, events: Event[] เรียงเก่า→ใหม่ }
  // Event = { symbol, rule: 1|2|3, side: "buy"|"sell", date, close, kind, detail }
  //   kind : cross-up | cross-down (กฎ 1) · break | reclaim | bounce (กฎ 2) · dip (กฎ 3)
  //   detail : break/reclaim → { crossDate } · bounce → { touchDate } · dip → { high1y, high1yDate, dd1yPct } · กฎ 1 → {}
  function detectEvents(bars, opts) {
    var o = opts || {};
    var out = emptyResult();
    var D = resolveD(o.D);
    if (!D) return out;
    var sym = D.canonicalSymbol(o.symbol);
    var cutoff = D.closedBarCutoff(D.marketOf(sym), o.nowBangkok);
    if (cutoff === null) return out;              // ไม่รู้เวลา = ไม่รู้ว่าแท่งไหนปิดแล้ว → ไม่เดา
    var closed = D.asOfBars(bars, cutoff, o.nowBangkok, sym).bars;
    var n = closed.length;
    if (n === 0) return out;

    var start = Math.max(0, n - LOOKBACK_BARS);
    var prev = start > 0 ? evalAt(D, closed, start - 1, o.nowBangkok, sym) : null;
    var armed = armedAtStart(D, closed, start, prev, o.nowBangkok, sym);   // กฎ 3: สถานะตอนเข้าช่วงไล่
    var events = [];
    var res = null;
    var i, date, dd, tb;

    for (i = start; i < n; i++) {
      res = evalAt(D, closed, i, o.nowBangkok, sym);
      date = closed[i].date;

      // กฎ 1 — แท่งที่ EMA12 ตัด EMA26 (เหตุการณ์ในตัวเอง ไม่ต้องเทียบแท่งก่อน)
      if (res.r1.crossBarsAgo === 0 && (res.r1.crossDir === "up" || res.r1.crossDir === "down")) {
        events.push(res.r1.crossDir === "up"
          ? mkEvent(sym, 1, "buy", date, res.close, "cross-up", {})
          : mkEvent(sym, 1, "sell", date, res.close, "cross-down", {}));
      }

      // กฎ 2 — ต้องมีแท่งก่อนหน้าไว้เทียบว่าเงื่อนไข "เพิ่ง" เป็นจริง
      if (prev !== null) {
        if (res.r2.breakConfirmed === true && prev.r2.breakConfirmed !== true) {
          events.push(mkEvent(sym, 2, "sell", date, res.close, "break",
            { crossDate: crossDateOf(closed, i, res.r2.crossBarsAgo) }));
        }
        if (r2BuyOn(res) && !r2BuyOn(prev)) {
          if (res.r2.reclaimHeld === true) {
            events.push(mkEvent(sym, 2, "buy", date, res.close, "reclaim",
              { crossDate: crossDateOf(closed, i, res.r2.crossBarsAgo) }));
          } else {
            tb = res.r2.touchBounce;
            events.push(mkEvent(sym, 2, "buy", date, res.close, "bounce",
              { touchDate: (tb && typeof tb.touchDate === "string") ? tb.touchDate : null }));
          }
        }
      }

      // กฎ 3 — หนึ่งรอบย่อ หนึ่งเหตุการณ์ · ฟื้นดีกว่า DIP_RESET_PCT จึงเริ่มรอบใหม่
      //   รอบย่อที่เริ่มก่อนช่วงไล่ → armedAtStart คืน false → ไม่นับ (แท่งย่อในช่วงไล่ไม่ใช่แท่งที่เงื่อนไขพลิก)
      dd = isNum(res.r3.dd1yPct) ? res.r3.dd1yPct : null;
      if (armed && res.r3.dipMet === true) {
        events.push(mkEvent(sym, 3, "buy", date, res.close, "dip", {
          high1y: isNum(res.r3.high1y) ? res.r3.high1y : null,
          high1yDate: typeof res.r3.high1yDate === "string" ? res.r3.high1yDate : null,
          dd1yPct: dd
        }));
        armed = false;
      } else if (!armed && dd !== null && dd > DIP_RESET_PCT) {
        armed = true;
      }

      prev = res;
    }

    out.latest = res;
    out.ok = res.ok === true;
    out.asOfBar = res.asOfBar;
    out.events = events;
    return out;
  }

  // ---------- เอกลักษณ์รายการ (สเปกข้อ 3) ----------
  // "SYMBOL|rule|side|date" · ใช้เทียบกับประวัติใน Decision Journal (รวม tombstone)
  function eventKey(ev) {
    if (!ev || typeof ev !== "object") return null;
    return String(ev.symbol) + "|" + ev.rule + "|" + ev.side + "|" + ev.date;
  }

  // id ของ entry ในเอกสาร Decision Journal — คำนวณจากเหตุการณ์ล้วน (ไม่สุ่ม)
  // → รายการที่ผู้ใช้ลบ (tombstone เหลือแค่ id) ยังจับคู่กับเหตุการณ์เดิมได้ ไม่ถูกบันทึกซ้ำ
  function entryIdOf(ev) {
    if (!ev || typeof ev !== "object") return null;
    return "ha_" + String(ev.symbol) + "_" + ev.rule + "_" + ev.side + "_" + ev.date;
  }

  // ---------- ชื่อเหตุการณ์ภาษาไทย ----------
  var KIND_THAI = {
    "cross-up": "EMA12 ตัดขึ้น EMA26",
    "cross-down": "EMA12 ตัดลง EMA26",
    "break": "หลุด SMA200 ยืนยัน",
    "reclaim": "ยืนเหนือ SMA200 ได้",
    "bounce": "แตะ SMA200 แล้วเด้ง",
    "dip": "ย่อถึง 20% จาก high 1 ปี"
  };

  // kind ที่ไม่รู้จัก = null (ไม่เดาชื่อ)
  function kindThai(kind) {
    return (typeof kind === "string" && Object.prototype.hasOwnProperty.call(KIND_THAI, kind)) ? KIND_THAI[kind] : null;
  }

  // ---------- หน้าต่าง 3 วัน (สเปกข้อ 2) ----------
  // visibility(ev, nowBangkok, D?) → { lastDay, daysLeft, visible, expired }
  //   lastDay  = วันสัญญาณ + WINDOW_DAYS (เห็นได้ถึงสิ้นวันนั้นตามเวลากรุงเทพ)
  //   daysLeft = lastDay − วันนี้ (0 = วันสุดท้าย) · พ้นหน้าต่างแล้ว = 0
  //   visible  = วันนี้ <= lastDay · expired = พ้นหน้าต่างแล้ว
  //   ไม่รู้วันนี้ (nowBangkok เพี้ยน) หรือวันสัญญาณเพี้ยน → daysLeft null · visible false · expired false
  //     (ไม่แสดง และไม่บันทึกเป็น "ไม่ได้ตอบ" — ไม่เดาว่าหมดเวลาแล้ว)
  function visibility(ev, nowBangkok, d) {
    var D = resolveD(d);
    var lastDay = (D && ev && typeof ev === "object") ? D.ymdAdd(ev.date, WINDOW_DAYS) : null;
    var now = (D && D._internal && typeof D._internal.parseNow === "function") ? D._internal.parseNow(nowBangkok) : null;
    if (lastDay === null || now === null) {
      return { lastDay: lastDay, daysLeft: null, visible: false, expired: false };
    }
    var visible = now.ymd <= lastDay;
    return {
      lastDay: lastDay,
      daysLeft: visible ? D.daysBetween(now.ymd, lastDay) : 0,
      visible: visible,
      expired: !visible
    };
  }

  // ---------- เทียบเหตุการณ์กับประวัติใน Decision Journal (สเปกข้อ 2 + 3) ----------
  // reconcile(events, entries, opts: { nowBangkok, launchedAt: ymd|null, D? })
  // → { open: [{ event, entry|null, vis }], expired: Event[], ignored: number }
  //   entries = ทุกรายการในเอกสาร รวม tombstone (จับคู่ด้วย id === entryIdOf(ev))
  //   · date < launchedAt                → ignored (ก่อนเริ่มใช้งาน ไม่บันทึก ไม่แสดง)
  //   · มี entry ที่ลบแล้ว (tombstone)      → ข้าม (ผู้ใช้ไม่ต้องการรายการนี้ ห้ามบันทึกซ้ำ)
  //   · มี entry · ยังอยู่ในหน้าต่าง         → open พร้อม entry (แก้คำตอบได้)
  //   · มี entry · พ้นหน้าต่าง              → ไม่แสดง (บันทึกไว้แล้ว)
  //   · ยังไม่มี entry · อยู่ในหน้าต่าง       → open (entry null) รอผู้ใช้ติ๊ก
  //   · ยังไม่มี entry · พ้นหน้าต่าง          → expired[] ให้หน้าเว็บบันทึกเป็น "ไม่ได้ตอบ"
  //   id ซ้ำในรายการ (ไม่ควรเกิดหลัง mergeDocs) → ตัวที่ลบแล้วชนะ (กันบันทึกซ้ำ)
  function reconcile(events, entries, opts) {
    var o = opts || {};
    var D = resolveD(o.D);
    var out = { open: [], expired: [], ignored: 0 };
    var evs = Array.isArray(events) ? events : [];
    var list = Array.isArray(entries) ? entries : [];
    var launchedAt = (D && D.isYmd(o.launchedAt)) ? o.launchedAt : null;
    var byId = {};
    var i, it, ev, id, entry, vis;

    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (!it || typeof it !== "object" || typeof it.id !== "string" || it.id === "") continue;
      if (Object.prototype.hasOwnProperty.call(byId, it.id) && byId[it.id].deletedAt) continue;
      byId[it.id] = it;
    }

    for (i = 0; i < evs.length; i++) {
      ev = evs[i];
      if (!ev || typeof ev !== "object") continue;
      if (launchedAt !== null && typeof ev.date === "string" && ev.date < launchedAt) {
        out.ignored++;
        continue;
      }
      vis = visibility(ev, o.nowBangkok, D);
      id = entryIdOf(ev);
      entry = Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null;
      if (entry !== null) {
        if (entry.deletedAt) continue;
        if (vis.visible) out.open.push({ event: ev, entry: entry, vis: vis });
        continue;
      }
      if (vis.visible) out.open.push({ event: ev, entry: null, vis: vis });
      else if (vis.expired) out.expired.push(ev);
    }
    return out;
  }

  // ---------- สร้าง entry (สเปกข้อ 4) ----------
  var RESPONSES = ["done", "skipped", "unanswered"];

  function numOrNull(v) {
    return isNum(v) ? v : null;
  }

  function strOrNull(v) {
    return (typeof v === "string" && v !== "") ? v : null;
  }

  // ก๊อป detail แบบตื้น (entry ไม่แชร์ object กับเหตุการณ์) · undefined / NaN / Infinity → null
  function cleanDetail(detail) {
    var out = {};
    var k, v;
    if (!detail || typeof detail !== "object") return out;
    for (k in detail) {
      if (!Object.prototype.hasOwnProperty.call(detail, k)) continue;
      v = detail[k];
      out[k] = (v === undefined || (typeof v === "number" && !isFinite(v))) ? null : v;
    }
    return out;
  }

  // makeEntry(ev, opts: { response, nowIso, respondedAt, execPrice, positionValue, positionCurrency, amount, D? }) → entry | null
  //   ไม่มี view และไม่มี verdict — entry นี้ไม่ใช่ "คำทำนาย" ของผู้ใช้ (สถิติเดิมของ /decision-journal ต้องกรองออก)
  //   action.kind = ฝั่งที่กฎบอก (ไม่ใช่สิ่งที่ผู้ใช้ทำ) · rules.close = ราคาปิดแท่งสัญญาณ (ฐานวัดผล)
  //   ha.execPrice = ราคาที่ผู้ใช้ทำจริง ใช้แสดงเท่านั้น · response ที่ไม่รู้จัก = null
  //   คืน null เมื่อไม่มีเอนจิน / ev ใช้ไม่ได้ / nowIso ไม่ใช่สตริง / ผลไม่ผ่าน itemProblems
  //   (รายการเสียตัวเดียวทำให้เซิร์ฟเวอร์ปฏิเสธทั้งเอกสาร — ไม่ส่งออกไปเด็ดขาด)
  function makeEntry(ev, opts) {
    var o = opts || {};
    var D = resolveD(o.D);
    var stamp = strOrNull(o.nowIso);
    if (!D || !ev || typeof ev !== "object" || stamp === null) return null;
    var kt = kindThai(ev.kind);
    var rule = isNum(ev.rule) ? ev.rule : null;
    var entry = {
      id: entryIdOf(ev),
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      date: ev.date,
      symbol: ev.symbol,
      label: "",
      source: SOURCE,
      ha: {
        key: eventKey(ev),
        rule: rule,
        side: strOrNull(ev.side),
        kind: strOrNull(ev.kind),
        response: RESPONSES.indexOf(o.response) >= 0 ? o.response : null,
        respondedAt: strOrNull(o.respondedAt),
        execPrice: numOrNull(o.execPrice),
        positionValue: numOrNull(o.positionValue),
        positionCurrency: strOrNull(o.positionCurrency),
        amount: numOrNull(o.amount),
        windowEnd: D.ymdAdd(ev.date, WINDOW_DAYS),
        detail: cleanDetail(ev.detail)
      },
      action: { kind: strOrNull(ev.side), plan: "", conviction: false, tradeIds: [] },
      rules: { asOfBar: ev.date, close: numOrNull(ev.close), version: D.RULES_VERSION },
      context: {
        event: "กล่อง Action · กฎ " + (rule === null ? "?" : rule) + (kt === null ? "" : " · " + kt),
        feelings: [],
        note: ""
      },
      review: { reviewedAt: null, selfVerdict: null, lesson: "" }
    };
    if (D.itemProblems(entry).length > 0) return null;
    return entry;
  }

  // entry นี้มาจากกล่อง Action ไหม · null / ไม่ใช่ object = false
  function isHomeAction(entry) {
    return !!entry && typeof entry === "object" && entry.source === SOURCE;
  }

  // ---------- ผลต่อพอร์ต (สเปกข้อ 5 + 6) ----------
  // ทิศของผล: ขาย → ราคาลง = ผลบวก (เลี่ยงได้) · ซื้อ → ราคาขึ้น = ผลบวก
  // ฝั่งของ entry อ่านจาก ha.side · ไม่ใช่ buy/sell = null
  function sideOf(entry) {
    var ha = (entry && typeof entry === "object" && entry.ha && typeof entry.ha === "object") ? entry.ha : null;
    var s = ha ? ha.side : null;
    return (s === "buy" || s === "sell") ? s : null;
  }

  // impactPct(entry, pct) → % ผลต่อพอร์ต | null
  //   pct = % ที่ราคาขยับจากราคาปิดวันสัญญาณ (จาก DecisionJournal.outcomes) · ขาย → กลับเครื่องหมาย · ซื้อ → ตามเดิม
  //   pct ไม่ใช่ตัวเลขจริง หรือไม่รู้ฝั่ง → null (ไม่เดาว่าเป็นฝั่งซื้อ)
  //   ใช้ 0 − pct แทน −pct กัน −0 (ราคาไม่ขยับ = 0)
  function impactPct(entry, pct) {
    var side = sideOf(entry);
    if (!isNum(pct) || side === null) return null;
    return side === "sell" ? 0 - pct : pct;
  }

  // impactMoney(entry, pct) → { amount, currency }
  //   ฐาน = ha.amount (ซื้อ · ผู้ใช้กรอกเป็นบาท) หรือ ha.positionValue (ขาย · มูลค่าที่ถือตอนติ๊ก)
  //   amount = ฐาน × impactPct / 100 · ค่าดิบไม่ปัด (หน้าเว็บปัดเอง) · คูณก่อนหารกันเศษทศนิยม (50000 × 4 / 100 = 2000 พอดี)
  //   ฐานไม่ใช่ตัวเลข > 0 หรือ impactPct เป็น null → { amount: null, currency: null } (หน้าเว็บบอก "ไม่มีฐานเงิน")
  //   สกุล: ขาย = ha.positionCurrency (ไม่ระบุ = THB) · ซื้อ = THB เสมอ
  function impactMoney(entry, pct) {
    var ip = impactPct(entry, pct);
    if (ip === null) return { amount: null, currency: null };
    var ha = entry.ha;
    var sell = sideOf(entry) === "sell";
    var base = sell ? ha.positionValue : ha.amount;
    if (!isNum(base) || base <= 0) return { amount: null, currency: null };
    return {
      amount: base * ip / 100,
      currency: sell ? (strOrNull(ha.positionCurrency) || "THB") : "THB"
    };
  }

  // ---------- สรุปผล (สเปกข้อ 5 + 6) ----------
  var STATUSES = ["scored", "pending", "no-data"];

  // ผลวัดของ outcome ที่ช่วง h วัน → { status, pct }
  //   ไม่มี outcome / ไม่มีช่วงนั้น / status ที่ไม่รู้จัก → no-data
  //   scored แต่ pct ไม่ใช่ตัวเลขจริง (ข้อมูลขัดกันเอง) → no-data · pct มีค่าเฉพาะตอน scored (ตรงกับ outcomes)
  function horizonOf(outcome, h) {
    var hs = (outcome && typeof outcome === "object" && outcome.horizons && typeof outcome.horizons === "object") ? outcome.horizons : null;
    var key = String(h);
    var hz = (hs && Object.prototype.hasOwnProperty.call(hs, key)) ? hs[key] : null;
    var status = (hz && typeof hz === "object" && STATUSES.indexOf(hz.status) >= 0) ? hz.status : "no-data";
    if (status !== "scored") return { status: status, pct: null };
    if (!isNum(hz.pct)) return { status: "no-data", pct: null };
    return { status: "scored", pct: hz.pct };
  }

  // ตัวสะสมค่าเฉลี่ย + เงินรายสกุล + จำนวนแถวที่มีฐานเงินรายสกุล (moneyN — เงินรวมมาจากกี่แถว ไม่ใช่ทุกแถวที่ n นับ)
  function makeAcc() {
    return { n: 0, sum: 0, money: {}, moneyN: {} };
  }

  function accAdd(acc, ip, money) {
    var cur;
    acc.n++;
    acc.sum += ip;
    if (money && isNum(money.amount) && typeof money.currency === "string") {
      cur = money.currency;
      acc.money[cur] = (Object.prototype.hasOwnProperty.call(acc.money, cur) ? acc.money[cur] : 0) + money.amount;
      acc.moneyN[cur] = (Object.prototype.hasOwnProperty.call(acc.moneyN, cur) ? acc.moneyN[cur] : 0) + 1;
    }
  }

  // ค่าเฉลี่ย · n = 0 → null (ไม่ใช่ NaN)
  function accAvg(acc) {
    return acc.n > 0 ? acc.sum / acc.n : null;
  }

  // วันใหม่→เก่า · วันเดียวกันเรียง id น้อย→มาก (ลำดับคงที่ทุกครั้งที่วาด)
  function byDateDescIdAsc(a, b) {
    var ia, ib;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    ia = String(a.id);
    ib = String(b.id);
    if (ia === ib) return 0;
    return ia < ib ? -1 : 1;
  }

  // summary(entries, outcomesById, opts: { nowBangkok, horizonDays: 7|30, D? })
  // → { horizonDays, since, counts, followed, missed, byRule, rows }
  //   outcomesById[entry.id] = DecisionJournal.outcomes(entry, bars, nowBangkok) — หน้าเว็บคิดมาให้ (เอนจินนี้ไม่แตะราคา)
  //   นับเฉพาะ entry ของกล่อง Action (isHomeAction) ที่ไม่ถูกลบ · date เป็น ymd · date >= since (วันนี้ − SUMMARY_DAYS)
  //   horizonDays ที่ไม่อยู่ใน HORIZONS → ใช้ HORIZONS[0] · ผลบอก horizonDays ที่ใช้จริง
  //   ไม่มีเอนจิน / nowBangkok อ่านไม่ได้ → since null และไม่มีแถว (ไม่รู้ว่าวันนี้คือวันไหน = ไม่เดาช่วง 90 วัน)
  //   counts   : done / skipped / unanswered ตาม ha.response (คำตอบที่ไม่รู้จัก = นับใน total อย่างเดียว)
  //              pending = แถวที่ช่วงที่เลือกยังไม่ scored (pending หรือ no-data) · total = ทุกแถวที่นับ
  //   followed : คำตอบ done ที่ scored แล้ว → { n, avgPct (เฉลี่ย impactPct), money: { สกุล: ผลรวม } เฉพาะแถวที่มีฐานเงิน,
  //              moneyN: { สกุล: จำนวนแถวที่มีฐานเงิน } } — moneyN < n = เงินรวมมาจากบางแถว (หน้าเว็บต้องบอก)
  //   missed   : skipped + unanswered ที่ scored แล้ว — คิดแบบเดียวกัน ตัวเลขอ่านว่า "ถ้าทำจะได้"
  //   byRule   : "1" "2" "3" → { n, avgPct } ทุกแถวที่ scored ไม่สนคำตอบ (กฎนั้นพูดแล้วราคาไปทางไหน)
  //   rows     : ทุกแถวที่นับ (scored หรือไม่ก็ตาม) เรียงวันที่ใหม่→เก่า · pct/status ของทั้ง 7 และ 30 วัน ·
  //              impactPct / money ของช่วงที่เลือก (ยังไม่ scored หรือไม่รู้ฝั่ง = null)
  //   ค่าดิบทั้งหมด ไม่ปัด — หน้าเว็บปัดเอง
  function summary(entries, outcomesById, opts) {
    var o = opts || {};
    var D = resolveD(o.D);
    var h = HORIZONS.indexOf(o.horizonDays) >= 0 ? o.horizonDays : HORIZONS[0];
    var now = (D && D._internal && typeof D._internal.parseNow === "function") ? D._internal.parseNow(o.nowBangkok) : null;
    var since = now ? D.ymdAdd(now.ymd, -SUMMARY_DAYS) : null;
    var list = (since !== null && Array.isArray(entries)) ? entries : [];
    var ocs = (outcomesById && typeof outcomesById === "object") ? outcomesById : {};
    var counts = { done: 0, skipped: 0, unanswered: 0, pending: 0, total: 0 };
    var fol = makeAcc();
    var mis = makeAcc();
    var rules = { "1": makeAcc(), "2": makeAcc(), "3": makeAcc() };
    var rows = [];
    var i, e, ha, rs, oc, h7, h30, cur, ip, money, resp, rule, ruleKey;

    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!isHomeAction(e) || e.deletedAt || !D.isYmd(e.date) || e.date < since) continue;
      ha = (e.ha && typeof e.ha === "object") ? e.ha : {};
      rs = (e.rules && typeof e.rules === "object") ? e.rules : {};
      oc = (typeof e.id === "string" && Object.prototype.hasOwnProperty.call(ocs, e.id)) ? ocs[e.id] : null;
      h7 = horizonOf(oc, 7);
      h30 = horizonOf(oc, 30);
      cur = horizonOf(oc, h);
      ip = cur.status === "scored" ? impactPct(e, cur.pct) : null;
      money = ip !== null ? impactMoney(e, cur.pct) : { amount: null, currency: null };
      resp = RESPONSES.indexOf(ha.response) >= 0 ? ha.response : null;
      rule = numOrNull(ha.rule);

      counts.total++;
      if (resp !== null) counts[resp]++;
      if (cur.status !== "scored") counts.pending++;
      if (ip !== null) {
        if (resp === "done") accAdd(fol, ip, money);
        else if (resp === "skipped" || resp === "unanswered") accAdd(mis, ip, money);
        ruleKey = String(rule);
        if (rule !== null && Object.prototype.hasOwnProperty.call(rules, ruleKey)) accAdd(rules[ruleKey], ip, null);
      }

      rows.push({
        id: strOrNull(e.id),
        date: e.date,
        symbol: strOrNull(e.symbol),
        rule: rule,
        side: sideOf(e),
        kind: strOrNull(ha.kind),
        response: resp,
        refClose: numOrNull(rs.close),
        execPrice: numOrNull(ha.execPrice),
        pct7: h7.pct,
        pct30: h30.pct,
        status7: h7.status,
        status30: h30.status,
        impactPct: ip,
        money: money
      });
    }

    rows.sort(byDateDescIdAsc);
    return {
      horizonDays: h,
      since: since,
      counts: counts,
      followed: { n: fol.n, avgPct: accAvg(fol), money: fol.money, moneyN: fol.moneyN },
      missed: { n: mis.n, avgPct: accAvg(mis), money: mis.money, moneyN: mis.moneyN },
      byRule: {
        "1": { n: rules["1"].n, avgPct: accAvg(rules["1"]) },
        "2": { n: rules["2"].n, avgPct: accAvg(rules["2"]) },
        "3": { n: rules["3"].n, avgPct: accAvg(rules["3"]) }
      },
      rows: rows
    };
  }

  var HomeActionEngine = {
    VERSION: VERSION,
    WINDOW_DAYS: WINDOW_DAYS,
    LOOKBACK_BARS: LOOKBACK_BARS,
    DIP_RESET_PCT: DIP_RESET_PCT,
    SUMMARY_DAYS: SUMMARY_DAYS,
    HORIZONS: HORIZONS,
    SOURCE: SOURCE,
    RULE_LABEL: RULE_LABEL,

    detectEvents: detectEvents,
    eventKey: eventKey,
    entryIdOf: entryIdOf,
    kindThai: kindThai,
    visibility: visibility,
    reconcile: reconcile,
    makeEntry: makeEntry,
    isHomeAction: isHomeAction,
    impactPct: impactPct,
    impactMoney: impactMoney,
    summary: summary
  };

  if (typeof window !== "undefined") window.HomeActionEngine = HomeActionEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = HomeActionEngine;
})();
