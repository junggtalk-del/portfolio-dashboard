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
      "asOf": "2026-07",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ตรงกับปีปฏิทิน) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลครบแล้วเมื่อต้นปี 2026",
        "epsBasis": "diluted GAAP, split-adjusted (หลัง stock split 20:1 เดือน ก.ค. 2022)",
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
        ]
      },
      "nextEarnings": "2026-10"
    },
    "NVDA": {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "layer": "gpu",
      "thesis": {
        "statement": "NVDA คือแกนกลางของโครงสร้างพื้นฐาน AI ทั้งโลก — ไม่ใช่แค่บริษัทขายชิป แต่เป็นผู้ขาย 'โรงงาน AI' ทั้งระบบ (GPU + NVLink + networking + CUDA software) ที่ลูกค้าทุกค่ายต้องพึ่งพา รายได้ Data Center ยังเร่งตัวขึ้นแม้ฐานจะใหญ่มหาศาล และบริษัทประกาศ visibility คำสั่งซื้อ Blackwell + Rubin สะสมราว ~$500B ถึงสิ้นปี 2026 ตราบใดที่รอบลงทุน AI ยังเดินหน้า NVDA คือผู้ชนะที่ชัดเจนที่สุดของทั้ง value chain",
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
          "current": "~+85% YoY (Q1 FY27 — $81.6B, +20% QoQ) เร่งตัวต่อเนื่อง 3 ไตรมาส · guide Q2 ~$91B",
          "trend": "up",
          "score": 97,
          "impact": "positive",
          "why": "โตเร่งขึ้นอีกจาก ~+73% (Q4 FY26) เป็น ~+85% — Data Center +92% YoY จาก Blackwell GB300 ramp การเติบโตระดับนี้ที่ฐานรายได้ ~$330B run-rate เป็นเรื่องหายากมาก"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "GAAP EPS $1.87 (Q1 FY27) ชนะคาด $1.77 · โตตามรายได้และ margin ที่ฟื้น",
          "trend": "up",
          "score": 95,
          "impact": "positive",
          "why": "กำไรโตตามรายได้ + gross margin ฟื้นกลับ ~75% หลังพ้นภาระ H20 charge ปีก่อน ทำให้ EPS เร่งตัว"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "สูงมาก — run-rate รายได้ ~$330B+/ปี แปลงเป็นกระแสเงินสดอิสระมหาศาล",
          "trend": "up",
          "score": 95,
          "impact": "positive",
          "why": "โมเดล fabless margin ~75% + capex ต่ำเทียบรายได้ ทำให้ FCF พุ่งตามรายได้ที่เร่งตัว รองรับทั้งปันผลและ buyback"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross margin ~75% (non-GAAP) ฟื้นเต็มและทรงตัว — FY26 เคยถูกฉุดเหลือ 71.1% จาก H20 charge",
          "trend": "up",
          "score": 95,
          "impact": "positive",
          "why": "margin กลับสู่ระดับ ~75% พิสูจน์ pricing power ยังอยู่แม้ Blackwell เข้าสู่ full production — จุดกดชั่วคราว (H20 write-off) ผ่านไปแล้ว"
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
          "current": "เงินสด + เงินลงทุนราว ~$6 หมื่นล้านดอลลาร์",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "เงินสดสะสมโตต่อเนื่องแม้จะซื้อหุ้นคืนหนักและลงทุนใน ecosystem — ให้ความยืดหยุ่นเต็มที่ทั้งด้าน supply chain commitment และการลงทุนเชิงกลยุทธ์"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาวราว ~$8-10B — เล็กน้อยมากเทียบเงินสด",
          "trend": "flat",
          "score": 95,
          "impact": "positive",
          "why": "ฐานะเป็น net cash ชัดเจน หนี้ที่มีเป็นหุ้นกู้ดอกเบี้ยต่ำจากยุคก่อน ไม่มีความเสี่ยงด้านงบดุลใด ๆ ที่มีนัยสำคัญ"
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
          "current": "Forward P/E ~24x (ราคา ~$207 · mcap ~$5.09T, ก.ค. 2026) — ต่ำกว่าค่าเฉลี่ย 12 เดือน (~44x) มาก",
          "trend": "up",
          "score": 73,
          "impact": "neutral",
          "why": "แม้หุ้นขึ้นและ mcap แตะ ~$5T แต่ forward P/E 'ถูกลง' เหลือ ~24x เพราะกำไร (E) โตเร็วกว่าราคา — PEG ต่ำกว่า 1 ชัดเจน ความเสี่ยงหลักคือความยั่งยืนของ E ไม่ใช่ multiple"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 93,
        "recurringPct": null,
        "note": "รายได้เร่งตัว 3 ไตรมาสติดและกระจุกที่ Data Center ~92% ของทั้งหมด — ภายใน DC เอง hyperscale ~50% ที่เหลือ ~50% กระจายไป AI clouds/sovereign/enterprise/industrial (การกระจายลูกค้าที่ดีขึ้นลดความเสี่ยงกระจุกตัว) คุณภาพการเติบโตสูงมากแต่ผูกกับรอบลงทุน AI capex ของลูกค้าไม่กี่ราย",
        "segments": [
          {
            "name": "Data Center",
            "sharePct": 92,
            "growthNote": "$75.2B (+92% YoY, +21% QoQ) — Blackwell GB300 ramp + networking (NVLink/Spectrum-X/InfiniBand) · hyperscale ~50% ของ DC ที่เหลือกระจายไป AI clouds/sovereign/enterprise",
            "trend": "up"
          },
          {
            "name": "Gaming",
            "sharePct": 5,
            "growthNote": "RTX 50 series — ยังเป็นธุรกิจดีแต่ถูกลดสัดส่วน และบางช่วง supply ถูกดึงไป Data Center",
            "trend": "flat"
          },
          {
            "name": "Professional Visualization",
            "sharePct": 2,
            "growthNote": "โตจาก workstation AI และ Omniverse — สัดส่วนเล็ก",
            "trend": "up"
          },
          {
            "name": "Automotive & Robotics",
            "sharePct": 1,
            "growthNote": "DRIVE Thor + physical AI — optionality ระยะยาวมากกว่าตัวขับปัจจุบัน",
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
        "note": "Forward P/E ~24x (ราคา ~$207, mcap ~$5.09T) สำหรับบริษัทที่โต ~85% margin สุทธิ ~50% — เชิงตัวเลขคือ 'ไม่แพง' (PEG « 1) และ forward multiple ยังลดลงแม้ราคาขึ้น เพราะ E โตเร็วกว่า ความเสี่ยงหลักไม่ใช่ multiple แต่คือความยั่งยืนของตัว E — ถ้า capex ของ hyperscaler ชะลอ กำไรและ multiple จะถูกปรับลงพร้อมกัน จึงมองเป็น 'fair' สำหรับผู้ที่เชื่อใน AI infrastructure buildout ต่อเนื่อง"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q4 FY26 → Q1 FY27)",
          "prev": "$68.1B (+73% YoY)",
          "now": "$81.6B (+85% YoY, +20% QoQ) — เร่งตัว 3 ไตรมาสติด",
          "direction": "positive"
        },
        {
          "metric": "รายได้ Data Center",
          "prev": "$62.3B (+75% YoY)",
          "now": "$75.2B (+92% YoY, +21% QoQ) — Blackwell GB300",
          "direction": "positive"
        },
        {
          "metric": "Guidance ไตรมาสถัดไป (Q2 FY27)",
          "prev": "~$65B (guide สำหรับ Q4 FY26)",
          "now": "~$91B ±2% — สูงกว่าตลาดคาด ~$86.8B โดยไม่นับจีน",
          "direction": "positive"
        },
        {
          "metric": "Gross margin",
          "prev": "FY26 ถูกฉุดเหลือ 71.1% จาก H20 charge",
          "now": "ฟื้นเต็ม ~75% และทรงตัว",
          "direction": "positive"
        },
        {
          "metric": "Forward valuation",
          "prev": "fwd P/E ~30x",
          "now": "fwd P/E ~24x — E โตเร็วกว่าราคา จึง 'ถูกลง' แม้หุ้นขึ้น",
          "direction": "positive"
        },
        {
          "metric": "Data Center จากจีน",
          "prev": "เกือบศูนย์ (H20 ติดข้อจำกัด)",
          "now": "ยังศูนย์ — ไม่มี Hopper ส่งจีน Q1 FY27 (เทียบ $4.6B ปีก่อน) และไม่นับใน guidance",
          "direction": "neutral"
        }
      ],
      "risks": [
        "รอบลงทุน AI capex กระจุกตัวในลูกค้า hyperscaler + AI lab ไม่กี่ราย — หากรายใดชะลอการลงทุนหรือเกิดคำถามเรื่อง ROI ของ AI ในวงกว้าง รายได้จะถูกกระทบแรงและเร็ว",
        "Custom ASIC ของลูกค้าเอง (Google TPU, AWS Trainium, Meta MTIA) และ AMD MI-series กำลังแย่งส่วนแบ่งงาน inference ซึ่งเป็นตลาดที่จะใหญ่ที่สุดในระยะยาว",
        "จีน: ข้อจำกัดส่งออกทำให้รายได้ Data Center จากจีนแทบเป็นศูนย์ และเร่งให้จีนสร้างชิปทดแทนเอง (Huawei Ascend) — ตลาดที่เคยมีนัยสำคัญอาจหายถาวร",
        "Circular revenue: การลงทุนขนาดใหญ่ในลูกค้าอย่าง OpenAI/Anthropic ทำให้ตลาดตั้งคำถามว่า backlog สะท้อนดีมานด์แท้จริงแค่ไหน — เป็นความเสี่ยงต่อ multiple มากกว่าต่อธุรกิจทันที",
        "Supply chain กระจุกตัว: พึ่งพา TSMC (ไต้หวัน) และ HBM จากผู้ผลิตไม่กี่ราย — ความตึงเครียดภูมิรัฐศาสตร์ช่องแคบไต้หวันคือ tail risk ที่ใหญ่ที่สุดของทั้ง thesis"
      ],
      "asOf": "2026-07",
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
        ]
      },
      "nextEarnings": "2026-08"
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
          "current": "~+18% YoY (ไตรมาสล่าสุด Q1 FY26) เร่งขึ้นจาก ~+15% ของทั้งปี FY25",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "บริษัทขนาดเกือบ $300B/ปี ที่ยังเร่งความเร็วการโตได้เป็นเรื่องหายากมาก โดยแรงขับหลักคือ Azure (~+40%) และ Microsoft Cloud โดยรวม ~+26% — สะท้อนว่า demand ด้าน AI แปลงเป็นรายได้จริงแล้ว"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS GAAP โต ~+13% YoY (ถูกกดจากส่วนแบ่งขาดทุน OpenAI ~-$0.41/หุ้น); หากตัดรายการนี้โต ~+20%+",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "กำไรจากธุรกิจหลักโตแรงกว่ารายได้เพราะ operating leverage แต่ตัวเลข GAAP จะผันผวนตามผลขาดทุนทางบัญชีของ OpenAI ซึ่งเป็น non-cash — นักลงทุนต้องดู EPS ex-OpenAI ประกอบ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "เงินสดจากการดำเนินงานสูงมาก (~$45B/ไตรมาส) แต่ FCF ถูก capex ระดับ ~$35B/ไตรมาสกดไว้",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "เครื่องผลิตเงินสดยังทำงานเต็มกำลัง แต่บริษัทเลือกเทเงินเกือบทั้งหมดลง datacenter สำหรับ AI — FCF ระยะสั้นจึงโตช้ากว่ากำไรมาก นี่คือ 'ต้นทุนของโอกาส' ที่ต้องติดตามว่าผลตอบแทนกลับมาจริง"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~49% (ไตรมาสล่าสุด) — สูงที่สุดในกลุ่ม mega-cap tech",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "แม้จะแบกค่าเสื่อม datacenter ที่พุ่งขึ้น margin ยังขยายได้ เพราะ software/subscription เป็นแกนรายได้ และ Azure มี scale economics — พิสูจน์ว่า AI ยังไม่ได้ทำลายโครงสร้างกำไรอย่างที่หลายคนกลัว"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังสูง (~25-30%) แต่มีแนวโน้มถูกเจือจางเมื่อฐานสินทรัพย์ AI ขยายเร็วมาก",
          "trend": "down",
          "score": 75,
          "impact": "neutral",
          "why": "ธุรกิจ software เดิมให้ ROIC สูงมาก แต่เงินลงทุนก้อนใหม่ไหลเข้า GPU/datacenter ที่ให้ผลตอบแทนต่ำกว่าและเสื่อมเร็วกว่า — ROIC รวมจึงค่อย ๆ ลดลงชั่วคราว เป็นสิ่งที่ยอมรับได้หาก Azure AI โตตามแผน"
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
          "current": "forward P/E ~30x บน market cap ~$3.5-3.9T — premium เทียบตลาด แต่ไม่แพงสุดในกลุ่ม AI",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "จ่ายแพงกว่าตลาดเพื่อคุณภาพระดับนี้ถือว่า 'สมเหตุสมผลแต่ไม่ถูก' — upside ต้องมาจากกำไรที่โตต่อเนื่อง ไม่ใช่การ re-rate ของ multiple ซึ่งจำกัด margin of safety หาก AI demand สะดุด"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 92,
        "recurringPct": 80,
        "note": "คุณภาพรายได้ระดับท็อปของตลาด — ส่วนใหญ่เป็น subscription/consumption ตามสัญญาระยะยาว โดย commercial RPO ~$392B (โต ~+50% YoY หลังรวมสัญญา OpenAI) ล็อกรายได้ล่วงหน้าหลายปี และการโตของทั้งบริษัทกำลัง 'เร่งขึ้น' ทั้งที่ฐานใหญ่มาก ซึ่งหายากมากในบริษัทขนาดนี้",
        "segments": [
          {
            "name": "Productivity and Business Processes (Microsoft 365, LinkedIn, Dynamics)",
            "sharePct": 43,
            "growthNote": "โต ~+15% YoY สม่ำเสมอ — M365 Copilot คือตัว upsell ราคาต่อหัวที่เริ่มมีน้ำหนักขึ้นเรื่อย ๆ",
            "trend": "up"
          },
          {
            "name": "Intelligent Cloud (Azure, Server, Enterprise Services)",
            "sharePct": 37,
            "growthNote": "เครื่องยนต์หลัก — Azure โต ~+40% YoY โดย AI services มีสัดส่วนการโตเพิ่มขึ้นต่อเนื่อง และ demand ยังเกิน capacity",
            "trend": "up"
          },
          {
            "name": "More Personal Computing (Windows, Gaming/Xbox, Search & Ads)",
            "sharePct": 20,
            "growthNote": "โตช้า (หลักหน่วย) — Windows/Gaming เป็นวัฏจักร แต่เป็นฐานผู้ใช้สำหรับกระจาย Copilot สู่ consumer",
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
            "evidence": "Azure โต ~+40% YoY ต่อเนื่องหลายไตรมาส โดยผู้บริหารระบุว่า AI เป็นตัวเร่งหลักและ demand ยังเกิน supply — backlog ระดับ ~$392B คือหลักฐานเชิงสัญญาที่จับต้องได้"
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
            "evidence": "capex รวม finance lease เร่งขึ้นสู่ระดับ ~$35B/ไตรมาส และบริษัทยังบอกว่า capacity ไม่พอขายไปถึงอย่างน้อยกลางปี 2026 — ปัญหาคือ 'สร้างไม่ทัน' ไม่ใช่ 'ไม่มีคนซื้อ'"
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
        "level": "premium",
        "note": "forward P/E ~30x บนกำไรที่โต ~mid-to-high teens — แพงกว่าตลาดแต่ถูกกว่าหุ้น AI แท้หลายตัว และถูกกว่าค่าเฉลี่ยตัวเองช่วงพีคปี 2024-2025 หลังหุ้น underperform กลุ่ม Mag7 ในปี 2025 จากความกังวลเรื่อง capex/OpenAI; เหมาะกับการทยอยสะสมมากกว่ารอของถูก เพราะคุณภาพระดับนี้แทบไม่เคยลดราคาแรง"
      },
      "whatChanged": [
        {
          "metric": "การเติบโตของ Azure",
          "prev": "~+39% YoY (Q4 FY25)",
          "now": "~+40% YoY (Q1 FY26)",
          "direction": "positive"
        },
        {
          "metric": "Commercial RPO (backlog)",
          "prev": "~$368B",
          "now": "~$392B (โต ~+50% YoY)",
          "direction": "positive"
        },
        {
          "metric": "CapEx รวม finance lease",
          "prev": "~$24B/ไตรมาส",
          "now": "~$35B/ไตรมาส และ guide เพิ่มต่อ",
          "direction": "neutral"
        },
        {
          "metric": "สถานะดีล OpenAI",
          "prev": "สัญญาแบบเดิม สิทธิ์คลุมเครือ เป็น overhang ของหุ้น",
          "now": "ถือหุ้น ~27% ใน OpenAI PBC + OpenAI ผูกซื้อ Azure เพิ่ม ~$250B + สิทธิ์ IP ถึง ~2032",
          "direction": "positive"
        },
        {
          "metric": "Operating margin",
          "prev": "~45%",
          "now": "~49%",
          "direction": "positive"
        },
        {
          "metric": "พันธมิตรโมเดล AI",
          "prev": "พึ่งพา OpenAI เป็นหลักค่ายเดียว",
          "now": "เพิ่ม Anthropic — สัญญาซื้อ Azure ~$30B + Claude เข้า Copilot + MSFT ลงทุนสูงสุด ~$5B",
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
      "asOf": "2026-01",
      "history": {
        "fyNote": "ปีบัญชีของ Microsoft สิ้นสุด 30 มิ.ย. (เช่น FY2025 = ก.ค. 2024 – มิ.ย. 2025) — FY2026 สิ้นสุดแล้วแต่จะประกาศผลวันที่ 29 ก.ค. 2026 จึงยังไม่นับรวม ใช้ FY2021–FY2025",
        "epsBasis": "diluted GAAP, split-adjusted (ไม่มี split ตั้งแต่ปี 2003 — ตัวเลขตามงบจริงคือฐานหุ้นปัจจุบันอยู่แล้ว)",
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
          }
        ],
        "notes": "ตัวเลขงบตรงกับ 8-K/10-K ของ SEC และ stockanalysis.com; FCF = กระแสเงินสดจากการดำเนินงาน ลบ capex (PP&E) — FY2024–FY2025 capex พุ่งจากการลงทุน AI/data center ($44.5B → $64.6B) กด FCF ทั้งที่กำไรโต; ราคาปิดสิ้นปีบัญชีเป็นราคาปิดจริง (raw close) จาก Yahoo Finance ไม่ใช่ราคาปรับเงินปันผล (แหล่งอย่าง StatMuse แสดงราคาปรับปันผลซึ่งต่ำกว่า ~2-4%); จำนวนหุ้น diluted โดยนัยลดลงช้า ๆ จาก ~7.6B เหลือ ~7.5B ตาม buyback สอดคล้องทุกปี; ไม่มี stock split ในช่วงนี้",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/789019/000095017025100226/msft-ex99_1.htm",
          "https://stockanalysis.com/stocks/msft/financials/",
          "https://query1.finance.yahoo.com/v8/finance/chart/MSFT (raw daily closes)",
          "https://news.microsoft.com/source/2026/07/08/microsoft-announces-quarterly-earnings-release-date-68/",
          "https://www.statmuse.com/money/ask/msft-closing-price-on-june-30-2021 (cross-check, dividend-adjusted)"
        ]
      },
      "nextEarnings": "2026-07-29"
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
          "current": "~+26% YoY (Q3 2025) และเร่งขึ้นจาก ~+22% ไตรมาสก่อน",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "บริษัทขนาดรายได้ ~$190B+/ปี ที่ยังโตกว่า 20% และ \"เร่งขึ้น\" เป็นเรื่องหายาก — แรงขับหลักคือ AI ranking ทำให้ทั้งจำนวน impression (~+14%) และราคาต่อโฆษณา (~+10%) โตพร้อมกัน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น",
          "current": "underlying ~+20% YoY แต่ GAAP Q3 2025 โดนภาษีครั้งเดียว ~$16B กดเหลือ ~$1.05",
          "trend": "flat",
          "score": 70,
          "impact": "positive",
          "why": "กำไรจากธุรกิจจริงยังโตแข็งแรง (ex-item EPS ~$7.2) แต่ปี 2026 จะเจอแรงกดจากค่าเสื่อมราคา datacenter และค่าใช้จ่าย AI talent ที่บริษัทเตือนเองว่าจะ \"โตขึ้นอย่างมีนัยสำคัญ\" — จึงให้คะแนนดีแต่ไม่สูงสุด"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "~$30-40B/ปี และกำลังหดตัวจาก CapEx ที่พุ่งแรง",
          "trend": "down",
          "score": 50,
          "impact": "negative",
          "why": "Operating cash flow ยังแข็งแรงมาก แต่ CapEx ~$70B+ ปี 2025 (และมากกว่านั้นชัดเจนปี 2026) กัด FCF ลงจากจุดสูง ~$54B ปี 2024 — นี่คือจุดที่ตลาดกังวลที่สุดหลังงบ Q3 2025 และเป็นตัวชี้วัดสำคัญที่ต้องตามดู"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin รวม ~40% (FoA ~50%+, Reality Labs ขาดทุน ~$4-5B/ไตรมาส)",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "Margin ของธุรกิจหลักอยู่ระดับดีที่สุดในโลกอินเทอร์เน็ต และฟื้นจากยุค \"Year of Efficiency\" ได้อย่างถาวร — แต่ค่าเสื่อมจาก AI infra จะเริ่มกดลงทีละน้อยตั้งแต่ปี 2026"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูง ~25%+ แต่มีทิศทางลดลงเมื่อฐานเงินลงทุนบวมจาก AI CapEx",
          "trend": "down",
          "score": 70,
          "impact": "neutral",
          "why": "ธุรกิจโฆษณาเดิมให้ ROIC สูงมาก แต่เงินลงทุนก้อนใหม่หลายหมื่นล้านดอลลาร์ยังไม่มีรายได้รองรับเต็มที่ — ROIC ระยะ 2-3 ปีข้างหน้าขึ้นกับว่า monetize Meta AI และ Business AI ได้จริงแค่ไหน"
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
          "current": "หนี้รวมเพิ่มเป็น ~$55-60B หลังออกหุ้นกู้ ~$30B ปลายปี 2025 + JV financing โครงการ Hyperion ~$27B",
          "trend": "down",
          "score": 68,
          "impact": "neutral",
          "why": "จากบริษัทแทบไม่มีหนี้ กลายเป็นผู้ออกหุ้นกู้รายใหญ่ที่สุดรายหนึ่งของปี 2025 — สัดส่วนหนี้ต่อ EBITDA ยังต่ำและจัดการได้สบาย แต่ทิศทางคือก่อหนี้เพิ่มเพื่อ AI ซึ่งลดความยืดหยุ่นลงหากวงจร AI สะดุด"
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
          "current": "เทน้ำหนักเกือบทั้งหมดไปที่ AI CapEx + R&D; buyback และปันผลยังทำต่อเนื่อง",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "ประวัติที่ผ่านมาดี (Year of Efficiency พิสูจน์วินัย) แต่การประกาศว่า CapEx ปี 2026 จะ \"ใหญ่ขึ้นอย่างมีนัยสำคัญ\" จาก ~$70-72B คือการเดิมพันที่ยังพิสูจน์ผลตอบแทนไม่ได้ — ความเสี่ยง overbuild มีจริง จึงให้คะแนนกลาง"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~20-22x ต่ำสุดในกลุ่ม Mag7 สาย AI หลังหุ้นย่อแรงจากความกังวล CapEx",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "จ่าย ~20 เท่าให้บริษัทที่รายได้โต ~26% และมี AI optionality หลายชั้น ถือว่าน่าสนใจเชิงเปรียบเทียบ — ส่วนลดนี้คือ \"ค่าประกัน\" ที่ตลาดเก็บจากความไม่แน่นอนเรื่อง CapEx ซึ่งนักลงทุนระยะยาวรับได้"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 80,
        "recurringPct": null,
        "note": "รายได้โฆษณาไม่ใช่สัญญา recurring ตามนิยาม แต่พฤติกรรมใกล้เคียง — ผู้ลงโฆษณาหลายสิบล้านรายกลับมาซื้อซ้ำเพราะ ROI วัดผลได้ และการเติบโตกลับมาเร่งตัว (~+22% → ~+26%) โดยโตทั้งปริมาณและราคา; จุดอ่อนคือรายได้กระจุกในโฆษณาเกือบทั้งหมด อ่อนไหวต่อวัฏจักรเศรษฐกิจมากกว่า cloud/software",
        "segments": [
          {
            "name": "โฆษณา Family of Apps (Facebook, Instagram, WhatsApp, Messenger)",
            "sharePct": 97,
            "growthNote": "~+26% YoY — AI ranking เพิ่มเวลาใช้งาน, Advantage+ เพิ่ม conversion, ราคาต่อโฆษณา ~+10%",
            "trend": "up"
          },
          {
            "name": "รายได้อื่นของ FoA (WhatsApp Business, Meta Verified)",
            "sharePct": 1.5,
            "growthNote": "โตเร็วมากจากฐานเล็ก — click-to-message และ Business AI คือ upside ระยะยาวของ WhatsApp",
            "trend": "up"
          },
          {
            "name": "Reality Labs (Quest, แว่น Ray-Ban Meta / Oakley Meta)",
            "sharePct": 1.5,
            "growthNote": "แว่น AI ขายเติบโตหลายเท่าตัวและเปิดรุ่น Display แล้ว แต่ Quest ทรงตัว — segment ยังขาดทุน ~$17-20B/ปี",
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
            "evidence": "เห็นผลในงบแล้วจริง — รายได้เร่งขึ้นเป็น ~+26% YoY โดยราคาต่อโฆษณาโต ~+10% พร้อมปริมาณ ~+14%; นี่คือ AI monetization ที่จับต้องได้ที่สุดในกลุ่ม Mag7"
          },
          {
            "item": "Meta AI assistant กระจายผ่าน 4 แอปหลัก",
            "status": "executing",
            "evidence": "ผู้ใช้ ~1 พันล้านคน/เดือน — ได้ distribution แล้วแต่ยังไม่เริ่ม monetize จริงจัง; แผนโฆษณา/subscription ใน Meta AI คือ upside ที่ยังไม่อยู่ในประมาณการ"
          },
          {
            "item": "Superintelligence Labs + โมเดล frontier (Llama)",
            "status": "at-risk",
            "evidence": "Llama 4 ได้เสียงตอบรับต่ำกว่าคาด, โมเดลใหญ่ (Behemoth) ล่าช้า, ต้องทุ่มเงินซื้อทีม (ลงทุน Scale AI ~$14B, ดึง talent ด้วยแพ็กเกจมหาศาล) — ทีมใหม่ยังไม่มีผลงานพิสูจน์ว่าตามทัน Google/OpenAI"
          },
          {
            "item": "AI infrastructure — Prometheus, Hyperion (หลาย GW), ชิป MTIA, ดีลเช่า cloud (Google, CoreWeave, Oracle)",
            "status": "on-track",
            "evidence": "คลัสเตอร์ระดับกิกะวัตต์กำลังก่อสร้างตามแผน ใช้ทั้งสร้างเอง+เช่า+JV financing — ความเสี่ยงไม่ใช่การส่งมอบ แต่คือขนาดของเงิน (CapEx ปี 2026 \"ใหญ่ขึ้นอย่างมีนัยสำคัญ\" จาก ~$70-72B)"
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
        "level": "fair",
        "note": "~20-22x forward P/E ถูกสุดในกลุ่ม Mag7 สาย AI ทั้งที่รายได้โต ~26% — ส่วนลดสะท้อนความกลัว CapEx/FCF หด ไม่ใช่ปัญหาธุรกิจหลัก; สำหรับนักลงทุนระยะยาวที่รับความผันผวนจากรอบลงทุนได้ ถือว่า risk/reward อยู่ฝั่งบวก แต่ไม่ใช่ของถูกแบบไร้เงื่อนไข เพราะกำไรปี 2026 จะโดนค่าเสื่อมและค่าใช้จ่าย AI กดจริง"
      },
      "whatChanged": [
        {
          "metric": "การเติบโตรายได้ YoY",
          "prev": "~+22% (Q2 2025)",
          "now": "~+26% (Q3 2025)",
          "direction": "positive"
        },
        {
          "metric": "CapEx guidance",
          "prev": "ปี 2025 ~$66-72B",
          "now": "ปี 2025 ~$70-72B + เตือนปี 2026 \"ใหญ่ขึ้นอย่างมีนัยสำคัญ\"",
          "direction": "negative"
        },
        {
          "metric": "GAAP EPS",
          "prev": "~$7.1 (Q2 2025)",
          "now": "~$1.05 (Q3 2025) จากภาษีครั้งเดียว ~$16B; ex-item ~$7.25 ยังโตดี",
          "direction": "neutral"
        },
        {
          "metric": "ผู้ใช้ Meta AI",
          "prev": "หลายร้อยล้านคน/เดือน",
          "now": "~1 พันล้านคน/เดือน",
          "direction": "positive"
        },
        {
          "metric": "โครงสร้างเงินทุน",
          "prev": "หนี้ต่ำ ~$29B แทบไม่กู้เพิ่ม",
          "now": "ออกหุ้นกู้ ~$30B (ดีลใหญ่สุดของปี) + JV financing ~$27B สำหรับ Hyperion",
          "direction": "negative"
        },
        {
          "metric": "ท่าทีตลาดต่อหุ้น",
          "prev": "หุ้นแถวจุดสูงสุด ตลาดเชียร์ AI story",
          "now": "หุ้นย่อแรง ~10%+ หลังงบ Q3 จากความกังวล CapEx — valuation ถูกลงชัดเจน",
          "direction": "neutral"
        }
      ],
      "risks": [
        "AI overbuild: CapEx ระดับ $100B+/ปี สร้างค่าเสื่อมและ fixed cost มหาศาล — ถ้ารายได้จาก AI (Meta AI, Business AI) มาไม่ทัน กำไรและ FCF จะโดนกดหลายปี และตลาดจะลงโทษ multiple แรง",
        "ความสามารถแข่งขันโมเดล frontier: Llama ตามหลัง Gemini/GPT และ Superintelligence Labs ยังไม่มีผลงาน — ถ้าซื้อ talent แพงมหาศาลแล้วยังตามไม่ทัน จะกลายเป็นทั้งต้นทุนจมและความเสี่ยงเชิงกลยุทธ์ระยะยาว",
        "กฎระเบียบ: EU (DMA, ระบบโฆษณา less-personalized) กดดันรายได้ยุโรป และคดีความด้านความปลอดภัยเยาวชนในสหรัฐยังเป็น overhang แม้ชนะคดีผูกขาด FTC แล้ว",
        "รายได้กระจุกในโฆษณา ~98%: อ่อนไหวต่อเศรษฐกิจถดถอยมากกว่าบริษัทที่มีรายได้ cloud/subscription และ engagement เสี่ยงถูกดึงโดยแอป AI-native รุ่นใหม่ (เช่น ผลิตภัณฑ์ consumer ของ OpenAI)",
        "ภาระหนี้และ commitment นอกงบดุลที่โตเร็ว: ลดความยืดหยุ่นทางการเงินหากวงจรลงทุน AI ทั้งอุตสาหกรรมสะดุดพร้อมกัน"
      ],
      "asOf": "2026-01",
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
        ]
      },
      "nextEarnings": "2026-07-29"
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
          "current": "~+13% YoY (AWS ~+20%, โฆษณา ~+24%)",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "รายได้รวมโตสองหลักต้น ๆ อย่างสม่ำเสมอสำหรับบริษัทขนาด ~$650B+/ปี โดยเครื่องยนต์คุณภาพสูงคือ AWS ที่เร่งจาก ~+17% เป็น ~+20% และโฆษณาที่โตกว่า ~+20% ทั้งคู่โตเร็วกว่าธุรกิจค้าปลีกและมี margin สูงกว่ามาก"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "โตแรงกว่า ~+30% YoY (มีกำไรพิเศษจากมูลค่าหุ้น Anthropic ช่วยหนุน)",
          "trend": "up",
          "score": 74,
          "impact": "positive",
          "why": "กำไรจากการดำเนินงานโตเร็วกว่ารายได้หลายปีติดจาก margin ที่ขยายทั้งฝั่ง AWS และค้าปลีก แม้ไตรมาสล่าสุดมีค่าใช้จ่ายครั้งเดียว (ค่าปรับ FTC, ค่าชดเชยพนักงาน) แต่กำไรพื้นฐานยังแข็งแรง และมูลค่าหุ้น Anthropic ที่ถือไว้สร้างกำไรพิเศษก้อนใหญ่"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "TTM เหลือ ~$15B ลดลงแรงจากปีก่อน",
          "trend": "down",
          "score": 40,
          "impact": "negative",
          "why": "CapEx ระดับ ~$125B ในปี 2025 กดให้ FCF หดลงมากจากจุดสูงสุดราว ~$45B+ นี่คือการแลก cash flow วันนี้กับ capacity ของ AI ในอนาคต — ยอมรับได้ถ้า AWS โตต่อ แต่เป็นจุดอ่อนเชิงตัวเลขที่ชัดที่สุดของงบตอนนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~10-11% (AWS ~30% กลาง ๆ, ค้าปลีกขยายต่อเนื่อง)",
          "trend": "up",
          "score": 65,
          "impact": "positive",
          "why": "margin โครงสร้างดีขึ้นชัดเจนหลายปีติดจาก mix ที่เอียงไปทาง AWS/โฆษณา และประสิทธิภาพ fulfillment จาก robotics แม้ค่าเสื่อมจาก data center ที่กำลังพุ่งจะเป็นแรงกดในปีถัด ๆ ไป"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "~10%+ และถูกกดชั่วคราวจากฐานสินทรัพย์ที่โตเร็วมาก",
          "trend": "flat",
          "score": 58,
          "impact": "neutral",
          "why": "ROIC ดีขึ้นจากยุคขาดทุนค้าปลีก แต่การเทเงินลงทุนมหาศาลเข้า data center ทำให้ฐานทุนโตเร็วกว่ากำไรในระยะสั้น — ต้องรอพิสูจน์ว่า AI capacity เหล่านี้สร้างผลตอบแทนตามคาด ซึ่ง backlog ที่ล็อกไว้ช่วยลดความเสี่ยงนี้ได้มาก"
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
          "current": "CapEx ~$125B ปี 2025 (และมีแผนสูงขึ้นอีกปี 2026) เทไปที่ AWS/AI เกือบทั้งหมด",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "เลือกเทเงินเข้าโอกาสที่ใหญ่ที่สุดในรอบทศวรรษแทนการคืนเงินผู้ถือหุ้น — ดีล Anthropic ที่มูลค่างอกหลายเท่าและ AWS ที่เร่งตัวเป็นหลักฐานว่าการตัดสินใจนี้เริ่มออกดอกผล แม้ไม่มีปันผล/buyback เป็นตัวช่วยพยุงหุ้น"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~30x, market cap ~$2.4T",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ไม่ถูกแต่ก็ไม่แพงเกินไปเทียบ big tech AI ด้วยกัน — ตลาดยังให้ค่า AWS ต่ำกว่ามูลค่าที่ควรเป็นถ้าแยกบริษัท แต่ FCF ที่บางจาก CapEx ทำให้มูลค่าบนฐาน cash flow ดูตึง ราคาปัจจุบันเหมาะกับการถือยาวมากกว่าการหวังกำไรเร็ว"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 80,
        "recurringPct": 30,
        "note": "รายได้รวมโตสม่ำเสมอราว ~+11-13% ต่อไตรมาสมาหลายปี โดยส่วนที่กำลังเร่งคือ AWS และโฆษณา ซึ่งเป็นรายได้คุณภาพสูงสุดของบริษัท ส่วนที่นับเป็น recurring ชัดเจน (AWS + Subscription) อยู่ราว ~25-30% ของรายได้ แต่คิดเป็นสัดส่วนกำไรที่สูงกว่านั้นมาก ค้าปลีกผันผวนตามผู้บริโภคแต่มี Prime membership ช่วยตรึงความถี่การซื้อ",
        "segments": [
          {
            "name": "Online Stores",
            "sharePct": 37,
            "growthNote": "โตช้า ~หลัก 1 หลักปลาย ๆ ต่อปี แต่เป็นฐาน traffic ของ flywheel ทั้งหมด",
            "trend": "flat"
          },
          {
            "name": "Third-Party Seller Services",
            "sharePct": 24,
            "growthNote": "โต ~+10% ขึ้นไป margin ดีกว่าขายเอง และโตตาม marketplace ที่ขยายตัว",
            "trend": "up"
          },
          {
            "name": "AWS",
            "sharePct": 18,
            "growthNote": "เร่งตัวสู่ ~+20% YoY จากดีมานด์ AI, backlog ~$200B — เครื่องยนต์กำไรหลักของบริษัท",
            "trend": "up"
          },
          {
            "name": "Advertising",
            "sharePct": 10,
            "growthNote": "โต ~+20% กว่า ๆ ต่อเนื่อง margin สูงมาก และได้แรงหนุนจากโฆษณาใน Prime Video",
            "trend": "up"
          },
          {
            "name": "Subscription Services",
            "sharePct": 7,
            "growthNote": "Prime และบริการสมาชิกโตสองหลักต้น ๆ เป็นรายได้ recurring ที่เหนียวแน่น",
            "trend": "up"
          },
          {
            "name": "Physical Stores และอื่น ๆ",
            "sharePct": 4,
            "growthNote": "โตช้า ไม่ใช่ตัวขับเคลื่อนหลักของ thesis",
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
            "evidence": "การเติบโต AWS เร่งจาก ~+17% เป็น ~+20% YoY ในไตรมาสล่าสุดที่รายงาน พร้อม backlog ~$200B ที่โตกว่า ~+20% YoY — เป็นหลักฐานตรงที่สุดว่า capacity ที่ลงทุนไปขายได้จริง"
          },
          {
            "item": "ชิป Trainium และ Project Rainier",
            "status": "executing",
            "evidence": "คลัสเตอร์ Trainium2 หลายแสนชิปสำหรับ Anthropic เปิดใช้งานจริงแล้วและกำลังขยายต่อ พร้อมเปิดตัว Trainium3 — custom silicon ช่วยลดต้นทุนต่อ token และลดการพึ่งพา NVIDIA อย่างเป็นรูปธรรม"
          },
          {
            "item": "พันธมิตร Anthropic + ดีล OpenAI",
            "status": "executing",
            "evidence": "ลงทุนใน Anthropic รวม ~$8B และเป็น cloud หลักในการเทรนโมเดล ล่าสุดยังปิดดีลให้ OpenAI ใช้ AWS มูลค่า ~$38B หลายปี — ล็อกลูกค้า AI ระดับ frontier ไว้ได้ทั้งสองค่าย"
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
        "note": "ที่ market cap ~$2.4T และ forward P/E ~30x AMZN ซื้อขายแถวค่าเฉลี่ยของ big tech AI — ไม่ได้ถูก แต่ตลาดยังคิดมูลค่า AWS แบบรวม ๆ กับค้าปลีก ทั้งที่ AWS เดี่ยว ๆ ควรได้ multiple สูงกว่านี้ ความเสี่ยงฝั่ง valuation คือ FCF ที่บางจาก CapEx ทำให้หุ้นอ่อนไหวต่อข่าว 'AI ลงทุนเกินตัว' มากกว่า peer ที่ FCF หนา เหมาะสะสมเมื่อย่อมากกว่าไล่ราคา"
      },
      "whatChanged": [
        {
          "metric": "การเติบโต AWS (YoY)",
          "prev": "~+17.5%",
          "now": "~+20%",
          "direction": "positive"
        },
        {
          "metric": "AWS backlog",
          "prev": "~$195B",
          "now": "~$200B และยังเร่งขึ้น",
          "direction": "positive"
        },
        {
          "metric": "CapEx guidance ปี 2025",
          "prev": "~$118B",
          "now": "~$125B",
          "direction": "neutral"
        },
        {
          "metric": "ดีลลูกค้า AI ระดับ frontier",
          "prev": "Anthropic เป็น anchor หลักรายเดียว",
          "now": "เพิ่มสัญญา OpenAI-AWS ~$38B หลายปี",
          "direction": "positive"
        },
        {
          "metric": "FCF (TTM)",
          "prev": "~$18B",
          "now": "~$15B",
          "direction": "negative"
        },
        {
          "metric": "โครงสร้างองค์กร",
          "prev": "ยังไม่มีแผนลดคนรอบใหญ่",
          "now": "ประกาศลดพนักงานออฟฟิศ ~14,000 ตำแหน่ง (สื่อรายงานว่าแผนรวมอาจถึง ~30,000)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "CapEx ระดับ ~$125B+/ปี จะกลายเป็นค่าเสื่อมก้อนมหึมาในปี 2026-2028 — ถ้าดีมานด์ AI ชะลอหรือราคาค่าเช่า compute ถูกกดจากการแข่งขัน margin ของ AWS จะโดนบีบสองทาง",
        "การแข่งขัน cloud รุนแรงขึ้น: Azure และ GCP โตเร็วกว่า AWS ต่อเนื่องหลายปี และผู้เล่น GPU cloud เฉพาะทาง (เช่น CoreWeave, Oracle) แย่ง workload AI บางส่วนไป",
        "ผลตอบแทนจาก AI ผูกกับความสำเร็จของลูกค้าไม่กี่ราย — ถ้า Anthropic หรือ OpenAI สะดุดทางการเงินหรือย้าย workload สัญญาก้อนใหญ่ใน backlog อาจไม่แปลงเป็นรายได้ตามคาด",
        "คดี antitrust ของ FTC ที่ฟ้อง Amazon เรื่องผูกขาด marketplace ยังเดินหน้าอยู่ — ผลลัพธ์เลวร้ายสุดอาจกระทบโครงสร้าง flywheel ค้าปลีก/โฆษณา",
        "ธุรกิจค้าปลีกอ่อนไหวต่อกำลังซื้อผู้บริโภคและนโยบายภาษีนำเข้า/ภูมิรัฐศาสตร์ ซึ่งกระทบทั้ง volume และต้นทุนสินค้าจากผู้ขายจีน"
      ],
      "asOf": "2026-01",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ปีปฏิทิน) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลเมื่อ 5 ก.พ. 2026",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับ 20:1 split มิ.ย. 2022 ทุกปี)",
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
        ]
      },
      "nextEarnings": "2026-07-30"
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
          "current": "~+35% YoY (ปี 2025, USD); Q3/2025 ~+40% YoY",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "AI/HPC ดัน demand N3/N5 เต็มกำลังผลิต บริษัทปรับเป้าทั้งปี 2025 ขึ้นเป็นราว mid-30s% ระหว่างปี — โตเร่งขึ้นทั้งที่ฐานรายได้ทะลุ $100B แล้ว"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "~+40% YoY (Q3/2025)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้จาก operating leverage และ margin ที่ขยับขึ้น แม้เจอแรงกดจากค่าเงิน NT$ แข็งและต้นทุน fab ต่างประเทศ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "OCF ระดับ ~$80B+/ปี; FCF เป็นบวกชัดเจนแม้ CapEx ~$40B+",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "เป็นเครื่องจักรผลิตเงินสด — จ่าย CapEx มหาศาลได้จากเงินสดภายในโดยไม่พึ่งหนี้ และยังเหลือจ่ายปันผลเพิ่มขึ้นทุกปี"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross margin ~59-60%, operating margin ~50%",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "สูงเป็นประวัติการณ์สำหรับธุรกิจโรงงานผลิต — สะท้อน pricing power จากการผูกขาด node ขั้นสูง ทั้งที่โดน dilution จาก fab สหรัฐ/ญี่ปุ่นราว 2-3 จุด"
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
          "current": "Forward P/E ~20-25x",
          "trend": "flat",
          "score": 68,
          "impact": "positive",
          "why": "ถูกเมื่อเทียบกับคุณภาพ+การเติบโต ~30% และถูกกว่าหุ้น AI สหรัฐแทบทุกตัว — ส่วนลดหลักมาจากความเสี่ยงไต้หวัน ซึ่งเป็นสิ่งที่ต้องติดตาม ไม่ใช่เหตุผลให้หนี"
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
            "sharePct": 57,
            "growthNote": "เครื่องยนต์หลักของบริษัท — AI accelerator คาดโต ~mid-40s% CAGR ถึง 2029",
            "trend": "up"
          },
          {
            "name": "Smartphone",
            "sharePct": 30,
            "growthNote": "iPhone/Android เรือธงใช้ N3 — โตตามฤดูกาล ไม่ใช่ตัวขับหลักอีกต่อไป",
            "trend": "flat"
          },
          {
            "name": "IoT",
            "sharePct": 5,
            "growthNote": "ทรงตัว รอ edge AI เป็นตัวจุดรอบใหม่",
            "trend": "flat"
          },
          {
            "name": "Automotive",
            "sharePct": 5,
            "growthNote": "ฟื้นตัวช้า แต่ content ชิปต่อคันเพิ่มขึ้นในระยะยาว",
            "trend": "flat"
          },
          {
            "name": "DCE และอื่นๆ",
            "sharePct": 3,
            "growthNote": "สัดส่วนเล็ก ไม่มีนัยยะต่อภาพรวม",
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
            "evidence": "รายได้ AI accelerator เพิ่มราวเท่าตัวในปี 2025 ตามที่ประกาศไว้ และบริษัทยืนเป้า CAGR ~mid-40s% ถึง 2029 — ลูกค้าชิป AI หลักของโลกทุกรายผลิตที่ TSMC"
          },
          {
            "item": "N2 (2nm) เข้าสู่ volume production",
            "status": "executing",
            "evidence": "เริ่มผลิตจำนวนมากช่วง H2/2025 ตามแผน จำนวน tape-out สูงกว่า N3 ณ จุดเดียวกันของวัฏจักร — มีแนวโน้มเป็น node ที่ ramp เร็วที่สุดในประวัติศาสตร์บริษัท"
          },
          {
            "item": "Advanced packaging (CoWoS / SoIC)",
            "status": "executing",
            "evidence": "ขยายกำลังผลิตราวเท่าตัวติดต่อกันหลายปีแต่ demand ยังล้น — เป็นคอขวดของ AI ทั้งอุตสาหกรรมที่ TSMC เป็นผู้ควบคุม"
          },
          {
            "item": "ขยายกำลังผลิตทั่วโลก (Arizona ~$165B, Japan, Germany)",
            "status": "on-track",
            "evidence": "Fab แรกที่ Arizona ผลิตเชิงพาณิชย์แล้วด้วย yield ใกล้เคียงไต้หวัน — ลดความเสี่ยงภูมิรัฐศาสตร์และตอบโจทย์ลูกค้า/รัฐบาลสหรัฐ"
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
        "note": "Forward P/E ~20-25x สำหรับบริษัทที่รายได้โต ~30%+ margin ~60% และผูกขาดคอขวดของ AI ทั้งโลก — ถูกกว่าหุ้น AI สหรัฐแทบทุกตัว ส่วนลดที่เห็นสะท้อนความเสี่ยงไต้หวันเป็นหลัก ไม่ใช่ปัญหาพื้นฐานธุรกิจ"
      },
      "whatChanged": [
        {
          "metric": "รายได้รายไตรมาส (USD)",
          "prev": "~$30B (Q2/2025, ~+44% YoY)",
          "now": "~$33B (Q3/2025, ~+40% YoY)",
          "direction": "positive"
        },
        {
          "metric": "Gross margin",
          "prev": "~58.6% (Q2/2025)",
          "now": "~59.5% (Q3/2025)",
          "direction": "positive"
        },
        {
          "metric": "เป้ารายได้ทั้งปี 2025",
          "prev": "~+30% YoY",
          "now": "ปรับขึ้นเป็น ~mid-30s% YoY",
          "direction": "positive"
        },
        {
          "metric": "สถานะ N2 (2nm)",
          "prev": "เตรียมการผลิต / รับ tape-out",
          "now": "เข้าสู่ volume production ปลายปี 2025; tape-out มากกว่า N3 ณ จุดเดียวกัน",
          "direction": "positive"
        },
        {
          "metric": "สัดส่วนรายได้ HPC",
          "prev": "~60% (Q2/2025)",
          "now": "~57% (Q3/2025 — smartphone ฟื้นตามฤดูกาล iPhone)",
          "direction": "neutral"
        },
        {
          "metric": "CapEx guidance ปี 2025",
          "prev": "กรอบ ~$38-42B",
          "now": "ยืนยันโซนบนของกรอบ ~$40-42B",
          "direction": "positive"
        }
      ],
      "risks": [
        "ความเสี่ยงไต้หวัน-จีน: ความขัดแย้งหรือการปิดล้อมคือ tail risk ที่ทำลายมูลค่าได้ทันที และเป็นเหตุผลหลักของ valuation discount ตลอดกาลของหุ้นนี้",
        "นโยบายสหรัฐ: ภาษีนำเข้าชิป (Section 232), export control ต่อจีน และแรงกดดันให้ย้ายฐานการผลิต — เพิ่มทั้งต้นทุนและความไม่แน่นอนเชิงนโยบาย",
        "วัฏจักร AI capex: รายได้พึ่ง AI accelerator มากขึ้นเรื่อยๆ — หาก hyperscaler ชะลอการลงทุนพร้อมกัน ผลกระทบจะแรงและเร็ว",
        "การกระจุกตัวของลูกค้า: Apple และ Nvidia รวมกันคิดเป็นสัดส่วนรายได้ที่สูงมาก อำนาจต่อรองและชะตากรรมผูกกันแน่น",
        "ค่าเงิน NT$ แข็งและ margin dilution จาก fab ต่างประเทศ กัด gross margin ต่อเนื่องราว 2-4 จุดในปีข้างหน้า"
      ],
      "asOf": "2026-01",
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
        ]
      },
      "nextEarnings": "2026-10"
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
          "Infrastructure Software (VMware, CA, Symantec) ~40%+ ของรายได้ เป็น subscription margin สูง สร้าง FCF สม่ำเสมอไว้รองรับช่วง semis เป็นวัฏจักร",
          "Hock Tan คือหนึ่งในผู้จัดสรรทุนที่ดีที่สุดในอุตสาหกรรม — M&A ที่สร้างมูลค่าจริง + ปันผลโตต่อเนื่องทุกปี",
          "FCF margin ~40% สูงระดับแนวหน้าของกลุ่ม semiconductor ทำให้รองรับหนี้และคืนทุนผู้ถือหุ้นได้พร้อมกัน"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+22-25% YoY (FY2025 ~$63B) และมีแนวโน้มเร่งขึ้นใน FY2026",
          "trend": "up",
          "score": 87,
          "impact": "positive",
          "why": "รายได้ AI semiconductor โต ~+60% YoY เป็นเครื่องยนต์หลัก ขณะที่ non-AI semis ผ่านจุดต่ำสุดของวัฏจักรแล้ว และ backlog คำสั่งซื้อระดับแสนล้านดอลลาร์ให้ visibility หลายปี"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "~+30-35% YoY (non-GAAP) โตเร็วกว่ารายได้",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "Operating leverage จากธุรกิจชิป บวก margin ของ VMware ที่ขยายขึ้นมากหลัง integration ทำให้กำไรโตเร็วกว่ารายได้อย่างต่อเนื่อง"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "~$25B+/ปี, FCF margin ~40%",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "โมเดล fabless + ซอฟต์แวร์ subscription ทำให้แปลงรายได้เป็นเงินสดได้ในอัตราสูงสุดกลุ่ม เพียงพอทั้งจ่ายปันผล ลดหนี้ และลงทุน R&D พร้อมกัน"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross ~77%, EBITDA ~66% (non-GAAP)",
          "trend": "flat",
          "score": 88,
          "impact": "positive",
          "why": "ซอฟต์แวร์ margin สูงมากช่วยพยุงภาพรวม แม้สัดส่วน XPU ที่เพิ่มขึ้นจะกด gross margin ฝั่งชิปลงเล็กน้อย แต่ EBITDA margin โดยรวมยังทรงตัวในระดับสูงมาก"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงในเชิงเงินสดจริง แต่ GAAP ROIC ถูกกดด้วย goodwill จากดีลใหญ่",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "ดีล VMware สร้าง goodwill ก้อนใหญ่ทำให้ตัวเลขบัญชีดูต่ำ แต่ผลตอบแทนเงินสดจากดีลที่ผ่านมา (CA, Symantec, VMware) พิสูจน์แล้วว่าสูงและกำลังดีขึ้นตาม synergy ที่รับรู้"
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
          "current": "หนี้รวม ~$60-70B จากดีล VMware ทยอยลดลงต่อเนื่อง",
          "trend": "down",
          "score": 55,
          "impact": "neutral",
          "why": "หนี้สูงเป็นมรดกจากการซื้อ VMware แต่ FCF ~$25B+/ปีครอบคลุมได้สบาย อันดับเครดิตยัง investment grade และบริษัทมีวินัยลดหนี้ชัดเจน — จับตาถ้ามี M&A ใหญ่รอบใหม่"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "SBC สูง (หลายพันล้านดอลลาร์/ปี) จำนวนหุ้นเพิ่มขึ้นเล็กน้อยทุกปี",
          "trend": "flat",
          "score": 45,
          "impact": "negative",
          "why": "หุ้นที่ออกจากดีล VMware บวก stock-based comp ระดับสูง ทำให้จำนวนหุ้นยังเพิ่มสุทธิ buyback ที่ทำอยู่ชดเชยได้เพียงบางส่วน เป็นจุดอ่อนเชิงโครงสร้างที่ต้องติดตาม"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "M&A แม่นยำ + ปันผลโต ~10%/ปี + ลดหนี้อย่างมีวินัย",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "Track record ของ Hock Tan ในการซื้อกิจการแล้วรีดมูลค่า (CA, Symantec, VMware) คือระดับตำนาน และการคืนทุนผ่านปันผลที่โตทุกปีต่อเนื่องกว่าทศวรรษสะท้อนวินัยที่หายากในกลุ่ม semis"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "Forward P/E ~40x+ สูงกว่าค่าเฉลี่ยในอดีตของตัวเองมาก",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "ตลาดรับรู้เรื่อง AI และดีล OpenAI ไปมากแล้ว ราคาปัจจุบันต้องการให้บริษัทส่งมอบการเติบโตตามแผนหลายปีติดต่อกันจึงจะคุ้ม — ไม่ถูก แต่มี backlog รองรับความคาดหวังมากกว่าหุ้น AI ส่วนใหญ่"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 88,
        "recurringPct": 45,
        "note": "คุณภาพรายได้อยู่ในระดับดีมาก — ฝั่ง AI มี backlog และสัญญาผูกพันหลายปีให้ visibility สูงผิดปกติสำหรับธุรกิจชิป ฝั่งซอฟต์แวร์ ~40%+ เป็น subscription recurring ที่ churn ต่ำมาก จุดอ่อนเดียวคือ non-AI semis ที่ยังเป็นวัฏจักรและการกระจุกตัวของลูกค้า AI รายใหญ่ไม่กี่ราย",
        "segments": [
          {
            "name": "AI Semiconductors (custom XPU + AI networking)",
            "sharePct": 33,
            "growthNote": "~+60% YoY และเร่งขึ้น — แรงขับหลักจาก TPU ของ Google, ลูกค้า XPU รายใหม่ และ Tomahawk/Jericho สำหรับ AI cluster",
            "trend": "up"
          },
          {
            "name": "Non-AI Semiconductors (broadband, wireless/Apple, storage, industrial)",
            "sharePct": 25,
            "growthNote": "ผ่านจุดต่ำสุดของวัฏจักรแล้ว ทยอยฟื้นแบบช้า ๆ ไม่ใช่ตัวขับเคลื่อนหลักของ thesis",
            "trend": "flat"
          },
          {
            "name": "Infrastructure Software (VMware, CA, Symantec, mainframe)",
            "sharePct": 42,
            "growthNote": "โตเลขหลักเดียวสูงถึงสองหลักจากการแปลง VMware เป็น subscription (VCF) — margin สูงมากและ ARR ยังขยาย",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 92,
        "items": [
          {
            "item": "Custom XPU สำหรับ hyperscaler (Google TPU, Meta MTIA, ByteDance)",
            "status": "executing",
            "evidence": "รายได้ AI ปี FY2025 ~$20B โต ~+60% YoY ต่อเนื่องทุกไตรมาส — Google TPU คือโปรแกรม custom accelerator ที่ใหญ่และสำเร็จที่สุดนอกค่าย NVIDIA"
          },
          {
            "item": "ดีล OpenAI: custom accelerator + networking ระดับ 10 GW",
            "status": "on-track",
            "evidence": "ประกาศเป็นทางการปลายปี 2025 เริ่มส่งมอบ H2 2026 ถึง 2029 พร้อมคำสั่งซื้อเริ่มต้นระดับ ~$10B เข้า backlog แล้ว — เป็น optionality ที่ใหญ่ที่สุดของบริษัทแต่ยังต้องพิสูจน์การส่งมอบจริง"
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
            "evidence": "จับมือ NVIDIA ให้องค์กรรัน AI workload บน private cloud ของตัวเอง — ยังเล็กเทียบฝั่งชิป แต่ช่วยล็อกลูกค้า VMware ให้อยู่ต่อในยุค AI"
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
            "note": "เบอร์หนึ่งตลาด custom AI accelerator (ครองส่วนแบ่งส่วนใหญ่) และ ~80% ของ merchant Ethernet switch silicon — ทั้งสองตลาดกำลังขยายตัวแรง"
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
            "note": "สัญญา XPU หลายปี + backlog ระดับแสนล้านดอลลาร์ + VMware ที่แปลงเป็น subscription ผูกลูกค้าองค์กรระยะยาว"
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
        "score": 85,
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
            "current": "จ่ายระดับ ~$10B+/ปี เพิ่มขึ้นราว ~10%/ปีต่อเนื่องกว่าทศวรรษ",
            "assessment": "good",
            "why": "หายากมากที่หุ้นเติบโต AI จะมีวัฒนธรรมปันผลโตแบบนี้ สะท้อนความมั่นใจใน FCF ระยะยาว"
          },
          {
            "label": "การลดหนี้",
            "current": "ทยอยจ่ายคืนหนี้จากดีล VMware ต่อเนื่องทุกไตรมาส",
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
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "Forward P/E ~40x+ และ EV/FCF สูงกว่าค่าเฉลี่ยในอดีตของตัวเองมาก — ตลาด price in การเร่งตัวของรายได้ AI และดีล OpenAI ไปแล้วส่วนใหญ่ ความแพงนี้พอปกป้องได้ด้วย backlog ที่ให้ visibility หลายปีและสัดส่วนซอฟต์แวร์ recurring แต่ margin of safety ต่ำ หากการส่งมอบสะดุดหรือ AI CapEx cycle ชะลอ ราคามี downside แรง เหมาะทยอยสะสมช่วงย่อมากกว่าไล่ราคา"
      },
      "whatChanged": [
        {
          "metric": "รายได้ AI semiconductor ต่อไตรมาส",
          "prev": "~$5.2B (+~60% YoY) ใน Q3 FY2025",
          "now": "~$6.5B (+~65% YoY) ใน Q4 FY2025",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวมต่อไตรมาส",
          "prev": "~$16B",
          "now": "~$17.5B+ ทำสถิติใหม่",
          "direction": "positive"
        },
        {
          "metric": "สถานะลูกค้า XPU รายที่ 4 (OpenAI)",
          "prev": "คำสั่งซื้อ ~$10B จากลูกค้าที่ยังไม่เปิดชื่อ",
          "now": "ดีลทางการระดับ 10 GW เริ่มส่งมอบ H2 2026 ถึง 2029",
          "direction": "positive"
        },
        {
          "metric": "Backlog รวม",
          "prev": "~$110B (ระดับสูงสุดเป็นประวัติการณ์)",
          "now": "เพิ่มขึ้นต่อเนื่อง ทำสถิติใหม่อีกครั้ง",
          "direction": "positive"
        },
        {
          "metric": "เงินปันผลรายไตรมาส",
          "prev": "$0.59/หุ้น",
          "now": "~$0.65/หุ้น (+~10%)",
          "direction": "positive"
        }
      ],
      "risks": [
        "การกระจุกตัวของลูกค้า — รายได้ AI พึ่งพา hyperscaler เพียงไม่กี่ราย (Google เป็นสัดส่วนใหญ่สุด) หากรายใดรายหนึ่งชะลอ CapEx หรือปรับ roadmap ภายใน ผลกระทบต่อประมาณการจะรุนแรงทันที",
        "ความเสี่ยงการส่งมอบดีล OpenAI — OpenAI ยังขาดทุนหนักและต้องระดมทุนมหาศาลเพื่อสร้าง 10 GW จริง หากเงินทุนสะดุด รายได้ก้อนที่ตลาดคาดหวังใน FY2027+ อาจเลื่อนหรือหดตัว",
        "การตอบโต้ของ NVIDIA และคู่แข่ง custom ASIC — NVIDIA เปิด NVLink Fusion และกดดันด้านราคา/ระบบครบวงจร ขณะที่ Marvell และ MediaTek แย่งชิงดีล XPU รายใหม่",
        "Valuation แพงบนความคาดหวังสูง — หาก AI CapEx cycle ของทั้งอุตสาหกรรมชะลอแม้ชั่วคราว หุ้นที่เทรด ~40x+ จะถูก de-rate แรงกว่าพื้นฐานที่แย่ลงจริง",
        "หนี้สูงจากดีล VMware บวกความเสี่ยง key-man — Hock Tan อายุ 70+ ปี และ thesis ส่วนใหญ่ผูกกับฝีมือการจัดสรรทุนของเขาโดยตรง"
      ],
      "asOf": "2026-01",
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
        "notes": "EPS และราคาหุ้นปรับ 10:1 split (ก.ค. 2024) ให้เป็นฐานปัจจุบันทุกปีแล้ว (เช่น FY2021 EPS ก่อน split = $15.00, FY2022 = $26.53, FY2023 = $32.98) — ตรวจสอบกับ press release ทางการของบริษัทและ stockanalysis.com ตรงกัน; GAAP EPS และ operating margin ของ FY2024-FY2025 ถูกกดต่ำอย่างมากจาก amortization ของ intangibles และค่าใช้จ่ายจากดีล VMware (ปิดดีล พ.ย. 2023) — non-GAAP EPS คร่าว ๆ: FY2024 ~$4.87, FY2025 ~$6.8 สูงกว่า GAAP มาก; จำนวนหุ้น diluted เพิ่มจาก ~4.3 พันล้านหุ้นเป็น ~4.8 พันล้านหุ้นใน FY2024 เพราะออกหุ้นซื้อ VMware (ไม่ใช่ความผิดพลาดของการปรับ split); FCF = OCF ลบ capex (เช่น FY2025 = 27.537-0.623 = 26.9); ราคาสิ้นปีบัญชีใช้ราคาปิดวันซื้อขายสุดท้ายของปีบัญชี (29 ต.ค. 2021, 28 ต.ค. 2022, 27 ต.ค. 2023, 1 พ.ย. 2024, 31 ต.ค. 2025) จาก Yahoo Finance แบบ split-adjusted; ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~2-3%)",
        "sources": [
          "https://stockanalysis.com/stocks/AVGO/financials/",
          "https://stockanalysis.com/stocks/AVGO/financials/cash-flow-statement/",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2022-financial-results-and-quarterly-dividend-301698763.html",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2023-financial-results-and-quarterly-dividend-302009464.html",
          "https://www.prnewswire.com/news-releases/broadcom-inc-announces-fourth-quarter-and-fiscal-year-2025-financial-results-and-quarterly-dividend-302639606.html",
          "https://query1.finance.yahoo.com/v8/finance/chart/AVGO (historical daily closes, split-adjusted)"
        ]
      },
      "nextEarnings": "2026-09-03"
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
          "current": "~+36% YoY (Q3 2025, รายได้ ~$9.2B สถิติใหม่)",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "โตแรงทั้งสามเครื่องยนต์: Data Center ~+22% (ทั้งที่โดนข้อจำกัดส่งออก MI308 ไปจีน), Client & Gaming ~+70% จากการกินส่วนแบ่ง Ryzen — และปี 2026 มี MI450/OpenAI ramp รออยู่ บริษัทตั้งเป้าโต ~35% ต่อปีในงาน Analyst Day"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Non-GAAP EPS ~$1.20 ใน Q3 2025 (~+30% YoY)",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "กำไรฟื้นแรงหลังไตรมาสที่โดน write-down สินค้าคงคลัง MI308 ~$800M ผ่านพ้นไป operating leverage เริ่มทำงาน และผู้บริหารวางเป้า EPS ระยะยาว ~$20 — สูงแต่มีเส้นทางชัดหาก data center AI สเกลจริง"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF รายไตรมาสทำสถิติใหม่ระดับ ~$1.5B+",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "โมเดล fabless ทำให้แปลงกำไรเป็นเงินสดได้ดี แต่ปี 2026 จะถูกกดชั่วคราวจาก working capital (สต๊อกชิป/HBM ล่วงหน้าเพื่อ ramp MI450) — เป็นการลงทุนเพื่อโต ไม่ใช่สัญญาณเสื่อม"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Non-GAAP gross margin ~54%",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "GM ต่ำกว่า NVIDIA (~70%+) ชัดเจน เพราะ Instinct รุ่นแรก ๆ margin ต่ำกว่าค่าเฉลี่ยบริษัทและต้องตั้งราคาแข่ง — คาดค่อย ๆ ดีขึ้นตาม scale และ mix ของ data center แต่ยังไม่ใช่จุดแข็ง"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "กำลังไต่ขึ้น — ยังโดนกดด้วย amortization จากดีล Xilinx",
          "trend": "up",
          "score": 60,
          "impact": "neutral",
          "why": "ROIC แบบ GAAP ดูต่ำเพราะ goodwill/intangibles ก้อนใหญ่จาก Xilinx (~$49B) แต่ผลตอบแทนเชิงเศรษฐกิจจริงกำลังดีขึ้นเร็วตามกำไร data center — ต้องรอ MI450 พิสูจน์ว่า R&D ก้อนโตแปลงเป็นกำไรได้จริง"
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
          "current": "Forward P/E ระดับ ~40-50x หลังหุ้นวิ่งแรงมากจากดีล OpenAI ปี 2025",
          "trend": "down",
          "score": 40,
          "impact": "negative",
          "why": "ราคาปัจจุบัน price-in ความสำเร็จของ MI450/OpenAI ไปมากแล้ว — ถ้าเทียบเป้า EPS ~$20 ระยะยาวยังถือว่ามี upside แต่ margin of safety บาง หาก execution สะดุดแม้ไตรมาสเดียว downside แรง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 68,
        "recurringPct": null,
        "note": "รายได้เป็นแบบขายฮาร์ดแวร์ ไม่ใช่ recurring — แต่คุณภาพดีขึ้นชัดเจน: ดีลหลายปี (OpenAI 6GW, Oracle) ทำให้ visibility ของ data center ยาวขึ้นกว่ายุคที่พึ่ง PC cycle ล้วน ๆ จุดอ่อนคือประวัติความสม่ำเสมอ — ปี 2022-2023 เคยสะดุดแรงจาก PC downturn และ Embedded ยังอยู่ในช่วงระบายสต๊อก",
        "segments": [
          {
            "name": "Data Center (EPYC + Instinct)",
            "sharePct": 46,
            "growthNote": "~+22% YoY ทั้งที่โดนข้อจำกัดส่งออก MI308 ไปจีน — เครื่องยนต์หลักปี 2026 จาก MI350 volume + MI450/Helios ramp ครึ่งปีหลัง",
            "trend": "up"
          },
          {
            "name": "Client & Gaming (Ryzen, Radeon, คอนโซล)",
            "sharePct": 44,
            "growthNote": "~+70% YoY — Ryzen กินส่วนแบ่ง desktop/notebook จาก Intel ต่อเนื่อง บวก AI PC cycle แต่เป็นตลาดวัฏจักร ไม่ควรคาดหวังอัตรานี้ยั่งยืน",
            "trend": "up"
          },
          {
            "name": "Embedded (Xilinx FPGA)",
            "sharePct": 9,
            "growthNote": "ยังหดตัวเล็กน้อย YoY — อยู่ปลายทางของรอบระบายสต๊อก industrial/comms คาดฟื้นช้า ๆ ปี 2026",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 72,
        "items": [
          {
            "item": "Ramp Instinct MI350/MI355X (CDNA 4)",
            "status": "executing",
            "evidence": "เปิดตัวกลางปี 2025 และส่งมอบระดับ volume แล้วให้ hyperscaler หลายราย (Microsoft, Meta, Oracle) — หนุนให้ Data Center Q3 2025 ทำสถิติ ~$4.3B และเป็นฐานก่อนส่งไม้ต่อให้ MI450"
          },
          {
            "item": "MI400 series + Helios rack-scale ปี 2026",
            "status": "on-track",
            "evidence": "เป็นครั้งแรกที่ AMD ขาย 'ทั้งแร็ค' แข่งกับ NVL ของ NVIDIA โดยตรง — ดีไซน์มาจากทีม ZT Systems, มี Oracle สั่ง ~50,000 MI450 และ OpenAI เป็น anchor ยังไม่ถึงกำหนดส่งมอบ จึงยังเป็นความเสี่ยง execution ที่ใหญ่ที่สุดของปี 2026"
          },
          {
            "item": "พันธมิตรเชิงยุทธศาสตร์ OpenAI 6GW",
            "status": "on-track",
            "evidence": "ประกาศ ต.ค. 2025 — deployment แรก ~1GW ด้วย MI450 ครึ่งหลังปี 2026 พร้อม warrant ผูก incentive ระยะยาว เป็นหลักฐานว่าผู้ใช้ compute รายใหญ่สุดของโลกต้องการซัพพลายเออร์รายที่สองจริงจัง"
          },
          {
            "item": "ROCm software ecosystem ไล่ CUDA",
            "status": "on-track",
            "evidence": "ROCm 7 รองรับโมเดลหลัก (Llama, DeepSeek ฯลฯ) แบบ day-0 และ vLLM/frameworks หลักทำงานบน Instinct ได้ดีขึ้นมาก — แต่ยอมรับตรง ๆ ว่ายังตามหลัง CUDA หลายปีในความกว้างของ ecosystem โดยเฉพาะฝั่ง training"
          },
          {
            "item": "EPYC ยึดหัวหาด server CPU ในยุค AI",
            "status": "executing",
            "evidence": "ส่วนแบ่งรายได้ server CPU เกิน ~40% แล้วและยังไต่ขึ้น — ทุก AI cluster ต้องมี head-node CPU และความสัมพันธ์ EPYC คือประตูขาย Instinct พ่วง"
          },
          {
            "item": "Networking / มาตรฐานเปิด (UALink, Pensando)",
            "status": "on-track",
            "evidence": "ผลัก UALink/Ultra Ethernet เป็นทางเลือกเปิดแทน NVLink/InfiniBand ร่วมกับ Broadcom และพันธมิตร — จำเป็นต่อการขาย rack-scale แต่ยังอ่อนกว่าสแต็ค networking ของ NVIDIA ชัดเจน"
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
        "level": "premium",
        "note": "หลังดีล OpenAI หุ้นวิ่งแรงจนเทรดที่ forward P/E ~40-50x — แพงกว่าค่าเฉลี่ยตัวเองและแพงกว่า NVIDIA ในบางมุมเมื่อเทียบกำไรปัจจุบัน ตลาดจ่ายล่วงหน้าให้ 'สิ่งที่ยังต้องพิสูจน์ในปี 2026' คือ MI450 ramp หากเชื่อเป้า EPS ~$20 ในอีก ~3-5 ปี ราคานี้ยังพอมีเหตุผล แต่ต้องยอมรับว่า margin of safety บางและหุ้นจะผันผวนแรงตามข่าว execution รายไตรมาส"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 2025 → Q3 2025)",
          "prev": "~$7.7B",
          "now": "~$9.2B (สถิติใหม่, ~+36% YoY)",
          "direction": "positive"
        },
        {
          "metric": "รายได้ Data Center",
          "prev": "~$3.2B (โดนผลกระทบ MI308/จีน)",
          "now": "~$4.3B (สถิติใหม่)",
          "direction": "positive"
        },
        {
          "metric": "Non-GAAP gross margin",
          "prev": "~43% (โดน write-down สินค้าคงคลัง MI308 ~$800M)",
          "now": "~54% (กลับสู่ระดับปกติ)",
          "direction": "positive"
        },
        {
          "metric": "Non-GAAP EPS",
          "prev": "~$0.48",
          "now": "~$1.20",
          "direction": "positive"
        },
        {
          "metric": "Backlog/ดีลเชิงยุทธศาสตร์ AI",
          "prev": "ยังไม่มี anchor customer ระดับ frontier",
          "now": "OpenAI 6GW + Oracle ~50,000 MI450 + เป้า Analyst Day: โต ~35%/ปี, EPS ~$20",
          "direction": "positive"
        },
        {
          "metric": "รายได้ Embedded (Xilinx)",
          "prev": "~$820M",
          "now": "~$860M — ฟื้นช้ากว่าที่หวัง ยังติดลบ YoY",
          "direction": "neutral"
        }
      ],
      "risks": [
        "Execution risk ปี 2026 กระจุกอยู่ที่ MI450/Helios — ถ้า ramp สะดุด (yield, HBM supply, rack integration) ราคาหุ้นที่ price-in ความสำเร็จไว้แล้วจะปรับลงแรง",
        "ช่องว่างซอฟต์แวร์กับ CUDA ยังกว้าง โดยเฉพาะ training — ถ้า ROCm ตามไม่ทัน ลูกค้าอาจใช้ AMD แค่เป็นเครื่องมือต่อรองราคากับ NVIDIA",
        "การกระจุกตัวของ upside ที่ OpenAI — ทั้งดีล 6GW และ warrant ผูกกับลูกค้ารายเดียวที่ยังขาดทุนหนักและพึ่งการระดมทุนต่อเนื่อง (ความเสี่ยง circular financing ของทั้งอุตสาหกรรม AI)",
        "โดนบีบสองทาง: NVIDIA Rubin จากด้านบน และ custom ASIC ของ hyperscaler (TPU, Trainium, MTIA) ที่กินงาน inference ปริมาณมากจากด้านล่าง",
        "ภูมิรัฐศาสตร์ — ข้อจำกัดส่งออกชิป AI ไปจีน (บทเรียน MI308 ~$800M) และการพึ่ง TSMC/ไต้หวันเกือบ 100% ของการผลิตชิปหลัก"
      ],
      "asOf": "2026-01",
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
        ]
      },
      "nextEarnings": "2026-08-04"
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
      "asOf": "2026-07",
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
        ]
      },
      "nextEarnings": "2026-07-29"
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
          "current": "+56% YoY (Q1 2026 — $19.8B) เร่งตัวจาก +43% (Q4 2025) · guide FY2026 $82-85B",
          "trend": "up",
          "score": 93,
          "impact": "positive",
          "why": "โตเร็วผิดปกติสำหรับบริษัทขนาด $1T+ — Mounjaro +125%, Zepbound +80% ยังเร่งตัว และ guidance ถูกปรับขึ้นทุกไตรมาส เป็นการเติบโตที่หายากมากในกลุ่ม pharma"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q1 2026 adjusted EPS $8.55 (ชนะคาด $6.66) · guide FY2026 adj EPS $35.50-37.00 (ปรับขึ้นจาก $33.50-35)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้จาก operating leverage — margin ขยายแรง ทำให้ EPS เร่งกว่ายอดขาย บริษัทปรับ guidance EPS ขึ้นต่อเนื่อง"
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
          "current": "forward P/E ~31-34x (ราคา ~$1,196 · mcap ~$1.15T, ก.ค. 2026)",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "แพงมากเทียบ pharma ดั้งเดิม (~15x) — ตลาดจ่ายพรีเมียมให้การเติบโต GLP-1 ราคาระดับนี้แทบไม่เผื่อพลาด ถ้าโตช้าลงหรือคู่แข่งเข้ามา multiple หดได้แรง"
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
            "sharePct": 44,
            "growthNote": "$8.66B Q1 2026 (+125% YoY) — เครื่องยนต์ใหญ่สุด US $4.2B + ต่างประเทศ $4.4B ที่ระเบิดจากฐานต่ำ",
            "trend": "up"
          },
          {
            "name": "Zepbound (tirzepatide — โรคอ้วน)",
            "sharePct": 21,
            "growthNote": "US ~$4.16B (+80% YoY) — ยาลดน้ำหนักเบอร์หนึ่งของตลาด",
            "trend": "up"
          },
          {
            "name": "เบาหวาน/cardiometabolic เดิม (Trulicity, Jardiance, Humalog)",
            "sharePct": 15,
            "growthNote": "แผ่วลง — Trulicity ถูกแทนที่ด้วย Mounjaro, Jardiance ยังทรงตัว",
            "trend": "down"
          },
          {
            "name": "Oncology (Verzenio, Jaypirca)",
            "sharePct": 8,
            "growthNote": "Verzenio ยังโต · Jaypirca ~$165M กำลัง ramp",
            "trend": "up"
          },
          {
            "name": "ภูมิคุ้มกัน+ประสาท+ยาใหม่ (Taltz, Ebglyss, Omvoh, Kisunla, Foundayo)",
            "sharePct": 12,
            "growthNote": "คลื่นยาใหม่ — Kisunla (อัลไซเมอร์) ~$124M, Ebglyss ~$145M, Foundayo เพิ่งเปิดตัว",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 86,
        "items": [
          {
            "item": "Oral GLP-1 (Foundayo/orforglipron)",
            "status": "executing",
            "evidence": "FDA อนุมัติ เม.ย. 2026 — ยา GLP-1 เม็ดกินตัวแรก ผลิต/ขยายสเกลได้กว่ายาฉีดมาก เปิดตลาดคนไข้ที่ไม่อยากฉีด นับเป็น catalyst ใหญ่สุดของปี"
          },
          {
            "item": "ขยายกำลังการผลิต (manufacturing capex)",
            "status": "executing",
            "evidence": "ทุ่มลงทุนหลายหมื่นล้าน$ สร้างโรงงานทั่วโลก — เป็นตัวปลดล็อกอุปสงค์ที่ล้นและเป็นคูเมืองจริงที่คู่แข่งตามช้า"
          },
          {
            "item": "ขยาย label ยา tirzepatide",
            "status": "executing",
            "evidence": "เดินหน้าข้อบ่งใช้ใหม่ (หยุดหายใจขณะหลับ, หัวใจ HFpEF, MASH) — ต่อยอดฐานยาเดิมให้ครอบคลุมโรคร่วมของคนไข้อ้วน"
          },
          {
            "item": "ท่อยารุ่นถัดไป (retatrutide, Kisunla)",
            "status": "on-track",
            "evidence": "retatrutide (triple agonist) ในการทดลองระยะท้าย ประสิทธิภาพลดน้ำหนักสูงกว่าเดิม · Kisunla เปิดตลาดอัลไซเมอร์"
          },
          {
            "item": "AI/ML ในการค้นพบยา + LillyDirect DTC",
            "status": "on-track",
            "evidence": "ใช้ AI เร่ง drug discovery และแพลตฟอร์มขายตรงถึงผู้ป่วย (LillyDirect) ลดตัวกลาง — ยังเป็นตัวเสริม ไม่ใช่แกนรายได้"
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
        "note": "forward P/E ~31-34x (ราคา ~$1,196, mcap ~$1.15T) — แพงกว่า pharma peer หลายเท่า (~15x) ตลาดจ่ายให้การเติบโต GLP-1 และ optionality ของ oral/pipeline ราคาระดับนี้ทำให้หุ้นเหวี่ยงแรงตามข่าว clinical/คู่แข่ง และมีความเสี่ยง de-rating สูงถ้าการเติบโตชะลอ"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q4 2025 → Q1 2026)",
          "prev": "$19.3B (+43% YoY)",
          "now": "$19.8B (+56% YoY) — เร่งตัว",
          "direction": "positive"
        },
        {
          "metric": "Mounjaro",
          "prev": "$7.4B (+110% YoY)",
          "now": "$8.66B (+125% YoY) — ต่างประเทศระเบิด",
          "direction": "positive"
        },
        {
          "metric": "Oral GLP-1 (Foundayo/orforglipron)",
          "prev": "รออนุมัติ",
          "now": "FDA อนุมัติ 1 เม.ย. 2026 — ยาเม็ดตัวแรก",
          "direction": "positive"
        },
        {
          "metric": "Guidance FY2026",
          "prev": "รายได้ $80-83B",
          "now": "ปรับขึ้น $82-85B · adj EPS $35.50-37.00",
          "direction": "positive"
        },
        {
          "metric": "Operating margin",
          "prev": "~29% (2024)",
          "now": "~40% (2025) — operating leverage",
          "direction": "positive"
        },
        {
          "metric": "Realized price (US)",
          "prev": "—",
          "now": "ราคาที่รับจริง -13% ใน Q1 — แรงกดด้านราคาเริ่มเห็น",
          "direction": "negative"
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
      "asOf": "2026-07",
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
        ]
      },
      "nextEarnings": "2026-08-05"
    }
  }
};
  if (typeof window !== "undefined") window.ThesisData = ThesisData;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisData;
})();
