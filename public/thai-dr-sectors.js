(function () {
  "use strict";
  // ============================================================
  // THAI DR — ตารางจัดกลุ่มอุตสาหกรรม (curated)
  //
  // ทำไมต้องมีไฟล์นี้: SET ไม่ส่งข้อมูล sector/industry มาเลย
  //   ฟิลด์ที่ได้มีแค่ symbol/ชื่อ/ตลาด/ประเภท (หุ้นสามัญ vs หน่วยลงทุน)
  //   การจัดกลุ่มจึงเป็น "ความเห็นที่ประทับไว้" ไม่ใช่ข้อมูลทางการ
  //
  // โครงสร้าง: underlying symbol (ตามที่ SET ใช้) → [กลุ่มหลัก, เป็น AI ไหม]
  //   - กลุ่มหลักมีได้อันเดียว เลือกจาก "ธุรกิจที่ทำรายได้หลัก"
  //   - ป้าย AI แยกต่างหาก เพราะหุ้นหลายตัวอยู่หลายโลก
  //     (AMZN = ค้าปลีก แต่ AWS คือ AI infra · MSFT = ซอฟต์แวร์ + Azure AI)
  //     กรองกลุ่มก็ได้ กดดูเฉพาะ AI ก็ได้
  //
  // เกณฑ์ป้าย AI: รายได้หรือ capex ผูกกับ AI อย่างมีนัย ไม่ใช่แค่ "ใช้ AI"
  //   ✓ ชิป/อุปกรณ์ที่ AI ต้องใช้ · คลาวด์ที่ขายกำลังประมวลผล · โมเดล/ซอฟต์แวร์ AI
  //   ✓ ไฟฟ้า/ระบายความร้อนของดาต้าเซ็นเตอร์ (ขายของให้ AI โดยตรง)
  //   ✗ บริษัททั่วไปที่แค่เอา AI ไปใช้ในงาน
  //
  // แก้ไขได้ตรง ๆ ไฟล์นี้ ไม่ต้องแตะ engine
  // ตัวที่ไม่อยู่ในตาราง → "ยังไม่จัดกลุ่ม" (ไม่เดาจากชื่อ)
  // ============================================================

  var VERSION = 1;
  var AS_OF = "2026-10";

  // รหัสกลุ่ม → ชื่อไทย
  var SECTOR_TH = {
    semi: "เซมิคอนดักเตอร์",
    semi_equip: "เครื่องมือผลิตชิป",
    hardware: "ฮาร์ดแวร์/อุปกรณ์",
    software: "ซอฟต์แวร์/คลาวด์",
    internet: "อินเทอร์เน็ต/แพลตฟอร์ม",
    ecommerce: "อีคอมเมิร์ซ/ค้าปลีก",
    fintech: "การเงิน/ฟินเทค",
    bank: "ธนาคาร/ประกัน",
    health: "สุขภาพ/ยา",
    energy: "พลังงาน/ไฟฟ้า",
    materials: "วัตถุดิบ/เหมือง",
    industrial: "อุตสาหกรรม/เครื่องจักร",
    auto: "ยานยนต์/EV",
    consumer: "สินค้าอุปโภคบริโภค",
    luxury: "สินค้าหรู/แฟชั่น",
    media: "สื่อ/เกม/บันเทิง",
    telecom: "สื่อสาร/โทรคมนาคม",
    travel: "ท่องเที่ยว/ขนส่ง",
    aerospace: "อวกาศ/การบิน",
    realestate: "อสังหาฯ",
    fund_index: "กองทุนดัชนี",
    fund_sector: "กองทุนรายอุตสาหกรรม",
    fund_bond: "กองทุนตราสารหนี้",
    fund_commodity: "กองทุนสินค้าโภคภัณฑ์",
    unknown: "ยังไม่จัดกลุ่ม"
  };

  // สัญลักษณ์ → [กลุ่ม, AI?]
  // AI = 1 หมายถึงรายได้/capex ผูกกับ AI อย่างมีนัย
  var MAP = {
    // ---- เซมิคอนดักเตอร์ ----
    NVDA: ["semi", 1], AMD: ["semi", 1], AVGO: ["semi", 1], MRVL: ["semi", 1],
    QCOM: ["semi", 1], INTEL: ["semi", 1], MICRON: ["semi", 1], TSEMI: ["semi", 1],
    GFS: ["semi", 1], ON: ["semi", 0], MPWR: ["semi", 1], STM: ["semi", 0],
    ALAB: ["semi", 1], CRDO: ["semi", 1], CBRS: ["semi", 1], BIREN: ["semi", 1],
    CAMBRI: ["semi", 1], HYGON: ["semi", 1], SMIC: ["semi", 1], HUAHONG: ["semi", 0],
    GIGA: ["semi", 0], MONTAGE: ["semi", 1], TONGFU: ["semi", 0], AMKR: ["semi", 1],
    NVTS: ["semi", 1], MRAM: ["semi", 0], SNDK: ["semi", 1], SEAGATE: ["semi", 1],
    WDC: ["semi", 1], KIOXIA: ["semi", 1], AAOI: ["semi", 1], COHR: ["semi", 1],
    LITE: ["semi", 1], ZJINNO: ["semi", 1], YOFC: ["semi", 0], SUNNY: ["semi", 0],
    MURATA: ["semi", 0], IBIDEN: ["semi", 1], SHINCHEM: ["semi", 1], LUXSHARE: ["semi", 1],
    VGT: ["semi", 1], TTMI: ["semi", 1], GLW: ["semi", 1],

    // ---- เครื่องมือผลิตชิป ----
    ASML: ["semi_equip", 1], AMAT: ["semi_equip", 1], LRCX: ["semi_equip", 1],
    KLAC: ["semi_equip", 1], TEL: ["semi_equip", 1], ADVANT: ["semi_equip", 1],
    SCREEN: ["semi_equip", 1], DISCO: ["semi_equip", 1], TER: ["semi_equip", 1],
    MKSI: ["semi_equip", 1], NAURA: ["semi_equip", 1], AMEC: ["semi_equip", 1],
    CDNS: ["semi_equip", 1], SYNP: ["semi_equip", 1],

    // ---- ฮาร์ดแวร์/อุปกรณ์ ----
    AAPL: ["hardware", 0], DELL: ["hardware", 1], HPE: ["hardware", 1],
    SMCI: ["hardware", 1], ANET: ["hardware", 1], CSCO: ["hardware", 1],
    CIEN: ["hardware", 1], LENOVO: ["hardware", 1], XIAOMI: ["hardware", 0],
    SONY: ["hardware", 0], HITACHI: ["hardware", 1], KEYENCE: ["hardware", 1],
    FANUC: ["hardware", 1], FABRINET: ["hardware", 1], VICR: ["hardware", 1],
    VRT: ["hardware", 1], MIDEA: ["hardware", 0], HAIERS: ["hardware", 0],
    UBTECH: ["hardware", 1], HORIZON: ["hardware", 1], SYM: ["hardware", 1],
    IBM: ["hardware", 1],

    // ---- ซอฟต์แวร์/คลาวด์ ----
    MSFT: ["software", 1], ORCL: ["software", 1], CRM: ["software", 1],
    NOW: ["software", 1], SNOW: ["software", 1], DDOG: ["software", 1],
    PLTR: ["software", 1], ADBE: ["software", 1], NET: ["software", 1],
    CRWD: ["software", 0], PANW: ["software", 0], FTNT: ["software", 0],
    CRWV: ["software", 1], NBIS: ["software", 1], APLD: ["software", 1],
    GDS: ["software", 1], KINGSOFT: ["software", 1], SENSE: ["software", 1],
    IFLYTEK: ["software", 1], ZAI: ["software", 1], INFQ: ["software", 1],
    IONQ: ["software", 1], RGTI: ["software", 1], QBTS: ["software", 1],
    DUOL: ["software", 0], SHOP: ["software", 0], SPOT: ["media", 0],

    // ---- อินเทอร์เน็ต/แพลตฟอร์ม ----
    GOOG: ["internet", 1], GOOGL: ["internet", 1], META: ["internet", 1],
    BABA: ["internet", 1], TENCENT: ["internet", 1], BIDU: ["internet", 1],
    NTES: ["internet", 0], MEITUAN: ["internet", 0], KUAISH: ["internet", 0],
    BILIBI: ["internet", 0], GRAB: ["internet", 0], UBER: ["internet", 0],
    DASH: ["internet", 0], ABNB: ["travel", 0], BKNG: ["travel", 0],
    EXPE: ["travel", 0], TRIPCOM: ["travel", 0], APPL: ["internet", 1],
    RBLX: ["media", 0], MELI: ["ecommerce", 0],

    // ---- อีคอมเมิร์ซ/ค้าปลีก ----
    AMZN: ["ecommerce", 1], JD: ["ecommerce", 0], WMT: ["ecommerce", 0],
    COSTCO: ["ecommerce", 0], DOLLARG: ["ecommerce", 0], MNSO: ["ecommerce", 0],
    MWG: ["ecommerce", 0], POPMART: ["consumer", 0], MIXUE: ["consumer", 0],

    // ---- การเงิน/ฟินเทค ----
    VISA: ["fintech", 0], MA: ["fintech", 0], PYPL: ["fintech", 0],
    AXP: ["fintech", 0], COIN: ["fintech", 0], HOOD: ["fintech", 0],
    SOFI: ["fintech", 0], AFRM: ["fintech", 0], NDAQ: ["fintech", 0],
    CME: ["fintech", 0], HKEX: ["fintech", 0], SGX: ["fintech", 0],
    BLK: ["fintech", 0],

    // ---- ธนาคาร/ประกัน ----
    JPMUS: ["bank", 0], BAC: ["bank", 0], GSUS: ["bank", 0], MS: ["bank", 0],
    MUFG: ["bank", 0], SMFG: ["bank", 0], ICBC: ["bank", 0], CMBANK: ["bank", 0],
    DBS: ["bank", 0], UOB: ["bank", 0], VCB: ["bank", 0], AIA: ["bank", 0],
    PINGAN: ["bank", 0], TRVUS: ["bank", 0], BRKB: ["bank", 0],

    // ---- สุขภาพ/ยา ----
    LLY: ["health", 0], JNJ: ["health", 0], PFIZER: ["health", 0],
    ABBV: ["health", 0], AMGN: ["health", 0], NOVOB: ["health", 0],
    SANOFI: ["health", 0], UNH: ["health", 0], ISRG: ["health", 0],
    BDX: ["health", 0], CRSP: ["health", 0], HIMS: ["health", 0],
    WUXI: ["health", 0], WUXIAT: ["health", 0], SINOBIO: ["health", 0],
    HANSOH: ["health", 0], JDHEAL: ["health", 0],

    // ---- พลังงาน/ไฟฟ้า ----
    CEG: ["energy", 1], VST: ["energy", 1], NEE: ["energy", 1],
    OKLO: ["energy", 1], SMR: ["energy", 1], CCJ: ["energy", 1],
    GEV: ["energy", 1], ETN: ["energy", 1], SCHDER: ["energy", 1],
    PWR: ["energy", 1], JCI: ["energy", 1], BE: ["energy", 1],
    FSLR: ["energy", 0], SUNGROW: ["energy", 0], DEYE: ["energy", 0],
    EOSE: ["energy", 0], AMPX: ["energy", 0], OXY: ["energy", 0],
    PETROCN: ["energy", 0], CYPC: ["energy", 0], GASVN: ["energy", 0],
    SEMB: ["energy", 0],

    // ---- วัตถุดิบ/เหมือง ----
    MP: ["materials", 1], USAR: ["materials", 1], CNRE: ["materials", 1],
    JLMAG: ["materials", 1], FCX: ["materials", 0], NEM: ["materials", 0],
    ZIJIN: ["materials", 0], LAOPU: ["luxury", 0], CHHONGQ: ["materials", 0],
    GANFENG: ["materials", 0], HPG: ["materials", 0],

    // ---- ยานยนต์/EV ----
    TSLA: ["auto", 1], BYDCOM: ["auto", 0], XPENG: ["auto", 1],
    GEELY: ["auto", 0], GAC: ["auto", 0], TOYOTA: ["auto", 0],
    HONDA: ["auto", 0], FERRARI: ["auto", 0], CATL: ["auto", 0],

    // ---- อุตสาหกรรม/เครื่องจักร ----
    CAT: ["industrial", 0], MITSU: ["industrial", 0], ITOCHU: ["industrial", 0],
    STEG: ["industrial", 0], VENTURE: ["industrial", 0], SOFTBANK: ["software", 1],

    // ---- อวกาศ/การบิน ----
    BOEING: ["aerospace", 0], AIRBUS: ["aerospace", 0], RKLB: ["aerospace", 0],
    SPACEX: ["aerospace", 0], ASTS: ["aerospace", 0], JOBY: ["aerospace", 0],
    PLAB: ["aerospace", 0], BKSY: ["aerospace", 0], ONDS: ["aerospace", 0],
    SIA: ["travel", 0],

    // ---- สินค้าอุปโภคบริโภค ----
    KO: ["consumer", 0], PEP: ["consumer", 0], PNG: ["consumer", 0],
    MNST: ["consumer", 0], SBUX: ["consumer", 0], NIKE: ["consumer", 0],
    LULU: ["consumer", 0], ONON: ["consumer", 0], ASICS: ["consumer", 0],
    ANTA: ["consumer", 0], UNIQLO: ["consumer", 0], AJINO: ["consumer", 0],
    NONGFU: ["consumer", 0], MOUTAI: ["consumer", 0], THAIBEV: ["consumer", 0],
    VNM: ["consumer", 0], MSN: ["consumer", 0], SUSHI: ["consumer", 0],
    ESTEE: ["consumer", 0], MAOGEP: ["consumer", 0],

    // ---- สินค้าหรู/แฟชั่น ----
    LVMH: ["luxury", 0], HERMES: ["luxury", 0], LOREAL: ["luxury", 0],

    // ---- สื่อ/เกม/บันเทิง ----
    NFLX: ["media", 0], DISNEY: ["media", 0], NINTENDO: ["media", 0],
    KONAMI: ["media", 0], SANRIO: ["media", 0], TME: ["media", 0],
    FWONK: ["media", 0],

    // ---- สื่อสาร/โทรคมนาคม ----
    CHMOBILE: ["telecom", 0], SINGTEL: ["telecom", 0], FPTVN: ["software", 1],

    // ---- อสังหาฯ ----
    VHM: ["realestate", 0]
  };

  // ---- กองทุน/ETF: จัดจากชื่อทางการ ----
  // (ชื่อ ETF บอกธีมของตัวเองอยู่แล้ว จึงเชื่อถือได้มากกว่าการเดาหุ้นรายตัว)
  var FUND_RULES = [
    { re: /\bBOND|TREASURY|CREDIT\b/i, sector: "fund_bond", ai: 0 },
    { re: /\bGOLD|SILVER|OIL|CRUDE|RARE EARTH|METALS\b/i, sector: "fund_commodity", ai: 0 },
    { re: /\bSEMICONDUCTOR\b/i, sector: "fund_sector", ai: 1 },
    { re: /\bROBOTIC|ARTIFICIAL INTELLIGENCE|\bAI\b/i, sector: "fund_sector", ai: 1 },
    { re: /\bTECH|TECHNOLOGY|NASDAQ|INNOVATIVE|STAR ?50|CHINEXT\b/i, sector: "fund_sector", ai: 1 },
    { re: /\bBIOTECH|HEALTH\b/i, sector: "fund_sector", ai: 0 },
    { re: /\bELECTRIC VEHICLE|ENERGY|CLIMATE\b/i, sector: "fund_sector", ai: 0 },
    { re: /\bFINANCIAL|COMMUNICATION|GAMES|ANIMATION|DIVIDEND\b/i, sector: "fund_sector", ai: 0 },
    { re: /./, sector: "fund_index", ai: 0 }   // ที่เหลือถือเป็นกองดัชนีกว้าง
  ];

  function norm(s) {
    return String(s == null ? "" : s).replace(/^\s+|\s+$/g, "").toUpperCase();
  }

  // คืน { sector, sectorTh, isAi, source } · ไม่เจอ → unknown (ไม่เดา)
  function lookup(underlyingSymbol, underlyingName, classId) {
    var sym = norm(underlyingSymbol);
    var hit = MAP[sym];
    if (hit) {
      return { sector: hit[0], sectorTh: SECTOR_TH[hit[0]] || hit[0],
        isAi: hit[1] === 1, source: "curated" };
    }
    // เป็นกองทุนตามที่ SET บอก → ใช้กฎจากชื่อ
    if (String(classId) === "7") {
      var name = String(underlyingName || "") + " " + sym;
      for (var i = 0; i < FUND_RULES.length; i++) {
        if (FUND_RULES[i].re.test(name)) {
          return { sector: FUND_RULES[i].sector,
            sectorTh: SECTOR_TH[FUND_RULES[i].sector],
            isAi: FUND_RULES[i].ai === 1, source: "fund-name-rule" };
        }
      }
    }
    return { sector: "unknown", sectorTh: SECTOR_TH.unknown, isAi: false, source: "none" };
  }

  var API = {
    VERSION: VERSION,
    AS_OF: AS_OF,
    SECTOR_TH: SECTOR_TH,
    MAP: MAP,
    FUND_RULES: FUND_RULES,
    lookup: lookup,
    count: function () {
      var n = 0, k;
      for (k in MAP) if (Object.prototype.hasOwnProperty.call(MAP, k)) n++;
      return n;
    }
  };

  if (typeof window !== "undefined") window.ThaiDrSectors = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
