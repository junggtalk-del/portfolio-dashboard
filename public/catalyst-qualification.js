(function () {
  "use strict";
  // ============================================================
  // CATALYST QUALIFICATION LAYER (PHASE 3.1)
  //
  // หน้าที่: รวมผลจาก "ระนาบที่มีอยู่แล้ว" ให้เป็นสถานะสุดท้ายแบบ deterministic
  // ไม่ดึงข้อมูลใหม่ ไม่คิดตัวชี้วัดใหม่ ไม่ให้คะแนน 0-100
  //
  // แนวคิดหลักที่ต้องไม่พัง (§1):
  //   งบฟื้น ≠ catalyst
  //     รายได้/EPS/มาร์จิ้นดีขึ้น โดยไม่มีเรื่องใหม่ = FUNDAMENTAL_RECOVERY
  //     ไม่ใช่ C3/C4/C5 และไม่ใช่ EARLY_CATALYST
  //   ย่อลึก + catalyst ยืนยันแล้ว + งบยังไม่ขยับ = EARLY_CATALYST (ยังน่าสนใจที่สุด)
  //
  // §2 เจ็ดมิติต้องแยกกันเสมอ ห้ามยุบเป็นคะแนนเดียว:
  //   A ราคา (drawdown) · B การค้นพบ · C catalyst C0-C5 · D งบ (inflection)
  //   E การรับรู้ของตลาด · F value trap · G lifecycle
  //   สถานะสุดท้ายคือ "ป้ายสรุป" ที่ชี้กลับไปยังทั้งเจ็ดมิติได้เสมอ
  //
  // §8 value trap เป็นตัว override — ความถูกของราคาไม่ลบล้างการเสื่อมของธุรกิจ
  // §14 ห่วงโซ่ re-rating เติมเฉพาะข้อที่มีหลักฐานรองรับ ห้ามอนุมานตัวเลขที่ยังไม่เห็น
  // ============================================================

  var VERSION = "1.0.0";

  // ---------- §10/§11 สถานะสุดท้าย + ลำดับความสำคัญ ----------
  // prio ต่ำ = สำคัญกว่า · "สำคัญ" หมายถึงควรไปดูก่อน ไม่ใช่คำแนะนำให้ซื้อ (§11)
  var QUAL = {
    STRONG_EARLY_CATALYST: { key: "STRONG_EARLY_CATALYST", prio: 1, icon: "🟢", label: "STRONG EARLY CATALYST",
      thai: "ย่อลึก + catalyst ยืนยันแล้ว + งบเริ่มขยับ + ตลาดยังรับรู้น้อย" },
    EARLY_CATALYST: { key: "EARLY_CATALYST", prio: 2, icon: "🟢", label: "EARLY CATALYST",
      thai: "ย่อลึก + catalyst จริง + ตลาดยังรับรู้น้อย (งบยังไม่ขยับก็ได้)" },
    CATALYST_EXISTS: { key: "CATALYST_EXISTS", prio: 3, icon: "🟢", label: "CATALYST EXISTS",
      thai: "catalyst ยืนยันแล้วและตลาดยังรับรู้น้อย แต่ราคายังไม่ย่อลึก — ไม่ใช่เป้าหมายหลักของเครื่องมือนี้" },
    EMERGING: { key: "EMERGING", prio: 4, icon: "🟡", label: "EMERGING",
      thai: "ย่อลึก + ประกาศแล้ว แต่หลักฐานยังไม่ถึงขั้นยืนยัน" },
    TURNAROUND: { key: "TURNAROUND", prio: 5, icon: "🟡", label: "TURNAROUND",
      thai: "เคยมีสัญญาณเสื่อม แต่ตัวเลขเริ่มฟื้น" },
    FUNDAMENTAL_RECOVERY: { key: "FUNDAMENTAL_RECOVERY", prio: 6, icon: "🟡", label: "FUNDAMENTAL RECOVERY",
      thai: "ผลประกอบการเริ่มฟื้น แต่ยังไม่พบ Catalyst ใหม่ที่ยืนยันได้" },
    UNEXPLAINED_MARKET_MOVE: { key: "UNEXPLAINED_MARKET_MOVE", prio: 7, icon: "🔍", label: "UNEXPLAINED MARKET MOVE",
      thai: "ราคา/วอลุ่มขยับ แต่ยังไม่พบ catalyst ที่อธิบายได้ — เป็นคิวไปหาข้อมูล ไม่ใช่สัญญาณบวก" },
    STORY_ONLY: { key: "STORY_ONLY", prio: 8, icon: "🟠", label: "STORY ONLY",
      thai: "มีแต่คำบอกเล่า ยังไม่มีการประกาศหรือหลักฐานยืนยัน" },
    SPECULATIVE: { key: "SPECULATIVE", prio: 9, icon: "🟠", label: "SPECULATIVE",
      thai: "มีเรื่องเล่า แต่คุณภาพหลักฐานอ่อนที่สุด" },
    VALUE_TRAP_RISK: { key: "VALUE_TRAP_RISK", prio: 10, icon: "🔴", label: "VALUE TRAP RISK",
      thai: "ธุรกิจมีสัญญาณเสื่อม — ความถูกของราคาไม่ลบล้างข้อนี้" },
    PRICED_IN: { key: "PRICED_IN", prio: 11, icon: "🔵", label: "PRICED IN",
      thai: "catalyst สุกงอมและตลาดรับรู้เต็มแล้ว" },
    EXIT_WATCH: { key: "EXIT_WATCH", prio: 12, icon: "🔵", label: "EXIT WATCH",
      thai: "ราคา/วอลุ่มร้อนแรงผิดปกติหลัง catalyst ยืนยัน" },
    NO_CATALYST: { key: "NO_CATALYST", prio: 13, icon: "⚫", label: "NO CATALYST",
      thai: "ตรวจแหล่งหลักฐานแล้ว ยังไม่พบเหตุการณ์ที่เข้าเกณฑ์" },
    CATALYST_UNAVAILABLE: { key: "CATALYST_UNAVAILABLE", prio: 14, icon: "⚪", label: "CATALYST DATA UNAVAILABLE",
      thai: "ยังตรวจแหล่งหลักฐานไม่สำเร็จ — ไม่ได้แปลว่าไม่มี catalyst" },
  };

  // ---------- ตัวช่วยอ่านค่าจากแต่ละระนาบ (ทนต่อรูปแบบที่ต่างกันเล็กน้อย) ----------
  function num(v, dflt) { return typeof v === "number" && isFinite(v) ? v : dflt; }

  // A. ราคา
  function readDrawdown(dd) {
    if (!dd || !dd.available) return { available: false, deep: false, pct: null, label: null };
    var rank = dd.state && typeof dd.state.rank === "number" ? dd.state.rank : null;
    var deepRank = num(dd.deepRank, 2);
    return {
      available: true,
      deep: rank != null && rank >= deepRank,
      pct: num(dd.drawdown52wPct, null),
      offLowPct: num(dd.offLow52wPct, null),
      label: dd.state ? dd.state.label : null,
      bars: num(dd.bars, null),
    };
  }
  // C. catalyst
  function readCatalyst(c) {
    if (!c) return { availability: "CATALYST_UNAVAILABLE", identified: false, maturityN: -1, maturityKey: "NONE",
      storyN: -1, headline: null, evidenceCount: 0, businessEvidenceCount: 0, financialEvidenceCount: 0 };
    var av = c.availability && c.availability.key ? c.availability.key : (c.available ? "CATALYST_IDENTIFIED" : "CATALYST_UNAVAILABLE");
    return {
      availability: av,
      identified: av === "CATALYST_IDENTIFIED",
      maturityN: c.maturity && typeof c.maturity.n === "number" ? c.maturity.n : -1,
      maturityKey: c.maturity && c.maturity.key ? c.maturity.key : "NONE",
      maturityLabel: c.maturity && c.maturity.label ? c.maturity.label : null,
      evidenceMaturityN: c.maturityEvidence && typeof c.maturityEvidence.n === "number" ? c.maturityEvidence.n : null,
      storyN: c.story && typeof c.story.n === "number" ? c.story.n : -1,
      headline: c.headline || null,
      evidenceCount: num(c.evidenceCount, 0),
      // PHASE 5 — จำนวนหลักฐานเชิงธุรกิจ (ไม่รวมหลักฐานงบ) ใช้กั้น BUSINESS IMPACT
      // ถ้า engine ไม่ได้ส่งมา ให้ถอยไปใช้ evidenceCount ซึ่งเป็นเหตุการณ์ธุรกิจอยู่แล้ว
      businessEvidenceCount: num(c.businessEvidenceCount, num(c.evidenceCount, 0)),
      financialEvidenceCount: num(c.financialEvidenceCount, 0),
      types: Array.isArray(c.types) ? c.types : [],
    };
  }
  // D. งบ — ใช้ FinancialInflection (ตัวเลขงบจริง) ไม่ใช่ inflection จาก KB
  function readFinancial(fi) {
    if (!fi) return { available: false, stateKey: "FINANCIAL_EVIDENCE_UNAVAILABLE", n: -1, quarters: 0, latest: null };
    var st = fi.state || {};
    return {
      available: fi.available === true,
      stateKey: st.key || "FINANCIAL_EVIDENCE_UNAVAILABLE",
      n: typeof st.n === "number" ? st.n : -1,
      quarters: num(fi.quarterCount, 0),
      latest: fi.latestQuarter || null,
      metrics: fi.metrics || {},
      confirmedCore: num(fi.confirmedCoreCount, 0),
      contradiction: fi.contradictionNote || null,
    };
  }
  // E. การรับรู้ของตลาด
  function readRecognition(r) {
    if (!r || !r.state) return { n: -1, key: "UNKNOWN", label: "UNKNOWN" };
    return { n: num(r.state.n, -1), key: r.state.key || "UNKNOWN", label: r.state.label || "UNKNOWN",
      evidence: Array.isArray(r.evidence) ? r.evidence : [] };
  }
  // F. value trap
  function readTrap(t) {
    if (!t || !t.risk) return { key: "UNKNOWN", high: false, signals: [] };
    return { key: t.risk.key || "UNKNOWN", high: t.risk.key === "HIGH",
      signals: Array.isArray(t.signals) ? t.signals : [] };
  }
  // B. การค้นพบ
  function readDiscovery(d) {
    if (!d) return { stage: null, clusters: 0, sources: 0 };
    return { stage: d.stage || d.catalystStage || null, clusters: num(d.clusters, 0),
      sources: num(d.sourceDiversity, 0), title: d.storyTitle || null };
  }

  // ค่าคงที่ของสเกลที่อ้างถึง (ต้องตรงกับ catalyst-engine · ดู RECOG/MATURITY)
  var RECOG_N = { UNKNOWN: -1, EARLY: 0, BUILDING: 1, CONFIRMED: 2, OVERHEATED: 3 };
  var MAT_N = { NONE: -1, C0: 0, C1: 1, C2: 2, C3: 3, C4: 4, C5: 5 };
  var FIN_N = { UNAVAILABLE: -1, NO: 0, EARLY: 1, CONFIRMED: 2, STRONG: 3 };

  // ============================================================
  // §10 qualify() — สถานะสุดท้ายแบบ deterministic
  // ============================================================
  function qualify(input) {
    input = input || {};
    var A = readDrawdown(input.drawdown);
    var B = readDiscovery(input.discovery);
    var C = readCatalyst(input.catalyst);
    var D = readFinancial(input.financialInflection);
    var E = readRecognition(input.recognition);
    var F = readTrap(input.valueTrap);
    var G = input.lifecycle || null;

    var why = [];
    var flags = [];
    var state = null;

    // §7/§3 "งบฟื้น" เป็นข้อเท็จจริงคนละเรื่องกับ catalyst — ตั้งธงไว้ก่อนเสมอ
    var hasRecovery = D.available && D.n >= FIN_N.EARLY;
    var strongRecovery = D.available && D.n >= FIN_N.CONFIRMED;
    // ถ้ายังไม่มีตัวเลขงบ ให้ใช้ inflection จากฐานความรู้เป็นตัวสำรองเฉพาะการตัดสิน TURNAROUND
    // (ไม่ใช้แทน D ในเงื่อนไขอื่น เพราะคนละแหล่งและคนละความน่าเชื่อถือ)
    var kbInflectionN = input.kbInflection && input.kbInflection.state &&
      typeof input.kbInflection.state.n === "number" ? input.kbInflection.state.n : null;
    var kbRecovering = !D.available && kbInflectionN != null && kbInflectionN >= 1;

    // ---------- §8 value trap override มาก่อนทุกอย่าง ----------
    // ยกเว้นกรณีที่ตลาดรับรู้เต็มแล้ว (PRICED_IN/EXIT) ซึ่งเป็นคนละคำถาม
    if (F.high) {
      why.push("พบสัญญาณธุรกิจเสื่อม " + F.signals.length + " ข้อ — ความถูกของราคาไม่ลบล้างข้อนี้ (§8)");
      if (C.identified && C.maturityN >= MAT_N.C3) {
        why.push("มี catalyst ระดับ " + C.maturityKey + " แต่ยังไม่ยกให้เป็นโอกาส เพราะความเสี่ยง value trap สูง");
      }
      if (hasRecovery) why.push("ตัวเลขเริ่มฟื้น (" + D.stateKey + ") แต่ยังไม่พอกลบสัญญาณเสื่อม");
      state = QUAL.VALUE_TRAP_RISK;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // ---------- ไม่มี catalyst ที่ระบุได้ ----------
    if (!C.identified) {
      var unavailable = C.availability === "CATALYST_UNAVAILABLE";

      // §9 ตลาดขยับแต่ไม่มี catalyst
      if (E.n >= RECOG_N.BUILDING) {
        why.push("ตรวจพบการเคลื่อนไหวของราคา/วอลุ่ม (" + E.label + ") แต่ยังไม่พบ catalyst ที่อธิบายได้");
        why.push(unavailable ? "สาเหตุ: ยังตรวจแหล่งหลักฐานไม่สำเร็จ" : "สาเหตุ: ตรวจแหล่งหลักฐานแล้วไม่พบเหตุการณ์เข้าเกณฑ์");
        // §9 ถ้ามีงบฟื้นด้วย ให้ระบุทั้งสองอย่าง ไม่ยุบรวม
        if (hasRecovery) {
          flags.push("FUNDAMENTAL_RECOVERY");
          why.push("ตัวเลขงบเริ่มฟื้นด้วย (" + D.stateKey + ") — ธุรกิจกำลังดีขึ้นและตลาดกำลังตอบสนอง " +
            "แต่ยังไม่พบ catalyst ใหม่ที่ยืนยันได้");
        }
        why.push("ไม่ใช่สัญญาณบวก — เป็นคิวสำหรับไปหาข้อมูลเพิ่ม");
        state = QUAL.UNEXPLAINED_MARKET_MOVE;
        return finish(state, why, flags, A, B, C, D, E, F, G, input);
      }

      // §3/§7 งบฟื้นแต่ไม่มีเรื่องใหม่
      if (hasRecovery) {
        why.push("ผลประกอบการเริ่มฟื้น แต่ยังไม่พบ Catalyst ใหม่ที่ยืนยันได้");
        why.push("งบระดับ " + D.stateKey + " จากข้อมูล " + D.quarters + " ไตรมาส (ล่าสุด " + (D.latest || "—") + ")");
        if (A.deep) why.push("ราคายังย่อลึก " + A.pct + "% จาก high 52 สัปดาห์");
        why.push("นี่คือการฟื้นของพื้นฐาน ไม่ใช่ catalyst — ไม่ยกเป็น C3/C4/C5 (§3)");
        state = QUAL.FUNDAMENTAL_RECOVERY;
        return finish(state, why, flags, A, B, C, D, E, F, G, input);
      }

      if (A.deep) why.push("ราคาย่อระดับ " + (A.label || "") + " (" + A.pct + "% จาก high 52w)");
      why.push(unavailable ? "ยังตรวจแหล่งหลักฐานไม่สำเร็จ — ไม่ได้แปลว่าไม่มี catalyst"
        : "ตรวจแหล่งหลักฐานแล้ว ยังไม่พบเหตุการณ์ที่เข้าเกณฑ์");
      if (D.available && D.n === FIN_N.NO) why.push("งบมีครบ " + D.quarters + " ไตรมาสแล้ว และตัวเลขยังไม่พลิก");
      state = unavailable ? QUAL.CATALYST_UNAVAILABLE : QUAL.NO_CATALYST;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // ---------- มี catalyst ที่ระบุได้ ----------
    // ตลาดรับรู้เต็ม/ร้อนแรง — เป็นคนละคำถามกับ "โอกาสช่วงต้น"
    if (E.n >= RECOG_N.OVERHEATED && C.maturityN >= MAT_N.C3) {
      why.push("catalyst ยืนยันแล้ว (" + C.maturityKey + ") และราคา/วอลุ่มร้อนแรงผิดปกติ");
      state = QUAL.EXIT_WATCH;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }
    if (C.maturityN >= MAT_N.C5 || (C.maturityN >= MAT_N.C4 && E.n >= RECOG_N.CONFIRMED)) {
      why.push(C.maturityN >= MAT_N.C5
        ? "catalyst ยืนยันแล้วและตลาดรับรู้ผ่านราคา/วอลุ่มแล้ว (C5)"
        : "เห็นผลในงบแล้วและตลาดรับรู้แล้ว");
      state = QUAL.PRICED_IN;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // หลักฐานอ่อน
    if (C.maturityN <= MAT_N.C0) {
      why.push("มีแต่ข่าวลือ/ไม่ระบุที่มา — คุณภาพหลักฐานอ่อนที่สุด");
      state = QUAL.SPECULATIVE;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }
    if (C.maturityN <= MAT_N.C1) {
      why.push("มีแต่คำบอกเล่า ยังไม่มีการประกาศหรือหลักฐานที่ยืนยันได้");
      if (hasRecovery) {
        flags.push("FUNDAMENTAL_RECOVERY");
        why.push("แต่ตัวเลขงบเริ่มฟื้นแล้ว (" + D.stateKey + ") — เป็นคนละเรื่องกับ catalyst");
      }
      state = QUAL.STORY_ONLY;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // ---------- C2 ขึ้นไป: จุดที่ต้องแยก EARLY vs STRONG_EARLY vs CATALYST_EXISTS ----------
    var lowRecog = E.n <= RECOG_N.BUILDING;          // §4 UNKNOWN/EARLY/BUILDING
    var confirmed = C.maturityN >= MAT_N.C3;

    // §5 จุดที่ดีที่สุด: ย่อลึก + C3 ขึ้นไป + งบยืนยันแล้ว + ตลาดยังรับรู้น้อย
    //
    // เกณฑ์งบคือ STRONG หรือ CONFIRMED (ไม่ใช่ EARLY)
    //
    // PHASE 5 — บันทึกไว้ว่าเหตุผลเดิมของเกณฑ์นี้ใช้ไม่ได้แล้ว:
    // เดิมให้เหตุผลว่า "C4 ถูกสร้างจาก financial inflection อยู่แล้ว จึงผูกกับงบ STRONG โดยโครงสร้าง"
    // ซึ่งเป็นการอธิบายข้อบกพร่อง ไม่ใช่เหตุผลของกฎ — และขัดกับ §1 ที่หัวไฟล์นี้เอง
    // ตอนนี้ระนาบถูกแยกแล้ว: C คือขั้นของเหตุการณ์ธุรกิจ · D คือผลในงบ เป็นสองข้อเท็จจริงอิสระ
    // เกณฑ์ STRONG|CONFIRMED จึงยืนบนเหตุผลของตัวเอง: ย่อลึกอยู่แล้วและตลาดยังรับรู้น้อย
    // การจะเรียกว่า "แข็ง" ต้องเห็นผลในงบชัดกว่าระดับเพิ่งเริ่ม
    //
    // ความหมายที่ยังต้องคงไว้: งบระดับ EARLY ยัง "ไม่" นับเป็น STRONG_EARLY
    //   C3+ + ย่อลึก + งบ EARLY   → EARLY_CATALYST
    //   C3+ + ย่อลึก + งบ CONFIRMED/STRONG → STRONG_EARLY_CATALYST
    if (A.deep && confirmed && lowRecog && (D.n === FIN_N.STRONG || D.n === FIN_N.CONFIRMED)) {
      why.push("ราคาย่อลึก " + A.pct + "% จาก high 52 สัปดาห์");
      why.push("catalyst ยืนยันแล้ว (" + C.maturityKey + ") จากหลักฐาน " + C.evidenceCount + " ชิ้น");
      why.push("งบยืนยันเรื่องแล้ว (" + D.stateKey + " จาก " + D.quarters + " ไตรมาส)");
      why.push("ตลาดยังรับรู้ระดับ " + E.label + " — ยังไม่สะท้อนเต็ม");
      state = QUAL.STRONG_EARLY_CATALYST;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // §4 ย่อลึก + catalyst จริง + ตลาดยังรับรู้น้อย (งบยังไม่ขยับก็ได้ — นี่คือเป้าหมายของเครื่องมือ)
    if (A.deep && C.maturityN >= MAT_N.C2 && lowRecog) {
      why.push("ราคาย่อลึก " + A.pct + "% จาก high 52 สัปดาห์");
      why.push("มี catalyst ระดับ " + C.maturityKey + (confirmed ? " (ยืนยันแล้ว)" : " (ประกาศแล้ว)"));
      why.push("ตลาดยังรับรู้ระดับ " + E.label);
      if (D.available && D.n === FIN_N.NO) {
        why.push("งบยังไม่ขยับ — ปกติสำหรับ catalyst ช่วงต้น และเป็นเหตุผลที่ยังน่าสนใจ (§4)");
      } else if (D.available && D.n === FIN_N.EARLY) {
        // งบเริ่มขยับแต่ยังไม่ถึงขั้นยืนยัน — ยังอยู่ EARLY_CATALYST ตามที่ตั้งใจ
        why.push("งบเริ่มขยับ (" + D.stateKey + ") แต่ยังไม่ถึงขั้นยืนยัน — " +
          "ต้องถึง CONFIRMED หรือ STRONG จึงจะนับเป็น STRONG EARLY CATALYST");
      } else if (!D.available) {
        why.push("ยังไม่มีตัวเลขงบให้ยืนยัน (ไม่ได้แปลว่าไม่มีการฟื้น)");
      }
      // §4 "C1/C2/C3 depending on evidence" — ระดับหลักฐานกำหนดว่าลงสถานะไหน
      // C3 ยืนยันแล้ว → EARLY_CATALYST · C2 ประกาศแล้ว → EMERGING
      // (ถ้าปล่อย C2 เป็น EARLY_CATALYST ด้วย สองสถานะจะแยกกันไม่ออกและลำดับใน §11 จะไร้ความหมาย)
      if (confirmed) {
        state = QUAL.EARLY_CATALYST;
      } else {
        why.push("แต่หลักฐานยังเป็นแค่การประกาศ ยังไม่ถึงขั้นยืนยัน — ยังไม่นับเป็น EARLY CATALYST");
        state = QUAL.EMERGING;
      }
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // §6 catalyst จริงแต่ราคาไม่ได้ย่อลึก — ไม่ใช่เป้าหมายหลักของเครื่องมือ
    if (confirmed && lowRecog) {
      why.push("catalyst ยืนยันแล้ว (" + C.maturityKey + ") และตลาดยังรับรู้ระดับ " + E.label);
      why.push(A.available
        ? "แต่ราคายังไม่ย่อลึก (" + A.pct + "% จาก high 52w) — เครื่องมือนี้เน้น \"ย่อลึก + เรื่องกำลังเปลี่ยน\" (§6)"
        : "แต่ยังไม่มีข้อมูลราคาให้ประเมินการย่อ");
      state = QUAL.CATALYST_EXISTS;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // TURNAROUND: เคยมีสัญญาณเสื่อมแต่ตัวเลขเริ่มฟื้น (ใช้งบจริงก่อน ถ้าไม่มีใช้ KB)
    if ((hasRecovery || kbRecovering) && F.signals.length >= 1) {
      why.push("เคยมีสัญญาณเสื่อม " + F.signals.length + " ข้อ แต่ตัวเลขเริ่มฟื้น (" +
        (hasRecovery ? D.stateKey : "จากฐานความรู้ — ยังไม่มีตัวเลขงบยืนยัน") + ")");
      state = QUAL.TURNAROUND;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // §3 มี catalyst ระดับ C2 แต่ไม่เข้าเงื่อนไขข้างบน และงบฟื้น → ยังเป็น EMERGING ไม่ใช่ recovery
    if (A.deep && C.maturityN >= MAT_N.C2) {
      why.push("ราคาย่อลึก + ประกาศแล้ว แต่หลักฐานยังไม่ถึงขั้นยืนยัน");
      if (hasRecovery) { flags.push("FUNDAMENTAL_RECOVERY"); why.push("งบเริ่มฟื้นด้วย (" + D.stateKey + ")"); }
      state = QUAL.EMERGING;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }

    // เหลือ: มี catalyst แต่ไม่เข้ากลุ่มไหน — ถ้ามีงบฟื้นให้เรียกตามที่เป็นจริง
    if (hasRecovery) {
      why.push("ตัวเลขงบเริ่มฟื้น (" + D.stateKey + ") และมี catalyst ระดับ " + C.maturityKey);
      why.push("แต่ยังไม่เข้าเงื่อนไขของ EARLY_CATALYST (ต้องย่อลึก + ตลาดยังรับรู้น้อย)");
      state = QUAL.FUNDAMENTAL_RECOVERY;
      return finish(state, why, flags, A, B, C, D, E, F, G, input);
    }
    why.push("มี catalyst ระดับ " + C.maturityKey + " แต่ยังไม่เข้าเงื่อนไขของสถานะใด");
    why.push("ตลาดรับรู้ระดับ " + E.label + (A.available ? " · ราคาย่อ " + A.pct + "%" : ""));
    state = QUAL.EMERGING;
    return finish(state, why, flags, A, B, C, D, E, F, G, input);
  }

  // ============================================================
  // §12 "ทำไมถึงน่าสนใจ" — สร้างจากข้อเท็จจริงที่มีเท่านั้น
  // ============================================================
  function whyInteresting(A, B, C, D, E, F) {
    var parts = [];
    if (A.available && A.pct != null) {
      parts.push("หุ้นปรับตัวลง " + Math.abs(A.pct) + "% จากจุดสูงสุด 52 สัปดาห์");
    } else {
      parts.push("ยังไม่มีข้อมูลราคาเพียงพอให้ประเมินการย่อ");
    }
    if (C.identified) {
      parts.push("มี Catalyst ระดับ " + C.maturityKey + " จากหลักฐาน " + C.evidenceCount + " ชิ้น");
    } else if (C.availability === "NO_CATALYST") {
      parts.push("ตรวจแหล่งหลักฐานแล้วยังไม่พบ Catalyst ที่เข้าเกณฑ์");
    } else {
      parts.push("ยังตรวจแหล่งหลักฐานไม่สำเร็จ (ไม่ได้แปลว่าไม่มี Catalyst)");
    }
    parts.push("Market Recognition อยู่ระดับ " + E.label);
    if (D.available) {
      parts.push(D.n >= FIN_N.EARLY
        ? "เริ่มเห็นการฟื้นตัวในงบ (" + D.stateKey + " จาก " + D.quarters + " ไตรมาส)"
        : "งบมีครบ " + D.quarters + " ไตรมาสแล้วและตัวเลขยังไม่พลิก");
    } else {
      parts.push("ยังไม่มีตัวเลขงบให้ประเมิน (FINANCIAL_EVIDENCE_UNAVAILABLE)");
    }
    if (F.high) parts.push("แต่พบสัญญาณธุรกิจเสื่อม " + F.signals.length + " ข้อ");
    return parts.join(" · ");
  }

  // ============================================================
  // §13 "ยังขาดอะไร" — บอกให้ชัดว่าต้องไปหาอะไรต่อ
  // ============================================================
  function whatIsMissing(A, B, C, D, E, F, input) {
    var missing = [];
    if (!C.identified) {
      missing.push({ item: "เหตุการณ์/ข่าวที่เข้าเกณฑ์ catalyst",
        why: C.availability === "CATALYST_UNAVAILABLE" ? "ยังตรวจแหล่งหลักฐานไม่สำเร็จ" : "ตรวจแล้วไม่พบ",
        where: "SET Disclosure · ก.ล.ต. แบบ 59/246-2 · เอกสารบริษัท" });
    } else {
      if (C.maturityN < MAT_N.C3) {
        missing.push({ item: "หลักฐานยืนยันว่าเกิดขึ้นจริง (สัญญา/คำสั่งซื้อ/โครงการเดินแล้ว)",
          why: "ตอนนี้อยู่ระดับ " + C.maturityKey + " ซึ่งยังเป็นการประกาศ/คำบอกเล่า",
          where: "SET Disclosure ฉบับเต็ม · เอกสารแนบของบริษัท" });
      }
      // §13 มูลค่าสัญญา/backlog ไม่มีแหล่งในระบบ — ต้องบอกตรง ๆ
      missing.push({ item: "มูลค่าสัญญา (contract value)",
        why: "หัวข้อข้อมูลเผยแพร่ไม่มีตัวเลข — เนื้อหาอยู่ในไฟล์แนบซึ่งระบบไม่ดึงตามนโยบายของแหล่ง",
        where: "เปิดเอกสารแนบของข้อมูลเผยแพร่ด้วยตนเอง" });
      missing.push({ item: "backlog / งานในมือ",
        why: "ไม่มีแหล่งข้อมูล backlog ของหุ้นไทยในระบบ",
        where: "คำอธิบายของฝ่ายจัดการ (MD&A) · Opportunity Day · บทวิเคราะห์" });
    }
    if (!D.available) {
      missing.push({ item: "ตัวเลขงบรายไตรมาส",
        why: "FINANCIAL_EVIDENCE_UNAVAILABLE — ยังดึงไม่ได้หรือไตรมาสไม่พอเทียบ",
        where: "งบการเงินที่บริษัทยื่น" });
    } else if (D.n < FIN_N.EARLY) {
      missing.push({ item: "การยืนยันในงบว่า catalyst เริ่มมีผล",
        why: "งบ " + D.quarters + " ไตรมาสแล้วยังไม่เห็นการพลิก (" + D.stateKey + ")",
        where: "งบไตรมาสถัดไป" });
    } else if (D.confirmedCore < 2) {
      missing.push({ item: "การยืนยันข้ามรายการในงบ",
        why: "มีเพียง " + D.confirmedCore + " ใน 3 รายการหลัก (รายได้/EPS/มาร์จิ้น) ที่ยืนยันได้",
        where: "งบไตรมาสถัดไป" });
    }
    missing.push({ item: "แนวทางจากผู้บริหาร (guidance)",
      why: "ยังไม่มีแหล่งเนื้อหา Opportunity Day / presentation ในระบบ",
      where: "Opportunity Day · เอกสารนำเสนอนักลงทุน" });
    if (!A.available) {
      missing.push({ item: "ข้อมูลราคาย้อนหลังที่เพียงพอ", why: "ข้อมูลราคายังไม่พอประเมินการย่อ", where: "ประวัติราคา" });
    }
    return missing;
  }

  // ============================================================
  // §14 ห่วงโซ่ re-rating — เติมเฉพาะข้อที่มีหลักฐานรองรับ
  // ห้ามอนุมานขนาดของรายได้/กำไรที่ยังไม่เห็น
  // ============================================================
  function reratingChain(A, C, D, E) {
    var chain = [];
    chain.push({
      step: "CATALYST",
      state: C.identified ? C.maturityKey : C.availability,
      supported: C.identified && C.maturityN >= MAT_N.C2,
      detail: C.identified
        ? (C.headline || "มีเหตุการณ์ที่เข้าเกณฑ์ " + C.evidenceCount + " ชิ้น")
        : "ยังไม่มี catalyst ที่ระบุได้",
    });
    // PHASE 5 — งบไตรมาสยืนยัน FINANCIAL IMPACT ได้ แต่ไม่พิสูจน์ BUSINESS IMPACT
    // ขั้นนี้ต้องมีเหตุการณ์เชิงธุรกิจที่ยืนยันแล้วจริง ๆ (C3 ขึ้นไป ซึ่งตอนนี้เป็นขั้นของเหตุการณ์ธุรกิจ)
    var bizConfirmed = C.identified && C.maturityN >= MAT_N.C3 && (C.businessEvidenceCount || 0) > 0;
    chain.push({
      step: "BUSINESS IMPACT",
      state: bizConfirmed ? "CONFIRMED_EVENT" : "NOT_ESTABLISHED",
      supported: bizConfirmed,
      detail: bizConfirmed
        ? "เหตุการณ์เชิงธุรกิจยืนยันแล้วว่าเกิดขึ้นจริง — ผลต่อธุรกิจยังต้องรอตัวเลข"
        : ((C.businessEvidenceCount || 0) === 0
          ? "ยังไม่พบเหตุการณ์เชิงธุรกิจอิสระ — งบที่ดีขึ้นยืนยันได้แค่ผลทางการเงิน ไม่ใช่ผลต่อธุรกิจ"
          : "ยังไม่มีหลักฐานว่าเหตุการณ์เกิดขึ้นจริง"),
    });
    chain.push({
      step: "FINANCIAL IMPACT",
      state: !D.available ? "FINANCIAL_EVIDENCE_UNAVAILABLE"
        : (D.n >= FIN_N.EARLY ? D.stateKey : "NOT_YET_OBSERVED"),
      supported: D.available && D.n >= FIN_N.EARLY,
      // §14 ห้ามอนุมานขนาดของผลกระทบ
      detail: !D.available ? "ยังไม่มีตัวเลขงบให้ประเมิน"
        : (D.n >= FIN_N.EARLY
          ? "เห็นการเปลี่ยนแปลงในงบแล้ว (" + D.stateKey + ") — ระบบไม่ประมาณขนาดของผลกระทบ"
          : "ยังไม่เห็นผลในงบ (" + D.quarters + " ไตรมาส) — ระบบไม่ประมาณว่าจะเป็นเท่าไหร่"),
    });
    chain.push({
      step: "MARKET RECOGNITION",
      state: E.key,
      supported: E.n >= RECOG_N.BUILDING,
      detail: E.n >= RECOG_N.BUILDING ? "ราคา/วอลุ่มเริ่มสะท้อน" : "ตลาดยังไม่สะท้อน",
    });
    chain.push({
      step: "RE-RATING",
      state: (bizConfirmed && D.available && D.n >= FIN_N.EARLY && E.n >= RECOG_N.BUILDING)
        ? "IN_PROGRESS" : "INSUFFICIENT_EVIDENCE",
      supported: bizConfirmed && D.available && D.n >= FIN_N.EARLY && E.n >= RECOG_N.BUILDING,
      detail: "ต้องครบทั้ง catalyst ยืนยัน + เห็นผลในงบ + ตลาดเริ่มสะท้อน จึงจะเรียกว่ากำลัง re-rate",
    });
    var unsupported = chain.filter(function (s) { return !s.supported; });
    return {
      chain: chain,
      complete: unsupported.length === 0,
      brokenAt: unsupported.length ? unsupported[0].step : null,
      note: unsupported.length
        ? "ห่วงโซ่ยังไม่ครบ — ขาดที่ขั้น " + unsupported[0].step + " · ระบบไม่เติมข้อที่ไม่มีหลักฐาน (§14)"
        : "ห่วงโซ่ครบทุกขั้นจากหลักฐานที่มีจริง",
    };
  }

  function finish(state, why, flags, A, B, C, D, E, F, G, input) {
    return {
      version: VERSION,
      state: state,
      priority: state.prio,
      why: why,
      // §9 ธงเสริม เช่น FUNDAMENTAL_RECOVERY ที่เกิดพร้อม UNEXPLAINED_MARKET_MOVE
      flags: flags,
      whyInteresting: whyInteresting(A, B, C, D, E, F),
      missing: whatIsMissing(A, B, C, D, E, F, input),
      rerating: reratingChain(A, C, D, E),
      // §2 เจ็ดมิติต้องอ่านกลับได้เสมอ ไม่ยุบเป็นคะแนน
      dimensions: {
        A_price: A, B_discovery: B, C_catalyst: C, D_financial: D,
        E_recognition: E, F_valueTrap: F, G_lifecycle: G,
      },
    };
  }

  // §11 เรียงลำดับ — ลำดับความสำคัญ ไม่ใช่คำแนะนำการลงทุน
  function rank(list) {
    return (list || []).slice().sort(function (a, b) {
      var pa = a && a.qualification ? a.qualification.priority : 99;
      var pb = b && b.qualification ? b.qualification.priority : 99;
      if (pa !== pb) return pa - pb;
      // ในลำดับเดียวกัน: ย่อลึกกว่ามาก่อน
      var da = a && a.drawdown && typeof a.drawdown.drawdown52wPct === "number" ? a.drawdown.drawdown52wPct : 0;
      var db = b && b.drawdown && typeof b.drawdown.drawdown52wPct === "number" ? b.drawdown.drawdown52wPct : 0;
      return da - db;
    });
  }

  var CatalystQualification = {
    VERSION: VERSION, QUAL: QUAL, RECOG_N: RECOG_N, MAT_N: MAT_N, FIN_N: FIN_N,
    qualify: qualify, rank: rank,
    _internal: { readDrawdown: readDrawdown, readCatalyst: readCatalyst, readFinancial: readFinancial,
      readRecognition: readRecognition, readTrap: readTrap, readDiscovery: readDiscovery,
      whyInteresting: whyInteresting, whatIsMissing: whatIsMissing, reratingChain: reratingChain },
  };

  if (typeof window !== "undefined") window.CatalystQualification = CatalystQualification;
  if (typeof module !== "undefined" && module.exports) module.exports = CatalystQualification;
})();
