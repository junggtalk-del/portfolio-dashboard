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
        "statement": "Alphabet คือบริษัท AI แบบ full-stack เพียงไม่กี่รายในโลก — มีโมเดลชั้นนำของตัวเอง (Gemini), ชิปของตัวเอง (TPU), cloud ของตัวเอง และช่องทางกระจายสู่ผู้ใช้หลายพันล้านคนผ่าน Search / Android / YouTube / Workspace ความกลัวว่า AI จะฆ่า Search พิสูจน์แล้วว่าเกินจริง: AI Overviews และ AI Mode กลับขยายการใช้งาน (query growth สูงสุดในรอบ 5 ปี) และรายได้ Search ยังโตสองหลัก แม้ Q3'26 ชะลอเหลือ +12% ขณะที่ Google Cloud โตเร่งขึ้นแรงจากดีมานด์ AI และ backlog พุ่งเกินครึ่งล้านล้านดอลลาร์ ปี 2025 คือปีที่ตลาดเปลี่ยนมุมมองจาก 'ผู้แพ้ AI' เป็น 'ผู้นำ AI' — แต่ปี 2026 ขนาด CapEx (~$200B) ใหญ่เกินกระแสเงินสดจนต้องระดมทุนภายนอกทั้งหุ้นใหม่และหุ้นกู้ ผู้ถือหุ้นจึงแลกการเติบโตของ Cloud กับ FCF ที่ติดลบและหุ้นที่เริ่มเจือจาง",
        "pillars": [
          "Gemini 4 (Argon / Carbon) รักษาตำแหน่งโมเดลระดับแนวหน้า พร้อมผู้ใช้ Gemini app ทะลุ 1 พันล้านคน — โตเร็วที่สุดในประวัติศาสตร์ Google",
          "Google Cloud โตเร่งขึ้นแรง (+103% YoY ใน Q3'26) พร้อม backlog ~$561B — เป็นหลักฐานว่า CapEx สร้างรายได้จริง",
          "TPU รุ่น Ironwood + ดีลลูกค้าภายนอกรายใหญ่ (เช่น Anthropic) และลูกค้าใช้ TPU เกือบ 100 ราย ทำให้ Alphabet เป็น hyperscaler ที่พึ่งพา NVIDIA น้อยที่สุด → ได้เปรียบต้นทุน compute ระยะยาว",
          "Search ยังเป็นเครื่องผลิตกระแสเงินสดที่ใหญ่และทนทาน โดย AI Overviews เข้าถึงผู้ใช้ ~2 พันล้านคน/เดือน และเริ่มขยายโฆษณาใน AI Mode ไปต่างประเทศ",
          "งบดุลยังเป็น net cash (เงินสด ~$265B เทียบหนี้ระยะยาว ~$125B) แม้ปี 2026 ระดมทุนภายนอกหนัก + คดีความ antitrust ผ่านจุดเลวร้ายสุดไปแล้ว (คำตัดสิน remedy ปี 2025 เบากว่าที่ตลาดกลัว ไม่ต้องขาย Chrome)"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+25% YoY (Q3 2026 — $127.6B ต่ำกว่าคาด ~$127.9B เล็กน้อย)",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "รายได้รวมยังเร่งขึ้น 4 ไตรมาสติด (+18% → +22% → +24% → +25%) แต่แรงส่งย้ายไปอยู่ที่ Cloud (+103%) เกือบทั้งหมด — Search ชะลอเหลือ +12% และ YouTube +9% ต่ำกว่าตลาดคาด จึงหักคะแนนเล็กน้อย"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "GAAP $2.12 (-26% YoY) รวมขาดทุนเงินลงทุน -$0.55/หุ้น · ไม่รวมรายการนี้ ~$2.67 ยังต่ำกว่าคาด ~$3.02",
          "trend": "down",
          "score": 70,
          "impact": "neutral",
          "why": "กำไรจากการดำเนินงานยังโต +30% YoY แต่ EPS GAAP เหวี่ยงตามมูลค่าหุ้น SpaceX/Anthropic (Q2 +$6.26/หุ้น → Q3 -$0.55/หุ้น) และแม้ตัดรายการนี้ออกก็ยังต่ำกว่าคาด เพราะค่าเสื่อม (+49% YoY) และ R&D (+36%) โตเร็วกว่ารายได้ · consensus ปี 2027 (~$15) ต่ำกว่าปี 2026 (~$20.6) เพราะไม่มีกำไรพิเศษ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF Q3 -$9.1B (Q2 -$5.9B) · TTM ~$19.7B (-73% YoY) · CapEx 2026 คงกรอบ $195-205B",
          "trend": "down",
          "score": 45,
          "impact": "negative",
          "why": "OCF ยังแข็ง (~$42.3B/ไตรมาส) แต่ capex $51.4B (+114% YoY) กินหมดจน FCF ติดลบสองไตรมาสติด และผู้บริหารบอกว่า capex ปี 2027 จะเพิ่มขึ้นอย่างมีนัย — ส่วนต่างต้องเติมด้วยหุ้นใหม่และหุ้นกู้ ไม่ใช่กระแสเงินสดของตัวเองอีกต่อไป"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Operating margin 31.8% (Q3 2026 ลดจาก 34.0% ใน Q2) · Cloud margin ~36.2%",
          "trend": "down",
          "score": 82,
          "impact": "positive",
          "why": "Cloud ยังเป็นเครื่องจักรกำไร (OI $11.1B จาก $3.6B ปีก่อน, margin ~23.7% → ~36.2%) แต่ margin รวมลดลงสองไตรมาสติด (36.1% → 34.0% → 31.8%) จากค่าเสื่อม datacenter และต้นทุนส่วนกลางที่โตเร็ว — ผู้บริหารเตือนว่า Q4 จะมีแรงกดเพิ่มจากการเช่า compute ภายนอก (third-party capacity)"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังสูงเทียบกลุ่ม mega-cap แต่เริ่มถูกเจือจาง — ฐานทุนโตเร็วกว่ากำไร",
          "trend": "down",
          "score": 80,
          "impact": "positive",
          "why": "ธุรกิจโฆษณาแกนหลักใช้ทุนน้อยและกำไรสูงมาก แต่ capex Q3 โต +114% YoY ขณะ operating income โต +30% และทุนที่ระดมเพิ่มใน 9 เดือน (หุ้นสามัญ+หุ้นบุริมสิทธิ ~$62B, หุ้นกู้ ~$85B) ขยายฐานทุนเร็ว — ROIC จะลดลงถ้ารายได้จาก AI infrastructure ตามไม่ทัน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและหลักทรัพย์ ~$265B (Q2 ~$242B · สิ้นปี 2025 ~$127B)",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "เงินสดเพิ่มเกินเท่าตัวในปีนี้ — แต่ส่วนใหญ่มาจากการระดมทุน (หุ้นใหม่ + หุ้นกู้) ไม่ใช่กระแสเงินสดอิสระ จึงเป็นกระสุนรองรับ capex มากกว่าสัญญาณกำไร · ยังมีเงินลงทุนนอกตลาด (non-marketable) อีก ~$135B"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาว ~$125B (Q2 ~$98B · สิ้นปี 2025 ~$47B) + หุ้นบุริมสิทธิ ~$18B · เงินสดยังมากกว่าหนี้ระยะยาว ~$140B",
          "trend": "down",
          "score": 75,
          "impact": "positive",
          "why": "ออกหุ้นกู้ ~$85B ใน 9 เดือนเพื่อรองรับ capex ภาระหนี้จึงโตเร็วมาก แต่เงินสดยังมากกว่าหนี้ชัดเจน และ operating income ~$40B/ไตรมาส ครอบคลุมดอกเบี้ยจ่าย (~$1B/ไตรมาส) ได้สบาย"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "diluted shares +1.4% YoY (12.20B → 12.37B) · ไม่ซื้อหุ้นคืนเลยปี 2026 · ขายหุ้นใหม่ผ่าน ATM + mandatory convertible preferred แปลงสภาพปี 2029",
          "trend": "down",
          "score": 50,
          "impact": "negative",
          "why": "พลิกจากจำนวนหุ้นลดลงสุทธิ ~1-2%/ปี เป็นเพิ่มขึ้น — ออกหุ้นสามัญ $18B + Berkshire $10B (มิ.ย.) และ ATM อีก ~$12.4B ใน Q3 (วงเงินเหลือ $27.6B) ขณะ SBC ~$8.6B/ไตรมาส และ buyback เป็นศูนย์ · capped call ช่วยจำกัดการเจือจางตอนแปลงสภาพหุ้นบุริมสิทธิ แต่ทิศทางไม่เป็นมิตรกับผู้ถือหุ้นแล้ว"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "CapEx เชิงรุก ($195-205B) · ระดมทุนภายนอกแทน buyback · ปันผล $0.22/ไตรมาส",
          "trend": "down",
          "score": 68,
          "impact": "neutral",
          "why": "การลงทุนยังผูกกับดีมานด์จริง (backlog ~$561B, Cloud +103%) แต่โครงสร้างการจัดสรรทุนเปลี่ยน: หยุดซื้อหุ้นคืน ออกหุ้น ~$62B และหุ้นกู้ ~$85B ในปีเดียว ขณะ FCF ติดลบ — ผลตอบแทนต่อหุ้นขึ้นกับว่า capex ก้อนนี้แปลงเป็นกำไรได้เร็วแค่ไหน"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "Forward P/E ~19-22x หลังหุ้นร่วง ~8-11% after-hours หลังงบ (ราคา ~$290-300 จาก ~$322-325)",
          "trend": "up",
          "score": 68,
          "impact": "neutral",
          "why": "ราคาที่ย่อลงทำให้ multiple ต่ำลงอีก (ฐาน EPS ปี 2027 ~$15 ที่ไม่มีกำไรพิเศษ) ทั้งที่ Cloud +103% — ความน่าสนใจเชิงราคาดีขึ้น แต่ส่วนลดนี้มีเหตุผลรองรับบางส่วนจาก Search ที่ชะลอ FCF ติดลบ และหุ้นที่เริ่มเจือจาง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": 35,
        "note": "รายได้รวมยังเร่ง (+25%) แต่ส่วนผสมเปลี่ยนเร็ว — Cloud (สัญญาระยะยาว, backlog ~$561B) ขยับเป็น ~24% ของรายได้ ขณะโฆษณาแกนหลักชะลอและต่ำกว่าตลาดคาด (Search +12%, YouTube +9%) — คุณภาพรายได้ดีขึ้นด้าน recurring แต่ความสม่ำเสมอของ Search ลดลง",
        "segments": [
          {
            "name": "Google Search & other",
            "sharePct": 50,
            "growthNote": "+12% YoY ($63.4B) ชะลอจาก +17% และต่ำกว่าตลาดคาด (~$65B) · ทรงตัวเทียบ Q2 — แม้ผู้บริหารยืนยัน query growth สูงสุดในรอบ 5 ปี",
            "trend": "flat"
          },
          {
            "name": "Google Cloud",
            "sharePct": 24,
            "growthNote": "+103% YoY ($30.7B) เร่งขึ้นต่อเนื่อง (34→48→63→82→103%) · backlog ~$561B · margin ~36.2% · ยอดขาย TPU systems เริ่มเป็นตัวหนุนสำคัญ",
            "trend": "up"
          },
          {
            "name": "Subscriptions, platforms & devices",
            "sharePct": 11,
            "growthNote": "+11% YoY ($14.3B) ชะลอจาก +15% — YouTube Music/Premium เกิน 150M (รวมทดลองใช้) + แพ็กเกจ AI",
            "trend": "up"
          },
          {
            "name": "YouTube ads",
            "sharePct": 9,
            "growthNote": "+9% YoY ($11.2B) ชะลอจาก +13% ในไตรมาสที่มี World Cup และต่ำกว่าตลาดคาด (~$11.4B)",
            "trend": "flat"
          },
          {
            "name": "Google Network",
            "sharePct": 6,
            "growthNote": "+1% YoY ($7.5B) — ทรงตัว สัดส่วนเล็กลงเรื่อยๆ ตามขาลงเชิงโครงสร้าง",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 92,
        "items": [
          {
            "item": "Gemini frontier models (Gemini 4)",
            "status": "executing",
            "evidence": "Gemini app ทะลุ 1 พันล้านผู้ใช้ (จาก 950M ไตรมาสก่อน) — โตเร็วที่สุดในประวัติศาสตร์ Google · first-party API ~32B tokens/นาที (+~40% QoQ) · เปิดตัว Gemini 4 Argon (ก.ย.) และ Carbon (ต.ค. 2026)"
          },
          {
            "item": "Google Cloud + Vertex AI",
            "status": "executing",
            "evidence": "Q3 2026: Cloud +103% YoY ($30.7B) สูงกว่าคาด (~$29.2B) · backlog ~$561B (+~9% QoQ) คาดรับรู้ ~55% ใน 24 เดือน · Cloud OI $11.1B margin ~36.2% — ยังเป็นหลักฐานแปลง AI เป็นรายได้ที่แข็งแรงที่สุดในกลุ่ม hyperscaler"
          },
          {
            "item": "TPU / custom silicon (Ironwood)",
            "status": "executing",
            "evidence": "TPU เจน 7 (Ironwood) พร้อมดีลลูกค้าภายนอกระดับประวัติการณ์ (Anthropic ใช้ TPU ระดับ ~1 ล้านชิป) · Q3'26 ลูกค้าใช้ TPU เกือบ 100 ราย และยอดขาย TPU systems เริ่มเป็นตัวหนุนรายได้ Cloud — ผู้บริหารคาดรายได้ส่วนนี้เร่งชัดขึ้นในปี 2027"
          },
          {
            "item": "Search AI transformation (AI Overviews / AI Mode)",
            "status": "on-track",
            "evidence": "query growth สูงสุดในรอบ 5 ปี · คำค้นใน AI Mode ยาวกว่าปกติ ~3 เท่าและส่วนใหญ่เป็น query ใหม่ · ขยายโฆษณาใน AI Mode ไปต่างประเทศ — แต่รายได้ Search Q3'26 ชะลอเหลือ +12% ต่ำกว่าคาด (~$65B) การ monetize ยังตามการใช้งานไม่ทัน"
          },
          {
            "item": "Consumer/Workspace AI subscriptions",
            "status": "on-track",
            "evidence": "Gemini Enterprise เข้าถึง ~90% ของ Fortune 100 · YouTube Music/Premium เกิน 150M (รวมทดลองใช้) · subscriptions โต +11% (ชะลอจาก +15%)"
          },
          {
            "item": "Waymo (autonomous driving)",
            "status": "on-track",
            "evidence": "สะสมระยะทางขับอัตโนมัติเต็มรูปแบบเกิน 300 ล้านไมล์ ให้บริการใน 15 เมืองใหญ่ของสหรัฐฯ — optionality ขนาดใหญ่ แต่ Other Bets ยังขาดทุน ~$2.0B/ไตรมาส"
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
            "note": "Search ยังครองส่วนแบ่ง ~90% และรายได้ยังโตสองหลัก (+12% แม้ชะลอ), YouTube เป็นผู้นำ streaming ตามเวลารับชม, Cloud เป็นเบอร์ 3 แต่โตเร็วสุดในกลุ่ม hyperscaler (+103%)"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "Gemini 4 (Argon / Carbon) ยืนระดับ frontier model, DeepMind ยังเป็น lab วิจัยระดับท็อป และ TPU คือ custom AI silicon ที่ประสบความสำเร็จที่สุดนอก NVIDIA"
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
            "note": "first-party model API ประมวลผล ~32B tokens/นาที (+~40% QoQ), Gemini API / AI Studio มีนักพัฒนาหลายล้านราย และ Vertex AI เป็นแพลตฟอร์มหลักของลูกค้า enterprise บน GCP · ลูกค้าใช้ TPU เกือบ 100 ราย"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "stable",
            "note": "Cloud backlog ~$561B (คาดรับรู้ ~55% ใน 24 เดือน) และสัญญา Workspace ผูกลูกค้าองค์กรแน่น แต่ผู้ลงโฆษณาย้ายงบตาม ROI ได้เสมอ — lock-in แข็งฝั่ง enterprise มากกว่าฝั่งโฆษณา"
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
        "score": 70,
        "verdict": "ลงทุนเชิงรุกบนดีมานด์ที่พิสูจน์ได้ (Cloud +103%, backlog ~$561B) แต่ปี 2026 เปลี่ยนโหมดจาก self-fund + ซื้อหุ้นคืน เป็นระดมทุนภายนอก (หุ้นใหม่ + หุ้นกู้) ขณะ FCF ติดลบสองไตรมาส — ปิดดีล Wiz $32B แล้ว (มี.ค. 2026) ความเสี่ยงหลักคือขนาด capex ที่โตเร็วกว่ากระแสเงินสด",
        "items": [
          {
            "label": "CapEx (AI infrastructure)",
            "current": "Q3'26 $51.4B (+114% YoY) · Guidance 2026 คงที่ $195-205B · ปี 2027 'เพิ่มขึ้นอย่างมีนัย' (ยังไม่ให้ตัวเลข)",
            "assessment": "good",
            "why": "capacity ที่สร้างมีลูกค้ารออยู่แล้ว (backlog ~$561B, Cloud margin ~36%) — เป็นการลงทุนตามดีมานด์ แต่ต้องพึ่งเงินทุนภายนอก จึงต้องเห็นรายได้ตามทันในปี 2027"
          },
          {
            "label": "R&D",
            "current": "Q3'26 ~$20.6B (+36% YoY) — ใหญ่เป็นอันดับต้นของโลก",
            "assessment": "good",
            "why": "ให้ผลลัพธ์จับต้องได้: Gemini 4, Ironwood TPU, Waymo, ความก้าวหน้าจาก DeepMind — R&D ที่แปลงเป็นความได้เปรียบเชิงแข่งขันจริง ไม่ใช่แค่ต้นทุน"
          },
          {
            "label": "Buyback",
            "current": "ไม่ซื้อหุ้นคืนเลยใน 9 เดือนแรกปี 2026 ($0 เทียบ ~$39.8B ช่วงเดียวกันปี 2025)",
            "assessment": "neutral",
            "why": "หยุดเพื่อเก็บเงินไว้ลงทุน AI — สมเหตุสมผลเชิงธุรกิจ แต่ตัดแรงหนุนต่อหุ้นที่เคยลดจำนวนหุ้นได้ ~1-2%/ปี ออกไป"
          },
          {
            "label": "Dividend",
            "current": "$0.22/หุ้น/ไตรมาส (~$0.88/ปี, yield ~0.3%) · จ่ายจริง ~$2.9B ใน Q3",
            "assessment": "neutral",
            "why": "รักษาวินัยการจ่ายต่อเนื่อง แต่ขนาดเล็กจนไม่มีนัยต่อผลตอบแทนรวม และจ่ายขณะ FCF ติดลบ เท่ากับใช้เงินระดมทุนส่วนหนึ่งจ่ายปันผล"
          },
          {
            "label": "SBC / การเจือจาง",
            "current": "SBC ~$8.6B ใน Q3 (9 เดือน ~$23.3B) · diluted shares +1.4% YoY · ใช้ ATM ขายหุ้นใหม่จ่ายภาษีหุ้นพนักงาน (~$30B ในปี 2026)",
            "assessment": "poor",
            "why": "ก่อนหน้านี้ buyback ชดเชย SBC เกินพอ แต่ตอนนี้ไม่มี buyback และใช้ ATM ขายหุ้นใหม่แทนการหักภาษีด้วยเงินสด — SBC จึงกลายเป็นการเจือจางจริงที่ผู้ถือหุ้นแบกเอง"
          },
          {
            "label": "ระดมทุนภายนอก (มิ.ย. 2026)",
            "current": "รวม $84.75B: หุ้นสามัญ $18B + Berkshire $10B + mandatory convertible preferred $16.75B (6.25%, แปลงสภาพ พ.ค. 2029) + ATM $40B (ใช้ ~$12.4B ใน Q3 เหลือ $27.6B) · หนี้ระยะยาว ~$47B → ~$125B ใน 9 เดือน",
            "assessment": "neutral",
            "why": "ทำให้ลงทุนต่อได้โดยไม่ต้องลด capex และมี Berkshire ร่วมลงทุน แต่เป็นจุดเปลี่ยนจากบริษัทที่ self-fund + ซื้อหุ้นคืน เป็นบริษัทที่ใช้เงินทุนภายนอก — ต้นทุนเงินทุนสูงขึ้นและผู้ถือหุ้นเดิมถูกเจือจาง"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "หลังงบ Q3'26 หุ้นร่วง ~8-11% after-hours (~$290-300 จาก ~$322-325, market cap ~$3.6T) — forward P/E ~19-22x บนฐาน EPS ปี 2027 ~$15 ที่ไม่มีกำไรพิเศษ ทั้งที่ Cloud +103%: ถูกลงจากไตรมาสก่อน แต่ส่วนลดมีเหตุผลรองรับจาก Search ที่ชะลอ FCF ติดลบ และหุ้นเริ่มเจือจาง — ยังอยู่โซนสมเหตุสมผล"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม",
          "prev": "$119.8B (+24% YoY)",
          "now": "$127.6B (+25% YoY) — ต่ำกว่าคาด ~$127.9B เล็กน้อย",
          "direction": "positive"
        },
        {
          "metric": "Google Search & other",
          "prev": "+17% YoY ($63.3B)",
          "now": "+12% YoY ($63.4B) — ต่ำกว่าคาด ~$65B",
          "direction": "negative"
        },
        {
          "metric": "Google Cloud",
          "prev": "+82% YoY ($24.8B) · margin ~35.6% · backlog $514B",
          "now": "+103% YoY ($30.7B) · margin ~36.2% · backlog ~$561B",
          "direction": "positive"
        },
        {
          "metric": "EPS (GAAP) / Operating margin",
          "prev": "$9.11 (gain +$6.26/หุ้น · ไม่รวม ~$2.85) · margin 34.0%",
          "now": "$2.12 (ขาดทุน -$0.55/หุ้น · ไม่รวม ~$2.67 เทียบคาด ~$3.02) · margin 31.8%",
          "direction": "negative"
        },
        {
          "metric": "CapEx / FCF",
          "prev": "capex $44.9B · FCF -$5.9B",
          "now": "capex $51.4B · FCF -$9.1B · กรอบปี 2026 คงที่ $195-205B, ปี 2027 เพิ่มอย่างมีนัย",
          "direction": "negative"
        },
        {
          "metric": "Buyback / การออกหุ้น",
          "prev": "buyback $0 · ออกหุ้นสามัญ ~$30.5B (รวม Berkshire $10B) · หนี้ระยะยาว ~$98B",
          "now": "buyback $0 · ขายหุ้นผ่าน ATM ~$12.4B · หนี้ระยะยาว ~$125B · diluted shares +1.4% YoY",
          "direction": "negative"
        }
      ],
      "risks": [
        "CapEx/FCF — FCF ติดลบสองไตรมาสติด (-$5.9B → -$9.1B) และ capex ปี 2027 จะเพิ่มอีกอย่างมีนัย ถ้า Cloud/backlog ชะลอขณะ capex ยังพุ่ง เรื่องเล่าจะพลิกเป็น 'overbuild' และหุ้นถูก de-rate แรง",
        "การเจือจางและต้นทุนเงินทุน — ระดมทุนหุ้น/หุ้นบุริมสิทธิ ~$62B + หุ้นกู้ ~$85B ใน 9 เดือน หยุด buyback และยังเหลือวงเงิน ATM $27.6B — ถ้าต้องระดมทุนต่อในปี 2027 กำไรต่อหุ้นจะโตช้ากว่ากำไรรวม",
        "กำไรพิเศษผันผวน — Q2 กำไรตีมูลค่าเงินลงทุน ~$99B (+$6.26/หุ้น) แต่ Q3 กลับเป็นขาดทุน ~$8.7B (-$0.55/หุ้น) จากราคาหุ้น SpaceX — EPS GAAP เหวี่ยงแรงตามมูลค่า SpaceX/Anthropic และเงินลงทุนนอกตลาดอีก ~$135B",
        "Search ชะลอ + การแข่งขัน AI — Search โตเหลือ +12% ต่ำกว่าคาด ขณะ OpenAI/Microsoft ฝั่ง consumer agent และ AWS/Azure ฝั่ง cloud ยังกดดัน · คดี antitrust ผ่านจุดเลวร้ายสุดแต่ remedies ยังมีเงื่อนไขติดตาม + ความเสี่ยง EU/AI regulation",
        "Margin headwind — ค่าเสื่อมโต +49% YoY และผู้บริหารเตือนแรงกด margin จากการเช่า compute ภายนอกใน Q4 · Cloud +103% สร้างฐานเปรียบเทียบที่โหดมากสำหรับปี 2027"
      ],
      "asOf": "2026-10",
      "history": {
        "fyNote": "ปีบัญชีสิ้นสุดเดือนธันวาคม (ตรงกับปีปฏิทิน) — FY2025 สิ้นสุด ธ.ค. 2025 รายงานผลครบแล้วเมื่อต้นปี 2026",
        "epsBasis": "diluted GAAP, split-adjusted (หลัง stock split 20:1 เดือน ก.ค. 2022) · หมายเหตุ: Q1'26-Q2'26 มี unrealized mark-to-market gain จากหุ้น Anthropic/SpaceX (other income ~$37.7B ใน Q1'26 · gain ~$99.0B ใน Q2'26 = +$6.26/หุ้น) ดันกำไรสูงผิดปกติ ส่วน Q3'26 กลับเป็นขาดทุน ~$8.7B (หลักๆ SpaceX) = -$0.55/หุ้น — EPS GAAP รายไตรมาสจึงเหวี่ยงทั้งสองทาง ต้องอ่านคู่ epsNote และ TTM EPS/P/E ปัจจุบันยังดูถูกกว่าฐานธุรกิจจริง",
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
          "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm",
          "https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000080/googexhibit991q32026.htm",
          "https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000066/googexhibit991q22026.htm",
          "https://www.sec.gov/Archives/edgar/data/0001652044/000119312526257724/d83560dex992.htm",
          "https://www.investing.com/news/transcripts/earnings-call-transcript-alphabet-q3-2026-profit-miss-sparks-10-afterhours-drop-93CH-4981037",
          "https://stockanalysis.com/stocks/googl/history/",
          "https://www.financialcontent.com/quote/NQ%3AGOOGL/historical",
          "https://finance.yahoo.com/quote/GOOGL/analysis/"
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 127.58,
            "epsAdj": 2.12,
            "opMarginPct": 31.8,
            "fcfB": -9.1,
            "priceQEnd": 344,
            "epsNote": "รวมขาดทุนเงินลงทุนที่ยังไม่รับรู้ ~$8.7B (หลักๆ หุ้น SpaceX) กด EPS -$0.55 → ไม่รวมรายการนี้ ~$2.67"
          }
        ]
      },
      "nextEarnings": "2027-02",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 20.58,
            "revenue": 497.7
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 15.17,
            "revenue": 627.8
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3'26",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "~$127.6B (+25% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
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
            "revenue": 500.3,
            "eps": 20.6,
            "confidence": "high",
            "basis": "GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 627.8,
            "eps": 15.17,
            "confidence": "high",
            "basis": "GAAP"
          }
        ],
        "note": "Alphabet ไม่ให้ guidance รายได้ (ให้เฉพาะ CapEx รายปี: 2026 คงกรอบ $195-205B ส่วน 2027 บอกเพียงว่าจะ 'เพิ่มขึ้นอย่างมีนัย' ไม่ให้ตัวเลข) แถว guidance จึงเป็น noGuidance ตามจริง · consensus ที่บันทึกเป็น snapshot ก่อนงบ (26-28 ต.ค. 2026) ฐาน GAAP — FY2026 ~$20.6 รวม gain หุ้น Anthropic/SpaceX ของ Q1-Q2 แล้วและน่าจะถูกปรับลงตาม Q3 ที่ขาดทุน -$0.55/หุ้น ส่วน FY2027 ~$15.2 (3 แหล่งตรงกัน) ต่ำกว่าเพราะไม่มีกำไรพิเศษ โดยรายได้ FY2027 ~$628B ยืนยันได้จากแหล่งเดียว"
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
      "nextEarnings": "2026-11-17",
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
        "statement": "Microsoft คือ 'ทางด่วนเก็บค่าผ่านทาง' ของ AI ยุคองค์กร — เป็นเจ้าของทั้งชั้น cloud (Azure), ชั้นแอปพลิเคชัน (Microsoft 365 + Copilot), ชั้นนักพัฒนา (GitHub) และถือหุ้น ~27% ใน OpenAI พร้อมสัญญาผูก Azure มูลค่ามหาศาล ทำให้ไม่ว่า AI จะชนะด้วยโมเดลค่ายไหน Microsoft ก็ได้ส่วนแบ่งรายได้เสมอ รายได้ที่โตเร่งขึ้น ~+19% YoY บนฐาน ~$346B/ปี (4 ไตรมาสล่าสุด) พร้อม operating margin ~50% (Q1 FY27) คือหลักฐานว่า AI กำลังแปลงเป็นกำไรจริง ไม่ใช่แค่เรื่องเล่า",
        "pillars": [
          "Azure โต +48% YoY (Q1 FY27 — ~$33.2B ต่อไตรมาส) เร่งขึ้นต่อเนื่อง โดย AI เป็นตัวเร่งหลัก และ backlog (commercial RPO ~$677B) ล็อกรายได้ล่วงหน้าหลายปี",
          "Copilot ฝังใน Microsoft 365 ที่มีผู้ใช้องค์กรหลายร้อยล้านคน — ช่องทาง upsell AI ต่อหัวที่ใหญ่ที่สุดในโลก",
          "กลยุทธ์ multi-model: ถือหุ้น OpenAI ~27% + ดีล Anthropic (~$30B Azure) ลดความเสี่ยงพึ่งพาโมเดลค่ายเดียว",
          "งบดุลแข็งแกร่งระดับ AAA ทำให้เร่ง capex ระดับ ~$45B/ไตรมาส (รวม finance lease) ได้โดยยังจ่ายปันผลและ buyback ต่อเนื่อง",
          "ต้นทุนย้ายค่ายสูงมากจาก bundle Windows + Office + Teams + Azure + security — ลูกค้าองค์กรแทบไม่หนี"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+19% YoY (Q1 FY27 — $92.3B ชนะ consensus ~$90.6B) · Azure +48% (~$33.2B ต่อไตรมาส เปิดเผยเป็นดอลลาร์ครั้งแรก) · Microsoft Cloud $63.9B (+30%)",
          "trend": "up",
          "score": 89,
          "impact": "positive",
          "why": "รายได้เร่งจาก +18% เป็น +19% ที่ฐาน ~$346B/ปี โดย Azure เร่งแรงจาก ~42% (นิยามใหม่) เป็น +48% และชนะ guidance 44-45% — เครื่องยนต์คลาวด์/AI ยังเป็นตัวขับหลักและดีมานด์ยังเกิน capacity"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "non-GAAP EPS $4.89 (Q1 FY27, +18% YoY) ชนะคาด ~$4.72 · GAAP $4.92 (+32% เพราะฐานปีก่อนมีขาดทุน OpenAI ~$0.41/หุ้น) · operating income $45.9B (+21%)",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "กำไรจากการดำเนินงานโต +21% เร็วกว่ารายได้ แต่ non-GAAP EPS ชะลอจาก +23% (Q4 FY26) เหลือ +18% จากฐานปีก่อนที่สูง — ยังเป็นการเติบโตระดับสองหลักสูงที่หาได้ยากในขนาดนี้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF ~$18.6B (Q1 FY27, −27% YoY) — OCF $58.0B แต่ cash capex $39.4B (2 เท่าของปีก่อน) · capex รวม finance lease ~$45.2B/ไตรมาส · CY2026 ~$175B (ตัวเลขใหม่หลังจัดประเภทสัญญาเช่า เดิม ~$190B)",
          "trend": "down",
          "score": 55,
          "impact": "neutral",
          "why": "cash capex โตเร็วกว่ารายได้มาก กลืน OCF ไป ~68% ทำให้ FCF ลดลงทั้งที่กำไรโต — การจัดประเภทสัญญาเช่า datacenter ใหม่ทำให้ตัวเลข capex ดูต่ำลงแต่บริษัทยืนยันว่าเงินลงทุนจริงไม่เปลี่ยน ความเสี่ยง overbuild ยังเป็นจุดที่ต้องจับตา"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~49.8% (Q1 FY27) จาก ~45.1% ใน Q4 FY26 และ ~48.9% ใน Q1 FY26 · gross margin ~67.8%",
          "trend": "up",
          "score": 89,
          "impact": "positive",
          "why": "ค่าใช้จ่ายดำเนินงานโตเพียง ~+6% (S&M ทรงตัว) ขณะรายได้ +19% ดัน op margin เกือบ 50% แม้ค่าเสื่อม/ค่าตัดจำหน่ายในงบกระแสเงินสดเพิ่ม ~44% YoY — มีแรงช่วยบางส่วนจากการยืดอายุการใช้งาน datacenter เป็น 25 ปีตั้งแต่ FY27 (บริษัทบอกว่าผลต่อกำไรปีนี้น้อย)"
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
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$64.5B (ก.ย. 2026) ลดจาก ~$76.8B (มิ.ย. 2026)",
          "trend": "down",
          "score": 80,
          "impact": "positive",
          "why": "ยังเป็นกันชนหนาและ OCF ~$58B/ไตรมาสเติมเงินได้เร็ว แต่กองเงินสดลดลงต่อเนื่องจาก capex + ปันผล/buyback + ชำระหนี้ ~$4.9B ในไตรมาส — ความยืดหยุ่นยังสูงแต่ไม่ใช่ระดับ $100B+ อีกแล้ว"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้รวม ~$35.5B (ชำระคืน ~$4.9B ในไตรมาส) — ต่ำมากเทียบขนาดบริษัท ยังเป็น net cash ~$29B และเป็นหนึ่งในไม่กี่บริษัทที่ได้เครดิต AAA",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลระดับ AAA คือแต้มต่อเชิงกลยุทธ์ในยุค AI capex — สามารถระดมทุนถูกกว่าใครและรับความผันผวนของวัฏจักรได้ดีกว่าคู่แข่งที่ก่อหนี้หนัก (เช่น Oracle)"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "diluted shares ~7.45B (−0.3% YoY) — SBC ~$3.1B/ไตรมาส ถูก buyback ~$4.4B ชดเชยได้หมด",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "ต่างจากบริษัท AI รุ่นใหม่ที่เจือจางผู้ถือหุ้นหนัก Microsoft คุม share count ให้ทรงถึงลดลงเล็กน้อยมาต่อเนื่องหลายปี ผู้ถือหุ้นระยะยาวไม่โดนกัดกร่อน"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "ปันผลเพิ่ม +8% เป็น $0.98/ไตรมาส + buyback ~$4.4B/ไตรมาส ควบคู่ capex AI รวม finance lease ~$45B/ไตรมาส",
          "trend": "flat",
          "score": 75,
          "impact": "neutral",
          "why": "ประวัติการจัดสรรทุนดีเยี่ยม (ดีล OpenAI ยุคแรกคือหนึ่งใน bet ที่คุ้มที่สุดในประวัติศาสตร์ tech) แต่ขนาด capex ปัจจุบันใหญ่จนความผิดพลาดจะแพงมาก — คะแนนจึงถูกหักจากความเสี่ยง overbuild"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~26x (12 เดือนข้างหน้า) / ~22x ต่อ consensus FY2028 — ราคา ~$531 (ปิด 28 ต.ค.) mcap ~$3.94T · after-hours หลังงบ ~+4% (~$550)",
          "trend": "down",
          "score": 60,
          "impact": "neutral",
          "why": "หุ้นวิ่งจาก ~$390 (ส.ค.) มา ~$531 (+~36%) multiple จึงกลับขึ้นจาก ~20-23x มาเป็น ~26x — ยังสมเหตุสมผลสำหรับกำไรโต ~18% + margin เกือบ 50% + งบดุล AAA แต่ส่วนลดจากรอบ de-rate ส่วนใหญ่หายไปแล้ว"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 92,
        "recurringPct": 80,
        "note": "รายได้คุณภาพสูง (recurring/enterprise สูง) — ตั้งแต่ FY27 รายงาน 2 segment: Agents and Infra ($76.8B, +25%, ~83% ของรายได้) มี Azure (~$33.2B, +48%) เป็นตัวเร่ง และ M365 commercial cloud เร่งเป็น +18% ขณะ Devices and Consumer ($15.5B, −3%) หดตาม Windows OEM · commercial RPO ~$677B (+73% YoY) ให้ visibility หลายปี แต่ทรงตัว QoQ และ commercial bookings −12% YoY",
        "segments": [
          {
            "name": "Azure (อยู่ใน Agents and Infra — นิยามใหม่ FY27: IaaS/PaaS แบบ consumption)",
            "sharePct": 36,
            "growthNote": "เครื่องยนต์หลัก — ~$33.2B ต่อไตรมาส +48% YoY (เร่งจาก ~42% ใน Q4 FY26 ตามนิยามใหม่) ชนะ guidance 44-45% · ดีมานด์ยังเกิน capacity",
            "trend": "up"
          },
          {
            "name": "Agents and Infra ส่วนที่เหลือ (Microsoft 365 commercial/consumer cloud, Dynamics, Office/server licensing, enterprise services)",
            "sharePct": 47,
            "growthNote": "~$43.6B โต ~+11% (คำนวณจาก A&I ลบ Azure) — M365 commercial cloud +18% (+19% cc, adjusted) เร่งจาก ~+16% · M365 consumer cloud +17% · Copilot เป็น upsell ต่อหัวที่มีน้ำหนักขึ้น",
            "trend": "up"
          },
          {
            "name": "Devices and Consumer (Windows, Xbox, Search & Ads)",
            "sharePct": 17,
            "growthNote": "$15.5B −3% YoY — Windows OEM & Devices −22%, Xbox content −2% แต่ Search & ads (ex-TAC) +12% · เป็นฐานผู้ใช้กระจาย Copilot สู่ consumer",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 87,
        "items": [
          {
            "item": "Azure AI / AI Foundry — ขายโครงสร้างพื้นฐานและแพลตฟอร์มโมเดลให้องค์กร",
            "status": "executing",
            "evidence": "Azure ~$33.2B +48% YoY ใน Q1 FY27 (เปิดเผยเป็นดอลลาร์ครั้งแรก · นิยามใหม่เป็น IaaS/PaaS ล้วน) ชนะ guidance 44-45% · Azure ทั้งปี FY26 ~$101.9B · AI business run rate ~$37B+ (+123% ตามที่เปิดเผยล่าสุด) · commercial RPO ~$677B — ดีมานด์ยังเกิน supply"
          },
          {
            "item": "Microsoft 365 Copilot — monetize AI ต่อหัวบนฐานผู้ใช้องค์กรหลายร้อยล้าน",
            "status": "on-track",
            "evidence": "ณ Q4 FY26 มี Microsoft 365 Copilot แบบจ่ายเงินกว่า 30 ล้าน seat (net adds เร่งขึ้นกว่าเท่าตัว QoQ) และ Q1 FY27 รายได้ M365 commercial cloud เร่งเป็น +18% (+19% cc, adjusted) จาก ~+16% — เริ่มเห็นผลในรายได้ แต่ยังต้องพิสูจน์ renewal/expansion ในวงกว้าง"
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
            "evidence": "capex รวม finance lease ~$45.2B ใน Q1 FY27 ต่ำกว่าที่ชี้ไว้ >$50B เพราะ capacity จากผู้ให้เช่าภายนอกส่งมอบล่าช้า (cash capex $39.4B ยังโต 2 เท่า) · CY2026 ~$175B หลังจัดประเภทสัญญาเช่า datacenter ใหม่ (เงินลงทุนจริงไม่เปลี่ยน) — ข้อจำกัดยังเป็น 'สร้าง/ส่งมอบไม่ทัน' ไม่ใช่ 'ไม่มีคนซื้อ'"
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
            "note": "สัญญา Enterprise Agreement หลายปี + commercial RPO ~$677B (+73% YoY) + ข้อมูลองค์กรที่สะสมใน Microsoft Graph ทำให้รายได้ล่วงหน้าถูกล็อกไว้ลึกและยาว — แม้ไตรมาสนี้ RPO ทรงตัว QoQ และ bookings −12% YoY"
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
            "current": "~$45B/ไตรมาส รวม finance lease (Q1 FY27 $45.2B · cash capex $39.4B) — CY2026 ~$175B หลังจัดประเภทสัญญาเช่าใหม่ (เดิม ~$190B; บริษัทยืนยันเงินลงทุนจริงไม่เปลี่ยน)",
            "assessment": "neutral",
            "why": "มีสัญญาลูกค้า (RPO ~$677B) รองรับมากกว่าคู่แข่งส่วนใหญ่ จึงไม่ใช่การสร้างลอย ๆ แต่ขนาดใหญ่จนหากรอบการใช้ AI สะดุด ค่าเสื่อมจะกดกำไรหลายปี"
          },
          {
            "label": "R&D",
            "current": "~$9.0B/ไตรมาส (+11% YoY) — ~$36B/ปี ระดับสูงสุดของโลกกลุ่ม software",
            "assessment": "good",
            "why": "กระจายทั้งโมเดล (MAI), ชิป (Maia/Cobalt), แพลตฟอร์ม (Foundry) และผลิตภัณฑ์ (Copilot ทุกตัว) — ผลงานที่ผ่านมาแปลงเป็นรายได้จริงได้สม่ำเสมอ"
          },
          {
            "label": "Buyback",
            "current": "โครงการ ~$60B เดินต่อ แต่ช้าลงเพื่อเก็บเงินไว้ทำ capex — Q1 FY27 ~$4.4B (ปีก่อน ~$5.7B) พอชดเชย SBC ให้ share count ลดลงเล็กน้อย",
            "assessment": "neutral",
            "why": "ถูกต้องแล้วที่ให้ลำดับความสำคัญกับ AI ก่อน buyback ในช่วงนี้ แต่แปลว่าผลตอบแทนผู้ถือหุ้นทางตรงระยะสั้นจะบางลง"
          },
          {
            "label": "เงินปันผล",
            "current": "เพิ่ม +8% เป็น $0.98/ไตรมาส (ประกาศ 15 ก.ย. 2026) · จ่ายจริง ~$6.8B/ไตรมาส (~$27B/ปี)",
            "assessment": "good",
            "why": "โตต่อเนื่องนับสิบปีโดยใช้เงินเพียงส่วนน้อยของกระแสเงินสด — รอบนี้เพิ่ม 8% ต่ำกว่ารอบก่อน ๆ ที่ ~10% สะท้อนการให้น้ำหนัก capex ก่อน"
          },
          {
            "label": "การลงทุนเชิงกลยุทธ์ / M&A",
            "current": "หุ้น OpenAI ~27% (มูลค่าตามบัญชีหลักแสนล้านดอลลาร์), ลงทุนใน Anthropic สูงสุด ~$5B, Activision ปิดดีลและเริ่ม contribute แล้ว",
            "assessment": "good",
            "why": "ดีล OpenAI ยุคแรกคือหนึ่งใน bet ที่ให้ผลตอบแทนเชิงกลยุทธ์สูงที่สุดในประวัติศาสตร์ tech และการเพิ่ม Anthropic ช่วยลด single-point-of-failure ของทั้ง thesis"
          },
          {
            "label": "การเจือจางหุ้น (SBC)",
            "current": "SBC ~$3.1B/ไตรมาส (~$12.5B/ปี) — ต่ำมากเมื่อเทียบรายได้ และถูก buyback ดูดซับหมด",
            "assessment": "good",
            "why": "วินัยเรื่อง share count ดีต่อเนื่อง ผู้ถือหุ้นระยะยาวไม่ถูกเจือจางแบบบริษัท growth ส่วนใหญ่"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "forward P/E ~26x ต่อกำไร 12 เดือนข้างหน้า (~22x ต่อ FY2028) ที่ราคา ~$531 / mcap ~$3.94T — หุ้นฟื้นแรงจากจุด de-rate ~20-23x ในเดือน ส.ค. หลัง Azure เร่งตัวต่อเนื่อง · ที่ระดับนี้ยังถือว่า 'สมเหตุสมผล' สำหรับคุณภาพ (รายได้ +19%, op margin ~50%, AAA) แต่ไม่ใช่ราคาที่มีส่วนลดอีกแล้ว — ความเสี่ยงหลักคือ capex/FCF และ bookings ที่ติดลบในไตรมาสนี้"
      },
      "whatChanged": [
        {
          "metric": "Azure (Q4 FY26 → Q1 FY27)",
          "prev": "~+42% YoY (นิยามใหม่ · นิยามเดิม +43%)",
          "now": "+48% YoY — ~$33.2B เปิดเผยเป็นดอลลาร์ครั้งแรก ชนะ guidance 44-45% · เริ่มรายงานแบบ 2 segment",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวม",
          "prev": "$90.0B (+18%)",
          "now": "$92.3B (+19%) ชนะ guidance ~$89.85-90.95B และ consensus ~$90.6B",
          "direction": "positive"
        },
        {
          "metric": "Operating margin",
          "prev": "~45.1%",
          "now": "~49.8% (opex +6% vs รายได้ +19%) · gross margin ~67.8%",
          "direction": "positive"
        },
        {
          "metric": "CapEx (incl finance lease)",
          "prev": "~$41B/ไตรมาส · CY2026 ~$190B",
          "now": "~$45.2B ต่ำกว่าที่ชี้ไว้ >$50B (capacity ภายนอกส่งมอบล่าช้า) · CY2026 ~$175B หลังจัดประเภทสัญญาเช่าใหม่",
          "direction": "neutral"
        },
        {
          "metric": "Backlog / bookings",
          "prev": "commercial RPO ~$678B (+84%)",
          "now": "~$677B (+73%) ทรงตัว QoQ · commercial bookings −12% YoY",
          "direction": "negative"
        },
        {
          "metric": "Valuation",
          "prev": "fwd P/E ~20-23x (ราคา ~$390)",
          "now": "fwd P/E ~26x (ราคา ~$531) — after-hours หลังงบ ~+4%",
          "direction": "negative"
        }
      ],
      "risks": [
        "Capex มหาศาล (~$45B/ไตรมาสรวม finance lease, CY2026 ~$175B) กด FCF (Q1 FY27 −27% YoY) — หาก demand ด้าน AI ชะลอหรือ monetization ช้ากว่าคาด ค่าเสื่อมจาก GPU/datacenter จะกลายเป็นภาระกำไรระยะยาว (ความเสี่ยง overbuild) · การยืดอายุ datacenter เป็น 25 ปีและย้ายสัญญาเช่าไปเป็น operating lease ทำให้ตัวเลข capex/ค่าเสื่อมเทียบกับอดีตตรง ๆ ยากขึ้น",
        "ความเสี่ยงจาก OpenAI — ทั้งผลขาดทุนตามส่วนได้เสียที่กด EPS ทุกไตรมาส, ความยั่งยืนทางการเงินของ OpenAI เอง และการที่ OpenAI กระจาย workload ไปหา Oracle/CoreWeave/AWS ทำให้ Azure ไม่ได้ผูกขาดอีกต่อไป · backlog ~$677B ทรงตัว QoQ และ commercial bookings −12% YoY ใน Q1 FY27 ชี้ว่าดีลก้อนใหญ่ไม่ได้เกิดทุกไตรมาส",
        "Copilot ต้องพิสูจน์ความคุ้มค่าต่อหัวในวงกว้าง — หากองค์กรมองว่า ROI ไม่ชัดเมื่อเทียบราคา ~$30/user/เดือน รอบ renewal อาจเห็นการลด seat และกระทบ narrative การ monetize AI ทั้งก้อน",
        "การแข่งขันรุนแรงขึ้นทุกชั้น — Google Cloud/Gemini เร่งแรงและมี TPU ได้เปรียบด้านต้นทุน, AWS ยังใหญ่กว่า, ส่วน AI coding tools รุ่นใหม่กัดกิน GitHub Copilot ในกลุ่ม power developer",
        "แรงกดดันด้านกฎระเบียบและโครงสร้างดีลวนในอุตสาหกรรม AI (circular deals) — หากมูลค่าห่วงโซ่ AI ถูกตั้งคำถามทั้งระบบ หุ้นที่ multiple ระดับ premium อย่าง MSFT จะโดน de-rate ไปด้วยแม้พื้นฐานไม่เปลี่ยน"
      ],
      "asOf": "2026-10",
      "history": {
        "fyNote": "ปีบัญชีของ Microsoft สิ้นสุด 30 มิ.ย. (เช่น FY2025 = ก.ค. 2024 – มิ.ย. 2025) — ข้อมูลรายปีใช้ FY2021–FY2026 · FY2027 (ก.ค. 2026 – มิ.ย. 2027) ยังไม่จบปี จึงมีเฉพาะในตารางรายไตรมาส",
        "epsBasis": "diluted GAAP, split-adjusted (ไม่มี split ตั้งแต่ปี 2003 — ตัวเลขตามงบจริงคือฐานหุ้นปัจจุบันอยู่แล้ว) · หมายเหตุ: ตั้งแต่ FY26 Microsoft แยกผลจากเงินลงทุนใน OpenAI ออกจาก non-GAAP — Q1 FY26 GAAP $3.72 รวมขาดทุน ~$0.41/หุ้น (non-GAAP $4.13) · Q2 FY26 GAAP $5.16 รวมกำไร ~$1.02/หุ้น (net income +$7.6B, non-GAAP $4.14) · Q4 FY26 GAAP $4.81 รวมกำไร ~$0.07/หุ้น (non-GAAP $4.74) · Q1 FY27 GAAP $4.92 รวมกำไร ~$0.03/หุ้น (non-GAAP $4.89) · Q3 FY26 ผลกระทบไม่มีนัย (~$14M)",
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
            "priceFYEnd": 373.02
          }
        ],
        "notes": "ตัวเลขงบตรงกับ 8-K/10-K ของ SEC และ stockanalysis.com; FCF = กระแสเงินสดจากการดำเนินงาน ลบ capex (PP&E) — FY2024–FY2025 capex พุ่งจากการลงทุน AI/data center ($44.5B → $64.6B) กด FCF ทั้งที่กำไรโต; ราคาปิดสิ้นปีบัญชีเป็นราคาปิดจริง (raw close) จาก Yahoo Finance ไม่ใช่ราคาปรับเงินปันผล (แหล่งอย่าง StatMuse แสดงราคาปรับปันผลซึ่งต่ำกว่า ~2-4%); จำนวนหุ้น diluted โดยนัยลดลงช้า ๆ จาก ~7.6B เหลือ ~7.5B ตาม buyback สอดคล้องทุกปี; ไม่มี stock split ในช่วงนี้; ตั้งแต่ FY27 (ประกาศ ก.ย. 2026) Microsoft รายงาน 2 segment ใหม่ Agents and Infra / Devices and Consumer และนิยาม Azure ใหม่ (ย้าย GitHub cloud/Security Copilot ไป M365 commercial cloud) — ตัวเลขรวมบริษัทในตารางไม่กระทบ; Q1 FY27 OCF $58.0B − additions to PP&E $39.4B = FCF ~$18.6B (capex รวม finance lease ~$45.2B ไม่ได้ใช้คำนวณ FCF); แก้ราคาปิดสิ้นไตรมาส Q1–Q4 FY26 และสิ้น FY2026 ให้ตรง raw close ของ Yahoo (ค่าเดิมคลาดเคลื่อน: 30 มิ.ย. 2026 ปิดจริง $373.02)",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/789019/000095017025100226/msft-ex99_1.htm",
          "https://stockanalysis.com/stocks/msft/financials/",
          "https://query1.finance.yahoo.com/v8/finance/chart/MSFT (raw daily closes)",
          "https://news.microsoft.com/source/2026/07/08/microsoft-announces-quarterly-earnings-release-date-68/",
          "https://www.statmuse.com/money/ask/msft-closing-price-on-june-30-2021 (cross-check, dividend-adjusted)",
          "https://www.sec.gov/Archives/edgar/data/0000789019/000119312526436122/msft-ex99_1.htm",
          "https://www.sec.gov/Archives/edgar/data/0000789019/000119312526380280/d291965dex991.htm",
          "https://www.sec.gov/Archives/edgar/data/0000789019/000119312526323632/msft-ex99_1.htm",
          "https://www.microsoft.com/en-us/investor/earnings/fy-2027-q1/press-release-webcast",
          "https://www.fool.com/earnings/call-transcripts/2026/08/07/microsoft-msft-q4-2026-earnings-call-transcript/",
          "https://www.stocktitan.net/sec-filings/MSFT/8-k-microsoft-corp-reports-material-event-f8a7cf7d3af8.html",
          "https://www.cnbc.com/2026/10/28/microsoft-msft-q1-earnings-report-2027.html",
          "https://en.fnnews.com/news/202610290543166596",
          "https://www.zerohedge.com/markets/msft-rises-azure-beat-bookings-shrink-and-backlog-stalls",
          "https://stockanalysis.com/stocks/msft/forecast/"
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
            "priceQEnd": 518,
            "endDate": "2025-09-30",
            "epsNote": "GAAP EPS $3.72 รวมผลขาดทุนจากเงินลงทุนใน OpenAI ~$0.41/หุ้น (net income −$3.1B) — ตัดรายการนี้ออกจะเป็น ~$4.13 (non-GAAP ที่บริษัทรายงาน) จึงเทียบกับไตรมาสอื่นตรง ๆ ไม่ได้"
          },
          {
            "q": "Q2 FY26",
            "endYm": "2025-12",
            "revenueB": 81.27,
            "epsAdj": 5.16,
            "opMarginPct": 47.1,
            "fcfB": 5.88,
            "priceQEnd": 484,
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
            "priceQEnd": 370,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q4 FY26",
            "endYm": "2026-06",
            "revenueB": 90.01,
            "epsAdj": 4.81,
            "opMarginPct": 45.1,
            "fcfB": 19.64,
            "priceQEnd": 373,
            "endDate": "2026-06-30",
            "epsNote": "GAAP EPS $4.81 รวมกำไรจากเงินลงทุนใน OpenAI ~$0.07/หุ้น — ตัดรายการนี้ออกจะเหลือ ~$4.74 (non-GAAP ที่บริษัทรายงาน)"
          },
          {
            "q": "Q1 FY27",
            "endYm": "2026-09",
            "revenueB": 92.28,
            "epsAdj": 4.92,
            "opMarginPct": 49.8,
            "fcfB": 18.63,
            "priceQEnd": 513,
            "endDate": "2026-09-30",
            "epsNote": "GAAP EPS $4.92 รวมกำไรสุทธิจากเงินลงทุนใน OpenAI ~$0.03/หุ้น (net income +$207M) — non-GAAP ที่บริษัทรายงาน $4.89 · GAAP โต +32% YoY สูงกว่า non-GAAP (+18%) เพราะฐาน Q1 FY26 มีขาดทุน OpenAI ~$0.41/หุ้น"
          }
        ]
      },
      "nextEarnings": "2027-01",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2027",
            "eps": 19.7,
            "revenue": 391.2
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 19.76,
            "revenue": 391.6
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q1 FY27",
            "metric": "revenue",
            "guided": "~$89.85-90.95B",
            "actual": "~$92.3B",
            "result": "beat",
            "magnitudePct": 2.1
          },
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
            "revenue": 391.6,
            "eps": 19.76,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": 468.6,
            "eps": 23.69,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "consensus FY2027 ~$19.76 / รายได้ ~$391.6B (52 นักวิเคราะห์ · StockAnalysis ระบุฐาน non-GAAP และ Yahoo ตรงกัน) เป็นภาพก่อนนักวิเคราะห์ปรับประมาณการหลังงบ Q1 FY27 ที่ชนะคาด · FY2028 ~$23.69 (Yahoo 33 ราย ช่วง ~22.0-25.7, Zacks ~$23.29) ไม่ระบุฐาน · ตั้งแต่ FY27 guidance ให้ราย segment ใหม่ 2 ขา (Agents and Infra + Devices and Consumer) ตัวเลขที่บันทึกคือผลรวมช่วงของ segment — guidance Q2 FY27 จากคอลล์ยังยืนยันจากแหล่งที่เข้าถึงได้ไม่ได้จึงยังไม่บันทึก และ Q1 FY26 เว้นแถวเพราะยืนยันตัวเลขไม่ได้"
      }
    },
    "META": {
      "ticker": "META",
      "name": "Meta Platforms, Inc.",
      "layer": "model",
      "thesis": {
        "statement": "Meta คือผู้ชนะเชิง \"ประยุกต์ใช้ AI\" ที่ชัดเจนที่สุดในกลุ่ม Mag7 — ใช้ AI ยกระดับเครื่องจักรโฆษณาที่มีผู้ใช้ ~3.6 พันล้านคนต่อวัน จนรายได้โต ~+26% YoY ต่อเนื่อง แล้วนำกระแสเงินสดเกือบทั้งหมดไปเดิมพันครั้งใหญ่กับ personal superintelligence (Muse), AI datacenter ระดับหลายกิกะวัตต์ และ AI glasses — ถ้าเดิมพันสำเร็จแม้บางส่วน หุ้นที่ซื้อขายถูกที่สุดกลุ่มหนึ่งใน Mag7 ก็มี upside ระยะยาวสูง แต่ต้องแลกกับ FCF ที่ติดลบ ความเสี่ยงการเจือจาง และภาระคดีความหลายหมื่นล้านดอลลาร์",
        "pillars": [
          "AI ad stack (GEM, Andromeda, Advantage+) เพิ่ม conversion และราคาโฆษณาได้จริง — เป็น AI ที่สร้างรายได้แล้ววันนี้ ไม่ใช่แค่คำสัญญา",
          "ฐานผู้ใช้ ~3.6 พันล้านคน/วัน ใน 4 แอปหลัก คือช่องทาง distribute AI assistant และ agent ที่ใหญ่ที่สุดในโลกตะวันตก — Muse personal agent มีผู้ตั้งค่า >10 ล้านคนใน ~6 สัปดาห์แรก",
          "Core business ยังกำไรสูง (FoA operating margin ~42% เมื่อไม่รวมค่าปรับคดี) เป็นแหล่งทุนหลักของการเดิมพัน AI — แต่ capex แซง operating cash flow แล้ว จึงเริ่มพึ่งหนี้และเตรียมช่องระดมทุนผ่านหุ้น Class C",
          "Meta AI + Muse (โมเดล Muse Wonder ขึ้นระดับ frontier แล้ว) และแว่น AI ที่เป็นผู้นำ category ใหม่ — optionality ด้าน subscription/commerce ที่ยังแทบไม่อยู่ในประมาณการ",
          "Valuation ~18x forward P/E (ต่อ consensus FY2027) ยังถูกกว่าเพื่อนร่วมกลุ่ม AI ส่วนใหญ่ ทั้งที่รายได้ยังโต ~26%"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตรายได้",
          "current": "~+26% YoY (Q3 2026 — $64.6B) เหนือขอบบน guide $61-64B · ชะลอเล็กน้อยจาก +28% (Q2) · guide Q4 $73-76B (~+22-27%)",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "เครื่องยนต์โฆษณายังโตแรงมากสำหรับบริษัทขนาดนี้ — ราคาต่อโฆษณา +14% (ประสิทธิภาพโฆษณาดีขึ้นจาก AI ranking + เศรษฐกิจดีกว่าปีก่อน) ชดเชยปริมาณโฆษณาที่โตช้าลงเหลือ +10% · อัตราโตเท่ากับ Q3 ปีก่อน (+26%) หลังพีค +33% ใน Q1 และบริษัทบอกว่าจะรักษาการเติบโตที่แข็งแรงได้ตลอดปี 2027"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น",
          "current": "GAAP EPS $3.83 (Q3 2026) รวมค่าใช้จ่ายครั้งเดียว $9.89B จากข้อตกลงคดีเยาวชน (กด EPS -$3.57) · ไม่รวมรายการนี้ $7.40 โตเพียง ~2% YoY (Q3'25 ที่ตัดภาษีครั้งเดียวออก = $7.25)",
          "trend": "down",
          "score": 50,
          "impact": "negative",
          "why": "EPS ที่รายงานถูกรายการครั้งเดียวบิดทุกไตรมาส (Q1 ภาษีบวก $8.03B, Q2 สำรองคดี + ชดเชยเลิกจ้าง, Q3 ค่าปรับ $9.89B) — ฐานที่ตัดรายการพิเศษชะลอจาก ~+14% (Q1) เหลือ ~+2% (Q3) แม้รายได้ +26% เพราะค่าเสื่อม/infra, ค่า token AI จากภายนอก และ R&D (+32%) โตเร็วกว่ารายได้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ติดลบ ~-$2.1B (Q3 2026) เป็นครั้งแรก — capex รวม finance lease $34.9B แซง operating cash flow ~$32.8B",
          "trend": "down",
          "score": 28,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้างที่ชัดที่สุด: capex ทั้งปี $135-145B กลืนกระแสเงินสดหมด ปี 2027 บริษัทบอกว่าจะ 'ลงทุนเชิงรุกต่อ' และ Muse ใช้ compute สูง (serving cost จะเพิ่ม) บวกเงินที่ต้องจ่ายตามข้อตกลงคดีอีกหลายปี — FCF มีแนวโน้มติดลบหรือใกล้ศูนย์ต่อไปจนกว่า capex จะ peak"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~20% (Q3 2026) จาก ~31% (Q2) เพราะค่าปรับ $9.89B — ไม่รวมรายการนี้ ~35% (Q3 ปีก่อน ~40%) · FoA ไม่รวมค่าปรับ ~42%",
          "trend": "down",
          "score": 60,
          "impact": "neutral",
          "why": "ตัวเลขที่รายงานต่ำสุดในรอบหลายปีจากค่าปรับ แต่ margin พื้นฐานก็หดจริง ~5pp YoY จากค่าเสื่อม AI, ค่า cloud/token ภายนอก และ RL ที่ยังขาดทุน ~$4.1B/ไตรมาส — บริษัทยังยืนยันว่ากำไรจากการดำเนินงานปี 2026 (ไม่รวมค่าปรับ) จะสูงกว่าปี 2025"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ลดลงต่อ — ฐานเงินลงทุนบวมจาก capex ~$135-145B/ปี ขณะกำไรจากการดำเนินงานที่ไม่รวมค่าปรับโตเพียง ~11% YoY",
          "trend": "down",
          "score": 58,
          "impact": "neutral",
          "why": "ผลตอบแทนต่อทุนถูกกดสองทาง (margin พื้นฐานหด + capex ปีนี้เกือบเท่าตัวของปีก่อน) —จะฟื้นก็ต่อเมื่อ Muse, enterprise API และโฆษณาที่ขับด้วย AI สร้างรายได้คุ้มค่าเสื่อม ซึ่งบริษัทเองยอมรับว่าการลงทุน MSL จะคืนทุนช้ากว่าธุรกิจหลัก"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสด + หลักทรัพย์ ~$82.4B (ทรงตัวได้เพราะออกหุ้นกู้ $25B เมื่อ พ.ค. 2026) ใกล้เคียงหนี้รวม ~$83.7B — net cash ราวศูนย์ (จาก ~+$23B สิ้นปี 2025)",
          "trend": "down",
          "score": 70,
          "impact": "neutral",
          "why": "สภาพคล่องยังสูงมาก แต่เงินสดไม่ได้มาจาก FCF แล้ว และกำลังมีภาระคดีจ่ายออก (ข้อตกลงอัยการรัฐสูงสุด ~$18.59B ผ่อน 10 ปี + ค่าปรับ New Mexico $25B ที่อุทธรณ์อยู่) — ความยืดหยุ่นทางการเงินลดลงชัดเจนเทียบปีก่อน"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้รวม ~$83.7B (จาก ~$59B สิ้นปี 2025 หลังออกหุ้นกู้ $25B พ.ค. 2026) + JV/off-balance financing (Hyperion ~$27B)",
          "trend": "down",
          "score": 54,
          "impact": "neutral",
          "why": "หนี้เพิ่มเกือบ 3 เท่าในราว 2 ปี (~$29B สิ้นปี 2024 → ~$84B) บวก commitment นอกงบดุล — ยังรับได้ด้วยกระแสเงินสดโฆษณา แต่เมื่อ FCF ติดลบและมีค่าปรับคดีรออยู่ ความยืดหยุ่นจะลดลงมากหากรอบลงทุน AI สะดุด"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "หยุด buyback ทั้งปี 2026 (9 เดือน = $0) ขณะ SBC ~$7.4B/ไตรมาส (+33% YoY) — หุ้นออกจำหน่ายเพิ่ม ~1.4% YoY (~2.52B → ~2.56B) · ตั้งหุ้น Class C ไร้สิทธิออกเสียงเพื่อเปิดทางระดมทุน",
          "trend": "down",
          "score": 52,
          "impact": "negative",
          "why": "จุดเปลี่ยนจากอดีตที่ buyback ชดเชย SBC เกินพอ — ตอนนี้ไม่มีอะไรชดเชย SBC ที่โตตามแพ็กเกจ AI talent และหุ้น Class C ถูกออกแบบให้ออกหุ้นเพิ่มทุนได้โดยไม่กระทบอำนาจโหวตของ Zuckerberg ความเสี่ยงการเจือจางสัดส่วนความเป็นเจ้าของจึงสูงขึ้นชัดเจน"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "AI CapEx FY2026 $135-145B (ยกขอบล่าง) + R&D/AI talent (+32% YoY) · หยุด buyback · ตั้งหุ้น Class C · RL ขาดทุนจะลดเหลือ ~$15B ปี 2027 · ปันผลต่อ",
          "trend": "down",
          "score": 58,
          "impact": "neutral",
          "why": "ยังเทเกือบทุกอย่างไป AI จน capex แซงกระแสเงินสด แล้วหันไปพึ่งหนี้และเตรียมระดมทุนด้วยหุ้น — ด้านบวกคือเริ่มมีผลงานจริง (Muse, Muse Wonder) และหั่นงบ VR/Reality Labs แต่ผลตอบแทนทางการเงินยังพิสูจน์ไม่ได้ ผู้ถือหุ้นต้องยอม FCF ติดลบแลก optionality"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "forward P/E ~18x ต่อ consensus FY2027 (~$34) / ~21x ต่อ FY2026 ฐาน GAAP (ราคา ~$612 ปิด 28 ต.ค. 2026 · mcap ~$1.57T) — ยังอยู่กลุ่มถูกสุดของ Mag7 สาย AI",
          "trend": "down",
          "score": 76,
          "impact": "positive",
          "why": "หุ้นพุ่ง ~27% ใน ก.ย. จากกระแส Muse แล้วร่วง ~12% หลังงบ Q3 (ค่าปรับ, FCF ติดลบ, หุ้น Class C) — multiple ขยับจาก ~16x เป็น ~18x จึงถูกน้อยลงกว่ารอบก่อน แต่ยังต่ำกว่าตลาดรวม (~19x) ทั้งที่รายได้โต ~26% · ส่วนลดตอนนี้สะท้อนทั้งคุณภาพกำไร/FCF และภาระคดีที่จับต้องได้แล้ว ไม่ใช่ธุรกิจโฆษณาพัง"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 80,
        "recurringPct": null,
        "note": "รายได้ ~98% มาจากโฆษณา Family of Apps ที่ยังโตแรง (+26% YoY, ราคาต่อโฆษณา +14%, ปริมาณ +10%) — อัตราโตเท่ากับ Q3 ปีก่อนหลังพีคใน Q1 (+33%) และ guide Q4 ~+22-27% · รายได้อื่น (WhatsApp paid messaging, subscription Meta One) โต +59% แต่ยังเล็ก · คุณภาพการโตของ 'รายได้' ยังดีและ beat guidance 5 ไตรมาสติด แต่คุณภาพของ 'กำไร' อ่อนลงจากค่าเสื่อม/ค่าใช้จ่าย AI และค่าปรับคดี",
        "segments": [
          {
            "name": "โฆษณา Family of Apps (Facebook, Instagram, WhatsApp, Messenger)",
            "sharePct": 97.6,
            "growthNote": "~+26% YoY ($63.1B) — ราคาต่อโฆษณา +14%, impressions +10% · partnership ads run-rate >$15B (+97% YoY) · GEM/Andromeda/Generative Recommender เพิ่ม conversion ต่อเนื่อง",
            "trend": "up"
          },
          {
            "name": "รายได้อื่นของ FoA (WhatsApp Business, Meta Verified)",
            "sharePct": 1.7,
            "growthNote": "$1.1B +59% YoY — WhatsApp paid messaging + subscription (Meta One >15 ล้าน subscriptions/trials) · business AI/agent คือ upside ระยะยาวของ WhatsApp",
            "trend": "up"
          },
          {
            "name": "Reality Labs (Quest, แว่น Ray-Ban/Oakley Meta, Display)",
            "sharePct": 0.7,
            "growthNote": "$443M -6% YoY (Quest ลดลง แต่แว่น AI ยังโตแรง) · ขาดทุน ~$4.1B/ไตรมาส — ทั้งปี 2026 ~$18-19B และคาดลดเหลือ ~$15B ในปี 2027",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 78,
        "items": [
          {
            "item": "AI ad stack (GEM, Andromeda, Advantage+) — ใช้ AI เพิ่มประสิทธิภาพโฆษณาโดยตรง",
            "status": "executing",
            "evidence": "รายได้โฆษณา +26% YoY, ราคาต่อโฆษณา +14% · Q3 ขยาย GEM ไปหลายพื้นที่ (conversion โฆษณาแอป +9.6%), Andromeda +1.4% บน Facebook และ Generative Recommender ~+2% ในกลุ่มเป้าหมายบน Facebook Feed · partnership ads run-rate >$15B — AI monetization ที่จับต้องได้ที่สุดในกลุ่ม Mag7"
          },
          {
            "item": "Meta AI ใน 4 แอปหลัก + Muse personal agent",
            "status": "executing",
            "evidence": "Muse มีผู้ตั้งค่า >10 ล้านคน (สหรัฐ/แคนาดา) ใน ~6 สัปดาห์ ~25% ใช้งานในแต่ละวัน และ >25% ของผู้ใช้รายสัปดาห์ใช้ช้อปปิ้ง (ยอดซื้อเฉลี่ย >$200) · engagement ต่อคนใน Meta AI เพิ่มกว่าเท่าตัวตั้งแต่ เม.ย. — monetization เพิ่งเริ่ม (subscription/ค่าธรรมเนียม commerce) และต้นทุน serving ยังสูง"
          },
          {
            "item": "Superintelligence Labs + โมเดล frontier (Muse Wonder)",
            "status": "on-track",
            "evidence": "Muse Wonder (ต.ค. 2026) โมเดล frontier ตัวแรก — ดัชนีอิสระ Artificial Analysis ~52-56 ทัดเทียม GPT-6 Astra/Gemini 4 Argon แต่ยังตาม Claude Opus 5.5 · ออก Muse Spark 1.2/1.3, Muse Code, open-weight (Muse Glimmer, Muse Spark Open) และเปิด API — ปิดช่องว่างได้แล้ว แต่ต้องลงทุนโมเดลใหญ่ขึ้นต่อเนื่อง"
          },
          {
            "item": "AI infrastructure — Prometheus, Hyperion (หลาย GW), ชิป MTIA, ดีลเช่า cloud (Google, CoreWeave, Oracle)",
            "status": "on-track",
            "evidence": "capex FY2026 แคบลงเป็น $135-145B (ยกขอบล่าง) · Q3 $34.9B และปี 2027 จะลงทุนเชิงรุกต่อ · เริ่มย้าย content understanding ไปโมเดล Muse ของตัวเอง (ทดสอบภายในลดต้นทุนต่อหน่วย >80%) — ส่งมอบตามแผน แต่ 'ขนาดของเงิน' ทำให้ FCF ติดลบแล้ว"
          },
          {
            "item": "AI glasses (Ray-Ban Meta, Ray-Ban Display, Oakley Meta)",
            "status": "executing",
            "evidence": "ยอดขายแว่น AI ยังโตแรง (รายได้ RL รวม -6% เพราะ Quest ลดลง) · Muse จะลงแว่นตั้งแต่ พ.ย. 2026 และตั้งราคาฮาร์ดแวร์เพื่อสร้างฐาน subscription · ลดน้ำหนัก VR ทำให้ RL ขาดทุนคาดลดเหลือ ~$15B ในปี 2027"
          },
          {
            "item": "Business AI / agent สำหรับ messaging commerce",
            "status": "executing",
            "evidence": "รายได้อื่นของ FoA +59% เป็น $1.1B จาก WhatsApp paid messaging + subscription · Meta One มี >15 ล้าน subscriptions/trials · ผู้ลงโฆษณาที่ใช้ Meta AI business assistant ได้ conversion เพิ่ม ~5% และเพิ่มงบ ~9% · Muse สำหรับ SME (~500 ล้านรายที่ใช้แอป Meta ตามผลสำรวจของบริษัท) คือช่องรายได้ถัดไป"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Network effect ของผู้ใช้ ~3.6 พันล้านคน/วัน + ชุดข้อมูลพฤติกรรม first-party ที่ใหญ่ที่สุดนอกจีน + AI ad stack ที่ให้ ROI วัดผลได้ดีที่สุดใน social — คูเมืองฝั่งแอปและโฆษณากำลังแข็งขึ้นจาก AI และ Muse Wonder พาบริษัทกลับมาอยู่ระดับ frontier (ยังตาม Anthropic) · จุดเปราะย้ายไปที่ต้นทุน compute และข้อจำกัดด้านผู้ใช้วัยรุ่นจากคดีความ",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ครองโฆษณา social media ส่วนใหญ่ของโลกตะวันตก, ผู้ใช้ ~3.64 พันล้านคน/วัน (+3% YoY), Threads แซง X ด้านผู้ใช้รายเดือน, เวลาใช้งาน Facebook/Instagram สูงสุดเป็นประวัติการณ์ และชนะคดีผูกขาด FTC ปลายปี 2025"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "เก่งระดับโลกด้าน recommendation/ads AI และกลับมาทัน frontier ด้วย Muse Wonder (ต.ค. 2026 — ดัชนีอิสระทัดเทียม GPT-6 Astra/Gemini 4 Argon แต่ยังตาม Claude Opus 5.5) หลัง Llama 4 แผ่วในปี 2025 — ยังต้องพิสูจน์ว่ารุ่นถัดไปจะนำได้จริง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "Muse จากไอเดียสู่ผลิตภัณฑ์ใน ~8 เดือน, ออกโมเดลหลายรุ่นในไม่กี่เดือน, สร้าง datacenter แบบเร่งรัด และออกแว่นรุ่นใหม่ทุกปี"
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
            "status": "stable",
            "note": "Llama เคยเป็นมาตรฐาน open-weight แต่โมเมนตัมเสียให้โมเดลจีน (Qwen, DeepSeek) — ตอนนี้เปลี่ยนเป็นตระกูล Muse: เปิด API (Wonder $4/$20 ต่อล้าน token), Muse Code และ open-weight รุ่นเล็ก (Glimmer, Spark Open) แต่ตัวท็อปเป็น closed-weight และยังไม่อยู่บน marketplace ของ hyperscaler — การยอมรับของนักพัฒนายังต้องรอพิสูจน์"
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
        "score": 58,
        "verdict": "วินัยดีในอดีต (Year of Efficiency) แต่ตอนนี้คือโหมด \"เดิมพันหนักที่สุดในประวัติศาสตร์บริษัท\" เต็มตัว — capex แซงกระแสเงินสดจน FCF ติดลบ, หยุด buyback ทั้งปี 2026, ออกหุ้นกู้เพิ่ม และตั้งหุ้น Class C ไร้สิทธิออกเสียงเพื่อเปิดทางระดมทุน · ด้านบวกคือการลงทุนเริ่มออกผล (Muse, Muse Wonder) และหั่นงบ Reality Labs · ผู้ถือหุ้นต้องรับทั้ง FCF ติดลบ ความเสี่ยงการเจือจาง และภาระคดีหลายหมื่นล้านดอลลาร์ แลกกับ optionality ระยะยาว",
        "items": [
          {
            "label": "CapEx (AI datacenter)",
            "current": "~$72B ปี 2025 → guide ปี 2026 $135-145B (ยกขอบล่างจาก $130B) · Q3 $34.9B แซง OCF · ปี 2027 'ลงทุนเชิงรุกต่อ' (ยังไม่ให้ตัวเลข)",
            "assessment": "neutral",
            "why": "จำเป็นเชิงกลยุทธ์ถ้าเชื่อว่า compute คือคอขวดของ AI และเริ่มเห็นผลิตภัณฑ์จริง (Muse) แต่ขนาดใหญ่จน FCF ติดลบ — ถ้ารายได้ AI ไม่มาตามคาด จะกลายเป็นค่าเสื่อมก้อนมหึมาที่กดกำไรหลายปี"
          },
          {
            "label": "R&D + ค่าตัว AI talent",
            "current": "R&D ~$20B/ไตรมาส (+32% YoY) + แพ็กเกจนักวิจัย AI ระดับร้อยล้านดอลลาร์ต่อคน + ลงทุน Scale AI ~$14B · SBC +33% YoY",
            "assessment": "neutral",
            "why": "การซื้อความสามารถเริ่มให้ผลงาน (Muse Wonder ขึ้นระดับ frontier) — สมเหตุสมผลเชิงกลยุทธ์ แต่ต้นทุนต่อเนื่องสูงมากและยังไม่สร้างรายได้ที่วัดผลได้ชัด"
          },
          {
            "label": "การซื้อหุ้นคืน (buyback)",
            "current": "หยุดซื้อหุ้นคืน — 9 เดือนแรกปี 2026 = $0 (ช่วงเดียวกันปีก่อน ~$26.3B)",
            "assessment": "neutral",
            "why": "สมเหตุสมผลเมื่อ FCF ติดลบและต้องสำรองเงินจ่ายคดี แต่แปลว่า SBC ~$7.4B/ไตรมาส ไม่มีอะไรชดเชย หุ้นออกจำหน่ายจึงเริ่มเพิ่ม (~+1.4% YoY) — ต่างจากประวัติที่ซื้อคืนหนักช่วงหุ้นถูก (ปี 2022)"
          },
          {
            "label": "เงินปันผล",
            "current": "$0.525/หุ้น/ไตรมาส (~$1.36B ต่อไตรมาส) คงที่ตลอดปี 2026 · yield ~0.3%",
            "assessment": "good",
            "why": "ใช้เงินน้อยเทียบขนาดธุรกิจ และยังเป็นสัญญาณวินัยทางการเงินที่ช่วยขยายฐานนักลงทุนสถาบัน"
          },
          {
            "label": "การระดมทุน: หนี้ / JV / หุ้น Class C",
            "current": "หนี้รวม ~$83.7B (รวมหุ้นกู้ใหม่ ~$30B ปลายปี 2025 และ $25B พ.ค. 2026) + JV Hyperion กับ Blue Owl ~$27B + หุ้น Class C ไร้สิทธิออกเสียง (แจก 1:1 ≈ split 2:1 ปลาย ม.ค. 2027)",
            "assessment": "neutral",
            "why": "กระจายภาระเงินทุนได้ฉลาดและเงินสดยังสูง แต่ fixed commitment สะสมเร็ว และหุ้น Class C เปิดทางให้ออกหุ้นเพิ่มทุนโดยผู้ถือหุ้นภายนอกไม่ได้สิทธิออกเสียงเพิ่ม — ถ้า demand AI ต่ำกว่าคาด ภาระทั้งหมดนี้จะย้อนกลับมากดงบและมูลค่าต่อหุ้น"
          },
          {
            "label": "Reality Labs (การขาดทุนสะสม)",
            "current": "ขาดทุน ~$18-19B ปี 2026 (Q3 ~$4.1B) → คาด ~$15B ปี 2027 · ชะลอลงทุน VR หันไป AI/แว่น",
            "assessment": "poor",
            "why": "เริ่มมีวินัยมากขึ้น (ตัดงบ VR, ตั้งเป้าเข้าใกล้กำไร) แต่ยังเผาเงิน ~$15B+/ปี ขณะรายได้ segment ยังเล็กมาก — ผลตอบแทนที่จับต้องได้ยังมีแค่แว่น AI"
          }
        ]
      },
      "valuationView": {
        "level": "cheap",
        "note": "forward P/E ~18x ต่อ consensus FY2027 (~$34) / ~21x ต่อ FY2026 ฐาน GAAP (ราคา ~$612 ปิด 28 ต.ค. 2026, mcap ~$1.57T) — ยังอยู่กลุ่มถูกสุดของ Mag7 สาย AI และต่ำกว่าตลาดรวม (~19x) ทั้งที่รายได้โต ~26% · แต่ 'คุณภาพของ E' แย่ลงอีก: FCF ติดลบ, ไม่มี buyback, ภาระคดี (ข้อตกลงอัยการรัฐสูงสุด ~$18.59B + ค่าปรับ New Mexico $25B ที่อุทธรณ์) และความเสี่ยงเจือจางจากหุ้น Class C — ส่วนลดคือค่าความไม่แน่นอนของรอบลงทุนและคดีความ ไม่ใช่ปัญหาธุรกิจโฆษณา risk/reward ยังเอียงบวกสำหรับระยะยาวที่รับความผันผวนได้"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026)",
          "prev": "$60.8B (+28% YoY) · impressions +14%, ราคา/โฆษณา +12%",
          "now": "$64.6B (+26% YoY) เหนือขอบบน guide $61-64B · impressions +10%, ราคา/โฆษณา +14% · guide Q4 $73-76B",
          "direction": "positive"
        },
        {
          "metric": "กำไร/มาร์จิ้น",
          "prev": "op margin ~31% · GAAP EPS $6.18 (สำรองคดี ~$2.4B + ชดเชยเลิกจ้าง ~$1.18B)",
          "now": "op margin ~20% · GAAP EPS $3.83 จากค่าปรับข้อตกลงคดีเยาวชน $9.89B · ไม่รวมรายการนี้ margin ~35%, EPS $7.40 (+2% YoY)",
          "direction": "negative"
        },
        {
          "metric": "Free cash flow / CapEx",
          "prev": "FCF ~$0.8B · capex ~$31B · guide ปี 2026 $130-145B",
          "now": "FCF ~-$2.1B (ติดลบครั้งแรก) · capex $34.9B · guide แคบลงเป็น $135-145B · ค่าใช้จ่ายทั้งปี $175-179B (รวมค่าปรับ)",
          "direction": "negative"
        },
        {
          "metric": "คดีความ",
          "prev": "สำรองคดี ~$2.4B · คดีเยาวชนยังเป็น overhang",
          "now": "ข้อตกลง 52 อัยการรัฐ/ดินแดน (ส.ค.) จ่ายสูงสุด ~$18.59B ทยอยราว 10 ปี (บันทึกค่าใช้จ่ายแล้ว $9.89B) + ศาล New Mexico สั่งปรับ $25B (21 ต.ค.) ซึ่ง Meta จะอุทธรณ์",
          "direction": "negative"
        },
        {
          "metric": "AI / Muse",
          "prev": "Superintelligence Labs ยังไม่มีผลงาน · โมเดลตามหลัง frontier",
          "now": "Muse agent >10 ล้านคนใน ~6 สัปดาห์ · Muse Wonder (ต.ค.) ทัดเทียม GPT-6 Astra/Gemini 4 Argon",
          "direction": "positive"
        },
        {
          "metric": "การคืนทุน / โครงสร้างหุ้น",
          "prev": "buyback ครึ่งปีแรก = $0 · หุ้นสองคลาส A/B",
          "now": "buyback 9 เดือน = $0 · ตั้งหุ้น Class C ไร้สิทธิออกเสียง (แจก 1:1 ≈ split 2:1 ปลาย ม.ค. 2027) เพื่อเปิดทางระดมทุน",
          "direction": "negative"
        }
      ],
      "risks": [
        "AI overbuild: capex $135-145B/ปี และปี 2027 จะ 'ลงทุนเชิงรุกต่อ' — FCF ติดลบแล้ว (~-$2.1B ใน Q3) และ Muse ใช้ compute สูง (serving cost จะเพิ่ม) ถ้ารายได้จาก AI (Muse, Meta AI, enterprise API) มาไม่ทัน กำไรและ multiple จะโดนกดหลายปี",
        "คดีความด้านเยาวชน/ผู้บริโภค: ค่าปรับ New Mexico $25B (ดอกเบี้ยหลังคำพิพากษา 15%) อยู่ระหว่างอุทธรณ์ · ข้อตกลงอัยการรัฐจ่ายสูงสุด ~$18.59B แต่บันทึกค่าใช้จ่ายแล้วเพียง $9.89B (ส่วน ~30% จ่ายเฉพาะถ้า YouTube/TikTok ยอมทำแบบเดียวกัน) · ยังมีคดีเยาวชนรอขึ้นศาลในสหรัฐอีกหลายคดี และข้อตกลงบังคับจำกัดการใช้งานวัยรุ่น (2 ชม./วัน, โหมดกลางคืน) ซึ่งอาจกด engagement กลุ่มนี้",
        "การเจือจางและธรรมาภิบาล: หยุด buyback, SBC ~$7.4B/ไตรมาส (+33% YoY) และหุ้น Class C ไร้สิทธิออกเสียงเปิดทางระดมทุนด้วยหุ้นโดยอำนาจควบคุมยังอยู่ที่ Zuckerberg — net cash เหลือราวศูนย์ (หนี้ ~$83.7B ≈ เงินสด ~$82.4B)",
        "การแข่งขันโมเดล frontier: Muse Wonder ทัดเทียม GPT/Gemini แต่ยังตาม Anthropic และเป็น closed-weight — สนามนี้ต้องใช้เงินและ compute มากขึ้นทุกรุ่น ถ้ารุ่นถัดไปตามไม่ทัน ต้นทุน MSL/talent จะกลายเป็นต้นทุนจม",
        "รายได้กระจุกในโฆษณา ~98% + กฎระเบียบ: อ่อนไหวต่อเศรษฐกิจถดถอย, EU (DMA, โฆษณา less-personalized) กดรายได้ยุโรป และ engagement เสี่ยงถูกดึงโดยแอป AI-native รุ่นใหม่ (เช่นผลิตภัณฑ์ consumer ของ OpenAI)"
      ],
      "asOf": "2026-10",
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
        "notes": "META ไม่เคยแตกหุ้น ราคาหุ้นและ EPS ทุกปีจึงอยู่บนฐานเดียวกันโดยไม่ต้องปรับ; ราคาปิดสิ้นปีใช้ราคาปิดจริงของวันทำการสุดท้าย (ไม่ปรับเงินปันผล — Meta เริ่มจ่ายปันผลปี 2024); FCF คำนวณแบบ OCF ลบ capex ตามนิยามของงานนี้ ซึ่งต่างเล็กน้อยจาก FCF ที่ Meta รายงานเอง (ของบริษัทหักรวม principal payments on finance leases เช่น FY2023 บริษัทรายงาน ~43.0B เทียบกับ 44.1B ที่คำนวณตรง ๆ); FY2025 diluted EPS 23.49 ลดลงเล็กน้อยจากปีก่อนเพราะ one-time tax charge ราว 15.9B ใน Q3/2025 และ capex พุ่งเป็น ~69.7B จากการลงทุน AI infrastructure ทำให้ FCF ลดลงทั้งที่ OCF สูงขึ้นมาก; จำนวนหุ้น diluted โดยนัย (net income/EPS) ลดลงอย่างช้า ๆ จาก ~2.86B (2021) เหลือ ~2.53B (2025) จากการซื้อหุ้นคืน สอดคล้องตามคาด; ตัวเลขปัดเศษ ความแม่นยำประมาณ 1-2%; ต.ค. 2026 Meta ประกาศแจกหุ้น Class C (ไม่มีสิทธิออกเสียง) 1 หุ้นต่อหุ้น A/B ทุกหุ้น เทียบเท่า split 2:1 คาดเริ่มซื้อขายปลาย ม.ค. 2027 — ตัวเลขต่อหุ้นที่รายงานหลังจากนั้น (EPS, ราคา) น่าจะอยู่บนฐานหุ้นใหม่ ต้องปรับข้อมูลย้อนหลังทั้งชุดให้เป็นฐานเดียวกันก่อนเทียบ · opMarginExItemsPct (Q2'26 ~36.8% · Q3'26 ~35.4%) = operating margin ไม่รวมรายการครั้งเดียวในกำไรดำเนินงาน (สำรองคดี + เลิกจ้าง · ค่าข้อตกลงคดี 52 รัฐ) ตามตัวเลขที่บริษัทเปิดเผย — หน้า Intelligence ใช้ค่านี้วัด margin/การเติบโตของกำไร ตารางรายไตรมาสยังแสดง margin ตามงบ",
        "sources": [
          "https://stockanalysis.com/stocks/meta/financials/",
          "https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx",
          "https://www.sec.gov/Archives/edgar/data/1326801/000162828026003832/meta-12312025xexhibit991.htm",
          "https://query1.finance.yahoo.com/v8/finance/chart/META (unadjusted year-end closes)",
          "https://mlq.ai/stocks/META/free-cash-flow/",
          "https://www.statmuse.com/money/ask/meta-closing-price-dec-31-2025",
          "https://www.sec.gov/Archives/edgar/data/0001326801/000162828026066700/meta-09302026xexhibit991.htm",
          "https://www.sec.gov/Archives/edgar/data/0001326801/000162828026066773/meta-20260930.htm",
          "https://s21.q4cdn.com/399680738/files/content_files/META-Q3-2026-Prepared-Remarks.pdf",
          "https://www.sec.gov/Archives/edgar/data/0001326801/000162828026028364/meta-03312026xexhibit991.htm",
          "https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Second-Quarter-2026-Results/"
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
            "endDate": "2025-09-30",
            "epsNote": "GAAP EPS $1.05 รวมภาษีครั้งเดียวที่ไม่ใช่เงินสด ~$15.93B (จากกฎหมายภาษีใหม่ของสหรัฐฯ One Big Beautiful Bill Act) กด EPS ~−$6.20 — ไม่รวมรายการนี้ ~$7.25 · รายการอยู่ใต้กำไรดำเนินงาน margin ตามงบจึงไม่บิด"
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
            "endDate": "2026-03-31",
            "epsNote": "GAAP EPS $10.44 รวมผลประโยชน์ทางภาษีครั้งเดียว ~$8.03B (แนวทาง Treasury Notice 2026-7 เรื่องค่า R&D ที่เคยตั้งเป็นทุน) เพิ่ม EPS +$3.13 — ไม่รวมรายการนี้ ~$7.31 (เทียบ $6.43 ปีก่อน) · รายการอยู่ใต้กำไรดำเนินงาน margin ตามงบจึงไม่บิด"
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
            "epsNote": "GAAP EPS $6.18 พลาดคาด ~$7.22 เพราะค่าใช้จ่ายครั้งเดียว: ตั้งสำรองคดีความ ~$2.4B + ค่าชดเชยเลิกจ้าง ~$1.18B (ลดพนักงาน ~8,000 คน) — operating margin ตกจาก 43% เหลือ 31% ชั่วคราว · รายได้ยังโต +28% YoY ปกติ",
            "opMarginExItemsPct": 36.8
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 64.6,
            "epsAdj": 3.83,
            "opMarginPct": 20.1,
            "fcfB": -1.16,
            "priceQEnd": 725,
            "endDate": "2026-09-30",
            "epsNote": "GAAP EPS $3.83 รวมค่าใช้จ่ายครั้งเดียว $9.89B จากข้อตกลงคดีสุขภาพจิตเยาวชนกับอัยการสูงสุด 52 รัฐ/ดินแดน (อยู่ในค่าใช้จ่ายดำเนินงาน หักภาษีได้น้อย กด EPS -$3.57) — ไม่รวมรายการนี้ EPS ~$7.40 (+2% YoY เทียบ $7.25 ของ Q3'25 ที่ตัดภาษีครั้งเดียวออก) และ operating margin ~35% (ที่รายงาน ~20%)",
            "opMarginExItemsPct": 35.4
          }
        ]
      },
      "nextEarnings": "2027-01",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 31.05,
            "revenue": 254.3
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 33.96,
            "revenue": 312.3
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~$61.0-64.0B",
            "actual": "~$64.6B",
            "result": "beat",
            "magnitudePct": 3.4
          },
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
            "revenue": 256.8,
            "eps": 29.11,
            "confidence": "high",
            "basis": "GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 312.3,
            "eps": 33.96,
            "confidence": "high",
            "basis": "GAAP"
          }
        ],
        "note": "Meta ให้ guidance รายได้เป็นช่วงทุกไตรมาส (beat ครบทั้ง 5 ไตรมาสที่ยืนยันได้) — guidance Q4 2026 = ~$73-76B (FX ลบ ~1%) · ค่าใช้จ่ายทั้งปี 2026 ยกเป็น ~$175-179B เพื่อรวมค่าปรับ $9.89B · CapEx ~$135-145B · ปี 2027 ยังไม่ให้ตัวเลข และหุ้น Class C (≈ split 2:1) จะเริ่มซื้อขายปลาย ม.ค. 2027 ทำให้ EPS ต่อหุ้นหลังจากนั้นเหลือราวครึ่งหนึ่ง ต้องปรับฐานก่อนเทียบกับแถวเดิม consensus รอบนี้มาจาก Yahoo Finance ฐาน GAAP (28 ต.ค. 2026): FY2026 ~$29.11 ซึ่งนักวิเคราะห์ส่วนใหญ่รวมค่าปรับแล้ว (ค่าสูงสุด $32.34 ≈ ฐานที่ไม่รวมค่าปรับ Q3) ส่วน FY2027 ~$33.96 ใกล้ Finviz (~$34.14) — แถว FY2026 เดิมใน estimateHistory ($31.05) มาจาก stockanalysis ฐาน non-GAAP จึงเทียบตรง ๆ ไม่ได้"
      }
    },
    "AMZN": {
      "ticker": "AMZN",
      "name": "Amazon.com, Inc.",
      "layer": "cloud",
      "thesis": {
        "statement": "Amazon คือผู้ให้บริการ cloud อันดับ 1 ของโลกที่กำลังเร่งตัวรอบใหม่จากคลื่น AI — AWS โตเร่งขึ้นต่อเนื่องสู่ ~+39% YoY (run rate ~$184B) พร้อม backlog ~$578B ขณะที่ชิป Trainium ของตัวเองและดีลระดับ anchor กับ Anthropic และ OpenAI ทำให้ AWS เป็นโครงสร้างพื้นฐานหลักของยุค AI ส่วนธุรกิจค้าปลีกกำลังขยาย margin ต่อเนื่องจาก robotics, AI ในโลจิสติกส์ และโฆษณาที่มี margin สูง ทำให้ AMZN เป็นหุ้น AI infrastructure ที่มี cash flow engine หลายตัวหนุนกันในระยะยาว — แลกกับ FCF ที่ติดลบหนักระหว่างรอบลงทุน capex ~$220B ที่ต้องกู้มาเสริม",
        "pillars": [
          "AWS เร่งตัวต่อเนื่องหลายไตรมาส (~+39% YoY, run rate ~$184B) พร้อม backlog ~$578B ที่ล็อกรายได้อนาคตหลายปี — ผู้บริหารมองโต >40% ทั้งปี 2027 และ 2028",
          "ชิป Trainium + Project Rainier (คลัสเตอร์ Trainium2 หลายแสนชิปให้ Anthropic) ลดการพึ่งพา NVIDIA — commitment รายได้ของ Trainium/Graviton เพิ่ม >20 เท่า YoY และเตรียมขาย Trainium นอก AWS ปลายปี 2027",
          "ดีล AI ระดับ anchor: ลงทุนใน Anthropic ~$8B และสัญญา AWS-OpenAI มูลค่า ~$38B หลายปี",
          "ธุรกิจโฆษณา (~$19.6B/ไตรมาส) โตระดับ high-teens ด้วย margin สูง เป็นเครื่องยนต์กำไรตัวที่สาม — Q3 ชะลอเหลือ +12% ชั่วคราวจากจังหวะ Prime Day",
          "ค้าปลีก + Prime flywheel ที่ margin ขยายต่อเนื่องจาก automation, robotics และการลดต้นทุน fulfillment (North America margin ~7.7% จาก ~4.5% ปีก่อน)"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+12% YoY (Q3 2026 — $201.9B; ~+16% ถ้าไม่นับ Prime Day ที่ย้ายไป Q2) · AWS +39% ($46.0B) · guide Q4 +12-16% ($240-247B)",
          "trend": "flat",
          "score": 76,
          "impact": "positive",
          "why": "รายได้รวมโตมั่นคงระดับกลางสิบ (headline +12% ถูกกดจากจังหวะ Prime Day ~4pp) โดย AWS เร่งขึ้นเป็น +39% เร็วสุดในรอบเกือบ 5 ปี ขณะค้าปลีกโตหลักหน่วย — ผลจริงเหนือกรอบบนของ guide Q3 ($197-202B) แต่จุดกึ่งกลาง guide Q4 ~$243.5B ต่ำกว่า consensus ~$244.5B เล็กน้อย"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "operating income $28.1B (+61% YoY, เหนือกรอบบน guide $22.5-26.5B) · GAAP EPS $1.89 (−3% YoY เพราะ Q3'25 มีกำไร Anthropic ~$9.5B ก่อนภาษี) ต่ำกว่า consensus ~$1.96-1.97 — ไตรมาสนี้ไม่มีรายการพิเศษ",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "กำไรจากการดำเนินงานโตแรง +61% จาก AWS (op income $17.8B) และ North America ที่ margin เกือบเท่าตัว — EPS ที่ดูทรงตัวเป็นเพราะฐานปีก่อนมีกำไรเงินลงทุนครั้งเดียว บวกดอกเบี้ยจ่ายที่เพิ่มเป็น ~$1.7B/ไตรมาสจากหุ้นกู้ที่ออกเพื่อ fund capex จึงต้องอ่านที่ operating เป็นหลัก"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF ติดลบลึก — TTM −$42.4B (จาก −$7.6B ณ Q2) · Q3 OCF $42.4B แต่ cash capex $75.9B · capex 2026 ~$220B และ 2027 'มากขึ้นอย่างมีนัย'",
          "trend": "down",
          "score": 28,
          "impact": "negative",
          "why": "จุดอ่อนเชิงโครงสร้างที่หนักขึ้น: capex ไตรมาสเดียวเกือบเท่า OCF สองไตรมาส ทำให้ FCF TTM ติดลบกว่า $40B และผู้บริหารส่งสัญญาณว่าปี 2027 จะลงทุนมากกว่านี้อีก — เดิมพันเดียวกับยุคแรกของ AWS แต่กด FCF หนักหลายปี"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin 13.9% (Q3 2026, op income $28.1B) สูงสุดเป็นประวัติการณ์ · AWS margin ~38.7% · North America ~7.7% (จาก ~4.5% ปีก่อน)",
          "trend": "up",
          "score": 76,
          "impact": "positive",
          "why": "margin ขยายทั้งจาก mix (AWS โตเร็วและ margin สูง) และค้าปลีก North America ที่ลดต้นทุนด้วย automation จน margin เกือบเท่าตัว — แต่ค่าเสื่อมจาก capex ~$220B และต้นทุน Amazon Leo ที่ยังบันทึกเป็นค่าใช้จ่ายใน Q4 จะเริ่มกดในระยะถัดไป"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ดีขึ้นตาม operating income (+61% YoY) แต่ฐานสินทรัพย์โตเร็วมาก — PP&E สุทธิ ~$509B (จาก ~$357B สิ้นปี 2025)",
          "trend": "up",
          "score": 60,
          "impact": "neutral",
          "why": "ผลตอบแทนต่อทุนฟื้นตาม margin ที่ขยาย — แต่สินทรัพย์ถาวรเพิ่ม ~$150B ใน 9 เดือน ต้องรอ datacenter สร้างรายได้เต็มกำลัง · backlog $578B เป็นหลักฐานว่ากำลังการผลิตที่ลงไปมีผู้ซื้อรออยู่"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสด+หลักทรัพย์ในตลาด ~$114B (เงินสด $55.8B + marketable securities $58.4B ณ 30 ก.ย. 2026) ลดจาก ~$123B สิ้นปี 2025",
          "trend": "down",
          "score": 74,
          "impact": "positive",
          "why": "ฐานเงินสดยังหนามากพอรองรับการลงทุนระดับแสนล้านดอลลาร์ แต่เริ่มลดลงแม้จะออกหุ้นกู้มากกว่า $100B ในรอบปี — ยังมีมูลค่าเงินลงทุนใน Anthropic ที่ถูกตีขึ้น ~$53B ใน Q2 เป็นสินทรัพย์แฝง"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้ระยะยาว ~$173B (จาก ~$65.6B สิ้นปี 2025) หลังออกหุ้นกู้ >$100B ในรอบปี (รวมดีล ~$37B มี.ค. และ ~$25B ก.ค. 2026) · ดอกเบี้ยจ่าย Q3 ~$1.7B (จาก ~$0.5B ปีก่อน) · พลิกเป็น net debt ~$59B",
          "trend": "up",
          "score": 55,
          "impact": "negative",
          "why": "งบดุลยังรับได้ (op income ~$28B/ไตรมาส ครอบดอกเบี้ย >15 เท่า และ credit ระดับท็อป) แต่โครงสร้างเปลี่ยนชัด — จาก net cash เป็น net debt ภายใน 9 เดือน เพราะ capex ใหญ่กว่า OCF มาก และดอกเบี้ยจ่ายที่เพิ่มเริ่มกิน EPS ให้เห็นแล้วไตรมาสนี้"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของผู้ถือหุ้น",
          "current": "หุ้น diluted ~10.93B (+0.8% YoY) · SBC ~$5.4B/ไตรมาส (~$19.9B TTM) โดยไม่มี buyback มาหักล้าง",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "SBC ระดับ ~$20B+/ปีถือว่าสูง แต่การเจือจางสุทธิยังต่ำเพราะฐานหุ้นใหญ่มาก จุดหักคะแนนคือบริษัทไม่ได้ซื้อหุ้นคืนจริงจังเหมือน big tech รายอื่น ทำให้ผู้ถือหุ้นรับการเจือจางเต็ม ๆ"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "cash capex Q3 $75.9B · ยืนยัน 2026 ~$220B และบอกว่า 2027 'มากขึ้นอย่างมีนัย' เทไป AWS/AI เกือบทั้งหมด · fund ด้วยหุ้นกู้ >$100B · SBC สูง, buyback ไม่มี",
          "trend": "up",
          "score": 68,
          "impact": "positive",
          "why": "เดิมพันหนักสุดในประวัติศาสตร์บริษัทที่โครงสร้างพื้นฐาน AI โดยมี backlog $578B และ AWS +39% เป็นหลักฐานว่า demand มาจริง — แต่เมื่อต้องกู้มา fund และ FCF ติดลบ ความคลาดเคลื่อนของ ROI จะมีราคาแพงกว่ายุค AWS แรก ๆ"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~22-26x บน consensus FY2027 EPS ~$10.5 (ราคา ~$244 ปิด 29 ต.ค. · after-hours ~$229 หรือ ~−6% · mcap ~$2.5-2.6T) · trailing P/E ~20x บิดต่ำจาก gain Anthropic · analyst target เฉลี่ย ~$332",
          "trend": "up",
          "score": 62,
          "impact": "neutral",
          "why": "หุ้นถอยหลังงบจาก EPS ต่ำกว่าคาดและ capex ที่พุ่ง ทำให้ multiple บนกำไรปีหน้าอยู่ระดับกลางยี่สิบ สวนทางกับ operating income +61% และ AWS +39% — ส่วนลดที่ตลาดให้สะท้อน FCF ติดลบและหนี้ที่เพิ่ม ไม่ใช่ธุรกิจที่แย่ลง"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 82,
        "recurringPct": 30,
        "note": "รายได้กระจายหลายขา — AWS (+39%, run rate ~$184B, backlog $578B) เป็นเครื่องยนต์กำไรหลัก, โฆษณา margin สูง (Q3 +12% จากจังหวะ Prime Day, guide Q4 กลับสู่ high-teens), 3P seller + subscription โต ~+10% เหนียวแน่น · headline +12% ถูกกดจาก Prime Day ที่ย้ายไป Q2 (~4pp) จึงอ่านว่า 'คงที่ระดับกลางสิบ' ไม่ใช่ชะลอจริง · คุณภาพรายได้ดีขึ้นจาก mix ที่เอียงไปหาส่วน margin สูง แต่ FCF ถูกกดจาก capex",
        "segments": [
          {
            "name": "Online Stores",
            "sharePct": 34,
            "growthNote": "โตช้า ~+2% YoY ใน Q3 (Prime Day ย้ายไป Q2) แต่เป็นฐาน traffic ของ flywheel ทั้งหมด",
            "trend": "flat"
          },
          {
            "name": "Third-Party Seller Services",
            "sharePct": 23,
            "growthNote": "โต ~+9% ($46.5B) · margin ดีกว่าขายเอง โตตาม marketplace",
            "trend": "up"
          },
          {
            "name": "AWS",
            "sharePct": 23,
            "growthNote": "+39% YoY ($46.0B, margin ~38.7%) — เร็วสุดในรอบเกือบ 5 ปีจากดีมานด์ AI · run rate ~$184B · backlog $578B",
            "trend": "up"
          },
          {
            "name": "Advertising",
            "sharePct": 10,
            "growthNote": "Q3 +12% ($19.6B) ชะลอชั่วคราวจากจังหวะ Prime Day/NBA · guide Q4 กลับสู่ high-teens · margin สูงมาก",
            "trend": "up"
          },
          {
            "name": "Subscription Services (Prime)",
            "sharePct": 7,
            "growthNote": "โต ~+11% ($14.0B) — รายได้ recurring ที่เหนียวแน่น",
            "trend": "up"
          },
          {
            "name": "Physical Stores และอื่น ๆ",
            "sharePct": 4,
            "growthNote": "โตช้า ~+2-3% ไม่ใช่ตัวขับหลัก",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 84,
        "items": [
          {
            "item": "AWS กลับมาเร่งตัวจากดีมานด์ AI",
            "status": "executing",
            "evidence": "AWS +39% YoY ($46.0B, run rate ~$184B) เร็วสุดในรอบเกือบ 5 ปี (จาก +37% Q2) · backlog $578B โตสามหลัก YoY (จาก $496B ณ Q2) · ผู้บริหารมอง AWS โต >40% ทั้งปี 2027 และ 2028 — capacity ที่ลงทุนขายได้จริงและยังไม่พอ"
          },
          {
            "item": "ชิป Trainium และ Project Rainier",
            "status": "executing",
            "evidence": "commitment รายได้ของ Trainium และ Graviton เพิ่มมากกว่า 20 เท่า YoY · ลูกค้าประหยัดจาก custom silicon >$2B ใน Q3 · เตรียมขาย Trainium ให้ใช้นอก AWS ปลายปี 2027 · คลัสเตอร์ Trainium2 สำหรับ Anthropic (Project Rainier) ใช้งานจริงและ Trainium3 ทยอยมา — ลดต้นทุนต่อ token และลดการพึ่งพา NVIDIA อย่างเป็นรูปธรรม"
          },
          {
            "item": "พันธมิตร Anthropic + ดีล OpenAI",
            "status": "executing",
            "evidence": "ลงทุน Anthropic (มูลค่าหุ้นถูกตีขึ้น ~$53B ใน Q2 · Q3 ไม่มี gain เพิ่ม) + เป็น cloud หลักเทรน Claude · ดีล OpenAI ใช้ AWS ~$38B — ล็อกลูกค้า AI frontier ทั้งสองค่าย"
          },
          {
            "item": "Bedrock + AgentCore + โมเดล Nova",
            "status": "executing",
            "evidence": "Bedrock เป็นบริการระดับหลายพันล้านดอลลาร์ที่โตเร็วสุดในประวัติ AWS — บริษัท Fortune 500 ใช้จ่ายเพิ่ม ~7 เท่า YoY, token volume ~17 เท่า · AgentCore มีลูกค้าหลักหมื่นราย deploy agent ใน Q3 มากกว่า 3 ไตรมาสก่อนรวมกัน ~2 เท่า — วางตัวเป็น 'ห้างโมเดล' เก็บค่าเช่าโครงสร้างพื้นฐานจากทุกค่าย"
          },
          {
            "item": "Alexa+ และ AI ฝั่งผู้บริโภค",
            "status": "on-track",
            "evidence": "ทยอย rollout Alexa+ ที่ขับเคลื่อนด้วย generative AI ให้ฐานอุปกรณ์หลายร้อยล้านเครื่อง — ยังต้องพิสูจน์การสร้างรายได้ แต่เป็น distribution ฝั่ง consumer ที่คู่แข่งไม่มีในบ้านผู้ใช้"
          },
          {
            "item": "AI/Robotics ในค้าปลีกและโลจิสติกส์",
            "status": "executing",
            "evidence": "หุ่นยนต์คลังสินค้ากว่า ~1 ล้านตัว + AI ในโลจิสติกส์ดัน margin North America ขึ้นเป็น ~7.7% (จาก ~4.5%) ให้เห็นในงบจริง · ลดพนักงานออฟฟิศ ~14,000 ตำแหน่งเมื่อปีก่อน ขณะที่ headcount รวม ~1.64 ล้านคน (+4% YoY) ยังจ้างฝั่งปฏิบัติการเพิ่ม"
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
            "note": "AWS ยังครองส่วนแบ่ง cloud อันดับ 1 ราว ~30% และไตรมาสนี้โต +39% — Azure และ GCP ยังโตเร็วเช่นกัน แต่ช่องว่างการเติบโตที่ AWS เคยตามหลังมาหลายปีแคบลงมาก"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "เคยถูกมองว่าตกขบวน gen-AI แต่ Trainium2/3, Project Rainier และ Bedrock พลิกภาพให้กลับมาเป็นผู้นำฝั่ง AI infrastructure — ถึงขั้นเตรียมขาย Trainium นอก AWS ปลายปี 2027 แม้ฝั่งโมเดลเอง (Nova) ยังไม่ใช่แถวหน้า"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "เร่งสร้าง data center และจัดหาพลังงาน (รวมดีลนิวเคลียร์) เร็วเป็นอันดับต้นของอุตสาหกรรม — ติดตั้ง AI accelerator ราวทุก ~14 วินาที, cash capex $75.9B ในไตรมาสเดียว — พร้อมตัดสินใจเจ็บ ๆ อย่างลดพนักงานออฟฟิศ ~14,000 ตำแหน่งเพื่อรีดประสิทธิภาพ"
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
            "note": "Bedrock ดึงโมเดลทุกค่ายมาอยู่บน AWS (token volume ~17 เท่า YoY), Marketplace ผูก ISV หลายหมื่นราย และฝั่ง consumer มี Prime/Alexa/Kindle/Fire เป็นวงแหวนล้อมลูกค้าอีกชั้น"
          },
          {
            "key": "developerAdoption",
            "label": "Developer Adoption",
            "status": "stable",
            "note": "ฐานนักพัฒนา AWS ใหญ่ที่สุดในโลก cloud และ AgentCore เริ่มมีลูกค้าหลักหมื่นราย แต่ในงาน AI-native บางส่วนนักพัฒนารุ่นใหม่ยังเริ่มจาก GPU cloud เฉพาะทางหรือ GCP มากขึ้น"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "backlog AWS $578B (โตสามหลัก YoY) คือสัญญาที่ล็อกรายได้ล่วงหน้าหลายปี ฝั่ง consumer สมาชิก Prime หลายร้อยล้านคนมี churn ต่ำมากและใช้จ่ายถี่กว่าผู้ใช้ทั่วไปชัดเจน"
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
        "score": 70,
        "verdict": "การจัดสรรทุนแบบ 'เทหมดหน้าตักเข้า AI' ที่มีหลักฐานรองรับชัดขึ้น — AWS +39% และ backlog $578B บอกว่าเงินถูกวางถูกที่ แต่รอบนี้ต้องกู้ >$100B และ FCF ติดลบกว่า $40B ระหว่างทาง จุดอ่อนคือผู้ถือหุ้นไม่ได้อะไรคืน (ไม่มีปันผล ไม่มี buyback) จึงต้องเชื่อใน ROI ระยะยาวของ management เต็มตัว ซึ่งประวัติของ Amazon ในการลงทุนหนักก่อนเก็บเกี่ยว (AWS, Prime, logistics) สนับสนุนให้เชื่อได้",
        "items": [
          {
            "label": "CapEx",
            "current": "~$220B ปี 2026 (ยืนยันอีกครั้ง) · cash capex Q3 $75.9B · ปี 2027 'มากขึ้นอย่างมีนัย' เกือบทั้งหมดลง AWS/AI infrastructure",
            "assessment": "good",
            "why": "ใหญ่ที่สุดในบรรดา hyperscaler แต่มี backlog $578B และการเร่งตัวของ AWS เป็นหลักฐานว่า demand มาจริง ไม่ใช่สร้างรอเก้อ — ความเสี่ยงคือค่าเสื่อมก้อนใหญ่ที่จะตามมา และ FCF ที่ติดลบจนต้องกู้"
          },
          {
            "label": "การลงทุนใน Anthropic",
            "current": "ลงทุนสะสม ~$8B และมูลค่าถูกตีขึ้น ~$53B ใน Q2 2026 (Q3 ไม่มี gain เพิ่ม — other income −$0.7B) พร้อมผูก Anthropic เป็นลูกค้ารายใหญ่ของ Trainium",
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
            "current": "ออกหุ้นกู้ >$100B ในรอบปี (~$37B มี.ค. และ ~$25B ก.ค. 2026 ฯลฯ) หนี้ระยะยาวขึ้นเป็น ~$173B · ดอกเบี้ยจ่าย ~$1.7B/ไตรมาส",
            "assessment": "neutral",
            "why": "ต้นทุนกู้ต่ำและงบดุลรับได้ แต่สะท้อนว่า OCF ~$42B/ไตรมาสไม่พอ fund capex ~$76B/ไตรมาส — ดอกเบี้ยจ่ายที่เพิ่มสามเท่าเริ่มกิน EPS แล้ว ต้องจับตาว่าวินัยการกู้ยังอยู่เมื่อ capex 2027 ขยับขึ้นอีก"
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
        "level": "fair",
        "note": "market cap ~$2.5-2.6T (ราคา ~$244 ปิด 29 ต.ค. · after-hours ~$229) · forward P/E ~22-26x บน consensus FY2027 EPS ~$10.5 (P/E ที่รายงานบิดต่ำจาก gain Anthropic ~$53B ครั้งเดียวใน Q2) — ลงมาจากระดับ premium หลังหุ้นถอยรับ EPS ต่ำกว่าคาดและ capex ที่พุ่ง ขณะที่ AWS +39% และ operating income +61% ยังหนุนข้อโต้แย้งว่า AWS เดี่ยว ๆ ควรได้ multiple สูงกว่าที่ตลาดคิดรวมกับค้าปลีก · ความเสี่ยง valuation คือ FCF −$42B TTM และหนี้ที่เพิ่มเป็น ~$173B ทำให้หุ้นไวต่อข่าว 'AI ลงทุนเกินตัว' — เหมาะสะสมจังหวะย่อมากกว่าไล่ราคา"
      },
      "whatChanged": [
        {
          "metric": "AWS (Q2 → Q3 2026)",
          "prev": "+37% YoY ($42.2B)",
          "now": "+39% YoY ($46.0B, margin ~38.7%) — เร็วสุดในรอบเกือบ 5 ปี",
          "direction": "positive"
        },
        {
          "metric": "รายได้รวม",
          "prev": "$200.6B (+20% YoY, มี Prime Day หนุน)",
          "now": "$201.9B (+12% YoY; ~+16% ถ้าไม่นับ Prime Day ที่ย้ายไป Q2) เหนือกรอบบน guide $197-202B",
          "direction": "neutral"
        },
        {
          "metric": "Operating income",
          "prev": "$27.5B (margin ~13.7%)",
          "now": "$28.1B (+61% YoY, margin 13.9% สูงสุดเป็นประวัติการณ์) เหนือกรอบบน guide $22.5-26.5B",
          "direction": "positive"
        },
        {
          "metric": "GAAP EPS",
          "prev": "$5.75 (รวม gain Anthropic ~$53.4B ครั้งเดียว)",
          "now": "$1.89 ไม่มีรายการพิเศษ — ต่ำกว่า consensus ~$1.96-1.97 จากดอกเบี้ยจ่ายที่เพิ่มเป็น ~$1.7B",
          "direction": "negative"
        },
        {
          "metric": "AWS backlog",
          "prev": "$496B",
          "now": "$578B (โตสามหลัก YoY) · ผู้บริหารมอง AWS โต >40% ทั้งปี 2027 และ 2028",
          "direction": "positive"
        },
        {
          "metric": "Cash capex / FCF",
          "prev": "Q2 cash capex ~$53.1B · FCF TTM −$7.6B",
          "now": "Q3 cash capex ~$75.9B · FCF TTM −$42.4B · 2027 'มากขึ้นอย่างมีนัย'",
          "direction": "negative"
        }
      ],
      "risks": [
        "CapEx ~$220B ปี 2026 และ 'มากขึ้นอย่างมีนัย' ปี 2027 จะกลายเป็นค่าเสื่อมก้อนมหึมาปี 2026-2028 ขณะที่ FCF TTM ติดลบ ~$42B และหนี้ระยะยาวขึ้นเป็น ~$173B — ถ้าดีมานด์ AI ชะลอหรือราคา compute ถูกกดจากการแข่งขัน margin ของ AWS จะโดนบีบสองทางโดยมีดอกเบี้ยจ่ายเป็นภาระเพิ่ม",
        "การแข่งขัน cloud: Azure และ GCP ยังโตเร็วและเร่งตัวเช่นกัน และ GPU cloud เฉพาะทาง (CoreWeave, Oracle) แย่ง workload AI บางส่วน — แม้ AWS กลับมาเร่งถึง +39% แต่ยังต้องรักษาโมเมนตัมให้ถึง >40% ตามที่ผู้บริหารวางไว้",
        "ผลตอบแทน AI ผูกกับลูกค้าไม่กี่ราย — ถ้า Anthropic/OpenAI สะดุดทางการเงินหรือย้าย workload สัญญาก้อนใหญ่ใน backlog $578B อาจไม่แปลงเป็นรายได้ตามคาด (และมูลค่าเงินลงทุนใน Anthropic ที่ถูกตีขึ้นก็กลับทางได้)",
        "คดี antitrust FTC เรื่องผูกขาด marketplace ยังเดินหน้า — ผลเลวร้ายสุดกระทบโครงสร้าง flywheel ค้าปลีก/โฆษณา",
        "ค้าปลีกอ่อนไหวต่อกำลังซื้อผู้บริโภคและภาษีนำเข้า/ภูมิรัฐศาสตร์ — กระทบทั้ง volume และต้นทุนสินค้าจากผู้ขายจีน · โฆษณาเองก็แกว่งตามจังหวะ event (Prime Day/NBA) ทำให้รายไตรมาสอ่านยากขึ้น"
      ],
      "asOf": "2026-10",
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
        "notes": "EPS และราคาหุ้นปรับ 20:1 split (มิ.ย. 2022) ครบทุกปีแล้ว — FY2021 EPS ก่อน split คือ ~$64.81 (÷20 = $3.24) และราคาสิ้นปี 2021 ก่อน split คือ ~$3,334 (÷20 = $166.72) จำนวนหุ้น implied จาก net income/EPS อยู่ที่ ~10.3-10.8 พันล้านหุ้น สม่ำเสมอทุกปี ยืนยันการปรับ split ถูกต้อง | FCF ใช้นิยาม OCF ลบ capex (purchases of PP&E แบบ gross): FY2021-2022 ติดลบจากการลงทุน fulfillment/logistics หนัก; FY2025 FCF เหลือ $7.7B เพราะ capex พุ่งเป็น ~$131.8B จากการลงทุน AI/data center (นิยาม FCF ของ Amazon เองซึ่งหักด้วย capex สุทธิจาก proceeds รายงาน $11.2B) | Operating margin ฟื้นจากจุดต่ำสุด 2.4% ปี 2022 เป็น ~11.2% ปี 2025 จาก AWS + โฆษณา | ตัวเลขปัดเศษ ความแม่นยำ ~2-3% ตามวัตถุประสงค์ curated KB · Q3'25 มีรายการครั้งเดียวทั้งใต้และในกำไรดำเนินงาน (กำไร Anthropic ~$9.5B · FTC ~$2.5B · เลิกจ้าง ~$1.8B) ใส่ epsNote + opMarginExItemsPct 12.0 ไว้ให้ฐานปีก่อนของ Q3'26 เทียบได้ตรง",
        "sources": [
          "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Fourth-Quarter-Results/",
          "https://stockanalysis.com/stocks/amzn/financials/",
          "https://www.statmuse.com/money/ask/amazon-stock-price-december-31st-2025",
          "https://www.statmuse.com/money/ask/amazon-stock-price-from-2023-to-2024",
          "https://www.macrotrends.net/stocks/charts/AMZN/amazon/stock-price-history",
          "https://www.sec.gov/Archives/edgar/data/0001018724/000101872426000038/amzn-20260930xex991.htm",
          "https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Third-Quarter-Results/",
          "https://stockanalysis.com/stocks/amzn/history/",
          "https://www.statmuse.com/money/ask/amazon-stock-price-september-30-2026",
          "https://ir.aboutamazon.com/news-release/news-release-details/2025/Amazon-com-Announces-Third-Quarter-Results/"
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
            "endDate": "2025-09-30",
            "epsNote": "GAAP EPS $1.95 รวมกำไรก่อนภาษี ~$9.5B จากการตีมูลค่าเงินลงทุนใน Anthropic (non-operating) และในกำไรดำเนินงานมีค่าข้อตกลงคดี FTC ~$2.5B + ค่าชดเชยเลิกจ้าง ~$1.8B — operating income $17.4B ไม่รวมสองรายการนี้ ~$21.7B (margin ~12.0% ที่รายงาน ~9.7%) · EPS ไม่รวมกำไร Anthropic ราว ~$1.2 (ประมาณจากภาษีเฉลี่ย)",
            "opMarginExItemsPct": 12
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 201.94,
            "epsAdj": 1.89,
            "opMarginPct": 13.9,
            "fcfB": -34.84,
            "priceQEnd": 249.15,
            "endDate": "2026-09-30"
          }
        ]
      },
      "nextEarnings": "2027-02",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 12.46,
            "revenue": 828.3
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 10.55,
            "revenue": 949.99
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~$197.0-202.0B",
            "actual": "~$201.9B",
            "result": "beat",
            "magnitudePct": 1.2
          },
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
            "revenue": 828.64,
            "eps": 12.92,
            "confidence": "high",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": 949.99,
            "eps": 10.55,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3 2026 ผลจริง net sales $201.9B เหนือกรอบบนของ guide ($197-202B, +1.2% จากจุดกึ่งกลาง) และ operating income $28.1B เหนือกรอบบน ($22.5-26.5B) ส่วน guide Q4 2026 = net sales $240-247B + operating income $28.5-33.5B (จุดกึ่งกลางรายได้ ~$243.5B ต่ำกว่า consensus ~$244.5B เล็กน้อย) โดย capex 2026 ยืนยัน ~$220B และปี 2027 'มากขึ้นอย่างมีนัย' · consensus FY2026 EPS ~$12.92 (Yahoo, 54 นักวิเคราะห์) รวมกำไร Anthropic ของ Q2 ไว้ด้วย ขณะที่บางสำนัก (stockanalysis/MarketBeat) ตัดรายการออกเหลือ ~$7.7-8.0 จึงใส่ basis = unknown — FY2027 EPS ~$10.55 / รายได้ ~$950B (Yahoo, 56-59 นักวิเคราะห์) เป็นแหล่งเดียวที่เปิดเผยตัวเลขจึงให้ confidence medium"
      }
    },
    "TSM": {
      "ticker": "TSM",
      "name": "Taiwan Semiconductor Manufacturing Company",
      "layer": "foundry",
      "thesis": {
        "statement": "TSMC คือโรงหลอมของยุค AI — ชิป AI ระดับแนวหน้าเกือบทั้งหมดของโลก (Nvidia, AMD, custom ASIC ของ Google/Amazon/Meta) ผลิตได้ที่ TSMC เท่านั้น บริษัทกินส่วนแบ่ง node ขั้นสูงราว ~90% มี pricing power และ margin ที่ขยับขึ้นต่อเนื่อง ขณะที่ demand จาก AI accelerator ถูกคาดว่าจะโตราว mid-to-high 50s% ต่อปีถึง 2029 (บริษัทยกจาก mid-40s% เมื่อ ต.ค. 2026) — เป็นธุรกิจผูกขาดโดยพฤตินัยที่ยังซื้อขายในราคาสมเหตุสมผลเมื่อเทียบกับการเติบโต",
        "pillars": [
          "ผูกขาดโดยพฤตินัย: ส่วนแบ่ง foundry ~70% และ ~90%+ ใน advanced node — ลูกค้า AI รายใหญ่ทุกรายไม่มีทางเลือกอื่น",
          "AI accelerator เป็นเครื่องยนต์หลัก: บริษัทยกเป้าโตเป็น ~mid-to-high 50s% CAGR (2024-2029) จาก mid-40s% เดิม · HPC ขึ้นเป็น 68% ของรายได้ Q3 2026",
          "Roadmap นำหน้าคู่แข่ง 1-2 ปี: N2 เข้าสู่ volume production ปลายปี 2025, A16 ตามมา H2/2026",
          "คุมคอขวด advanced packaging (CoWoS/SoIC) ของทั้งอุตสาหกรรม AI",
          "การเงินระดับป้อมปราการ: gross margin ~66%, operating margin ~59% และยังเป็น net cash แม้ CapEx 2026 สูงเป็นสถิติ $60-64B"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+41% YoY ใน USD (Q3 2026 — US$46.7B สถิติ, +16% QoQ, สูงกว่าบนของ guidance) · FY2026 ยกเป็น ~+44%",
          "trend": "up",
          "score": 94,
          "impact": "positive",
          "why": "AI ทำให้รายได้เร่งทั้งที่ฐานใหญ่มากแล้ว — Q3 ทะลุบนของ guidance และ HPC ขึ้นเป็น 68% ของรายได้ · บริษัทยกเป้าทั้งปีเป็น ~44% และยก CAGR ของ AI accelerator เป็น mid-to-high 50s%"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS US$4.60/ADR (Q3 2026) จาก $4.31 (Q2) · +69% YoY ในสกุล NT$",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้จาก operating leverage ของ node ล้ำ — ยังเร่งต่อแม้ margin ถูกต้นทุน ramp 2nm กดลงเล็กน้อย"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "CapEx 2026 ยืนสถิติ $60-64B · FCF ยังเป็นบวกแต่ถูก capex กดหนัก",
          "trend": "flat",
          "score": 76,
          "impact": "positive",
          "why": "capex ปีนี้สูงสุดเป็นประวัติการณ์ และบริษัทบอกว่าปี 2026-2028 จะลงทุนสูงกว่า 3 ปีก่อนหน้ามาก — FCF ระยะสั้นถูกกด แต่เป็นการลงทุนตามดีมานด์ที่ลูกค้าจองไว้แล้ว"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross 66.4% · operating 58.7% (Q3 2026) — ลดจากจุดสูงสุด Q2 (67.7% / 60.3%) เพราะต้นทุน ramp 2nm",
          "trend": "flat",
          "score": 91,
          "impact": "positive",
          "why": "margin ยังสูงระดับประวัติศาสตร์ แต่ช่วงนี้ถูกกดจากต้นทุน ramp 2nm และ fab ต่างประเทศ — guide Q4 ที่ 65-67% บอกว่าจะทรงตัว ไม่ใช่ขยายต่อ"
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
          "current": "CapEx 2026 $60-64B (สถิติ) + ปันผลที่โตต่อเนื่อง",
          "trend": "up",
          "score": 85,
          "impact": "positive",
          "why": "เงินส่วนใหญ่กลับเข้า capacity ขั้นสูงที่ ROIC สูง — เป็นการ compound ที่ถูกจุด และลงทุนตาม demand ที่ลูกค้าจองจริง ไม่ใช่เก็งกำไร"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E ~21-22x จาก consensus EPS ปี 2027 ~$21.9/ADR (ราคา ADR ~$470 · mcap ~$2.4T, ต.ค. 2026)",
          "trend": "flat",
          "score": 70,
          "impact": "positive",
          "why": "ราคาขึ้นเกือบ 60% ในปีนี้ แต่กำไรที่นักวิเคราะห์คาดปีหน้าก็ถูกยกขึ้นตาม — multiple จึงยังไม่แพงเทียบการเติบโต ส่วนลดหลักยังเป็นความเสี่ยงภูมิรัฐศาสตร์ไต้หวัน ไม่ใช่คุณภาพธุรกิจ"
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
            "sharePct": 68,
            "growthNote": "68% ของรายได้ Q3 2026 (จาก 66% ใน Q2) — AI accelerator + CPU ดาต้าเซ็นเตอร์",
            "trend": "up"
          },
          {
            "name": "Smartphone",
            "sharePct": 23,
            "growthNote": "~23% ของรายได้ Q3 2026 (ส่วนที่เหลือหลังหัก HPC/IoT/Auto/DCE) — สัดส่วนลดลงเพราะ HPC โตเร็วกว่า",
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
        "score": 93,
        "items": [
          {
            "item": "AI accelerator ramp (Nvidia, AMD, custom ASIC ของ hyperscaler)",
            "status": "executing",
            "evidence": "HPC = 68% ของรายได้ Q3 2026 · บริษัทยก CAGR ของ AI accelerator (2024-29) เป็น mid-to-high 50s% และยกเป้ารายได้ทั้งปี 2026 เป็น ~44%"
          },
          {
            "item": "N2 (2nm) เข้าสู่ volume production",
            "status": "executing",
            "evidence": "2nm ขึ้นเป็น 8% ของ wafer revenue ใน Q3 2026 · advanced nodes (7nm ลงไป) = 79% — ครองการผลิต node ล้ำเกือบเบ็ดเสร็จ"
          },
          {
            "item": "Advanced packaging (CoWoS / SoIC)",
            "status": "executing",
            "evidence": "ขยายกำลังผลิตราวเท่าตัวติดต่อกันหลายปีแต่ demand ยังล้น — เป็นคอขวดของ AI ทั้งอุตสาหกรรมที่ TSMC เป็นผู้ควบคุม"
          },
          {
            "item": "ขยายกำลังผลิตทั่วโลก (Arizona ~$165B, Japan, Germany)",
            "status": "on-track",
            "evidence": "CapEx 2026 ยืน $60-64B · มี fab ใหม่ราว 20 แห่งกำลังสร้าง (ส่วนใหญ่ในไต้หวัน) — ลงทุนตามดีมานด์ AI ที่ล็อกไว้แล้ว"
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
            "current": "$60-64B ปี 2026 (สถิติ) และจะสูงขึ้นอีกในปี 2027-2028",
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
        "note": "forward P/E ~21-22x จาก consensus EPS ปี 2027 ~$21.9/ADR (ราคา ADR ~$470, mcap ~$2.4T, ต.ค. 2026) สำหรับบริษัทที่รายได้โต ~44% margin ~66% และผูกขาดคอขวดการผลิตชิป AI — ยังถูกกว่าหุ้น AI สหรัฐส่วนใหญ่เทียบการเติบโต · ส่วนลดถาวรมาจากความเสี่ยงภูมิรัฐศาสตร์ไต้หวัน (tail risk) ไม่ใช่ปัญหาธุรกิจ"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026, USD)",
          "prev": "$40.2B",
          "now": "$46.7B (+41% YoY, +16% QoQ) — สูงกว่าบนของ guidance $44.6-45.8B",
          "direction": "positive"
        },
        {
          "metric": "Gross margin",
          "prev": "67.7%",
          "now": "66.4% — ต้นทุน ramp 2nm กดลง",
          "direction": "negative"
        },
        {
          "metric": "Operating margin",
          "prev": "60.3%",
          "now": "58.7%",
          "direction": "negative"
        },
        {
          "metric": "HPC/AI (สัดส่วนรายได้)",
          "prev": "66%",
          "now": "68%",
          "direction": "positive"
        },
        {
          "metric": "เป้ารายได้ทั้งปี 2026",
          "prev": "สูงกว่า 40% เล็กน้อย",
          "now": "~+44% YoY",
          "direction": "positive"
        },
        {
          "metric": "CAGR ของ AI accelerator (2024-2029)",
          "prev": "mid-40s%",
          "now": "mid-to-high 50s%",
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
      "asOf": "2026-10",
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
          "https://query1.finance.yahoo.com/v8/finance/chart/TSM (year-end unadjusted closes)",
          "https://www.sec.gov/Archives/edgar/data/0001046179/000104617926000726/a3q26e_withguidancexfinal.htm",
          "https://stockanalysis.com/stocks/tsm/history/"
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 46.72,
            "epsAdj": 4.6,
            "opMarginPct": 58.7,
            "fcfB": null,
            "priceQEnd": 456.19,
            "endDate": "2026-09-30"
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
      "nextEarnings": "2027-01",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 21.93,
            "revenue": null
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~$44.6-45.8B",
            "actual": "~$46.72B",
            "result": "beat",
            "magnitudePct": 3.4
          },
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
            "revenue": 176,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 21.93,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "TSMC ให้ guidance รายได้เป็นช่วง US$ ทุกไตรมาส — ยืนยันได้ 4 ไตรมาส beat ทุกครั้ง (2.8% → 2.0% → 1.5% → 3.4% จากจุดกึ่งกลาง) · guidance Q4 2026 = $52.3-54.3B · รายได้ FY2026 ~$176B คำนวณจากผลจริง 3 ไตรมาส + จุดกึ่งกลาง guidance Q4 จึงให้ความมั่นใจต่ำ · EPS ปี 2027 ~$21.9/ADR จาก 13 นักวิเคราะห์ (ต.ค. 2026; 90 วันก่อน ~$19.7) แหล่งเดียวและไม่ระบุฐานบัญชี"
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
        "statement": "AMD คือ 'ทางเลือกอันดับสอง' ที่น่าเชื่อถือที่สุดของโลกรองจาก NVIDIA ในชิป AI — มีครบทั้ง CPU (EPYC), GPU (Instinct MI350/MI450) และระบบ rack-scale (Helios จากดีล ZT Systems) · ดีลระดับกิกะวัตต์กับ OpenAI (6GW) Meta (6GW) และ Anthropic (2GW) บวก Oracle พิสูจน์ว่าผู้สร้างโมเดลระดับ frontier ต้องการซัพพลายเออร์รายที่สองจริง · Q3 2026 คือไตรมาสแรกที่ MI455X และ Helios ถูกส่งมอบจำนวนมากเพื่อรับรู้รายได้ (Data Center +97% YoY) และผู้บริหารให้ภาพปี 2027 ว่ารายได้รวมจะโตเกิน 80% · ราคาที่ต้องจ่ายคือ warrant ให้ลูกค้าสองรายรวมสูงสุด ~320 ล้านหุ้น และเงินทุนหมุนเวียนก้อนใหญ่ช่วง ramp — หาก execute Helios ปี 2027 ได้ตามเป้า เป้า EPS ~$20 ระยะยาวจะไม่ใช่แค่ความฝัน",
        "pillars": [
          "ลูกค้า anchor ระดับกิกะวัตต์ล็อกดีมานด์หลายปี — OpenAI 6GW และ Meta 6GW (ทั้งคู่ผูก warrant) · Anthropic 2GW (เริ่มครึ่งแรกปี 2027 โดย AMD ลงทุนใน Anthropic สูงสุด $5B) · Oracle — และ Q3 2026 เริ่มส่ง MI455X/Helios จำนวนมากให้ Anthropic, Meta, Microsoft, OpenAI, Oracle แล้ว",
          "EPYC กินส่วนแบ่งรายได้ server CPU จาก Intel ต่อเนื่องจนเกิน ~40% — EPYC Venice (6th Gen) เริ่มส่งมอบเพื่อรับรู้รายได้ใน Q3 2026 และผู้บริหารคาดรายได้ server โตเท่าตัวในปี 2027",
          "จังหวะออกสินค้าแบบรายปี (MI300→MI350→MI450/Helios) ไล่ทัน cadence ของ NVIDIA แล้ว — MI450 ออกตามกำหนดใน Q3 2026",
          "ROCm พัฒนาเร็วขึ้นมาก (ROCm 10 ออกแล้ว · มี day-0 support โมเดลหลัก ๆ · ร่วมพัฒนาซอฟต์แวร์กับ Anthropic) — ช่องว่างซอฟต์แวร์กับ CUDA แคบลงโดยเฉพาะฝั่ง inference",
          "งบดุลยังเป็น net cash (~$8.7B หลังออกหุ้นกู้ $4.75B) และโมเดล fabless ทำให้ capex ต่ำ — แม้ FCF ช่วงนี้ถูกกดด้วยการสต็อกชิ้นส่วนรอ ramp Helios"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+45% YoY (Q3 2026 — $13.38B สถิติใหม่ · +16% QoQ) · Data Center $8.55B +97% (64% ของรายได้) · guide Q4 ~$17B ±3% (+66% YoY) · ผู้บริหารคาดรายได้ปี 2027 โตเกิน 80%",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "YoY ชะลอเล็กน้อยใน Q3 (Q2 +50% → Q3 +45%) แต่รายได้ทะลุขอบบนของช่วง guidance และ guide Q4 เร่งกลับขึ้นเป็น +66% จาก Helios และ EPYC Venice ที่เริ่ม ramp · ภาพปี 2027 (รายได้โตเกิน 80% · server โตเท่าตัว · Data Center เกิน 80% ของรายได้) คือการเร่งตัวอีกขั้น — Data Center เกือบเท่าตัว YoY เป็นของจริงระดับหลายพันล้านต่อไตรมาส"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "non-GAAP EPS $2.09 (Q3 2026 · +74% YoY จาก $1.20) ชนะคาด ~$1.94 · GAAP EPS $1.46 (ปีก่อน $0.75) หลังขาดทุนตีมูลค่า warrant $1.1B · consensus non-GAAP FY2026 ~$8.06 / FY2027 ~$16.27",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้มาก (non-GAAP operating income $3.92B +75% YoY) สะท้อน operating leverage จริง · GAAP EPS ไตรมาสนี้บิดเบือนทั้งสองทาง — ขาดทุนที่ไม่ใช่เงินสดจากการตีมูลค่า warrant ที่ออกให้ลูกค้า (~$0.66/หุ้น) กับภาษีที่กลับเป็นรายการรับ $555M จึงต้องอ่านจากกำไรดำเนินงาน (GAAP $2.83B +123% YoY) · ช่องว่าง GAAP/non-GAAP ยังกว้างจาก amortization (Xilinx/ZT) และ SBC"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026 FCF $0.55B (OCF $1.20B − capex $0.65B · Q2 $1.56B · Q1 $2.57B) · 9 เดือน ~$4.7B · inventory $11.5B (+~$3B QoQ)",
          "trend": "down",
          "score": 62,
          "impact": "neutral",
          "why": "FCF รายไตรมาสลดลงสามไตรมาสติดเพราะบริษัทสต็อกเวเฟอร์ ซับสเตรต และหน่วยความจำล่วงหน้าเพื่อ ramp Helios/Venice (inventory เพิ่มจาก $7.9B ปลายปี 2025 เป็น $11.5B) — เป็นการลงทุนเงินทุนหมุนเวียนโดยเจตนา และเก้าเดือนแรกยังดีกว่าปีก่อนเกือบเท่าตัว · แต่การแปลงกำไรเป็นเงินสดไตรมาสนี้อ่อนมาก (FCF margin ~4%) ต้องเห็น inventory กลับมาเป็นรายได้ใน Q4-Q1 ก่อนจึงจะยืนยันได้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "non-GAAP gross margin 55.9% (Q2 56.2% · ตรง guide ~56%) · GAAP 53.9% · GAAP operating margin 21.2% (Q2 17.3%) · non-GAAP 29.3% · guide Q4 gross margin ~55%",
          "trend": "up",
          "score": 74,
          "impact": "neutral",
          "why": "operating margin ขยายแรง (GAAP +3.9 จุด QoQ) เพราะรายได้โตเร็วกว่าค่าใช้จ่าย · แต่ gross margin เริ่มทรงตัวถึงลดลง (guide Q4 ~55%) เพราะ Helios ขายเป็นระบบทั้งตู้ที่ margin ต่ำกว่าชิปเดี่ยวและต้นทุน HBM ที่แพงขึ้น — ผู้บริหารไม่ให้ทิศทาง margin รายไตรมาสปี 2027 เพราะขึ้นกับ mix ระหว่าง GPU กับ CPU · ยังต่ำกว่า NVIDIA มาก"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ไต่ขึ้นตามกำไร (GAAP operating income $2.83B ต่อไตรมาส) แต่ฐานทุนใหญ่จาก goodwill/amortization ของ Xilinx และ ZT และกำลังจะใหญ่ขึ้นจากดีล World Labs/Taalas",
          "trend": "up",
          "score": 67,
          "impact": "neutral",
          "why": "กำไรดำเนินงานโตกว่าเท่าตัว YoY ทำให้ผลตอบแทนต่อทุนดีขึ้นชัด · แต่ยังถูกกดด้วย amortization ~$0.53B ต่อไตรมาสจากดีลเก่า และดีลซื้อ World Labs (~$8.2B ด้วยหุ้น) กับ Taalas (~$2.9B) ที่คาดปิดปลายปี 2026 จะเพิ่มฐานทุนอีกโดยยังไม่มีรายได้รองรับ"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$15.8B (26 ก.ย. 2026) จาก $13.1B ใน Q2 — รวมเงินจากหุ้นกู้ $4.75B ที่ออกเมื่อ ส.ค. 2026",
          "trend": "flat",
          "score": 74,
          "impact": "positive",
          "why": "เงินสดยังมากกว่าหนี้ (net cash ~$8.7B) เพียงพอสำหรับ ramp สินค้าคงคลัง AI, R&D และดีลขนาดกลาง · แต่เงินสดที่เพิ่มมาจากการกู้ ไม่ใช่จากธุรกิจ (FCF ไตรมาสนี้แค่ $0.55B) และมีภาระรออยู่ — ลงทุนใน Anthropic สูงสุด $5B และส่วนเงินสดของดีล Taalas — net cash จึงลดลงจาก ~$9.9B ใน Q2"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้รวม ~$7.1B (จาก $3.2B ใน Q2) หลังออกหุ้นกู้ $4.75B อายุ 2029-2036 ดอกเบี้ย 4.6-5.5% — ยังเป็น net cash ~$8.7B",
          "trend": "down",
          "score": 80,
          "impact": "positive",
          "why": "ภาระหนี้ยังต่ำมากเทียบกับกำไรดำเนินงาน (~$11B ต่อปีตามอัตราไตรมาสล่าสุด) และยังเป็น net cash — แทบไม่มีความเสี่ยงทางการเงิน · แต่การกู้เพิ่มเกือบสองเท่าในไตรมาสเดียวเพื่อหนุนเงินทุนหมุนเวียนช่วง ramp แปลว่าทิศทางงบดุลเริ่มใช้เลเวอเรจมากขึ้น"
        },
        {
          "key": "dilution",
          "label": "การเจือจางหุ้น",
          "current": "หุ้น diluted 1,661 ล้านหุ้น (Q3 2026 · +1.2% YoY) · warrant ราคาใช้สิทธิ $0.01 ให้ OpenAI (ต.ค. 2025) และ Meta (ก.พ. 2026) รายละสูงสุด 160 ล้านหุ้น รวม ~320 ล้านหุ้น (~20% ของหุ้นที่ออกแล้ว) · ดีล World Labs ~$8.2B จ่ายด้วยหุ้นทั้งหมด · Q3 ไม่ได้ซื้อหุ้นคืน",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "warrant ทั้งสองก้อนทยอย vest ตามยอดซื้อ GPU ของลูกค้าและเพดานราคาหุ้นที่ไต่ถึง $600 ในงวดสุดท้าย — ถ้าเจือจางเต็มแปลว่ารายได้ระดับหลายหมื่นล้านเข้ามาแล้ว แต่ก็เป็น dilution ~20% ที่ต้องนับรวมในโมเดล · และตั้งแต่ Q3 2026 warrant ถูกบันทึกเป็นหนี้สิน (~$1.2B) ที่ต้องตีมูลค่าใหม่ทุกไตรมาสตามราคาหุ้น ทำให้ GAAP EPS แกว่ง · บวกหุ้นที่จะออกให้ World Labs และ buyback ที่หยุดไป จำนวนหุ้นมีแต่เพิ่ม"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "R&D (GAAP) $2.80B ต่อไตรมาส (+31% YoY) · ประกาศซื้อ Taalas (~$2.9B เงินสด+หุ้น) และ World Labs (~$8.2B หุ้นล้วน) · ลงทุนใน Anthropic สูงสุด $5B · ออกหุ้นกู้ $4.75B · ไม่ซื้อหุ้นคืนใน Q3 (เหลือวงเงิน $9.2B)",
          "trend": "down",
          "score": 64,
          "impact": "neutral",
          "why": "R&D และดีล ZT Systems ยังตรงยุทธศาสตร์ และ Taalas (ชิป inference) เติมจุดที่ขาด · แต่การจัดสรรทุนเริ่มกระจายออกนอกแกน — ซื้อ World Labs (แล็บโมเดล spatial intelligence) ด้วยหุ้น ~$8.2B และลงเงินใน Anthropic ซึ่งเป็นลูกค้าเอง (เงินวนกลับมาซื้อชิป AMD) บวก warrant ให้ลูกค้าสองราย — เหตุผลเชิงกลยุทธ์มี แต่ราคาแพงและวัดผลตอบแทนได้ยากกว่าเดิม"
        },
        {
          "key": "valuation",
          "label": "มูลค่าหุ้น",
          "current": "ราคาปิด 4 พ.ย. 2026 $488.78 (after-hours หลังงบ +~7.5% แต่ปิดวันถัดมาแค่ +1%) · mcap ~$800B · P/E ~61x กำไร non-GAAP FY2026 ($8.06) · ~30x FY2027 ($16.27) · ต่ำกว่าจุดสูงสุด 52 สัปดาห์ $658.52 ราว 26%",
          "trend": "up",
          "score": 40,
          "impact": "negative",
          "why": "ยังแพงเมื่อเทียบกำไรปีนี้ แต่ถ้ากำไร FY2027 โตเท่าตัวตาม consensus ราคา ~30 เท่าก็ไม่สุดโต่งสำหรับการเติบโตระดับนี้ · ประเด็นคือ consensus FY2027 กว้างมาก (EPS $9.60-23.66) สะท้อนว่าทั้งหมดขึ้นกับการ ramp Helios ปี 2027 และราคาหุ้นเหวี่ยงแรง (ร่วง 10.9% ในวันเดียวเมื่อ 30 ต.ค. จาก guide ของ Intel) · margin of safety ยังบาง"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 68,
        "recurringPct": null,
        "note": "คุณภาพรายได้ดีขึ้นเชิงโครงสร้าง — Data Center พุ่งเป็น 64% ของรายได้ (จาก 58% ใน Q2) และผู้บริหารคาดเกิน 80% ในปี 2027 · รายได้ส่วนนี้ผูกกับสัญญาหลายปีระดับกิกะวัตต์ (OpenAI, Meta, Anthropic, Oracle) แต่ก็กระจุกตัวกับลูกค้าไม่กี่รายมากขึ้นและเป็นการขายตามรอบ ramp ไม่ใช่รายได้ประจำ · YoY Q3 ชะลอเล็กน้อย (+50% → +45%) ก่อนที่ guide Q4 จะเร่งกลับเป็น +66% · Client & Gaming หดตัวจากตลาดพีซีที่ถูกราคาหน่วยความจำกดและคอนโซลที่ปลายวัฏจักร ส่วน Embedded ฟื้นต่อเนื่อง",
        "segments": [
          {
            "name": "Data Center (EPYC + Instinct GPU)",
            "sharePct": 64,
            "growthNote": "$8.55B (+97% YoY · Q2 $6.72B) กำไรจากการดำเนินงาน $2.88B — ไตรมาสแรกที่ส่ง MI455X/Helios และ EPYC Venice เพื่อรับรู้รายได้ · guide Q4 เร่งต่อ",
            "trend": "up"
          },
          {
            "name": "Client & Gaming (Ryzen, Radeon, คอนโซล)",
            "sharePct": 28,
            "growthNote": "$3.72B (~−8% YoY) — Client $2.95B (+7%) แต่ยอดขายพีซีชะลอปลายไตรมาสจากราคาหน่วยความจำ · Gaming $0.77B (−40%) · ผู้บริหารวางแผนให้ตลาดพีซีปี 2027 หดตัวสองหลัก",
            "trend": "down"
          },
          {
            "name": "Embedded (Xilinx FPGA)",
            "sharePct": 8,
            "growthNote": "$1.11B (+29% YoY · Q2 $0.98B) กำไรจากการดำเนินงาน $0.45B — ฟื้นต่อเนื่องหลังช่วง destocking",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 80,
        "items": [
          {
            "item": "Instinct MI450 (MI455X) + Helios rack-scale",
            "status": "executing",
            "evidence": "Q3 2026 เริ่มส่ง MI455X จำนวนมากและลูกค้ารายแรกเปิดใช้ Helios ได้เร็ว · HPE/Vultr ติดตั้ง Helios ชุดแรก · ผู้บริหารคาดการติดตั้ง Helios เพิ่มขึ้นมากใน Q4 — เป็นตัวพิสูจน์ว่า AMD แข่งระดับระบบได้ ไม่ใช่แค่ชิปเดี่ยว"
          },
          {
            "item": "ลูกค้า anchor ระดับกิกะวัตต์ (OpenAI · Meta · Anthropic · Oracle)",
            "status": "executing",
            "evidence": "OpenAI 6GW และ Meta 6GW (ผูก warrant รายละสูงสุด 160 ล้านหุ้น) · Anthropic 2GW เริ่มครึ่งแรกปี 2027 โดย AMD ลงทุนใน Anthropic สูงสุด $5B (ก.ค. 2026) · ลูกค้าทั้งหมดนี้รวม Microsoft และ Oracle ใช้ Helios กับ MI450 แล้ว — แต่ upside กระจุกที่ลูกค้าไม่กี่รายซึ่งยังพึ่งการระดมทุน"
          },
          {
            "item": "EPYC ชิงส่วนแบ่ง server CPU + Venice",
            "status": "executing",
            "evidence": "เริ่มส่ง EPYC Venice เพื่อรับรู้รายได้ใน Q3 · OEM/ODM ตกลงทำมากกว่า 240 แพลตฟอร์ม · ได้ลูกค้า EPYC รายใหม่หลายสิบราย · OpenAI เลือก EPYC Turin เป็น host CPU ของ accelerator ที่ออกแบบเอง · ผู้บริหารคาดรายได้ server โตเท่าตัวในปี 2027"
          },
          {
            "item": "ROCm software stack",
            "status": "on-track",
            "evidence": "ออก ROCm 10 แล้ว และเริ่มความร่วมมือหลายปีกับ Anthropic ที่ใช้ Claude ช่วยเร่งพัฒนาซอฟต์แวร์ของ AMD — ยังตามหลัง CUDA มาก โดยเฉพาะงาน training จึงยังเป็นคอขวดสำคัญของการแข่งฝั่ง GPU"
          },
          {
            "item": "ซัพพลายและต้นทุนสำหรับ ramp ปี 2027",
            "status": "on-track",
            "evidence": "ผู้บริหารบอกว่าจองเวเฟอร์ ซับสเตรต advanced packaging และหน่วยความจำพอรองรับรายได้ server ที่โตเท่าตัวแล้ว (inventory พุ่งเป็น $11.5B) · แต่ราคา HBM ที่แพงขึ้นกดดัน gross margin (guide Q4 ~55%) และดีมานด์ยังเกินซัพพลาย"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "moat ของ AMD มาจากสามชั้น: (1) x86 duopoly — โลกมีแค่ Intel กับ AMD ที่ทำ server CPU x86 ได้ และตอนนี้ AMD คือฝ่ายชนะเชิงเทคโนโลยี (2) เป็นบริษัทเดียวนอกจาก NVIDIA ที่มี GPU data center ระดับ frontier พร้อม roadmap รายปี + rack-scale ครบวงจร และได้สัญญาระดับกิกะวัตต์จากผู้สร้างโมเดล frontier สามราย (OpenAI, Meta, Anthropic) (3) ความเชี่ยวชาญ chiplet/advanced packaging ที่สะสมมาก่อนใคร จุดอ่อนเชิง moat คือซอฟต์แวร์ — ROCm ยังไม่สร้าง lock-in แบบ CUDA ทำให้ AMD ชนะด้วย 'ของดี ราคาคุ้ม เปิดกว้าง' และสัญญาผูกผลประโยชน์ (warrant/เงินลงทุน) มากกว่าการล็อกลูกค้าด้วยซอฟต์แวร์",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "เป็นเบอร์สองใน AI GPU ที่ทิ้งห่างเบอร์สาม — Data Center $8.55B (+97% YoY) และลูกค้า Helios ครบทั้ง Anthropic, Meta, Microsoft, OpenAI, Oracle · เป็นผู้ชนะใน server CPU (ส่วนแบ่งรายได้ >~40% และคาดรายได้ server โตเท่าตัวปี 2027) — แต่ยังห่างจาก NVIDIA ใน accelerator มาก"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "เด่นเรื่อง chiplet, ความจุ/แบนด์วิดท์ HBM ต่อการ์ด และ perf/TCO ฝั่ง inference — บริษัทเคลมว่า MI455X นำด้าน compute flops ความจุหน่วยความจำ และ scale-out bandwidth แต่เป็นคำเคลมของบริษัทเอง และระดับระบบ (interconnect, ซอฟต์แวร์, rack integration) NVIDIA ยังนำหนึ่งก้าว"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "รายได้ Q3 2026 ทะลุขอบบนของ guidance · MI455X/Helios และ EPYC Venice เริ่มส่งมอบเพื่อรับรู้รายได้ในไตรมาสเดียวกันตามกำหนด · ไล่ทัน cadence รายปีของ NVIDIA แล้ว — ประวัติ execution ของทีม Lisa Su ตั้งแต่ Zen คือดีที่สุดในอุตสาหกรรม"
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
            "note": "แนวร่วม 'มาตรฐานเปิด' ขยายเร็ว — OpenAI, Meta, Anthropic, Microsoft, Oracle ใช้ Instinct จริง · HPE/Vultr ติดตั้ง Helios · EuroHPC เลือก MI430X สำหรับ LUMI-AI · UALink มีพันธมิตรทั้งอุตสาหกรรม — แต่ขนาดรวมยังเล็กกว่าจักรวาล CUDA มาก"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "strengthening",
            "note": "ROCm 10 ใช้งานได้จริงบน framework หลักและมี day-0 model support · Anthropic ร่วมพัฒนาซอฟต์แวร์กับ AMD — นักพัฒนาเริ่มมองเป็นทางเลือกจริงจัง แต่ยังโตจากฐานต่ำ ห่าง CUDA หลายเท่าตัวทั้งจำนวนคนและเครื่องมือ"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "เปลี่ยนจากขายเป็นรอบ ๆ มาเป็นสัญญาหลายปี — OpenAI 6GW และ Meta 6GW ผูก warrant รายละสูงสุด 160 ล้านหุ้น · Anthropic 2GW ผูกกับเงินลงทุนของ AMD สูงสุด $5B · design win rack-scale ทำให้ลูกค้าถอนตัวยากขึ้นกว่ายุคขายการ์ดเดี่ยว แต่เป็นการล็อกด้วยสัญญาและผลประโยชน์ทางการเงิน ไม่ใช่ซอฟต์แวร์"
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
        "score": 64,
        "verdict": "จัดสรรทุนแบบ 'ทุ่มเพื่อชิงหน้าต่าง AI' — R&D และดีล ZT Systems ยังตรงยุทธศาสตร์ แต่ปี 2026 เริ่มใช้เครื่องมือที่แพงขึ้นและวัดผลยากขึ้น: warrant ให้ลูกค้าสองรายรวมสูงสุด ~320 ล้านหุ้น · ลงเงินใน Anthropic ซึ่งเป็นลูกค้าเองสูงสุด $5B · ซื้อ World Labs ด้วยหุ้น ~$8.2B · และกู้ $4.75B ขณะที่หยุดซื้อหุ้นคืน — ทุกอย่างมีเหตุผลเชิงกลยุทธ์ แต่ต้นทุนแฝงต่อผู้ถือหุ้นสูงขึ้นชัด",
        "items": [
          {
            "label": "R&D",
            "current": "GAAP $2.80B ต่อไตรมาส (Q3 2026 · +31% YoY) — run-rate ~$11B/ปี เทไปที่ Instinct roadmap, ROCm และ rack-scale",
            "assessment": "good",
            "why": "นี่คือสงครามที่ชนะด้วย R&D — การเร่ง cadence เป็นรายปีและปิดช่องว่างซอฟต์แวร์คือการใช้เงินที่ให้ผลตอบแทนสูงสุดของบริษัท และ MI450/Venice ที่ออกตามกำหนดคือหลักฐาน"
          },
          {
            "label": "M&A (ZT Systems · Taalas · World Labs)",
            "current": "ZT ~$4.9B แล้วขายโรงงานให้ Sanmina ~$3B · ประกาศซื้อ Taalas ~$2.9B (เงินสด+หุ้น รวมส่วนจ่ายตามเงื่อนไข ~$1.4B · ส.ค. 2026) และ World Labs ~$8.2B หุ้นล้วน (ก.ย. 2026) คาดปิดปลายปี 2026",
            "assessment": "neutral",
            "why": "ZT คือดีลที่เฉียบคม และ Taalas (ชิป inference) เติมจุดที่ขาด · แต่ World Labs เป็นแล็บโมเดล spatial intelligence ที่ห่างจากธุรกิจหลักและจ่ายด้วยหุ้นมูลค่าสูง — ยังตัดสินไม่ได้ว่าคุ้ม"
          },
          {
            "label": "ลงทุนในลูกค้าและหุ้นกู้",
            "current": "ลงทุนใน Anthropic สูงสุด $5B (ก.ค. 2026 · ควบคู่สัญญา 2GW) · ออกหุ้นกู้ $4.75B (ส.ค. 2026)",
            "assessment": "neutral",
            "why": "ช่วยล็อกลูกค้า frontier รายที่สามและหาเงินทุนหมุนเวียนช่วง ramp ด้วยต้นทุนดอกเบี้ย 4.6-5.5% · แต่การให้เงินลูกค้าแล้วลูกค้าเอาไปซื้อชิปของตัวเองคือรูปแบบเงินวน (circular financing) ที่เพิ่มความเสี่ยงถ้ารอบ AI ชะลอ"
          },
          {
            "label": "Buyback",
            "current": "Q3 2026 ไม่ซื้อหุ้นคืน (9 เดือน $221M) · วงเงินคงเหลือ $9.2B",
            "assessment": "neutral",
            "why": "เข้าใจได้ที่เก็บเงินสดไว้หนุน inventory และ working capital ของ Helios — แต่แปลว่า buyback ไม่ได้ชดเชย SBC และ warrant เลย จำนวนหุ้นมีแต่เพิ่ม"
          },
          {
            "label": "การเจือจาง (SBC + warrant OpenAI/Meta)",
            "current": "SBC ~$0.52B ต่อไตรมาส · warrant ราคาใช้สิทธิ $0.01 ให้ OpenAI และ Meta รายละสูงสุด 160 ล้านหุ้น vest ตามยอดซื้อ GPU และเพดานราคาหุ้นถึง $600",
            "assessment": "neutral",
            "why": "warrant คือราคาที่จ่ายเพื่อล็อกลูกค้า AI รายใหญ่ระดับ 6GW สองราย — ถ้า exercise เต็มคือ dilution ~20% แต่แลกกับรายได้ระดับหลายหมื่นล้านดอลลาร์และ vest เฉพาะเมื่อราคาหุ้นสูงขึ้นมาก โครงสร้างจึง align ผลประโยชน์ได้ แม้ไม่ฟรีและทำให้กำไร GAAP แกว่งทุกไตรมาส"
          },
          {
            "label": "CapEx และปันผล",
            "current": "capex Q3 2026 $0.65B (9 เดือน ~$1.8B) ต่ำตามโมเดล fabless · ไม่จ่ายปันผล",
            "assessment": "good",
            "why": "ไม่ต้องเผาเงินสร้างโรงงานเอง ทำให้ FCF margin มี upside สูงเมื่อรายได้สเกล (ความเสี่ยงย้ายไปอยู่ที่การจองกำลังผลิต TSMC แทน) · การไม่จ่ายปันผลเหมาะกับบริษัทที่ผลตอบแทนจากการลงทุนภายในสูงกว่ามาก"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "ราคาปิด 4 พ.ย. 2026 $488.78 (mcap ~$800B) — P/E ~61x กำไร non-GAAP FY2026 ($8.06) และ ~30x FY2027 ($16.27 · 49 นักวิเคราะห์ · ช่วงกว้าง $9.60-23.66) · หลังงบ Q3 ราคาขึ้น ~7.5% ใน after-hours แต่ปิดวันถัดมาเพิ่มแค่ ~1% และยังต่ำกว่าจุดสูงสุด 52 สัปดาห์ $658.52 ราว 26% หลังหุ้นชิปทั้งกลุ่มถูกขายจาก guide ของ Intel (30 ต.ค. −10.9%) · เดิมพันที่ตลาดจ่ายล่วงหน้าคือ Helios ramp ปี 2027 (รายได้โตเกิน 80%) บวกดีลกิกะวัตต์สามราย · ถ้ากำไรปี 2027 มาตามคาด ~30 เท่าไม่สุดโต่ง แต่ถ้า ramp สะดุด หุ้นเหวี่ยงแรง — ความเสี่ยง valuation ยังสูงในสาย AI compute"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวมและ guidance (Q2 → Q3 2026)",
          "prev": "$11.54B (+50% YoY) · guide Q3 ~$13.0B ±$0.3B",
          "now": "$13.38B (+45% YoY · +16% QoQ) ทะลุขอบบนของ guide · guide Q4 ~$17B ±3% (+66% YoY) และคาดรายได้ปี 2027 โตเกิน 80%",
          "direction": "positive"
        },
        {
          "metric": "Data Center",
          "prev": "$6.72B (+107% YoY · 58% ของรายได้) กำไรดำเนินงาน ~$2.1B",
          "now": "$8.55B (+97% YoY · 64% ของรายได้) กำไรดำเนินงาน $2.88B — ไตรมาสแรกที่ส่ง MI455X/Helios และ EPYC Venice จำนวนมาก",
          "direction": "positive"
        },
        {
          "metric": "EPS (non-GAAP / GAAP)",
          "prev": "$1.66 / $1.38 (GAAP มีกำไรเงินลงทุน ~$0.29)",
          "now": "$2.09 (+74% YoY ชนะคาด ~$1.94) / $1.46 (ขาดทุนตีมูลค่า warrant ~$0.66 · ภาษีเป็นรายการรับ $555M)",
          "direction": "positive"
        },
        {
          "metric": "อัตรากำไร",
          "prev": "gross margin non-GAAP 56.2% · GAAP operating margin 17.3%",
          "now": "gross margin 55.9% (ตาม guide ~56%) · GAAP operating margin 21.2% · แต่ guide Q4 gross margin ~55% จาก mix Helios และต้นทุน HBM",
          "direction": "neutral"
        },
        {
          "metric": "FCF / inventory / หนี้",
          "prev": "FCF $1.56B · inventory ~$8.5B · หนี้ $3.2B",
          "now": "FCF $0.55B · inventory $11.5B (+~$3B QoQ สต็อกรอ ramp) · หนี้ $7.1B หลังออกหุ้นกู้ $4.75B",
          "direction": "negative"
        },
        {
          "metric": "Client & Gaming",
          "prev": "$3.84B (Client $3.06B · Gaming $0.78B)",
          "now": "$3.72B — Client $2.95B (+7% YoY) · Gaming $0.77B (−40% YoY) · พีซีชะลอปลายไตรมาสและคาดตลาดพีซีปี 2027 หดสองหลักจากราคาหน่วยความจำ",
          "direction": "negative"
        }
      ],
      "risks": [
        "Execution risk ช่วงปลายปี 2026-2027 กระจุกที่ Helios/MI455X (GPU ตัวแรกบน TSMC 2nm) — บริษัทสต็อก inventory ไว้แล้ว $11.5B และให้ภาพรายได้ปี 2027 โตเกิน 80% ถ้า ramp สะดุด (yield, HBM, rack integration) ทั้ง inventory และราคาหุ้นที่ price-in ความสำเร็จไว้จะถูกกดแรง",
        "Valuation ~61x กำไร non-GAAP ปีนี้ / ~30x ปี 2027 (mcap ~$800B) และ consensus ปี 2027 กว้างมาก ($9.60-23.66) — margin of safety บาง หุ้นเหวี่ยงแรงตามข่าวทั้งของตัวเองและของกลุ่ม (ร่วง 10.9% ในวันเดียวจาก guide ของ Intel)",
        "ช่องว่างซอฟต์แวร์กับ CUDA ยังกว้าง โดยเฉพาะ training — ถ้า ROCm ตามไม่ทัน ลูกค้าอาจใช้ AMD แค่เป็นเครื่องมือต่อรองราคากับ NVIDIA",
        "การกระจุกตัวและเงินวน — upside ผูกกับ OpenAI, Meta, Anthropic ซึ่งบางรายยังขาดทุนหนักและพึ่งการระดมทุน · warrant สองก้อนรวมสูงสุด ~320 ล้านหุ้น (~20%) และ AMD ลงเงินใน Anthropic สูงสุด $5B เพื่อให้ซื้อชิปตัวเอง (circular financing) · warrant ยังถูกตีมูลค่าใหม่ทุกไตรมาสทำให้กำไร GAAP แกว่งตามราคาหุ้น",
        "โดนบีบหลายทาง: NVIDIA Rubin จากด้านบน + custom ASIC ของ hyperscaler (TPU, Trainium, MTIA) กินงาน inference ปริมาณมาก · ต้นทุน HBM ที่แพงขึ้นกด gross margin · ตลาดพีซีปี 2027 คาดหดสองหลัก · และพึ่ง TSMC/ไต้หวันเกือบ 100% + ข้อจำกัดส่งออกจีน (บทเรียน MI308)"
      ],
      "asOf": "2026-11",
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
        "notes": "ไม่มีการแตกหุ้นในช่วง FY2021-FY2025 ราคาและ EPS จึงเป็นฐานหุ้นปัจจุบันอยู่แล้ว | GAAP EPS ตั้งแต่ FY2022 ถูกกดต่ำมากจากค่าตัดจำหน่าย intangible ของดีล Xilinx (ประมาณปีละ $2-3B) — non-GAAP EPS สูงกว่ามาก: FY2021 $2.79, FY2022 $3.50, FY2023 $2.65, FY2024 $3.31, FY2025 $4.17 | จำนวนหุ้น diluted กระโดดจาก ~1.23B (FY2021) เป็น ~1.6B (FY2022 เป็นต้นไป) เพราะซื้อ Xilinx ด้วยหุ้นล้วน ไม่ใช่ error จาก split | FY2025 มี net charge ~$440M จาก export control ชิป MI308 (GAAP op margin จริงต่ำกว่าศักยภาพเล็กน้อย) และ FCF พุ่งเป็น $6.7B ตามรอบ Data Center/AI | ตัวเลขปัดเศษตามเกณฑ์ curated KB (~2-3%) | Q3'26 จบ 26 ก.ย. 2026 (ปีบัญชี 52/53 สัปดาห์จบวันเสาร์) · ตั้งแต่ Q3 2026 warrant ที่ออกให้ลูกค้า (OpenAI ต.ค. 2025 · Meta ก.พ. 2026) ถูกบันทึกเป็นหนี้สินที่ต้องตีมูลค่าใหม่ทุกไตรมาสตามราคาหุ้นใน other income (expense) — GAAP EPS จะแกว่งด้วยรายการนี้ต่อไป ดู epsNote ก่อนเทียบข้ามไตรมาส · FCF = OCF จากการดำเนินงานต่อเนื่อง − capex ตามนิยามบริษัท · ราคาสิ้นงวด Q3'26 ใช้ราคาปิด 30 ก.ย. 2026 ($611.76 Yahoo Finance) · Q2'26 เพิ่ม epsNote (กำไรเงินลงทุน ~$483M) และแก้ priceQEnd 570→580.91 ตามราคาปิด Yahoo 2026-06-30 (2026-11)",
        "sources": [
          "https://www.amd.com/en/newsroom/press-releases/2026-2-3-amd-reports-fourth-quarter-and-full-year-2025-fina.html",
          "https://www.amd.com/en/newsroom/press-releases/2025-2-4-amd-reports-fourth-quarter-and-full-year-2024-fina.html",
          "https://www.amd.com/en/newsroom/press-releases/2024-1-30-amd-reports-fourth-quarter-and-full-year-2023-fina.html",
          "https://ir.amd.com/news-events/press-releases/detail/1044/amd-reports-fourth-quarter-and-full-year-2021-financial-results",
          "https://stockanalysis.com/stocks/amd/financials/cash-flow-statement/",
          "https://www.macrotrends.net/stocks/charts/AMD/amd/free-cash-flow",
          "https://www.statmuse.com/money/ask/amd-stock-price-on-december-31-2025",
          "https://www.sec.gov/Archives/edgar/data/0000002488/000000248826000188/q32026991.htm",
          "https://www.sec.gov/Archives/edgar/data/2488/000000248826000191/amd-20260926.htm",
          "https://www.sec.gov/Archives/edgar/data/2488/000000248826000045/amd-20260223.htm",
          "https://www.fool.com/earnings/call-transcripts/2026/11/04/amd-amd-q3-2026-earnings-call-transcript/",
          "https://www.investing.com/news/transcripts/earnings-call-transcript-amd-tops-q3-2026-estimates-as-stock-jumps-after-hours-93CH-4996894",
          "https://finance.yahoo.com/quote/AMD/history",
          "https://stockanalysis.com/stocks/amd/forecast/",
          "https://www.marketscreener.com/quote/stock/ADVANCED-MICRO-DEVICES-19475876/finances/"
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
            "priceQEnd": 580.91,
            "epsNote": "GAAP EPS $1.38 รวมกำไรจากเงินลงทุนระยะยาว ~$483M (~$0.29/หุ้น · อยู่ใต้กำไรดำเนินงาน ไม่ใช่รายการต่อเนื่อง) — ตัดออกเหลือ ~$1.09 · บันทึกย้อนหลังเมื่อ พ.ย. 2026 ตอนต่อแถว Q3'26 เพื่อให้ฐานเทียบตรงกัน"
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-26",
            "revenueB": 13.38,
            "epsAdj": 1.46,
            "opMarginPct": 21.2,
            "fcfB": 0.55,
            "priceQEnd": 612,
            "epsNote": "GAAP $1.46 มีรายการที่ไม่ใช่การดำเนินงานปนอยู่สามก้อน — ขาดทุนที่ไม่ใช่เงินสดจากการตีมูลค่า warrant ที่ออกให้ลูกค้า (OpenAI/Meta) $1,097M (~−$0.66/หุ้น ใต้กำไรดำเนินงาน) · กำไรจากเงินลงทุน $67M (~+$0.04/หุ้น) · และภาษีที่กลับเป็นรายการรับ $555M ทั้งที่กำไรก่อนภาษี $1.87B (excess tax benefit จาก SBC และรายการภาษีเฉพาะครั้ง) · ตัดสองรายการแรกออกและคิดภาษีที่อัตรา 13% แบบ non-GAAP ของบริษัทแทน EPS จะราว ~$1.52 (non-GAAP $2.09)"
          }
        ]
      },
      "nextEarnings": "2027-02",
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 7.56,
            "revenue": 50.8
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 8.06,
            "revenue": 51.2
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~$13.0B ±$0.3B",
            "actual": "~$13.38B",
            "result": "beat",
            "magnitudePct": 2.9
          },
          {
            "quarter": "Q3 2026",
            "metric": "margin",
            "guided": "non-GAAP gross margin ~56%",
            "actual": "non-GAAP 55.9% (GAAP 53.9%)",
            "result": "inline",
            "magnitudePct": -0.1
          },
          {
            "quarter": "Q3 2026",
            "metric": "eps",
            "guided": "ไม่ให้ guidance EPS",
            "actual": "non-GAAP $2.09 (GAAP $1.46)",
            "result": "noGuidance",
            "magnitudePct": null
          },
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
            "revenue": 51.2,
            "eps": 8.06,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 90.9,
            "eps": 16.27,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": 128.1,
            "eps": 20.95,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3 2026 รายได้ทะลุจุดกึ่งกลาง guide 2.9% (beat สี่ไตรมาสติดที่บันทึกไว้ ขนาดทรงตัวแถว 3-7%) และ gross margin 55.9% ตาม guide ~56% · guide Q4 เปลี่ยนวิธีให้ช่วงจาก ±$300M เป็น ±3% (~$17B) · consensus non-GAAP หลังงบ (Yahoo/S&P Global 4 พ.ย.) FY2026 EPS $8.06 / FY2027 $16.27 ขึ้นจาก $7.56 / $15.46 เมื่อ ส.ค. แต่รายได้ FY2026 $51.2B ยังไม่สะท้อน guide Q4 (9 เดือนจริง + guide ≈ $52.2B) ส่วน FY2028 ($128.1B / EPS $20.95) มาจาก MarketScreener แหล่งเดียวและไม่ระบุฐาน — ห้ามต่อเส้นกับ EPS จริง"
      }
    },
    "HOOD": {
      "ticker": "HOOD",
      "name": "Robinhood Markets",
      "layer": "enterprise",
      "thesis": {
        "statement": "Robinhood กำลังเปลี่ยนจาก 'แอปเทรดหุ้นฟรี' เป็นแพลตฟอร์มการเงินครบวงจรของ retail รุ่นใหม่ — หุ้น/options/crypto/prediction markets + Gold subscription ที่พ่วง banking, retirement และ AI (Cortex, Agentic Trading) เข้าด้วยกัน ฐานลูกค้า 28.7 ล้านบัญชีอายุเฉลี่ยน้อยคือ runway ของ wallet share ยาวหลายทศวรรษ เดิมพันหลักคือแปลง active trader ให้เป็นความสัมพันธ์การเงินตลอดชีวิต · Q3 2026 ยืนยันว่าขาใหม่โตจริง (event contracts รายได้ 6 เท่า YoY · Gold 5.2 ล้านคน · platform assets $396B) แต่ยังไม่พอให้รายได้รวมโตแรงเมื่อ crypto หด 55% และดอกเบี้ยขาลงกด net interest — รายได้รวมจึงโตเหลือ +12% จาก +32% ในไตรมาสก่อน — หมายเหตุ: จัดใน layer enterprise (applied AI/platform) เพื่อการเทียบกลุ่มแบบหยาบ ไม่ใช่บริษัทโครงสร้างพื้นฐาน AI",
        "pillars": [
          "Gold flywheel — สมาชิก 5.2 ล้าน (+34% YoY, สถิติใหม่) และลูกค้าใหม่ราว 40% สมัคร Gold · ผูกลูกค้าด้วย banking (เงินฝาก ~$5B) / retirement (AUC $36.6B +51% YoY) / Cortex ทำ switching cost สูงขึ้นเรื่อย ๆ",
          "Prediction markets — event contracts 16.4 พันล้านสัญญาใน Q3 2026 (มากกว่า 7 เท่า YoY) รายได้ $173M (6 เท่า) และ Rothera (JV ที่เข้าถือ MIAXdx 90% เมื่อ ม.ค. 2026) ทำรายได้ต่อปีเกิน $100M ตั้งแต่ไตรมาสเต็มแรก — ขาที่ไม่พึ่งวัฏจักร crypto",
          "การกระจายรายได้ดีขึ้น: มี 14 ธุรกิจที่รายได้ต่อปี ≥$100M · options/equities/event contracts โตตั้งแต่สองหลักถึงหลายเท่า จน crypto เหลือ ~8% ของรายได้ และ net interest ~29% (Q3'25 ~36%) — พึ่งขาใดขาหนึ่งน้อยลงทุกไตรมาส",
          "เข้า S&P 500 (ก.ย. 2025) + ปี 2025 เป็นปีสถิติทั้งรายได้และกำไร · 9 เดือนแรกปี 2026 รายได้ ~$3.80B (+~19% YoY) และ Q3 เป็นรายได้รายไตรมาสสูงสุดเป็นประวัติการณ์ — พ้นสถานะ meme stock สู่บริษัทกำไรจริง",
          "ขยายพรมแดน: Robinhood Chain ขึ้น mainnet (1 ก.ค. 2026) และติดห้าอันดับแรกด้านรายได้/วอลุ่มตั้งแต่ไตรมาสแรก · Bitstamp (สถาบัน/crypto), TradePMR (RIA custody), WonderFi (แคนาดา) · เปิด crypto ใน UK ได้ใบอนุญาต DFSA ดูไบ (เปิดปี 2027) และ MAS สิงคโปร์อนุมัติในหลักการ"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+12% YoY (Q3 2026 — $1.42B สถิติใหม่) ชะลอจาก +32% ใน Q2 · ต่ำกว่า consensus ส่วนใหญ่ (~$1.44-1.45B) เล็กน้อย · 9 เดือนแรก ~+19%",
          "trend": "down",
          "score": 58,
          "impact": "neutral",
          "why": "ขาที่ไม่ใช่ crypto ยังโตแรง — options +31%, equities +41%, event contracts 6 เท่า, รายได้อื่น (ส่วนใหญ่ค่าสมาชิก Gold) +61% · แต่ crypto หด 55% และ net interest พลิกเป็น −9% YoY จากดอกเบี้ยขาลง (CFO: ดอกเบี้ยทุก 25bp ≈ 1.5% ของรายได้) ทำให้ตัวเลขรวมชะลอแรงบนฐาน Q3'25 ที่ crypto ยังคึกคัก — คุณภาพการโตดีขึ้น แต่ความเร็วลดลงชัดเจน"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 2026 GAAP EPS $0.51 (−16% YoY · ต่ำกว่า consensus ~$0.55-0.56) รวมขาดทุนตีมูลค่า RVI ~$0.07 → ไม่รวมรายการ ~$0.58 · adjusted EPS $0.60 (−3% YoY) · กำไรดำเนินงาน (รายได้ − ค่าใช้จ่ายรวม) ~$685M (+~9% YoY, +~19% QoQ)",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "กำไรจากธุรกิจหลักยังโต แต่ EPS ตามงบลดลงจากสองเรื่องที่ไม่ใช่ตัวธุรกิจ: ขาดทุนตีมูลค่าหุ้น Robinhood Ventures Fund I ที่ถืออยู่ และอัตราภาษีที่แท้จริงกลับมา ~24% จาก ~12% ใน Q3'25 · TTM GAAP EPS ~$2.17 · consensus FY2026 (non-GAAP) $2.42 โตจากปีก่อนเพียง ~3% — ปี 2026 คือปีที่กำไรต่อหุ้นทรงตัวหลังปี 2025 ที่โตแรง ส่วนการโตรอบถัดไปฝากไว้กับปี 2027"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026: OCF $1.23B − capex ~$10M ≈ +$1.22B · 9 เดือน OCF $3.98B · capex รวมซอฟต์แวร์ ~$63M ใน 9 เดือน — โมเดล asset-light",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "ธุรกิจ platform แทบไม่ต้องลงทุนในสินทรัพย์ กำไรแปลงเป็นเงินสดได้ดี รองรับทั้ง M&A และ buyback · แต่ OCF ของโบรกเกอร์แกว่งตาม working capital (เงินลูกค้า / margin book) จึงไม่ควรอ่านรายไตรมาส (Q3'25 −$1.58B · Q1'26 +$2.03B) — ภาพรวม 9 เดือนแรกบวกราว $3.9B"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin (รายได้ − ค่าใช้จ่ายรวม) 48.1% (Q2 43.9% · Q3'25 ~49.8%) · adjusted EBITDA $808M margin 57% · ค่าใช้จ่ายรวม $739M (+16% YoY)",
          "trend": "flat",
          "score": 72,
          "impact": "positive",
          "why": "margin สูงมากสำหรับโบรกเกอร์และดีขึ้นจาก Q2 ชัดเจน (รายได้โต 9% QoQ ขณะที่ค่าใช้จ่ายแทบไม่ขยับ) · แต่ YoY ค่าใช้จ่ายรวมโต 16% เร็วกว่ารายได้ 12% (adjusted opex+SBC โต 8%) — operating leverage ยังขึ้นกับวอลุ่มเทรด · บริษัทลดเพดานกรอบค่าใช้จ่ายปี 2026 ลง $25M เป็น $2.675-2.75B"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ROE ~21% (TTM) บนส่วนของผู้ถือหุ้น ~$10.1B — สูงตามโมเดล platform แต่แกว่งตามวัฏจักรตลาด",
          "trend": "flat",
          "score": 65,
          "impact": "neutral",
          "why": "ทุนที่ใช้ต่ำทำให้ผลตอบแทนช่วงตลาดคึกสูงมาก — ด้านกลับคือปีตลาดซบผลตอบแทนหดเร็วเช่นกัน · ปีนี้กำไรทรงตัวขณะที่ส่วนของผู้ถือหุ้นโตต่อ ผลตอบแทนจึงไม่ได้ขยับขึ้น"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและรายการเทียบเท่า ~$5.8B (30 ก.ย. 2026) จาก ~$4.3B สิ้นปี 2025 — ส่วนหนึ่งมาจากหุ้นกู้แปลงสภาพ $2.2B (มิ.ย. 2026)",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "เงินสดเพียงพอทำ M&A ต่อเนื่อง (Bitstamp, TradePMR, WonderFi, MIAXdx) และ buyback โดยไม่ต้องเพิ่มทุน · ส่วนที่เพิ่มขึ้นปีนี้มาจากทั้งกระแสเงินสดของธุรกิจและเงินกู้แปลงสภาพ ไม่ใช่จากธุรกิจล้วน"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "เงินกู้ระยะยาว ~$2.7B — หลักคือหุ้นกู้แปลงสภาพดอกเบี้ย 0% $2.2B ครบกำหนด 2029 (ราคาแปลง $174.42) ที่ออกเมื่อ มิ.ย. 2026 · ยังเป็นเงินสดสุทธิ ~$3B",
          "trend": "down",
          "score": 72,
          "impact": "positive",
          "why": "จากที่แทบไม่มีหนี้เชิงโครงสร้าง กลายเป็นมีหนี้ก้อนแรก แต่ต้นทุนดอกเบี้ยเป็นศูนย์และเงินสดยังมากกว่าหนี้ราวสองเท่า · ความเสี่ยงงบดุลหลักยังเป็นด้าน operations (margin book $22.1B +59% YoY) ซึ่งบริหารตามเกณฑ์กำกับ"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 911 ล้านหุ้น (Q3 2026) จาก 918 ล้านใน Q3'25 (−~1%) · buyback สะสม $1.3B (27 ล้านหุ้น เฉลี่ย ~$48) ตั้งแต่ Q3'24 · SBC ~$85M ต่อไตรมาส",
          "trend": "flat",
          "score": 62,
          "impact": "neutral",
          "why": "buyback เริ่มชดเชย SBC ได้จนจำนวนหุ้นลดลงเล็กน้อยสุทธิ — ดีขึ้นจากยุคแรก · แต่ Q3 ซื้อคืนเพียง $25M (จาก $414M ใน Q2) และหุ้นกู้แปลงสภาพอาจเพิ่มหุ้นราว 12.6 ล้านหุ้นถ้าราคาเกิน $174.42 (มี capped call ช่วยลดผลถึง ~$237.85)"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "M&A เชิงกลยุทธ์ (Bitstamp, TradePMR, WonderFi, MIAXdx ผ่าน Rothera) · buyback ~$689M ใน 9 เดือนแรกปี 2026 · หุ้นกู้แปลงสภาพ 0% $2.2B",
          "trend": "flat",
          "score": 68,
          "impact": "positive",
          "why": "ซื้อกิจการเพื่อเปิดตลาดใหม่ (สถาบัน, RIA, แคนาดา, exchange ของ prediction markets) ในขนาดที่ไม่กระทบงบดุล และ Rothera ทำรายได้ต่อปีเกิน $100M ตั้งแต่ไตรมาสเต็มแรก · ซื้อหุ้นคืนสะสมที่ราคาเฉลี่ย ~$48 ถือว่าจังหวะดีมาก แต่ Q3 แทบหยุดซื้อ และหุ้นกู้แปลงสภาพเป็นภาระที่ต้องจัดการในอนาคต"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา $87.41 (4 พ.ย. 2026 · mcap ~$79B) · P/E ย้อนหลัง ~40x (GAAP TTM $2.17) · ~36x ของ consensus FY2026 non-GAAP $2.42 · ~26x ของ FY2027 $3.39",
          "trend": "up",
          "score": 44,
          "impact": "neutral",
          "why": "ราคาลง ~23% จากต้นปีและ ~22% ในหนึ่งเดือน (ลง ~10% ในสามวันหลังงบ) ทำให้ multiple หดจาก ~50x เหลือ ~40x — ถูกลงมากแต่ยังแพงกว่า broker ดั้งเดิม (~15-25x) และราคายังรวมการเติบโตของกำไรปี 2027 ราว 40% ที่นักวิเคราะห์คาดไว้ ถ้ากำไรไม่เร่งตามคาด multiple ยังหดได้อีก"
        }
      ],
      "revenueQuality": {
        "acceleration": "decelerating",
        "consistency": 55,
        "recurringPct": 39,
        "note": "รายได้เทรดผันผวนตามตลาดสูงมาก (จุดอ่อนเชิงโครงสร้าง) แต่ส่วนผสมดีขึ้นต่อเนื่อง: Q3 2026 net interest ~29% + รายได้อื่น (ส่วนใหญ่ค่าสมาชิก Gold) ~10% · crypto เหลือ ~8% · event contracts ~12% และบริษัทมี 14 ธุรกิจที่รายได้ต่อปี ≥$100M — แต่ YoY growth ยังแกว่งแรง +27% (Q4'25) → +15% (Q1'26) → +32% (Q2'26) → +12% (Q3'26) ตามวัฏจักร crypto และทิศทางดอกเบี้ย",
        "segments": [
          {
            "name": "Net interest (margin/securities lending/cash sweep)",
            "sharePct": 29,
            "growthNote": "$415M (−9% YoY · Q2 $389M +9%) — margin book สถิติใหม่ $22.1B (+59%) แต่ดอกเบี้ยขาลงและ cash sweep −9% YoY กดรายได้ · ดอกเบี้ยทุก 25bp ≈ 1.5% ของรายได้รวม",
            "trend": "down"
          },
          {
            "name": "Options trading",
            "sharePct": 28,
            "growthNote": "$399M (+31% YoY · Q2 $342M) — สัญญาที่ซื้อขาย 905 ล้านสัญญา (+48%) สถิติใหม่",
            "trend": "up"
          },
          {
            "name": "Prediction markets (event contracts)",
            "sharePct": 12,
            "growthNote": "$173M (6 เท่า YoY · Q2 $156M) — 16.4 พันล้านสัญญา (มากกว่า 7 เท่า) · Rothera ทำรายได้ต่อปีเกิน $100M ในไตรมาสเต็มแรก",
            "trend": "up"
          },
          {
            "name": "Equities + ธุรกรรมอื่น",
            "sharePct": 12,
            "growthNote": "equities $121M (+41% YoY · Q2 $129M) วอลุ่ม $992B สถิติใหม่ (+53%) + รายได้ธุรกรรมอื่น ~$54M",
            "trend": "up"
          },
          {
            "name": "รายได้อื่น (ส่วนใหญ่ค่าสมาชิก Gold)",
            "sharePct": 10,
            "growthNote": "$142M (+61% YoY · Q2 $143M) · Gold 5.2 ล้านคน (+34%)",
            "trend": "up"
          },
          {
            "name": "Crypto trading",
            "sharePct": 8,
            "growthNote": "$120M (−55% YoY · Q2 $100M) — วอลุ่ม $50B (−38%) · หดสี่ไตรมาสติดแม้ฟื้นเล็กน้อย QoQ",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 63,
        "items": [
          {
            "item": "Robinhood Legend (แพลตฟอร์ม active trader)",
            "status": "executing",
            "evidence": "วอลุ่มหุ้น $992B (+53%) และ options 905 ล้านสัญญา (+48%) ทำสถิติใหม่ใน Q3 2026 · บริษัทระบุว่าส่วนแบ่งตลาดโตสองหลัก YoY ทั้งหุ้น options crypto และ margin — ดึงลูกค้า serious trader จาก broker เดิมได้จริง"
          },
          {
            "item": "Prediction markets + Rothera (exchange ของตัวเอง)",
            "status": "executing",
            "evidence": "event contracts 16.4 พันล้านสัญญา (มากกว่า 7 เท่า YoY) รายได้ $173M · Rothera ทำรายได้ต่อปีเกิน $100M ในไตรมาสเต็มแรก ซื้อขายไปแล้วกว่า 6.4 พันล้านสัญญาและปรับค่าธรรมเนียมเป็นแบบ dynamic — เป็นผู้นำ retail ใน asset class ใหม่"
          },
          {
            "item": "Cortex + Agentic Trading (AI ในแอป)",
            "status": "on-track",
            "evidence": "ลูกค้าราว 200,000 รายเปิดบัญชี Agentic Trading สร้างวอลุ่มกว่า $1.6B และยอดเงินในบัญชี ~$250M · ยังช่วง adoption แรก เป็นตัวเพิ่มมูลค่าแพ็กเกจมากกว่าเครื่องผลิตรายได้ตรง"
          },
          {
            "item": "Gold ecosystem (banking + retirement + Strategies)",
            "status": "executing",
            "evidence": "Gold 5.2 ล้าน (+34%) · Banking เงินฝากเกือบ $5B จากลูกค้ากว่า 350,000 ราย · Strategies ลูกค้า 350,000 ราย AUM กว่า $2B · Retirement AUC $36.6B (+51%) — ขยายจากเทรดสู่บัญชีการเงินหลัก"
          },
          {
            "item": "Tokenization / Robinhood Chain",
            "status": "on-track",
            "evidence": "Chain ขึ้น mainnet และติดห้าอันดับแรกด้านรายได้และวอลุ่มตั้งแต่ไตรมาสแรก (DEX volume กว่า $80B · ค่าธรรมเนียม chain กว่า $50M) + หุ้น tokenized ใน EU · แต่ส่วนที่เป็นรายได้ของบริษัทเองยังเล็ก (Truist ลดคาดการณ์รายได้ Chain ปี 2027 จาก $146M เหลือ $30M)"
          },
          {
            "item": "ขยายต่างประเทศ",
            "status": "on-track",
            "evidence": "เปิด crypto ใน UK · ได้ใบอนุญาต DFSA ดูไบ (เปิดปี 2027) · MAS สิงคโปร์อนุมัติในหลักการเป็นศูนย์กลาง APAC · WonderFi เพิ่มฐาน crypto ในแคนาดา — ยังเป็นสัดส่วนรายได้เล็ก"
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
            "note": "ผู้นำ retail trading รุ่นใหม่ในสหรัฐฯ ชัดเจน ส่วนแบ่งตลาดโตสองหลัก YoY ในทุกสินทรัพย์หลัก + platform assets $396B (+19%) — แต่ AUC ยังเล็กมากเทียบ Schwab/Fidelity"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "UX/มือถือเป็นเบอร์หนึ่ง Legend ปิดช่องว่างฝั่ง desktop · Agentic Trading และ Robinhood Chain เป็นของใหม่ที่ broker ดั้งเดิมยังไม่มี — แต่ยังเร็วเกินจะเรียกว่าผู้นำเทคโนโลยี"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "Rothera ทำรายได้ต่อปีเกิน $100M ตั้งแต่ไตรมาสเต็มแรก · Chain ขึ้น mainnet และ Agentic Trading มีลูกค้า ~200,000 รายภายในไม่กี่เดือน — ออกผลิตภัณฑ์เร็วที่สุดในอุตสาหกรรม"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายค่าย",
            "status": "strengthening",
            "note": "Retirement AUC $36.6B (+51%) · Banking เงินฝาก ~$5B · Gold 5.2 ล้าน — จากแอปเทรดที่ลบง่าย กลายเป็นบัญชีการเงินหลัก"
          },
          {
            "key": "ecosystem",
            "label": "ecosystem",
            "status": "strengthening",
            "note": "14 ธุรกิจที่รายได้ต่อปี ≥$100M — เทรด/ออม/เกษียณ/ธนาคาร/AI/blockchain ยิ่งใช้หลายบริการยิ่งผูกแน่น"
          },
          {
            "key": "developerAdoption",
            "label": "developer adoption",
            "status": "stable",
            "note": "Robinhood Chain เป็นแพลตฟอร์มแรกที่เปิดให้นักพัฒนา (DEX volume กว่า $80B ในไตรมาสแรก) แต่รายได้ที่ตกถึงบริษัทยังเล็ก — มิตินี้ยังไม่ใช่สนามแข่งหลักของ HOOD"
          },
          {
            "key": "customerLockin",
            "label": "การล็อกอินลูกค้า",
            "status": "strengthening",
            "note": "IRA match มีเงื่อนไขถือยาว + เงินเดือนเข้าบัญชี Robinhood · ลูกค้าใหม่ราว 40% สมัคร Gold และ Banking กลายเป็นปลายทางอันดับหนึ่งของเงินที่ถอนจากบัญชีโบรกเกอร์"
          },
          {
            "key": "moat",
            "label": "moat",
            "status": "stable",
            "note": "brand + ความเร็ว + ecosystem กว้างขึ้น แต่คู่แข่งแต่ละแนวแข็งแรง (Schwab/Fidelity ฝั่งสินทรัพย์, Coinbase ฝั่ง crypto, Kalshi/Polymarket ฝั่ง prediction)"
          }
        ]
      },
      "capitalAllocation": {
        "score": 68,
        "verdict": "จัดสรรทุนดีขึ้นชัดเจน — M&A เปิดตลาดใหม่ในขนาดสมเหตุสมผล (Rothera คืนทุนเป็นรายได้เร็ว) และซื้อหุ้นคืนสะสมที่ราคาเฉลี่ยต่ำ ~$48 · จุดที่ต้องตามคือ SBC ที่ยังสูง การซื้อคืนที่แผ่วลงมากใน Q3 และหุ้นกู้แปลงสภาพ $2.2B ที่เพิ่มภาระและโอกาสเจือจางในอนาคต",
        "items": [
          {
            "label": "M&A",
            "current": "Bitstamp (สถาบัน/crypto) + TradePMR (RIA) + WonderFi (แคนาดา · มิ.ย. 2026) + MIAXdx 90% ผ่าน Rothera (ม.ค. 2026)",
            "assessment": "good",
            "why": "ซื้อความสามารถ/ใบอนุญาตที่สร้างเองช้า — เปิดตลาดสถาบัน ที่ปรึกษา ต่างประเทศ และ exchange ของ prediction markets โดยไม่เจือจางหนัก · Rothera ทำรายได้ต่อปีเกิน $100M ตั้งแต่ไตรมาสเต็มแรก"
          },
          {
            "label": "Buyback",
            "current": "Q3 2026 $25M (0.2 ล้านหุ้น เฉลี่ย ~$105) จาก $414M ใน Q2 · สะสม $1.3B (27 ล้านหุ้น เฉลี่ย ~$48) ตั้งแต่ Q3'24",
            "assessment": "neutral",
            "why": "จังหวะซื้อสะสมดีมากและจำนวนหุ้นเริ่มลดสุทธิ · แต่ปริมาณไม่สม่ำเสมอ — Q3 แทบหยุดซื้อ จึงยังไม่ถึงขั้นคืนทุนแบบ big tech"
          },
          {
            "label": "SBC / การเจือจาง",
            "current": "~$85M ต่อไตรมาส (9 เดือน $277M)",
            "assessment": "neutral",
            "why": "ต้นทุนแฝงที่กดผู้ถือหุ้น — แลกกับการรักษาทีมในตลาดแรงงานแข่งสูง · ปัจจุบัน buyback ชดเชยได้แล้ว"
          },
          {
            "label": "หุ้นกู้แปลงสภาพ",
            "current": "$2.2B ดอกเบี้ย 0% ครบกำหนด 2029 ราคาแปลง $174.42 + capped call ถึง ~$237.85 · ใช้ ~$290M ซื้อหุ้นคืนพร้อมกัน (มิ.ย. 2026)",
            "assessment": "neutral",
            "why": "ได้เงินทุนต้นทุนต่ำมากในจังหวะที่ราคาหุ้นสูง · แต่เปลี่ยนบริษัทจากไม่มีหนี้เป็นมีหนี้ และอาจเจือจาง ~12.6 ล้านหุ้นถ้าราคาขึ้นไปเกินราคาแปลง"
          },
          {
            "label": "การลงทุนภายใน (ผลิตภัณฑ์ใหม่)",
            "current": "เทเข้า Legend, Rothera/prediction markets, banking, Cortex/Agentic Trading, Robinhood Chain",
            "assessment": "good",
            "why": "อัตราการออกผลิตภัณฑ์ต่อปีสูงสุดในกลุ่ม และหลายตัวแปลงเป็นรายได้จริงแล้ว (event contracts $173M ต่อไตรมาส · 14 ธุรกิจรายได้ต่อปี ≥$100M)"
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
        "level": "premium",
        "note": "ราคา $87.41 (4 พ.ย. 2026 · mcap ~$79B) — P/E ย้อนหลัง ~40x (GAAP TTM $2.17) · ~36x ของ consensus FY2026 non-GAAP $2.42 · ~26x ของ FY2027 $3.39 · จากราคาปิดสิ้นไตรมาส $112.50 (30 ก.ย.) ลงมาราว 22% (รวมช่วงลง ~10% ในสามวันหลังรายได้ Q3 ต่ำกว่า consensus เล็กน้อย) และ −23% จากต้นปี · multiple หดจาก ~50x มาเหลือ ~40x จึงขยับจากระดับแพงจัดมาเป็นพรีเมียม แต่ยังแพงกว่า broker ดั้งเดิมหลายเท่า และตั้งอยู่บนสมมติฐานกำไรปี 2027 โต ~40% · เป้าเฉลี่ยนักวิเคราะห์ ~$131"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 → Q3 2026)",
          "prev": "$1.31B (+32% YoY)",
          "now": "$1.42B (+12% YoY) สถิติใหม่แต่โตช้าลงมาก และต่ำกว่า consensus ~$1.44-1.45B เล็กน้อย — ราคาลง ~10% ในสามวันหลังงบ",
          "direction": "negative"
        },
        {
          "metric": "ขาที่ผูกกับวัฏจักร (crypto / net interest)",
          "prev": "crypto $100M (−38% YoY) · net interest $389M (+9% YoY)",
          "now": "crypto $120M (−55% YoY) · net interest $415M (−9% YoY) จากดอกเบี้ยขาลงและ cash sweep ที่ลดลง",
          "direction": "negative"
        },
        {
          "metric": "Prediction markets (event contracts)",
          "prev": "$156M (~10 เท่า YoY) · 13.6 พันล้านสัญญา",
          "now": "$173M (6 เท่า YoY) · 16.4 พันล้านสัญญา · Rothera รายได้ต่อปีเกิน $100M ในไตรมาสเต็มแรก",
          "direction": "positive"
        },
        {
          "metric": "Gold / platform assets / net deposits",
          "prev": "Gold 4.8 ล้าน · platform assets $369B · net deposits $21.7B",
          "now": "Gold 5.2 ล้าน (+34% YoY) · $396B (+19% YoY) · net deposits $15.7B (ต.ค. เดือนเดียวเกิน $13B รวม $6B จากเงินบริจาคของครอบครัว Dell เข้า Trump Accounts)",
          "direction": "positive"
        },
        {
          "metric": "operating margin / EPS",
          "prev": "43.9% · GAAP $0.62 (รวมกำไร deconsolidate RVI ~$0.14 → ~$0.48) · adjusted $0.48",
          "now": "48.1% · GAAP $0.51 (รวมขาดทุนตีมูลค่า RVI ~$0.07 → ~$0.58) · adjusted $0.60 — ดีขึ้น QoQ แต่ GAAP −16% YoY จากภาษีที่กลับสู่ระดับปกติ",
          "direction": "neutral"
        },
        {
          "metric": "กรอบค่าใช้จ่ายปี 2026 (adjusted opex+SBC)",
          "prev": "$2.675-2.775B",
          "now": "$2.675-2.75B (ลดเพดาน $25M) · แผนปี 2027 จะประกาศ ม.ค.-ก.พ.",
          "direction": "neutral"
        }
      ],
      "risks": [
        "รายได้ผูกกับวอลุ่มเทรดและอารมณ์ตลาด — bear market หรือ retail เงียบ = รายได้หดเร็วและแรง (consistency ต่ำเชิงโครงสร้าง) · CFO ส่งสัญญาณว่า spread ช่วงต้น Q4 แคบลง ซึ่งอาจกดรายได้ธุรกรรม crypto และหุ้น",
        "Crypto revenue หด −38% → −47% → −55% และ net interest พลิกเป็น −9% YoY ตามดอกเบี้ยขาลง (ทุก 25bp ≈ 1.5% ของรายได้) — ถ้าวัฏจักรสองขานี้ยังลงพร้อมกัน ขาใหม่ (event contracts, Gold) ต้องโตเร็วกว่าเดิมอีกจึงจะพยุงการเติบโตรวมได้",
        "Valuation ~40x ของกำไรย้อนหลังยังไม่เผื่อความผิดพลาด — งบ Q3 รายได้ต่ำกว่าคาดเพียง ~1-2% หุ้นก็ลง ~10% ในสามวัน และราคาปัจจุบันยังรวมการเติบโตของกำไรปี 2027 ราว 40% ไว้แล้ว",
        "Regulatory หลายแนวพร้อมกัน: PFOF, prediction markets (CFTC และการดำเนินการของหน่วยงานระดับรัฐต่อ event contracts), crypto, banking — กติกาเปลี่ยนได้ทุกไตรมาส และ event contracts คือขาที่โตเร็วที่สุดตอนนี้",
        "แผนค่าใช้จ่ายปี 2027 ยังไม่ประกาศ (จะให้ ม.ค.-ก.พ.) และค่าใช้จ่ายรวม Q3 โต 16% YoY เร็วกว่ารายได้ — ถ้าการลงทุนผลิตภัณฑ์ใหม่ (Chain, ต่างประเทศ, Agentic Trading) เร่งขึ้นขณะที่รายได้วัฏจักรอ่อน margin จะถูกบีบ"
      ],
      "asOf": "2026-11",
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
        "notes": "HOOD ไม่เคยแตกหุ้น ราคาและ EPS ทุกปีเป็น basis ปัจจุบันโดยไม่ต้องปรับ; EPS FY2021 ติดลบหนัก (-$7.49) จากขาดทุน GAAP ~$3.7B ที่ส่วนใหญ่เป็น stock-based compensation ก้อนใหญ่ตอน IPO และจำนวนหุ้นถัวเฉลี่ยต่ำเพราะ IPO กลางปี (~492M หุ้น) ส่วนปีอื่น implied diluted shares เสถียร ~879M→919M; งบกำไรขาดทุนของ HOOD ไม่มีบรรทัด operating income แยก จึงคำนวณ operating margin จาก (total net revenues − total operating expenses)/revenue ตามแนวทาง aggregator (operating income -1,641/-1,011/-536/+1,054/+2,094 $M); FCF (OCF − capex) ผันผวนแรงตาม working capital ของธุรกิจโบรกเกอร์ (segregated cash / payables to users) เช่น FY2024 OCF ติดลบ -$157M ทั้งที่กำไรสุทธิ $1.4B ขณะที่ FY2023 OCF บวก $1.18B ทั้งที่ยังขาดทุน — ไม่ควรใช้ FCF เป็นตัวชี้วัดหลักของบริษัทนี้ (capex เล็กมาก $2-63M/ปี); OCF ยืนยันตรงกับ SEC XBRL (10-K) ทุกปี; ราคาปิดสิ้นปี 2025 ($113.10) ยืนยันจาก StatMuse — คิดเป็นผลตอบแทนปีปฏิทิน 2025 ประมาณ +203.5% จากราคาปิดสิ้นปี 2024 ($37.26); FY2025 net income $1.9B เทียบ $1.4B ใน FY2024 ซึ่งรวม one-time benefit $424M (tax benefit + regulatory accrual reversal, +$0.47 ต่อหุ้น) ใน Q4 2024; ตัวเลข revenue ปัดเป็น 1 ทศนิยม ($1.815B→1.8, $1.358B→1.4, $1.865B→1.9, $2.951B→3.0, $4.473B→4.5); Q3'26 (เพิ่ม 2026-11): operating margin = (1,424 − 739) ÷ 1,424 = 48.1% ตามสูตรเดียวกับทั้งชุด (ตรวจแล้วว่า Q2'26 43.9% = (1,308 − 734) ÷ 1,308 ไม่ใช่กำไรก่อนภาษี $709M) · FCF = OCF $1,225M − ซื้อ PP&E $10M ≈ $1.22B (ไม่หัก capitalized software $11M — สูตรเดียวกับ Q1'26/Q2'26 ที่ตรวจย้อนจาก OCF 9 เดือน $3,983M) · ราคาสิ้นงวด $112.50 = ราคาปิด 30 ก.ย. 2026 จาก StatMuse · EPS $0.51 เป็น diluted GAAP จาก 8-K (8-K/A ที่ยื่นวันเดียวกันแก้เฉพาะผลภาษีของรายการ non-GAAP ไม่กระทบตัวเลข GAAP) · priceQEnd ตรวจกับราคาปิด Yahoo วันซื้อขายสุดท้ายของเดือนสิ้นไตรมาส (2026-11): Q3'23 10.5 → 9.81, Q4'23 13 → 12.74, Q1'24 19 → 20.13, Q2'24 21.5 → 22.71, Q3'24 24.5 → 23.42, Q4'24 40.5 → 37.26, Q1'25 45 → 41.62, Q3'25 130 → 143.18, Q1'26 100 → 69.3, Q2'26 91 → 100.28",
        "sources": [
          "https://stockanalysis.com/stocks/hood/financials/",
          "https://stockanalysis.com/stocks/hood/financials/cash-flow-statement/",
          "https://data.sec.gov/api/xbrl/companyconcept/CIK0001783879/us-gaap/NetCashProvidedByUsedInOperatingActivities.json",
          "https://investors.robinhood.com/news-releases/news-release-details/robinhood-reports-fourth-quarter-and-full-year-2025-results",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2021",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-30-2022",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-29-2023",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2024",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-december-31-2025",
          "https://www.sec.gov/Archives/edgar/data/0001783879/000178387926000164/q32026robinhoodexhibit991.htm",
          "https://www.sec.gov/Archives/edgar/data/0001783879/000178387926000170/q32026robinhoodamendedex991.htm",
          "https://www.sec.gov/Archives/edgar/data/0001783879/000178387926000167/hood-20260930.htm",
          "https://www.sec.gov/Archives/edgar/data/1783879/000178387926000113/q22026robinhoodexhibit991.htm",
          "https://www.statmuse.com/money/ask/hood-stock-price-on-september-30-2026"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 0.47,
            "epsAdj": -0.09,
            "opMarginPct": -15.6,
            "fcfB": null,
            "priceQEnd": 9.81,
            "endDate": "2023-09-30"
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 0.47,
            "epsAdj": 0.03,
            "opMarginPct": 14.6,
            "fcfB": null,
            "priceQEnd": 12.74,
            "endDate": "2023-12-31"
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 0.62,
            "epsAdj": 0.18,
            "opMarginPct": 25.6,
            "fcfB": null,
            "priceQEnd": 20.13,
            "endDate": "2024-03-31"
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 0.68,
            "epsAdj": 0.21,
            "opMarginPct": 27.7,
            "fcfB": 0.05,
            "priceQEnd": 22.71,
            "endDate": "2024-06-30"
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 0.64,
            "epsAdj": 0.17,
            "opMarginPct": 23.7,
            "fcfB": 1.81,
            "priceQEnd": 23.42,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 1.01,
            "epsAdj": 1.01,
            "opMarginPct": 54.8,
            "fcfB": -1.4,
            "priceQEnd": 37.26,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 0.93,
            "epsAdj": 0.37,
            "opMarginPct": 39.9,
            "fcfB": 0.64,
            "priceQEnd": 41.62,
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
            "priceQEnd": 143.18,
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
            "priceQEnd": 69.3,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 1.31,
            "epsAdj": 0.62,
            "opMarginPct": 43.9,
            "fcfB": 0.71,
            "priceQEnd": 100.28,
            "endDate": "2026-06-30",
            "epsNote": "EPS $0.62 รวม ~$0.14 จากการ deconsolidate กองทุน Robinhood Ventures Fund I (กำไร ~$129M ครั้งเดียว) — ตัดรายการนี้ออกจะเหลือ ~$0.48 · net income ไตรมาสนี้ $573M"
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 1.42,
            "epsAdj": 0.51,
            "opMarginPct": 48.1,
            "fcfB": 1.22,
            "priceQEnd": 112.5,
            "endDate": "2026-09-30",
            "epsNote": "EPS $0.51 รวมขาดทุนที่ยังไม่เกิดขึ้นจริง ~$67M (~$0.07/หุ้น) ส่วนใหญ่จากการตีมูลค่าหุ้น Robinhood Ventures Fund I (RVI) ที่ยังถืออยู่ตามราคาตลาด (อยู่ใต้กำไรดำเนินงาน) — ตัดรายการนี้ออกจะเหลือ ~$0.58 (adjusted EPS ของบริษัท $0.60) · net income $476M · รายการนี้อาจเกิดซ้ำได้ทั้งบวกและลบตราบที่ยังถือหุ้น RVI"
          }
        ]
      },
      "nextEarnings": "2027-02",
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 2.48,
            "revenue": 5.16
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 2.42,
            "revenue": 5.32
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance",
            "actual": "$1.42B (+12% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q3 2026",
            "metric": "eps",
            "guided": "ไม่ให้ guidance",
            "actual": "GAAP $0.51 · adjusted $0.60",
            "result": "noGuidance",
            "magnitudePct": null
          },
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
            "revenue": 5.32,
            "eps": 2.42,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 6.9,
            "eps": 3.39,
            "confidence": "medium",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": null,
            "eps": 4.37,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "Robinhood ไม่ให้ guidance รายได้หรือ EPS รายไตรมาส (ให้เฉพาะกรอบ adjusted opex+SBC รายปี ซึ่ง Q3 ลดเพดานเป็น $2.675-2.75B) แถว guidance จึงเป็น noGuidance ตามจริง · consensus FY2026 ลดจาก $2.48 เป็น $2.42 (non-GAAP · stockanalysis 32 นักวิเคราะห์ ตรงกับ TIKR normalized) ขณะที่รายได้ขยับขึ้นเป็น $5.32B ส่วน FY2027 $3.39 / รายได้ ~$6.9B และ FY2028 $4.37 มาจาก TIKR (normalized) แหล่งเดียว — Finviz/MarketBeat ให้ FY2027 ~$2.97-2.98 โดยไม่ระบุฐาน และทั้งหมดเป็นคนละฐานกับ EPS GAAP ใน KB"
      }
    },
    "LLY": {
      "ticker": "LLY",
      "name": "Eli Lilly",
      "layer": "enterprise",
      "thesis": {
        "statement": "Eli Lilly เป็นผู้นำคู่ (กับ Novo Nordisk) ของ megatrend ที่ใหญ่ที่สุดในประวัติศาสตร์ยา — กลุ่ม GLP-1/incretin รักษาเบาหวาน+โรคอ้วน Mounjaro/Zepbound (tirzepatide ฉีด) ครองส่วนแบ่งขึ้นนำ และได้ Foundayo (orforglipron) ยา GLP-1 แบบ 'เม็ดกิน' ตัวแรกที่อนุมัติ — เปิดตลาดที่กว้างกว่ายาฉีดมาก เดิมพันหลักคือ TAM โรคอ้วนระดับหลายร้อยล้านคนทั่วโลก + ประสิทธิภาพ best-in-class (retatrutide รุ่นถัดไปชนะ Ozempic แบบ head-to-head แล้ว) + กำลังการผลิตที่คู่แข่งตามไม่ทัน — หมายเหตุ: จัดใน layer enterprise แบบหลวม ๆ เพื่อการเทียบกลุ่ม (LLY ใช้ AI/ML ในการค้นพบยา แต่แก่นคือ pharma megatrend ไม่ใช่บริษัทโครงสร้าง AI)",
        "pillars": [
          "GLP-1 duopoly — Mounjaro+Zepbound ครอง ~6 ใน 10 ใบสั่งยา incretin โรคอ้วนใน US (ยาฉีด >7 ใน 10) และ ~58% นอก US แซง Novo ด้วยประสิทธิภาพลดน้ำหนักที่เหนือกว่า",
          "Oral GLP-1 (Foundayo/orforglipron) — ยาเม็ดตัวแรกที่อนุมัติ (เม.ย. 2026) ผลิตง่าย/ขยายสเกลได้กว่ายาฉีดหลายเท่า เปิดตลาดคนไข้กลุ่มใหม่ — Q3'26 ยอด $184M, คนไข้ใหม่เพิ่ม 2 เท่า QoQ",
          "กำลังการผลิตเป็นคูเมือง — ทุ่ม capex หลายหมื่นล้าน$ สร้างโรงงาน (ล่าสุดวางศิลาฤกษ์ Houston $6.5B + Richmond $5B) เป็นข้อจำกัดจริงของอุปสงค์ที่คู่แข่งลอกตามช้า",
          "ท่อยาลึก — retatrutide (triple agonist) ชนะ Ozempic 2 mg head-to-head ใน T2D, EloraTZP รุ่นถัดไปเข้า Phase 3, Kisunla (อัลไซเมอร์), การขยาย label (หยุดหายใจขณะหลับ, ลดความเสี่ยงหัวใจ, MASH) ต่อยอดฐานเดิม",
          "มาร์จิ้นขยายแรง — operating margin พุ่งจาก ~29% (2024) เป็น ~40% (2025) และ performance margin guidance ปี 2026 ยกเป็น 52.0-52.5% จาก operating leverage ของยอดขาย GLP-1"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+39% YoY (Q3 2026 — $24.4B, เหนือคาด ~$22.6B) · Mounjaro $10.7B (+65%) · Zepbound $5.35B (+49%) · ปริมาณ +53% แต่ราคาขายจริง −15%",
          "trend": "down",
          "score": 88,
          "impact": "positive",
          "why": "ยังโตแรงบนฐานที่ใหญ่ขึ้น (รายได้ $19.8B → $23.0B → $24.4B) แต่อัตราโตชะลอ 3 ไตรมาสติด (+56% → +48% → +39%) และ Q3 มีรายการครั้งเดียว ~$900M (milestone + ปรับประมาณการ rebate) หนุนอยู่ · guidance ใหม่ $91-92B บอกเป็นนัยว่า Q4 ~$23.8-24.8B (+24-29% YoY) — ดีมานด์ยังล้นแต่ราคาขายจริงลดเป็นตัวถ่วง"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "GAAP EPS $7.22 (+16%) · non-GAAP $7.48 (+7%, ชนะคาด ~$5.7-6.6) — ทั้งคู่รวม acquired IPR&D $4.57/หุ้น · ไม่รวม IPR&D ~$12.05 (+56% YoY)",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "กำไรแกนโตเร็วกว่ารายได้จาก operating leverage (non-GAAP ไม่รวม IPR&D ~$7.73 → ~$12.05) — ตัวเลขรายงานถูกกดด้วยค่า IPR&D ~$4.2B จากดีล AtaiBeckley/Curevo ซึ่งเป็นรายการครั้งเดียว ไม่ใช่การเสื่อมของธุรกิจ · guidance underlying ทั้งปียกขึ้น +$4.07 ที่จุดกึ่งกลาง"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3'26 ~$8.2B (OCF ~$11.4B − capex ~$3.2B) · 9 เดือน ~$19.0B (เทียบ ~$8.3B ปีก่อน) · TTM ~$19.7B",
          "trend": "up",
          "score": 65,
          "impact": "positive",
          "why": "FCF พลิกจากจุดอ่อนเป็นจุดแข็ง — OCF 9 เดือน ~$27.4B (2 เท่าของปีก่อน) โตเร็วกว่า capex ที่ยังเพิ่ม (~$8.4B, +59%) ทำให้ FCF ใกล้เคียงกำไรสุทธิแล้ว · แต่โรงงานใหม่ $11.5B ที่เพิ่งวางศิลาฤกษ์จะดัน capex ปี 2027 สูงขึ้นอีก จึงยังไม่ใช่ cash machine แบบ big tech"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Q3'26 operating margin ตามงบ ~35% (ถูก IPR&D กด ~17 จุด) · ไม่รวม IPR&D ~52% · gross margin 83.9% (+1 จุด) · guidance performance margin ปี 2026 ยกเป็น 52.0-52.5% (เดิม 49.0-50.5%)",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "margin แกนขยายต่อจาก scale ของ GLP-1 (ยอดขาย +39% ขณะ R&D +23% / SG&A +14%) — ส่วนที่ดูตกใน GAAP มาจาก IPR&D ครั้งเดียว · แรงถ่วงจริงคือราคาขายจริงที่ลด (−15% ทั่วโลก, US −10% ไม่รวมรายการปรับ rebate) ซึ่งยังถูกชดเชยด้วยปริมาณ"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงขึ้นตามกำไร — กำไรสุทธิ 9 เดือน ~$20.9B บนทุน+หนี้ ~$90B (ประมาณหยาบ ~30%) แต่ฐานทุนโตเร็วจาก capex",
          "trend": "up",
          "score": 72,
          "impact": "positive",
          "why": "ผลตอบแทนดีขึ้นชัดเพราะกำไรโตเร็วกว่าฐานทุน แต่การทุ่ม capex + ดีล IPR&D ทำให้ invested capital บวมต่อเนื่อง — ผลตอบแทนที่แท้จริงขึ้นกับว่าอุปสงค์ GLP-1 ยั่งยืนแค่ไหนหลังโรงงานใหม่เดินเครื่อง"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสด ~$4.9B (30 ก.ย. 2026) เทียบหนี้ ~$49.5B — สภาพคล่องพึ่ง OCF ที่แรง ไม่ใช่กองเงินสด",
          "trend": "flat",
          "score": 56,
          "impact": "neutral",
          "why": "เงินสดถูกใช้กับ capex + ปันผล + buyback + M&A พร้อมกัน (9 เดือน: ปันผล ~$4.6B, buyback ~$4.3B, capex ~$8.4B) จึงยังออกหุ้นกู้เสริม — ไม่ใช่งบดุลเงินสดล้นแบบ big tech แต่ OCF ~$27B/9 เดือน รองรับได้สบาย"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้รวม ~$49.5B (ระยะยาว ~$47.0B + ระยะสั้น ~$2.5B) — 9 เดือนออกหุ้นกู้ใหม่ ~$8.9B ชำระคืน ~$1.6B",
          "trend": "down",
          "score": 54,
          "impact": "neutral",
          "why": "ก่อหนี้เพิ่มต่อเนื่องในช่วงลงทุนหนัก — net debt ~$45B ยังต่ำกว่า 1 เท่าของกำไรดำเนินงานไม่รวม IPR&D ต่อปี จึงบริหารได้ แต่ทิศทางหนี้ยังขึ้น (trend = แย่ลงเชิงงบดุล) ต้องจับตาเมื่อ capex รอบใหม่ $11.5B เริ่มจ่ายจริง"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted ~893 ล้านหุ้น (จาก ~899 ล้านหุ้นปีก่อน) · buyback 9 เดือน ~$4.3B (ปีก่อน ~$2.6B)",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "ไม่เจือจางและเริ่มหดเล็กน้อย — SBC ต่ำแบบ pharma + buyback เร่งขึ้นเกือบเท่าตัว จำนวนหุ้นลด ~0.6% YoY เป็นมิตรต่อผู้ถือหุ้นมากขึ้น"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "capex กำลังผลิต (~$8.4B/9 เดือน + โรงงานใหม่ $11.5B) + ปันผลขึ้น 15% + buyback เร่ง + M&A bolt-on (AtaiBeckley, Curevo, Merida) + R&D หนัก",
          "trend": "up",
          "score": 74,
          "impact": "positive",
          "why": "จัดสรรเชิงรุกเพื่อคว้า megatrend — ลงทุนโรงงาน+ท่อยาในจังหวะที่อุปสงค์ล้น และยังคืนเงินผู้ถือหุ้นเพิ่มได้พร้อมกัน สมเหตุสมผล แต่ดีล IPR&D ~$4.2B ใน Q3 กดกำไรรายงาน และถ้าอุปสงค์แผ่ว capex ที่ลงไปจะกลายเป็นภาระ"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$1,374 (29 ต.ค. 2026, +6.6% รับงบ) · market cap ~$1.2T · forward P/E ~39x บน guidance FY2026 ($35.5) / ~29x บน consensus FY2027 (~$47.5)",
          "trend": "down",
          "score": 36,
          "impact": "negative",
          "why": "หุ้นขึ้น ~25% จาก ~$1,100 ตอน Q2 ทำให้ multiple ขยายขึ้นอีก — แพงเชิงสัมบูรณ์และเทียบกลุ่มยา (peers ~15-18x) · กำไร FY2027 ที่คาดโต ~15-20% จากฐาน underlying ปี 2026 ไล่ทัน multiple ช้าลง (PEG ขยับเข้าใกล้/เกิน 1) · ความเสี่ยงหลักคือราคาขายจริงที่ลดต่อเนื่องและคู่แข่ง oral GLP-1 ที่จะกดดัน multiple ระยะถัดไป"
        }
      ],
      "revenueQuality": {
        "acceleration": "decelerating",
        "consistency": 82,
        "recurringPct": 85,
        "note": "รายได้ยังโตสูงแต่อัตราชะลอ 3 ไตรมาสติด (+56% → +48% → +39%) และกระจุกที่ GLP-1 (tirzepatide ~66% ของรายได้) — เป็นดาบสองคม: โตเร็วมากแต่พึ่งโมเลกุลเดียวสูง · รายได้ยาเป็น recurring (ใช้ต่อเนื่องเรื้อรัง) แต่ราคาขายจริงลด −15% ทั่วโลก (US −7%, หรือ −10% ไม่รวมรายการปรับ rebate) และผู้บริหารเตือนว่ารายได้ปี 2026 มีรายการครั้งเดียว ~$2B (milestone + ปรับประมาณการ rebate) ที่จะไม่เกิดซ้ำปี 2027 · ยาเดิม (Trulicity −14%, Taltz −5%) แผ่วขณะยาใหม่ (Kisunla +175%, Ebglyss/Jaypirca +59%, Foundayo, Inluriyo) กำลัง ramp",
        "segments": [
          {
            "name": "Mounjaro (tirzepatide — เบาหวาน)",
            "sharePct": 44,
            "growthNote": "$10.7B (+65% YoY) — US $5.0B (+41%) + ต่างประเทศ $5.7B (+93%) · จีนทะลุ $1B ในปีแรกบน NRDL",
            "trend": "up"
          },
          {
            "name": "Zepbound (tirzepatide — โรคอ้วน)",
            "sharePct": 22,
            "growthNote": "$5.35B (+49% YoY) — US $5.3B (+48%) demand แรงชดเชย net price ที่ลด",
            "trend": "up"
          },
          {
            "name": "เบาหวาน/cardiometabolic เดิม (Jardiance, Trulicity, Humalog)",
            "sharePct": 13,
            "growthNote": "Jardiance $1.58B (+65%) ดึงกลุ่มขึ้น ขณะ Trulicity $0.90B (−14%) ถูกแทนด้วย tirzepatide",
            "trend": "flat"
          },
          {
            "name": "Oncology (Verzenio, Jaypirca, Inluriyo)",
            "sharePct": 9,
            "growthNote": "Verzenio $1.51B (+3%) ทรงตัว · Jaypirca $228M (+59%) · Inluriyo เปิดตัว $73M",
            "trend": "up"
          },
          {
            "name": "ภูมิคุ้มกัน+ประสาท+ยาใหม่+อื่น ๆ (Taltz, Ebglyss, Omvoh, Kisunla, Foundayo)",
            "sharePct": 12,
            "growthNote": "Foundayo (orforglipron) $184M ไตรมาสที่ 2 ของการขาย · Kisunla $193M (+175%) · Taltz $856M (−5%)",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 88,
        "items": [
          {
            "item": "Foundayo (orforglipron) — ยาเม็ด GLP-1 ตัวแรก",
            "status": "executing",
            "evidence": "Q3'26 ยอด $184M · ~4 ใน 10 ของคนไข้ที่เริ่มยาเม็ดโรคอ้วนเลือก Foundayo และคนไข้ใหม่เพิ่ม 2 เท่า QoQ · ผล Phase 3 ยืนยันความปลอดภัยหัวใจพร้อมลด A1C/น้ำหนักต่อเนื่อง"
          },
          {
            "item": "ขยายกำลังผลิต tirzepatide (capex มหาศาล)",
            "status": "executing",
            "evidence": "capex 9 เดือน ~$8.4B (+59%) + วางศิลาฤกษ์ Houston $6.5B และ Richmond $5B (ไซต์ใหม่ใน US ครบ 10 แห่งตั้งแต่ 2020) — ปริมาณขาย +53% YoY แสดงว่า supply เริ่มไล่ทันดีมานด์"
          },
          {
            "item": "Pipeline รุ่นถัดไป (retatrutide, EloraTZP)",
            "status": "executing",
            "evidence": "retatrutide ชนะ Ozempic 2 mg head-to-head ใน T2D (28 ต.ค.): A1C −2.2% vs −1.8%, น้ำหนัก −20.9% vs ~9.4% — Phase 3 บวกครั้งที่ 6 · EloraTZP (Phase 2) ลดน้ำหนักมากกว่า tirzepatide 15 mg เริ่ม Phase 3 ใน Q4'26"
          },
          {
            "item": "ขยายข้อบ่งใช้/ยาใหม่ (Mounjaro หัวใจ, Onswik, Inluriyo, Jaypirca)",
            "status": "executing",
            "evidence": "FDA อนุมัติใน Q3: Mounjaro ลดความเสี่ยงหัวใจใน T2D · Onswik อินซูลินพื้นฐานฉีดสัปดาห์ละครั้ง · Inluriyo+Verzenio มะเร็งเต้านม ESR1 · Jaypirca ใช้เป็นยาแรกใน CLL — ขยายกลุ่มผู้ป่วยและการคุ้มครองประกัน"
          },
          {
            "item": "แรงกดด้านราคา/การเข้าถึง",
            "status": "at-risk",
            "evidence": "ราคาขายจริง −15% ทั่วโลก (US −10% ไม่รวมรายการปรับ rebate) ขับโดย Zepbound · โครงการ Medicare GLP-1 Bridge (>500,000 คนตั้งแต่ ก.ค., 7 ใน 10 เลือกยา Lilly) ขยายการเข้าถึงแต่ที่ราคาต่ำกว่า — ความเสี่ยงต่อ margin ระยะยาว"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "Moat มาจาก 3 ชั้น: (1) ประสิทธิภาพทางคลินิกที่เหนือกว่า (tirzepatide ลดน้ำหนักมากกว่า semaglutide และ retatrutide ชนะ Ozempic head-to-head กว่า 2 เท่า) (2) กำลังการผลิตที่สร้างล่วงหน้าหลายหมื่นล้าน$ ซึ่งเป็นข้อจำกัดจริงของตลาด (3) สิทธิบัตร tirzepatide/orforglipron + first-mover ของยาเม็ด — เป็น duopoly กับ Novo Nordisk ที่คนที่สามเข้ามาแข่งได้ยากในระยะสั้น",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "US: ~6 ใน 10 ใบสั่งยา incretin โรคอ้วน (ยาฉีด >7 ใน 10) และ >60% ในเบาหวาน · นอก US ขยับขึ้น ~4 จุด QoQ เป็น ~58% · Mounjaro ครอง >50% ของคนไข้เริ่มยาใหม่ — เบอร์หนึ่งของ category ที่ใหญ่ที่สุดในวงการยา"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี (ประสิทธิภาพยา)",
            "status": "strengthening",
            "note": "tirzepatide (dual agonist) ลดน้ำหนักเหนือ semaglutide · retatrutide (triple) ชนะ Ozempic 2 mg ทั้ง A1C และน้ำหนัก (−20.9% vs ~9.4%) · มี oral orforglipron ก่อนใคร — นำทั้งยาฉีดและยาเม็ด"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการ execute",
            "status": "strengthening",
            "note": "ไตรมาสเดียวได้อนุมัติ 4 รายการ (Mounjaro หัวใจ, Onswik, Inluriyo, Jaypirca) + ramp การผลิต + ปิดดีล 3 ราย — แปลงท่อยาเป็นยอดขายได้ไวผิดปกติสำหรับ pharma"
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
            "note": "LillyDirect (ขายตรงถึงผู้ป่วย) + Medicare GLP-1 Bridge + ครอบคลุมโรคร่วม (เบาหวาน/หัวใจ/หยุดหายใจ) สร้าง ecosystem รอบคนไข้อ้วน แต่ยังช่วงต้น"
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
            "note": "คูเมืองกว้างขึ้นจากกำลังผลิต + oral first-mover + ท่อยารุ่นถัดไปที่พิสูจน์แล้ว (retatrutide) แต่ระวังคลื่นคู่แข่ง oral GLP-1 (Novo, Pfizer, Roche, Amgen) ที่กำลังมา"
          }
        ]
      },
      "capitalAllocation": {
        "score": 74,
        "verdict": "จัดสรรทุนเชิงรุกเพื่อคว้า megatrend — ลงทุนกำลังผลิต+ท่อยาในจังหวะอุปสงค์ล้น พร้อมคืนเงินผู้ถือหุ้นเพิ่ม (ปันผล +15%, buyback 9 เดือน ~$4.3B) จุดต้องจับตาคือ capex รอบใหม่ $11.5B และดีล IPR&D ~$4.2B ที่กดกำไรรายงาน บวกหนี้ที่ยังเพิ่ม ถ้าอุปสงค์ยั่งยืนคือการลงทุนที่คุ้ม ถ้าแผ่วคือความเสี่ยง",
        "items": [
          {
            "label": "Capex (กำลังการผลิต)",
            "current": "~$8.4B ใน 9 เดือน (+59%) + วางศิลาฤกษ์ Houston $6.5B / Richmond $5B",
            "assessment": "good",
            "why": "จำเป็นและเป็นคูเมือง — ปลดล็อกอุปสงค์ที่ล้น (ปริมาณขาย +53%) แต่ยังกด FCF และเดิมพันว่าอุปสงค์ยั่งยืน"
          },
          {
            "label": "เงินปันผล",
            "current": "$1.73/หุ้น/ไตรมาส (+15% YoY) · 9 เดือนจ่าย ~$4.6B",
            "assessment": "good",
            "why": "ประวัติปันผลยาวนานและเพิ่มสม่ำเสมอ — เป็นมิตรต่อผู้ถือหุ้นระยะยาว"
          },
          {
            "label": "R&D / ท่อยา",
            "current": "R&D ~$4.2B/ไตรมาส (+23%) ใน incretin รุ่นถัดไป + ยาโรคอื่น",
            "assessment": "good",
            "why": "ต่อยอด pipeline ป้องกัน patent cliff — retatrutide/EloraTZP/orforglipron คือผลของการลงทุนนี้"
          },
          {
            "label": "M&A",
            "current": "ปิดดีล AtaiBeckley (จิตเวช) + Curevo ใน Q3 และ Merida (autoimmune) หลังสิ้นงวด — IPR&D ~$4.2B",
            "assessment": "neutral",
            "why": "ซื้อกิจการขนาดกลางเสริมท่อยานอก incretin — วินัยพอใช้ ไม่ได้เป็นตัวขับหลัก แต่ค่า IPR&D ก้อนใหญ่ทำให้กำไรรายงานผันผวน"
          },
          {
            "label": "Buyback / หนี้",
            "current": "buyback 9 เดือน ~$4.3B (เร่งจาก ~$2.6B) + ออกหุ้นกู้ใหม่ ~$8.9B",
            "assessment": "neutral",
            "why": "buyback เร่งขึ้นขณะที่หนี้ยังเพิ่ม — เหมาะสมช่วงลงทุนและ FCF เริ่มแรง แต่งบดุลยังตึงขึ้น"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "ราคา ~$1,374 (29 ต.ค. 2026 หลังรับงบ +6.6%) · forward P/E ~39x บน guidance non-GAAP FY2026 ($35.00-36.00 ซึ่งรวม IPR&D $4.57) และ ~29x บน consensus FY2027 (~$47.5) — แพงเชิงสัมบูรณ์และเทียบกลุ่มยา (peers ~15-18x) · เดิมพันคือคลื่น GLP-1/obesity ยังยาว + Foundayo (ยาเม็ด) + retatrutide ขยายตลาด — ความเสี่ยง valuation มาจากราคาขายจริงที่ลด (−15%), รายการครั้งเดียว ~$2B ที่หายไปในปี 2027 และคู่แข่ง oral GLP-1 ที่อาจกด multiple มากกว่าตัวธุรกิจเอง"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q3 2026)",
          "prev": "Q2'26 $23.0B (+48%)",
          "now": "$24.4B (+39% YoY) — เหนือคาด ~$22.6B · ปริมาณ +53% ราคา −15%",
          "direction": "positive"
        },
        {
          "metric": "Mounjaro",
          "prev": "Q2 $9.9B (+91%)",
          "now": "$10.7B (+65% YoY) — ต่างประเทศ $5.7B (+93%)",
          "direction": "positive"
        },
        {
          "metric": "Zepbound",
          "prev": "Q2 US $4.9B (+44%)",
          "now": "$5.35B (+49% YoY) — US $5.3B (+48%)",
          "direction": "positive"
        },
        {
          "metric": "EPS (GAAP / non-GAAP)",
          "prev": "Q2 $7.94 / $8.38",
          "now": "$7.22 / $7.48 — รวม IPR&D $4.57 (AtaiBeckley+Curevo) · ไม่รวม ~$12.05 (+56%)",
          "direction": "neutral"
        },
        {
          "metric": "Guidance FY2026 รายได้",
          "prev": "$85-87B",
          "now": "$91-92B (ยกจุดกึ่งกลาง +$5.5B) · performance margin 52.0-52.5% (เดิม 49.0-50.5%)",
          "direction": "positive"
        },
        {
          "metric": "Guidance non-GAAP EPS FY2026",
          "prev": "$35.50-36.50",
          "now": "$35.00-36.00 (underlying +$4.07 แต่ IPR&D $4.57 หักกลบ)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "คู่แข่งโรคอ้วนเข้มข้นขึ้น — Novo (CagriSema, oral semaglutide), Pfizer/Roche/Amgen (oral GLP-1) กำลังมา อาจกัดส่วนแบ่ง/ราคาในระยะถัดไป",
        "แรงกดด้านราคา — ราคาขายจริง −15% ทั่วโลก (US −10% ไม่รวมรายการปรับ rebate) + รายได้ปี 2026 มีรายการครั้งเดียว ~$2B ที่ไม่เกิดซ้ำปี 2027 + การเมืองเรื่องราคายา US (IRA, Medicare, MFN) กดดัน margin ระยะยาว",
        "Valuation ~29x FY2027 / ~39x FY2026 แทบไม่เผื่อพลาด — pharma ปกติ ~15x ถ้าโตช้าลง (อัตราโตชะลอ 3 ไตรมาสติดแล้ว) หรือ pipeline สะดุด multiple หดแรง",
        "พึ่ง tirzepatide สูงมาก (Mounjaro+Zepbound ~66% ของรายได้) — ความเสี่ยงกระจุกตัวในโมเลกุลเดียว: safety signal หรือ patent/biosimilar กระทบทั้งพอร์ต",
        "capex มหาศาล (โรงงานใหม่ $11.5B) + หนี้ ~$49.5B — ถ้าอุปสงค์ normalize เร็วกว่าคาด โรงงานที่สร้างไว้จะกลายเป็นภาระและ ROIC หด",
        "หมายเหตุ layer: LLY จัดใน enterprise แบบหลวม ๆ — ไม่ใช่หุ้นสาย AI infrastructure การเทียบ peer ในกลุ่มนี้จึงเป็นแบบหยาบ"
      ],
      "asOf": "2026-10",
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
        "notes": "ตัวเลขเป็นค่าประมาณ curated ~2-3% · EPS as-reported (ไม่มี split) · operating margin = operating income/revenue (รวม acquired IPR&D และ asset impairment/restructuring ตามงบ) · FCF = OCF − capex: ต่ำสุดที่ ~$0.8B ปี 2023 จาก capex สร้างโรงงานพุ่ง (capex โต ~6 เท่าจาก $1.3B ปี 2021 เป็น ~$7.8B ปี 2025) แล้วฟื้นเป็น ~$9B ปี 2025 · ไตรมาสปี 2026 คิด FCF จาก 10-Q สะสม (9M'26 OCF ~$27.4B − capex ~$8.4B) ลบงวดก่อนหน้า · ราคาเป็นราคาปิดสิ้นปีจริง (ไม่ปรับปันผล) · จำนวนหุ้น diluted ~890-900 ล้านหุ้นเสถียรทุกปี · opMarginExItemsPct (Q2'26 ~51.3% · Q3'26 ~52.4%) = operating margin ไม่รวมค่า acquired IPR&D ครั้งเดียวในกำไรดำเนินงาน (คิดจากยอดที่เปิดเผย) — หน้า Intelligence ใช้ค่านี้ ตารางรายไตรมาสยังแสดง margin ตามงบ",
        "sources": [
          "https://stockanalysis.com/stocks/lly/financials/",
          "https://www.prnewswire.com/news-releases/lilly-reports-fourth-quarter-2025-financial-results-and-provides-2026-guidance-302678376.html",
          "https://www.sec.gov/Archives/edgar/data/59478/000005947826000013/lly-20251231.htm",
          "https://www.sec.gov/Archives/edgar/data/0000059478/000005947826000104/q326lillysalesandearningsp.htm",
          "https://www.sec.gov/Archives/edgar/data/59478/000005947826000108/lly-20260930.htm",
          "https://www.prnewswire.com/news-releases/lilly-reports-third-quarter-2026-financial-results-raises-full-year-guidance-and-highlights-regulatory-progress-across-the-portfolio-302922907.html",
          "https://stockanalysis.com/stocks/lly/history/",
          "https://www.sec.gov/Archives/edgar/data/0000059478/000005947826000077/q226lillysalesandearningsp.htm"
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
            "epsNote": "EPS รายงาน (GAAP) $7.94 · non-GAAP $8.38 — ส่วนต่างหลักมาจากค่าใช้จ่าย acquired IPR&D จากดีล business development ในไตรมาสนี้ ซึ่งกดกำไรบัญชีลงแต่ไม่ใช่ต้นทุนดำเนินงานปกติ · IPR&D ไตรมาสนี้ ~$2.8B (~$3.03/หุ้น · Kelonia + Centessa) → operating margin ไม่รวม IPR&D ~51.3% (ที่รายงาน ~39.1%)",
            "opMarginExItemsPct": 51.3
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 24.4,
            "epsAdj": 7.22,
            "opMarginPct": 35.3,
            "fcfB": 8.22,
            "priceQEnd": 1157,
            "endDate": "2026-09-30",
            "epsNote": "EPS รายงาน (GAAP) $7.22 · non-GAAP $7.48 — ทั้งสองฐานรวมค่าใช้จ่าย acquired IPR&D ~$4.2B (~$4.57/หุ้น) จากการซื้อ AtaiBeckley และ Curevo ในไตรมาสนี้ (Q3'25 มีเพียง $0.71) · ถ้าไม่รวม IPR&D: GAAP ~$11.79 / non-GAAP ~$12.05 (+56% YoY) · ส่วนต่าง GAAP vs non-GAAP ~$0.26 มาจากค่าตัดจำหน่าย $0.11 + ด้อยค่า/ปรับโครงสร้าง $0.18 − กำไรเงินลงทุน $0.04",
            "opMarginExItemsPct": 52.4
          }
        ]
      },
      "nextEarnings": "2027-02",
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 36.73,
            "revenue": 88.18
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 47.46,
            "revenue": 102.33
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "~$24.4B (+39% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
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
            "revenue": 90.35,
            "eps": 33.67,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 102.33,
            "eps": 47.46,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Lilly ให้ guidance เป็น 'รายปี' ไม่ใช่รายไตรมาส — รอบ Q3 2026 บริษัท<b>ยกเป้าทั้งปี</b>เป็นครั้งที่ 3 ติดต่อกัน: รายได้ $91-92B (เดิม $85-87B) และ performance margin 52.0-52.5% ขณะที่ non-GAAP EPS ขยับลงเป็น $35.00-36.00 เพราะ IPR&D $4.57 จากดีล AtaiBeckley/Curevo หักกลบ underlying ที่ยกขึ้น +$4.07 · consensus ณ 29-30 ต.ค. ยังปรับไม่ทัน (FY2026 ~$90.4B / EPS ~$33.7 ต่ำกว่ากรอบบริษัท ส่วน FY2027 ~$102.3B / EPS ~$47.5 จาก Yahoo 26-27 นักวิเคราะห์ โดย MarketScreener ให้ EPS ต่ำกว่าที่ ~$44.7) และผู้บริหารเตือนว่ารายได้ปี 2026 มีรายการครั้งเดียว ~$2B (milestone + ปรับประมาณการ rebate) ที่จะไม่เกิดซ้ำในปี 2027"
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
          "ดีมานด์ AI ดัน guidance ขึ้นต่อเนื่อง — FY2026 ยอดขายสุทธิ €44-45B (จาก €36-40B ต้นปี) และลูกค้าเริ่มคุยออร์เดอร์ปี 2029-2030 จนบริษัทต้องหาทางเพิ่มกำลังผลิตปี 2028 เกินแผนเดิม",
          "Installed Base Management (บริการ/อัปเกรด) ~€3.3B/ไตรมาส — recurring, margin สูงมาก, โตทุกครั้งที่ขายเครื่อง ช่วยกลบวัฏจักรของยอดขายเครื่อง",
          "Gross margin 57.5% ใน Q3 2026 และยังมีแรงหนุน — พลังตั้งราคาของผู้ผูกขาด (ข้อตกลงราคาใหม่กับลูกค้าหลักเริ่มมีผลปี 2027 เต็มที่ปี 2028)",
          "แรงหนุนเชิงโครงสร้าง: ชิป AI ทุกตัวต้องใช้ ASML — ยิ่งโลกสร้าง compute มากเท่าไร ยิ่งต้องใช้เวเฟอร์ node ล้ำ ยิ่งต้องใช้เครื่อง ASML"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "Q3 2026 €11.7B (+55% YoY) · FY2026 guide €44-45B (~+36% YoY)",
          "trend": "up",
          "score": 87,
          "impact": "positive",
          "why": "ลูกค้าเพิ่มประมาณการความต้องการเครื่องทั้งระยะสั้นและกลางจากการลงทุน AI — บริษัทบอกว่ากำลังผลิตที่วางไว้สำหรับปี 2027-2028 อาจไม่พอ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS €12.93 (~$14.9) ใน Q3 2026 จาก €7.58 (Q2) — รวมกำไรพิเศษ Mistral ~€0.5B · ตัดออกแล้วยังโต ~+50% QoQ",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ายอดขายจาก margin ที่ขยาย — แม้ตัดกำไรตีมูลค่า Mistral ออก กำไรก็ยังเร่งชัดเจน"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF €11.4B ใน Q3 2026 จากเงินมัดจำลูกค้า (contract liabilities ระยะยาว €3.6B → €9.3B)",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เงินสดเข้าก้อนใหญ่เพราะลูกค้าจ่ายมัดจำล่วงหน้าเพื่อจองเครื่องปี 2027-2028 — สะท้อนดีมานด์จริง แต่เป็นจังหวะรับเงิน ไม่ใช่ระดับที่จะเกิดทุกไตรมาส"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Gross margin 57.5% · operating margin ~44% (Q3 2026) — สูงสุดเป็นประวัติการณ์",
          "trend": "up",
          "score": 90,
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
          "current": "เงินสด+เงินลงทุนระยะสั้น €12.7B (สิ้น Q3 2026)",
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
          "current": "ซื้อหุ้นคืน €4.1B ใน Q3 2026 (โครงการ 2026-2028) + ปันผลระหว่างกาล €1.88/หุ้น",
          "trend": "up",
          "score": 84,
          "impact": "positive",
          "why": "ลงทุน R&D เพื่อรักษาความนำทางเทคโนโลยี (คูเมือง) ควบคู่คืนเงินผู้ถือหุ้นอย่างมีวินัย — จัดสรรทุนระดับตัวอย่างของอุตสาหกรรม"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "forward P/E (12 เดือนข้างหน้า) ~30x (ราคา ADR ~$1,600-1,780 · ต.ค. 2026)",
          "trend": "up",
          "score": 55,
          "impact": "neutral",
          "why": "กำไรโตเร็วกว่าราคาหุ้นจน multiple ลดจาก ~40x กลางปีเหลือ ~30x — อยู่ในกรอบค่าเฉลี่ยตัวเอง (~30-35x) ไม่ได้ตึงเท่าช่วงกลางปี แต่ยังไวต่อสัญญาณวัฏจักร"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 65,
        "recurringPct": 30,
        "note": "รายได้เร่งตัวจากดีมานด์ AI แต่มีลักษณะ 'วัฏจักร' สูงเชิงโครงสร้าง — ยอดขายเครื่องขึ้นกับรอบ capex ของโรงงานชิปไม่กี่ราย (จุดอ่อนด้าน consistency) · ตัวถ่วงคือ Installed Base Management (~28% ของยอดขาย) ที่เป็น recurring margin สูง · ASML เลิกเปิดตัวเลข net bookings รายไตรมาสแล้ว — สัญญาณแทนคือเงินมัดจำลูกค้า (contract liabilities ระยะยาวเพิ่มจาก €3.6B เป็น €9.3B ใน Q3 2026)",
        "segments": [
          {
            "name": "Net system sales — EUV (รวม High-NA)",
            "sharePct": 35,
            "growthNote": "€4.1B ใน Q3 2026 (รวม High-NA 1 เครื่อง)",
            "trend": "up"
          },
          {
            "name": "Net system sales — DUV + metrology",
            "sharePct": 37,
            "growthNote": "€4.3B ใน Q3 2026 — DUV ยังขายดีตามการขยายกำลังผลิตทั้ง logic และ memory",
            "trend": "up"
          },
          {
            "name": "Installed Base Management (บริการ + อัปเกรด)",
            "sharePct": 28,
            "growthNote": "€3.3B ใน Q3 2026 (จาก €2.8B ใน Q2) — โตตามฐานเครื่องที่ติดตั้งสะสม",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 88,
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
            "evidence": "€3.3B ใน Q3 2026 (จาก €2.8B ใน Q2) และโตตามฐานเครื่องที่ติดตั้งสะสม — ขา recurring ที่คาดการณ์ได้และกำไรสูง"
          },
          {
            "item": "ดีมานด์ AI → ยก guidance และกำลังผลิตต่อเนื่อง",
            "status": "executing",
            "evidence": "FY2026 €44-45B (ยกขอบล่างอีกครั้ง) · ลูกค้าเริ่มคุยออร์เดอร์ปี 2029-2030 และบริษัทกำลังหาทางเพิ่มกำลังผลิตปี 2028 เกินแผนเดิม"
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
        "score": 84,
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
            "current": "ปันผลระหว่างกาล €1.88/หุ้น (จ่าย 4 พ.ย. 2026) และเพิ่มต่อเนื่อง",
            "assessment": "good",
            "why": "ประวัติปันผลเพิ่มสม่ำเสมอแบบ compounder — เป็นมิตรต่อผู้ถือหุ้นระยะยาว"
          },
          {
            "label": "Buyback",
            "current": "€4.1B ใน Q3 2026 ภายใต้โครงการ 2026-2028 — จำนวนหุ้นลดสุทธิ",
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
        "level": "fair",
        "note": "forward P/E ~30x (12 เดือนข้างหน้า, ราคา ADR ~$1,600-1,780 ต.ค. 2026 · mcap ~$620-680B) — ลดจาก ~40x กลางปีเพราะกำไรโตเร็วกว่าราคา และอยู่ในกรอบค่าเฉลี่ยตัวเอง (~30-35x) · ตัวเลข trailing ยังสูงกว่านี้เพราะรวมกำไรพิเศษ Mistral · คุณภาพธุรกิจสูงสุด แต่หุ้นยังแกว่งแรงตามสัญญาณวัฏจักร เหมาะสะสมจังหวะย่อมากกว่าไล่ราคา"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026)",
          "prev": "€9.3B",
          "now": "€11.7B (+55% YoY) — ในกรอบ guidance €11.0-12.0B",
          "direction": "positive"
        },
        {
          "metric": "Gross margin",
          "prev": "54.0%",
          "now": "57.5% — สูงกว่ากรอบ 55-57% ที่ให้ไว้",
          "direction": "positive"
        },
        {
          "metric": "กำไรสุทธิ",
          "prev": "€2.9B",
          "now": "€5.0B (รวมกำไรตีมูลค่า Mistral ~€0.5B)",
          "direction": "positive"
        },
        {
          "metric": "Free cash flow",
          "prev": "~€1.3B",
          "now": "€11.4B — เงินมัดจำลูกค้าจองเครื่องปี 2027-28",
          "direction": "positive"
        },
        {
          "metric": "Guidance FY2026",
          "prev": "€43-45B · GM 54-56%",
          "now": "€44-45B · GM ~56%",
          "direction": "positive"
        },
        {
          "metric": "Installed Base Management",
          "prev": "€2.8B",
          "now": "€3.3B",
          "direction": "positive"
        }
      ],
      "risks": [
        "วัฏจักร (cyclicality): รายได้ผูกกับรอบ capex ของโรงงานชิป (TSMC/Samsung/Intel) — ถ้ารอบลงทุนชะลอ ยอดขายเครื่องหดแรงและเร็ว (เคยเกิดช่วง digestion 2023-2024) และหุ้น multiple สูงจะโดนลงโทษหนัก",
        "จีน + export controls: ~20% ของยอดขายอยู่ภายใต้กฎจำกัดของสหรัฐ/เนเธอร์แลนด์ — ความตึงเครียดภูมิรัฐศาสตร์เพิ่มความเสี่ยงถูกตัดตลาดเพิ่ม และเร่งให้จีนพยายามสร้าง lithography เอง (SMEE)",
        "การกระจุกตัวของลูกค้า: พึ่งลูกค้าไม่กี่ราย (TSMC เป็นรายใหญ่สุด) — ถ้าลูกค้าหลักเลื่อนแผน fab หรือสะดุด order ก้อนใหญ่กระทบทันที",
        "Valuation ~30x (forward 12 เดือน): อยู่ในกรอบค่าเฉลี่ยตัวเองแต่ยังไวต่อทุกสัญญาณ order/วัฏจักร — หลังงบ Q3 ราคาแกว่งเพราะรายได้ต่ำกว่าที่ตลาดคาดเล็กน้อย แม้พื้นฐานผูกขาดไม่เปลี่ยน",
        "High-NA adoption: เครื่องรุ่นถัดไปแพงมาก (~€350M/เครื่อง) — ถ้าลูกค้าชะลอรับ High-NA หรือ node ถัดไปสะดุดทางเทคนิค การเติบโตระยะยาวจะช้าลง"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2027-01",
      "history": {
        "fyNote": "ปีบัญชี = ปีปฏิทิน (สิ้นสุด ธ.ค.) — FY2021-FY2025 · ตัวเลขแปลงเป็น USD (ADR)",
        "epsBasis": "diluted GAAP, USD (ADR) — ASML รายงาน EUR · รายปีแปลงด้วยอัตราเฉลี่ยรายปี · รายไตรมาสแปลงด้วยอัตราเฉลี่ยรายไตรมาส (แก้ ต.ค. 2026: เดิมตารางรายไตรมาสเป็นตัวเลข EUR ทำให้ P/E ย้อนหลังสูงเกินจริงราว 15%) · ไม่มี split",
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
        "notes": "ตัวเลขแปลง USD จากงบ EUR ด้วยอัตราเฉลี่ยรายปี (~2-3% ความคลาด) · operating margin เป็นอัตราส่วนจึงไม่ขึ้นกับ FX · FCF ผันผวนสูง: พุ่งปี 2021 (prepayment ลูกค้า) ต่ำสุด ~$4.7B ปี 2023 (สต๊อก/WIP) แล้วฟื้นเป็น ~$14B ปี 2025 · ราคาเป็น ADR (Nasdaq) ปิดสิ้นปีจริง USD ไม่มี split · จำนวนหุ้นลดจาก ~410M เป็น ~389M จาก buyback · ต.ค. 2026: แปลงตารางรายไตรมาสทั้งหมดจาก EUR เป็น USD (รายได้ / EPS / FCF) ด้วยอัตราเฉลี่ยรายไตรมาส EUR/USD ~1.05-1.17 ที่ได้จาก EPS สกุล USD ของ alphaquery เทียบ EPS EUR ของบริษัท (Q2'25 ใช้ 1.134 เพราะแหล่งนั้นให้ตัวเลขผิด) · ผลรวม 4 ไตรมาสปี 2025 หลังแปลง ~$37.0B ตรงกับรายได้ทั้งปี ~$36.9B ในตาราง",
        "sources": [
          "https://stockanalysis.com/stocks/asml/financials/",
          "https://www.asml.com/en/news/press-releases/2026/q2-2026-financial-results",
          "https://www.sec.gov/Archives/edgar/data/0000937966/000162828026065813/pressreleasefinancialresul.htm",
          "https://www.alphaquery.com/stock/ASML/earnings-history",
          "https://stockanalysis.com/stocks/asml/history/"
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "revenueB": 7.25,
            "epsAdj": 5.23,
            "opMarginPct": 32.7,
            "fcfB": 0.68,
            "priceQEnd": 580
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "revenueB": 7.8,
            "epsAdj": 5.6,
            "opMarginPct": 33.1,
            "fcfB": 2.81,
            "priceQEnd": 755
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "revenueB": 5.75,
            "epsAdj": 3.38,
            "opMarginPct": 26.3,
            "fcfB": -0.73,
            "priceQEnd": 1020
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "revenueB": 6.72,
            "epsAdj": 4.32,
            "opMarginPct": 29.4,
            "fcfB": 0.42,
            "priceQEnd": 1035
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "revenueB": 8.2,
            "epsAdj": 5.8,
            "opMarginPct": 32.7,
            "fcfB": 0.59,
            "priceQEnd": 845
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 9.88,
            "epsAdj": 7.3,
            "opMarginPct": 36.2,
            "fcfB": 9.43,
            "priceQEnd": 683
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 8.15,
            "epsAdj": 6.31,
            "opMarginPct": 35.4,
            "fcfB": -0.49,
            "priceQEnd": 690
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 8.72,
            "epsAdj": 6.69,
            "opMarginPct": 34.6,
            "fcfB": 0.37,
            "priceQEnd": 785
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 8.8,
            "epsAdj": 6.41,
            "opMarginPct": 32.8,
            "fcfB": 0.3,
            "priceQEnd": 960
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 11.32,
            "epsAdj": 8.55,
            "opMarginPct": 35.3,
            "fcfB": 12.77,
            "priceQEnd": 1080
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 10.27,
            "epsAdj": 8.37,
            "opMarginPct": 36,
            "fcfB": -3.03,
            "priceQEnd": 1250
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 10.84,
            "epsAdj": 8.81,
            "opMarginPct": 37.1,
            "fcfB": 1.63,
            "priceQEnd": 1987
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 13.42,
            "epsAdj": 14.88,
            "opMarginPct": 44.3,
            "fcfB": 13.07,
            "priceQEnd": 1811.67,
            "epsNote": "รวมกำไรจากการตีมูลค่าเงินลงทุนใน Mistral AI ~€0.5B (~$1.5 ต่อหุ้น) · ตัดรายการนี้ออก EPS ราว $13.4 — ยังโตแรงจาก Q2 แต่ไม่ถึงตัวเลขพาดหัว"
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
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": null,
            "revenue": 43.21
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 58.05,
            "revenue": null
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~€11.0-12.0B",
            "actual": "~€11.66B",
            "result": "beat",
            "magnitudePct": 1.4
          },
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
            "revenue": 44.5,
            "eps": null,
            "confidence": "low",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": 54.33,
            "eps": 58.05,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "ASML ให้ guidance รายได้เป็นช่วง EUR ทุกไตรมาส — ยืนยันได้ 2 ไตรมาส beat ทั้งคู่ (Q2 +6.9%, Q3 +1.4% จากจุดกึ่งกลาง) · guidance Q4 2026 = €14.2-15.2B · รายได้ใน block นี้เป็น EUR (FY2026 €44.5B = จุดกึ่งกลาง guidance บริษัท จึงมั่นใจต่ำ · FY2027 €54.3B เป็น consensus ณ ส.ค.) ส่วน EPS ปี 2027 ~$58/ADR เป็น USD จาก 7 นักวิเคราะห์ (ต.ค. 2026) ฐานเดียวกับตาราง KB ที่แปลงเป็น USD แล้ว จึงใช้คิด forward P/E ได้"
      }
    },
    "QQQM": {
      "ticker": "QQQM",
      "name": "Invesco Nasdaq-100 ETF",
      "layer": "enterprise",
      "thesis": {
        "statement": "QQQM คือยานพาหนะต้นทุนต่ำ (expense 0.15%) สำหรับถือ 'ทั้งกระดาน mega-cap เทคโนโลยี/AI' ผ่านดัชนี Nasdaq-100 แบบ full replication — ผู้ถือได้ NVDA, MSFT, GOOG, AMZN, META, AVGO (ซึ่ง 6 ตัวนี้มี thesis เต็มรายตัวใน KB นี้แล้ว) พร้อมกันโดยไม่ต้องเลือกผู้ชนะรายตัว เหมาะเป็น core ของ bucket หุ้นต่างประเทศ เดิมพันหลักคือกำไรของ mega-cap tech ยังโตต่อจากรอบ AI — หมายเหตุสำคัญ: QQQM เป็น ETF ไม่ใช่บริษัท ทุกหัวข้อในหน้านี้ตีความเป็น 'ระดับดัชนี/บริษัทที่ถืออยู่ข้างใน' และไม่มีงบรายไตรมาสของตัวเอง",
        "pillars": [
          "โครงสร้างต้นทุนดีสุดในตระกูล — expense 0.15% (ต่ำกว่า QQQ ซึ่งลดเหลือ 0.18% ตั้งแต่ ธ.ค. 2025) + full replication NDX · AUM ~$102B (7 พ.ย.) สภาพคล่องเหลือเฟือสำหรับผู้ถือระยะยาว",
          "การกระจุกใน AI winners คือฟีเจอร์ (และความเสี่ยง): top-10 ~47-49% ของดัชนี (AAPL ~8.7%, NVDA ~7.6%, MSFT ~6.9% ณ 6 พ.ย.) คือบริษัทแกน AI ที่รายได้ cloud/AI ยังเร่ง",
          "ราคาย่อเร็วกว่าพื้นฐาน — NDX −13.6% จากยอด 6 ต.ค. ขณะที่รายได้แกนดัชนียังโต ทำให้ forward P/E ลงมา ~19-21x (6 พ.ย.) จาก ~22x · เงื่อนไขคือประมาณการกำไรปี 2027 ต้องไม่ถูกตัด",
          "Rebalance เชิงกลไก — ผู้ชนะรายใหม่ไต่น้ำหนักขึ้นเอง (กฎ fast entry ปี 2026 ดึง SPCX เข้าดัชนีได้ใน 15 วันทำการ) ไม่ต้องพึ่งฝีมือผู้จัดการกองทุน ไม่มี style drift",
          "6 ตัวแกนของดัชนี (~30% ของน้ำหนัก) ติดตามลึกรายตัวได้ในหน้า Thesis นี้ — ใช้ QQQM เป็น core แล้วใช้ thesis รายตัวจับจังหวะส่วน tactical"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้ (ระดับดัชนี)",
          "current": "Q3 2026 ของแกนดัชนียังโตสองหลัก — GOOG +25%, META +26%, MSFT +19% (Azure +48%), AMZN +12% (~+16% ถ้าไม่นับ Prime Day ที่ย้ายไป Q2 · AWS +39%), AAPL +12% (สถิติ $114.5B) · AVGO +86% (Q3 FY26) · NVDA (+106% ใน Q2 FY27) รายงาน Q3 FY27 วันที่ 17 พ.ย.",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "ฝั่งรายได้ไม่ใช่ปัญหาของรอบนี้ — ธุรกิจ cloud/AI ของแกนดัชนีเร่งตัวพร้อมกัน (Google Cloud +103%, Azure +48%, AWS +39%) และ AAPL กลับมาโตสองหลัก · สิ่งที่ตลาดกังวลคือต้นทุนและกระแสเงินสดที่ต้องจ่ายเพื่อโตแบบนี้ (ดู FCF)"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น (ระดับดัชนี)",
          "current": "กำไร Q3 2026 ของกลุ่ม Mag7 โต ~22.6% (FactSet · 5 จาก 7 ตัวที่รายงานแล้ว) ต่ำกว่าที่คาดไว้ ~33.6% ณ 30 ก.ย. และต่ำกว่าอีก 493 บริษัทใน S&P 500 (~32.6%) · ส่วนใหญ่มาจากรายการครั้งเดียว: GOOG ขาดทุนตีมูลค่าหุ้น SpaceX ~$8.7B, META ค่าข้อตกลงคดี $9.89B, AMZN ฐานปีก่อนมีกำไรเงินลงทุน Anthropic · AAPL EPS +14% ชนะคาด",
          "trend": "flat",
          "score": 72,
          "impact": "neutral",
          "why": "ช่วง ก.ค.-ต.ค. ประมาณการกำไรถูกปรับขึ้นเร็วกว่าราคา แต่รอบนี้ราคาลง ~12-13% ขณะที่ forward P/E ลดลงใกล้เคียงกัน = ประมาณการกำไรของดัชนีไม่ได้ถูกปรับขึ้นต่อแล้ว (ทรงตัวถึงลดเล็กน้อย ขึ้นกับแหล่ง) · กำไรจากธุรกิจหลักยังโตราว 20% แต่ EPS ที่รายงานผันผวนจากกำไร/ขาดทุนเงินลงทุนก้อนใหญ่และค่าปรับ — Q4 คาดว่า Mag7 โต ~22.6% ต่ำกว่าบริษัทอื่น (~30.8%)"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ (ระดับดัชนี)",
          "current": "FCF ของแกนดัชนีพลิกติดลบหลายตัวใน Q3 2026: GOOG −$9.1B, META −$2.1B (ครั้งแรก), AMZN TTM −$42.4B · MSFT ยังบวก ~$18.6B แต่ −27% YoY · AAPL/NVDA/AVGO ยังผลิตเงินสดก้อนใหญ่ · capex 2026: AMZN ~$220B, GOOG $195-205B, MSFT ~$175B (CY), META $135-145B และปี 2027 'เพิ่มขึ้นอย่างมีนัย'",
          "trend": "down",
          "score": 52,
          "impact": "negative",
          "why": "รอบลงทุน AI กินกระแสเงินสดของผู้ถือหุ้นใหญ่ในดัชนีพร้อมกัน และงบ Q3 ยืนยันว่ายังไม่ถึงจุดสูงสุด — ตลาดเริ่มลงโทษ (GOOGL −12.6% วันที่ 29 ต.ค. · NDX −3.1% วันที่ 30 ต.ค.) · เป็นความเสี่ยงร่วม (systematic) ที่กระจายไม่ได้ภายในดัชนีนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร (ระดับดัชนี)",
          "current": "ยังสูงมากแต่เริ่มเห็นแรงกดจากต้นทุนหน่วยความจำ: MSFT op ~49.8% (สูงขึ้น), AMZN op 13.9% (สูงสุดเป็นประวัติการณ์), GOOG 31.8% (จาก 34%), META ~35% ถ้าตัดค่าปรับ · AAPL gross 47.9% แต่ guide ไตรมาส ธ.ค. 45-46% · NVDA guide gross margin ลดเป็น ~71-72% ใน Q4 FY27",
          "trend": "flat",
          "score": 80,
          "impact": "positive",
          "why": "โครงสร้างกำไรของดัชนียังแข็งจาก software/platform/semiconductor · จุดใหม่ที่ต้องจับตาคือราคา memory ที่พุ่งขึ้นกด margin ของผู้ซื้อชิป (AAPL, NVDA, QCOM) ขณะที่ผู้ผลิต memory อย่าง MU ได้ประโยชน์ — ภายในดัชนีจึงหักล้างกันบางส่วน"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน (ระดับดัชนี)",
          "current": "ยังสูงตามโปรไฟล์ mega-cap tech แต่ฐานสินทรัพย์ AI บวมเร็วกว่ากำไร — capex ไตรมาสเดียวของ AMZN (~$76B), GOOG ($51B), MSFT (~$45B), META ($35B) สูงกว่าหรือใกล้เคียงกระแสเงินสดจากการดำเนินงาน",
          "trend": "down",
          "score": 70,
          "impact": "neutral",
          "why": "ROIC รวมของแกนดัชนีถูกเจือจางทุกไตรมาสที่ capex โตเร็วกว่ากำไร — คำถามเดียวกับ thesis รายตัว: ผลตอบแทนของ AI capex ต้องพิสูจน์ในปี 2027-2028 ซึ่งตลาดเริ่มไม่ยอมรอ"
        },
        {
          "key": "cash",
          "label": "งบดุล (ระดับดัชนี)",
          "current": "แกนดัชนียังถือเงินสดรวมหลายแสนล้าน$ แต่เริ่มระดมทุนเพิ่ม: GOOG ขายหุ้นผ่าน ATM ~$12.4B ใน Q3 · META ตั้งหุ้น Class C ไร้สิทธิออกเสียงเพื่อเปิดทางระดมทุน · AMZN ดอกเบี้ยจ่าย ~$1.7B/ไตรมาส",
          "trend": "down",
          "score": 78,
          "impact": "positive",
          "why": "งบดุลรวมของ NDX ยังแข็งที่สุดในบรรดาดัชนีหลักของโลก แต่ทิศทางเปลี่ยนจาก 'สะสมเงินสด' เป็น 'ใช้เงินสด + ระดมทุน' เพื่อ AI — กันชนยังหนา แต่บางลงทุกไตรมาส"
        },
        {
          "key": "debt",
          "label": "หนี้สิน (ระดับดัชนี)",
          "current": "เพิ่มเร็วตามรอบลงทุน — GOOG หนี้ระยะยาว ~$98B → ~$125B ในไตรมาสเดียว · AMZN ดอกเบี้ยจ่ายสูงขึ้นจนกด EPS Q3 · META bond ~$30B + finance lease ของ MSFT/META",
          "trend": "down",
          "score": 66,
          "impact": "neutral",
          "why": "ยังบริหารได้เทียบกำไร แต่การหาเงินลงทุน AI ด้วยหนี้/หุ้นใหม่/สัญญาเช่าแพร่ไปหลายบริษัทแกนแล้ว — เป็นเทรนด์ที่ทำให้ความเสี่ยงของดัชนีสูงขึ้นช้า ๆ"
        },
        {
          "key": "dilution",
          "label": "ต้นทุนกองทุน (แทน dilution)",
          "current": "expense ratio 0.15% — ต่ำกว่า QQQ ซึ่งลดจาก 0.20% เหลือ 0.18% ตั้งแต่แปลงเป็นกองเปิด (22 ธ.ค. 2025) · ส่วนต่างแคบลงเหลือ 0.03%/ปี · ไม่มี dilution แบบบริษัท",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "ต้นทุนแฝงเดียวของผู้ถือคือค่าธรรมเนียม ซึ่งต่ำมาก — ทุก 1 ล้านบาทเสีย ~1,500 บาท/ปี (ถูกกว่า QQQ ~300 บาท/ปี)"
        },
        {
          "key": "capitalAllocation",
          "label": "โครงสร้างกองทุน (แทน capital allocation)",
          "current": "full replication ตามดัชนี + rebalance เชิงกลไก · AUM ~$101.7B (7 พ.ย.) จาก ~$109.6B (ต้น ต.ค.) — ลดเพราะราคา ไม่ใช่เงินไหลออก · ถือ ~101-102 หลักทรัพย์ · กฎดัชนีใหม่ (มีผล 1 พ.ค. 2026): fast entry 15 วันทำการ + น้ำหนักไม่เกิน 3 เท่าของมูลค่า free float",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "ไม่มี manager risk — วินัยคือกฎของดัชนี · ราคาลง ~12.6% แต่ AUM ลดแค่ ~7% แปลว่าเงินยังไหลเข้าสุทธิ (ประมาณ ~$5-6B) · กฎ fast entry ทำให้กองต้องรับหุ้น IPO ขนาดใหญ่เร็ว (SPCX เข้าดัชนี 7 ก.ค. น้ำหนัก ~2.5%) แต่เพดาน 3 เท่าของ free float จำกัดน้ำหนักหุ้น float ต่ำไว้"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา (ระดับดัชนี)",
          "current": "NDX trailing P/E ~24.9x (worldperatio · ปิด 6 พ.ย.) ต่ำกว่ากรอบ 5 ปี [27.4, 33.4] — ต้น ต.ค. ~30x · วิธีถ่วงน้ำหนักรวม (chartrow) ~33x · forward ~19-21x (stockanalysis QQQM 19.4x · vcpscanner 21.2x · ต้น ต.ค. ~22x) · NDX 26,990 (6 พ.ย.) −13.6% จากยอด 31,224 (6 ต.ค.)",
          "trend": "up",
          "score": 64,
          "impact": "neutral",
          "why": "ถูกลงชัดเจนทั้ง trailing และ forward เพราะราคาย่อ ~13% ในเดือนเดียว ขณะที่ประมาณการกำไรยังไม่ถูกตัด · แต่ trailing ที่ต่ำกว่ากรอบ 5 ปีต้องอ่านมีวงเล็บ: กำไร 4 ไตรมาสล่าสุดรวมกำไรตีมูลค่าเงินลงทุนก้อนใหญ่ (AMZN–Anthropic ~$53B ใน Q2) ซึ่งไม่เกิดซ้ำ · forward ~19-21x ใกล้ค่าเฉลี่ย 10 ปี (~22x) ไม่ใช่ราคาถูกแบบวิกฤต — ความน่าสนใจขึ้นกับว่ากำไรปี 2027 จะรอดรอบ capex หรือไม่"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 80,
        "recurringPct": null,
        "note": "คุณภาพ 'กำไรของดัชนี' ขึ้นกับ mega-cap ราวครึ่งแรก (top-10 ~47-49%) — รอบ Q3 2026 รายได้ของแกนดัชนียังแข็ง (cloud เร่งทุกเจ้า) แต่ EPS ที่รายงานผันผวนสูงจากรายการครั้งเดียว (กำไร/ขาดทุนเงินลงทุนใน Anthropic, SpaceX, OpenAI และค่าปรับคดีของ META) จึงลด consistency ลง · โครงสร้างหมวด: เทคโนโลยี ~60% และเซมิฯ+อุปกรณ์ ~33.5% (marketxls ณ 4 ต.ค.) — สูงกว่าตัวเลข ~19% ที่เคยบันทึกไว้มาก · หลังเซมิฯ ร่วงแรงช่วง ต.ค.-พ.ย. สัดส่วนน่าจะเหลือราว ~30% · สัดส่วนด้านล่างคือน้ำหนักดัชนีโดยประมาณ (stockanalysis ณ 6 พ.ย.) ไม่ใช่ตัวเลขทางการของกอง",
        "segments": [
          {
            "name": "แกน AI ที่มี thesis รายตัวใน KB (NVDA MSFT GOOG AMZN META AVGO)",
            "sharePct": 30,
            "growthNote": "รวม ~30.4% ณ 6 พ.ย. (NVDA ~7.6%, MSFT ~6.9%, GOOGL+GOOG ~5.6%, AMZN ~4.9%, META ~3.1%, AVGO ~2.4%) — น้ำหนักลดจาก NVDA/META/AVGO/GOOG ที่ร่วง ~15-22% ในเดือนเดียว · ทุกตัวมี thesis เต็มในหน้านี้ กดดูรายตัวได้",
            "trend": "down"
          },
          {
            "name": "AAPL (น้ำหนักอันดับ 1 · ยังไม่มี thesis รายตัว)",
            "sharePct": 9,
            "growthNote": "~8.7% ณ 6 พ.ย. แซง NVDA ขึ้นอันดับ 1 · งบ Q4 FY26 รายได้สถิติ $114.5B (+12%) EPS +14% · guide ไตรมาส ธ.ค. รายได้ +7-10% แต่ gross margin ลดเป็น 45-46% จากต้นทุน memory",
            "trend": "up"
          },
          {
            "name": "เซมิฯ/AI และ tech ใหญ่อื่น (MU, AMD, TSLA, SPCX, CSCO, PLTR ฯลฯ)",
            "sharePct": 36,
            "growthNote": "MU ~3.5%, AMD ~3.2%, TSLA ~3.1%, SPCX ~2.5% (เข้าแบบ fast entry 7 ก.ค.), CSCO ~1.8%, PLTR ~1.7% — กลุ่มที่ผันผวนที่สุดของรอบนี้: MU และ AMD ลง ~31-36% จากยอดต้น ต.ค. ถึง 6 พ.ย. · AMD/SPCX/PLTR/INTC มี thesis ใน KB",
            "trend": "down"
          },
          {
            "name": "Consumer / Healthcare / อื่น ๆ (WMT, COST, NFLX, AMGN, LIN ฯลฯ)",
            "sharePct": 25,
            "growthNote": "WMT ~3.0%, COST ~2.3%, NFLX ~1.3%, AMGN ~1.2% — ส่วนถ่วงที่ไม่ใช่ tech แท้ ทำหน้าที่จริงในรอบนี้: WMT +~20% ตั้งแต่ 2 ต.ค. ขณะที่เซมิฯ ร่วง",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 74,
        "items": [
          {
            "item": "การกระจุกใน AI winners (top-10 ~47-49%)",
            "status": "executing",
            "evidence": "ณ 6 พ.ย.: AAPL ~8.7% แซง NVDA ~7.6% ขึ้นอันดับ 1 · MSFT ~6.9% · MU/AMD อยู่ใน top-10 จากรอบ memory/AI · top-10 = 46.8% (นับ GOOGL/GOOG แยก) หรือ ~49.4% ถ้ารวม Alphabet — ต่ำกว่า ~53.4% ที่บันทึกไว้ต้น ต.ค. ซึ่งส่วนหนึ่งอาจเป็นเพราะคนละวิธีนับ · ผู้ถือได้ exposure รอบ AI เต็มที่ และรับความผันผวนของรอบนี้เต็มที่เช่นกัน"
          },
          {
            "item": "Earnings delivery ของแกนดัชนี (Q3 2026)",
            "status": "on-track",
            "evidence": "ธุรกิจหลักส่งมอบ: Azure +48%, AWS +39% (backlog $578B), Google Cloud +103%, META รายได้ +26% เหนือ guide, AAPL รายได้สถิติ +12% · แต่ EPS กลุ่ม Mag7 รวมต่ำกว่าคาด 14.7% (ชนะคาดแค่ 2 ใน 5 ตัวตาม FactSet) ส่วนใหญ่จากรายการครั้งเดียว · NVDA (~7.6% ของดัชนี) รายงาน Q3 FY27 วันที่ 17 พ.ย. คือบททดสอบถัดไป"
          },
          {
            "item": "การแปลง AI capex เป็นกระแสเงินสด",
            "status": "at-risk",
            "evidence": "FCF Q3 ติดลบที่ GOOG (−$9.1B) และ META (−$2.1B ครั้งแรก) · AMZN TTM −$42.4B · GOOG/AMZN บอกว่า capex ปี 2027 จะ 'เพิ่มขึ้นอย่างมีนัย' · ตลาดตอบด้วยแรงขาย: GOOGL −12.6% (29 ต.ค.), NDX −3.1% (30 ต.ค.) — ผลตอบแทนของเงินลงทุนรอบนี้ยังต้องพิสูจน์"
          },
          {
            "item": "Rebalance เชิงกลไก",
            "status": "executing",
            "evidence": "ดัชนีปรับน้ำหนักตาม market cap เอง · กฎใหม่มีผล 1 พ.ค. 2026: หุ้น IPO ขนาดใหญ่เข้าได้ภายใน 15 วันทำการ (SPCX เข้า 7 ก.ค.) และน้ำหนักไม่เกิน 3 เท่าของ free float · การจัดดัชนีประจำปีรอบ ธ.ค. 2026 ยังไม่ประกาศวัน (ปี 2025 ประกาศ 12 ธ.ค. มีผล 22 ธ.ค.)"
          },
          {
            "item": "ไม่มี manager risk / style drift",
            "status": "executing",
            "evidence": "full replication — ผลตอบแทนเบี่ยงจากดัชนีเพียงค่า fee ไม่มีความเสี่ยงฝีมือผู้จัดการ"
          },
          {
            "item": "ใช้คู่กับ Thesis KB รายตัว",
            "status": "on-track",
            "evidence": "6 ตัวแกน (~30% ของดัชนี ณ 6 พ.ย.) + AMD, SPCX, PLTR, INTC และอีกหลายตัวมี thesis ในระบบ · ช่องว่างคือ AAPL (อันดับ 1 ~8.7%) ยังไม่มี thesis และ thesis ของ NVDA ยังเป็นข้อมูล ส.ค. — ควรรีเฟรชหลังงบ 17 พ.ย."
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "ในฐานะ ETF: ค่าธรรมเนียม 0.15% (QQQ 0.18% หลังแปลงเป็นกองเปิด ธ.ค. 2025) + AUM ~$101.7B (7 พ.ย.) + โครงสร้าง Invesco ที่ผูกกับดัชนีหลัก — ในฐานะดัชนี: NDX คือ 'ดัชนี AI ของโลก' ที่บริษัทแกนมี moat ลึกที่สุดในตลาด (ดู thesis รายตัว) · คู่แข่งของ QQQM คือ QQQ (แพงกว่า 0.03%/ปี) และ index funds อื่น — หลัง QQQ แปลงโครงสร้าง เงินยังไหลจาก QQQ มา QQQM (etf.com: QQQ ไหลออก ~$3.9B ขณะที่ QQQM ไหลเข้า ~$2.7B ช่วงหลังแปลง) · สำหรับผู้ถือยาว QQQM ยังชนะเชิงต้นทุน",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "NDX คือดัชนีเทคโนโลยีหลักของโลก · QQQM เป็น share class ประหยัดของตระกูล QQQ · AUM ~$101.7B (7 พ.ย.) และเงินยังไหลเข้าสุทธิแม้ราคาดัชนีลง ~13% จากยอด"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี (ผ่านดัชนี)",
            "status": "strengthening",
            "note": "บริษัทที่นำ AI ทุกชั้นอยู่ในดัชนี — Q3 2026 cloud ของ MSFT/AMZN/GOOG เร่งพร้อมกัน (Azure +48%, AWS +39%, Google Cloud +103%) และมี SPCX เพิ่มเข้ามาในชั้น compute/ดาวเทียม"
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
            "note": "อยู่ในตระกูล QQQ ecosystem (options/liquidity ใหญ่สุดของ ETF เทค) — QQQ แปลงเป็นกองเปิดและลด fee เหลือ 0.18% ตั้งแต่ 22 ธ.ค. 2025"
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
        "verdict": "โครงสร้างกองทุนสะอาดและถูก — full replication, fee 0.15%, AUM ~$101.7B ใหญ่พอไม่มีปัญหาสภาพคล่อง/tracking · สิ่งใหม่คือกฎดัชนีปี 2026 (fast entry + เพดาน 3 เท่าของ free float) ที่ทำให้กองต้องรับหุ้น IPO ใหญ่เร็วขึ้น · ความเสี่ยงจริงยังอยู่ที่ 'ดัชนีที่มันถือ' (กระจุก + AI capex + valuation) ไม่ใช่ตัวกอง",
        "items": [
          {
            "label": "ค่าธรรมเนียม",
            "current": "0.15%/ปี (QQQ ลดจาก 0.20% เหลือ 0.18% ตั้งแต่ 22 ธ.ค. 2025)",
            "assessment": "good",
            "why": "ยังต่ำกว่า QQQ แต่ส่วนต่างแคบลงเหลือ 0.03%/ปี (~300 บาท ต่อ 1 ล้านบาท) · ทุก 1 ล้านบาทเสีย ~1,500 บาท/ปี"
          },
          {
            "label": "วิธี track ดัชนี",
            "current": "Full replication (ถือครบ ~101-102 หลักทรัพย์ตามน้ำหนัก)",
            "assessment": "good",
            "why": "tracking error ต่ำ ไม่มีความเสี่ยง sampling/derivative"
          },
          {
            "label": "ขนาดกองทุน",
            "current": "AUM ~$101.7B (7 พ.ย.) · ต้น ต.ค. ~$109.6B",
            "assessment": "good",
            "why": "ลดตามราคาดัชนี (~−12.6%) แต่น้อยกว่า แปลว่าเงินยังไหลเข้าสุทธิ ~$5-6B · ใหญ่พอสำหรับ spread แคบ ไม่มีความเสี่ยงกองเล็กถูกปิด"
          },
          {
            "label": "กฎดัชนีใหม่ (มีผล 1 พ.ค. 2026)",
            "current": "fast entry ภายใน 15 วันทำการสำหรับ IPO ที่ใหญ่ติด top-40 · น้ำหนักคิดจากมูลค่าตลาดเต็มหรือ 3 เท่าของ free float แล้วแต่ค่าไหนต่ำกว่า · SPCX ~2.5%",
            "assessment": "neutral",
            "why": "ผู้ถือได้บริษัทใหญ่ใหม่เร็วขึ้นโดยอัตโนมัติ แต่กองต้องซื้อช่วงที่ราคา IPO ยังผันผวนและ valuation สูง (SPCX ~42 เท่าของรายได้ปี 2026 ที่คาด) — เพดาน free float ช่วยจำกัดน้ำหนักไว้"
          },
          {
            "label": "โครงสร้างภาษี/ปันผล",
            "current": "จ่ายปันผลรายไตรมาส (yield ~0.5% ตามธรรมชาติ NDX)",
            "assessment": "neutral",
            "why": "ผู้ถือไทยโดนหัก withholding — ประเด็นภาษีเป็นเรื่องผู้ถือ ไม่ใช่ข้อบกพร่องของกอง"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "ณ ปิด 6 พ.ย. 2026: NDX 26,990 (−13.6% จากยอด 31,224 วันที่ 6 ต.ค. · YTD เหลือ ~+6.9%) · QQQM $270.22 · trailing P/E ~24.9x (worldperatio — ต้น ต.ค. ~30x) ต่ำกว่ากรอบ 5 ปี [27.4, 33.4] · forward ~19-21x (ต้น ต.ค. ~22x) ใกล้หรือต่ำกว่าค่าเฉลี่ย 10 ปีราว ~22x — จึงขยับจาก 'พรีเมียม' เป็น 'สมเหตุสมผล' · ข้อควรอ่านประกอบ: (1) trailing ต่ำส่วนหนึ่งเพราะกำไร 4 ไตรมาสรวมกำไรเงินลงทุนครั้งเดียว — วิธีถ่วงน้ำหนักรวมยังได้ ~33x (2) ราคาลงเพราะตลาดสงสัยผลตอบแทนของ AI capex และการเมืองเรื่อง data center หลังเลือกตั้งกลางเทอม ไม่ใช่เพราะรายได้หด (3) NVDA ~7.6% ของดัชนีรายงาน 17 พ.ย. — ถ้ากำไรปี 2027 ถูกตัด forward P/E ที่ดูถูกจะกลับมาแพงได้เร็ว · สำหรับ core position ที่ทยอยสะสมตามแผน ราคารอบนี้ต่ำกว่าต้น ต.ค. ~13% แต่ความผันผวนยังไม่จบ"
      },
      "whatChanged": [
        {
          "metric": "กำไร Q3 2026 ของแกนดัชนี (Mag7)",
          "prev": "คาดโต ~33.6% (FactSet ณ 30 ก.ย.) · งบ Q2 beat ทั่วหน้า",
          "now": "โตจริง ~22.6% (5 จาก 7 ตัว · FactSet) ต่ำกว่าคาดรวม 14.7% ส่วนใหญ่จากรายการครั้งเดียว (GOOG ขาดทุนหุ้น SpaceX ~$8.7B · ค่าปรับ META $9.89B) · รายได้ cloud เร่ง (Azure +48%, AWS +39%, Google Cloud +103%) · AAPL ชนะคาด · NVDA รายงาน 17 พ.ย.",
          "direction": "neutral"
        },
        {
          "metric": "AI capex → FCF ของแกนดัชนี",
          "prev": "FCF ถูกกดแต่ยังเป็นบวก · capex 2026 MSFT ~$190B, AMZN ~$220B, META $130-145B",
          "now": "FCF Q3 ติดลบ: GOOG −$9.1B, META −$2.1B (ครั้งแรก) · AMZN TTM −$42.4B · capex ปี 2027 'เพิ่มขึ้นอย่างมีนัย' (GOOG/AMZN) · ตลาดลงโทษ GOOGL −12.6% (29 ต.ค.)",
          "direction": "negative"
        },
        {
          "metric": "ราคาดัชนี / แรงขายเซมิฯ",
          "prev": "NDX ~30,800 (2 ต.ค.) · YTD ~+22% ใกล้จุดสูงสุด",
          "now": "NDX 26,990 (ปิด 6 พ.ย.) −13.6% จากยอด 6 ต.ค. · YTD ~+6.9% · 5 พ.ย. วันเดียว −6.4% เมื่อเซมิฯ ถูกขายหนักหลังเลือกตั้งกลางเทอม (กังวลกฎระเบียบ data center) และ QCOM เตือนต้นทุน memory",
          "direction": "negative"
        },
        {
          "metric": "NDX P/E",
          "prev": "trailing ~30x · forward ~22x (ต้น ต.ค.)",
          "now": "trailing ~24.9x (worldperatio 6 พ.ย.) ต่ำกว่ากรอบ 5 ปี [27.4, 33.4] · forward ~19-21x — ถูกลงเพราะราคา ไม่ใช่เพราะกำไรเร่ง",
          "direction": "positive"
        },
        {
          "metric": "น้ำหนักดัชนี / การกระจุก top-10",
          "prev": "~53.4% · NVDA ~8.5% นำ AAPL ~7.4%",
          "now": "~46.8% (stockanalysis 6 พ.ย. · ~49.4% ถ้ารวม GOOGL+GOOG) · AAPL ~8.7% แซง NVDA ~7.6% ขึ้นอันดับ 1 · ตัวเลขฐานเดิมอาจคนละวิธีนับ",
          "direction": "neutral"
        },
        {
          "metric": "AUM / ค่าธรรมเนียม",
          "prev": "~$109.6B (ต้น ต.ค.) · fee 0.15% เทียบ QQQ 0.20%",
          "now": "~$101.7B (7 พ.ย.) ลดตามราคาแต่เงินยังไหลเข้าสุทธิ ~$5-6B · fee 0.15% เท่าเดิม · QQQ อยู่ที่ 0.18% ตั้งแต่ ธ.ค. 2025 (ฐานเดิมบันทึกตัวเลขเก่า)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "การกระจุกตัวสูงต่อเนื่อง: top-10 ~47-49% และ AAPL+NVDA+MSFT ~23% (6 พ.ย.) — พฤติกรรมจริงใกล้ 'ตะกร้า mega-cap' ถ้ารอบ AI สะดุด ดัชนีย่อแรงพร้อมกันทั้งกระดาน (กระจายภายในดัชนีไม่ช่วย) · ตัวอย่างล่าสุด: −13.6% ในเดือนเดียวจากยอด 6 ต.ค.",
        "forward P/E ~19-21x ดูถูกลงเพราะราคาย่อ ไม่ใช่เพราะกำไรเร่ง — Q3 กำไร Mag7 ต่ำกว่าคาด 14.7% และ Q4 คาดโตช้ากว่าบริษัทอื่นใน S&P 500 · ถ้างบ NVDA (17 พ.ย.) หรือแกนอื่นทำให้กำไรปี 2027 ถูกตัด จะโดนทั้ง E และ multiple พร้อมกัน (double hit)",
        "AI capex cycle กิน FCF ของผู้ถือหุ้นใหญ่พร้อมกัน — Q3 FCF ติดลบที่ GOOG/META, AMZN TTM −$42.4B และ capex ปี 2027 จะเพิ่มอีก · การหาเงินด้วยหนี้/หุ้นใหม่ (GOOG ATM, META Class C) เพิ่มขึ้น เป็น systematic risk ของไม้นี้",
        "เซมิฯ+อุปกรณ์ ~30-33% ของดัชนี และเทคโนโลยี ~60% — ไม่มี financials/defensive ถ่วงมากพอ · 5 พ.ย. NDX −6.4% ในวันเดียวเมื่อเซมิฯ ถูกขายหลังผลเลือกตั้งกลางเทอมจุดความกังวลเรื่องกฎระเบียบ data center (นักวิเคราะห์บางรายมองว่า ~30% ของกำลัง data center ที่วางแผนไว้ปี 2028 เสี่ยงล่าช้า) + ต้นทุน memory ที่กด margin ผู้ซื้อชิป",
        "สำหรับผู้ถือไทย: ความเสี่ยง FX (USD/THB) และ withholding tax ของปันผล — ต้องคิดรวมในผลตอบแทนคาดหวัง"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2026-11-17"
    },
    "GULF.BK": {
      "ticker": "GULF.BK",
      "name": "Gulf Development (GULF)",
      "layer": "power",
      "thesis": {
        "statement": "GULF คือผู้ผลิตไฟฟ้าเอกชนรายใหญ่ที่สุดของไทย ที่หลังควบรวม Intouch (เม.ย. 2025) กลายเป็น holding โครงสร้างพื้นฐาน+ดิจิทัล: โรงไฟฟ้า (ก๊าซ/พลังงานหมุนเวียน) + ถือหุ้น AIS ~40% (เครื่องผลิตเงินสด) + ธุรกิจ data center/cloud (Gulf Edge) — มุม AI ของ thesis คือ 'ไฟฟ้าคือคอขวดของ AI ไทย': GULF คุมตั้งแต่ generation → data center → telecom ในกลุ่มเดียว พร้อมแผน Data Center Park เฟสแรก ~1,000MW และเป้า DC รวม 1-2GW ร่วมกับ Microsoft และ Google Cloud · รายได้แกนมาจากสัญญาซื้อขายไฟระยะยาว (PPA) จึง recurring สูงและคาดการณ์ได้ — เดิมพันคือการแปลงกระแสเงินสดจากไฟฟ้า+AIS ไปสร้างขา AI infrastructure ให้สำเร็จ",
        "pillars": [
          "ผู้นำ IPP ไทย — กำลังผลิตตามสัดส่วนถือหุ้นระดับหลาย GW ผูก PPA ระยะยาวกับ กฟผ. = กระแสเงินสดคาดการณ์ได้หลายทศวรรษ",
          "AIS ~40% หลังควบรวม Intouch — ส่วนแบ่งกำไร ~฿4.4-4.5B/ไตรมาส เป็น cash cow เลี้ยง capex รอบใหม่",
          "AI data center: Gulf Edge × Google Cloud (sovereign cloud) + GSA 01 (25.6MW) / GSA 02 (38.1MW, Q2 2027 — เลื่อนจาก Q1, รองรับ cloud region ของ Microsoft) / GEDC 01 (100MW, Q4 2027) + Data Center Park เฟสแรก ~1,000MW · เป้ารวม 1-2GW · ตั้งบริษัท Gulf Edge Data Center (ต.ค. 2026)",
          "ตำแหน่งเชิงยุทธศาสตร์: ไฟฟ้าคือคอขวดของ data center ไทย — ผู้ผลิตไฟที่ทำ DC เองได้เปรียบเชิงต้นทุน/ความเร็วกว่าผู้เล่น DC ล้วน",
          "Q3 2026 core profit ฿9,045M (+24% YoY · −27% QoQ หลัง Q2 มีกำไรขาย Pak Lay + ปันผล KBANK) สูงกว่าที่โบรกคาดเล็กน้อย — เครื่องยนต์พลังงานยังโต: Jackson (US) +67%, HKP +61%, ลม Gulf Gunkul +38%, โซลาร์ 1,379MW (จาก 532MW) และส่วนแบ่ง AIS +16%"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "~+75% YoY (Q3 2026 — รายได้รวม ฿52.8B ตามบริษัท · ฐาน stockanalysis ฿51.1B +76%) แต่ EBITDA โตแค่ +12% (฿15.3B) — ส่วนเกินมาจากรายได้ LNG ฿8.9B (+179%) ที่ margin บาง",
          "trend": "up",
          "score": 76,
          "impact": "positive",
          "why": "พาดหัว +75% เกินจริงเชิงคุณภาพ: รายได้ LNG (GLNG/HKH นำเข้า 56 ลำใน 9 เดือน ~3.7 ล้านตัน) และค่าเชื้อเพลิงจาก GPD ที่ load factor ขึ้น 45% → 72% เป็นรายได้ส่งผ่านต้นทุน · ตัวชี้วัดการโตจริงคือ EBITDA +12% YoY ซึ่งอยู่ในกรอบเป้าบริษัทปี 2026 (รายได้/EBITDA +12-15%) · โซลาร์ 14 โครงการ 1,379MW (จาก 532MW) รายได้ +59% — ยังเป็นการโตแบบมีสัญญารองรับ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไร",
          "current": "core profit ฿9,045M (Q3 2026, +24% YoY · −27% QoQ) · กำไรสุทธิ ฿9,289M (+28%) รวมกำไร FX/อนุพันธ์ ฿244M · EPS ฿0.62 (Q3'25 ฿0.49) · 9 เดือน EPS ฿2.07",
          "trend": "up",
          "score": 76,
          "impact": "positive",
          "why": "โตต่อแต่ช้าลงจาก +43% (Q1) / +47% (Q2 ไม่รวม Pak Lay) เป็น +24% — QoQ ลดตามคาดเพราะ Q2 มีปันผล KBANK ฿2.8B + กำไรขาย Pak Lay ฿1.9B และ Q3 มีหยุดซ่อมบำรุงโรงไฟฟ้า + กำไร LNG optimization ลดลง · ตัวขับ YoY: AIS ฿4,443M (+16%), Jackson ฿932M (+67%), HKP ฿350M (+61%), ลม Gulf Gunkul ฿319M (+38%) · core สูงกว่าที่ KGI คาด (~฿8.8B) และ CGSI ระบุว่าดีกว่าคาดจาก SG&A ต่ำและส่วนแบ่งกำไรบริษัทร่วม"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026 FCF พลิกเป็นบวก ~+฿3.9B (OCF ฿6.7B − capex ฿2.9B) หลังติดลบ 3 ไตรมาส · 9 เดือนยังติดลบ ~-฿4.7B · net IBD/E 1.06x → 1.02x",
          "trend": "up",
          "score": 46,
          "impact": "neutral",
          "why": "ไตรมาสนี้ capex เบาลงขณะเงินสดจากการดำเนินงานดีขึ้น แต่ยังไม่ใช่จุดเปลี่ยนถาวร — ปลายปีมีโซลาร์/BESS 373MW COD และปี 2027 อีก 600MW+ (โซลาร์ 133MW · ลม 376MW · WTE 118MW) + DC (GSA 02 / GEDC 01 / DC Park) รวมถึงดีลซื้อกิจการต่อเนื่อง FCF จึงยังแกว่งตามรอบลงทุน"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "net margin Q3 2026 ~18.2% บนรายได้ฐาน stockanalysis (Q2 ~28% · ไม่รวม Pak Lay ~23.6% · Q3'25 ~25.1%) · core margin ~17.1% บนรายได้รวมตามบริษัท · EBITDA margin ~29% (Q3'25 ~45%)",
          "trend": "down",
          "score": 64,
          "impact": "neutral",
          "why": "margin ต่อบาทของรายได้หดเพราะ mix ไม่ใช่เพราะกำไรต่อหน่วยของ PPA แย่ลง — รายได้ LNG/ค่าเชื้อเพลิงที่ส่งผ่านต้นทุนโตเร็วกว่ากำไรมาก (รายได้ +75% vs core +24%) · แต่ตัวเลขตามนิยามของ KB ลดจริง ~6pp เทียบเฉลี่ย 4 ไตรมาสก่อน ถ้า LNG trading โตต่อ net margin จะอยู่ระดับต่ำกว่าเดิมถาวร ต้องดู EBITDA/core profit ควบคู่"
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
          "current": "บริหารผ่านโครงสร้าง project finance + เงินปันผลรับจาก AIS (~฿10.45B งวด ก.ย. 2026) / KBANK · OCF Q3 ฿6.7B · ออกหุ้นกู้ ฿20B (ต.ค. 2026) · สินทรัพย์รวม ฿841.6B",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "สภาพคล่องพอเพียงแต่ไม่หนา — พึ่งการ refinance/หุ้นกู้ และกระแสเงินสดเข้าจาก AIS เป็นตัวหล่อเลี้ยง capex รอบใหม่และดีลซื้อกิจการ"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้สูงตามโมเดล project finance — net IBD/E 1.02x ณ 30 ก.ย. 2026 (จาก 1.06x · covenant 3.5x) · หนี้สินรวม ฿478.8B / ทุน ฿362.8B · ออกหุ้นกู้ใหม่ ฿20B ต.ค. 2026",
          "trend": "flat",
          "score": 40,
          "impact": "negative",
          "why": "leverage ลดลงเล็กน้อยใน Q3 จากทุนที่โตตามกำไรและ FCF ที่เป็นบวก แต่ยังเป็นจุดอ่อนเชิงโครงสร้างของ IPP — อ่อนไหวต่อดอกเบี้ยและการ refinance · หุ้นกู้ ฿20B เดือน ต.ค. + capex โซลาร์/ลม/DC ปี 2027 จะดันหนี้กลับขึ้น แม้หนี้ส่วนใหญ่ผูกกับโครงการที่มีรายได้สัญญารองรับ"
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
          "current": "ซื้อสินทรัพย์พลังงานหมุนเวียนต่อเนื่อง (50% ใน 12 โครงการโซลาร์/ลมจาก GUNKUL ก.ย. · 50% Ubon Wealth 1 ต.ค. · 100% Waste Absolute ~฿400M ต.ค.) + PPA ลม 4 โครงการ + ตั้ง Gulf Edge Data Center + เคเบิลใต้น้ำ เวียดนาม-ไทย-สิงคโปร์ · ปี 2026 recycle Pak Lay 51% (กำไร ~฿1.9B) · ปันผล FY2025 ฿3.25/หุ้น",
          "trend": "up",
          "score": 73,
          "impact": "positive",
          "why": "ทีมบริหารมีประวัติ deal ใหญ่ที่สร้างมูลค่า (INTUCH/AIS) และยังเดินเกมสะสมสินทรัพย์ที่มีสัญญารองรับ (ลม/โซลาร์/WTE) ควบกับขา digital infra (DC + เคเบิลใต้น้ำ) — ตรรกะเชิงกลยุทธ์ชัด แต่จำนวนดีลที่ถี่ขึ้นทำให้ต้องคุม leverage และผลตอบแทนต่อดีลให้ได้ · เปลี่ยน CFO ต.ค. 2026"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ฿61.25 (6 พ.ย. 2026) · mcap ~฿915B · P/E TTM ~20x (EPS 4 ไตรมาส ~฿3.01 · ไม่รวม Pak Lay ~฿2.88 → ~21x) · ~24-25x บน EPS ปี 2026 ที่โบรกคาด ~฿2.5 และ ~23x บนปี 2027 ~฿2.68 · เป้าโบรกเฉลี่ย ~฿79 (17 ราย)",
          "trend": "flat",
          "score": 50,
          "impact": "neutral",
          "why": "ราคาแทบไม่ขยับ (~฿59 สิ้น ก.ย. → ~฿61) หลังงบที่ดีกว่าคาดเล็กน้อย — multiple TTM ลดลงตามกำไรที่สะสม แต่ forward P/E ~24x ยังเป็นพรีเมียมเหนือ utility ไทยทั่วไปจาก AIS + optionality ของ AI data center · โบรกบางรายลดเป้า (KGI ฿78 → ฿75) ขณะ FSSIA ขึ้นเป็น ฿89.50 — ต้อง execute แผน DC (DC Park / hyperscale) เพื่อ justify ราคา"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": 80,
        "note": "คุณภาพรายได้สูงเป็นพิเศษสำหรับหุ้นไทย — แกนหลักคือสัญญา PPA ระยะยาวกับภาครัฐ (คาดการณ์ได้หลายทศวรรษ) + ส่วนแบ่งกำไร AIS ที่สม่ำเสมอ · Q3 2026 รายได้เร่ง +75% แต่ส่วนใหญ่เป็น LNG trading/ค่าเชื้อเพลิงที่ margin บาง (EBITDA +12%) จึงควรอ่านการเติบโตจาก EBITDA/core profit มากกว่ารายได้ · Q2 มีรายการฤดูกาล/ครั้งเดียว ~฿4.8B (ปันผล KBANK + กำไรขาย Pak Lay) ที่ไม่เกิดใน Q3 · สัดส่วนด้านล่างเป็นโครงสร้างกำไร/รายได้โดยประมาณหลังควบรวม",
        "segments": [
          {
            "name": "โรงไฟฟ้าก๊าซ (IPP/SPP รวม GJP)",
            "sharePct": 50,
            "growthNote": "แกนหลัก — GPD load factor 45% → 72% · Jackson (US) ฿932M (+67% YoY, ฤดูร้อน) · HKP ฿350M (+61%) · GJP ฿562M (+2%) · PTT NGD ฿184M (−7%) · Q3 มีหยุดซ่อมบำรุงบางโรง",
            "trend": "up"
          },
          {
            "name": "ส่วนแบ่งกำไร AIS (~40%)",
            "sharePct": 22,
            "growthNote": "฿4,443M ใน Q3 2026 (+16% YoY · −2% QoQ จาก ฿4,549M) — cash cow ที่โตจาก ARPU/คุมต้นทุน · ปันผล ADVANC งวด ก.ย. 2026 ~฿10.45B",
            "trend": "up"
          },
          {
            "name": "พลังงานหมุนเวียน (ในและต่างประเทศ)",
            "sharePct": 13,
            "growthNote": "โซลาร์/BESS 14 โครงการ 1,379MW (จาก 5 โครงการ 532MW) รายได้โซลาร์ ~฿1.7B (+59%) · ลม Gulf Gunkul ฿319M (+38%) · ลมเวียดนาม MKW ค่าไฟ 3.9 → 7.2¢ · ปลายปี COD เพิ่ม 373MW + rooftop 30MW · ปี 2027 อีก 600MW+",
            "trend": "up"
          },
          {
            "name": "LNG shipper & trading",
            "sharePct": 8,
            "growthNote": "รายได้ LNG ~฿8.9B ใน Q3 (+179% YoY) · 9 เดือนนำเข้า 56 ลำ ~3.7 ล้านตัน — สเกลเร็วแต่ margin บาง และกำไร LNG optimization ลดลง QoQ",
            "trend": "up"
          },
          {
            "name": "Infrastructure & Digital (Gulf Edge DC, Binance TH, ท่าเรือ)",
            "sharePct": 7,
            "growthNote": "ยังเล็กแต่คือ optionality หลักของ thesis — GSA 01 25.6MW · GSA 02 38.1MW (Q2 2027 เลื่อนจาก Q1) · GEDC 01 100MW (Q4 2027) · DC Park ~1,000MW · เคเบิลใต้น้ำ VTS · มอเตอร์เวย์ M6 (Q2 2027)",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 71,
        "items": [
          {
            "item": "Gulf Edge × Google Cloud (sovereign cloud ไทย)",
            "status": "executing",
            "evidence": "พันธมิตรทางการ — ให้บริการ AI/cloud อธิปไตยข้อมูลสำหรับองค์กรไทย เริ่มจาก AIS เป็นลูกค้าแรก"
          },
          {
            "item": "Data Center Park เฟสแรก ~1,000MW + เป้า DC รวม 1-2GW",
            "status": "on-track",
            "evidence": "ก.ย. 2026 บริษัทเผยซื้อที่ดินหลายร้อยไร่นอกกรุงเทพฯ เฟสแรกกำลังก่อสร้าง · ต.ค. 2026 ตั้งบริษัท Gulf Edge Data Center · KGI ประเมินความต้องการแฝง 2-3GW และ DC ทุก 100MW เพิ่มกำไร ~฿1.5B/ปี · ยังไม่เปิดเผยสัญญา hyperscale/ลูกค้า DC Park และรอความชัดเจน Direct PPA ภายใต้ PDP 2026"
          },
          {
            "item": "GSA DC (JV กับ Singtel + AIS) + GEDC",
            "status": "executing",
            "evidence": "GSA 01 สมุทรปราการ 25.6MW · GSA 02 ชลบุรี (EEC) 38.1MW เปิด Q2 2027 (เดิม Q1 2027) ให้บริการ cloud region ของ Microsoft · GEDC 01 ระยอง 100MW เปิด Q4 2027 (GEDC holding ถือ 70%) + ตั้ง GEDC 02/03/04 รองรับเฟสถัดไป"
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
            "note": "IPP เอกชนรายใหญ่สุดของไทย + market cap ~฿915B หนึ่งในสูงสุดของ SET หลังควบรวม"
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
        "score": 73,
        "verdict": "ทีมบริหารมีประวัติจัดสรรทุนเชิงรุกที่สร้างมูลค่าจริง (ดีล INTUCH/AIS) — ตอนนี้อยู่โหมด recycle กระแสเงินสดจากไฟฟ้า+โทรคมเข้า AI infrastructure จุดต้องจับตาคือหนี้ที่สูงตามโมเดลและวินัยการลงทุน DC ให้ได้ผลตอบแทนจริง ไม่ใช่แค่ตามกระแส",
        "items": [
          {
            "label": "M&A / recycle สินทรัพย์",
            "current": "ควบรวม Intouch สำเร็จ เม.ย. 2025 (AIS ~40%) · ขาย Pak Lay 51% ให้ J-Power (Q2 2026 กำไร ~฿1.9B) · ซื้อ 50% ใน 12 โครงการโซลาร์/ลมจาก GUNKUL (ก.ย.) · 50% Ubon Wealth 1 (ต.ค.) · 100% Waste Absolute ~฿400M (ต.ค.)",
            "assessment": "good",
            "why": "ดีลเปลี่ยนโครงสร้างที่ให้ cash cow ระยะยาว — จ่ายด้วยหุ้นแลกสินทรัพย์คุณภาพ · ขายสินทรัพย์ที่ครบรอบแล้วนำเงินไปซื้อสินทรัพย์พลังงานหมุนเวียนที่มี PPA รองรับ"
          },
          {
            "label": "CapEx พลังงาน (ก๊าซ/renewables)",
            "current": "โซลาร์/BESS COD แล้ว 14 โครงการ 1,379MW · ปลายปี 2026 เพิ่ม 373MW + rooftop 30MW · ปี 2027 อีก 600MW+ (โซลาร์ 133 · ลม 376 · WTE 118) · ลงนาม PPA ลม 4 โครงการ (ก.ย.)",
            "assessment": "good",
            "why": "ลงทุนแบบมีสัญญารองรับ — ความเสี่ยง demand ต่ำ"
          },
          {
            "label": "CapEx AI data center (~$4.3B/5 ปี)",
            "current": "GSA 01 25.6MW เปิดแล้ว · GSA 02 38.1MW (Q2 2027) · GEDC 01 100MW (Q4 2027) · DC Park ~1,000MW เฟสแรกก่อสร้าง · ตั้ง Gulf Edge Data Center (ต.ค. 2026)",
            "assessment": "neutral",
            "why": "เดิมพันใหญ่ที่มีตรรกะ แต่ผลตอบแทนยังต้องพิสูจน์ — ตลาด DC ไทยแข่งขึ้นเรื่อย ๆ"
          },
          {
            "label": "เงินปันผล",
            "current": "FY2025 จ่าย ฿3.25/หุ้น (ปกติ 1.05 + พิเศษ 2.20) XD 2 มี.ค. 2026 · ไม่มีประกาศปันผลระหว่างกาล H1 2026 ใน SET",
            "assessment": "good",
            "why": "กระแสเงินสด PPA + AIS รองรับปันผลได้มั่นคง"
          },
          {
            "label": "โครงสร้างหนี้",
            "current": "net IBD/E 1.02x (30 ก.ย. 2026, จาก 1.06x) · ออกหุ้นกู้ ฿20B ต.ค. 2026",
            "assessment": "neutral",
            "why": "ปกติของอุตสาหกรรมแต่ลดความยืดหยุ่น — leverage ทรงตัวใน Q3 แต่รอบ capex DC/พลังงานหมุนเวียนปี 2027 และดอกเบี้ยคือแรงกดโดยตรง"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "ราคา ฿61.25 (6 พ.ย. 2026) · mcap ~฿915B · P/E TTM ~20x บน EPS 4 ไตรมาส ~฿3.01 (ไม่รวมกำไรขาย Pak Lay ~฿2.88 → ~21x) · ~24-25x บน EPS ปี 2026 ที่โบรกคาด ~฿2.5 (กำไร ~฿37-38B) และ ~23x บนปี 2027 ~฿2.68 · ราคาอยู่ในกรอบ ~฿59-62 ตั้งแต่ ก.ย. ขณะ YTD ยัง ~+47% — ยังแพงกว่า utility ทั่วไปแต่พรีเมียมแคบลงเมื่อกำไรแกนโต 20-45% · ถ้ามองเป็น 'utility' คือแพง ถ้ามองเป็น 'ทางด่วน AI infra ของไทย' คือจ่ายพรีเมียมรอ execution — ตัวชี้ขาดคือสัญญา DC จริง (DC Park / hyperscale) และ PDP 2026 ไม่ใช่แค่กำไรพลังงานรายไตรมาส"
      },
      "whatChanged": [
        {
          "metric": "Core profit (Q2 2026 → Q3 2026)",
          "prev": "฿12,332M (+74% YoY · รวม Pak Lay ~฿1.9B)",
          "now": "฿9,045M (+24% YoY · −27% QoQ — ดีกว่าคาดเล็กน้อย · EPS ฿0.83 → ฿0.62)",
          "direction": "neutral"
        },
        {
          "metric": "รายได้รวม (ตามบริษัท)",
          "prev": "฿50.3B (+24% YoY)",
          "now": "฿52.8B (+75% YoY — LNG ฿8.9B +179% · EBITDA +12%)",
          "direction": "positive"
        },
        {
          "metric": "Net margin (ฐาน KB)",
          "prev": "~28% (ไม่รวม Pak Lay ~23.6%)",
          "now": "~18.2% (Q3'25 ~25.1%) — mix LNG/ค่าเชื้อเพลิง",
          "direction": "negative"
        },
        {
          "metric": "ส่วนแบ่งกำไร AIS",
          "prev": "฿4,549M (+31% YoY)",
          "now": "฿4,443M (+16% YoY · −2% QoQ)",
          "direction": "neutral"
        },
        {
          "metric": "FCF / Net IBD/E",
          "prev": "-฿3.2B / 1.06x",
          "now": "+฿3.9B / 1.02x",
          "direction": "positive"
        },
        {
          "metric": "กำหนดเปิด GSA 02 (38MW)",
          "prev": "Q1 2027",
          "now": "Q2 2027 (GEDC 01 คง Q4 2027)",
          "direction": "negative"
        }
      ],
      "risks": [
        "หนี้สูงตามโมเดล project finance — net IBD/E 1.02x และเพิ่งออกหุ้นกู้ ฿20B · capex โซลาร์/ลม/WTE 600MW+ ปี 2027 + DC + ดีลซื้อกิจการต่อเนื่อง จะกดงบดุลก่อนรายได้ตามมา",
        "Execution risk ของแผน DC 1-2GW — ตลาด data center ไทยแข่งเดือด (WHA, TRUE/ต่างชาติ, hyperscaler สร้างเอง) สัญญา DC Park/hyperscale ยังไม่เปิดเผย GSA 02 เลื่อนไป Q2 2027 และดีมานด์จริงของ AI ไทยยังต้องพิสูจน์",
        "คุณภาพการเติบโต: รายได้ Q3 +75% แต่ EBITDA +12% — LNG trading/ค่าเชื้อเพลิงที่ margin บางทำให้ net margin ลดจาก ~25% เหลือ ~18% และกำไร LNG optimization แกว่งตามราคาก๊าซ · core profit โตช้าลงจาก +47% เป็น +24%",
        "ความเสี่ยงนโยบาย/กฎเกณฑ์: ค่าไฟ, PDP 2026 ที่ยังไม่สรุป, Direct PPA, กกพ. — รายได้แกนผูกกับภาครัฐไทยสูงมาก · ครม. อนุมัติให้ DE ดำเนินคดีกับ THCOM/GULF เรื่องสัมปทานดาวเทียม เรียก ~฿1,259M (ก.ย. 2026 — บริษัทยืนยันไม่มีภาระ) การเมืองเปลี่ยน = ความเสี่ยงเชิงโครงสร้าง",
        "Valuation premium ~24x forward บนหุ้น SET ที่สภาพคล่อง/flow ต่างชาติผันผวน (Singtel ขายหุ้น 416M ในปีนี้) — ถ้า DC story สะดุด multiple หดแรง",
        "การพึ่งพา AIS เป็นสัดส่วนกำไรใหญ่ — ส่วนแบ่งกำไร AIS ชะลอเหลือ +16% YoY · การแข่งขัน telecom ไทย (TRUE) หรือ regulation ค่าบริการกระทบ GULF ทางตรง"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
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
        "notes": "ตัวเลขประมาณ ~2-3% · margin = net margin (GULF มี equity income ของ AIS/INTUCH อยู่ใต้บรรทัดรายได้ จึงไม่ใช้ operating margin) · FY2025: กำไรรายงาน ฿86.6bn รวม one-time ควบรวม ฿56.1bn — ใช้ core ฿28.8bn / EPS core ~฿2.0 / margin core ~21% แทน · หุ้นเพิ่ม 11.73→14.94bn จาก swap ควบรวม (×1.02974 ราคาต่อเนื่อง ~3%) · FCF ติดลบ 2021-24 ตามรอบสร้างโรงไฟฟ้า พลิกบวก ฿5.3bn ปี 2025 · ราคาปิดปีจริง — ปี 2025 หุ้นร่วง ~30% (SET ซบ + merger re-rating) แล้ว rally ~60% ใน 2026 (ปัจจุบัน ~฿66.75) · Q2'26: กำไรสุทธิส่วนผู้ถือหุ้นใหญ่ ฿12,445.68M / EPS รายงาน ฿0.83 (ryt9/InfoQuest) · รายได้แถวไตรมาส ฿44.48B ตามฐาน stockanalysis (บริษัทรายงานรายได้รวม ฿50,294M) · net margin 12,446/44,478 = ~28% · รวมกำไรขาย Pak Lay 51% ~฿1,928M (ตัดออก net margin ~23.6%, EPS ~฿0.70) · ราคาปิด 30 มิ.ย. 2026 ฿61.50 (panphol) · (2026-11) แก้ opMarginPct รายไตรมาส Q3'24–Q1'26 ให้เป็น net margin ตามงบจริง (stockanalysis) ค่าเดิม Q3'24 16.2 · Q4'24 20.2 · Q1'25 20.1 · Q2'25 14.5 · Q3'25 19.4 · Q4'25 18.3 · Q1'26 20.6 ไม่ใช่ net margin และคิดย้อนไม่ได้ — ตอนนี้ทุกแถวรายไตรมาสเป็นฐานเดียวกัน (Q3'24 คิดจาก EPS × 11.73B หุ้นก่อนควบรวม) · Q2'25 ใส่ epsNote + opMarginExItemsPct 20.1 ให้กำไรควบรวม INTUCH ไม่บิดสัญญาณ · Q3'26 (งบออก 5 พ.ย. 2026): กำไรสุทธิส่วนบริษัทใหญ่ ฿9,288.68M / EPS ฿0.62 (F45 SET) · core ฿9,045M (+24% YoY) · ส่วนต่าง = กำไร FX/อนุพันธ์ ฿244M (ไม่ใส่ epsNote — แถวเก่าที่มี FX แบบนี้ก็ไม่ได้ใส่) · รายได้แถวไตรมาส ฿51.11B ฐาน stockanalysis (บริษัทรายงานรายได้รวม ฿52,809M) · net margin 9,288.68/51,109 = ~18.2% — stockanalysis แสดง net income 1,079 / margin 2.11% ซึ่งขัดกับ EPS 0.62 ของตัวเองและ F45 จึงใช้กำไรจาก F45 · margin ลดจาก mix รายได้ LNG ฿8.9B (+179%) ที่ margin บาง ไม่ใช่รายการครั้งเดียว · FCF ฿3.87B (OCF 6,749 − capex 2,877) · ราคาปิด 30 ก.ย. 2026 ฿59.00 · (2026-11 รอบ Q3) แก้ priceQEnd ตามราคาปิดจริง Yahoo GULF.BK: Q2'25 52 → 38.75 · Q3'25 48 → 43.5 · Q1'26 55 → 59.25 · แถวก่อนควบรวม (Q2'23–Q1'25) ตรวจกับ Yahoo ไม่ได้ (ไม่มีแท่งของ Gulf Energy เดิม) จึงคงค่าประมาณเดิม",
        "sources": [
          "https://www.gulf.co.th/en/newsroom/ (FY2021-2025 + Q1/2026 press releases)",
          "https://stockanalysis.com/quote/bkk/GULF/",
          "https://www.digrin.com/stocks/detail/GULF.BK/price",
          "https://www.ryt9.com/s/iq/12835179 (Q2'26 net profit ฿12,445.68M / EPS ฿0.83 / H1 EPS ฿1.44)",
          "https://thestandard.co/gulf-core-profit-direct-ppa-solar/ (Q2'26 segment detail · KBANK dividend ฿2,842M · Pak Lay gain ฿1,928M · net IBD/E 1.06x · FY2026 target +12-15%)",
          "https://www.kaohoon.com/news/852321 (Q2'26 core profit ฿12,332M +74%)",
          "https://stockanalysis.com/quote/bkk/GULF/financials/?p=quarterly (Q2'26 revenue ฿44,478M · FCF -฿3,193M)",
          "https://aio.panphol.com/stock/GULF/price (ราคาปิด 30 มิ.ย. 2026 ฿61.50 · 30 ต.ค. 2026 ฿61.00)",
          "https://stockanalysis.com/quote/bkk/GULF/financials/?p=quarterly",
          "https://www.set.or.th/en/market/news-and-alert/newsdetails?id=107361500&symbol=GULF (F45 Q3/2026 · 5 พ.ย. 2026 · กำไรสุทธิ ฿9,288,683K · EPS ฿0.62 · core ฿9,044.5M)",
          "https://www.set.or.th/en/market/news-and-alert/newsdetails?id=17938312119130&symbol=GULF (Financial Statement Quarter 3/2026 (Reviewed) · 5 พ.ย. 2026)",
          "https://www.kaohooninternational.com/markets/594033 (Q3'26 revenue ฿52,809M · EBITDA ฿15,265M · segment · net IBD/E 1.02x · GSA02 Q2/2027)",
          "https://www.kaohooninternational.com/markets/594060 (CGSI: FX/derivative gain ฿244M · LNG revenue ฿8.9B +179% · solar revenue ฿1.7B +59%)",
          "https://stockanalysis.com/quote/bkk/GULF/financials/cash-flow-statement/?p=quarterly (Q3'26 OCF ฿6,749M · capex ฿2,877M · FCF ฿3,872M)",
          "https://query1.finance.yahoo.com/v8/finance/chart/GULF.BK (ราคาปิดสิ้นไตรมาส Q2'25–Q3'26)"
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
            "opMarginPct": 19.6,
            "fcfB": -2.27,
            "priceQEnd": 62,
            "endDate": "2024-09-30"
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "revenueB": 27.25,
            "epsAdj": 0.33,
            "opMarginPct": 14.3,
            "fcfB": -4.8,
            "priceQEnd": 55,
            "endDate": "2024-12-31"
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "revenueB": 30.78,
            "epsAdj": 0.46,
            "opMarginPct": 17.5,
            "fcfB": -1.13,
            "priceQEnd": 47,
            "endDate": "2025-03-31"
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "revenueB": 38.52,
            "epsAdj": 4.28,
            "opMarginPct": 165.8,
            "fcfB": 1.72,
            "priceQEnd": 38.75,
            "endDate": "2025-06-30",
            "epsNote": "EPS รายงาน ฿4.28 รวมกำไรจากการรวมธุรกิจกับ INTUCH ครั้งเดียว ~฿56,120M (ควบรวมเสร็จ 1 เม.ย. 2568) — ไม่รวมรายการนี้ กำไรสุทธิ ~฿7,751M / core profit ฿7,101M · EPS ไม่รวม ~฿0.5 · net margin ไม่รวม ~20.1% (ที่รายงาน ~165.8%)",
            "opMarginExItemsPct": 20.1
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "revenueB": 29.04,
            "epsAdj": 0.49,
            "opMarginPct": 25.1,
            "fcfB": 6.13,
            "priceQEnd": 43.5,
            "endDate": "2025-09-30"
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "revenueB": 62.11,
            "epsAdj": 0.95,
            "opMarginPct": 22.9,
            "fcfB": -1.42,
            "priceQEnd": 41,
            "endDate": "2025-12-31"
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 37.64,
            "epsAdj": 0.61,
            "opMarginPct": 24.2,
            "fcfB": -5.37,
            "priceQEnd": 59.25,
            "endDate": "2026-03-31"
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 44.48,
            "epsAdj": 0.83,
            "opMarginPct": 28,
            "fcfB": -3.19,
            "priceQEnd": 61.5,
            "endDate": "2026-06-30",
            "epsNote": "EPS ฿0.83 รวมกำไรขายหุ้น 51% โครงการไฟฟ้าพลังน้ำ Pak Lay ให้ J-Power ~฿1,928M (~฿0.13/หุ้น) — ไม่รวมรายการนี้ EPS ~฿0.70 (core ที่ตัดรายการ ~฿10,405M +47% YoY)",
            "opMarginExItemsPct": 23.6
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "revenueB": 51.11,
            "epsAdj": 0.62,
            "opMarginPct": 18.2,
            "fcfB": 3.87,
            "priceQEnd": 59,
            "endDate": "2026-09-30"
          }
        ],
        "instrument": {
          "shareBasis": "common",
          "currency": "THB",
          "note": "หุ้นสามัญ SET สกุล ฿ ทั้งราคาและ EPS"
        }
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 2.5,
            "revenue": null
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance รายไตรมาส",
            "actual": "~฿52,809M (+75% YoY)",
            "result": "noGuidance",
            "magnitudePct": null
          },
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
            "eps": 2.5,
            "confidence": "high",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": 2.68,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Consensus กำไรปี 2026 ~฿37-38B (FSSIA ฿37.2B · เอเซีย พลัส ~฿38B · KGI ปรับขึ้น 5% เมื่อ 30 ต.ค. ≈ ฿37B core) → EPS ~฿2.5 บนหุ้น ~14.94B ซึ่งแทนที่ค่า ~฿2.6 ของต้นเดือน (ช่วง ~฿38-40B เดิมกว้างเกิน) · ปี 2027 ~฿39-41B → ~฿2.68 · stockanalysis (10 ราย) แสดง EPS ปี 2026 ฿2.33 ใกล้ FSSIA core EPS ฿2.37 จึงน่าจะเป็นฐาน recurring (โบรกไม่ระบุฐานบัญชี จึงใส่ unknown) · ประมาณการส่วนใหญ่ทำก่อนงบ Q3 ที่ดีกว่าคาดเล็กน้อย ขณะ EPS 9 เดือนจริงเป็น ฿2.07 แล้ว · ไม่ใส่ consensus รายได้ (stockanalysis ฿151B ต่ำกว่ารายได้ 9 เดือนฐานเดียวกัน ~฿133B + Q4 ชัดเจน) · GULF ไม่ให้ guidance รายไตรมาส มีแต่เป้ารายได้/EBITDA ปี 2026 โต 12-15%"
      }
    },
    "PLTR": {
      "ticker": "PLTR",
      "name": "Palantir Technologies",
      "layer": "enterprise",
      "thesis": {
        "statement": "PLTR คือผู้นำซอฟต์แวร์ AI สำหรับองค์กรและภาครัฐ — Gotham (รัฐบาล/กลาโหม) + Foundry (พาณิชย์) + AIP (Artificial Intelligence Platform) ที่จุดการเติบโตรอบใหม่ · มุม AI ของ thesis คือ 'จาก POC สู่ production': AIP bootcamp เปลี่ยนการทดลองเป็นระบบใช้งานจริงได้เร็ว ทำให้ US commercial โตระเบิด (+148% YoY ใน Q3 2026) จนแซงรายได้รัฐบาลสหรัฐเป็นครั้งแรก ขณะฐานรัฐบาลยังโตแข็ง (+96%) · คูเมืองคือ ontology + การผูกข้อมูล/เวิร์กโฟลว์ลูกค้าลึกจน switching cost สูงมาก · เดิมพันจริงคือ valuation สุดขั้ว (forward P/E ~76x จากกำไร 12 เดือนข้างหน้า · ~101x จากกำไรปี 2026) — การเติบโตต้องแรงและยาวพอที่จะ justify multiple ไม่งั้นเสี่ยง multiple compression รุนแรง · สัญญาณที่ต้องเฝ้าคือยอดสัญญาใหม่ (TCV) ที่โตแค่ +6% YoY ใน Q3 ขณะรายได้ยังเร่งตัว",
        "pillars": [
          "AIP = เครื่องยนต์การเติบโต — bootcamp เปลี่ยน POC เป็น production เร็ว ดัน US commercial +148% YoY เป็น $984M (Q3 2026) แซง US government เป็นครั้งแรก",
          "ฐานรัฐบาล/กลาโหมมั่นคงและโตต่อ (US gov $953M +96% YoY) — สัญญาระยะยาว entrenchment สูง ผู้เล่นใหม่เข้าแทนยาก",
          "Ontology + data integration = คูเมือง — ผูกข้อมูลและเวิร์กโฟลว์ลูกค้าลึก switching cost สูงมากเมื่อขึ้น production",
          "Rule of 40 = 158% (ดีที่สุดในกลุ่มซอฟต์แวร์) — โต 96% พร้อม adj operating margin 62% และ adj FCF margin 53% ในเวลาเดียวกัน",
          "Land-and-expand: remaining US commercial deal value $6.52B (+79% YoY) · ปิดดีล ≥$1M 212 ดีลใน Q3 — แต่ RDV โตแค่ +4% QoQ ต้องดูว่า pipeline ตามรายได้ทันหรือไม่"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+96% YoY (Q3 2026 — $2.313B · +20% QoQ) · US commercial +148% · US gov +96% · ทะลุจุดกึ่งกลาง guide 7.0% · guide Q4 $2.649-2.653B (~+88% YoY)",
          "trend": "up",
          "score": 93,
          "impact": "positive",
          "why": "การเติบโตเร่งขึ้นห้าไตรมาสติด (+63% → +70% → +85% → +93% → +96%) และกระจายทั้งพาณิชย์และรัฐ — US commercial เกือบ 2.5 เท่า YoY จาก AIP จนแซงรายได้รัฐบาลสหรัฐเป็นครั้งแรก · FY26 guide ยกเป็น $8.530-8.534B (~+91%) จาก $8.150-8.158B · ข้อควรระวัง: ยอดสัญญาใหม่ (TCV +6% YoY) และ RDV (+4% QoQ) โตช้ากว่ารายได้มาก"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไร",
          "current": "GAAP EPS $0.44 (= adjusted $0.44 · ชนะ consensus ~$0.41) จาก $0.18 ปีก่อน (+144%) · Q2 $0.41 · GAAP operating income $1.085B (+176% YoY · +19% QoQ)",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "กำไรโตเร็วกว่ารายได้เพราะ operating leverage สูง — margin ขยายพร้อมการโต (ต่างจากบริษัทโตเร็วทั่วไปที่ต้องเผาเงิน) · EPS QoQ โตแค่ +7% ช้ากว่ากำไรดำเนินงาน (+19%) เพราะรายการอื่นติดลบ $26M ใน Q3 (ขาดทุนที่ยังไม่รับรู้จากหุ้นจดทะเบียนที่ถือ) เทียบกับครึ่งปีแรกที่บวกรวม ~$160M — ไม่ใช่ธุรกิจชะลอ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "adj FCF Q3 $1.216B (margin 53%) · OCF $1.205B · capex 9 เดือน ~$30M · guide FY26 ยกเป็น $4.8-5.0B จาก $4.5-4.7B",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "เครื่องผลิตเงินสดชั้นดี — โมเดล asset-light + prepay จากลูกค้า ทำให้ FCF margin สูงผิดปกติสำหรับบริษัทโตเร็ว · FCF margin Q3 ลดจาก 63% ใน Q2 เป็น 53% ตามจังหวะการวางบิล/รับชำระจากลูกค้า (ลูกหนี้เพิ่ม ~$0.84B ใน 9 เดือน) ไม่ใช่ธุรกิจแย่ลง และบริษัทยก guide FCF ทั้งปีขึ้น"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "adj operating margin 62% (Q3 2026 · เท่า Q2) · GAAP operating margin ~47% · gross margin 83% · Rule of 40 = 158%",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "margin ระดับท็อปของอุตสาหกรรม — adj 62% และ GAAP ~47% ทรงตัวที่ระดับสูงสุดเป็นประวัติการณ์ (ปีก่อน adj ~51% / GAAP ~33%) · gross margin ลดเหลือ 83% จาก ~86% ในครึ่งปีแรกเพราะค่า cloud hosting ภายนอกเพิ่ม · guide Q4 adj operating income $1.640-1.644B ≈ margin ~62% เท่าเดิม (หมายเหตุ: adjusted บวก SBC กลับ)"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูง — asset-light (capex 9 เดือนแค่ ~$30M) · กำไร GAAP ~$1.13B ต่อไตรมาส · ไม่ต้องลงทุน capex หนัก",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "ธุรกิจซอฟต์แวร์ที่ไม่ต้องใช้ทุนหนัก + กำไรจริงเป็นบวก → ROIC สูงเชิงโครงสร้าง แต่ถ้าคิดรวม SBC เป็นต้นทุนจริงจะลดทอนลง"
        },
        {
          "key": "cash",
          "label": "สภาพคล่อง",
          "current": "เงินสด + US Treasury ~$10.4B (30 ก.ย. 2026) จาก $9.2B ใน Q2 · ไม่มีหนี้",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "งบดุลแข็งมาก เงินสดเพิ่ม ~$1.2B ในไตรมาสเดียว ไม่มีภาระหนี้ — ยืดหยุ่นสูงและทน downturn ได้ดี"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "ไม่มีหนี้ — วงเงินกู้หมุนเวียน $500M ยังไม่ได้เบิก (ครบกำหนด มี.ค. 2027) · net cash เต็มตัว",
          "trend": "flat",
          "score": 92,
          "impact": "positive",
          "why": "ปลอดหนี้ ไม่มีความเสี่ยงจากดอกเบี้ย/refinance — จุดแข็งด้านความมั่นคงทางการเงิน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "SBC Q3 $319M (~14% ของรายได้ · ปีก่อน ~15%) · หุ้น diluted เฉลี่ย 2,574 ล้าน เทียบ 2,571 ล้านปีก่อน · หุ้นออกจำหน่าย 2,409 ล้าน (+1.1% YoY) · ซื้อหุ้นคืนแค่ ~$1.5M ใน 9 เดือน",
          "trend": "up",
          "score": 52,
          "impact": "neutral",
          "why": "ดีขึ้นจากเดิม — SBC ยังเพิ่มตามขนาด (+85% YoY) แต่สัดส่วนต่อรายได้ลดลง และจำนวนหุ้นเพิ่มแค่ราว 1% ต่อปี · ยังไม่ใช่จุดแข็งเพราะไม่มีการซื้อหุ้นคืนมาหักล้าง และ margin/EPS ที่โชว์เป็น adjusted บวก SBC กลับ"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "แทบไม่ซื้อหุ้นคืน (9 เดือนปี 2026 ~$1.5M) · capex ต่ำมาก · ไม่มีปันผล · เงินสดสะสม $10.4B เพิ่ม ~$1.2B ต่อไตรมาส",
          "trend": "flat",
          "score": 62,
          "impact": "neutral",
          "why": "ทีมบริหารเน้นการเติบโตเป็นหลักและเก็บเงินสดไว้ — ปี 2026 แทบไม่ได้ใช้โครงการซื้อหุ้นคืน (ช่วงเดียวกันปีก่อน ~$56M) จึงไม่มีอะไรหักล้าง SBC · เงินสดที่สะสมเร็วยังไม่มีแผนใช้ที่ชัด — วินัยการจัดสรรทุนระยะยาวยังพิสูจน์ไม่ได้"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา $171.70 (4 พ.ย. 2026) · mcap ~$414B · forward P/E ~76x (12 เดือนข้างหน้า non-GAAP) · ~101x กำไรปี 2026 ($1.70) · ~69x ปี 2027 ($2.48) · P/S ~48x รายได้ปี 2026",
          "trend": "flat",
          "score": 20,
          "impact": "negative",
          "why": "ตลาดจ่ายล่วงหน้าให้การเติบโตหลายปี — แม้ธุรกิจดีเยี่ยม แต่ margin of safety แทบไม่มี · ราคาถอยจากจุดสูงสุด 52 สัปดาห์ $212.94 มา ~19% ทำให้ multiple ลดจาก ~80x เหลือ ~76x เท่านั้น ยังแพงสุดขั้ว · ราคาแพงคือความเสี่ยงหลัก ไม่ใช่คุณภาพธุรกิจ"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 85,
        "recurringPct": 80,
        "note": "คุณภาพรายได้สูงและเร่งตัวห้าไตรมาสติด — US commercial ขับด้วย AIP (land-and-expand) จนแซงรายได้รัฐบาลสหรัฐเป็นครั้งแรก และฐานรัฐบาลยังเหนียวและคาดการณ์ได้ · แต่ยอดสัญญาใหม่ Q3 (TCV $2.918B) โตแค่ +6% YoY และ US commercial RDV ($6.517B) +4% QoQ — รายได้กำลังโตเร็วกว่ายอดจองใหม่ ต้องเฝ้าว่าจะกระทบการเติบโตปี 2027 หรือไม่ · รายได้ส่วนใหญ่เป็น subscription/สัญญาต่อเนื่อง แต่ฝั่งรัฐมี lumpiness จากสัญญาก้อนใหญ่เป็นครั้งคราว",
        "segments": [
          {
            "name": "US Government (Gotham/กลาโหม)",
            "sharePct": 41,
            "growthNote": "$953M (+96% YoY · +18% QoQ) — ฐานเหนียว entrenchment สูง โตเร็วขึ้นจาก AI defense",
            "trend": "up"
          },
          {
            "name": "US Commercial (AIP/Foundry)",
            "sharePct": 43,
            "growthNote": "$984M (+148% YoY · +29% QoQ) — แซง US government เป็นครั้งแรก · guide ทั้งปี >$3.559B (≥143%)",
            "trend": "up"
          },
          {
            "name": "International (commercial + government)",
            "sharePct": 16,
            "growthNote": "~$376M (+26% YoY · +4% QoQ) — commercial ~$184M (~+21%) · government ~$193M (~+31%) · โตช้ากว่า US มาก สัดส่วนลดจาก 25% เหลือ 16% ในหนึ่งปี",
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
            "evidence": "bootcamp เปลี่ยน POC เป็นระบบใช้จริงเร็ว — US commercial $984M (+148% YoY · +29% QoQ) แซง US government เป็นครั้งแรก คือหลักฐานว่าเปลี่ยนดีมานด์ AI เป็นรายได้จริงได้"
          },
          {
            "item": "AI ด้านกลาโหม/รัฐ (Gotham, Warp Speed)",
            "status": "executing",
            "evidence": "US gov $953M (+96% YoY · +18% QoQ) — สัญญากลาโหม/หน่วยงานความมั่นคงที่ผู้เล่นใหม่เข้าแทนยากมาก"
          },
          {
            "item": "Ontology + Apollo (deployment layer)",
            "status": "executing",
            "evidence": "โครงสร้างผูกข้อมูล/เวิร์กโฟลว์ลูกค้า = คูเมืองจริง — ทำให้ AIP ต่างจากแชตบอต/copilot ทั่วไป"
          },
          {
            "item": "โมเมนตัมดีลใหญ่",
            "status": "on-track",
            "evidence": "ปิดดีล ≥$1M 212 ดีล (107 ดีล ≥$5M · 64 ดีล ≥$10M) ใน Q3 · แต่ TCV $2.918B (+6% YoY) ลดจาก $3.373B ใน Q2 · US commercial TCV $1.463B (+11%) · RDV $6.517B (+79% YoY แต่ +4% QoQ) — ยอดจองใหม่โตช้ากว่ารายได้ชัด"
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
            "note": "ผู้นำซอฟต์แวร์ AI สำหรับองค์กร/รัฐที่ขึ้น production จริง — US commercial แซง US government เป็นครั้งแรกใน Q3 2026 สะท้อนว่าชนะในตลาดองค์กรด้วย ไม่ใช่แค่ฝั่งรัฐ"
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
            "note": "bootcamp ปิดดีลและขึ้น production เร็วผิดปกติ · รายได้ทะลุจุดกึ่งกลาง guidance เก้าไตรมาสติด (Q3 2026 +7.0%) และยก guide ทั้งปีทุกครั้งที่รายงานงบในปี 2026 (พ.ค. · ส.ค. · พ.ย.)"
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
        "score": 62,
        "verdict": "เน้นการเติบโตเป็นหลักและสะสมเงินสด (เงินสด + treasuries $10.4B) · ปี 2026 แทบไม่ได้ซื้อหุ้นคืน (~$1.5M ใน 9 เดือน) จึงไม่มีอะไรหักล้าง SBC แม้อัตราเจือจางจะต่ำลงเหลือราว 1% ต่อปี · วินัยการจัดสรรทุนระยะยาวยังพิสูจน์ไม่นานพอ แต่งบดุลปลอดหนี้ให้ความยืดหยุ่นสูง",
        "items": [
          {
            "label": "โครงการซื้อหุ้นคืน",
            "current": "แทบไม่ได้ใช้ในปี 2026 — ซื้อคืน ~$1.5M ใน 9 เดือน (ช่วงเดียวกันปีก่อน ~$56M)",
            "assessment": "neutral",
            "why": "การไม่ซื้อคืนที่ valuation ระดับ ~100 เท่าของกำไรอาจสมเหตุสมผล แต่แปลว่า SBC ~$319M ต่อไตรมาสไม่มีอะไรหักล้าง"
          },
          {
            "label": "ลงทุน R&D / AIP",
            "current": "R&D Q3 $220M (+52% YoY) — ลงทุนต่อเนื่องในแพลตฟอร์ม AIP และ ontology",
            "assessment": "good",
            "why": "เป็นหัวใจของคูเมืองและการเติบโต — ROI ปรากฏชัดใน US commercial ที่โตระเบิด"
          },
          {
            "label": "การลงทุนเชิงกลยุทธ์",
            "current": "ถือหุ้นบริษัทพันธมิตร/ลูกค้าบางราย (ทั้งจดทะเบียนและไม่จดทะเบียน) — กำไร/ขาดทุนตีมูลค่าเข้ารายการอื่นทุกไตรมาส",
            "assessment": "neutral",
            "why": "เพิ่มการผูกลูกค้า แต่ต้องระวังการลงทุนที่วนกลับมาเป็นรายได้ตัวเอง (round-tripping) และทำให้กำไร GAAP แกว่งตามราคาหุ้นที่ถือ"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี — เก็บกระแสเงินสดไว้ลงทุน",
            "assessment": "neutral",
            "why": "เหมาะกับช่วงเติบโตเร็ว"
          },
          {
            "label": "เงินสดสะสม",
            "current": "เงินสด + treasuries $10.4B เพิ่ม ~$1.2B ต่อไตรมาส · ไม่มีหนี้",
            "assessment": "neutral",
            "why": "ให้ความยืดหยุ่นสูงมาก แต่ยังไม่มีแผนใช้เงินก้อนนี้ที่ชัดเจน ผลตอบแทนของเงินสดต่ำกว่าผลตอบแทนของธุรกิจหลักมาก"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~76x (12 เดือนข้างหน้า non-GAAP) · ~101x กำไรปี 2026 ($1.70) · ~69x ปี 2027 ($2.48) · P/S ~48x รายได้ปี 2026 ที่ราคา $171.70 (mcap ~$414B) — ยังแพงที่สุดในบรรดาหุ้น AI ขนาดใหญ่ · ธุรกิจคุณภาพเยี่ยม (Rule of 40 = 158%, adj FCF margin ~53%) แต่ราคาสะท้อนการเติบโตหลายปีล่วงหน้าไปแล้ว margin of safety แทบไม่มี · ตลาดตอบสนองงบที่ชนะคาดทุกตัวด้วยการเปิดลบ ~6% (ปิด −1.6% ที่ $175.40 วันที่ 3 พ.ย.) หลังร่วง ~9% ในสามวันก่อนงบ — ความเสี่ยงหลักไม่ใช่คุณภาพธุรกิจ แต่คือ multiple compression ถ้าการเติบโตชะลอแม้เล็กน้อย · เป็นตัวที่ 'ธุรกิจนำหน้าคู่แข่ง แต่ราคานำหน้าธุรกิจ' ชัดที่สุดในพอร์ต"
      },
      "whatChanged": [
        {
          "metric": "รายได้เติบโต YoY",
          "prev": "Q2 2026 +93% ($1.935B) · ชนะจุดกึ่งกลาง guide 7.5%",
          "now": "Q3 2026 +96% ($2.313B · +20% QoQ) · ชนะจุดกึ่งกลาง guide 7.0% — เร่งตัวไตรมาสที่ห้าติด",
          "direction": "positive"
        },
        {
          "metric": "US Commercial",
          "prev": "$764M (+149% YoY)",
          "now": "$984M (+148% YoY · +29% QoQ) — แซง US government เป็นครั้งแรก",
          "direction": "positive"
        },
        {
          "metric": "US Government",
          "prev": "$809M (+90% YoY)",
          "now": "$953M (+96% YoY · +18% QoQ)",
          "direction": "positive"
        },
        {
          "metric": "FY 2026 guidance",
          "prev": "รายได้ $8.150-8.158B · adj FCF $4.5-4.7B · US commercial >$3.424B",
          "now": "รายได้ $8.530-8.534B (~+91% YoY) · adj FCF $4.8-5.0B · US commercial >$3.559B · guide Q4 $2.649-2.653B",
          "direction": "positive"
        },
        {
          "metric": "ยอดสัญญาใหม่ (TCV / RDV)",
          "prev": "TCV $3.373B (+49% YoY) · US commercial TCV $2.132B (+153%) · RDV $6.238B (+124% YoY)",
          "now": "TCV $2.918B (+6% YoY) · US commercial TCV $1.463B (+11%) · RDV $6.517B (+79% YoY · +4% QoQ) — ยอดจองใหม่ชะลอชัด",
          "direction": "negative"
        },
        {
          "metric": "EPS / margin / Rule of 40",
          "prev": "GAAP EPS $0.41 · GAAP operating margin 47.1% · adj 62% · Rule of 40 155%",
          "now": "GAAP EPS $0.44 (= adjusted · +144% YoY) · GAAP operating margin 46.9% · adj 62% · Rule of 40 158% — margin ทรงตัวที่ระดับสูงสุด",
          "direction": "neutral"
        }
      ],
      "risks": [
        "Valuation สุดขั้ว (forward P/E ~76x จากกำไร 12 เดือนข้างหน้า · ~101x กำไรปี 2026) — ความเสี่ยง multiple compression สูงที่สุดในพอร์ต หุ้นเหวี่ยงแรงตามข่าว/โมเมนตัม · งบ Q3 ที่ชนะคาดทุกตัวยังทำให้ราคาเปิดลบ ~6%",
        "ยอดสัญญาใหม่ชะลอ — TCV Q3 2026 +6% YoY (Q2 +49%) และ US commercial RDV +4% QoQ ขณะรายได้โต +96% · ถ้า pipeline ไม่เร่งตาม การเติบโตปี 2027 อาจชะลอแรงกว่าที่ consensus (~$13.0B, ~+52%) คาด",
        "SBC สูง (~$319M ต่อไตรมาส ~14% ของรายได้) และแทบไม่มีการซื้อหุ้นคืน — margin และ EPS ที่โชว์เป็น adjusted บวก SBC กลับ 'กำไรจริง' ต่อหุ้นถูกเจือจาง แม้อัตราเพิ่มของจำนวนหุ้นจะลดลงเหลือราว 1% ต่อปี",
        "พึ่งรัฐบาล/สัญญาก้อนใหญ่ — รายได้ฝั่งรัฐ lumpy และอ่อนไหวต่อการเมือง/งบประมาณ",
        "คู่แข่ง hyperscaler / foundation model providers ขยับเข้าพื้นที่ AI application ระดับองค์กร · บวก key-man risk (Alex Karp) และวัฒนธรรมองค์กรเฉพาะตัวที่ผูกกับผู้นำ"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
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
            "revenueB": 4.48,
            "epsAdj": 0.75,
            "opMarginPct": 50,
            "fcfB": 2.1,
            "priceFYEnd": 177.8
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
            "priceQEnd": 84.4
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
            "priceQEnd": 177.75
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "revenueB": 1.633,
            "epsAdj": 0.34,
            "opMarginPct": 46.2,
            "fcfB": 0.892,
            "priceQEnd": 146.28
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "revenueB": 1.935,
            "epsAdj": 0.41,
            "opMarginPct": 47.1,
            "fcfB": 1.202,
            "priceQEnd": 116.67
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 2.313,
            "epsAdj": 0.44,
            "opMarginPct": 46.9,
            "fcfB": 1.197,
            "priceQEnd": 187
          }
        ],
        "epsBasis": "รายไตรมาส (history.quarters) = diluted GAAP EPS ตามงบ · รายปี (history.years) = diluted adjusted (non-GAAP) EPS · PLTR ไม่เคยแตกหุ้น จึงเป็นฐานหุ้นปัจจุบันทุกงวด · ตั้งแต่ปี 2026 GAAP กับ adjusted EPS เท่ากัน (Q2 $0.41 · Q3 $0.44) แต่ก่อนหน้านั้น GAAP ต่ำกว่ามาก (เช่น Q4'24 GAAP $0.03 เทียบ adjusted $0.14 · FY2025 GAAP $0.63 เทียบ adjusted $0.75)",
        "notes": "EPS รายไตรมาสเป็น diluted GAAP ส่วนรายปีเป็น diluted adjusted และ opMarginPct ก็แยกฐานแบบเดียวกัน (รายไตรมาส GAAP · รายปี adjusted) — ก่อนปี 2026 จึงเทียบสองตารางตรง ๆ ไม่ได้ · fcfB ทั้งรายปีและรายไตรมาสคิดแบบกระแสเงินสดจากการดำเนินงานลบ capex ไม่ใช่ adjusted FCF ของบริษัท (FY2025 = $2.134B − $0.034B ≈ $2.10B เทียบ adjusted FCF ที่รายงาน $2.270B) · แถว FY2025 แทนค่าประมาณเดิมด้วยตัวเลขจริงจาก 8-K งบ Q4 2025 เมื่อ 2026-11 · priceQEnd ของ Q1'25, Q4'25, Q1'26 และ Q2'26 แก้เป็นราคาปิดวันทำการสุดท้ายของเดือนสิ้นไตรมาสจาก Yahoo Finance เมื่อ 2026-11 (เดิม 88 / 170 / 140 / 155) และ priceFYEnd ของ FY2025 ปรับตามราคาปิดสิ้นปีเดียวกัน",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/1321655/000132165526000004/a2025q4ex991earningsrelease.htm",
          "https://www.sec.gov/Archives/edgar/data/1321655/000132165525000007/a2024q4ex991earningsrelease.htm",
          "https://www.sec.gov/Archives/edgar/data/0001321655/000132165526000045/a2026q3ex991pressrelease.htm",
          "https://www.sec.gov/Archives/edgar/data/1321655/000132165526000048/pltr-20260930.htm",
          "https://finance.yahoo.com/quote/PLTR/history/"
        ]
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 1.6,
            "revenue": 8.19
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 1.7,
            "revenue": 8.55
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "~$2.160-2.164B",
            "actual": "~$2.313B",
            "result": "beat",
            "magnitudePct": 7
          },
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
            "revenue": 8.55,
            "eps": 1.7,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 13,
            "eps": 2.48,
            "confidence": "medium",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": 18.98,
            "eps": 3.29,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3 2026 รายได้ทะลุจุดกึ่งกลาง guidance 7.0% เป็นไตรมาสที่เก้าติด และบริษัทยก guide ปี 2026 เป็น $8.530-8.534B ทำให้ consensus FY2026 ขยับจาก $8.19B / EPS $1.60 (ส.ค.) เป็น $8.55B / $1.70 (non-GAAP · StockAnalysis และ Yahoo ตรงกัน · MarketScreener $1.68) · FY2027 รายได้ ~$13.0B ตรงกันสองแหล่งแต่ EPS ต่างกัน (Yahoo normalized $2.48 จาก 30 นักวิเคราะห์ vs MarketScreener $2.27) จึงให้ความมั่นใจระดับกลาง ส่วน FY2028 (~$19.0B / $3.29) มาจาก MarketScreener แหล่งเดียวที่ไม่ระบุฐาน EPS"
      }
    },
    "SHOP": {
      "ticker": "SHOP",
      "name": "Shopify Inc.",
      "layer": "enterprise",
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
      "thesis": {
        "statement": "Shopify เป็นโครงสร้างพื้นฐานการค้าขายออนไลน์ที่พ่อค้าตั้งแต่รายเล็กถึงองค์กรใช้ขายของ — จุดสำคัญคือรายได้ 78% ไม่ใช่ค่าสมาชิก แต่เป็นส่วนแบ่งจากยอดขายจริงของพ่อค้า (take rate บน GMV) จึงโตตามการค้าที่ไหลผ่านแพลตฟอร์ม ไม่ใช่ตามจำนวนร้านที่สมัคร",
        "pillars": [
          "Merchant Solutions 78% ของรายได้ โต +35% YoY — ผูกกับ GMV ที่ไหลผ่านระบบ ($119B ใน Q3'26 · +29%) และ Shopify Payments ที่ครอบคลุม 68% ของ GMV (ปีก่อน 65%)",
          "GMV โตเกิน 30% ห้าไตรมาสติดก่อนชะลอเหลือ 29% (ค่าเงินคงที่ 30%) ใน Q3'26 — ยังกินส่วนแบ่งตลาด e-commerce ต่อเนื่อง แต่ต้องดูว่าการชะลอเป็นแค่ฐานที่สูงขึ้นหรือเป็นแนวโน้ม",
          "จบยุคเผาเงินแล้ว: op margin จาก −14.7% (FY2022) เป็น 12.7% (FY2025) และ 15.2% ใน Q3'26 · FCF 4 ไตรมาสล่าสุด ~$2.7B (22% margin ในไตรมาสล่าสุด) · ไม่มีหนี้เงินกู้และเริ่มซื้อหุ้นคืนจริงจัง",
          "ขายธุรกิจ logistics ทิ้งปี 2023 กลับมาเป็น asset-light software — ต้นทุนคงที่ต่ำ capex แทบเป็นศูนย์ ขยายได้โดยไม่ต้องลงทุนหนัก",
          "AI (Sidekick / agentic commerce) เป็นเรื่องเล่าหลัก — Q3'26 บริษัทให้ตัวเลขการเติบโตแล้ว (คำสั่งซื้อที่มาจาก AI ~3.3 เท่า YoY) แต่ยังไม่เปิดสัดส่วนต่อ GMV จึงยังพิสูจน์ผลต่อรายได้ไม่ได้"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตรายได้",
          "current": "~+32% YoY (Q3'26 $3,742M · ตรงกรอบ low-thirties ที่ guide) · GMV +29%",
          "trend": "flat",
          "score": 86,
          "impact": "positive",
          "why": "รายได้โตในกรอบ 30-34% มาหกไตรมาสติดและ guide Q4 ยัง low-thirties — เร็วมากสำหรับฐานรายได้ ~$14B/ปี · แต่ Q3 ชะลอจาก 34% เป็น 31.6% (บริษัทปัดเป็น 32%) และออกมาตรงกรอบพอดี ไม่เกินเหมือนสองไตรมาสก่อน ขณะที่ GMV ชะลอจาก 32% เป็น 29% (ค่าเงินคงที่ 30%) ต่ำกว่าที่นักวิเคราะห์คาดเล็กน้อย และหลุดระดับ 30% หลังเกินมาห้าไตรมาสติด · รายได้ยังโตเร็วกว่า GMV เพราะสัดส่วน Shopify Payments เพิ่มขึ้น (68% ของ GMV จาก 65%)"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตกำไรต่อหุ้น",
          "current": "Q3'26 GAAP $0.36 (ปีก่อน $0.20) · non-GAAP $0.49 (ปีก่อน $0.34) · กำไรสุทธิไม่รวมเงินลงทุน $584M (+59% YoY)",
          "trend": "up",
          "score": 50,
          "impact": "neutral",
          "why": "GAAP EPS ยังถูกครอบงำโดยการตีมูลค่าเงินลงทุนในหุ้น: Q1 ติดลบทุกปี (−0.21 / −0.53 / −0.45) · Q2'26 +1.16 จากกำไรตีมูลค่า ~$1,063M · Q3'26 +0.36 หลังขาดทุนตีมูลค่า ~$122M — ตัวเลขนี้ไม่สะท้อนธุรกิจ · แต่ฐานกำไรจริงโตชัด: กำไรจากการดำเนินงาน +66% YoY และกำไรสุทธิไม่รวมเงินลงทุน +59% (ในนั้นมีประโยชน์ภาษีครั้งเดียว $63M — ตัดออกแล้วยังโตราว 42%) จึงให้คะแนนสูงขึ้นแต่ยังกลาง ๆ เพราะตัวเลขที่รายงานแกว่งจนใช้วัดแนวโน้มตรง ๆ ไม่ได้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "~$816M ไตรมาสล่าสุด (22% ของรายได้ · ปีก่อน 18%) · 4 ไตรมาสล่าสุด ~$2.7B · guide Q4 margin ใกล้ Q4'25 (19%)",
          "trend": "up",
          "score": 87,
          "impact": "positive",
          "why": "FCF margin ขยับจากติดลบใน FY2022 เป็น 17% ทั้งปี FY2025 และ 22% ใน Q3'26 เกินกรอบ high-teens ถึง low-twenties ที่ให้ไว้ · capex แทบเป็นศูนย์ ($2M) เพราะเป็น asset-light · ข้อควรรู้: ตั้งแต่ เม.ย. 2026 บริษัทย้ายกระแสเงินสดของ merchant cash advance ไปอยู่ในกิจกรรมลงทุน ทำให้ FCF Q3 สูงขึ้นราว $30M (ตัดผลนี้ออก margin ยัง ~21%) · ยังเป็นตัวชี้คุณภาพกำไรที่เชื่อได้มากกว่า EPS ของบริษัทนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไรจากการดำเนินงาน",
          "current": "~15.2% (Q3'26 · op income $568M · ปีก่อน 12.1% · Q2'26 13.6%)",
          "trend": "up",
          "score": 75,
          "impact": "positive",
          "why": "op income $568M เทียบ $343M ปีก่อน (+66%) มาจากการคุมค่าใช้จ่าย — opex 32.4% ของรายได้ (ปีก่อน 36.8% · ต่ำกว่ากรอบ 33-34% ที่ให้ไว้) และความเสียหายจากธุรกรรม/สินเชื่อลดเหลือ $120M จาก $148M · ส่วน gross margin กลับลดเป็น 47.6% จาก 48.9% เพราะรายได้ Merchant Solutions ที่ margin ต่ำกว่า (~38.5%) กินสัดส่วนมากขึ้น และ margin ฝั่ง subscription ลดเหลือ ~79% จาก ~82% · ทิศทางขยายชัดจาก −14.7% ใน FY2022 → 12.7% FY2025 แต่ยังต่ำกว่า software ชั้นนำ เพราะ 78% ของรายได้เป็น take rate ที่มีต้นทุนจ่ายจริง (payment processing) ไม่ใช่ margin แบบ subscription"
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
          "current": "เงินสด + หลักทรัพย์ระยะสั้น ~$4.73B + เงินลงทุนระยะยาว ~$0.52B (30 ก.ย. 2026) ≈ $5.25B · ไม่มีหนี้เงินกู้ · ถือหุ้นบริษัทอื่นอีก ~$5.4B",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "สภาพคล่องลดจาก ~$6.75B ต้นปีเพราะใช้ซื้อหุ้นคืน ~$2.48B ใน 9 เดือนและปล่อยสินเชื่อร้านค้าเพิ่ม ไม่ใช่เพราะธุรกิจเผาเงิน — FCF ~$2.7B/ปีเติมกลับทุกไตรมาส · พอร์ตสินเชื่อ Shopify Capital โตเป็น $2.35B (ต้นปี $1.78B) ผูกเงินสดส่วนหนึ่งไว้ · สถานะการเงินเปลี่ยนจากยุคที่ต้องระดมทุนมาเป็นคืนเงินผู้ถือหุ้นได้"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "ไม่มีเงินกู้หรือหุ้นกู้ในงบดุล (30 ก.ย. 2026) — หนี้สินรวม ~$1.9B เป็นหนี้สินจากการดำเนินงานทั้งหมด",
          "trend": "flat",
          "score": 85,
          "impact": "positive",
          "why": "งบดุล 30 ก.ย. 2026 มีหนี้สินรวม ~$1.92B แบ่งเป็นเจ้าหนี้การค้า $630M ภาษีเงินได้รอตัดบัญชี $63M และหนี้สินอื่น $1.22B (บริษัทระบุว่าเป็นค่าใช้จ่ายค้างจ่าย รายได้รับล่วงหน้า และหนี้สินตามสัญญาเช่า) — ไม่มีรายการหุ้นกู้แปลงสภาพหรือเงินกู้ตั้งแต่งบดุลสิ้นปี 2025 · เทียบกับสภาพคล่อง ~$5.25B และ FCF ~$2.7B/ปี ภาระหนี้ไม่ใช่ประเด็น"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มทุน / SBC",
          "current": "หุ้น diluted 1,290.7 ล้าน (Q3'26) ลดลง ~1.7% YoY จาก 1,312.9 ล้าน · SBC $140M (~3.7% ของรายได้) · guide Q4 $155M",
          "trend": "up",
          "score": 74,
          "impact": "positive",
          "why": "จำนวนหุ้นลดลง YoY เพราะซื้อหุ้นคืน 21.1 ล้านหุ้นใน 9 เดือนแรกของปี 2026 มากกว่าหุ้นที่ออกใหม่จาก SBC · SBC Q3 $140M ต่ำกว่ากรอบ $150M ที่ให้ไว้ และ ~3.7% ของรายได้ไม่สุดโต่งสำหรับ software · ความเสี่ยงคือถ้าหยุดซื้อหุ้นคืน จำนวนหุ้นจะกลับมาเพิ่มตาม SBC"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "asset-light + ซื้อหุ้นคืน ~$2.48B ใน 9 เดือน (วงเงินรวม $5B · เหลือ ~$2.52B)",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "ตัดสินใจขายธุรกิจคลังสินค้า/โลจิสติกส์ทิ้งในปี 2023 (ยอมรับความผิดพลาดเร็ว) แล้วกลับมาโฟกัสซอฟต์แวร์ · ปี 2026 เริ่มคืนเงินผู้ถือหุ้นจริงจัง — ซื้อหุ้นคืนเฉลี่ย ~$117/หุ้น ต่ำกว่าราคาปัจจุบัน (~$153) และเพิ่มวงเงินจาก $2B เป็น $5B ใน Q2 · ข้อสังเกตคือเงินที่ใช้ซื้อหุ้นคืน 9 เดือน (~$2.48B) เกิน FCF ของงวดเดียวกัน (~$1.95B) จึงกินสภาพคล่องที่สะสมไว้"
        },
        {
          "key": "valuation",
          "label": "Valuation (ถูก=คะแนนสูง)",
          "current": "P/E TTM ~93x (GAAP) · forward ~81x (FY2026 non-GAAP) / ~62x (FY2027) · EV/Sales TTM ~13.6x",
          "trend": "flat",
          "score": 22,
          "impact": "negative",
          "why": "ราคา ~$153 (4 พ.ย. 2026) หาร GAAP EPS TTM ~$1.64 ได้ ~93 เท่า หาร consensus FY2026 non-GAAP $1.89 ได้ ~81 เท่า และ FY2027 ~$2.45 ได้ ~62 เท่า · FCF yield แค่ ~1.4% — แพงมากแม้เทียบการเติบโต ~30% · งบ Q3 ชี้ว่าตลาดลงโทษแรงแม้พลาดคาดเพียงเล็กน้อย (ปิด −8.7% วันงบเพราะ GMV ต่ำกว่าคาด ~1%) ความคาดหวังถูกใส่ในราคาไว้เยอะ"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 72,
        "recurringPct": 22,
        "note": "จุดที่คนเข้าใจผิดบ่อยที่สุดของ SHOP: รายได้ส่วนใหญ่ไม่ใช่ subscription — Subscription Solutions มีแค่ 22% (MRR $230M · +19% YoY) ที่เหลือ 78% เป็น Merchant Solutions ซึ่งคือส่วนแบ่งจากยอดขายจริงของพ่อค้า (payments/capital/markets/POS) จึงผูกกับการบริโภคและเป็น cyclical มากกว่า SaaS ทั่วไป · รายได้โตในกรอบ 30-34% มาหกไตรมาสติดและ guide Q4 ยัง low-thirties แต่ GMV ชะลอจาก 35% (Q1'26) → 32% → 29% ใน Q3'26 — ที่รายได้ยังโตเร็วกว่า GMV เพราะ Shopify Payments กินสัดส่วน GMV มากขึ้น (68% จาก 65%) · บริษัทเปิดเผยรายได้เพียง 2 สายนี้ ไม่ได้แตกย่อยกว่านี้ จึงไม่แบ่ง segment เพิ่มเพื่อไม่ให้เป็นการเดาสัดส่วน",
        "segments": [
          {
            "name": "Merchant Solutions (payments / capital / markets / POS)",
            "sharePct": 78,
            "growthNote": "+35% YoY ($2,906M · ค่าเงินคงที่ +36%) — โตเร็วกว่าฝั่ง subscription เกือบเท่าตัว ผูกกับ GMV $119B และ Shopify Payments ที่ครอบคลุม 68% ของ GMV · gross margin ฝั่งนี้ ~38.5% (ปีก่อน ~38.2%)",
            "trend": "up"
          },
          {
            "name": "Subscription Solutions (ค่าสมาชิกแพลตฟอร์ม + apps/themes)",
            "sharePct": 22,
            "growthNote": "+20% YoY ($836M) · MRR $230M (+19%) — ส่วนที่เป็นรายได้ประจำแท้ ๆ แต่ต่ำกว่าที่นักวิเคราะห์คาด (~$848M) และ gross margin ลดเหลือ ~79% จาก ~82% ปีก่อน (ผู้บริหารโยงกับต้นทุน AI ของ Sidekick และ hosting)",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 60,
        "items": [
          {
            "item": "Sidekick — ผู้ช่วย AI ในหลังบ้านร้านค้า",
            "status": "executing",
            "evidence": "ไตรมาสนี้บริษัทให้ตัวเลขการใช้งาน: บทสนทนากับ Sidekick +14% QoQ และต้นทุนต่อบทสนทนาลด ~28% (ตามสไลด์และการประชุมนักวิเคราะห์ Q3'26) · แต่ gross margin ฝั่ง subscription ลดเหลือ ~79% จาก ~82% ปีก่อน ซึ่งผู้บริหารโยงกับต้นทุน AI ของ Sidekick และ hosting — ยังไม่มีตัวเลขผลต่อรายได้"
          },
          {
            "item": "Shopify Magic — สร้างข้อความ/รูปสินค้าด้วย AI",
            "status": "executing",
            "evidence": "แถมมาในแพลตฟอร์มโดยไม่คิดเงินเพิ่ม — เป็นตัวรักษาลูกค้ามากกว่าตัวสร้างรายได้ใหม่ ยังไม่มีตัวเลขยืนยันผล"
          },
          {
            "item": "Agentic commerce — ให้ AI agent ซื้อของแทนผู้ใช้",
            "status": "on-track",
            "evidence": "Q3'26 traffic จาก AI เข้าร้านค้าโต ~2.6 เท่า และคำสั่งซื้อที่มาจาก AI โต ~3.3 เท่า YoY (ตามสไลด์ประกอบงบ) ผู้บริหารมองว่าเทศกาลปลายปีนี้เป็นครั้งแรกที่การช้อปผ่าน AI เป็นกระแสหลัก — แต่บริษัทยังไม่เปิดสัดส่วน GMV ที่มาจากช่องทางนี้ จึงยังวัดขนาดจริงไม่ได้"
          },
          {
            "item": "ใช้ AI ลดต้นทุนภายใน (support / เขียนโค้ด)",
            "status": "executing",
            "evidence": "opex ลดจาก 36.8% เหลือ 32.4% ของรายได้ในหนึ่งปี ทั้งที่ R&D ยังโต 33% · บริษัทพูดถึงการใช้ AI ภายในต่อเนื่อง แต่ยังแยกไม่ได้ว่าส่วนไหนมาจาก AI ส่วนไหนมาจากการคุมค่าใช้จ่ายปกติ"
          },
          {
            "item": "ตำแหน่งเป็น 'ท่อ' ของการค้า AI",
            "status": "on-track",
            "evidence": "ถ้าการซื้อของย้ายไปอยู่บน AI agent จริง SHOP ได้เปรียบเพราะเป็นเจ้าของทั้งข้อมูลสินค้า (Catalog) และ checkout — ผู้บริหารระบุว่าการค้นหาที่ใช้ Catalog แปลงเป็นยอดขายได้ดีกว่าการค้นหาผ่าน AI ทั่วไป แต่ก็เสี่ยงถูกลดบทบาทเป็นแค่หลังบ้านถ้า agent ของเจ้าอื่นคุมหน้าร้าน"
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
            "note": "เบอร์สองของ e-commerce สหรัฐเมื่อวัดด้วย GMV รองจาก Amazon · GMV Q3'26 โต 29% (อเมริกาเหนือ +28% · ยุโรป +33% ค่าเงินคงที่) ยังเร็วกว่าตลาด e-commerce โดยรวมมากแม้ชะลอจาก 32% ใน Q2"
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
            "note": "ปล่อยฟีเจอร์เป็นรอบ (Editions) ถี่และตรงเวลา · Q3'26 opex ต่ำกว่ากรอบและ FCF margin เกินกรอบที่ให้ไว้ ขณะที่รายได้ออกมาตรงกรอบพอดี (ไม่เกินเหมือน Q1-Q2) · ขยาย enterprise กับออฟไลน์ได้พร้อมกันโดย margin ยังขยาย"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายระบบ",
            "status": "strengthening",
            "note": "Shopify Payments ครอบคลุม 68% ของ GMV (ปีก่อน 65%) — ยิ่งใช้ Payments/Capital/POS ยิ่งย้ายยาก เพราะกระทบกระแสเงินสดและการขายทันทีที่ย้าย"
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
        "score": 78,
        "verdict": "วินัยดีขึ้นชัดเจนหลังบทเรียนโลจิสติกส์ — เลิกลงทุนหนักในสิ่งที่ไม่ใช่จุดแข็ง กลับมาเป็นซอฟต์แวร์ที่สร้างเงินสด และปี 2026 เริ่มคืนเงินผู้ถือหุ้นจริงจัง (ซื้อหุ้นคืน ~$2.48B ใน 9 เดือนจากวงเงิน $5B จนจำนวนหุ้นลดลง YoY) · จุดที่ต้องจับตาคือพอร์ตสินเชื่อร้านค้าที่โตเร็ว และพอร์ตเงินลงทุนในหุ้นที่ทำให้กำไรตามบัญชีแกว่ง",
        "items": [
          {
            "label": "ซื้อหุ้นคืน",
            "current": "วงเงินรวม $5B ($2B อนุมัติ Q1 2026 มีผล 17 ก.พ. + เพิ่ม $3B ใน Q2) · ซื้อแล้ว 21.1 ล้านหุ้น ~$2.48B เฉลี่ย ~$117/หุ้น ใน 9 เดือน · เหลือ ~$2.52B",
            "assessment": "good",
            "why": "ครั้งแรกที่คืนเงินผู้ถือหุ้นเป็นก้อน และซื้อที่ราคาเฉลี่ยต่ำกว่าราคาปัจจุบัน (~$153) — หุ้น diluted ลดลง ~1.7% YoY ทั้งที่มี SBC ~$140M/ไตรมาส · แต่ใช้เงินเกิน FCF ของงวดเดียวกัน จึงทำให้สภาพคล่องลดลง"
          },
          {
            "label": "ขายธุรกิจโลจิสติกส์",
            "current": "ขายทิ้งปี 2023 (Deliverr / 6 River)",
            "assessment": "good",
            "why": "ยอมรับความผิดพลาดและถอยออกเร็วแทนดันต่อ — คืน margin และความเรียบง่ายให้ธุรกิจหลัก"
          },
          {
            "label": "เงินลงทุนในหุ้นบริษัทอื่น",
            "current": "equity & other investments ~$4.9B + เงินลงทุนตามวิธีส่วนได้เสีย ~$0.5B (30 ก.ย. 2026) ตีมูลค่าผ่านงบกำไรขาดทุน",
            "assessment": "neutral",
            "why": "สร้างกำไร/ขาดทุนทางบัญชีก้อนใหญ่สลับกัน (Q2'26 กำไร ~$1,063M · Q3'26 ขาดทุน ~$122M สุทธิภาษี) ทำให้ EPS อ่านไม่รู้เรื่องและไม่ใช่ผลจากการดำเนินงาน · Q3 ยังซื้อเงินลงทุนเพิ่ม $161M"
          },
          {
            "label": "ลงทุนใน R&D / AI",
            "current": "opex 32.4% ของรายได้ใน Q3'26 (กรอบ 33-34%) · R&D $497M (+33% YoY) · guide Q4 29-30%",
            "assessment": "good",
            "why": "คุมค่าใช้จ่ายรวมได้ดีกว่ากรอบที่ให้ไว้ ขณะที่ R&D โตเร็วกว่าค่าใช้จ่ายส่วนอื่น (การตลาด +14% · G&A +13%) — ลงทุนเพิ่มในสิ่งที่สร้างผลิตภัณฑ์ ไม่ใช่โตแล้วเผาเงิน"
          },
          {
            "label": "สินเชื่อร้านค้า (Shopify Capital)",
            "current": "สินเชื่อและเงินทดรองร้านค้าสุทธิ $2.35B (ต้นปี $1.78B) · ปล่อยใหม่ $1.70B ใน Q3 (ปีก่อน $1.0B)",
            "assessment": "neutral",
            "why": "ช่วยผูกพ่อค้าและเพิ่มรายได้ Merchant Solutions แต่เป็นการใช้งบดุลรับความเสี่ยงเครดิตที่โตเร็ว · ความเสียหายจากธุรกรรมและสินเชื่อ Q3 ลดเหลือ $120M (ปีก่อน $148M) จึงยังคุมได้ในวันนี้"
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
        "note": "ราคา ~$153 (4 พ.ย. 2026 · mcap ~$197B · EV ~$192B) · P/E TTM ~93 เท่า (GAAP EPS TTM ~$1.64) · forward ~81 เท่าของ consensus FY2026 non-GAAP $1.89 และ ~62 เท่าของ FY2027 ~$2.45 (ฐานไม่ระบุ) · EV/Sales TTM ~13.6 เท่า · หลังงบ Q3 ราคาปิด −8.7% เหลือ $142.57 แม้รายได้ตรงกรอบและกำไรดีกว่าคาด เพราะ GMV ($119.1B) และรายได้ subscription ต่ำกว่าที่นักวิเคราะห์คาดเล็กน้อย ก่อนเด้งกลับ $153 วันถัดมา (ยังต่ำกว่าราคาปิดสูงสุด $179 เมื่อ 12 ต.ค. ~15%) · P/E ย้อนหลังของ SHOP ยังใช้เทียบไม่ได้ เพราะ FY2022 ขาดทุนและ FY2023 EPS แค่ 0.10 — ควรตัดสินด้วย FCF (4 ไตรมาสล่าสุด ~$2.7B → FCF yield ~1.4%) และการเติบโตของ GMV แทนตัวคูณกำไร"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2'26 → Q3'26)",
          "prev": "$3,583M (+34% YoY) · เกินกรอบ high-twenties ~4%",
          "now": "$3,742M (+32% YoY) · ตรงกรอบ low-thirties ที่ guide ไว้พอดี ไม่เกินเหมือนสองไตรมาสก่อน",
          "direction": "neutral"
        },
        {
          "metric": "GMV",
          "prev": "$115.6B (+32% YoY) — เกิน 30% ห้าไตรมาสติด",
          "now": "$119.1B (+29% · ค่าเงินคงที่ +30%) ต่ำกว่าที่นักวิเคราะห์คาด ~$120.0B · ราคาปิดวันงบ −8.7% ก่อนเด้งกลับวันถัดมา",
          "direction": "negative"
        },
        {
          "metric": "กำไรจากการดำเนินงาน / opex",
          "prev": "$488M · margin 13.6% · opex 34.0% ของรายได้",
          "now": "$568M (+66% YoY) · margin 15.2% · opex 32.4% (ต่ำกว่ากรอบ 33-34%)",
          "direction": "positive"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "$654M · margin 18%",
          "now": "$816M · margin 22% (ปีก่อน 18%) — เกินกรอบ high-teens ถึง low-twenties",
          "direction": "positive"
        },
        {
          "metric": "GAAP EPS / กำไรไม่รวมเงินลงทุน",
          "prev": "$1.16 (รวมกำไรตีมูลค่า ~$1,063M) · กำไรไม่รวมเงินลงทุน $439M",
          "now": "$0.36 (รวมขาดทุนตีมูลค่า ~$122M) · กำไรไม่รวมเงินลงทุน $584M (มีประโยชน์ภาษีครั้งเดียว $63M) · non-GAAP $0.49 vs คาด ~$0.46",
          "direction": "positive"
        },
        {
          "metric": "กรอบไตรมาสหน้า",
          "prev": "Q3: รายได้ low-thirties · gross profit mid-to-high twenties · opex 33-34% · FCF margin high-teens ถึง low-twenties",
          "now": "Q4: รายได้ low-thirties · gross profit high-twenties · opex 29-30% · SBC $155M · FCF margin ใกล้ Q4'25 (19%)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "รายได้ 78% ผูกกับยอดขายจริงของพ่อค้า — ถ้าการบริโภคชะลอ รายได้จะลงเร็วกว่าบริษัท SaaS ที่เก็บค่าสมาชิกล่วงหน้า และพอร์ตสินเชื่อ Shopify Capital ที่โตเร็ว ($2.35B จาก $1.78B ต้นปี) จะรับแรงกระแทกพร้อมกัน",
        "ราคาแพงมาก (P/E TTM ~93 · forward ~81 เท่าของ FY2026 non-GAAP / ~62 เท่าของ FY2027) — งบ Q3 แสดงแล้วว่าแค่ GMV ชะลอเหลือ 29% และต่ำกว่าคาด ~1% ราคาก็ปิดร่วง 8.7% ในวันเดียว ถ้าการเติบโตหลุดจากระดับ 30% ต่อเนื่อง ตัวคูณอาจถูกกดลงแรงกว่าที่กำไรลด",
        "GAAP EPS ถูกครอบงำโดยการตีมูลค่าเงินลงทุนในหุ้น (Q2'26 กำไร ~$1,063M · Q3'26 ขาดทุน ~$122M) ทำให้กำไรที่รายงานเหวี่ยงแรงและอ่านทิศทางธุรกิจจากงบไม่ได้",
        "Amazon และผู้เล่นราคาถูกกดทั้งส่วนแบ่งตลาดและ take rate ได้ตลอด — คูเมืองเป็นเรื่องต้นทุนการย้าย ไม่ใช่การผูกขาด",
        "ถ้าการซื้อของย้ายไปอยู่บน AI agent ของเจ้าอื่น Shopify อาจถูกลดบทบาทเหลือแค่หลังบ้าน เสียการเข้าถึงลูกค้าและอำนาจกำหนดราคา — และต้นทุน AI เริ่มกด gross margin ฝั่ง subscription แล้ว (~79% จาก ~82%)"
      ],
      "history": {
        "fyNote": "ปีบัญชีตรงกับปีปฏิทิน (สิ้นสุด 31 ธ.ค.)",
        "epsBasis": "diluted GAAP, split-adjusted (ปรับ 10:1 split มิ.ย. 2022 ทุกปี) · ⚠ สำคัญ: GAAP EPS ของ SHOP ถูกครอบงำโดยกำไร/ขาดทุนจากการตีมูลค่าเงินลงทุนในหุ้น (mark-to-market) ซึ่งไม่ใช่ผลการดำเนินงาน — Q1 ติดลบทุกปี (Q1'24 −0.21 · Q1'25 −0.53 · Q1'26 −0.45) ทั้งที่ op income เป็นบวก · Q2'26 +1.16 รวมกำไรตีมูลค่า ~$1,063M (ตัดออกแล้วกำไรจริง $439M) · Q3'26 +0.36 รวมขาดทุนตีมูลค่า ~$122M สุทธิภาษีและประโยชน์ภาษีครั้งเดียว $63M (ตัดทั้งสองรายการออก ~$0.40) · เทียบ EPS ข้ามไตรมาสหรือข้ามปีของบริษัทนี้ตรง ๆ ไม่ได้",
        "marginNote": "opMarginPct ใส่เฉพาะงวดที่คำนวณจาก operating income ที่บริษัทแจ้งเองได้ (ยืนยันด้วย gross profit − opex) · ตัวเลข operating margin ของแหล่งรวมข้อมูลภายนอกสูงกว่านี้อย่างเป็นระบบ (Q2'26: 17.55% vs 13.6% ที่คำนวณจากเลขบริษัท) จึงไม่นำมาใช้ · งวดที่ยืนยันไม่ได้เว้นว่างไว้",
        "notes": "ราคาสิ้นงวดดึงจาก /api/ohlc (แหล่งเดียวกับที่หน้าเว็บใช้ · ปรับ split แล้ว) · รายได้/EPS จาก press release และงบรายไตรมาสของบริษัท · แถว Q4'24, Q1'25, Q2'25, Q3'25 และ Q1'26 เติม opMarginPct/fcfB ย้อนหลังเมื่อ 2026-11 จากตัวเลขใน press release ของบริษัท (opMarginPct = กำไรจากการดำเนินงาน GAAP ÷ รายได้ · fcfB = FCF ที่บริษัทรายงาน = OCF − capex ตามนิยามเดียวกับแถวเดิม)",
        "sources": "shopify.com/news (press release รายไตรมาส) · SEC 10-Q · /api/ohlc สำหรับราคา · SEC 8-K + 10-Q Q3 2026 (3 พ.ย. 2026) · https://www.sec.gov/Archives/edgar/data/1594805/000159480526000067/exhibit991pressreleaseq320.htm · https://www.sec.gov/Archives/edgar/data/1594805/000159480526000068/shop-20260930.htm · https://www.sec.gov/Archives/edgar/data/1594805/000159480526000046/exhibit991pressreleaseq220.htm · https://www.sec.gov/Archives/edgar/data/1594805/000159480526000018/exhibit991pressreleaseq120.htm · https://www.sec.gov/Archives/edgar/data/1594805/000159480526000006/exhibit991pressreleaseq420.htm",
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
            "opMarginPct": 16.5,
            "fcfB": 0.611,
            "priceQEnd": 106.33
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 2.36,
            "epsAdj": -0.53,
            "opMarginPct": 8.6,
            "fcfB": 0.363,
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
            "fcfB": 0.422,
            "priceQEnd": 115.35
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 2.844,
            "epsAdj": 0.2,
            "opMarginPct": 12.1,
            "fcfB": 0.507,
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
            "opMarginPct": 12.1,
            "fcfB": 0.476,
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 3.742,
            "epsAdj": 0.36,
            "opMarginPct": 15.2,
            "fcfB": 0.816,
            "priceQEnd": 148.3,
            "epsNote": "GAAP EPS $0.36 รวมขาดทุนจากเงินลงทุนในหุ้น (ตีมูลค่า + ตามวิธีส่วนได้เสีย) ~$138M ก่อนภาษี / ~$122M สุทธิภาษี (~−$0.09/หุ้น) และประโยชน์ภาษีครั้งเดียวจากการกลับรายการ valuation allowance $63M (~+$0.05/หุ้น) — ทั้งสองรายการอยู่ใต้กำไรจากการดำเนินงาน · ตัดผลเงินลงทุนออก กำไรสุทธิ $584M (~$0.45/หุ้น · ปีก่อน $367M) ตัดภาษีครั้งเดียวออกด้วยเหลือราว $521M (~$0.40/หุ้น) · กำไรจากการดำเนินงานจริง $568M"
          }
        ]
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-08",
            "fy": "FY2026",
            "eps": 1.9,
            "revenue": 15.23
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 1.89,
            "revenue": 15.32
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "โต low-thirties % YoY (ตีความ ~30-33% → จุดกึ่งกลาง ~31.5% ≈ ~$3.74B จากฐาน Q3'25 $2.844B)",
            "actual": "$3.742B (+31.6% YoY · บริษัทปัดเป็น 32%)",
            "result": "inline",
            "magnitudePct": 0.1
          },
          {
            "quarter": "Q3 2026",
            "metric": "margin",
            "guided": "FCF margin high-teens ถึง low-twenties (ตีความ ~17-23% → จุดกึ่งกลาง ~20%)",
            "actual": "FCF margin 21.8% ($816M)",
            "result": "beat",
            "magnitudePct": 9
          },
          {
            "quarter": "Q3 2026",
            "metric": "eps",
            "guided": "Shopify ไม่ให้ guidance EPS (ให้เฉพาะอัตราการเติบโตรายได้/gross profit · opex % ของรายได้ · SBC · FCF margin)",
            "actual": "GAAP $0.36 · non-GAAP $0.49",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "โต high-twenties % YoY (≈$3.43-3.46B จากฐาน Q2'25 $2.68B)",
            "actual": "~$3.583B (+34% YoY)",
            "result": "beat",
            "magnitudePct": 4
          },
          {
            "quarter": "Q2 2026",
            "metric": "margin",
            "guided": "FCF margin mid-teens (ตีความ ~14-16% → จุดกึ่งกลาง ~15%)",
            "actual": "FCF margin 18.3% ($654M)",
            "result": "beat",
            "magnitudePct": 21.7
          },
          {
            "quarter": "Q2 2026",
            "metric": "eps",
            "guided": "Shopify ไม่ให้ guidance EPS (ให้เฉพาะอัตราการเติบโตรายได้/gross profit · opex % ของรายได้ · SBC · FCF margin)",
            "actual": "GAAP $1.16 (รวมกำไรตีมูลค่าเงินลงทุน)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "Q1 2026",
            "metric": "revenue",
            "guided": "โต low-thirties % YoY (ตีความ ~30-33% → จุดกึ่งกลาง ~31.5% ≈ ~$3.10B จากฐาน Q1'25 $2.36B)",
            "actual": "$3.170B (+34% YoY)",
            "result": "beat",
            "magnitudePct": 2.1
          },
          {
            "quarter": "Q1 2026",
            "metric": "margin",
            "guided": "FCF margin low-to-mid teens ต่ำกว่า Q1'25 เล็กน้อย (ตีความ ~12-15% → จุดกึ่งกลาง ~13.5%)",
            "actual": "FCF margin 15.0% ($476M)",
            "result": "beat",
            "magnitudePct": 11.3
          },
          {
            "quarter": "Q1 2026",
            "metric": "eps",
            "guided": "Shopify ไม่ให้ guidance EPS (ให้เฉพาะอัตราการเติบโตรายได้/gross profit · opex % ของรายได้ · SBC · FCF margin)",
            "actual": "GAAP −$0.45 (ขาดทุนตีมูลค่าเงินลงทุน)",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 15.32,
            "eps": 1.89,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 19.34,
            "eps": 2.45,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Shopify ให้ guidance เป็นคำบรรยายอัตราการเติบโต (เช่น 'low-thirties') ไม่ใช่ช่วงตัวเงินและไม่ให้ EPS จึงแปลงเป็นช่วงตัวเลขเองตามที่ระบุในแต่ละแถว (เป็นการตีความ) — Q3 2026 รายได้ตรงกรอบพอดี (inline) ขณะที่ FCF margin 22% เกินกรอบ และ opex 32.4% ต่ำกว่ากรอบ 33-34% ส่วนแถว Q1-Q2 2026 ที่เพิ่มยืนยันจาก press release บน SEC แล้ว · consensus FY2026 $15.32B / EPS $1.89 non-GAAP (stockanalysis ระบุฐานชัด ตรงกับ Yahoo 38 นักวิเคราะห์) ส่วน FY2027 $19.34B / EPS ~$2.45 (Yahoo 39-48 นักวิเคราะห์ ใกล้ Finviz $2.44) ไม่ระบุฐานและ Zacks ให้ต่ำกว่ามาก ($1.84) จึงให้ความมั่นใจระดับกลาง ส่วน FY2028 มีเพียง Zacks EPS $2.80 จาก 4 นักวิเคราะห์โดยไม่มีรายได้ จึงยังไม่บันทึก"
      }
    },
    "DDOG": {
      "ticker": "DDOG",
      "name": "Datadog, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "Datadog คือชั้น observability ที่ระบบคลาวด์สมัยใหม่ต้องมี — ยิ่งองค์กรย้ายงานขึ้นคลาวด์และเริ่มรันงาน AI มากเท่าไหร่ จำนวนสิ่งที่ต้องเฝ้าดูก็ยิ่งเพิ่มตามโดยอัตโนมัติ รายได้จึงโตตามปริมาณการใช้งานของลูกค้าโดยไม่ต้องขายใหม่ทุกครั้ง และการขายผลิตภัณฑ์ตัวที่สองสามสี่ให้ลูกค้าเดิมคือเครื่องยนต์หลักที่ทำให้เติบโตเร็วกว่าตลาด — จุดที่ต้องระวังคือรายได้แบบนับตามการใช้งานเป็นดาบสองคม เมื่อลูกค้ารายใหญ่ปรับลดการใช้ รายได้หายทันทีโดยไม่ต้องยกเลิกสัญญา · Q3 2026 เห็นทั้งสองด้านพร้อมกัน: รายได้โต 35% และกำไรดำเนินงาน non-GAAP ขึ้นเป็น 28% ขณะที่ลูกค้ากลุ่มที่ไม่ใช่ AI เร่งตัวเป็นไตรมาสที่ห้าติด แต่ลูกค้ารายใหญ่ที่สุดลดการใช้จริง และ guide Q4 ที่สมมติให้รายนี้ใช้แค่ขั้นต่ำตามสัญญาทำให้การเติบโตที่แนะไว้ชะลอเหลือ +25-26%",
        "pillars": [
          "แพลตฟอร์มเดียวจบ — ลูกค้าที่ใช้ 4 ผลิตภัณฑ์ขึ้นไปเพิ่มเป็น 61% (จาก 54% ปีก่อน) · 6 ตัวขึ้นไป 41% (จาก 31%) · 10 ตัวขึ้นไป 16% (จาก 8%) ยิ่งใช้หลายตัวยิ่งย้ายออกยาก",
          "รายได้นับตามการใช้งาน (usage-based) — เมื่อ workload ของลูกค้าโต รายได้โตเองโดยไม่ต้องเจรจาสัญญาใหม่ สะท้อนเป็น net revenue retention ระดับ low 120s ต่อเนื่อง และรายได้จากลูกค้าที่ไม่ใช่ AI เร่งขึ้นเป็นไตรมาสที่ห้าติด (โต high-20s%)",
          "คลื่น AI เป็นตัวเร่งชั้นใหม่ — ลูกค้ากลุ่ม AI-native กว่า 850 ราย (จาก ~750 ใน Q2 · 39 รายจ่ายเกิน $1M/ปี) และบริษัท AI ชั้นนำ 15 อันดับแรกเป็นลูกค้าทั้งหมด บวกผลิตภัณฑ์สาย LLM Observability / Bits AI / AI Guard และโมเดลของตัวเอง Scout ที่ขายเข้าฐานลูกค้าเดิมได้ทันที (ราวหนึ่งในสามของลูกค้าใช้ผลิตภัณฑ์ AI แล้ว)",
          "ฐานลูกค้าองค์กรแน่น — ลูกค้า ARR เกิน $100k มี ~4,860 ราย (จาก ~4,060 ปีก่อน) คิดเป็น ~91% ของ ARR ทั้งหมด และ gross retention ระดับ mid-to-high 90s",
          "กระแสเงินสดแข็งแรงกว่ากำไรบัญชีมาก — FCF ย้อนหลัง 12 เดือน ~$1.1B (margin ~26%) บนงบดุลที่มีเงินสดสุทธิ ~$3.9B ทำให้ลงทุนต่อได้โดยไม่ต้องพึ่งตลาดทุน"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+35% YoY (Q3 2026 — $1.197B) ทะลุจุดกึ่งกลาง guide 5.0% · guide Q4 $1.19-1.20B = +25-26% (สมมติลูกค้ารายใหญ่ที่สุดใช้แค่ขั้นต่ำตามสัญญา) · ทั้งปี $4.515-4.525B ≈ +32%",
          "trend": "down",
          "score": 78,
          "impact": "positive",
          "why": "Q3 ยังโต 35% ใกล้เคียง +36% ใน Q2 และทะลุจุดกึ่งกลาง guidance เป็นไตรมาสที่สี่ติดในระดับ 4-5% · ลูกค้าที่ไม่ใช่ AI เร่งขึ้นเป็นไตรมาสที่ห้าติด (high-20s%) แปลว่าฐานธุรกิจหลักไม่ได้อ่อนลง · แต่ guide Q4 แทบไม่โตจาก Q3 เพราะสมมติให้ลูกค้ารายใหญ่ที่สุดจ่ายแค่ขั้นต่ำตามสัญญา (ถ้าไม่นับรายนี้บริษัทบอกว่าโต low-to-mid 30s%) — ต่อให้ทะลุ guide 4-5% ตามรูปแบบเดิม การเติบโตไตรมาสหน้าก็ยังชะลอลงจากระดับ 35%"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 2026: GAAP EPS $0.32 (ปีก่อน $0.10 · Q2 $0.12) · non-GAAP $0.81 (+47% YoY · guide $0.63-0.65) · guide ทั้งปี non-GAAP $2.73-2.75 (จาก $2.50-2.54) · guide Q4 non-GAAP $0.69-0.71",
          "trend": "up",
          "score": 65,
          "impact": "neutral",
          "why": "ดีขึ้นชัดทั้งสองฐาน — GAAP EPS เพิ่มเป็นสามเท่าเทียบปีก่อนเพราะกำไรจากการดำเนินงานตามบัญชีขึ้นเป็น $75M (จาก −$6M ปีก่อน) และ non-GAAP ชนะ guidance ถึง 27% · แต่กำไร GAAP ยังบาง ($0.32 เทียบ non-GAAP $0.81 ส่วนต่างเกือบทั้งหมดคือ SBC) และ guide Q4 non-GAAP $0.69-0.71 ต่ำกว่า Q3 เพราะ margin จะกลับลงมาราว 24% เมื่อลูกค้ารายใหญ่ที่สุดจ่ายแค่ขั้นต่ำ จึงยังเร็วไปที่จะถือว่ากำไรบัญชีโตอย่างสม่ำเสมอแล้ว"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026 FCF $251M (~21% ของรายได้ · Q2 $279M หรือ ~25%) · OCF $290M · FCF ย้อนหลัง 12 เดือน margin ~26% (~$1.1B)",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "ยังเป็นจุดแข็งที่สุดของงบ — โมเดล SaaS เก็บเงินล่วงหน้า บวก capex ต่ำ (~3-4% ของรายได้) ทำให้แปลงรายได้เป็นเงินสดได้ราวหนึ่งในสี่ ต่างจากกำไรบัญชีที่ยังบางอย่างสิ้นเชิง · ไตรมาสนี้ FCF ลดลง QoQ และโตช้ากว่ารายได้ (~+19% YoY ตามสูตร OCF ลบ capex ในตาราง เทียบรายได้ +35%) จึงให้ทิศทางทรงตัว ไม่ใช่ดีขึ้น"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "GAAP operating margin 6.2% (Q2 0.5%) · non-GAAP 28% (Q2 23% · guide Q3 ~23%) · gross margin non-GAAP 81.2% (Q2 79.6%) · guide Q4 non-GAAP operating margin ~24%",
          "trend": "up",
          "score": 62,
          "impact": "neutral",
          "why": "Q3 คือไตรมาสที่ GAAP operating margin สูงที่สุดในตารางย้อนหลัง และ gross margin ฟื้นกลับเหนือ 80% หลังลดลงใน Q2 · แต่ช่องว่าง ~22 จุดระหว่าง GAAP กับ non-GAAP ยังเป็นค่าหุ้นพนักงานเกือบทั้งหมด (SBC $237M ≈ 20% ของรายได้) และ margin ที่พุ่งขึ้นไตรมาสนี้มีส่วนจากรายได้ที่ทะลุเป้า — guide Q4 ให้ non-GAAP กลับมาราว 24% ทั้งปี 24% จึงยังไม่ใช่ระดับใหม่ที่ยืนได้"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "GAAP operating income ~$75M บนรายได้ $1.20B (6.2%) — ดีที่สุดในรอบหลายปีแต่ผลตอบแทนทางบัญชียังต่ำ",
          "trend": "up",
          "score": 52,
          "impact": "neutral",
          "why": "กำไรจากการดำเนินงานตามบัญชีเพิ่งขยับจากเกือบศูนย์ขึ้นมาเป็นหลักสิบล้านดอลลาร์ต่อไตรมาส ผลตอบแทนจริงยังอยู่ในรูปกระแสเงินสด (~$1.1B ต่อปี) มากกว่ากำไร · ทิศทางดีขึ้นตามสเกล แต่บริษัทยังเลือกเอากำไรไปลงทุนต่อ และ guide Q4 ให้ margin กลับลง จึงยังตัดสินความสามารถในการทำกำไรระยะยาวไม่ได้"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและหลักทรัพย์ ~$5.23B (30 ก.ย. 2026 จาก ~$5.0B ใน Q2) — เงินสดสุทธิหลังหักหนี้ ~$3.9B",
          "trend": "up",
          "score": 90,
          "impact": "positive",
          "why": "งบดุลแข็งแรงมากและยังสร้างเงินสดเพิ่มทุกไตรมาส ทำให้ทนช่วงที่ลูกค้ารายใหญ่ลดการใช้งานได้สบาย และมีกระสุนสำหรับซื้อกิจการเสริมโดยไม่ต้องออกหุ้นใหม่"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้รวม ~$1.31B — หลักคือหุ้นกู้แปลงสภาพ 0.00% ครบกำหนด ธ.ค. 2029 มูลค่า $1.0B (ไม่เข้าเงื่อนไขแปลงใน Q3) บวกหนี้สัญญาเช่า ~$0.32B",
          "trend": "flat",
          "score": 78,
          "impact": "positive",
          "why": "หนี้น้อยกว่าเงินสดมาก จึงไม่ใช่ความเสี่ยงทางการเงิน · ดอกเบี้ย 0% แปลว่าแทบไม่มีต้นทุนทางการเงิน แต่ต้องจำไว้ว่าหุ้นกู้แปลงสภาพคือการเจือจางที่รอเกิดถ้าราคาหุ้นขึ้นถึงระดับแปลง — เป็นภาระต่อผู้ถือหุ้นในรูปหุ้น ไม่ใช่ในรูปเงิน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 375 ล้านหุ้น (Q3 2026 จาก 371 ล้านใน Q2 · ~4-5% YoY) · guide Q4 379 ล้านหุ้น · SBC $237M ต่อไตรมาส (~20% ของรายได้) · หุ้นที่ออกแล้ว ~361 ล้านหุ้น (28 ต.ค. 2026)",
          "trend": "down",
          "score": 30,
          "impact": "negative",
          "why": "จุดอ่อนที่สุดของหุ้นตัวนี้และยังไม่ดีขึ้น — ไม่มีโครงการซื้อหุ้นคืน จำนวนหุ้น diluted เพิ่มราว 1% ต่อไตรมาสจากค่าตอบแทนพนักงานที่จ่ายเป็นหุ้น (SBC เพิ่มจาก $220M เป็น $237M ใน Q3) บวกหุ้นที่ออกจ่ายค่าซื้อกิจการ และยังมีหุ้นกู้แปลงสภาพรออยู่อีก ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนต่อเนื่องแม้ธุรกิจจะดี"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ไม่มีปันผล ไม่มี buyback — เงินสดเกือบทั้งหมดกลับเข้า R&D และทีมขาย · ซื้อกิจการเล็ก 3 ดีลใน 9 เดือนแรกปี 2026 รวม ~$192M (จ่ายเป็นหุ้นบางส่วน ~0.8 ล้านหุ้น) · capex ~3-4% ของรายได้",
          "trend": "flat",
          "score": 60,
          "impact": "neutral",
          "why": "เหมาะกับบริษัทที่ยังอยู่ในช่วงขยายตลาด และการลงทุนก็เห็นผลจริง (ลูกค้าที่ใช้ 10 ผลิตภัณฑ์ขึ้นไปเพิ่มจาก 8% เป็น 16% ในปีเดียว) แต่เมื่อ FCF ~$1.1B ต่อปีแล้วและยังไม่มีอะไรมาชดเชยการเจือจางจาก SBC เลย ถือเป็นช่องว่างที่ผู้ถือหุ้นระยะยาวควรจับตา"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคาปิด $188.72 (4 พ.ย. 2026 · −14.4% วันงบ) · mcap ~$68B · EV ~$64B ≈ ~15x รายได้ย้อนหลัง 12 เดือน · forward P/E ~69x จากจุดกึ่งกลาง guide non-GAAP FY2026 $2.74 / ~63x จาก consensus FY2027 $2.98 · trailing GAAP P/E ~263x",
          "trend": "up",
          "score": 33,
          "impact": "negative",
          "why": "ยังแพงไม่ว่าจะวัดด้วยฐานไหน — ราว 63-69 เท่าของกำไร non-GAAP ที่ยังไม่นับ SBC และกว่า 260 เท่าของกำไร GAAP จริง · ที่ให้คะแนนสูงขึ้นจากรอบก่อนเพราะราคาลงมาแรง: ร่วง ~21% ในสัปดาห์ก่อนงบแล้วลงอีก 14% วันประกาศ เหลือต่ำกว่าราคาปิดสูงสุด $293.26 (9 ต.ค. 2026) ราว 36% ขณะที่กำไร non-GAAP ทั้งปีถูกยกขึ้น ~9% multiple จึงหดลงชัด แต่ยังต้องการให้บริษัทโต 25-30% ต่อเนื่องอีกหลายปี"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 78,
        "recurringPct": 95,
        "note": "คุณภาพรายได้สูงในเชิงความสม่ำเสมอ — เกือบทั้งหมดเป็น subscription ที่นับตามการใช้งาน ลูกค้า ARR เกิน $100k จำนวน ~4,860 ราย คิดเป็น ~91% ของ ARR และ gross revenue retention อยู่ระดับ mid-to-high 90s แปลว่าแทบไม่มีใครเลิกใช้ ส่วน net revenue retention ระดับ low 120s สะท้อนว่าลูกค้าเดิมใช้จ่ายเพิ่มขึ้นเองทุกปี · RPO $3.85B (+38% YoY) · จุดอ่อนสำคัญคือความกระจุกตัวซึ่งเห็นเป็นตัวเลขแล้วใน Q3 2026 — ลูกค้ารายใหญ่ที่สุด (บริษัท AI ที่ไม่เปิดชื่อ ใช้ 17 ผลิตภัณฑ์) ลดการใช้งานแต่ยังสูงกว่าขั้นต่ำตามสัญญา และ guide Q4 ที่สมมติให้รายนี้จ่ายแค่ขั้นต่ำทำให้การเติบโตที่แนะไว้เหลือ +25-26% ขณะที่ไม่นับรายนี้บริษัทบอกว่าโต low-to-mid 30s% · บริษัทยังต่อสัญญาล่วงหน้ากับลูกค้า AI รายใหญ่บางรายด้วย commit ที่สูงขึ้นแลกราคาต่อหน่วยที่ดีขึ้นให้ลูกค้า ซึ่งกดรายได้ระยะสั้นเล็กน้อย · หมายเหตุ: Datadog ไม่ได้แบ่งรายได้เป็น segment ผลิตภัณฑ์ ตัวเลขด้านล่างจึงเป็นการแบ่งตามภูมิภาคซึ่งเป็นชุดเดียวที่บริษัทรายงานจริงใน 10-Q",
        "segments": [
          {
            "name": "อเมริกาเหนือ",
            "sharePct": 74,
            "growthNote": "$881M ใน Q3 2026 (+39% YoY) — ตลาดหลัก ฐานลูกค้าองค์กรใหญ่และกลุ่ม AI-native เกือบทั้งหมดอยู่ที่นี่",
            "trend": "up"
          },
          {
            "name": "นอกอเมริกาเหนือ",
            "sharePct": 26,
            "growthNote": "$316M ใน Q3 2026 (+25% YoY) — สัดส่วนลดลงจาก ~27% เพราะฝั่งอเมริกาเหนือโตเร็วกว่า ไม่ใช่เพราะต่างประเทศหดตัว",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 82,
        "items": [
          {
            "item": "ลูกค้ากลุ่ม AI-native เป็นคลื่นรายได้ชั้นใหม่",
            "status": "executing",
            "evidence": "กว่า 850 รายใช้งานอยู่ (จาก ~750 ใน Q2) — ในนั้น 39 รายจ่ายเกิน $1M/ปี (จาก 31) และบริษัท AI ชั้นนำ 15 อันดับแรกเป็นลูกค้าทั้งหมด · เป็นกลุ่มที่โตเร็วที่สุดแต่ก็ผันผวนที่สุด ลูกค้ารายใหญ่ที่สุดซึ่งเป็นบริษัท AI ลดการใช้งานจริงใน Q3 และ guide Q4 สมมติให้จ่ายแค่ขั้นต่ำตามสัญญา"
          },
          {
            "item": "ผลิตภัณฑ์สาย AI Observability (LLM Observability, AI Guard, Data Observability, Agent Console)",
            "status": "executing",
            "evidence": "ราวหนึ่งในสามของลูกค้าทั้งหมด (~33,500 ราย) ใช้ผลิตภัณฑ์ AI อย่างน้อยหนึ่งตัวแล้ว · ต่อยอดจากชุดกว่า 100 ฟีเจอร์ในงาน DASH 2026 — ขายเข้าฐานลูกค้าเดิมได้ทันทีโดยไม่ต้องหาลูกค้าใหม่"
          },
          {
            "item": "Bits AI และโมเดลของตัวเอง Scout",
            "status": "on-track",
            "evidence": "ผู้บริหารเรียก Bits AI ว่าเป็นผลิตภัณฑ์ที่ลูกค้านำไปใช้เร็วที่สุดในประวัติบริษัท และเปิดตัว Scout 1.0 โมเดลเฉพาะทางสำหรับสืบสวนปัญหาในระบบจริง ซึ่งบริษัทระบุว่าทำได้เทียบเท่าหรือดีกว่าโมเดลแนวหน้าในงานนี้ด้วยต้นทุนต่ำกว่ามาก · ยังไม่มีตัวเลขรายได้แยกให้เห็น"
          },
          {
            "item": "ขายผลิตภัณฑ์เพิ่มให้ลูกค้าเดิม (land-and-expand)",
            "status": "executing",
            "evidence": "ลูกค้าที่ใช้ 4 ผลิตภัณฑ์ขึ้นไป 61% (จาก 54% ปีก่อน) · 6 ตัวขึ้นไป 41% (จาก 31%) · 10 ตัวขึ้นไป 16% (จาก 8%) · ชุด Infrastructure Monitoring เพียงชุดเดียว ARR เกิน $2B โต mid-30s% — หลักฐานตรงที่สุดว่าแพลตฟอร์มเดียวจบใช้ได้จริง"
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
            "note": "เป็นผู้นำ observability ยุคคลาวด์ ลูกค้า ARR เกิน $100k เพิ่มจาก ~4,060 เป็น ~4,860 รายในหนึ่งปี รายได้โตเร็วกว่าคู่แข่งเดิมอย่างชัดเจน และ Q3 2026 ถูก Gartner ระบุเป็น \"Company to Beat\" ด้าน observability กับเป็น Leader ใน Forrester Wave สาย AIOps ปีที่สองติด"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "ออกผลิตภัณฑ์เร็วผิดปกติสำหรับบริษัทขนาดนี้ — กว่า 100 ฟีเจอร์ในงานเดียว เข้าสาย AI observability ก่อนคู่แข่งส่วนใหญ่ และเริ่มสร้างโมเดลของตัวเอง (Scout 1.0) แทนการพึ่งโมเดลภายนอกอย่างเดียว"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "ทะลุจุดกึ่งกลาง guidance รายได้ตัวเองสี่ไตรมาสติดในระดับ 4-5% ทุกครั้ง (Q3 2026 +5.0%) และ non-GAAP EPS ทะลุ 7-27% สะท้อนทั้งฝีมือและการตั้งเป้าแบบระมัดระวัง"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "strengthening",
            "note": "สัดส่วนลูกค้าที่ใช้ 10 ผลิตภัณฑ์ขึ้นไปเพิ่มจาก 8% เป็น 16% ในปีเดียว — ยิ่งผูกหลายตัว การย้ายยิ่งกลายเป็นโครงการใหญ่ระดับองค์กร ไม่ใช่แค่เปลี่ยนเครื่องมือ"
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
            "note": "gross retention ระดับ mid-to-high 90s แปลว่าแทบไม่มีใครเลิกใช้ แต่รายได้แบบนับตามการใช้งานทำให้ลูกค้า 'ลดการใช้' ได้โดยไม่ต้องเลิกสัญญา — ลูกค้ารายใหญ่ที่สุดลดการใช้จริงใน Q3 2026 แม้ยังสูงกว่าขั้นต่ำตามสัญญา และการต่อสัญญาล่วงหน้ากับลูกค้า AI รายใหญ่ก็มาพร้อมราคาต่อหน่วยที่ลดลง"
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
        "verdict": "จัดสรรทุนแบบบริษัทที่ยังโต — เงินสดเกือบทั้งหมดกลับเข้า R&D และทีมขาย ซึ่งเห็นผลจริงจากการขายผลิตภัณฑ์เพิ่มให้ลูกค้าเดิม แต่เมื่อ FCF ~$1.1B ต่อปีและเงินสดสุทธิ ~$3.9B แล้วยังไม่มีทั้งปันผลและ buyback มาชดเชยการเจือจางจากค่าหุ้นพนักงานเลย นี่คือช่องว่างชัดเจนที่สุดของนโยบายทุน",
        "items": [
          {
            "label": "R&D",
            "current": "ลงทุนหนักต่อเนื่อง — Q3 2026 ค่า R&D ตามบัญชี ~$492M (~41% ของรายได้ รวม SBC) · ออก Scout 1.0 และขยาย Bits AI",
            "assessment": "good",
            "why": "เป็นที่มาของการขายผลิตภัณฑ์ตัวที่สองสามสี่ให้ลูกค้าเดิม ซึ่งวัดผลได้จริงจากสัดส่วนลูกค้าที่ใช้ 10 ตัวขึ้นไปเพิ่มเท่าตัวในปีเดียว (8% → 16%)"
          },
          {
            "label": "ทีมขายและการตลาด",
            "current": "ขยายทีมต่อเนื่องเพื่อดันลูกค้าองค์กรขนาดใหญ่ — ลูกค้าใหม่มีส่วน ~30% ของการเติบโตรายได้ YoY ใน Q3",
            "assessment": "good",
            "why": "ลูกค้า ARR เกิน $100k เพิ่มจาก ~4,060 เป็น ~4,860 รายในปีเดียว และกลุ่มนี้คิดเป็น ~91% ของ ARR — การลงทุนตรงจุด"
          },
          {
            "label": "ซื้อหุ้นคืนและปันผล",
            "current": "ไม่มีทั้งสองอย่าง",
            "assessment": "poor",
            "why": "มี FCF ~$1.1B ต่อปีและเงินสดสุทธิ ~$3.9B แต่ไม่มีอะไรมาหักล้างหุ้นที่เพิ่มจาก SBC (~$237M ต่อไตรมาส) เลย ผู้ถือหุ้นเดิมจึงถูกเจือจางต่อเนื่องทั้งที่บริษัทมีเงินพอจะหยุดมันได้"
          },
          {
            "label": "การซื้อกิจการ",
            "current": "ซื้อของเล็ก ๆ เสริมผลิตภัณฑ์ — 3 ดีลใน 9 เดือนแรกปี 2026 รวม ~$192M (เงินสด ~$99M + หุ้น ~0.8 ล้านหุ้น) ไม่เคยทำดีลใหญ่",
            "assessment": "good",
            "why": "กลยุทธ์ซื้อเทคโนโลยีมาต่อยอดแล้วขายผ่านช่องทางเดิม มีความเสี่ยงต่ำและไม่ทำให้งบดุลเสียหาย แม้บางส่วนจ่ายเป็นหุ้นซึ่งเพิ่มการเจือจางเล็กน้อย"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและหลักทรัพย์ ~$5.23B · หนี้ ~$1.31B (หุ้นกู้แปลงสภาพ 0% ปี 2029 + สัญญาเช่า) · เงินสดสุทธิ ~$3.9B",
            "assessment": "good",
            "why": "แข็งแรงพอจะผ่านช่วงลูกค้าชะลอการใช้งานได้โดยไม่ต้องระดมทุน และดอกเบี้ยรับจากเงินก้อนนี้คือสาเหตุที่กำไรสุทธิสูงกว่ากำไรจากการดำเนินงานตามบัญชีมาก"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "ราคาปิด $188.72 (4 พ.ย. 2026) mcap ~$68B EV ~$64B ≈ ~15x รายได้ย้อนหลัง 12 เดือน · forward P/E ~69x จากจุดกึ่งกลาง guide non-GAAP FY2026 $2.73-2.75 และ ~63x จาก consensus non-GAAP FY2027 $2.98 (Yahoo ก่อนปรับหลังงบ) · trailing GAAP P/E ~263x (EPS ย้อนหลัง $0.72) — แพงทั้งสองฐาน · ราคาร่วง ~21% ในสัปดาห์ก่อนงบ ($280.82 เมื่อ 27 ต.ค. → $220.52 เมื่อ 3 พ.ย.) แล้วลงอีก 14.4% ในวันงบทั้งที่รายได้และกำไรทะลุเป้า เพราะ guide Q4 ที่สมมติให้ลูกค้ารายใหญ่ที่สุดจ่ายแค่ขั้นต่ำตามสัญญา รวมแล้วต่ำกว่าราคาปิดสูงสุด $293.26 (9 ต.ค.) ราว 36% · เป้าเฉลี่ยนักวิเคราะห์ ~$296 (47 ราย ณ 4 พ.ย.) ยังไม่สะท้อนการปรับลดหลังงบ (เช่น BTIG ลดเป้าเป็น $260) · multiple หดลงมากแล้วแต่ระดับนี้ยังต้องการให้บริษัทโต 25-30% ต่อเนื่องอีกหลายปี margin of safety จึงยังบาง"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026)",
          "prev": "$1.121B (+36% YoY) — ทะลุจุดกึ่งกลาง guide 4.3%",
          "now": "$1.197B (+35% YoY) — ทะลุจุดกึ่งกลาง guide 5.0% · ลูกค้าที่ไม่ใช่ AI เร่งขึ้นเป็นไตรมาสที่ห้าติด (high-20s%)",
          "direction": "positive"
        },
        {
          "metric": "ลูกค้ารายใหญ่ที่สุดและ guide ไตรมาสถัดไป",
          "prev": "บริษัทเตือนว่าจะลดการใช้งานตั้งแต่ Q3 · guide Q3 $1.135-1.145B (+28-29%)",
          "now": "ลดการใช้จริงใน Q3 แต่ยังสูงกว่าขั้นต่ำตามสัญญา · guide Q4 $1.19-1.20B (+25-26% แทบไม่โต QoQ) สมมติจ่ายแค่ขั้นต่ำ — ไม่นับรายนี้โต low-to-mid 30s%",
          "direction": "negative"
        },
        {
          "metric": "อัตรากำไรจากการดำเนินงาน",
          "prev": "GAAP 0.5% · non-GAAP 23% · gross margin non-GAAP 79.6%",
          "now": "GAAP 6.2% · non-GAAP 28% (กำไร $334M เทียบ guide $260-270M) · gross margin 81.2% — แต่ guide Q4 non-GAAP กลับมา ~24%",
          "direction": "positive"
        },
        {
          "metric": "กำไรต่อหุ้นและ guidance ทั้งปี",
          "prev": "GAAP $0.12 · non-GAAP $0.65 · guide ปี 2026 รายได้ $4.45-4.47B / non-GAAP EPS $2.50-2.54",
          "now": "GAAP $0.32 · non-GAAP $0.81 (guide $0.63-0.65) · guide ปี 2026 รายได้ $4.515-4.525B / non-GAAP EPS $2.73-2.75",
          "direction": "positive"
        },
        {
          "metric": "ลูกค้าและการใช้หลายผลิตภัณฑ์",
          "prev": "ARR เกิน $100k ~4,720 ราย · ใช้ 4 ตัวขึ้นไป 58% · 10 ตัวขึ้นไป 13% · AI-native ~750 ราย (31 รายเกิน $1M)",
          "now": "ARR เกิน $100k ~4,860 ราย · 4 ตัวขึ้นไป 61% · 10 ตัวขึ้นไป 16% · AI-native กว่า 850 ราย (39 รายเกิน $1M)",
          "direction": "positive"
        },
        {
          "metric": "ราคาหุ้น",
          "prev": "$273.85 ณ สิ้นไตรมาส (30 ก.ย.) · ปิดสูงสุด $293.26 (9 ต.ค.)",
          "now": "$188.72 (4 พ.ย.) — ร่วง ~21% ในสัปดาห์ก่อนงบ แล้วลงอีก 14.4% วันงบ รวม ~36% จากจุดสูงสุด",
          "direction": "negative"
        }
      ],
      "risks": [
        "รายได้นับตามการใช้งานเป็นดาบสองคม — ลูกค้าลดการใช้ได้ทันทีโดยไม่ต้องยกเลิกสัญญา ลูกค้ารายใหญ่ที่สุดลดการใช้จริงใน Q3 2026 และ guide Q4 ที่สมมติให้จ่ายแค่ขั้นต่ำตามสัญญาทำให้การเติบโตที่แนะไว้ตกจาก +35% เหลือ +25-26% (ไม่นับรายนี้ low-to-mid 30s%) ทั้งที่ gross retention ยังอยู่ระดับ mid-to-high 90s — ลูกค้ารายเดียวขยับตัวเลขการเติบโตทั้งบริษัทได้หลายจุด",
        "การกระจุกตัวของลูกค้า AI — กลุ่ม AI-native (กว่า 850 ราย) เป็นส่วนที่โตเร็วที่สุดแต่ผันผวนที่สุด บริษัทเหล่านี้หลายรายยังขาดทุนและอยู่ระหว่างคุมต้นทุน หากหันไปใช้เครื่องมือของตัวเองหรือของผู้ให้บริการคลาวด์ รายได้ก้อนนี้หายได้เร็วพอกับตอนที่มันโตขึ้นมา และการต่อสัญญาล่วงหน้าด้วยราคาต่อหน่วยที่ดีขึ้นให้ลูกค้าก็กดรายได้ระยะสั้นอยู่แล้ว",
        "ค่าหุ้นพนักงานสูงมากจนบิดภาพกำไร — SBC ~$237M ต่อไตรมาส (~20% ของรายได้) คือช่องว่างเกือบทั้งหมดระหว่าง GAAP operating margin 6% กับ non-GAAP 28% และบริษัทไม่มี buyback มาหักล้าง จำนวนหุ้น diluted จึงเพิ่มราว 1% ต่อไตรมาส ตัวเลข non-GAAP ที่ตลาดใช้ตั้งราคาจึงมองข้ามต้นทุนจริงก้อนใหญ่",
        "ราคาแพงบนความคาดหวังสูง — แม้ลงมา ~36% จากจุดสูงสุด ยังเทรดราว 63-69 เท่าของกำไร non-GAAP และกว่า 260 เท่าของกำไร GAAP หากการเติบโตชะลอต่ำกว่า 25% multiple จะหดแรงกว่าพื้นฐานที่แย่ลงจริง อย่างที่เห็นจากการร่วง 19% วันงบ Q2 และ 14% วันงบ Q3 ทั้งที่งบทะลุเป้าทั้งสองครั้ง",
        "การแข่งขันด้านราคาและต้นทุนงาน AI — OpenTelemetry ทำให้ย้ายข้อมูลออกง่ายขึ้น ผู้ให้บริการคลาวด์แถมเครื่องมือพื้นฐานให้ฟรี และคู่แข่งอย่าง Grafana ชูโมเดลต้นทุนต่ำ ลูกค้ารายใหญ่ที่บิลบานปลายจึงมีทางเลือกกดดันราคาเสมอ · gross margin เคยถูกงาน AI กดลงเหลือ 79.6% ใน Q2 ก่อนฟื้นเป็น 81.2% ใน Q3 ถ้าสัดส่วนงาน AI โตต่อโดยไม่ปรับราคา กำไรขั้นต้นอาจถูกกดอีก"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 1.197,
            "epsAdj": 0.32,
            "opMarginPct": 6.2,
            "fcfB": 0.279,
            "priceQEnd": 273.85,
            "epsNote": "GAAP $0.32 เทียบ non-GAAP $0.81 — ส่วนต่าง ~$0.49/หุ้นเกือบทั้งหมดคือค่าหุ้นพนักงาน (SBC $237M ในไตรมาส) ซึ่งเป็นรายจ่ายต่อเนื่องทุกไตรมาส ไม่ใช่รายการพิเศษครั้งเดียว เวลาเทียบกับ consensus ต้องดูให้ตรงฐาน"
          }
        ],
        "notes": "ปีบัญชีของ Datadog ตรงกับปีปฏิทิน (สิ้นสุด 31 ธ.ค.) และไตรมาสจบสิ้นเดือนปฏิทินทุกไตรมาส · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งต่ำกว่าตัวเลข non-GAAP ที่บริษัทและนักวิเคราะห์ใช้มาก (เช่น Q2 2026: GAAP $0.12 vs non-GAAP $0.65 · Q3 2026: GAAP $0.32 vs non-GAAP $0.81) เพราะ GAAP รวมค่าหุ้นพนักงานไว้ด้วย · สังเกตว่า FY2025 กำไรต่อหุ้น GAAP *ลดลง* เหลือ $0.31 จาก $0.52 ใน FY2024 ทั้งที่รายได้โต 28% เพราะกำไรจากการดำเนินงานพลิกเป็นลบ (-$42.8M) กำไรสุทธิที่ยังเป็นบวกมาจากดอกเบี้ยรับของเงินสดราว $5B ไม่ใช่จากธุรกิจหลัก · operating margin ในตารางมาจากแหล่งเดียวกันทั้งชุด (stockanalysis) ซึ่งต่างจากตัวเลขบริษัทเล็กน้อยในบางไตรมาส (Q2 2026: ตาราง 0.7% จาก operating income $7.5M vs บริษัทรายงาน $5.5M หรือ ~0.5% · Q3 2026 ตรงกันที่ $74.7M = 6.2%) · FCF ในตารางนี้คิดแบบ OCF ลบ capex จากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ ซึ่งสูงกว่าตัวเลข FCF ที่บริษัทรายงานเองเล็กน้อยเพราะบริษัทหักค่าพัฒนาซอฟต์แวร์ที่บันทึกเป็นสินทรัพย์ด้วย (Q2 2026: ตาราง $0.306B vs บริษัทรายงาน $0.279B · Q3 2026: ตาราง $0.279B = OCF $290M − capex $10.9M vs บริษัทรายงาน $0.251B) · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance (ไม่มี split ในช่วงนี้) · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://investors.datadoghq.com/news-releases/news-release-details/datadog-announces-second-quarter-2026-financial-results",
          "https://stockanalysis.com/stocks/ddog/financials/",
          "https://www.fool.com/earnings/call-transcripts/2026/08/13/datadog-ddog-q2-2026-earnings-call-transcript/",
          "https://www.sec.gov/Archives/edgar/data/0001561550/000162828026054458/ddog-20260630.htm",
          "https://query1.finance.yahoo.com/v8/finance/chart/DDOG (historical daily closes)",
          "https://www.sec.gov/Archives/edgar/data/0001561550/000162828026069792/ex-991x20260930x8k.htm",
          "https://www.sec.gov/Archives/edgar/data/0001561550/000162828026070292/ddog-20260930.htm",
          "https://transcripts.platformaeronaut.com/transcripts/DDOG-3Q26-transcript",
          "https://stockanalysis.com/stocks/ddog/financials/?p=quarterly",
          "https://siliconangle.com/2026/11/04/datadog-falls-14-on-outlook-tied-to-one-customer-as-rapid7-jumps-and-fastly-slides/"
        ]
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 2.53,
            "revenue": 4.47
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 2.53,
            "revenue": 4.47
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "$1.135-1.145B",
            "actual": "$1.197B",
            "result": "beat",
            "magnitudePct": 5
          },
          {
            "quarter": "Q3 2026",
            "metric": "eps",
            "guided": "non-GAAP $0.63-0.65",
            "actual": "non-GAAP $0.81 (GAAP $0.32)",
            "result": "beat",
            "magnitudePct": 26.6
          },
          {
            "quarter": "Q2 2026",
            "metric": "revenue",
            "guided": "$1.07-1.08B",
            "actual": "$1.121B",
            "result": "beat",
            "magnitudePct": 4.3
          },
          {
            "quarter": "Q2 2026",
            "metric": "eps",
            "guided": "non-GAAP $0.57-0.59",
            "actual": "non-GAAP $0.65 (GAAP $0.12)",
            "result": "beat",
            "magnitudePct": 12.1
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
            "quarter": "Q1 2026",
            "metric": "eps",
            "guided": "non-GAAP $0.49-0.51",
            "actual": "non-GAAP $0.60 (GAAP $0.15)",
            "result": "beat",
            "magnitudePct": 20
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "$912-916M",
            "actual": "$953M",
            "result": "beat",
            "magnitudePct": 4.3
          },
          {
            "quarter": "Q4 2025",
            "metric": "eps",
            "guided": "non-GAAP $0.54-0.56",
            "actual": "non-GAAP $0.59 (GAAP $0.13)",
            "result": "beat",
            "magnitudePct": 7.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 4.52,
            "eps": 2.74,
            "confidence": "low",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 5.49,
            "eps": 2.98,
            "confidence": "medium",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2028",
            "revenue": 6.78,
            "eps": null,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3 2026 ทะลุจุดกึ่งกลาง guidance รายได้ 5.0% และ non-GAAP EPS 26.6% (รายได้ทะลุ 4-5% สี่ไตรมาสติด) แต่ guide Q4 ($1.19-1.20B · non-GAAP EPS $0.69-0.71) สมมติให้ลูกค้ารายใหญ่ที่สุดจ่ายแค่ขั้นต่ำตามสัญญา · FY2026 ใช้จุดกึ่งกลาง guidance ที่ยกขึ้นเป็น $4.515-4.525B / $2.73-2.75 แทน consensus ก่อนงบ ($4.47B / $2.53) จึงให้ความมั่นใจต่ำ ส่วน FY2027 มาจาก Yahoo Finance (รายได้ $5.49B ตรงกับ MarketScreener · EPS normalized $2.98 ฐาน non-GAAP ชุดเดียวกับที่ stockanalysis ระบุ) และ FY2028 มีแต่รายได้ $6.78B จาก MarketScreener (EPS ที่แสดงไม่ระบุฐานจึงไม่ใส่) — ตัวเลขปีหน้าทั้งหมดยังเป็นของก่อนงบ Q3 และน่าจะถูกปรับ"
      }
    },
    "INTC": {
      "ticker": "INTC",
      "name": "Intel Corporation",
      "layer": "foundry",
      "thesis": {
        "statement": "Intel คือเดิมพันการพลิกฟื้นที่ใหญ่ที่สุดในอุตสาหกรรมชิป — บริษัทที่เคยผูกขาดทั้งการออกแบบและการผลิต เสียตำแหน่งผู้นำเทคโนโลยีการผลิตให้ TSMC ไปเกือบสิบปี และกำลังพยายามกลับมาด้วยเทคโนโลยี 18A ที่ผลิตจริงบนแผ่นดินอเมริกาแล้ว · สิ่งที่ทำให้กรณีนี้ต่างจากการพลิกฟื้นทั่วไปคือรัฐบาลสหรัฐเข้ามาถือหุ้นเอง (ราว 9.9% ตอนทำดีล ~8% หลังการเสนอขายหุ้นใหม่) และ NVIDIA กับ SoftBank ลงเงินตาม ทำให้ Intel กลายเป็นโครงสร้างพื้นฐานเชิงยุทธศาสตร์ของประเทศ ไม่ใช่แค่บริษัทเอกชนที่ต้องรอดด้วยตัวเอง · Q3 2026 พิสูจน์ว่าธุรกิจหลักฟื้นจริง (รายได้ +21% · Data Center +78% แรงสุดในรอบ 15 ปี · gross margin 43%) แต่ guide Q4 ที่ต่ำกว่าตลาดคาดมากจากตลาดพีซีที่ทรุด โรงงานในอิสราเอลหยุดผลิต และ Xeon ที่ผลิตไม่ทันขาย ทำให้ราคาร่วง ~21% หลังปิดตลาดในคืนเดียว · ธุรกิจ Foundry ยังขาดทุน ~$1.85B ต่อไตรมาสและมีลูกค้าภายนอกเพียง ~$411M ส่วนดีล Apple บน 18A-P ที่ทำเนียบขาวประกาศเมื่อ มิ.ย. 2026 ยังไม่มีการยืนยันจากทั้งสองบริษัทเอง",
        "pillars": [
          "18A ผลิตจริงแล้ว — Panther Lake (Core Ultra Series 3) ผลิตจำนวนมากบน 18A · Clearwater Forest เริ่มส่งมอบเพื่อรับรู้รายได้บน 18A · 18A-P ให้ yield ที่ลูกค้าภายนอกพอใจ — โหนดที่ล้ำที่สุดที่ผลิตบนแผ่นดินสหรัฐ",
          "ธุรกิจหลักฟื้นจริง — รายได้ Q3 2026 โต 21% ต่อจาก +25% ใน Q2 โดย Data Center และ AI โต 78% แรงที่สุดในรอบ 15 ปีและดีมานด์ Xeon ยังเกินกำลังผลิต ขณะที่ gross margin ขยับจาก 38.2% เป็น 43.0% ในปีเดียว",
          "รัฐบาลสหรัฐถือหุ้น (ราว 9.9% ตอนทำดีล ~8% หลังเจือจาง) แลกกับเงิน CHIPS Act $5.7B ที่จ่ายเร็วขึ้น — เปลี่ยนสถานะจากบริษัทที่ต้องรอดเองเป็นโครงสร้างพื้นฐานที่ประเทศต้องให้รอด",
          "NVIDIA ลงทุน $5B ที่ราคา $23.28 พร้อมร่วมพัฒนาสินค้า data center และ PC หลายรุ่น · SoftBank ลงอีก $2B — คู่แข่งเก่ากลายเป็นทั้งผู้ถือหุ้นและพันธมิตร",
          "Foundry คือทางเลือกที่สองของโลกนอกเหนือจาก TSMC — 14A ออก PDK 0.9 แล้วเมื่อ ต.ค. 2026 (1.0 ภายใน Q1 2027) และมีรายงานดีล Apple บน 18A-P แต่รายได้ภายนอกจริงยังแค่ ~$411M ต่อไตรมาส · ถ้าดึงลูกค้ารายใหญ่ที่ผูกพันจริงได้ ธุรกิจนี้จะเปลี่ยนจากภาระเป็นเครื่องยนต์ แต่วันนี้ยังไม่เกิด"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+21% YoY (Q3 2026 — $16.51B) ต่อจาก +25% ใน Q2 · guide Q4 $15.0-16.0B (ต่ำกว่า consensus ~$17.05B)",
          "trend": "flat",
          "score": 68,
          "impact": "positive",
          "why": "ยังโตสองหลักเป็นไตรมาสที่สองติดกันหลังรายได้หดตัวสี่ปี (FY2021 $79B → FY2025 $52.9B) และทะลุจุดกึ่งกลาง guidance เป็นไตรมาสที่สี่ติด แต่ขนาดการทะลุแคบลงมาก (Q3 +1.3%) · ตัวขับคือ Data Center และ AI (+78%) ขณะที่ Client หดตัว 5% · guide Q4 ต่ำกว่าตลาดคาด ~9% จากตลาดพีซีที่ทรุด (ผู้บริหารวางแผนให้ตลาดพีซีปี 2027 หดราว 10%) โรงงาน Fab 28 ในอิสราเอลหยุดผลิต (กระทบรายได้ ~$300M) และ Xeon ที่ผลิตไม่ทันขาย — การโตจึงกำลังชะลอ ไม่ได้เร่งต่อ"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 2026: GAAP EPS $0.60 (ปีก่อน $0.90 ที่มีรายการพิเศษก้อนใหญ่) · non-GAAP $0.52 (ปีก่อน $0.23) · กำไรจากการดำเนินงาน $2.52B จาก $0.68B · guide Q4 non-GAAP $0.25 / GAAP $0.10",
          "trend": "up",
          "score": 55,
          "impact": "neutral",
          "why": "กำไรจากการดำเนินงานโตเกือบสี่เท่า YoY และ non-GAAP EPS มากกว่าสองเท่า — นี่คือการฟื้นจริง · แต่ EPS ตามบัญชียังถูกบิดเบือนทั้งสองทางจากการตีมูลค่าหุ้น escrow ที่วางไว้ให้รัฐบาล (Q2 ขาดทุน $12.5B เพราะหุ้นขึ้น · Q3 กลับเป็นกำไร $1.0B เพราะหุ้นลง) จึงต้องอ่านจากกำไรดำเนินงาน · guide Q4 non-GAAP $0.25 ต่ำกว่า consensus $0.43 เกือบครึ่ง แปลว่ากำไรจะถอยแรงในไตรมาสหน้า"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026: OCF $5.08B หัก capex $4.22B ≈ +$0.86B (adjusted FCF ตามนิยามบริษัท $1.64B) · 9 เดือน OCF $13.2B / capex $10.2B · capex ปี 2026 ~$20B (gross) · CFO บอกปี 2027 ไม่น่าจะมี FCF เป็นบวก",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "เก้าเดือนแรกเป็นบวกราว $3B (OCF ลบ capex) ซึ่งดีกว่าทุกปีตั้งแต่ FY2022 ที่ติดลบสะสมกว่า $44B · แต่ capex ที่ต้องเร่งใน Q4 ให้ครบ ~$20B ทั้งปี และคำพูดตรง ๆ ของ CFO ว่าปี 2027 เป็นปีลงทุน (คำสั่งซื้อเครื่องจักรเพิ่มเกือบ 40% QoQ) และไม่น่าจะมีกระแสเงินสดอิสระเป็นบวก ทำให้เงินสดที่ธุรกิจหาเองยังไม่ใช่สิ่งที่พึ่งได้ในสองปีข้างหน้า"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "GAAP gross margin 43.0% (ปีก่อน 38.2% · Q2 40.4%) · non-GAAP 44.1% · GAAP operating margin 15.3% (non-GAAP 19.6%) · guide Q4 gross margin 37.1% GAAP / 38.0% non-GAAP",
          "trend": "flat",
          "score": 60,
          "impact": "positive",
          "why": "Q3 คือไตรมาสที่ margin ดีที่สุดในรอบหลายปีจากอัตราการผลิตบน Intel 3 และ 18A ที่ดีขึ้นและสัดส่วน Data Center ที่สูงขึ้น · แต่ guide Q4 ให้ gross margin ร่วง ~6 จุดในไตรมาสเดียว — โรงงาน Fab 28 อิสราเอลหยุดผลิตกิน ~200bps รายได้ที่ลดลงเทียบต้นทุนคงที่ และสัดส่วนสินค้าที่ margin ต่ำกว่า · ยังห่างจากยุครุ่งเรือง (55-60%) และ Foundry ยังขาดทุน ~$1.85B ต่อไตรมาสซึ่งกดตัวเลขรวมอยู่"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังต่ำ — กำไรจากการดำเนินงานเป็นบวกสามไตรมาสติด (Q3 $2.52B) บนฐานสินทรัพย์โรงงานมหาศาล และ capex ปี 2027 จะเพิ่มขึ้นแรง",
          "trend": "up",
          "score": 38,
          "impact": "negative",
          "why": "Intel ลงทุนโรงงานไปหลายหมื่นล้านดอลลาร์ตลอดสี่ปีที่ผ่านมาโดยที่กำไรเพิ่งกลับมา ผลตอบแทนต่อทุนที่ลงไปจึงยังต่ำที่สุดในกลุ่มชิปใหญ่ · ทิศทางดีขึ้นตามกำไรดำเนินงานที่โตเกือบสี่เท่า YoY แต่ตัวหารกำลังจะใหญ่ขึ้นอีกจาก capex ปี 2027 — การจะพิสูจน์ว่าเงินที่ลงไปคุ้มต้องรอให้ Foundry มีลูกค้าภายนอกจริงก่อน"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$54.0B (26 ก.ย. 2026) — เพิ่มจาก $29.7B หลังเสนอขายหุ้นสามัญ ~$23B ที่ $95/หุ้นเมื่อ ส.ค. 2026 (รับสุทธิ ~$22.6B)",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เงินสดหนาที่สุดในรอบหลายปีและมากกว่าหนี้รวมแล้ว — จากการขายหุ้นก้อนใหญ่ที่ราคาสูงกว่าราคาปัจจุบันมาก บวกเงินจากรัฐบาล NVIDIA และ SoftBank ก่อนหน้า · เพียงพอต่อแผนลงทุนปี 2027 ที่จะเพิ่มขึ้นแรง แต่ต้องจำว่าเงินก้อนนี้แลกมาด้วยการเจือจางหุ้นเดิมอีก ~4.8% ไม่ใช่เงินที่ธุรกิจหามาเอง"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้รวม ~$50.1B เทียบเงินสด ~$54.0B — พลิกเป็นเงินสดสุทธิ ~$3.9B จากหนี้สุทธิ ~$20.8B ใน Q2",
          "trend": "up",
          "score": 48,
          "impact": "neutral",
          "why": "หนี้ก้อนนี้สะสมมาจากช่วงที่ลงทุนโรงงานหนักขณะที่กระแสเงินสดติดลบ และยังเป็นหนี้ก้อนใหญ่ที่สุดในกลุ่มชิปใหญ่ · แต่เงินจากการขายหุ้นทำให้ฐานะสุทธิพลิกเป็นเงินสดครั้งแรกในรอบหลายปี ความเสี่ยงเรื่องสภาพคล่องจึงลดลงมาก — ประเด็นเลื่อนไปอยู่ที่ว่าเงินจะถูกใช้หมดกับ capex ปี 2027 เร็วแค่ไหน"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 5,307 ล้านหุ้น (Q3 2026) จาก 5,104 ล้านใน Q2 และราว 4,300 ล้านก่อนดีลปี 2025 — เจือจางราว 23% ในสองปี · หุ้นที่ออกจำหน่ายแล้ว ~5,310 ล้านหุ้น",
          "trend": "down",
          "score": 15,
          "impact": "negative",
          "why": "จุดอ่อนที่สุดของกรณีนี้และยังแย่ลงอีก — นอกจากหุ้นที่ขายให้รัฐบาล NVIDIA และ SoftBank แล้ว ส.ค. 2026 บริษัทขายหุ้นใหม่อีก ~242 ล้านหุ้นที่ $95 (~$23B รวมหุ้นส่วนเกินของผู้จัดจำหน่าย) ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนไปเกือบหนึ่งในสี่ภายในสองปี · ยังมีหุ้นในบัญชี escrow ให้รัฐบาลรอทยอยส่งมอบอีก ซึ่งทำให้กำไร GAAP แกว่งตามราคาหุ้นทุกไตรมาส"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ไม่มีปันผล (ยกเลิกตั้งแต่ปี 2024) · capex ปี 2026 ~$20B gross และปี 2027 \"เพิ่มขึ้นแรง\" · เสนอขายหุ้น ~$23B ส.ค. 2026 · ประกาศซื้อ Classiq (ควอนตัม) ต.ค. 2026",
          "trend": "flat",
          "score": 45,
          "impact": "neutral",
          "why": "ทีมบริหารชุดใหม่ตัดสินใจตรงไปตรงมา — หยุดปันผล ขายธุรกิจที่ไม่ใช่แกนหลัก และระดมทุนจากพันธมิตรและตลาดทุนแทนการก่อหนี้เพิ่ม การขายหุ้น ~$23B ที่ $95 ก่อนราคาร่วงลงมาแถว $70 ถือว่าจังหวะดีสำหรับบริษัท · แต่เงินทั้งหมดกำลังถูกทุ่มลงโรงงาน (คำสั่งซื้อเครื่องจักร +~40% QoQ) โดยที่ลูกค้า Foundry ภายนอกยังแทบไม่มี จึงยังตัดสินไม่ได้ว่าคุ้มหรือไม่"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคาปิด 29 ต.ค. $92.07 → after-hours ~$71-72 (−21 ถึง −23%) หลัง guide Q4 · mcap ~$380B ที่ราคานั้น · forward P/E ~46x จาก consensus non-GAAP FY2026 $1.54 (ก่อนปรับลง) · ~32x จาก FY2027 ~$2.23 (ฐานไม่ระบุ)",
          "trend": "up",
          "score": 28,
          "impact": "negative",
          "why": "ราคาวิ่งจาก $36 ต้นปีขึ้นไปแตะ $141 ในเดือน มิ.ย. แล้วถูกสองงบที่ guide ต่ำกว่าคาดกดลงมาเหลือราว $71 — ยังขึ้นเกือบเท่าตัวจากต้นปีแต่หายไปครึ่งหนึ่งจากจุดสูงสุด · ที่ ~46 เท่าของกำไร non-GAAP ปีนี้ (ซึ่งนักวิเคราะห์จะต้องปรับลงหลัง guide Q4) ราคาถูกลงมากแต่ยังไม่ถูก เพราะกำไรปี 2027 ต้องโตอีก ~40% จึงจะเหลือ ~30 เท่า ขณะที่ CFO เพิ่งบอกว่าปี 2027 เป็นปีลงทุนที่กระแสเงินสดไม่น่าจะบวก · เป้าเฉลี่ยนักวิเคราะห์ ($108-118 ก่อนงบ) ยังไม่สะท้อน guide ใหม่"
        }
      ],
      "revenueQuality": {
        "acceleration": "decelerating",
        "consistency": 40,
        "recurringPct": 5,
        "note": "คุณภาพรายได้เป็นจุดอ่อนเชิงโครงสร้าง — Intel ขายฮาร์ดแวร์ตามรอบคำสั่งซื้อ แทบไม่มีรายได้ประจำแบบสัญญาระยะยาว และรายได้เคยหดจาก $79B (FY2021) เหลือ $52.9B (FY2025) ภายในสี่ปี ความสม่ำเสมอจึงต่ำกว่าบริษัทชิปใหญ่รายอื่นมาก · Q3 2026 โต 21% ต่อจาก 25% ใน Q2 และ guide Q4 ชี้ว่าจะโตช้าลงเหลือราว +13% YoY ที่จุดกึ่งกลาง ($15.5B) — การฟื้นยังจริงแต่กำลังชะลอ และยังพึ่งฐานต่ำของปีก่อน · ตัวเลข segment ด้านล่างเป็นรายได้จากภายนอกเท่านั้น — Intel Foundry มีรายได้รวม $6.70B (+58%) แต่เกือบทั้งหมดเป็นการผลิตให้แผนกตัวเอง ขายให้ลูกค้าภายนอกจริงเพียง ~$411M (เพิ่ม $118M QoQ แต่ส่วนใหญ่มาจากโปรแกรมลูกค้าที่ไม่เกิดซ้ำ) ซึ่งคือหัวใจที่ยังไม่พิสูจน์ของทั้ง thesis นี้",
        "segments": [
          {
            "name": "Client Computing (ซีพียูพีซี รวม Physical AI)",
            "sharePct": 49,
            "growthNote": "$8.10B (−5% YoY · Q2 $8.88B) กำไรจากการดำเนินงาน $2.29B — ยังเป็นเครื่องยนต์เงินสดหลักแต่ตลาดพีซีทรุด (ครึ่งหลังปี 2026 หน่วยหดเกิน 20% จากหน่วยความจำขาดแคลนและแพง) และ guide Q4 ให้หดเกิน 20% QoQ",
            "trend": "down"
          },
          {
            "name": "Data Center และ AI",
            "sharePct": 44,
            "growthNote": "$7.32B (+78% YoY · Q2 $6.26B) กำไรจากการดำเนินงาน $3.04B — โตแรงที่สุดในรอบ 15 ปี ดีมานด์ Xeon ยังเกินกำลังผลิต · guide Q4 โตราว 15% QoQ",
            "trend": "up"
          },
          {
            "name": "Intel Foundry (เฉพาะลูกค้าภายนอก)",
            "sharePct": 3,
            "growthNote": "รายได้ภายนอก ~$411M (+$118M QoQ ส่วนใหญ่จากโปรแกรมลูกค้าที่ไม่เกิดซ้ำ) · รายได้รวมทั้ง segment $6.70B (+58%) ขาดทุนจากการดำเนินงาน $1.85B ต่อไตรมาส ดีขึ้นจาก $2.09B ใน Q2",
            "trend": "up"
          },
          {
            "name": "อื่น ๆ (Mobileye และหน่วยธุรกิจที่เหลือ)",
            "sharePct": 4,
            "growthNote": "$0.69B (−30% YoY) — หดตัวจากการขายหุ้น Altera 51% ออกไปเมื่อ ก.ย. 2025 ทำให้ไม่ต้องรวมงบอีกต่อไป",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 60,
        "items": [
          {
            "item": "18A ผลิตจำนวนมากจริงแล้ว — Panther Lake และ Clearwater Forest",
            "status": "executing",
            "evidence": "Panther Lake (Core Ultra Series 3) ผลิตจำนวนมากบน 18A · Clearwater Forest (Xeon) เริ่มส่งมอบเพื่อรับรู้รายได้บน 18A และโชว์ระบบเกิน 46,000 คอร์ต่อตู้แร็ค · 18A-P ให้ yield ที่ลูกค้าภายนอกพอใจ · ร่วมกับ ASML เตรียมความพร้อม High-NA EUV — หลักฐานชิ้นแรกที่จับต้องได้ว่าแผนพลิกฟื้นด้านการผลิตเดินได้จริง"
          },
          {
            "item": "Data Center และ AI กลับมาโตแรง",
            "status": "executing",
            "evidence": "รายได้ $7.32B (+78% YoY) กำไรจากการดำเนินงาน $3.04B ในไตรมาสเดียว — แรงที่สุดในรอบ 15 ปี ดีมานด์ Xeon สำหรับงาน AI ยังเกินกำลังผลิต · ขยายความร่วมมือหลายปีกับ Oracle Cloud Infrastructure และโชว์ Diamond Rapids รุ่นถัดไปแล้ว"
          },
          {
            "item": "ความร่วมมือกับ NVIDIA",
            "status": "on-track",
            "evidence": "NVIDIA ลงทุน $5B ที่ราคา $23.28/หุ้น (ถือราว 4%) พร้อมตกลงร่วมพัฒนาสินค้า data center และ PC หลายรุ่น — เปลี่ยนคู่แข่งเป็นพันธมิตร แต่สินค้าร่วมยังไม่ออกสู่ตลาด จึงยังไม่มีตัวเลขให้วัด"
          },
          {
            "item": "ดึงลูกค้าภายนอกเข้า Foundry บน 18A-P / 14A",
            "status": "at-risk",
            "evidence": "รายได้ภายนอก ~$411M ต่อไตรมาส (+$118M QoQ แต่ส่วนใหญ่จากโปรแกรมที่ไม่เกิดซ้ำ) · 14A ออก PDK 0.9 เมื่อ ต.ค. 2026 ลูกค้าที่ได้รับตอบสนองดี และ PDK 1.0 จะออกภายใน Q1 2027 · ลูกค้าแพ็กเกจ EMIB \"สองสามราย\" รอประกาศในสองไตรมาส · ดีล Apple บน 18A-P ที่ทำเนียบขาวประกาศ มิ.ย. 2026 ยังไม่มีการยืนยันจาก Intel หรือ Apple เอง — ยังไม่มีลูกค้ารายใหญ่ที่ผูกพันจริงในงบ นี่คือข้อที่ยังไม่ผ่านและเป็นตัวตัดสิน thesis ทั้งหมด"
          },
          {
            "item": "ขยายกำลังผลิตให้ทันดีมานด์ Xeon",
            "status": "at-risk",
            "evidence": "ดีมานด์เกินกำลังผลิตชัดเจน แต่ Fab 28 ในอิสราเอล (สินค้าเซิร์ฟเวอร์ 10nm) หยุดผลิตราวสองสัปดาห์ กระทบรายได้ Q4 ~$300M และ gross margin ~200bps และน่าจะซ้ำใน Q1 · ซับสเตรตสำหรับแพ็กเกจ EMIB ขาดแคลนทั้งอุตสาหกรรม · กำลังผลิต Intel 3 ที่โอเรกอนจะเริ่มครึ่งหลังปี 2027 — ครึ่งแรกปี 2027 ยังผลิตไม่ทันขาย"
          },
          {
            "item": "สถานะโครงสร้างพื้นฐานเชิงยุทธศาสตร์ของสหรัฐ",
            "status": "executing",
            "evidence": "รัฐบาลสหรัฐถือหุ้น 433.3 ล้านหุ้น (ราว 9.9% ตอนทำดีล ~8% หลังการเสนอขายหุ้นใหม่) แลกกับการจ่ายเงิน CHIPS Act $5.7B เร็วขึ้น บวก SoftBank อีก $2B — ลดความเสี่ยงเรื่องเงินทุนไปมาก และทำให้ Intel มีแรงหนุนเชิงนโยบายที่คู่แข่งไม่มี"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองของ Intel วันนี้มาจากสองอย่างที่ไม่ใช่เทคโนโลยีล้วน — หนึ่งคือฐานติดตั้ง x86 ในองค์กรและศูนย์ข้อมูลทั่วโลกที่ซอฟต์แวร์จำนวนมหาศาลผูกอยู่ ย้ายออกทั้งระบบไม่ได้ง่าย ๆ สองคือการเป็นโรงงานผลิตชิปขั้นสูงแห่งเดียวที่เป็นของสหรัฐและอยู่บนแผ่นดินสหรัฐ ซึ่งมีค่าทางยุทธศาสตร์เกินกว่าที่ตลาดจะปล่อยให้ล้ม · แต่ในเชิงเทคโนโลยีล้วน Intel ยังตามหลัง TSMC และต้องพิสูจน์ 18A-P/14A กับลูกค้าภายนอกที่ยืนยันแล้วก่อนจึงจะเรียกได้ว่ามีคูเมืองด้านการผลิตจริง",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "stable",
            "note": "ยังครองส่วนแบ่งซีพียูพีซีและเซิร์ฟเวอร์เป็นอันดับหนึ่ง และดีมานด์ Xeon ที่เกินกำลังผลิตบอกว่าเซิร์ฟเวอร์ x86 กลับมาเป็นที่ต้องการ แต่เสียส่วนแบ่งให้ AMD ต่อเนื่องหลายปี และในสนาม AI accelerator แทบไม่มีที่ยืนเทียบ NVIDIA"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "18A ผลิตจริงและส่งมอบ Clearwater Forest แล้ว 18A-P ให้ yield ดี 14A ออก PDK 0.9 — ไล่ช่องว่างกับ TSMC ได้เร็วที่สุดในรอบสิบปี แต่ยังไม่ถึงจุดที่เรียกว่าแซง"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "stable",
            "note": "ทะลุจุดกึ่งกลาง guidance รายได้สี่ไตรมาสติดและส่งมอบ 18A ตามกำหนด แต่ขนาดการทะลุแคบลง (Q2 +12.8% → Q3 +1.3%) guide Q4 ต่ำกว่าตลาดคาดมาก และโรงงานอิสราเอลหยุดผลิตกับ Xeon ที่ผลิตไม่ทันขายสะท้อนว่าฝั่งซัพพลายยังตามดีมานด์ไม่ทัน"
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
            "note": "แข็งขึ้นชัดจากสองด้าน — เทคโนโลยีการผลิตที่กลับมาแข่งได้ และสถานะที่รัฐบาลสหรัฐถือหุ้นเองซึ่งทำให้ความเสี่ยงล้มละลายแทบหมดไป (ยิ่งเงินสด $54B หลังขายหุ้น) · แต่ยังไม่ใช่คูเมืองแบบที่กันคู่แข่งได้ด้วยตัวเอง ตราบใดที่ Foundry ยังไม่มีลูกค้าภายนอกรายใหญ่ที่ยืนยันแล้ว"
          }
        ]
      },
      "capitalAllocation": {
        "score": 47,
        "verdict": "ทีมบริหารชุดใหม่ตัดสินใจตรงและกล้า — หยุดปันผล ขายธุรกิจที่ไม่ใช่แกนหลัก ระดมทุนจากรัฐบาลและพันธมิตรเชิงยุทธศาสตร์ และล่าสุดขายหุ้นสามัญ ~$23B ที่ $95 ในจังหวะที่ราคาสูง ซึ่งเป็นทางที่ถูกในสถานการณ์ที่ต้องลงทุนหนักและกระแสเงินสดยังพึ่งไม่ได้ · แต่ราคาที่จ่ายคือการเจือจางหุ้นเดิมเกือบหนึ่งในสี่ และ capex ปี 2027 ที่จะเพิ่มขึ้นแรงยังไม่มีลูกค้า Foundry ภายนอกมารองรับ จึงยังพิสูจน์ไม่ได้ว่าเงินที่ทุ่มลงโรงงานจะให้ผลตอบแทนคุ้ม",
        "items": [
          {
            "label": "งบลงทุนโรงงาน (capex)",
            "current": "ปี 2026 ~$20B gross (9 เดือนแรก $10.2B) · ปี 2027 \"เพิ่มขึ้นแรง\" คำสั่งซื้อเครื่องจักรเพิ่มเกือบ 40% QoQ",
            "assessment": "neutral",
            "why": "จำเป็นถ้าจะแข่งด้านการผลิตจริง และดีมานด์ Xeon ที่เกินกำลังผลิตบอกว่าต้องขยาย · แต่เป็นเงินก้อนใหญ่ที่ยังไม่มีลูกค้า Foundry ภายนอกมารองรับ และ CFO ยอมรับว่าปี 2027 กระแสเงินสดอิสระไม่น่าจะเป็นบวก จึงยังเรียกว่าดีหรือไม่ดีไม่ได้"
          },
          {
            "label": "เงินปันผล",
            "current": "ยกเลิกตั้งแต่ปี 2024 ยังไม่กลับมา",
            "assessment": "good",
            "why": "ถูกต้องแล้วในสถานการณ์ที่กระแสเงินสดยังพึ่งไม่ได้และต้องลงทุนหนัก — การฝืนจ่ายปันผลด้วยเงินกู้คือสิ่งที่ทำให้บริษัทหลายแห่งจบไม่สวย"
          },
          {
            "label": "เสนอขายหุ้นสามัญ ส.ค. 2026",
            "current": "~242 ล้านหุ้นที่ $95 (รวมหุ้นส่วนเกิน) ≈ $23B รับสุทธิ ~$22.6B — เจือจาง ~4.8%",
            "assessment": "neutral",
            "why": "ขายหุ้นในจังหวะที่ราคาสูงกว่าราคาปัจจุบันราว 30% ถือว่าจังหวะดีสำหรับบริษัทและทำให้ฐานะสุทธิพลิกเป็นเงินสด · แต่เป็นการเจือจางซ้ำบนที่เจือจางไปแล้วจากดีลรัฐบาล NVIDIA และ SoftBank และเงินจะถูกใช้กับ capex ที่ยังไม่มีลูกค้ารองรับ"
          },
          {
            "label": "ระดมทุนจากรัฐบาลและพันธมิตร",
            "current": "รัฐบาลสหรัฐถือ 433.3 ล้านหุ้น (ราว 9.9% ตอนทำดีล ~8% หลังเจือจาง · แลกเงิน CHIPS $5.7B ที่จ่ายเร็วขึ้น) · NVIDIA $5B · SoftBank $2B",
            "assessment": "neutral",
            "why": "ได้เงินสดและแรงหนุนเชิงนโยบายโดยไม่เพิ่มหนี้ ซึ่งมีค่ามากในจังหวะนี้ · แต่แลกด้วยการเจือจางหุ้นเดิมและทำให้กำไร GAAP แกว่งตามราคาหุ้นทุกไตรมาส เพราะต้องตีมูลค่าหุ้นที่วางไว้ให้รัฐบาลใหม่ตลอด (Q2 −$12.5B · Q3 +$1.0B)"
          },
          {
            "label": "ซื้อ/ขายธุรกิจ",
            "current": "ขายหุ้น Altera 51% ออกไปเมื่อ ก.ย. 2025 · ประกาศซื้อ Classiq (ซอฟต์แวร์ควอนตัม) 26 ต.ค. 2026",
            "assessment": "good",
            "why": "โฟกัสกลับมาที่ซีพียูและโรงงานซึ่งเป็นสองอย่างที่ตัดสินอนาคตจริง ๆ ได้เงินสดเข้ามาด้วย · ดีล Classiq เป็นเดิมพันระยะยาวขนาดเล็กที่ยังไม่กระทบงบ"
          },
          {
            "label": "งบดุล",
            "current": "เงินสด ~$54.0B · หนี้ ~$50.1B → เงินสดสุทธิ ~$3.9B (จากหนี้สุทธิ $20.8B ใน Q2)",
            "assessment": "neutral",
            "why": "หนี้รวมยังใหญ่ที่สุดในกลุ่มชิปใหญ่ และเงินสดที่หนาขึ้นมาจากการขายหุ้น ไม่ใช่จากธุรกิจที่หามาได้เอง · แต่ฐานะสุทธิที่พลิกเป็นเงินสดทำให้ไม่ต้องกลัวเรื่องสภาพคล่องอย่างน้อยถึงปี 2027"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "forward P/E ~46x จาก consensus non-GAAP FY2026 EPS $1.54 (47 นักวิเคราะห์ · รายได้ $63.3B · ณ 27 ต.ค. ก่อน guide Q4 จึงน่าจะถูกปรับลง) และ ~32x จาก FY2027 ~$2.23 (ฐานไม่ระบุ · แหล่งต่างกันให้ $1.65-2.23) — ราคาปิด 29 ต.ค. $92.07 ร่วง ~21-23% หลังปิดตลาดไปแถว $71-72 (mcap ~$380B) หลังรายได้/กำไร Q3 ชนะ guidance แต่ guide Q4 (รายได้ $15.0-16.0B · non-GAAP EPS $0.25) ต่ำกว่าตลาดคาด (~$17.05B / $0.43) มาก · จาก $36 ต้นปี ราคายังขึ้นเกือบเท่าตัวแต่ลงมาครึ่งหนึ่งจากจุดสูงสุด $141 (22 มิ.ย.) · ถูกลงมากแล้วแต่ยังไม่ถูก — กำไร GAAP ยังถูกบิดเบือนด้วยหุ้น escrow Foundry ขาดทุน ~$1.85B ต่อไตรมาส และ CFO บอกว่าปี 2027 เป็นปีลงทุนที่ FCF ไม่น่าจะบวก · เป้าเฉลี่ยนักวิเคราะห์ ($108-118 ก่อนงบ) ยังไม่สะท้อน guide ใหม่"
      },
      "whatChanged": [
        {
          "metric": "รายได้และ guidance (Q2 → Q3 2026)",
          "prev": "$16.13B (+25% YoY) · guide Q3 $15.8-16.8B",
          "now": "$16.51B (+21% YoY) ชนะจุดกึ่งกลาง guide 1.3% · แต่ guide Q4 $15.0-16.0B ต่ำกว่า consensus ~$17.05B ราว 9% — ราคาร่วง ~21% หลังปิดตลาด",
          "direction": "negative"
        },
        {
          "metric": "Data Center และ AI",
          "prev": "$6.26B (+59% YoY) กำไรจากการดำเนินงาน $2.47B",
          "now": "$7.32B (+78% YoY) กำไรจากการดำเนินงาน $3.04B — โตแรงสุดในรอบ 15 ปี ดีมานด์ Xeon เกินกำลังผลิต",
          "direction": "positive"
        },
        {
          "metric": "Client Computing (พีซี)",
          "prev": "$8.88B (+13% YoY)",
          "now": "$8.10B (−5% YoY) · ผู้บริหารคาดตลาดพีซีครึ่งหลังปี 2026 หดเกิน 20% และปี 2027 หดราว 10% จากหน่วยความจำขาดแคลน",
          "direction": "negative"
        },
        {
          "metric": "GAAP gross margin / operating margin",
          "prev": "40.4% / 11.1%",
          "now": "43.0% / 15.3% — แต่ guide Q4 gross margin 37.1% (Fab 28 อิสราเอลหยุดผลิต −200bps · รายได้ลดเทียบต้นทุนคงที่)",
          "direction": "neutral"
        },
        {
          "metric": "กำไรต่อหุ้นตามบัญชี",
          "prev": "GAAP −$2.16 (ขาดทุนตีมูลค่าหุ้น escrow $12.5B) · non-GAAP $0.42",
          "now": "GAAP +$0.60 (กำไรตีมูลค่าหุ้น escrow $1.0B เพราะหุ้นลง) · non-GAAP $0.52 · guide Q4 non-GAAP $0.25",
          "direction": "positive"
        },
        {
          "metric": "เงินสดและจำนวนหุ้น",
          "prev": "เงินสด $29.7B · หนี้สุทธิ $20.8B · หุ้น diluted 5,104 ล้าน",
          "now": "เงินสด $54.0B · เงินสดสุทธิ ~$3.9B · หุ้น diluted 5,307 ล้าน หลังขายหุ้นใหม่ ~$23B ที่ $95 (ส.ค.)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "Foundry ยังไม่มีลูกค้าภายนอกจริง — รายได้จากลูกค้านอกบริษัทอยู่แค่ ~$411M ต่อไตรมาส (และส่วนที่เพิ่มมาจากโปรแกรมที่ไม่เกิดซ้ำ) ขณะที่ segment นี้ขาดทุนจากการดำเนินงาน ~$1.85B ทุกไตรมาส · ดีล Apple บน 18A-P ยังเป็นแค่ประกาศจากทำเนียบขาว ไม่มีการยืนยันจากทั้งสองบริษัท · นี่คือข้อเดียวที่ตัดสิน thesis ทั้งหมด ถ้า 14A ไม่ได้ลูกค้ารายใหญ่ที่ผูกพันจริง เงินที่ทุ่มลงโรงงานไปหลายหมื่นล้านจะไม่มีทางคืนทุน",
        "การเจือจางหุ้นรุนแรงและยังไม่จบ — จำนวนหุ้นเพิ่มจากราว 4,300 เป็น ~5,310 ล้านหุ้นภายในสองปี จากการขายหุ้นให้รัฐบาล NVIDIA SoftBank และล่าสุดเสนอขายหุ้นสามัญ ~242 ล้านหุ้นที่ $95 (~$23B) เมื่อ ส.ค. 2026 และยังมีหุ้นในบัญชี escrow รอทยอยส่งมอบให้รัฐบาลอีก ผู้ถือหุ้นเดิมจึงถูกลดสัดส่วนต่อเนื่องแม้ธุรกิจจะฟื้น",
        "กำไร GAAP แกว่งตามราคาหุ้นทั้งสองทาง — เพราะต้องตีมูลค่าภาระหุ้น escrow ใหม่ทุกไตรมาส หุ้นขึ้นก็ขาดทุนทางบัญชี (Q2 2026 −$12.5B) หุ้นลงก็กลายเป็นกำไร (Q3 2026 +$1.0B) ทำให้ EPS ที่คนทั่วไปเห็นบิดเบือนจากผลการดำเนินงานจริงอย่างรุนแรง ต้องอ่านจากกำไรดำเนินงานหรือ non-GAAP เท่านั้น",
        "ราคายังสะท้อนความสำเร็จไปล่วงหน้าแม้หลังร่วง — ที่ ~$71 ยังเทรด ~46 เท่าของกำไร non-GAAP ปีนี้ที่กำลังจะถูกปรับลง และตลาดลงโทษงบที่ guide ต่ำกว่าคาดอย่างรุนแรงสองไตรมาสติด (ร่วง 18% ในสี่วันหลังงบ Q2 · ร่วง ~21% หลังปิดตลาดคืนงบ Q3) ข่าวเลื่อนโหนดหรือลูกค้าถอนตัวจะกดราคาแรงกว่าพื้นฐานที่แย่ลงจริงมาก",
        "หนี้รวม ~$50.1B ยังใหญ่ที่สุดในกลุ่ม แม้เงินสด $54.0B จะทำให้เป็นเงินสดสุทธิชั่วคราว — เพราะ capex ปี 2026 ~$20B ต้องเร่งใน Q4 และ CFO บอกว่าปี 2027 capex จะเพิ่มขึ้นแรงและกระแสเงินสดอิสระไม่น่าจะเป็นบวก เงินจากการขายหุ้นจึงอาจถูกใช้ไปเร็วกว่าที่คิดถ้ารอบธุรกิจพลิก",
        "ตลาดพีซีซึ่งยังเป็นครึ่งหนึ่งของรายได้กำลังหดตัว (ผู้บริหารวางแผนให้ตลาดพีซีปี 2027 หดราว 10% จากหน่วยความจำขาดแคลนและแพง) และในสนาม AI แทบไม่มีที่ยืน — NVIDIA ครองทั้งชิปและระบบนิเวศซอฟต์แวร์ ส่วน AMD แย่งส่วนแบ่งซีพียูต่อเนื่อง การฟื้นตัวรอบนี้จึงพึ่งดีมานด์ซีพียูเซิร์ฟเวอร์ที่กลับมาเป็นหลัก ซึ่งบริษัทยังผลิตไม่ทันขายไปจนถึงครึ่งแรกปี 2027",
        "ความเสี่ยงเชิงการเมือง — รัฐบาลสหรัฐเป็นผู้ถือหุ้นรายใหญ่ ซึ่งช่วยเรื่องเงินทุนและนโยบาย แต่ก็แปลว่าการตัดสินใจทางธุรกิจอาจถูกกดดันด้วยเป้าหมายเชิงยุทธศาสตร์ของประเทศ และเปลี่ยนได้เมื่อรัฐบาลเปลี่ยน"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2027-01",
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-26",
            "revenueB": 16.513,
            "epsAdj": 0.6,
            "opMarginPct": 15.6,
            "fcfB": 1.058,
            "priceQEnd": 123,
            "epsNote": "GAAP $0.60 สูงกว่า non-GAAP $0.52 — กลับทิศจาก Q2 เพราะราคาหุ้นลดลงในไตรมาส ทำให้การตีมูลค่าหุ้นที่วางไว้ในบัญชี escrow ให้กระทรวงพาณิชย์สหรัฐกลายเป็นกำไรที่ไม่ใช่เงินสด $1.0B (~$0.19/หุ้น) บวกกำไรจากเงินลงทุน $330M (~$0.06/หุ้น) · ตัดสองรายการนี้ออก GAAP EPS เหลือราว $0.37 · ส่วนในกำไรดำเนินงานมีค่าปรับโครงสร้าง $54M (ไม่รวมรายการนี้ operating margin 15.6% เทียบตามงบ 15.3%)",
            "opMarginExItemsPct": 15.6
          }
        ],
        "notes": "ปีบัญชีของ Intel ตรงกับปีปฏิทินแต่จบวันเสาร์ตามรอบ 52/53 สัปดาห์ (FY2021 จบ 25 ธ.ค. 2021 · FY2022 จบ 31 ธ.ค. 2022 · FY2023 จบ 30 ธ.ค. 2023 · FY2024 จบ 28 ธ.ค. 2024 · FY2025 จบ 27 ธ.ค. 2025 · Q3 2026 จบ 26 ก.ย. 2026) · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งสำหรับ Intel บิดเบือนจากผลการดำเนินงานจริงมากเป็นพิเศษ — ดู epsNote ของ Q3'24, Q1'26, Q2'26 และ Q3'26 ก่อนเทียบข้ามไตรมาสทุกครั้ง · operating margin ในตารางมาจากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบกันได้ ซึ่งต่างจากตัวเลขที่บริษัทรายงานเองเล็กน้อย (Q2 2026: ตาราง 12.2% vs บริษัทรายงาน 11.1% · Q3 2026: ตาราง 15.6% vs 15.3% — ส่วนต่างคือ restructuring and other charges ที่แหล่งของตารางไม่นับในกำไรดำเนินงาน ดังนั้น opMarginExItemsPct ของ Q3'26 = (2,522 + 54) ÷ 16,513 = 15.6% เท่ากับค่าในตาราง) · FCF คิดแบบ OCF ลบ capex ทั้งชุด — Q2 2026 ตรวจสอบแล้วกับตัวเลขของบริษัทเอง (OCF $7.01B − capex $2.65B = $4.35B ใกล้เคียง $4.45B ในตาราง) · Q3 2026 ตาราง $1.06B อยู่ระหว่าง OCF − gross capex ของบริษัท ($5.08B − $4.22B = $0.86B) กับ adjusted FCF ตามนิยามบริษัท $1.64B (หัก capex สุทธิจากเงินอุดหนุนรัฐและเงินสมทบพันธมิตร SCIP และค่าเช่าการเงิน) · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance (Q3'26 = ปิด 25 ก.ย. 2026) · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://www.intc.com/news-events/press-releases/detail/1776/intel-reports-second-quarter-2026-financial-results",
          "https://www.sec.gov/Archives/edgar/data/0000050863/000005086326000157/intc-20260627.htm",
          "https://stockanalysis.com/stocks/intc/financials/",
          "https://stockanalysis.com/stocks/intc/forecast/",
          "https://query1.finance.yahoo.com/v8/finance/chart/INTC (historical daily closes)",
          "https://www.intc.com/news-events/press-releases/detail/1786/intel-reports-third-quarter-2026-financial-results",
          "https://www.sec.gov/Archives/edgar/data/0000050863/000005086326000188/q326earningsrelease.htm",
          "https://www.sec.gov/Archives/edgar/data/0000050863/000005086326000188/intc-20261029.htm",
          "https://www.intc.com/news-events/press-releases/detail/1779/intel-announces-upsize-and-pricing-of-20-billion-common-stock-offering",
          "https://www.investing.com/news/transcripts/earnings-call-transcript-intel-beats-q3-2026-estimates-but-stock-sinks-93CH-4985498",
          "https://www.marketscreener.com/quote/stock/INTEL-CORPORATION-4829/finances/",
          "https://finviz.com/quote.ashx?t=INTC"
        ]
      },
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 1.51,
            "revenue": 63
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 2.23,
            "revenue": 73
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "$15.8-16.8B",
            "actual": "$16.51B",
            "result": "beat",
            "magnitudePct": 1.3
          },
          {
            "quarter": "Q3 2026",
            "metric": "eps",
            "guided": "non-GAAP $0.38 (GAAP $0.31)",
            "actual": "non-GAAP $0.52 (GAAP $0.60)",
            "result": "beat",
            "magnitudePct": 36.8
          },
          {
            "quarter": "Q3 2026",
            "metric": "margin",
            "guided": "non-GAAP gross margin 42.0% (GAAP 41.0%)",
            "actual": "non-GAAP 44.1% (GAAP 43.0%)",
            "result": "beat",
            "magnitudePct": 5
          },
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
            "revenue": 63.3,
            "eps": 1.54,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 73,
            "eps": 2.23,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3 2026 ชนะ guidance ทั้งสามตัว (รายได้ +1.3% จากจุดกึ่งกลาง · non-GAAP EPS $0.52 vs $0.38 · gross margin 44.1% vs 42.0%) เป็นไตรมาสที่สี่ติดที่รายได้ทะลุจุดกึ่งกลาง แต่ขนาดแคบลงมาก (12.8% → 1.3%) และ guide Q4 (รายได้ $15.0-16.0B · non-GAAP EPS $0.25 · gross margin 38%) ต่ำกว่า consensus ก่อนงบ (~$17.05B / $0.43) มากจากตลาดพีซี โรงงานอิสราเอล และ Xeon ที่ผลิตไม่ทัน · consensus FY2026 $63.3B / $1.54 non-GAAP (47 นักวิเคราะห์ · stockanalysis 27 ต.ค. ใกล้เคียง vcpscanner $1.56) เก็บไว้ก่อนงบจึงน่าจะถูกปรับลง ส่วน FY2027 ใช้รายได้ ~$73.0B (MarketScreener) และ EPS ~$2.23 (Finviz \"EPS next Y\" ไม่ระบุฐาน · MarketScreener ให้ $1.65 ซึ่งน่าจะเป็นฐาน GAAP) จึงให้ความมั่นใจระดับกลางและฐานไม่ทราบ — ห้ามต่อเส้นกับ EPS จริง"
      }
    },
    "DASH": {
      "ticker": "DASH",
      "name": "DoorDash, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "DoorDash คือเครือข่ายส่งของถึงบ้านที่ชนะสงครามราคาในสหรัฐไปแล้ว และกำลังใช้ตำแหน่งนั้นแปลงตัวเองจาก 'แอปสั่งอาหาร' เป็นโครงสร้างพื้นฐานการส่งของทุกประเภท — ร้านอาหาร ของชำ ค้าปลีก — พร้อมต่อยอดเป็นธุรกิจกำไรสูงอย่างโฆษณาและค่าสมาชิก DashPass ที่แทบไม่มีต้นทุนเพิ่ม · การซื้อ Deliveroo (ปิดดีล ต.ค. 2025) ทำให้กลายเป็นผู้เล่นระดับโลกจริง ๆ และใน Q3 2026 กำไรตามบัญชีกลับมาโต 91% เป็น $466M หลังหดลงสองไตรมาสติด · แต่ภาพกำลังเปลี่ยนอีกรอบ — 29 ต.ค. 2026 บริษัทประกาศซื้อ Instacart มูลค่า ~$17B (จ่ายเป็นเงินสดอย่างน้อย 75% โดยกู้เพิ่ม) เพื่อเอาขนาดในธุรกิจของชำ ซึ่งจะพลิกงบดุลจากเงินสดสุทธิเป็นหนี้สุทธิ และต้องผ่านการพิจารณาด้านการแข่งขัน (antitrust) ที่กินเวลาถึงปลายปี 2027-ครึ่งแรกปี 2028",
        "pillars": [
          "ครองตลาดส่งอาหารสหรัฐชัดเจน — รายได้ Q3 2026 โต 34% เป็น $4.62B บน Marketplace GOV $33.9B (+36%) และคำสั่งซื้อ 993 ล้านครั้ง (+28%) · ไม่รวม Deliveroo รายได้ยังโต 23% และ GOV ร้านอาหารสหรัฐโตเร่งขึ้นเล็กน้อยทั้งที่ฐานปีก่อนสูง",
          "กำไรตามเกณฑ์ที่บริษัทใช้วัดโตเร็วกว่ารายได้ — Adjusted EBITDA $1,060M (+41% YoY) คิดเป็น 3.1% ของ GOV สูงสุดในรอบ 5 ไตรมาส และเกินจุดกึ่งกลาง guidance ทุกไตรมาสตั้งแต่ Q3 2025 · ไตรมาสนี้กำไรตามบัญชีตามขึ้นมาด้วย (EPS $1.06 จาก $0.55 ปีก่อน)",
          "Deliveroo ทำให้เป็นผู้เล่นระดับโลกจริง — รายได้ต่างประเทศ Q3 2026 $997M (~22% ของรายได้รวม +92% YoY) · คำสั่งซื้อของ Deliveroo โตเป็นสองเท่าของอัตราก่อนถูกซื้อ และกำไรจากธุรกิจต่างประเทศสูงกว่าที่บริษัทคาดไว้ตอนเข้าไตรมาส",
          "เครื่องยนต์กำไรชั้นสองกำลังติด — โฆษณาสำหรับร้านค้า ค่าสมาชิก DashPass (ช่วยลดค่าธรรมเนียมต่อออเดอร์ร้านอาหารสหรัฐลง 9% ใน 2 ปี) และการจองโต๊ะร้านอาหารผ่านแอปที่โตกว่า 340% QoQ · GOV ของชำและค้าปลีกในสหรัฐโตเร็วกว่าร้านอาหารเกินสองเท่า",
          "Instacart (ถ้าปิดดีลได้) เติมขนาดฝั่งของชำและซอฟต์แวร์ Enterprise ให้ร้านค้าปลีก — บริษัทมองเห็นทางสู่ synergy สุทธิ ≥$500M ต่อปีในหลายปีข้างหน้า แต่ปีแรกหลังปิดดีลจะนำ synergy กลับไปลงทุนเกิน 100%",
          "กระแสเงินสดแข็งแรง — FCF ไตรมาส $787M (4 ไตรมาสล่าสุด ~$2.2B) เงินสดและเงินลงทุน ~$6.8B เทียบหนี้ ~$3.3B ที่ส่วนใหญ่เป็นหุ้นกู้แปลงสภาพดอกเบี้ย 0% · ฐานนี้คือสิ่งที่ทำให้ใช้เงินกู้ซื้อ Instacart ได้โดยตั้งเป้ารักษาอันดับเครดิตระดับ investment grade"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+34% YoY (Q3 2026 — $4.62B) · ไม่รวม Deliveroo โต ~23% · guide Q4 GOV $35.4-36.4B (~+21% YoY ที่จุดกึ่งกลาง)",
          "trend": "flat",
          "score": 82,
          "impact": "positive",
          "why": "ยังโตเร็วมากสำหรับธุรกิจขนาดนี้ แต่ตัวเลขหัวข่าวชะลอเล็กน้อยจาก +36% เป็น +34% ขณะที่ส่วนที่ไม่รวม Deliveroo ทรงตัวที่ ~23% เท่าไตรมาสก่อน · คำสั่งซื้อโต 28% เป็น 993 ล้านครั้ง (ไม่รวม Deliveroo 17%) · Q4 จะครบรอบปีการซื้อ Deliveroo ตัวเลขหัวข่าวจึงสะท้อนการเติบโตจริงของทั้งกลุ่ม — guide GOV ที่จุดกึ่งกลางเท่ากับโต ~21% YoY ซึ่งเป็นฐานที่ต้องจับตาว่าจะรักษาได้หรือไม่"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 2026: GAAP EPS $1.06 — จาก $0.55 ปีก่อน (+93%) และ $0.46 ไตรมาสก่อน · กำไรสุทธิ $466M (+91% YoY) · 9 เดือนแรก EPS $1.93 vs $1.65 (+17%)",
          "trend": "up",
          "score": 65,
          "impact": "positive",
          "why": "กำไรตามบัญชีกลับมาโตแรงหลังหดสองไตรมาสติด แต่ต้องอ่านสองชั้น — ฐานปีก่อนต่ำเพราะ Q3 2025 มีค่าใช้จ่ายอื่น $81M และไตรมาสก่อนถูกกดด้วยค่ากันสำรองคดี/ภาษี/กฎระเบียบ $98M กับค่าหุ้นพนักงานที่สูงเป็นพิเศษ ($349M) ซึ่งไตรมาสนี้ลดเหลือ $16M และ $269M · ตัวเลข 9 เดือนแรก (+17%) จึงเป็นภาพที่นิ่งกว่า และช่องว่างกับ Adjusted EBITDA ($1,060M vs กำไรสุทธิ $466M) ยังกว้างจากค่าหุ้นพนักงานและค่าตัดจำหน่ายจากดีล"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026 = $787M (+9% YoY) · OCF $994M · 4 ไตรมาสล่าสุด $2.20B · บริษัทเตือนว่าจังหวะจ่ายเงินร้านค้าช่วงสิ้นปีจะหัก FCF ทั้งปี 2026 ลง $700-800M",
          "trend": "flat",
          "score": 84,
          "impact": "positive",
          "why": "ยังเป็นจุดแข็งที่สุดของงบ — โมเดลตลาดกลางแทบไม่ต้องลงทุนสินทรัพย์หนัก และเก็บเงินจากผู้บริโภคก่อนจ่ายร้านค้ากับคนส่ง · แต่ไตรมาสนี้ FCF โตเพียง 9% ขณะที่ Adjusted EBITDA โต 41% เพราะค่าพัฒนาซอฟต์แวร์ที่บันทึกเป็นสินทรัพย์เพิ่มขึ้น (4 ไตรมาสล่าสุด $488M จาก $301M ปีก่อน) และ Q4 จะเห็นผลจังหวะจ่ายเงินร้านค้าที่บริษัทเตือนไว้ ซึ่งบริษัทอธิบายว่าเป็นเรื่องจังหวะเวลาเทียบกับปลายปี 2025"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin ~10.0% (Q3 2026 ตามนิยามในตารางประวัติ · GAAP 9.6%) จาก ~3.9% ไตรมาสก่อนและ ~8.0% ปีก่อน · Adjusted EBITDA $1,060M = 3.1% ของ GOV (+41% YoY)",
          "trend": "up",
          "score": 66,
          "impact": "positive",
          "why": "ดีดขึ้นแรงทั้งสองเกณฑ์ — ค่าใช้จ่ายขายและการตลาด วิจัย และบริหารลดลงทั้งหมดเมื่อเทียบไตรมาสก่อน โดยค่าใช้จ่ายบริหารลด 21% เพราะค่ากันสำรองคดี/ภาษี/กฎระเบียบลดจาก $98M เหลือ $16M และค่าหุ้นพนักงาน (รวมภาษีเงินเดือนที่เกี่ยวข้อง) ลดจาก $349M เหลือ $269M · Adjusted EBITDA ต่อ GOV 3.1% สูงสุดในรอบ 5 ไตรมาส · ข้อควรระวังคือส่วนหนึ่งของการดีดตัวมาจากค่ากันสำรองที่ผันผวนตามจังหวะ และ guide Q4 Adjusted EBITDA ที่จุดกึ่งกลาง (~$1.0B) ต่ำกว่า Q3 ตามฤดูกาล"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ปรับดีขึ้นจากกำไรดำเนินงาน Q3 ที่ดีดขึ้น แต่ goodwill + สินทรัพย์ไม่มีตัวตน ~$7.4B (ส่วนใหญ่จาก Deliveroo) ยังเจือจาง และดีล Instacart ~$17B จะเพิ่มฐานทุนอีกมาก",
          "trend": "flat",
          "score": 48,
          "impact": "neutral",
          "why": "ธุรกิจหลักแทบไม่ต้องใช้เงินลงทุน ผลตอบแทนต่อทุนที่ใช้จริงจึงสูง และไตรมาสนี้กำไรดำเนินงานที่ดีขึ้นช่วยให้ตัวเลขดีขึ้นชั่วคราว · แต่ดีล Instacart ~$17B ใหญ่กว่าส่วนของผู้ถือหุ้นทั้งหมดในวันนี้ (~$10.7B) — ผลตอบแทนต่อเงินลงทุนรวมในอีกหลายปีจะขึ้นกับว่า synergy สุทธิ ≥$500M ต่อปีที่บริษัทตั้งไว้เกิดขึ้นจริงหรือไม่ และดีล Deliveroo เองก็ยังพิสูจน์ความคุ้มค่าไม่ครบ"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุน ~$6.8B (30 ก.ย. 2026) — เงินสด $5.05B + ระยะสั้น $0.93B + ระยะยาว $0.81B",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "เพิ่มจาก ~$6.2B ไตรมาสก่อน และยังสร้างเงินสดเพิ่มทุกไตรมาส · แต่เงินก้อนนี้ส่วนหนึ่งถูกวางไว้จ่ายค่าตอบแทนเงินสดของดีล Instacart (อย่างน้อย 75% ของ ~$17B) ร่วมกับเงินกู้ใหม่ — เมื่อปิดดีล กันชนเงินสดจะบางลงมากเทียบกับวันนี้"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้ ~$3.3B — หุ้นกู้แปลงสภาพดอกเบี้ย 0% ครบกำหนดปี 2030 (~$2.73B) + หนี้สัญญาเช่า · เงินสดสุทธิ ~$3.5B · มี commitment bridge loan 364 วัน สูงสุด $13.0B สำหรับดีล Instacart",
          "trend": "down",
          "score": 62,
          "impact": "neutral",
          "why": "วันนี้งบดุลยังเป็นเงินสดสุทธิและต้นทุนดอกเบี้ยแทบเป็นศูนย์ · แต่เมื่อปิดดีล Instacart บริษัทจะใช้เงินสดในมือบวกเงินกู้ระยะยาว (อาจเป็นหุ้นกู้) มาแทน bridge loan — งบดุลจะพลิกเป็นหนี้สุทธิหลายพันล้านดอลลาร์ บริษัทตั้งเป้ารักษาอันดับเครดิตระดับ investment grade · ยังไม่ใช่ความเสี่ยงสภาพคล่องเพราะ Adjusted EBITDA 4 ไตรมาสล่าสุด ~$3.5B แต่ความยืดหยุ่นทางการเงินลดลงชัด และหุ้นกู้แปลงสภาพเดิมยังเป็นการเจือจางที่รอเกิดถ้าราคาหุ้นถึงระดับแปลง"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 440 ล้านหุ้น (ปีก่อน 442 ล้าน) · ค่าหุ้นพนักงานปี 2026 คาด ~$1.2B · ซื้อหุ้นคืน ~$1.0B ใน H1 (Q3 ไม่ได้ซื้อ) · ดีล Instacart อาจออกหุ้นใหม่สูงสุด ~22 ล้านหุ้น (~5%)",
          "trend": "down",
          "score": 50,
          "impact": "neutral",
          "why": "ค่าหุ้นพนักงาน ~$1.2B ต่อปีเท่ากับ ~1.4% ของมูลค่าตลาด เป็นต้นทุนจริงที่ Adjusted EBITDA ไม่นับ · การซื้อหุ้นคืนช่วงครึ่งแรกปีช่วยให้จำนวนหุ้นไม่เพิ่ม แต่ Q3 ไม่ได้ซื้อเลย และเมื่อปิดดีล Instacart ส่วนที่จ่ายเป็นหุ้น (เพดาน 25% ของค่าตอบแทน) จะเพิ่มจำนวนหุ้นอีก ~5% ขณะที่เงินสดที่ต้องกันไว้จ่ายดีลทำให้พื้นที่ซื้อหุ้นคืนแคบลง"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ประกาศซื้อ Instacart ~$17B (29 ต.ค. 2026) ต่อจาก Deliveroo ~$3.72B (ต.ค. 2025) · ซื้อหุ้นคืน ~$1.0B ในปีนี้ เหลือวงเงิน ~$4.0B · ไม่มีปันผล",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ตรรกะเชิงกลยุทธ์ชัด — ของชำออนไลน์ต้องใช้ขนาดเพื่อกดต้นทุนคลังสินค้าและการส่ง และ Deliveroo เริ่มให้ผลดีกว่าที่คาด · แต่การทุ่มเงิน ~$17B ซึ่งส่วนใหญ่เป็นเงินกู้ ก่อนที่ดีลแรกจะพิสูจน์ความคุ้มค่าเต็มที่ เพิ่มความเสี่ยงอย่างมีนัย (หนี้ · antitrust · ค่ายกเลิก $1.25B ถ้าถูกขวาง · การรวมสองแพลตฟอร์ม) — ต้องใช้เวลาหลายปีจึงตัดสินได้ว่าคุ้ม"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$199 (4 พ.ย. 2026) · mcap ~$87B · forward P/E ~34x (non-GAAP FY2026 $5.81) และ ~25x (FY2027 $8.02) · P/E ตามบัญชีจริง ~82x (EPS 4 ไตรมาสล่าสุด $2.42) · ราคาลดลง ~12% ตั้งแต่ต้นปี",
          "trend": "up",
          "score": 50,
          "impact": "neutral",
          "why": "ถูกลงกว่ารอบก่อนในเชิง multiple เพราะกำไรตามบัญชีโตเร็วกว่าราคา (P/E ตามบัญชีลดจาก ~106x เหลือ ~82x) และ forward P/E ฐาน FY2027 ~25x ซึ่ง TIKR ระบุว่าใกล้ระดับต่ำสุดในรอบ 5 ปี · แต่ยังไม่ถูกเมื่อวัดด้วยกำไรตามบัญชี และดีล Instacart เพิ่มความไม่แน่นอนเรื่องหนี้และหุ้นที่จะออกใหม่ซึ่ง multiple ข้างต้นยังไม่ได้ปรับ · เป้าเฉลี่ยนักวิเคราะห์ ~$251 สูงกว่าราคาปัจจุบัน ~27%"
        }
      ],
      "revenueQuality": {
        "acceleration": "steady",
        "consistency": 80,
        "recurringPct": 55,
        "note": "คุณภาพรายได้ดีในเชิงโครงสร้าง — รายได้มาจากคำสั่งซื้อจำนวนมหาศาลที่เกิดซ้ำทุกสัปดาห์ ไม่ได้พึ่งลูกค้ารายใหญ่ไม่กี่ราย และ Net Revenue Margin อยู่ที่ 13.6% ของ GOV ขยับขึ้นจาก 13.5% ไตรมาสก่อน · ตัวเลขการเติบโต 34% ต้องอ่านอย่างระวัง เพราะราว 11 จุดมาจากการรวมงบ Deliveroo (รายได้ Deliveroo $365M ในไตรมาสนี้) ธุรกิจเดิมโตราว 23% เท่าไตรมาสก่อน — จึงเป็นการเติบโตที่ทรงตัว ไม่ใช่เร่งตัว · ตั้งแต่ Q4 2026 บริษัทจะเลิกแยกตัวเลขไม่รวม Deliveroo เพราะครบรอบปีซื้อกิจการ · ตัวเลข segment ด้านล่างเป็นการแบ่งตามภูมิภาคซึ่งเป็นชุดเดียวที่บริษัทเปิดเผยใน 10-Q — DoorDash รายงานเป็น segment เดียวและไม่ได้แยกรายได้ตามหมวด (ร้านอาหาร/ของชำ/ค้าปลีก) หรือตามประเภท (ค่าส่ง/โฆษณา/ค่าสมาชิก) ออกมาเป็นตัวเลข",
        "segments": [
          {
            "name": "สหรัฐอเมริกา",
            "sharePct": 78,
            "growthNote": "ตลาดหลักที่ครองส่วนแบ่งอันดับหนึ่ง — รายได้ Q3 2026 $3.62B (+24% YoY) และเป็นแหล่งกำไรเกือบทั้งหมด · GOV ร้านอาหารโตเร่งขึ้นเล็กน้อย ขณะที่ของชำและค้าปลีกโตเร็วกว่าร้านอาหารเกินสองเท่า",
            "trend": "up"
          },
          {
            "name": "ต่างประเทศ (Wolt · Deliveroo)",
            "sharePct": 22,
            "growthNote": "รายได้ $997M (+92% YoY) ส่วนใหญ่จากการรวม Deliveroo ($365M) · ไม่รวม Deliveroo ยังโต ~21% และคำสั่งซื้อของทุกแบรนด์ต่างประเทศเร่งตัวขึ้น · กำไรสูงกว่าที่บริษัทคาดไว้ตอนเข้าไตรมาส",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 55,
        "items": [
          {
            "item": "ใช้ AI เพิ่มรายได้โฆษณาให้ร้านค้า",
            "status": "executing",
            "evidence": "Q2 2026 บริษัทระบุว่าหน่วยเศรษฐกิจที่ดีขึ้นของธุรกิจโฆษณาเป็นเหตุผลหนึ่งที่ Adjusted EBITDA ทะลุกรอบบนของเป้า — เป็นรายได้ที่แทบไม่มีต้นทุนเพิ่ม · Q3 2026 ไม่ได้เปิดตัวเลขโฆษณาแยก แต่ระบุว่าการรวมกับ Instacart จะเพิ่มขนาดและการขายข้ามหมวดให้ผู้ลงโฆษณา"
          },
          {
            "item": "AI agent สำหรับผู้บริโภคและองค์กร",
            "status": "executing",
            "evidence": "Q3 2026 เปิดตัว Ask DoorDash (ช่วยหาร้านใหม่ที่ใกล้เคียงกับที่สั่งประจำ และจัดตะกร้าของชำได้เร็วขึ้น) · Text DoorDash (สั่งผ่านข้อความนอกแอป) และ Model Context Protocol (MCP) ให้ AI agent ภายนอก เช่นระบบสั่งอาหารขององค์กร เชื่อมเข้าระบบได้ — ยังไม่มีตัวเลขรายได้ให้วัด"
          },
          {
            "item": "ลงทุนในคลังสินค้าและการส่งของอัตโนมัติ (autonomy)",
            "status": "on-track",
            "evidence": "Q3 2026 บริษัทระบุว่ากำลังลงทุนเงินก้อนใหญ่ในคลังสินค้าและการส่งของอัตโนมัติเพื่อสู้ในโลกกายภาพ (atoms) และ outlook ระบุว่าจะเพิ่มการลงทุนในโครงการใหม่ต่อเนื่อง — เป็นการลงทุนระยะยาวที่ยังไม่มีตัวเลขรายได้หรือต้นทุนที่ประหยัดได้ให้วัด"
          },
          {
            "item": "ซอฟต์แวร์และบริการให้ร้านค้า (SevenRooms · การจองโต๊ะ)",
            "status": "executing",
            "evidence": "Q3 2026 การจองร้านอาหารผ่าน marketplace สหรัฐโตกว่า 340% QoQ ในพื้นที่เดิม และกว่า 10% ของการจองมาจากผู้ใช้ที่เพิ่งเข้ามาใช้ DoorDash ในไตรมาสนั้น · ก่อนหน้านี้ (Q2 2026) ร้านที่เซ็นสัญญา SevenRooms ใหม่โตกว่า 100% YoY และระบบสั่งอาหารดิจิทัลมีร้านค้าใช้งานกว่า 150,000 ราย"
          },
          {
            "item": "รวม Deliveroo เข้าระบบเทคโนโลยีเดียวกัน",
            "status": "executing",
            "evidence": "Q3 2026 คำสั่งซื้อของ Deliveroo โตเป็นสองเท่าของอัตราเมื่อ Q3 2025 ก่อนถูกซื้อ และกำไรจากธุรกิจต่างประเทศสูงกว่าที่คาดไว้ตอนเข้าไตรมาส · แต่บริษัทระบุเองว่าการติดตั้งแพลตฟอร์มเทคโนโลยีระดับโลก (global technology platform) ยังไม่เสร็จ"
          },
          {
            "item": "สถานะในคลื่น AI โดยรวม",
            "status": "at-risk",
            "evidence": "DoorDash ประกาศชัดใน Q3 2026 ว่าเลือกสู้ในสนามโลกกายภาพ (atoms) คือเครือข่ายส่งของจริง ไม่ใช่การเป็นผู้ช่วย AI ส่วนตัว — AI จึงเป็นเครื่องมือเพิ่มประสิทธิภาพและช่องทางสั่งซื้อ ไม่ใช่สินค้าที่ขายได้ · ความเสี่ยงคือถ้า AI agent ของผู้เล่นรายใหญ่กลายเป็นหน้าร้านหลักของผู้บริโภค DoorDash อาจถูกลดบทบาทเหลือผู้ส่งของ และถ้าการขับเคลื่อนอัตโนมัติมาถึงก่อนที่บริษัทจะพร้อม โครงสร้างต้นทุนคนส่งอาจกลายเป็นภาระ"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองมาจากวงจรที่ป้อนตัวเอง — ผู้ใช้เยอะดึงร้านค้าเข้ามา ร้านเยอะดึงผู้ใช้เพิ่ม และความหนาแน่นของคำสั่งซื้อในแต่ละพื้นที่ทำให้ต้นทุนต่อการส่งถูกลงจนคู่แข่งที่เล็กกว่าตามไม่ทัน · ชั้นที่สองคือ DashPass ที่เปลี่ยนผู้ใช้จร ๆ เป็นสมาชิกรายเดือนซึ่งสั่งบ่อยขึ้นและเปรียบเทียบราคาน้อยลง · ถ้าดีล Instacart ปิดได้ จะเพิ่มความหนาแน่นในเครือข่ายร้านของชำอีกชั้น ซึ่งก็เป็นเหตุผลเดียวกับที่หน่วยงานกำกับการแข่งขันจะตรวจเข้ม · จุดอ่อนคือทั้งผู้บริโภคและร้านค้าติดตั้งหลายแอปพร้อมกันได้ฟรี ความภักดีจึงมาจากความเคยชินและความคุ้มค่า ไม่ใช่สัญญาผูกมัด",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ผู้นำตลาด",
            "status": "strengthening",
            "note": "ครองส่วนแบ่งส่งอาหารสหรัฐอันดับหนึ่งชัดเจน — Q3 2026 GOV ร้านอาหารสหรัฐโตแบบ QoQ เร็วที่สุดของไตรมาส 3 นับตั้งแต่ปี 2020 · หลังซื้อ Deliveroo เป็นผู้เล่นระดับโลก และดีล Instacart (ถ้าผ่าน) จะเพิ่มตำแหน่งในของชำออนไลน์"
          },
          {
            "key": "techLeadership",
            "label": "ผู้นำเทคโนโลยี",
            "status": "stable",
            "note": "ระบบจัดเส้นทางและจับคู่คนส่งเป็นข้อได้เปรียบด้านต้นทุนที่มาจากขนาดข้อมูลมากกว่าตัวอัลกอริทึม · บริษัทยอมรับเองว่าแพลตฟอร์มเทคโนโลยีระดับโลกใหม่ยังติดตั้งไม่เสร็จ และกำลังลงทุนในคลังสินค้าและการส่งของอัตโนมัติ"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "Adjusted EBITDA เกินจุดกึ่งกลาง guidance ทุกไตรมาสตั้งแต่ Q3 2025 (Q3 2026 +3.4%) และ GOV ไม่เคยต่ำกว่ากรอบ · ทำให้ Deliveroo เร่งการเติบโตได้ภายในหนึ่งปีหลังปิดดีล และเซ็นสัญญาซื้อ Instacart ต่อทันที"
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
            "note": "ขยายจากส่งอาหารไปของชำ ค้าปลีก การจองโต๊ะ ซอฟต์แวร์จัดการร้าน (SevenRooms) และบริการส่งให้แบรนด์อื่นใช้ · Instacart จะเพิ่มซอฟต์แวร์ Enterprise ที่ร้านของชำใช้สร้างช่องทางขายของตัวเอง — ยิ่งร้านใช้หลายบริการยิ่งถอนตัวยาก"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับของนักพัฒนา",
            "status": "stable",
            "note": "ไม่ใช่มิติหลักของธุรกิจนี้ — สิ่งที่เทียบเคียงได้คือร้านค้ากว่า 150,000 รายใช้ระบบสั่งอาหารดิจิทัลของบริษัท และ Q3 2026 เปิด Model Context Protocol (MCP) ให้ AI agent ภายนอกเชื่อมต่อได้ ซึ่งยังเร็วเกินจะวัดการยอมรับ"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "strengthening",
            "note": "สมาชิก DashPass ในสหรัฐยังโตแรงใน Q3 2026 และช่วยลดค่าธรรมเนียมต่อออเดอร์ร้านอาหารสหรัฐลง 9% ใน 2 ปี — สมาชิกสั่งบ่อยกว่าและเทียบราคากับเจ้าอื่นน้อยกว่าผู้ใช้ทั่วไปมาก"
          },
          {
            "key": "moat",
            "label": "ความแข็งแรงของคูเมืองโดยรวม",
            "status": "strengthening",
            "note": "แข็งขึ้นจากความหนาแน่นของคำสั่งซื้อที่มากขึ้น ฐานสมาชิกที่โตเร็ว และขนาดระดับโลกหลังดีล Deliveroo · Instacart จะเพิ่มขนาดฝั่งของชำอีกชั้นถ้าผ่านการพิจารณาด้านการแข่งขัน · แต่ยังเป็นคูเมืองเชิงขนาดและความเคยชิน ไม่ใช่เชิงเทคโนโลยีที่ลอกไม่ได้"
          }
        ]
      },
      "capitalAllocation": {
        "score": 55,
        "verdict": "ใช้เงินสดที่ธุรกิจหามาได้ซื้อขนาดแทนการสร้างเองอย่างต่อเนื่อง — Deliveroo เริ่มให้ผลดีกว่าที่คาด (คำสั่งซื้อเร่งตัว กำไรต่างประเทศเกินเป้า) แต่ก่อนจะพิสูจน์ความคุ้มค่าเต็มที่ บริษัทก็ประกาศดีลที่ใหญ่กว่าราว 4.5 เท่าอย่าง Instacart ~$17B ซึ่งต้องกู้เงินและอาจออกหุ้นใหม่ · ตรรกะเชิงกลยุทธ์ชัด (ของชำต้องใช้ขนาดเพื่อกดต้นทุน) แต่ความเสี่ยงด้านหนี้ antitrust และการรวมกิจการสูงขึ้นมาก คะแนนการจัดสรรทุนจึงลดลงจนกว่าจะเห็นผลจริง",
        "items": [
          {
            "label": "ซื้อกิจการ Deliveroo",
            "current": "~$3.72B ปิดดีล 2 ต.ค. 2025 (180 เพนซ์/หุ้น เป็นเงินสด)",
            "assessment": "neutral",
            "why": "Q3 2026 คำสั่งซื้อของ Deliveroo โตเป็นสองเท่าของอัตราก่อนถูกซื้อ และกำไรจากต่างประเทศเกินที่คาด — สัญญาณดีขึ้นจากรอบก่อน · แต่ค่าตัดจำหน่ายสินทรัพย์จากการซื้อกิจการ (~$450M ทั้งปี 2026 รวมทุกดีล) ยังกดกำไรบัญชี และต้องดูอีกหลายไตรมาสจึงตัดสินได้ว่าคุ้ม"
          },
          {
            "label": "ซื้อกิจการ Instacart (ยังไม่ปิดดีล)",
            "current": "~$17B ($65/หุ้น พรีเมียม 26%) · เงินสดอย่างน้อย 75% + หุ้น DASH ไม่เกิน 25% · bridge loan สูงสุด $13.0B · คาดปิดดีลปลายปี 2027-ครึ่งแรกปี 2028",
            "assessment": "neutral",
            "why": "ได้ขนาดในของชำออนไลน์และซอฟต์แวร์ Enterprise ที่ DoorDash ยังไม่มี และบริษัทมองเห็น synergy สุทธิ ≥$500M ต่อปีในหลายปีข้างหน้า · แต่จ่ายพรีเมียมสูง ต้องกู้เงินก้อนใหญ่ ปีแรกหลังปิดดีลจะลงทุนเกิน 100% ของ synergy และถ้าถูกขวางด้วยเหตุผลด้าน antitrust ต้องจ่ายค่ายกเลิกให้ Instacart $1.25B"
          },
          {
            "label": "ซื้อกิจการ SevenRooms",
            "current": "ซื้อเข้ามาเสริมฝั่งซอฟต์แวร์จัดการร้าน",
            "assessment": "good",
            "why": "ร้านที่เซ็นใหม่โตกว่า 100% YoY (ข้อมูล Q2 2026) — เป็นการซื้อเทคโนโลยีมาขายผ่านฐานร้านค้าเดิมที่มีอยู่แล้ว ความเสี่ยงต่ำและต่อยอดได้ทันที"
          },
          {
            "label": "ซื้อหุ้นคืน",
            "current": "ซื้อคืน 6.8 ล้านหุ้น ~$1.0B (เฉลี่ย ~$155) ในครึ่งแรกปี 2026 · Q3 ไม่ได้ซื้อ · เหลือวงเงิน ~$4.0B จาก $5.0B",
            "assessment": "good",
            "why": "ซื้อในจังหวะราคาต่ำ (เฉลี่ย ~$155 เทียบราคาปัจจุบัน ~$199) และช่วยให้จำนวนหุ้นไม่เพิ่มแม้มีค่าหุ้นพนักงาน · แต่ Q3 หยุดซื้อ และเงินสดที่ต้องกันไว้จ่ายดีล Instacart ทำให้พื้นที่ซื้อคืนต่อจากนี้แคบลง"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี",
            "assessment": "good",
            "why": "ถูกต้องสำหรับบริษัทที่ยังขยายตลาดและมีที่ให้ลงทุนผลตอบแทนสูงกว่าการจ่ายเงินคืน"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและเงินลงทุน ~$6.8B · หนี้ ~$3.3B (หุ้นกู้แปลงสภาพ 0% ปี 2030 + สัญญาเช่า) → เงินสดสุทธิ ~$3.5B · bridge loan สูงสุด $13.0B สำหรับ Instacart",
            "assessment": "neutral",
            "why": "วันนี้ยังแข็งแรงและต้นทุนดอกเบี้ยต่ำมาก แต่เมื่อปิดดีล Instacart บริษัทจะใช้เงินสดในมือบวกเงินกู้ระยะยาวมาแทน bridge loan — งบดุลจะพลิกเป็นหนี้สุทธิ โดยบริษัทตั้งเป้ารักษาอันดับเครดิตระดับ investment grade"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "forward P/E ~34x จาก consensus non-GAAP FY2026 EPS $5.81 และ ~25x จาก FY2027 $8.02 (stockanalysis · 39-43 นักวิเคราะห์) ซึ่ง TIKR ระบุว่าใกล้ระดับต่ำสุดในรอบ 5 ปีและต่ำกว่าค่าเฉลี่ย 3 ปี ~39x · แต่ถ้าวัดด้วยกำไรตามบัญชีจริง 4 ไตรมาสล่าสุด (EPS $2.42) จะอยู่ที่ ~82x ลดจาก ~106x ในรอบก่อนเพราะกำไร Q3 ดีดขึ้น · ราคา ~$199, mcap ~$87B (4 พ.ย. 2026) ลดลง ~12% ตั้งแต่ต้นปีจาก $226 · ช่วงข่าวลือดีล Instacart (23-28 ต.ค.) ราคาลงไปปิดต่ำสุด ~$168 ก่อนดีดขึ้น ~5.6% ในวันประกาศงบพร้อมดีล (29 ต.ค. ปิด $179) · เป้าเฉลี่ยนักวิเคราะห์ ~$251 สูงกว่าราคาปัจจุบัน ~27% · multiple ข้างต้นยังไม่ได้ปรับผลของดีล Instacart ต่อหนี้และจำนวนหุ้น"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026)",
          "prev": "$4.45B (+36% YoY) · ไม่รวม Deliveroo ~23%",
          "now": "$4.62B (+34% YoY) · ไม่รวม Deliveroo ~23% เท่าเดิม",
          "direction": "neutral"
        },
        {
          "metric": "Adjusted EBITDA",
          "prev": "$914M (2.8% ของ GOV)",
          "now": "$1,060M (+41% YoY · 3.1% ของ GOV) — เกินจุดกึ่งกลาง guidance ~3.4%",
          "direction": "positive"
        },
        {
          "metric": "กำไรตามบัญชี",
          "prev": "กำไรสุทธิ $200M · EPS $0.46 · operating margin ~3.9%",
          "now": "กำไรสุทธิ $466M (+91% YoY) · EPS $1.06 · operating margin ~10.0% (GAAP 9.6%) — ค่ากันสำรองคดี/ภาษีลดจาก $98M เหลือ $16M",
          "direction": "positive"
        },
        {
          "metric": "ดีลซื้อกิจการ",
          "prev": "รวมกิจการ Deliveroo (ปิดดีล ต.ค. 2025)",
          "now": "ประกาศซื้อ Instacart ~$17B (เงินสดอย่างน้อย 75% · bridge loan สูงสุด $13.0B · คาดปิดดีลปลายปี 2027-ครึ่งแรกปี 2028 · ค่ายกเลิก $1.25B ถ้าถูก antitrust ขวาง)",
          "direction": "neutral"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "$742M (Q2 2026)",
          "now": "$787M (+9% YoY) — แต่บริษัทเตือนว่าจังหวะจ่ายเงินร้านค้าสิ้นปีจะหัก FCF ทั้งปี 2026 ลง $700-800M",
          "direction": "neutral"
        },
        {
          "metric": "guidance ไตรมาสถัดไป",
          "prev": "Q3: GOV $33.0-34.0B · Adjusted EBITDA $950M-1,100M",
          "now": "Q4: GOV $35.4-36.4B (~+21% YoY ที่จุดกึ่งกลาง) · Adjusted EBITDA $900M-1,100M (จุดกึ่งกลางต่ำกว่า Q3 ตามฤดูกาล)",
          "direction": "neutral"
        }
      ],
      "risks": [
        "ช่องว่างระหว่างกำไรตามบัญชีกับตัวเลขที่บริษัทใช้วัดยังกว้าง — Q3 2026 Adjusted EBITDA $1,060M เทียบกำไรสุทธิ $466M ส่วนต่างคือค่าหุ้นพนักงาน (~$1.2B ต่อปี) และค่าเสื่อม/ค่าตัดจำหน่าย (~$1.2B ต่อปี รวม ~$450M จากสินทรัพย์ที่ได้จากการซื้อกิจการ) · กำไรบัญชีไตรมาสนี้ดีดขึ้นส่วนหนึ่งเพราะค่ากันสำรองคดี/ภาษีลดลง จึงยังสรุปไม่ได้ว่าช่องว่างแคบลงถาวร และดีล Instacart จะเพิ่มค่าตัดจำหน่ายก้อนใหม่",
        "ต้นทุนการย้ายของผู้ใช้ต่ำโดยธรรมชาติ — ทั้งผู้บริโภคและร้านค้าลงหลายแอปพร้อมกันได้ฟรี ความได้เปรียบจึงมาจากขนาดและความเคยชิน ไม่ใช่สัญญาผูกมัด ถ้าคู่แข่งยอมขาดทุนอุดหนุนราคาอีกรอบ ส่วนแบ่งเปลี่ยนได้เร็วกว่าที่คิด",
        "ความเสี่ยงด้านกฎหมายแรงงาน — โมเดลทั้งหมดตั้งอยู่บนการที่คนส่งเป็นผู้รับจ้างอิสระ ไม่ใช่พนักงาน หากกฎหมายในตลาดใหญ่เปลี่ยนให้ต้องจ้างเป็นพนักงาน โครงสร้างต้นทุนจะเปลี่ยนทั้งระบบ และความเสี่ยงนี้เพิ่มขึ้นเมื่อขยายเข้ายุโรปผ่าน Deliveroo ซึ่งกฎหมายแรงงานเข้มกว่าสหรัฐ",
        "ความเสี่ยงจากการซื้อกิจการซ้อนกันสองดีล — Deliveroo (~$3.72B) ยังอยู่ระหว่างพิสูจน์ความคุ้มค่า และ Instacart (~$17B) ต้องผ่าน antitrust ในสหรัฐ แคนาดา และอิสราเอล ซึ่งกินเวลาถึงปลายปี 2027-ครึ่งแรกปี 2028 · ถ้าถูกขวางต้องจ่ายค่ายกเลิก $1.25B ถ้าผ่านต้องแบกหนี้ก้อนใหญ่ (bridge loan สูงสุด $13.0B) ออกหุ้นใหม่ได้ถึง ~5% และรวมสองแพลตฟอร์มใหญ่ระหว่างที่ระบบเทคโนโลยีของตัวเองยังติดตั้งไม่เสร็จ",
        "อ่อนไหวต่อกำลังซื้อผู้บริโภค — การสั่งอาหารส่งถึงบ้านเป็นค่าใช้จ่ายที่ตัดได้ก่อนเมื่อเศรษฐกิจชะลอ บริษัทเตือนใน outlook เองว่าการใช้จ่ายผู้บริโภคอาจแย่กว่าที่คาด และสัดส่วนต่างประเทศ ~22% เพิ่มความเสี่ยงค่าเงินกับภูมิรัฐศาสตร์ · guide Q4 Adjusted EBITDA ที่จุดกึ่งกลาง ~$1.0B ต่ำกว่า Q3 สะท้อนต้นทุนตามฤดูกาลและการลงทุนต่อเนื่อง",
        "ไม่ใช่ผู้ได้ประโยชน์โดยตรงจากคลื่น AI — AI ที่ใช้เป็นเครื่องมือเพิ่มประสิทธิภาพและช่องทางสั่งซื้อ ไม่ใช่สินค้าที่ขายได้ · ถ้า AI agent ของผู้เล่นรายใหญ่กลายเป็นหน้าร้านที่ผู้บริโภคใช้สั่งของ DoorDash อาจเสียความสัมพันธ์ตรงกับลูกค้า (Q3 2026 บริษัทเปิด MCP ให้ agent ภายนอกเชื่อมต่อได้แล้ว) · และในระยะยาว ถ้ายานยนต์ขับเคลื่อนอัตโนมัติมาถึงก่อนที่บริษัทจะพร้อม เครือข่ายคนส่งที่เป็นข้อได้เปรียบวันนี้อาจกลายเป็นต้นทุนที่ปรับตัวยาก"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 4.616,
            "epsAdj": 1.06,
            "opMarginPct": 10,
            "fcfB": 0.904,
            "priceQEnd": 183.55,
            "epsNote": "EPS $1.06 กระโดดจาก $0.46 ไตรมาสก่อนโดยไม่มีรายการครั้งเดียวขนาดใหญ่ — ส่วนใหญ่มาจากค่ากันสำรองคดี/ภาษี/กฎระเบียบที่ลดจาก $98M เหลือ $16M และค่าหุ้นพนักงานที่ลดจาก $349M เหลือ $269M · รายการที่บริษัทตัดออกในไตรมาสนี้ (คดี/ภาษี $16M · ค่าใช้จ่ายดีล $20M · ปรับโครงสร้าง $1M) รวม ~$0.08/หุ้น → ไม่รวมรายการเหล่านี้ ~$1.14 · ช่องว่างโครงสร้างกับ Adjusted EBITDA $1,060M ยังอยู่ (ค่าหุ้นพนักงาน + ค่าเสื่อม/ค่าตัดจำหน่าย $312M ซึ่งรวมค่าตัดจำหน่ายจากดีล Deliveroo) · ฐานปีก่อน (Q3 2025 EPS $0.55) ถูกกดด้วยค่าใช้จ่ายอื่น $81M"
          }
        ],
        "notes": "ปีบัญชีของ DoorDash ตรงกับปีปฏิทินและทุกไตรมาสจบสิ้นเดือนปฏิทิน · EPS ในตารางเป็น diluted GAAP ทั้งชุด ซึ่งต่ำกว่าตัวเลข Adjusted ที่บริษัทและนักวิเคราะห์ใช้มาก (consensus FY2026 non-GAAP อยู่ที่ ~$5.81 ขณะที่ GAAP 9 เดือนแรกของปี 2026 รวมได้ $1.93) เพราะ GAAP รวมค่าหุ้นพนักงานและค่าตัดจำหน่ายจากการซื้อกิจการไว้ด้วย — เทียบข้ามฐานไม่ได้ · operating margin ในตารางใช้นิยามของ stockanalysis ทั้งชุด ซึ่งบวกกลับค่าใช้จ่ายดีล ค่าปรับโครงสร้าง และค่าด้อยค่าสำนักงาน จึงสูงกว่า GAAP เล็กน้อย (Q3 2026 ตาราง ~10.0% vs GAAP 9.6% · Q1 2026 ตาราง 5.3% vs GAAP ~3.7% เพราะค่าปรับโครงสร้าง $48M) · FCF ในตารางคิดแบบ OCF ลบเงินซื้อสินทรัพย์ถาวร จากแหล่งเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ ซึ่งสูงกว่าตัวเลข FCF ที่บริษัทรายงานเอง (Q3 2026: ตาราง $0.904B vs บริษัทรายงาน $0.787B) เพราะบริษัทหักค่าพัฒนาซอฟต์แวร์ที่บันทึกเป็นสินทรัพย์ด้วย · ตัวเลข Marketplace GOV ($33.9B ใน Q3 2026) ไม่ได้อยู่ในตารางนี้เพราะเป็นมูลค่าคำสั่งซื้อรวม ไม่ใช่รายได้ — รายได้ที่บริษัทรับรู้คิดเป็น 13.6% ของ GOV · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/1792789/000179278926000062/proddashex991-pressrelease.htm",
          "https://www.sec.gov/Archives/edgar/data/1792789/000179278926000070/dash-20260930.htm",
          "https://www.sec.gov/Archives/edgar/data/1792789/000114036126041111/ef20084547_8k.htm",
          "https://ir.doordash.com/news/news-details/2026/DoorDash-Releases-Second-Quarter-2026-Financial-Results/default.aspx",
          "https://www.sec.gov/Archives/edgar/data/0001792789/000179278926000050/dash-20260630.htm",
          "https://stockanalysis.com/stocks/dash/financials/",
          "https://stockanalysis.com/stocks/dash/forecast/",
          "https://query1.finance.yahoo.com/v8/finance/chart/DASH (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 5.79,
            "revenue": 17.82
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 5.81,
            "revenue": 17.95
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "2026Q3",
            "metric": "gov",
            "guided": "$33.0-34.0B",
            "actual": "$33.94B",
            "result": "beat",
            "magnitudePct": 1.3
          },
          {
            "quarter": "2026Q3",
            "metric": "adjEbitda",
            "guided": "$950M-1,100M",
            "actual": "$1,060M",
            "result": "beat",
            "magnitudePct": 3.4
          },
          {
            "quarter": "2026Q3",
            "metric": "revenue",
            "guided": "บริษัทไม่ให้ guidance รายได้ (ให้เป็น GOV แทน)",
            "actual": "$4.62B",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "2026Q3",
            "metric": "eps",
            "guided": "บริษัทไม่ให้ guidance กำไรต่อหุ้น",
            "actual": "$1.06 (GAAP diluted)",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "2026Q2",
            "metric": "gov",
            "guided": "$32.4-33.4B",
            "actual": "$33.08B",
            "result": "inline",
            "magnitudePct": 0.5
          },
          {
            "quarter": "2026Q2",
            "metric": "adjEbitda",
            "guided": "$770M-870M",
            "actual": "$914M",
            "result": "beat",
            "magnitudePct": 11.5
          },
          {
            "quarter": "2026Q1",
            "metric": "gov",
            "guided": "$31.0-31.8B",
            "actual": "$31.60B",
            "result": "inline",
            "magnitudePct": 0.6
          },
          {
            "quarter": "2026Q1",
            "metric": "adjEbitda",
            "guided": "$675M-775M",
            "actual": "$754M",
            "result": "beat",
            "magnitudePct": 4
          },
          {
            "quarter": "2025Q4",
            "metric": "gov",
            "guided": "$28.9-29.5B",
            "actual": "$29.68B",
            "result": "beat",
            "magnitudePct": 1.7
          },
          {
            "quarter": "2025Q4",
            "metric": "adjEbitda",
            "guided": "$710M-810M",
            "actual": "$780M",
            "result": "beat",
            "magnitudePct": 2.6
          },
          {
            "quarter": "2025Q3",
            "metric": "gov",
            "guided": "$24.2-24.7B",
            "actual": "$25.02B",
            "result": "beat",
            "magnitudePct": 2.3
          },
          {
            "quarter": "2025Q3",
            "metric": "adjEbitda",
            "guided": "$680M-780M",
            "actual": "$754M",
            "result": "beat",
            "magnitudePct": 3.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 17.95,
            "eps": 5.81,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 21.71,
            "eps": 8.02,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "DoorDash ไม่ให้ guidance รายได้หรือ EPS แต่ให้ Marketplace GOV และ Adjusted EBITDA รายไตรมาส จึงบันทึก guidanceTrack ด้วย metric gov/adjEbitda (Q3 2026 ใส่แถว revenue/eps เป็น noGuidance เพื่อยืนยันว่าไม่ได้ให้) — ตั้งแต่ Q3 2025 Adjusted EBITDA เกินจุดกึ่งกลางทุกไตรมาส ขณะที่ GOV อยู่ในกรอบหรือเกินเล็กน้อย และ guide Q4 2026 คือ GOV $35.4-36.4B / EBITDA $900M-1,100M · consensus FY2026 (~$17.95B / $5.81) และ FY2027 (~$21.71B / $8.02) เป็นฐาน non-GAAP จาก stockanalysis (ฝั่ง GAAP ของ Yahoo Finance อยู่ราว ~$2.76 / ~$4.58) โดย FY2027 ให้ความมั่นใจระดับกลางเพราะ EPS non-GAAP มีแหล่งเดียวและช่วงประมาณกว้าง ส่วน FY2028 ยังไม่ใส่เพราะตัวเลขฟรีที่หาได้คือ FactSet เดือน ส.ค. 2026 ที่ไม่ระบุฐาน (~$25.4B / ~$6.71) — ห้ามเดา"
      }
    },
    "ABNB": {
      "ticker": "ABNB",
      "name": "Airbnb, Inc.",
      "layer": "enterprise",
      "thesis": {
        "statement": "Airbnb คือตลาดกลางที่ชนะแล้วในหมวดที่พักแบบบ้านพักส่วนตัว — เจ้าของบ้านลงประกาศที่นี่เพราะมีนักท่องเที่ยวเยอะที่สุด และนักท่องเที่ยวมาที่นี่เพราะมีที่พักให้เลือกมากที่สุด วนกันไปจนคู่แข่งรายใหม่แทรกได้ยาก · โมเดลนี้แทบไม่ต้องลงทุนสินทรัพย์เลย บริษัทไม่ได้เป็นเจ้าของบ้านสักหลัง แต่เก็บค่าธรรมเนียมจากทุกการจอง ทำให้แปลงรายได้เป็นเงินสดได้ในอัตราสูงมาก (FCF ~39% ของรายได้ใน 9 เดือนแรกปี 2026) · จุดที่ต่างจากหุ้นเติบโตหลายตัวคือ Airbnb ใช้เงินสดก้อนนั้นซื้อหุ้นคืนจนจำนวนหุ้นลดลงจริงราว 10% และเพิ่งล้างหุ้นกู้แปลงสภาพออกจากงบดุลหมด — Q3 2026 เพิ่มวงเงินซื้อหุ้นคืนใหม่อีก $12B · ไตรมาสนี้ยืนยันว่าการเติบโตกลับมาเร่งจริง (รายได้ +19% เร็วสุดในรอบกว่าสามปี) โดยอัตรากำไรขยายตัวไปพร้อมกัน · สิ่งที่ต้องพิสูจน์ต่อคือการขยายออกนอกที่พัก (Experiences, Services และโรงแรม) ว่าจะกลายเป็นเครื่องยนต์ที่สองได้จริงหรือไม่",
        "pillars": [
          "ตลาดกลางที่ชนะแล้ว — Q3 2026 มูลค่าการจองรวม $27.7B (+21%) จากการจอง 155 ล้านคืน/ที่นั่ง (+16%) และรายได้ $4.87B (+19% · +16% ไม่รวมผลค่าเงิน) โดยอเมริกาเหนือมีจำนวนคืนที่จองโตเร็วสุดในรอบสี่ปี",
          "กระแสเงินสดระดับแนวหน้า — FCF 9 เดือนแรกปี 2026 ~$4.4B คิดเป็น ~39% ของรายได้ (Q3 เดียว $1.43B) และทั้งปี FY2025 อยู่ที่ $4.65B บนโมเดลที่ไม่ต้องเป็นเจ้าของสินทรัพย์เลย",
          "คืนทุนผู้ถือหุ้นจริง ไม่ใช่แค่พูด — ซื้อหุ้นคืน $2.85B ใน 9 เดือนแรก อนุมัติวงเงินใหม่อีก $12B รวมวงเงินคงเหลือ $14.7B (~13% ของมูลค่าบริษัท) และหุ้น diluted ลดเหลือ 597 ล้านหุ้น (ปีก่อน 621 ล้าน · FY2023 ~662 ล้าน)",
          "งบดุลสะอาด — หุ้นกู้แปลงสภาพ $2.0B ถูกล้างไปแล้วด้วยหุ้นกู้ธรรมดา $2.5B (ครบกำหนด 2029-2036) เหลือเงินสดและเงินลงทุน ~$12.6B เทียบหนี้ ~$2.5B",
          "การเติบโตกลับมาเร่ง — จาก +10% ใน FY2025 เป็น +18% ใน 9 เดือนแรกปี 2026 และบริษัทยกเป้าทั้งปีเป็นครั้งที่สองเป็นโตระดับสูงของเลขสองหลัก พร้อมอัตรากำไร EBITDA ~36%"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+19% YoY (Q3 2026 — $4.87B · +16% ไม่รวมผลค่าเงิน) ทะลุกรอบบน guidance $4.69-4.77B · 9 เดือนแรก +18% · guide Q4 $3.22-3.28B = +16-18% (รวมผลบวกค่าเงิน ~2pp) · ยกเป้าทั้งปีเป็นโตระดับสูงของเลขสองหลัก",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "เร่งขึ้นต่อเนื่องจาก +10% ใน FY2025 เป็น +17% ใน Q2 และ +19% ใน Q3 ซึ่งเร็วที่สุดในรอบกว่าสามปี — และมาจากปริมาณจริงเป็นหลัก (คืน/ที่นั่งที่จอง +16%) ไม่ใช่แค่ราคาต่อคืน (ไม่รวมค่าเงิน +5%) · ผู้จองครั้งแรกโต 13% สูงสุดตั้งแต่ต้นปี 2022 บ่งชี้ว่าฐานผู้ใช้กว้างขึ้น · ข้อควรระวังคือส่วนหนึ่งของตัวเลขที่รายงานมาจากค่าเงิน (ราว 3pp ใน Q3 และ ~2pp ใน guide Q4)"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3 2026: GAAP EPS $3.16 (ปีก่อน $2.21) +43% · ถ้าตัดรายการภาษีครั้งเดียวในฐาน Q3'25 (~$0.25/หุ้น) โต ~+29% · กำไรสุทธิ $1.89B (+38%) · กำไรจากการดำเนินงาน $2.02B (+24%) · สูงกว่า consensus ~$2.85",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "ตัวเลข +43% ดูแรงเกินจริงเพราะ Q3'25 ถูกกดด้วยการตั้งค่าเผื่อเครดิตภาษี CAMT $213M (หักการกลับรายการภาษี $60M) — ภาพที่ใช้เทียบได้คือกำไรจากการดำเนินงานโต ~24% บวกกับจำนวนหุ้นที่ลดลง ~4% และอัตราภาษีที่แท้จริงที่ลดลงเหลือ ~13-15% ตั้งแต่ปี 2026 (บริษัทคาดทั้งปีราว mid-teens เป็นระดับปกติใหม่) · ยังต้องระวังฤดูกาล: ไตรมาส 3 ทำกำไรเกือบทั้งปี (9 เดือนแรก EPS รวม $4.79) ห้ามเอา EPS ไตรมาสเดียวไปคูณสี่"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3 2026 = $1.43B (29% ของรายได้ · ปีก่อน $1.35B / 33%) · 9 เดือนแรก ~$4.4B (~39% ของรายได้) · ทั้งปี FY2025 อยู่ที่ $4.65B",
          "trend": "flat",
          "score": 90,
          "impact": "positive",
          "why": "ยังเป็นจุดแข็งที่สุดของบริษัท — ไม่ได้เป็นเจ้าของบ้านสักหลัง และผู้เข้าพักจ่ายเงินล่วงหน้าก่อนที่บริษัทจะจ่ายเจ้าของบ้าน ทำให้เงินสดเข้าก่อนออก · แต่ Q3 กระแสเงินสดโตแค่ ~6% ขณะที่รายได้โต 19% เพราะเงินลงทุนในสินทรัพย์ขึ้นเป็น $82M (ปีก่อน $7M) และกระแสเงินสดจากการดำเนินงานโตเพียง ~11% — อัตราการแปลงเป็นเงินสดยังสูงมาก แต่ไม่ได้ดีขึ้นตามกำไร"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "operating margin 41.5% (ปีก่อน 39.7%) · Adjusted EBITDA $2.51B = 51.5% (ปีก่อน 50.1%) ทั้งที่ guide บอกว่าจะลดลงเล็กน้อย · เป้าทั้งปียกขึ้นเป็น ~36% (เดิมอย่างน้อย 35.5%)",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "อัตรากำไรขยายตัวแม้ลงทุนเปิดหมวดใหม่ (Experiences, Services, โรงแรม) และเพิ่มงบการตลาด 19% — แรงส่งจากรายได้ที่เร่งขึ้นมากพอจะแบกการลงทุน · ต้นทุนบริการลูกค้าต่อการจองลดลงกว่า 17% จากผู้ช่วย AI เป็นตัวอย่างของ operating leverage ที่จับต้องได้ · การยกเป้าอัตรากำไรทั้งปีเป็นครั้งที่สองเป็นสัญญาณที่หนักแน่นกว่าคำพูด · ข้อสังเกต: guide Q4 บอกว่า EBITDA margin จะลดลงเล็กน้อยจาก Q4'25"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "สูงมากในเชิงเศรษฐกิจจริง เพราะแทบไม่มีสินทรัพย์ถาวรที่ต้องลงทุน — ตัวเลขทางบัญชีถูกเจือจางด้วยเงินสดและเงินลงทุน ~$12.6B ที่กองอยู่",
          "trend": "flat",
          "score": 72,
          "impact": "positive",
          "why": "ทุนที่ธุรกิจใช้จริงน้อยมากเทียบกำไรที่ทำได้ ผลตอบแทนจึงสูงโดยธรรมชาติของโมเดล · สิ่งที่กดตัวเลขคือเงินสดก้อนใหญ่ที่ยังไม่ได้ใช้ ซึ่งบริษัทกำลังทยอยแก้ด้วยการซื้อหุ้นคืน (วงเงินใหม่ $12B)"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "เงินสดและเงินลงทุนระยะสั้น ~$12.59B (30 ก.ย. 2026: เงินสด $7.27B + เงินลงทุน $5.32B) — เงินสดสุทธิหลังหักหนี้ ~$10.1B",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "กันชนหนามากเทียบขนาดธุรกิจ และยังเพิ่มขึ้นแม้ซื้อหุ้นคืนไป $2.85B ใน 9 เดือน · หมายเหตุการอ่านงบ: เงินที่ถือแทนลูกค้า (~$7.4B) ในงบดุลเป็นเงินของผู้เข้าพักที่ต้องส่งต่อให้เจ้าของบ้าน ไม่ใช่เงินของบริษัท ไม่ได้รวมในตัวเลขนี้"
        },
        {
          "key": "debt",
          "label": "ภาระหนี้",
          "current": "หนี้ระยะยาวเงินต้น $2.5B (มูลค่าตามบัญชี ~$2.37B หลังรายการป้องกันความเสี่ยง) — หุ้นกู้ธรรมดา 4.40% ปี 2029 / 4.65% ปี 2031 / 5.25% ปี 2036 · ไม่มีหุ้นกู้แปลงสภาพเหลือแล้ว",
          "trend": "flat",
          "score": 88,
          "impact": "positive",
          "why": "โครงสร้างหนี้ไม่เปลี่ยนจากไตรมาสก่อน — การเปลี่ยนหุ้นกู้แปลงสภาพเป็นหุ้นกู้ธรรมดาเมื่อ มี.ค. 2026 ตัดความเจือจางที่รอเกิดออกไป แลกกับดอกเบี้ยจ่าย ~$45M ต่อไตรมาส ซึ่งเล็กมากเทียบดอกเบี้ยรับ ~$182M · หนี้สุทธิยังติดลบ (มีเงินสดมากกว่าหนี้ราว $10.1B)"
        },
        {
          "key": "dilution",
          "label": "การเจือจางของหุ้น",
          "current": "หุ้น diluted 597 ล้านหุ้น (Q3 2026) จาก 621 ล้านหุ้นใน Q3'25 (−~4%) และ ~662 ล้านหุ้นใน FY2023 · ซื้อหุ้นคืน $0.71B ใน Q3 · $2.85B ใน 9 เดือน · วงเงินคงเหลือรวม $14.7B หลังอนุมัติใหม่ $12B",
          "trend": "up",
          "score": 78,
          "impact": "positive",
          "why": "หายากมากในกลุ่มหุ้นเติบโต — จำนวนหุ้นลดลงสุทธิจริงราว 10% ตั้งแต่เริ่มโครงการซื้อคืนปี 2022 ไม่ใช่แค่หักล้างค่าหุ้นพนักงาน · วงเงินใหม่ $12B ใหญ่ราว 13% ของมูลค่าบริษัท ทำให้ทิศทางนี้เดินต่อได้อีกหลายปี · ค่าหุ้นพนักงานยังสูง (~$462M ใน Q3) แต่ถูกกลบได้หมด"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรทุน",
          "current": "ซื้อหุ้นคืนเป็นหลัก (อนุมัติวงเงินใหม่ $12B รวมคงเหลือ $14.7B) · ไม่มีปันผล · ลงทุนเปิดหมวดใหม่ Experiences, Services และโรงแรม · รีไฟแนนซ์หนี้ให้สะอาดแล้ว",
          "trend": "up",
          "score": 82,
          "impact": "positive",
          "why": "ลำดับความสำคัญชัดและทำจริง — เอาเงินสดส่วนเกินไปลดจำนวนหุ้น ขณะที่ยังกันงบไว้ลงทุนหมวดใหม่ และล้างหุ้นกู้แปลงสภาพออกไปแล้ว · การอนุมัติวงเงิน $12B ในจังหวะที่ราคาหุ้นขึ้นมา ~40% ในปีนี้หมายความว่าการซื้อคืนรอบต่อไปจะทำที่ราคาแพงกว่าเดิม · จุดที่ยังตัดสินไม่ได้คือเงินที่ลงไปกับหมวดใหม่จะคืนทุนหรือไม่ เพราะบริษัทยังไม่แยกตัวเลขออกมาให้ดู"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคา ~$190 (6 พ.ย. 2026) · mcap ~$112B · forward P/E ~34x จาก consensus non-GAAP FY2026 $5.60 · ~30x จาก FY2027 $6.23 · P/E ตามบัญชีย้อนหลัง ~36x · ขึ้นมา ~40% ตั้งแต่ต้นปี",
          "trend": "down",
          "score": 40,
          "impact": "neutral",
          "why": "แพงขึ้นอีกหลังราคากระโดด ~12% ในวันเดียวหลังงบ Q3 กลับไปใกล้จุดสูงสุดเดิม ~$190 · ที่ ~34 เท่าของกำไรปีนี้ ราคาต้องการให้การเติบโตระดับ 15-19% เดินต่อได้อีกหลายปี · เป้าเฉลี่ยนักวิเคราะห์ ~$200 สูงกว่าราคาเพียง ~5% (แคบลงจาก ~9% เมื่อ ก.ย.) แปลว่าตลาดให้ราคากับการเร่งตัวรอบนี้ไปเกือบหมดแล้ว"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 74,
        "recurringPct": 20,
        "note": "คุณภาพรายได้ดีในแง่การกระจายตัว — มาจากการจองหลายร้อยล้านครั้งจากผู้ใช้ทั่วโลก ไม่พึ่งลูกค้ารายใหญ่แม้แต่รายเดียว และกระจายใน 4 ภูมิภาค · จุดที่ต้องเข้าใจก่อนอ่านกราฟรายไตรมาสคือ **ฤดูกาลรุนแรงมาก** — ไตรมาส 3 (ฤดูท่องเที่ยวซีกโลกเหนือ) มีอัตรากำไรจากการดำเนินงานระดับ 40% ขณะที่ไตรมาส 1 อยู่แค่ 2-5% นี่คือรูปแบบปกติของธุรกิจนี้ ไม่ใช่สัญญาณว่าอะไรพัง · สัดส่วนภูมิภาคก็แกว่งตามฤดูกาลเช่นกัน: ด้านล่างเป็นตัวเลข Q3 ซึ่งเป็นช่วงหน้าร้อนยุโรป EMEA จึงขึ้นไปถึง ~47% ขณะที่ทั้ง 9 เดือนแรกปี 2026 อเมริกาเหนือ ~42% / EMEA ~40% / ละตินอเมริกา ~9% / เอเชียแปซิฟิก ~9% · รายได้แทบไม่มีส่วนที่เป็นสัญญาประจำ ทุกครั้งต้องมีคนกดจองใหม่ จึงอ่อนไหวต่อภาวะเศรษฐกิจและการเดินทางมากกว่าธุรกิจแบบสมาชิกรายเดือน · ตัวเลขด้านล่างเป็นรายได้ตามภูมิภาคที่บริษัทรายงานจริงใน 10-Q",
        "segments": [
          {
            "name": "อเมริกาเหนือ",
            "sharePct": 40,
            "growthNote": "$1,942M (+20% YoY) — ตลาดใหญ่สุดทั้งปีและเป็นฐานกำไรหลัก · จำนวนคืนที่จองโตเร็วสุดในรอบสี่ปี",
            "trend": "up"
          },
          {
            "name": "ยุโรป ตะวันออกกลาง และแอฟริกา",
            "sharePct": 47,
            "growthNote": "$2,298M (+17% YoY) — ใหญ่สุดในไตรมาส 3 ตามฤดูท่องเที่ยวยุโรป ทั้งปีขนาดใกล้เคียงอเมริกาเหนือ",
            "trend": "up"
          },
          {
            "name": "ละตินอเมริกา",
            "sharePct": 6,
            "growthNote": "$306M (+30% YoY) — ภูมิภาคที่โตเร็วที่สุด แต่ฐานยังเล็ก (ฤดูกาลกลับด้าน ไตรมาส 1 ใหญ่กว่า)",
            "trend": "up"
          },
          {
            "name": "เอเชียแปซิฟิก",
            "sharePct": 7,
            "growthNote": "$323M (+19% YoY) — ฐานยังเล็กเทียบขนาดตลาดจริง เป็นพื้นที่ที่ยังเหลือให้ขยายมากที่สุด",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 58,
        "items": [
          {
            "item": "ผู้ช่วย AI สำหรับการค้นหาและบริการลูกค้า",
            "status": "executing",
            "evidence": "Q3 2026 ผู้ช่วย AI ฝ่ายบริการลูกค้ารองรับกว่า 50 ภาษา แก้ปัญหาได้เองราว 40% โดยไม่ต้องใช้พนักงาน และต้นทุนบริการลูกค้าต่อการจองลดลงกว่า 17% YoY · เปิดการค้นหาและตัวกรองด้วย AI แล้ว — ผลด้านต้นทุนวัดได้ชัด แต่ยังไม่มีตัวเลขแยกว่ายอดจองส่วนไหนมาจาก AI โดยตรง"
          },
          {
            "item": "ขยายออกนอกที่พัก — Experiences, Services และโรงแรม",
            "status": "on-track",
            "evidence": "มีโรงแรมบูติกและโรงแรมอิสระหลายพันแห่งใน 60+ จุดหมายแล้ว · เพิ่มบริการใหม่ (ส่งอาหาร ซักรีด อุปกรณ์เด็ก) และรถเช่ากลายเป็นหนึ่งในบริการยอดนิยม · ตัวชี้วัด 'คืนและที่นั่งที่จอง' โต 16% — แต่บริษัทยังไม่แยกรายได้ส่วนนี้ออกมา จึงยังวัดไม่ได้ว่าใหญ่แค่ไหน"
          },
          {
            "item": "ใช้ข้อมูลการจองปรับราคาและจับคู่ที่พัก",
            "status": "executing",
            "evidence": "Q3 การจองโต 16% และมูลค่าการจองโต 21% โดยราคาต่อคืนเฉลี่ยไม่รวมค่าเงินขึ้น 5% ทุกภูมิภาค · ออกเครื่องมือตั้งราคาแบบไดนามิก ผังห้อง 3D และปฏิทินหลายประกาศให้เจ้าของบ้าน รวมกว่า 50 ฟีเจอร์ในไตรมาสเดียว"
          },
          {
            "item": "สถานะในคลื่น AI โดยรวม",
            "status": "at-risk",
            "evidence": "Airbnb ไม่ใช่ผู้ได้ประโยชน์โดยตรงจากคลื่น AI — ใช้ AI เป็นเครื่องมือลดต้นทุนและเพิ่มการแปลงผู้เข้าชมเป็นผู้จอง ไม่ใช่สินค้าที่ขายได้ · บริษัทตอบโจทย์ความเสี่ยงด้านช่องทางด้วยการเตรียมเปิด AI agent วางแผนทริปของตัวเองในครึ่งแรกปี 2027 และเปิดให้จองที่พักกว่าล้านรายการผ่าน Amex Travel (22 ต.ค.) · แต่ถ้าผู้ช่วย AI ของรายอื่นกลายเป็นจุดเริ่มต้นของการวางแผนเดินทาง บริษัทยังเสี่ยงเสียการเข้าถึงลูกค้าโดยตรงซึ่งเป็นหัวใจของโมเดล"
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
            "note": "เป็นผู้นำชัดเจนในหมวดบ้านพักส่วนตัวระดับโลก และ Q3 2026 จำนวนคืนที่จองในอเมริกาเหนือโตเร็วสุดในรอบสี่ปี — แต่ในภาพรวมของการจองที่พักทั้งหมด Booking Holdings ยังมีมูลค่าการจองใหญ่กว่ามาก"
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
            "note": "รายได้ทะลุกรอบบนของเป้าตัวเองสี่ไตรมาสติด (Q4'25-Q3'26) และยกเป้าทั้งปีทั้งด้านรายได้และอัตรากำไรสองรอบติด · ออกกว่า 50 ฟีเจอร์ในไตรมาสเดียวพร้อมเปิดหมวดโรงแรม โดยที่อัตรากำไรยังขยับขึ้น"
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
            "note": "ขยายจากที่พักไปสู่กิจกรรม บริการ และโรงแรม (60+ จุดหมาย) รวมถึงช่องทางใหม่ผ่าน Amex Travel ทำให้แอปเดียวตอบโจทย์การเดินทางได้มากขึ้น — แต่ยังไม่มีตัวเลขรายได้แยกให้วัด"
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
            "note": "ไม่มีค่าสมาชิกหรือสัญญาผูกมัด ผู้ใช้กลับมาเพราะความเคยชินและรีวิวที่สะสมไว้ · ผู้จองครั้งแรกโต 13% ใน Q3 (สูงสุดตั้งแต่ต้นปี 2022) เป็นสัญญาณว่าฐานผู้ใช้ยังกว้างขึ้น ส่วนการจองผ่านแอปช่วยให้คนกลับมาจองตรงมากกว่าผ่านการค้นหา"
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
        "score": 82,
        "verdict": "เป็นหนึ่งในชุดการตัดสินใจเรื่องทุนที่เข้าข้างผู้ถือหุ้นชัดที่สุดในกลุ่มหุ้นเติบโต — เอาเงินสดส่วนเกินไปลดจำนวนหุ้นจนลดได้จริงราว 10% ล้างหุ้นกู้แปลงสภาพออกจากงบดุล และ Q3 2026 อนุมัติวงเงินซื้อคืนใหม่อีก $12B (คงเหลือรวม $14.7B) ขณะที่ยังกันงบลงทุนหมวดใหม่ · จุดที่ยังตัดสินไม่ได้คือเงินที่ลงไปกับ Experiences, Services และโรงแรม เพราะบริษัทยังไม่แยกตัวเลขออกมาให้ดู และการซื้อคืนรอบใหม่จะเกิดที่ราคาหุ้นสูงกว่ารอบก่อน",
        "items": [
          {
            "label": "ซื้อหุ้นคืน",
            "current": "$0.71B ใน Q3 2026 · $2.85B ใน 9 เดือนแรก · อนุมัติวงเงินใหม่ $12B รวมคงเหลือ $14.7B",
            "assessment": "good",
            "why": "ลดจำนวนหุ้นได้สุทธิจริง จาก ~662 ล้านหุ้น (FY2023) เหลือ 597 ล้านหุ้น — ไม่ใช่แค่หักล้างค่าหุ้นพนักงานเหมือนบริษัทเทคโนโลยีส่วนใหญ่ · วงเงินใหม่ใหญ่ราว 13% ของมูลค่าบริษัท"
          },
          {
            "label": "รีไฟแนนซ์หนี้",
            "current": "มี.ค. 2026 ออกหุ้นกู้ธรรมดา $2.5B (ครบกำหนด 2029-2036) ไปชำระหุ้นกู้แปลงสภาพ $2.0B ที่ครบกำหนด",
            "assessment": "good",
            "why": "ตัดความเจือจางที่รออยู่ออกจากงบดุลไปเลย แลกกับดอกเบี้ย ~$45M ต่อไตรมาสที่บริษัทจ่ายได้สบายจากดอกเบี้ยรับของเงินสด ~$12.6B — เป็นการแลกที่คุ้มสำหรับผู้ถือหุ้นเดิม"
          },
          {
            "label": "ลงทุนหมวดใหม่",
            "current": "Experiences, Services และโรงแรม (60+ จุดหมาย) · ช่องทาง Amex Travel · AI agent วางแผนทริปเริ่มครึ่งแรกปี 2027",
            "assessment": "neutral",
            "why": "ทิศทางถูกเพราะขยายตลาดที่เข้าถึงได้โดยใช้ฐานผู้ใช้เดิม และทำได้โดยอัตรากำไรรวมยังขยับขึ้น · แต่ยังไม่แยกตัวเลขให้ดู จึงยังวัดไม่ได้ว่าคืนทุนหรือไม่"
          },
          {
            "label": "เงินปันผล",
            "current": "ไม่มี",
            "assessment": "good",
            "why": "สมเหตุสมผลเมื่อยังซื้อหุ้นคืนได้ต่อเนื่อง การซื้อหุ้นคืนมีประสิทธิภาพทางภาษีดีกว่าสำหรับผู้ถือหุ้นส่วนใหญ่"
          },
          {
            "label": "งบดุล",
            "current": "เงินสดและเงินลงทุน ~$12.59B · หนี้เงินต้น $2.5B → เงินสดสุทธิ ~$10.1B",
            "assessment": "good",
            "why": "กันชนหนามากและไม่มีความเสี่ยงทางการเงิน · ข้อสังเกตเดียวคือเงินสดที่กองอยู่เยอะทำให้ผลตอบแทนต่อทุนทางบัญชีดูต่ำกว่าความเป็นจริงของธุรกิจ"
          }
        ]
      },
      "valuationView": {
        "level": "premium",
        "note": "forward P/E ~34x จาก consensus non-GAAP FY2026 EPS $5.60 และ ~30x จาก FY2027 $6.23 · P/E ตามบัญชีย้อนหลัง 4 ไตรมาส ~36x (GAAP EPS รวม ~$5.35) — ช่องว่างสองฐานแคบเพราะ Airbnb มีกำไร GAAP จริงและไม่ได้รายงาน adjusted EPS เอง · ราคา ~$190, mcap ~$112B (ปิด 6 พ.ย. 2026) ขึ้น ~40% ตั้งแต่ต้นปีจาก $136 โดยกระโดด ~12% ในวันเดียวหลังงบ Q3 (จาก $170) กลับไปใกล้จุดสูงสุดเดิม ~$190.5 (25 ส.ค.) · เป้าเฉลี่ยนักวิเคราะห์ ~$200 สูงกว่าราคาเพียง ~5% แคบลงจาก ~9% เมื่อ ก.ย. แปลว่าตลาดให้ราคากับการเร่งตัวรอบนี้ไปเกือบหมดแล้ว margin of safety บางลงอีก · วงเงินซื้อคืน $14.7B (~13% ของ mcap) ช่วยลดจำนวนหุ้นต่อเนื่อง แต่ไม่ได้ทำให้ราคาถูกลง"
      },
      "whatChanged": [
        {
          "metric": "รายได้ (Q2 → Q3 2026)",
          "prev": "$3.61B (+17% YoY)",
          "now": "$4.87B (+19% YoY · +16% ไม่รวมค่าเงิน) — ทะลุกรอบบน guidance $4.69-4.77B และโตเร็วสุดในรอบกว่าสามปี",
          "direction": "positive"
        },
        {
          "metric": "กำไรต่อหุ้น (GAAP)",
          "prev": "$1.37 (Q2 · +33% YoY)",
          "now": "$3.16 (+43% YoY · สูงกว่า consensus ~$2.85) — ฐาน Q3'25 ถูกกดด้วยรายการภาษีครั้งเดียว ~$0.25 ถ้าตัดออกโต ~+29%",
          "direction": "positive"
        },
        {
          "metric": "อัตรากำไร (เทียบไตรมาสเดียวกันปีก่อน)",
          "prev": "Q2: operating margin 21.0% (ปีก่อน 19.8%) · guide Q3 EBITDA margin ลดลงเล็กน้อย",
          "now": "Q3: operating margin 41.5% (ปีก่อน 39.7%) · EBITDA margin 51.5% (ปีก่อน 50.1%) — ขยายตัวสวนทาง guide",
          "direction": "positive"
        },
        {
          "metric": "เป้าทั้งปี 2026",
          "prev": "รายได้โตอย่างน้อยระดับกลางของเลขสองหลัก · EBITDA margin อย่างน้อย 35.5%",
          "now": "ยกขึ้นอีกรอบเป็นโตระดับสูงของเลขสองหลัก · EBITDA margin ~36% · guide Q4 รายได้ $3.22-3.28B (+16-18%)",
          "direction": "positive"
        },
        {
          "metric": "การซื้อหุ้นคืน",
          "prev": "$1.07B ใน Q2 · เหลือวงเงิน $3.4B",
          "now": "$0.71B ใน Q3 · อนุมัติวงเงินใหม่ $12B รวมคงเหลือ $14.7B (~13% ของ mcap)",
          "direction": "positive"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "Q2 $1.25B (35% ของรายได้)",
          "now": "Q3 $1.43B (29% ของรายได้ · ปีก่อน 33%) — โตแค่ ~6% YoY ขณะที่รายได้โต 19% จากเงินลงทุนในสินทรัพย์ที่ขึ้นเป็น $82M",
          "direction": "negative"
        }
      ],
      "risks": [
        "อ่อนไหวต่อเศรษฐกิจและการเดินทางโดยตรง — รายได้แทบไม่มีส่วนที่เป็นสัญญาประจำ ทุกครั้งต้องมีคนกดจองใหม่ การท่องเที่ยวเป็นค่าใช้จ่ายที่ตัดได้ก่อนเมื่อกำลังซื้อหด และช่วงโควิดพิสูจน์แล้วว่ารายได้หายได้เกือบทั้งหมดในไตรมาสเดียว",
        "ความเสี่ยงด้านกฎระเบียบในเมืองใหญ่ — หลายเมืองทั่วโลกจำกัดหรือห้ามการปล่อยเช่าระยะสั้น ซึ่งกระทบอุปทานที่พักโดยตรงในตลาดที่ทำเงินได้ดีที่สุด (ล่าสุดบริษัทต้องวางหลักประกัน ~€70M ในข้อพิพาทเรื่องที่พักระยะสั้นในสเปน) และยังมีภาระภาษีที่พักที่อาจต้องรับผิดร่วมกับเจ้าของบ้าน — เป็นความเสี่ยงที่บริษัทควบคุมไม่ได้",
        "ผู้ช่วย AI อาจแย่งจุดเริ่มต้นของการวางแผนเดินทาง — วันนี้คนเปิดแอป Airbnb เพื่อหาที่พัก ถ้าพฤติกรรมเปลี่ยนไปเริ่มที่ผู้ช่วย AI ของรายอื่นแล้วให้มันไปจองให้ Airbnb จะกลายเป็นผู้รับคำสั่งแทนที่จะเป็นเจ้าของความสัมพันธ์กับลูกค้า ซึ่งจะกดทั้งอำนาจต่อรองและอัตรากำไร · AI agent ของบริษัทเองจะเริ่มเปิดครึ่งแรกปี 2027 ยังต้องพิสูจน์",
        "ต้นทุนการย้ายต่ำทั้งสองฝั่ง — เจ้าของบ้านลงประกาศหลายแพลตฟอร์มพร้อมกันได้ฟรี และ Booking.com ที่ใหญ่กว่าในฝั่งโรงแรมกำลังรุกเข้าหมวดบ้านพัก ขณะที่ Airbnb เองก็เพิ่งเริ่มรุกเข้าหมวดโรงแรมซึ่งเป็นสนามของคู่แข่ง ความได้เปรียบจึงมาจากขนาดและแบรนด์ ไม่ใช่สัญญาผูกมัด",
        "ราคาไล่ทันพื้นฐานไปมากแล้ว — ขึ้น ~40% ในปีนี้ (กระโดด ~12% หลังงบ Q3) และเทรดที่ ~34 เท่าของกำไรปีนี้ ขณะที่เป้าเฉลี่ยนักวิเคราะห์สูงกว่าราคาเพียง ~5% · ส่วนหนึ่งของการเติบโตที่รายงานมาจากค่าเงิน (Q3 +19% แต่ไม่รวมค่าเงิน +16%) ถ้าค่าเงินพลิกหรือการเติบโตชะลอกลับต่ำกว่า 15% การปรับฐานจะแรงกว่าพื้นฐานที่แย่ลงจริง",
        "ฤดูกาลรุนแรงทำให้อ่านผลประกอบการผิดได้ง่าย — ไตรมาส 3 มีอัตรากำไรระดับ 40% ส่วนไตรมาส 1 อยู่แค่ 2-5% ใครที่เอาไตรมาสเดียวไปคูณสี่จะได้ภาพที่ผิดไปมาก และข่าวร้ายในไตรมาสอ่อนมักถูกตีความเกินจริง",
        "การขยายออกนอกที่พักยังพิสูจน์ไม่ได้ — Experiences, Services และโรงแรมถูกนับรวมในตัวชี้วัดแล้วแต่บริษัทยังไม่แยกรายได้ให้ดู จึงยังไม่รู้ว่าเป็นเครื่องยนต์ที่สองจริงหรือเป็นแค่ส่วนเสริมที่กินงบลงทุน"
      ],
      "asOf": "2026-11",
      "nextEarnings": "2027-02",
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
            "priceQEnd": 121.42,
            "epsNote": "EPS $2.21 ถูกกดด้วยรายการภาษีครั้งเดียว — ตั้งค่าเผื่อสินทรัพย์ภาษีรอตัดบัญชีจากเครดิตภาษี CAMT $213M หักด้วยการกลับรายการภาระภาษีที่ไม่แน่นอนของปีก่อน ๆ $60M สุทธิ ~$153M หรือ ~$0.25/หุ้น · ถ้าตัดออก EPS ~$2.46 · เป็นรายการใต้กำไรจากการดำเนินงาน (operating margin 39.7% ไม่กระทบ) — EPS Q3'26 ที่โต +43% จึงสูงเกินภาพจริง (ไม่รวมรายการ ~+29%)"
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
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 4.869,
            "epsAdj": 3.16,
            "opMarginPct": 41.5,
            "fcfB": 1.508,
            "priceQEnd": 160.65
          }
        ],
        "notes": "ปีบัญชีของ Airbnb ตรงกับปีปฏิทินและทุกไตรมาสจบสิ้นเดือนปฏิทิน · **ต้องอ่านฤดูกาลให้ออกก่อนดูกราฟรายไตรมาส** — ไตรมาส 3 เป็นฤดูท่องเที่ยวและมีอัตรากำไรจากการดำเนินงานระดับ 40% ขณะที่ไตรมาส 1 อยู่แค่ 2-5% ทุกปี เป็นรูปแบบปกติ ไม่ใช่สัญญาณว่าอะไรพัง · EPS เป็น diluted GAAP ทั้งชุด · FY2023 EPS $7.24 สูงผิดปกติเพราะรวมรายการทางภาษีครั้งเดียวราว $2.9B ใน Q3'23 ไว้ด้วย — ถ้าตัดออก กำไรทั้งปีจะอยู่ในระดับใกล้เคียง FY2024 และ FY2025 ห้ามอ่านว่ากำไรถดถอยลงจาก FY2023 · Q3'25 EPS $2.21 ถูกกดด้วยรายการภาษีครั้งเดียวสุทธิ ~$153M (~$0.25/หุ้น) จึงเพิ่ม epsNote ย้อนหลังในรอบ 2026-11 เพื่อไม่ให้อ่าน EPS Q3'26 (+43%) เกินจริง · ตั้งแต่ปี 2026 อัตราภาษีที่แท้จริงลดลงเป็นราว mid-teens ตามกฎหมายภาษีสหรัฐฯ ฉบับใหม่ (OBBBA) ซึ่งเป็นระดับปกติใหม่ ไม่ใช่รายการครั้งเดียว · ตรวจสอบความถูกต้องแล้วโดยบวกรายไตรมาสเทียบรายปี: FY2023 = $9,917M · FY2024 = $11,102M · FY2025 = $12,241M ตรงกันทั้งสามปี และ 9 เดือนแรกปี 2026 (Q1+Q2+Q3) = $11,155M ตรงกับงบ 9 เดือนใน 8-K · คอลัมน์กระแสเงินสดในตารางนี้เป็น **กระแสเงินสดจากการดำเนินงาน** เพราะแหล่งข้อมูลเดิมไม่ได้แยกเงินลงทุนในสินทรัพย์ออกมา ซึ่งสูงกว่าตัวเลข Free Cash Flow ที่บริษัทรายงานเอง (Q2 2026: ตาราง $1.270B vs บริษัท $1.253B · Q3 2026: ตาราง $1.508B vs บริษัท $1.426B ต่างกัน $82M ซึ่งสูงกว่าปกติ) — ใช้ฐานเดียวกันทั้งชุดเพื่อให้เทียบข้ามไตรมาสได้ · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://news.airbnb.com/airbnb-q3-2026-financial-results/",
          "https://www.sec.gov/Archives/edgar/data/1559720/000119312526449727/d437988dex991.htm",
          "https://www.sec.gov/Archives/edgar/data/1559720/000155972026000032/abnb-20260930.htm",
          "https://www.sec.gov/Archives/edgar/data/1559720/000155972025000030/R17.htm (Q3'25 income-tax note)",
          "https://news.airbnb.com/airbnb-q2-2026-financial-results/",
          "https://www.sec.gov/Archives/edgar/data/0001559720/000155972026000027/abnb-20260630.htm",
          "https://stockanalysis.com/stocks/abnb/financials/",
          "https://stockanalysis.com/stocks/abnb/forecast/",
          "https://ca.marketscreener.com/quote/stock/AIRBNB-INC-182383708/finances/",
          "https://query1.finance.yahoo.com/v8/finance/chart/ABNB (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-11",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": 5.3,
            "revenue": 14.16
          },
          {
            "asOf": "2026-11",
            "fy": "FY2026",
            "eps": 5.6,
            "revenue": 14.39
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "Q3 2026",
            "metric": "revenue",
            "guided": "$4.69-4.77B",
            "actual": "$4.869B",
            "result": "beat",
            "magnitudePct": 2.9
          },
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
          },
          {
            "quarter": "Q4 2025",
            "metric": "revenue",
            "guided": "$2.66-2.72B",
            "actual": "$2.778B",
            "result": "beat",
            "magnitudePct": 3.3
          },
          {
            "quarter": "Q3 2025",
            "metric": "revenue",
            "guided": "$4.02-4.10B",
            "actual": "$4.095B",
            "result": "inline",
            "magnitudePct": 0.9
          },
          {
            "quarter": "Q2 2025",
            "metric": "revenue",
            "guided": "$2.99-3.05B",
            "actual": "$3.096B",
            "result": "beat",
            "magnitudePct": 2.5
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 14.39,
            "eps": 5.6,
            "confidence": "high",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 16.06,
            "eps": 6.23,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "Airbnb ให้ guidance รายได้เป็นช่วงแคบทุกไตรมาส ซึ่งเทียบกับผลจริงได้ตรง ๆ · หกไตรมาสที่ยืนยัน guidance ต้นทางจาก shareholder letter ได้ ทะลุจุดกึ่งกลางห้าไตรมาส (Q2'25 +2.5% · Q4'25 +3.3% · Q1'26 +2.6% · Q2'26 +1.1% · Q3'26 +2.9%) และอยู่ในกรอบหนึ่งไตรมาส (Q3'25 +0.9%) — ยังไม่ใส่ Q1'25 เพราะหา letter ต้นทางยืนยันไม่ได้ในรอบนี้ · Q3'26 ยังมี guidance เชิงคุณภาพที่บันทึกเป็นแถวไม่ได้เพราะไม่มีจุดกึ่งกลาง: บอกว่า EBITDA margin จะลดลงเล็กน้อยจาก 50.1% แต่ได้ 51.5% และ GBV จะโตระดับกลางของเลขสองหลัก แต่ได้ +21% · guide Q4 2026 = รายได้ $3.22-3.28B (+16-18% รวมผลบวกค่าเงิน ~2pp) และ EBITDA margin ลดลงเล็กน้อยจาก Q4'25 · consensus FY2026 ~$14.39B / EPS $5.60 (stockanalysis ฐาน non-GAAP · marketscreener ~$14.38B / $5.57 สอดคล้องกัน) ปรับขึ้นจาก $14.16B / $5.30 เมื่อ ก.ย. หลังบริษัทยกเป้า · FY2027 ~$16.06B / $6.23 จาก stockanalysis ใกล้กับ marketscreener ~$16.10B / $6.35 ที่ไม่ระบุฐาน จึงให้ความมั่นใจระดับกลาง · ABNB ไม่ได้รายงาน adjusted EPS เอง ตัวเลข non-GAAP ของ consensus จึงอยู่ใกล้ GAAP มาก (9 เดือนแรกปี 2026 GAAP EPS รวม $4.79)"
      }
    },
    "RBLX": {
      "ticker": "RBLX",
      "name": "Roblox Corporation",
      "layer": "enterprise",
      "thesis": {
        "statement": "แพลตฟอร์ม UGC (ผู้เล่นสร้างเกมเอง) ที่มีผู้ใช้ 138 ล้านคนต่อวันและเศรษฐกิจในเกมของตัวเอง เพิ่งผ่านไตรมาสแรกที่ยอดเติมเงิน (bookings) ติดลบ YoY (-12% ใน Q3/26) แต่ออกมาดีกว่าที่บริษัทเองกลัว (-14% ถึง -18%) และกลับมาโต QoQ ครั้งแรกของปี พร้อมผู้ใช้ต่อวันที่เด้งจาก 123 เป็น 138 ล้านคน — ทว่า Q4/26 บริษัทยังคาด bookings -10% ถึง -15% และเป็นครั้งแรกในรอบหลายปีที่ทั้ง adjusted EBITDA และกระแสเงินสดอิสระถูกคาดว่าจะติดลบ คำถามของ thesis จึงเปลี่ยนจาก 'ผู้ใช้หายไปแล้วไม่กลับมาหรือไม่' (คำตอบเริ่มเป็น 'กลับมา') ไปเป็น 'คนที่กลับมาจะยอมจ่ายเท่าเดิมหรือไม่ และบริษัทต้องถมเงินอีกเท่าไรเพื่อให้โตต่อ'",
        "pillars": [
          "เศรษฐกิจปิดในแพลตฟอร์ม — ผู้ใช้เติมเงินซื้อ Robux แล้วใช้ในเกมของครีเอเตอร์ บริษัทแบ่งรายได้กลับให้ครีเอเตอร์ (developer exchange fees ~24% ของ bookings สูงขึ้นจาก 22% เพราะขึ้นอัตราจ่ายให้ครีเอเตอร์) ทำให้ยิ่งมีครีเอเตอร์เก่ง ยิ่งมีเกมดี ยิ่งดูดผู้ใช้",
          "ฐานผู้ใช้อายุน้อยที่โตขึ้นมาพร้อมแพลตฟอร์ม — กลุ่มอายุเกิน 18 ปีขึ้นมาเป็น 29% ของผู้ใช้ที่ยืนยันอายุแล้ว (จาก 27% ใน Q2/26) และ 37% ในสหรัฐฯ กลุ่มอายุ 18-34 ปีในสหรัฐฯ โต 26% YoY สวนทางภาพรวม และกลุ่มนี้จ่ายเงินมากกว่าผู้ใช้ต่ำกว่า 18 ปีราว 50%",
          "ตลาดนอกสหรัฐฯ ยังเป็นเครื่องยนต์ที่เหลืออยู่ — ผู้ใช้ต่อวันในอินเดีย +37% ญี่ปุ่น +33% ซาอุดีอาระเบีย +30% ฝรั่งเศส +12% เยอรมนี +13% ขณะที่สหรัฐฯ+แคนาดา -10% YoY",
          "AI เป็นทั้งเครื่องมือสร้างเนื้อหาและคำอธิบายของตัวเลข — Build (สร้างเกมจากคำสั่งข้อความ) มีผู้ใช้กว่า 500,000 คนและเกมที่เผยแพร่กว่า 70,000 เกมตั้งแต่ยังเป็น alpha ส่วนการปรับอัลกอริทึมแนะนำเกม (RFY) ที่เคยถูกโทษว่ากดรายได้ เริ่มให้ผลเป็น retention สูงสุดตั้งแต่ปี 2021 และ bookings ต่อชั่วโมงกลับมาโต +4% YoY",
          "กระแสเงินสดยังเป็นบวกจริงแม้บัญชีขาดทุน — FCF 12 เดือนล่าสุด ~$1.56B และมีเงินสด+เงินลงทุน $6.24B เทียบหนี้ $1.01B แต่ต้องยอมรับว่า Q4/26 บริษัทคาด FCF ติดลบ $(190)M ถึง $(105)M เป็นครั้งแรกในรอบหลายปี (ส่วนหนึ่งจาก capex ที่เลื่อนมาจาก Q3)"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "รายได้ Q3/26 $1.572B +16% YoY · bookings $1,697M -12% YoY (ติดลบ YoY ครั้งแรก แต่ +9% QoQ และเหนือกรอบบน guidance $1,576-1,653M) · Q4 บริษัทคาด bookings $1,890-2,000M (-10% ถึง -15%)",
          "trend": "down",
          "score": 35,
          "impact": "negative",
          "why": "รายได้ +16% เป็นภาพย้อนหลังจาก bookings ปี 2025 ที่ทยอยเข้างบ (ยอดรอรับรู้คงเหลือ $7.04B และการเปลี่ยนแปลงของรายได้รอรับรู้ไตรมาสนี้เหลือเพียง +$136M จาก +$573M ปีก่อน) ตัวที่บอกอนาคตคือ bookings ซึ่งติดลบ YoY เป็นครั้งแรกตามที่บริษัทเตือนไว้ แต่ติดลบน้อยกว่าที่คาด (-12% vs -14% ถึง -18%) และเป็นไตรมาสแรกของปีที่โต QoQ ($1,557M → $1,697M) บนฐานสองปีโตกว่า 50% · ให้คะแนนขยับขึ้นจาก 32 เล็กน้อยเพราะได้หลักฐานแรกว่าการลงอาจเริ่มชะลอ แต่ยังต่ำเพราะ Q4 ยังถูกคาดว่าติดลบ -10% ถึง -15% และรายได้ทางบัญชีจะชะลอตามในปี 2027 เมื่อ bookings ก้อนใหญ่ของปี 2025 ทยอยหมดอายุรับรู้"
        },
        {
          "key": "epsGrowth",
          "label": "กำไรต่อหุ้น",
          "current": "ขาดทุน GAAP $(0.32)/หุ้น ดีขึ้นจาก $(0.37) ปีก่อน แต่แย่ลงจาก $(0.26) ใน Q2/26 · รวมสำรองคดีกับรัฐต่าง ๆ $49M (~$0.07/หุ้น) ไม่รวมรายการนี้ ~$(0.25) · ยังไม่เคยมีกำไร GAAP ตั้งแต่เข้าตลาดปี 2021",
          "trend": "flat",
          "score": 36,
          "impact": "neutral",
          "why": "ขาดทุนแคบลง YoY ต่อเนื่องเป็นไตรมาสที่สาม (9 เดือน $(0.92) เทียบ $(1.09)) แต่พลิกแย่ลง QoQ เพราะตั้งสำรองข้อตกลงยอมความกับรัฐต่าง ๆ เรื่องความปลอดภัยเยาวชน $49M และค่าการตลาดซื้อผู้ใช้ที่เพิ่ม 66% YoY · ที่ต้องระวังคือ guidance Q4/26 คาดขาดทุนสุทธิ $(423)M ถึง $(363)M (ราว $(0.50) ถึง $(0.59) ต่อหุ้น) แย่กว่า Q4/25 ที่ $(0.45) และ *ไม่รวม* สำรองคดีที่อาจตั้งเพิ่ม · consensus ยังคาดขาดทุนทั้งปี 2026 ราว $(1.41) ถึง $(1.50) และปี 2027 ราว $(1.32) แปลว่าไม่มีใครคาดว่าจะพลิกกำไรภายใน 2 ปีนี้ · เพราะยังขาดทุน P/E จึงคำนวณไม่ได้"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "FCF Q3/26 $364M (บริษัทเคยคาดเพียง $(60)M ถึง $5M — เหนือเป้ามากส่วนหนึ่งเพราะ capex เลื่อนไป Q4) · 9 เดือน $1,254M · 12 เดือนล่าสุด ~$1.56B · Q4 บริษัทคาด $(190)M ถึง $(105)M",
          "trend": "down",
          "score": 58,
          "impact": "neutral",
          "why": "จุดแข็งที่แท้จริงของบริษัทนี้ยังคือเงินสด ไม่ใช่กำไรทางบัญชี — เก็บเงินจากผู้ใช้ล่วงหน้าแล้วค่อยทยอยลงบัญชี แต่กลไกนี้กำลังทำงานย้อนกลับให้เห็นชัดขึ้น: เงินสดจากการดำเนินงานไตรมาสนี้ $395M ลดจาก $546M ปีก่อน เพราะรายได้รอรับรู้เพิ่มเพียง $132M (ปีก่อน $574M) · ตัวเลข $364M ดูดีกว่าความจริงเพราะ capex จ่ายไปแค่ $31M และถูกเลื่อนไปรวมใน Q4 ($380M) ซึ่งเป็นเหตุผลหลักที่ Q4 ถูกคาดว่า FCF ติดลบ · ยังให้คะแนนเกินครึ่งเพราะ 12 เดือนล่าสุดยังเป็นบวก ~$1.56B และดอกเบี้ยรับปีละกว่า $200M แต่ลดจาก 62 เพราะทิศทางรายไตรมาสกำลังลงจริง"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "อัตราขาดทุนจากการดำเนินงาน -18.0% (ปีก่อน -21.8% · Q2/26 -15.6%) · ไม่รวมสำรองคดี $49M ≈ -14.9% · adjusted EBITDA $138M เทียบ $46M ปีก่อน · Q4 บริษัทคาด adjusted EBITDA $(70)M ถึง $(10)M",
          "trend": "down",
          "score": 40,
          "impact": "neutral",
          "why": "YoY ยังดีขึ้น (รายได้โต 16% ขณะค่าใช้จ่ายรวมโต 12%) แต่ QoQ ถอยหลังครั้งแรกในรอบสี่ไตรมาส ด้วยเหตุผลที่ไม่ใช่ครั้งเดียวทั้งหมด: สำรองคดี $49M เป็นรายการพิเศษ แต่ค่าการตลาด +66% (ซื้อผู้ใช้กลุ่มอายุเกิน 18) และค่าโครงสร้างพื้นฐาน+ความปลอดภัย +20% (ต้นทุน AI training/inference) เป็นรายจ่ายที่บริษัทตั้งใจเพิ่มต่อ · ที่ทำให้ลดคะแนนจาก 46 คือ guidance Q4 ที่บริษัทพูดตรง ๆ ว่าจะมี 'fixed cost deleveraging' และ adjusted EBITDA ติดลบ ซึ่งเป็นครั้งแรกตั้งแต่ปี 2022 — แปลว่ามาร์จิ้นที่ดีขึ้นมาตลอดปี 2025-26 กำลังถอยกลับอย่างน้อยหนึ่งไตรมาส"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังติดลบ — ขาดทุนจากการดำเนินงาน 12 เดือนล่าสุดราว $(1.17)B",
          "trend": "flat",
          "score": 24,
          "impact": "negative",
          "why": "คำนวณ ROIC ไม่ได้อย่างมีความหมายเพราะตัวเศษยังติดลบทุกปีตั้งแต่เข้าตลาด เงินที่ลงไปกับโครงสร้างพื้นฐาน ความปลอดภัย และ R&D ยังไม่เคยแปลงกลับมาเป็นกำไรทางบัญชี · ถ้าจะให้เครดิต ต้องดูที่ FCF แทน ซึ่งเป็นบวกและยังโตบนฐาน 12 เดือน แต่นั่นเป็นคนละเรื่องกับผลตอบแทนต่อทุนที่ลงไป และไตรมาสนี้บริษัทเพิ่มทั้งค่าการตลาดและต้นทุน AI โดยที่ bookings ยังลดลง YoY"
        },
        {
          "key": "cash",
          "label": "เงินสดและสภาพคล่อง",
          "current": "เงินสด $1.09B + เงินลงทุนระยะสั้น $2.10B + ระยะยาว $3.04B = $6.24B (เพิ่ม ~$1.0B YoY แม้ซื้อหุ้นคืนไปแล้ว ~$580M ในปีนี้)",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "กองเงินสด $6.24B เทียบกับขาดทุนจากการดำเนินงานปีละราว $1.2B และ FCF 12 เดือนที่ยังเป็นบวก แปลว่าไม่มีความเสี่ยงเรื่องเงินหมดในช่วงที่มองเห็นได้ แม้ Q4 จะเผาเงินสดเล็กน้อยตามที่คาด บริษัทยังมีเวลาพอจะรอดูว่าการซื้อผู้ใช้กลุ่มอายุเกิน 18 และเครื่องมือ AI จะเปลี่ยนเป็น bookings ได้จริงหรือไม่ โดยไม่ต้องรีบระดมทุน"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาวสุทธิ $1.01B (หุ้นกู้ 3.875% ครบกำหนดปี 2030) · สุทธิแล้วเป็นเงินสดเกินหนี้ ~$5.23B",
          "trend": "flat",
          "score": 86,
          "impact": "positive",
          "why": "โครงสร้างหนี้เรียบง่ายและเบามาก — หุ้นกู้ก้อนเดียวดอกเบี้ยคงที่ 3.875% ครบกำหนดอีก 4 ปี ขณะที่ถือเงินสดและเงินลงทุนมากกว่าหนี้ราว 6 เท่า ดอกเบี้ยรับ 9 เดือนแรกปีนี้ $174M ยังมากกว่าดอกเบี้ยจ่าย $31M หลายเท่า งบดุลจึงไม่ใช่จุดเปราะของ thesis นี้"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มทุน/หุ้นเพิ่ม",
          "current": "หุ้นถัวเฉลี่ย 715.9 ล้านหุ้น +2.7% YoY (ชะลอจาก ~6% เพราะเริ่มซื้อหุ้นคืน) · fully diluted 755 ล้านหุ้น +2% · SBC $298M ต่อไตรมาส = ~19% ของรายได้",
          "trend": "up",
          "score": 34,
          "impact": "negative",
          "why": "ยังเป็นจุดอ่อนที่ชัดที่สุด — จ่ายค่าตอบแทนพนักงานเป็นหุ้นปีละกว่า $1.1B คิดเป็นเกือบหนึ่งในห้าของรายได้ และ SBC ก้อนนี้เองที่ทำให้ adjusted EBITDA ($138M) ดูสวยกว่าความจริงมาก · สิ่งที่เปลี่ยนคือทิศทาง: บริษัทเริ่มโครงการซื้อหุ้นคืน $3.0B ตั้งแต่ พ.ค. 2026 และซื้อไปแล้ว 12.6 ล้านหุ้น (~$580M) ใน 9 เดือน ทำให้จำนวนหุ้นโตช้าลงเหลือ ~2-3% ต่อปี — ยังเป็นการ 'ลดการเจือจาง' ไม่ใช่ 'คืนทุน' เพราะเงินซื้อคืน (~$200M/ไตรมาส) ยังน้อยกว่าค่าหุ้นที่ออกให้พนักงาน (~$298M/ไตรมาส)"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "R&D $435M/ไตรมาส · โครงสร้างพื้นฐาน+ความปลอดภัย $385M · การตลาดซื้อผู้ใช้ $111M (+66% YoY) · ซื้อหุ้นคืน ~$200M/ไตรมาส ภายใต้วงเงิน $3.0B (เหลือ $2.4B) · capex Q4 คาด $380M · ไม่มีปันผล",
          "trend": "up",
          "score": 48,
          "impact": "neutral",
          "why": "เงินส่วนใหญ่ยังถูกอัดกลับเข้าแพลตฟอร์ม และไตรมาสนี้เพิ่มรายจ่ายเชิงรุกสองก้อนที่ยังพิสูจน์ไม่ได้ว่าคุ้ม: งบซื้อผู้ใช้กลุ่มอายุเกิน 18 เพิ่มราว 3 เท่าจากปีก่อน (กว่า 200 แคมเปญ บริษัทบอกว่าผู้ใช้ที่ได้มาจ่ายและอยู่นานกว่าผู้ใช้ทั่วไป แต่ยังไม่เปิดตัวเลขผลตอบแทน) และต้นทุน AI training/inference ที่ดันค่าโครงสร้างพื้นฐานขึ้น 24% · ข้อที่ดีขึ้นจริงคือเริ่มซื้อหุ้นคืนเพื่อชดเชยการเจือจางบางส่วนหลังราคาลงมามาก ซึ่งตอบข้อตำหนิของ KB รอบก่อน จึงขยับคะแนนขึ้นจาก 44 แต่ยังไม่สูงเพราะยอดใช้จ่ายต่อผู้ใช้ต่อวันยังลดลง (~$12.3 จาก ~$12.7)"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "ราคาหลังงบ ~$43-44 (after-hours 29 ต.ค. ลงราว 17% จากปิด $52.46) · สิ้น Q3/26 $42.37 · ไม่มี P/E เพราะยังขาดทุน · มูลค่ากิจการ ~$26B ≈ 3.6 เท่าของ bookings 12 เดือนล่าสุด $7.21B · P/S ~5.3 เท่าของรายได้ 12 เดือน $5.90B",
          "trend": "up",
          "score": 58,
          "impact": "neutral",
          "why": "ราคาถูกลงอีกหลังงบเพราะตลาดอ่าน guidance Q4 (adjusted EBITDA และ FCF ติดลบ) มากกว่าตัวเลข Q3 ที่ดีกว่าคาดทุกบรรทัด ทำให้ตัวคูณมูลค่ากิจการต่อ bookings ลดจาก ~4.3 เท่า (ณ KB รอบก่อน) เหลือ ~3.6 เท่า ถูกที่สุดนับตั้งแต่ปี 2023 · แต่ต้องพูดให้ตรงเหมือนเดิมว่า 'ถูกลง' กับ 'ถูก' ไม่ใช่เรื่องเดียวกัน — ยังไม่มี P/E ให้เทียบ ตัวหาร (bookings) ยังจะลดอีก 10-15% ใน Q4 และ consensus ยังคาดขาดทุนถึงปี 2027 · สิ่งที่ต่างจากรอบก่อนคือเริ่มเห็นหลักฐานว่าก้นของ bookings อาจอยู่ใกล้ (โต QoQ + เหนือ guidance) จึงขยับคะแนนขึ้นเล็กน้อย ตัวเลขราคาเป็นช่วง after-hours ต้องยืนยันกับการซื้อขายจริงวันที่ 30 ต.ค. อีกครั้ง"
        }
      ],
      "revenueQuality": {
        "acceleration": "decelerating",
        "consistency": 44,
        "recurringPct": null,
        "note": "ต้องแยกให้ออกระหว่างสองตัวเลขที่ Roblox รายงาน: 'bookings' คือเงินที่ผู้ใช้จ่ายเข้ามาจริงในไตรมาสนั้น ส่วน 'revenue' คือการทยอยรับรู้ bookings เก่าเข้างบตามอายุการใช้งานของไอเทม (เฉลี่ย 27 เดือน) ดังนั้นรายได้ที่ +16% ใน Q3/26 คือภาพของเงินที่เข้ามาเมื่อปีก่อน ไม่ใช่ภาพปัจจุบัน · ภาพปัจจุบันคือ bookings ที่ไล่จาก $2,222M (Q4/25) → $1,731M (Q1/26) → $1,557M (Q2/26) → $1,697M (Q3/26) — ติดลบ YoY ครั้งแรก (-12%) แต่เป็นไตรมาสแรกของปีที่กลับมาโต QoQ และเหนือกรอบบนของ guidance ($1,653M) ส่วน Q4/26 บริษัทคาด $1,890-2,000M (-10% ถึง -15% YoY) · ผู้จ่ายเงินรายเดือนเฉลี่ย 30 ล้านคน -16% YoY แต่ยอดจ่ายต่อผู้จ่าย +5% แปลว่าคนจ่ายน้อยลงแต่คนที่ยังจ่ายจ่ายมากขึ้น · การแบ่งสัดส่วนด้านล่างใช้รายได้ตามภูมิภาคจากแบบ 10-Q เพราะ Roblox ไม่ได้แบ่ง segment ตามสายธุรกิจ ส่วน bookings และผู้ใช้รายภูมิภาคอ้างจากเอกสารประกอบของบริษัท",
        "segments": [
          {
            "name": "สหรัฐฯ และแคนาดา",
            "sharePct": 57,
            "growthNote": "รายได้ $895M +10% YoY · bookings ~$907M -13% YoY และผู้ใช้ต่อวัน ~24 ล้านคน -10% ลดแรงที่สุดในทุกภูมิภาค แต่เป็นตลาดที่ทำเงินต่อหัวสูงสุดและเป็นเป้าหลักของงบซื้อผู้ใช้กลุ่มอายุเกิน 18 ปี (18-34 ปี +26% YoY)",
            "trend": "down"
          },
          {
            "name": "ยุโรป",
            "sharePct": 21,
            "growthNote": "รายได้ $325M +23% YoY · bookings ~$360M -12% YoY ผู้ใช้ต่อวัน ~32 ล้านคน -5% ลดน้อยกว่าอเมริกาเหนือ ฝรั่งเศส +12% เยอรมนี +13% ยังโตสวนทาง",
            "trend": "down"
          },
          {
            "name": "เอเชียแปซิฟิก (รวมออสเตรเลีย-นิวซีแลนด์)",
            "sharePct": 12,
            "growthNote": "รายได้ $191M +25% YoY · bookings ~$226M -7% YoY (ลดน้อยที่สุด) ผู้ใช้ต่อวัน ~42 ล้านคน -9% แต่ญี่ปุ่น +33% อินเดีย +37% ยังเป็นเครื่องยนต์ผู้ใช้ที่เหลืออยู่ แม้ทำเงินต่อหัวได้ต่ำกว่าอเมริกาเหนือมาก",
            "trend": "flat"
          },
          {
            "name": "ภูมิภาคอื่นทั่วโลก",
            "sharePct": 10,
            "growthNote": "รายได้ $161M +28% YoY · bookings ~$204M -8% YoY ผู้ใช้ต่อวัน ~40 ล้านคน -11% ฐานยังเล็กแต่ซาอุดีอาระเบีย +30% ช่วยพยุงจำนวนผู้ใช้รวมไว้",
            "trend": "flat"
          }
        ]
      },
      "aiExecution": {
        "score": 62,
        "items": [
          {
            "item": "Build — สร้างเกมจากคำสั่งข้อความ",
            "status": "executing",
            "evidence": "ขยายจากนิวซีแลนด์ไปสิงคโปร์ เซอร์เบีย และไทยในช่วง alpha มีผู้ใช้กว่า 500,000 คน เผยแพร่เกมแล้วกว่า 70,000 เกม และกว่า 75% ของผู้ใช้ Build ไม่เคยเปิด Roblox Studio มาก่อน — เกมที่สร้างด้วย Build บางส่วนเริ่มลงโฆษณาและทำเงินแล้ว บริษัทวางแผนเปิดกว้างขึ้นปลายปีนี้ (ในสาย earnings call ระบุสหรัฐฯ ราว ธ.ค. 2026) พร้อมแพ็กเกจเสียเงินสำหรับโควตาคำสั่งเพิ่ม · ยังไม่มีตัวเลขว่าเกมจากวิธีนี้สร้าง bookings เท่าไร"
          },
          {
            "item": "AI ใน Roblox Studio — Studio Assistant / สร้างโมเดล 3 มิติ / MCP",
            "status": "executing",
            "evidence": "จำนวนเกมที่เผยแพร่โดยใช้ AI โตกว่า 50% QoQ · ครีเอเตอร์ที่ใช้ AI เป็นประจำ 97% บอกว่าช่วยให้พัฒนาเร็วขึ้น · กว่า 80% ของ 100 เกมอันดับต้นใช้เครื่องมือ AI ของบริษัท และมีเกมที่สร้างเกือบทั้งหมดผ่าน Studio MCP connector ติดอันดับ 20 เกมที่มีผู้เล่นพร้อมกันสูงสุด · ยอดอัปโหลด asset ขึ้น cloud โตราว 3 เท่าเดือนต่อเดือน"
          },
          {
            "item": "Roblox Reality — ภาพเสมือนจริงจากโมเดล AI",
            "status": "on-track",
            "evidence": "รวมโครงสร้างพื้นฐาน cloud + game engine ของบริษัทเข้ากับ video world model (ทีม Morpheus AI ที่ซื้อมา) เพื่อทำเกมหลายผู้เล่นที่ภาพสมจริง · ในสาย earnings call วางแผนเปิด early access ครึ่งแรกปี 2027 · ยังเป็นเดิมพันระยะยาว ไม่มีผลต่อรายได้ในปีนี้"
          },
          {
            "item": "อัลกอริทึมแนะนำเกม (Recommended For You)",
            "status": "on-track",
            "evidence": "ไตรมาสก่อนบริษัทโทษการปรับอัลกอริทึมให้เน้นเกมที่ผู้เล่นอยู่นานว่ากดรายได้ระยะสั้น ไตรมาสนี้เริ่มเห็นผลด้านกลับ: retention (ปรับฤดูกาล) สูงสุดตั้งแต่ปี 2021 ชั่วโมงเล่น +17% QoQ และ bookings ต่อชั่วโมง +4% YoY ซึ่งบริษัทระบุว่าเป็นผลจากการปรับ RFY ตามกลุ่มอายุและพฤติกรรม · ยังไม่ปลดจากการจับตาเพราะการสร้างรายได้จากผู้ใช้อายุน้อยในสหรัฐฯ ยังถูกกดอยู่"
          },
          {
            "item": "โฆษณา / Roblox Plus / Moments — แหล่งรายได้นอก Robux",
            "status": "on-track",
            "evidence": "กว่า 70% ของ 100 เกมอันดับต้น (ตาม Robux ที่ใช้) ลง Sponsored Ads และกว่า 20% ของเกมที่ใช้ rewarded video ได้รายได้เกิน 10% จากโฆษณา บริษัทจะเพิ่มวิดีโอโฆษณาก่อนเริ่มเกมแบบกดข้ามได้ · Roblox Plus (สมาชิกรายเดือน เปิด เม.ย. 2026) มีสมาชิกหลายล้านคน ใช้เวลาเล่น 2 เท่าและใช้ Robux 7 เท่าของผู้ใช้ทั่วไป · Moments ดึงวิดีโอนอกแพลตฟอร์มมาเป็นทางค้นพบเกม · ยังไม่เปิดเผยรายได้โฆษณาแยก จึงประเมินขนาดไม่ได้"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "คูเมืองของ Roblox คือเครือข่ายสามทางที่ผูกกันเอง — ครีเอเตอร์อยู่เพราะมีผู้เล่นเยอะ ผู้เล่นอยู่เพราะมีเกมเยอะ และเงินที่ครีเอเตอร์ถอนออกได้ (developer exchange fees ~$403M ต่อไตรมาส ราว 24% ของ bookings) ทำให้ย้ายไปแพลตฟอร์มอื่นแล้วเสียทั้งรายได้และฐานผู้เล่น บวกกับเพื่อนที่เล่นด้วยกันและไอเทมที่ซื้อสะสมไว้ซึ่งเอาออกไปไม่ได้ · การทดสอบคูเมืองรอบใหญ่ (บังคับยืนยันอายุก่อนคุยกับเพื่อน) ผ่านจุดเลวร้ายสุดไปแล้วระดับหนึ่ง — ผู้ใช้ต่อวันเด้งจาก 123 เป็น 138 ล้านคน ผู้ใช้ที่แชตหรือใช้เสียงโต 24% QoQ และ 64% ของผู้ใช้ทั่วโลกยืนยันอายุแล้ว แต่ยังต่ำกว่าจุดสูงสุด 151.5 ล้านคน และคนที่กลับมาจ่ายน้อยลงต่อหัว",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ความเป็นผู้นำตลาด",
            "status": "stable",
            "note": "ยังเป็นแพลตฟอร์ม UGC เกมที่ใหญ่ที่สุดในโลกด้วยผู้ใช้ 138 ล้านคนต่อวันและชั่วโมงเล่นเกือบ 34 พันล้านชั่วโมงต่อไตรมาส (ฐานสองปีโต 55% และ 63% ตามลำดับ) คู่แข่งตรง ๆ อย่าง Minecraft หรือ Fortnite Creative ยังไม่มีเศรษฐกิจครีเอเตอร์ที่ลึกเท่า"
          },
          {
            "key": "techLeadership",
            "label": "ความเป็นผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "เป็นรายแรก ๆ ที่เอา generative AI มาใส่ในเครื่องมือสร้างเกมจนครีเอเตอร์ใช้จริงในระดับหมื่นชิ้นต่อวัน ขยายไป Build (สร้างเกมจากข้อความ) Web Play (เล่นผ่านเบราว์เซอร์ไม่ต้องติดตั้ง) และ Universal Player ที่ตั้งเป้าให้ย้ายเกมจากคอนโซล/PC มาลงแพลตฟอร์มได้"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "stable",
            "note": "ปล่อยระบบยืนยันอายุทั่วโลกภายในราวสองเดือนและดันให้ครอบคลุม 64% ของผู้ใช้ทั่วโลก (75-80% ในสหรัฐฯ สหราชอาณาจักร ออสเตรเลีย) ภายในสามไตรมาส · ส่งของใหม่ถี่ (Roblox Plus, Server Authority, Quick Words, Build) แต่ยังต้องพิสูจน์ว่าของเหล่านี้แปลงเป็น bookings ได้"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายหนี",
            "status": "stable",
            "note": "ผู้เล่นมีไอเทมสะสมและเพื่อนผูกอยู่ในแพลตฟอร์ม · หลังช่วงที่การบังคับยืนยันอายุทำผู้ใช้หายไป ไตรมาสนี้ผู้ใช้ต่อวันกลับมาที่ 138 ล้านคน (+12% QoQ) และผู้ใช้ที่แชต/ใช้เสียงโต 24% QoQ แปลว่าเหตุผลหลักที่คนอยู่ (คุยกับเพื่อน) กลับมาทำงานหลังผ่านด่านยืนยันอายุ — แต่ยังต่ำกว่าจุดสูงสุด 9%"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "stable",
            "note": "ครีเอเตอร์ยังถอนเงินออกจากระบบได้ราว $1.6B ต่อปี (9 เดือน $1,189M) และบริษัทขึ้นอัตราจ่ายให้ครีเอเตอร์สองรอบ (ก.ย. 2025 และกลุ่มผู้ใช้อายุเกิน 18 เมื่อ มิ.ย. 2026) ทำให้ DevEx คิดเป็น 24% ของ bookings จาก 22% — เป็นการจ่ายแพงขึ้นเพื่อรักษาฝั่งผู้ผลิตเนื้อหาไว้ในช่วงที่ bookings หด"
          },
          {
            "key": "developerAdoption",
            "label": "การใช้งานของนักพัฒนา",
            "status": "strengthening",
            "note": "เกมที่เผยแพร่โดยใช้ AI โตกว่า 50% QoQ กว่า 80% ของ 100 เกมอันดับต้นใช้เครื่องมือ AI ของบริษัท และ Build ดึงครีเอเตอร์หน้าใหม่กว่า 500,000 คนที่ 75% ไม่เคยเปิด Studio — ฝั่งผู้ผลิตเนื้อหาขยายตัวแม้ฝั่งผู้จ่ายเงินหดตัว"
          },
          {
            "key": "customerLockin",
            "label": "การผูกติดของผู้ใช้",
            "status": "weakening",
            "note": "จำนวนผู้ใช้กลับมาแต่เงินยังไม่กลับเต็ม: ยอดใช้จ่ายต่อผู้ใช้ต่อวันลดเหลือ ~$12.3 (จาก ~$12.7 ทั้งใน Q2/26 และ Q3/25) ผู้จ่ายเงินรายเดือน 30 ล้านคน -16% YoY และบริษัทยอมรับว่าการสร้างรายได้จากผู้ใช้อายุน้อยในสหรัฐฯ ยังถูกกด · ด้านดีคือยอดจ่ายต่อผู้จ่าย +5% และ Roblox Plus ดึงคนจ่ายหนักให้ผูกแน่นขึ้น"
          },
          {
            "key": "moat",
            "label": "ภาพรวมคูเมือง",
            "status": "stable",
            "note": "โครงสร้างคูเมืองยังอยู่ครบ และการทุบกำแพงด้วยตัวเอง (ยืนยันอายุ + เปลี่ยนอัลกอริทึม) เริ่มให้ผลตามที่บริษัทอ้าง — ผู้ใช้และชั่วโมงเล่นกลับมาโต QoQ, retention สูงสุดตั้งแต่ปี 2021 · เปลี่ยนจาก 'อ่อนแรง' เป็น 'ทรงตัว' เพราะตัวเลขผู้ใช้กลับแล้ว แต่ยังไม่ 'แข็งขึ้น' จนกว่าเงินต่อหัวจะหยุดลดและ bookings กลับมาโต YoY"
          }
        ]
      },
      "capitalAllocation": {
        "score": 48,
        "verdict": "จัดสรรเงินแบบบริษัทเติบโต — เกือบทุกดอลลาร์กลับเข้าแพลตฟอร์มผ่าน R&D โครงสร้างพื้นฐาน และไตรมาสนี้เพิ่มงบซื้อผู้ใช้กลุ่มอายุเกิน 18 ปีอีกราว 3 เท่า · ข้อที่เปลี่ยนจาก KB รอบก่อน (ซึ่งระบุว่าไม่มีการซื้อหุ้นคืน) คือบริษัทมีโครงการซื้อหุ้นคืน $3.0B ตั้งแต่ พ.ค. 2026 และซื้อไปแล้ว ~$580M ใน 9 เดือน (Q3 ~$200M) โดยประกาศชัดว่าตั้งใจ 'ชดเชยการเจือจางบางส่วน' ไม่ใช่คืนทุน — ยังให้คะแนนสูงไม่ได้เพราะออกหุ้นให้พนักงานไตรมาสละ ~$298M มากกว่าที่ซื้อคืน และรายจ่ายใหม่สองก้อน (การตลาด, AI compute) ยังไม่มีตัวเลขผลตอบแทน",
        "items": [
          {
            "label": "ลงทุนใน R&D",
            "current": "$435M ต่อไตรมาส (~28% ของรายได้) +9% YoY",
            "assessment": "neutral",
            "why": "โตช้ากว่ารายได้ (+16%) ซึ่งช่วยมาร์จิ้น YoY และเป็นเงินที่สร้าง Build/Studio AI/Web Play ที่เห็นการใช้งานจริง แต่ยังไม่มีตัวชี้วัดว่าแปลงเป็น bookings ใหม่ได้เท่าไร เพราะยอดใช้จ่ายต่อผู้ใช้ยังลดลง"
          },
          {
            "label": "โครงสร้างพื้นฐานและความปลอดภัย",
            "current": "$385M ต่อไตรมาส +20% YoY (ส่วนที่ไม่ใช่บุคลากร +24% จาก AI training/inference) · capex Q4 คาด $380M",
            "assessment": "neutral",
            "why": "ส่วนหนึ่งเป็นรายจ่ายที่เลี่ยงไม่ได้จากแรงกดดันด้านกฎระเบียบและความปลอดภัยเด็ก อีกส่วนเป็นต้นทุน AI ที่โตเร็วกว่ารายได้ — เป็นการซื้อสิทธิ์ในการทำธุรกิจต่อบวกเดิมพันอนาคต มากกว่าการลงทุนที่วัดผลตอบแทนได้ตอนนี้"
          },
          {
            "label": "ซื้อหุ้นคืน",
            "current": "Q3 ซื้อ 4.4 ล้านหุ้น ~$200M · 9 เดือน 12.6 ล้านหุ้น ~$580M · เหลือวงเงิน $2.4B จาก $3.0B (อนุมัติ พ.ค. 2026)",
            "assessment": "good",
            "why": "เริ่มใช้เงินสดส่วนเกินซื้อหุ้นในช่วงที่ราคาลงมาราว 60-70% จากจุดสูงสุด และทำให้จำนวนหุ้นโตช้าลงเหลือ ~2-3% ต่อปี · ยังเป็นแค่การลดการเจือจาง เพราะยอดซื้อคืนต่อไตรมาสยังน้อยกว่าค่าหุ้นพนักงาน"
          },
          {
            "label": "ค่าตอบแทนพนักงานเป็นหุ้น",
            "current": "$298M ต่อไตรมาส (~19% ของรายได้) · 9 เดือน $855M · หุ้นถัวเฉลี่ย +2.7% YoY",
            "assessment": "poor",
            "why": "ยังเจือจางผู้ถือหุ้นเดิมต่อเนื่องและเป็นต้นทุนจริงที่ adjusted EBITDA ($138M) บวกกลับเข้าไป · การซื้อหุ้นคืนชดเชยได้ราวสองในสามของยอดที่ออกใหม่ต่อไตรมาส"
          },
          {
            "label": "การตลาดซื้อผู้ใช้กลุ่มอายุเกิน 18 ปี",
            "current": "ค่าใช้จ่ายขายและการตลาด $111M ต่อไตรมาส +66% YoY · กว่า 200 แคมเปญ งบกลุ่มอายุเกิน 18 เพิ่มราว 3 เท่า",
            "assessment": "neutral",
            "why": "เป็นครั้งแรกที่ Roblox ซื้อผู้ใช้แบบจ่ายเงินในสเกลนี้ บริษัทบอกว่าผู้ใช้ที่ได้มา retention และการจ่ายเงินดีกว่าผู้ใช้ทั่วไปและจะลงทุนต่อโดย 'รักษามาตรฐานผลตอบแทน' แต่ยังไม่เปิดตัวเลขต้นทุนต่อผู้ใช้หรือระยะเวลาคืนทุน จึงตัดสินไม่ได้"
          },
          {
            "label": "งบดุลและสภาพคล่อง",
            "current": "เงินสด+เงินลงทุน $6.24B เทียบหนี้ $1.01B · ดอกเบี้ยรับ 9 เดือน $174M vs จ่าย $31M",
            "assessment": "good",
            "why": "สุทธิแล้วถือเงินสดเกินหนี้ราว $5.23B และดอกเบี้ยรับมากกว่าดอกเบี้ยจ่ายหลายเท่า ทำให้มีเวลาพอจะรอผลของการเปลี่ยนแปลงโดยไม่ถูกบีบ แม้ Q4 จะใช้เงินสดสุทธิเล็กน้อยตามที่คาด"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "ราคาหลังงบ ~$43-44 (after-hours 29 ต.ค. ลงราว 17% จากปิด $52.46 ต้องยืนยันกับการซื้อขายจริง 30 ต.ค.) ลงมาราว 69% จากจุดสูงสุด $138.52 (สิ้น Q3/25) · ประเมินความถูกแพงด้วยวิธีปกติไม่ได้ — ยังขาดทุน GAAP ทุกปีตั้งแต่เข้าตลาด จึงไม่มี P/E และ consensus ยังคาดขาดทุนถึงปี 2027 · ตัวที่พอใช้ได้คือมูลค่ากิจการ (มูลค่าตลาด ~$31B หักเงินสดสุทธิ ~$5.2B เหลือ ~$26B) เทียบ bookings 12 เดือนล่าสุด $7.21B ได้ราว 3.6 เท่า (ลดจาก ~4.3 เท่าใน KB รอบก่อน) และ P/S ราว 5.3 เท่าของรายได้ 12 เดือน $5.90B · ตัวหารยังจะหดต่อ: ถ้า Q4 ออกมาตามกลาง guidance ($1,945M) bookings 12 เดือนจะเหลือ ~$6.93B ทำให้ตัวคูณขยับเป็น ~3.7 เท่าโดยราคาไม่ขยับ · สรุปคือ 'ถูกลงมากและเริ่มเห็นสัญญาณก้นของ bookings' แต่ยังไม่ใช่ 'ถูกจนมีส่วนเผื่อความปลอดภัย' ตราบที่ adjusted EBITDA และ FCF ไตรมาสหน้ายังถูกคาดว่าติดลบ"
      },
      "whatChanged": [
        {
          "metric": "Bookings (เงินที่ผู้ใช้จ่ายเข้ามาจริง)",
          "prev": "$1,557M (Q2/26, +8% YoY, ปลายล่างของ guidance)",
          "now": "$1,697M (Q3/26, -12% YoY ติดลบครั้งแรก แต่ +9% QoQ และเหนือกรอบบน guidance $1,653M)",
          "direction": "neutral"
        },
        {
          "metric": "ผู้ใช้ต่อวัน (DAU) และชั่วโมงเล่น",
          "prev": "123 ล้านคน · 29 พันล้านชั่วโมง",
          "now": "138 ล้านคน (+12% QoQ, -9% YoY จากจุดสูงสุด 151.5 ล้าน) · ~34 พันล้านชั่วโมง (+17% QoQ, -15% YoY)",
          "direction": "positive"
        },
        {
          "metric": "ขาดทุนจากการดำเนินงาน",
          "prev": "-$229M (-15.6% ของรายได้) ขาดทุนน้อยที่สุดเท่าที่เคยมี",
          "now": "-$283M (-18.0%) รวมสำรองคดีกับรัฐต่าง ๆ $49M · ไม่รวมรายการนี้ ≈ -14.9% แต่ค่าการตลาด +66% และค่าโครงสร้างพื้นฐาน +20% YoY",
          "direction": "negative"
        },
        {
          "metric": "กระแสเงินสดอิสระ",
          "prev": "$294M",
          "now": "$364M (บริษัทเคยคาด $(60)M ถึง $5M · capex จ่ายแค่ $31M เพราะเลื่อนไป Q4)",
          "direction": "positive"
        },
        {
          "metric": "guidance ไตรมาสถัดไป",
          "prev": "Q3/26: bookings -14% ถึง -18% YoY · adjusted EBITDA $0-41M · FCF $(60)M ถึง $5M",
          "now": "Q4/26: bookings $1,890-2,000M (-10% ถึง -15% YoY) · adjusted EBITDA $(70)M ถึง $(10)M ติดลบครั้งแรกตั้งแต่ปี 2022 · FCF $(190)M ถึง $(105)M · ยังไม่ให้ guidance รายปี",
          "direction": "negative"
        },
        {
          "metric": "ซื้อหุ้นคืน",
          "prev": "KB รอบก่อนระบุว่าไม่มี (จริง ๆ โครงการ $3.0B เริ่ม พ.ค. 2026 และครึ่งปีแรกซื้อไปแล้ว ~$375M)",
          "now": "Q3 ซื้อ 4.4 ล้านหุ้น ~$200M · 9 เดือน ~$580M · เหลือวงเงิน $2.4B · หุ้นถัวเฉลี่ยโตช้าลงเหลือ +2.7% YoY",
          "direction": "positive"
        }
      ],
      "risks": [
        "bookings ยังไม่ยืนยันว่าถึงก้น — Q3/26 ดีกว่าที่กลัวแต่ยังติดลบ -12% YoY และบริษัทคาด Q4 ติดลบอีก -10% ถึง -15% พร้อม adjusted EBITDA และ FCF ติดลบ ถ้า Q4 (ซึ่งมีสัปดาห์สุดท้ายของธันวาคมเป็นตัวแปรใหญ่) พลาดอีก รายได้ทางบัญชีปี 2027 จะชะลอแรงเพราะ bookings ก้อนใหญ่ของปี 2025 ทยอยหมดอายุรับรู้ (การเปลี่ยนแปลงรายได้รอรับรู้ไตรมาสนี้เหลือ +$136M จาก +$573M)",
        "คนกลับมาแต่เงินไม่กลับ — ผู้ใช้ต่อวันเด้งเป็น 138 ล้านคนแต่ยอดใช้จ่ายต่อผู้ใช้ต่อวันยังลดเหลือ ~$12.3 ผู้จ่ายเงินรายเดือน 30 ล้านคน -16% YoY และผู้ใช้อายุน้อยในสหรัฐฯ ยังจ่ายน้อยลง ถ้าการเติบโตต้องพึ่งการซื้อผู้ใช้กลุ่มอายุเกิน 18 ปีด้วยงบการตลาดที่เพิ่ม 3 เท่า คุณภาพการเติบโตจะต่ำกว่ายุคที่โตเองจากเกมไวรัล",
        "คดีความปลอดภัยเด็กกำลังกลายเป็นต้นทุนถาวร — ตั้งสำรองข้อตกลงกับรัฐต่าง ๆ แล้ว $140M ใน 9 เดือน (ตกลงแล้วกับ 6 รัฐ: Alabama, Mississippi, Nevada, South Dakota, West Virginia, Kansas) ยังมีคดีจากอีก 10 รัฐรวม Texas, Florida, Kentucky, Louisiana และ Los Angeles/San Diego County บวกคดีกลุ่มเรื่องเยาวชนใช้ Robux พนันในเกมของบุคคลที่สาม และใน ต.ค. 2026 FTC กับรัฐ Pennsylvania/Utah แจ้งว่าอาจฟ้องตาม FTC Act/COPPA — guidance ขาดทุนสุทธิ Q4 *ไม่รวม* สำรองเหล่านี้ จึงมีโอกาสตั้งเพิ่มอีก",
        "ยังไม่มีกำไร GAAP และเจือจางหุ้นต่อเนื่อง — ขาดทุนทุกปีตั้งแต่เข้าตลาดปี 2021 จ่ายค่าหุ้นพนักงานไตรมาสละ ~$298M (~19% ของรายได้) การซื้อหุ้นคืน ~$200M/ไตรมาสชดเชยได้แค่บางส่วน และ consensus ยังคาดขาดทุนราว $(1.3)-(1.5) ต่อหุ้นทั้งปี 2026 และ 2027 ตัวเลข adjusted EBITDA ที่บริษัทใช้สื่อสารจึงยังดูดีกว่าความจริง",
        "ต้นทุนโตเร็วกว่ารายได้ในช่วงที่ bookings หด — บริษัทบอกเองว่า Q4 จะมี fixed cost deleveraging ค่าโครงสร้างพื้นฐาน/AI +24% ค่าการตลาด +66% และ capex Q4 $380M (+27% YoY) เพื่อเดิมพันกับ Build, Universal Player, Roblox Everywhere และ Roblox Reality ที่ส่วนใหญ่จะเห็นผลเร็วสุดครึ่งแรกปี 2027 ถ้าของเหล่านี้ไม่สร้าง bookings มาร์จิ้นที่เพิ่งดีขึ้นในปี 2025-26 จะถอยกลับยาวกว่าหนึ่งไตรมาส"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2027-02",
      "history": {
        "epsBasis": "diluted GAAP (ปีบัญชี = ปีปฏิทิน สิ้นสุด 31 ธ.ค.) — Roblox ยังไม่เคยมีกำไร GAAP ทุกค่าจึงติดลบ",
        "years": [
          {
            "fy": "FY2021",
            "endYm": "2021-12",
            "revenueB": 1.919,
            "epsAdj": -0.97,
            "opMarginPct": -23.2,
            "fcfB": 0.566,
            "priceFYEnd": 103.16
          },
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 2.225,
            "epsAdj": -1.55,
            "opMarginPct": -41.5,
            "fcfB": -0.057,
            "priceFYEnd": 28.46
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 2.799,
            "epsAdj": -1.87,
            "opMarginPct": -44.7,
            "fcfB": 0.138,
            "priceFYEnd": 45.72
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 3.602,
            "epsAdj": -1.44,
            "opMarginPct": -29,
            "fcfB": 0.643,
            "priceFYEnd": 57.86
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 4.89,
            "epsAdj": -1.54,
            "opMarginPct": -25.2,
            "fcfB": 1.353,
            "priceFYEnd": 81.03
          }
        ],
        "quarters": [
          {
            "q": "Q3'23",
            "endYm": "2023-09",
            "endDate": "2023-09-30",
            "revenueB": 0.713,
            "epsAdj": -0.45,
            "opMarginPct": -42.1,
            "fcfB": 0.06,
            "priceQEnd": 28.96
          },
          {
            "q": "Q4'23",
            "endYm": "2023-12",
            "endDate": "2023-12-31",
            "revenueB": 0.75,
            "epsAdj": -0.52,
            "opMarginPct": -47.4,
            "fcfB": 0.078,
            "priceQEnd": 45.72
          },
          {
            "q": "Q1'24",
            "endYm": "2024-03",
            "endDate": "2024-03-31",
            "revenueB": 0.801,
            "epsAdj": -0.43,
            "opMarginPct": -37.7,
            "fcfB": 0.192,
            "priceQEnd": 38.18
          },
          {
            "q": "Q2'24",
            "endYm": "2024-06",
            "endDate": "2024-06-30",
            "revenueB": 0.894,
            "epsAdj": -0.32,
            "opMarginPct": -26.6,
            "fcfB": 0.112,
            "priceQEnd": 37.21
          },
          {
            "q": "Q3'24",
            "endYm": "2024-09",
            "endDate": "2024-09-30",
            "revenueB": 0.919,
            "epsAdj": -0.37,
            "opMarginPct": -28.4,
            "fcfB": 0.218,
            "priceQEnd": 44.26
          },
          {
            "q": "Q4'24",
            "endYm": "2024-12",
            "endDate": "2024-12-31",
            "revenueB": 0.988,
            "epsAdj": -0.33,
            "opMarginPct": -24.7,
            "fcfB": 0.121,
            "priceQEnd": 57.86
          },
          {
            "q": "Q1'25",
            "endYm": "2025-03",
            "endDate": "2025-03-31",
            "revenueB": 1.035,
            "epsAdj": -0.32,
            "opMarginPct": -24.6,
            "fcfB": 0.427,
            "priceQEnd": 58.29
          },
          {
            "q": "Q2'25",
            "endYm": "2025-06",
            "endDate": "2025-06-30",
            "revenueB": 1.081,
            "epsAdj": -0.41,
            "opMarginPct": -29.8,
            "fcfB": 0.176,
            "priceQEnd": 105.2
          },
          {
            "q": "Q3'25",
            "endYm": "2025-09",
            "endDate": "2025-09-30",
            "revenueB": 1.36,
            "epsAdj": -0.37,
            "opMarginPct": -21.8,
            "fcfB": 0.443,
            "priceQEnd": 138.52
          },
          {
            "q": "Q4'25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 1.415,
            "epsAdj": -0.45,
            "opMarginPct": -25.4,
            "fcfB": 0.307,
            "priceQEnd": 81.03
          },
          {
            "q": "Q1'26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 1.442,
            "epsAdj": -0.35,
            "opMarginPct": -20.4,
            "fcfB": 0.596,
            "priceQEnd": 56.56
          },
          {
            "q": "Q2'26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 1.469,
            "epsAdj": -0.26,
            "opMarginPct": -15.6,
            "fcfB": 0.294,
            "priceQEnd": 54.38
          },
          {
            "q": "Q3'26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 1.572,
            "epsAdj": -0.32,
            "opMarginPct": -18,
            "fcfB": 0.364,
            "priceQEnd": 42.37,
            "epsNote": "GAAP EPS $(0.32) รวมค่าใช้จ่ายตั้งสำรองข้อตกลงยอมความกับรัฐต่าง ๆ ในสหรัฐฯ (คดีคุ้มครองผู้บริโภคเยาวชน/ความปลอดภัยเด็ก) $49M ในค่าใช้จ่ายบริหาร (G&A) ≈ $0.07/หุ้น — ไม่รวมรายการนี้ขาดทุน ~$(0.25) (เทียบ $(0.26) ใน Q2/26 และ $(0.37) ใน Q3/25) · รายการอยู่ในกำไรจากการดำเนินงาน: ขาดทุนจากการดำเนินงาน -$283M (-18.0%) ไม่รวมรายการ ≈ -$234M (-14.9%)",
            "opMarginExItemsPct": -14.9
          }
        ],
        "notes": "ปีบัญชีของ Roblox ตรงกับปีปฏิทินและทุกไตรมาสจบสิ้นเดือนปฏิทิน · EPS ทั้งชุดเป็น diluted GAAP และติดลบทุกงวด บริษัทไม่ได้รายงาน EPS แบบ non-GAAP จึงไม่มีตัวเลือกอื่นให้เทียบ · **ตารางนี้แสดง 'revenue' ไม่ใช่ 'bookings'** ซึ่งเป็นคนละตัวและต่างกันมาก: bookings คือเงินที่ผู้ใช้จ่ายเข้ามาจริงในงวดนั้น ส่วน revenue คือการทยอยรับรู้ bookings เก่าตามอายุการใช้งานไอเทม ตัวอย่าง FY2025 bookings $6.788B แต่ revenue เพียง $4.890B (ยอดรอรับรู้คงเหลือสิ้น Q3/26 อยู่ที่ $7.04B) เวลาอ่านกราฟรายได้ของหุ้นตัวนี้จึงต้องจำไว้ว่ามันสะท้อนอดีต ไม่ใช่ปัจจุบัน · อัตราขาดทุนจากการดำเนินงานของ Q1/26 และ Q2/26 คำนวณจากงบในแบบ 10-Q โดยตรง (ขาดทุนจากการดำเนินงาน 6 เดือน -$523M หัก Q2 -$229M ได้ Q1 -$294M) ซึ่งต่างจากตัวเลขที่เว็บรวบรวมข้อมูลบางแห่งแสดง (-13.3% และ -16.4%) — ได้ตรวจสอบย้อนกับ 10-Q แล้วพบว่าไตรมาสปี 2025 ของแหล่งนั้นตรงกับงบจริง แต่ไตรมาสปี 2026 ไม่ตรง จึงใช้ค่าจากงบเป็นหลัก · Q3/26 ใช้งบในจดหมายถึงผู้ถือหุ้น/10-Q โดยตรง (ขาดทุนจากการดำเนินงาน -$283M บนรายได้ $1,572M = -18.0%) และตั้งแต่ปี 2026 บริษัทตั้งสำรองข้อตกลงกับรัฐต่าง ๆ เรื่องความปลอดภัยเยาวชนไว้ใน G&A รวม $140M ใน 9 เดือน (Q3 $49M · Q1-Q2 รวม $91M ซึ่งไม่ได้แยกไว้ในแถว Q1/26-Q2/26) · ราคาสิ้นงวดใช้ราคาปิดของวันทำการสุดท้ายที่ไม่เกินวันสิ้นงวด จาก Yahoo Finance (ไม่มี split ในช่วงนี้) · ตัวเลขเป็นค่าประมาณสำหรับ knowledge base (ความแม่นยำ ~1-2%)",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/0001315098/000162828026068235/ex991-q32026earningsshar.htm",
          "https://www.sec.gov/Archives/edgar/data/1315098/000162828026068235/rblx-20261029.htm",
          "https://www.sec.gov/Archives/edgar/data/1315098/000162828026068253/rblx-20260930.htm",
          "https://www.investing.com/news/company-news/roblox-q3-2026-slides-first-user-decline-marks-inflection-point-93CH-4985385",
          "https://www.sec.gov/Archives/edgar/data/0001315098/000162828026051082/rblx-20260630.htm",
          "https://www.sec.gov/Archives/edgar/data/0001315098/000162828026051059/ex991-robloxq22026earnin.htm",
          "https://www.sec.gov/Archives/edgar/data/0001315098/000162828026028882/ex991-q12026earningsshar.htm",
          "https://www.sec.gov/Archives/edgar/data/1315098/000131509826000009/ex991-q42025shareholder.htm",
          "https://www.sec.gov/Archives/edgar/data/1315098/000131509825000326/ex991-q32025shareholderl.htm",
          "https://www.sec.gov/Archives/edgar/data/1315098/000131509825000261/q225shletterex992.htm",
          "https://stockanalysis.com/stocks/rblx/financials/",
          "https://query1.finance.yahoo.com/v8/finance/chart/RBLX (historical daily closes)"
        ]
      },
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-09",
            "fy": "FY2026",
            "eps": -1.47,
            "revenue": null
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": -1.32,
            "revenue": null
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "2026Q3",
            "metric": "revenue",
            "guided": "~$1.413-1.490B",
            "actual": "$1.572B",
            "result": "beat",
            "magnitudePct": 8.3
          },
          {
            "quarter": "2026Q2",
            "metric": "revenue",
            "guided": "~$1.390-1.450B",
            "actual": "$1.469B",
            "result": "beat",
            "magnitudePct": 3.5
          },
          {
            "quarter": "2026Q1",
            "metric": "revenue",
            "guided": "~$1.370-1.420B",
            "actual": "$1.442B",
            "result": "beat",
            "magnitudePct": 3.4
          },
          {
            "quarter": "2025Q4",
            "metric": "revenue",
            "guided": "~$1.350-1.400B",
            "actual": "$1.415B",
            "result": "beat",
            "magnitudePct": 2.9
          },
          {
            "quarter": "2025Q3",
            "metric": "revenue",
            "guided": "~$1.110-1.160B",
            "actual": "$1.360B",
            "result": "beat",
            "magnitudePct": 19.8
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": null,
            "eps": -1.5,
            "confidence": "medium",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": null,
            "eps": -1.32,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "Q3/26 รายได้เหนือ guidance อีกครั้ง (+8% จากจุดกึ่งกลาง) และครั้งนี้ bookings ก็เหนือกรอบบนที่ให้ไว้ ($1,697M เทียบ $1,576-1,653M) ต่างจาก Q2 ที่ออกมาปลายล่าง แต่ตาราง revenue ยังดูสวยเกินจริงเพราะเป็นตัวเลขที่ทยอยรับรู้จากเงินที่เติมมาก่อนหน้า ตัวที่ตลาดตัดสินคือ guidance Q4 ที่ bookings -10% ถึง -15% และ adjusted EBITDA/FCF ติดลบ · consensus EPS เป็นชุดก่อนงบ (FY2026 ~-1.41 ถึง -1.50 แล้วแต่สำนัก ใช้ค่ากลางของสำนักที่มีนักวิเคราะห์มากสุด 25 ราย · FY2027 ~-1.32 จาก 10 ประมาณการ ช่วงกว้าง -1.99 ถึง -0.72) ซึ่งสอดคล้องกับฐาน GAAP (9 เดือนจริง -0.92 + guidance ขาดทุน Q4 ราว -0.50 ถึง -0.59 ได้ -1.42 ถึง -1.51 และถ้าเป็นฐานไม่รวม SBC ตัวเลขจะเป็นบวก) ส่วนช่อง revenue เว้นว่างโดยตั้งใจเพราะแหล่งนักวิเคราะห์รายงาน bookings ในชื่อ revenue (FY2026 ~$6.9B ตรงกับ 9 เดือน bookings $4,985M + guidance Q4 $1,890-2,000M ไม่ใช่รายได้ทางบัญชีที่จะอยู่ราว $5.95-6.06B) · ฐานของ consensus EPS ไม่มีแหล่งระบุว่า GAAP (แม้ Roblox ไม่รายงาน non-GAAP EPS และตัวเลขตรงกับ 9 เดือนจริง + guide Q4) จึงใส่ unknown ตามกติกา"
      }
    },
    "CBRS": {
      "ticker": "CBRS",
      "name": "Cerebras Systems",
      "layer": "gpu",
      "thesis": {
        "statement": "เดิมพันว่าชิประดับเวเฟอร์ทั้งแผ่น (WSE-3) จะกินส่วนแบ่งงาน AI inference ที่ต้องการความเร็วต่อ request สูงสุด ซึ่งเป็นช่องที่สถาปัตยกรรม GPU ติดคอขวดแบนด์วิดท์หน่วยความจำ — คำถามหลักไม่ใช่ว่าของเร็วจริงไหม แต่คือจะขยายฐานลูกค้าออกจากการพึ่งลูกค้าไม่กี่รายได้เร็วแค่ไหน",
        "pillars": [
          "WSE-3 รวม ~900,000 คอร์ และหน่วยความจำ ~44GB บนเวเฟอร์เดียว ตัดปัญหา memory wall ที่ GPU ต้องวิ่งผ่าน HBM — ได้เปรียบชัดในงาน inference โมเดลเดียวที่ต้องการ token ต่อวินาทีสูง",
          "โมเดลธุรกิจเปลี่ยนจากขายเครื่องมาเป็นขายบริการคลาวด์ ไตรมาส 2/69 รายได้คลาวด์ ~126 ล้านดอลลาร์ แซงฮาร์ดแวร์ ~54 ล้านดอลลาร์เป็นครั้งแรก ซึ่งเป็นรายได้ที่เกิดซ้ำได้มากกว่า",
          "RPO (งานที่รับไว้แล้วรอรับรู้รายได้) ~25.4 พันล้านดอลลาร์ สูงกว่ารายได้ย้อนหลัง 12 เดือน ~37 เท่า เป็นตัวหนุนประมาณการปี 2570 ที่มองรายได้โต ~3 เท่า",
          "เงินสด ~6.7 พันล้านดอลลาร์หลัง IPO ให้เวลาลงทุนสร้างกำลังผลิตและศูนย์ข้อมูลได้หลายปีโดยไม่ต้องรีบระดมทุนใหม่",
          "ความเสี่ยงกระจุกตัวเป็นแกนกลางของ thesis ไม่ใช่เชิงอรรถ — ครึ่งปีแรก 2569 ลูกค้า 3 รายแรกรวมกัน ~79% ของรายได้ (รายใหญ่สุดรายเดียว ~49%) การเสียลูกค้ารายเดียวกระทบงบทั้งปี"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "Q2/69 รายได้ GAAP ~180 ล้านดอลลาร์ (+74% YoY) · ตัวเลข core ของบริษัท ~210 ล้าน (+103%)",
          "trend": "up",
          "score": 88,
          "impact": "positive",
          "why": "โตสูงมากและเร่งขึ้นจากฝั่งคลาวด์ที่ +287% YoY แต่ฐานยังเล็ก (ย้อนหลัง 12 เดือน ~681 ล้านดอลลาร์) การโตระดับนี้จึงยังไม่พิสูจน์ความทนทานข้ามวัฏจักร"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q2/69 ขาดทุน GAAP ~2.98 ดอลลาร์ต่อหุ้น (ขาดทุนสุทธิ ~451 ล้านดอลลาร์)",
          "trend": "down",
          "score": 22,
          "impact": "negative",
          "why": "ขาดทุนกว้างขึ้นมากจาก Q1 ที่ขาดทุนเพียง ~0.22 ดอลลาร์ต่อหุ้น สาเหตุหลักคือค่าตอบแทนเป็นหุ้น ~377 ล้านดอลลาร์หลัง IPO ซึ่งไม่ใช่เงินสด แต่เป็นต้นทุนที่ผู้ถือหุ้นเดิมจ่ายจริงในรูปการถูกลดสัดส่วน"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ครึ่งปีแรก 2569 เงินสดใช้ไปในการดำเนินงาน ~47 ล้านดอลลาร์",
          "trend": "flat",
          "score": 48,
          "impact": "neutral",
          "why": "เผาเงินน้อยกว่าขาดทุนทางบัญชีมาก (ขาดทุน ~465 ล้าน แต่เงินสดออกจริง ~47 ล้าน) เพราะค่าตอบแทนเป็นหุ้น ~387 ล้านไม่ใช่เงินสด และรายได้รอรับรู้เพิ่ม ~126 ล้าน — แต่ยังไม่เป็นบวก และยังไม่รวมเงินลงทุนสร้างศูนย์ข้อมูล"
        },
        {
          "key": "margin",
          "label": "อัตรากำไรขั้นต้น",
          "current": "Q2/69 GAAP ~14% · ตัวเลข core ของบริษัท ~41%",
          "trend": "down",
          "score": 38,
          "impact": "negative",
          "why": "ช่องว่างระหว่าง GAAP กับ core กว้างผิดปกติ เพราะมีการตัดจำหน่าย warrant ที่ให้ลูกค้า ~44 ล้านดอลลาร์หักออกจากรายได้โดยตรง · GAAP margin ร่วงจาก ~45% ใน Q1 เหลือ ~14% ซึ่งเป็นตัวเลขที่งบการเงินบันทึกจริง"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังติดลบ — ยังไม่มีกำไรจากการดำเนินงาน",
          "trend": "flat",
          "score": 20,
          "impact": "negative",
          "why": "ขาดทุนจากการดำเนินงาน Q2/69 ~477 ล้านดอลลาร์ ยังอยู่ในช่วงลงทุนหนัก การวัด ROIC ยังไม่มีความหมาย ต้องรอให้รายได้ขยายจนคุ้มฐานต้นทุนวิจัยพัฒนา ~320 ล้านดอลลาร์ต่อไตรมาส"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "~6.7 พันล้านดอลลาร์ (30 มิ.ย. 2569)",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "เงินสดจาก IPO ทำให้มีเวลาหายใจยาวมากเทียบกับอัตราเผาเงินปัจจุบัน และยังมีวงเงินหมุนเวียนที่ยังไม่เบิกอีก ~850 ล้านดอลลาร์"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "เงินกู้หมุนเวียน ~918 ล้านดอลลาร์ และภาระสัญญาเช่า ~569 ล้านดอลลาร์",
          "trend": "flat",
          "score": 58,
          "impact": "neutral",
          "why": "หนี้น้อยกว่าเงินสดมาก จึงยังเป็นเงินสดสุทธิชัดเจน แต่สัญญาเช่าศูนย์ข้อมูลเป็นภาระคงที่ที่โตตามการขยายกำลังผลิต ต้องดูว่าโตเร็วกว่ารายได้หรือไม่"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มทุนและการลดสัดส่วน",
          "current": "ค่าตอบแทนเป็นหุ้น ~377 ล้านดอลลาร์ใน Q2 เทียบรายได้ GAAP ~180 ล้าน",
          "trend": "down",
          "score": 18,
          "impact": "negative",
          "why": "ค่าตอบแทนเป็นหุ้นสูงกว่ารายได้ทั้งไตรมาสกว่าสองเท่า เป็นระดับที่กดดันผู้ถือหุ้นเดิมมาก แม้เป็นเรื่องปกติของบริษัทเพิ่งเข้าตลาด แต่ต้องเห็นสัดส่วนนี้ลดลงชัดเจนในปีถัดไป"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "วิจัยพัฒนา ~320 ล้านดอลลาร์ต่อไตรมาส และขยายกำลังผลิตกับศูนย์ข้อมูล",
          "trend": "flat",
          "score": 55,
          "impact": "neutral",
          "why": "ลงทุนตรงจุดกับการแข่งขัน แต่ยังเร็วเกินจะตัดสินว่าคุ้มหรือไม่ เพราะยังไม่มีผลตอบแทนที่วัดได้ และบริษัทเพิ่งเข้าตลาดได้ราว 5 เดือน"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "~142 ดอลลาร์ (15 ต.ค. 2569) · มูลค่าตลาด ~32 พันล้านดอลลาร์ · ~37 เท่าของรายได้ที่คาดปี 2569",
          "trend": "up",
          "score": 35,
          "impact": "negative",
          "why": "ราคาลงจากจุดสูงสุดวันแรกที่ ~311 ดอลลาร์ มาแล้ว ~54% จึงถูกลงมาก แต่ ~37 เท่าของยอดขายปีนี้ (หรือ ~11 เท่าของปี 2570 ที่ยังเป็นเพียงประมาณการ) ยังเป็นราคาที่ต้องให้ทุกอย่างเป็นไปตามแผน"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 42,
        "recurringPct": null,
        "note": "รายได้เร่งขึ้นจริงและสัดส่วนเปลี่ยนไปทางคลาวด์ซึ่งเกิดซ้ำได้มากกว่า แต่คะแนนความสม่ำเสมอต่ำเพราะลูกค้า 3 รายแรกคิดเป็น ~79% ของรายได้ครึ่งปีแรก และรายได้ฮาร์ดแวร์เป็นดีลก้อนใหญ่ที่ลงไตรมาสไหนก็ทำให้ตัวเลขแกว่ง · ข้อควรระวัง: ตัวเลข core revenue ที่บริษัทใช้สื่อสารไม่ใช่มาตรฐานบัญชีและไม่ปรากฏในงบ 10-Q — สูงกว่า GAAP เพราะบวกกลับการตัดจำหน่าย warrant ลูกค้า",
        "segments": [
          {
            "name": "คลาวด์และบริการ",
            "sharePct": 70,
            "growthNote": "Q2/69 ~126 ล้านดอลลาร์ · ฝั่ง core +287% YoY เป็นตัวขับการเติบโตหลัก",
            "trend": "up"
          },
          {
            "name": "ฮาร์ดแวร์ (ระบบ WSE)",
            "sharePct": 30,
            "growthNote": "Q2/69 ~54 ล้านดอลลาร์ ลดจาก ~111 ล้านใน Q1 เพราะเป็นดีลก้อนใหญ่ที่ไม่สม่ำเสมอ",
            "trend": "down"
          }
        ]
      },
      "aiExecution": {
        "score": 72,
        "items": [
          {
            "item": "เปลี่ยนจากขายเครื่องมาเป็นขายกำลังประมวลผลผ่านคลาวด์",
            "status": "executing",
            "evidence": "Q2/69 รายได้คลาวด์ ~126 ล้านดอลลาร์ แซงฮาร์ดแวร์ ~54 ล้านเป็นครั้งแรก และฝั่ง core โต +287% YoY"
          },
          {
            "item": "สะสมงานในมือระยะยาว",
            "status": "executing",
            "evidence": "RPO ~25.4 พันล้านดอลลาร์ ณ สิ้น Q2/69 สูงกว่ารายได้ย้อนหลัง 12 เดือน ~37 เท่า"
          },
          {
            "item": "ส่งมอบได้ตามที่ให้แนวโน้มไว้",
            "status": "executing",
            "evidence": "Q2/69 รายได้ core ~210 ล้านดอลลาร์ สูงกว่าที่ให้แนวโน้มไว้ ~194 ล้าน ราว 8% และ margin ~41% สูงกว่ากรอบ 36-38% ที่ให้ไว้"
          },
          {
            "item": "ขยายฐานลูกค้าออกจากรายใหญ่ไม่กี่ราย",
            "status": "at-risk",
            "evidence": "ครึ่งปีแรก 2569 ลูกค้ารายใหญ่สุด ~49% ของรายได้ · 3 รายแรกรวม ~79% ยังไม่เห็นการกระจายตัวชัดเจน"
          },
          {
            "item": "ไต่อัตรากำไรขึ้นตามขนาด",
            "status": "at-risk",
            "evidence": "margin ฝั่ง core ขยับขึ้นเป็น ~41% แต่ GAAP margin ร่วงเหลือ ~14% จากการตัดจำหน่าย warrant ลูกค้า ~44 ล้านดอลลาร์ที่หักจากรายได้"
          }
        ]
      },
      "competitive": {
        "overall": "stable",
        "moat": "ความได้เปรียบอยู่ที่สถาปัตยกรรม ไม่ใช่ระบบนิเวศ — การรวมทุกอย่างไว้บนเวเฟอร์เดียวทำให้ไม่ต้องวิ่งผ่าน HBM จึงเร็วกว่ามากในงาน inference ที่เน้นความเร็วต่อ request แต่ด้านซอฟต์แวร์ยังห่างจาก CUDA ที่สะสมมากว่าสิบปี ลูกค้าที่เขียนบน CUDA อยู่แล้วย้ายมาไม่ฟรี และ NVIDIA ก็ไล่ปิดช่องนี้อยู่",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ความเป็นผู้นำตลาด",
            "status": "stable",
            "note": "ส่วนแบ่งตลาดชิป AI โดยรวมยังเล็กมากเทียบ NVIDIA แต่เป็นผู้นำชัดเจนในช่องเฉพาะ inference ความเร็วสูง"
          },
          {
            "key": "techLeadership",
            "label": "ความเป็นผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "WSE-3 ใหญ่กว่าชิประดับ B200 หลายสิบเท่าและมีแบนด์วิดท์หน่วยความจำบนชิปสูงกว่ามาก เป็นการออกแบบที่คู่แข่งลอกตามได้ยากในระยะสั้น"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการส่งมอบ",
            "status": "strengthening",
            "note": "ทำได้เกินแนวโน้มที่ให้ไว้ทั้งรายได้และอัตรากำไรในไตรมาสแรกหลัง IPO และปรับเป้าทั้งปีขึ้น"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "stable",
            "note": "สัญญาระยะยาวที่อยู่ใน RPO ช่วยล็อกลูกค้าไว้ได้ระดับหนึ่ง แต่ชั้นซอฟต์แวร์ยังไม่ผูกลูกค้าแน่นเท่า CUDA"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "stable",
            "note": "เป็นจุดอ่อนที่สุดเมื่อเทียบ NVIDIA — เครื่องมือ ไลบรารี และบุคลากรที่คุ้นเคยยังน้อยกว่ามาก"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับจากนักพัฒนา",
            "status": "strengthening",
            "note": "การเปิดให้ใช้ผ่านคลาวด์ลดกำแพงการทดลองลงมาก เห็นผลจากรายได้คลาวด์ที่โต +287% YoY"
          },
          {
            "key": "customerLockin",
            "label": "การผูกติดของลูกค้า",
            "status": "stable",
            "note": "ลูกค้าใหญ่ไม่กี่รายผูกด้วยสัญญาระยะยาว แต่เป็นดาบสองคม — ผูกแน่นกับรายที่มี ขณะที่ฐานลูกค้ายังแคบมาก"
          },
          {
            "key": "moat",
            "label": "คูเมืองโดยรวม",
            "status": "stable",
            "note": "คูเมืองด้านฮาร์ดแวร์ลึกจริง แต่คูเมืองด้านซอฟต์แวร์และระบบนิเวศยังตื้น ซึ่งในอดีตเป็นปัจจัยที่ตัดสินผู้ชนะในตลาดชิปมากกว่าสเปก"
          }
        ]
      },
      "capitalAllocation": {
        "score": 52,
        "verdict": "ใช้เงินจาก IPO ลงทุนตรงจุดกับการแข่งขัน แต่ยังเร็วเกินจะตัดสินผล · จุดที่ต้องจับตาคือค่าตอบแทนเป็นหุ้นที่สูงกว่ารายได้ทั้งไตรมาส ซึ่งเป็นต้นทุนที่ผู้ถือหุ้นเดิมจ่ายจริงในรูปการถูกลดสัดส่วน",
        "items": [
          {
            "label": "วิจัยและพัฒนา",
            "current": "~320 ล้านดอลลาร์ต่อไตรมาส",
            "assessment": "neutral",
            "why": "สูงกว่ารายได้ทั้งไตรมาสเกือบสองเท่า จำเป็นสำหรับการไล่ตาม NVIDIA แต่ยังไม่มีตัวชี้วัดผลตอบแทนที่วัดได้"
          },
          {
            "label": "ค่าตอบแทนเป็นหุ้น",
            "current": "~377 ล้านดอลลาร์ใน Q2/69",
            "assessment": "poor",
            "why": "สูงกว่ารายได้ GAAP ทั้งไตรมาสกว่าสองเท่า เป็นระดับที่ต้องลดลงชัดเจน ไม่เช่นนั้นกำไรต่อหุ้นจะถูกกดไว้นาน"
          },
          {
            "label": "เงินสดจาก IPO",
            "current": "~6.7 พันล้านดอลลาร์",
            "assessment": "good",
            "why": "ให้เวลาลงทุนยาวโดยไม่ต้องระดมทุนเพิ่มในจังหวะราคาที่อาจไม่ดี เป็นข้อได้เปรียบจริงในธุรกิจที่ใช้เงินหนัก"
          },
          {
            "label": "ขยายกำลังผลิตและศูนย์ข้อมูล",
            "current": "ภาระสัญญาเช่า ~569 ล้านดอลลาร์",
            "assessment": "neutral",
            "why": "จำเป็นต่อการรองรับงานใน RPO ที่รับไว้ แต่เป็นต้นทุนคงที่ที่จะเจ็บถ้ารายได้ไม่มาตามแผน"
          },
          {
            "label": "การคืนเงินผู้ถือหุ้น",
            "current": "ไม่มีปันผลหรือซื้อหุ้นคืน",
            "assessment": "good",
            "why": "เหมาะสมแล้วสำหรับบริษัทที่ยังขาดทุนและมีโอกาสลงทุนที่ให้ผลตอบแทนสูงกว่าการคืนเงิน"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "~142 ดอลลาร์ คิดเป็น ~37 เท่าของรายได้ที่คาดปี 2569 และ ~11 เท่าของรายได้ที่คาดปี 2570 · ถ้าประมาณการปี 2570 (รายได้ ~2.95 พันล้านดอลลาร์) เป็นจริง ราคาจะดูไม่แพง แต่นั่นคือการโต ~3 เท่าในหนึ่งปีจากฐานลูกค้าที่ยังกระจุก · ราคาลงมาแล้ว ~54% จากจุดสูงสุดวันแรก สะท้อนว่าตลาดเองก็ปรับความคาดหวังลงแรง"
      },
      "whatChanged": [
        {
          "metric": "รายได้ GAAP",
          "prev": "Q1/69 ~193 ล้านดอลลาร์",
          "now": "Q2/69 ~180 ล้านดอลลาร์",
          "direction": "negative"
        },
        {
          "metric": "รายได้ core (ตัวเลขบริษัท)",
          "prev": "Q1/69 ~191 ล้านดอลลาร์",
          "now": "Q2/69 ~210 ล้านดอลลาร์",
          "direction": "positive"
        },
        {
          "metric": "สัดส่วนคลาวด์เทียบฮาร์ดแวร์",
          "prev": "Q1/69 คลาวด์ ~83 ล้าน ฮาร์ดแวร์ ~111 ล้าน",
          "now": "Q2/69 คลาวด์ ~126 ล้าน ฮาร์ดแวร์ ~54 ล้าน",
          "direction": "positive"
        },
        {
          "metric": "อัตรากำไรขั้นต้น GAAP",
          "prev": "Q1/69 ~45%",
          "now": "Q2/69 ~14%",
          "direction": "negative"
        },
        {
          "metric": "ขาดทุนต่อหุ้น GAAP",
          "prev": "Q1/69 ~0.22 ดอลลาร์",
          "now": "Q2/69 ~2.98 ดอลลาร์",
          "direction": "negative"
        },
        {
          "metric": "เป้ารายได้ core ทั้งปี 2569",
          "prev": "855-865 ล้านดอลลาร์",
          "now": "880-890 ล้านดอลลาร์",
          "direction": "positive"
        }
      ],
      "risks": [
        "ลูกค้ากระจุกตัวสูงมาก — ครึ่งปีแรก 2569 ลูกค้ารายใหญ่สุดคิดเป็น ~49% ของรายได้ และ 3 รายแรกรวม ~79% การเสียหรือการชะลอคำสั่งซื้อของรายเดียวกระทบงบทั้งปี",
        "ช่องว่างระหว่างตัวเลข core ที่บริษัทใช้สื่อสารกับ GAAP กว้างมาก (อัตรากำไร ~41% เทียบ ~14%) ผู้ที่ดูแต่ core จะประเมินความสามารถทำกำไรสูงเกินจริง และ core ไม่ใช่มาตรฐานบัญชีที่ปรากฏในงบ",
        "ค่าตอบแทนเป็นหุ้น ~377 ล้านดอลลาร์ต่อไตรมาส สูงกว่ารายได้ทั้งไตรมาส กดกำไรต่อหุ้นและลดสัดส่วนผู้ถือหุ้นเดิมอย่างต่อเนื่อง",
        "คูเมืองด้านซอฟต์แวร์ยังตื้นเทียบ CUDA ของ NVIDIA ซึ่งในอดีตเป็นปัจจัยชี้ขาดผู้ชนะในตลาดชิปมากกว่าสเปกฮาร์ดแวร์",
        "ประวัติในฐานะบริษัทจดทะเบียนสั้นมาก (เข้าตลาด พ.ค. 2569) ยังไม่เคยผ่านช่วงที่ความต้องการ AI ชะลอ จึงยังไม่รู้ว่ารายได้ทนทานแค่ไหน"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2026-12-02",
      "history": {
        "years": [
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 0.025,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 0.079,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 0.29,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 0.51,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          }
        ],
        "quarters": [
          {
            "q": "Q1/26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 0.1934,
            "epsAdj": -0.22,
            "opMarginPct": null,
            "fcfB": null,
            "priceQEnd": null
          },
          {
            "q": "Q2/26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 0.1801,
            "epsAdj": -2.98,
            "opMarginPct": -265,
            "fcfB": null,
            "priceQEnd": null,
            "epsNote": "ขาดทุนกว้างขึ้นจาก Q1 มากเพราะค่าตอบแทนเป็นหุ้น ~377 ล้านดอลลาร์หลัง IPO ซึ่งเป็นรายการไม่ใช่เงินสด · ถ้าตัดรายการนี้ออก ขาดทุนจะเหลือราว 0.3 ดอลลาร์ต่อหุ้น จึงเทียบกับ Q1 ตรง ๆ ไม่ได้"
          }
        ],
        "epsBasis": "GAAP diluted EPS ทุกงวด — CBRS ยังขาดทุนและไม่เคยเผยแพร่ตัวเลขกำไรแบบปรับปรุง จึงไม่มีฐานอื่นให้เลือก · ปี 2565-2568 เป็นช่วงก่อนเข้าตลาด (พ.ค. 2569) ไม่มี EPS ที่เทียบกับฐานหุ้นปัจจุบันได้ จึงเว้นว่างไว้แทนการประมาณ"
      },
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-10",
            "fy": "FY2026",
            "eps": -0.47,
            "revenue": 0.887
          },
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 1.27,
            "revenue": 2.95
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "2026Q2",
            "metric": "revenue",
            "guided": "~$194.0M (core)",
            "actual": "~$209.9M (core)",
            "result": "beat",
            "magnitudePct": 8.2
          },
          {
            "quarter": "2026Q2",
            "metric": "margin",
            "guided": "36-38% (core)",
            "actual": "~41% (core)",
            "result": "beat",
            "magnitudePct": 10.8
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 0.887,
            "eps": -0.47,
            "confidence": "high",
            "basis": "GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 2.95,
            "eps": 1.27,
            "confidence": "medium",
            "basis": "GAAP"
          }
        ],
        "note": "ประมาณการปี 2570 มองรายได้โต ~3 เท่าและพลิกเป็นกำไร อิงจาก RPO ~25.4 พันล้านดอลลาร์ที่รับไว้แล้ว · ให้ความมั่นใจปี 2570 เพียงระดับกลาง เพราะบริษัทเพิ่งเข้าตลาดและมีประวัติการให้แนวโน้มเพียง 2 ไตรมาส ยังไม่พอประเมินความแม่นยำ"
      }
    },
    "VRT": {
      "ticker": "VRT",
      "name": "Vertiv Holdings",
      "layer": "power",
      "thesis": {
        "statement": "ขายของที่ศูนย์ข้อมูล AI ขาดไม่ได้แต่ไม่ใช่ชิป — ระบบไฟฟ้าและระบายความร้อน เมื่อแร็ค AI กินไฟหนาแน่นขึ้นจนลมเย็นไม่พอ ความต้องการระบายความร้อนด้วยของเหลวจึงกลายเป็นงานบังคับ ไม่ใช่ทางเลือก · ประเด็นของ thesis ไม่ใช่ความต้องการ (Q3/69 คำสั่งซื้อโตเกินเท่าตัว) แต่คือราคาที่ยังต่ำกว่ายอด ~35% แม้เด้งขึ้น ~16% หลังงบ ทั้งที่บริษัทปรับเป้ากำไรทั้งปีขึ้นทุกรอบที่ประกาศงบในปีนี้",
        "pillars": [
          "งานในมือ ~15 พันล้านดอลลาร์และอัตราส่วนคำสั่งซื้อต่อรายได้ ~2.9 เท่า (สิ้นปี 2568) และ Q3/69 คำสั่งซื้อโตเองไม่รวมซื้อกิจการเกิน 100% YoY แปลว่ารับงานเร็วกว่าส่งมอบมาก · ลูกค้าสั่งล่วงหน้าราว 12-18 เดือน จึงมองเห็นรายได้ล่วงหน้าได้ยาวกว่าผู้ผลิตชิป",
          "อัตรากำไรขยายจริงและต่อเนื่อง — adjusted operating margin ไต่จาก ~20.4% ทั้งปี 2568 เป็น ~20.8% (Q1/69) ~22.6% (Q2/69) และ ~25.2% (Q3/69) โดยเป้า Q4 อยู่ที่ ~25.3-26.3% สะท้อนว่าได้ประโยชน์จากขนาดและผลิตภาพโรงงาน ไม่ใช่แค่ยอดขายโต",
          "ระบายความร้อนด้วยของเหลวเป็นคูเมืองเชิงเวลา — เป็นงานวิศวกรรมที่ต้องออกแบบร่วมกับลูกค้าตั้งแต่ต้นและทดสอบร่วมกับผู้ผลิตชิป คู่แข่งที่เพิ่งเริ่มต้องใช้เวลาหลายปีไล่ตาม",
          "เป็นเงินสดสุทธิและสร้างกระแสเงินสดได้จริง — adjusted FCF 9 เดือนแรกของปี 2569 ~2.23 พันล้านดอลลาร์ และเป้าทั้งปีถูกปรับขึ้นเป็น ~2.6-2.8 พันล้าน ต่างจากบริษัท AI หลายตัวที่ยังเผาเงิน",
          "ความเสี่ยงคือกระจุกตัวที่ปลายทางเดียวกัน — รายได้ผูกกับรอบการลงทุนศูนย์ข้อมูลของผู้ให้บริการคลาวด์รายใหญ่ ถ้าชะลอการลงทุนพร้อมกัน งานในมือจะถูกเลื่อนไม่ใช่ถูกยกเลิก แต่กระทบจังหวะรับรู้รายได้"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "Q3/69 ยอดขาย ~4,313 ล้านดอลลาร์ (+61% YoY · โตเองไม่รวมซื้อกิจการ +55%)",
          "trend": "up",
          "score": 92,
          "impact": "positive",
          "why": "เร่งขึ้นแรงจาก +24% ใน Q2/69 และสูงกว่าจุดกึ่งกลางที่บริษัทให้ไว้ ~15% · บริษัทปรับเป้ายอดขายทั้งปี 2569 ขึ้น ~650 ล้านเป็น ~14.45-14.85 พันล้านดอลลาร์ (โต ~43%) · ที่ยังไม่ให้เต็มเพราะ ~100-150 ล้านในไตรมาสนี้เป็นยอดที่เลื่อนมาจาก Q2 จึงไม่ใช่ฐานที่จะโตแบบนี้ได้ทุกไตรมาส"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "Q3/69 adjusted EPS ~2.21 ดอลลาร์ (+78% YoY) · GAAP ~1.95 ดอลลาร์ (+91%)",
          "trend": "up",
          "score": 93,
          "impact": "positive",
          "why": "เกินจุดกึ่งกลางที่บริษัทให้ไว้ (~1.80) ราว 23% และ GAAP โตเร็วกว่า adjusted เพราะปีก่อนมีค่าปรับโครงสร้าง จึงไม่ใช่กำไรที่เกิดจากการตัดรายการออก · ช่องว่าง GAAP กับ adjusted ~0.26 ดอลลาร์ต่อหุ้นส่วนใหญ่เป็นค่าตัดจำหน่ายสินทรัพย์ไม่มีตัวตนและเงินจ่ายเพิ่มตามเงื่อนไขการซื้อกิจการ"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "Q3/69 adjusted FCF ~652 ล้านดอลลาร์ (+50% YoY · เงินสดจากการดำเนินงาน ~794 ล้าน) · 9 เดือนแรก ~2.23 พันล้าน",
          "trend": "up",
          "score": 86,
          "impact": "positive",
          "why": "ลดลงจาก ~925 ล้านใน Q2/69 เพราะเงินทุนหมุนเวียนดูดเงินไป — สินค้าคงคลังเพิ่ม ~767 ล้านและลูกหนี้เพิ่ม ~632 ล้านในไตรมาสเดียว แม้เงินรับล่วงหน้าจากลูกค้าเพิ่ม ~490 ล้านช่วยชดเชย · ทั้งปีบริษัทปรับเป้าขึ้นเป็น ~2.6-2.8 พันล้านดอลลาร์ (จาก ~2.4-2.6 พันล้าน) จึงยังเป็นจุดแข็ง แต่ลดคะแนนลงจากการแปลงกำไรเป็นเงินสดที่ต่ำลงในไตรมาสนี้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไรจากการดำเนินงาน",
          "current": "Q3/69 adjusted ~25.2% (+290 bp YoY) · GAAP ~22.8%",
          "trend": "up",
          "score": 89,
          "impact": "positive",
          "why": "ขยายต่อจาก ~22.6% ใน Q2/69 และเกินช่วงเป้า ~24.0-25.0% · บริษัทให้เป้า Q4 ที่ ~25.3-26.3% และปรับเป้าทั้งปีเป็น ~23.5-24.5% · ส่วนขยายรอบนี้มาจากนอกอเมริกาเป็นหลัก (ยุโรปตะวันออกกลางแอฟริกา ~28.0% +920 bp YoY · เอเชียแปซิฟิก ~17.0% +380 bp) ขณะที่อเมริกาทรงตัวที่ ~29.4%"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "กำไรจากการดำเนินงาน Q3/69 ~984 ล้านดอลลาร์ (GAAP · +90% YoY) บนฐานทุนที่ไม่หนัก",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เป็นธุรกิจที่ไม่ต้องลงทุนหนักเท่าโรงงานชิป (เงินลงทุนราว 4% ของรายได้) กำไรโตเร็วกว่าฐานทุนจึงดันผลตอบแทนขึ้น · ยังไม่ให้คะแนนสูงกว่านี้เพราะค่าความนิยม ~2.28 พันล้านจากการควบรวมยังอยู่ในฐานทุน และสินค้าคงคลังที่เพิ่มกว่าเท่าตัวในปีนี้ทำให้เงินทุนที่ใช้ในธุรกิจหนักขึ้น"
        },
        {
          "key": "cash",
          "label": "เงินสดในมือ",
          "current": "~3.51 พันล้านดอลลาร์ + เงินลงทุนระยะสั้น ~0.2 พันล้าน (30 ก.ย. 2569) · สภาพคล่องรวม ~6.2 พันล้าน",
          "trend": "up",
          "score": 84,
          "impact": "positive",
          "why": "เพิ่มจาก ~2.81 พันล้านเมื่อสิ้น Q2/69 และมากกว่าหนี้ระยะยาวทั้งหมด ทำให้เป็นเงินสดสุทธิ ~0.8 พันล้านดอลลาร์ · ส่วนหนึ่งมาจากเงินที่ลูกค้าจ่ายล่วงหน้า (เงินรับล่วงหน้า ~4.12 พันล้าน) ซึ่งต้องส่งมอบงานแลก จึงไม่ใช่เงินว่างทั้งหมด"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หนี้ระยะยาว ~2.93 พันล้านดอลลาร์ · สุทธิแล้วเป็นเงินสดสุทธิ ~0.8 พันล้าน",
          "trend": "up",
          "score": 80,
          "impact": "positive",
          "why": "เคยเป็นบริษัทที่มีหนี้สูงจากการเข้าตลาดผ่าน SPAC แต่กระแสเงินสดที่แรงทำให้หักกลบได้หมดแล้วและส่วนเกินกว้างขึ้น · ดอกเบี้ยจ่ายสุทธิ Q3/69 เหลือ ~6 ล้านดอลลาร์จาก ~23 ล้านเมื่อปีก่อน"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มทุนและการลดสัดส่วน",
          "current": "ไม่มีการเพิ่มทุนใหญ่ · หุ้นเจือจาง ~392.7 ล้านหุ้นทรงตัว · ปันผล ~24.0 ล้านดอลลาร์ใน Q3/69",
          "trend": "flat",
          "score": 72,
          "impact": "neutral",
          "why": "ไม่มีการออกหุ้นใหม่ที่กดสัดส่วนผู้ถือหุ้นเดิม และค่าตอบแทนเป็นหุ้น (~20 ล้านดอลลาร์ใน Q3/69) อยู่ในระดับปกติของบริษัทอุตสาหกรรม ไม่ใช่ระดับที่พบในบริษัทเทคเพิ่งเข้าตลาด"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "เงินลงทุน Q3/69 ~139 ล้านดอลลาร์ · ทั้งปีราว 4% ของรายได้ · ขยายกำลังผลิตและซื้อกิจการเสริม",
          "trend": "flat",
          "score": 74,
          "impact": "positive",
          "why": "ลงทุนขยายกำลังผลิตเพื่อรองรับคำสั่งซื้อที่โตเกินเท่าตัว ซึ่งเป็นการใช้เงินที่มีงานรออยู่จริง ไม่ใช่ลงทุนดักความต้องการ · ปันผลยังเล็กมากเมื่อเทียบกระแสเงินสด และผู้บริหารให้น้ำหนักการลงทุนในธุรกิจและซื้อกิจการก่อนการคืนเงินผู้ถือหุ้น"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "~243 ดอลลาร์ (28 ต.ค. 2569) · ~34 เท่าของเป้ากำไรปี 2569 (adjusted ~7.15) · ~26 เท่าของ consensus ปี 2570 (ตัวเลขก่อนงบ Q3) · มูลค่าตลาด ~93 พันล้านดอลลาร์",
          "trend": "down",
          "score": 55,
          "impact": "neutral",
          "why": "ราคาเด้ง ~16% ในวันประกาศงบ เร็วกว่ากำไรคาดปี 2569 ที่ขยับขึ้น ~6% ค่า P/E จึงขยายจาก ~32 เป็น ~34 เท่า · ยังต่ำกว่ายอด ~376 ดอลลาร์ (พ.ค. 69) ราว 35% ขณะที่คำสั่งซื้อและเป้ากำไรดีกว่าตอนนั้น · แต่ ~34 เท่ายังไม่ใช่ราคาถูกในเชิงสัมบูรณ์ และเป็นฐาน adjusted ไม่ใช่ GAAP"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 70,
        "recurringPct": null,
        "note": "คุณภาพรายได้ดีกว่าค่าเฉลี่ยกลุ่ม AI เพราะมีงานในมือ ~15 พันล้านดอลลาร์ (สิ้นปี 2568) รองรับ และ Q3/69 คำสั่งซื้อโตเองเกิน 100% YoY โดยลูกค้าสั่งล่วงหน้าราว 12-18 เดือน · ข้อควรระวัง: จังหวะรับรู้รายได้แกว่งระหว่างไตรมาส — Q2/69 ต่ำกว่าเป้าเพราะซัพพลายเชนติดขัด แล้ว ~100-150 ล้านดอลลาร์ไหลมาลง Q3/69 · รายได้บริการและอะไหล่ ~719 ล้าน (~17% ของยอดขาย Q3/69) เป็นส่วนที่เกิดซ้ำได้มากกว่า แต่บริษัทไม่ได้เปิดสัดส่วนรายได้ที่เกิดซ้ำจริงจึงไม่ระบุ",
        "segments": [
          {
            "name": "อเมริกา",
            "sharePct": 69,
            "growthNote": "Q3/69 ~2,989 ล้านดอลลาร์ +75% YoY (โตเอง +66%) เป็นแรงขับหลักจากการลงทุนศูนย์ข้อมูล AI · อัตรากำไรภูมิภาค ~29.4% ทรงตัวจากปีก่อน",
            "trend": "up"
          },
          {
            "name": "เอเชียแปซิฟิก",
            "sharePct": 18,
            "growthNote": "Q3/69 ~779 ล้านดอลลาร์ +50% YoY (โตเอง +48%) เร่งขึ้นจาก +29% ใน Q2/69",
            "trend": "up"
          },
          {
            "name": "ยุโรป ตะวันออกกลาง แอฟริกา",
            "sharePct": 13,
            "growthNote": "Q3/69 ~545 ล้านดอลลาร์ +23% YoY (โตเอง +19%) ฟื้นจาก +2% ใน Q2/69 แต่ 9 เดือนแรกโตเองยังติดลบ ~3%",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 88,
        "items": [
          {
            "item": "เปลี่ยนความต้องการ AI เป็นงานในมือจริง",
            "status": "executing",
            "evidence": "Q3/69 คำสั่งซื้อโตเองเกิน 100% YoY · งานในมือ ~15 พันล้านดอลลาร์ ณ สิ้นปี 2568 (โตเท่าตัวจาก ~7.8 พันล้าน) · Q3 ไม่ได้เปิดยอดงานในมือ แต่เงินรับล่วงหน้าจากลูกค้าเพิ่มเป็น ~4.12 พันล้านจาก ~1.81 พันล้านเมื่อสิ้นปี 2568"
          },
          {
            "item": "ขยายอัตรากำไรขณะที่โต",
            "status": "executing",
            "evidence": "adjusted operating margin ไต่จาก ~20.4% (ปี 2568) เป็น ~20.8% (Q1/69) ~22.6% (Q2/69) และ ~25.2% (Q3/69)"
          },
          {
            "item": "ส่งมอบระบบระบายความร้อนด้วยของเหลว",
            "status": "executing",
            "evidence": "บริษัทระบุว่ารายได้จากระบายความร้อนด้วยของเหลวเร่งขึ้นและเข้าไปอยู่ในงานออกแบบร่วมกับลูกค้า AI เกือบทุกราย · ในการประชุมนักวิเคราะห์ Q3/69 ผู้บริหารระบุว่าตลาดกำลังเลื่อนสัดส่วนไปทางระบายความร้อนด้วยของเหลว และยอดขายสินค้า Q3/69 โต ~66% YoY"
          },
          {
            "item": "ปรับเป้ากำไรขึ้นตามความต้องการ",
            "status": "executing",
            "evidence": "เป้า adjusted EPS ทั้งปี 2569 ไต่จาก ~6.02 (ก.พ.) เป็น ~6.35 (เม.ย.) ~6.70 (ก.ค.) และ ~7.15 ดอลลาร์ (ต.ค.) · รอบล่าสุดขึ้น ~7% พร้อมเป้ายอดขาย +650 ล้านดอลลาร์"
          },
          {
            "item": "กระจายการเติบโตออกนอกอเมริกา",
            "status": "on-track",
            "evidence": "Q3/69 เอเชียแปซิฟิกโต ~50% และยุโรปตะวันออกกลางแอฟริกาโต ~23% (จาก ~2% ใน Q2/69) · แต่อเมริกาโตเร็วกว่าที่ ~75% จนสัดส่วนขึ้นเป็น ~69% ของยอดขาย การพึ่งภูมิภาคเดียวจึงยังไม่ลดลง"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "คูเมืองมาจากการเป็นคู่คิดด้านวิศวกรรมตั้งแต่ขั้นออกแบบ ไม่ใช่จากตัวสินค้า — ระบบไฟและระบายความร้อนต้องออกแบบเข้ากับแร็คและผังอาคารตั้งแต่ต้น พอเลือกไปแล้วการเปลี่ยนกลางทางมีต้นทุนสูงและเสี่ยงต่อกำหนดเปิดใช้งาน · จุดอ่อนคือเป็นธุรกิจฮาร์ดแวร์ที่ไม่มีชั้นซอฟต์แวร์ล็อกลูกค้า และคู่แข่งอย่าง Schneider Electric กับ Eaton มีขนาดใหญ่กว่า",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ความเป็นผู้นำตลาด",
            "status": "strengthening",
            "note": "เป็นหนึ่งในไม่กี่รายที่ทำได้ครบทั้งไฟและความเย็นสำหรับศูนย์ข้อมูล · Q3/69 คำสั่งซื้อโตเองเกินเท่าตัว และผู้บริหารระบุว่าเป็นการได้ส่วนแบ่งเพิ่ม ไม่ใช่แค่ยอดค้างจาก Q2"
          },
          {
            "key": "techLeadership",
            "label": "ความเป็นผู้นำเทคโนโลยี",
            "status": "strengthening",
            "note": "มาก่อนคู่แข่งในระบบระบายความร้อนด้วยของเหลวระดับแร็ค ซึ่งกำลังกลายเป็นมาตรฐานของแร็คที่กินไฟหนาแน่น"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการส่งมอบ",
            "status": "strengthening",
            "note": "ทำกำไรต่อหุ้นเกินที่ให้แนวโน้มไว้ติดกันหลายไตรมาส และปรับเป้าทั้งปีขึ้นทุกรอบที่ประกาศงบในปี 2569 · จุดสะดุดคือ Q2/69 ส่งมอบล่าช้าจากซัพพลายเชน ซึ่งตามกลับมาได้ใน Q3/69"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการย้ายไปใช้เจ้าอื่น",
            "status": "stable",
            "note": "สูงภายในโครงการที่ออกแบบไว้แล้ว แต่ลูกค้าเลือกผู้ขายใหม่ได้ในโครงการถัดไป จึงไม่ใช่การล็อกถาวร"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "strengthening",
            "note": "ทดสอบและรับรองร่วมกับผู้ผลิตชิปและผู้ออกแบบแร็ค ทำให้ถูกบรรจุในแบบอ้างอิงตั้งแต่ต้นทาง"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับจากผู้ออกแบบระบบ",
            "status": "stable",
            "note": "ไม่ใช่ธุรกิจที่มีนักพัฒนาซอฟต์แวร์ ตัวชี้วัดที่เทียบเคียงคือการถูกเลือกโดยวิศวกรออกแบบศูนย์ข้อมูล ซึ่งยังแข่งกับรายใหญ่ในยุโรปอยู่"
          },
          {
            "key": "customerLockin",
            "label": "การผูกติดของลูกค้า",
            "status": "stable",
            "note": "งานในมือระยะยาวช่วยล็อกรายได้ไว้ แต่ความผูกพันเกิดจากสัญญาและตารางส่งมอบ ไม่ใช่จากตัวสินค้าเอง"
          },
          {
            "key": "moat",
            "label": "คูเมืองโดยรวม",
            "status": "strengthening",
            "note": "กว้างขึ้นจากรอบ AI เพราะความซับซ้อนด้านความร้อนสูงขึ้นจนตัดผู้เล่นที่ทำได้ไม่ครบออกไป แต่ยังเป็นคูเมืองของธุรกิจอุตสาหกรรม ไม่ลึกเท่าคูเมืองซอฟต์แวร์"
          }
        ]
      },
      "capitalAllocation": {
        "score": 76,
        "verdict": "จัดสรรเงินได้สมเหตุสมผลและเปลี่ยนจากบริษัทที่มีหนี้สูงมาเป็นเงินสดสุทธิได้จริง · เงินลงทุนขยายกำลังผลิตมีงานในมือรออยู่แล้ว ไม่ใช่การลงทุนดักความต้องการที่ยังไม่เกิด",
        "items": [
          {
            "label": "ลงทุนขยายกำลังผลิต",
            "current": "Q3/69 ~139 ล้านดอลลาร์ · ทั้งปีราว 4% ของรายได้",
            "assessment": "good",
            "why": "ต่ำเมื่อเทียบอุตสาหกรรมที่ต้องใช้เงินหนัก และมีคำสั่งซื้อที่โตเกินเท่าตัวรองรับไว้แล้ว"
          },
          {
            "label": "ลดภาระหนี้",
            "current": "หนี้ระยะยาว ~2.93 พันล้าน เทียบเงินสด ~3.51 พันล้าน",
            "assessment": "good",
            "why": "เปลี่ยนจากบริษัทที่มีหนี้สูงหลังเข้าตลาดผ่าน SPAC มาเป็นเงินสดสุทธิ ลดความเสี่ยงเชิงโครงสร้างลงมาก"
          },
          {
            "label": "ปันผล",
            "current": "~24.0 ล้านดอลลาร์ใน Q3/69",
            "assessment": "neutral",
            "why": "เล็กมากเมื่อเทียบ FCF ~652 ล้านต่อไตรมาส เป็นสัญลักษณ์มากกว่าการคืนเงินจริง แต่ก็เหมาะกับช่วงที่ยังต้องลงทุนโต"
          },
          {
            "label": "ซื้อกิจการเสริม",
            "current": "หนุนยอดขาย ~6% ใน Q3/69 · ใช้เงิน ~278 ล้านดอลลาร์ใน 9 เดือนแรก",
            "assessment": "neutral",
            "why": "ขนาดเล็กและเสริมสายผลิตภัณฑ์ ยังไม่ใหญ่พอจะสร้างความเสี่ยงการควบรวม แต่มีเงินจ่ายเพิ่มตามเงื่อนไขการซื้อกิจการ ~96 ล้านใน 9 เดือนแรกที่ถูกตัดออกจาก adjusted จึงต้องตามดูว่าไม่สะสมเกินจำเป็น"
          },
          {
            "label": "การซื้อหุ้นคืน",
            "current": "ไม่มีในไตรมาสล่าสุด",
            "assessment": "neutral",
            "why": "ผู้บริหารให้น้ำหนักการลงทุนในธุรกิจและซื้อกิจการก่อน เหมาะสมในช่วงที่โอกาสลงทุนในธุรกิจยังให้ผลตอบแทนสูงกว่า"
          }
        ]
      },
      "valuationView": {
        "level": "fair",
        "note": "~243 ดอลลาร์ (28 ต.ค. 69) คิดเป็น ~34 เท่าของเป้ากำไรปี 2569 (adjusted ~7.15 ดอลลาร์) และ ~26 เท่าของ consensus ปี 2570 (~9.19 ดอลลาร์ ซึ่งเป็นตัวเลขก่อนงบ Q3 ยังไม่สะท้อนผลที่ออกมา) · ราคาเด้ง ~16% หลังงบแต่ยังต่ำกว่ายอด ~376 ดอลลาร์เมื่อ พ.ค. 69 ราว 35% ทั้งที่คำสั่งซื้อเร่งขึ้นและเป้ากำไรถูกปรับขึ้นทุกรอบ แปลว่าตลาดยังคิดลดความยั่งยืนของรอบการลงทุน ไม่ใช่ผลประกอบการที่ออกมาแล้ว · ยังไม่จัดเป็นราคาถูกเพราะ ~34 เท่าสะท้อนการเติบโตไว้พอสมควร และเป็นฐาน adjusted ไม่ใช่ GAAP"
      },
      "whatChanged": [
        {
          "metric": "ยอดขาย",
          "prev": "Q2/69 ~3,274 ล้านดอลลาร์ (+24% YoY)",
          "now": "Q3/69 ~4,313 ล้านดอลลาร์ (+61% YoY · โตเอง +55%)",
          "direction": "positive"
        },
        {
          "metric": "ยอดขายเทียบจุดกึ่งกลางเป้าของไตรมาส",
          "prev": "Q2/69 ต่ำกว่า ~2%",
          "now": "Q3/69 สูงกว่า ~15%",
          "direction": "positive"
        },
        {
          "metric": "adjusted EPS",
          "prev": "Q2/69 ~1.52 ดอลลาร์",
          "now": "Q3/69 ~2.21 ดอลลาร์",
          "direction": "positive"
        },
        {
          "metric": "adjusted operating margin",
          "prev": "Q2/69 ~22.6%",
          "now": "Q3/69 ~25.2%",
          "direction": "positive"
        },
        {
          "metric": "adjusted FCF",
          "prev": "Q2/69 ~925 ล้านดอลลาร์",
          "now": "Q3/69 ~652 ล้านดอลลาร์",
          "direction": "negative"
        },
        {
          "metric": "เป้า adjusted EPS ทั้งปี 2569",
          "prev": "6.65-6.75 ดอลลาร์",
          "now": "7.10-7.20 ดอลลาร์",
          "direction": "positive"
        }
      ],
      "risks": [
        "รายได้ผูกกับรอบการลงทุนศูนย์ข้อมูลของลูกค้ารายใหญ่ไม่กี่กลุ่ม ถ้าผู้ให้บริการคลาวด์ชะลอการลงทุนพร้อมกัน งานในมือจะถูกเลื่อนกำหนดส่งมอบ ซึ่งกระทบจังหวะรับรู้รายได้แม้คำสั่งซื้อจะยังอยู่",
        "งานในมือ ~15 พันล้านดอลลาร์ไม่ใช่รายได้ที่การันตี และตัวเลขที่เปิดล่าสุดยังเป็นข้อมูลสิ้นปี 2568 — Q3/69 บริษัทบอกเพียงว่าคำสั่งซื้อโตเกิน 100% โดยไม่เปิดยอดงานในมือหรืออัตราส่วนคำสั่งซื้อต่อรายได้ จึงมองการเปลี่ยนแปลงระหว่างทางไม่ชัด",
        "เงินทุนหมุนเวียนพองตัวเร็ว — สินค้าคงคลัง ~3.29 พันล้านดอลลาร์ เพิ่มกว่าเท่าตัวจากสิ้นปี 2568 และลูกหนี้ ~4.38 พันล้าน ถ้าลูกค้าเลื่อนรับมอบ ของที่สต็อกไว้จะกลายเป็นภาระและกดกระแสเงินสดแบบที่เริ่มเห็นใน Q3/69",
        "เป็นธุรกิจฮาร์ดแวร์ที่ไม่มีชั้นซอฟต์แวร์ล็อกลูกค้า คู่แข่งอย่าง Schneider Electric และ Eaton ใหญ่กว่าและลงมาเล่นตลาดเดียวกัน การแข่งด้านราคาจะกดอัตรากำไรที่เพิ่งขยายขึ้นมาได้",
        "ยอดขายแกว่งตามจังหวะส่งมอบ — Q2/69 ต่ำกว่าเป้าเพราะซัพพลายเชนติดขัด แล้วยอด ~100-150 ล้านดอลลาร์ไหลมาลง Q3/69 ทำให้ Q3 ดูสูงกว่าฐานปกติ และการเติบโตระดับนี้ต้องพึ่งการขยายโรงงานหลายแห่งพร้อมกัน ความผิดพลาดด้านการผลิตจะกระทบกำหนดส่งทันที"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2027-02",
      "history": {
        "years": [
          {
            "fy": "FY2022",
            "endYm": "2022-12",
            "revenueB": 5.69,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2023",
            "endYm": "2023-12",
            "revenueB": 6.86,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 8.01,
            "epsAdj": null,
            "opMarginPct": 19.4,
            "fcfB": 1.14,
            "priceFYEnd": null
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 10.23,
            "epsAdj": 4.2,
            "opMarginPct": 20.4,
            "fcfB": 1.89,
            "priceFYEnd": null
          }
        ],
        "quarters": [
          {
            "q": "Q4/25",
            "endYm": "2025-12",
            "endDate": "2025-12-31",
            "revenueB": 2.88,
            "epsAdj": 1.36,
            "opMarginPct": 23.2,
            "fcfB": 0.91,
            "priceQEnd": null
          },
          {
            "q": "Q1/26",
            "endYm": "2026-03",
            "endDate": "2026-03-31",
            "revenueB": 2.65,
            "epsAdj": 1.17,
            "opMarginPct": 20.8,
            "fcfB": 0.653,
            "priceQEnd": null
          },
          {
            "q": "Q2/26",
            "endYm": "2026-06",
            "endDate": "2026-06-30",
            "revenueB": 3.274,
            "epsAdj": 1.52,
            "opMarginPct": 22.6,
            "fcfB": 0.925,
            "priceQEnd": null
          },
          {
            "q": "Q3/26",
            "endYm": "2026-09",
            "endDate": "2026-09-30",
            "revenueB": 4.313,
            "epsAdj": 2.21,
            "opMarginPct": 25.2,
            "fcfB": 0.652,
            "priceQEnd": 241.31
          }
        ],
        "epsBasis": "adjusted (non-GAAP) diluted EPS — ใช้ฐานเดียวกับที่บริษัทให้แนวโน้มและที่ consensus อ้างอิง จึงเทียบกันได้ตรง · GAAP ต่ำกว่าราว 0.18-0.26 ดอลลาร์ต่อหุ้นในแต่ละไตรมาสของปี 2569 (Q3/69 GAAP ~1.95 เทียบ adjusted ~2.21 ส่วนต่างหลักคือค่าตัดจำหน่ายสินทรัพย์ไม่มีตัวตนและเงินจ่ายเพิ่มตามเงื่อนไขการซื้อกิจการ) · opMarginPct เป็นฐาน adjusted เช่นกัน · ปี 2565-2566 ไม่ได้บันทึก EPS ไว้เพราะยังไม่ได้ตรวจยืนยันจากแหล่งปฐมภูมิ"
      },
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 9.19,
            "revenue": 18.27
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "2026Q3",
            "metric": "eps",
            "guided": "$1.77-1.83 (adjusted)",
            "actual": "$2.21 (adjusted)",
            "result": "beat",
            "magnitudePct": 22.8
          },
          {
            "quarter": "2026Q3",
            "metric": "margin",
            "guided": "24.0-25.0% (adjusted)",
            "actual": "~25.2% (adjusted)",
            "result": "beat",
            "magnitudePct": 2.9
          },
          {
            "quarter": "2026Q3",
            "metric": "revenue",
            "guided": "$3,650-3,850M",
            "actual": "~$4,313M",
            "result": "beat",
            "magnitudePct": 15
          },
          {
            "quarter": "2026Q2",
            "metric": "eps",
            "guided": "$1.37-1.43 (adjusted)",
            "actual": "$1.52 (adjusted)",
            "result": "beat",
            "magnitudePct": 8.6
          },
          {
            "quarter": "2026Q2",
            "metric": "margin",
            "guided": "20.7-21.7% (adjusted)",
            "actual": "~22.6% (adjusted)",
            "result": "beat",
            "magnitudePct": 6.6
          },
          {
            "quarter": "2026Q2",
            "metric": "revenue",
            "guided": "$3,250-3,450M",
            "actual": "~$3,274M",
            "result": "miss",
            "magnitudePct": -2.3
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 14.65,
            "eps": 7.15,
            "confidence": "low",
            "basis": "non-GAAP"
          },
          {
            "fy": "FY2027",
            "revenue": 18.27,
            "eps": 9.19,
            "confidence": "medium",
            "basis": "non-GAAP"
          }
        ],
        "note": "ปี 2569 ใช้จุดกึ่งกลางเป้าใหม่ของบริษัท (~7.15 ดอลลาร์ / ~14.65 พันล้าน) แทน consensus ก่อนงบ ~6.73 ดอลลาร์ / ~14.0 พันล้านที่ล้าสมัยแล้ว ส่วนปี 2570 ~9.19 ดอลลาร์ยังเป็นตัวเลขก่อนงบ Q3 ที่นักวิเคราะห์ยังไม่ทยอยปรับ · Q3/69 ยอดขายเกินจุดกึ่งกลางเป้า ~15% แต่ ~100-150 ล้านดอลลาร์เป็นยอดที่เลื่อนมาจาก Q2 และบริษัทจะให้เป้าปี 2570 พร้อมงบ Q4 (ราว ก.พ. 70)"
      }
    },
    "SPCX": {
      "ticker": "SPCX",
      "name": "SpaceX (Space Exploration Technologies)",
      "layer": "cloud",
      "thesis": {
        "statement": "SpaceX หลังรวมกับ xAI คือบริษัทเดียวที่ถือทั้งเครือข่ายดาวเทียมใหญ่ที่สุดในโลก (Starlink) ระบบขนส่งอวกาศต้นทุนต่ำที่สุด (Falcon/Starship) และธุรกิจ AI ที่โตเร็วมาก (Super Intelligence: ปล่อยเช่า compute จาก Colossus ให้ Anthropic/Google + Grok + Cursor) — Starlink เป็นเครื่องผลิตเงินสดที่กำไรแล้ว ส่วน AI เพิ่งพลิกเป็นกำไรจากการดำเนินงานใน Q3 2026 เดิมพันคือบริษัทเปลี่ยนเงินจาก IPO ~$86B และ capex เกือบ $20B ต่อไตรมาส ให้เป็นรายได้ AI ที่ยั่งยืนได้ทันก่อนเงินสดลดลง",
        "pillars": [
          "Starlink ครองอินเทอร์เน็ตดาวเทียมวงโคจรต่ำ: ผู้ใช้ 13.6 ล้านราย (+89% YoY) ใน 174 ประเทศ ดาวเทียม ~11,100 ดวง — กำไรจากการดำเนินงาน ~$2.4B/ไตรมาส เป็นขาเงินสดหลักของกลุ่ม",
          "AI กลายเป็นรายได้ครึ่งหนึ่งของกลุ่ม: Super Intelligence $7.6B ใน Q3 2026 (+830% YoY) จากสัญญาเช่า compute (Anthropic $1.25B/เดือน · Google $920M/เดือนเริ่ม ต.ค. 2026) + Cursor + Grok",
          "ต้นทุนส่งของขึ้นวงโคจรต่ำที่สุดในโลกและเป็นเจ้าของเอง: ปีนี้บินแล้ว 113 เที่ยวใน 9 เดือน · Starship เริ่มบินเที่ยวที่มีรายได้ (Flight 14) — ทำให้ Starlink ขยายเครือข่ายได้ถูกกว่าคู่แข่งทุกราย",
          "เงินทุนหนา: สภาพคล่อง ~$90B หลัง IPO ใหญ่ที่สุดในประวัติศาสตร์ ($85.7B) + หุ้นกู้ $25B — รองรับ capex AI ได้หลายไตรมาส",
          "ธุรกิจเกื้อหนุนกัน: Starlink ใช้จรวดของตัวเอง, AI ใช้กระแสเงินสดจาก Starlink, X/Grok ใช้ผู้ใช้และข้อมูลร่วมกัน — โมเดลที่คู่แข่งรายเดียวเลียนแบบได้ยาก"
        ]
      },
      "fundamentals": [
        {
          "key": "revenueGrowth",
          "label": "การเติบโตของรายได้",
          "current": "+161% YoY (Q3 2026 — $14.6B) · 9 เดือนแรก $27.1B เกือบ 2 เท่าของปีก่อน",
          "trend": "up",
          "score": 96,
          "impact": "positive",
          "why": "โตแรงจาก 3 ขาพร้อมกัน แต่ส่วนใหญ่มาจาก AI ที่เพิ่งเริ่มรับรู้สัญญาเช่า compute และรวม Cursor เข้ามา (~$0.6B) — อัตราโตระดับนี้จะลดลงเมื่อฐานใหญ่ขึ้น"
        },
        {
          "key": "epsGrowth",
          "label": "การเติบโตของกำไรต่อหุ้น",
          "current": "EPS $0.35 (Q3 2026) พลิกจากขาดทุน $0.09 (Q2) — ไตรมาสแรกที่มีกำไรหลัง IPO",
          "trend": "up",
          "score": 70,
          "impact": "positive",
          "why": "กำไรสุทธิ $4.4B สูงกว่ากำไรจากการดำเนินงาน $2.8B เพราะดอกเบี้ยรับ ~$0.9B รายได้อื่น ~$1.0B และเครดิตภาษี ~$0.4B — กำไรที่ยั่งยืนจริงยังต่ำกว่าตัวเลขพาดหัว"
        },
        {
          "key": "fcf",
          "label": "กระแสเงินสดอิสระ",
          "current": "ติดลบหนัก — capex Q3 $19.6B (AI $16.4B) สูงกว่ารายได้ทั้งไตรมาส · 9 เดือน capex $48.1B",
          "trend": "down",
          "score": 20,
          "impact": "negative",
          "why": "กระแสเงินสดจากการดำเนินงานไม่พอจ่าย capex AI — ครึ่งปีแรก FCF ติดลบ ~$25B และ Q3 ลงทุนอีก $19.6B โดยอาศัยเงินจาก IPO และหุ้นกู้"
        },
        {
          "key": "margin",
          "label": "อัตรากำไร",
          "current": "Operating margin ~19% (Q3 2026) จาก −2% (Q2) และ −41% (Q1) · Adjusted EBITDA $8.8B",
          "trend": "up",
          "score": 62,
          "impact": "positive",
          "why": "Starlink มีกำไรจากการดำเนินงานราว 45% ของรายได้ และ AI เพิ่งพลิกเป็นกำไร $431M ส่วนธุรกิจอวกาศยังขาดทุนเล็กน้อย — ทิศทางดีแต่เพิ่งเริ่ม"
        },
        {
          "key": "roic",
          "label": "ผลตอบแทนต่อเงินลงทุน",
          "current": "ยังต่ำ — ลงทุนหลายหมื่นล้านในศูนย์ข้อมูลที่เพิ่งเริ่มสร้างรายได้",
          "trend": "flat",
          "score": 35,
          "impact": "neutral",
          "why": "Starlink ให้ผลตอบแทนต่อทุนสูง แต่ทุนก้อนใหญ่ของกลุ่มถูกใส่ใน compute AI ที่ยังไม่พิสูจน์ผลตอบแทนเต็มรอบ"
        },
        {
          "key": "cash",
          "label": "เงินสด",
          "current": "เงินสด+หลักทรัพย์ ~$89.9B (สิ้น Q3 2026) ลดจาก ~$100B ใน Q2",
          "trend": "down",
          "score": 82,
          "impact": "positive",
          "why": "หนาที่สุดชุดหนึ่งในตลาด แต่ลดลงราว $10B ในไตรมาสเดียวจาก capex — ถ้ายังลงทุนระดับนี้ต่อเนื่อง จะต้องพึ่งรายได้ AI หรือระดมทุนเพิ่มภายในไม่กี่ปี"
        },
        {
          "key": "debt",
          "label": "หนี้สิน",
          "current": "หุ้นกู้ ~$25B (ออก มิ.ย. 2026) — ยังน้อยเทียบเงินสด",
          "trend": "flat",
          "score": 70,
          "impact": "neutral",
          "why": "มีหนี้ระยะยาวจากการระดมทุนทำศูนย์ข้อมูล แต่สภาพคล่องสูงกว่าหนี้หลายเท่า ความเสี่ยงงบดุลยังต่ำ"
        },
        {
          "key": "dilution",
          "label": "การเพิ่มจำนวนหุ้น",
          "current": "จำนวนหุ้นเพิ่มเป็นเท่าตัวในปีเดียวจาก IPO + ค่าตอบแทนเป็นหุ้นสูง (Cursor ~$1.2B ใน Q3)",
          "trend": "down",
          "score": 30,
          "impact": "negative",
          "why": "จำนวนหุ้นเฉลี่ยเพิ่มมากหลัง IPO และค่าตอบแทนเป็นหุ้นยังสูงตามการซื้อกิจการ — ผู้ถือหุ้นเดิมถูกลดสัดส่วนต่อเนื่อง"
        },
        {
          "key": "capitalAllocation",
          "label": "การจัดสรรเงินทุน",
          "current": "capex ~$20B/ไตรมาส เกือบทั้งหมดเป็น AI + ซื้อ Cursor ~$60B + ดีลคลื่นความถี่ 800 MHz",
          "trend": "flat",
          "score": 48,
          "impact": "neutral",
          "why": "ทุ่มเงินตามโอกาส AI ที่มีสัญญารองรับบางส่วน (Anthropic/Google) แต่ขนาดและความเร็วของการลงทุนสูงมาก ผลตอบแทนยังต้องพิสูจน์"
        },
        {
          "key": "valuation",
          "label": "ความน่าสนใจของราคา",
          "current": "mcap ~$1.9T ที่ราคา ~$148 (ต.ค. 2026) · ~42 เท่าของรายได้ปี 2026 ที่คาด และ ~80 เท่าของ EPS ปี 2027 ที่คาด",
          "trend": "flat",
          "score": 18,
          "impact": "negative",
          "why": "ราคาฝังการเติบโตหลายปีไว้ล่วงหน้าแล้ว — แม้รายได้โตเร็วมาก multiple ระดับนี้ทำให้หุ้นไวต่อทุกสัญญาณชะลอของ AI หรือ capex ที่ไม่ได้ผล"
        }
      ],
      "revenueQuality": {
        "acceleration": "accelerating",
        "consistency": 45,
        "recurringPct": null,
        "note": "รายได้เร่งตัวแรงแต่ส่วนผสมเปลี่ยนเร็วมาก — Starlink เป็นรายได้สมาชิกรายเดือนที่คาดการณ์ได้ ขณะที่ AI มาจากสัญญาเช่า compute หลายปีกับลูกค้าไม่กี่ราย (Anthropic, Google) บวก Cursor ที่เพิ่งรวมเข้ามา · อยู่ในตลาดเพียง 2 ไตรมาส ความสม่ำเสมอจึงยังประเมินได้น้อย",
        "segments": [
          {
            "name": "Super Intelligence (เช่า compute, Grok, Cursor, X)",
            "sharePct": 52,
            "growthNote": "$7.6B ใน Q3 2026 (+830% YoY, +195% QoQ) — สัญญาเช่า compute + Cursor ~$0.6B + โฆษณา X ~$0.5B",
            "trend": "up"
          },
          {
            "name": "Connectivity (Starlink)",
            "sharePct": 36,
            "growthNote": "$5.25B (+69% YoY) — ผู้ใช้ทั่วไป $3.1B · องค์กร/รัฐ $2.1B · ARPU $69/เดือน",
            "trend": "up"
          },
          {
            "name": "Space Operations (Falcon, Starship, Dragon)",
            "sharePct": 12,
            "growthNote": "$1.8B (+84% QoQ) — งานยิงจรวดให้ลูกค้า $1.13B · Starship เที่ยวแรกที่มีรายได้",
            "trend": "up"
          }
        ]
      },
      "aiExecution": {
        "score": 74,
        "items": [
          {
            "item": "เปลี่ยนกำลัง compute เป็นรายได้ (เช่า Colossus ให้ผู้อื่น)",
            "status": "executing",
            "evidence": "Anthropic เช่า compute เทียบ GPU ~220,000 ตัว $1.25B/เดือน และ Google ~110,000 ตัว $920M/เดือน (ต.ค. 2026-มิ.ย. 2029) · กำลังติดตั้ง 1.7 GW จาก 0.6 GW เมื่อปีก่อน"
          },
          {
            "item": "ทำให้ธุรกิจ AI มีกำไร",
            "status": "executing",
            "evidence": "Super Intelligence พลิกเป็นกำไรจากการดำเนินงาน $431M ใน Q3 2026 จากขาดทุน $1.26B ใน Q2 · Adjusted EBITDA $5.0B"
          },
          {
            "item": "Grok / Cursor — ผลิตภัณฑ์ AI ของตัวเอง",
            "status": "on-track",
            "evidence": "ปิดดีล Cursor 14 ส.ค. 2026 (มูลค่า ~$60B) สร้างรายได้ ~$608M ในไตรมาสแรก · ออก Grok 4.5 ก.ค. 2026"
          },
          {
            "item": "Starlink เป็นเครื่องผลิตเงินสดให้ทั้งกลุ่ม",
            "status": "executing",
            "evidence": "กำไรจากการดำเนินงาน $2.37B (+99% YoY) ใน Q3 2026 · ผู้ใช้ 13.6 ล้านราย ARPU $69"
          },
          {
            "item": "คุม capex ให้สร้างผลตอบแทนทัน",
            "status": "at-risk",
            "evidence": "capex Q3 $19.6B สูงกว่ารายได้ทั้งไตรมาส และเงินสดลดลงราว $10B ในไตรมาสเดียว — ยังพึ่งเงินที่ระดมมา"
          },
          {
            "item": "ลดการพึ่งลูกค้า AI ไม่กี่ราย",
            "status": "at-risk",
            "evidence": "รายได้เช่า compute ส่วนใหญ่มาจาก Anthropic และ Google — ถ้ารายใหญ่ย้ายไปสร้างศูนย์ข้อมูลเองหรือหาผู้ให้เช่ารายอื่น รายได้กระทบแรง"
          }
        ]
      },
      "competitive": {
        "overall": "strengthening",
        "moat": "เป็นเจ้าของทั้งจรวดต้นทุนต่ำ เครือข่ายดาวเทียมใหญ่ที่สุดในโลก และศูนย์ข้อมูล AI ระดับกิกะวัตต์ — ฝั่ง Starlink/อวกาศแทบไม่มีคู่แข่งใกล้เคียง แต่ฝั่ง AI แข่งกับ hyperscaler และแล็บโมเดลที่ทุนหนาพอกัน",
        "factors": [
          {
            "key": "marketLeadership",
            "label": "ความเป็นผู้นำตลาด",
            "status": "strengthening",
            "note": "Starlink ครองตลาดอินเทอร์เน็ตดาวเทียม LEO และ Falcon ครองตลาดยิงจรวดเชิงพาณิชย์ของโลก"
          },
          {
            "key": "techLeadership",
            "label": "ความนำทางเทคโนโลยี",
            "status": "strengthening",
            "note": "จรวดนำกลับมาใช้ซ้ำ + Starship เริ่มบินเชิงพาณิชย์ · ฝั่ง AI มี Grok แต่ไม่ได้นำโมเดลชั้นแนวหน้าทุกด้าน"
          },
          {
            "key": "executionSpeed",
            "label": "ความเร็วในการลงมือ",
            "status": "strengthening",
            "note": "เพิ่มกำลัง compute จาก 0.6 เป็น 1.7 GW ภายในปีเดียว — ความเร็วสร้างศูนย์ข้อมูลเป็นจุดขายต่อลูกค้าเช่า compute"
          },
          {
            "key": "switchingCost",
            "label": "ต้นทุนการเปลี่ยนผู้ให้บริการ",
            "status": "stable",
            "note": "ผู้ใช้ Starlink ย้ายออกได้ถ้ามีทางเลือก แต่ในพื้นที่ห่างไกลยังไม่มีทางเลือกจริง · สัญญาเช่า compute เป็นระยะยาวหลายปี"
          },
          {
            "key": "ecosystem",
            "label": "ระบบนิเวศ",
            "status": "strengthening",
            "note": "Starlink + X + Grok + Cursor + Tesla (โรงงานชิป Terafab ร่วมกัน) เชื่อมกันเป็นระบบ ใช้ข้อมูลและฐานผู้ใช้ร่วมกัน"
          },
          {
            "key": "developerAdoption",
            "label": "การยอมรับจากนักพัฒนา",
            "status": "stable",
            "note": "Cursor เพิ่มฐานนักพัฒนาโดยตรง แต่ Grok API ยังเล็กเทียบผู้นำตลาดโมเดล"
          },
          {
            "key": "customerLockin",
            "label": "การผูกลูกค้า",
            "status": "stable",
            "note": "ลูกค้ารัฐ/กองทัพและสายการบิน (เครื่องบิน 3,800+ ลำ) ผูกกับ Starlink · ลูกค้า AI กระจุกไม่กี่รายและมีทางเลือก"
          },
          {
            "key": "moat",
            "label": "คูเมือง",
            "status": "strengthening",
            "note": "ต้นทุนส่งของขึ้นวงโคจรต่ำกว่าคู่แข่งมาก ทำให้เครือข่าย Starlink ขยายได้ถูกกว่าใคร — คูเมืองที่ลอกเลียนยาก"
          }
        ]
      },
      "capitalAllocation": {
        "score": 48,
        "verdict": "ทุ่มเงินเกือบทั้งหมดไปที่ AI ด้วยความเร็วสูง มีสัญญาเช่ารองรับบางส่วนแล้ว แต่ขนาดเงินและการลดสัดส่วนผู้ถือหุ้นยังสูง — ต้องดูว่ารายได้ AI ตามทันเงินที่ลงไปหรือไม่",
        "items": [
          {
            "label": "Capex ศูนย์ข้อมูล AI",
            "current": "$16.4B ใน Q3 2026 (จาก capex รวม $19.6B)",
            "assessment": "neutral",
            "why": "จำเป็นต่อสัญญาเช่า compute ที่เซ็นแล้ว แต่สูงกว่ารายได้ทั้งบริษัทในไตรมาส — ถ้าลูกค้าชะลอจะเหลือสินทรัพย์ราคาแพงที่ใช้ไม่เต็ม"
          },
          {
            "label": "ซื้อ Cursor",
            "current": "มูลค่า ~$60B ปิดดีล ส.ค. 2026",
            "assessment": "neutral",
            "why": "ได้รายได้ซอฟต์แวร์และฐานนักพัฒนาทันที (~$608M ไตรมาสแรก) แต่ราคาสูงมากเทียบรายได้"
          },
          {
            "label": "ระดมทุน IPO + หุ้นกู้",
            "current": "IPO $85.7B (มิ.ย. 2026) + หุ้นกู้ $25B",
            "assessment": "good",
            "why": "ระดมทุนในจังหวะตลาดเปิดรับเต็มที่ ได้เงินสำรองที่รองรับการลงทุนหลายไตรมาสโดยไม่ต้องพึ่งตลาดในยามลำบาก"
          },
          {
            "label": "ค่าตอบแทนเป็นหุ้น",
            "current": "~$0.8B (Q2) และเฉพาะ Cursor ~$1.2B (Q3)",
            "assessment": "poor",
            "why": "สูงและเพิ่มขึ้นตามการซื้อกิจการ — ผู้ถือหุ้นจ่ายจริงผ่านการถูกลดสัดส่วน"
          },
          {
            "label": "การคืนเงินผู้ถือหุ้น",
            "current": "ไม่มีปันผลหรือซื้อหุ้นคืน",
            "assessment": "good",
            "why": "เหมาะกับบริษัทที่ยังต้องใช้เงินลงทุนมหาศาล"
          }
        ]
      },
      "valuationView": {
        "level": "expensive",
        "note": "มูลค่าตลาด ~$1.9T ที่ราคา ~$148 (19 ต.ค. 2026, สูงกว่าราคา IPO $135 ราว 10%) — ประมาณ 42 เท่าของรายได้ปี 2026 ที่นักวิเคราะห์คาด (~$45.5B) และ ~80 เท่าของ EPS ปี 2027 ที่คาด (~$1.83) · ราคาฝังความสำเร็จของ AI และ Starship ไว้ล่วงหน้าหลายปี เหมาะทยอยสะสมช่วงราคาย่อมากกว่าไล่ตามข่าว"
      },
      "whatChanged": [
        {
          "metric": "รายได้รวม (Q2 → Q3 2026)",
          "prev": "$7.8B",
          "now": "$14.6B (+161% YoY) — สูงกว่าที่คาด ~$12.9B",
          "direction": "positive"
        },
        {
          "metric": "Super Intelligence",
          "prev": "$2.6B · ขาดทุนจากการดำเนินงาน $1.26B",
          "now": "$7.6B · กำไรจากการดำเนินงาน $431M",
          "direction": "positive"
        },
        {
          "metric": "กำไรสุทธิ / EPS",
          "prev": "ขาดทุน $541M (−$0.09)",
          "now": "กำไร $4.4B ($0.35) — รวมรายได้อื่น+เครดิตภาษี ~$1.4B",
          "direction": "positive"
        },
        {
          "metric": "Starlink ผู้ใช้ / ARPU",
          "prev": "12.0 ล้าน · $66",
          "now": "13.6 ล้าน · $69",
          "direction": "positive"
        },
        {
          "metric": "Capex ต่อไตรมาส",
          "prev": "~$14B (ครึ่งปีแรก $28.5B)",
          "now": "$19.6B (AI $16.4B)",
          "direction": "negative"
        },
        {
          "metric": "เงินสด + หลักทรัพย์",
          "prev": "~$100B",
          "now": "~$89.9B",
          "direction": "negative"
        }
      ],
      "risks": [
        "เงินสดลดเร็ว: capex ~$20B ต่อไตรมาสสูงกว่ารายได้ — ถ้ารายได้ AI โตช้ากว่าแผน ต้องระดมทุนเพิ่มหรือชะลอการลงทุน",
        "ลูกค้า AI กระจุกตัว: รายได้เช่า compute พึ่ง Anthropic และ Google เป็นหลัก ทั้งคู่มีทางเลือกและกำลังสร้างกำลังประมวลผลของตัวเอง",
        "การตัดสินใจรวมศูนย์ที่ผู้ก่อตั้ง และธุรกรรมกับบริษัทในเครือ (Tesla, X) — ผู้ถือหุ้นรายย่อยมีอำนาจจำกัด",
        "ความเสี่ยงเทคโนโลยีและกฎระเบียบ: Starship ยังอยู่ช่วงพิสูจน์ · คลื่นความถี่ การจราจรในวงโคจร และสัญญารัฐบาลขึ้นกับนโยบาย",
        "Valuation สูงมาก (~42 เท่าของรายได้ที่คาด) และประวัติในตลาดสั้น — ราคาแกว่งแรง เคยลง 23% ใน 3 วันหลังประกาศออกหุ้นกู้เมื่อ มิ.ย. 2026"
      ],
      "asOf": "2026-10",
      "nextEarnings": "2027-01",
      "history": {
        "fyNote": "ปีบัญชี = ปีปฏิทิน (สิ้นสุด ธ.ค.) · เข้าตลาด Nasdaq 12 มิ.ย. 2026 ราคา IPO $135 · ข้อมูลก่อน IPO มาจาก S-1",
        "epsBasis": "GAAP diluted EPS — ปีก่อนเข้าตลาดไม่มี EPS ที่เทียบกับฐานหุ้นปัจจุบันได้จึงเว้นไว้ · Q2/69 คิดจากจำนวนหุ้นเฉลี่ยที่รวมช่วงก่อน IPO (~5.9B หุ้น) ส่วน Q3/69 เป็นฐานหลัง IPO (~12.6B หุ้น) เทียบกันตรง ๆ ไม่ได้",
        "instrument": {
          "shareBasis": "common",
          "currency": "USD",
          "note": "หุ้นสามัญ Nasdaq: SPCX — ราคาและ EPS ฐานเดียวกัน"
        },
        "years": [
          {
            "fy": "FY2024",
            "endYm": "2024-12",
            "revenueB": 14,
            "epsAdj": null,
            "opMarginPct": null,
            "fcfB": null,
            "priceFYEnd": null
          },
          {
            "fy": "FY2025",
            "endYm": "2025-12",
            "revenueB": 18.67,
            "epsAdj": null,
            "opMarginPct": -13.9,
            "fcfB": null,
            "priceFYEnd": null
          }
        ],
        "quarters": [
          {
            "q": "Q1/26",
            "endYm": "2026-03",
            "revenueB": 4.69,
            "epsAdj": null,
            "opMarginPct": -41.4,
            "fcfB": null,
            "priceQEnd": null
          },
          {
            "q": "Q2/26",
            "endYm": "2026-06",
            "revenueB": 7.81,
            "epsAdj": -0.09,
            "opMarginPct": -1.8,
            "fcfB": null,
            "priceQEnd": null,
            "epsNote": "ขาดทุนต่อหุ้นคิดจากจำนวนหุ้นเฉลี่ย ~5.9B หุ้นที่รวมช่วงก่อน IPO (เข้าตลาดกลางไตรมาส) จึงเทียบกับ Q3 ที่ฐานหุ้นหลัง IPO ตรง ๆ ไม่ได้"
          },
          {
            "q": "Q3/26",
            "endYm": "2026-09",
            "revenueB": 14.58,
            "epsAdj": 0.35,
            "opMarginPct": 19.1,
            "fcfB": null,
            "priceQEnd": 150.86,
            "epsNote": "กำไรสุทธิ $4.4B สูงกว่ากำไรจากการดำเนินงาน $2.8B เพราะรายได้อื่น ~$1.0B และเครดิตภาษี ~$0.39B (รวม ~$0.11 ต่อหุ้น) บวกดอกเบี้ยรับ ~$0.87B จากเงินสด IPO · ตัดรายได้อื่นและเครดิตภาษีออก EPS ราว $0.24"
          }
        ],
        "notes": "ข้อมูลรายปีจาก S-1 (รายได้ 2025 $18.67B +33.2% → 2024 ~$14.0B · ขาดทุนจากการดำเนินงาน 2025 $2.589B) · รายไตรมาสจาก earnings release Q2 และ Q3 2026 (Q1 จากตารางเปรียบเทียบใน release Q2) · FCF รายไตรมาสไม่ได้เปิดเผยแยก (ครึ่งปีแรก 2026 ติดลบ $25.0B) จึงเว้นไว้ · ยังไม่ใส่วันสิ้นงวดเพราะไม่พบในเอกสารที่อ้าง",
        "sources": [
          "https://www.sec.gov/Archives/edgar/data/1181412/000162828026036936/spaceexplorationtechnologi.htm",
          "https://www.sec.gov/Archives/edgar/data/0001181412/000162828026052515/earningsreleaseq22608042.htm",
          "https://s21.q4cdn.com/184289198/files/content_files/SpaceX-Reports-Third-Quarter-2026-Results.pdf",
          "https://teslanorth.com/2026/10/20/spacex-q3-2026-results/",
          "https://investinglive.com/stocks/spacex-beats-q3-forecasts-across-all-three-segments-as-ai-revenue-tops-7-5-billion/",
          "https://stockanalysis.com/stocks/spcx/history/"
        ]
      },
      "forwardView": {
        "asOf": "2026-10",
        "estimateHistory": [
          {
            "asOf": "2026-10",
            "fy": "FY2027",
            "eps": 1.83,
            "revenue": 111.65
          }
        ],
        "guidanceTrack": [
          {
            "quarter": "2026Q3",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance เป็นตัวเลข",
            "actual": "~$14.58B",
            "result": "noGuidance",
            "magnitudePct": null
          },
          {
            "quarter": "2026Q2",
            "metric": "revenue",
            "guided": "ไม่ให้ guidance เป็นตัวเลข",
            "actual": "~$7.81B",
            "result": "noGuidance",
            "magnitudePct": null
          }
        ],
        "consensus": [
          {
            "fy": "FY2026",
            "revenue": 45.53,
            "eps": -0.02,
            "confidence": "medium",
            "basis": "unknown"
          },
          {
            "fy": "FY2027",
            "revenue": 111.65,
            "eps": 1.83,
            "confidence": "medium",
            "basis": "unknown"
          }
        ],
        "note": "SpaceX ไม่ให้ guidance เป็นตัวเลข (ชี้ทิศทางผ่าน webcast) จึงบันทึกเป็น noGuidance · consensus จาก ~35 นักวิเคราะห์ผ่านแหล่งรวบรวมแหล่งเดียว — ปี 2027 คาดรายได้เพิ่ม ~2.5 เท่าจากสัญญาเช่า compute ที่เซ็นแล้ว (Anthropic/Google) จึงอ่อนไหวต่อการต่ออายุสัญญามาก"
      }
    }
  }
};
  if (typeof window !== "undefined") window.ThesisData = ThesisData;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisData;
})();
