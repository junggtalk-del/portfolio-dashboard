(function () {
  "use strict";
  // ============================================================
  // Investment Thesis — CURATED knowledge base. Structural judgment
  // plane of the Thesis Engine (fundamentals / revenue quality / AI
  // execution / moat / capital allocation / QoQ changes / risks).
  // NOT live data — see per-company asOf stamps. Live overlays come
  // from the running system at compute time.
  // ============================================================
  var ThesisData = {
  "asOf": "2026-01",
  "companies": {
    "GOOG": {
      "ticker": "GOOG",
      "name": "Alphabet Inc.",
      "layer": "model",
      "thesis": {
        "statement": "Alphabet คือบริษัท AI แบบ full-stack เพียงไม่กี่รายในโลก — มีโมเดลชั้นนำของตัวเอง (Gemini), ชิปของตัวเอง (TPU), cloud ของตัวเอง และช่องทางกระจายสู่ผู้ใช้หลายพันล้านคนผ่าน Search / Android / YouTube / Workspace ความกลัวว่า AI จะฆ่า Search พิสูจน์แล้วว่าเกินจริง: AI Overviews และ AI Mode กลับขยายการใช้งานและรักษาอัตราการทำเงินไว้ได้ ขณะที่ Google Cloud โตเร่งขึ้นจากดีมานด์ AI และ backlog พุ่งแรง ปี 2025 คือปีที่ตลาดเปลี่ยนมุมมองจาก 'ผู้แพ้ AI' เป็น 'ผู้นำ AI' และโครงสร้างกำไรยังแข็งแรงพอจะลงทุน CapEx มหาศาลโดยไม่ทำลายงบดุล",
        "pillars": [
          "Gemini 3 ขึ้นเป็นโมเดลระดับแนวหน้าของอุตสาหกรรม พร้อมผู้ใช้ Gemini app หลายร้อยล้านคนและโตเร็วมาก",
          "Google Cloud โตเร่งขึ้น (~+30%+ YoY) พร้อม backlog ระดับ ~$150B+ — เป็นหลักฐานว่า CapEx สร้างรายได้จริง",
          "TPU รุ่น Ironwood + ดีลลูกค้าภายนอกรายใหญ่ (เช่น Anthropic) ทำให้ Alphabet เป็น hyperscaler ที่พึ่งพา NVIDIA น้อยที่สุด → ได้เปรียบต้นทุน compute ระยะยาว",
          "Search ยังเป็นเครื่องผลิตกระแสเงินสดที่ใหญ่และทนทาน โดย AI Overviews เข้าถึงผู้ใช้ ~2 พันล้านคน/เดือนและ monetize ได้ใกล้เคียงเดิม",
          "งบดุลระดับป้อมปราการ + คดีความ antitrust ผ่านจุดเลวร้ายสุดไปแล้ว (คำตัดสิน remedy ปี 2025 เบากว่าที่ตลาดกลัว ไม่ต้องขาย Chrome)"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+24% YoY (Q2 2026 — $119.8B, beat consensus +2.5%)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "โตเร่งขึ้น 3 ไตรมาสติด (+18% → +22% → +24%) บนฐานแสนล้านดอลลาร์/ไตรมาส — Cloud +82% เป็นหัวหอก และ Search ยังโต +17% สองไตรมาสติด"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "GAAP $9.11 (รวมกำไรพิเศษ unrealized ~$98B) · EPS ปกติ ~+26-30% YoY",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "กำไรจากธุรกิจหลักยังโตแรงจาก operating leverage (op income +30%) — ระวังอ่าน GAAP ตรงๆ เพราะรวมกำไรตีมูลค่าเงินลงทุนครั้งเดียว ~$98B ที่ยังไม่รับรู้จริง"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ถูกกดหนักขึ้น — CapEx 2026 ยกเป็น $195-205B (+2027 สูงกว่านี้)",
          "trend": "down",
          "score": 60,
          "impact": "neutral",
          "why": "OCF ยังแข็งแรงมากแต่ capex guidance ขยับขึ้น 2 ครั้งใน 6 เดือน (+$20B จากกรอบแรก) — ยอมรับได้เพราะ Cloud backlog $514B ยืนยันดีมานด์รองรับ แต่ FCF ปีนี้จะบาง ต้องจับตาใกล้ชิด"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Operating margin 34% (Q2 2026, +2pp YoY) · Cloud margin ~35.5%",
          "trend": "up",
          "score": 87,
          "impact": "positive",
          "why": "Margin ขยายต่อแม้ลงทุนหนัก — Cloud พลิกเป็นเครื่องจักรกำไร (OI $8.8B จาก $2.8B ปีก่อน, margin ~20.6% → ~35.5%) ชดเชยค่าเสื่อม datacenter ที่พุ่ง"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงระดับ ~25-30% — ท็อปของกลุ่ม mega-cap",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "ธุรกิจโฆษณาแกนหลักใช้ทุนน้อยและกำไรสูงมาก ทำให้ ROIC โดยรวมยังสูงแม้เทเงินลงทุนเข้า AI infrastructure มหาศาล — ความเสี่ยงคือ ROIC จะถูกเจือจางถ้า AI CapEx ให้ผลตอบแทนช้ากว่าคาด"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและหลักทรัพย์รวม ~$95-100B",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลระดับป้อมปราการ — เงินสดสุทธิเป็นบวกจำนวนมาก รองรับทั้ง CapEx มหาศาล ปันผล และซื้อหุ้นคืนพร้อมกันได้โดยไม่ตึง"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ต่ำมากเทียบขนาดบริษัท (เริ่มออกหุ้นกู้เพิ่มปลายปี 2025 เพื่อรองรับ CapEx)",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "แม้เริ่มกู้ผ่านตลาดหุ้นกู้ครั้งใหญ่ปลายปี 2025 แต่ภาระหนี้ยังเล็กน้อยมากเมื่อเทียบกับกระแสเงินสดปีละแสนล้านดอลลาร์ — เครดิตระดับสูงสุดของตลาด ต้นทุนกู้ต่ำ"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "SBC สูง (~$23-24B/ปี) แต่จำนวนหุ้นสุทธิลดลง ~1-2%/ปี",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "ค่าตอบแทนหุ้นพนักงานสูงตามแบบฉบับ big tech แต่การซื้อหุ้นคืนมากกว่าจนจำนวนหุ้นลดลงสุทธิทุกปี — ผู้ถือหุ้นระยะยาวไม่โดนเจือจางจริง"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "CapEx เชิงรุก + buyback ~$70B authorization + ปันผลที่เริ่มปี 2024 และปรับขึ้นแล้ว",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เทเงินเข้า AI แรงขึ้นอีก ($195-205B) แต่มี backlog $514B พิสูจน์ว่าลงทุนตามดีมานด์จริง ไม่ใช่ overbuild — จุดหักคะแนนคือแรงกด FCF ระยะสั้นและ Other Bets ที่ยังเผาเงิน"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "Forward P/E ~21-24x หลังหุ้นย่อ ~5-7% จากข่าว capex (ราคา ~$330)",
          "trend": "flat",
          "score": 62,
          "impact": "neutral",
          "why": "การย่อจากข่าว capex ทำให้ multiple กลับมาใกล้ค่าเฉลี่ย S&P (~22x) ทั้งที่รายได้กำลังเร่ง +24% และ Cloud +82% — ความน่าสนใจเชิงราคาดีขึ้นจากไตรมาสก่อน margin of safety กลับมาบ้าง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 90,
        "recurringPct": 30,
        "note": "คุณภาพรายได้ดีขึ้นเร็ว — Cloud (สัญญาระยะยาว, backlog $514B) ขยับเป็น ~21% ของรายได้ และ subscriptions โตสองหลัก ส่วนโฆษณาแกนหลักพิสูจน์ความทนทานต่อ AI disruption แล้วสองไตรมาสติด",
        "segments": [
          {
            "name": "Google Search & other",
            "sharePct": 53,
            "growthNote": "+17% YoY ($63.3B) — AI Overviews ~2 พันล้านผู้ใช้/เดือน monetize ได้ใกล้เดิม สองไตรมาสติดที่โตเร่ง",
            "trend": "up"
          },
          {
            "name": "Google Cloud",
            "sharePct": 21,
            "growthNote": "+82% YoY ($24.8B) เร่งขึ้น 5 ไตรมาสติด (32→34→48→63→82%) · backlog $514B เกือบเท่าตัว QoQ · margin ~35.5%",
            "trend": "up"
          },
          {
            "name": "Subscriptions, platforms & devices",
            "sharePct": 11,
            "growthNote": "+15% YoY ($12.9B) — Google One + แพ็กเกจ AI หนุนต่อเนื่อง",
            "trend": "up"
          },
          {
            "name": "YouTube ads",
            "sharePct": 9,
            "growthNote": "+13% YoY ($11.1B) — World Cup ผู้ชม 1.7 พันล้านคน (unique)",
            "trend": "up"
          },
          {
            "name": "Google Network",
            "sharePct": 6,
            "growthNote": "ทรงถึงหดเล็กน้อย — ขาลงเชิงโครงสร้าง สัดส่วนเล็กลงเรื่อยๆ",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 93,
        "items": [
          {
            "item": "Gemini frontier models (Gemini 3)",
            "status": "executing",
            "evidence": "Gemini app ทะลุ 950M MAU (จาก ~650M) · ประมวลผล 22B tokens/นาที — โมเมนตัมผู้ใช้หลัง Gemini 3 แรงต่อเนื่อง"
          },
          {
            "item": "Google Cloud + Vertex AI",
            "status": "executing",
            "evidence": "Q2 2026: Cloud +82% YoY ($24.8B) เร่งขึ้น 5 ไตรมาสติด · backlog เกือบเท่าตัว QoQ เป็น $514B · Cloud OI $8.8B margin ~35.5% — หลักฐานแปลง AI เป็นรายได้แข็งแรงที่สุดในกลุ่ม hyperscaler"
          },
          {
            "item": "TPU / custom silicon (Ironwood)",
            "status": "executing",
            "evidence": "TPU เจน 7 (Ironwood) เข้าสู่ตลาด พร้อมดีลลูกค้าภายนอกระดับประวัติการณ์ — Anthropic ตกลงใช้ TPU ระดับ ~1 ล้านชิป มูลค่าหลายหมื่นล้านดอลลาร์ ตอกย้ำว่า TPU เป็นทางเลือกจริงจังนอกเหนือจาก NVIDIA และให้ Alphabet ได้เปรียบต้นทุน compute"
          },
          {
            "item": "Search AI transformation (AI Overviews / AI Mode)",
            "status": "executing",
            "evidence": "AI Overviews ใช้งานโดยผู้ใช้ ~2 พันล้านคน/เดือน, AI Mode มีผู้ใช้หลายสิบล้านคนต่อวันและเริ่ม monetize แล้ว — รายได้ Search ยังโตสองหลักแทนที่จะถูก cannibalize ตามที่หมีกลัว"
          },
          {
            "item": "Consumer/Workspace AI subscriptions",
            "status": "on-track",
            "evidence": "Gemini Enterprise เข้าถึง ~90% ของ Fortune 100 · subscriptions โต +15% — ช่องทาง recurring จาก AI ขยายทั้งฝั่งองค์กรและผู้บริโภค"
          },
          {
            "item": "Waymo (autonomous driving)",
            "status": "on-track",
            "evidence": "ขยายบริการ robotaxi เชิงพาณิชย์หลายเมืองในสหรัฐฯ และยอดเที่ยววิ่งต่อสัปดาห์โตต่อเนื่องเป็นแสนเที่ยว — เป็น optionality ขนาดใหญ่ที่ตลาดยังตีมูลค่าให้ไม่เต็ม แต่ยังไม่ถึงจุดทำกำไร"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Moat แบบ full-stack ที่หาคู่เทียบยาก: ข้อมูลผู้ใช้และ index ของเว็บที่ลึกที่สุด, โมเดลชั้นนำจาก DeepMind, ชิป TPU ของตัวเองที่ลดการพึ่งพา NVIDIA, cloud ระดับ hyperscaler และช่องทางกระจายสู่ผู้ใช้หลายพันล้านคนผ่าน Search/Android/Chrome/YouTube/Gmail — ปี 2025 moat นี้ 'กว้างขึ้น' เพราะพิสูจน์แล้วว่าแปลง AI เป็นรายได้ได้จริงทั้งฝั่ง consumer และ enterprise",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "Search ยังครองส่วนแบ่ง ~90% และรายได้ยังโตสองหลัก, YouTube เป็นผู้นำ streaming ตามเวลารับชม, Cloud เป็นเบอร์ 3 แต่โตเร็วสุดในกลุ่ม hyperscaler"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "Gemini 3 พลิกภาพจากผู้ตามเป็นผู้นำ frontier model, DeepMind ยังเป็น lab วิจัยระดับท็อป และ TPU คือ custom AI silicon ที่ประสบความสำเร็จที่สุดนอก NVIDIA"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ปี 2025 คือหลักฐาน: ออกโมเดลถี่ขึ้น, ดัน AI ลง Search/Workspace/Cloud ทั้ง stack ภายในปีเดียว และแปลงเป็นตัวเลขรายได้ได้เร็วกว่าที่ตลาดคาด"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "ฝั่งโฆษณาและ Workspace/Cloud มี switching cost สูง แต่ฝั่งผู้ใช้ทั่วไป การเปลี่ยนไปใช้ chatbot คู่แข่งทำได้ง่าย — เป็นจุดที่ต้องเฝ้าระวังที่สุด"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "Android ~70%+ ของสมาร์ทโฟนโลก, Chrome เบราว์เซอร์อันดับ 1, ผลิตภัณฑ์ผู้ใช้เกินพันล้านคนหลายตัว — เป็นท่อส่ง Gemini สู่ผู้ใช้ที่คู่แข่งไม่มี"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "strengthening",
            "note": "Gemini API / AI Studio มีนักพัฒนาใช้งานหลายล้านราย ปริมาณ token ประมวลผลโตก้าวกระโดด และ Vertex AI เป็นแพลตฟอร์มหลักของลูกค้า enterprise บน GCP"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "Cloud backlog ระยะยาว ~$155B และสัญญา Workspace ผูกลูกค้าองค์กรแน่น แต่ผู้ลงโฆษณาย้ายงบตาม ROI ได้เสมอ — lock-in แข็งฝั่ง enterprise มากกว่าฝั่งโฆษณา"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "การมีครบทั้งข้อมูล-โมเดล-ชิป-cloud-distribution ในบริษัทเดียวทำให้ต้นทุนต่อ query ต่ำกว่าและ iterate เร็วกว่าคู่แข่งที่ต้องเช่า compute หรือซื้อชิปคนอื่น"
          }
        ]
      },
      "capitalAllocation": {
        "score": 82,
        "verdict": "ยังจัดสรรทุนอย่างมีวินัยบนดีมานด์ที่พิสูจน์ได้ (backlog รองรับ) พร้อมคืนเงินผู้ถือหุ้นต่อเนื่อง — ความเสี่ยงเดียวคือขนาด capex ที่ใหญ่ขึ้นเร็วกว่าที่ตลาดย่อยทัน",
        "items": [
          {
            "label": "CapEx (AI infrastructure)",
            "current": "Guidance 2026: $195-205B (ยกขึ้น 2 ครั้งใน 6 เดือน) + ส่งสัญญาณ 2027 สูงกว่านี้",
            "assessment": "good",
            "why": "ตลาดตกใจตัวเลข แต่ backlog $514B และ Cloud ที่ sold-out หมายความว่า capacity ที่สร้างมีลูกค้าจ่ายรออยู่แล้ว — เป็นการลงทุนตามดีมานด์ ไม่ใช่เผาเงินหวังลม"
          },
          {
            "label": "R&D",
            "current": "~$55B+/ปี — ใหญ่เป็นอันดับต้นของโลก",
            "assessment": "good",
            "why": "ให้ผลลัพธ์จับต้องได้: Gemini 3, Ironwood TPU, Waymo, ความก้าวหน้าจาก DeepMind — R&D ที่แปลงเป็นความได้เปรียบเชิงแข่งขันจริง ไม่ใช่แค่ต้นทุน"
          },
          {
            "label": "Buyback",
            "current": "Authorization ~$70B (2025) ซื้อคืนจริง ~$60B+/ปี",
            "assessment": "good",
            "why": "ซื้อคืนสม่ำเสมอจนจำนวนหุ้นลดลงสุทธิ ~1-2%/ปี — ช่วงที่ราคาถูกกดจากความกลัว AI/คดีความในปี 2024-2025 ถือเป็นการซื้อคืนที่คุ้มค่ามากเมื่อมองย้อนกลับ"
          },
          {
            "label": "Dividend",
            "current": "เริ่มจ่ายปี 2024 และปรับขึ้น ~5% ในปี 2025 (yield ต่ำมาก ~0.3%)",
            "assessment": "neutral",
            "why": "เป็นสัญญาณวินัยทางการเงินและเปิดฐานนักลงทุนกลุ่มใหม่ แต่ขนาดเล็กจนไม่มีนัยต่อผลตอบแทนรวม — เหมาะสมแล้วที่เก็บเงินส่วนใหญ่ไว้ลงทุน AI"
          },
          {
            "label": "SBC / การเจือจาง",
            "current": "SBC ~$23-24B/ปี แต่ net share count ลดลงทุกปี",
            "assessment": "neutral",
            "why": "SBC สูงตามมาตรฐานการแย่งตัว AI talent — ยอมรับได้เพราะ buyback ชดเชยเกินพอ แต่เป็นต้นทุนจริงที่นักลงทุนต้องหักออกจากกำไรเสมอ"
          },
          {
            "label": "M&A (ดีล Wiz)",
            "current": "ดีลซื้อ Wiz ~$32B (ใหญ่สุดในประวัติศาสตร์บริษัท) ยังอยู่ระหว่างรอปิดดีล/ผ่านหน่วยงานกำกับ",
            "assessment": "neutral",
            "why": "เชิงกลยุทธ์สมเหตุสมผล (เสริม cloud security ซึ่งเป็นจุดขาย enterprise) แต่ราคาแพงและมีความเสี่ยง regulatory — ต้องรอดูการปิดดีลและ integration"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "หลังย่อ ~5-7% จากข่าว capex forward P/E เหลือ ~21-24x — ใกล้ค่าเฉลี่ย S&P ทั้งที่โตเร่ง +24% และ Cloud +82%: กลับจาก premium มาโซนสมเหตุสมผล margin of safety ดีขึ้น"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม",
          "prev": "$109.9B (+22% YoY)",
          "now": "$119.8B (+24% YoY, beat +2.5%)",
          "direction": "positive"
        },
        {
          "metric": "Google Cloud growth",
          "prev": "+63% YoY ($20.0B)",
          "now": "+82% YoY ($24.8B) — เร่งไตรมาสที่ 5 ติด",
          "direction": "positive"
        },
        {
          "metric": "Cloud backlog",
          "prev": "~$260B",
          "now": "$514B (เกือบเท่าตัว QoQ)",
          "direction": "positive"
        },
        {
          "metric": "Operating margin",
          "prev": "~33%",
          "now": "34% (+2pp YoY) · Cloud margin ~35.5%",
          "direction": "positive"
        },
        {
          "metric": "CapEx guidance 2026",
          "prev": "$180-190B",
          "now": "$195-205B + ปี 2027 สูงขึ้นอีก (หุ้นร่วง ~5-7%)",
          "direction": "negative"
        },
        {
          "metric": "Gemini app MAU",
          "prev": "~650-800M",
          "now": "950M · 22B tokens/นาที · Gemini Enterprise ~90% ของ Fortune 100",
          "direction": "positive"
        }
      ],
      "risks": [
        "CapEx cycle risk — guidance ขยับขึ้น 2 ครั้งใน 6 เดือน ถ้าไตรมาสหน้า Cloud/backlog เริ่มชะลอขณะ capex ยังพุ่ง เรื่องเล่าจะพลิกเป็น 'overbuild' และหุ้นถูก de-rate แรง",
        "กำไรพิเศษผันผวน — เงินลงทุน unrealized ~$98B ที่ mark ขึ้นได้ก็ mark ลงได้ ทำให้ EPS GAAP เหวี่ยงแรงตามมูลค่าบริษัทเอกชน/ตลาด",
        "การแข่งขัน AI — OpenAI/Microsoft ฝั่ง consumer agent และ AWS/Azure ฝั่ง cloud ยังกดดัน ต้องรักษาความได้เปรียบ TPU ให้ได้ทุกเจน",
        "Regulatory tail — คดี antitrust ผ่านจุดเลวร้ายสุดแต่ remedies ยังมีเงื่อนไขติดตาม + ความเสี่ยง EU/AI regulation",
        "ฐานเปรียบเทียบสูง — Cloud +82% สร้างฐานที่โหดมากสำหรับปี 2027"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ตรงกับปีปฏิทิน) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลครบแล้วเมื่อต้นปี 2026",
        "epsBasis": "diluted GAAP, split-adjusted (หลัง stock split 20:1 เดือน ก.ค. 2022) · หมายเหตุ: Q1'26-Q2'26 มี unrealized mark-to-market gain จากหุ้น Anthropic/SpaceX (other income ~$37.7B ใน Q1'26) ดันกำไรสูงผิดปกติ — TTM EPS และ P/E ปัจจุบันจึงดูถูกกว่าฐานธุรกิจจริง",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 257.6,
            "epsAdj": 5.61,
            "opMarginPct": 30.6,
            "fcfB": 67,
            "priceFYEnd": 144.68
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 282.8,
            "epsAdj": 4.56,
            "opMarginPct": 26.5,
            "fcfB": 60,
            "priceFYEnd": 88.23
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 307.4,
            "epsAdj": 5.8,
            "opMarginPct": 27.4,
            "fcfB": 69.5,
            "priceFYEnd": 139.69
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 350,
            "epsAdj": 8.04,
            "opMarginPct": 32.1,
            "fcfB": 72.8,
            "priceFYEnd": 189.3
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 402.8,
            "epsAdj": 10.81,
            "opMarginPct": 32,
            "fcfB": 73.3,
            "priceFYEnd": 312.59
          }
        ],
        "notes": "EPS และราคาหุ้นทุกปีปรับเป็นฐานหลัง split 20:1 (ก.ค. 2022) แล้ว — FY2021 EPS เดิม $112.20 หาร 20 = $5.61 และราคาปิดสิ้นปี 2021 เดิม $2,893.59 หาร 20 = $144.68 ราคาที่ใช้เป็น GOOGL Class A ราคาปิดจริงวันทำการสุดท้ายของปี (ไม่ปรับเงินปันผล — macrotrends แสดงตัวเลขต่ำกว่าเล็กน้อยเพราะปรับปันผลที่เริ่มจ่ายปี 2024) จำนวนหุ้น diluted โดยนัยลดลงสม่ำเสมอ ~13.6 → 12.2 พันล้านหุ้นจากการซื้อหุ้นคืน สอดคล้องกันทุกปี FCF = กระแสเงินสดดำเนินงานลบ capex; FY2025 capex พุ่งเป็น $91.4B (ลงทุน AI infrastructure) ทำให้ FCF แทบไม่โตแม้ OCF เพิ่มเป็น $164.7B ตัวเลขปัดเศษตามเกณฑ์ความแม่นยำ ~2-3%",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000012/googexhibit991q42025.htm",
          "https://stockanalysis.com/stocks/googl/financials/",
          "https://www.statmuse.com/money/ask/googl-stock-price-on-december-31-2025",
          "https://www.macrotrends.net/stocks/charts/GOOGL/alphabet/stock-price-history",
          "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 76.69,
            "epsAdj": 1.55,
            "opMarginPct": 27.8,
            "fcfB": 22.6,
            "priceQEnd": 131
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 86.31,
            "epsAdj": 1.64,
            "opMarginPct": 27.5,
            "fcfB": 7.9,
            "priceQEnd": 140
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 80.54,
            "epsAdj": 1.89,
            "opMarginPct": 31.6,
            "fcfB": 16.8,
            "priceQEnd": 151
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 84.74,
            "epsAdj": 1.89,
            "opMarginPct": 32.4,
            "fcfB": 13.5,
            "priceQEnd": 183
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 88.27,
            "epsAdj": 2.12,
            "opMarginPct": 32.3,
            "fcfB": 17.6,
            "priceQEnd": 166
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 96.47,
            "epsAdj": 2.15,
            "opMarginPct": 32.1,
            "fcfB": 24.8,
            "priceQEnd": 189
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 90.23,
            "epsAdj": 2.81,
            "opMarginPct": 33.9,
            "fcfB": 19,
            "priceQEnd": 155
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 96.43,
            "epsAdj": 2.31,
            "opMarginPct": 32.4,
            "fcfB": 5.3,
            "priceQEnd": 176
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 102.35,
            "epsAdj": 2.87,
            "opMarginPct": 30.5,
            "fcfB": 24.5,
            "priceQEnd": 243
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 113.83,
            "epsAdj": 2.82,
            "opMarginPct": 31.6,
            "fcfB": 24.6,
            "priceQEnd": 313
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 109.9,
            "epsAdj": 5.11,
            "opMarginPct": 36.1,
            "fcfB": 10.1,
            "priceQEnd": 300
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 119.8,
            "epsAdj": 9.11,
            "opMarginPct": 34,
            "fcfB": -5.9,
            "priceQEnd": 353
          }
        ]
      },
      "nextEarnings": "2026-10",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 20.58,
            "revenue": 497.7
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2'26",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$119.8B (+24% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q1'26",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$109.9B (+22% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q4'25",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$113.8B",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q3'25",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$102.4B",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q2'25",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$96.4B",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 497.7,
            "eps": 20.58,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "Alphabet ไม่ให้ guidance รายได้รายไตรมาส (ให้เฉพาะ CapEx รายปี) — แถว guidance จึงเป็น noGuidance ตามจริง ไม่ใช่ข้อมูลขาด · CapEx 2026 ถูกยกขึ้น 3 รอบ: $175-185B → $180-190B (เม.ย.) → $195-205B (ก.ค.) · CapEx 2027 ตลาดคาด ~$250-257B (FactSet) สูงขึ้นอีกมาก — เป็นตัวเลขคาดการณ์ที่ควรจับตาแทน guidance รายได้ · consensus FY2026 EPS ~$20.58 (50 นักวิเคราะห์ · non-GAAP) พองจาก unrealized gain หุ้น Anthropic/SpaceX ไม่ใช่กำไรจากธุรกิจ — FY2027 แต่ละสำนักต่างกันมาก (~$11.5-14.7) เพราะโมเดล gain นี้ไม่เหมือนกัน และตัวเลข revenue FY2027 อยู่หลัง paywall ทุกแหล่งฟรี จึงเว้นไว้แทนการเดา"
      }
    },
    "NVDA": {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "layer": "gpu",
      "thesis": {
        "statement": "NVDA คือแกนกลางของโครงสร้างพื้นฐาน AI ทั้งโลก — ไม่ใช่แค่บริษัทขายชิป แต่เป็นผู้ขาย 'โรงงาน AI' ทั้งระบบ (GPU + NVLink + networking + CUDA software) ที่ลูกค้าทุกค่ายต้องพึ่งพา รายได้ Data Center ยังเร่งตัวขึ้นแม้ฐานจะใหญ่มหาศาล (Q2 FY27 +117% YoY) และบริษัทให้ guide เบื้องต้นว่าปี FY2028 รายได้จะโตราว ~70% โดยระบุว่าเป็นตัวเลขที่ถูกจำกัดด้วยกำลังผลิต ไม่ใช่ดีมานด์ ตราบใดที่รอบลงทุน AI ยังเดินหน้า NVDA คือผู้ชนะที่ชัดเจนที่สุดของทั้ง value chain — โจทย์ที่เปลี่ยนไปคือต้นทุน memory และเงินทุนหมุนเวียน ไม่ใช่ดีมานด์",
        "pillars": [
          "ผูกขาดเชิงพฤตินัยในตลาด AI accelerator ด้วยส่วนแบ่ง ~80-90% และ CUDA moat ที่สั่งสมมากว่า 15 ปี",
          "รอบสินค้าใหม่ทุกปี (Hopper → Blackwell → Rubin) ทำให้คู่แข่งไล่ตามไม่ทันทั้งด้าน performance และ TCO",
          "ขยายจากชิปเดี่ยวสู่ rack-scale system + networking ทำให้มูลค่าต่อดีลสูงขึ้นและ lock-in ลึกขึ้น",
          "งบการเงินระดับหาตัวจับยาก: margin สุทธิ ~50%, FCF มหาศาล, หนี้แทบไม่มี, ซื้อหุ้นคืนต่อเนื่อง",
          "ดีมานด์กระจายตัวขึ้นจาก hyperscaler สู่ sovereign AI, AI lab (OpenAI, Anthropic) และ enterprise"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+106% YoY (Q2 FY27 — $96.2B, +18% QoQ) เร่งตัว 4 ไตรมาสติด · guide Q3 ~$108B",
          "trend": "up",
          "score": 98,
          "impact": "positive",
          "why": "โตเร่งขึ้นอีกจาก ~+85% (Q1 FY27) เป็น ~+106% — Data Center +117% YoY การเร่งตัวที่ฐานรายได้ระดับ ~$385B run-rate เป็นเรื่องที่แทบไม่เคยเกิดกับบริษัทขนาดนี้"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2 FY27 GAAP EPS $2.46 · non-GAAP $2.22 (ชนะที่ตลาดคาด ~$2.09)",
          "trend": "up",
          "score": 95,
          "impact": "positive",
          "why": "กำไรโตตามรายได้ที่เร่งตัว โดย gross margin ยังยืน 75% ได้ทั้งไตรมาส · หมายเหตุ GAAP รอบนี้มีกำไรจากเงินลงทุน ~$7.8B ปนอยู่ ต้องดู non-GAAP ควบคู่"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 FY27 $21.3B — ลดจาก $48.6B ไตรมาสก่อน (capex เพียง ~$2.7B ไม่ใช่ต้นเหตุ)",
          "trend": "down",
          "score": 78,
          "impact": "neutral",
          "why": "กำไรไม่ได้ลด แต่เงินจมในเงินทุนหมุนเวียน: ลูกหนี้เพิ่มกว่า $22B (DSO 45 → 60 วัน จากเครดิตเทอมยาวให้ลูกค้าดีลใหญ่) + สต๊อก +$5.8B รับ Vera Rubin — ถ้าเก็บเงินได้ตามเทอมคือเลื่อนเวลา ไม่ใช่เสียของ แต่ต้องเฝ้าดูว่ากลับมาเป็นเงินสดจริงในไตรมาสถัด ๆ ไปไหม"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Q2 FY27 gross margin 75.0% แต่ guide ลงเป็น ~74% (Q3), ~71-72% (Q4), ~72-73% (FY28)",
          "trend": "down",
          "score": 86,
          "impact": "positive",
          "why": "จุดกดใหม่คือ 'ต้นทุน memory' ที่ CFO บอกว่าสูงกว่าคาดและจะสูงขึ้นอีก — ต่างจากรอบ H20 ตรงที่ครั้งนี้เป็นต้นทุนวัตถุดิบต่อเนื่อง ไม่ใช่รายการตัดจำหน่ายครั้งเดียว บริษัทวางแผนขึ้นราคาชดเชยตั้งแต่ Q1 FY28"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงมากเป็นพิเศษ (ระดับ >70%)",
          "trend": "up",
          "score": 97,
          "impact": "positive",
          "why": "โมเดล fabless + margin ~50% + สินทรัพย์ถาวรน้อย ทำให้ ROIC อยู่ในกลุ่มสูงที่สุดของบริษัทขนาดใหญ่ทั่วโลก ทุกดอลลาร์ที่ลงไปใน R&D สร้างผลตอบแทนกลับมามหาศาล"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสด + หลักทรัพย์ ~$56.6B (เพิ่มจาก ~$50.3B ไตรมาสก่อน)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "เงินสดยังโตแม้คืนผู้ถือหุ้นสูงสุดเป็นประวัติการณ์ ~$26.0B ในไตรมาสเดียว (ซื้อคืน ~$20B + ปันผล ~$6B)"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาวเพิ่มจาก ~$7.5B เป็น ~$32.4B ในครึ่งปี — ยังเป็น net cash (เทียบเงินสด ~$56.6B)",
          "trend": "down",
          "score": 88,
          "impact": "positive",
          "why": "ก่อหนี้เพิ่มชัดเจนเพื่อรองรับภาระ supply commitment ที่พุ่งเป็น $279B และการลงทุนใน ecosystem · ระดับนี้ยังห่างจากจุดที่งบดุลมีความเสี่ยง แต่ทิศทางเปลี่ยนจาก 'แทบไม่มีหนี้' แล้ว จึงต้องเริ่มติดตาม"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มจำนวนหุ้น",
          "current": "จำนวนหุ้นลดลงเล็กน้อย — buyback ชนะ SBC",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "SBC มีอยู่จริงตามแบบบริษัทเทค แต่การซื้อหุ้นคืนขนาดใหญ่ทำให้ share count สุทธิทยอยลดลง ผู้ถือหุ้นไม่โดน dilute — trend 'down' ในที่นี้คือจำนวนหุ้นลดลงซึ่งเป็นผลบวก"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "เพิ่มปันผล 25 เท่า + buyback หนัก + R&D เชิงรุก + ลงทุน ecosystem",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "คืนเงินผู้ถือหุ้นเชิงรุกขึ้นชัด (ปันผล +25x) ควบคู่การลงทุน R&D/ecosystem — วินัยดีขึ้นและงบดุลยังแข็งมาก"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "Forward P/E ~23x (ราคา $217.55 · 28 ส.ค. 2026 · mcap ~$5.3T) เทียบ consensus FY2027 EPS $9.27",
          "trend": "up",
          "score": 75,
          "impact": "neutral",
          "why": "ราคาขึ้นหลังงบแต่ E ถูกปรับขึ้นเร็วกว่า ทำให้ multiple ยังไม่แพงเชิงตัวเลข (PEG « 1) · ตัวแปรใหม่คือ margin ที่จะลงไป ~71-72% ช่วง Q4 — ถ้ารายได้โตตาม guide ~70% ในปี FY2028 กำไรยังโตแรงพอชดเชย แต่ถ้ารายได้พลาด multiple กับ E จะถูกปรับลงพร้อมกัน"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 93,
        "recurringPct": null,
        "note": "รายได้เร่งตัว 4 ไตรมาสติดและกระจุกที่ Data Center ~93% ของทั้งหมด — แต่ภายใน DC การกระจายดีขึ้น: ACIE (AI clouds/industrial/enterprise) โต +138% YoY เร็วกว่า hyperscale (+13% QoQ) ทำให้พึ่งพา hyperscaler ไม่กี่รายน้อยลง คุณภาพการเติบโตสูงมาก แต่ยังผูกกับรอบ AI capex ของลูกค้ากลุ่มเดิมเป็นหลัก",
        "segments": [
          {
            "name": "Data Center — Hyperscale",
            "sharePct": 51,
            "growthNote": "~$49B (+13% QoQ) — คลาวด์รายใหญ่ · ยังเป็นก้อนโตที่สุดแต่โตช้ากว่า ACIE แล้ว",
            "trend": "up"
          },
          {
            "name": "Data Center — ACIE (AI clouds/industrial/enterprise)",
            "sharePct": 42,
            "growthNote": "~$40B (+25% QoQ, +138% YoY) — AI natives, enterprise, sovereign · โตเร็วกว่า hyperscale ชัดเจน = ฐานลูกค้ากระจายขึ้น",
            "trend": "up"
          },
          {
            "name": "Edge Computing",
            "sharePct": 7,
            "growthNote": "~$7.2B (+13% QoQ, +27% YoY) — ตั้งแต่ Q1 FY27 บริษัทยุบ Gaming + Professional Visualization + Automotive + OEM มารวมเป็น segment เดียว",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 95,
        "items": [
          {
            "item": "Blackwell GB300 ramp (full production)",
            "status": "executing",
            "evidence": "Data Center $75.2B (+92% YoY) จาก GB300 rack-scale ที่ ramp เต็มที่ — margin ฟื้น ~75% พิสูจน์ว่าขยายกำลังผลิตได้โดยไม่เสีย pricing power"
          },
          {
            "item": "Vera Rubin platform (รุ่นถัดไป)",
            "status": "executing",
            "evidence": "Jensen ระบุจะ 'constrained ตลอดอายุของ Vera Rubin' — ดีมานด์ล่วงหน้าแข็งมาก + ตั้งเป้าเป็นผู้นำ CPU โลกด้วย Vera CPU (ขยายจาก GPU สู่ CPU)"
          },
          {
            "item": "CUDA software moat",
            "status": "executing",
            "evidence": "นักพัฒนา CUDA หลายล้านคน, ไลบรารี AI แทบทั้งหมด optimize ให้ NVIDIA ก่อน, TensorRT/NIM ขยาย stack ขึ้นไปชั้น inference serving — เป็นกำแพงที่ทำให้ ASIC คู่แข่งใช้งานจริงยากกว่ามาก"
          },
          {
            "item": "Networking (NVLink / Spectrum-X / InfiniBand)",
            "status": "executing",
            "evidence": "รายได้ networking โตเร็วจนกลายเป็นธุรกิจระดับหลายพันล้านดอลลาร์ต่อไตรมาส — การขายทั้ง rack (NVL72) ทำให้ NVIDIA กินมูลค่าต่อ data center มากขึ้นและ lock-in ลึกขึ้น"
          },
          {
            "item": "Inference / reasoning-model demand",
            "status": "executing",
            "evidence": "ดีมานด์ inference/reasoning model เป็นตัวขับใหญ่ — โมเดลคิดเชิงเหตุผลใช้ compute ต่อ query สูงขึ้นมาก หนุนการใช้ GPU ต่อเนื่อง"
          },
          {
            "item": "Sovereign AI + ecosystem partnerships",
            "status": "on-track",
            "evidence": "ดีลระดับประเทศ (ซาอุฯ, ยุโรป, ญี่ปุ่น) และพันธมิตร/การลงทุนเชิงกลยุทธ์ (OpenAI, Anthropic, Intel, Nokia) ขยายฐานดีมานด์ให้พ้นจาก hyperscaler — แต่ยังต้องพิสูจน์การแปลงเป็นรายได้จริงตามกำหนด"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "Moat ของ NVDA คือการซ้อนกันของ 3 ชั้น: (1) CUDA software ecosystem ที่สั่งสมกว่า 15 ปีและนักพัฒนาหลายล้านคน (2) ความได้เปรียบเชิงระบบจากการขายทั้ง rack (GPU+NVLink+networking) ที่ให้ TCO ต่อ token ดีที่สุด (3) supply chain ที่ผูก capacity ของ TSMC/HBM ไว้ล่วงหน้า — โดยรวมยังกว้างมาก แต่แรงกดดันจาก custom ASIC ของ hyperscaler (Google TPU, AWS Trainium) เริ่มเห็นชัดขึ้นในงาน inference ทำให้ประเมินเป็น 'stable' ไม่ใช่ strengthening",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "ครองส่วนแบ่ง AI accelerator ราว ~80-90% — ยังทิ้งห่างมาก แต่ TPU ของ Google และ Trainium เริ่มกัดส่วนแบ่งงาน inference ภายในค่ายตัวเองได้บ้าง"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "Blackwell นำหน้าคู่แข่งชัดเจนทั้ง performance และ TCO ระดับ rack และ Rubin กำลังตามมาในปี 2026 — ช่องว่างเชิงเทคโนโลยีระดับระบบยังถ่างออก"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ขยับจากรอบสินค้า 2 ปีเป็นรอบรายปี (Hopper→Blackwell→Rubin) และ ramp Blackwell ได้เร็วที่สุดในประวัติศาสตร์บริษัท — คู่แข่งที่ช้ากว่าจะเจอสินค้ารุ่นใหม่กว่าเสมอ"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "โค้ดและ workflow ที่ optimize บน CUDA ย้ายออกยากและแพง แต่ abstraction layer อย่าง PyTorch/Triton/vLLM ค่อย ๆ ลดแรงเสียดทานของการย้ายลงทีละน้อย"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "ลงทุน/จับมือทั่วทั้ง stack — AI lab (OpenAI, Anthropic), ผู้ผลิตชิป (Intel), telecom (Nokia), sovereign AI หลายประเทศ — ทำให้ NVIDIA อยู่ตรงกลางของแทบทุกดีลใหญ่ในอุตสาหกรรม"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ฐานนักพัฒนา CUDA หลายล้านคนยังเป็นมาตรฐานโดยพฤตินัยของงาน AI — ใหญ่และเหนียวแน่น แต่การเติบโตส่วนเพิ่มบางส่วนไหลไปที่เฟรมเวิร์กที่ไม่ผูกกับฮาร์ดแวร์"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "การขายทั้ง rack (NVL72) และ networking ทำให้ lock-in ลึกขึ้นในเชิงระบบ แต่ลูกค้ารายใหญ่สุดทุกรายกำลังพัฒนาชิปของตัวเองคู่ขนานเพื่อสร้างอำนาจต่อรอง — สองแรงนี้หักล้างกัน"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "stable",
            "note": "กำแพงสามชั้น (software + system + supply chain) ยังกว้างมากและยากจะทะลุใน 2-3 ปีนี้ แต่ทิศทางระยะยาวขึ้นกับว่า inference จะกระจายไป ASIC มากแค่ไหน"
          }
        ]
      },
      "capitalAllocation": {
        "score": 82,
        "verdict": "การจัดสรรเงินทุนโดยรวมอยู่ในเกณฑ์ดีมาก — R&D ที่หนุน cadence รายปีคือการลงทุนที่ให้ผลตอบแทนสูงสุด และ buyback ขนาดใหญ่คืนเงินส่วนเกินโดยไม่ dilute ผู้ถือหุ้น จุดที่ต้องจับตาที่สุดคือการลงทุนเชิงกลยุทธ์ใน AI lab ขนาดมหึมา (โดยเฉพาะดีล OpenAI) ที่แม้จะล็อกดีมานด์ระยะยาว แต่สร้างความเสี่ยง circular revenue ที่อาจบดบังคุณภาพดีมานด์ที่แท้จริง",
        "items": [
          {
            "label": "R&D",
            "current": "ราว ~$1.6-1.8 หมื่นล้านดอลลาร์/ปี และเพิ่มขึ้นต่อเนื่อง",
            "assessment": "good",
            "why": "เป็นเชื้อเพลิงของ roadmap รายปี (Blackwell→Rubin) และการขยายเข้า networking/software — ROIC ของเงินก้อนนี้สูงมากเมื่อดูจาก margin และส่วนแบ่งตลาดที่รักษาไว้ได้"
          },
          {
            "label": "Buyback",
            "current": "วงเงินใหม่ ~$60B (2025) ซื้อคืนจริงระดับ ~$1 หมื่นล้านดอลลาร์+/ไตรมาส",
            "assessment": "good",
            "why": "คืนเงินสดส่วนเกินสม่ำเสมอจน share count ลดลงสุทธิ — เหมาะสมสำหรับบริษัทที่ core business ไม่ต้องใช้ CapEx หนัก แม้จะซื้อที่ valuation ไม่ถูกก็ตาม"
          },
          {
            "label": "การลงทุนเชิงกลยุทธ์ / ecosystem",
            "current": "ดีล OpenAI (อาจสูงถึง ~$100B ผูกกับการ deploy ~10GW), Anthropic, Intel ~$5B, Nokia ~$1B",
            "assessment": "neutral",
            "why": "เชิงกลยุทธ์ฉลาด — ล็อกดีมานด์และขยายอิทธิพลทั้ง stack แต่การลงทุนในลูกค้าที่กลับมาซื้อชิปตัวเองทำให้ตลาดตั้งคำถามเรื่อง circular revenue และคุณภาพของ backlog"
          },
          {
            "label": "Dividend",
            "current": "จ่ายเชิงสัญลักษณ์ yield ต่ำมาก (<0.1%)",
            "assessment": "neutral",
            "why": "ไม่ใช่สาระสำคัญของ story — เงินถูกส่งไปที่ R&D และ buyback ซึ่งเหมาะสมกว่าสำหรับบริษัทเติบโตสูง"
          },
          {
            "label": "CapEx / supply commitment",
            "current": "CapEx ตรงต่ำ (fabless) แต่ purchase commitment กับ TSMC/HBM สูงขึ้นมาก",
            "assessment": "good",
            "why": "การผูก capacity ล่วงหน้าคือความได้เปรียบเชิงแข่งขัน (คู่แข่งหา wafer/HBM ยากกว่า) แม้จะเพิ่มความเสี่ยง inventory หากดีมานด์สะดุดกะทันหัน"
          },
          {
            "label": "การใช้เงินสด / งบดุล",
            "current": "Net cash หนา ~$6 หมื่นล้านดอลลาร์ ไม่ก่อหนี้เพิ่ม",
            "assessment": "good",
            "why": "งบดุลแข็งแรงพอรองรับทั้ง buyback, การลงทุน ecosystem และ commitment กับ supply chain พร้อมกันโดยไม่ตึง"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "Forward P/E ~23x (ราคา $217.55, mcap ~$5.3T) สำหรับบริษัทที่โต ~106% YoY — เชิงตัวเลขยัง 'ไม่แพง' (PEG « 1) และบริษัทเพิ่งให้ guide FY2028 ที่ ~+70% ซึ่งสูงกว่าที่ตลาดประเมินไว้ · สิ่งที่เปลี่ยนไปจากรอบก่อนคือมีตัวกดใหม่ 2 อย่างที่ไม่ใช่เรื่อง multiple: gross margin จะลงไป ~71-72% จากต้นทุน memory และ FCF รายไตรมาสหดจากเงินทุนหมุนเวียน — ยังมองเป็น 'fair' แต่ช่องว่างสำหรับความผิดพลาดแคบลงกว่ารอบก่อน"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q1 FY27 → Q2 FY27)",
          "prev": "$81.6B (+85% YoY)",
          "now": "$96.2B (+106% YoY, +18% QoQ) — เร่งตัว 4 ไตรมาสติด",
          "direction": "positive"
        },
        {
          "metric": "รายได้ Data Center",
          "prev": "$75.2B (+92% YoY)",
          "now": "$89.0B (+117% YoY, +18% QoQ) — ในนี้ ACIE ~$40B โต +138% YoY",
          "direction": "positive"
        },
        {
          "metric": "Guidance ไตรมาสถัดไป (Q3 FY27)",
          "prev": "~$91B ±2% (guide สำหรับ Q2 FY27)",
          "now": "~$108B ±2% — เพิ่มจากไตรมาสก่อนราว $11.8B",
          "direction": "positive"
        },
        {
          "metric": "แนวโน้ม Gross margin",
          "prev": "~75% ทรงตัว",
          "now": "Q2 ทำได้ 75% แต่ guide ลดเป็น ~74% (Q3), ~71-72% (Q4), ~72-73% (FY28) จากต้นทุน memory ที่ CFO ระบุว่า 'สูงกว่าที่เคยคาดและจะสูงขึ้นอีกปีหน้า' · supply commitments พุ่งจาก $119B เป็น $279B ส่วนใหญ่เพื่อจองหน่วยความจำ",
          "direction": "negative"
        },
        {
          "metric": "กระแสเงินสดอิสระรายไตรมาส",
          "prev": "$48.6B (Q1 FY27)",
          "now": "$21.3B — กำไรไม่ได้ลด แต่เงินจมในลูกหนี้ที่เพิ่มกว่า $22B (DSO 45 → 60 วัน จากการให้เครดิตเทอมยาวกับลูกค้าดีลใหญ่) และสต๊อก +$5.8B เตรียมส่ง Vera Rubin",
          "direction": "negative"
        },
        {
          "metric": "มุมมองปีหน้า (FY2028)",
          "prev": "บริษัทยังไม่เคยให้ตัวเลข",
          "now": "ให้ guide เบื้องต้น ~+70% รายได้ และย้ำว่าเป็นตัวเลขที่ 'ถูกจำกัดด้วยกำลังผลิต ไม่ใช่ดีมานด์' — สูงกว่าที่ตลาดเคยประเมินไว้ ~45%",
          "direction": "positive"
        }
      ],
      "risks": [
        "รอบลงทุน AI capex กระจุกตัวในลูกค้า hyperscaler + AI lab ไม่กี่ราย — หากรายใดชะลอการลงทุนหรือเกิดคำถามเรื่อง ROI ของ AI ในวงกว้าง รายได้จะถูกกระทบแรงและเร็ว",
        "ต้นทุน memory (HBM/DRAM) ที่บริษัทระบุเองว่าสูงกว่าคาดและจะสูงขึ้นอีก กด gross margin ลงเหลือ ~71-72% ช่วง Q4 FY27 — เป็นต้นทุนต่อเนื่อง ไม่ใช่รายการครั้งเดียวแบบ H20 และแผนชดเชยคือขึ้นราคา ซึ่งยังไม่พิสูจน์ว่าลูกค้ารับได้ทั้งหมด",
        "เงินทุนหมุนเวียนบวมเร็ว: ลูกหนี้ $63.1B (DSO 45 → 60 วัน) จากการให้เครดิตเทอมยาวกับลูกค้าดีลใหญ่ + สต๊อก $31.6B — ถ้าลูกค้ากลุ่มนี้ชะลอหรือมีปัญหาการเงิน ความเสี่ยงจะย้ายจาก 'ยอดขาย' มาเป็น 'เก็บเงินไม่ได้' ซึ่งกระทบงบดุลตรง ๆ",
        "Custom ASIC ของลูกค้าเอง (Google TPU, AWS Trainium, Meta MTIA) และ AMD MI-series กำลังแย่งส่วนแบ่งงาน inference ซึ่งเป็นตลาดที่จะใหญ่ที่สุดในระยะยาว",
        "จีน: ข้อจำกัดส่งออกทำให้รายได้ Data Center จากจีนแทบเป็นศูนย์ และเร่งให้จีนสร้างชิปทดแทนเอง (Huawei Ascend) — ตลาดที่เคยมีนัยสำคัญอาจหายถาวร",
        "Circular revenue: การลงทุนขนาดใหญ่ในลูกค้า/ecosystem (~$50B ใน frontier AI labs และดีล financing ~$500B ร่วมกับกองทุนใหญ่) ทำให้ตลาดตั้งคำถามว่า backlog สะท้อนดีมานด์แท้จริงแค่ไหน",
        "Supply chain กระจุกตัว: พึ่งพา TSMC (ไต้หวัน) และ HBM จากผู้ผลิตไม่กี่ราย — ความตึงเครียดภูมิรัฐศาสตร์ช่องแคบไต้หวันคือ tail risk ที่ใหญ่ที่สุดของทั้ง thesis"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีของ NVIDIA สิ้นสุดปลายเดือนมกราคม (เช่น FY2026 สิ้นสุด 25 ม.ค. 2026 รายงานผลปลาย ก.พ. 2026) — FY2026 คือปีบัญชีล่าสุดที่ปิดงบและรายงานแล้ว ณ ก.ค. 2026",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับผลของ split 10:1 มิ.ย. 2024 และ 4:1 ก.ค. 2021 ครบทุกปี)",
        "years": [
          {
            "fy": "FY2022",
            "endYm": "2022-01",
            "revenueB": 26.9,
            "epsAdj": 0.385,
            "opMarginPct": 37.3,
            "fcfB": 8.1,
            "priceFYEnd": 22.84
          },
          {
            "fy": "FY2023",
            "endYm": "2023-01",
            "revenueB": 27,
            "epsAdj": 0.174,
            "opMarginPct": 15.7,
            "fcfB": 3.8,
            "priceFYEnd": 20.36
          },
          {
            "fy": "FY2024",
            "endYm": "2024-01",
            "revenueB": 60.9,
            "epsAdj": 1.193,
            "opMarginPct": 54.1,
            "fcfB": 27,
            "priceFYEnd": 61.03
          },
          {
            "fy": "FY2025",
            "endYm": "2025-01",
            "revenueB": 130.5,
            "epsAdj": 2.94,
            "opMarginPct": 62.4,
            "fcfB": 60.9,
            "priceFYEnd": 142.62
          },
          {
            "fy": "FY2026",
            "endYm": "2026-01",
            "revenueB": 215.9,
            "epsAdj": 4.9,
            "opMarginPct": 60.4,
            "fcfB": 96.7,
            "priceFYEnd": 187.67
          }
        ],
        "notes": "EPS และราคาหุ้นปรับ split เป็นฐานปัจจุบันทุกปีแล้ว (EPS ที่รายงานจริง FY2022-FY2024 คือ $3.85/$1.74/$11.93 หารด้วย 10 จาก split มิ.ย. 2024) — จำนวนหุ้น diluted โดยนัยอยู่ราว 24.5-25.3 พันล้านหุ้นและลดลงช้า ๆ จาก buyback ซึ่งสอดคล้องกันทุกปี; FY2023 operating margin ต่ำผิดปกติ (15.7%) เพราะค่าใช้จ่ายยกเลิกดีล Arm ~$1.35B และ write-down สินค้าคงคลังช่วง crypto/gaming ชะลอ; FCF = กระแสเงินสดดำเนินงานลบ capex (OCF/capex FY2026 = $102.7B/$6.0B); ราคา ณ สิ้นปีบัญชีใช้ราคาปิดวันทำการสุดท้ายก่อนวันสิ้นงวด (28 ม.ค. 2022, 27 ม.ค. 2023, 26 ม.ค. 2024, 24 ม.ค. 2025, 23 ม.ค. 2026) จาก Yahoo Finance ซึ่งตรวจทานกับราคาที่รายงานตอนนั้นแล้ว; ตัวเลขเป็นค่าประมาณความแม่นยำ ~2-3% สำหรับ curated KB",
        "sources": [
          "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026",
          "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000019/q4fy26pr.htm",
          "https://stockanalysis.com/stocks/nvda/financials/",
          "https://query1.finance.yahoo.com/v8/finance/chart/NVDA (daily closes at fiscal year-ends)",
          "https://www.sec.gov/Archives/edgar/data/1045810/000104581024000028/q4fy24pr.htm"
        ],
        "quarters": [
          {
            "q": "Q2 FY24",
            "endYm": "2023-07",
            "revenueB": 13.5,
            "epsAdj": 0.25,
            "opMarginPct": 50.3,
            "fcfB": 6.1,
            "priceQEnd": 46.7
          },
          {
            "q": "Q3 FY24",
            "endYm": "2023-10",
            "revenueB": 18.1,
            "epsAdj": 0.37,
            "opMarginPct": 57.5,
            "fcfB": 7.1,
            "priceQEnd": 40.8
          },
          {
            "q": "Q4 FY24",
            "endYm": "2024-01",
            "revenueB": 22.1,
            "epsAdj": 0.49,
            "opMarginPct": 61.6,
            "fcfB": 11.2,
            "priceQEnd": 61
          },
          {
            "q": "Q1 FY25",
            "endYm": "2024-04",
            "revenueB": 26,
            "epsAdj": 0.6,
            "opMarginPct": 64.9,
            "fcfB": 15,
            "priceQEnd": 86
          },
          {
            "q": "Q2 FY25",
            "endYm": "2024-07",
            "revenueB": 30,
            "epsAdj": 0.67,
            "opMarginPct": 62.1,
            "fcfB": 13.5,
            "priceQEnd": 117
          },
          {
            "q": "Q3 FY25",
            "endYm": "2024-10",
            "revenueB": 35.1,
            "epsAdj": 0.78,
            "opMarginPct": 62.3,
            "fcfB": 16.8,
            "priceQEnd": 132
          },
          {
            "q": "Q4 FY25",
            "endYm": "2025-01",
            "revenueB": 39.3,
            "epsAdj": 0.89,
            "opMarginPct": 61.1,
            "fcfB": 15.6,
            "priceQEnd": 142.6
          },
          {
            "q": "Q1 FY26",
            "endYm": "2025-04",
            "revenueB": 44.1,
            "epsAdj": 0.76,
            "opMarginPct": 49.1,
            "fcfB": 26.2,
            "priceQEnd": 109
          },
          {
            "q": "Q2 FY26",
            "endYm": "2025-07",
            "revenueB": 46.7,
            "epsAdj": 1.08,
            "opMarginPct": 60.8,
            "fcfB": 13.5,
            "priceQEnd": 177
          },
          {
            "q": "Q3 FY26",
            "endYm": "2025-10",
            "revenueB": 57,
            "epsAdj": 1.3,
            "opMarginPct": 63.2,
            "fcfB": 22.1,
            "priceQEnd": 207
          },
          {
            "q": "Q4 FY26",
            "endYm": "2026-01",
            "revenueB": 68.1,
            "epsAdj": 1.76,
            "opMarginPct": 65,
            "fcfB": 34.9,
            "priceQEnd": 187.7
          },
          {
            "q": "Q1 FY27",
            "endYm": "2026-04",
            "revenueB": 81.6,
            "epsAdj": 2.39,
            "opMarginPct": 65.6,
            "fcfB": 48.6,
            "priceQEnd": 180
          },
          {
            "q": "Q2 FY27",
            "endYm": "2026-07",
            "endDate": "2026-07-26",
            "revenueB": 96.2,
            "epsAdj": 2.46,
            "opMarginPct": 66.2,
            "fcfB": 21.3,
            "priceQEnd": 206.84,
            "epsNote": "GAAP EPS 2.46 รวมกำไรจากเงินลงทุน (equity securities) ~$7.8B ก่อนภาษี (~$0.32/หุ้น) ซึ่งไม่ได้มาจากธุรกิจหลัก · non-GAAP ที่บริษัทรายงาน = 2.22 (คอลัมน์นี้ใช้ GAAP ทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้)"
          }
        ]
      },
      "nextEarnings": "2026-11",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2027",
            "eps": 9.27,
            "revenue": 409
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 FY27",
            "metric": "revenue",
            "guided": "~$91.0B ±2%",
            "actual": "~$96.2B",
            "result": "beat",
            "magnitudePct": 5.7
          },
          {
            "quarter": "Q1 FY27",
            "metric": "revenue",
            "guided": "~$78.0B ±2%",
            "actual": "~$81.6B",
            "result": "beat",
            "magnitudePct": 4.6
          },
          {
            "quarter": "Q4 FY26",
            "metric": "revenue",
            "guided": "~$65.0B ±2%",
            "actual": "~$68.1B",
            "result": "beat",
            "magnitudePct": 4.8
          },
          {
            "quarter": "Q3 FY26",
            "metric": "revenue",
            "guided": "~$54.0B ±2%",
            "actual": "~$57.0B",
            "result": "beat",
            "magnitudePct": 5.6
          },
          {
            "quarter": "Q2 FY26",
            "metric": "revenue",
            "guided": "~$45.0B ±2%",
            "actual": "~$46.7B",
            "result": "beat",
            "magnitudePct": 3.9
          },
          {
            "quarter": "Q1 FY26",
            "metric": "revenue",
            "guided": "~$43.0B ±2%",
            "actual": "~$44.1B",
            "result": "beat",
            "magnitudePct": 2.5
          },
          {
            "quarter": "Q4 FY25",
            "metric": "revenue",
            "guided": "~$37.5B ±2%",
            "actual": "~$39.3B",
            "result": "beat",
            "magnitudePct": 4.9
          },
          {
            "quarter": "Q3 FY25",
            "metric": "revenue",
            "guided": "~$32.5B ±2%",
            "actual": "~$35.1B",
            "result": "beat",
            "magnitudePct": 7.9
          },
          {
            "quarter": "Q2 FY25",
            "metric": "revenue",
            "guided": "~$28.0B ±2%",
            "actual": "~$30.0B",
            "result": "beat",
            "magnitudePct": 7.3
          },
          {
            "quarter": "Q1 FY25",
            "metric": "revenue",
            "guided": "~$24.0B ±2%",
            "actual": "~$26.0B",
            "result": "beat",
            "magnitudePct": 8.5
          },
          {
            "quarter": "Q4 FY24",
            "metric": "revenue",
            "guided": "~$20.0B ±2%",
            "actual": "~$22.1B",
            "result": "beat",
            "magnitudePct": 10.5
          },
          {
            "quarter": "Q3 FY24",
            "metric": "revenue",
            "guided": "~$16.0B ±2%",
            "actual": "~$18.1B",
            "result": "beat",
            "magnitudePct": 13.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2027",
            "revenue": 409,
            "eps": 9.27,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": 573.5,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "consensus เป็น non-GAAP ของสำนักวิเคราะห์ ขณะที่ตารางไตรมาส/รายปีใน KB ใช้ GAAP — เทียบข้ามฐานตรง ๆ ไม่ได้ · FY2027 ใช้ StockAnalysis (34 นักวิเคราะห์) rev $409.0B / EPS $9.27 อัปเดตหลังงบ Q2 · FY2028 ตัวเลข $573.5B คือ consensus 'ก่อน' บริษัทให้ guide เบื้องต้น ~+70% (ซึ่ง implied ~$690B) จึงกำลังถูกปรับขึ้นทั้งกระดาน — ยังไม่พบตัวเลข EPS FY2028 หลังปรับที่ยืนยันได้ จึงเว้นไว้แทนการเดา · Q3 FY27 บริษัท guide ~$108B ±2%"
      }
    },
    "MSFT": {
      "ticker": "MSFT",
      "name": "Microsoft Corporation",
      "layer": "cloud",
      "thesis": {
        "statement": "Microsoft คือ 'ทางด่วนเก็บค่าผ่านทาง' ของ AI ยุคองค์กร — เป็นเจ้าของทั้งชั้น cloud (Azure), ชั้นแอปพลิเคชัน (Microsoft 365 + Copilot), ชั้นนักพัฒนา (GitHub) และถือหุ้น ~27% ใน OpenAI พร้อมสัญญาผูก Azure มูลค่ามหาศาล ทำให้ไม่ว่า AI จะชนะด้วยโมเดลค่ายไหน Microsoft ก็ได้ส่วนแบ่งรายได้เสมอ รายได้ที่โตเร่งขึ้น ~+18% YoY บนฐานเกือบ $300B/ปี พร้อม margin ~49% คือหลักฐานว่า AI กำลังแปลงเป็นกำไรจริง ไม่ใช่แค่เรื่องเล่า",
        "pillars": [
          "Azure โต ~40% YoY ต่อเนื่อง โดย AI เป็นตัวเร่งหลัก และ backlog (commercial RPO ~$392B) ล็อกรายได้ล่วงหน้าหลายปี",
          "Copilot ฝังใน Microsoft 365 ที่มีผู้ใช้องค์กรหลายร้อยล้านคน — ช่องทาง upsell AI ต่อหัวที่ใหญ่ที่สุดในโลก",
          "กลยุทธ์ multi-model: ถือหุ้น OpenAI ~27% + ดีล Anthropic (~$30B Azure) ลดความเสี่ยงพึ่งพาโมเดลค่ายเดียว",
          "งบดุลแข็งแกร่งระดับ AAA ทำให้เร่ง capex ระดับ ~$35B/ไตรมาส ได้โดยยังจ่ายปันผลและ buyback ต่อเนื่อง",
          "ต้นทุนย้ายค่ายสูงมากจาก bundle Windows + Office + Teams + Azure + security — ลูกค้าองค์กรแทบไม่หนี"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+18% YoY (Q4 FY26 — $90.0B) · FY2026 ทั้งปี $331.8B (+18%) · Azure +43% ทะลุ $100B ต่อปีครั้งแรก",
          "trend": "up",
          "score": 87,
          "impact": "positive",
          "why": "โตสองหลักสม่ำเสมอที่ฐานรายได้ ~$330B/ปี โดย Azure เร่งเป็น +43% และแตะหลัก $100B — เครื่องยนต์คลาวด์/AI ยังเป็นตัวขับหลักและดีมานด์เกิน capacity"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "non-GAAP EPS $4.74 (Q4 FY26, +23% YoY) ชนะคาด $4.33 · GAAP $4.81 (+32%) · FY2026 net income $133.8B (+31%)",
          "trend": "up",
          "score": 84,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้จาก operating leverage — แม้ยังมีส่วนแบ่งขาดทุน OpenAI กด EPS การเติบโต 20%+ ที่ขนาดนี้หายากมาก"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "OCF สูงมาก แต่ FCF ถูกกดหนักขึ้น — capex (รวม finance lease) >$40B/ไตรมาส · ~$190B ทั้งปี CY2026",
          "trend": "down",
          "score": 58,
          "impact": "neutral",
          "why": "capex เร่งจาก ~$35B เป็น >$40B/ไตรมาส กลืน FCF มากขึ้น — เดิมพันว่าดีมานด์ AI/คลาวด์คุ้มค่าเสื่อม จุดนี้คือความเสี่ยง overbuild ที่ต้องจับตา"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~45% (Q4 FY26) — สูงสุดในกลุ่ม mega-cap · gross margin ~68% แคบลงจากค่าเสื่อม datacenter",
          "trend": "flat",
          "score": 88,
          "impact": "positive",
          "why": "โครงสร้างกำไรยังแข็งแกร่งสุดในกลุ่ม แม้ gross margin ถูกกดจากค่าเสื่อม AI infra — operating leverage ของซอฟต์แวร์ยังชดเชยได้ดี"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังสูง (~25%) แต่ถูกเจือจางเมื่อฐานสินทรัพย์ AI ขยายเร็วมาก",
          "trend": "down",
          "score": 74,
          "impact": "neutral",
          "why": "ผลตอบแทนต่อทุนลดลงตามการทุ่ม capex — จะฟื้นเมื่อ datacenter ที่สร้างเริ่มสร้างรายได้เต็มกำลัง"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุนระยะสั้นรวม ~$100B+",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "กันชนหนามากพอที่จะเร่ง capex, จ่ายปันผล, buyback และลงทุนเชิงกลยุทธ์ (OpenAI, Anthropic) พร้อมกันได้โดยไม่ต้องพึ่งการกู้เพิ่มอย่างมีนัยสำคัญ"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ต่ำมากเทียบขนาดบริษัท สถานะใกล้ net cash และเป็นหนึ่งในไม่กี่บริษัทที่ได้เครดิต AAA",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลระดับ AAA คือแต้มต่อเชิงกลยุทธ์ในยุค AI capex — สามารถระดมทุนถูกกว่าใครและรับความผันผวนของวัฏจักรได้ดีกว่าคู่แข่งที่ก่อหนี้หนัก (เช่น Oracle)"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "จำนวนหุ้นแทบไม่เพิ่ม — SBC ราวปีละ ~$12B ถูก buyback ชดเชยเกือบหมด",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "ต่างจากบริษัท AI รุ่นใหม่ที่เจือจางผู้ถือหุ้นหนัก Microsoft คุม share count ให้ทรงถึงลดลงเล็กน้อยมาต่อเนื่องหลายปี ผู้ถือหุ้นระยะยาวไม่โดนกัดกร่อน"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "ปันผลเพิ่ม ~10% ต่อปี + buyback ต่อเนื่อง ควบคู่ capex AI ที่เร่งขึ้นแรงมาก (~$35B/ไตรมาส)",
          "trend": "flat",
          "score": 75,
          "impact": "neutral",
          "why": "ประวัติการจัดสรรทุนดีเยี่ยม (ดีล OpenAI ยุคแรกคือหนึ่งใน bet ที่คุ้มที่สุดในประวัติศาสตร์ tech) แต่ขนาด capex ปัจจุบันใหญ่จนความผิดพลาดจะแพงมาก — คะแนนจึงถูกหักจากความเสี่ยง overbuild"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~20-23x (ราคา ~$390 · mcap ~$2.92T) — de-rate ลงจาก ~30x, หุ้น +15% หลังงบ Q4",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "หลัง underperform Mag7 มาทั้งปี multiple ลงมาเหลือ ~20-23x ทั้งที่กำไรโต 20%+ และ Azure เร่งตัว — คุณภาพระดับ AAA + margin 45% ที่ ~20x ถือว่าเหมาะสม ไม่ใช่ premium สุดโต่งอีกต่อไป"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 92,
        "recurringPct": 80,
        "note": "รายได้กระจายดี 3 ขา คุณภาพสูง (recurring/enterprise สูง) — Intelligent Cloud (Azure +43%, ทะลุ $100B ต่อปี, AI run rate ~$37B+ +123%) เป็นตัวเร่ง ขณะ PBP (M365 Copilot upsell) สม่ำเสมอ · commercial RPO/backlog พุ่งเป็น ~$627B (+99% YoY, +26% ถ้าตัด OpenAI) ให้ visibility หลายปี",
        "segments": [
          {
            "name": "Intelligent Cloud (Azure, Server, Enterprise Services)",
            "sharePct": 42,
            "growthNote": "เครื่องยนต์หลัก — Azure +43% YoY ทะลุ $100B ต่อปีครั้งแรก, AI services เป็นตัวเร่ง, ดีมานด์ยังเกิน capacity",
            "trend": "up"
          },
          {
            "name": "Productivity and Business Processes (Microsoft 365, LinkedIn, Dynamics)",
            "sharePct": 40,
            "growthNote": "โตสองหลักสม่ำเสมอ — M365 Copilot เป็น upsell ราคาต่อหัวที่มีน้ำหนักขึ้นเรื่อย ๆ",
            "trend": "up"
          },
          {
            "name": "More Personal Computing (Windows, Gaming/Xbox, Search & Ads)",
            "sharePct": 18,
            "growthNote": "โตช้า (วัฏจักร) — แต่เป็นฐานผู้ใช้กระจาย Copilot สู่ consumer",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 85,
        "items": [
          {
            "item": "Azure AI / AI Foundry — ขายโครงสร้างพื้นฐานและแพลตฟอร์มโมเดลให้องค์กร",
            "status": "executing",
            "evidence": "Azure +43% YoY ทะลุ $100B ต่อปีครั้งแรก · AI business run rate ~$37B+ (+123% YoY) · commercial RPO ~$627B · ดีมานด์ยังเกิน supply — หลักฐานเชิงสัญญาที่จับต้องได้ที่สุดในกลุ่ม"
          },
          {
            "item": "Microsoft 365 Copilot — monetize AI ต่อหัวบนฐานผู้ใช้องค์กรหลายร้อยล้าน",
            "status": "on-track",
            "evidence": "จำนวน seat โตต่อเนื่องทุกไตรมาสและองค์กรใหญ่ (สัดส่วนสูงของ Fortune 500) ทยอยใช้งานจริง แต่รายได้ยังเล็กเทียบศักยภาพ และต้องพิสูจน์ renewal/expansion ในวงกว้าง"
          },
          {
            "item": "GitHub Copilot — ครองตลาด AI coding สำหรับองค์กร",
            "status": "on-track",
            "evidence": "ฐานผู้ใช้สะสมระดับ ~20M+ และเป็น default ของลูกค้า enterprise จำนวนมาก แต่คู่แข่ง (Cursor, Claude Code) โตเร็วกว่าในกลุ่ม power user — ยังนำอยู่แต่ต้องวิ่งแรงขึ้น"
          },
          {
            "item": "พันธมิตร OpenAI + กลยุทธ์ multi-model (รวมดีล Anthropic)",
            "status": "executing",
            "evidence": "ปรับโครงสร้างดีล OpenAI สำเร็จ — ถือหุ้น ~27% + OpenAI ผูกซื้อ Azure เพิ่ม ~$250B; ขณะเดียวกัน Anthropic ตกลงซื้อ Azure compute ~$30B และโมเดล Claude เข้ามาอยู่ใน Copilot — ลดความเสี่ยงพึ่งค่ายเดียวอย่างเป็นรูปธรรม"
          },
          {
            "item": "สร้าง AI datacenter ขนาดยักษ์ (โครงการตระกูล Fairwater) รองรับ demand ระยะยาว",
            "status": "executing",
            "evidence": "capex รวม finance lease >$40B/ไตรมาส (~$190B ทั้งปี CY2026) — โครงการตระกูล Fairwater เร่งสร้าง บริษัทย้ำว่า capacity ยังไม่พอขาย ปัญหาคือ 'สร้างไม่ทัน' ไม่ใช่ 'ไม่มีคนซื้อ'"
          },
          {
            "item": "โมเดล in-house ตระกูล MAI — ลดการพึ่งพา OpenAI ในระยะยาว",
            "status": "at-risk",
            "evidence": "MAI-1 และโมเดลเสียง/ภาพเปิดตัวแล้วแต่ยังตามหลัง frontier model ของ OpenAI/Anthropic/Google ชัดเจน — เป็น optionality มากกว่าเสาหลัก หากล้มเหลวก็ยังมี multi-model รองรับ"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Moat ของ Microsoft คือ 'การเป็นระบบปฏิบัติการของโลกองค์กร' — Windows, Office, Teams, Active Directory/Entra, Azure และ security ถูกมัดขายเป็นสัญญาเดียว ทำให้ต้นทุนการย้ายค่ายสูงมหาศาล และ AI (Copilot) ถูกฝังลงไปใน workflow ที่ลูกค้าใช้อยู่แล้วทุกวัน ไม่ต้องเปลี่ยนพฤติกรรม ยิ่งใช้ AI มาก ข้อมูลและ workflow ยิ่งผูกกับ Microsoft Graph ลึกขึ้น — เป็น lock-in ที่เสริมตัวเองตามเวลา",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "อันดับ 2 ใน cloud (ตาม AWS แต่โตเร็วกว่า) และอันดับ 1 เด็ดขาดใน enterprise software/productivity — ส่วนแบ่ง Azure ไล่ขึ้นช้า ๆ ทุกปี"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "ไม่ได้เป็นเจ้าของ frontier model เอง แต่เข้าถึงโมเดลท็อปทุกค่ายผ่าน OpenAI/Anthropic — จุดอ่อนคือชิป AI in-house (Maia) ยังตามหลัง TPU ของ Google มาก"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ฝัง Copilot ลงทุกผลิตภัณฑ์ได้เร็วผิดวิสัยบริษัทขนาดนี้ และปิดดีลเชิงกลยุทธ์ (OpenAI restructure, Anthropic) ได้ก่อนคู่แข่งตั้งตัว"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "strengthening",
            "note": "สูงที่สุดในอุตสาหกรรม — ย้ายออกจาก M365/Entra/Teams หมายถึงรื้อทั้ง identity, ไฟล์, การสื่อสาร และ compliance ขององค์กร ยิ่งใช้ Copilot ที่เรียนรู้ข้อมูลภายใน ยิ่งย้ายยาก"
          },
          {
            "key": "ecosystem",
            "label": "Ecosystem",
            "status": "strengthening",
            "note": "ครบวงจรที่สุด: OS + productivity + cloud + dev tools (GitHub/VS Code) + LinkedIn + gaming — คู่แข่งแต่ละรายชนกับ Microsoft ได้แค่บางชั้น ไม่มีใครชนได้ทุกชั้น"
          },
          {
            "key": "developerAdoption",
            "label": "Developer adoption",
            "status": "stable",
            "note": "GitHub + VS Code คือบ้านของนักพัฒนาส่วนใหญ่ของโลก แต่เครื่องมือ AI coding รุ่นใหม่ (Cursor, Claude Code) กำลังดึง mindshare ของ power developer ออกไป — ยังนำแต่โดนท้าทายจริง"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "สัญญา Enterprise Agreement หลายปี + commercial RPO ~$392B + ข้อมูลองค์กรที่สะสมใน Microsoft Graph ทำให้รายได้ล่วงหน้าถูกล็อกไว้ลึกและยาวขึ้นทุกไตรมาส"
          },
          {
            "key": "moat",
            "label": "Moat",
            "status": "strengthening",
            "note": "AI ไม่ได้ disrupt Microsoft แต่กลายเป็นชั้นใหม่ที่ขายทับของเดิม — bundle + switching cost + distribution สู่ลูกค้าองค์กรเกือบทุกรายของโลกคือ moat ที่กว้างขึ้นในยุค AI"
          }
        ]
      },
      "capitalAllocation": {
        "score": 75,
        "verdict": "ยอดเยี่ยมในเชิงกลยุทธ์แต่กำลังอยู่ในโหมด 'เดิมพันหนัก' — เงินเกือบทั้งหมดถูกเทลง AI infrastructure ซึ่งหากถูกต้องจะสร้างมูลค่ามหาศาล แต่ผู้ถือหุ้นต้องยอมรับ FCF ที่ถูกกดไว้ 2-3 ปี และแบกความเสี่ยง overcapacity หาก demand ชะลอ",
        "items": [
          {
            "label": "CapEx (AI datacenter/GPU)",
            "current": "~$35B/ไตรมาส (รวม finance lease) และมีแผนเพิ่มต่อใน FY26 — เร่งขึ้นแรงจาก ~$88B ทั้งปี FY25",
            "assessment": "neutral",
            "why": "มีสัญญาลูกค้า (RPO ~$392B) รองรับมากกว่าคู่แข่งส่วนใหญ่ จึงไม่ใช่การสร้างลอย ๆ แต่ขนาดใหญ่จนหากรอบการใช้ AI สะดุด ค่าเสื่อมจะกดกำไรหลายปี"
          },
          {
            "label": "R&D",
            "current": "~$30B+/ปี — ระดับสูงสุดของโลกกลุ่ม software",
            "assessment": "good",
            "why": "กระจายทั้งโมเดล (MAI), ชิป (Maia/Cobalt), แพลตฟอร์ม (Foundry) และผลิตภัณฑ์ (Copilot ทุกตัว) — ผลงานที่ผ่านมาแปลงเป็นรายได้จริงได้สม่ำเสมอ"
          },
          {
            "label": "Buyback",
            "current": "โครงการ ~$60B เดินต่อเนื่องแต่ความเร็วลดลงเพื่อเก็บเงินไว้ทำ capex — พอชดเชย SBC ให้ share count ทรงตัว",
            "assessment": "neutral",
            "why": "ถูกต้องแล้วที่ให้ลำดับความสำคัญกับ AI ก่อน buyback ในช่วงนี้ แต่แปลว่าผลตอบแทนผู้ถือหุ้นทางตรงระยะสั้นจะบางลง"
          },
          {
            "label": "เงินปันผล",
            "current": "เพิ่ม ~10% ต่อปีอย่างสม่ำเสมอ (ล่าสุด ~$0.91/ไตรมาส) รวมจ่าย ~$25B+/ปี",
            "assessment": "good",
            "why": "โตต่อเนื่องนับสิบปีโดยใช้เงินเพียงส่วนน้อยของกระแสเงินสด — ยั่งยืนแม้ capex จะหนัก"
          },
          {
            "label": "การลงทุนเชิงกลยุทธ์ / M&A",
            "current": "หุ้น OpenAI ~27% (มูลค่าตามบัญชีหลักแสนล้านดอลลาร์), ลงทุนใน Anthropic สูงสุด ~$5B, Activision ปิดดีลและเริ่ม contribute แล้ว",
            "assessment": "good",
            "why": "ดีล OpenAI ยุคแรกคือหนึ่งใน bet ที่ให้ผลตอบแทนเชิงกลยุทธ์สูงที่สุดในประวัติศาสตร์ tech และการเพิ่ม Anthropic ช่วยลด single-point-of-failure ของทั้ง thesis"
          },
          {
            "label": "การเจือจางหุ้น (SBC)",
            "current": "SBC ~$12B/ปี — ต่ำมากเมื่อเทียบรายได้ และถูก buyback ดูดซับเกือบหมด",
            "assessment": "good",
            "why": "วินัยเรื่อง share count ดีต่อเนื่อง ผู้ถือหุ้นระยะยาวไม่ถูกเจือจางแบบบริษัท growth ส่วนใหญ่"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "forward P/E ~20-23x (ราคา ~$390, mcap ~$2.92T) — de-rate ลงชัดจาก ~30x หลังหุ้น underperform Mag7 ทั้งปี ทั้งที่รายได้โต ~18%, Azure +43% และงบดุล AAA · ที่ระดับนี้ถือว่า 'สมเหตุสมผล' สำหรับคุณภาพที่ได้ ไม่ใช่ของถูก แต่พ้นโซน premium สุดโต่งแล้ว — ความเสี่ยงหลักคือ capex/FCF ระยะสั้น ไม่ใช่ธุรกิจหลัก"
      },
      "whatChanged": [
        {
          "metric": "Azure (Q3 → Q4 FY26)",
          "prev": "+40% YoY",
          "now": "+43% YoY — ทะลุ $100B ต่อปีครั้งแรก",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวม",
          "prev": "$82.9B (+18%)",
          "now": "$90.0B (+18%) · FY2026 $331.8B (+18%)",
          "direction": "positive"
        },
        {
          "metric": "กำไร (non-GAAP EPS)",
          "prev": "โตสองหลัก",
          "now": "$4.74 (+23% YoY) ชนะคาด $4.33 · net income $133.8B FY26 (+31%)",
          "direction": "positive"
        },
        {
          "metric": "CapEx (incl finance lease)",
          "prev": "~$35-38B/ไตรมาส",
          "now": ">$40B/ไตรมาส (~$190B ทั้งปี CY2026)",
          "direction": "negative"
        },
        {
          "metric": "Operating margin",
          "prev": "~46%",
          "now": "~45% · gross margin ~68% แคบลงจากค่าเสื่อม datacenter",
          "direction": "neutral"
        },
        {
          "metric": "Valuation",
          "prev": "fwd P/E ~30x (premium)",
          "now": "fwd P/E ~20-23x (de-rate) — หุ้น +15% หลังงบ Q4",
          "direction": "positive"
        }
      ],
      "risks": [
        "Capex มหาศาล (~$35B/ไตรมาสและยังเพิ่ม) กด FCF หลายปี — หาก demand ด้าน AI ชะลอหรือ monetization ช้ากว่าคาด ค่าเสื่อมจาก GPU/datacenter จะกลายเป็นภาระกำไรระยะยาว (ความเสี่ยง overbuild)",
        "ความเสี่ยงจาก OpenAI — ทั้งผลขาดทุนตามส่วนได้เสียที่กด EPS ทุกไตรมาส, ความยั่งยืนทางการเงินของ OpenAI เอง และการที่ OpenAI กระจาย workload ไปหา Oracle/CoreWeave/AWS ทำให้ Azure ไม่ได้ผูกขาดอีกต่อไป",
        "Copilot ต้องพิสูจน์ความคุ้มค่าต่อหัวในวงกว้าง — หากองค์กรมองว่า ROI ไม่ชัดเมื่อเทียบราคา ~$30/user/เดือน รอบ renewal อาจเห็นการลด seat และกระทบ narrative การ monetize AI ทั้งก้อน",
        "การแข่งขันรุนแรงขึ้นทุกชั้น — Google Cloud/Gemini เร่งแรงและมี TPU ได้เปรียบด้านต้นทุน, AWS ยังใหญ่กว่า, ส่วน AI coding tools รุ่นใหม่กัดกิน GitHub Copilot ในกลุ่ม power developer",
        "แรงกดดันด้านกฎระเบียบและโครงสร้างดีลวนในอุตสาหกรรม AI (circular deals) — หากมูลค่าห่วงโซ่ AI ถูกตั้งคำถามทั้งระบบ หุ้นที่ multiple ระดับ premium อย่าง MSFT จะโดน de-rate ไปด้วยแม้พื้นฐานไม่เปลี่ยน"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีของ Microsoft สิ้นสุด 30 มิ.ย. (เช่น FY2025 = ก.ค. 2024 – มิ.ย. 2025) — FY2026 สิ้นสุดแล้วแต่จะประกาศผลวันที่ 29 ก.ค. 2026 จึงยังไม่นับรวม ใช้ FY2021–FY2025",
        "epsBasis": "diluted GAAP, split-adjusted (ไม่มี split ตั้งแต่ปี 2003 — ตัวเลขตามงบจริงคือฐานหุ้นปัจจุบันอยู่แล้ว) · หมายเหตุ: Q2 FY26 GAAP EPS $5.16 รวมกำไรจากเงินลงทุนใน OpenAI ~$1.02/หุ้น (net income +$7.6B) — non-GAAP ไตรมาสนั้น $4.14 · ไตรมาสอื่นไม่มีรายการนี้",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-06",
            "revenueB": 168.1,
            "epsAdj": 8.05,
            "opMarginPct": 41.6,
            "fcfB": 56.1,
            "priceFYEnd": 270.9
          },
          {
            "fy": "FY2022",
            "endYm": "2022-06",
            "revenueB": 198.3,
            "epsAdj": 9.65,
            "opMarginPct": 42.1,
            "fcfB": 65.1,
            "priceFYEnd": 256.83
          },
          {
            "fy": "FY2023",
            "endYm": "2023-06",
            "revenueB": 211.9,
            "epsAdj": 9.68,
            "opMarginPct": 41.8,
            "fcfB": 59.5,
            "priceFYEnd": 340.54
          },
          {
            "fy": "FY2024",
            "endYm": "2024-06",
            "revenueB": 245.1,
            "epsAdj": 11.8,
            "opMarginPct": 44.6,
            "fcfB": 74.1,
            "priceFYEnd": 446.95
          },
          {
            "fy": "FY2025",
            "endYm": "2025-06",
            "revenueB": 281.7,
            "epsAdj": 13.64,
            "opMarginPct": 45.6,
            "fcfB": 71.6,
            "priceFYEnd": 497.41
          },
          {
            "fy": "FY2026",
            "endYm": "2026-06",
            "revenueB": 331.8,
            "epsAdj": 17.96,
            "opMarginPct": 46.8,
            "fcfB": 67,
            "priceFYEnd": 470
          }
        ],
        "notes": "ตัวเลขงบตรงกับ 8-K/10-K ของ SEC และ stockanalysis.com; FCF = กระแสเงินสดจากการดำเนินงาน ลบ capex (PP&E) — FY2024–FY2025 capex พุ่งจากการลงทุน AI/data center ($44.5B → $64.6B) กด FCF ทั้งที่กำไรโต; ราคาปิดสิ้นปีบัญชีเป็นราคาปิดจริง (raw close) จาก Yahoo Finance ไม่ใช่ราคาปรับเงินปันผล (แหล่งอย่าง StatMuse แสดงราคาปรับปันผลซึ่งต่ำกว่า ~2-4%); จำนวนหุ้น diluted โดยนัยลดลงช้า ๆ จาก ~7.6B เหลือ ~7.5B ตาม buyback สอดคล้องทุกปี; ไม่มี stock split ในช่วงนี้",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/789019/000095017025100226/msft-ex99_1.htm",
          "https://stockanalysis.com/stocks/msft/financials/",
          "https://query1.finance.yahoo.com/v8/finance/chart/MSFT (raw daily closes)",
          "https://news.microsoft.com/source/2026/07/08/microsoft-announces-quarterly-earnings-release-date-68/",
          "https://www.statmuse.com/money/ask/msft-closing-price-on-june-30-2021 (cross-check, dividend-adjusted)"
        ],
        "quarters": [
          {
            "q": "Q1 FY24",
            "endYm": "2023-09",
            "revenueB": 56.52,
            "epsAdj": 2.99,
            "opMarginPct": 47.6,
            "fcfB": 20.67,
            "priceQEnd": 315,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q2 FY24",
            "endYm": "2023-12",
            "revenueB": 62.02,
            "epsAdj": 2.93,
            "opMarginPct": 43.6,
            "fcfB": 9.12,
            "priceQEnd": 376,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q3 FY24",
            "endYm": "2024-03",
            "revenueB": 61.86,
            "epsAdj": 2.94,
            "opMarginPct": 44.6,
            "fcfB": 20.97,
            "priceQEnd": 421,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q4 FY24",
            "endYm": "2024-06",
            "revenueB": 64.73,
            "epsAdj": 2.95,
            "opMarginPct": 43.1,
            "fcfB": 23.32,
            "priceQEnd": 447,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q1 FY25",
            "endYm": "2024-09",
            "revenueB": 65.59,
            "epsAdj": 3.3,
            "opMarginPct": 46.6,
            "fcfB": 19.26,
            "priceQEnd": 430,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q2 FY25",
            "endYm": "2024-12",
            "revenueB": 69.63,
            "epsAdj": 3.23,
            "opMarginPct": 45.5,
            "fcfB": 6.49,
            "priceQEnd": 421,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q3 FY25",
            "endYm": "2025-03",
            "revenueB": 70.07,
            "epsAdj": 3.46,
            "opMarginPct": 45.7,
            "fcfB": 20.3,
            "priceQEnd": 375,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q4 FY25",
            "endYm": "2025-06",
            "revenueB": 76.44,
            "epsAdj": 3.65,
            "opMarginPct": 44.9,
            "fcfB": 25.57,
            "priceQEnd": 497,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q1 FY26",
            "endYm": "2025-09",
            "revenueB": 77.67,
            "epsAdj": 3.72,
            "opMarginPct": 48.9,
            "fcfB": 25.66,
            "priceQEnd": 515,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q2 FY26",
            "endYm": "2025-12",
            "revenueB": 81.27,
            "epsAdj": 5.16,
            "opMarginPct": 47.1,
            "fcfB": 5.88,
            "priceQEnd": 470,
            "endDate": "2025-12-31",
            "epsNote": "GAAP EPS $5.16 รวมกำไรจากเงินลงทุนใน OpenAI ~$1.02/หุ้น (net income +$7.6B) — ตัดรายการนี้ออกจะเหลือ ~$4.14 (non-GAAP ที่บริษัทรายงาน) จึงเทียบกับไตรมาสอื่นตรง ๆ ไม่ได้"
          },
          {
            "q": "Q3 FY26",
            "endYm": "2026-03",
            "revenueB": 82.89,
            "epsAdj": 4.27,
            "opMarginPct": 46.3,
            "fcfB": 15.8,
            "priceQEnd": 455,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q4 FY26",
            "endYm": "2026-06",
            "revenueB": 90.01,
            "epsAdj": 4.81,
            "opMarginPct": 45.1,
            "fcfB": 19.64,
            "priceQEnd": 470,
            "endDate": "2026-06-30"
          }
        ]
      },
      "nextEarnings": "2026-10",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2027",
            "eps": 19.7,
            "revenue": 391.2
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q4 FY26",
            "metric": "revenue",
            "guided": "~$86.7-87.8B",
            "actual": "~$90.0B",
            "result": "beat",
            "magnitudePct": 3.2
          },
          {
            "quarter": "Q3 FY26",
            "metric": "revenue",
            "guided": "~$80.65-81.75B",
            "actual": "~$82.9B",
            "result": "beat",
            "magnitudePct": 2.1
          },
          {
            "quarter": "Q2 FY26",
            "metric": "revenue",
            "guided": "~$79.5-80.6B",
            "actual": "~$81.3B",
            "result": "beat",
            "magnitudePct": 1.5
          },
          {
            "quarter": "Q4 FY25",
            "metric": "revenue",
            "guided": "~$73.15-74.25B",
            "actual": "~$76.4B",
            "result": "beat",
            "magnitudePct": 3.7
          },
          {
            "quarter": "Q3 FY25",
            "metric": "revenue",
            "guided": "~$67.7-68.7B",
            "actual": "~$70.1B",
            "result": "beat",
            "magnitudePct": 2.7
          },
          {
            "quarter": "Q2 FY25",
            "metric": "revenue",
            "guided": "~$68.1-69.1B",
            "actual": "~$69.6B",
            "result": "beat",
            "magnitudePct": 1.5
          },
          {
            "quarter": "Q1 FY25",
            "metric": "revenue",
            "guided": "~$63.8-64.8B",
            "actual": "~$65.6B",
            "result": "beat",
            "magnitudePct": 2
          },
          {
            "quarter": "Q4 FY24",
            "metric": "revenue",
            "guided": "~$63.5-64.5B",
            "actual": "~$64.7B",
            "result": "beat",
            "magnitudePct": 1.1
          },
          {
            "quarter": "Q3 FY24",
            "metric": "revenue",
            "guided": "~$60.0-61.0B",
            "actual": "~$61.9B",
            "result": "beat",
            "magnitudePct": 2.2
          },
          {
            "quarter": "Q2 FY24",
            "metric": "revenue",
            "guided": "~$60.4-61.4B",
            "actual": "~$62.0B",
            "result": "beat",
            "magnitudePct": 1.8
          },
          {
            "quarter": "Q1 FY24",
            "metric": "revenue",
            "guided": "~$53.8-54.8B",
            "actual": "~$56.5B",
            "result": "beat",
            "magnitudePct": 4.1
          }
        ],
        "consensus": [
          {
            "fy": "FY2027",
            "revenue": 391.2,
            "eps": 19.7,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": null,
            "eps": 23.32,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "consensus FY2027 จาก 48 นักวิเคราะห์ (StockAnalysis ระบุฐาน non-GAAP adjusted) · FY2028 เฉลี่ย ~$23.32 ช่วงกว้าง ~18.6-27.2 ฐานไม่ระบุ · guidance ของ Microsoft ให้เป็นราย segment ในคอลล์ — ตัวเลขที่บันทึกคือ implied total ที่จุดกึ่งกลาง · Q1 FY26 มี guidance แต่ยืนยันตัวเลขไม่ได้จึงเว้นแถว (ไม่เดา) · งบถัดไป ~27 ต.ค. 2026 ยังไม่ยืนยันทางการจึงคง nextEarnings แบบเดือน"
      }
    },
    "META": {
      "ticker": "META",
      "name": "Meta Platforms, Inc.",
      "layer": "model",
      "thesis": {
        "statement": "Meta คือผู้ชนะเชิง \"ประยุกต์ใช้ AI\" ที่ชัดเจนที่สุดในกลุ่ม Mag7 — ใช้ AI ยกระดับเครื่องจักรโฆษณาที่มีผู้ใช้ ~3.5 พันล้านคนต่อวัน จนรายได้เร่งขึ้นเป็น ~+26% YoY แล้วนำกระแสเงินสดมหาศาลไปเดิมพันครั้งใหญ่กับ superintelligence, AI datacenter ระดับหลายกิกะวัตต์ และ AI glasses — ถ้าเดิมพันสำเร็จแม้บางส่วน หุ้นที่ซื้อขายถูกสุดในกลุ่มก็มี upside ระยะยาวสูง",
        "pillars": [
          "AI ad stack (GEM, Andromeda, Advantage+) เพิ่ม conversion และราคาโฆษณาได้จริง — เป็น AI ที่สร้างรายได้แล้ววันนี้ ไม่ใช่แค่คำสัญญา",
          "ฐานผู้ใช้ ~3.5 พันล้านคน/วัน ใน 4 แอปหลัก คือช่องทาง distribute AI assistant และ agent ที่ใหญ่ที่สุดในโลกตะวันตก",
          "Core business กำไรสูงมาก (FoA operating margin ~50%+) เป็นแหล่งทุนให้เดิมพัน AI โดยไม่ต้องพึ่งตลาดทุนมากนัก",
          "Meta AI มีผู้ใช้ ~1 พันล้านคน/เดือน และแว่น Ray-Ban Meta เป็นผู้นำ category ใหม่ — optionality ที่ตลาดยังตีมูลค่าให้น้อย",
          "Valuation ~20-22x forward P/E ถูกกว่าเพื่อนร่วมกลุ่ม AI ทั้งที่รายได้กำลังเร่งตัว"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตรายได้",
          "current": "~+28% YoY (Q2 2026 — $60.8B) ชะลอจาก +33% (Q1) แต่ยังแข็งแรง · guide Q3 $61-64B",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "เครื่องยนต์โฆษณายังโตแรงมากสำหรับบริษัทขนาดนี้ — ปริมาณโฆษณา +14%, ราคาต่อโฆษณา +12% จาก AI ranking/Advantage+ การชะลอจาก +33% เป็นเรื่องฐานสูงของ Q1 ไม่ใช่ดีมานด์อ่อน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น",
          "current": "GAAP EPS $6.18 (Q2 2026) ลดลง ~13% YoY — โดน costs +55%, legal $2.4B, severance $1.18B (layoffs พ.ค. 2026)",
          "trend": "down",
          "score": 52,
          "impact": "negative",
          "why": "กำไรที่รายงานหดจริงไตรมาสนี้ แม้ยอดขายโต — ต้นทุน AI (ค่าเสื่อม, ค่าตัว talent) + ค่าใช้จ่ายครั้งเดียว (คดี/ปรับโครงสร้าง) กดกำไร นี่คือราคาที่ต้องจ่ายของรอบลงทุน"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ทรุดเหลือ ~$784M (Q2 2026) จาก capex $31B/ไตรมาส — FCF แทบเป็นศูนย์",
          "trend": "down",
          "score": 34,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้างที่ชัดที่สุดตอนนี้: capex $31B/ไตรมาส (guide FY $130-145B) กลืน operating cash flow เกือบหมด — FCF จะถูกกดต่อเนื่องจนกว่า capex จะ peak และ AI สร้างรายได้เพิ่ม"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~31% (Q2 2026) ร่วงจาก ~43% YoY / ~41% (Q1) — RL ขาดทุน + ค่าใช้จ่าย AI + one-off legal/severance",
          "trend": "down",
          "score": 66,
          "impact": "neutral",
          "why": "margin หดแรงจากทั้งของถาวร (ค่าเสื่อม AI, RL) และของครั้งเดียว (legal $2.4B, severance) — แกนโฆษณา FoA ยังทำ margin สูง แต่ภาพรวมถูกกดจนต่ำสุดในรอบหลายปี"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังสูงแต่ลดลง — ฐานเงินลงทุนบวมจาก AI capex ขณะ margin หด",
          "trend": "down",
          "score": 62,
          "impact": "neutral",
          "why": "ผลตอบแทนต่อทุนถูกกดสองทาง (กำไรต่อหน่วยลด + ทุนที่ใช้เพิ่ม) — จะฟื้นก็ต่อเมื่อ AI capex เริ่มสร้างรายได้คุ้มค่าเสื่อม"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสด + เงินลงทุนระยะสั้น ~$70-80B",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "งบดุลยังแข็งแรงมากพอรองรับ CapEx และ buyback พร้อมกัน แม้จะเริ่มใช้หนี้และ JV financing มาเสริมเพื่อไม่ให้เงินสดร่อยหรอเร็วเกินไป"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้เพิ่มต่อเนื่อง — หุ้นกู้ ~$30B + JV/off-balance financing (Hyperion ~$27B) รองรับ capex",
          "trend": "down",
          "score": 60,
          "impact": "neutral",
          "why": "จากบริษัทที่แทบไม่มีหนี้ กลายเป็นก่อหนี้และ commitment นอกงบดุลเร็ว — ยังบริหารได้ด้วยกระแสเงินสดโฆษณา แต่ลดความยืดหยุ่นหากรอบลงทุน AI สะดุด"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "จำนวนหุ้นทรงตัวถึงลดลงเล็กน้อย; SBC สูง ~$18B/ปี แต่ buyback ชดเชยเกินพอ",
          "trend": "flat",
          "score": 75,
          "impact": "neutral",
          "why": "ต่างจากบริษัทเทคส่วนใหญ่ Meta ซื้อหุ้นคืนมากกว่าที่ออกให้พนักงาน ทำให้ผู้ถือหุ้นไม่โดนเจือจาง — แต่แพ็กเกจจ้าง AI talent ระดับร้อยล้านดอลลาร์ต่อคนทำให้ SBC มีแนวโน้มขยับขึ้น"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "AI CapEx FY2026 $130-145B + ค่าตัว AI talent + layoffs เพื่อ efficiency + buyback/ปันผลต่อ",
          "trend": "flat",
          "score": 62,
          "impact": "neutral",
          "why": "โหมดเดิมพันหนักสุดในประวัติศาสตร์บริษัท — เทเกือบทุกอย่างไป AI ควบคู่ปรับโครงสร้าง (layoffs) ผลตอบแทนยังพิสูจน์ไม่ได้ ผู้ถือหุ้นต้องยอม FCF หด 1-2 ปีแลก optionality"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~16x (ราคา ~$542 · mcap ~$1.35T หลังร่วง 9% จากงบ Q2) — ถูกสุดในกลุ่ม Mag7 สาย AI มาก",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "ตลาดลงโทษความกลัว CapEx/FCF จน multiple เหลือ ~16x ทั้งที่รายได้ยังโต ~28% — ส่วนลดสะท้อนคุณภาพกำไรระยะสั้นที่แย่ลง ไม่ใช่ธุรกิจโฆษณาพัง PEG ต่ำมากสำหรับผู้รับความผันผวนของรอบลงทุนได้"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 80,
        "recurringPct": null,
        "note": "รายได้ ~98% มาจากโฆษณา Family of Apps ที่ยังโตแรง (+28% YoY, ราคาต่อโฆษณา +12%, ปริมาณ +14%) — เร่งตัวจากปีก่อนแต่ชะลอเล็กน้อยจากฐานสูงของ Q1 (+33%) · คุณภาพการโตของ 'รายได้' ยังดี แต่คุณภาพของ 'กำไร' อ่อนลงจาก capex/ค่าเสื่อม AI ที่กด margin และ FCF",
        "segments": [
          {
            "name": "โฆษณา Family of Apps (Facebook, Instagram, WhatsApp, Messenger)",
            "sharePct": 97,
            "growthNote": "~+28% YoY — AI ranking เพิ่ม engagement, Advantage+ เพิ่ม conversion, ราคาต่อโฆษณา +12% + ปริมาณ +14%",
            "trend": "up"
          },
          {
            "name": "รายได้อื่นของ FoA (WhatsApp Business, Meta Verified)",
            "sharePct": 1.5,
            "growthNote": "โตเร็วจากฐานเล็ก — click-to-message + Business AI คือ upside ระยะยาวของ WhatsApp",
            "trend": "up"
          },
          {
            "name": "Reality Labs (Quest, แว่น Ray-Ban/Oakley Meta, Display)",
            "sharePct": 1.5,
            "growthNote": "แว่น AI โตหลายเท่าตัว + เปิดรุ่น Display — แต่ segment ยังขาดทุน ~$17-20B/ปี",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 72,
        "items": [
          {
            "item": "AI ad stack (GEM, Andromeda, Advantage+) — ใช้ AI เพิ่มประสิทธิภาพโฆษณาโดยตรง",
            "status": "executing",
            "evidence": "รายได้โฆษณา +28% YoY, ราคาต่อโฆษณา +12%, ปริมาณ +14% — AI monetization ที่จับต้องได้ที่สุดในกลุ่ม Mag7 และยังเห็นผลในงบทุกไตรมาส"
          },
          {
            "item": "Meta AI assistant กระจายผ่าน 4 แอปหลัก",
            "status": "executing",
            "evidence": "ผู้ใช้ ~1 พันล้านคน/เดือน — ได้ distribution แล้วแต่ยังแทบไม่ monetize; โฆษณา/subscription ใน Meta AI คือ upside ที่ยังไม่อยู่ในประมาณการ"
          },
          {
            "item": "Superintelligence Labs + โมเดล frontier (Llama)",
            "status": "at-risk",
            "evidence": "Llama ยังตามหลัง Gemini/GPT · ทุ่มซื้อทีม (Scale AI ~$14B + แพ็กเกจ talent มหาศาล) แต่ยังไม่มีผลงาน frontier พิสูจน์ว่าตามทัน — เป็นทั้งต้นทุนจมและความเสี่ยงเชิงกลยุทธ์"
          },
          {
            "item": "AI infrastructure — Prometheus, Hyperion (หลาย GW), ชิป MTIA, ดีลเช่า cloud (Google, CoreWeave, Oracle)",
            "status": "on-track",
            "evidence": "capex FY2026 ยก guide เป็น $130-145B (Prometheus, Hyperion หลาย GW, ชิป MTIA, เช่า cloud) — ส่งมอบตามแผน ความเสี่ยงคือ 'ขนาดของเงิน' ที่กด FCF เหลือ ~$784M/ไตรมาส"
          },
          {
            "item": "AI glasses (Ray-Ban Meta, Ray-Ban Display, Oakley Meta)",
            "status": "executing",
            "evidence": "เป็นผู้นำ category ที่ตัวเองสร้างขึ้น ยอดขายโตหลายเท่าตัวต่อปี และเริ่มขยับสู่จอแสดงผล + neural band — เป็น computing platform ถัดไปที่ Meta คุมเองไม่ต้องพึ่ง Apple/Google"
          },
          {
            "item": "Business AI / agent สำหรับ messaging commerce",
            "status": "on-track",
            "evidence": "เริ่มทดลองวงกว้างบน WhatsApp/Messenger กับธุรกิจ SME — ถ้าสำเร็จจะเปิดการ monetize ฐานผู้ใช้ WhatsApp ที่ใหญ่แต่ยังสร้างรายได้น้อย"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Network effect ของผู้ใช้ ~3.5 พันล้านคน/วัน + ชุดข้อมูลพฤติกรรม first-party ที่ใหญ่ที่สุดนอกจีน + AI ad stack ที่ให้ ROI วัดผลได้ดีที่สุดใน social — คูเมืองฝั่งแอปและโฆษณากำลังแข็งขึ้นจาก AI, จุดเปราะอยู่ที่การแข่งขันโมเดล frontier ซึ่ง Meta ยังตามหลัง",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ครองโฆษณา social media ส่วนใหญ่ของโลกตะวันตก, ผู้ใช้ ~3.5 พันล้านคน/วันยังโต, แรงกดดันจาก TikTok ผ่อนลง และชนะคดีผูกขาด FTC ปลายปี 2025"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "weakening",
            "note": "เก่งระดับโลกด้าน recommendation/ads AI แต่โมเดล frontier ตามหลัง Gemini และ GPT ชัดเจนหลัง Llama 4 แผ่ว — จึงต้องตั้ง Superintelligence Labs และซื้อตัวคนแพงมาก"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ปรับองค์กรเร็วและกล้าตัดสินใจ — สร้าง datacenter แบบเร่งรัด, ปิดดีล compute หลายหมื่นล้านในไม่กี่เดือน, ออกแว่นรุ่นใหม่ทุกปี"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "Social graph และคอนเทนต์สะสมทำให้ผู้ใช้ย้ายยาก; ผู้ลงโฆษณาติดระบบ Advantage+ ที่ตั้งค่าครั้งเดียวแล้วได้ผลดี แต่โดยธรรมชาติงบโฆษณาย้ายตาม ROI ได้เสมอ"
          },
          {
            "key": "ecosystem",
            "label": "Ecosystem",
            "status": "stable",
            "note": "4 แอปเสริมกัน + ธุรกิจกว่า 200 ล้านรายใช้แพลตฟอร์ม + ฮาร์ดแวร์แว่น/Quest — กว้างแต่ยังไม่ลึกเท่า ecosystem ของ Apple/Google ที่คุม OS"
          },
          {
            "key": "developerAdoption",
            "label": "Developer adoption",
            "status": "weakening",
            "note": "Llama เคยเป็นมาตรฐาน open-weight (ดาวน์โหลดสะสมกว่าพันล้านครั้ง) แต่โมเมนตัมเสียให้โมเดลเปิดจากจีน (Qwen, DeepSeek) และทิศทาง open-source ของบริษัทเริ่มคลุมเครือ"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "ผู้ลงโฆษณา SME หลายสิบล้านรายพึ่ง Meta เป็นช่องทางหลักหาลูกค้า — ความผูกพันมาจากผลลัพธ์ ไม่ใช่สัญญา จึงแข็งแรงตราบเท่าที่ ROI ยังชนะคู่แข่ง"
          },
          {
            "key": "moat",
            "label": "Moat",
            "status": "strengthening",
            "note": "AI ทำให้คูเมืองเดิมลึกขึ้น — ยิ่งมี compute และข้อมูลมาก ระบบโฆษณายิ่งแม่น ผลตอบแทนต่อผู้ลงโฆษณายิ่งดี เกิด flywheel ที่คู่แข่งขนาดเล็กตามไม่ทัน"
          }
        ]
      },
      "capitalAllocation": {
        "score": 65,
        "verdict": "วินัยดีในอดีต (Year of Efficiency) และยังคืนเงินผู้ถือหุ้นต่อเนื่อง แต่ตอนนี้คือโหมด \"เดิมพันหนักที่สุดในประวัติศาสตร์บริษัท\" — CapEx + ค่าตัว AI talent ระดับที่ไม่เคยมีมาก่อน โดยผลตอบแทนยังพิสูจน์ไม่ได้ ผู้ถือหุ้นต้องยอมรับ FCF ที่หดตัว 1-2 ปีแลกกับ optionality ระยะยาว",
        "items": [
          {
            "label": "CapEx (AI datacenter)",
            "current": "~$70-72B ปี 2025 และส่งสัญญาณปี 2026 \"ใหญ่ขึ้นอย่างมีนัยสำคัญ\" (ตลาดคาดแตะระดับ $100B+)",
            "assessment": "neutral",
            "why": "จำเป็นเชิงกลยุทธ์ถ้าเชื่อว่า compute คือคอขวดของ AI แต่ขนาดใหญ่จนถ้ารายได้ AI ไม่มาตามคาด จะกลายเป็นค่าเสื่อมก้อนมหึมาที่กดกำไรหลายปี"
          },
          {
            "label": "R&D + ค่าตัว AI talent",
            "current": "R&D รวมสูงมาก (~$50B+/ปี) และจ้างนักวิจัย AI ด้วยแพ็กเกจระดับร้อยล้านดอลลาร์ต่อคน + ลงทุน Scale AI ~$14B",
            "assessment": "neutral",
            "why": "การซื้อความสามารถด้วยเงินเป็นทางลัดเดียวที่เหลือหลัง Llama 4 สะดุด — สมเหตุสมผลเชิงกลยุทธ์แต่ยังไม่มีผลงานพิสูจน์ และเสี่ยงวัฒนธรรมองค์กรปั่นป่วน"
          },
          {
            "label": "Buyback",
            "current": "ซื้อหุ้นคืนต่อเนื่องหลายหมื่นล้านดอลลาร์/ปี มากพอชดเชย SBC และลดจำนวนหุ้น",
            "assessment": "good",
            "why": "ซื้อคืนสม่ำเสมอรวมถึงช่วงหุ้นถูก (ประวัติซื้อหนักปี 2022 ที่พิสูจน์แล้วว่าคุ้มมาก) — เป็นการคืนทุนที่สร้างมูลค่าจริง"
          },
          {
            "label": "เงินปันผล",
            "current": "เริ่มจ่ายปี 2024 (~$0.5+/ไตรมาส) และขึ้นต่อเนื่อง — yield ต่ำแต่โตได้",
            "assessment": "good",
            "why": "สัญญาณวินัยทางการเงินและขยายฐานนักลงทุนสถาบัน โดยใช้เงินน้อยมากเทียบกับกระแสเงินสด"
          },
          {
            "label": "การก่อหนี้ / off-balance-sheet financing",
            "current": "หุ้นกู้ ~$30B ปลายปี 2025 (ใหญ่สุดของปีในตลาดสหรัฐ) + JV Hyperion กับ Blue Owl ~$27B",
            "assessment": "neutral",
            "why": "ฉลาดในการกระจายภาระเงินทุนและรักษาเงินสด แต่เพิ่ม fixed commitment ระยะยาว — ถ้า demand AI ต่ำกว่าคาด ภาระเหล่านี้จะย้อนกลับมากดงบ"
          },
          {
            "label": "Reality Labs (การขาดทุนสะสม)",
            "current": "ขาดทุน ~$17-20B/ปี ต่อเนื่อง โดยรายได้ segment ยังเล็กมาก",
            "assessment": "poor",
            "why": "เผาเงินมหาศาลมาหลายปีโดยผลตอบแทนชัดเจนมีแค่แว่น AI — แม้แว่นเริ่มเข้าท่า แต่ขนาดการขาดทุนเทียบรายได้ยังไม่สมดุลและเป็นจุดที่ตลาดหักคะแนนมาตลอด"
          }
        ]
      },
      "valuationView": {
        "level": "cheap",
        "note": "forward P/E ~16x (ราคา ~$542, mcap ~$1.35T) — ถูกสุดในกลุ่ม Mag7 สาย AI ทั้งที่รายได้โต ~28% · headline multiple ถูกจริง แต่ต้องอ่านคู่กับ 'คุณภาพของ E': กำไร/FCF ปี 2026 ถูกกดหนักจาก capex $130-145B + ค่าเสื่อม + ค่าใช้จ่าย AI ส่วนลดคือค่าความไม่แน่นอนของรอบลงทุน ไม่ใช่ปัญหาธุรกิจหลัก — risk/reward อยู่ฝั่งบวกสำหรับระยะยาวที่รับความผันผวนได้"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "$56.3B (+33% YoY)",
          "now": "$60.8B (+28% YoY) — โตแรงแต่ชะลอจากฐานสูง",
          "direction": "neutral"
        },
        {
          "metric": "กำไร/มาร์จิ้น",
          "prev": "op margin ~41% · adj EPS ~$7.31",
          "now": "op margin ~31% · GAAP EPS $6.18 (-13% YoY) จาก costs +55% + legal $2.4B",
          "direction": "negative"
        },
        {
          "metric": "Free cash flow",
          "prev": "บางลงจาก capex",
          "now": "~$784M — แทบเป็นศูนย์ จาก capex $31B/ไตรมาส",
          "direction": "negative"
        },
        {
          "metric": "CapEx guidance FY2026",
          "prev": "$125-145B",
          "now": "$130-145B (ยกขอบล่าง) · expenses $165-169B",
          "direction": "negative"
        },
        {
          "metric": "การปรับโครงสร้าง",
          "prev": "—",
          "now": "layoffs พ.ค. 2026 (severance $1.18B) — รอบตัดต้นทุนใหม่",
          "direction": "negative"
        },
        {
          "metric": "Valuation",
          "prev": "fwd P/E ~20-22x",
          "now": "fwd P/E ~16x (หุ้นร่วง 9% หลังงบ) — ถูกสุดในกลุ่ม Mag7",
          "direction": "positive"
        }
      ],
      "risks": [
        "AI overbuild: capex $130-145B/ปี สร้างค่าเสื่อมและ fixed cost มหาศาล + FCF ทรุดเหลือ ~$784M/ไตรมาสแล้ว — ถ้ารายได้จาก AI (Meta AI, Business AI) มาไม่ทัน กำไรและ multiple จะโดนกดหลายปี",
        "ความสามารถแข่งขันโมเดล frontier: Llama ตามหลัง Gemini/GPT และ Superintelligence Labs ยังไม่มีผลงาน — ทุ่มซื้อ talent แพงมหาศาลแล้วยังตามไม่ทัน = ต้นทุนจม + ความเสี่ยงเชิงกลยุทธ์",
        "คุณภาพกำไรระยะสั้น: margin 43%→31% + ค่าใช้จ่ายครั้งเดียว (legal, severance) ทำให้กำไรที่รายงานผันผวน — ตลาดลงโทษหุ้นแรงทุกครั้งที่ margin/FCF ผิดคาด",
        "กฎระเบียบ: EU (DMA, โฆษณา less-personalized) กดรายได้ยุโรป + คดีความปลอดภัยเยาวชนในสหรัฐยังเป็น overhang",
        "รายได้กระจุกในโฆษณา ~98%: อ่อนไหวต่อเศรษฐกิจถดถอย และ engagement เสี่ยงถูกดึงโดยแอป AI-native รุ่นใหม่ (เช่นผลิตภัณฑ์ consumer ของ OpenAI)"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ตรงกับปีปฏิทิน) — FY2021 ถึง FY2025 (สิ้นสุด ธ.ค. 2025) คือ 5 ปีบัญชีล่าสุดที่ปิดงบและรายงานครบแล้ว ณ ก.ค. 2026",
        "epsBasis": "diluted GAAP; META ไม่เคยแตกหุ้น ตัวเลขที่รายงานจึงเท่ากับฐานหุ้นปัจจุบันทุกปี (no split adjustment needed)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 117.9,
            "epsAdj": 13.77,
            "opMarginPct": 39.6,
            "fcfB": 39,
            "priceFYEnd": 336.35
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 116.6,
            "epsAdj": 8.59,
            "opMarginPct": 24.8,
            "fcfB": 19.3,
            "priceFYEnd": 120.34
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 134.9,
            "epsAdj": 14.87,
            "opMarginPct": 34.7,
            "fcfB": 44.1,
            "priceFYEnd": 353.96
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 164.5,
            "epsAdj": 23.86,
            "opMarginPct": 42.2,
            "fcfB": 54.1,
            "priceFYEnd": 585.51
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 201,
            "epsAdj": 23.49,
            "opMarginPct": 41.4,
            "fcfB": 46.1,
            "priceFYEnd": 660.09
          }
        ],
        "notes": "META ไม่เคยแตกหุ้น ราคาหุ้นและ EPS ทุกปีจึงอยู่บนฐานเดียวกันโดยไม่ต้องปรับ; ราคาปิดสิ้นปีใช้ราคาปิดจริงของวันทำการสุดท้าย (ไม่ปรับเงินปันผล — Meta เริ่มจ่ายปันผลปี 2024); FCF คำนวณแบบ OCF ลบ capex ตามนิยามของงานนี้ ซึ่งต่างเล็กน้อยจาก FCF ที่ Meta รายงานเอง (ของบริษัทหักรวม principal payments on finance leases เช่น FY2023 บริษัทรายงาน ~43.0B เทียบกับ 44.1B ที่คำนวณตรง ๆ); FY2025 diluted EPS 23.49 ลดลงเล็กน้อยจากปีก่อนเพราะ one-time tax charge ราว 15.9B ใน Q3/2025 และ capex พุ่งเป็น ~69.7B จากการลงทุน AI infrastructure ทำให้ FCF ลดลงทั้งที่ OCF สูงขึ้นมาก; จำนวนหุ้น diluted โดยนัย (net income/EPS) ลดลงอย่างช้า ๆ จาก ~2.86B (2021) เหลือ ~2.53B (2025) จากการซื้อหุ้นคืน สอดคล้องตามคาด; ตัวเลขปัดเศษ ความแม่นยำประมาณ 1-2%",
        "sources": [
          "https://stockanalysis.com/stocks/meta/financials/",
          "https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx",
          "https://www.sec.gov/Archives/edgar/data/1326801/000162828026003832/meta-12312025xexhibit991.htm",
          "https://query1.finance.yahoo.com/v8/finance/chart/META (unadjusted year-end closes)",
          "https://mlq.ai/stocks/META/free-cash-flow/",
          "https://www.statmuse.com/money/ask/meta-closing-price-dec-31-2025"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 34.15,
            "epsAdj": 4.39,
            "opMarginPct": 40.3,
            "fcfB": 13.91,
            "priceQEnd": 298,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 40.11,
            "epsAdj": 5.33,
            "opMarginPct": 40.9,
            "fcfB": 11.81,
            "priceQEnd": 351,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 36.46,
            "epsAdj": 4.71,
            "opMarginPct": 37.9,
            "fcfB": 12.85,
            "priceQEnd": 482,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 39.07,
            "epsAdj": 5.16,
            "opMarginPct": 38,
            "fcfB": 11.2,
            "priceQEnd": 502,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 40.59,
            "epsAdj": 6.03,
            "opMarginPct": 42.8,
            "fcfB": 16.47,
            "priceQEnd": 569,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 48.39,
            "epsAdj": 8.02,
            "opMarginPct": 48.3,
            "fcfB": 13.56,
            "priceQEnd": 583,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 42.31,
            "epsAdj": 6.43,
            "opMarginPct": 41.5,
            "fcfB": 11.09,
            "priceQEnd": 574,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 47.52,
            "epsAdj": 7.14,
            "opMarginPct": 43,
            "fcfB": 9.02,
            "priceQEnd": 736,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 51.24,
            "epsAdj": 1.05,
            "opMarginPct": 40.1,
            "fcfB": 11.17,
            "priceQEnd": 732,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 59.89,
            "epsAdj": 8.88,
            "opMarginPct": 41.3,
            "fcfB": 14.83,
            "priceQEnd": 659,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 56.31,
            "epsAdj": 10.44,
            "opMarginPct": 40.6,
            "fcfB": 13.23,
            "priceQEnd": 572,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 60.8,
            "epsAdj": 6.18,
            "opMarginPct": 30.9,
            "fcfB": 1.75,
            "priceQEnd": 563,
            "endDate": "2026-06-30",
            "epsNote": "GAAP EPS $6.18 พลาดคาด ~$7.22 เพราะค่าใช้จ่ายครั้งเดียว: ตั้งสำรองคดีความ ~$2.4B + ค่าชดเชยเลิกจ้าง ~$1.18B (ลดพนักงาน ~8,000 คน) — operating margin ตกจาก 43% เหลือ 31% ชั่วคราว · รายได้ยังโต +28% YoY ปกติ"
          }
        ]
      },
      "nextEarnings": "2026-10",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 31.05,
            "revenue": 254.3
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~$58.0-61.0B",
            "actual": "~$60.8B",
            "result": "beat",
            "magnitudePct": 2.2
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "~$53.5-56.5B",
            "actual": "~$56.3B",
            "result": "beat",
            "magnitudePct": 2.4
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "~$56.0-59.0B",
            "actual": "~$59.9B",
            "result": "beat",
            "magnitudePct": 4.2
          },
          {
            "quarter": "Q3 2025",
            "metric": "revenue",
            "guided": "~$47.5-50.5B",
            "actual": "~$51.2B",
            "result": "beat",
            "magnitudePct": 4.5
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 254.3,
            "eps": 31.05,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "Meta ให้ guidance รายได้เป็นช่วงทุกไตรมาส (พร้อมสมมติฐานค่าเงิน) — ยืนยัน guidance→ผลจริงได้ 4 ไตรมาส · guidance Q3 2026 = ~$61-64B (สมมติค่าเงินเป็นลบ ~1%) · ค่าใช้จ่ายทั้งปี 2026 ~$165-169B · CapEx รวม finance lease ~$130-145B (แคบลงจาก $125-145B) · consensus FY2026 EPS ~$31.05 (55 นักวิเคราะห์ · non-GAAP) — ตัวเลข GAAP ปีนี้ต่ำกว่าเพราะรายการครั้งเดียวใน Q2 · FY2027 อยู่หลัง paywall จึงเว้นไว้"
      }
    },
    "AMZN": {
      "ticker": "AMZN",
      "name": "Amazon.com, Inc.",
      "layer": "cloud",
      "thesis": {
        "statement": "Amazon คือผู้ให้บริการ cloud อันดับ 1 ของโลกที่กำลังกลับมาเร่งตัวรอบใหม่จากคลื่น AI — AWS โตเร่งขึ้นสู่ ~+20% YoY พร้อม backlog ระดับ ~$200B ขณะที่ชิป Trainium ของตัวเองและดีลระดับ anchor กับ Anthropic และ OpenAI ทำให้ AWS เป็นโครงสร้างพื้นฐานหลักของยุค AI ส่วนธุรกิจค้าปลีกกำลังขยาย margin ต่อเนื่องจาก robotics, AI ในโลจิสติกส์ และโฆษณาที่มี margin สูง ทำให้ AMZN เป็นหุ้น AI infrastructure ที่มี cash flow engine หลายตัวหนุนกันในระยะยาว",
        "pillars": [
          "AWS กลับมาเร่งตัว (~+20% YoY) พร้อม backlog ~$200B ที่ล็อกรายได้อนาคตหลายปี",
          "ชิป Trainium + Project Rainier (คลัสเตอร์ Trainium2 หลายแสนชิปให้ Anthropic) ลดการพึ่งพา NVIDIA และเพิ่ม margin ระยะยาว",
          "ดีล AI ระดับ anchor: ลงทุนใน Anthropic ~$8B และสัญญา AWS-OpenAI มูลค่า ~$38B หลายปี",
          "ธุรกิจโฆษณาโต ~+20% ต่อปีด้วย margin สูง เป็นเครื่องยนต์กำไรตัวที่สาม",
          "ค้าปลีก + Prime flywheel ที่ margin ขยายต่อเนื่องจาก automation, robotics และการลดต้นทุน fulfillment"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+20% YoY (Q2 2026 — $200.6B) เร่งขึ้น · AWS +37% ($42.2B), โฆษณายังโตแรง · guide Q3 +9-12%",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "รายได้เร่งชัดจาก AWS ที่โตเร็วสุดตั้งแต่ปี 2021 บวกโฆษณา margin สูง — flywheel ค้าปลีก + คลาวด์ + โฆษณาทำงานพร้อมกัน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "operating income $27.5B (+43% YoY) · GAAP EPS $5.75 แต่รวม gain มูลค่าหุ้น Anthropic ~$53.4B (ครั้งเดียว) — ดู operating income เป็นหลัก",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "กำไรจากการดำเนินงานโตแรง +43% จาก AWS + ค้าปลีกที่ margin ขยาย — EPS ที่รายงานถูกบิดด้วยกำไรครั้งเดียวจาก Anthropic จึงต้องอ่านที่ operating ไม่ใช่ bottom line"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF บางมาก — capex 2026 ยกเป็น ~$220B (จาก ~$125B ปี 2025) กลืน OCF ที่แม้จะสูงขึ้น",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้าง: capex เกือบเท่าตัวเพื่อสร้าง AI/AWS capacity ทำให้ FCF เกือบหมด — เดิมพันเดียวกับยุคแรกของ AWS แต่กด FCF หนักหลายปี"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~13.7% (Q2 2026, op income $27.5B) ขยายจาก ~10-11% — AWS margin สูง + ค้าปลีก/robotics เพิ่มประสิทธิภาพ",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "margin ขยายจากทั้ง mix (AWS/โฆษณาโตเร็ว) และค้าปลีกที่ลดต้นทุนด้วย automation — แม้ค่าเสื่อม AI จะเริ่มกดในระยะถัดไป"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "~10%+ และดีขึ้นตาม operating income แต่ยังถูกกดจากฐานสินทรัพย์ AI ที่โตเร็วมาก",
          "trend": "up",
          "score": 62,
          "impact": "neutral",
          "why": "ผลตอบแทนต่อทุนฟื้นตาม margin ที่ขยาย — แต่ capex $220B จะเพิ่มฐานทุนเร็ว ต้องรอ datacenter สร้างรายได้เต็มกำลัง"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสด+เงินลงทุนระยะสั้น ~$90-100B",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "ฐานเงินสดหนามากพอรองรับ CapEx ระดับแสนล้านดอลลาร์ได้โดยไม่เสียเสถียรภาพ และยังมีมูลค่าเงินลงทุนใน Anthropic ที่งอกขึ้นอย่างมีนัยสำคัญเป็นสินทรัพย์แฝง"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้ระยะยาวหลักหมื่นล้านปลาย ๆ + lease; เพิ่งออกหุ้นกู้ใหม่ ~$15B รอบแรกในรอบหลายปี",
          "trend": "up",
          "score": 70,
          "impact": "neutral",
          "why": "งบดุลยังแข็งแรงมากเทียบกับขนาดกำไร แต่บริษัทเริ่มกลับมากู้เพื่อ fund การลงทุน AI — ยังไม่น่ากังวลด้วย credit ระดับท็อป แต่เป็นสัญญาณว่ายุค CapEx นี้ใหญ่เกินกว่า operating cash flow จะจ่ายเองทั้งหมด"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของผู้ถือหุ้น",
          "current": "จำนวนหุ้นเพิ่มช้า ~1%/ปี จาก SBC ที่สูง โดยแทบไม่มี buyback มาหักล้าง",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "SBC ระดับ ~$20B+/ปีถือว่าสูง แต่การเจือจางสุทธิยังต่ำเพราะฐานหุ้นใหญ่มาก จุดหักคะแนนคือบริษัทไม่ได้ซื้อหุ้นคืนจริงจังเหมือน big tech รายอื่น ทำให้ผู้ถือหุ้นรับการเจือจางเต็ม ๆ"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "CapEx 2026 ~$220B (เกือบเท่าตัวจาก ~$125B ปี 2025) เทไป AWS/AI เกือบทั้งหมด · SBC สูง, buyback แทบไม่มี",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "เดิมพันหนักสุดในประวัติศาสตร์บริษัทที่โครงสร้างพื้นฐาน AI — ผู้บริหารเทียบกับยุคลงทุน AWS แรก ๆ ที่ภายหลังเป็นธุรกิจทำกำไรสูงสุด ผู้ถือหุ้นต้องยอม FCF บางหลายปี"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~30-33x (ราคา ~$248 หลังเด้ง ~8% · mcap ~$2.5T) — trailing บิดจาก gain Anthropic · analyst target ~$314",
          "trend": "flat",
          "score": 58,
          "impact": "neutral",
          "why": "ไม่ได้ถูกบน headline แต่ AWS +37% ทำให้ข้อโต้แย้ง 'sum-of-parts: AWS เดี่ยวควรได้ multiple สูงกว่านี้' มีน้ำหนักขึ้น — 62/66 นักวิเคราะห์ให้มุมมองบวก, upside ~27% ตามเป้า"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 82,
        "recurringPct": 30,
        "note": "รายได้กระจายหลายขาและเร่งตัว — AWS (+37%, run rate AI + custom chips >$25B ต่อปีทั้งคู่) เป็นเครื่องยนต์กำไรหลัก, โฆษณา margin สูงโตต่อเนื่อง, 3P seller + subscription เหนียวแน่น · คุณภาพรายได้ดีขึ้นจาก mix ที่เอียงไปหาส่วน margin สูง แต่ FCF ถูกกดจาก capex",
        "segments": [
          {
            "name": "Online Stores",
            "sharePct": 36,
            "growthNote": "โตช้า ~หลักหน่วยปลาย ๆ แต่เป็นฐาน traffic ของ flywheel ทั้งหมด",
            "trend": "flat"
          },
          {
            "name": "Third-Party Seller Services",
            "sharePct": 24,
            "growthNote": "โต ~+10%+ · margin ดีกว่าขายเอง โตตาม marketplace",
            "trend": "up"
          },
          {
            "name": "AWS",
            "sharePct": 21,
            "growthNote": "+37% YoY ($42.2B) — เร็วสุดตั้งแต่ 2021 จากดีมานด์ AI · AI + custom chips run rate >$25B ต่อปีทั้งคู่",
            "trend": "up"
          },
          {
            "name": "Advertising",
            "sharePct": 10,
            "growthNote": "โต ~+20%+ ต่อเนื่อง margin สูงมาก + แรงหนุนจากโฆษณาใน Prime Video",
            "trend": "up"
          },
          {
            "name": "Subscription Services (Prime)",
            "sharePct": 7,
            "growthNote": "โตสองหลักต้น ๆ — รายได้ recurring ที่เหนียวแน่น",
            "trend": "up"
          },
          {
            "name": "Physical Stores และอื่น ๆ",
            "sharePct": 2,
            "growthNote": "โตช้า ไม่ใช่ตัวขับหลัก",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 80,
        "items": [
          {
            "item": "AWS กลับมาเร่งตัวจากดีมานด์ AI",
            "status": "executing",
            "evidence": "AWS +37% YoY ($42.2B) — เร่งสุดตั้งแต่ 2021 (จาก +28% Q1) · AI + custom silicon run rate >$25B ต่อปีทั้งคู่ · backlog หลักแสนล้าน — capacity ที่ลงทุนขายได้จริงและยังไม่พอ"
          },
          {
            "item": "ชิป Trainium และ Project Rainier",
            "status": "executing",
            "evidence": "คลัสเตอร์ Trainium2 หลายแสนชิปสำหรับ Anthropic เปิดใช้งานจริงแล้วและกำลังขยายต่อ พร้อมเปิดตัว Trainium3 — custom silicon ช่วยลดต้นทุนต่อ token และลดการพึ่งพา NVIDIA อย่างเป็นรูปธรรม"
          },
          {
            "item": "พันธมิตร Anthropic + ดีล OpenAI",
            "status": "executing",
            "evidence": "ลงทุน Anthropic (มูลค่าหุ้นพุ่งจน mark-to-market ~+$53B ในไตรมาสนี้) + เป็น cloud หลักเทรน Claude · ปิดดีล OpenAI ใช้ AWS ~$38B — ล็อกลูกค้า AI frontier ทั้งสองค่าย"
          },
          {
            "item": "Bedrock + โมเดล Nova",
            "status": "on-track",
            "evidence": "วางตัวเป็น 'ห้างโมเดล' ให้ลูกค้าเลือกใช้หลายค่าย (Claude, Nova, Llama ฯลฯ) มีลูกค้าองค์กรใช้งานหลักหมื่นราย — ไม่ต้องชนะสงครามโมเดลเองแต่เก็บค่าเช่าโครงสร้างพื้นฐานจากทุกฝ่าย"
          },
          {
            "item": "Alexa+ และ AI ฝั่งผู้บริโภค",
            "status": "on-track",
            "evidence": "ทยอย rollout Alexa+ ที่ขับเคลื่อนด้วย generative AI ให้ฐานอุปกรณ์หลายร้อยล้านเครื่อง — ยังต้องพิสูจน์การสร้างรายได้ แต่เป็น distribution ฝั่ง consumer ที่คู่แข่งไม่มีในบ้านผู้ใช้"
          },
          {
            "item": "AI/Robotics ในค้าปลีกและโลจิสติกส์",
            "status": "executing",
            "evidence": "หุ่นยนต์คลังสินค้าสะสมกว่า ~1 ล้านตัว และใช้ AI เพิ่มประสิทธิภาพจนประกาศลดพนักงานออฟฟิศ ~14,000 ตำแหน่ง (สื่อรายงานว่าแผนรวมอาจถึง ~30,000) — แปลงเป็น margin ค้าปลีกที่ขยายต่อเนื่องให้เห็นในงบจริง"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "moat ของ AMZN คือการซ้อนกันของ 3 ป้อมปราการ: (1) AWS ที่มี switching cost สูงและ backlog ผูกลูกค้าหลายปี บวก custom silicon ที่คู่แข่ง cloud เลียนแบบยาก (2) เครือข่ายโลจิสติกส์+Prime flywheel ที่ไม่มีใครลงทุนตามได้ในสเกลเดียวกัน (3) โฆษณาที่เกิดบน traffic ของตัวเองโดยไม่ต้องพึ่งแพลตฟอร์มอื่น — ยุค AI ทำให้ป้อมแรกกลับมาแข็งแรงขึ้นอีกครั้งหลังถูกตั้งคำถามว่าตามหลัง",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "AWS ยังครองส่วนแบ่ง cloud อันดับ 1 ราว ~30% แต่ Azure และ GCP โตเร็วกว่ามาหลายปี — ไตรมาสล่าสุดช่องว่างการเติบโตเริ่มแคบลงเมื่อ AWS เร่งตัว"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "เคยถูกมองว่าตกขบวน gen-AI แต่ Trainium2/3, Project Rainier และ Bedrock พลิกภาพให้กลับมาเป็นผู้นำฝั่ง AI infrastructure แม้ฝั่งโมเดลเอง (Nova) ยังไม่ใช่แถวหน้า"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "เร่งสร้าง data center และจัดหาพลังงาน (รวมดีลนิวเคลียร์) เร็วเป็นอันดับต้นของอุตสาหกรรม พร้อมตัดสินใจเจ็บ ๆ อย่างลดพนักงาน ~14,000 ตำแหน่ง (สื่อรายงานว่าแผนรวมอาจถึง ~30,000)เพื่อรีดประสิทธิภาพ"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "workload องค์กรที่ฝังบน AWS ย้ายออกยากและแพง ยิ่งลูกค้าเซ็นสัญญา commitment ระยะยาวใน backlog มากขึ้น ต้นทุนการย้ายยิ่งสูงขึ้นตาม"
          },
          {
            "key": "ecosystem",
            "label": "Ecosystem",
            "status": "strengthening",
            "note": "Bedrock ดึงโมเดลทุกค่ายมาอยู่บน AWS, Marketplace ผูก ISV หลายหมื่นราย และฝั่ง consumer มี Prime/Alexa/Kindle/Fire เป็นวงแหวนล้อมลูกค้าอีกชั้น"
          },
          {
            "key": "developerAdoption",
            "label": "Developer Adoption",
            "status": "stable",
            "note": "ฐานนักพัฒนา AWS ใหญ่ที่สุดในโลก cloud และมีชุมชน/certification หนาแน่น แต่ในงาน AI-native บางส่วนนักพัฒนารุ่นใหม่เริ่มจาก GPU cloud เฉพาะทางหรือ GCP มากขึ้น"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "backlog AWS ~$200B คือสัญญาที่ล็อกรายได้ล่วงหน้าหลายปี ฝั่ง consumer สมาชิก Prime หลายร้อยล้านคนมี churn ต่ำมากและใช้จ่ายถี่กว่าผู้ใช้ทั่วไปชัดเจน"
          },
          {
            "key": "moat",
            "label": "Moat",
            "status": "strengthening",
            "note": "การมีทั้ง compute (AWS), ชิปของตัวเอง (Trainium), ลูกค้า frontier AI (Anthropic/OpenAI), โลจิสติกส์ และโฆษณา ในบริษัทเดียว ทำให้คูเมืองรวมกว้างขึ้นในยุค AI ไม่ใช่แคบลง"
          }
        ]
      },
      "capitalAllocation": {
        "score": 72,
        "verdict": "การจัดสรรทุนแบบ 'เทหมดหน้าตักเข้า AI' ที่เริ่มมีหลักฐานรองรับ — AWS ที่เร่งตัวและมูลค่า Anthropic ที่งอกหลายเท่าบอกว่าเงินถูกวางถูกที่ จุดอ่อนคือผู้ถือหุ้นไม่ได้อะไรคืนระหว่างทาง (ไม่มีปันผล แทบไม่มี buyback) จึงต้องเชื่อใน ROI ระยะยาวของ management เต็มตัว ซึ่งประวัติของ Amazon ในการลงทุนหนักก่อนเก็บเกี่ยว (AWS, Prime, logistics) สนับสนุนให้เชื่อได้",
        "items": [
          {
            "label": "CapEx",
            "current": "~$125B ปี 2025 และส่งสัญญาณสูงขึ้นอีกปี 2026 เกือบทั้งหมดลง AWS/AI infrastructure",
            "assessment": "good",
            "why": "ใหญ่ที่สุดในบรรดา hyperscaler แต่มี backlog ~$200B และการเร่งตัวของ AWS เป็นหลักฐานว่า demand มาจริง ไม่ใช่สร้างรอเก้อ — ความเสี่ยงคือค่าเสื่อมก้อนใหญ่ที่จะตามมา"
          },
          {
            "label": "การลงทุนใน Anthropic",
            "current": "ลงทุนสะสม ~$8B และมูลค่างอกขึ้นหลายเท่า พร้อมผูก Anthropic เป็นลูกค้ารายใหญ่ของ Trainium",
            "assessment": "good",
            "why": "เป็นดีลที่ได้สองต่อ: กำไรจากมูลค่าหุ้นที่เพิ่มขึ้นมหาศาล และดีมานด์ระยะยาวให้ AWS/Trainium — หนึ่งในการจัดสรรทุนที่คุ้มที่สุดของ big tech ในรอบนี้"
          },
          {
            "label": "R&D / Technology",
            "current": "งบเทคโนโลยีระดับ ~$90B+/ปี ครอบคลุมชิป, โมเดล, robotics, โลจิสติกส์",
            "assessment": "good",
            "why": "R&D กระจายในจุดที่สร้าง moat จริง (Trainium, robotics, Bedrock) ไม่ใช่แค่ไล่ตามกระแส และหลายตัวแปลงเป็นการลดต้นทุนที่เห็นในงบแล้ว"
          },
          {
            "label": "Buyback",
            "current": "แทบไม่ได้ซื้อหุ้นคืนอย่างมีนัยสำคัญ ต่างจาก AAPL/GOOG/META/MSFT",
            "assessment": "poor",
            "why": "ผู้ถือหุ้นรับการเจือจางจาก SBC โดยไม่มี buyback มาหักล้าง — เข้าใจได้ในยุค CapEx หนัก แต่เป็นข้อด้อยเทียบ peer ที่คืนเงินสม่ำเสมอ"
          },
          {
            "label": "การก่อหนี้",
            "current": "กลับมาออกหุ้นกู้ก้อนใหญ่ ~$15B ครั้งแรกในรอบหลายปีเพื่อรองรับการลงทุน",
            "assessment": "neutral",
            "why": "ต้นทุนกู้ต่ำและงบดุลรับได้สบาย แต่สะท้อนว่า FCF ปัจจุบันไม่พอ fund แผน AI ทั้งหมด — ต้องจับตาว่าวินัยการกู้ยังอยู่เมื่อ CapEx ขยับขึ้นอีก"
          },
          {
            "label": "การใช้เงินสด / วินัยต้นทุน",
            "current": "ลดพนักงานออฟฟิศ ~14,000 ตำแหน่ง (สื่อรายงานว่าแผนรวมอาจถึง ~30,000) และรีดประสิทธิภาพ fulfillment ต่อเนื่อง",
            "assessment": "good",
            "why": "แสดงว่ายอมเจ็บระยะสั้นเพื่อเปิดพื้นที่ margin ให้รองรับค่าเสื่อมจาก AI ที่กำลังจะไหลเข้างบ — วินัยต้นทุนฝั่งดำเนินงานสวนทางกับความใจป้ำฝั่งลงทุน"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "market cap ~$2.5T · forward P/E ~30-33x (P/E ที่รายงานบิดจาก gain Anthropic ~$53B ครั้งเดียว) — ยัง premium แต่ AWS ที่กลับมาโต +37% เร็วสุดตั้งแต่ 2021 หนุนข้อโต้แย้งว่า AWS เดี่ยว ๆ ควรได้ multiple สูงกว่าที่ตลาดคิดรวมกับค้าปลีก · ความเสี่ยง valuation คือ FCF บางจาก capex $220B ที่ทำให้หุ้นไวต่อข่าว 'AI ลงทุนเกินตัว' — เหมาะสะสมจังหวะย่อมากกว่าไล่ราคา"
      },
      "whatChanged": [
        {
          "metric": "AWS (Q1 → Q2 2026)",
          "prev": "+28% YoY",
          "now": "+37% YoY ($42.2B) — เร็วสุดตั้งแต่ 2021",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวม",
          "prev": "โตสองหลัก",
          "now": "$200.6B (+20% YoY)",
          "direction": "positive"
        },
        {
          "metric": "Operating income",
          "prev": "โตดี",
          "now": "$27.5B (+43% YoY) — margin ขยายเป็น ~13.7%",
          "direction": "positive"
        },
        {
          "metric": "AWS AI + custom chips",
          "prev": "กำลัง ramp",
          "now": "run rate ทะลุ $25B ต่อปีทั้งคู่",
          "direction": "positive"
        },
        {
          "metric": "CapEx guidance 2026",
          "prev": "~$200B",
          "now": "~$220B (ราคา memory ดันขึ้น)",
          "direction": "negative"
        },
        {
          "metric": "GAAP EPS",
          "prev": "—",
          "now": "$5.75 — แต่รวม gain มูลค่าหุ้น Anthropic ~$53.4B (ครั้งเดียว)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "CapEx ~$220B/ปี จะกลายเป็นค่าเสื่อมก้อนมหึมาปี 2026-2028 — ถ้าดีมานด์ AI ชะลอหรือราคา compute ถูกกดจากการแข่งขัน margin ของ AWS จะโดนบีบสองทาง + FCF บางอยู่แล้ว",
        "การแข่งขัน cloud: Azure (+43%) และ GCP โตเร็ว และ GPU cloud เฉพาะทาง (CoreWeave, Oracle) แย่ง workload AI บางส่วน — แม้ AWS เพิ่งกลับมาเร่ง แต่ยังต้องรักษาโมเมนตัม",
        "ผลตอบแทน AI ผูกกับลูกค้าไม่กี่ราย — ถ้า Anthropic/OpenAI สะดุดทางการเงินหรือย้าย workload สัญญาก้อนใหญ่ใน backlog อาจไม่แปลงเป็นรายได้ตามคาด (และ gain จากมูลค่าหุ้น Anthropic ก็กลับทางได้)",
        "คดี antitrust FTC เรื่องผูกขาด marketplace ยังเดินหน้า — ผลเลวร้ายสุดกระทบโครงสร้าง flywheel ค้าปลีก/โฆษณา",
        "ค้าปลีกอ่อนไหวต่อกำลังซื้อผู้บริโภคและภาษีนำเข้า/ภูมิรัฐศาสตร์ — กระทบทั้ง volume และต้นทุนสินค้าจากผู้ขายจีน"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ปีปฏิทิน) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลเมื่อ 5 ก.พ. 2026",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับ 20:1 split มิ.ย. 2022 ทุกปี) · หมายเหตุ: Q2'26 GAAP EPS $5.75 รวมกำไรก่อนภาษี ~$53.4B จากการตีมูลค่าเงินลงทุนใน Anthropic (non-operating) — ไม่ใช่กำไรจากธุรกิจ · FY2022 ขาดทุน GAAP จึงถูกตัดออกจากชุด P/E ย้อนหลัง",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 469.8,
            "epsAdj": 3.24,
            "opMarginPct": 5.3,
            "fcfB": -14.7,
            "priceFYEnd": 166.72
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 514,
            "epsAdj": -0.27,
            "opMarginPct": 2.4,
            "fcfB": -16.9,
            "priceFYEnd": 84
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 574.8,
            "epsAdj": 2.9,
            "opMarginPct": 6.4,
            "fcfB": 32.2,
            "priceFYEnd": 151.94
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 638,
            "epsAdj": 5.53,
            "opMarginPct": 10.8,
            "fcfB": 32.9,
            "priceFYEnd": 219.39
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 716.9,
            "epsAdj": 7.17,
            "opMarginPct": 11.2,
            "fcfB": 7.7,
            "priceFYEnd": 230.82
          }
        ],
        "notes": "EPS และราคาหุ้นปรับ 20:1 split (มิ.ย. 2022) ครบทุกปีแล้ว — FY2021 EPS ก่อน split คือ ~$64.81 (÷20 = $3.24) และราคาสิ้นปี 2021 ก่อน split คือ ~$3,334 (÷20 = $166.72) จำนวนหุ้น implied จาก net income/EPS อยู่ที่ ~10.3-10.8 พันล้านหุ้น สม่ำเสมอทุกปี ยืนยันการปรับ split ถูกต้อง | FCF ใช้นิยาม OCF ลบ capex (purchases of PP&E แบบ gross): FY2021-2022 ติดลบจากการลงทุน fulfillment/logistics หนัก; FY2025 FCF เหลือ $7.7B เพราะ capex พุ่งเป็น ~$131.8B จากการลงทุน AI/data center (นิยาม FCF ของ Amazon เองซึ่งหักด้วย capex สุทธิจาก proceeds รายงาน $11.2B) | Operating margin ฟื้นจากจุดต่ำสุด 2.4% ปี 2022 เป็น ~11.2% ปี 2025 จาก AWS + โฆษณา | ตัวเลขปัดเศษ ความแม่นยำ ~2-3% ตามวัตถุประสงค์ curated KB",
        "sources": [
          "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Fourth-Quarter-Results/",
          "https://stockanalysis.com/stocks/amzn/financials/",
          "https://www.statmuse.com/money/ask/amazon-stock-price-december-31st-2025",
          "https://www.statmuse.com/money/ask/amazon-stock-price-from-2023-to-2024",
          "https://www.macrotrends.net/stocks/charts/AMZN/amazon/stock-price-history"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 143.08,
            "epsAdj": 0.94,
            "opMarginPct": 7.8,
            "fcfB": 8.74,
            "priceQEnd": 127.12,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 169.96,
            "epsAdj": 1,
            "opMarginPct": 7.8,
            "fcfB": 27.88,
            "priceQEnd": 151.94,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 143.31,
            "epsAdj": 0.98,
            "opMarginPct": 10.7,
            "fcfB": 4.06,
            "priceQEnd": 180.38,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 147.98,
            "epsAdj": 1.26,
            "opMarginPct": 9.9,
            "fcfB": 7.66,
            "priceQEnd": 193.25,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 158.88,
            "epsAdj": 1.43,
            "opMarginPct": 11,
            "fcfB": 3.35,
            "priceQEnd": 186.33,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 187.79,
            "epsAdj": 1.86,
            "opMarginPct": 11.3,
            "fcfB": 17.8,
            "priceQEnd": 219.39,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 155.67,
            "epsAdj": 1.59,
            "opMarginPct": 11.8,
            "fcfB": -8,
            "priceQEnd": 190.26,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 167.7,
            "epsAdj": 1.68,
            "opMarginPct": 11.4,
            "fcfB": 0.33,
            "priceQEnd": 219.39,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 180.17,
            "epsAdj": 1.95,
            "opMarginPct": 9.7,
            "fcfB": 0.43,
            "priceQEnd": 219.57,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 213.39,
            "epsAdj": 1.95,
            "opMarginPct": 11.7,
            "fcfB": 14.94,
            "priceQEnd": 230.82,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 181.52,
            "epsAdj": 2.78,
            "opMarginPct": 13.1,
            "fcfB": -18.17,
            "priceQEnd": 208.27,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 200.61,
            "epsAdj": 5.75,
            "opMarginPct": 13.7,
            "fcfB": -8.82,
            "priceQEnd": 238.34,
            "endDate": "2026-06-30",
            "epsNote": "GAAP EPS $5.75 รวมกำไรก่อนภาษี ~$53.4B จากการตีมูลค่าเงินลงทุนใน Anthropic (other income นอกธุรกิจหลัก) — net income ไตรมาสนี้ $62.6B ขณะที่ operating income จริง $27.5B · consensus ก่อนงบคาด EPS ~$1.82 จึงเทียบกับไตรมาสอื่นตรง ๆ ไม่ได้"
          }
        ]
      },
      "nextEarnings": "2026-10",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 12.46,
            "revenue": 828.3
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~$194.0-199.0B",
            "actual": "~$200.6B",
            "result": "beat",
            "magnitudePct": 2.1
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "~$173.5-178.5B",
            "actual": "~$181.5B",
            "result": "beat",
            "magnitudePct": 3.1
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "~$206.0-213.0B",
            "actual": "~$213.4B",
            "result": "beat",
            "magnitudePct": 1.9
          },
          {
            "quarter": "Q2 2025",
            "metric": "revenue",
            "guided": "~$159.0-164.0B",
            "actual": "~$167.7B",
            "result": "beat",
            "magnitudePct": 3.8
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 828.3,
            "eps": 12.46,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "Amazon ให้ guidance ทั้ง net sales และ operating income ทุกไตรมาส · ยืนยัน guidance→ผลจริงได้ 4 ไตรมาส (Q2'25, Q4'25, Q1'26, Q2'26) ส่วนไตรมาสอื่นเข้าถึง press release ไม่ได้ (SEC/PDF บล็อก) จึงไม่บันทึกแทนการเดา · guidance Q3 2026 = net sales ~$197-202B + operating income ~$22.5-26.5B (ยังไม่ประกาศผล) · consensus FY2026 EPS ~$12.46 (54 นักวิเคราะห์ · non-GAAP) — ตัวเลข GAAP ปีนี้จะสูงกว่ามากเพราะรวมกำไร Anthropic · FY2027 อยู่หลัง paywall ทุกแหล่งฟรี จึงเว้นไว้ · CapEx 2026 ถูกยกเป็น ~$220B (จากราคา memory)"
      }
    },
    "TSM": {
      "ticker": "TSM",
      "name": "Taiwan Semiconductor Manufacturing Company",
      "layer": "foundry",
      "thesis": {
        "statement": "TSMC คือโรงหลอมของยุค AI — ชิป AI ระดับแนวหน้าเกือบทั้งหมดของโลก (Nvidia, AMD, custom ASIC ของ Google/Amazon/Meta) ผลิตได้ที่ TSMC เท่านั้น บริษัทกินส่วนแบ่ง node ขั้นสูงราว ~90% มี pricing power และ margin ที่ขยับขึ้นต่อเนื่อง ขณะที่ demand จาก AI accelerator ถูกคาดว่าจะโตราว mid-40s% ต่อปีถึง 2029 — เป็นธุรกิจผูกขาดโดยพฤตินัยที่ยังซื้อขายในราคาสมเหตุสมผลเมื่อเทียบกับการเติบโต",
        "pillars": [
          "ผูกขาดโดยพฤตินัย: ส่วนแบ่ง foundry ~70% และ ~90%+ ใน advanced node — ลูกค้า AI รายใหญ่ทุกรายไม่มีทางเลือกอื่น",
          "AI accelerator เป็นเครื่องยนต์หลัก: บริษัทให้เป้าโต ~mid-40s% CAGR (2024-2029) และปี 2025 ทำได้ตามสัญญา",
          "Roadmap นำหน้าคู่แข่ง 1-2 ปี: N2 เข้าสู่ volume production ปลายปี 2025, A16 ตามมา H2/2026",
          "คุมคอขวด advanced packaging (CoWoS/SoIC) ของทั้งอุตสาหกรรม AI",
          "การเงินระดับป้อมปราการ: gross margin ~59-60%, net cash แม้ลงทุน CapEx ~$40B+/ปี"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+36% YoY (Q2 2026 — US$40.2B สถิติ, +12% QoQ) · FY2026 guide ยกเป็น >+40% YoY",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "รายได้ทำสถิติจากดีมานด์ AI — HPC โต +20% QoQ เป็น 66% ของรายได้ · TSMC ยก guidance ทั้งปีเป็น >+40% สะท้อนคอขวด AI ที่ยังตึง"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS US$4.31/ADR (Q2 2026) เร่งจาก $3.49 (Q1) — โตตามรายได้ + margin สถิติ",
          "trend": "up",
          "score": 91,
          "impact": "positive",
          "why": "กำไรเร่งตามรายได้และ margin ที่ทำ all-time high — operating leverage ของ node ล้ำสมัยชัดเจน"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "OCF สูงมาก แต่ CapEx 2026 ยกเป็นสถิติ ~$56B รองรับ AI — FCF ยังบวกแต่ถูกกดจาก capex",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "capex เร่งจาก ~$42B เป็น ~$56B เพื่อขยาย node ล้ำ/CoWoS — กด FCF ระยะสั้นแต่เป็นการลงทุนตามดีมานด์ที่ล็อกไว้แล้ว"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross margin 67.7% · operating margin 60.3% (Q2 2026) — ทั้งคู่ทำ all-time high",
          "trend": "up",
          "score": 94,
          "impact": "positive",
          "why": "margin สูงสุดในประวัติศาสตร์จาก utilization เต็ม + ขึ้นราคา node ล้ำ + คุมต้นทุน — แม้ถูกกดบางส่วนจาก fab ต่างประเทศและ NT$ แข็ง"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ROE ~30%+; ROIC สูงกว่า cost of capital มาก",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "ลงทุนหนักแต่ผลตอบแทนต่อเงินลงทุนยังสูงขึ้น เพราะ utilization เต็มและราคาขายต่อ wafer ขยับขึ้นทุก node ใหม่"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสด+เงินลงทุนระดับ ~$80B+; สถานะ net cash",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลแข็งระดับป้อมปราการ รองรับทั้ง CapEx cycle ขาขึ้นและ shock ภูมิรัฐศาสตร์ได้สบาย"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ต่ำมากเทียบขนาดบริษัท; เงินสดมากกว่าหนี้ชัดเจน",
          "trend": "flat",
          "score": 88,
          "impact": "positive",
          "why": "มีการกู้บ้างเพื่อบริหารค่าเงินและ fab ต่างประเทศ แต่โดยรวมเป็น net cash — ไม่มีความเสี่ยงงบดุล"
        },
        {
          "key": "dilution",
          "label": "การเจือจางผู้ถือหุ้น",
          "current": "จำนวนหุ้นแทบไม่เปลี่ยน (~0%/ปี)",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "ไม่มี SBC หนักแบบบริษัทเทคสหรัฐ ไม่มีการเพิ่มทุน — ผู้ถือหุ้นระยะยาวไม่ถูก dilute"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "CapEx ~$40B+ (2025) + ปันผลที่โตต่อเนื่อง",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "เงินส่วนใหญ่กลับเข้า capacity ขั้นสูงที่ ROIC สูง — เป็นการ compound ที่ถูกจุด และลงทุนตาม demand ที่ลูกค้าจองจริง ไม่ใช่เก็งกำไร"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~20-25x (mcap ~$1.83T) — ยังถูกกว่าหุ้น AI สหรัฐแทบทุกตัวเทียบการเติบโต",
          "trend": "flat",
          "score": 70,
          "impact": "positive",
          "why": "~20-25x สำหรับบริษัทโต ~40% margin ~60% ผูกขาดคอขวด AI ทั้งโลก — ส่วนลดหลักคือความเสี่ยงภูมิรัฐศาสตร์ไต้หวัน ไม่ใช่คุณภาพธุรกิจ"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 88,
        "recurringPct": null,
        "note": "ไม่ใช่รายได้ subscription แต่ลูกค้ารายใหญ่ (Apple, Nvidia, AMD, Qualcomm, hyperscalers) ผูกกับ TSMC ระยะยาวผ่าน design cycle และ prepayment — พฤติกรรมใกล้เคียงรายได้ recurring; การเติบโตเร่งขึ้นจาก AI ทั้งที่ฐานรายได้ใหญ่มากแล้ว",
        "segments": [
          {
            "name": "HPC (AI accelerator, CPU/GPU ดาต้าเซ็นเตอร์)",
            "sharePct": 66,
            "growthNote": "+20% QoQ — เครื่องยนต์หลัก · AI accelerator ดีมานด์ล้น node N3/N2 · advanced nodes = 77% ของ wafer",
            "trend": "up"
          },
          {
            "name": "Smartphone",
            "sharePct": 25,
            "growthNote": "iPhone/Android เรือธงใช้ N3/N2 — โตตามฤดูกาล ไม่ใช่ตัวขับหลักอีกต่อไป",
            "trend": "flat"
          },
          {
            "name": "IoT",
            "sharePct": 4,
            "growthNote": "ทรงตัว รอ edge AI จุดรอบใหม่",
            "trend": "flat"
          },
          {
            "name": "Automotive",
            "sharePct": 3,
            "growthNote": "ฟื้นช้า แต่ content ชิปต่อคันเพิ่มระยะยาว",
            "trend": "flat"
          },
          {
            "name": "DCE และอื่น ๆ",
            "sharePct": 2,
            "growthNote": "สัดส่วนเล็ก ไม่มีนัยยะ",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 92,
        "items": [
          {
            "item": "AI accelerator ramp (Nvidia, AMD, custom ASIC ของ hyperscaler)",
            "status": "executing",
            "evidence": "HPC = 66% ของรายได้ (+20% QoQ) · AI accelerator ดีมานด์ล้นจนต้องยก guidance ทั้งปีเป็น >+40% — เป็นคอขวดที่ NVIDIA/AMD/hyperscaler ทุกรายต้องผ่าน"
          },
          {
            "item": "N2 (2nm) เข้าสู่ volume production",
            "status": "executing",
            "evidence": "N2 (2nm) เข้า volume production · advanced nodes (7nm ลงไป) = 77% ของ wafer revenue — ครองการผลิต node ล้ำเกือบเบ็ดเสร็จ"
          },
          {
            "item": "Advanced packaging (CoWoS / SoIC)",
            "status": "executing",
            "evidence": "ขยายกำลังผลิตราวเท่าตัวติดต่อกันหลายปีแต่ demand ยังล้น — เป็นคอขวดของ AI ทั้งอุตสาหกรรมที่ TSMC เป็นผู้ควบคุม"
          },
          {
            "item": "ขยายกำลังผลิตทั่วโลก (Arizona ~$165B, Japan, Germany)",
            "status": "on-track",
            "evidence": "CapEx 2026 ยกเป็นสถิติ ~$56B (Arizona, Japan, Germany) — ลงทุนตามดีมานด์ AI ที่ล็อกไว้แล้ว"
          },
          {
            "item": "Roadmap A16 / Super Power Rail (กำหนด H2/2026)",
            "status": "on-track",
            "evidence": "เดินตามแผนต่อจาก N2 เพื่อชิป AI ยุคถัดไป — รักษาระยะห่างเทคโนโลยี 1-2 ปีจาก Samsung และ Intel"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "การผูกขาดโดยพฤตินัยของ advanced node — process know-how ที่สะสมหลายทศวรรษ + scale ที่ใหญ่กว่าคู่แข่งมาก + ความไว้วางใจแบบ \"ไม่แข่งกับลูกค้า\" ทำให้คู่แข่งตามไม่ทันแม้ทุ่มเงินมหาศาล และยิ่ง AI โต ช่องว่างยิ่งถ่างออก",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ส่วนแบ่ง foundry ~70% และ ~90%+ ใน node ขั้นสูง — รอบ AI ทำให้ทิ้งห่างคู่แข่งมากขึ้น"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "N2 นำหน้า Samsung SF2 และ Intel 18A ทั้งด้าน yield และจำนวนลูกค้าที่ใช้งานจริง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "stable",
            "note": "ramp N3→N2 และขยาย CoWoS ได้ตามสัญญาทุกไตรมาส — ความเร็วเท่าเดิมบนสเกลที่ใหญ่ขึ้นเรื่อยๆ"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "ย้าย foundry = redesign ชิปใหม่ ใช้เวลาหลายปีและเงินหลายพันล้านดอลลาร์ — ที่ node หน้าสุดลูกค้าแทบไม่มีทางเลือก"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "Open Innovation Platform ผูก EDA, IP และ packaging partner ทั้งอุตสาหกรรมเข้ากับ process ของ TSMC"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "strengthening",
            "note": "จำนวน tape-out บน N2 สูงเป็นประวัติการณ์ — ทั้ง fabless และ hyperscaler ออกแบบชิปเข้าหา TSMC ก่อนใคร"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "Apple, Nvidia, AMD และ hyperscaler จอง capacity ล่วงหน้าพร้อม prepayment — สัญญาผูกพันกันหลายปี"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "learning curve ของ process ที่ไล่ไม่ทัน — Samsung ยังติดปัญหา yield ส่วน Intel ยังพิสูจน์ 18A กับลูกค้าภายนอกในสเกลจริงไม่ได้"
          }
        ]
      },
      "capitalAllocation": {
        "score": 85,
        "verdict": "เกือบสมบูรณ์แบบสำหรับธุรกิจ capital-intensive: เทเงินเข้า node ขั้นสูงที่ ROIC สูง จ่ายปันผลที่โตสม่ำเสมอ และไม่ dilute ผู้ถือหุ้นเลย — จุดที่ต้องจับตาเพียงจุดเดียวคือ fab ต่างประเทศที่ให้ return ต่ำกว่าไต้หวันโดยธรรมชาติ แต่ถือเป็นเบี้ยประกันภูมิรัฐศาสตร์ที่คุ้มจ่าย",
        "items": [
          {
            "label": "CapEx",
            "current": "~$40B+ ปี 2025 และมีแนวโน้มเพิ่มขึ้นในปี 2026",
            "assessment": "good",
            "why": "ลงทุนตาม demand ที่ลูกค้าจองล่วงหน้าจริง ไม่ใช่การเก็งกำไร — track record ความแม่นยำของการลงทุนดีมากมาหลายรอบวัฏจักร"
          },
          {
            "label": "R&D",
            "current": "~$6-7B/ปี (ราว ~8% ของรายได้)",
            "assessment": "good",
            "why": "เพียงพอต่อการรักษาความนำ 1-2 ปี เพราะ scale ทำให้ต้นทุน R&D ต่อ wafer ต่ำกว่าคู่แข่งมาก"
          },
          {
            "label": "ปันผล",
            "current": "จ่ายต่อเนื่องและปรับเพิ่มขึ้นทุกปี",
            "assessment": "good",
            "why": "นโยบายชัดเจนว่าปันผลจะไม่ลด มีแต่คงหรือเพิ่ม — เหมาะกับผู้ถือหุ้นระยะยาว"
          },
          {
            "label": "Buyback",
            "current": "แทบไม่มีการซื้อหุ้นคืน",
            "assessment": "neutral",
            "why": "วัฒนธรรมบริษัทไต้หวันเน้นปันผลมากกว่า buyback — ไม่ใช่จุดอ่อนเมื่อเงินถูกนำไปลง capacity ที่ให้ return สูงกว่า"
          },
          {
            "label": "Dilution",
            "current": "~0% — จำนวนหุ้นนิ่งมาหลายปี",
            "assessment": "good",
            "why": "ไม่มีการเพิ่มทุนหรือ SBC ที่มีนัยยะ ผู้ถือหุ้นได้ประโยชน์เต็มจากกำไรที่โต"
          },
          {
            "label": "การลงทุน fab ต่างประเทศ",
            "current": "Arizona รวม ~$165B + Japan + Germany",
            "assessment": "neutral",
            "why": "จำเป็นเชิงยุทธศาสตร์แม้กด gross margin ราว 2-3 จุด — แลกกับการลดความเสี่ยงภูมิรัฐศาสตร์และรักษาความสัมพันธ์กับรัฐบาลสหรัฐ"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "forward P/E ~20-25x (mcap ~$1.83T) สำหรับบริษัทที่รายได้โต ~40% margin ~68% และผูกขาดคอขวดการผลิตชิป AI ทั้งโลก — ถูกกว่าหุ้น AI สหรัฐแทบทุกตัวเทียบการเติบโต · ส่วนลดถาวรมาจากความเสี่ยงภูมิรัฐศาสตร์ไต้หวัน (tail risk) ไม่ใช่ปัญหาธุรกิจ — เหมาะกับผู้ที่รับความเสี่ยงภูมิรัฐศาสตร์ได้"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026, USD)",
          "prev": "$35.9B",
          "now": "$40.2B (+36% YoY, +12% QoQ) — สถิติใหม่",
          "direction": "positive"
        },
        {
          "metric": "Gross margin",
          "prev": "66.2%",
          "now": "67.7% — all-time high",
          "direction": "positive"
        },
        {
          "metric": "Operating margin",
          "prev": "~59%",
          "now": "60.3% — all-time high",
          "direction": "positive"
        },
        {
          "metric": "HPC/AI (สัดส่วนรายได้)",
          "prev": "~57%",
          "now": "66% (+20% QoQ)",
          "direction": "positive"
        },
        {
          "metric": "เป้ารายได้ทั้งปี 2026",
          "prev": "~mid-30s% YoY",
          "now": "ยกเป็น >+40% YoY",
          "direction": "positive"
        },
        {
          "metric": "CapEx 2026",
          "prev": "~$42B",
          "now": "~$56B — สถิติ รองรับ AI",
          "direction": "neutral"
        }
      ],
      "risks": [
        "ความเสี่ยงไต้หวัน-จีน: ความขัดแย้งหรือการปิดล้อมคือ tail risk ที่ทำลายมูลค่าได้ทันที และเป็นเหตุผลหลักของ valuation discount ตลอดกาลของหุ้นนี้",
        "นโยบายสหรัฐ: ภาษีนำเข้าชิป (Section 232), export control ต่อจีน และแรงกดดันให้ย้ายฐานการผลิต — เพิ่มทั้งต้นทุนและความไม่แน่นอนเชิงนโยบาย",
        "วัฏจักร AI capex: รายได้พึ่ง AI accelerator มากขึ้นเรื่อยๆ — หาก hyperscaler ชะลอการลงทุนพร้อมกัน ผลกระทบจะแรงและเร็ว",
        "การกระจุกตัวของลูกค้า: Apple และ Nvidia รวมกันคิดเป็นสัดส่วนรายได้ที่สูงมาก อำนาจต่อรองและชะตากรรมผูกกันแน่น",
        "ค่าเงิน NT$ แข็งและ margin dilution จาก fab ต่างประเทศ กัด gross margin ต่อเนื่องราว 2-4 จุดในปีข้างหน้า"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีตรงกับปีปฏิทิน สิ้นสุดเดือนธันวาคม (FY2025 = ม.ค.–ธ.ค. 2025 รายงานผลครบแล้วเมื่อ ม.ค. 2026)",
        "epsBasis": "diluted EPS ต่อ 1 ADR ในสกุล USD (1 ADR = 5 หุ้นสามัญ), ADR ไม่เคยแตกหุ้น จึงไม่มี split adjustment",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 56.8,
            "epsAdj": 4.12,
            "opMarginPct": 40.9,
            "fcfB": 9.8,
            "priceFYEnd": 120.31
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 75.9,
            "epsAdj": 6.57,
            "opMarginPct": 49.5,
            "fcfB": 17.7,
            "priceFYEnd": 74.49
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 69.3,
            "epsAdj": 5.18,
            "opMarginPct": 42.6,
            "fcfB": 9.6,
            "priceFYEnd": 104
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 90.1,
            "epsAdj": 7.04,
            "opMarginPct": 45.7,
            "fcfB": 26.6,
            "priceFYEnd": 197.49
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 122.4,
            "epsAdj": 10.65,
            "opMarginPct": 50.8,
            "fcfB": 32,
            "priceFYEnd": 303.89
          }
        ],
        "notes": "ทุกตัวเลขอิงฐาน NYSE ADR (TSM): รายได้/EPS/FCF แปลงจาก NT$ เป็น USD ด้วยอัตราแลกเปลี่ยนเฉลี่ยรายปี (~27.9–32.1 NT$/US$ ผันผวนตามปี จึงทำให้อัตราเติบโตใน USD ต่างจาก NT$ เล็กน้อย เช่น FY2025 รายได้ +31.6% ใน NT$ แต่ +35.9% ใน USD) — EPS ต่อ ADR ตรวจสอบ 2 วิธี: ผลรวมตัวเลข US$/ADR จาก press release รายไตรมาสของ TSMC และคำนวณจาก NT$ diluted EPS ×5 ÷ FX เฉลี่ย ให้ผลตรงกัน — ADR ไม่เคย split ราคาปลายปีเป็นราคาปิดจริง (ไม่ปรับเงินปันผล) — FCF = กระแสเงินสดดำเนินงาน − capex (เช่น FY2025: OCF ~NT$2.27T − capex ~NT$1.27T ≈ NT$1.0T ≈ $32B) — TSMC รายงานตามมาตรฐาน IFRS/TIFRS ไม่ใช่ US GAAP แต่ operating margin เทียบเคียงกันได้ — จำนวนหุ้น ADR-equivalent คงที่ ~5.19B ทุกปี ผ่าน sanity check — ตัวเลขเป็นค่าประมาณ ±2–3%",
        "sources": [
          "https://pr.tsmc.com/english/news/3281",
          "https://www.sec.gov/Archives/edgar/data/1046179/000104617926000008/a4q25e_withguidancexfinal.htm",
          "https://www.stocktitan.net/sec-filings/TSM/6-k-taiwan-semiconductor-manufacturing-co-ltd-current-report-foreign--c7605b09d8e8.html",
          "https://stockanalysis.com/stocks/tsm/financials/cash-flow-statement/",
          "https://www.macrotrends.net/stocks/charts/TSM/taiwan-semiconductor-manufacturing/free-cash-flow",
          "https://www.statmuse.com/money/ask/tsm-stock-closing-price-december-31-2025",
          "https://query1.finance.yahoo.com/v8/finance/chart/TSM (year-end unadjusted closes)"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 17.28,
            "epsAdj": 1.29,
            "opMarginPct": 41.7,
            "fcfB": 2.18,
            "priceQEnd": 88,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 19.62,
            "epsAdj": 1.44,
            "opMarginPct": 41.6,
            "fcfB": 7.2,
            "priceQEnd": 104,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 18.87,
            "epsAdj": 1.35,
            "opMarginPct": 42,
            "fcfB": 7.94,
            "priceQEnd": 138,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 20.82,
            "epsAdj": 1.49,
            "opMarginPct": 42.6,
            "fcfB": 5.36,
            "priceQEnd": 174,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 23.5,
            "epsAdj": 1.95,
            "opMarginPct": 47.5,
            "fcfB": 5.76,
            "priceQEnd": 173,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 26.88,
            "epsAdj": 2.25,
            "opMarginPct": 49,
            "fcfB": 8.05,
            "priceQEnd": 197.5,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 25.53,
            "epsAdj": 2.24,
            "opMarginPct": 48.5,
            "fcfB": 9.48,
            "priceQEnd": 168,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 30.07,
            "epsAdj": 2.47,
            "opMarginPct": 49.6,
            "fcfB": 6.42,
            "priceQEnd": 229,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 33.1,
            "epsAdj": 2.8,
            "opMarginPct": 50.6,
            "fcfB": 4.48,
            "priceQEnd": 280,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 33.73,
            "epsAdj": 3.14,
            "opMarginPct": 54,
            "fcfB": 11.85,
            "priceQEnd": 303.9,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 35.9,
            "epsAdj": 3.4,
            "opMarginPct": 58.1,
            "fcfB": 11.23,
            "priceQEnd": 260,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 40.2,
            "epsAdj": 4.2,
            "opMarginPct": 60.3,
            "fcfB": 9.27,
            "priceQEnd": 330,
            "endDate": "2026-06-30"
          }
        ],
        "instrument": {
          "shareBasis": "ADR",
          "adrRatio": 5,
          "currency": "USD",
          "note": "ราคาและ EPS ใน KB อยู่ฐาน ADR (US listing) ทั้งคู่ — ไม่ต้องแปลง"
        },
        "revenueBasis": "รายได้เป็นตัวเลข US$ ที่ TSMC รายงานอย่างเป็นทางการในตาราง guidance/actual ของแต่ละไตรมาส (investor.tsmc.com) — ไม่ใช่การแปลง NT$ ด้วยเรตตลาด · ตัวเลขรายปีอยู่ฐานเดียวกันอยู่แล้ว (ผลรวม 4 ไตรมาส ≈ ทั้งปี: FY2024 ~90.1 · FY2025 ~122.4)"
      },
      "nextEarnings": "2026-10",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~$39.0-40.2B",
            "actual": "~$40.2B",
            "result": "beat",
            "magnitudePct": 1.5
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "~$34.6-35.8B",
            "actual": "~$35.9B",
            "result": "beat",
            "magnitudePct": 2
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "~$32.2-33.4B",
            "actual": "~$33.73B",
            "result": "beat",
            "magnitudePct": 2.8
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "TSMC ให้ guidance รายได้เป็นช่วง US$ ทุกไตรมาส — ยืนยันได้ 3 ไตรมาส (Q4'25, Q1'26, Q2'26) beat ทุกครั้งแต่ขนาดเล็กลงเรื่อย ๆ (2.8% → 2.0% → 1.5%) · guidance Q3 2026 = ~$44.6-45.8B (+37% YoY ที่จุดกึ่งกลาง) · ทั้งปี 2026 บริษัทยกเป้าโตเป็น 'สูงกว่า 40% เล็กน้อย' · CapEx 2026 ~$60-64B · consensus ที่หาได้เป็นสกุล TWD (5.43 ล้านล้าน TWD · EPS 107.39 · 38 นักวิเคราะห์) ซึ่งเป็นคนละฐานกับ ADR USD ใน KB จึงไม่บันทึกตัวเลข เพราะแปลงเองจะเป็นการเดา · หมายเหตุ: รายได้ Q2'26 ที่ TSMC รายงานอย่างเป็นทางการคือ US$40.20B ขณะที่ตาราง KB บันทึก 40.98 (น่าจะแปลงจาก NT$ ด้วยเรตตลาดคนละตัว) — ต้องเลือกฐานให้ตรงกันทั้งชุดก่อนแก้"
      }
    },
    "AVGO": {
      "ticker": "AVGO",
      "name": "Broadcom Inc.",
      "layer": "networking",
      "thesis": {
        "statement": "Broadcom คือผู้ชนะเบอร์สองของ AI compute cycle ผ่านธุรกิจ custom XPU ให้ hyperscaler และเป็นเจ้าตลาดชิป Ethernet networking ที่ทุก AI cluster ต้องใช้ โดยมีธุรกิจซอฟต์แวร์ VMware ที่สร้างกระแสเงินสด recurring มั่นคงเป็นฐาน — เมื่อ hyperscaler ต้องการลดการพึ่งพา NVIDIA และคุมต้นทุนต่อ token การออกแบบชิปเฉพาะทางร่วมกับ Broadcom คือคำตอบเชิงโครงสร้างระยะยาว",
        "pillars": [
          "Custom XPU: ลูกค้า hyperscaler หลายราย (Google TPU เป็นแกนหลัก) บวกดีล OpenAI ระดับ 10 GW ทำให้รายได้ AI โตเร่งต่อเนื่องหลายปีพร้อม backlog มหาศาล",
          "ผูกขาดชิป Ethernet switch (~80% ของตลาด merchant switch silicon) — ยิ่ง cluster ใหญ่ขึ้น สัดส่วนมูลค่า networking ยิ่งสูงขึ้น",
          "Infrastructure Software (VMware, CA, Symantec) ~30% ของรายได้ เป็น subscription margin สูง ARR ยังโต +15% YoY — สัดส่วนลดจาก ~40% เพราะฝั่ง AI โตเร็วกว่า ไม่ใช่เพราะธุรกิจหด แต่แปลว่ากันชนรับวัฏจักรชิปบางลง",
          "Hock Tan คือหนึ่งในผู้จัดสรรทุนที่ดีที่สุดในอุตสาหกรรม — M&A ที่สร้างมูลค่าจริง + ปันผลโตต่อเนื่องทุกปี",
          "FCF margin ~46% (Q3 FY26) สูงระดับแนวหน้าของกลุ่ม semiconductor จาก capex ที่ต่ำเพียง ~2% ของรายได้ ทำให้รองรับหนี้และคืนทุนผู้ถือหุ้นได้พร้อมกัน"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+86% YoY (Q3 FY26 — $29.59B สถิติใหม่) · guide Q4 รายได้รวม ~$34.8B (+93% YoY)",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "เร่งขึ้นอีกจาก +48% ในไตรมาสก่อน โดยชิป AI ตัวเดียวโต 221% YoY — guidance Q4 บ่งชี้ว่ายังไม่ถึงยอดของรอบ แต่ต้องหมายเหตุว่า guide $34.8B ต่ำกว่าที่ตลาดคาดไว้ราว $35.0B เล็กน้อย ซึ่งเป็นเหตุให้ราคาหุ้นย่อทันทีหลังประกาศ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 FY26: GAAP EPS $2.68 · non-GAAP $3.32 (ไตรมาสก่อน GAAP $1.91 / non-GAAP $2.44)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้จาก operating leverage — GAAP net income ขึ้นเป็น $13.1B มากกว่าสามเท่าของปีก่อน · ช่องว่าง GAAP vs non-GAAP ~$0.64/หุ้นมาจาก amortization ของ intangibles ดีล VMware จึงเป็นรายการต่อเนื่อง ไม่ใช่กำไรพิเศษครั้งเดียว"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 FY26 = $13.67B (46% ของรายได้) · OCF $14.2B หัก capex $0.53B",
          "trend": "up",
          "score": 93,
          "impact": "positive",
          "why": "โต ~95% YoY และ FCF margin ขยับจาก ~40% เป็น ~46% — โมเดล fabless ทำให้ capex อยู่แค่ ~1.8% ของรายได้แม้ปริมาณผลิตจะพุ่ง เป็นเหตุผลที่จ่ายปันผล ลดหนี้ และลงทุน R&D ได้พร้อมกัน"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "non-GAAP operating margin ~66% · GAAP operating margin ~53.9% · guide gross margin Q4 ~73%",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "ฝ่ายบริหารระบุเองว่า mix ของ XPU ที่มีหน่วยความจำมากขึ้นกำลังเจือจาง gross margin รวม (guide Q4 ~73%) — operating margin ยังยืน ~66% ได้เพราะค่าใช้จ่ายคงที่ถูกกระจายบนฐานรายได้ที่ใหญ่ขึ้น แต่ทิศทาง margin ขาขึ้นจบรอบไปแล้ว การโตจากนี้ต้องมาจากปริมาณ"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ผลตอบแทนเงินสดดีขึ้นเร็วตามสเกล AI แต่ GAAP ROIC ยังถูกกดด้วย goodwill จากดีล VMware",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "รายได้เกือบเท่าตัวบนฐานสินทรัพย์เดิม (capex เพียง ~$0.5B/ไตรมาส) ทำให้ผลตอบแทนต่อทุนที่ลงไปจริงดีขึ้นชัด — ตัวเลขทางบัญชีที่ยังต่ำมาจาก goodwill ก้อนใหญ่ ไม่ใช่จากธุรกิจที่ด้อยลง"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "~$10B+ เพียงพอต่อการดำเนินงาน",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "เงินสดถูกบริหารแบบตึงตัวโดยตั้งใจ เพราะ FCF ส่วนใหญ่ถูกส่งไปจ่ายปันผลและลดหนี้ ไม่ใช่จุดแข็งแต่ไม่ใช่ความเสี่ยงตราบใดที่ FCF ยังแข็งแรง"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "จ่ายคืนหนี้ $5.6B ใน Q3 FY26 และอีก $1.5B หลังปิดงวด · มีภาระใหม่: ค้ำหนี้ senior ให้ลูกค้า AI lab เพดานเปิดเผย ~$29B",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "การลดหนี้จากดีล VMware เดินหน้าเร็วขึ้น (รวม $7.1B ในไตรมาสเดียว) ซึ่งเป็นด้านบวก แต่ 10-Q เปิดเผยว่าบริษัทเข้าไปค้ำหนี้ระดับ senior ให้ลูกค้า AI lab โดยเพดานของดีลแรก ($35B) อยู่ที่ ~$29B และบริษัทบอกเองว่าจะพิจารณาเป็นดีล ๆ ไป จึงยังไม่มีเพดานรวม — เป็นความเสี่ยงเครดิตรูปแบบใหม่ที่งบดุลเดิมไม่เคยมี"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 4,887 ล้านหุ้น (Q3 FY26) เพิ่มจาก 4,876 ล้านในไตรมาสก่อน · SBC ยังสูงระดับหลายพันล้านดอลลาร์/ปี",
          "trend": "flat",
          "score": 45,
          "impact": "negative",
          "why": "จำนวนหุ้นยังเพิ่มสุทธิทุกไตรมาสจาก stock-based comp ที่สูง โดย buyback ชดเชยได้เพียงบางส่วนเพราะเงินสดถูกจัดลำดับไปลดหนี้ก่อน — เป็นจุดอ่อนเชิงโครงสร้างที่ยังไม่เปลี่ยน"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ปันผล $0.65/หุ้น/ไตรมาส (~$3.1B ใน Q3) + ลดหนี้ $7.1B + M&A แม่นยำ",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "Track record ของ Hock Tan ในการซื้อกิจการแล้วรีดมูลค่า (CA, Symantec, VMware) ยังเป็นระดับตำนาน และไตรมาสนี้คืนทุนพร้อมลดหนี้ก้อนใหญ่ได้ในคราวเดียว — สิ่งที่ต้องจับตาคือการค้ำหนี้ให้ลูกค้า ซึ่งเป็นการใช้งบดุลรูปแบบใหม่ที่ยังไม่มีประวัติให้ตัดสิน"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$362 · mcap ~$1.77T · ~31x กำไร FY2026 (consensus non-GAAP $11.66) หรือ ~18-19x ถ้าอิงประมาณการ FY2027",
          "trend": "up",
          "score": 58,
          "impact": "neutral",
          "why": "ราคาลดจาก ~$395 เหลือ ~$362 ขณะที่กำไรยังเร่ง multiple จึงหดต่อ — ตลาดลงโทษเพราะ guide รายได้ Q4 ต่ำกว่าคาดเล็กน้อย ไม่ใช่เพราะพื้นฐานแย่ · ยังไม่ถูก เพราะราคาปัจจุบัน price-in เป้า AI FY2027 $115B ที่ต้องส่งมอบจริงก่อน"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 88,
        "recurringPct": 30,
        "note": "คุณภาพรายได้ยังดีมาก แต่โครงสร้างเปลี่ยนเร็ว — ฝั่ง AI มีสัญญาผูกพันหลายปีและบริษัทบอกว่าล็อกกำลังผลิตถึง FY2028 แล้ว ให้ visibility สูงผิดปกติสำหรับธุรกิจชิป ฝั่งซอฟต์แวร์ยังเป็น subscription ที่ churn ต่ำ (ARR +15% YoY) แต่สัดส่วนต่อรายได้รวมลดจาก ~40% เหลือ ~30% เพราะฝั่ง AI โตเร็วกว่ามาก ไม่ใช่เพราะซอฟต์แวร์หดตัว ผลคือกันชนที่เคยรองรับวัฏจักรชิปบางลงตามไปด้วย และรายได้กระจุกที่ลูกค้า AI ไม่กี่รายมากขึ้น",
        "segments": [
          {
            "name": "AI Semiconductors (custom XPU + AI networking)",
            "sharePct": 56,
            "growthNote": "$16.7B (+221% YoY, +54% QoQ) — ลูกค้า custom 6 ราย (Google TPU, Anthropic, OpenAI, Meta MTIA ฯลฯ) · guide Q4 $21.7B (+236%)",
            "trend": "up"
          },
          {
            "name": "Non-AI Semiconductors (broadband, wireless, storage, industrial)",
            "sharePct": 14,
            "growthNote": "$4.2B (+5% YoY, ทรงตัว QoQ) — ฟื้นช้า ๆ · guide Q4 ~$4.3B",
            "trend": "flat"
          },
          {
            "name": "Infrastructure Software (VMware VCF, CA, Symantec)",
            "sharePct": 30,
            "growthNote": "$8.75B (+29% YoY) · VMware ARR +15% YoY — โตดีแต่สัดส่วนลดลงเพราะฝั่ง AI โตเร็วกว่า",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 93,
        "items": [
          {
            "item": "Custom XPU สำหรับ hyperscaler (Google TPU, Meta MTIA, ByteDance)",
            "status": "executing",
            "evidence": "ชิป AI $16.7B (+221% YoY, +54% QoQ) = 56% ของรายได้ทั้งบริษัท · ลูกค้า custom 6 ราย — Google (TPU), Anthropic (Ironwood/TPU 8i), OpenAI (Jalapeno), Meta (MTIA) และอีกสองราย"
          },
          {
            "item": "ดีล OpenAI: custom accelerator + networking ระดับ 10 GW",
            "status": "executing",
            "evidence": "ชิป Jalapeno เริ่มส่งมอบแล้วใน Q3-Q4 FY26 บริษัทระบุว่าประสิทธิภาพงาน inference เหนือกว่า Grace Blackwell และเทียบเท่า Vera Rubin · วางแผนกำลังติดตั้ง 1.3 GW สำหรับปี 2027"
          },
          {
            "item": "AI Ethernet networking (Tomahawk 5/6, Jericho3-AI, NIC/DSP)",
            "status": "executing",
            "evidence": "Tomahawk 6 ระดับ 102.4T เริ่มส่งมอบแล้ว ครองส่วนแบ่งส่วนใหญ่ของ AI cluster ที่ไม่ใช้ InfiniBand และได้แรงหนุนจากอุตสาหกรรมที่เทมาทาง open Ethernet"
          },
          {
            "item": "เทคโนโลยีรุ่นถัดไป: 3.5D packaging (XDSiP), co-packaged optics, XPU ระดับ 2nm",
            "status": "on-track",
            "evidence": "Roadmap tape-out เดินตามแผนร่วมกับ TSMC — ความสามารถออกแบบ SerDes/DSP ชั้นนำคือเหตุผลที่ hyperscaler เลือก Broadcom แทนคู่แข่ง"
          },
          {
            "item": "VMware Private AI Foundation สำหรับ enterprise AI",
            "status": "on-track",
            "evidence": "จับมือ NVIDIA ให้องค์กรรัน AI workload บน private cloud ของตัวเอง · VMware ARR ยังโต +15% YoY — ยังเล็กเทียบฝั่งชิป แต่ช่วยล็อกลูกค้าองค์กรให้อยู่ต่อในยุค AI"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองสองชั้น: (1) ฝั่งชิป — IP ระดับ SerDes/DSP และประสบการณ์ co-design กับ hyperscaler ที่ใช้เวลาสร้างหลายปี ทำให้เป็นตัวเลือกแรกของงาน custom ASIC และผูกขาดตลาด Ethernet switch silicon (2) ฝั่งซอฟต์แวร์ — VMware/CA/mainframe เป็นระบบ mission-critical ที่องค์กรย้ายออกยากมาก รวมกันได้ธุรกิจที่ทั้งโตเร็วและเก็บเกี่ยวเงินสดได้นาน",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "เบอร์หนึ่งตลาด custom AI accelerator — ชิป AI $16.7B ในไตรมาสเดียว (+221% YoY) และครอง ~80% ของ merchant Ethernet switch silicon ทั้งสองตลาดยังขยายตัวแรง"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "SerDes 200G, Tomahawk 6, 3.5D packaging และ co-packaged optics ล้ำหน้าคู่แข่ง custom ASIC (Marvell, MediaTek) อย่างชัดเจน"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "stable",
            "note": "Tape-out และ ramp เป็นไปตามแผนสม่ำเสมอ วัฒนธรรมบริหารแบบ Hock Tan เน้นวินัยมากกว่าความหวือหวา — เร็วพอและไม่พลาด"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "strengthening",
            "note": "โปรแกรม XPU เป็นงาน co-design หลายปีต่อรุ่น ย้ายผู้ผลิตกลางทางแทบเป็นไปไม่ได้ ฝั่ง VMware ยิ่งฝังลึกใน data center องค์กร"
          },
          {
            "key": "ecosystem",
            "label": "Ecosystem",
            "status": "strengthening",
            "note": "เป็นแกนนำฝั่ง open Ethernet (Ultra Ethernet) ที่อุตสาหกรรมเลือกใช้ต้าน NVLink/InfiniBand ของ NVIDIA — ยิ่ง cluster เปิดกว้าง Broadcom ยิ่งได้"
          },
          {
            "key": "developerAdoption",
            "label": "Developer adoption",
            "status": "stable",
            "note": "ไม่มี ecosystem แบบ CUDA เป็นจุดอ่อนเชิงเปรียบเทียบ แต่โมเดลธุรกิจไม่ต้องพึ่ง developer ภายนอก เพราะลูกค้า XPU (Google/Meta) เขียน software stack ของตัวเอง"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "สัญญา XPU หลายปี + บริษัทระบุว่าล็อกกำลังผลิตถึง FY2028 + VMware ที่แปลงเป็น subscription (ARR +15% YoY) ผูกลูกค้าองค์กรไว้แน่น — แต่ล่าสุดเริ่มใช้การค้ำหนี้เข้าช่วยปิดดีล ซึ่งเป็นการล็อกลูกค้าด้วยงบดุล ไม่ใช่ด้วยเทคโนโลยีล้วน"
          },
          {
            "key": "moat",
            "label": "Moat",
            "status": "strengthening",
            "note": "จำนวนลูกค้า XPU ที่เพิ่มขึ้น (รวม OpenAI) และมูลค่า networking ต่อ cluster ที่สูงขึ้นเรื่อย ๆ ทำให้คูเมืองกว้างขึ้นทุกไตรมาส"
          }
        ]
      },
      "capitalAllocation": {
        "score": 86,
        "verdict": "หนึ่งในทีมจัดสรรทุนที่ดีที่สุดของตลาดหุ้นสหรัฐฯ — ซื้อกิจการแพงแต่รีดมูลค่าได้จริงทุกครั้ง จ่ายปันผลโตต่อเนื่อง และลดหนี้อย่างมีวินัย จุดหักคะแนนเดียวคือ SBC สูงจนมี dilution สุทธิ",
        "items": [
          {
            "label": "M&A (VMware ~$69B)",
            "current": "Integration สำเร็จ แปลงเป็น subscription และขยาย margin ได้ตามแผน",
            "assessment": "good",
            "why": "ตอกย้ำ playbook เดิมที่ทำสำเร็จกับ CA และ Symantec — ซื้อสินทรัพย์ mission-critical แล้วบริหารเพื่อกระแสเงินสด"
          },
          {
            "label": "เงินปันผล",
            "current": "ปันผล $0.65/หุ้น/ไตรมาส (~$3.1B ใน Q3 FY26) เพิ่มขึ้นราว ~10%/ปีต่อเนื่องกว่าทศวรรษ",
            "assessment": "good",
            "why": "หายากมากที่หุ้นเติบโต AI จะมีวัฒนธรรมปันผลโตแบบนี้ สะท้อนความมั่นใจใน FCF ระยะยาว"
          },
          {
            "label": "การลดหนี้",
            "current": "จ่ายคืนหนี้ $5.6B ใน Q3 FY26 และอีก $1.5B หลังปิดงวด",
            "assessment": "good",
            "why": "รักษาระดับ investment grade และเปิดพื้นที่งบดุลไว้สำหรับดีลใหญ่ครั้งถัดไป"
          },
          {
            "label": "Buyback และ dilution",
            "current": "ซื้อหุ้นคืนบ้างแต่เป็นลำดับความสำคัญรอง SBC ยังสูงจนหุ้นเพิ่มสุทธิ",
            "assessment": "neutral",
            "why": "ในช่วงลดหนี้ถือว่ายอมรับได้ แต่ผู้ถือหุ้นระยะยาวควรอยากเห็น buyback กลับมาชดเชย SBC เต็มจำนวนเมื่อหนี้ลงถึงเป้า"
          },
          {
            "label": "R&D",
            "current": "~$9-10B/ปี โฟกัส XPU รุ่นถัดไป, networking และ packaging ขั้นสูง",
            "assessment": "good",
            "why": "ลงทุนเข้มข้นเฉพาะจุดที่มี moat จริง ไม่หว่านแหตามกระแส — คือที่มาของความได้เปรียบทางเทคโนโลยี"
          },
          {
            "label": "CapEx",
            "current": "ต่ำมากเทียบรายได้ (โมเดล fabless พึ่ง TSMC)",
            "assessment": "good",
            "why": "ไม่ต้องแบกภาระโรงงาน ทำให้ FCF margin ~40% ยั่งยืนแม้ในรอบลงทุนใหญ่ของอุตสาหกรรม"
          },
          {
            "label": "ค้ำหนี้ให้ลูกค้า AI (ใหม่)",
            "current": "ค้ำหนี้ระดับ senior ให้ลูกค้า AI lab — เพดานที่เปิดเผยของดีลแรก ($35B) อยู่ที่ ~$29B",
            "assessment": "neutral",
            "why": "เป็นการใช้งบดุลไปเร่งยอดขายในรูปแบบที่ Broadcom ไม่เคยทำมาก่อน ทำให้ความเสี่ยงของลูกค้ากลายเป็นความเสี่ยงของผู้ถือหุ้นทางอ้อม บริษัทบอกว่าจะพิจารณาเป็นดีล ๆ ไปจึงยังไม่มีเพดานรวม — ยังไม่มีประวัติให้ตัดสินว่าดีหรือไม่ดี จึงให้เป็นกลางไว้ก่อนและต้องติดตามทุกไตรมาส"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "~31x กำไร FY2026 (consensus non-GAAP $11.66 · 38 นักวิเคราะห์) หรือ ~18-19x ถ้าอิงประมาณการ FY2027 · ราคา ~$362, mcap ~$1.77T (11 ก.ย. 2026) · ยังจัดเป็น premium เพราะทั้งราคาและประมาณการ price-in เป้า AI FY2027 $115B และ FY2028 $230B ที่บริษัทเพิ่งประกาศ ถ้าเป้าเหล่านี้เลื่อน multiple จะหดแรงกว่าพื้นฐานที่แย่ลงจริง · ส่วนลดที่เกิดหลังงบมาจาก guide รายได้ Q4 $34.8B ต่ำกว่าที่ตลาดคาด ~$35.0B เล็กน้อย ไม่ใช่จากผลประกอบการที่ออกมา"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 → Q3 FY26)",
          "prev": "$22.19B (+48% YoY)",
          "now": "$29.59B (+86% YoY) — สถิติใหม่",
          "direction": "positive"
        },
        {
          "metric": "ชิป AI",
          "prev": "$10.8B (+143% YoY)",
          "now": "$16.7B (+221% YoY, +54% QoQ) = 56% ของรายได้ทั้งบริษัท",
          "direction": "positive"
        },
        {
          "metric": "เป้ารายได้ AI ระยะยาว",
          "prev": "FY2027 >$100B",
          "now": "FY2027 $115B และเพิ่มเป้า FY2028 $230B — บริษัทระบุว่าล็อกกำลังผลิตไว้แล้ว",
          "direction": "positive"
        },
        {
          "metric": "Guidance Q4 FY26",
          "prev": "—",
          "now": "รายได้รวม ~$34.8B (+93%) · ชิป AI $21.7B (+236%) · op margin ~66% — ต่ำกว่าที่ตลาดคาด ~$35.0B เล็กน้อย",
          "direction": "neutral"
        },
        {
          "metric": "ความเสี่ยงใหม่: ค้ำหนี้ให้ลูกค้า AI",
          "prev": "—",
          "now": "10-Q เปิดเผยการค้ำหนี้ senior ให้ลูกค้า AI lab เพดาน ~$29B จากดีลแรก $35B",
          "direction": "negative"
        },
        {
          "metric": "Gross margin",
          "prev": "~77%",
          "now": "guide Q4 ~73% — เจือจางจาก mix XPU ที่มีหน่วยความจำมากขึ้น",
          "direction": "negative"
        }
      ],
      "risks": [
        "ค้ำหนี้ให้ลูกค้า AI — 10-Q เปิดเผยว่า Broadcom ค้ำหนี้ระดับ senior ให้ลูกค้า AI lab โดยเพดานของดีลแรก ($35B) อยู่ที่ ~$29B และบริษัทบอกเองว่าจะพิจารณาเป็นดีล ๆ ไปจึงยังไม่มีเพดานรวม ทำให้ความเสี่ยงเครดิตของลูกค้ากลายเป็นความเสี่ยงของผู้ถือหุ้นทางอ้อม เป็นความเสี่ยงรูปแบบใหม่ที่งบดุลเดิมไม่เคยมี",
        "การกระจุกตัวของลูกค้าที่รุนแรงขึ้น — ชิป AI เป็น 56% ของรายได้แล้ว (จาก 49%) และมาจาก hyperscaler เพียงไม่กี่ราย ขณะที่ซอฟต์แวร์ที่เคยเป็นกันชนลดสัดส่วนเหลือ ~30% หากลูกค้ารายใดชะลอ CapEx หรือเปลี่ยน roadmap ภายใน ผลกระทบจะแรงกว่าเดิม",
        "เป้า FY2027-FY2028 สูงจนไม่มีที่ให้พลาด — บริษัทประกาศเป้า AI $115B (FY2027) และ $230B (FY2028) ซึ่งราคาหุ้น price-in ไปแล้วบางส่วน นักวิเคราะห์บางรายตั้งคำถามว่าต้องยกเป้าทุกไตรมาสเพื่อรักษาความคาดหวัง หากเลื่อนแม้ไตรมาสเดียว multiple จะหดแรงกว่าพื้นฐานที่แย่ลงจริง",
        "ทิศทาง margin ขาขึ้นจบแล้ว — mix XPU ที่มีหน่วยความจำมากขึ้นเจือจาง gross margin (guide Q4 ~73% จาก ~77%) การโตของกำไรจากนี้ต้องพึ่งปริมาณเป็นหลัก ไม่ใช่ margin ที่ขยายต่อ",
        "การตอบโต้ของ NVIDIA และคู่แข่ง custom ASIC — NVIDIA เปิด NVLink Fusion และกดดันด้านราคา/ระบบครบวงจร ขณะที่ Marvell และ MediaTek แย่งชิงดีล XPU รายใหม่",
        "หนี้จากดีล VMware บวกความเสี่ยง key-man — แม้ลดหนี้เร็วขึ้น ($7.1B ในไตรมาสเดียว) แต่ Hock Tan อายุ 70+ ปี และ thesis ส่วนใหญ่ผูกกับฝีมือการจัดสรรทุนของเขาโดยตรง"
      ],
      "asOf": "2026-09",
      "history": {
        "fyNote": "ปีบัญชีของ Broadcom สิ้นสุดราวสัปดาห์แรกของเดือน พ.ย. (52/53 สัปดาห์) — FY2021 สิ้นสุด 31 ต.ค. 2021, FY2022 สิ้นสุด 30 ต.ค. 2022, FY2023 สิ้นสุด 29 ต.ค. 2023, FY2024 สิ้นสุด 3 พ.ย. 2024, FY2025 สิ้นสุด 2 พ.ย. 2025 (รายงานผลเดือน ธ.ค. 2025)",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับ 10:1 split ก.ค. 2024 ทุกปี)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-10",
            "revenueB": 27.5,
            "epsAdj": 1.5,
            "opMarginPct": 31,
            "fcfB": 13.3,
            "priceFYEnd": 53.17
          },
          {
            "fy": "FY2022",
            "endYm": "2022-10",
            "revenueB": 33.2,
            "epsAdj": 2.65,
            "opMarginPct": 42.8,
            "fcfB": 16.3,
            "priceFYEnd": 47.29
          },
          {
            "fy": "FY2023",
            "endYm": "2023-10",
            "revenueB": 35.8,
            "epsAdj": 3.3,
            "opMarginPct": 45.2,
            "fcfB": 17.6,
            "priceFYEnd": 83.84
          },
          {
            "fy": "FY2024",
            "endYm": "2024-11",
            "revenueB": 51.6,
            "epsAdj": 1.23,
            "opMarginPct": 26.1,
            "fcfB": 19.4,
            "priceFYEnd": 168.92
          },
          {
            "fy": "FY2025",
            "endYm": "2025-11",
            "revenueB": 63.9,
            "epsAdj": 4.77,
            "opMarginPct": 39.9,
            "fcfB": 26.9,
            "priceFYEnd": 369.63
          }
        ],
        "notes": "EPS และราคาหุ้นปรับ 10:1 split (ก.ค. 2024) ให้เป็นฐานปัจจุบันทุกปีแล้ว (เช่น FY2021 EPS ก่อน split = $15.00, FY2022 = $26.53, FY2023 = $32.98) — ตรวจสอบกับ press release ทางการของบริษัทและ stockanalysis.com ตรงกัน; GAAP EPS และ operating margin ของ FY2024-FY2025 ถูกกดต่ำอย่างมากจาก amortization ของ intangibles และค่าใช้จ่ายจากดีล VMware (ปิดดีล พ.ย. 2023) — non-GAAP EPS คร่าว ๆ: FY2024 ~$4.87, FY2025 ~$6.8 สูงกว่า GAAP มาก; จำนวนหุ้น diluted เพิ่มจาก ~4.3 พันล้านหุ้นเป็น ~4.8 พันล้านหุ้นใน FY2024 เพราะออกหุ้นซื้อ VMware (ไม่ใช่ความผิดพลาดของการปรับ split); FCF = OCF ลบ capex (เช่น FY2025 = 27.537-0.623 = 26.9); ราคาสิ้นปีบัญชีใช้ราคาปิดวันซื้อขายสุดท้ายของปีบัญชี (29 ต.ค. 2021, 28 ต.ค. 2022, 27 ต.ค. 2023, 1 พ.ย. 2024, 31 ต.ค. 2025) จาก Yahoo Finance แบบ split-adjusted; ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~2-3%); [ปรับ ก.ย. 2026] ราคาปิดรายไตรมาส (priceQEnd) เดิมไม่ตรงกับราคาปิดจริง 8 จาก 12 แถว และ 2 ค่า (Q1 FY24 = 119.27, Q2 FY26 = 220) ไม่ตรงกับราคาปิดวันใดเลยในรอบ 6 ปี จึงคำนวณใหม่ทั้งชุดด้วยกติกาเดียว: ราคาปิด split-adjusted ของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด (ตรวจสอบแล้วว่าแถว Q4 ของแต่ละปีตรงกับ priceFYEnd ของปีนั้นทุกปี ซึ่งเดิมขัดกัน)",
        "sources": [
          "https://stockanalysis.com/stocks/AVGO/financials/",
          "https://stockanalysis.com/stocks/AVGO/financials/cash-flow-statement/",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2022-financial-results-and-quarterly-dividend-301698763.html",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2023-financial-results-and-quarterly-dividend-302009464.html",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2025-financial-results-and-quarterly-dividend-302639606.html",
          "https://query1.finance.yahoo.com/v8/finance/chart/AVGO (historical daily closes, split-adjusted)"
        ],
        "quarters": [
          {
            "q": "Q3 FY23",
            "endYm": "2023-07",
            "revenueB": 8.88,
            "epsAdj": 0.77,
            "opMarginPct": 43.4,
            "fcfB": 4.6,
            "priceQEnd": 89.98
          },
          {
            "q": "Q4 FY23",
            "endYm": "2023-10",
            "revenueB": 9.3,
            "epsAdj": 0.83,
            "opMarginPct": 45.6,
            "fcfB": 4.72,
            "priceQEnd": 83.84,
            "endDate": "2023-10-29"
          },
          {
            "q": "Q1 FY24",
            "endYm": "2024-02",
            "revenueB": 11.96,
            "epsAdj": 0.28,
            "opMarginPct": 17.4,
            "fcfB": 4.69,
            "priceQEnd": 122.43
          },
          {
            "q": "Q2 FY24",
            "endYm": "2024-05",
            "revenueB": 12.49,
            "epsAdj": 0.44,
            "opMarginPct": 23.7,
            "fcfB": 4.45,
            "priceQEnd": 127.81
          },
          {
            "q": "Q3 FY24",
            "endYm": "2024-08",
            "revenueB": 13.07,
            "epsAdj": -0.4,
            "opMarginPct": 29,
            "fcfB": 4.79,
            "priceQEnd": 143.82
          },
          {
            "q": "Q4 FY24",
            "endYm": "2024-11",
            "revenueB": 14.05,
            "epsAdj": 0.9,
            "opMarginPct": 32.9,
            "fcfB": 5.48,
            "priceQEnd": 168.92,
            "endDate": "2024-11-03"
          },
          {
            "q": "Q1 FY25",
            "endYm": "2025-02",
            "revenueB": 14.92,
            "epsAdj": 1.14,
            "opMarginPct": 42,
            "fcfB": 6.01,
            "priceQEnd": 221.27
          },
          {
            "q": "Q2 FY25",
            "endYm": "2025-05",
            "revenueB": 15,
            "epsAdj": 1.03,
            "opMarginPct": 38.9,
            "fcfB": 6.41,
            "priceQEnd": 203.64
          },
          {
            "q": "Q3 FY25",
            "endYm": "2025-08",
            "revenueB": 15.95,
            "epsAdj": 0.85,
            "opMarginPct": 36.9,
            "fcfB": 7.02,
            "priceQEnd": 288.64,
            "endDate": "2025-08-03"
          },
          {
            "q": "Q4 FY25",
            "endYm": "2025-11",
            "revenueB": 18.02,
            "epsAdj": 1.74,
            "opMarginPct": 41.7,
            "fcfB": 7.47,
            "priceQEnd": 369.63,
            "endDate": "2025-11-02"
          },
          {
            "q": "Q1 FY26",
            "endYm": "2026-02",
            "revenueB": 19.31,
            "epsAdj": 1.5,
            "opMarginPct": 44.3,
            "fcfB": 8.01,
            "priceQEnd": 331.3,
            "endDate": "2026-02-01"
          },
          {
            "q": "Q2 FY26",
            "endYm": "2026-05",
            "revenueB": 22.19,
            "epsAdj": 1.91,
            "opMarginPct": 48.6,
            "fcfB": 10.26,
            "priceQEnd": 421.28,
            "endDate": "2026-05-03"
          },
          {
            "q": "Q3 FY26",
            "endYm": "2026-08",
            "revenueB": 29.59,
            "epsAdj": 2.68,
            "opMarginPct": 53.9,
            "fcfB": 13.67,
            "priceQEnd": 389.28,
            "endDate": "2026-08-02",
            "epsNote": "GAAP $2.68 vs non-GAAP $3.32 — ส่วนต่าง ~$0.64/หุ้นมาจาก amortization ของ intangibles ดีล VMware (รายการต่อเนื่อง ไม่ใช่รายการพิเศษครั้งเดียว)"
          }
        ]
      },
      "nextEarnings": "2026-12-09",
      "forwardView": {
        "asOf": "2026-09",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 11.63,
            "revenue": 106
          },
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 11.66,
            "revenue": 106
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 FY26",
            "metric": "revenue",
            "guided": "~$29.4B",
            "actual": "~$29.59B",
            "result": "inline",
            "magnitudePct": 0.6
          },
          {
            "quarter": "Q2 FY26",
            "metric": "revenue",
            "guided": "~$22.0B",
            "actual": "~$22.2B",
            "result": "beat",
            "magnitudePct": 1.1
          },
          {
            "quarter": "Q1 FY26",
            "metric": "revenue",
            "guided": "~$19.1B",
            "actual": "~$19.31B",
            "result": "beat",
            "magnitudePct": 1.1
          },
          {
            "quarter": "Q4 FY25",
            "metric": "revenue",
            "guided": "~$17.4B",
            "actual": "~$18.0B",
            "result": "beat",
            "magnitudePct": 3.4
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 106,
            "eps": 11.66,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 19.53,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "Broadcom ให้ guidance รายได้เป็นค่าเดี่ยว (ไม่ใช่ช่วง) ทุกไตรมาส · สถิติ 4 ไตรมาสล่าสุด: beat 3 ครั้งขนาดเล็ก (1.1-3.4%) และ Q3 FY26 ออกมา inline (+0.6% ซึ่งอยู่ในช่วง ±1%) — สตรีค beat จบลงพอดีกับที่ราคาหุ้นย่อ · guidance Q4 FY26 = ~$34.8B พร้อมชิป AI $21.7B (+236% YoY) ต่ำกว่า consensus รายได้ ~$35.0B เล็กน้อยแต่ชิป AI สูงกว่าที่คาด ~$21.3B · เป้าบริษัท: AI FY2027 $115B และ FY2028 $230B · consensus FY2026 = รายได้ $106B / EPS $11.66 non-GAAP (38 นักวิเคราะห์ ยืนยันฐานจาก stockanalysis.com) — KB เก็บ EPS ประวัติเป็น GAAP จึงเป็นคนละฐานกัน · ตัวเลข FY2027 EPS $19.53 ยังเป็น consensus ก่อนงบ Q3 เพราะหา aggregate หลังงบแบบเปิดเผยฟรีไม่ได้ พบเพียงการปรับรายสำนัก (Truist ลดจาก $22.35 เป็น $21.12) จึงคง confidence ไว้ที่ medium"
      }
    },
    "AMD": {
      "ticker": "AMD",
      "name": "Advanced Micro Devices",
      "layer": "gpu",
      "thesis": {
        "statement": "AMD คือ 'ทางเลือกอันดับสอง' ที่น่าเชื่อถือที่สุดของโลกรองจาก NVIDIA ในชิป AI — มีครบทั้ง CPU (EPYC), GPU (Instinct MI350/MI450) และระบบ rack-scale (Helios จากดีล ZT Systems) ดีล OpenAI 6GW และ Oracle ที่ประกาศปลายปี 2025 เป็นจุดเปลี่ยนที่พิสูจน์ว่า hyperscaler ต้องการซัพพลายเออร์รายที่สองจริง หากบริษัท execute แผน MI450 ปี 2026 ได้ตามเป้า รายได้ data center AI ระดับหลายหมื่นล้านดอลลาร์และเป้า EPS ~$20 ระยะยาวจะไม่ใช่แค่ความฝัน",
        "pillars": [
          "ดีล OpenAI 6GW (เริ่มส่งมอบ MI450 ครึ่งหลังปี 2026) + Oracle ~50,000 GPU เป็น anchor customer ที่ล็อกดีมานด์หลายปี",
          "EPYC กินส่วนแบ่งรายได้ server CPU จาก Intel ต่อเนื่องจนเกิน ~40% — เป็นฐานกำไรและความสัมพันธ์ hyperscaler ที่แข็งแรง",
          "จังหวะออกสินค้าแบบรายปี (MI300→MI350→MI400/Helios) ไล่ทัน cadence ของ NVIDIA แล้ว",
          "ROCm พัฒนาเร็วขึ้นมาก มี day-0 support โมเดลหลัก ๆ — ช่องว่างซอฟต์แวร์กับ CUDA แคบลงโดยเฉพาะฝั่ง inference",
          "งบดุลแข็งแรงระดับ net cash และโมเดล fabless ทำให้ FCF ไม่ถูกกดด้วย capex หนักเหมือนผู้เล่น infrastructure"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+50% YoY (Q2 2026 — $11.5B สถิติใหม่) · Data Center $6.7B +107% (58% ของรายได้) · Client & Gaming/Embedded ประคอง",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "การเติบโตเร่งขึ้นอีก (Q1 +38% → Q2 +50%) นำโดย Data Center ที่เกือบเท่าตัว YoY — EPYC ชิงส่วนแบ่ง server + Instinct GPU ramp เป็นของจริงระดับพันล้าน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "non-GAAP EPS $1.66 (Q2 2026) ชนะคาด ~$1.62 · GAAP EPS $1.38 · net income non-GAAP $2.8B",
          "trend": "up",
          "score": 83,
          "impact": "positive",
          "why": "กำไรโตเร็วตามรายได้ Data Center — ช่องว่าง GAAP/non-GAAP ยังกว้างจาก amortization (Xilinx/ZT) และ SBC แต่แนวโน้มกำไรจริงชัดขึ้นทุกไตรมาส"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF สถิติใหม่ ~$2.6B (Q1 2026, FCF margin ~25%)",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "กระแสเงินสดพุ่งตามกำไรและวินัยเงินทุนหมุนเวียน — แปลงกำไรเป็นเงินสดได้ดีขึ้นมากเทียบปีก่อน"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "non-GAAP gross margin ~54% (Q2 2026) · guide Q3 ~56% — ไต่ขึ้นตาม mix Data Center/GPU",
          "trend": "up",
          "score": 72,
          "impact": "neutral",
          "why": "margin ฟื้นและขยายตามสัดส่วน Data Center ที่ margin สูงกว่า — แต่ยังต่ำกว่า NVIDIA มากเพราะ mix ยังมี Client/console ปนและ GPU ยังไล่ตามด้านต้นทุน"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ไต่ขึ้นตามกำไร แต่ยังถูกกดด้วย amortization จากดีล Xilinx",
          "trend": "up",
          "score": 65,
          "impact": "neutral",
          "why": "ไต่ขึ้นตามกำไรที่โตเร็ว แต่ยังถูกกดด้วย amortization/goodwill จากดีล Xilinx และ ZT Systems"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสดและเงินลงทุน ~$7B+",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "เงินสดมากกว่าหนี้ (net cash) เพียงพอสำหรับ ramp สินค้าคงคลัง AI, R&D และ M&A ขนาดกลางโดยไม่ต้องกู้เพิ่ม — ยืดหยุ่นกว่าคู่แข่งที่งบดุลตึง"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาว ~$3B — สถานะ net cash",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "ภาระหนี้ต่ำมากเทียบกับขนาดบริษัทและ EBITDA — แทบไม่มีความเสี่ยงทางการเงิน ต่างจากยุคก่อนปี 2018 ที่หนี้เคยเกือบทำให้บริษัทล้ม"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "SBC ปกติ + warrant ให้ OpenAI สูงสุด ~160M หุ้น (~10% ของหุ้นทั้งหมด)",
          "trend": "down",
          "score": 45,
          "impact": "negative",
          "why": "warrant ผูกกับ milestone การส่งมอบ 6GW และราคาหุ้นที่สูงขึ้นมาก — ถ้าเจือจางจริงแปลว่ารายได้มหาศาลเข้ามาแล้ว แต่ก็เป็น ~10% dilution ที่ผู้ถือหุ้นต้องนับรวมในโมเดล ถือเป็นต้นทุนของดีลที่แพงที่สุดข้อหนึ่ง"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "เทน้ำหนักไป R&D และดีลเชิงกลยุทธ์ (ZT Systems) มากกว่า buyback",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "ซื้อ ZT Systems ~$4.9B แล้วขายส่วนโรงงานให้ Sanmina ~$3B เก็บเฉพาะทีมออกแบบ rack-scale — เป็นดีลที่ฉลาดและตรงยุทธศาสตร์ Buyback ชะลอลงเพื่อเก็บกระสุน ramp AI ซึ่งเหมาะสมกับจังหวะ"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~55-65x (หลังงบ Q2 หุ้นร่วง ~8% + EPS โตไล่ทัน) · ยังแพงสาย AI compute",
          "trend": "flat",
          "score": 36,
          "impact": "negative",
          "why": "แพงแต่กำไรเริ่มโตไล่ทัน multiple เร็วขึ้น (Q3 guide +41%, DC เท่าตัว) — ตลาดหักคะแนนหลังงบทั้งที่ beat เพราะคาดสูงเกินและกังวล margin/inventory · margin of safety ยังบาง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 68,
        "recurringPct": null,
        "note": "คุณภาพรายได้ดีขึ้นเชิงโครงสร้าง — สัดส่วน Data Center พุ่งเป็น 58% ของรายได้ (จาก GPU/EPYC ที่ margin สูงและ recurring จากลูกค้า hyperscaler) · Client/Gaming เป็นวัฏจักรและ Embedded ทยอยฟื้น — mix กำลังเอียงไปทาง AI compute มากขึ้นเรื่อย ๆ",
        "segments": [
          {
            "name": "Data Center (EPYC + Instinct GPU)",
            "sharePct": 58,
            "growthNote": "$6.7B (+107% YoY) — เครื่องยนต์หลัก, EPYC ชิงแชร์ server + Instinct GPU ramp",
            "trend": "up"
          },
          {
            "name": "Client & Gaming (Ryzen, Radeon, คอนโซล)",
            "sharePct": 34,
            "growthNote": "ประคองตัว — Ryzen แข็ง, gaming/คอนโซลชะลอตามวัฏจักร",
            "trend": "flat"
          },
          {
            "name": "Embedded (Xilinx FPGA)",
            "sharePct": 8,
            "growthNote": "ทยอยฟื้นจากช่วง destocking",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 76,
        "items": [
          {
            "item": "Instinct MI350 series (เปิดตัว มิ.ย. 2026)",
            "status": "executing",
            "evidence": "เคลม ~4x AI compute และ ~35x inference เทียบ MI300 — Data Center GPU ramp ดันรายได้ DC เกือบเท่าตัว YoY"
          },
          {
            "item": "Instinct MI400 / Helios rack-scale (2026+)",
            "status": "on-track",
            "evidence": "โรดแมป rack-scale ชน NVIDIA rubin/GB — เป็นตัวพิสูจน์ว่า AMD แข่งระดับระบบได้ ไม่ใช่แค่ชิปเดี่ยว"
          },
          {
            "item": "ดีล OpenAI (warrant สูงสุด ~160M หุ้น)",
            "status": "on-track",
            "evidence": "ลูกค้า AI ระดับ frontier ยืนยันดีมานด์ Instinct — แลกกับ dilution ที่ต้องจับตา"
          },
          {
            "item": "EPYC ชิงส่วนแบ่ง server CPU",
            "status": "executing",
            "evidence": "server CPU โตแรง (แชร์เพิ่มต่อเนื่องจาก Intel) — ฐานกำไร Data Center ที่มั่นคงหนุน GPU ramp"
          },
          {
            "item": "ROCm software stack",
            "status": "on-track",
            "evidence": "ยังตามหลัง CUDA มาก — เป็นคอขวดสำคัญของการแข่งฝั่ง GPU ที่ต้องเร่ง"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "moat ของ AMD มาจากสามชั้น: (1) x86 duopoly — โลกมีแค่ Intel กับ AMD ที่ทำ server CPU x86 ได้ และตอนนี้ AMD คือฝ่ายชนะเชิงเทคโนโลยี (2) เป็นบริษัทเดียวนอกจาก NVIDIA ที่มี GPU data center ระดับ frontier พร้อม roadmap รายปี + rack-scale ครบวงจร (3) ความเชี่ยวชาญ chiplet/advanced packaging ที่สะสมมาก่อนใคร จุดอ่อนเชิง moat คือซอฟต์แวร์ — ROCm ยังไม่สร้าง lock-in แบบ CUDA ทำให้ AMD ชนะด้วย 'ของดี ราคาคุ้ม เปิดกว้าง' มากกว่าการล็อกลูกค้า",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "เป็นเบอร์สองใน AI GPU ที่ทิ้งห่างเบอร์สาม และเป็นผู้ชนะใน server CPU (ส่วนแบ่งรายได้ >~40% และเพิ่มขึ้น) — แต่ยังห่างจาก NVIDIA ใน accelerator มาก (ส่วนแบ่งหลักเดียว)"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "เด่นเรื่อง chiplet, ความจุ/แบนด์วิดท์ HBM ต่อการ์ด และ perf/TCO ฝั่ง inference — แต่ระดับระบบ (interconnect, ซอฟต์แวร์, rack integration) NVIDIA ยังนำหนึ่งก้าว"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ไล่ทัน cadence รายปีของ NVIDIA แล้ว (MI300→MI350→MI400) และปิดดีล ZT/ขายโรงงานต่อได้เร็ว — ประวัติ execution ของทีม Lisa Su ตั้งแต่ Zen คือดีที่สุดในอุตสาหกรรม"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "ดาบสองคม: ลูกค้าย้ายออกจาก AMD ง่าย (ไม่มี lock-in แบบ CUDA) แต่ก็แปลว่าย้ายเข้าง่ายเช่นกัน — workload inference ที่ portable ขึ้นเรื่อย ๆ กำลังลดกำแพง CUDA ซึ่งเป็นผลบวกสุทธิต่อ AMD"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "แนวร่วม 'มาตรฐานเปิด' ขยายเร็ว — OpenAI, Oracle, Meta, Microsoft ใช้ Instinct จริง, UALink มีพันธมิตรทั้งอุตสาหกรรม — แต่ขนาดรวมยังเล็กกว่าจักรวาล CUDA มาก"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "strengthening",
            "note": "ROCm ใช้งานได้จริงบน framework หลักและมี day-0 model support แล้ว นักพัฒนาเริ่มมองเป็นทางเลือกจริงจัง — โตจากฐานต่ำ ยังห่าง CUDA หลายเท่าตัวทั้งจำนวนคนและเครื่องมือ"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "เปลี่ยนจากขายเป็นรอบ ๆ มาเป็นสัญญาหลายปี — ดีล 6GW กับ OpenAI พร้อม warrant ผูกผลประโยชน์ และ design win rack-scale ทำให้ลูกค้าถอนตัวยากขึ้นกว่ายุคขายการ์ดเดี่ยว"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "x86 duopoly + ตำแหน่ง 'ทางเลือกเดียวที่จริงจัง' ของ NVIDIA ในโลกที่ทุก hyperscaler อยากมี second source — moat กว้างขึ้นทุกไตรมาสที่ ROCm แคบช่องว่างกับ CUDA"
          }
        ]
      },
      "capitalAllocation": {
        "score": 70,
        "verdict": "จัดสรรทุนแบบ 'ทุ่มเพื่อชิงหน้าต่าง AI' อย่างมีวินัย — R&D และดีลเชิงกลยุทธ์มาก่อน buyback ซึ่งถูกต้องกับจังหวะนี้ จุดที่ต้องจับตาคือ dilution จาก warrant OpenAI ที่เป็นต้นทุนแฝงก้อนใหญ่ที่สุด",
        "items": [
          {
            "label": "R&D",
            "current": "~$7B/ปี และเพิ่มขึ้นเร็ว — เทไปที่ Instinct roadmap, ROCm และ rack-scale",
            "assessment": "good",
            "why": "นี่คือสงครามที่ชนะด้วย R&D — การเร่ง cadence เป็นรายปีและปิดช่องว่างซอฟต์แวร์คือการใช้เงินที่ให้ผลตอบแทนสูงสุดของบริษัท"
          },
          {
            "label": "M&A (ZT Systems)",
            "current": "ซื้อ ~$4.9B ต้นปี 2025 แล้วขายธุรกิจโรงงานให้ Sanmina ~$3B เก็บทีมออกแบบไว้",
            "assessment": "good",
            "why": "ได้ความสามารถ rack-scale ที่จำเป็นต่อ MI450/Helios ด้วยต้นทุนสุทธิต่ำมาก และไม่ต้องแบกธุรกิจ manufacturing margin ต่ำ — เป็นตัวอย่างการทำดีลที่เฉียบคม"
          },
          {
            "label": "Buyback",
            "current": "มี authorization หลายพันล้านดอลลาร์ แต่ซื้อคืนช้าลงชัดเจนช่วง ramp AI",
            "assessment": "neutral",
            "why": "เข้าใจได้ที่เก็บเงินสดไว้หนุน working capital ของ MI450 — แต่แปลว่า buyback ยังไม่พอชดเชย SBC ทำให้จำนวนหุ้นไม่ลดลง"
          },
          {
            "label": "การเจือจาง (SBC + warrant OpenAI)",
            "current": "SBC ระดับปกติของ semi บวก warrant สูงสุด ~160M หุ้นผูก milestone 6GW",
            "assessment": "neutral",
            "why": "warrant คือราคาที่จ่ายเพื่อล็อกลูกค้า AI ที่ใหญ่ที่สุดในโลก — ถ้า exercise เต็มคือ dilution ~10% แต่แลกกับรายได้ระดับหลายหมื่นล้านดอลลาร์ ถือว่าโครงสร้าง align ผลประโยชน์ได้ฉลาด แม้ไม่ฟรี"
          },
          {
            "label": "CapEx",
            "current": "ต่ำตามโมเดล fabless — พึ่ง TSMC สำหรับการผลิตทั้งหมดของชิปหลัก",
            "assessment": "good",
            "why": "ไม่ต้องเผาเงินสร้างโรงงานเอง ทำให้ FCF margin มี upside สูงเมื่อรายได้สเกล — ความเสี่ยงถูกย้ายไปอยู่ที่การจองกำลังผลิต TSMC แทน"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่จ่ายปันผล",
            "assessment": "neutral",
            "why": "เหมาะสมกับบริษัท growth ที่ผลตอบแทนจากการลงทุนภายในสูงกว่าการคืนเงินสดมาก"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~55-65x (หลังงบ Q2 2026 หุ้นร่วง ~8% แม้ beat) — ยังแพงในกลุ่ม AI compute แต่กำไรกำลังโตไล่ทัน multiple เร็วขึ้น (Data Center เกือบเท่าตัว YoY, Q3 guide +41%) · เดิมพันที่ตลาดจ่ายล่วงหน้าคือ MI350/MI400 ramp + ดีล OpenAI · ถ้า execution รายไตรมาสสะดุด หุ้นเหวี่ยงแรง — ความเสี่ยง valuation ยังสูงสุดในสาย AI compute"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 2026)",
          "prev": "Q1'26 $10.3B (+38%)",
          "now": "$11.5B (+50% YoY) — สถิติใหม่",
          "direction": "positive"
        },
        {
          "metric": "Data Center",
          "prev": "Q1'26 $5.8B (+57%)",
          "now": "$6.7B (+107% YoY, 58% ของรายได้)",
          "direction": "positive"
        },
        {
          "metric": "non-GAAP EPS",
          "prev": "$1.37",
          "now": "$1.66 (ชนะคาด ~$1.62)",
          "direction": "positive"
        },
        {
          "metric": "Guidance ไตรมาสถัดไป (Q3)",
          "prev": "Q2 guide ~$11.2B",
          "now": "$12.7-13.3B (+~41% YoY, เหนือคาด $12.5B)",
          "direction": "positive"
        },
        {
          "metric": "ปฏิกิริยาราคาหลังงบ",
          "prev": "—",
          "now": "ร่วง ~8% แม้ beat (ตลาดคาดสูงเกิน · กังวล margin/inventory)",
          "direction": "negative"
        }
      ],
      "risks": [
        "Execution risk ปี 2026 กระจุกที่ MI450/Helios (GPU ตัวแรกบน TSMC 2nm) — ถ้า ramp สะดุด (yield, HBM supply, rack integration) ราคาหุ้นที่ price-in ความสำเร็จไว้เกือบเต็มจะปรับลงแรง",
        "Valuation ~65-75x forward — แพงที่สุดในกลุ่มสาย AI compute margin of safety บางมาก หุ้นเหวี่ยงแรงตามข่าว execution รายไตรมาส",
        "ช่องว่างซอฟต์แวร์กับ CUDA ยังกว้าง โดยเฉพาะ training — ถ้า ROCm ตามไม่ทัน ลูกค้าอาจใช้ AMD แค่เป็นเครื่องมือต่อรองราคากับ NVIDIA",
        "การกระจุกตัวของ upside ที่ OpenAI — ดีล 6GW + warrant ~160M หุ้น (~10%) ผูกกับลูกค้ารายเดียวที่ยังขาดทุนหนักและพึ่งการระดมทุน (ความเสี่ยง circular financing ของทั้งอุตสาหกรรม AI)",
        "โดนบีบสองทาง: NVIDIA Rubin จากด้านบน + custom ASIC ของ hyperscaler (TPU, Trainium, MTIA) กินงาน inference ปริมาณมาก · และพึ่ง TSMC/ไต้หวันเกือบ 100% + ข้อจำกัดส่งออกจีน (บทเรียน MI308)"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดปลายเดือนธันวาคม (สัปดาห์สุดท้ายของ ธ.ค.) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลเมื่อ 3 ก.พ. 2026",
        "epsBasis": "diluted GAAP (ไม่เคยแตกหุ้นในช่วงนี้ จึงเป็น current share basis อยู่แล้ว)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 16.4,
            "epsAdj": 2.57,
            "opMarginPct": 22.2,
            "fcfB": 3.2,
            "priceFYEnd": 143.9
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 23.6,
            "epsAdj": 0.84,
            "opMarginPct": 5.4,
            "fcfB": 3.1,
            "priceFYEnd": 64.77
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 22.7,
            "epsAdj": 0.53,
            "opMarginPct": 1.8,
            "fcfB": 1.1,
            "priceFYEnd": 147.41
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 25.8,
            "epsAdj": 1,
            "opMarginPct": 7.4,
            "fcfB": 2.4,
            "priceFYEnd": 120.79
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 34.6,
            "epsAdj": 2.65,
            "opMarginPct": 10.7,
            "fcfB": 6.7,
            "priceFYEnd": 214.16
          }
        ],
        "notes": "ไม่มีการแตกหุ้นในช่วง FY2021-FY2025 ราคาและ EPS จึงเป็นฐานหุ้นปัจจุบันอยู่แล้ว | GAAP EPS ตั้งแต่ FY2022 ถูกกดต่ำมากจากค่าตัดจำหน่าย intangible ของดีล Xilinx (ประมาณปีละ $2-3B) — non-GAAP EPS สูงกว่ามาก: FY2021 $2.79, FY2022 $3.50, FY2023 $2.65, FY2024 $3.31, FY2025 $4.17 | จำนวนหุ้น diluted กระโดดจาก ~1.23B (FY2021) เป็น ~1.6B (FY2022 เป็นต้นไป) เพราะซื้อ Xilinx ด้วยหุ้นล้วน ไม่ใช่ error จาก split | FY2025 มี net charge ~$440M จาก export control ชิป MI308 (GAAP op margin จริงต่ำกว่าศักยภาพเล็กน้อย) และ FCF พุ่งเป็น $6.7B ตามรอบ Data Center/AI | ตัวเลขปัดเศษตามเกณฑ์ curated KB (~2-3%)",
        "sources": [
          "https://www.amd.com/en/newsroom/press-releases/2026-2-3-amd-reports-fourth-quarter-and-full-year-2025-fina.html",
          "https://www.amd.com/en/newsroom/press-releases/2025-2-4-amd-reports-fourth-quarter-and-full-year-2024-fina.html",
          "https://www.amd.com/en/newsroom/press-releases/2024-1-30-amd-reports-fourth-quarter-and-full-year-2023-fina.html",
          "https://ir.amd.com/news-events/press-releases/detail/1044/amd-reports-fourth-quarter-and-full-year-2021-financial-results",
          "https://stockanalysis.com/stocks/amd/financials/cash-flow-statement/",
          "https://www.macrotrends.net/stocks/charts/AMD/amd/free-cash-flow",
          "https://www.statmuse.com/money/ask/amd-stock-price-on-december-31-2025"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 5.8,
            "epsAdj": 0.18,
            "opMarginPct": 3.9,
            "fcfB": 0.3,
            "priceQEnd": 102
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 6.17,
            "epsAdj": 0.41,
            "opMarginPct": 5.5,
            "fcfB": 1.1,
            "priceQEnd": 147
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 5.47,
            "epsAdj": 0.07,
            "opMarginPct": 0.7,
            "fcfB": 0.4,
            "priceQEnd": 180
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 5.84,
            "epsAdj": 0.16,
            "opMarginPct": 4.6,
            "fcfB": 0.44,
            "priceQEnd": 162
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 6.82,
            "epsAdj": 0.47,
            "opMarginPct": 10.6,
            "fcfB": 0.5,
            "priceQEnd": 164
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 7.66,
            "epsAdj": 0.3,
            "opMarginPct": 11.4,
            "fcfB": 1.09,
            "priceQEnd": 121
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 7.44,
            "epsAdj": 0.44,
            "opMarginPct": 10.8,
            "fcfB": 0.73,
            "priceQEnd": 102
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 7.69,
            "epsAdj": 0.54,
            "opMarginPct": -1.7,
            "fcfB": 0.27,
            "priceQEnd": 142
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 9.25,
            "epsAdj": 0.77,
            "opMarginPct": 13.7,
            "fcfB": 1.9,
            "priceQEnd": 160
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 10.27,
            "epsAdj": 0.92,
            "opMarginPct": 17.1,
            "fcfB": 2.38,
            "priceQEnd": 214
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 10.25,
            "epsAdj": 0.84,
            "opMarginPct": 14.4,
            "fcfB": 2.57,
            "priceQEnd": 202
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 11.54,
            "epsAdj": 1.38,
            "opMarginPct": 17.3,
            "fcfB": 1.56,
            "priceQEnd": 570
          }
        ]
      },
      "nextEarnings": "2026-11",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 7.56,
            "revenue": 50.8
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~$11.2B ±$0.3B",
            "actual": "~$11.5B",
            "result": "beat",
            "magnitudePct": 2.7
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "~$9.8B ±$0.3B",
            "actual": "~$10.3B",
            "result": "beat",
            "magnitudePct": 5.1
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "~$9.6B ±$0.3B",
            "actual": "~$10.3B",
            "result": "beat",
            "magnitudePct": 7.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 50.8,
            "eps": 7.56,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 15.46,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "AMD ให้ guidance รายได้เป็นค่ากลาง ±$300M ทุกไตรมาส — ยืนยันได้ 3 ไตรมาส beat ทุกครั้ง และขนาด beat แคบลงเรื่อย ๆ (7.3% → 5.1% → 2.7%) · guidance Q3 2026 = ~$13.0B ±$0.3B (+41% YoY) · consensus FY2026 EPS ~$7.56 / FY2027 ~$15.46 (44 นักวิเคราะห์ · non-GAAP ต่างจากตาราง KB ที่เป็น GAAP) · FY2027 revenue อยู่หลัง paywall จึงเว้นไว้ · ไม่ใส่ endDate เพราะ AMD จบงวดวันเสาร์ (ไม่ตรงสิ้นเดือน) และยังไม่ได้ยืนยันวันรายไตรมาส"
      }
    },
    "HOOD": {
      "ticker": "HOOD",
      "name": "Robinhood Markets",
      "layer": "enterprise",
      "thesis": {
        "statement": "Robinhood กำลังเปลี่ยนจาก 'แอปเทรดหุ้นฟรี' เป็นแพลตฟอร์มการเงินครบวงจรของ retail รุ่นใหม่ — หุ้น/options/crypto/prediction markets + Gold subscription ที่พ่วง banking, retirement และ AI (Cortex) เข้าด้วยกัน ฐานลูกค้า 27.4 ล้านบัญชีอายุเฉลี่ยน้อยคือ runway ของ wallet share ยาวหลายทศวรรษ เดิมพันหลักคือแปลง active trader ให้เป็นความสัมพันธ์การเงินตลอดชีวิต — หมายเหตุ: จัดใน layer enterprise (applied AI/platform) เพื่อการเทียบกลุ่มแบบหยาบ ไม่ใช่บริษัทโครงสร้างพื้นฐาน AI",
        "pillars": [
          "Gold flywheel — สมาชิก 4.3 ล้าน (+36% YoY, สถิติใหม่) ผูกลูกค้าด้วย banking/retirement match/Cortex ทำ switching cost สูงขึ้นเรื่อย ๆ",
          "Prediction markets โต +320% YoY — asset class ใหม่ที่ HOOD เป็นผู้นำฝั่ง retail และเพิ่มรายได้ที่ไม่พึ่งวัฏจักร crypto",
          "การกระจายรายได้ดีขึ้น: net interest ~40% ของรายได้ + equities/options โตสองหลัก ทำให้พึ่ง crypto น้อยลงทุกไตรมาส",
          "เข้า S&P 500 (ก.ย. 2025) + ปี 2025 เป็นปีสถิติทั้งรายได้และกำไร — พ้นสถานะ meme stock สู่บริษัทกำไรจริง",
          "ขยายพรมแดน: Bitstamp (สถาบัน/crypto), TradePMR (RIA custody), tokenized stocks ใน EU + แผน Robinhood Chain"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+15% YoY (Q1 2026 — $1.07B) แต่ลดลงจาก Q4 2025 ($1.28B) และพลาด consensus",
          "trend": "flat",
          "score": 62,
          "impact": "neutral",
          "why": "ยังโตจากปีก่อนแต่โมเมนตัมสะดุด — crypto revenue หด −47% กดภาพรวม ขณะที่ธุรกิจ non-crypto (options, equities +46%, event contracts +320%, net interest) ยังโตแข็งแรง คุณภาพการโตดีขึ้นแม้ตัวเลขรวมแผ่ว"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q1 2026 EPS $0.38 (พลาด est $0.41) · guide Q2 ~$0.45, Q3 ~$0.50",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "กำไรจริงต่อเนื่องหลายไตรมาสแล้ว (TTM EPS ~$2+) แต่ Q1 พลาดคาดจาก crypto — guidance บอกว่าบริษัทมองกำไรฟื้นทันทีใน Q2/Q3"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "เป็นบวกต่อเนื่อง — โมเดล asset-light, capex ต่ำ",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "ธุรกิจ platform ไม่ต้องลงทุนหนัก กระแสเงินสดแปลงจากกำไรได้ดี รองรับทั้ง M&A และ buyback พร้อมกัน"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "โครงสร้างกำไรแข็งแรงขึ้นทุกปี — 2025 เป็นปีสถิติกำไร",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "รายได้โตเร็วกว่าต้นทุนดำเนินงานชัดเจน (operating leverage ของ platform) — แต่ margin ผันผวนตามวอลุ่มเทรดมากกว่าบริษัทซอฟต์แวร์"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงตามโมเดล platform แต่แกว่งตามวัฏจักรตลาด",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "ทุนที่ใช้ต่ำทำให้ผลตอบแทนช่วงตลาดคึกสูงมาก — ด้านกลับคือปีตลาดซบผลตอบแทนหดเร็วเช่นกัน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "สภาพคล่องแข็งแรง (ระดับหลายพันล้าน$)",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "เงินสดเพียงพอทำ M&A ต่อเนื่อง (Bitstamp, TradePMR) โดยไม่ต้องเพิ่มทุน — งบดุลสะอาด"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ต่ำมากเทียบขนาดธุรกิจ",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "แทบไม่มีหนี้เชิงโครงสร้าง — ความเสี่ยงงบดุลหลักคือด้าน operations (margin lending) ซึ่งบริหารตามเกณฑ์กำกับ"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "SBC สูงตามแบบ fintech โต — buyback ชดเชยได้บางส่วน",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "ค่าตอบแทนหุ้นพนักงานยังหนัก จำนวนหุ้นไม่ลดลงสุทธิ — ดีขึ้นจากยุคแรกแต่ยังเป็นต้นทุนแฝงที่ต้องติดตาม"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "M&A เชิงกลยุทธ์ (Bitstamp, TradePMR) + โครงการ buyback",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "ซื้อกิจการเพื่อเปิดตลาดใหม่ (สถาบัน, RIA) ด้วยราคาสมเหตุสมผล และเริ่มคืนเงินผู้ถือหุ้น — วินัยดีขึ้นชัดเจน"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "P/E ~50x (ราคา ~$101 · market cap ~$96B, ก.ค. 2026)",
          "trend": "down",
          "score": 35,
          "impact": "negative",
          "why": "แพงจัดเทียบ broker ดั้งเดิม (~15-25x) — ตลาดจ่ายพรีเมียมให้การเติบโตของ ecosystem ราคาย่อจาก high ปลายปี 2025 แล้วแต่ยังไม่ถูก และหุ้นถูกลงโทษแรงทุกครั้งที่พลาดคาด"
        }
      ],
      "revenueQuality": {
        "acceleration": "decelerating",
        "consistency": 55,
        "recurringPct": 40,
        "note": "รายได้เทรดผันผวนตามตลาดสูงมาก (จุดอ่อนเชิงโครงสร้าง) แต่คุณภาพกำลังดีขึ้น: net interest ~40% ของรายได้ + Gold subscription โตสม่ำเสมอ และ prediction markets เพิ่มขาใหม่ที่ไม่ผูกกับ crypto — YoY growth ชะลอจาก +27% (Q4 2025) เหลือ +15% (Q1 2026) เพราะ crypto ซบ",
        "segments": [
          {
            "name": "Net interest (margin/securities lending)",
            "sharePct": 37,
            "growthNote": "~$390-410M โตต่อเนื่องตามฐานสินทรัพย์และ securities lending (Q4 2025 +39% YoY)",
            "trend": "up"
          },
          {
            "name": "Options trading",
            "sharePct": 25,
            "growthNote": "แกนรายได้เทรดหลัก — วอลุ่มโตสองหลัก YoY ต่อเนื่อง (Q4 2025 +41%)",
            "trend": "up"
          },
          {
            "name": "Prediction markets & other transaction",
            "sharePct": 13,
            "growthNote": "+320% YoY — เครื่องยนต์ใหม่ที่โตแรงสุด วอลุ่ม event contracts ทำสถิติ",
            "trend": "up"
          },
          {
            "name": "Crypto trading",
            "sharePct": 13,
            "growthNote": "−47% YoY ($134M) — หดสองไตรมาสติดตามตลาด crypto ที่ซบเซา",
            "trend": "down"
          },
          {
            "name": "Equities + Gold subscriptions + อื่นๆ",
            "sharePct": 12,
            "growthNote": "equities +46% YoY · Gold 4.3M subs (+36%, สถิติใหม่)",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 60,
        "items": [
          {
            "item": "Robinhood Legend (แพลตฟอร์ม active trader)",
            "status": "executing",
            "evidence": "ดันวอลุ่ม options/equities โตสองหลัก — ยกระดับจากแอปมือถือสู่เครื่องมือเทรดจริงจัง ดึงลูกค้า serious trader จาก broker เดิม"
          },
          {
            "item": "Prediction markets (event contracts)",
            "status": "executing",
            "evidence": "+320% YoY วอลุ่มทำสถิติ — เป็นผู้นำ retail ใน asset class ใหม่ก่อนคู่แข่งรายใหญ่ขยับตัว"
          },
          {
            "item": "Cortex — AI assistant ในแอป",
            "status": "on-track",
            "evidence": "ผู้ช่วยวิเคราะห์หุ้น/ตอบคำถามสำหรับสมาชิก Gold — ยังช่วง adoption แรก เป็นตัวเพิ่มมูลค่าแพ็กเกจมากกว่าเครื่องผลิตรายได้ตรง"
          },
          {
            "item": "Gold ecosystem (banking + retirement + Strategies)",
            "status": "on-track",
            "evidence": "สมาชิก 4.3M (+36%) — ขยายจากเทรดสู่บัญชีเงินเดือน/IRA match/ที่ปรึกษาอัตโนมัติ ผูกลูกค้าระยะยาว"
          },
          {
            "item": "Tokenization / Robinhood Chain",
            "status": "on-track",
            "evidence": "หุ้น tokenized ใน EU + แผน chain ของตัวเอง — วิสัยทัศน์ไกลแต่รายได้จริงยังเล็กมาก ต้องรอ regulation ชัด"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Moat มาจาก brand + UX ที่เป็นเบอร์หนึ่งของ retail รุ่นใหม่ บวก ecosystem Gold ที่ทำให้ switching cost สูงขึ้นทุกไตรมาส (banking + IRA match + Cortex) — ยังไม่ใช่ moat แบบผูกขาด เพราะฟีเจอร์เดี่ยว ๆ ถูกลอกได้ แต่ความเร็วในการออกผลิตภัณฑ์คือกำแพงที่คู่แข่งตามยาก",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ผู้นำ retail trading รุ่นใหม่ในสหรัฐฯ ชัดเจน + เข้า S&P 500 แล้ว — แต่ AUC ยังเล็กมากเทียบ Schwab/Fidelity"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "UX/มือถือเป็นเบอร์หนึ่ง Legend ปิดช่องว่างฝั่ง desktop — ฟีเจอร์เชิงลึกยังตาม broker ใหญ่ในบางด้าน"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ออกผลิตภัณฑ์ใหม่เร็วที่สุดในอุตสาหกรรม — prediction markets, banking, tokenization, Cortex ภายในปีเดียว"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "strengthening",
            "note": "Gold + IRA match + banking ทำให้ย้ายออกแพงขึ้นเรื่อย ๆ — จากแอปเทรดที่ลบง่าย กลายเป็นบัญชีการเงินหลัก"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "จากเทรดอย่างเดียว → super-app การเงิน (เทรด/ออม/เกษียณ/ธนาคาร/AI) — ยิ่งใช้หลายบริการยิ่งผูกแน่น"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ไม่ใช่ open platform — มิตินี้ไม่ใช่สนามแข่งหลักของ HOOD (ต่างจากบริษัทโครงสร้าง AI)"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "IRA match มีเงื่อนไขถือยาว + เงินเดือนเข้าบัญชี Robinhood — ลูกค้า Gold churn ต่ำลง"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "stable",
            "note": "brand + ความเร็ว + ecosystem กว้างขึ้น แต่คู่แข่งแต่ละแนวแข็งแรง (Schwab/Fidelity ฝั่งสินทรัพย์, Coinbase ฝั่ง crypto, Kalshi ฝั่ง prediction)"
          }
        ]
      },
      "capitalAllocation": {
        "score": 70,
        "verdict": "จัดสรรทุนดีขึ้นชัดเจน — M&A เปิดตลาดใหม่ในราคาสมเหตุสมผล + เริ่ม buyback จริงจัง จุดที่ต้องตามคือ SBC ที่ยังสูงและวินัยการซื้อกิจการเมื่อราคาหุ้นตัวเองแพง",
        "items": [
          {
            "label": "M&A",
            "current": "Bitstamp (สถาบัน/crypto ทั่วโลก) + TradePMR (RIA custody)",
            "assessment": "good",
            "why": "ซื้อความสามารถ/ใบอนุญาตที่สร้างเองช้า — เปิดตลาดสถาบันและที่ปรึกษาโดยไม่เจือจางหนัก"
          },
          {
            "label": "Buyback",
            "current": "มีโครงการซื้อหุ้นคืนต่อเนื่อง",
            "assessment": "neutral",
            "why": "ช่วยชดเชย SBC บางส่วนแต่จำนวนหุ้นยังไม่ลดสุทธิ — ยังไม่ถึงขั้นคืนทุนแบบ big tech"
          },
          {
            "label": "SBC / การเจือจาง",
            "current": "สูงตามแบบบริษัทเทคโต",
            "assessment": "neutral",
            "why": "ต้นทุนแฝงที่กดผู้ถือหุ้น — แลกกับการรักษาทีมในตลาดแรงงานแข่งสูง"
          },
          {
            "label": "การลงทุนภายใน (ผลิตภัณฑ์ใหม่)",
            "current": "เทเข้า Legend, prediction markets, banking, Cortex, tokenization",
            "assessment": "good",
            "why": "อัตราการออกผลิตภัณฑ์ต่อปีสูงสุดในกลุ่ม และหลายตัวแปลงเป็นรายได้จริงแล้ว (prediction +320%)"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่จ่าย",
            "assessment": "neutral",
            "why": "เหมาะสมกับ growth stage — ผลตอบแทนการลงทุนภายในยังสูงกว่าการคืนเงินสด"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "P/E ~50x (ราคา ~$101, mcap ~$96B) — แพงกว่า broker ดั้งเดิมหลายเท่า ตลาดจ่ายให้การเติบโตของ ecosystem และ optionality (prediction/tokenization) ราคาแพงแบบนี้ทำให้หุ้นเหวี่ยงแรงมากรอบงบ โดยเฉพาะเมื่อพลาดคาด"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q4 2025 → Q1 2026)",
          "prev": "$1.28B (+27% YoY)",
          "now": "$1.07B (+15% YoY, พลาด est $1.17B)",
          "direction": "negative"
        },
        {
          "metric": "Crypto revenue",
          "prev": "$221M (−38% YoY)",
          "now": "$134M (−47% YoY) — หดแรงสองไตรมาสติด",
          "direction": "negative"
        },
        {
          "metric": "Prediction markets (event contracts)",
          "prev": "โตแรงต่อเนื่อง (Q4 อื่นๆ transaction +300%)",
          "now": "+320% YoY วอลุ่มทำสถิติ",
          "direction": "positive"
        },
        {
          "metric": "Robinhood Gold",
          "prev": "~4M subs",
          "now": "4.3M subs (+36% YoY, สถิติใหม่)",
          "direction": "positive"
        },
        {
          "metric": "Funded customers",
          "prev": "~27M",
          "now": "27.4M (+1.7M / +6% YoY)",
          "direction": "positive"
        },
        {
          "metric": "Guidance",
          "prev": "—",
          "now": "Q2 EPS ~$0.45 · Q3 ~$0.50 · Q2 rev ~$1.23B (มองกำไรฟื้นทันที)",
          "direction": "positive"
        }
      ],
      "risks": [
        "รายได้ผูกกับวอลุ่มเทรดและอารมณ์ตลาด — bear market หรือ retail เงียบ = รายได้หดเร็วและแรง (consistency ต่ำเชิงโครงสร้าง)",
        "Crypto revenue หด −38% → −47% สองไตรมาสติด — ถ้าลามไปขา options/prediction ภาพการโตทั้งบริษัทจะเปลี่ยน",
        "Valuation ~50x ไม่เผื่อความผิดพลาด — พลาด consensus ครั้งเดียวหุ้นถูกลงโทษหนัก (งบ Q4 2025 ร่วง ~8%)",
        "Regulatory หลายแนวพร้อมกัน: PFOF, prediction markets (CFTC), crypto, banking — กติกาเปลี่ยนได้ทุกไตรมาส",
        "งบ Q2 2026 ออก 29 ก.ค. 2026 (หนึ่งวันหลังอัปเดตข้อมูลนี้) — ควรรัน /thesis-update HOOD ซ้ำหลังงบเพื่อ refresh ทันที"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ปีปฏิทิน) — ข้อมูล 5 ปีล่าสุดที่รายงานแล้วคือ FY2021 ถึง FY2025 (IPO ก.ค. 2021 แต่มีงบเต็มปี 2021)",
        "epsBasis": "diluted GAAP; HOOD ไม่เคยแตกหุ้น จึงเป็น basis ปัจจุบันอยู่แล้ว (split factor = 1 ทุกปี)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 1.8,
            "epsAdj": -7.49,
            "opMarginPct": -90.4,
            "fcfB": -0.9,
            "priceFYEnd": 17.76
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 1.4,
            "epsAdj": -1.17,
            "opMarginPct": -74.5,
            "fcfB": -0.9,
            "priceFYEnd": 8.14
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 1.9,
            "epsAdj": -0.61,
            "opMarginPct": -28.7,
            "fcfB": 1.2,
            "priceFYEnd": 12.74
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 3,
            "epsAdj": 1.56,
            "opMarginPct": 35.7,
            "fcfB": -0.2,
            "priceFYEnd": 37.26
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 4.5,
            "epsAdj": 2.05,
            "opMarginPct": 46.8,
            "fcfB": 1.6,
            "priceFYEnd": 113.1
          }
        ],
        "notes": "HOOD ไม่เคยแตกหุ้น ราคาและ EPS ทุกปีเป็น basis ปัจจุบันโดยไม่ต้องปรับ; EPS FY2021 ติดลบหนัก (-$7.49) จากขาดทุน GAAP ~$3.7B ที่ส่วนใหญ่เป็น stock-based compensation ก้อนใหญ่ตอน IPO และจำนวนหุ้นถัวเฉลี่ยต่ำเพราะ IPO กลางปี (~492M หุ้น) ส่วนปีอื่น implied diluted shares เสถียร ~879M→919M; งบกำไรขาดทุนของ HOOD ไม่มีบรรทัด operating income แยก จึงคำนวณ operating margin จาก (total net revenues − total operating expenses)/revenue ตามแนวทาง aggregator (operating income -1,641/-1,011/-536/+1,054/+2,094 $M); FCF (OCF − capex) ผันผวนแรงตาม working capital ของธุรกิจโบรกเกอร์ (segregated cash / payables to users) เช่น FY2024 OCF ติดลบ -$157M ทั้งที่กำไรสุทธิ $1.4B ขณะที่ FY2023 OCF บวก $1.18B ทั้งที่ยังขาดทุน — ไม่ควรใช้ FCF เป็นตัวชี้วัดหลักของบริษัทนี้ (capex เล็กมาก $2-63M/ปี); OCF ยืนยันตรงกับ SEC XBRL (10-K) ทุกปี; ราคาปิดสิ้นปี 2025 ($113.10) ยืนยันจาก StatMuse — คิดเป็นผลตอบแทนปีปฏิทิน 2025 ประมาณ +203.5% จากราคาปิดสิ้นปี 2024 ($37.26); FY2025 net income $1.9B เทียบ $1.4B ใน FY2024 ซึ่งรวม one-time benefit $424M (tax benefit + regulatory accrual reversal, +$0.47 ต่อหุ้น) ใน Q4 2024; ตัวเลข revenue ปัดเป็น 1 ทศนิยม ($1.815B→1.8, $1.358B→1.4, $1.865B→1.9, $2.951B→3.0, $4.473B→4.5)",
        "sources": [
          "https://stockanalysis.com/stocks/hood/financials/",
          "https://stockanalysis.com/stocks/hood/financials/cash-flow-statement/",
          "https://data.sec.gov/api/xbrl/companyconcept/CIK0001783879/us-gaap/NetCashProvidedByUsedInOperatingActivities.json",
          "https://investors.robinhood.com/news-releases/news-release-details/robinhood-reports-fourth-quarter-and-full-year-2025-results",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2021",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-30-2022",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-29-2023",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2024",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2025"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 0.47,
            "epsAdj": -0.09,
            "opMarginPct": -15.6,
            "fcfB": null,
            "priceQEnd": 10.5,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 0.47,
            "epsAdj": 0.03,
            "opMarginPct": 14.6,
            "fcfB": null,
            "priceQEnd": 13,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 0.62,
            "epsAdj": 0.18,
            "opMarginPct": 25.6,
            "fcfB": null,
            "priceQEnd": 19,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 0.68,
            "epsAdj": 0.21,
            "opMarginPct": 27.7,
            "fcfB": 0.05,
            "priceQEnd": 21.5,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 0.64,
            "epsAdj": 0.17,
            "opMarginPct": 23.7,
            "fcfB": 1.81,
            "priceQEnd": 24.5,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 1.01,
            "epsAdj": 1.01,
            "opMarginPct": 54.8,
            "fcfB": -1.4,
            "priceQEnd": 40.5,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 0.93,
            "epsAdj": 0.37,
            "opMarginPct": 39.9,
            "fcfB": 0.64,
            "priceQEnd": 45,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 0.99,
            "epsAdj": 0.42,
            "opMarginPct": 44.4,
            "fcfB": 3.5,
            "priceQEnd": 93.5,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 1.27,
            "epsAdj": 0.61,
            "opMarginPct": 49.8,
            "fcfB": -1.58,
            "priceQEnd": 130,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 1.28,
            "epsAdj": 0.66,
            "opMarginPct": 50.7,
            "fcfB": -0.94,
            "priceQEnd": 115,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 1.07,
            "epsAdj": 0.38,
            "opMarginPct": 38.5,
            "fcfB": 2.03,
            "priceQEnd": 100,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 1.31,
            "epsAdj": 0.62,
            "opMarginPct": 43.9,
            "fcfB": 0.71,
            "priceQEnd": 91,
            "endDate": "2026-06-30",
            "epsNote": "EPS $0.62 รวม ~$0.14 จากการ deconsolidate กองทุน Robinhood Ventures Fund I (กำไร ~$129M ครั้งเดียว) — ตัดรายการนี้ออกจะเหลือ ~$0.48 · net income ไตรมาสนี้ $573M"
          }
        ]
      },
      "nextEarnings": "2026-11-04",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 2.48,
            "revenue": 5.16
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$1.31B (+32% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "ตามงบไตรมาส",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "ตามงบไตรมาส",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 5.16,
            "eps": 2.48,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 3.2,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "Robinhood ไม่ให้ guidance รายได้รายไตรมาส (ให้เป็นกรอบค่าใช้จ่าย adjusted opex+SBC รายปีแทน) — แถว guidance จึงเป็น noGuidance ตามจริง ไม่ใช่ข้อมูลขาด · Q2 2026: รายได้ $1.31B (+32% YoY) · net deposits $21.7B · platform assets $369B (+32% YoY) · adjusted EBITDA margin 57% · consensus FY2026 EPS ~$2.48 / FY2027 ~$3.20 (28 นักวิเคราะห์ · non-GAAP) — KB ใช้ GAAP จึงเป็นคนละฐาน · งบ Q3 ประกาศ 4 พ.ย. 2026"
      }
    },
    "LLY": {
      "ticker": "LLY",
      "name": "Eli Lilly",
      "layer": "enterprise",
      "thesis": {
        "statement": "Eli Lilly เป็นผู้นำคู่ (กับ Novo Nordisk) ของ megatrend ที่ใหญ่ที่สุดในประวัติศาสตร์ยา — กลุ่ม GLP-1/incretin รักษาเบาหวาน+โรคอ้วน Mounjaro/Zepbound (tirzepatide ฉีด) ครองส่วนแบ่งขึ้นนำ และล่าสุดได้ Foundayo (orforglipron) ยา GLP-1 แบบ 'เม็ดกิน' ตัวแรกที่อนุมัติ — เปิดตลาดที่กว้างกว่ายาฉีดมาก เดิมพันหลักคือ TAM โรคอ้วนระดับหลายร้อยล้านคนทั่วโลก + ประสิทธิภาพ best-in-class + กำลังการผลิตที่คู่แข่งตามไม่ทัน — หมายเหตุ: จัดใน layer enterprise แบบหลวม ๆ เพื่อการเทียบกลุ่ม (LLY ใช้ AI/ML ในการค้นพบยา แต่แก่นคือ pharma megatrend ไม่ใช่บริษัทโครงสร้าง AI)",
        "pillars": [
          "GLP-1 duopoly — Mounjaro+Zepbound ดันส่วนแบ่งตลาด GLP-1 ขึ้นแตะ ~60% แซง Novo ด้วยประสิทธิภาพลดน้ำหนักที่เหนือกว่า",
          "Oral GLP-1 (Foundayo/orforglipron) — ยาเม็ดตัวแรกที่อนุมัติ (เม.ย. 2026) ผลิตง่าย/ขยายสเกลได้กว่ายาฉีดหลายเท่า เปิดตลาดคนไข้กลุ่มใหม่",
          "กำลังการผลิตเป็นคูเมือง — ทุ่ม capex หลายหมื่นล้าน$ สร้างโรงงาน เป็นข้อจำกัดจริงของอุปสงค์ที่คู่แข่งลอกตามช้า",
          "ท่อยาลึก — retatrutide (triple agonist รุ่นถัดไป), Kisunla (อัลไซเมอร์), การขยาย label (หยุดหายใจขณะหลับ, หัวใจ, MASH) ต่อยอดฐานเดิม",
          "มาร์จิ้นขยายแรง — operating margin พุ่งจาก ~29% (2024) เป็น ~40% (2025) จาก operating leverage ของยอดขาย GLP-1"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+48% YoY (Q2 2026 — $23.0B, เหนือคาด ~$20.8B) · Mounjaro $9.9B (+91%) · Zepbound US $4.9B (+44%)",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "ยังโตแรงมากบนฐานที่ใหญ่ขึ้น (Q1 +56% → Q2 +48% YoY แต่รายได้เพิ่ม $19.8B → $23.0B) — Mounjaro ต่างประเทศระเบิด + Zepbound demand ชดเชยราคาที่ลด · ยา GLP-1 ยังเป็นคลื่นดีมานด์ที่ supply ตามไม่ทัน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "adjusted EPS $8.38 (Q2 2026, ชนะคาด ~$6.01) · non-GAAP net income $7.5B (จาก EPS $6.31 ใน Q2'25)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "กำไรแกนโตเร็วตามรายได้ + operating leverage — Q2 beat ชัด แม้ guidance EPS ทั้งปีถูกหักด้วย deal charges ก้อนใหญ่ในไตรมาส (underlying โตต่อ)"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ถูกกดด้วย capex สร้างโรงงานมหาศาล — FCF ต่ำเทียบกำไร (TTM ~$10B)",
          "trend": "flat",
          "score": 48,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้างชั่วคราว: ทุ่มลงทุนกำลังการผลิตหลายหมื่นล้าน$ ต่อปี ทำให้ FCF น้อยกว่ากำไรมาก — เป็นการลงทุนเพื่อรองรับอุปสงค์ แต่กด cash conversion จนกว่า capex จะ peak"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~40% (2025) ขยายจาก ~29% (2024)",
          "trend": "up",
          "score": 84,
          "impact": "positive",
          "why": "margin ขยายเร็วมากจาก scale ของ GLP-1 — ยอดขายโตเร็วกว่าต้นทุน แต่ยังถูกลด realized price (-13% ใน Q1) กดบางส่วน"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงตามกำไรที่พุ่ง แต่ฐานทุนโตเร็วจาก capex",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "ผลตอบแทนดีขึ้นตามกำไร แต่การทุ่ม capex ทำให้ invested capital บวมขึ้น — ผลตอบแทนที่แท้จริงขึ้นกับว่าอุปสงค์ GLP-1 ยั่งยืนแค่ไหน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "สภาพคล่องพอเพียงแต่ระดมหนี้มาลงทุน",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "เงินสดใช้ไปกับ capex + ปันผล + buyback + M&A พร้อมกัน จึงพึ่งการก่อหนี้บางส่วน — ไม่ใช่งบดุลเงินสดล้นแบบ big tech"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้เพิ่มขึ้นเพื่อ funding capex และการคืนเงินผู้ถือหุ้น",
          "trend": "down",
          "score": 55,
          "impact": "neutral",
          "why": "ก่อหนี้เพิ่มในช่วงลงทุนหนัก — ยังบริหารได้ด้วยกระแสเงินสดที่โตเร็ว แต่ทิศทางหนี้เพิ่มขึ้นเป็นจุดต้องจับตา (trend = แย่ลงเชิงงบดุล)"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "จำนวนหุ้นเสถียร ~900 ล้านหุ้น · buyback เล็กน้อย",
          "trend": "flat",
          "score": 72,
          "impact": "positive",
          "why": "แทบไม่เจือจาง — SBC ต่ำแบบ pharma และมี buyback ประปราย จำนวนหุ้นทรงตัวหลายปี เป็นมิตรต่อผู้ถือหุ้น"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "capex กำลังผลิต + ปันผลขึ้นต่อเนื่อง + M&A bolt-on + R&D หนัก",
          "trend": "up",
          "score": 73,
          "impact": "positive",
          "why": "จัดสรรเชิงรุกเพื่อคว้า megatrend — ลงทุนโรงงาน+ท่อยาในจังหวะที่อุปสงค์ล้น สมเหตุสมผล แต่ความเสี่ยงคือถ้าอุปสงค์แผ่ว capex ที่ลงไปจะกลายเป็นภาระ"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~32-35x (หุ้นขึ้นหลัง Q2 beat) — แพงแต่กำไรโต ~40%+/ปี ไล่ทัน multiple (PEG ต่ำกว่า 1)",
          "trend": "flat",
          "score": 40,
          "impact": "negative",
          "why": "แพงในเชิงสัมบูรณ์และเทียบกลุ่มยา แต่การเติบโตระดับ 40%+ ทำให้ PEG ต่ำกว่า 1 — ความเสี่ยงหลักคือแรงกดด้านราคา (Zepbound net price ลด) และการแข่งขัน oral GLP-1 ที่จะกดดัน multiple ระยะถัดไป"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 80,
        "recurringPct": 85,
        "note": "รายได้เร่งตัวและกระจุกที่ GLP-1 (tirzepatide) เป็นหลัก — เป็นดาบสองคม: โตเร็วมากแต่พึ่งโมเลกุลเดียวสูง รายได้ยาเป็น recurring (ใช้ต่อเนื่องเรื้อรัง) แต่มีความเสี่ยง pricing (-13% realized price Q1) และ patent cliff ระยะยาว · ยาเดิม (Trulicity, Jardiance) เริ่มแผ่วขณะยาใหม่ (Kisunla, Ebglyss, Jaypirca, Foundayo) กำลัง ramp",
        "segments": [
          {
            "name": "Mounjaro (tirzepatide — เบาหวาน)",
            "sharePct": 43,
            "growthNote": "$9.9B (+91% YoY) — US $4.8B + ต่างประเทศ $5.2B ที่ระเบิด",
            "trend": "up"
          },
          {
            "name": "Zepbound (tirzepatide — โรคอ้วน)",
            "sharePct": 22,
            "growthNote": "US $4.9B (+44% YoY) — demand แรงชดเชย net price ที่ลด",
            "trend": "up"
          },
          {
            "name": "เบาหวาน/cardiometabolic เดิม (Trulicity, Jardiance, Humalog)",
            "sharePct": 12,
            "growthNote": "โตช้า/ทรงตัว — ฐานเก่าที่ถูกแทนด้วย tirzepatide",
            "trend": "flat"
          },
          {
            "name": "Oncology (Verzenio, Jaypirca)",
            "sharePct": 8,
            "growthNote": "โตสม่ำเสมอ — Verzenio ยังขยายข้อบ่งใช้",
            "trend": "up"
          },
          {
            "name": "ภูมิคุ้มกัน+ประสาท+ยาใหม่ (Taltz, Ebglyss, Omvoh, Kisunla, Foundayo)",
            "sharePct": 15,
            "growthNote": "Foundayo (orforglipron) เริ่มมียอดขายไตรมาสแรก — ยาเม็ด GLP-1 ขยายตลาด",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 86,
        "items": [
          {
            "item": "Foundayo (orforglipron) — ยาเม็ด GLP-1 ตัวแรก",
            "status": "executing",
            "evidence": "อนุมัติ FDA เม.ย. 2026 · Q2 เป็นไตรมาสแรกที่มียอดขาย — เปิดตลาดผู้ป่วยที่ไม่อยากฉีดเข็ม (TAM ใหญ่ขึ้นมาก)"
          },
          {
            "item": "ขยายกำลังผลิต tirzepatide (capex มหาศาล)",
            "status": "executing",
            "evidence": "ลงทุนโรงงานทั่วโลกเพื่อแก้คอขวด supply — ยอด Mounjaro/Zepbound ยังถูกจำกัดด้วยกำลังผลิต ไม่ใช่ดีมานด์"
          },
          {
            "item": "Pipeline รุ่นถัดไป (retatrutide, orforglipron ข้อบ่งใช้ใหม่)",
            "status": "on-track",
            "evidence": "ยา GLP-1/GIP รุ่นใหม่ที่ลดน้ำหนักได้มากขึ้น — ต่อคูเมืองการเติบโตไปอีกหลายปี"
          },
          {
            "item": "ขยายข้อบ่งใช้ tirzepatide (OSA, หัวใจ, ตับ)",
            "status": "executing",
            "evidence": "ข้อบ่งใช้ใหม่ = เพิ่มกลุ่มผู้ป่วยและการคุ้มครองประกัน — ขยายมูลค่าตลาดต่อเนื่อง"
          },
          {
            "item": "แรงกดด้านราคา/การเข้าถึง",
            "status": "at-risk",
            "evidence": "net price Zepbound ลดลง + แรงกดจากประกัน/นโยบายราคายา US — เป็นความเสี่ยงต่อ margin ระยะยาว"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Moat มาจาก 3 ชั้น: (1) ประสิทธิภาพทางคลินิกที่เหนือกว่า (tirzepatide ลดน้ำหนักมากกว่า semaglutide) (2) กำลังการผลิตที่สร้างล่วงหน้าหลายหมื่นล้าน$ ซึ่งเป็นข้อจำกัดจริงของตลาด (3) สิทธิบัตร tirzepatide/orforglipron + first-mover ของยาเม็ด — เป็น duopoly กับ Novo Nordisk ที่คนที่สามเข้ามาแข่งได้ยากในระยะสั้น",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ส่วนแบ่งตลาด GLP-1 ขึ้นแตะ ~60% แซง Novo — ขึ้นเป็นเบอร์หนึ่งของ category ที่ใหญ่ที่สุดในวงการยา"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี (ประสิทธิภาพยา)",
            "status": "strengthening",
            "note": "tirzepatide (dual agonist) ลดน้ำหนักเหนือ semaglutide + มี oral orforglipron ก่อนใคร — นำทั้งยาฉีดและยาเม็ด"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ramp การผลิต + ขยาย label + เปิดตัวยาใหม่เร็ว — แปลงท่อยาเป็นยอดขายได้ไวผิดปกติสำหรับ pharma"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "คนไข้ที่ตอบสนองดีกับ tirzepatide มักอยู่ต่อ แต่การเลือกยาถูกกำหนดโดยประกัน/formulary มากพอควร — switching cost ปานกลาง"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "stable",
            "note": "LillyDirect (ขายตรงถึงผู้ป่วย) + ครอบคลุมโรคร่วม (เบาหวาน/หัวใจ/หยุดหายใจ) สร้าง ecosystem รอบคนไข้อ้วน แต่ยังช่วงต้น"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ไม่ใช่สนามแข่งของ pharma — มิตินี้ไม่สำคัญกับ LLY (ต่างจากบริษัทแพลตฟอร์ม/AI)"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "ยาเรื้อรังใช้ต่อเนื่อง = รายได้ recurring แต่ถูกท้าทายด้วยราคา/ประกัน และ compounding pharmacy ในบางช่วง"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "คูเมืองกว้างขึ้นจากกำลังผลิต + oral first-mover + สิทธิบัตร แต่ระวังคลื่นคู่แข่ง oral GLP-1 (Novo, Pfizer, Roche, Amgen) ที่กำลังมา"
          }
        ]
      },
      "capitalAllocation": {
        "score": 73,
        "verdict": "จัดสรรทุนเชิงรุกเพื่อคว้า megatrend — ลงทุนกำลังผลิต+ท่อยาในจังหวะอุปสงค์ล้น + ปันผลขึ้นต่อเนื่อง จุดต้องจับตาคือ capex มหาศาลที่กด FCF และการก่อหนี้เพิ่ม ถ้าอุปสงค์ยั่งยืนคือการลงทุนที่คุ้ม ถ้าแผ่วคือความเสี่ยง",
        "items": [
          {
            "label": "Capex (กำลังการผลิต)",
            "current": "หลายหมื่นล้าน$/ปี สร้างโรงงานทั่วโลก",
            "assessment": "good",
            "why": "จำเป็นและเป็นคูเมือง — ปลดล็อกอุปสงค์ที่ล้น แต่กด FCF หนักและเดิมพันว่าอุปสงค์ยั่งยืน"
          },
          {
            "label": "เงินปันผล",
            "current": "ขึ้นต่อเนื่องทุกปี",
            "assessment": "good",
            "why": "ประวัติปันผลยาวนานและเพิ่มสม่ำเสมอ — เป็นมิตรต่อผู้ถือหุ้นระยะยาว"
          },
          {
            "label": "R&D / ท่อยา",
            "current": "ลงทุนหนักใน incretin รุ่นถัดไป + ยาโรคอื่น",
            "assessment": "good",
            "why": "ต่อยอด pipeline ป้องกัน patent cliff — retatrutide/orforglipron คือผลของการลงทุนนี้"
          },
          {
            "label": "M&A",
            "current": "bolt-on เสริมท่อยา",
            "assessment": "neutral",
            "why": "ซื้อกิจการขนาดกลางเสริมเทคโนโลยี/สินทรัพย์ — วินัยพอใช้ ไม่ได้เป็นตัวขับหลัก"
          },
          {
            "label": "Buyback / หนี้",
            "current": "buyback เล็กน้อย + ก่อหนี้ funding capex",
            "assessment": "neutral",
            "why": "buyback น้อย ขณะที่หนี้เพิ่ม — เหมาะสมช่วงลงทุน แต่ทำให้งบดุลตึงขึ้น"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~32-35x (หลัง Q2 2026 beat หุ้นขึ้น) — แพงเชิงสัมบูรณ์และเทียบกลุ่มยา (peers ~15-18x) แต่การเติบโต ~40%+/ปี ทำให้ PEG ต่ำกว่า 1 · เดิมพันคือคลื่น GLP-1/obesity ยังยาว + orforglipron (ยาเม็ด) ขยายตลาด — ความเสี่ยง valuation มาจากแรงกดราคา (net price Zepbound ลด) และคู่แข่ง oral GLP-1 ที่อาจกด multiple มากกว่าตัวธุรกิจเอง"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 2026)",
          "prev": "Q1'26 $19.8B (+56%)",
          "now": "$23.0B (+48% YoY) — เหนือคาด ~$20.8B",
          "direction": "positive"
        },
        {
          "metric": "Mounjaro",
          "prev": "Q1 $8.66B (+125%)",
          "now": "$9.9B (+91% YoY) — ต่างประเทศ $5.2B",
          "direction": "positive"
        },
        {
          "metric": "Zepbound (US)",
          "prev": "—",
          "now": "$4.9B (+44% YoY) — demand ชดเชย net price ที่ลด",
          "direction": "positive"
        },
        {
          "metric": "adj EPS",
          "prev": "คาด ~$6.01",
          "now": "$8.38 (ชนะคาดชัด)",
          "direction": "positive"
        },
        {
          "metric": "Guidance FY2026 รายได้",
          "prev": "$82-85B",
          "now": "$85-87B (ยกขึ้น)",
          "direction": "positive"
        },
        {
          "metric": "Guidance adj EPS FY2026",
          "prev": "$35.50-37.00",
          "now": "$35.50-36.50 (underlying +$2.78 แต่โดน deal charges $3.03 หักกลบ)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "คู่แข่งโรคอ้วนเข้มข้นขึ้น — Novo (CagriSema, oral semaglutide), Pfizer/Roche/Amgen (oral GLP-1) กำลังมา อาจกัดส่วนแบ่ง/ราคาในระยะถัดไป",
        "แรงกดด้านราคา — realized price US -13% แล้ว + การเมืองเรื่องราคายา (IRA, การเจรจา Medicare, compounding pharmacy) กดดัน margin ระยะยาว",
        "Valuation ~31-34x forward แทบไม่เผื่อพลาด — pharma ปกติ ~15x ถ้าโตช้าลงหรือ pipeline สะดุด multiple หดแรง",
        "พึ่ง tirzepatide สูงมาก (Mounjaro+Zepbound ~65% ของรายได้) — ความเสี่ยงกระจุกตัวในโมเลกุลเดียว: safety signal หรือ patent/biosimilar กระทบทั้งพอร์ต",
        "capex มหาศาลกด FCF — ถ้าอุปสงค์ normalize เร็วกว่าคาด โรงงานที่สร้างไว้จะกลายเป็นภาระและ ROIC หด",
        "หมายเหตุ layer: LLY จัดใน enterprise แบบหลวม ๆ — ไม่ใช่หุ้นสาย AI infrastructure การเทียบ peer ในกลุ่มนี้จึงเป็นแบบหยาบ"
      ],
      "asOf": "2026-08",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุด ธ.ค. (ตรงปีปฏิทิน) — FY2021-FY2025 คือ 5 ปีล่าสุดที่ปิดงบแล้ว",
        "epsBasis": "diluted GAAP (as-reported — LLY ไม่เคยแตกหุ้น จึงไม่ต้องปรับ split)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 28.3,
            "epsAdj": 6.12,
            "opMarginPct": 22.4,
            "fcfB": 6.1,
            "priceFYEnd": 265.16
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 28.5,
            "epsAdj": 6.9,
            "opMarginPct": 25,
            "fcfB": 5.7,
            "priceFYEnd": 356.04
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 34.1,
            "epsAdj": 5.8,
            "opMarginPct": 18.9,
            "fcfB": 0.8,
            "priceFYEnd": 572.91
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 45,
            "epsAdj": 11.71,
            "opMarginPct": 28.6,
            "fcfB": 3.8,
            "priceFYEnd": 763.69
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 65.2,
            "epsAdj": 22.95,
            "opMarginPct": 40.4,
            "fcfB": 9,
            "priceFYEnd": 1071.05
          }
        ],
        "notes": "ตัวเลขเป็นค่าประมาณ curated ~2-3% · EPS as-reported (ไม่มี split) · operating margin = operating income/revenue · FCF = OCF − capex: ต่ำสุดที่ ~$0.8B ปี 2023 จาก capex สร้างโรงงานพุ่ง (capex โต ~6 เท่าจาก $1.3B ปี 2021 เป็น ~$7.8B ปี 2025) แล้วฟื้นเป็น ~$9B ปี 2025 · ราคาเป็นราคาปิดสิ้นปีจริง (ไม่ปรับปันผล) · จำนวนหุ้น diluted ~900 ล้านหุ้นเสถียรทุกปี",
        "sources": [
          "https://stockanalysis.com/stocks/lly/financials/",
          "https://www.prnewswire.com/news-releases/lilly-reports-fourth-quarter-2025-financial-results-and-provides-2026-guidance-302678376.html",
          "https://www.sec.gov/Archives/edgar/data/59478/000005947826000013/lly-20251231.htm"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 9.5,
            "epsAdj": -0.06,
            "opMarginPct": 4.7,
            "fcfB": 1.22,
            "priceQEnd": 538,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 9.35,
            "epsAdj": 2.42,
            "opMarginPct": 25.5,
            "fcfB": -1.38,
            "priceQEnd": 573,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 8.77,
            "epsAdj": 2.48,
            "opMarginPct": 28.6,
            "fcfB": 0.18,
            "priceQEnd": 778,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 11.3,
            "epsAdj": 3.28,
            "opMarginPct": 32.9,
            "fcfB": 0.24,
            "priceQEnd": 905,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 11.44,
            "epsAdj": 1.07,
            "opMarginPct": 13.3,
            "fcfB": 2.36,
            "priceQEnd": 885,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 13.53,
            "epsAdj": 4.88,
            "opMarginPct": 38.1,
            "fcfB": 0.98,
            "priceQEnd": 764,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 12.73,
            "epsAdj": 3.06,
            "opMarginPct": 29,
            "fcfB": 0.16,
            "priceQEnd": 826,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 15.56,
            "epsAdj": 6.29,
            "opMarginPct": 44.1,
            "fcfB": 1.39,
            "priceQEnd": 779,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 17.6,
            "epsAdj": 6.21,
            "opMarginPct": 41.9,
            "fcfB": 6.75,
            "priceQEnd": 830,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 19.29,
            "epsAdj": 7.39,
            "opMarginPct": 43.4,
            "fcfB": 0.68,
            "priceQEnd": 1071,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 19.8,
            "epsAdj": 8.26,
            "opMarginPct": 45,
            "fcfB": 3.01,
            "priceQEnd": 920,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 22.97,
            "epsAdj": 7.94,
            "opMarginPct": 39.1,
            "fcfB": 7.76,
            "priceQEnd": 1100,
            "endDate": "2026-06-30",
            "epsNote": "EPS รายงาน (GAAP) $7.94 · non-GAAP $8.38 — ส่วนต่างหลักมาจากค่าใช้จ่าย acquired IPR&D จากดีล business development ในไตรมาสนี้ ซึ่งกดกำไรบัญชีลงแต่ไม่ใช่ต้นทุนดำเนินงานปกติ"
          }
        ]
      },
      "nextEarnings": "2026-10-29",
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 36.73,
            "revenue": 88.18
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "~$23.0B (+48% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "ตามงบไตรมาส",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "ตามงบไตรมาส",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 88.18,
            "eps": 36.73,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 47.33,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "Lilly ให้ guidance เป็น 'รายปี' ไม่ใช่รายไตรมาส — แถว guidance จึงเป็น noGuidance ตามจริง · รอบ Q2 2026 บริษัท<b>ยกเป้าทั้งปี</b>: รายได้ $85-87B (เดิม $82-85B) และ non-GAAP EPS $35.50-36.50 (ยกฐานขึ้น +$2.78 ที่จุดกึ่งกลาง แต่ถูกหักกลบด้วยค่า acquired IPR&D $3.03 จากดีลในไตรมาส) · consensus FY2026 EPS ~$36.73 / FY2027 ~$47.33 (26 นักวิเคราะห์ · non-GAAP) สูงกว่ากรอบบริษัทเล็กน้อย · Q2 2026 ปริมาณขาย +60% แต่ราคาขายจริง −13%"
      }
    },
    "ASML": {
      "ticker": "ASML",
      "name": "ASML Holding",
      "layer": "equipment",
      "thesis": {
        "statement": "ASML คือผู้ผลิตเครื่อง EUV lithography เพียงรายเดียวในโลก — เครื่องที่ทำให้การผลิตชิปล้ำสมัยที่สุด (ต่ำกว่า 7nm) เกิดขึ้นได้จริงในเชิงฟิสิกส์ ชิป AI ทุกตัว (GPU ของ NVIDIA ที่ TSMC ผลิต) สุดท้ายพึ่งเครื่องของ ASML ทั้งสิ้น นี่คือ 'คนขายจอบเสียม' ที่ผูกขาดที่สุดของยุค AI: de-facto monopoly บน EUV และกำลังดัน High-NA EUV สำหรับ node ถัดไป รายได้เป็นวัฏจักร (ผูกกับรอบ capex ของโรงงานชิป) แต่คูเมืองลึกที่สุดในวงการเทค — R&D หลายทศวรรษ + ซัพพลายเออร์เฉพาะ (เลนส์ Zeiss) ที่ลอกเลียนไม่ได้ เดิมพันคือดีมานด์ AI ยืดรอบสร้างโรงงานออกไปหลายปี และ ASML เก็บเกี่ยวทั้งจากการขายเครื่องและธุรกิจบริการ (Installed Base) margin สูงที่โตตามฐานเครื่องที่ติดตั้ง",
        "pillars": [
          "ผูกขาด EUV — ผู้ผลิตเครื่อง EUV รายเดียว ไม่มีคู่แข่งสำหรับ lithography ต่ำกว่า 7nm · High-NA EUV ต่อยอดความนำอีกทศวรรษ",
          "ดีมานด์ AI ดัน guidance ขึ้น 2 ครั้งในปี 2026 — FY2026 ยอดขายสุทธิ €43-45B (จาก €36-40B) เมื่อ capex fab ล้ำสมัย (TSMC/Samsung/Intel) เร่งเพื่อ AI",
          "Installed Base Management (บริการ/อัปเกรด) ~€2.8B/ไตรมาส — recurring, margin สูงมาก, โตทุกครั้งที่ขายเครื่อง ช่วยกลบวัฏจักรของยอดขายเครื่อง",
          "Gross margin 54%+ และสูงขึ้น — พลังตั้งราคาของผู้ผูกขาด (guide GM 54-56%)",
          "แรงหนุนเชิงโครงสร้าง: ชิป AI ทุกตัวต้องใช้ ASML — ยิ่งโลกสร้าง compute มากเท่าไร ยิ่งต้องใช้เวเฟอร์ node ล้ำ ยิ่งต้องใช้เครื่อง ASML"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "FY2026 guide €43-45B (~+35% YoY) ยกขึ้น 2 ครั้ง · Q2 2026 €9.3B",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "กลับมาเร่งแรงหลังช่วง digestion 2024-25 — ดีมานด์ AI ทำให้ลูกค้าเร่งสั่งเครื่อง node ล้ำ การยก guidance 2 ครั้งในปีเดียวเป็นสัญญาณดีมานด์ที่หายาก"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS €7.59 (Q2 2026) · net income €2.9B — โตตามรายได้ + margin ที่สูงขึ้น",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "กำไรเร่งตามยอดขายเครื่องและบริการ margin สูง — operating leverage ของธุรกิจผูกขาดทำให้กำไรโตเร็วกว่ารายได้ในขาขึ้นของวัฏจักร"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 2026 FCF ~€1.3B — เป็นบวกแต่ผันผวนสูงตามจังหวะรับเงินลูกค้า/สินค้าคงคลัง",
          "trend": "flat",
          "score": 68,
          "impact": "neutral",
          "why": "FCF ของ ASML แกว่งแรงรายไตรมาส (prepayment ลูกค้า + inventory เครื่องราคาสูง) — ดูเป็นรายปีจะเห็นกระแสเงินสดแข็งแรง แต่เดา timing รายไตรมาสยาก"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross margin 54.0% · operating margin 37.1% (Q2 2026) — สูงมากสำหรับธุรกิจฮาร์ดแวร์",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "margin ระดับซอฟต์แวร์บนธุรกิจเครื่องจักร — พลังตั้งราคาของผู้ผูกขาด + สัดส่วนบริการ margin สูง guide ยกเป็น 54-56%"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงมาก (~30%+) จาก margin สูงและทุนที่ใช้ไม่บวมเท่ารายได้",
          "trend": "up",
          "score": 84,
          "impact": "positive",
          "why": "ผลตอบแทนต่อทุนสูงเด่นจากการผูกขาด — ทุกยูโรที่ลงทุน R&D สร้างเครื่องที่ตั้งราคาได้เต็มที่และมีบริการตามหลังยาว"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "งบดุลแข็ง สถานะใกล้ net cash",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "เงินสดเพียงพอลงทุน R&D High-NA + คืนเงินผู้ถือหุ้น โดยไม่ต้องพึ่งหนี้มาก"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ต่ำเทียบขนาดและกระแสเงินสด",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "งบดุลสะอาด — ความเสี่ยงทางการเงินต่ำ รองรับวัฏจักรขาลงได้โดยไม่ตึง"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "ลดจำนวนหุ้นสุทธิ — buyback + ปันผลต่อเนื่อง, SBC ต่ำ",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "คืนเงินผู้ถือหุ้นสม่ำเสมอและซื้อหุ้นคืนจนจำนวนหุ้นลดลง — เป็นมิตรต่อผู้ถือหุ้นแบบ compounder ยุโรปคลาสสิก"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "R&D หนัก (High-NA EUV) + ปันผลเพิ่ม + buyback ต่อเนื่อง",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "ลงทุน R&D เพื่อรักษาความนำทางเทคโนโลยี (คูเมือง) ควบคู่คืนเงินผู้ถือหุ้นอย่างมีวินัย — จัดสรรทุนระดับตัวอย่างของอุตสาหกรรม"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~40x (ราคา ADR ~$1,815 · mcap ~$700B, ก.ค. 2026)",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "แพงเทียบค่าเฉลี่ยตัวเอง (~30-35x) — ตลาดจ่ายพรีเมียมให้การผูกขาด + reaccel จาก AI ราคาระดับนี้ฝังการเติบโตหลายปี และหุ้นไวต่อสัญญาณ order/วัฏจักรมาก"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 65,
        "recurringPct": 30,
        "note": "รายได้เร่งตัวจากดีมานด์ AI (ยก guidance 2 ครั้ง) แต่มีลักษณะ 'วัฏจักร' สูงเชิงโครงสร้าง — ยอดขายเครื่องขึ้นกับรอบ capex ของโรงงานชิปไม่กี่ราย (จุดอ่อนด้าน consistency) · ตัวถ่วงคือ Installed Base Management (~30% ของยอดขาย) ที่เป็น recurring margin สูงและโตตามฐานเครื่องที่ติดตั้ง ช่วยกลบความผันผวน · หมายเหตุ: ASML เลิกเปิดตัวเลข net bookings รายไตรมาสแล้ว (ล่าสุด Q4'25 €13.2B, EUV €7.4B)",
        "segments": [
          {
            "name": "Net system sales — EUV (รวม High-NA)",
            "sharePct": 40,
            "growthNote": "เครื่องยนต์การโต — node ล้ำสำหรับ AI/HPC · High-NA เริ่มส่งมอบลูกค้าชั้นนำ",
            "trend": "up"
          },
          {
            "name": "Net system sales — DUV + metrology",
            "sharePct": 30,
            "growthNote": "ฐานกว้างสำหรับ node ผู้ใหญ่/mature — โตตามการขยายกำลังการผลิตทั่วไป",
            "trend": "flat"
          },
          {
            "name": "Installed Base Management (บริการ + อัปเกรด)",
            "sharePct": 30,
            "growthNote": "~€2.8B/ไตรมาส — recurring, margin สูงมาก, โตทุกครั้งที่ขายเครื่องเพิ่ม",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 85,
        "items": [
          {
            "item": "ผูกขาด EUV — ผู้เปิดทางเดียวสู่ชิปต่ำกว่า 7nm",
            "status": "executing",
            "evidence": "ชิป AI ล้ำสมัยทุกตัวผลิตได้เพราะเครื่อง EUV ของ ASML — ไม่มีทางเลือกอื่นในเชิงฟิสิกส์ เป็นคอขวดที่ทั้งอุตสาหกรรมต้องผ่าน"
          },
          {
            "item": "High-NA EUV — เครื่อง node ถัดไป",
            "status": "executing",
            "evidence": "ทยอยส่งมอบลูกค้าชั้นนำ (Intel/TSMC/Samsung) และวางแผนขยายกำลังผลิต — ต่อยอดความนำทางเทคโนโลยีไปอีกทศวรรษ แม้ราคาต่อเครื่องสูงมาก (~€350M)"
          },
          {
            "item": "Installed Base Management — บริการ margin สูง recurring",
            "status": "executing",
            "evidence": "~€2.8B/ไตรมาส และโตตามฐานเครื่องที่ติดตั้งสะสม — เปลี่ยนธุรกิจวัฏจักรให้มีขา recurring ที่คาดการณ์ได้และกำไรสูง"
          },
          {
            "item": "ดีมานด์ AI → ยก guidance 2 ครั้งในปี 2026",
            "status": "executing",
            "evidence": "FY2026 ยอดขายสุทธิยกจาก €36-40B เป็น €43-45B และ GM เป็น 54-56% — หลักฐานตรงว่ารอบ capex ล้ำสมัยกำลังเร่งจริงเพื่อ AI"
          },
          {
            "item": "คูเมือง R&D + ซัพพลายเชน (Zeiss optics)",
            "status": "on-track",
            "evidence": "เลนส์ความแม่นยำระดับอะตอมจาก Zeiss + ซัพพลายเออร์หลายพันราย + R&D หลายทศวรรษ — เป็นกำแพงที่แม้ทุ่มเงินมหาศาลก็สร้างใหม่ไม่ได้ในเวลาสั้น"
          },
          {
            "item": "บริหารความเสี่ยงจีนภายใต้ export controls",
            "status": "at-risk",
            "evidence": "จีน ~20% ของยอดขาย ถูกจำกัดโดยกฎสหรัฐ/เนเธอร์แลนด์ — ต้องบริหารทั้งการปฏิบัติตามกฎและความเสี่ยงว่าจีนจะเร่งสร้าง lithography เอง (SMEE)"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองลึกที่สุดแห่งหนึ่งในวงการเทค — ผู้ผลิต EUV รายเดียวในโลก, เลนส์ Zeiss แบบเอกสิทธิ์, ซัพพลายเออร์หลายพันราย, R&D หลายทศวรรษ และลูกค้าร่วมลงทุนพัฒนา — ไม่มีคู่แข่งสำหรับ EUV เลย switching cost แทบเป็นอนันต์ (ไม่มีทางเลือกอื่นในการผลิตชิปล้ำ) แทบเป็นไปไม่ได้ที่จะถูกแทนที่ในหนึ่งทศวรรษข้างหน้า",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ส่วนแบ่ง EUV ~100% (ผูกขาด) · ครองตลาดเครื่อง lithography ล้ำสมัยทั้งหมด"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "High-NA EUV ต่อยอดความนำ — นำหน้าทุกคนที่พยายามเข้ามาแข่งเป็นสิบปี"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "stable",
            "note": "รอบผลิตภัณฑ์ยาว (เครื่องซับซ้อนมาก) — จุดแข็งไม่ใช่ความเร็วแต่คือความสามารถทำสิ่งที่คนอื่นทำไม่ได้เลย"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "strengthening",
            "note": "แทบเป็นอนันต์สำหรับ EUV — ไม่มีทางเลือกอื่น ลูกค้าต้องพึ่งเครื่อง + บริการของ ASML ทั้งวงจรชีวิต"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "ระบบนิเวศซัพพลายเออร์/ลูกค้าที่ลึก (Zeiss, TSMC, Intel, Samsung ร่วมพัฒนา) — ผูกกันแน่นทั้งห่วงโซ่"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ไม่ใช่แพลตฟอร์มซอฟต์แวร์ — มิตินี้ไม่ใช่สนามแข่งของ ASML"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "ลูกค้าพึ่งเครื่อง + Installed Base service ตลอดอายุใช้งานหลายปี — ล็อกแน่นทั้งฮาร์ดแวร์และบริการ"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "ผูกขาด EUV + R&D + Zeiss — คูเมืองที่แทบไม่มีใครโจมตีได้ในทศวรรษนี้ ความเสี่ยงเดียวคือวัฏจักรและการเมืองจีน ไม่ใช่คู่แข่ง"
          }
        ]
      },
      "capitalAllocation": {
        "score": 80,
        "verdict": "จัดสรรทุนระดับตัวอย่าง — ลงทุน R&D หนักเพื่อรักษาคูเมือง (High-NA) ควบคู่คืนเงินผู้ถือหุ้นอย่างมีวินัย (ปันผลเพิ่ม + buyback ลดจำนวนหุ้น) บนงบดุลที่แข็ง จุดที่ต้องยอมรับคือรายได้เป็นวัฏจักร ทำให้ผลตอบแทนแต่ละปีไม่สม่ำเสมอ",
        "items": [
          {
            "label": "R&D",
            "current": "ลงทุนหนักใน High-NA EUV และ node ถัดไป",
            "assessment": "good",
            "why": "เป็นการลงทุนที่รักษาความผูกขาด — คูเมืองของ ASML คือ R&D ที่สะสมมาหลายทศวรรษ"
          },
          {
            "label": "เงินปันผล",
            "current": "เพิ่มต่อเนื่อง",
            "assessment": "good",
            "why": "ประวัติปันผลเพิ่มสม่ำเสมอแบบ compounder — เป็นมิตรต่อผู้ถือหุ้นระยะยาว"
          },
          {
            "label": "Buyback",
            "current": "ซื้อหุ้นคืนต่อเนื่องจนจำนวนหุ้นลดสุทธิ",
            "assessment": "good",
            "why": "คืนเงินส่วนเกินอย่างมีวินัยและเพิ่มมูลค่าต่อหุ้น"
          },
          {
            "label": "การลงทุนกำลังการผลิต",
            "current": "ขยายกำลังผลิต EUV/High-NA ตามดีมานด์",
            "assessment": "neutral",
            "why": "จำเป็นเพื่อรองรับ order แต่ต้องบาลานซ์กับวัฏจักร — สร้างมากไปในขาลงจะเป็นภาระ"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~40x (ราคา ADR ~$1,815, mcap ~$700B) — แพงเทียบค่าเฉลี่ยตัวเอง (~30-35x) ตลาดจ่ายพรีเมียมให้การผูกขาดที่แทบไม่มีความเสี่ยงถูกแทนที่ + reaccel จาก AI · ราคาระดับนี้ฝังการเติบโตหลายปีและทำให้หุ้นไวต่อสัญญาณ order/วัฏจักร fab มาก — คุณภาพธุรกิจสูงสุด แต่ 'ราคาของคุณภาพ' ก็สูงตาม เหมาะสะสมจังหวะย่อของวัฏจักรมากกว่าไล่ราคาช่วง guidance พุ่ง"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "€8.8B",
          "now": "€9.3B — net income €2.9B, op margin 37.1%",
          "direction": "positive"
        },
        {
          "metric": "Guidance FY2026 (ยอดขายสุทธิ)",
          "prev": "€36-40B",
          "now": "€43-45B — ยกครั้งที่ 2 จากดีมานด์ AI",
          "direction": "positive"
        },
        {
          "metric": "Guidance gross margin FY2026",
          "prev": "51-53%",
          "now": "54-56%",
          "direction": "positive"
        },
        {
          "metric": "Gross margin (จริง)",
          "prev": "ตาม guide",
          "now": "54.0% (เหนือ guide จากสัดส่วนบริการ margin สูง)",
          "direction": "positive"
        },
        {
          "metric": "Installed Base Management",
          "prev": "โตตามฐานเครื่อง",
          "now": "€2.8B/ไตรมาส — recurring margin สูง",
          "direction": "positive"
        },
        {
          "metric": "จีน (สัดส่วนยอดขาย)",
          "prev": "—",
          "now": "~20% ภายใต้ export controls สหรัฐ/เนเธอร์แลนด์",
          "direction": "negative"
        }
      ],
      "risks": [
        "วัฏจักร (cyclicality): รายได้ผูกกับรอบ capex ของโรงงานชิป (TSMC/Samsung/Intel) — ถ้ารอบลงทุนชะลอ ยอดขายเครื่องหดแรงและเร็ว (เคยเกิดช่วง digestion 2023-2024) และหุ้น multiple สูงจะโดนลงโทษหนัก",
        "จีน + export controls: ~20% ของยอดขายอยู่ภายใต้กฎจำกัดของสหรัฐ/เนเธอร์แลนด์ — ความตึงเครียดภูมิรัฐศาสตร์เพิ่มความเสี่ยงถูกตัดตลาดเพิ่ม และเร่งให้จีนพยายามสร้าง lithography เอง (SMEE)",
        "การกระจุกตัวของลูกค้า: พึ่งลูกค้าไม่กี่ราย (TSMC เป็นรายใหญ่สุด) — ถ้าลูกค้าหลักเลื่อนแผน fab หรือสะดุด order ก้อนใหญ่กระทบทันที",
        "Valuation ~40x: แพงเทียบประวัติตัวเอง — หุ้นไวมากต่อทุกสัญญาณ order/guidance และจุดกลับของวัฏจักร แม้พื้นฐานผูกขาดไม่เปลี่ยน",
        "High-NA adoption: เครื่องรุ่นถัดไปแพงมาก (~€350M/เครื่อง) — ถ้าลูกค้าชะลอรับ High-NA หรือ node ถัดไปสะดุดทางเทคนิค การเติบโตระยะยาวจะช้าลง"
      ],
      "asOf": "2026-08",
      "nextEarnings": "2026-10",
      "history": {
        "fyNote": "ปีบัญชี = ปีปฏิทิน (สิ้นสุด ธ.ค.) — FY2021-FY2025 · ตัวเลขแปลงเป็น USD (ADR)",
        "epsBasis": "diluted GAAP, USD (ADR) — ASML รายงาน EUR แปลงด้วยอัตราเฉลี่ยรายปี · ไม่มี split",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 22,
            "epsAdj": 16.96,
            "opMarginPct": 36.3,
            "fcfB": 11.8,
            "priceFYEnd": 762.54
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 22.3,
            "epsAdj": 16.92,
            "opMarginPct": 34.6,
            "fcfB": 8.6,
            "priceFYEnd": 531.64
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 29.8,
            "epsAdj": 22.28,
            "opMarginPct": 34.5,
            "fcfB": 4.7,
            "priceFYEnd": 741.19
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 30.6,
            "epsAdj": 22.95,
            "opMarginPct": 35.2,
            "fcfB": 11.1,
            "priceFYEnd": 684.12
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 36.9,
            "epsAdj": 29.69,
            "opMarginPct": 36.9,
            "fcfB": 13.9,
            "priceFYEnd": 1064.74
          }
        ],
        "notes": "ตัวเลขแปลง USD จากงบ EUR ด้วยอัตราเฉลี่ยรายปี (~2-3% ความคลาด) · operating margin เป็นอัตราส่วนจึงไม่ขึ้นกับ FX · FCF ผันผวนสูง: พุ่งปี 2021 (prepayment ลูกค้า) ต่ำสุด ~$4.7B ปี 2023 (สต๊อก/WIP) แล้วฟื้นเป็น ~$14B ปี 2025 · ราคาเป็น ADR (Nasdaq) ปิดสิ้นปีจริง USD ไม่มี split · จำนวนหุ้นลดจาก ~410M เป็น ~389M จาก buyback",
        "sources": [
          "https://stockanalysis.com/stocks/asml/financials/",
          "https://www.asml.com/en/news/press-releases/2026/q2-2026-financial-results"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 6.67,
            "epsAdj": 4.81,
            "opMarginPct": 32.7,
            "fcfB": 0.63,
            "priceQEnd": 580
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 7.24,
            "epsAdj": 5.2,
            "opMarginPct": 33.1,
            "fcfB": 2.61,
            "priceQEnd": 755
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 5.29,
            "epsAdj": 3.11,
            "opMarginPct": 26.3,
            "fcfB": -0.67,
            "priceQEnd": 1020
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 6.24,
            "epsAdj": 4.01,
            "opMarginPct": 29.4,
            "fcfB": 0.39,
            "priceQEnd": 1035
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 7.47,
            "epsAdj": 5.28,
            "opMarginPct": 32.7,
            "fcfB": 0.54,
            "priceQEnd": 845
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 9.26,
            "epsAdj": 6.84,
            "opMarginPct": 36.2,
            "fcfB": 8.84,
            "priceQEnd": 683
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 7.74,
            "epsAdj": 5.99,
            "opMarginPct": 35.4,
            "fcfB": -0.47,
            "priceQEnd": 690
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 7.69,
            "epsAdj": 5.9,
            "opMarginPct": 34.6,
            "fcfB": 0.33,
            "priceQEnd": 785
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 7.52,
            "epsAdj": 5.48,
            "opMarginPct": 32.8,
            "fcfB": 0.26,
            "priceQEnd": 960
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 9.72,
            "epsAdj": 7.34,
            "opMarginPct": 35.3,
            "fcfB": 10.96,
            "priceQEnd": 1080
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 8.77,
            "epsAdj": 7.15,
            "opMarginPct": 36,
            "fcfB": -2.59,
            "priceQEnd": 1250
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 9.33,
            "epsAdj": 7.58,
            "opMarginPct": 37.1,
            "fcfB": 1.4,
            "priceQEnd": 1987
          }
        ],
        "instrument": {
          "shareBasis": "ADR",
          "adrRatio": 1,
          "currency": "USD",
          "note": "ADR 1:1 — ราคาและ EPS ฐานเดียวกัน"
        }
      },
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": null,
            "revenue": 43.21
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~€8.4-9.0B",
            "actual": "~€9.3B",
            "result": "beat",
            "magnitudePct": 6.9
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 43.21,
            "eps": null,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 54.33,
            "eps": null,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "ASML ให้ guidance รายได้เป็นช่วง EUR ทุกไตรมาส + เป้าทั้งปี — ยืนยัน guidance→ผลจริงได้ 1 ไตรมาส (Q2 2026: คาด €8.4-9.0B ทำได้ €9.3B) ไตรมาสก่อนหน้ายังยืนยันตัวเลขไม่ได้จึงไม่บันทึก · <b>บริษัทยกเป้าทั้งปี 2026 สองรอบ: €36-40B → €43-45B</b> (gross margin 51-53% → 54-56%) · guidance Q3 2026 = €11.0-12.0B · ASML เลิกประกาศยอด bookings รายไตรมาสตั้งแต่ Q1 2026 · consensus 37 นักวิเคราะห์เป็นสกุล EUR (rev €43.21B/€54.33B · EPS €38.03/€51.42) — บันทึกเฉพาะ revenue เพราะฐานตรงกับตาราง KB ส่วน EPS เว้นไว้ เนื่องจาก KB ใช้ EPS สกุล USD (ADR) ถ้าใส่ตัวเลข EUR ลงไป Forward P/E จะคำนวณข้ามสกุลและผิด"
      }
    },
    "QQQM": {
      "ticker": "QQQM",
      "name": "Invesco Nasdaq-100 ETF",
      "layer": "enterprise",
      "thesis": {
        "statement": "QQQM คือยานพาหนะต้นทุนต่ำ (expense 0.15%) สำหรับถือ 'ทั้งกระดาน mega-cap เทคโนโลยี/AI' ผ่านดัชนี Nasdaq-100 แบบ full replication — ผู้ถือได้ NVDA, MSFT, GOOG, AMZN, META, AVGO (ซึ่ง 6 ตัวนี้มี thesis เต็มรายตัวใน KB นี้แล้ว) พร้อมกันโดยไม่ต้องเลือกผู้ชนะรายตัว เหมาะเป็น core ของ bucket หุ้นต่างประเทศ เดิมพันหลักคือกำไรของ mega-cap tech ยังโตต่อจากรอบ AI — หมายเหตุสำคัญ: QQQM เป็น ETF ไม่ใช่บริษัท ทุกหัวข้อในหน้านี้ตีความเป็น 'ระดับดัชนี/บริษัทที่ถืออยู่ข้างใน' และไม่มีงบรายไตรมาสของตัวเอง",
        "pillars": [
          "โครงสร้างต้นทุนดีสุดในกลุ่ม — expense 0.15% (ถูกกว่า QQQ 0.20%) + full replication NDX · AUM ~$82.9B สภาพคล่องเหลือเฟือสำหรับผู้ถือระยะยาว",
          "การกระจุกใน AI winners คือฟีเจอร์: top-10 ~47% ของดัชนีคือบริษัทแกน AI ที่กำไรกำลังเร่ง (งบ Q2 2026: Azure +43%, AWS +37%, AVGO AI +143%)",
          "Rebalance เชิงกลไก — ผู้ชนะรายใหม่ไต่น้ำหนักขึ้นเอง ไม่ต้องพึ่งฝีมือผู้จัดการกองทุน ไม่มี style drift",
          "กระจายทั้งห่วงโซ่ AI ในไม้เดียว: ชิป (NVDA AVGO AMD) + cloud (MSFT AMZN GOOG) + model/app (META GOOG) + อุปกรณ์/บริการ (AAPL)",
          "6 ตัวแกนของดัชนีติดตามลึกรายตัวได้ในหน้า Thesis นี้ — ใช้ QQQM เป็น core แล้วใช้ thesis รายตัวจับจังหวะส่วน tactical"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้ (ระดับดัชนี)",
          "current": "บริษัทแกนของดัชนีรายงานงบ Q2 2026 โตแรง — MSFT +18%, AMZN +20%, META +28%, AVGO +48%, NVDA +85%",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เครื่องยนต์กำไรของดัชนีคือ mega-cap AI ที่รายได้ยังเร่งตัว — น้ำหนักดัชนีเอียงเข้าหาบริษัทที่โตแรงโดยอัตโนมัติ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น (ระดับดัชนี)",
          "current": "กำไรรวมของ NDX โตสองหลักจากรอบ AI — หลายตัวแกนโต 20%+",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "การเติบโตกำไรของดัชนีขับด้วย operating leverage ของ mega-cap — เป็นเหตุผลหลักที่ multiple ยังยืนได้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ (ระดับดัชนี)",
          "current": "แกนดัชนีสร้าง OCF มหาศาล แต่ FCF ถูกกดทั้งกระดานจาก AI capex (MSFT ~$190B/ปี, AMZN ~$220B, META $130-145B)",
          "trend": "down",
          "score": 62,
          "impact": "neutral",
          "why": "รอบลงทุน AI กด FCF ของผู้ถือหุ้นใหญ่ในดัชนีพร้อมกัน — เป็นความเสี่ยงร่วม (systematic) ที่กระจายไม่ได้ภายในดัชนีนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร (ระดับดัชนี)",
          "current": "mega-cap แกนดัชนี margin สูงมาก (MSFT op ~45%, NVDA gross ~75%, TSM ~68%)",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "โครงสร้างกำไรของดัชนีแข็งจากธุรกิจ software/platform/semiconductor ที่ margin สูงสุดในตลาดหุ้นโลก"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน (ระดับดัชนี)",
          "current": "สูงตามโปรไฟล์ mega-cap tech แต่ถูกเจือจางจากฐานสินทรัพย์ AI ที่บวมเร็ว",
          "trend": "flat",
          "score": 74,
          "impact": "positive",
          "why": "ROIC รวมของแกนดัชนียังสูง — จุดจับตาเดียวกับ thesis รายตัว: ผลตอบแทนของ AI capex ต้องพิสูจน์ใน 2-3 ปีข้างหน้า"
        },
        {
          "key": "cash",
          "label": "งบดุล (ระดับดัชนี)",
          "current": "แกนดัชนีถือเงินสดรวมหลายแสนล้าน$ — หลายตัวสถานะใกล้ net cash",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "งบดุลรวมของ NDX แข็งแรงที่สุดในบรรดาดัชนีหลักของโลก — ทนวัฏจักรดอกเบี้ย/สินเชื่อได้ดี"
        },
        {
          "key": "debt",
          "label": "หนี้สิน (ระดับดัชนี)",
          "current": "ต่ำเทียบกำไร แต่เริ่มก่อหนี้เพื่อ AI capex มากขึ้น (META ~$30B bond, MSFT lease)",
          "trend": "down",
          "score": 72,
          "impact": "neutral",
          "why": "ทิศทางหนี้ของแกนดัชนีกำลังเพิ่มตามรอบลงทุน — ยังบริหารได้สบายแต่เป็นเทรนด์ที่ต้องรู้"
        },
        {
          "key": "dilution",
          "label": "ต้นทุนกองทุน (แทน dilution)",
          "current": "expense ratio 0.15% — ถูกสุดของ NDX ETF (เทียบ QQQ 0.20%) · ไม่มี dilution แบบบริษัท",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "ต้นทุนแฝงเดียวของผู้ถือคือค่าธรรมเนียม ซึ่งต่ำมาก — ทุก 1 ล้านบาทเสีย ~1,500 บาท/ปี"
        },
        {
          "key": "capitalAllocation",
          "label": "โครงสร้างกองทุน (แทน capital allocation)",
          "current": "full replication ตามดัชนี + rebalance เชิงกลไก · AUM ~$82.9B",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "ไม่มี manager risk — วินัยการจัดพอร์ตคือกฎของดัชนี ผู้ชนะไต่น้ำหนักเอง ผู้แพ้ถูกลดออกเอง"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา (ระดับดัชนี)",
          "current": "NDX P/E ~31.6 (trailing) · forward ~27x — โซนบน-กลางของกรอบ 5 ปี [27.4, 33.4]",
          "trend": "flat",
          "score": 48,
          "impact": "neutral",
          "why": "ไม่ถูกแต่ยังไม่สุดโต่งเทียบประวัติตัวเอง — จ่ายพรีเมียมให้กำไร AI ที่กำลังเร่ง จุดเสี่ยงคือถ้า E ชะลอ multiple โซนบนจะหดแรง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": null,
        "note": "คุณภาพ 'กำไรของดัชนี' ขึ้นกับ mega-cap ~47% แรก — งบ Q2 2026 ของแกนดัชนีแข็งทั่วหน้า (MSFT/AMZN/META/AVGO/NVDA) ทำให้กำไรรวมเร่งตัว · consistency สูงเพราะกระจาย ~100 บริษัท แต่การกระจุกใน top-10 ทำให้พฤติกรรมจริงใกล้ 'ตะกร้า Mag7' มากกว่าดัชนีกว้าง · สัดส่วนด้านล่างคือโครงสร้างน้ำหนักดัชนีโดยประมาณ",
        "segments": [
          {
            "name": "แกน AI ที่มี thesis รายตัวใน KB (NVDA MSFT GOOG AMZN META AVGO)",
            "sharePct": 40,
            "growthNote": "เครื่องยนต์หลักของดัชนี — ทุกตัวมี thesis เต็มในหน้านี้ กดดูรายตัวได้",
            "trend": "up"
          },
          {
            "name": "Tech ใหญ่อื่น (AAPL, TSLA, semis/software ที่เหลือ)",
            "sharePct": 35,
            "growthNote": "AAPL/TSLA + AMD, INTC, software — โตปานกลาง ผสมผลงาน",
            "trend": "flat"
          },
          {
            "name": "Consumer / Healthcare / อื่น ๆ (COST, PEP, ISRG ฯลฯ)",
            "sharePct": 25,
            "growthNote": "ส่วนถ่วงที่ไม่ใช่ tech แท้ — ลดความผันผวนของดัชนีลงเล็กน้อย",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 80,
        "items": [
          {
            "item": "การกระจุกใน AI winners (top-10 ~46.7%)",
            "status": "executing",
            "evidence": "น้ำหนักดัชนีเอียงเข้า NVDA/MSFT/AAPL/AVGO/GOOG/AMZN/META โดยกลไก — ผู้ถือ QQQM ได้ exposure รอบ AI เต็มที่โดยอัตโนมัติ"
          },
          {
            "item": "Earnings delivery ของแกนดัชนี",
            "status": "executing",
            "evidence": "งบ Q2 2026: Azure +43% ($100B+/ปี), AWS +37%, AVGO AI semi +143%, NVDA +85%, META โฆษณา +28% — กำไรจริงตามรอบ AI มาแล้ว"
          },
          {
            "item": "Rebalance เชิงกลไก",
            "status": "executing",
            "evidence": "ดัชนีปรับน้ำหนักตาม market cap — ผู้ชนะใหม่ (เช่น AVGO ที่ AI พุ่ง) ไต่ขึ้นเองโดยผู้ถือไม่ต้องทำอะไร"
          },
          {
            "item": "ไม่มี manager risk / style drift",
            "status": "executing",
            "evidence": "full replication — ผลตอบแทนเบี่ยงจากดัชนีเพียงค่า fee ไม่มีความเสี่ยงฝีมือผู้จัดการ"
          },
          {
            "item": "ใช้คู่กับ Thesis KB รายตัว",
            "status": "on-track",
            "evidence": "6 ตัวแกน (~40% ของดัชนี) มี thesis เต็มในระบบนี้ — ถือ QQQM เป็น core แล้วใช้สัญญาณรายตัวบริหารส่วน tactical"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "ในฐานะ ETF: ค่าธรรมเนียมต่ำสุดของกลุ่ม NDX (0.15%) + ขนาด AUM ~$82.9B + โครงสร้าง Invesco ที่ผูกกับดัชนีหลัก — ในฐานะดัชนี: NDX คือ 'ดัชนี AI ของโลก' ที่บริษัทแกนมี moat ลึกที่สุดในตลาด (ดู thesis รายตัว) · คู่แข่งของ QQQM คือ QQQ (แพงกว่า) และ index funds อื่น — สำหรับผู้ถือยาว QQQM ชนะเชิงต้นทุน",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "NDX คือดัชนีเทคโนโลยีหลักของโลก · QQQM เป็น share class ประหยัดของตระกูล QQQ ที่ใหญ่สุดในกลุ่ม"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี (ผ่านดัชนี)",
            "status": "strengthening",
            "note": "บริษัทที่นำ AI ทุกชั้นอยู่ในดัชนี — ความนำเชิงเทคโนโลยีของ NDX แข็งขึ้นตามรอบ AI"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็ว (rebalance)",
            "status": "stable",
            "note": "ปรับน้ำหนักตามกฎดัชนี — ช้ากว่า active แต่ไม่มีความเสี่ยงตัดสินใจผิด"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้าย",
            "status": "stable",
            "note": "ย้ายไป ETF อื่นง่าย (ตลาดรอง) — moat ของกองคือ fee ต่ำ+ขนาด ไม่ใช่ lock-in"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "stable",
            "note": "อยู่ในตระกูล QQQ ecosystem (options/liquidity ใหญ่สุดของ ETF เทค)"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ไม่เกี่ยวกับ ETF — มิตินี้ดูที่ thesis รายตัวของบริษัทในดัชนี"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินผู้ถือ",
            "status": "stable",
            "note": "ผู้ถือระยะยาวอยู่เพราะต้นทุน/ภาษี (ขายมี capital gain) มากกว่า lock-in เชิงโครงสร้าง"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "moat แท้จริงคือ moat รวมของบริษัทในดัชนี — ซึ่งเป็นกลุ่มที่คูเมืองลึกที่สุดในตลาดโลก และแข็งขึ้นตามรอบ AI"
          }
        ]
      },
      "capitalAllocation": {
        "score": 82,
        "verdict": "โครงสร้างกองทุนสะอาดและถูก — full replication, fee 0.15%, AUM ใหญ่พอไม่มีปัญหาสภาพคล่อง/tracking · ความเสี่ยงเชิงโครงสร้างของตัวกองต่ำมาก ความเสี่ยงจริงทั้งหมดอยู่ที่ 'ดัชนีที่มันถือ' (กระจุก + valuation)",
        "items": [
          {
            "label": "ค่าธรรมเนียม",
            "current": "0.15%/ปี (ถูกกว่า QQQ 0.20%)",
            "assessment": "good",
            "why": "ต่ำสุดในกลุ่ม NDX ETF — เหมาะกับผู้ถือระยะยาวที่สุด"
          },
          {
            "label": "วิธี track ดัชนี",
            "current": "Full replication (ถือครบทุกตัวตามน้ำหนัก)",
            "assessment": "good",
            "why": "tracking error ต่ำ ไม่มีความเสี่ยง sampling/derivative"
          },
          {
            "label": "ขนาดกองทุน",
            "current": "AUM ~$82.9B",
            "assessment": "good",
            "why": "ใหญ่พอสำหรับสภาพคล่อง/spread แคบ โดยไม่มีความเสี่ยงกองเล็กถูกปิด"
          },
          {
            "label": "โครงสร้างภาษี/ปันผล",
            "current": "จ่ายปันผลรายไตรมาส (yield ต่ำตามธรรมชาติ NDX)",
            "assessment": "neutral",
            "why": "ผู้ถือไทยโดนหัก withholding — ประเด็นภาษีเป็นเรื่องผู้ถือ ไม่ใช่ข้อบกพร่องของกอง"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "P/E ดัชนี ~31.6 trailing / forward ~27x — โซนบน-กลางของกรอบ 5 ปีตัวเอง [27.4, 33.4] ไม่ถูกแต่ไม่สุดโต่ง · จ่ายพรีเมียมให้กำไร AI ที่กำลังเร่งจริง (งบ Q2 แกนดัชนี beat ทั่วหน้า) · นัยเชิงปฏิบัติสำหรับ core position: ทยอยสะสมตามแผน/ตอนดัชนีย่อ ดีกว่าไล่ราคาช่วง multiple ชนขอบบน"
      },
      "whatChanged": [
        {
          "metric": "NDX forward P/E (ต้นปี → ก.ค. 2026)",
          "prev": "~27.4x",
          "now": "trailing ~31.6x / fwd ~27x — ขยับเข้าโซนบนของกรอบ",
          "direction": "neutral"
        },
        {
          "metric": "งบ Q2 2026 ของแกนดัชนี",
          "prev": "รอผล",
          "now": "beat ทั่วหน้า: MSFT/Azure +43%, AMZN/AWS +37%, AVGO AI +143%, META +28%, NVDA +85%",
          "direction": "positive"
        },
        {
          "metric": "การกระจุก top-10",
          "prev": "~45-46%",
          "now": "~46.7% — เพิ่มตามรอบ AI",
          "direction": "neutral"
        },
        {
          "metric": "AUM ของกอง",
          "prev": "โตต่อเนื่อง",
          "now": "~$82.9B — เงินไหลเข้า NDX ETF ต้นทุนต่ำต่อเนื่อง",
          "direction": "positive"
        },
        {
          "metric": "AI capex ของแกนดัชนี",
          "prev": "สูง",
          "now": "ยกขึ้นอีกทั้งกระดาน (MSFT ~$190B, AMZN ~$220B, META $130-145B) — กด FCF ร่วมกัน",
          "direction": "negative"
        }
      ],
      "risks": [
        "การกระจุกตัว: top-10 ~47% — พฤติกรรมจริงใกล้ 'ตะกร้า Mag7' ถ้ารอบ AI สะดุด ดัชนีย่อแรงพร้อมกันทั้งกระดาน (กระจายภายในดัชนีไม่ช่วย)",
        "Valuation โซนบนของกรอบ 5 ปี — ถ้ากำไรแกนดัชนีชะลอ (AI capex ไม่คืนทุน) การหดของ multiple จะซ้ำเติมราคา",
        "AI capex cycle เป็นความเสี่ยงร่วมของผู้ถือหุ้นใหญ่เกือบทุกตัวในดัชนี — FCF ถูกกดพร้อมกัน เป็น systematic risk ของไม้นี้",
        "ไม่มี financials/defensive ถ่วง — NDX เป็น tech beta เกือบเพียว รอบ risk-off ดัชนีนี้ลงแรงกว่าตลาดกว้าง",
        "สำหรับผู้ถือไทย: ความเสี่ยง FX (USD/THB) และ withholding tax ของปันผล — ต้องคิดรวมในผลตอบแทนคาดหวัง"
      ],
      "asOf": "2026-07"
    },
    "GULF.BK": {
      "ticker": "GULF.BK",
      "name": "Gulf Development (GULF)",
      "layer": "power",
      "thesis": {
        "statement": "GULF คือผู้ผลิตไฟฟ้าเอกชนรายใหญ่ที่สุดของไทย ที่หลังควบรวม Intouch (เม.ย. 2025) กลายเป็น holding โครงสร้างพื้นฐาน+ดิจิทัล: โรงไฟฟ้า (ก๊าซ/พลังงานหมุนเวียน) + ถือหุ้น AIS ~40% (เครื่องผลิตเงินสด) + ธุรกิจ data center/cloud (Gulf Edge) — มุม AI ของ thesis คือ 'ไฟฟ้าคือคอขวดของ AI ไทย': GULF คุมตั้งแต่ generation → data center → telecom ในกลุ่มเดียว พร้อมแผนลงทุน AI data center ~$4.3B เพิ่ม 2,000MW ใน 5 ปีร่วมกับ Microsoft และ Google Cloud · รายได้แกนมาจากสัญญาซื้อขายไฟระยะยาว (PPA) จึง recurring สูงและคาดการณ์ได้ — เดิมพันคือการแปลงกระแสเงินสดจากไฟฟ้า+AIS ไปสร้างขา AI infrastructure ให้สำเร็จ",
        "pillars": [
          "ผู้นำ IPP ไทย — กำลังผลิตตามสัดส่วนถือหุ้นระดับหลาย GW ผูก PPA ระยะยาวกับ กฟผ. = กระแสเงินสดคาดการณ์ได้หลายทศวรรษ",
          "AIS ~40% หลังควบรวม Intouch — ส่วนแบ่งกำไร ~฿4.4-4.5B/ไตรมาส เป็น cash cow เลี้ยง capex รอบใหม่",
          "AI data center: Gulf Edge × Google Cloud (sovereign cloud) + GSA DC (JV Singtel+AIS, เฟสแรก 25MW) + แผน ~$4.3B / 2,000MW ใน 5 ปีกับ Microsoft/Google",
          "ตำแหน่งเชิงยุทธศาสตร์: ไฟฟ้าคือคอขวดของ data center ไทย — ผู้ผลิตไฟที่ทำ DC เองได้เปรียบเชิงต้นทุน/ความเร็วกว่าผู้เล่น DC ล้วน",
          "Q1 2026 core profit ทำสถิติ ฿9,326M (+43% YoY) — เครื่องยนต์พลังงานยังโตแรงจาก GJP, LNG และโรงไฟฟ้าใหม่ COD"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+21% YoY (Q1 2026 — ฿39.0B) จากโรงไฟฟ้าใหม่ + LNG + ธุรกิจดิจิทัล",
          "trend": "up",
          "score": 74,
          "impact": "positive",
          "why": "โตสองหลักจากกำลังผลิตใหม่ที่ทยอย COD และ LNG trading — การโตของ utility แบบมีสัญญารองรับ ไม่ใช่การเก็งวัฏจักร"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไร",
          "current": "core profit ฿9,326M (Q1 2026, +43% YoY — สถิติใหม่) · net profit ฿9.1B (+39%)",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "กำไรแกนโตแรงจากทั้งพลังงาน (GJP +251%, LNG +140%) และส่วนแบ่ง AIS ฿4,461M — หมายเหตุ: EPS ต่อหุ้นโตช้ากว่ากำไรรวมเพราะฐานหุ้นใหญ่ขึ้นหลังควบรวม"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ผันผวนตามรอบ capex โรงไฟฟ้า/DC — บางปีติดลบตามโมเดล project finance",
          "trend": "flat",
          "score": 45,
          "impact": "neutral",
          "why": "ธรรมชาติของธุรกิจ infra: ลงทุนก้อนใหญ่ล่วงหน้า เก็บเกี่ยวยาว — FCF รวมยังถูกกดจากการสร้าง DC/renewables แต่มี AIS เป็นกระแสเงินสดสม่ำเสมอช่วยถ่วง"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "core margin แข็งแรงตามโครงสร้าง IPP (net margin ~23-24% ใน Q1 2026)",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "margin ของสัญญา PPA มั่นคงและขยายเมื่อโรงใหม่ COD เต็มไตรมาส + mix ดิจิทัล margin สูงเพิ่มขึ้น"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ระดับ utility (กลาง ๆ) — ยกระดับด้วยส่วนแบ่งกำไร AIS ที่ ROIC สูง",
          "trend": "flat",
          "score": 58,
          "impact": "neutral",
          "why": "โครงการไฟฟ้าให้ผลตอบแทนคงที่แบบสัญญา ไม่หวือหวา — มูลค่าเพิ่มจริงอยู่ที่การ recycle เงินสดเข้าธุรกิจ margin สูงกว่า (DC/cloud)"
        },
        {
          "key": "cash",
          "label": "สภาพคล่อง",
          "current": "บริหารผ่านโครงสร้าง project finance + เงินปันผลรับจาก AIS",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "สภาพคล่องพอเพียงแต่ไม่หนา — พึ่งการ refinance และกระแสเงินสดเข้าจาก AIS เป็นตัวหล่อเลี้ยง"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้สูงตามโมเดล project finance (D/E สูงกว่ากลุ่มเทคมาก)",
          "trend": "flat",
          "score": 40,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้างของ IPP — อ่อนไหวต่อดอกเบี้ยและการ refinance แม้หนี้ส่วนใหญ่ผูกกับโครงการที่มีรายได้สัญญารองรับ"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "ฐานหุ้นใหญ่ขึ้นมากจากการควบรวม Intouch (แลกกับได้สินทรัพย์ AIS เข้ามา)",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "การเพิ่มหุ้นเป็นการแลกสินทรัพย์คุณภาพสูง ไม่ใช่การเผาเงิน — แต่ผู้ถือเดิมต้องยอมรับสัดส่วนที่เจือจางลง"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "ควบรวม Intouch สำเร็จ + เท capex เข้า renewables/data center + ปันผลต่อเนื่อง",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "ทีมบริหารมีประวัติ deal ใหญ่ที่สร้างมูลค่า (INTUCH/AIS) — ตอนนี้ recycle เงินสดจากไฟฟ้า+โทรคมเข้า AI infrastructure ซึ่งเป็นเดิมพันที่มีตรรกะเชิงกลยุทธ์"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "P/E TTM ~11x แต่บิดจากกำไรควบรวม ฿56.1bn — normalized (core) ~30x · ราคา ฿66.75 · mcap ~฿997B (ท็อป SET)",
          "trend": "flat",
          "score": 45,
          "impact": "neutral",
          "why": "ตลาดให้พรีเมียมเหนือ utility ปกติจาก AIS + optionality ของ AI data center — ไม่ถูก แต่มีเครื่องยนต์กำไรที่กำลังโตจริงรองรับ ต้อง execute แผน DC เพื่อ justify ราคา"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": 80,
        "note": "คุณภาพรายได้สูงเป็นพิเศษสำหรับหุ้นไทย — แกนหลักคือสัญญา PPA ระยะยาวกับภาครัฐ (คาดการณ์ได้หลายทศวรรษ) + ส่วนแบ่งกำไร AIS ที่สม่ำเสมอ · การเร่งตัวมาจากโรงไฟฟ้าใหม่ COD, LNG trading และ GJP · สัดส่วนด้านล่างเป็นโครงสร้างกำไร/รายได้โดยประมาณหลังควบรวม",
        "segments": [
          {
            "name": "โรงไฟฟ้าก๊าซ (IPP/SPP รวม GJP)",
            "sharePct": 50,
            "growthNote": "แกนหลัก — GJP พลิกโตแรง (+251% YoY ใน Q1) และโรงใหม่ทยอย COD เต็มไตรมาส",
            "trend": "up"
          },
          {
            "name": "ส่วนแบ่งกำไร AIS (~40%)",
            "sharePct": 22,
            "growthNote": "฿4,461M ใน Q1 2026 — cash cow ที่โตตามตลาดมือถือ/enterprise ไทย",
            "trend": "up"
          },
          {
            "name": "พลังงานหมุนเวียน (ในและต่างประเทศ)",
            "sharePct": 13,
            "growthNote": "ทยอย COD ตามแผน PDP — ขาโตระยะยาวที่ margin ดี",
            "trend": "up"
          },
          {
            "name": "LNG shipper & trading",
            "sharePct": 8,
            "growthNote": "18 cargoes ใน Q1 (+140% YoY กำไร) — ขาใหม่ที่สเกลเร็ว",
            "trend": "up"
          },
          {
            "name": "Infrastructure & Digital (Gulf Edge DC, Binance TH, ท่าเรือ)",
            "sharePct": 7,
            "growthNote": "ยังเล็กแต่คือ optionality หลักของ thesis — DC 25MW เฟสแรก + แผน 2,000MW",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 70,
        "items": [
          {
            "item": "Gulf Edge × Google Cloud (sovereign cloud ไทย)",
            "status": "executing",
            "evidence": "พันธมิตรทางการ — ให้บริการ AI/cloud อธิปไตยข้อมูลสำหรับองค์กรไทย เริ่มจาก AIS เป็นลูกค้าแรก"
          },
          {
            "item": "แผน AI data center ~$4.3B / 2,000MW ใน 5 ปี",
            "status": "on-track",
            "evidence": "ประกาศแผนร่วม Microsoft + Google Cloud — ใหญ่ที่สุดในไทย แต่ยังอยู่ช่วงเริ่มก่อสร้าง ต้องติดตาม execution จริง"
          },
          {
            "item": "GSA DC (JV กับ Singtel + AIS)",
            "status": "executing",
            "evidence": "data center เฟสแรก 25MW ก่อสร้าง/เปิดให้บริการ — โมเดล JV ลดความเสี่ยงและได้ know-how จาก Singtel"
          },
          {
            "item": "ข้อได้เปรียบ 'ไฟฟ้า → DC' ครบวงจร",
            "status": "executing",
            "evidence": "ผู้ผลิตไฟรายใหญ่ทำ DC เอง = ต้นทุนไฟและความเร็วเชื่อมต่อ grid เหนือคู่แข่ง DC ล้วน — คอขวดจริงของ AI ไทยคือไฟฟ้า"
          },
          {
            "item": "Synergy กับ AIS (5G/enterprise/cloud)",
            "status": "on-track",
            "evidence": "ช่องขายตรงสู่ลูกค้าองค์กรของ AIS — DC + connectivity + cloud ในกลุ่มเดียว"
          },
          {
            "item": "Gulf Binance (exchange ไทย)",
            "status": "on-track",
            "evidence": "ขาดิจิทัลเสริม — ยังเล็กเชิงกำไร เป็น optionality มากกว่าแกน"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองแบบ infra ไทย: สัญญา PPA ระยะยาว + ใบอนุญาต/สัมปทานที่ผู้เล่นใหม่เข้ายาก + ทุนหนาและต้นทุนเงินต่ำกว่าคู่แข่ง + สายสัมพันธ์เชิงนโยบายที่แข็ง — และหลังควบรวม กลายเป็นรายเดียวในไทยที่คุม value chain ไฟฟ้า → data center → telecom ครบในกลุ่มเดียว ซึ่งเป็นตำแหน่งที่ลอกเลียนยากมากสำหรับรอบ AI ของไทย",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "IPP เอกชนรายใหญ่สุดของไทย + หนึ่งใน market cap สูงสุดของ SET หลังควบรวม"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "ไม่ใช่ผู้สร้างเทคเอง — ใช้พันธมิตร (Google, Microsoft, Singtel) เข้าถึงเทคโนโลยี DC/cloud ระดับโลก"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ประวัติสร้างโรงไฟฟ้า/ปิดดีลใหญ่ตามแผนสม่ำเสมอ — ควบรวม INTUCH จบเร็วกว่าที่ตลาดคาด"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "stable",
            "note": "PPA คือสัญญาผูกยาวโดยธรรมชาติ · ฝั่ง DC ลูกค้า enterprise ย้ายยากเมื่อ workload ลงแล้ว"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "ไฟฟ้า + DC + AIS (มือถือ/enterprise) + Binance — ระบบนิเวศ infra-ดิจิทัลเดียวในไทย"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "ไม่ใช่สนามของ utility — ฝาก ecosystem นักพัฒนาไว้กับพันธมิตร cloud"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "กฟผ./ภาครัฐผูกด้วย PPA · AIS ผูกฐานลูกค้ามือถือใหญ่สุดของประเทศ"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "strengthening",
            "note": "ใบอนุญาต + ทุน + สายสัมพันธ์ + value chain ครบ — คู่แข่ง DC ไทย (WHA, TRUE/ต่างชาติ) ไม่มีขาไฟฟ้าเป็นของตัวเอง"
          }
        ]
      },
      "capitalAllocation": {
        "score": 72,
        "verdict": "ทีมบริหารมีประวัติจัดสรรทุนเชิงรุกที่สร้างมูลค่าจริง (ดีล INTUCH/AIS) — ตอนนี้อยู่โหมด recycle กระแสเงินสดจากไฟฟ้า+โทรคมเข้า AI infrastructure จุดต้องจับตาคือหนี้ที่สูงตามโมเดลและวินัยการลงทุน DC ให้ได้ผลตอบแทนจริง ไม่ใช่แค่ตามกระแส",
        "items": [
          {
            "label": "M&A (ควบรวม Intouch)",
            "current": "ปิดดีลสำเร็จ เม.ย. 2025 — ได้ AIS ~40% เข้าพอร์ต",
            "assessment": "good",
            "why": "ดีลเปลี่ยนโครงสร้างที่ให้ cash cow ระยะยาว — จ่ายด้วยหุ้นแลกสินทรัพย์คุณภาพ"
          },
          {
            "label": "CapEx พลังงาน (ก๊าซ/renewables)",
            "current": "ทยอย COD ตามแผน PDP",
            "assessment": "good",
            "why": "ลงทุนแบบมีสัญญารองรับ — ความเสี่ยง demand ต่ำ"
          },
          {
            "label": "CapEx AI data center (~$4.3B/5 ปี)",
            "current": "เริ่มเฟสแรก (GSA DC 25MW) + แผน 2,000MW",
            "assessment": "neutral",
            "why": "เดิมพันใหญ่ที่มีตรรกะ แต่ผลตอบแทนยังต้องพิสูจน์ — ตลาด DC ไทยแข่งขึ้นเรื่อย ๆ"
          },
          {
            "label": "เงินปันผล",
            "current": "จ่ายต่อเนื่อง โตตามกำไร",
            "assessment": "good",
            "why": "กระแสเงินสด PPA + AIS รองรับปันผลได้มั่นคง"
          },
          {
            "label": "โครงสร้างหนี้",
            "current": "D/E สูงตามโมเดล project finance",
            "assessment": "neutral",
            "why": "ปกติของอุตสาหกรรมแต่ลดความยืดหยุ่น — ดอกเบี้ยขาขึ้นคือแรงกดโดยตรง"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "P/E headline ~11x (บิดจากกำไรควบรวมครั้งเดียว ฿56.1bn ที่จะหลุด TTM หลัง ส.ค. 2026) — ฐาน core จริง ~30x · ราคา ฿66.75, mcap ~฿997B (ท็อปของ SET) · หุ้น +60% YTD 2026 หลังร่วง 30% ปี 2025 — แพงกว่า utility ทั่วไปหลายเท่า ตลาดให้ค่ากับ AIS + optionality ของ AI data center · ถ้ามองเป็น 'utility' คือแพง ถ้ามองเป็น 'ทางด่วน AI infra ของไทย' คือจ่ายพรีเมียมรอ execution — ควรติดตามความคืบหน้า DC เป็นตัวชี้ขาด ไม่ใช่แค่กำไรพลังงานรายไตรมาส"
      },
      "whatChanged": [
        {
          "metric": "Core profit (Q1 2025 → Q1 2026)",
          "prev": "฿6,506M",
          "now": "฿9,326M (+43% — สถิติใหม่)",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวม",
          "prev": "฿32.3B",
          "now": "฿39.0B (+21% YoY)",
          "direction": "positive"
        },
        {
          "metric": "ส่วนแบ่งกำไร GJP (ก๊าซ)",
          "prev": "฿175M",
          "now": "฿614M (+251%)",
          "direction": "positive"
        },
        {
          "metric": "LNG shipper",
          "prev": "฿85M",
          "now": "฿204M (+140% · 18 cargoes ~1.2 ล้านตัน)",
          "direction": "positive"
        },
        {
          "metric": "ส่วนแบ่งกำไร AIS",
          "prev": "รับรู้ผ่าน INTUCH",
          "now": "฿4,461M — รับรู้ตรงหลังควบรวม",
          "direction": "positive"
        },
        {
          "metric": "แผน AI data center",
          "prev": "GSA DC 25MW เฟสแรก",
          "now": "ประกาศแผน ~$4.3B เพิ่ม 2,000MW ใน 5 ปี (Microsoft + Google Cloud)",
          "direction": "positive"
        }
      ],
      "risks": [
        "หนี้สูงตามโมเดล project finance — อ่อนไหวต่อดอกเบี้ยและการ refinance · การทุ่ม capex DC เพิ่มจะยิ่งกดงบดุลก่อนรายได้ตามมา",
        "Execution risk ของแผน AI DC 2,000MW — ตลาด data center ไทยแข่งเดือด (WHA, TRUE/ต่างชาติ, hyperscaler สร้างเอง) และดีมานด์จริงของ AI ไทยยังต้องพิสูจน์",
        "ความเสี่ยงนโยบาย/กฎเกณฑ์: ค่าไฟ, โครงสร้าง PDP, กกพ. — รายได้แกนผูกกับภาครัฐไทยสูงมาก การเมืองเปลี่ยน = ความเสี่ยงเชิงโครงสร้าง",
        "Valuation premium ~25-30x บนหุ้น SET ที่สภาพคล่อง/flow ต่างชาติผันผวน — ถ้า DC story สะดุด multiple หดแรง",
        "การพึ่งพา AIS เป็นสัดส่วนกำไรใหญ่ — การแข่งขัน telecom ไทย (TRUE) หรือ regulation ค่าบริการกระทบ GULF ทางตรง"
      ],
      "asOf": "2026-08",
      "nextEarnings": "2026-11",
      "history": {
        "currency": "฿",
        "fyNote": "ปีบัญชี = ปีปฏิทิน (สิ้นสุด ธ.ค.) — หน่วยเป็นพันล้านบาท (฿B)",
        "epsBasis": "EPS ตามรายงาน (฿/หุ้น) · FY2025 ใช้ฐาน core (~฿2.0) แทนตัวเลขรายงาน ฿6.04 ที่รวมกำไรควบรวม Intouch ครั้งเดียว ฿56.1bn",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 52.9,
            "epsAdj": 0.65,
            "opMarginPct": 16.2,
            "fcfB": -8.2,
            "priceFYEnd": 45.75
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 95.1,
            "epsAdj": 0.97,
            "opMarginPct": 12.1,
            "fcfB": -6.4,
            "priceFYEnd": 55.25
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 117,
            "epsAdj": 1.27,
            "opMarginPct": 13,
            "fcfB": -1.8,
            "priceFYEnd": 44.5
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 124.6,
            "epsAdj": 1.55,
            "opMarginPct": 15,
            "fcfB": -7.7,
            "priceFYEnd": 59.5
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 135.6,
            "epsAdj": 2,
            "opMarginPct": 21,
            "fcfB": 5.3,
            "priceFYEnd": 41.75
          }
        ],
        "notes": "ตัวเลขประมาณ ~2-3% · margin = net margin (GULF มี equity income ของ AIS/INTUCH อยู่ใต้บรรทัดรายได้ จึงไม่ใช้ operating margin) · FY2025: กำไรรายงาน ฿86.6bn รวม one-time ควบรวม ฿56.1bn — ใช้ core ฿28.8bn / EPS core ~฿2.0 / margin core ~21% แทน · หุ้นเพิ่ม 11.73→14.94bn จาก swap ควบรวม (×1.02974 ราคาต่อเนื่อง ~3%) · FCF ติดลบ 2021-24 ตามรอบสร้างโรงไฟฟ้า พลิกบวก ฿5.3bn ปี 2025 · ราคาปิดปีจริง — ปี 2025 หุ้นร่วง ~30% (SET ซบ + merger re-rating) แล้ว rally ~60% ใน 2026 (ปัจจุบัน ~฿66.75)",
        "sources": [
          "https://www.gulf.co.th/en/newsroom/ (FY2021-2025 + Q1/2026 press releases)",
          "https://stockanalysis.com/quote/bkk/GULF/",
          "https://www.digrin.com/stocks/detail/GULF.BK/price"
        ],
        "quarters": [
          {
            "q": "Q2'23",
            "endYm": "2023-06",
            "revenueB": 32.56,
            "epsAdj": 0.25,
            "opMarginPct": 15,
            "fcfB": -0.32,
            "priceQEnd": 48,
            "endDate": "2023-06-30"
          },
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 27.42,
            "epsAdj": 0.29,
            "opMarginPct": 17.8,
            "fcfB": 3.64,
            "priceQEnd": 46,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 27.67,
            "epsAdj": 0.41,
            "opMarginPct": 15.7,
            "fcfB": -6.17,
            "priceQEnd": 41,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 31.6,
            "epsAdj": 0.3,
            "opMarginPct": 16.1,
            "fcfB": -0.95,
            "priceQEnd": 43,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 31.59,
            "epsAdj": 0.4,
            "opMarginPct": 16.5,
            "fcfB": 0.27,
            "priceQEnd": 46,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 30.45,
            "epsAdj": 0.51,
            "opMarginPct": 16.2,
            "fcfB": -2.27,
            "priceQEnd": 62,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 27.25,
            "epsAdj": 0.33,
            "opMarginPct": 20.2,
            "fcfB": -4.8,
            "priceQEnd": 55,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 30.78,
            "epsAdj": 0.46,
            "opMarginPct": 20.1,
            "fcfB": -1.13,
            "priceQEnd": 47,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 38.52,
            "epsAdj": 4.28,
            "opMarginPct": 14.5,
            "fcfB": 1.72,
            "priceQEnd": 52,
            "endDate": "2025-06-30"
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 29.04,
            "epsAdj": 0.49,
            "opMarginPct": 19.4,
            "fcfB": 6.13,
            "priceQEnd": 48,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 62.11,
            "epsAdj": 0.95,
            "opMarginPct": 18.3,
            "fcfB": -1.42,
            "priceQEnd": 41,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 37.64,
            "epsAdj": 0.61,
            "opMarginPct": 20.6,
            "fcfB": -5.37,
            "priceQEnd": 55,
            "endDate": "2026-03-31"
          }
        ],
        "instrument": {
          "shareBasis": "common",
          "currency": "THB",
          "note": "หุ้นสามัญ SET สกุล ฿ ทั้งราคาและ EPS"
        }
      },
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "~฿50,294M (+24% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "~฿37,640M",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "<b>งบ Q2/2569 ออกแล้ว (11 ส.ค. 2026) แต่ตาราง KB ยังมีถึง Q1'26 เท่านั้น</b> — ตัวเลขที่ยืนยันได้: รายได้รวม ~฿50,294M (+24% YoY) · Core Profit ~฿12,332M (+74% YoY นิวไฮ) · EBITDA ~฿18,997M (+41%) · กำไรสุทธิส่วนผู้ถือหุ้นใหญ่ ~฿12,446M (ลดจากปีก่อนเพราะ Q2/2568 มีกำไรพิเศษจากการควบรวม INTUCH ~฿56,120M) · <b>ยังเติมแถวไตรมาสไม่ได้เพราะหา EPS ต่อหุ้นที่ยืนยันได้ไม่เจอ</b> (ต้องดูงบจริงจาก SET) — ถ้าคำนวณจากจำนวนหุ้นที่เดาเองจะเป็นการมโน จึงเว้นไว้รอรอบหน้า · GULF ไม่ให้ guidance รายได้รายไตรมาส · ยังไม่พบ consensus รายปีที่อ้างอิงได้แบบสาธารณะ"
      }
    },
    "PLTR": {
      "ticker": "PLTR",
      "name": "Palantir Technologies",
      "layer": "enterprise",
      "thesis": {
        "statement": "PLTR คือผู้นำซอฟต์แวร์ AI สำหรับองค์กรและภาครัฐ — Gotham (รัฐบาล/กลาโหม) + Foundry (พาณิชย์) + AIP (Artificial Intelligence Platform) ที่จุดการเติบโตรอบใหม่ · มุม AI ของ thesis คือ 'จาก POC สู่ production': AIP bootcamp เปลี่ยนการทดลองเป็นระบบใช้งานจริงได้เร็ว ทำให้ US commercial โตระเบิด (+149% YoY) ขณะฐานรัฐบาลยังโตแข็ง (+90%) · คูเมืองคือ ontology + การผูกข้อมูล/เวิร์กโฟลว์ลูกค้าลึกจน switching cost สูงมาก · เดิมพันจริงคือ valuation สุดขั้ว (forward P/E ~80x) — การเติบโตต้องแรงและยาวพอที่จะ justify multiple ไม่งั้นเสี่ยง multiple compression รุนแรง",
        "pillars": [
          "AIP = เครื่องยนต์การเติบโต — bootcamp เปลี่ยน POC เป็น production เร็ว ดัน US commercial +149% YoY (Q2 2026)",
          "ฐานรัฐบาล/กลาโหมมั่นคงและโตต่อ (+90% US gov) — สัญญาระยะยาว entrenchment สูง ผู้เล่นใหม่เข้าแทนยาก",
          "Ontology + data integration = คูเมือง — ผูกข้อมูลและเวิร์กโฟลว์ลูกค้าลึก switching cost สูงมากเมื่อขึ้น production",
          "Rule of 40 = 155% (ดีที่สุดในกลุ่มซอฟต์แวร์) — โต 93% พร้อม adj operating margin 62% และ FCF แรงในเวลาเดียวกัน",
          "Land-and-expand: remaining US commercial deal value >$6.24B (>2x YoY) · ปิดดีล ≥$1M ถึง 220 ดีลใน Q2"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+93% YoY (Q2 2026 — $1.94B) · US commercial +149% · US gov +90% — เร่งตัวต่อเนื่อง",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "การเติบโตเร่งขึ้นจริงและกระจายทั้งพาณิชย์และรัฐ — US commercial เกือบ 2.5 เท่า YoY จาก AIP ที่เปลี่ยนดีมานด์ AI เป็นสัญญาจริง · FY26 guide ยกเป็น $8.15B (+82%)"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไร",
          "current": "adj EPS $0.41 (Q2 2026, ชนะคาด ~$0.28) · GAAP กำไรต่อเนื่อง",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้เพราะ operating leverage สูง — margin ขยายพร้อมการโต (ต่างจากบริษัทโตเร็วทั่วไปที่ต้องเผาเงิน)"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "adj FCF guide FY26 ~$4.5-4.7B (FCF margin ~55%)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "เครื่องผลิตเงินสดชั้นดี — โมเดล asset-light + prepay จากลูกค้ารัฐ ทำให้ FCF margin สูงผิดปกติสำหรับบริษัทโตเร็ว"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "adj operating margin ~62% (Q2 2026) · Rule of 40 = 155%",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "margin ระดับท็อปของอุตสาหกรรมและยังขยาย — operating leverage ของแพลตฟอร์มซอฟต์แวร์ที่ scale แล้ว (หมายเหตุ: เป็น adjusted ที่บวก SBC กลับ)"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูง — asset-light, กำไรจริง, ไม่ต้องลงทุน capex หนัก",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "ธุรกิจซอฟต์แวร์ที่ไม่ต้องใช้ทุนหนัก + กำไรจริงเป็นบวก → ROIC สูงเชิงโครงสร้าง แต่ถ้าคิดรวม SBC เป็นต้นทุนจริงจะลดทอนลง"
        },
        {
          "key": "cash",
          "label": "สภาพคล่อง",
          "current": "เงินสด + เงินลงทุน ~$6B+ · ไม่มีหนี้",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "งบดุลแข็งมาก เงินสดหนา ไม่มีภาระหนี้ — ยืดหยุ่นสูงและทน downturn ได้ดี"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "ไม่มีหนี้ระยะยาว — net cash เต็มตัว",
          "trend": "flat",
          "score": 92,
          "impact": "positive",
          "why": "ปลอดหนี้ ไม่มีความเสี่ยงจากดอกเบี้ย/refinance — จุดแข็งด้านความมั่นคงทางการเงิน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "SBC สูงตามสไตล์บริษัทซอฟต์แวร์โตเร็ว — เจือจางต่อเนื่องแม้อัตราเริ่มดีขึ้น",
          "trend": "flat",
          "score": 45,
          "impact": "negative",
          "why": "จุดอ่อนหลัก — margin/EPS ที่โชว์เป็น adjusted บวก SBC กลับ ทำให้ 'กำไรจริง' ต่อหุ้นถูกเจือจาง · ต้องดูว่าอัตรา dilution ลดลงตามการ scale ไหม"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "มีโครงการ buyback + ลงทุนหนักใน R&D/AIP · ไม่มีปันผล (ยังโตเร็ว)",
          "trend": "up",
          "score": 68,
          "impact": "neutral",
          "why": "ทีมบริหารเน้นการเติบโตเป็นหลัก การซื้อหุ้นคืนบางส่วนช่วยชดเชย dilution — ยังพิสูจน์วินัยการจัดสรรทุนระยะยาวไม่นานพอ"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~80x (สูงกว่ามัธยฐานซอฟต์แวร์ ~4 เท่า) — แพงสุดขั้ว",
          "trend": "down",
          "score": 18,
          "impact": "negative",
          "why": "ตลาดจ่ายล่วงหน้าให้การเติบโตหลายปี — แม้ธุรกิจดีเยี่ยม แต่ margin of safety แทบไม่มี ความเสี่ยง multiple compression สูงที่สุดในพอร์ต AI · ราคาแพงคือความเสี่ยงหลัก ไม่ใช่คุณภาพธุรกิจ"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": 80,
        "note": "คุณภาพรายได้สูงและเร่งตัว — US commercial ขับด้วย AIP (land-and-expand, remaining deal value >$6.24B) และฐานรัฐบาลที่เหนียวและคาดการณ์ได้ · รายได้ส่วนใหญ่เป็น subscription/สัญญาต่อเนื่อง แต่ฝั่งรัฐมี lumpiness จากสัญญาก้อนใหญ่เป็นครั้งคราว",
        "segments": [
          {
            "name": "US Government (Gotham/กลาโหม)",
            "sharePct": 42,
            "growthNote": "$809M (+90% YoY) — ฐานเหนียว entrenchment สูง โตเร็วขึ้นจาก AI defense",
            "trend": "up"
          },
          {
            "name": "US Commercial (AIP/Foundry)",
            "sharePct": 39,
            "growthNote": "$764M (+149% YoY) — เครื่องยนต์การเติบโต land-and-expand จาก AIP bootcamp",
            "trend": "up"
          },
          {
            "name": "International (commercial + government)",
            "sharePct": 19,
            "growthNote": "โตช้ากว่า US — ยุโรปยังอืด แต่ตะวันออกกลาง/พันธมิตรกลาโหมเริ่มขยับ",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 92,
        "items": [
          {
            "item": "AIP (Artificial Intelligence Platform) → production",
            "status": "executing",
            "evidence": "bootcamp เปลี่ยน POC เป็นระบบใช้จริงเร็ว — US commercial +149% YoY คือหลักฐานว่าเปลี่ยนดีมานด์ AI เป็นรายได้จริงได้"
          },
          {
            "item": "AI ด้านกลาโหม/รัฐ (Gotham, Warp Speed)",
            "status": "executing",
            "evidence": "US gov +90% YoY — สัญญากลาโหม/หน่วยงานความมั่นคงที่ผู้เล่นใหม่เข้าแทนยากมาก"
          },
          {
            "item": "Ontology + Apollo (deployment layer)",
            "status": "executing",
            "evidence": "โครงสร้างผูกข้อมูล/เวิร์กโฟลว์ลูกค้า = คูเมืองจริง — ทำให้ AIP ต่างจากแชตบอต/copilot ทั่วไป"
          },
          {
            "item": "โมเมนตัมดีลใหญ่",
            "status": "executing",
            "evidence": "ปิดดีล ≥$1M ถึง 220 ดีล (98 ดีล ≥$5M, 70 ดีล ≥$10M) ใน Q2 · remaining US commercial deal value >$6.24B"
          },
          {
            "item": "ขยายสู่ verticals ใหม่ (manufacturing, healthcare, การเงิน)",
            "status": "on-track",
            "evidence": "AIP กระจายอุตสาหกรรมกว้างขึ้น — เพิ่ม TAM แต่ยังต้องพิสูจน์ความลึกเทียบฐานรัฐ"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองของ PLTR ไม่ใช่โมเดล AI แต่คือชั้นที่อยู่ 'ใต้' โมเดล — ontology ที่ผูกข้อมูลจริงขององค์กร/รัฐเข้ากับเวิร์กโฟลว์และการตัดสินใจ · เมื่อขึ้น production แล้วการถอดออกแทบเป็นไปไม่ได้ (switching cost สูงมาก) · ฝั่งรัฐยังมี entrenchment + security clearance + track record หลายปีที่ผู้เล่นใหม่เลียนแบบไม่ทัน — เป็นคูเมืองแบบ 'ฝังลึก' มากกว่า 'เทคโนโลยีล้ำ' และทนต่อการมาของ foundation model ใหม่ ๆ ได้",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ผู้นำซอฟต์แวร์ AI สำหรับองค์กร/รัฐที่ขึ้น production จริง — นำหน้าคู่แข่งด้าน 'ใช้งานได้จริงในสเกลใหญ่'"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "ontology/AIP เป็นสถาปัตยกรรมเฉพาะตัว — ไม่ได้แข่งสร้างโมเดล แต่แข่งที่ชั้นเชื่อมโมเดลกับข้อมูล/การทำงานจริง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "bootcamp ปิดดีลและขึ้น production เร็วผิดปกติ — เปลี่ยนวงจรขายองค์กรที่เคยยาวให้สั้นลง"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการเปลี่ยน",
            "status": "strengthening",
            "note": "เมื่อข้อมูล/เวิร์กโฟลว์ผูกกับ ontology แล้ว การย้ายออกกระทบทั้งองค์กร — lock-in สูงมาก"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "stable",
            "note": "partner + Apollo + AIP builder — กำลังก่อตัว ยังไม่กว้างเท่า hyperscaler แต่เติบโต"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "strengthening",
            "note": "AIP bootcamp สร้างชุมชน builder ในองค์กร — การยอมรับเพิ่มจากผู้ใช้จริงในงาน ไม่ใช่แค่ทดลอง"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "strengthening",
            "note": "ขึ้น production = embed ลึกในการตัดสินใจประจำวัน · net expansion สูง (land-and-expand)"
          },
          {
            "key": "moat",
            "label": "คูเมืองโดยรวม",
            "status": "strengthening",
            "note": "data integration + gov entrenchment — คูเมืองฝังลึก ทนการมาของโมเดล AI ใหม่ ๆ ได้ดี"
          }
        ]
      },
      "capitalAllocation": {
        "score": 68,
        "verdict": "เน้นการเติบโตเป็นหลัก + เริ่มซื้อหุ้นคืนบางส่วนเพื่อชดเชย dilution · วินัยการจัดสรรทุนระยะยาวยังพิสูจน์ไม่นานพอ แต่งบดุลปลอดหนี้ให้ความยืดหยุ่นสูง",
        "items": [
          {
            "label": "โครงการซื้อหุ้นคืน",
            "current": "มี buyback authorization เพื่อชดเชย SBC บางส่วน",
            "assessment": "neutral",
            "why": "ช่วยลดแรงเจือจาง แต่ยังไม่มากพอกลบ SBC ทั้งหมด — เป็นสัญญาณเริ่มใส่ใจ dilution"
          },
          {
            "label": "ลงทุน R&D / AIP",
            "current": "ลงทุนหนักต่อเนื่องในแพลตฟอร์ม AIP และ ontology",
            "assessment": "good",
            "why": "เป็นหัวใจของคูเมืองและการเติบโต — ROI ปรากฏชัดใน US commercial ที่โตระเบิด"
          },
          {
            "label": "การลงทุนเชิงกลยุทธ์",
            "current": "ลงทุนในบริษัทพันธมิตร/ลูกค้าบางราย",
            "assessment": "neutral",
            "why": "เพิ่มการผูกลูกค้า แต่ต้องระวังการลงทุนที่วนกลับมาเป็นรายได้ตัวเอง (round-tripping)"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี — เก็บกระแสเงินสดไว้ลงทุน/ซื้อหุ้นคืน",
            "assessment": "neutral",
            "why": "เหมาะกับช่วงเติบโตเร็ว — คืนทุนผ่าน buyback มากกว่าปันผล"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~80x (แพงกว่ามัธยฐานซอฟต์แวร์ ~4 เท่า) — แพงที่สุดในบรรดาหุ้น AI ขนาดใหญ่ · ธุรกิจคุณภาพเยี่ยม (Rule of 40 = 155%, FCF margin ~55%) แต่ราคาสะท้อนการเติบโตหลายปีล่วงหน้าไปแล้ว margin of safety แทบไม่มี · ความเสี่ยงหลักไม่ใช่คุณภาพธุรกิจ แต่คือ multiple compression — ถ้าการเติบโตชะลอแม้เล็กน้อย หุ้นเหวี่ยงลงแรง · เป็นตัวที่ 'ธุรกิจนำหน้าคู่แข่ง แต่ราคานำหน้าธุรกิจ' ชัดที่สุดในพอร์ต"
      },
      "whatChanged": [
        {
          "metric": "รายได้เติบโต YoY (Q2 2026)",
          "prev": "Q1'26 ~+72%",
          "now": "+93% YoY ($1.94B) — เร่งตัว",
          "direction": "positive"
        },
        {
          "metric": "US Commercial YoY",
          "prev": "~+120%",
          "now": "+149% YoY ($764M)",
          "direction": "positive"
        },
        {
          "metric": "FY 2026 guidance",
          "prev": "$7.65-7.66B",
          "now": "$8.15-8.16B (+82% YoY) — ยกขึ้น",
          "direction": "positive"
        },
        {
          "metric": "Q3 2026 guidance (ใหม่)",
          "prev": "—",
          "now": "$2.160-2.164B (~+83% YoY) — ทะลุ $2B ต่อไตรมาสครั้งแรก",
          "direction": "positive"
        },
        {
          "metric": "adj EPS",
          "prev": "คาด ~$0.28",
          "now": "$0.41 (ชนะคาดชัด)",
          "direction": "positive"
        },
        {
          "metric": "Rule of 40",
          "prev": "~145%",
          "now": "155% (12 ไตรมาสติดที่ขยายตัว)",
          "direction": "positive"
        }
      ],
      "risks": [
        "Valuation สุดขั้ว (forward P/E ~80x) — ความเสี่ยง multiple compression สูงที่สุดในพอร์ต หุ้นเหวี่ยงแรงตามข่าว/โมเมนตัม",
        "SBC/dilution สูง — margin และ EPS ที่โชว์เป็น adjusted บวก SBC กลับ 'กำไรจริง' ต่อหุ้นถูกเจือจาง",
        "พึ่งรัฐบาล/สัญญาก้อนใหญ่ — รายได้ฝั่งรัฐ lumpy และอ่อนไหวต่อการเมือง/งบประมาณ",
        "Key-man risk (Alex Karp) + วัฒนธรรมองค์กรเฉพาะตัวที่ผูกกับผู้นำ",
        "คู่แข่ง hyperscaler / foundation model providers ขยับเข้าพื้นที่ AI application ระดับองค์กร"
      ],
      "asOf": "2026-08",
      "nextEarnings": "2026-11",
      "history": {
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 1.54,
            "epsAdj": 0.04,
            "opMarginPct": 27,
            "fcfB": 0.32,
            "priceFYEnd": 18.2
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 1.91,
            "epsAdj": 0.06,
            "opMarginPct": 22,
            "fcfB": 0.18,
            "priceFYEnd": 6.4
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 2.23,
            "epsAdj": 0.25,
            "opMarginPct": 28,
            "fcfB": 0.7,
            "priceFYEnd": 17.2
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 2.87,
            "epsAdj": 0.41,
            "opMarginPct": 38,
            "fcfB": 1.14,
            "priceFYEnd": 75.6
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 4.4,
            "epsAdj": 0.7,
            "opMarginPct": 45,
            "fcfB": 1.9,
            "priceFYEnd": 170
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 0.558,
            "epsAdj": 0.03,
            "opMarginPct": 7.2,
            "fcfB": 0.132,
            "priceQEnd": 16
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 0.608,
            "epsAdj": 0.04,
            "opMarginPct": 10.8,
            "fcfB": 0.296,
            "priceQEnd": 17
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 0.634,
            "epsAdj": 0.04,
            "opMarginPct": 12.8,
            "fcfB": 0.127,
            "priceQEnd": 23
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 0.678,
            "epsAdj": 0.06,
            "opMarginPct": 15.5,
            "fcfB": 0.141,
            "priceQEnd": 25
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 0.726,
            "epsAdj": 0.06,
            "opMarginPct": 15.6,
            "fcfB": 0.416,
            "priceQEnd": 37
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 0.828,
            "epsAdj": 0.03,
            "opMarginPct": 1.3,
            "fcfB": 0.457,
            "priceQEnd": 76
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 0.884,
            "epsAdj": 0.08,
            "opMarginPct": 19.9,
            "fcfB": 0.304,
            "priceQEnd": 88
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 1.004,
            "epsAdj": 0.13,
            "opMarginPct": 26.8,
            "fcfB": 0.532,
            "priceQEnd": 137
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 1.181,
            "epsAdj": 0.18,
            "opMarginPct": 33.3,
            "fcfB": 0.501,
            "priceQEnd": 180
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 1.407,
            "epsAdj": 0.24,
            "opMarginPct": 40.9,
            "fcfB": 0.764,
            "priceQEnd": 170
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 1.633,
            "epsAdj": 0.34,
            "opMarginPct": 46.2,
            "fcfB": 0.892,
            "priceQEnd": 140
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 1.935,
            "epsAdj": 0.41,
            "opMarginPct": 47.1,
            "fcfB": 1.202,
            "priceQEnd": 155
          }
        ],
        "epsBasis": "diluted adjusted (non-GAAP) EPS — PLTR ไม่เคยแตกหุ้น จึงเป็นฐานหุ้นปัจจุบันทุกปี · GAAP เพิ่งพลิกบวกปี 2023 ตัวเลขก่อนหน้าจึงใช้ฐาน adjusted เพื่อเทียบกันได้"
      },
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 1.6,
            "revenue": 8.19
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "~$1.797-1.801B",
            "actual": "~$1.935B",
            "result": "beat",
            "magnitudePct": 7.5
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "~$1.523-1.527B",
            "actual": "~$1.633B",
            "result": "beat",
            "magnitudePct": 7.1
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "~$1.327-1.331B",
            "actual": "~$1.407B",
            "result": "beat",
            "magnitudePct": 5.9
          },
          {
            "quarter": "Q3 2025",
            "metric": "revenue",
            "guided": "~$1.083-1.085B",
            "actual": "~$1.181B",
            "result": "beat",
            "magnitudePct": 9
          },
          {
            "quarter": "Q2 2025",
            "metric": "revenue",
            "guided": "~$934-938M",
            "actual": "~$1.004B",
            "result": "beat",
            "magnitudePct": 7.3
          },
          {
            "quarter": "Q1 2025",
            "metric": "revenue",
            "guided": "~$858-862M",
            "actual": "~$884M",
            "result": "beat",
            "magnitudePct": 2.8
          },
          {
            "quarter": "Q4 2024",
            "metric": "revenue",
            "guided": "~$767-771M",
            "actual": "~$828M",
            "result": "beat",
            "magnitudePct": 7.7
          },
          {
            "quarter": "Q3 2024",
            "metric": "revenue",
            "guided": "~$697-701M",
            "actual": "~$726M",
            "result": "beat",
            "magnitudePct": 3.9
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 8.19,
            "eps": 1.6,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 12.18,
            "eps": 2.31,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "consensus จาก 28 นักวิเคราะห์ (StockAnalysis ระบุฐาน non-GAAP adjusted) · consensus FY2026 revenue ~$8.19B สูงกว่า guidance บริษัทเอง ~$8.15-8.16B เล็กน้อย (ตลาดคาด beat ต่อ) · guidance ของ PLTR เป็นช่วงแคบมาก (±$2-4M) magnitude จึงสะท้อน beat จริงล้วน · เก็บได้ 8 ไตรมาสที่ยืนยันตัวเลขได้ (Q1-Q2 2024 ยังหาช่วง guidance เดิมยืนยันไม่ได้ จึงไม่เติม)"
      }
    },
    "SHOP": {
      "ticker": "SHOP",
      "name": "Shopify Inc.",
      "layer": "enterprise",
      "asOf": "2026-08",
      "nextEarnings": "2026-10",
      "thesis": {
        "statement": "Shopify เป็นโครงสร้างพื้นฐานการค้าขายออนไลน์ที่พ่อค้าตั้งแต่รายเล็กถึงองค์กรใช้ขายของ — จุดสำคัญคือรายได้ 78% ไม่ใช่ค่าสมาชิก แต่เป็นส่วนแบ่งจากยอดขายจริงของพ่อค้า (take rate บน GMV) จึงโตตามการค้าที่ไหลผ่านแพลตฟอร์ม ไม่ใช่ตามจำนวนร้านที่สมัคร",
        "pillars": [
          "Merchant Solutions 78% ของรายได้ โต +37% YoY — ผูกกับ GMV ที่ไหลผ่านระบบ ($116B ใน Q2'26 · +32%)",
          "GMV โตเกิน 30% ห้าไตรมาสติด — กำลังกินส่วนแบ่งตลาด e-commerce ต่อเนื่อง ไม่ใช่โตตามตลาด",
          "จบยุคเผาเงินแล้ว: op margin จาก −8.5% (FY2022) เป็น 12.7% (FY2025) · FCF $2.0B/ปี และ 18% margin ในไตรมาสล่าสุด",
          "ขายธุรกิจ logistics ทิ้งปี 2023 กลับมาเป็น asset-light software — ต้นทุนคงที่ต่ำ ขยายได้โดยไม่ต้องลงทุนหนัก",
          "AI (Sidekick / Shopify Magic / agentic commerce) เป็นเรื่องเล่าหลัก แต่บริษัทยังไม่เปิดตัวเลข adoption — ยังพิสูจน์ผลกระทบต่อรายได้ไม่ได้"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตรายได้",
          "current": "~+34% YoY (Q2'26 $3,583M)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "โต 34% สองไตรมาสติด และ GMV โตเกิน 30% ห้าไตรมาสติด — เร่งขึ้นจาก FY2025 ที่โต 30% ทั้งปี ถือว่าเร็วมากสำหรับฐานรายได้ระดับ $14B/ปี"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น",
          "current": "~$1.16 (Q2'26 GAAP) แต่วัดแนวโน้มไม่ได้",
          "trend": "flat",
          "score": 40,
          "impact": "neutral",
          "why": "GAAP EPS ถูกครอบงำโดยการตีมูลค่าเงินลงทุนในหุ้น: Q1 ติดลบทุกปี (−0.21 / −0.53 / −0.45) ทั้งที่กำไรจากการดำเนินงานเป็นบวก และ FY2025 EPS 0.94 ต่ำกว่า FY2024 1.55 แม้ op margin ดีขึ้น — ตัวเลขนี้ไม่สะท้อนธุรกิจ ให้ดู op income/FCF แทน"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "~$654M ไตรมาสล่าสุด (18% ของรายได้) · FY2025 ~$2.0B",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "FCF margin ขยับจากติดลบใน FY2022 เป็น 17% ทั้งปี FY2025 และ 18% ในไตรมาสล่าสุด · เป็นตัวชี้คุณภาพกำไรที่เชื่อได้มากกว่า EPS ของบริษัทนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไรจากการดำเนินงาน",
          "current": "~13.6% (Q2'26 · op income $488M)",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "op income $488M เทียบ $291M ปีก่อน (+68%) · ทิศทางขยายชัดจาก −8.5% ใน FY2022 → 12.7% FY2025 แต่ยังต่ำกว่า software ชั้นนำ เพราะ 78% ของรายได้เป็น take rate ที่มีต้นทุนจ่ายจริง (payment processing) ไม่ใช่ margin แบบ subscription"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังไม่มีตัวเลขที่ยืนยันได้",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ยังหาตัวเลข ROIC ที่บริษัทหรือแหล่งอ้างอิงเปิดเผยไม่ได้ในรอบนี้ จึงให้คะแนนกลางไว้ก่อน — ทิศทางน่าจะดีขึ้นตาม op margin ที่ขยาย แต่ยังไม่พิสูจน์ ห้ามอนุมานเป็นตัวเลข"
        },
        {
          "key": "cash",
          "label": "เงินสดและสภาพคล่อง",
          "current": "เงินสดสุทธิเป็นบวก + ประกาศซื้อหุ้นคืน ~$2B (ปลายปี 2025)",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "สร้าง FCF ~$2B/ปี และมีโปรแกรมซื้อหุ้นคืน $2B — สถานะการเงินเปลี่ยนจากยุคที่ต้องระดมทุน มาเป็นคืนเงินผู้ถือหุ้นได้"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "ยังไม่มีตัวเลขหนี้สุทธิที่ยืนยันในรอบนี้",
          "trend": "flat",
          "score": 68,
          "impact": "neutral",
          "why": "ในอดีตออกหุ้นกู้แปลงสภาพ (convertible notes) แต่ยังไม่ได้ตัวเลขคงเหลือที่ยืนยันได้รอบนี้ · เมื่อดูจาก FCF ที่เป็นบวกแรงและมีการซื้อหุ้นคืน ภาระหนี้ไม่ใช่ประเด็นเร่งด่วน"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มทุน / SBC",
          "current": "SBC ~$150M/ไตรมาส (~4% ของรายได้) หักล้างด้วยการซื้อหุ้นคืน",
          "trend": "up",
          "score": 66,
          "impact": "neutral",
          "why": "SBC ตามที่บริษัทให้กรอบไว้สำหรับ Q3'26 คือ $150M บนรายได้ ~$3.6B ราว 4% — ไม่ต่ำแต่ไม่สุดโต่งสำหรับ software · ทิศทางเป็นมิตรขึ้นเพราะเริ่มซื้อหุ้นคืน $2B ซึ่งชดเชยการออกหุ้นใหม่"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "asset-light + ซื้อหุ้นคืน $2B",
          "trend": "up",
          "score": 76,
          "impact": "positive",
          "why": "ตัดสินใจขายธุรกิจคลังสินค้า/โลจิสติกส์ทิ้งในปี 2023 (ยอมรับความผิดพลาดเร็ว) แล้วกลับมาโฟกัสซอฟต์แวร์ · เปลี่ยนจากลงทุนหนักมาคืนเงินผู้ถือหุ้น ถือว่าวินัยดีขึ้นชัด"
        },
        {
          "key": "valuation",
          "label": "Valuation (ถูก=คะแนนสูง)",
          "current": "P/E TTM ~99x · forward P/E ~77x (non-GAAP)",
          "trend": "flat",
          "score": 22,
          "impact": "negative",
          "why": "ราคา ~$147 หาร TTM EPS ~$1.48 ได้ ~99 เท่า และหาร consensus FY2026 non-GAAP $1.90 ได้ ~77 เท่า — แพงมากแม้เทียบการเติบโต 34% · ต้องโตระดับนี้ต่อหลายปีจึงจะสมเหตุสมผล ความคาดหวังถูกใส่ในราคาไว้เยอะ"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 72,
        "recurringPct": 22,
        "note": "จุดที่คนเข้าใจผิดบ่อยที่สุดของ SHOP: รายได้ส่วนใหญ่ไม่ใช่ subscription — Subscription Solutions มีแค่ 22% (MRR $221M · +19% YoY) ที่เหลือ 78% เป็น Merchant Solutions ซึ่งคือส่วนแบ่งจากยอดขายจริงของพ่อค้า (payments/capital/markets/POS) จึงผูกกับการบริโภคและเป็น cyclical มากกว่า SaaS ทั่วไป · บริษัทเปิดเผยรายได้เพียง 2 สายนี้ ไม่ได้แตกย่อยกว่านี้ จึงไม่แบ่ง segment เพิ่มเพื่อไม่ให้เป็นการเดาสัดส่วน",
        "segments": [
          {
            "name": "Merchant Solutions (payments / capital / markets / POS)",
            "sharePct": 78,
            "growthNote": "+37% YoY ($2,781M) — โตเร็วกว่าฝั่ง subscription เกือบเท่าตัว ผูกกับ GMV $116B ที่ไหลผ่านระบบ",
            "trend": "up"
          },
          {
            "name": "Subscription Solutions (ค่าสมาชิกแพลตฟอร์ม + apps/themes)",
            "sharePct": 22,
            "growthNote": "+22% YoY ($802M) · MRR $221M (+19%) — ส่วนที่เป็นรายได้ประจำแท้ ๆ",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 55,
        "items": [
          {
            "item": "Sidekick — ผู้ช่วย AI ในหลังบ้านร้านค้า",
            "status": "executing",
            "evidence": "ผู้บริหารย้ำว่า AI ขยายสิ่งที่พ่อค้าทำได้ แต่บริษัทไม่เปิดตัวเลขผู้ใช้หรือผลต่อรายได้ จึงยังวัดผลไม่ได้"
          },
          {
            "item": "Shopify Magic — สร้างข้อความ/รูปสินค้าด้วย AI",
            "status": "executing",
            "evidence": "แถมมาในแพลตฟอร์มโดยไม่คิดเงินเพิ่ม — เป็นตัวรักษาลูกค้ามากกว่าตัวสร้างรายได้ใหม่ ยังไม่มีตัวเลขยืนยันผล"
          },
          {
            "item": "Agentic commerce — ให้ AI agent ซื้อของแทนผู้ใช้",
            "status": "on-track",
            "evidence": "เป็นธีมที่ตลาดให้ราคา เพราะ SHOP ถือ catalog สินค้าและระบบชำระเงินอยู่แล้ว แต่ยังอยู่ช่วงต้น ยังไม่เห็น GMV ที่มาจากช่องทางนี้"
          },
          {
            "item": "ใช้ AI ลดต้นทุนภายใน (support / เขียนโค้ด)",
            "status": "executing",
            "evidence": "op margin ขยายพร้อมกับที่บริษัทพูดถึงการใช้ AI ภายใน แต่ยังแยกไม่ได้ว่าส่วนไหนมาจาก AI ส่วนไหนมาจากการคุมค่าใช้จ่ายปกติ"
          },
          {
            "item": "ตำแหน่งเป็น 'ท่อ' ของการค้า AI",
            "status": "on-track",
            "evidence": "ถ้าการซื้อของย้ายไปอยู่บน AI agent จริง SHOP ได้เปรียบเพราะเป็นเจ้าของทั้งข้อมูลสินค้าและ checkout — แต่ก็เสี่ยงถูกลดบทบาทเป็นแค่หลังบ้านถ้า agent ของเจ้าอื่นคุมหน้าร้าน"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "ยิ่งพ่อค้าใช้เครื่องมือของ Shopify มากขึ้น (ระบบชำระเงิน สินเชื่อ หน้าร้านออฟไลน์ ขายข้ามประเทศ) การย้ายออกยิ่งแพงและเสี่ยง เพราะต้องยกทั้งยอดขาย ประวัติลูกค้า และระบบเงินไปพร้อมกัน — คูเมืองอยู่ที่ 'ความเจ็บปวดในการย้าย' ไม่ใช่เทคโนโลยีที่ลอกไม่ได้",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ความเป็นผู้นำตลาด",
            "status": "strengthening",
            "note": "เบอร์สองของ e-commerce สหรัฐเมื่อวัดด้วย GMV รองจาก Amazon และช่องว่างกับอันดับถัด ๆ ไปยังถ่างขึ้น"
          },
          {
            "key": "techLeadership",
            "label": "ความนำด้านเทคโนโลยี",
            "status": "stable",
            "note": "แข็งเรื่อง checkout และความเร็วหน้าร้าน แต่ฟีเจอร์ AI ส่วนใหญ่เป็นสิ่งที่คู่แข่งทำตามได้ ไม่ใช่ความนำเชิงโครงสร้าง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการส่งของ",
            "status": "strengthening",
            "note": "ปล่อยฟีเจอร์เป็นรอบ (Editions) ถี่และตรงเวลา · ขยาย enterprise กับออฟไลน์ได้พร้อมกันโดย margin ยังขยาย"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายระบบ",
            "status": "strengthening",
            "note": "ยิ่งใช้ Shopify Payments/Capital/POS ยิ่งย้ายยาก เพราะกระทบกระแสเงินสดและการขายทันทีที่ย้าย"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "strengthening",
            "note": "App Store เอเจนซี และพาร์ตเนอร์จำนวนมากที่หาเงินจากแพลตฟอร์มนี้ — ทำให้ทางเลือกอื่นดูขาดของเสริม"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับจากนักพัฒนา",
            "status": "stable",
            "note": "นักพัฒนาแอปยังอยู่เพราะมีคนจ่ายเงินจริงบนแพลตฟอร์ม แต่ก็มีเสียงเรื่องส่วนแบ่งรายได้และการที่แพลตฟอร์มทำฟีเจอร์ทับแอป"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "strengthening",
            "note": "พ่อค้าที่โตขึ้นมักซื้อของเพิ่มในระบบเดิม (upsell ตามขนาดร้าน) มากกว่าย้ายไปเจ้าอื่น"
          },
          {
            "key": "moat",
            "label": "คูเมืองโดยรวม",
            "status": "stable",
            "note": "แข็งจากต้นทุนการย้าย + ระบบนิเวศ แต่ไม่ใช่คูเมืองแบบผูกขาด — Amazon, WooCommerce, BigCommerce และผู้เล่นในจีนยังกดราคาได้เสมอ"
          }
        ]
      },
      "capitalAllocation": {
        "score": 76,
        "verdict": "วินัยดีขึ้นชัดเจนหลังบทเรียนโลจิสติกส์ — เลิกลงทุนหนักในสิ่งที่ไม่ใช่จุดแข็ง กลับมาเป็นซอฟต์แวร์ที่สร้างเงินสดแล้วคืนผู้ถือหุ้น",
        "items": [
          {
            "label": "ซื้อหุ้นคืน",
            "current": "~$2B (ประกาศปลายปี 2025)",
            "assessment": "good",
            "why": "ครั้งแรกที่คืนเงินผู้ถือหุ้นเป็นก้อน — ช่วยหักล้าง SBC ที่ออกใหม่ทุกไตรมาส"
          },
          {
            "label": "ขายธุรกิจโลจิสติกส์",
            "current": "ขายทิ้งปี 2023 (Deliverr / 6 River)",
            "assessment": "good",
            "why": "ยอมตัดขาดทุนเร็วแทนดันต่อ — คืน margin และความเรียบง่ายให้ธุรกิจหลัก"
          },
          {
            "label": "เงินลงทุนในหุ้นบริษัทอื่น",
            "current": "พอร์ตเงินลงทุนขนาดใหญ่ ตีมูลค่าผ่านงบกำไรขาดทุน",
            "assessment": "neutral",
            "why": "สร้างกำไรทางบัญชีก้อนใหญ่ในบางไตรมาส (Q2'26 ~$1,063M) แต่ทำให้ EPS อ่านไม่รู้เรื่องและไม่ใช่ผลจากการดำเนินงาน"
          },
          {
            "label": "ลงทุนใน R&D / AI",
            "current": "opex กรอบ 33-34% ของรายได้",
            "assessment": "good",
            "why": "คุมกรอบค่าใช้จ่ายเป็น % ของรายได้ชัดเจน ทำให้โตแล้ว margin ขยายไปด้วย ไม่ใช่โตแล้วเผาเงิน"
          },
          {
            "label": "ไม่จ่ายปันผล",
            "current": "ไม่มีปันผล",
            "assessment": "neutral",
            "why": "เหมาะกับบริษัทที่ยังโต 30%+ — เอาเงินไปขยายและซื้อหุ้นคืนให้ผลตอบแทนดีกว่าปันผลในระยะนี้"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "P/E TTM ~99 เท่า (ราคา ~$147 / TTM EPS ~$1.48) และ forward ~77 เท่าบนฐาน non-GAAP · ที่สำคัญกว่าคือ P/E ย้อนหลังของ SHOP แทบใช้ไม่ได้ เพราะ FY2022 ขาดทุนและ FY2023 EPS แค่ 0.10 ทำให้ P/E พุ่งเป็นหลายร้อยเท่า — ควรตัดสินด้วย FCF และการเติบโตของ GMV แทนตัวคูณกำไร"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1'26 → Q2'26)",
          "prev": "$3,170M (+34% YoY)",
          "now": "$3,583M (+34% YoY)",
          "direction": "positive"
        },
        {
          "metric": "GMV",
          "prev": "ทะลุ $100B ครั้งแรกในไตรมาส",
          "now": "$116B (+32% YoY) — เกิน 30% ห้าไตรมาสติด",
          "direction": "positive"
        },
        {
          "metric": "กำไรจากการดำเนินงาน",
          "prev": "—",
          "now": "$488M (+68% YoY) · margin ~13.6%",
          "direction": "positive"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "margin ~15%",
          "now": "$654M · margin 18% (ปีก่อน 16%)",
          "direction": "positive"
        },
        {
          "metric": "GAAP EPS",
          "prev": "−$0.45 (ขาดทุนจากตีมูลค่าเงินลงทุน)",
          "now": "+$1.16 — แต่รวมกำไรตีมูลค่า ~$1,063M · ตัดออกแล้วกำไรจริง $439M",
          "direction": "neutral"
        },
        {
          "metric": "กรอบไตรมาสหน้า (Q3'26)",
          "prev": "คาดรายได้โต high-twenties %",
          "now": "คาดโต low-thirties % · FCF margin high-teens ถึง low-twenties",
          "direction": "positive"
        }
      ],
      "risks": [
        "รายได้ 78% ผูกกับยอดขายจริงของพ่อค้า — ถ้าการบริโภคชะลอ รายได้จะลงเร็วกว่าบริษัท SaaS ที่เก็บค่าสมาชิกล่วงหน้า",
        "ราคาแพงมาก (P/E TTM ~99 · forward ~77) — ถ้าการเติบโตหลุดจากระดับ 30% ลงมา ตัวคูณอาจถูกกดลงแรงกว่าที่กำไรลด",
        "GAAP EPS ถูกครอบงำโดยการตีมูลค่าเงินลงทุน ทำให้กำไรที่รายงานเหวี่ยงแรงและอ่านทิศทางธุรกิจจากงบไม่ได้",
        "Amazon และผู้เล่นราคาถูกกดทั้งส่วนแบ่งตลาดและ take rate ได้ตลอด — คูเมืองเป็นเรื่องต้นทุนการย้าย ไม่ใช่การผูกขาด",
        "ถ้าการซื้อของย้ายไปอยู่บน AI agent ของเจ้าอื่น Shopify อาจถูกลดบทบาทเหลือแค่หลังบ้าน เสียการเข้าถึงลูกค้าและอำนาจกำหนดราคา"
      ],
      "history": {
        "fyNote": "ปีบัญชีตรงกับปีปฏิทิน (สิ้นสุด 31 ธ.ค.)",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับ 10:1 split มิ.ย. 2022 ทุกปี) · ⚠ สำคัญ: GAAP EPS ของ SHOP ถูกครอบงำโดยกำไร/ขาดทุนจากการตีมูลค่าเงินลงทุนในหุ้น (mark-to-market) ซึ่งไม่ใช่ผลการดำเนินงาน — Q1 ติดลบทุกปี (Q1'24 −0.21 · Q1'25 −0.53 · Q1'26 −0.45) ทั้งที่ op income เป็นบวก และ Q2'26 +1.16 รวมกำไรตีมูลค่า ~$1,063M (ตัดออกแล้วกำไรจริง $439M) · เทียบ EPS ข้ามไตรมาสหรือข้ามปีของบริษัทนี้ตรง ๆ ไม่ได้",
        "marginNote": "opMarginPct ใส่เฉพาะงวดที่คำนวณจาก operating income ที่บริษัทแจ้งเองได้ (ยืนยันด้วย gross profit − opex) · ตัวเลข operating margin ของแหล่งรวมข้อมูลภายนอกสูงกว่านี้อย่างเป็นระบบ (Q2'26: 17.55% vs 13.6% ที่คำนวณจากเลขบริษัท) จึงไม่นำมาใช้ · งวดที่ยืนยันไม่ได้เว้นว่างไว้",
        "notes": "ราคาสิ้นงวดดึงจาก /api/ohlc (แหล่งเดียวกับที่หน้าเว็บใช้ · ปรับ split แล้ว) · รายได้/EPS จาก press release และงบรายไตรมาสของบริษัท",
        "sources": "shopify.com/news (press release รายไตรมาส) · SEC 10-Q · /api/ohlc สำหรับราคา",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 4.61,
            "epsAdj": 2.29,
            "fcfB": 0.49,
            "priceFYEnd": 137.74
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 5.6,
            "epsAdj": -2.73,
            "fcfB": -0.19,
            "priceFYEnd": 34.71
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 7.06,
            "epsAdj": 0.1,
            "fcfB": 0.91,
            "priceFYEnd": 77.9
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 8.88,
            "epsAdj": 1.55,
            "fcfB": 1.6,
            "priceFYEnd": 106.33
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 11.56,
            "epsAdj": 0.94,
            "opMarginPct": 12.7,
            "fcfB": 2.01,
            "priceFYEnd": 160.97
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 1.714,
            "epsAdj": 0.55,
            "priceQEnd": 54.57
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-31",
            "revenueB": 2.144,
            "epsAdj": 0.51,
            "priceQEnd": 77.9
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-31",
            "revenueB": 1.861,
            "epsAdj": -0.21,
            "priceQEnd": 77.17,
            "epsNote": "EPS ติดลบทั้งที่กำไรจากการดำเนินงานเป็นบวก — มาจากขาดทุนตีมูลค่าเงินลงทุนในหุ้น ไม่ใช่ธุรกิจแย่ลง"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-30",
            "revenueB": 2.045,
            "epsAdj": 0.13,
            "priceQEnd": 66.05
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-30",
            "revenueB": 2.162,
            "epsAdj": 0.64,
            "opMarginPct": 13.1,
            "fcfB": 0.421,
            "priceQEnd": 80.14
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-31",
            "revenueB": 2.812,
            "epsAdj": 0.99,
            "priceQEnd": 106.33
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 2.36,
            "epsAdj": -0.53,
            "priceQEnd": 95.48,
            "epsNote": "ขาดทุนตีมูลค่าเงินลงทุนกดให้ EPS ติดลบ ขณะที่รายได้โตและกำไรจากการดำเนินงานเป็นบวก"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-30",
            "revenueB": 2.68,
            "epsAdj": 0.69,
            "opMarginPct": 10.9,
            "priceQEnd": 115.35
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 2.844,
            "epsAdj": 0.2,
            "priceQEnd": 148.61
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 3.672,
            "epsAdj": 0.57,
            "opMarginPct": 17.2,
            "fcfB": 0.715,
            "priceQEnd": 160.97
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 3.17,
            "epsAdj": -0.45,
            "priceQEnd": 118.62,
            "epsNote": "EPS ติดลบเป็นปีที่สามติดในไตรมาสแรก จากการตีมูลค่าเงินลงทุน — รายได้ไตรมาสนี้โต 34% และ GMV ทะลุ $100B ครั้งแรก"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 3.583,
            "epsAdj": 1.16,
            "opMarginPct": 13.6,
            "fcfB": 0.654,
            "priceQEnd": 114.18,
            "epsNote": "GAAP EPS $1.16 รวมกำไรตีมูลค่าเงินลงทุน ~$1,063M (สุทธิภาษี) — ตัดรายการนี้ออกกำไรจริงเหลือ $439M (ปีก่อน $338M) · กำไรจากการดำเนินงานจริง $488M"
          }
        ]
      },
      "forwardView": {
        "asOf": "2026-08",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 1.9,
            "revenue": 15.23
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "โต high-twenties % YoY (≈$3.43-3.46B จากฐาน Q2'25 $2.68B)",
            "actual": "~$3.583B (+34% YoY)",
            "result": "beat",
            "magnitudePct": 4
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 15.23,
            "eps": 1.9,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          }
        ],
        "note": "Shopify ให้ guidance เป็น 'อัตราการเติบโตแบบบรรยาย' (เช่น 'low-thirties percentage rate') ไม่ใช่ช่วงตัวเงิน จึงต้องแปลงเป็นรายได้โดยอ้างฐานไตรมาสเดียวกันปีก่อนเพื่อให้เทียบกับหุ้นตัวอื่นได้ · แถวเดียวที่บันทึกคือ Q2 2026: บริษัทให้กรอบ 'high-twenties' (อ่านเป็น 28-29% → จุดกึ่งกลาง ~$3.44B) ทำได้ $3.583B = เกินคาด ~4% · ไตรมาสก่อนหน้ายังยืนยันคำ guidance ที่ให้ไว้ตอนนั้นไม่ได้ครบ จึงไม่บันทึกแทนการเดา · กรอบ Q3 2026: รายได้โต low-thirties % · gross profit โต mid-to-high twenties % · opex 33-34% ของรายได้ · SBC $150M · FCF margin high-teens ถึง low-twenties · consensus FY2026 EPS ~$1.90 (44 นักวิเคราะห์ · non-GAAP) เป็นคนละฐานกับตาราง KB ที่เป็น GAAP เส้นคาดบนกราฟจึงเป็นจุดแยก · FY2027 อยู่หลัง paywall จึงเว้นไว้ · วันประกาศงบ Q3 บริษัทยังไม่ประกาศ (แหล่งภายนอกคาด 22 ต.ค. ถึงต้น พ.ย.) จึงบันทึกเป็นระดับเดือน"
      }
    },
    "DDOG": {
      "ticker": "DDOG",
      "name": "Datadog, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "Datadog คือชั้น observability ที่ระบบคลาวด์สมัยใหม่ต้องมี — ยิ่งองค์กรย้ายงานขึ้นคลาวด์และเริ่มรันงาน AI มากเท่าไหร่ จำนวนสิ่งที่ต้องเฝ้าดูก็ยิ่งเพิ่มตามโดยอัตโนมัติ รายได้จึงโตตามปริมาณการใช้งานของลูกค้าโดยไม่ต้องขายใหม่ทุกครั้ง และการขายผลิตภัณฑ์ตัวที่สองสามสี่ให้ลูกค้าเดิมคือเครื่องยนต์หลักที่ทำให้เติบโตเร็วกว่าตลาด — จุดที่ต้องระวังคือรายได้แบบนับตามการใช้งานเป็นดาบสองคม เมื่อลูกค้ารายใหญ่ปรับลดการใช้ รายได้หายทันทีโดยไม่ต้องยกเลิกสัญญา",
        "pillars": [
          "แพลตฟอร์มเดียวจบ — ลูกค้าที่ใช้ 4 ผลิตภัณฑ์ขึ้นไปเพิ่มเป็น 58% (จาก 52%) และใช้ 10 ตัวขึ้นไป 13% (จาก 7%) ยิ่งใช้หลายตัวยิ่งย้ายออกยาก",
          "รายได้นับตามการใช้งาน (usage-based) — เมื่อ workload ของลูกค้าโต รายได้โตเองโดยไม่ต้องเจรจาสัญญาใหม่ สะท้อนเป็น net revenue retention ระดับ low 120s ต่อเนื่อง",
          "คลื่น AI เป็นตัวเร่งชั้นใหม่ — ลูกค้ากลุ่ม AI-native กว่า 750 ราย (31 รายจ่ายเกิน $1M/ปี · 8 รายเกิน $10M/ปี) บวกผลิตภัณฑ์สาย LLM Observability / Bits AI / AI Guard ที่ขายเข้าฐานลูกค้าเดิมได้ทันที",
          "ฐานลูกค้าองค์กรแน่น — ลูกค้า ARR เกิน $100k มี ~4,720 ราย (จาก ~3,850 ปีก่อน) คิดเป็น ~91% ของ ARR ทั้งหมด และ gross retention ระดับ mid-to-high 90s",
          "กระแสเงินสดแข็งแรงกว่ากำไรบัญชีมาก — FCF ทะลุ $1B ต่อปีแล้ว บนงบดุลที่มีเงินสดสุทธิ ~$3.7B ทำให้ลงทุนต่อได้โดยไม่ต้องพึ่งตลาดทุน"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+36% YoY (Q2 2026 — $1.12B) · guide Q3 $1.135-1.145B = +28-29% เท่านั้น",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "ไตรมาสล่าสุดเร่งขึ้นจาก +32% เป็น +36% และทะลุกรอบบนของ guidance แต่บริษัทระบุเองว่าลูกค้ารายใหญ่ที่สุดลดการใช้งานตั้งแต่ Q3 และได้ตัดความเสี่ยงนั้นออกจาก guidance แล้ว ตัวเลขที่แนะไว้จึงชะลอเหลือ +28-29% — โตเร็วอยู่ แต่ทิศทางไม่ได้ขึ้นต่อ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2 2026: GAAP EPS $0.12 (ปีก่อน $0.01) · non-GAAP $0.65 · guide ทั้งปี non-GAAP $2.50-2.54",
          "trend": "up",
          "score": 60,
          "impact": "neutral",
          "why": "ดีขึ้นชัดเทียบปีก่อนที่เกือบเท่าศูนย์ แต่ต้องอ่านให้ตรง — กำไร GAAP ยังบางมาก ($0.12) ส่วน non-GAAP $0.65 สูงกว่าถึง 5 เท่าเพราะตัดค่าหุ้นพนักงาน (SBC) ออก และปี FY2025 กำไร GAAP ต่อหุ้นกลับ *ลดลง* เหลือ $0.31 จาก $0.52 ทั้งที่รายได้โต 28% จึงยังพิสูจน์ไม่ได้ว่ากำไรบัญชีจะโตตามรายได้อย่างสม่ำเสมอ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 2026 FCF $279M (~25% ของรายได้) · OCF $316M · ทั้งปี FY2025 แตะ $1.0B แล้ว",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "จุดแข็งที่สุดของงบ — โมเดล SaaS เก็บเงินล่วงหน้า บวก capex ต่ำ ทำให้แปลงรายได้เป็นเงินสดได้ราวหนึ่งในสี่ ต่างจากกำไรบัญชีที่เกือบศูนย์อย่างสิ้นเชิง เงินสดส่วนนี้คือสิ่งที่ทำให้ลงทุนสร้างผลิตภัณฑ์ใหม่ได้ต่อเนื่องโดยไม่ต้องออกหุ้นเพิ่ม"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "non-GAAP operating margin 23% · GAAP operating margin 0% · gross margin 79.6% (จาก 80.9% ปีก่อน)",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ช่องว่าง 23 จุดระหว่าง GAAP กับ non-GAAP คือค่าหุ้นพนักงานเกือบทั้งหมด — แปลว่ากำไรที่ฝ่ายบริหารพูดถึงยังไม่ใช่กำไรที่ผู้ถือหุ้นได้จริงหลังนับการเจือจาง · gross margin ค่อย ๆ ลดลงจากต้นทุนโครงสร้างพื้นฐานของงาน AI ที่กินทรัพยากรมากกว่างานเดิม ฝ่ายบริหารบอกว่ายังอยู่ในกรอบ ~80% ที่เคยเป็นมา"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "GAAP operating income ~$5M บนรายได้ $1.12B — ผลตอบแทนทางบัญชีเกือบเป็นศูนย์",
          "trend": "up",
          "score": 48,
          "impact": "neutral",
          "why": "ตัวเลขทางบัญชีแทบไม่มีผลตอบแทนเพราะกำไรจากการดำเนินงานยังเกือบศูนย์ ผลตอบแทนจริงอยู่ในรูปกระแสเงินสด ($1B/ปี) ไม่ใช่กำไร · ทิศทางดีขึ้นช้า ๆ ตามสเกล แต่บริษัทเลือกเอากำไรไปลงทุนต่อมากกว่าปล่อยให้ตกถึงบรรทัดล่าง จึงยังตัดสินความสามารถในการทำกำไรระยะยาวไม่ได้"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและหลักทรัพย์ ~$5.0B (30 มิ.ย. 2026) — เงินสดสุทธิหลังหักหนี้ ~$3.7B",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลแข็งแรงมากและยังสร้างเงินสดเพิ่มทุกไตรมาส ทำให้ทนช่วงที่ลูกค้าชะลอการใช้งานได้สบาย และมีกระสุนสำหรับซื้อกิจการเสริมโดยไม่ต้องออกหุ้นใหม่"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้รวม ~$1.28B — หลักคือหุ้นกู้แปลงสภาพ 0.00% ครบกำหนดปี 2029 มูลค่า $1.0B (ยังไม่เข้าเงื่อนไขแปลง)",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "หนี้น้อยกว่าเงินสดมาก จึงไม่ใช่ความเสี่ยงทางการเงิน · ดอกเบี้ย 0% แปลว่าแทบไม่มีต้นทุนทางการเงิน แต่ต้องจำไว้ว่าหุ้นกู้แปลงสภาพคือการเจือจางที่รอเกิดถ้าราคาหุ้นขึ้นถึงระดับแปลง — เป็นภาระต่อผู้ถือหุ้นในรูปหุ้น ไม่ใช่ในรูปเงิน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 371 ล้านหุ้น (Q2 2026) · guide ทั้งปี 376 ล้านหุ้น · SBC สูงจนทำให้ GAAP margin ต่างจาก non-GAAP 23 จุด",
          "trend": "down",
          "score": 32,
          "impact": "negative",
          "why": "จุดอ่อนที่สุดของหุ้นตัวนี้ — บริษัทไม่มีโครงการซื้อหุ้นคืน จำนวนหุ้นจึงเพิ่มขึ้นทุกปีจากค่าตอบแทนพนักงานที่จ่ายเป็นหุ้น และยังมีหุ้นกู้แปลงสภาพรออยู่อีก ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนต่อเนื่องแม้ธุรกิจจะดี กำไรต่อหุ้นจึงโตช้ากว่ากำไรรวมเสมอ"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ไม่มีปันผล ไม่มี buyback — เงินสดเกือบทั้งหมดกลับเข้า R&D และทีมขาย บวกซื้อกิจการขนาดเล็กเสริมผลิตภัณฑ์",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "เหมาะกับบริษัทที่ยังอยู่ในช่วงขยายตลาด และการลงทุนก็เห็นผลจริง (ลูกค้าที่ใช้ 10 ผลิตภัณฑ์ขึ้นไปเพิ่มจาก 7% เป็น 13% ในปีเดียว) แต่เมื่อ FCF แตะ $1B/ปีแล้วและยังไม่มีอะไรมาชดเชยการเจือจางจาก SBC เลย ถือเป็นช่องว่างที่ผู้ถือหุ้นระยะยาวควรจับตา"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$221 · mcap ~$82B (หุ้น diluted 371 ล้าน × ราคา) · forward P/E ~87x จาก consensus non-GAAP FY2026 $2.53 · trailing GAAP P/E ~447x",
          "trend": "up",
          "score": 25,
          "impact": "negative",
          "why": "แพงมากไม่ว่าจะวัดด้วยฐานไหน — 87 เท่าของกำไร non-GAAP ที่ยังไม่นับ SBC และ 447 เท่าของกำไร GAAP จริง ราคาปัจจุบันจึงต้องการให้บริษัทโตระดับ 25-30% ต่อไปอีกหลายปีโดยไม่สะดุด · ที่ให้คะแนนสูงกว่าจุดต่ำสุดเล็กน้อยเพราะราคาลงมาแล้ว ~23% จากจุดสูงสุด $288 (4 ส.ค. 2026) หลังงบ"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 82,
        "recurringPct": 95,
        "note": "คุณภาพรายได้สูงในเชิงความสม่ำเสมอ — เกือบทั้งหมดเป็น subscription ที่นับตามการใช้งาน ลูกค้า ARR เกิน $100k จำนวน ~4,720 ราย คิดเป็น ~91% ของ ARR และ gross revenue retention อยู่ระดับ mid-to-high 90s แปลว่าแทบไม่มีใครเลิกใช้ ส่วน net revenue retention ระดับ low 120s สะท้อนว่าลูกค้าเดิมใช้จ่ายเพิ่มขึ้นเองทุกปี · จุดอ่อนสำคัญคือความกระจุกตัว — บริษัทเปิดเผยว่าลูกค้ารายใหญ่ที่สุด (บริษัท AI ที่ไม่เปิดชื่อ ต่อสัญญาระดับเก้าหลักและใช้ถึง 17 ผลิตภัณฑ์) ลดการใช้งานตั้งแต่ Q3 2026 ซึ่งเพียงรายเดียวก็กดประมาณการทั้งปีได้ · หมายเหตุ: Datadog ไม่ได้แบ่งรายได้เป็น segment ผลิตภัณฑ์ ตัวเลขด้านล่างจึงเป็นการแบ่งตามภูมิภาคซึ่งเป็นชุดเดียวที่บริษัทรายงานจริงใน 10-Q",
        "segments": [
          {
            "name": "อเมริกาเหนือ",
            "sharePct": 73,
            "growthNote": "ตลาดหลัก — ฐานลูกค้าองค์กรใหญ่และกลุ่ม AI-native เกือบทั้งหมดอยู่ที่นี่ (ครึ่งปีแรก 2026)",
            "trend": "up"
          },
          {
            "name": "นอกอเมริกาเหนือ",
            "sharePct": 27,
            "growthNote": "สัดส่วนลดลงเล็กน้อยจาก ~28% ใน Q1 เพราะฝั่งอเมริกาเหนือโตเร็วกว่า ไม่ใช่เพราะต่างประเทศหดตัว",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 80,
        "items": [
          {
            "item": "ลูกค้ากลุ่ม AI-native เป็นคลื่นรายได้ชั้นใหม่",
            "status": "executing",
            "evidence": "กว่า 750 รายใช้งานอยู่ — ในนั้น 31 รายจ่ายเกิน $1M/ปี และ 8 รายเกิน $10M/ปี · เป็นกลุ่มที่โตเร็วที่สุดแต่ก็ผันผวนที่สุด เพราะจ่ายตามการใช้งานจริงและปรับลดได้ทันทีเมื่อบริษัทเหล่านั้นหันไปคุมต้นทุน"
          },
          {
            "item": "ผลิตภัณฑ์สาย AI Observability (LLM Observability, AI Guard, Data Observability, Agent Console)",
            "status": "executing",
            "evidence": "เปิดตัวชุดใหญ่กว่า 100 ฟีเจอร์ในงาน DASH 2026 รวมถึง AI Guard สำหรับความปลอดภัยของ agent และผู้ช่วยเขียนโค้ด — ขายเข้าฐานลูกค้าเดิมได้ทันทีโดยไม่ต้องหาลูกค้าใหม่"
          },
          {
            "item": "Bits AI — ผู้ช่วย AI ที่ทำงานแทนทีม DevOps",
            "status": "on-track",
            "evidence": "ขยายจากผู้ช่วยตอบคำถามเป็นชุดงาน DevOps / Development / Data Analysis · ยังอยู่ช่วงเริ่มต้น ยังไม่มีตัวเลขรายได้แยกให้เห็น"
          },
          {
            "item": "ขายผลิตภัณฑ์เพิ่มให้ลูกค้าเดิม (land-and-expand)",
            "status": "executing",
            "evidence": "ลูกค้าที่ใช้ 4 ผลิตภัณฑ์ขึ้นไป 58% (จาก 52%) · 6 ตัวขึ้นไป 37% (จาก 29%) · 10 ตัวขึ้นไป 13% (จาก 7%) — ตัวเลขชุดนี้คือหลักฐานตรงที่สุดว่าแพลตฟอร์มเดียวจบใช้ได้จริง"
          },
          {
            "item": "Bring Your Own Cloud — ให้ลูกค้าเก็บข้อมูลไว้ในคลาวด์ตัวเอง",
            "status": "on-track",
            "evidence": "เปิดตัวสำหรับ logs/metrics/traces เพื่อลดต้นทุนของลูกค้ารายใหญ่ที่ข้อมูลเยอะจนค่าใช้จ่ายบานปลาย — เป็นการตอบโจทย์เดียวกับที่ทำให้ลูกค้ารายใหญ่ที่สุดปรับลดการใช้งาน"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "คูเมืองมาจากการเป็นที่รวมข้อมูลการทำงานของทั้งระบบ — เมื่อทีมวิศวกรเอา log, metric, trace, ความปลอดภัย และข้อมูลผู้ใช้จริงมาไว้ที่เดียวกันแล้ว การย้ายออกหมายถึงต้องรื้อเครื่องมือ ขั้นตอนการทำงาน และความเคยชินของทั้งองค์กรพร้อมกัน ยิ่งใช้หลายผลิตภัณฑ์ยิ่งย้ายยาก · แต่ต้องยอมรับว่าคูเมืองนี้ไม่ได้กันคู่แข่งด้านราคา เพราะมาตรฐานเปิดอย่าง OpenTelemetry ทำให้การส่งข้อมูลออกจากระบบง่ายขึ้นกว่าเดิม และผู้ให้บริการคลาวด์เองก็แถมเครื่องมือพื้นฐานมาให้ฟรี",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "เป็นผู้นำ observability ยุคคลาวด์ ลูกค้า ARR เกิน $100k เพิ่มจาก ~3,850 เป็น ~4,720 รายในหนึ่งปี และรายได้โตเร็วกว่าคู่แข่งเดิมอย่างชัดเจน"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "ออกผลิตภัณฑ์เร็วผิดปกติสำหรับบริษัทขนาดนี้ — กว่า 100 ฟีเจอร์ในงานเดียว และเข้าสาย AI observability ก่อนคู่แข่งส่วนใหญ่"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "ทะลุกรอบบนของ guidance ตัวเองสามไตรมาสติดในระดับ 4-5% ทุกครั้ง สะท้อนทั้งฝีมือและการตั้งเป้าแบบระมัดระวัง"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "strengthening",
            "note": "สัดส่วนลูกค้าที่ใช้ 10 ผลิตภัณฑ์ขึ้นไปเพิ่มจาก 7% เป็น 13% ในปีเดียว — ยิ่งผูกหลายตัว การย้ายยิ่งกลายเป็นโครงการใหญ่ระดับองค์กร ไม่ใช่แค่เปลี่ยนเครื่องมือ"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "stable",
            "note": "มีตัวเชื่อมต่อกับเครื่องมืออื่นหลายร้อยรายการซึ่งเป็นข้อได้เปรียบจริง แต่ไม่ใช่ระบบนิเวศแบบที่นักพัฒนาภายนอกสร้างของขายต่อได้ จึงไม่ได้ทบต้นเหมือนแพลตฟอร์มใหญ่"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "stable",
            "note": "วิศวกรชอบเพราะติดตั้งง่ายและใช้งานลื่น แต่ชื่อเสียงเรื่อง 'บิลบานปลาย' เป็นเสียงบ่นที่ได้ยินสม่ำเสมอ และเป็นแรงผลักให้ทีมใหญ่ ๆ มองหาทางเลือกที่ถูกกว่า"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "stable",
            "note": "gross retention ระดับ mid-to-high 90s แปลว่าแทบไม่มีใครเลิกใช้ แต่รายได้แบบนับตามการใช้งานทำให้ลูกค้า 'ลดการใช้' ได้โดยไม่ต้องเลิกสัญญา — ซึ่งคือสิ่งที่เกิดกับลูกค้ารายใหญ่ที่สุดใน Q3 2026 พอดี"
          },
          {
            "key": "moat",
            "label": "ความแข็งแรงของคูเมืองโดยรวม",
            "status": "stable",
            "note": "คูเมืองแข็งในเชิงการใช้งานประจำวัน แต่ไม่แข็งในเชิงราคา — มาตรฐานเปิด OpenTelemetry และเครื่องมือพื้นฐานที่ผู้ให้บริการคลาวด์แถมมาให้ ทำให้ลูกค้าที่ค่าใช้จ่ายสูงมีทางเลือกกดดันราคาได้เสมอ"
          }
        ]
      },
      "capitalAllocation": {
        "score": 60,
        "verdict": "จัดสรรทุนแบบบริษัทที่ยังโต — เงินสดเกือบทั้งหมดกลับเข้า R&D และทีมขาย ซึ่งเห็นผลจริงจากการขายผลิตภัณฑ์เพิ่มให้ลูกค้าเดิม แต่เมื่อ FCF แตะ $1B ต่อปีแล้วยังไม่มีทั้งปันผลและ buyback มาชดเชยการเจือจางจากค่าหุ้นพนักงานเลย นี่คือช่องว่างชัดเจนที่สุดของนโยบายทุน",
        "items": [
          {
            "label": "R&D",
            "current": "ลงทุนหนักต่อเนื่อง — เปิดตัวกว่า 100 ฟีเจอร์ในงาน DASH 2026 ครอบคลุมสาย AI ทั้งชุด",
            "assessment": "good",
            "why": "เป็นที่มาของการขายผลิตภัณฑ์ตัวที่สองสามสี่ให้ลูกค้าเดิม ซึ่งวัดผลได้จริงจากสัดส่วนลูกค้าที่ใช้ 10 ตัวขึ้นไปเพิ่มเกือบเท่าตัวในปีเดียว"
          },
          {
            "label": "ทีมขายและการตลาด",
            "current": "ขยายทีมต่อเนื่องเพื่อดันลูกค้าองค์กรขนาดใหญ่",
            "assessment": "good",
            "why": "ลูกค้า ARR เกิน $100k เพิ่มจาก ~3,850 เป็น ~4,720 รายในปีเดียว และกลุ่มนี้คิดเป็น ~91% ของ ARR — การลงทุนตรงจุด"
          },
          {
            "label": "ซื้อหุ้นคืนและปันผล",
            "current": "ไม่มีทั้งสองอย่าง",
            "assessment": "poor",
            "why": "มี FCF ระดับ $1B/ปีและเงินสดสุทธิ ~$3.7B แต่ไม่มีอะไรมาหักล้างหุ้นที่เพิ่มจาก SBC เลย ผู้ถือหุ้นเดิมจึงถูกเจือจางต่อเนื่องทั้งที่บริษัทมีเงินพอจะหยุดมันได้"
          },
          {
            "label": "การซื้อกิจการ",
            "current": "ซื้อของเล็ก ๆ เสริมผลิตภัณฑ์ ไม่เคยทำดีลใหญ่",
            "assessment": "good",
            "why": "กลยุทธ์ซื้อเทคโนโลยีมาต่อยอดแล้วขายผ่านช่องทางเดิม มีความเสี่ยงต่ำและไม่ทำให้งบดุลเสียหาย"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและหลักทรัพย์ ~$5.0B · หนี้ ~$1.28B (หุ้นกู้แปลงสภาพ 0% ปี 2029) · เงินสดสุทธิ ~$3.7B",
            "assessment": "good",
            "why": "แข็งแรงพอจะผ่านช่วงลูกค้าชะลอการใช้งานได้โดยไม่ต้องระดมทุน และดอกเบี้ยรับจากเงินก้อนนี้คือสาเหตุที่กำไรสุทธิยังเป็นบวกทั้งที่กำไรจากการดำเนินงานเกือบศูนย์"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~87x จาก consensus non-GAAP FY2026 $2.53 (44 นักวิเคราะห์) และ trailing GAAP P/E ~447x — แพงทั้งสองฐาน · ราคา ~$221, mcap ~$82B (11 ก.ย. 2026) ลงมาแล้ว ~23% จากจุดสูงสุด $288 เมื่อ 4 ส.ค. 2026 โดยร่วง 19% ในวันเดียวหลังประกาศงบ ทั้งที่ผลประกอบการทะลุเป้า เพราะตลาดตกใจกับข่าวลูกค้ารายใหญ่ที่สุดลดการใช้งาน · เป้าเฉลี่ยนักวิเคราะห์ $285.51 สูงกว่าราคาปัจจุบัน ~29% แต่ระดับราคานี้ยังต้องการให้บริษัทโต 25-30% ต่อเนื่องอีกหลายปีโดยไม่สะดุด margin of safety จึงแทบไม่มี"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "$1.006B (+32% YoY)",
          "now": "$1.121B (+36% YoY) — ทะลุกรอบบนของ guidance",
          "direction": "positive"
        },
        {
          "metric": "ลูกค้ารายใหญ่ที่สุด",
          "prev": "ต่อสัญญาระดับเก้าหลัก ใช้ 17 ผลิตภัณฑ์",
          "now": "ลดการใช้งานตั้งแต่ Q3 2026 — บริษัทตัดความเสี่ยงออกจาก guidance ทั้งหมดแล้ว",
          "direction": "negative"
        },
        {
          "metric": "guidance รายได้ทั้งปี 2026",
          "prev": "$4.06-4.10B (ให้ไว้ตอนงบ Q4 2025)",
          "now": "$4.45-4.47B — ปรับขึ้นแรงแม้หักผลกระทบลูกค้ารายใหญ่แล้ว",
          "direction": "positive"
        },
        {
          "metric": "ลูกค้า ARR เกิน $100k",
          "prev": "~3,850 ราย (ปีก่อน)",
          "now": "~4,720 ราย = ~91% ของ ARR ทั้งหมด",
          "direction": "positive"
        },
        {
          "metric": "การใช้หลายผลิตภัณฑ์",
          "prev": "ใช้ 4 ตัวขึ้นไป 52% · 10 ตัวขึ้นไป 7%",
          "now": "ใช้ 4 ตัวขึ้นไป 58% · 10 ตัวขึ้นไป 13%",
          "direction": "positive"
        },
        {
          "metric": "ราคาหุ้น",
          "prev": "$283 (5 ส.ค. 2026)",
          "now": "$221 — ร่วง 19% ในวันประกาศงบ แล้วลงต่อ รวม ~23% จากจุดสูงสุด",
          "direction": "negative"
        }
      ],
      "risks": [
        "รายได้นับตามการใช้งานเป็นดาบสองคม — ลูกค้าลดการใช้ได้ทันทีโดยไม่ต้องยกเลิกสัญญา กรณีลูกค้ารายใหญ่ที่สุดใน Q3 2026 คือตัวอย่างจริงที่กระทบถึงประมาณการทั้งปี ทั้งที่ gross retention ยังอยู่ระดับ mid-to-high 90s",
        "การกระจุกตัวของลูกค้า AI — กลุ่ม AI-native เป็นส่วนที่โตเร็วที่สุดแต่ผันผวนที่สุด บริษัทเหล่านี้ยังขาดทุนและอยู่ระหว่างคุมต้นทุน หากหันไปใช้เครื่องมือของตัวเองหรือของผู้ให้บริการคลาวด์ รายได้ก้อนนี้หายได้เร็วพอกับตอนที่มันโตขึ้นมา",
        "ค่าหุ้นพนักงานสูงมากจนบิดภาพกำไร — ช่องว่าง 23 จุดระหว่าง GAAP กับ non-GAAP operating margin คือ SBC เกือบทั้งหมด และบริษัทไม่มี buyback มาหักล้าง ผู้ถือหุ้นจึงถูกเจือจางต่อเนื่อง ตัวเลข non-GAAP ที่ตลาดใช้ตั้งราคาจึงมองข้ามต้นทุนจริงก้อนใหญ่",
        "ราคาแพงบนความคาดหวังสูง — forward P/E ~87x (non-GAAP) และ trailing GAAP ~447x หากการเติบโตชะลอลงต่ำกว่า 25% multiple จะหดแรงกว่าพื้นฐานที่แย่ลงจริง อย่างที่เห็นจากการร่วง 19% ในวันเดียวทั้งที่งบทะลุเป้า",
        "การแข่งขันด้านราคาและมาตรฐานเปิด — OpenTelemetry ทำให้ย้ายข้อมูลออกง่ายขึ้น ผู้ให้บริการคลาวด์แถมเครื่องมือพื้นฐานให้ฟรี และคู่แข่งอย่าง Grafana ชูโมเดลต้นทุนต่ำ ลูกค้ารายใหญ่ที่บิลบานปลายจึงมีทางเลือกกดดันราคาเสมอ",
        "gross margin ค่อย ๆ ถูกกดจากงาน AI — ลดจาก 80.9% เหลือ 79.6% ในหนึ่งปี เพราะงาน AI กินทรัพยากรมากกว่างานเดิม ถ้าสัดส่วนงาน AI โตต่อโดยไม่ปรับราคา กำไรขั้นต้นจะถูกกดต่อเนื่อง"
      ],
      "asOf": "2026-09",
      "nextEarnings": "2026-11",
      "history": {
        "epsBasis": "diluted GAAP (ปีบัญชี = ปีปฏิทิน สิ้นสุด 31 ธ.ค.)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 1.029,
            "epsAdj": -0.07,
            "opMarginPct": -1.9,
            "fcfB": 0.277,
            "priceFYEnd": 178.11
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 1.675,
            "epsAdj": -0.16,
            "opMarginPct": -3.5,
            "fcfB": 0.383,
            "priceFYEnd": 73.5
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 2.128,
            "epsAdj": 0.14,
            "opMarginPct": -1.6,
            "fcfB": 0.632,
            "priceFYEnd": 121.38
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 2.684,
            "epsAdj": 0.52,
            "opMarginPct": 2,
            "fcfB": 0.836,
            "priceFYEnd": 142.89
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 3.427,
            "epsAdj": 0.31,
            "opMarginPct": -1.3,
            "fcfB": 1.001,
            "priceFYEnd": 135.99
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 0.548,
            "epsAdj": 0.06,
            "opMarginPct": -0.8,
            "fcfB": 0.147,
            "priceQEnd": 91.09
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-31",
            "revenueB": 0.59,
            "epsAdj": 0.16,
            "opMarginPct": 4.7,
            "fcfB": 0.21,
            "priceQEnd": 121.38
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-31",
            "revenueB": 0.611,
            "epsAdj": 0.12,
            "opMarginPct": 2,
            "fcfB": 0.198,
            "priceQEnd": 123.6
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-30",
            "revenueB": 0.645,
            "epsAdj": 0.12,
            "opMarginPct": 2,
            "fcfB": 0.16,
            "priceQEnd": 129.69
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-30",
            "revenueB": 0.69,
            "epsAdj": 0.14,
            "opMarginPct": 2.9,
            "fcfB": 0.22,
            "priceQEnd": 115.06
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-31",
            "revenueB": 0.738,
            "epsAdj": 0.13,
            "opMarginPct": 1.3,
            "fcfB": 0.257,
            "priceQEnd": 142.89
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 0.762,
            "epsAdj": 0.07,
            "opMarginPct": -1.6,
            "fcfB": 0.263,
            "priceQEnd": 99.21
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-30",
            "revenueB": 0.827,
            "epsAdj": 0.01,
            "opMarginPct": -4.1,
            "fcfB": 0.185,
            "priceQEnd": 134.33
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 0.886,
            "epsAdj": 0.1,
            "opMarginPct": -0.7,
            "fcfB": 0.235,
            "priceQEnd": 142.4
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 0.953,
            "epsAdj": 0.13,
            "opMarginPct": 1,
            "fcfB": 0.318,
            "priceQEnd": 135.99
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 1.006,
            "epsAdj": 0.15,
            "opMarginPct": 0.8,
            "fcfB": 0.323,
            "priceQEnd": 118.05
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 1.121,
            "epsAdj": 0.12,
            "opMarginPct": 0.7,
            "fcfB": 0.306,
            "priceQEnd": 260.36,
            "epsNote": "GAAP $0.12 เทียบ non-GAAP $0.65 — ส่วนต่าง ~$0.53/หุ้นเกือบทั้งหมดคือค่าหุ้นพนักงาน (SBC) ซึ่งเป็นรายจ่ายต่อเนื่องทุกไตรมาส ไม่ใช่รายการพิเศษครั้งเดียว เวลาเทียบกับ consensus ต้องดูให้ตรงฐาน"
          }
        ],
        "notes": "ปีบัญชีของ Datadog ตรงกับปีปฏิทิน (สิ้นสุด 31 ธ.ค.) และไตรมาสจบสิ้นเดือนปฏิทินทุกไตรมาส · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งต่ำกว่าตัวเลข non-GAAP ที่บริษัทและนักวิเคราะห์ใช้มาก (เช่น Q2 2026: GAAP $0.12 vs non-GAAP $0.65) เพราะ GAAP รวมค่าหุ้นพนักงานไว้ด้วย · สังเกตว่า FY2025 กำไรต่อหุ้น GAAP *ลดลง* เหลือ $0.31 จาก $0.52 ใน FY2024 ทั้งที่รายได้โต 28% เพราะกำไรจากการดำเนินงานพลิกเป็นลบ (-$42.8M) กำไรสุทธิที่ยังเป็นบวกมาจากดอกเบี้ยรับของเงินสดราว $5B ไม่ใช่จากธุรกิจหลัก · FCF ในตารางนี้คิดแบบ OCF ลบ capex จากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ ซึ่งสูงกว่าตัวเลข FCF ที่บริษัทรายงานเองเล็กน้อยเพราะบริษัทหักค่าพัฒนาซอฟต์แวร์ที่บันทึกเป็นสินทรัพย์ด้วย (Q2 2026: ตาราง $0.306B vs บริษัทรายงาน $0.279B) · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance (ไม่มี split ในช่วงนี้) · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://investors.datadoghq.com/news-releases/news-release-details/datadog-announces-second-quarter-2026-financial-results",
          "https://stockanalysis.com/stocks/ddog/financials/",
          "https://www.fool.com/earnings/call-transcripts/2026/08/13/datadog-ddog-q2-2026-earnings-call-transcript/",
          "https://www.sec.gov/Archives/edgar/data/0001561550/000162828026054458/ddog-20260630.htm",
          "https://query1.finance.yahoo.com/v8/finance/chart/DDOG (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-09",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 2.53,
            "revenue": 4.47
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "$1.07-1.08B",
            "actual": "$1.121B",
            "result": "beat",
            "magnitudePct": 4.3
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "$951-961M",
            "actual": "$1,006M",
            "result": "beat",
            "magnitudePct": 5.2
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "$912-916M",
            "actual": "$953M",
            "result": "beat",
            "magnitudePct": 4.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 4.47,
            "eps": 2.53,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "Datadog ให้ guidance เป็นช่วงแคบทุกไตรมาสและทะลุกรอบบนทุกครั้งในสามไตรมาสที่ยืนยันได้ (เกินจุดกึ่งกลาง 4.3-5.2%) — เป็นรูปแบบการตั้งเป้าแบบระมัดระวังที่สม่ำเสมอ ไม่ใช่ความบังเอิญ · guidance ทั้งปี 2026 ถูกยกจาก $4.06-4.10B (ตอนงบ Q4 2025) เป็น $4.45-4.47B แม้จะตัดผลกระทบจากลูกค้ารายใหญ่ที่สุดออกไปแล้ว · consensus FY2026 = รายได้ $4.47B / EPS $2.53 บนฐาน non-GAAP (44 นักวิเคราะห์ · ยืนยันฐานจาก stockanalysis.com) ซึ่งเป็นคนละฐานกับ EPS ในตารางประวัติที่เป็น GAAP · ยังไม่ใส่ consensus FY2027 เพราะหาตัวเลข aggregate แบบเปิดเผยฟรีไม่ได้ในรอบนี้ — ห้ามเดา"
      }
    },
    "INTC": {
      "ticker": "INTC",
      "name": "Intel Corporation",
      "layer": "foundry",
      "thesis": {
        "statement": "Intel คือเดิมพันการพลิกฟื้นที่ใหญ่ที่สุดในอุตสาหกรรมชิป — บริษัทที่เคยผูกขาดทั้งการออกแบบและการผลิต เสียตำแหน่งผู้นำเทคโนโลยีการผลิตให้ TSMC ไปเกือบสิบปี และกำลังพยายามกลับมาด้วยเทคโนโลยี 18A ที่ผลิตจริงบนแผ่นดินอเมริกาแล้ว · สิ่งที่ทำให้กรณีนี้ต่างจากการพลิกฟื้นทั่วไปคือรัฐบาลสหรัฐเข้ามาถือหุ้นเองราว 10% และ NVIDIA กับ SoftBank ลงเงินตาม ทำให้ Intel กลายเป็นโครงสร้างพื้นฐานเชิงยุทธศาสตร์ของประเทศ ไม่ใช่แค่บริษัทเอกชนที่ต้องรอดด้วยตัวเอง · แต่ราคาหุ้นที่ขึ้นมา ~188% ในปีเดียวได้สะท้อนความสำเร็จของแผนนี้ไปล่วงหน้ามากแล้ว ขณะที่ธุรกิจ Foundry ยังขาดทุนระดับ $2B ต่อไตรมาสและมีลูกค้าภายนอกแค่ ~$293M",
        "pillars": [
          "18A ผลิตจริงแล้ว — Panther Lake (Core Ultra Series 3) เข้าสู่การผลิตจำนวนมากบนเทคโนโลยี 18A และ 18A-P เข้าสู่ risk production ถือเป็นโหนดที่ล้ำที่สุดที่ผลิตบนแผ่นดินสหรัฐ",
          "ธุรกิจหลักฟื้นจริง — รายได้ Q2 2026 โต 25% เร็วที่สุดตั้งแต่ปี 2011 โดยฝั่ง Data Center และ AI โต 59% และ gross margin ขยับจาก 27.5% เป็น 40.4% ภายในปีเดียว",
          "รัฐบาลสหรัฐถือหุ้นราว 10% แลกกับเงิน CHIPS Act $5.7B ที่จ่ายเร็วขึ้น — เปลี่ยนสถานะจากบริษัทที่ต้องรอดเองเป็นโครงสร้างพื้นฐานที่ประเทศต้องให้รอด",
          "NVIDIA ลงทุน $5B ที่ราคา $23.28 พร้อมร่วมพัฒนาสินค้า data center และ PC หลายรุ่น · SoftBank ลงอีก $2B — คู่แข่งเก่ากลายเป็นทั้งผู้ถือหุ้นและพันธมิตร",
          "Foundry คือทางเลือกที่สองของโลกนอกเหนือจาก TSMC — ถ้าดึงลูกค้าภายนอกรายใหญ่บน 14A ได้จริง ธุรกิจนี้จะเปลี่ยนจากภาระเป็นเครื่องยนต์ แต่วันนี้ยังไม่เกิด"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+25% YoY (Q2 2026 — $16.13B) เร็วที่สุดตั้งแต่ปี 2011 · guide Q3 $15.8-16.8B",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "พลิกจากรายได้ที่หดตัวติดต่อกันสี่ปี (FY2021 $79B ลงมาเหลือ $52.9B ใน FY2025) มาเป็นการโตสองหลักจริง โดยฝั่ง Data Center และ AI โต 59% และทะลุ guidance ของตัวเองเหนือกรอบบนติดกันหลายไตรมาส · ต้องหมายเหตุว่าฐานที่ใช้เทียบต่ำมากหลังผ่านช่วงตกต่ำ และ guide Q3 บอกว่ารายได้จะทรงตัว ไม่ได้เร่งต่อ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2 2026: GAAP EPS −$2.16 · non-GAAP $0.42 (ปีก่อนขาดทุนทั้งสองฐาน) — GAAP ติดลบจากรายการไม่ใช่เงินสด $12.5B",
          "trend": "up",
          "score": 52,
          "impact": "neutral",
          "why": "ต้องอ่านสองชั้น — กำไรจากการดำเนินงานพลิกเป็นบวก $1.8B จากที่ขาดทุน $3.2B ปีก่อน ซึ่งคือการฟื้นจริง แต่ EPS ตามบัญชียังติดลบหนักเพราะต้องตีมูลค่าหุ้นที่วางไว้ให้รัฐบาลใหม่ทุกไตรมาส และยิ่งราคาหุ้นขึ้น ตัวเลขขาดทุนก้อนนี้ยิ่งใหญ่ · แปลว่าตราบใดที่หุ้นยังขึ้น กำไร GAAP จะดูแย่ต่อไปทั้งที่ธุรกิจดีขึ้น"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 2026 = +$4.45B (OCF $7.0B หัก capex $2.65B) · แต่ทั้งปี FY2025 ยังติดลบ $4.9B และ capex ปี 2026 ถูกยกเป็นเกิน $20B",
          "trend": "up",
          "score": 45,
          "impact": "neutral",
          "why": "ไตรมาสล่าสุดเป็นบวกก้อนใหญ่ครั้งแรกในรอบหลายปี หลังติดลบสะสมกว่า $44B ตั้งแต่ FY2022 ถึง FY2025 · แต่ยังเรียกว่าฟื้นไม่ได้ เพราะบริษัทเพิ่งยกงบลงทุนขึ้นเกิน $20B สำหรับปีนี้เพื่อขยายกำลังผลิต กระแสเงินสดทั้งปีจึงยังไม่แน่ว่าจะเป็นบวก"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "GAAP gross margin 40.4% (ปีก่อน 27.5%) · non-GAAP 41.8% · GAAP operating margin 11.1% · guide Q3 gross margin ~41%",
          "trend": "up",
          "score": 62,
          "impact": "positive",
          "why": "การฟื้นตัวที่ชัดที่สุดในงบ — gross margin ขยับ 13 จุดในปีเดียวจากอัตราการผลิตที่ดีขึ้นและรอบการผลิตที่เร็วขึ้น และ operating margin กลับเป็นบวกเลขสองหลัก · แต่ยังห่างจากยุครุ่งเรือง (gross margin เคยอยู่ระดับ 55-60%) และ Foundry ยังขาดทุนระดับ $2.1B ต่อไตรมาสซึ่งกดตัวเลขรวมอยู่"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังต่ำมาก — สินทรัพย์โรงงานมหาศาลแต่เพิ่งกลับมามีกำไรจากการดำเนินงานได้ไม่กี่ไตรมาส",
          "trend": "up",
          "score": 35,
          "impact": "negative",
          "why": "Intel ลงทุนโรงงานไปหลายหมื่นล้านดอลลาร์ตลอดสี่ปีที่ผ่านมาโดยที่กำไรยังไม่กลับมา ผลตอบแทนต่อทุนที่ลงไปจึงยังต่ำที่สุดในกลุ่มชิปใหญ่ · ทิศทางดีขึ้นตามอัตราการผลิตที่ดีขึ้น แต่การจะพิสูจน์ว่าเงินที่ลงไปคุ้มต้องรอให้ Foundry มีลูกค้าภายนอกจริงก่อน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$29.7B (27 มิ.ย. 2026) — หนุนด้วยเงินจากรัฐบาล NVIDIA และ SoftBank",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "เงินสดกลับมาหนาขึ้นมากจากการขายหุ้นให้รัฐบาลสหรัฐ NVIDIA ($5B) และ SoftBank ($2B) บวกเงิน CHIPS Act $5.7B ที่จ่ายเร็วขึ้น · เพียงพอต่อแผนลงทุนอีกหลายปี แต่ต้องจำว่าเงินก้อนนี้แลกมาด้วยการเจือจางหุ้นเดิม ไม่ใช่เงินที่ธุรกิจหามาเอง"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้รวม ~$50.5B เทียบเงินสด ~$29.7B — หนี้สุทธิ ~$20.8B",
          "trend": "flat",
          "score": 35,
          "impact": "negative",
          "why": "งบดุลยังหนักที่สุดในกลุ่มชิปใหญ่ หนี้ก้อนนี้สะสมมาจากช่วงที่ลงทุนโรงงานหนักขณะที่กระแสเงินสดติดลบ · ยังบริหารได้เพราะเงินสดหนาและมีรัฐบาลหนุน แต่แปลว่าไม่มีพื้นที่ให้พลาด ถ้าการฟื้นตัวสะดุดขึ้นมาจริง ภาระดอกเบี้ยจะกลายเป็นข้อจำกัดทันที"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 5,104 ล้านหุ้น (Q2 2026) เพิ่มจากราว 4,300 ล้านหุ้นก่อนดีลปี 2025 — เจือจางราว 19% ในสองปี",
          "trend": "down",
          "score": 20,
          "impact": "negative",
          "why": "จุดอ่อนที่สุดของกรณีนี้ — เงินที่เข้ามาช่วยชีวิตบริษัททั้งจากรัฐบาล NVIDIA และ SoftBank แลกมาด้วยหุ้นใหม่จำนวนมหาศาล ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนไปเกือบหนึ่งในห้า · ยังมีหุ้นที่วางไว้ในบัญชี escrow ให้รัฐบาลรอทยอยส่งมอบอีก ซึ่งนอกจากจะเจือจางเพิ่มแล้วยังทำให้กำไร GAAP ติดลบทุกไตรมาสที่ราคาหุ้นขึ้น"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ไม่มีปันผล (ยกเลิกตั้งแต่ปี 2024) · capex ปี 2026 เกิน $20B · ขายหุ้น Altera 51% ออกไปเมื่อ ก.ย. 2025",
          "trend": "up",
          "score": 45,
          "impact": "neutral",
          "why": "ทีมบริหารชุดใหม่ตัดสินใจตรงไปตรงมา — หยุดปันผลเพื่อเก็บเงินไว้ลงทุน ขายธุรกิจที่ไม่ใช่แกนหลักออก และระดมทุนจากพันธมิตรเชิงยุทธศาสตร์แทนการก่อหนี้เพิ่ม เป็นการเลือกที่สมเหตุสมผลในสถานการณ์นี้ · แต่ยังตัดสินไม่ได้ว่าเงินที่ทุ่มลงโรงงานจะให้ผลตอบแทนคุ้มหรือไม่ เพราะลูกค้า Foundry ภายนอกยังแทบไม่มี"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$103 · mcap ~$525B · forward P/E ~68x จาก consensus non-GAAP FY2026 $1.51 · ขึ้นมา ~188% ตั้งแต่ต้นปี",
          "trend": "down",
          "score": 18,
          "impact": "negative",
          "why": "ราคาวิ่งจาก $37 ต้นปีขึ้นไปแตะ $141 แล้วย่อมาที่ ~$103 — ขึ้น 188% ในเก้าเดือนโดยที่กำไรยังไม่กลับมาเต็มรูป · ที่ 68 เท่าของกำไร non-GAAP ที่ยังไม่เกิดจริง ราคานี้เท่ากับซื้อความสำเร็จของแผนพลิกฟื้นไว้ล่วงหน้าเกือบทั้งหมด เป้าเฉลี่ยนักวิเคราะห์ $115.74 สูงกว่าราคาปัจจุบันเพียง ~12% ซึ่งแคบผิดปกติสำหรับหุ้นที่ความไม่แน่นอนสูงขนาดนี้"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 42,
        "recurringPct": 5,
        "note": "คุณภาพรายได้เป็นจุดอ่อนเชิงโครงสร้าง — Intel ขายฮาร์ดแวร์ตามรอบคำสั่งซื้อ แทบไม่มีรายได้ประจำแบบสัญญาระยะยาว และรายได้เคยหดจาก $79B (FY2021) เหลือ $52.9B (FY2025) ภายในสี่ปี ความสม่ำเสมอจึงต่ำกว่าบริษัทชิปใหญ่รายอื่นมาก · ไตรมาสล่าสุดฟื้นแรงจริงและทะลุเป้าตัวเองเหนือกรอบบนติดกันหลายไตรมาส แต่ยังเป็นการฟื้นจากฐานต่ำ ไม่ใช่การเติบโตที่พิสูจน์ความยั่งยืนแล้ว · ตัวเลข segment ด้านล่างเป็นรายได้จากภายนอกเท่านั้น — Intel Foundry มีรายได้รวม $5.77B แต่เกือบทั้งหมดเป็นการผลิตให้แผนกตัวเอง ขายให้ลูกค้าภายนอกจริงเพียง ~$293M ซึ่งคือหัวใจที่ยังไม่พิสูจน์ของทั้ง thesis นี้",
        "segments": [
          {
            "name": "Client Computing (ซีพียูพีซี รวม Physical AI)",
            "sharePct": 55,
            "growthNote": "$8.88B (+13% YoY) กำไรจากการดำเนินงาน $2.34B — ยังเป็นเครื่องยนต์เงินสดหลัก หนุนจากรอบเปลี่ยนเครื่อง AI PC และ Panther Lake บน 18A",
            "trend": "up"
          },
          {
            "name": "Data Center และ AI",
            "sharePct": 39,
            "growthNote": "$6.26B (+59% YoY) กำไรจากการดำเนินงาน $2.47B — ส่วนที่โตเร็วที่สุดและเป็นตัวขับเซอร์ไพรส์ของไตรมาส",
            "trend": "up"
          },
          {
            "name": "Intel Foundry (เฉพาะลูกค้าภายนอก)",
            "sharePct": 2,
            "growthNote": "รายได้ภายนอกเพียง ~$293M · รายได้รวมทั้ง segment $5.77B (+31%) แต่ยังขาดทุนจากการดำเนินงาน $2.09B ต่อไตรมาส",
            "trend": "up"
          },
          {
            "name": "อื่น ๆ (Mobileye และหน่วยธุรกิจที่เหลือ)",
            "sharePct": 4,
            "growthNote": "$0.70B (−33% YoY) — หดตัวจากการขายหุ้น Altera 51% ออกไปเมื่อ ก.ย. 2025 ทำให้ไม่ต้องรวมงบอีกต่อไป",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 58,
        "items": [
          {
            "item": "18A ผลิตจำนวนมากจริงแล้ว — Panther Lake (Core Ultra Series 3)",
            "status": "executing",
            "evidence": "เข้าสู่การผลิตจำนวนมากบนเทคโนโลยี 18A โดยใช้เครื่อง High-NA EUV ของ ASML และ 18A-P เข้าสู่ risk production แล้ว — เป็นโหนดที่ล้ำที่สุดที่ผลิตบนแผ่นดินสหรัฐ และเป็นหลักฐานชิ้นแรกที่จับต้องได้ว่าแผนพลิกฟื้นด้านการผลิตเดินได้จริง"
          },
          {
            "item": "Data Center และ AI กลับมาโตแรง",
            "status": "executing",
            "evidence": "รายได้ $6.26B (+59% YoY) กำไรจากการดำเนินงาน $2.47B ในไตรมาสเดียว — ดีมานด์ซีพียูสำหรับงาน AI กลับมาหลังจากตลาดเทน้ำหนักไปที่ GPU มาหลายปี"
          },
          {
            "item": "ความร่วมมือกับ NVIDIA",
            "status": "on-track",
            "evidence": "NVIDIA ลงทุน $5B ที่ราคา $23.28/หุ้น (ถือราว 4%) พร้อมตกลงร่วมพัฒนาสินค้า data center และ PC หลายรุ่น — เปลี่ยนคู่แข่งเป็นพันธมิตร แต่สินค้าร่วมยังไม่ออกสู่ตลาด จึงยังไม่มีตัวเลขให้วัด"
          },
          {
            "item": "ดึงลูกค้าภายนอกเข้า Foundry บน 14A",
            "status": "at-risk",
            "evidence": "ซีอีโอระบุว่าหลังความสำเร็จของ Panther Lake มีลูกค้าภายนอกเข้ามาคุยเรื่อง 18A-P และ 14A มากขึ้น แต่รายได้ภายนอกจริงยังอยู่แค่ ~$293M ต่อไตรมาส และยังไม่มีการประกาศลูกค้ารายใหญ่ที่ผูกพันจริง — นี่คือข้อที่ยังไม่ผ่านและเป็นตัวตัดสิน thesis ทั้งหมด"
          },
          {
            "item": "สถานะโครงสร้างพื้นฐานเชิงยุทธศาสตร์ของสหรัฐ",
            "status": "executing",
            "evidence": "รัฐบาลสหรัฐถือหุ้นราว 9.9% แลกกับการจ่ายเงิน CHIPS Act $5.7B เร็วขึ้น บวก SoftBank อีก $2B — ลดความเสี่ยงเรื่องเงินทุนไปมาก และทำให้ Intel มีแรงหนุนเชิงนโยบายที่คู่แข่งไม่มี"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองของ Intel วันนี้มาจากสองอย่างที่ไม่ใช่เทคโนโลยีล้วน — หนึ่งคือฐานติดตั้ง x86 ในองค์กรและศูนย์ข้อมูลทั่วโลกที่ซอฟต์แวร์จำนวนมหาศาลผูกอยู่ ย้ายออกทั้งระบบไม่ได้ง่าย ๆ สองคือการเป็นโรงงานผลิตชิปขั้นสูงแห่งเดียวที่เป็นของสหรัฐและอยู่บนแผ่นดินสหรัฐ ซึ่งมีค่าทางยุทธศาสตร์เกินกว่าที่ตลาดจะปล่อยให้ล้ม · แต่ในเชิงเทคโนโลยีล้วน Intel ยังตามหลัง TSMC และต้องพิสูจน์ 18A/14A กับลูกค้าภายนอกก่อนจึงจะเรียกได้ว่ามีคูเมืองด้านการผลิตจริง",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "ยังครองส่วนแบ่งซีพียูพีซีและเซิร์ฟเวอร์เป็นอันดับหนึ่ง แต่เสียส่วนแบ่งให้ AMD ต่อเนื่องหลายปี และในสนาม AI accelerator แทบไม่มีที่ยืนเทียบ NVIDIA"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "18A ผลิตจริงแล้วและ 18A-P เข้า risk production — ไล่ช่องว่างกับ TSMC ได้เร็วที่สุดในรอบสิบปี แต่ยังไม่ถึงจุดที่เรียกว่าแซง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "ทะลุ guidance ของตัวเองเหนือกรอบบนหลายไตรมาสติด (Q2 2026 เกินจุดกึ่งกลางถึง 12.8%) และส่งมอบ 18A ตามกำหนด — ต่างจากประวัติการเลื่อนโหนดซ้ำซากในยุคก่อน"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "stable",
            "note": "ซอฟต์แวร์องค์กรจำนวนมหาศาลยังผูกกับ x86 ทำให้ย้ายทั้งระบบมีต้นทุนสูง แต่ในงาน AI ที่เขียนใหม่ตั้งแต่ต้น ข้อได้เปรียบนี้แทบไม่มีผล"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "stable",
            "note": "ระบบนิเวศ x86 ยังใหญ่และลึก แต่ฝั่ง AI ที่ CUDA ของ NVIDIA ครองอยู่ Intel ยังไม่มีอะไรมาทดแทนได้จริง"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "weakening",
            "note": "นักพัฒนางาน AI เลือก CUDA เป็นค่าเริ่มต้น เครื่องมือฝั่ง Intel ยังตามหลังอยู่มากและไม่มีสัญญาณว่าจะพลิกได้ในระยะใกล้"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "stable",
            "note": "ลูกค้าองค์กรยังอยู่กับ x86 เพราะต้นทุนการย้าย แต่เป็นการอยู่เพราะความเฉื่อย ไม่ใช่เพราะสัญญาผูกพัน — ต่างจากโมเดล foundry ที่ลูกค้าผูกกันหลายปีต่อรุ่น ซึ่ง Intel ยังแทบไม่มี"
          },
          {
            "key": "moat",
            "label": "ความแข็งแรงของคูเมืองโดยรวม",
            "status": "strengthening",
            "note": "แข็งขึ้นชัดจากสองด้าน — เทคโนโลยีการผลิตที่กลับมาแข่งได้ และสถานะที่รัฐบาลสหรัฐถือหุ้นเองซึ่งทำให้ความเสี่ยงล้มละลายแทบหมดไป · แต่ยังไม่ใช่คูเมืองแบบที่กันคู่แข่งได้ด้วยตัวเอง ตราบใดที่ Foundry ยังไม่มีลูกค้าภายนอกรายใหญ่"
          }
        ]
      },
      "capitalAllocation": {
        "score": 45,
        "verdict": "ทีมบริหารชุดใหม่ตัดสินใจตรงและกล้า — หยุดปันผล ขายธุรกิจที่ไม่ใช่แกนหลัก และเลือกระดมทุนจากรัฐบาลและพันธมิตรเชิงยุทธศาสตร์แทนการก่อหนี้เพิ่ม ซึ่งเป็นทางที่ถูกในสถานการณ์ที่กระแสเงินสดติดลบและต้องลงทุนหนัก · แต่ราคาที่จ่ายคือการเจือจางหุ้นเดิมเกือบหนึ่งในห้า และยังพิสูจน์ไม่ได้ว่าเงินที่ทุ่มลงโรงงานจะให้ผลตอบแทนคุ้ม",
        "items": [
          {
            "label": "งบลงทุนโรงงาน (capex)",
            "current": "ยกเป้าปี 2026 ขึ้นเป็นเกิน $20B จากสัญญาณความต้องการของลูกค้า",
            "assessment": "neutral",
            "why": "จำเป็นถ้าจะแข่งด้านการผลิตจริง และการยกเป้าขึ้นกลางปีสะท้อนว่าดีมานด์ดีกว่าที่คิด · แต่เป็นเงินก้อนใหญ่ที่ยังไม่มีลูกค้า Foundry ภายนอกมารองรับ จึงยังเรียกว่าดีหรือไม่ดีไม่ได้"
          },
          {
            "label": "เงินปันผล",
            "current": "ยกเลิกตั้งแต่ปี 2024 ยังไม่กลับมา",
            "assessment": "good",
            "why": "ถูกต้องแล้วในสถานการณ์ที่กระแสเงินสดทั้งปียังติดลบ — การฝืนจ่ายปันผลด้วยเงินกู้คือสิ่งที่ทำให้บริษัทหลายแห่งจบไม่สวย"
          },
          {
            "label": "ระดมทุนจากรัฐบาลและพันธมิตร",
            "current": "รัฐบาลสหรัฐถือราว 9.9% (แลกเงิน CHIPS $5.7B ที่จ่ายเร็วขึ้น) · NVIDIA $5B · SoftBank $2B",
            "assessment": "neutral",
            "why": "ได้เงินสดและแรงหนุนเชิงนโยบายโดยไม่เพิ่มหนี้ ซึ่งมีค่ามากในจังหวะนี้ · แต่แลกด้วยการเจือจางหุ้นเดิมและทำให้กำไร GAAP ติดลบทุกไตรมาสที่ราคาหุ้นขึ้น เพราะต้องตีมูลค่าหุ้นที่วางไว้ให้รัฐบาลใหม่ตลอด"
          },
          {
            "label": "ขายธุรกิจที่ไม่ใช่แกนหลัก",
            "current": "ขายหุ้น Altera 51% ออกไปเมื่อ ก.ย. 2025",
            "assessment": "good",
            "why": "โฟกัสกลับมาที่ซีพียูและโรงงานซึ่งเป็นสองอย่างที่ตัดสินอนาคตจริง ๆ ได้เงินสดเข้ามาด้วย"
          },
          {
            "label": "งบดุล",
            "current": "เงินสด ~$29.7B · หนี้ ~$50.5B → หนี้สุทธิ ~$20.8B",
            "assessment": "poor",
            "why": "หนักที่สุดในกลุ่มชิปใหญ่ และเป็นข้อจำกัดจริงถ้าการฟื้นตัวสะดุด — เงินสดที่หนาขึ้นมาจากการขายหุ้น ไม่ใช่จากธุรกิจที่หามาได้เอง"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~68x จาก consensus non-GAAP FY2026 EPS $1.51 (41 นักวิเคราะห์ · รายได้ $63.0B) — แพงมากสำหรับบริษัทที่กำไร GAAP ยังติดลบและ Foundry ยังขาดทุน $2.1B ต่อไตรมาส · ราคา ~$103, mcap ~$525B (13 ก.ย. 2026) หลังวิ่งขึ้น ~188% จาก $37 ต้นปี แตะสูงสุด $141 เมื่อ 22 มิ.ย. แล้วย่อลงมา · ราคาระดับนี้เท่ากับซื้อความสำเร็จของแผนพลิกฟื้นไว้ล่วงหน้าเกือบทั้งหมด ทั้งที่ข้อสำคัญที่สุด (ลูกค้า Foundry ภายนอก) ยังไม่เกิด · เป้าเฉลี่ยนักวิเคราะห์ $115.74 สูงกว่าราคาปัจจุบันเพียง ~12% ซึ่งเป็นช่องว่างที่แคบผิดปกติเมื่อเทียบกับความไม่แน่นอนของกรณีนี้"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "$13.58B (+7% YoY)",
          "now": "$16.13B (+25% YoY) — โตเร็วที่สุดตั้งแต่ปี 2011",
          "direction": "positive"
        },
        {
          "metric": "Data Center และ AI",
          "prev": "ฟื้นตัวช้า ๆ",
          "now": "$6.26B (+59% YoY) กำไรจากการดำเนินงาน $2.47B",
          "direction": "positive"
        },
        {
          "metric": "GAAP gross margin",
          "prev": "27.5% (ไตรมาสเดียวกันปีก่อน)",
          "now": "40.4% — ขยับ 13 จุดในปีเดียว",
          "direction": "positive"
        },
        {
          "metric": "กำไร/ขาดทุนตามบัญชี",
          "prev": "ขาดทุนจากการดำเนินงาน $3.18B (ปีก่อน)",
          "now": "กำไรจากการดำเนินงาน $1.80B แต่ขาดทุนสุทธิ $11.03B จากการตีมูลค่าหุ้น escrow $12.5B ที่ไม่ใช่เงินสด",
          "direction": "neutral"
        },
        {
          "metric": "งบลงทุนปี 2026",
          "prev": "ต่ำกว่า $20B",
          "now": "ยกขึ้นเป็นเกิน $20B ตามสัญญาณความต้องการของลูกค้า",
          "direction": "neutral"
        },
        {
          "metric": "ราคาหุ้น",
          "prev": "$100 ก่อนประกาศงบ (23 ก.ค.)",
          "now": "~$103 — ร่วง 7.9% วันถัดมาเหลือ $92 แล้วลงต่อถึง $82 ก่อนฟื้น",
          "direction": "neutral"
        }
      ],
      "risks": [
        "Foundry ยังไม่มีลูกค้าภายนอกจริง — รายได้จากลูกค้านอกบริษัทอยู่แค่ ~$293M ต่อไตรมาส ขณะที่ segment นี้ขาดทุนจากการดำเนินงาน $2.09B ทุกไตรมาส นี่คือข้อเดียวที่ตัดสิน thesis ทั้งหมด ถ้า 14A ไม่ได้ลูกค้ารายใหญ่ที่ผูกพันจริง เงินที่ทุ่มลงโรงงานไปหลายหมื่นล้านจะไม่มีทางคืนทุน",
        "การเจือจางหุ้นรุนแรงและยังไม่จบ — จำนวนหุ้นเพิ่มจากราว 4,300 เป็น 5,104 ล้านหุ้นภายในสองปีจากการขายหุ้นให้รัฐบาล NVIDIA และ SoftBank และยังมีหุ้นในบัญชี escrow รอทยอยส่งมอบให้รัฐบาลอีก ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนต่อเนื่องแม้ธุรกิจจะฟื้น",
        "กำไร GAAP จะติดลบต่อไปตราบใดที่ราคาหุ้นขึ้น — เพราะต้องตีมูลค่าภาระหุ้น escrow ใหม่ทุกไตรมาส ยิ่งหุ้นขึ้นยิ่งขาดทุนทางบัญชีมาก (Q2 2026 คิดเป็น $12.5B) ทำให้ตัวเลข EPS ที่คนทั่วไปเห็นบิดเบือนจากผลการดำเนินงานจริงอย่างรุนแรง",
        "ราคาสะท้อนความสำเร็จไปล่วงหน้าแล้ว — ขึ้น ~188% ในเก้าเดือนและเทรดที่ ~68 เท่าของกำไร non-GAAP ที่ยังไม่เกิดจริง หากมีข่าวเลื่อนโหนด ลูกค้าถอนตัว หรือดีมานด์ชะลอ การปรับฐานจะรุนแรงกว่าพื้นฐานที่แย่ลงจริงมาก อย่างที่เห็นจากการร่วง 18% ภายในสี่วันหลังงบ Q2",
        "งบดุลหนัก หนี้สุทธิ ~$20.8B และกระแสเงินสดทั้งปียังไม่พิสูจน์ว่าเป็นบวก ขณะที่ capex ถูกยกขึ้นเกิน $20B — ไม่มีพื้นที่ให้พลาดถ้ารอบธุรกิจพลิก",
        "แข่งขันในสนาม AI แทบไม่มีที่ยืน — NVIDIA ครองทั้งชิปและระบบนิเวศซอฟต์แวร์ ส่วน AMD แย่งส่วนแบ่งซีพียูต่อเนื่อง การฟื้นตัวรอบนี้จึงพึ่งดีมานด์ซีพียูที่กลับมาเป็นหลัก ไม่ใช่การชนะในสนาม AI accelerator",
        "ความเสี่ยงเชิงการเมือง — รัฐบาลสหรัฐเป็นผู้ถือหุ้นรายใหญ่ ซึ่งช่วยเรื่องเงินทุนและนโยบาย แต่ก็แปลว่าการตัดสินใจทางธุรกิจอาจถูกกดดันด้วยเป้าหมายเชิงยุทธศาสตร์ของประเทศ และเปลี่ยนได้เมื่อรัฐบาลเปลี่ยน"
      ],
      "asOf": "2026-09",
      "nextEarnings": "2026-10",
      "history": {
        "epsBasis": "diluted GAAP (ปีบัญชี = ปีปฏิทิน แต่จบวันเสาร์ตามรอบ 52/53 สัปดาห์ เช่น FY2025 จบ 27 ธ.ค. 2025)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 79.024,
            "epsAdj": 4.86,
            "opMarginPct": 27.9,
            "fcfB": 9.127,
            "priceFYEnd": 51.31
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 63.054,
            "epsAdj": 1.94,
            "opMarginPct": 6.2,
            "fcfB": -9.411,
            "priceFYEnd": 26.43
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 54.228,
            "epsAdj": 0.4,
            "opMarginPct": 0.1,
            "fcfB": -14.279,
            "priceFYEnd": 50.25
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 53.101,
            "epsAdj": -4.38,
            "opMarginPct": -2.7,
            "fcfB": -15.656,
            "priceFYEnd": 20.3
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 52.853,
            "epsAdj": -0.06,
            "opMarginPct": 1.8,
            "fcfB": -4.949,
            "priceFYEnd": 36.2
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 14.158,
            "epsAdj": 0.07,
            "opMarginPct": 8.1,
            "fcfB": 0.071,
            "priceQEnd": 35.55
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-30",
            "revenueB": 15.406,
            "epsAdj": 0.62,
            "opMarginPct": 10.5,
            "fcfB": -2.072,
            "priceQEnd": 50.25
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-30",
            "revenueB": 12.724,
            "epsAdj": -0.09,
            "opMarginPct": -3.9,
            "fcfB": -7.193,
            "priceQEnd": 44.17
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-29",
            "revenueB": 12.833,
            "epsAdj": -0.38,
            "opMarginPct": -8,
            "fcfB": -3.39,
            "priceQEnd": 30.97
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-28",
            "revenueB": 13.284,
            "epsAdj": -3.88,
            "opMarginPct": -2.9,
            "fcfB": -2.404,
            "priceQEnd": 23.91,
            "epsNote": "ขาดทุน $3.88/หุ้น ขณะที่ขาดทุนจากการดำเนินงานเพียง ~$0.39B — ส่วนต่างมหาศาลมาจากการตั้งด้อยค่าและปรับโครงสร้างครั้งใหญ่ในไตรมาสนั้น ไม่ใช่ผลการดำเนินงานปกติ ห้ามนำไปเทียบกับไตรมาสอื่นตรง ๆ"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-28",
            "revenueB": 14.26,
            "epsAdj": -0.03,
            "opMarginPct": 5.1,
            "fcfB": -2.669,
            "priceQEnd": 20.3
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-29",
            "revenueB": 12.667,
            "epsAdj": -0.19,
            "opMarginPct": -1.2,
            "fcfB": -4.37,
            "priceQEnd": 22.71
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-28",
            "revenueB": 12.859,
            "epsAdj": -0.67,
            "opMarginPct": -3.8,
            "fcfB": -1.5,
            "priceQEnd": 22.69
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-27",
            "revenueB": 13.653,
            "epsAdj": 0.9,
            "opMarginPct": 6.3,
            "fcfB": 0.121,
            "priceQEnd": 35.5
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-27",
            "revenueB": 13.674,
            "epsAdj": -0.12,
            "opMarginPct": 5.1,
            "fcfB": 0.8,
            "priceQEnd": 36.2
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-28",
            "revenueB": 13.577,
            "epsAdj": -0.73,
            "opMarginPct": 6.9,
            "fcfB": -2.54,
            "priceQEnd": 43.13,
            "epsNote": "กำไรจากการดำเนินงานเป็นบวก $0.93B แต่ EPS ยังติดลบ — ส่วนต่างมาจากรายการนอกการดำเนินงาน ซึ่ง KB รอบนี้ยังไม่ได้ยืนยันรายละเอียดของไตรมาสนี้"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-27",
            "revenueB": 16.128,
            "epsAdj": -2.16,
            "opMarginPct": 12.2,
            "fcfB": 4.45,
            "priceQEnd": 128.32,
            "epsNote": "GAAP −$2.16 แต่ non-GAAP +$0.42 และกำไรจากการดำเนินงาน +$1.80B — ขาดทุนทั้งหมดมาจากรายการเดียวที่ไม่ใช่เงินสด: การตีมูลค่าหุ้นที่วางไว้ในบัญชี escrow ให้กระทรวงพาณิชย์สหรัฐตามข้อตกลง CHIPS Act เป็นเงิน $12.53B เพราะราคาหุ้นขึ้นแรง · ตัดรายการนี้ออกแล้วกำไรสุทธิเป็นบวกราว $1.5B (~+$0.29/หุ้น)"
          }
        ],
        "notes": "ปีบัญชีของ Intel ตรงกับปีปฏิทินแต่จบวันเสาร์ตามรอบ 52/53 สัปดาห์ (FY2021 จบ 25 ธ.ค. 2021 · FY2022 จบ 31 ธ.ค. 2022 · FY2023 จบ 30 ธ.ค. 2023 · FY2024 จบ 28 ธ.ค. 2024 · FY2025 จบ 27 ธ.ค. 2025) · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งสำหรับ Intel บิดเบือนจากผลการดำเนินงานจริงมากเป็นพิเศษ — ดู epsNote ของ Q3'24, Q1'26 และ Q2'26 ก่อนเทียบข้ามไตรมาสทุกครั้ง · operating margin ในตารางมาจากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบกันได้ ซึ่งต่างจากตัวเลขที่บริษัทรายงานเองเล็กน้อย (Q2 2026: ตาราง 12.2% vs บริษัทรายงาน 11.1%) · FCF คิดแบบ OCF ลบ capex ทั้งชุด — ตรวจสอบแล้วกับตัวเลขของบริษัทเองใน Q2 2026 (OCF $7.01B − capex $2.65B = $4.35B ใกล้เคียง $4.45B ในตาราง) · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://www.intc.com/news-events/press-releases/detail/1776/intel-reports-second-quarter-2026-financial-results",
          "https://www.sec.gov/Archives/edgar/data/0000050863/000005086326000157/intc-20260627.htm",
          "https://stockanalysis.com/stocks/intc/financials/",
          "https://stockanalysis.com/stocks/intc/forecast/",
          "https://query1.finance.yahoo.com/v8/finance/chart/INTC (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-09",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 1.51,
            "revenue": 63
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "$13.8-14.8B",
            "actual": "$16.13B",
            "result": "beat",
            "magnitudePct": 12.8
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "$11.7-12.7B",
            "actual": "$13.58B",
            "result": "beat",
            "magnitudePct": 11.3
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "$12.8-13.8B",
            "actual": "$13.67B",
            "result": "beat",
            "magnitudePct": 2.8
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 63,
            "eps": 1.51,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "Intel ให้ guidance รายได้เป็นช่วงกว้าง $1B ทุกไตรมาส และสามไตรมาสที่ยืนยันตัวเลขได้ทะลุจุดกึ่งกลางทุกครั้งโดยขนาดกำลังเร่งขึ้น (2.8% → 11.3% → 12.8%) — แหล่งข่าวระบุว่าเป็นการทะลุเป้าติดต่อกันถึง 7 ไตรมาส แต่ KB เก็บเฉพาะไตรมาสที่หาเลข guidance ต้นทางมายืนยันได้จริง · guide Q3 2026 = รายได้ $15.8-16.8B พร้อม GAAP EPS $0.31 และ non-GAAP $0.38 ซึ่งแปลว่าบริษัทคาดว่ารายได้จะทรงตัว ไม่ได้เร่งต่อจาก Q2 · consensus FY2026 = รายได้ $63.0B / EPS $1.51 บนฐาน non-GAAP (41 นักวิเคราะห์ · ยืนยันฐานจาก stockanalysis.com) ซึ่งเป็นคนละฐานกับ EPS ในตารางประวัติที่เป็น GAAP และสำหรับ Intel ช่องว่างสองฐานนี้กว้างผิดปกติเพราะรายการตีมูลค่าหุ้น escrow · ยังไม่ใส่ consensus FY2027 เพราะหาตัวเลข aggregate แบบเปิดเผยฟรีไม่ได้ในรอบนี้ — ห้ามเดา"
      }
    },
    "DASH": {
      "ticker": "DASH",
      "name": "DoorDash, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "DoorDash คือเครือข่ายส่งของถึงบ้านที่ชนะสงครามราคาในสหรัฐไปแล้ว และกำลังใช้ตำแหน่งนั้นแปลงตัวเองจาก 'แอปสั่งอาหาร' เป็นโครงสร้างพื้นฐานการส่งของทุกประเภท — ร้านอาหาร ของชำ ค้าปลีก — พร้อมต่อยอดเป็นธุรกิจกำไรสูงอย่างโฆษณาและค่าสมาชิก DashPass ที่แทบไม่มีต้นทุนเพิ่ม · การซื้อ Deliveroo ปิดดีลเมื่อ ต.ค. 2025 ทำให้กลายเป็นผู้เล่นระดับโลกจริง ๆ · แต่จุดที่ต้องจับตาคือกำไรตามบัญชีกลับ *ลดลง* ทั้งที่รายได้โต 36% เพราะบริษัทเลือกเอากำไรไปลงทุนต่อทั้งการรวมกิจการ การขยายหมวดใหม่ และเทคโนโลยีส่งของอัตโนมัติ",
        "pillars": [
          "ครองตลาดส่งอาหารสหรัฐชัดเจน — รายได้ Q2 2026 โต 36% เป็น $4.45B บน Marketplace GOV $33.1B และคำสั่งซื้อ 970 ล้านครั้ง (+27%)",
          "กำไรตามเกณฑ์ที่บริษัทใช้วัดโตเร็วกว่ารายได้ — Adjusted EBITDA $914M (+40% YoY) และทะลุกรอบบนของเป้าตัวเอง หนุนจากหน่วยเศรษฐกิจของโฆษณาที่ดีขึ้น",
          "Deliveroo ทำให้เป็นผู้เล่นระดับโลกจริง — ปิดดีล 2 ต.ค. 2025 มูลค่า ~$3.72B ตอนนี้รายได้ต่างประเทศคิดเป็น ~22% และ Wolt กับ Deliveroo ทำกำไรเกินเป้าที่ตั้งไว้",
          "เครื่องยนต์กำไรชั้นสองกำลังติด — โฆษณาสำหรับร้านค้า ค่าสมาชิก DashPass (ยอดสมาชิกจ่ายเงินในสหรัฐเพิ่มในไตรมาสเดียวมากกว่า 24 เดือนก่อนหน้ารวมกัน) และ SevenRooms ที่ร้านเซ็นใหม่โตกว่า 100% YoY",
          "กระแสเงินสดแข็งแรงและงบดุลสะอาด — FCF $742M ในไตรมาสเดียว เงินสดและเงินลงทุน ~$6.2B เทียบหนี้ ~$3.3B ซึ่งเกือบทั้งหมดเป็นหุ้นกู้แปลงสภาพดอกเบี้ย 0%"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+36% YoY (Q2 2026 — $4.45B) · ไม่รวม Deliveroo โต ~23% · guide Q3 GOV $33.0-34.0B",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "โตเร็วและเร่งขึ้นจาก +33% ในไตรมาสก่อน โดยคำสั่งซื้อเพิ่ม 27% เป็น 970 ล้านครั้ง · ต้องแยกให้ออกว่าส่วนที่มาจากการซื้อ Deliveroo คิดเป็นราว 13 จุดจาก 36 จุด ธุรกิจเดิมโตราว 23% ซึ่งยังเร็วมากสำหรับธุรกิจที่ใหญ่ขนาดนี้ แต่ไม่ใช่ 36% อย่างที่พาดหัว"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2 2026: GAAP EPS $0.46 — ลดลงจาก $0.65 เมื่อปีก่อน · กำไรสุทธิ $200M (−30% YoY)",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "นี่คือความย้อนแย้งของไตรมาสนี้ — รายได้โต 36% และ Adjusted EBITDA โต 40% แต่กำไรตามบัญชีกลับหดลง 30% · ส่วนต่างอยู่ในรายการที่ Adjusted EBITDA ตัดออกไป คือค่าหุ้นพนักงาน (ปีนี้บริษัทคาดไว้ $1.2-1.3B) ค่าตัดจำหน่ายจากดีล Deliveroo และค่าใช้จ่ายรวมกิจการ · แปลว่าคนที่ดูแต่ตัวเลข Adjusted จะเห็นภาพดีกว่าความจริงที่ผู้ถือหุ้นได้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 2026 = $742M (จาก $355M ปีก่อน) · OCF $944M · ทั้งปี FY2025 อยู่ที่ $2.17B",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "จุดแข็งที่สุดของงบ — โมเดลตลาดกลางแทบไม่ต้องลงทุนสินทรัพย์หนัก และเก็บเงินจากผู้บริโภคก่อนจ่ายร้านค้ากับคนส่ง ทำให้เงินสดเข้าเร็วกว่ากำไรบัญชีมาก · เพิ่มขึ้นกว่าเท่าตัวจากปีก่อนแม้จะอยู่ระหว่างรวมกิจการ Deliveroo"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin 3.9% (ลดจาก 5.6% ปีก่อน) · Adjusted EBITDA $914M = ~2.8% ของ GOV (+40% YoY)",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "อ่านได้สองทางและต้องอ่านทั้งสอง — ตามเกณฑ์ที่บริษัทใช้ กำไรโต 40% และทะลุเป้าตัวเอง แต่ตามบัญชีจริง อัตรากำไรจากการดำเนินงานหดจาก 5.6% เหลือ 3.9% เพราะค่าใช้จ่ายโตเร็วกว่ารายได้จากการรวมกิจการและการลงทุนในเทคโนโลยีส่งของอัตโนมัติ · บริษัทเตือนเองว่า Q4 อัตรากำไรจะลดลงตามฤดูกาล"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ปรับดีขึ้นต่อเนื่องจากที่เคยติดลบ แต่ยังถูกกดด้วย goodwill ก้อนใหญ่จากดีล Deliveroo (~$3.72B)",
          "trend": "up",
          "score": 50,
          "impact": "neutral",
          "why": "ธุรกิจหลักแทบไม่ต้องใช้เงินลงทุน ผลตอบแทนต่อทุนที่ใช้จริงจึงสูง แต่ตัวเลขทางบัญชีถูกเจือจางด้วยสินทรัพย์ไม่มีตัวตนจากการซื้อกิจการสองดีลใหญ่ · ยังพิสูจน์ไม่ได้ว่าเงินที่จ่ายซื้อ Deliveroo จะคืนทุน ต้องดูอีกหลายไตรมาส"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุน ~$6.2B (30 มิ.ย. 2026) — เงินสด $4.42B + ระยะสั้น $0.92B + ระยะยาว $0.87B",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "หนาพอจ่ายดีล Deliveroo ด้วยเงินสดทั้งก้อนแล้วยังเหลือ และยังสร้างเงินสดเพิ่มทุกไตรมาส · ให้พื้นที่ทั้งซื้อกิจการต่อและซื้อหุ้นคืนโดยไม่ต้องกู้"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้รวม ~$3.3B — เกือบทั้งหมดเป็นหุ้นกู้แปลงสภาพดอกเบี้ย 0% ครบกำหนดปี 2030 (~$2.72B) · เงินสดสุทธิ ~$2.9B",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "งบดุลยังเป็นเงินสดสุทธิและต้นทุนดอกเบี้ยเป็นศูนย์ จึงไม่ใช่ความเสี่ยงทางการเงิน · ข้อควรจำคือหุ้นกู้แปลงสภาพคือการเจือจางที่รอเกิดถ้าราคาหุ้นขึ้นถึงระดับแปลง เป็นภาระต่อผู้ถือหุ้นในรูปหุ้น ไม่ใช่ในรูปเงิน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 439 ล้านหุ้น · ค่าหุ้นพนักงานปี 2026 คาดไว้ $1.2-1.3B · ซื้อหุ้นคืนแล้ว ~$1.0B จากวงเงินที่อนุมัติ $5.0B",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ค่าหุ้นพนักงานยังสูงราว 1.4% ของมูลค่าตลาดต่อปี ซึ่งเป็นต้นทุนจริงที่ตัวเลข Adjusted EBITDA ไม่นับ · ต่างจากบริษัทเติบโตหลายแห่งตรงที่มีโครงการซื้อหุ้นคืน $5.0B มาชดเชยบ้างแล้ว แต่ทำไปเพียง ~$1.0B จึงยังหักล้างได้ไม่เต็ม"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ซื้อ Deliveroo ~$3.72B (ปิดดีล ต.ค. 2025) + SevenRooms · ซื้อหุ้นคืน ~$1.0B จากวงเงิน $5.0B · ไม่มีปันผล",
          "trend": "up",
          "score": 62,
          "impact": "neutral",
          "why": "ใช้เงินสดที่หามาได้ไปซื้อการเข้าถึงตลาดต่างประเทศแทนการสร้างเองซึ่งเร็วกว่ามาก และเริ่มคืนทุนผู้ถือหุ้นผ่านการซื้อหุ้นคืนแล้ว · แต่ดีล Deliveroo เป็นเงินก้อนใหญ่เทียบกำไรที่ทำได้ และยังเร็วเกินจะตัดสินว่าคุ้ม — สิ่งที่เห็นตอนนี้คือกำไรบัญชีถูกกดลงจากค่าตัดจำหน่ายของดีลนี้"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$202 · mcap ~$89B · forward P/E ~35x จาก consensus non-GAAP FY2026 $5.79 · P/E ตามบัญชีจริง ~106x · ราคาลดลง ~13% ตั้งแต่ต้นปี",
          "trend": "up",
          "score": 45,
          "impact": "neutral",
          "why": "ยังไม่ถูก แต่เหตุผลรองรับดีขึ้นกว่าต้นปี — ราคาลงมา 13% ขณะที่รายได้และกระแสเงินสดโตต่อ ทำให้ multiple หดลงเอง · ช่องว่างระหว่าง 35 เท่า (ฐาน non-GAAP) กับ 106 เท่า (ฐานบัญชีจริง) กว้างมาก ซึ่งสะท้อนว่าค่าหุ้นพนักงานและค่าตัดจำหน่ายที่ถูกตัดออกไปเป็นเงินก้อนใหญ่จริง · เป้าเฉลี่ยนักวิเคราะห์ $254 สูงกว่าราคาปัจจุบัน ~26%"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 80,
        "recurringPct": 55,
        "note": "คุณภาพรายได้ดีขึ้นชัดในเชิงโครงสร้าง — รายได้มาจากคำสั่งซื้อจำนวนมหาศาลที่เกิดซ้ำทุกสัปดาห์ ไม่ได้พึ่งลูกค้ารายใหญ่ไม่กี่ราย และ Net Revenue Margin อยู่ที่ 13.5% ของ GOV ซึ่งขยับขึ้นต่อเนื่องจากโฆษณาและค่าสมาชิกที่มีอัตรากำไรสูงกว่าค่าส่งปกติ · ตัวเลขการเติบโต 36% ต้องอ่านอย่างระวัง เพราะราว 13 จุดมาจากการรวมงบ Deliveroo เข้ามา ธุรกิจเดิมโตราว 23% · ตัวเลข segment ด้านล่างเป็นการแบ่งตามภูมิภาคซึ่งเป็นชุดเดียวที่บริษัทเปิดเผยใน 10-Q — DoorDash รายงานเป็น segment เดียวและไม่ได้แยกรายได้ตามหมวด (ร้านอาหาร/ของชำ/ค้าปลีก) หรือตามประเภท (ค่าส่ง/โฆษณา/ค่าสมาชิก) ออกมาเป็นตัวเลข",
        "segments": [
          {
            "name": "สหรัฐอเมริกา",
            "sharePct": 78,
            "growthNote": "ตลาดหลักที่ครองส่วนแบ่งเป็นอันดับหนึ่ง — เป็นแหล่งที่มาของกำไรเกือบทั้งหมดและเป็นที่ที่ธุรกิจโฆษณากับ DashPass เติบโตเร็วที่สุด",
            "trend": "up"
          },
          {
            "name": "ต่างประเทศ (Wolt · Deliveroo)",
            "sharePct": 22,
            "growthNote": "สัดส่วนเพิ่มขึ้นก้าวกระโดดหลังปิดดีล Deliveroo เมื่อ ต.ค. 2025 · ทั้ง Wolt และ Deliveroo ทำกำไรได้เกินเป้าที่บริษัทตั้งไว้ในไตรมาสนี้",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 52,
        "items": [
          {
            "item": "ใช้ AI เพิ่มรายได้โฆษณาให้ร้านค้า",
            "status": "executing",
            "evidence": "บริษัทระบุว่าหน่วยเศรษฐกิจที่ดีขึ้นของธุรกิจโฆษณาเป็นหนึ่งในเหตุผลที่ Adjusted EBITDA ทะลุกรอบบนของเป้า — เป็นรายได้ที่แทบไม่มีต้นทุนเพิ่มและไหลลงกำไรเกือบเต็มจำนวน"
          },
          {
            "item": "ลงทุนในการส่งของอัตโนมัติ (autonomy)",
            "status": "on-track",
            "evidence": "บริษัทระบุเองว่าอัตรากำไรครึ่งปีหลังจะถูกกดบางส่วนจากการลงทุนในแพลตฟอร์มเทคโนโลยีและงานด้านระบบอัตโนมัติ — เป็นการลงทุนระยะยาวที่ยังไม่มีตัวเลขรายได้หรือต้นทุนที่ประหยัดได้ให้วัด"
          },
          {
            "item": "ระบบสั่งอาหารและจัดการร้านผ่าน SevenRooms",
            "status": "executing",
            "evidence": "ร้านที่เซ็นสัญญาใหม่โตกว่า 100% YoY และระบบสั่งอาหารดิจิทัลมีร้านค้าใช้งานกว่า 150,000 ราย — ขยายจากการส่งของไปเป็นซอฟต์แวร์ที่ร้านใช้ทุกวัน"
          },
          {
            "item": "รวม Deliveroo เข้าระบบเทคโนโลยีเดียวกัน",
            "status": "executing",
            "evidence": "หลังปิดดีล ต.ค. 2025 บริษัทรายงานว่า Deliveroo เร่งการเติบโตของผู้ใช้และคำสั่งซื้อได้ พร้อมทำกำไรเกินเป้าที่ตั้งไว้ตอนเข้าไตรมาส"
          },
          {
            "item": "สถานะในคลื่น AI โดยรวม",
            "status": "at-risk",
            "evidence": "DoorDash ไม่ใช่ผู้ได้ประโยชน์โดยตรงจากคลื่น AI แบบบริษัทชิปหรือคลาวด์ — AI ที่ใช้เป็นเครื่องมือเพิ่มประสิทธิภาพภายใน ไม่ใช่สินค้าที่ขายได้ · ในทางกลับกัน ถ้าเทคโนโลยีขับเคลื่อนอัตโนมัติมาถึงจริงก่อนที่บริษัทจะพร้อม โครงสร้างต้นทุนคนส่งที่เป็นข้อได้เปรียบวันนี้อาจกลายเป็นภาระ"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองมาจากวงจรที่ป้อนตัวเอง — ผู้ใช้เยอะดึงร้านค้าเข้ามา ร้านเยอะดึงผู้ใช้เพิ่ม และความหนาแน่นของคำสั่งซื้อในแต่ละพื้นที่ทำให้ต้นทุนต่อการส่งถูกลงจนคู่แข่งที่เล็กกว่าตามไม่ทัน · ชั้นที่สองคือ DashPass ที่เปลี่ยนผู้ใช้จร ๆ เป็นสมาชิกรายเดือนซึ่งสั่งบ่อยขึ้นและเปรียบเทียบราคาน้อยลง · จุดอ่อนคือทั้งผู้บริโภคและร้านค้าติดตั้งหลายแอปพร้อมกันได้ฟรี ความภักดีจึงมาจากความเคยชินและความคุ้มค่า ไม่ใช่สัญญาผูกมัด",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ครองส่วนแบ่งส่งอาหารสหรัฐเป็นอันดับหนึ่งชัดเจน และหลังซื้อ Deliveroo ก็ขึ้นเป็นผู้เล่นระดับโลกที่มีขนาดจริงในยุโรปและเอเชีย"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "ระบบจัดเส้นทางและจับคู่คนส่งทำได้ดีจนเป็นข้อได้เปรียบด้านต้นทุน แต่ไม่ใช่เทคโนโลยีที่คู่แข่งเลียนแบบไม่ได้ — ความได้เปรียบมาจากขนาดข้อมูลมากกว่าตัวอัลกอริทึม"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "Adjusted EBITDA ทะลุกรอบบนของเป้าตัวเองในไตรมาสล่าสุด และรวมกิจการ Deliveroo ได้เร็วจนทำกำไรเกินเป้าภายในไม่กี่ไตรมาสหลังปิดดีล"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "stable",
            "note": "ต่ำโดยธรรมชาติ — ผู้ใช้ลงหลายแอปพร้อมกันได้ฟรี · สิ่งเดียวที่สร้างต้นทุนการย้ายจริงคือค่าสมาชิก DashPass ที่จ่ายล่วงหน้าไปแล้ว"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "strengthening",
            "note": "ขยายจากส่งอาหารไปของชำ ค้าปลีก ซอฟต์แวร์จัดการร้าน (SevenRooms) และบริการส่งให้แบรนด์อื่นใช้ — ยิ่งร้านใช้หลายบริการยิ่งถอนตัวยาก"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "stable",
            "note": "ไม่ใช่มิติที่เกี่ยวข้องกับธุรกิจนี้โดยตรง — สิ่งที่เทียบเคียงได้คือการที่ร้านค้ากว่า 150,000 รายใช้ระบบสั่งอาหารดิจิทัลของบริษัทเป็นช่องทางของตัวเอง"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "strengthening",
            "note": "สมาชิก DashPass ที่จ่ายเงินในสหรัฐเพิ่มขึ้นในไตรมาสเดียวมากกว่า 24 เดือนก่อนหน้ารวมกัน — สมาชิกสั่งบ่อยกว่าและเทียบราคากับเจ้าอื่นน้อยกว่าผู้ใช้ทั่วไปมาก"
          },
          {
            "key": "moat",
            "label": "ความแข็งแรงของคูเมืองโดยรวม",
            "status": "strengthening",
            "note": "แข็งขึ้นจากความหนาแน่นของคำสั่งซื้อที่มากขึ้น ฐานสมาชิกที่โตเร็ว และขนาดระดับโลกหลังดีล Deliveroo · แต่ยังเป็นคูเมืองเชิงขนาดและความเคยชิน ไม่ใช่เชิงเทคโนโลยีที่ลอกไม่ได้"
          }
        ]
      },
      "capitalAllocation": {
        "score": 62,
        "verdict": "ใช้เงินสดที่ธุรกิจหามาได้ไปซื้อการเข้าถึงตลาดต่างประเทศแทนการสร้างเอง ซึ่งเร็วกว่าและได้ขนาดทันที พร้อมเริ่มคืนทุนผู้ถือหุ้นผ่านการซื้อหุ้นคืน · แต่ดีล Deliveroo เป็นเงินก้อนใหญ่เทียบกำไรที่ทำได้จริง และผลกระทบที่เห็นชัดที่สุดตอนนี้คือกำไรตามบัญชีถูกกดลงจากค่าตัดจำหน่าย ยังเร็วเกินจะตัดสินว่าคุ้ม",
        "items": [
          {
            "label": "ซื้อกิจการ Deliveroo",
            "current": "~$3.72B ปิดดีล 2 ต.ค. 2025 (180 เพนซ์/หุ้น เป็นเงินสด)",
            "assessment": "neutral",
            "why": "ได้ขนาดในอังกฤษ ยุโรป และเอเชียทันที และรายงานว่าทำกำไรเกินเป้าเร็วกว่าคาด · แต่เป็นเงินก้อนใหญ่และค่าตัดจำหน่ายจากดีลคือสาเหตุหลักที่กำไรบัญชีหดลง 30% ทั้งที่รายได้โต — ต้องดูอีกหลายไตรมาสจึงตัดสินได้"
          },
          {
            "label": "ซื้อกิจการ SevenRooms",
            "current": "ซื้อเข้ามาเสริมฝั่งซอฟต์แวร์จัดการร้าน",
            "assessment": "good",
            "why": "ร้านที่เซ็นใหม่โตกว่า 100% YoY — เป็นการซื้อเทคโนโลยีมาขายผ่านฐานร้านค้าเดิมที่มีอยู่แล้ว ความเสี่ยงต่ำและต่อยอดได้ทันที"
          },
          {
            "label": "ซื้อหุ้นคืน",
            "current": "อนุมัติวงเงิน $5.0B (ก.พ. 2025) ทำไปแล้ว ~$1.0B ณ 30 มิ.ย. 2026",
            "assessment": "good",
            "why": "หายากที่บริษัทเติบโตเร็วจะเริ่มคืนทุนตั้งแต่ตอนนี้ ช่วยหักล้างการเจือจางจากค่าหุ้นพนักงานได้บางส่วน · แต่ทำไปเพียงหนึ่งในห้าของวงเงิน จึงยังชดเชยได้ไม่เต็ม"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี",
            "assessment": "good",
            "why": "ถูกต้องสำหรับบริษัทที่ยังขยายตลาดและมีที่ให้ลงทุนผลตอบแทนสูงกว่าการจ่ายเงินคืน"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและเงินลงทุน ~$6.2B · หนี้ ~$3.3B (หุ้นกู้แปลงสภาพ 0% ปี 2030) → เงินสดสุทธิ ~$2.9B",
            "assessment": "good",
            "why": "จ่ายดีลใหญ่ด้วยเงินสดแล้วยังเหลือกันชนหนา และต้นทุนดอกเบี้ยเป็นศูนย์ — ให้พื้นที่ทั้งลงทุนต่อและซื้อหุ้นคืนโดยไม่ต้องกู้"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "forward P/E ~35x จาก consensus non-GAAP FY2026 EPS $5.79 (43 นักวิเคราะห์ · รายได้ $17.82B) แต่ถ้าวัดด้วยกำไรตามบัญชีจริงจะอยู่ที่ ~106x — ช่องว่างที่กว้างมากนี้คือค่าหุ้นพนักงานและค่าตัดจำหน่ายจากดีล Deliveroo ที่ถูกตัดออกจากตัวเลข Adjusted · ราคา ~$202, mcap ~$89B (11 ก.ย. 2026) ลดลง ~13% ตั้งแต่ต้นปีจาก $226 โดยเคยลงไปต่ำสุด $147 เมื่อ มี.ค. และขึ้นสูงสุด $237 เมื่อ ส.ค. · หลังประกาศงบ Q2 ราคาปิดบวก ~2.9% ในวันถัดมา ซึ่งต่างจากไตรมาสก่อน ๆ ที่ตลาดกังวลเรื่องการลงทุนเพิ่ม · เป้าเฉลี่ยนักวิเคราะห์ $254 สูงกว่าราคาปัจจุบัน ~26%"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "$4.04B (+33% YoY)",
          "now": "$4.45B (+36% YoY) — ไม่รวม Deliveroo โตราว 23%",
          "direction": "positive"
        },
        {
          "metric": "Adjusted EBITDA",
          "prev": "$754M (Q1 2026)",
          "now": "$914M (+40% YoY) — ทะลุกรอบบนของเป้าตัวเอง",
          "direction": "positive"
        },
        {
          "metric": "กำไรตามบัญชี",
          "prev": "กำไรสุทธิ $286M · EPS $0.65 (Q2 2025)",
          "now": "กำไรสุทธิ $200M (−30% YoY) · EPS $0.46 — อัตรากำไรจากการดำเนินงานหดจาก 5.6% เหลือ 3.9%",
          "direction": "negative"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "$355M (Q2 2025)",
          "now": "$742M — เพิ่มกว่าเท่าตัว",
          "direction": "positive"
        },
        {
          "metric": "สมาชิก DashPass ในสหรัฐ",
          "prev": "เพิ่มขึ้นเรื่อย ๆ",
          "now": "เพิ่มในไตรมาสเดียวมากกว่า 24 เดือนก่อนหน้ารวมกัน",
          "direction": "positive"
        },
        {
          "metric": "guidance Q3 2026",
          "prev": "—",
          "now": "Marketplace GOV $33.0-34.0B · Adjusted EBITDA $950M-1,100M — แต่เตือนว่า Q4 อัตรากำไรจะลดตามฤดูกาล",
          "direction": "neutral"
        }
      ],
      "risks": [
        "กำไรตามบัญชีสวนทางกับตัวเลขที่บริษัทใช้วัด — Adjusted EBITDA โต 40% แต่กำไรสุทธิหด 30% ส่วนต่างคือค่าหุ้นพนักงาน ($1.2-1.3B ต่อปี) และค่าตัดจำหน่ายจากดีล Deliveroo ซึ่งเป็นต้นทุนจริงของผู้ถือหุ้น คนที่ดูแต่ตัวเลข Adjusted จะประเมินกำไรสูงเกินจริงอย่างมีนัย",
        "ต้นทุนการย้ายของผู้ใช้ต่ำโดยธรรมชาติ — ทั้งผู้บริโภคและร้านค้าลงหลายแอปพร้อมกันได้ฟรี ความได้เปรียบจึงมาจากขนาดและความเคยชิน ไม่ใช่สัญญาผูกมัด ถ้าคู่แข่งยอมขาดทุนอุดหนุนราคาอีกรอบ ส่วนแบ่งเปลี่ยนได้เร็วกว่าที่คิด",
        "ความเสี่ยงด้านกฎหมายแรงงาน — โมเดลทั้งหมดตั้งอยู่บนการที่คนส่งเป็นผู้รับจ้างอิสระ ไม่ใช่พนักงาน หากกฎหมายในตลาดใหญ่เปลี่ยนให้ต้องจ้างเป็นพนักงาน โครงสร้างต้นทุนจะเปลี่ยนทั้งระบบ และความเสี่ยงนี้เพิ่มขึ้นเมื่อขยายเข้ายุโรปผ่าน Deliveroo ซึ่งกฎหมายแรงงานเข้มกว่าสหรัฐ",
        "ดีล Deliveroo ยังพิสูจน์ไม่ได้ว่าคุ้ม — จ่ายไป ~$3.72B และสิ่งที่เห็นชัดที่สุดตอนนี้คือกำไรบัญชีที่ถูกกดลง หากการรวมกิจการไม่ให้ผลตามที่คาดหรือตลาดยุโรปแข่งขันรุนแรงกว่าที่ประเมิน จะเป็นการใช้เงินสดก้อนใหญ่ที่ไม่คืนทุน",
        "อ่อนไหวต่อกำลังซื้อผู้บริโภค — การสั่งอาหารส่งถึงบ้านเป็นค่าใช้จ่ายที่ตัดได้ก่อนเมื่อเศรษฐกิจชะลอ ต่างจากสินค้าจำเป็น และบริษัทเตือนเองว่าอัตรากำไร Q4 จะถูกกดจากต้นทุนคนส่งและค่าประกันตามฤดูกาล",
        "ไม่ใช่ผู้ได้ประโยชน์โดยตรงจากคลื่น AI — AI ที่ใช้เป็นเครื่องมือเพิ่มประสิทธิภาพภายใน ไม่ใช่สินค้าที่ขายได้ · และในระยะยาว ถ้ายานยนต์ขับเคลื่อนอัตโนมัติมาถึงก่อนที่บริษัทจะพร้อม เครือข่ายคนส่งที่เป็นข้อได้เปรียบวันนี้อาจกลายเป็นต้นทุนที่ปรับตัวยาก"
      ],
      "asOf": "2026-09",
      "nextEarnings": "2026-11",
      "history": {
        "epsBasis": "diluted GAAP (ปีบัญชี = ปีปฏิทิน สิ้นสุด 31 ธ.ค.)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 4.888,
            "epsAdj": -1.39,
            "opMarginPct": -9,
            "fcfB": 0.563,
            "priceFYEnd": 148.9
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 6.583,
            "epsAdj": -3.68,
            "opMarginPct": -14.6,
            "fcfB": 0.191,
            "priceFYEnd": 48.82
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 8.635,
            "epsAdj": -1.42,
            "opMarginPct": -6.7,
            "fcfB": 1.55,
            "priceFYEnd": 98.89
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 10.722,
            "epsAdj": 0.29,
            "opMarginPct": 0.5,
            "fcfB": 2.028,
            "priceFYEnd": 167.75
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 13.717,
            "epsAdj": 2.13,
            "opMarginPct": 6.1,
            "fcfB": 2.174,
            "priceFYEnd": 226.48
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 2.164,
            "epsAdj": -0.19,
            "opMarginPct": -5,
            "fcfB": 0.37,
            "priceQEnd": 79.47
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-31",
            "revenueB": 2.303,
            "epsAdj": -0.39,
            "opMarginPct": -3.9,
            "fcfB": 0.456,
            "priceQEnd": 98.89
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-31",
            "revenueB": 2.513,
            "epsAdj": -0.06,
            "opMarginPct": -2.4,
            "fcfB": 0.536,
            "priceQEnd": 137.72
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-30",
            "revenueB": 2.63,
            "epsAdj": -0.38,
            "opMarginPct": -4.4,
            "fcfB": 0.507,
            "priceQEnd": 108.78
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-30",
            "revenueB": 2.706,
            "epsAdj": 0.38,
            "opMarginPct": 4,
            "fcfB": 0.499,
            "priceQEnd": 142.73
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-31",
            "revenueB": 2.873,
            "epsAdj": 0.33,
            "opMarginPct": 4.3,
            "fcfB": 0.486,
            "priceQEnd": 167.75
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 3.032,
            "epsAdj": 0.44,
            "opMarginPct": 5.7,
            "fcfB": 0.561,
            "priceQEnd": 182.77
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-30",
            "revenueB": 3.284,
            "epsAdj": 0.65,
            "opMarginPct": 5.6,
            "fcfB": 0.438,
            "priceQEnd": 246.51
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 3.446,
            "epsAdj": 0.55,
            "opMarginPct": 8,
            "fcfB": 0.808,
            "priceQEnd": 271.99
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 3.955,
            "epsAdj": 0.48,
            "opMarginPct": 5.3,
            "fcfB": 0.367,
            "priceQEnd": 226.48
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 4.036,
            "epsAdj": 0.42,
            "opMarginPct": 5.3,
            "fcfB": 0.537,
            "priceQEnd": 150.15
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 4.454,
            "epsAdj": 0.46,
            "opMarginPct": 3.9,
            "fcfB": 0.883,
            "priceQEnd": 184.53,
            "epsNote": "EPS $0.46 ลดลงจาก $0.65 เมื่อปีก่อน ทั้งที่รายได้โต 36% และ Adjusted EBITDA โต 40% เป็น $914M — ส่วนต่างอยู่ในรายการที่ Adjusted EBITDA ตัดออก คือค่าหุ้นพนักงาน (ทั้งปี 2026 บริษัทคาด $1.2-1.3B) ค่าตัดจำหน่ายจากดีล Deliveroo และค่าใช้จ่ายรวมกิจการ · ไม่ใช่รายการพิเศษครั้งเดียว แต่เป็นต้นทุนต่อเนื่อง"
          }
        ],
        "notes": "ปีบัญชีของ DoorDash ตรงกับปีปฏิทินและทุกไตรมาสจบสิ้นเดือนปฏิทิน · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งต่ำกว่าตัวเลข Adjusted ที่บริษัทและนักวิเคราะห์ใช้มาก (consensus FY2026 non-GAAP อยู่ที่ $5.79 ขณะที่ GAAP ล่าสุดอยู่ราว $0.46 ต่อไตรมาส) เพราะ GAAP รวมค่าหุ้นพนักงานและค่าตัดจำหน่ายจากการซื้อกิจการไว้ด้วย — เทียบข้ามฐานไม่ได้ · FCF ในตารางคิดแบบ OCF ลบ capex จากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ ซึ่งสูงกว่าตัวเลข FCF ที่บริษัทรายงานเอง (Q2 2026: ตาราง $0.883B vs บริษัทรายงาน $0.742B) เพราะบริษัทหักรายการเพิ่มเติมด้วย · ตัวเลข Marketplace GOV ($33.1B ใน Q2 2026) ไม่ได้อยู่ในตารางนี้เพราะเป็นมูลค่าคำสั่งซื้อรวม ไม่ใช่รายได้ — รายได้ที่บริษัทรับรู้คิดเป็น 13.5% ของ GOV · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://ir.doordash.com/news/news-details/2026/DoorDash-Releases-Second-Quarter-2026-Financial-Results/default.aspx",
          "https://www.sec.gov/Archives/edgar/data/0001792789/000179278926000050/dash-20260630.htm",
          "https://stockanalysis.com/stocks/dash/financials/",
          "https://stockanalysis.com/stocks/dash/forecast/",
          "https://query1.finance.yahoo.com/v8/finance/chart/DASH (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-09",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 5.79,
            "revenue": 17.82
          }
        ],
        "guidanceTrack": [],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 17.82,
            "eps": 5.79,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "ตาราง guidanceTrack ว่างโดยตั้งใจ ไม่ใช่เพราะหาข้อมูลไม่ได้ — DoorDash ไม่ได้ให้ guidance เป็นรายได้หรือกำไรต่อหุ้น แต่ให้เป็น Marketplace GOV (มูลค่าคำสั่งซื้อรวม) และ Adjusted EBITDA ซึ่งไม่ตรงกับชนิดข้อมูลที่ตารางนี้รองรับ (revenue/eps/opex/capex/margin) การใส่ GOV ลงช่อง revenue จะทำให้หน้าเว็บแสดง 'revenue $33.1B' ขัดกับรายได้จริง $4.45B ในตารางประวัติ จึงเลือกไม่ใส่ · สถิติเท่าที่ยืนยันได้: Q2 2026 Adjusted EBITDA ออกมา $914M ทะลุกรอบบนของเป้าที่บริษัทให้ไว้ และบริษัทระบุเองว่า 'สูงกว่าที่คาดไว้มาก' · guide Q3 2026 = GOV $33.0-34.0B และ Adjusted EBITDA $950M-1,100M พร้อมเตือนว่าอัตรากำไรต่อ GOV จะเพิ่มใน Q3 แล้วลดลงใน Q4 ตามฤดูกาล (ต้นทุนคนส่งและค่าประกันสูงขึ้น บวกการลงทุนในเทคโนโลยีและระบบอัตโนมัติ) · consensus FY2026 = รายได้ $17.82B / EPS $5.79 บนฐาน non-GAAP (43 นักวิเคราะห์ · ยืนยันฐานจาก stockanalysis.com) ซึ่งเป็นคนละฐานกับ EPS ในตารางประวัติที่เป็น GAAP และช่องว่างสองฐานนี้กว้างเป็นพิเศษสำหรับ DASH · ยังไม่ใส่ consensus FY2027 เพราะหาตัวเลข aggregate แบบเปิดเผยฟรีไม่ได้ในรอบนี้ — ห้ามเดา"
      }
    },
    "ABNB": {
      "ticker": "ABNB",
      "name": "Airbnb, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "Airbnb คือตลาดกลางที่ชนะแล้วในหมวดที่พักแบบบ้านพักส่วนตัว — เจ้าของบ้านลงประกาศที่นี่เพราะมีนักท่องเที่ยวเยอะที่สุด และนักท่องเที่ยวมาที่นี่เพราะมีที่พักให้เลือกมากที่สุด วนกันไปจนคู่แข่งรายใหม่แทรกได้ยาก · โมเดลนี้แทบไม่ต้องลงทุนสินทรัพย์เลย บริษัทไม่ได้เป็นเจ้าของบ้านสักหลัง แต่เก็บค่าธรรมเนียมจากทุกการจอง ทำให้แปลงรายได้เป็นเงินสดได้ในอัตราสูงมาก (FCF ~38% ของรายได้) · จุดที่ต่างจากหุ้นเติบโตหลายตัวคือ Airbnb ใช้เงินสดก้อนนั้นซื้อหุ้นคืนจนจำนวนหุ้นลดลงจริงราว 10% ในสามปี และเพิ่งล้างหุ้นกู้แปลงสภาพออกจากงบดุลหมด — ความเจือจางที่เคยรออยู่จึงหายไป · สิ่งที่ต้องพิสูจน์ต่อคือการขยายออกนอกที่พัก (Experiences และ Services) ว่าจะกลายเป็นเครื่องยนต์ที่สองได้จริงหรือไม่",
        "pillars": [
          "ตลาดกลางที่ชนะแล้ว — Q2 2026 มูลค่าการจองรวม $27.2B (+16%) จากการจอง 148 ล้านคืน/ที่นั่ง (+10%) และรายได้ $3.61B (+17%)",
          "กระแสเงินสดระดับแนวหน้า — FCF $1.25B ในไตรมาสเดียว คิดเป็น 35% ของรายได้ และทั้งปี FY2025 อยู่ที่ $4.65B บนโมเดลที่ไม่ต้องเป็นเจ้าของสินทรัพย์เลย",
          "คืนทุนผู้ถือหุ้นจริง ไม่ใช่แค่พูด — ซื้อหุ้นคืน $1.07B ในไตรมาสเดียว เหลือวงเงินอีก $3.4B จาก $6.0B และจำนวนหุ้น diluted ลดจาก ~662 ล้านหุ้น (FY2023) เหลือ 597 ล้านหุ้น",
          "งบดุลสะอาดขึ้นกว่าเดิม — มี.ค. 2026 ออกหุ้นกู้ธรรมดา $2.5B ไปล้างหุ้นกู้แปลงสภาพ $2.0B ที่ครบกำหนด แปลว่าความเจือจางที่เคยรออยู่หายไป เหลือเงินสดและเงินลงทุน $12.1B เทียบหนี้ ~$2.5B",
          "การเติบโตกลับมาเร่ง — จาก +10% ใน FY2025 เป็น ~+17% ในปี 2026 และบริษัทยกเป้าทั้งปีขึ้นเป็นโตอย่างน้อยระดับกลาง ๆ ของเลขสองหลัก พร้อมอัตรากำไร EBITDA อย่างน้อย 35.5%"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+17% YoY (Q2 2026 — $3.61B) · guide Q3 $4.69-4.77B = +15-17% · ยกเป้าทั้งปีขึ้นเป็นโตอย่างน้อยระดับกลางของเลขสองหลัก",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "กลับมาเร่งขึ้นชัดจาก +10% ใน FY2025 — และเป็นการเร่งที่มาจากการจองที่เพิ่มขึ้นจริง (คืน/ที่นั่งที่จอง +10%) ไม่ใช่แค่ราคาต่อคืนที่สูงขึ้น · การจองผ่านแอปโต 23% และผู้ใช้ครั้งแรกเพิ่ม 11% ซึ่งสูงสุดในรอบสี่ปี บ่งชี้ว่าฐานผู้ใช้กำลังกว้างขึ้น ไม่ใช่แค่คนเดิมจ่ายแพงขึ้น"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2 2026: GAAP EPS $1.37 (ปีก่อน $1.03) +33% · กำไรสุทธิ $816M (+27%)",
          "trend": "up",
          "score": 74,
          "impact": "positive",
          "why": "กำไรต่อหุ้นโตเร็วกว่ากำไรรวมเพราะจำนวนหุ้นลดลงจากการซื้อหุ้นคืน ซึ่งเป็นการโตแบบที่ผู้ถือหุ้นได้จริง · ข้อควรระวังคือธุรกิจนี้มีฤดูกาลรุนแรงมาก ไตรมาส 3 (ฤดูท่องเที่ยว) ทำกำไรเกือบทั้งปี ส่วนไตรมาส 1 กับ 4 แทบไม่มีกำไร ห้ามเอา EPS ไตรมาสเดียวไปคูณสี่"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q2 2026 = $1.25B (35% ของรายได้) · ทั้งปี FY2025 อยู่ที่ $4.65B และโตต่อเนื่องทุกปีตั้งแต่ FY2021",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "จุดแข็งที่สุดของบริษัทนี้ — ไม่ได้เป็นเจ้าของบ้านสักหลัง จึงแทบไม่มีค่าใช้จ่ายลงทุน และยังได้ประโยชน์จากการที่ผู้เข้าพักจ่ายเงินล่วงหน้าก่อนที่บริษัทจะจ่ายเจ้าของบ้าน ทำให้เงินสดเข้าก่อนออก · อัตราการแปลงรายได้เป็นเงินสดระดับ 38% ต่อปีอยู่ในกลุ่มสูงสุดของบริษัทที่ไม่ใช่ซอฟต์แวร์"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin 21.0% (ปีก่อน 19.8%) · Adjusted EBITDA $1.26B = 35% ของรายได้ · เป้าทั้งปียกขึ้นเป็นอย่างน้อย 35.5%",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "อัตรากำไรขยับขึ้นแม้จะลงทุนเปิดหมวดใหม่ (Experiences และ Services) ไปพร้อมกัน แสดงว่าธุรกิจหลักมีแรงส่งพอจะแบกการลงทุนได้ · การที่บริษัทกล้ายกเป้าอัตรากำไรทั้งปีขึ้นกลางปีเป็นสัญญาณที่หนักแน่นกว่าคำพูด"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงมากในเชิงเศรษฐกิจจริง เพราะแทบไม่มีสินทรัพย์ถาวรที่ต้องลงทุน — ตัวเลขทางบัญชีถูกเจือจางด้วยเงินสด $12.1B ที่กองอยู่",
          "trend": "flat",
          "score": 72,
          "impact": "positive",
          "why": "ทุนที่ธุรกิจใช้จริงน้อยมากเทียบกำไรที่ทำได้ ผลตอบแทนจึงสูงโดยธรรมชาติของโมเดล · สิ่งที่กดตัวเลขคือเงินสดก้อนใหญ่ที่ยังไม่ได้ใช้ ซึ่งบริษัทกำลังทยอยแก้ด้วยการซื้อหุ้นคืน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$12.07B (30 มิ.ย. 2026) — เงินสดสุทธิหลังหักหนี้ ~$9.6B",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "กันชนหนามากเทียบขนาดธุรกิจ และยังสร้างเงินสดเพิ่มทุกไตรมาส · หมายเหตุการอ่านงบ: ตัวเลข 'เงินสดรวม' ที่สูงกว่านี้ในงบดุลมีเงินของผู้เข้าพักที่ต้องส่งต่อให้เจ้าของบ้านปนอยู่ ซึ่งไม่ใช่เงินของบริษัท"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้ระยะยาว ~$2.48B — หุ้นกู้ธรรมดา $2.5B ที่ออกเมื่อ มี.ค. 2026 ครบกำหนดปี 2029-2036 · หุ้นกู้แปลงสภาพเดิม $2.0B ถูกชำระคืนหมดแล้ว",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "เป็นการเปลี่ยนโครงสร้างหนี้ที่เป็นบวกกับผู้ถือหุ้นชัดเจน — หุ้นกู้แปลงสภาพคือการเจือจางที่รอเกิด พอเปลี่ยนเป็นหุ้นกู้ธรรมดาความเสี่ยงนั้นก็หายไป แลกกับดอกเบี้ยที่ต้องจ่ายซึ่งบริษัทจ่ายได้สบายจากเงินสดที่มี · หนี้สุทธิยังติดลบ (มีเงินสดมากกว่าหนี้ราว $9.6B)"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 597 ล้านหุ้น — ลดลงจาก ~662 ล้านหุ้นใน FY2023 · ซื้อหุ้นคืน 7.9 ล้านหุ้นมูลค่า $1.07B ใน Q2 เหลือวงเงินอีก $3.4B",
          "trend": "up",
          "score": 76,
          "impact": "positive",
          "why": "หายากมากในกลุ่มหุ้นเติบโต — จำนวนหุ้นลดลงจริงราว 10% ในสามปี แปลว่าการซื้อหุ้นคืนไม่ได้แค่หักล้างค่าหุ้นพนักงาน แต่ลดจำนวนหุ้นได้สุทธิ ผู้ถือหุ้นเดิมจึงได้สัดส่วนในธุรกิจมากขึ้นทุกปีโดยไม่ต้องซื้อเพิ่ม · ค่าหุ้นพนักงานยังสูงตามมาตรฐานบริษัทเทคโนโลยี แต่ถูกกลบได้หมด"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ซื้อหุ้นคืนเป็นหลัก (เหลือวงเงิน $3.4B จาก $6.0B) · ไม่มีปันผล · ลงทุนเปิดหมวดใหม่ Experiences และ Services · รีไฟแนนซ์หนี้ให้สะอาดขึ้น",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "ลำดับความสำคัญชัดและทำจริง — เอาเงินสดส่วนเกินไปลดจำนวนหุ้น ขณะที่ยังกันงบไว้ลงทุนหมวดใหม่ และใช้จังหวะรีไฟแนนซ์ล้างหุ้นกู้แปลงสภาพออกไป เป็นชุดการตัดสินใจที่เข้าข้างผู้ถือหุ้นทั้งสามอย่าง · จุดที่ยังตัดสินไม่ได้คือเงินที่ลงไปกับ Experiences และ Services จะคืนทุนหรือไม่ เพราะบริษัทยังไม่แยกตัวเลขออกมาให้ดู"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$168 · mcap ~$100B · forward P/E ~32x จาก consensus non-GAAP FY2026 $5.30 · P/E ตามบัญชีจริง ~38x · ขึ้นมา ~25% ตั้งแต่ต้นปี",
          "trend": "down",
          "score": 45,
          "impact": "neutral",
          "why": "ไม่ถูกแล้วหลังราคาวิ่งขึ้น 25% ในปีนี้ โดยกระโดด 17% ในวันเดียวหลังงบ Q2 · ที่ ~32 เท่าของกำไร ราคานี้ต้องการให้การเติบโตระดับ 15-17% เดินต่อได้อีกหลายปี · สัญญาณที่ควรสังเกตคือเป้าเฉลี่ยนักวิเคราะห์อยู่ที่ $183 สูงกว่าราคาปัจจุบันเพียง ~9% ซึ่งแคบที่สุดในบรรดาหุ้นที่เพิ่งวิ่งแรง แปลว่าตลาดมองว่าราคาไล่ทันพื้นฐานไปมากแล้ว"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 72,
        "recurringPct": 20,
        "note": "คุณภาพรายได้ดีในแง่การกระจายตัว — มาจากการจองหลายร้อยล้านครั้งจากผู้ใช้ทั่วโลก ไม่พึ่งลูกค้ารายใหญ่แม้แต่รายเดียว และกระจายใน 4 ภูมิภาคโดยไม่มีภูมิภาคไหนเกินครึ่ง · จุดที่ต้องเข้าใจก่อนอ่านกราฟรายไตรมาสคือ **ฤดูกาลรุนแรงมาก** — ไตรมาส 3 (ฤดูท่องเที่ยวซีกโลกเหนือ) มีอัตรากำไรจากการดำเนินงานระดับ 40% ขณะที่ไตรมาส 1 อยู่แค่ 2-5% นี่คือรูปแบบปกติของธุรกิจนี้ ไม่ใช่สัญญาณว่าอะไรพัง · รายได้แทบไม่มีส่วนที่เป็นสัญญาประจำ ทุกบาททุกสตางค์ต้องมีคนกดจองใหม่ทุกครั้ง จึงอ่อนไหวต่อภาวะเศรษฐกิจและการเดินทางมากกว่าธุรกิจแบบสมาชิกรายเดือน · ตัวเลขด้านล่างเป็นรายได้ตามภูมิภาคซึ่งเป็นชุดที่บริษัทรายงานจริงใน 10-Q",
        "segments": [
          {
            "name": "อเมริกาเหนือ",
            "sharePct": 44,
            "growthNote": "$1,594M (+16% YoY) — ตลาดใหญ่สุดและเป็นฐานกำไรหลัก",
            "trend": "up"
          },
          {
            "name": "ยุโรป ตะวันออกกลาง และแอฟริกา",
            "sharePct": 40,
            "growthNote": "$1,425M (+16% YoY) — ขนาดใกล้เคียงอเมริกาเหนือแล้ว ทำให้ไม่พึ่งตลาดเดียว",
            "trend": "up"
          },
          {
            "name": "ละตินอเมริกา",
            "sharePct": 8,
            "growthNote": "$291M (+26% YoY) — ภูมิภาคที่โตเร็วที่สุด แต่ฐานยังเล็ก",
            "trend": "up"
          },
          {
            "name": "เอเชียแปซิฟิก",
            "sharePct": 8,
            "growthNote": "$298M (+17% YoY) — ฐานยังเล็กเทียบขนาดตลาดจริง เป็นพื้นที่ที่ยังเหลือให้ขยายมากที่สุด",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 55,
        "items": [
          {
            "item": "ผู้ช่วย AI สำหรับการค้นหาและบริการลูกค้า",
            "status": "executing",
            "evidence": "บริษัทระบุว่า AI เป็นหนึ่งในตัวขับผลประกอบการไตรมาสนี้ โดยการจองผ่านแอปโต 23% และผู้ใช้ครั้งแรกเพิ่ม 11% ซึ่งสูงสุดในรอบสี่ปี — แต่ยังไม่มีตัวเลขแยกว่าส่วนไหนมาจาก AI โดยตรง"
          },
          {
            "item": "ขยายออกนอกที่พัก — Experiences และ Services",
            "status": "on-track",
            "evidence": "ตัวชี้วัดหลักเปลี่ยนจาก 'คืนที่จอง' เป็น 'คืนและที่นั่งที่จอง' แล้ว ซึ่งแปลว่า Experiences ถูกนับรวมเป็นธุรกิจจริง · แต่บริษัทยังไม่แยกรายได้ส่วนนี้ออกมา จึงยังวัดไม่ได้ว่าใหญ่แค่ไหน"
          },
          {
            "item": "ใช้ข้อมูลการจองปรับราคาและจับคู่ที่พัก",
            "status": "executing",
            "evidence": "การจองรวมโต 10% พร้อมมูลค่าการจองโต 16% แปลว่าทั้งปริมาณและราคาต่อคืนขยับขึ้นพร้อมกัน ซึ่งเป็นผลของระบบจับคู่และแนะนำราคาที่ทำงานได้ดี"
          },
          {
            "item": "สถานะในคลื่น AI โดยรวม",
            "status": "at-risk",
            "evidence": "Airbnb ไม่ใช่ผู้ได้ประโยชน์โดยตรงจากคลื่น AI — ใช้ AI เป็นเครื่องมือลดต้นทุนและเพิ่มการแปลงผู้เข้าชมเป็นผู้จอง ไม่ใช่สินค้าที่ขายได้ · ความเสี่ยงที่ต้องจับตาคือถ้าผู้ช่วย AI ของผู้ให้บริการรายอื่นกลายเป็นจุดเริ่มต้นของการวางแผนเดินทางแทนแอป Airbnb บริษัทจะเสียการเข้าถึงลูกค้าโดยตรงซึ่งเป็นหัวใจของโมเดล"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "คูเมืองมาจากวงจรที่ป้อนตัวเอง — เจ้าของบ้านลงประกาศที่นี่เพราะมีคนจองเยอะที่สุด และนักท่องเที่ยวมาที่นี่เพราะมีที่พักให้เลือกมากที่สุด ยิ่งใหญ่ยิ่งแทรกยาก · ชั้นที่สองคือแบรนด์ที่กลายเป็นคำกริยาไปแล้ว คนพูดว่า 'จอง Airbnb' ไม่ใช่ 'จองที่พักส่วนตัว' ทำให้ได้ผู้ใช้เข้ามาตรงโดยไม่ต้องซื้อโฆษณาเท่าคู่แข่ง · จุดอ่อนคือทั้งเจ้าของบ้านและนักท่องเที่ยวลงประกาศหรือค้นหาหลายแพลตฟอร์มพร้อมกันได้ฟรี และคู่แข่งอย่าง Booking.com มีขนาดใหญ่กว่าในฝั่งโรงแรมซึ่งกำลังรุกเข้ามาในหมวดบ้านพักด้วย",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "เป็นผู้นำชัดเจนในหมวดบ้านพักส่วนตัวระดับโลก แต่ในภาพรวมของการจองที่พักทั้งหมด Booking Holdings ยังมีมูลค่าการจองใหญ่กว่ามาก"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "ประสบการณ์การใช้งานและระบบจับคู่ทำได้ดีจนเป็นมาตรฐานของอุตสาหกรรม แต่ไม่ใช่เทคโนโลยีที่คู่แข่งลอกไม่ได้ — ความได้เปรียบมาจากขนาดข้อมูลการจองมากกว่าตัวเทคโนโลยี"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "ทะลุกรอบบนของเป้าตัวเองสองไตรมาสติด และยกเป้าทั้งปีทั้งด้านรายได้และอัตรากำไรขึ้นกลางปี · เปิดหมวดใหม่ Experiences และ Services พร้อมกันโดยที่อัตรากำไรยังขยับขึ้น"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "stable",
            "note": "ต่ำโดยธรรมชาติ — ทั้งเจ้าของบ้านและนักท่องเที่ยวใช้หลายแพลตฟอร์มพร้อมกันได้ฟรี สิ่งที่ยึดไว้คือรีวิวและประวัติที่สะสมมา ซึ่งย้ายตามไปไม่ได้"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "strengthening",
            "note": "กำลังขยายจากที่พักไปสู่กิจกรรมและบริการในที่พัก ทำให้แอปเดียวตอบโจทย์การเดินทางได้มากขึ้น — แต่ยังอยู่ช่วงเริ่มต้นและยังไม่มีตัวเลขรายได้แยกให้วัด"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "stable",
            "note": "ไม่ใช่มิติที่เกี่ยวข้องกับธุรกิจนี้โดยตรง — สิ่งที่เทียบเคียงได้คือจำนวนเจ้าของบ้านที่ลงประกาศ ซึ่งยังเพิ่มขึ้นต่อเนื่องทั่วโลก"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "stable",
            "note": "ไม่มีค่าสมาชิกหรือสัญญาผูกมัด ผู้ใช้กลับมาเพราะความเคยชินและรีวิวที่สะสมไว้ · การจองผ่านแอปที่โต 23% เป็นสัญญาณที่ดี เพราะคนที่ลงแอปแล้วมักกลับมาจองตรงมากกว่าผ่านการค้นหา"
          },
          {
            "key": "moat",
            "label": "ความแข็งแรงของคูเมืองโดยรวม",
            "status": "stable",
            "note": "แข็งในระดับที่คู่แข่งหน้าใหม่แทรกไม่ได้ แต่ไม่ได้แข็งขึ้นเรื่อย ๆ เพราะเป็นคูเมืองเชิงขนาดและแบรนด์ ไม่ใช่เชิงสัญญาผูกมัด · ความเสี่ยงระยะยาวที่ชัดที่สุดคือถ้าจุดเริ่มต้นของการวางแผนเดินทางย้ายไปอยู่ที่ผู้ช่วย AI ของรายอื่น"
          }
        ]
      },
      "capitalAllocation": {
        "score": 80,
        "verdict": "เป็นหนึ่งในชุดการตัดสินใจเรื่องทุนที่เข้าข้างผู้ถือหุ้นชัดที่สุดในกลุ่มหุ้นเติบโต — เอาเงินสดส่วนเกินไปลดจำนวนหุ้นจนลดได้จริงราว 10% ในสามปี รีไฟแนนซ์ล้างหุ้นกู้แปลงสภาพออกจากงบดุลเพื่อตัดความเจือจางที่รออยู่ และยังกันงบไว้ลงทุนหมวดใหม่ · จุดเดียวที่ยังตัดสินไม่ได้คือเงินที่ลงไปกับ Experiences และ Services เพราะบริษัทยังไม่แยกตัวเลขออกมาให้ดู",
        "items": [
          {
            "label": "ซื้อหุ้นคืน",
            "current": "7.9 ล้านหุ้น มูลค่า $1.07B ใน Q2 2026 · เหลือวงเงินอีก $3.4B จากที่อนุมัติ $6.0B",
            "assessment": "good",
            "why": "ลดจำนวนหุ้นได้สุทธิจริง จาก ~662 ล้านหุ้น (FY2023) เหลือ 597 ล้านหุ้น — ไม่ใช่แค่หักล้างค่าหุ้นพนักงานเหมือนบริษัทเทคโนโลยีส่วนใหญ่"
          },
          {
            "label": "รีไฟแนนซ์หนี้",
            "current": "มี.ค. 2026 ออกหุ้นกู้ธรรมดา $2.5B (ครบกำหนด 2029-2036) ไปชำระหุ้นกู้แปลงสภาพ $2.0B ที่ครบกำหนด",
            "assessment": "good",
            "why": "ตัดความเจือจางที่รออยู่ออกจากงบดุลไปเลย แลกกับดอกเบี้ยที่บริษัทจ่ายได้สบายจากเงินสด $12.1B ที่มี — เป็นการแลกที่คุ้มสำหรับผู้ถือหุ้นเดิม"
          },
          {
            "label": "ลงทุนหมวดใหม่",
            "current": "Experiences และ Services — ตัวชี้วัดหลักเปลี่ยนเป็น 'คืนและที่นั่งที่จอง' แล้ว",
            "assessment": "neutral",
            "why": "ทิศทางถูกเพราะขยายตลาดที่เข้าถึงได้โดยใช้ฐานผู้ใช้เดิม และทำได้โดยอัตรากำไรรวมยังขยับขึ้น · แต่ยังไม่แยกตัวเลขให้ดู จึงยังวัดไม่ได้ว่าคืนทุนหรือไม่"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี",
            "assessment": "good",
            "why": "สมเหตุสมผลเมื่อยังซื้อหุ้นคืนได้ในราคาที่เห็นว่าคุ้ม การซื้อหุ้นคืนมีประสิทธิภาพทางภาษีดีกว่าสำหรับผู้ถือหุ้นส่วนใหญ่"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและเงินลงทุน ~$12.07B · หนี้ ~$2.48B → เงินสดสุทธิ ~$9.6B",
            "assessment": "good",
            "why": "กันชนหนามากและไม่มีความเสี่ยงทางการเงิน · ข้อสังเกตเดียวคือเงินสดที่กองอยู่เยอะทำให้ผลตอบแทนต่อทุนทางบัญชีดูต่ำกว่าความเป็นจริงของธุรกิจ"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "forward P/E ~32x จาก consensus non-GAAP FY2026 EPS $5.30 (43 นักวิเคราะห์ · รายได้ $14.16B) และ P/E ตามบัญชีจริง ~38x — ช่องว่างสองฐานแคบผิดปกติเมื่อเทียบหุ้นเติบโตตัวอื่น เพราะ Airbnb มีกำไร GAAP จริงและไม่ได้พึ่งการบวกกลับค่าหุ้นพนักงานก้อนใหญ่ · ราคา ~$168, mcap ~$100B (15 ก.ย. 2026) ขึ้นมา ~25% ตั้งแต่ต้นปีจาก $136 โดยกระโดด ~17% ในวันเดียวหลังงบ Q2 (6 ส.ค.) และเคยแตะสูงสุด $190 เมื่อ 25 ส.ค. · สัญญาณที่ควรสังเกตคือเป้าเฉลี่ยนักวิเคราะห์อยู่ที่ $183 สูงกว่าราคาปัจจุบันเพียง ~9% ซึ่งแคบกว่าหุ้นตัวอื่นในชุดนี้มาก แปลว่าตลาดมองว่าราคาไล่ทันพื้นฐานไปเกือบหมดแล้ว margin of safety จึงบาง"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q1 → Q2 2026)",
          "prev": "$2.68B (+18% YoY)",
          "now": "$3.61B (+17% YoY) — ทะลุกรอบบนของ guidance",
          "direction": "positive"
        },
        {
          "metric": "กำไรต่อหุ้น",
          "prev": "$0.26 (Q1 2026 · ไตรมาสนอกฤดูกาล)",
          "now": "$1.37 — โตจาก $1.03 ในไตรมาสเดียวกันปีก่อน (+33%)",
          "direction": "positive"
        },
        {
          "metric": "เป้าทั้งปี 2026",
          "prev": "รายได้โตระดับต่ำถึงกลางของเลขสองหลัก · EBITDA margin 35%",
          "now": "ยกขึ้นเป็นโตอย่างน้อยระดับกลาง · EBITDA margin อย่างน้อย 35.5%",
          "direction": "positive"
        },
        {
          "metric": "โครงสร้างหนี้",
          "prev": "มีหุ้นกู้แปลงสภาพ $2.0B รอครบกำหนด (ความเจือจางที่รออยู่)",
          "now": "ชำระคืนหมดแล้ว เปลี่ยนเป็นหุ้นกู้ธรรมดา $2.5B ครบกำหนด 2029-2036",
          "direction": "positive"
        },
        {
          "metric": "การซื้อหุ้นคืน",
          "prev": "ทยอยซื้อต่อเนื่อง",
          "now": "$1.07B ในไตรมาสเดียว · หุ้น diluted ลดเหลือ 597 ล้านหุ้น เหลือวงเงิน $3.4B",
          "direction": "positive"
        },
        {
          "metric": "ราคาหุ้น",
          "prev": "$152 ก่อนประกาศงบ (6 ส.ค.)",
          "now": "~$168 — กระโดด ~17% ในวันเดียวหลังงบ แตะสูงสุด $190 เมื่อ 25 ส.ค.",
          "direction": "positive"
        }
      ],
      "risks": [
        "อ่อนไหวต่อเศรษฐกิจและการเดินทางโดยตรง — รายได้แทบไม่มีส่วนที่เป็นสัญญาประจำ ทุกบาทต้องมีคนกดจองใหม่ การท่องเที่ยวเป็นค่าใช้จ่ายที่ตัดได้ก่อนเมื่อกำลังซื้อหด และช่วงโควิดพิสูจน์แล้วว่ารายได้หายได้เกือบทั้งหมดในไตรมาสเดียว",
        "ความเสี่ยงด้านกฎระเบียบในเมืองใหญ่ — หลายเมืองทั่วโลกจำกัดหรือห้ามการปล่อยเช่าระยะสั้น ซึ่งกระทบอุปทานที่พักโดยตรงในตลาดที่ทำเงินได้ดีที่สุด และเป็นความเสี่ยงที่บริษัทควบคุมไม่ได้เลย",
        "ผู้ช่วย AI อาจแย่งจุดเริ่มต้นของการวางแผนเดินทาง — วันนี้คนเปิดแอป Airbnb เพื่อหาที่พัก ถ้าพฤติกรรมเปลี่ยนไปเริ่มที่ผู้ช่วย AI ของรายอื่นแล้วให้มันไปจองให้ Airbnb จะกลายเป็นผู้รับคำสั่งแทนที่จะเป็นเจ้าของความสัมพันธ์กับลูกค้า ซึ่งจะกดทั้งอำนาจต่อรองและอัตรากำไร",
        "ต้นทุนการย้ายต่ำทั้งสองฝั่ง — เจ้าของบ้านลงประกาศหลายแพลตฟอร์มพร้อมกันได้ฟรี และ Booking.com ที่ใหญ่กว่าในฝั่งโรงแรมกำลังรุกเข้าหมวดบ้านพัก ความได้เปรียบจึงมาจากขนาดและแบรนด์ ไม่ใช่สัญญาผูกมัด",
        "ราคาไล่ทันพื้นฐานไปมากแล้ว — ขึ้น 25% ในปีนี้และเทรดที่ ~32 เท่าของกำไร ขณะที่เป้าเฉลี่ยนักวิเคราะห์สูงกว่าราคาปัจจุบันเพียง ~9% ซึ่งแคบผิดปกติ หากการเติบโตชะลอต่ำกว่า 15% การปรับฐานจะแรงกว่าพื้นฐานที่แย่ลงจริง",
        "ฤดูกาลรุนแรงทำให้อ่านผลประกอบการผิดได้ง่าย — ไตรมาส 3 มีอัตรากำไรระดับ 40% ส่วนไตรมาส 1 อยู่แค่ 2-5% ใครที่เอาไตรมาสเดียวไปคูณสี่จะได้ภาพที่ผิดไปมาก และข่าวร้ายในไตรมาสอ่อนมักถูกตีความเกินจริง",
        "การขยายออกนอกที่พักยังพิสูจน์ไม่ได้ — Experiences และ Services ถูกนับรวมในตัวชี้วัดแล้วแต่บริษัทยังไม่แยกรายได้ให้ดู จึงยังไม่รู้ว่าเป็นเครื่องยนต์ที่สองจริงหรือเป็นแค่ส่วนเสริมที่กินงบลงทุน"
      ],
      "asOf": "2026-09",
      "nextEarnings": "2026-11",
      "history": {
        "epsBasis": "diluted GAAP (ปีบัญชี = ปีปฏิทิน สิ้นสุด 31 ธ.ค.)",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 5.992,
            "epsAdj": -0.57,
            "opMarginPct": 9,
            "fcfB": 2.313,
            "priceFYEnd": 166.49
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 8.399,
            "epsAdj": 2.79,
            "opMarginPct": 22.5,
            "fcfB": 3.43,
            "priceFYEnd": 85.5
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 9.917,
            "epsAdj": 7.24,
            "opMarginPct": 15.3,
            "fcfB": 3.884,
            "priceFYEnd": 136.14
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 11.102,
            "epsAdj": 4.11,
            "opMarginPct": 23,
            "fcfB": 4.518,
            "priceFYEnd": 131.41
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 12.241,
            "epsAdj": 4.04,
            "opMarginPct": 20.8,
            "fcfB": 4.646,
            "priceFYEnd": 135.72
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 3.397,
            "epsAdj": 6.63,
            "opMarginPct": 44,
            "fcfB": 1.325,
            "priceQEnd": 137.21,
            "epsNote": "EPS $6.63 สูงผิดปกติ — กำไรสุทธิ $4,374M มากกว่ากำไรจากการดำเนินงาน $1,496M ถึงราว $2.9B เพราะมีรายการทางภาษีครั้งเดียวใต้บรรทัด ไม่ใช่ผลการดำเนินงาน ห้ามนำไตรมาสนี้ไปเทียบกับไตรมาสอื่นตรง ๆ"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-31",
            "revenueB": 2.218,
            "epsAdj": -0.55,
            "opMarginPct": -22.4,
            "fcfB": 0.063,
            "priceQEnd": 136.14,
            "epsNote": "ขาดทุน $0.55/หุ้น และกำไรจากการดำเนินงานติดลบ $496M ทั้งที่ทั้งปี FY2023 เป็นบวก $1,518M — เป็นไตรมาสเดียวในรอบสามปีที่ติดลบ เกิดจากรายการตั้งสำรองก้อนใหญ่ในไตรมาสนั้น ไม่ใช่ระดับปกติของธุรกิจ"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-31",
            "revenueB": 2.142,
            "epsAdj": 0.41,
            "opMarginPct": 4.7,
            "fcfB": 1.923,
            "priceQEnd": 164.96
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-30",
            "revenueB": 2.748,
            "epsAdj": 0.87,
            "opMarginPct": 18.1,
            "fcfB": 1.051,
            "priceQEnd": 151.63
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-30",
            "revenueB": 3.732,
            "epsAdj": 2.13,
            "opMarginPct": 40.9,
            "fcfB": 1.078,
            "priceQEnd": 126.81
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-31",
            "revenueB": 2.48,
            "epsAdj": 0.73,
            "opMarginPct": 17.3,
            "fcfB": 0.466,
            "priceQEnd": 131.41
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 2.272,
            "epsAdj": 0.25,
            "opMarginPct": 1.7,
            "fcfB": 1.789,
            "priceQEnd": 119.46
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-30",
            "revenueB": 3.096,
            "epsAdj": 1.03,
            "opMarginPct": 19.8,
            "fcfB": 0.975,
            "priceQEnd": 132.34
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 4.095,
            "epsAdj": 2.21,
            "opMarginPct": 39.7,
            "fcfB": 1.356,
            "priceQEnd": 121.42
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 2.778,
            "epsAdj": 0.56,
            "opMarginPct": 9.7,
            "fcfB": 0.526,
            "priceQEnd": 135.72
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 2.678,
            "epsAdj": 0.26,
            "opMarginPct": 3.2,
            "fcfB": 1.708,
            "priceQEnd": 126.28
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 3.608,
            "epsAdj": 1.37,
            "opMarginPct": 21,
            "fcfB": 1.27,
            "priceQEnd": 143.1
          }
        ],
        "notes": "ปีบัญชีของ Airbnb ตรงกับปีปฏิทินและทุกไตรมาสจบสิ้นเดือนปฏิทิน · **ต้องอ่านฤดูกาลให้ออกก่อนดูกราฟรายไตรมาส** — ไตรมาส 3 เป็นฤดูท่องเที่ยวและมีอัตรากำไรจากการดำเนินงานระดับ 40% ขณะที่ไตรมาส 1 อยู่แค่ 2-5% ทุกปี เป็นรูปแบบปกติ ไม่ใช่สัญญาณว่าอะไรพัง · EPS เป็น diluted GAAP ทั้งชุด · FY2023 EPS $7.24 สูงผิดปกติเพราะรวมรายการทางภาษีครั้งเดียวราว $2.9B ใน Q3'23 ไว้ด้วย — ถ้าตัดออก กำไรทั้งปีจะอยู่ในระดับใกล้เคียง FY2024 และ FY2025 ห้ามอ่านว่ากำไรถดถอยลงจาก FY2023 · ตรวจสอบความถูกต้องแล้วโดยบวกรายไตรมาสเทียบรายปี: FY2023 (3 ไตรมาสแรก + Q4) = $9,917M · FY2024 = $11,102M · FY2025 = $12,241M ตรงกันทั้งสามปี · คอลัมน์กระแสเงินสดในตารางนี้เป็น **กระแสเงินสดจากการดำเนินงาน** เพราะแหล่งข้อมูลไม่ได้แยกเงินลงทุนในสินทรัพย์ออกมา ซึ่งสูงกว่าตัวเลข Free Cash Flow ที่บริษัทรายงานเองเล็กน้อย (Q2 2026: ตาราง $1.270B vs บริษัทรายงาน $1.253B ต่างกัน ~$17M คือเงินลงทุนในสินทรัพย์) — ใช้ฐานเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://news.airbnb.com/airbnb-q2-2026-financial-results/",
          "https://www.sec.gov/Archives/edgar/data/0001559720/000155972026000027/abnb-20260630.htm",
          "https://stockanalysis.com/stocks/abnb/financials/",
          "https://stockanalysis.com/stocks/abnb/forecast/",
          "https://query1.finance.yahoo.com/v8/finance/chart/ABNB (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-09",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 5.3,
            "revenue": 14.16
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "$3.54-3.60B",
            "actual": "$3.608B",
            "result": "beat",
            "magnitudePct": 1.1
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "$2.59-2.63B",
            "actual": "$2.678B",
            "result": "beat",
            "magnitudePct": 2.6
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 14.16,
            "eps": 5.3,
            "confidence": "high",
            "basis": "non-GAAP"
          }
        ],
        "note": "Airbnb ให้ guidance รายได้เป็นช่วงแคบทุกไตรมาส ซึ่งเทียบกับผลจริงได้ตรง ๆ · สองไตรมาสที่หาเลข guidance ต้นทางมายืนยันได้ทะลุจุดกึ่งกลางทั้งคู่ (Q1 +2.6% · Q2 +1.1%) แต่ขนาดที่ทะลุเล็กลง — เก็บแค่สองแถวเพราะไตรมาสก่อนหน้ายังหา guidance ต้นทางยืนยันไม่ได้ในรอบนี้ ห้ามเติมด้วยการเดา · guide Q3 2026 = รายได้ $4.69-4.77B (+15-17%) และบริษัทยกเป้าทั้งปีขึ้นสองด้านพร้อมกัน คือรายได้โตอย่างน้อยระดับกลางของเลขสองหลัก (จากเดิมต่ำถึงกลาง) และอัตรากำไร EBITDA อย่างน้อย 35.5% (จากเดิม 35%) · consensus FY2026 = รายได้ $14.16B / EPS $5.30 บนฐาน non-GAAP (43 นักวิเคราะห์ · ยืนยันฐานจาก stockanalysis.com) ซึ่งเป็นคนละฐานกับ EPS ในตารางประวัติที่เป็น GAAP แต่สำหรับ ABNB ช่องว่างสองฐานแคบกว่าหุ้นเติบโตตัวอื่นมาก เพราะบริษัทมีกำไร GAAP จริงอยู่แล้ว · ยังไม่ใส่ consensus FY2027 เพราะหาตัวเลข aggregate แบบเปิดเผยฟรีไม่ได้ในรอบนี้"
      }
    }
  }
};
  if (typeof window !== "undefined") window.ThesisData = ThesisData;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisData;
})();
