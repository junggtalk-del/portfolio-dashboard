# Bitcoin Long-term On-chain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** เพิ่ม 6 indicators ระยะยาว + Long-term Signal 0–100 + 5 คำถาม + Cost Basis + Historical/backtest แบบ point-in-time เข้า On-chain Deep Dive เดิมของ /bitcoin-monitor
**Architecture:** 3 ไฟล์ใหม่ (ข้อมูลหลายรอบ · เอนจินคะแนน pure · panel HTML) + ต่อ BGeometrics endpoint ใหม่ใน `btc-onchain-live.js` + จุดต่อเล็ก ๆ ใน `bitcoin-monitor-page.js`
**Tech:** browser JS (ไฟล์ใหม่ ES5) · Node vm tests `scripts/*-test.js` · Chrome CDP probe
**Spec:** `docs/superpowers/specs/2026-11-26-btc-lt-onchain-design.md`

## Global Constraints
- ไฟล์ใหม่ใน `public/` = ES5 (ไม่มี let/const/arrow/template literal) · ข้อความ UI ภาษาไทย (ชื่อ indicator/สถานะเป็นอังกฤษได้) · ไม่มีคำแนะนำซื้อ/ขาย
- **ห้ามเรียก bitcoin-data.com จริงเด็ดขาด** (โควตา 15/วันของ IP ผู้ใช้) · Coin Metrics / Blockchain.com เรียกจริงได้เฉพาะเพื่อตรวจสูตร/ปรับเกณฑ์ (ไม่กี่ครั้ง) — เทสต์ใช้ fixture เท่านั้น
- ไม่มีข้อมูลปลอมในหน้าเว็บ · ทุกตัวเลขมี Source + Last Updated · ไม่มีข้อมูล = "ไม่มีข้อมูล" (Data Unavailable) ไม่ใช่ 0
- `Number(null)` = 0 — ห้ามใช้แปลงค่าจากภายนอกโดยไม่เช็ค null/"" ก่อน
- series เก็บ IndexedDB ผ่าน `window.BigCache` (get/set คืน Promise) — ไม่ใช่ localStorage
- รันเฉพาะเทสต์ของไฟล์ตัวเอง (agent อื่นกำลังแก้ไฟล์อื่นพร้อมกัน) · ห้าม commit · ห้ามแก้ไฟล์นอก task ตัวเอง
- **Series** = `[["YYYY-MM-DD", number], …]` เรียงวันเก่า→ใหม่ วันละแถว

## Review Focus
1. ข้อมูลบางตัวหาย (BGeometrics 429 / Coin Metrics ล่ม) → คะแนนคิดจากกลุ่มที่มี + บอกว่าขาดอะไร · ไม่ถึง 2 กลุ่ม = ไม่มีคะแนน
2. ค่าจาก endpoint ใหม่ผิดหน่วย/ชื่อฟิลด์ไม่ตรง → plausibility ตัดทิ้ง เป็น Data Unavailable
3. backtest ไม่แอบใช้ข้อมูลอนาคต (std สะสม · เลื่อนวันตามความช้า · ผลตอบแทนเฉพาะที่ครบช่วง)
4. ของเดิม 7 การ์ด + Buy Zone + Intelligence ทำงานเหมือนเดิม
5. ช่วงเวลา "ทั้งหมด" กับ series 15 ปี ไม่ทำหน้าเว็บช้า (ย่อจุดก่อนวาด)

---

### Task 1 — ชั้นข้อมูล (agent "data")
**Files:** modify `public/btc-onchain-live.js` · modify `scripts/btc-deepdive-test.js` · create `public/btc-lt-history.js` · create `scripts/btc-lt-history-test.js`

**1a `btc-onchain-live.js`:**
- METRICS เพิ่ม `lthRealizedPrice` (ep `lth-realized-price`, pick `/realized|price/i`) · `lthSopr` (`lth-sopr`, `/sopr/i`) · `activeInvestorPrice` (`true-market-mean`, `/mean|price/i`)
- ~~`lthSupply` เปลี่ยนเป็นส่วนเดียว ep `long-term-hodler-supply-btc`~~ — **ยกเลิกหลัง final review:** คง `supply-profit-lth` + `supply-loss-lth` (ตรวจของจริงแล้ว)
- ลำดับ: mvrv-zscore · realized-price · nupl · nup · sopr · ssr · supply-profit-lth · supply-loss-lth · lth-realized-price · lth-sopr · true-market-mean = **11 ครั้ง/วัน** · รอบละไม่เกิน 10 (`RUN_MAX_REQ`) ที่เหลือไปรอบถัดไป
- เพิ่ม `PLAUSIBLE` (export) = { mvrvZScore:[-5,25], realizedPrice:[1e3,1e6], nupl:[-1,1], rup:[0,1.5], sopr:[0.3,3], ssr:[0,500], lthSupply:[5e6,2.1e7], lthRealizedPrice:[1e3,1e6], lthSopr:[0.1,100], activeInvestorPrice:[1e3,1e6] } — แถวนอกช่วงถูกทิ้งตอน parse · แถวล่าสุดหลังทิ้งคือค่าล่าสุด · ไม่เหลือแถว = ไม่มีค่า
- อัปเดตเทสต์เดิม (ลำดับ 10 ครั้ง · lthSupply ส่วนเดียว) + เทสต์ใหม่: 3 metric ใหม่ · ค่าผิดช่วงถูกทิ้ง · ข้อมูลจำลองระบุชัดในเทสต์

**1b `btc-lt-history.js` → `window.BtcLtHistory` (+ module.exports):**
- `CM_URL` = `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur,CapMrktCurUSD,PriceUSD&frequency=1d&page_size=10000&sort=time`
- `BC_URL(chart)` = `https://api.blockchain.info/charts/` + chart + `?timespan=all&sampled=false&format=json&cors=true` (chart: `miners-revenue`, `transaction-fees-usd`)
- `parseCoinMetrics(json) → { price, mvrv, marketCap }` (ค่าเป็นสตริง · ว่าง/ไม่ใช่ตัวเลข/≤0 = ข้าม)
- `deriveCm(cm) → { price, mvrv, realizedPrice, mvrvZ }` — realizedPrice = price ÷ mvrv · **mvrvZ point-in-time** = (mcap − mcap/mvrv) ÷ population std ของ mcap ทุกแถว ≤ วันนั้น (Welford สะสม) · เริ่มออกค่าเมื่อมี ≥ 365 แถว
- `parseBlockchain(json) → Series` — `json.values[{x: unix วินาที, y}]` → วัน UTC (แถวท้ายของวันชนะ)
- `puell(revenue, fees) → Series` — issuance = revenue − fees (วันเดียวกัน มีทั้งคู่ > 0) · puell(t) = issuance(t) ÷ ค่าเฉลี่ย issuance ของวันที่อยู่ใน [t−364, t] (นับตามวันที่ ไม่ใช่จำนวนแถว) · ออกค่าเมื่อหน้าต่างมี ≥ 300 ค่า
- `load({force}) → Promise<State>` · `get() → State` · `EVENT = "btc-lt-history"` (dispatch หลังโหลด) · `CACHE_KEY = "btc_lt_hist_v1"` (BigCache)
  - State = `{ at, series: { price, mvrv, realizedPrice, mvrvZ, puell }, sources: { coinMetrics: { at, ok, error }, blockchain: { at, ok, error } }, error, loading }`
  - ดึงวันละครั้ง (วัน UTC) · ล้ม = คงข้อมูลเดิม + error · Coin Metrics กับ Blockchain.com แยกกัน (อันหนึ่งล้มอีกอันยังใช้ได้)
- เทสต์: parse/derive/puell กับ fixture (คำนวณมือเทียบ) · Z ไม่ใช้ข้อมูลอนาคต (ต่อข้อมูลอนาคตแล้วค่าวันเก่าไม่เปลี่ยน) · cache วันเดียวกันไม่ยิงซ้ำ · ล้มแล้วคงข้อมูลเดิม · ES5
- ตรวจสูตรกับข้อมูลจริงครั้งเดียว (Coin Metrics + Blockchain.com) แล้วรายงานค่าล่าสุด + ช่วงวันที่ได้

### Task 2 — เอนจินคะแนน (agent "engine")
**Files:** create `public/btc-lt-signal.js` (→ `window.BtcLtSignal` + module.exports, pure: ไม่มี fetch/DOM/storage) · create `scripts/btc-lt-signal-test.js`
- `WEIGHTS = { valuation: 40, lth: 35, miner: 25 }`
- `STATES` = [{key:"strong",min:80,en:"Strong Accumulation",th:"น่าสะสมมาก"}, {key:"accum",min:65,en:"Accumulation",th:"น่าสะสม"}, {key:"neutral",min:45,en:"Neutral",th:"กลาง ๆ"}, {key:"risk",min:30,en:"Distribution Risk",th:"เสี่ยงช่วงแจกของ"}, {key:"hot",min:0,en:"Overheated / High Risk",th:"ร้อนแรง / เสี่ยงสูง"}]
- `ANCHORS` (เส้นตรงต่อจุด · ปลายนอกช่วง = ค่าปลาย) เริ่มต้น — ตรวจ/ปรับกับข้อมูลหลายรอบจริง (Coin Metrics, Blockchain.com) แล้วจดหลักฐานในคอมเมนต์:
  mvrvZ [[-0.5,100],[0,95],[1,75],[2,55],[3.5,30],[5,12],[7,0]] · lthCostRatio (ราคา÷LTH RP) [[0.8,100],[1,90],[1.5,70],[2.5,45],[3.5,20],[5,0]] · aipRatio (ราคา÷Active Investor) [[0.7,100],[0.9,85],[1.1,60],[1.5,35],[2,15],[2.6,0]] · lthSopr7 [[0.8,100],[1,85],[1.5,65],[3,45],[6,20],[10,0]] · lthNetPct (% เปลี่ยน LTH supply 30 วัน) [[-3,10],[-1.5,30],[0,50],[1.5,75],[3,95]] · puell [[0.4,100],[0.6,85],[1,60],[1.5,40],[2.5,20],[4,0]]
- `subScore(key, value) → number|null` (0–100 ปัดทศนิยม 1)
- `inputsAt(seriesMap, date, opts) → Inputs`
  - seriesMap: `{ price, mvrvZ, lthRealizedPrice, activeInvestorPrice, lthSopr, lthSupply, puell }` (ตัวไหนไม่มีก็ได้)
  - opts: `{ lags: { lthRealizedPrice:7, activeInvestorPrice:7, lthSopr:7, lthSupply:7, mvrvZ:1, puell:1, price:0 }, maxAgeDays: 21, livePrice }` — ค่าของ key ณ date = แถวล่าสุดที่วันที่ ≤ date − lag · แถวนั้นเก่ากว่า maxAgeDays จาก date − lag = ไม่มีค่า · livePrice (ถ้ามี) ใช้แทนราคา
  - Inputs = `{ date, price, mvrvZ, lthCostRatio, aipRatio, lthSopr7, lthNetPct, puell, asOf: { [key]: "YYYY-MM-DD" } }` · lthSopr7 = เฉลี่ย 7 แถวล่าสุด ≤ cutoff · lthNetPct = (supply(cutoff) − supply(ณ cutoff−30 วัน)) ÷ supply(cutoff−30) × 100
- `score(inputs) → Result` = `{ total, state, families: { valuation|lth|miner: { score, weight, members: [{ key, label, value, score, zone, reason }] } }, coverage: { families, missing: [] }, reasons: [ไทย], unavailable }` — family = เฉลี่ยสมาชิกที่มีค่า · total = Σw·s ÷ Σw ของกลุ่มที่มีคะแนน (ปัดจำนวนเต็ม) · < 2 กลุ่ม → total null, unavailable true
- `trend(seriesMap, date, days, opts) → { now, then, delta }` (then = score ณ date − days ด้วยกติกาเดียวกัน)
- `scoreSeries(seriesMap, { from, to, mode: "full"|"core", opts }) → [[date, total, stateKey], …]` · core = กลุ่มมูลค่าใช้ mvrvZ อย่างเดียว + นักขุด, ไม่มีกลุ่ม LTH · ข้ามวันที่ไม่มีคะแนน
- `backtest(rows, priceSeries, { horizons: [180, 365] }) → { byState: { key: { days, episodes, h180: { n, median, posPct, medianMaxDD }, h365 } }, from, to, note }` — ผลตอบแทน = ราคาวันแรก ≥ d+h ÷ ราคา d − 1 (เฉพาะที่ครบช่วง) · maxDD = ต่ำสุดใน (d, d+h] ÷ ราคา d − 1 · episodes = ช่วงต่อเนื่องของสถานะเดียวกัน (ห่าง ≤ 7 วันนับรวม) · note ไทย: หน้าต่างซ้อนกัน + เกณฑ์ in-sample
- `HALVINGS = ["2012-11-28","2016-07-09","2020-05-11","2024-04-20"]` · `cycleMarkers(priceSeries) → [{ date, type: "top"|"bottom", price, provisional }]` — ต่อรอบ halving: top = ปิดสูงสุดในรอบ · bottom = ปิดต่ำสุดหลัง top ในรอบเดียวกัน · รอบปัจจุบัน provisional
- `answers(ctx) → 5 × { id, q, a, tone: "green"|"gray"|"amber"|"red", evidence }` — ctx `{ inputs, result, valuationZone: { key, thai }|null, intelCycle: string|null, priceSeries, today }` · คำถาม: เหนือ/ใต้ต้นทุน LTH · LTH สะสม/ขาย · LTH ขายกำไร/ขาดทุน · ถูก/แพง · ช่วงไหนของวัฏจักร (+ วันนับจาก halving + % ห่างจากยอด) · ข้อมูลขาด = "ข้อมูลไม่พอ" สีเทา
- เทสต์: anchors ตรงจุด/ระหว่างจุด · total/สถานะที่ขอบ · ขาดกลุ่ม · lag + maxAge · trend · backtest มือคำนวณ · ไม่มี look-ahead · cycleMarkers กับราคาจริงหลายรอบ (fixture ย่อ) · answers ทุกทาง · ES5

### Task 3 — Panel UI (agent "panel")
**Files:** create `public/btc-lt-panel.js` (→ `window.BtcLtPanel`, ES5) · create `public/btc-lt-panel.css` · create `scripts/btc-lt-panel-test.js`
**Consumes:** Task 2 `BtcLtSignal.*` (ตามสัญญาข้างบน) · Task 1 states `BtcOnchainLive.get()` (`{ metrics, series, fetchedAt, error, retryAt, loading }`, series keys `mvrvZScore, realizedPrice, nupl, rup, sopr, ssr, lthSupply, lthRealizedPrice, lthSopr, activeInvestorPrice`) และ `BtcLtHistory.get()`
**Produces:**
- `model({ onchain, history, livePrice, valuationZone, intelCycle, today }) → Model` — seriesMap: lthRealizedPrice/activeInvestorPrice/lthSopr/lthSupply จาก onchain.series · price/mvrvZ/puell จาก history.series · Model = `{ signal: Result, trend, answers, cost: { price, rows: [{ key, label, value, pct, asOf, source }] }, hist: { core: { rows, backtest }, full: { rows, backtest }, markers }, sources: [{ name, at, ok, note }] }`
- `html(model, ui) → string` · ui = `{ range: 365|730|1461|"all", view: "price"|"score"|"mvrvZ"|"puell"|"lthSopr"|"lthSupply", showPrice: bool }`
- `wire(rootEl, onChange)` — ปุ่มช่วงเวลา/มุมมอง/ราคา → `onChange(ui)` (เรียกซ้ำได้ · ไม่ผูก listener ซ้ำ)
**เนื้อหา (ใน Deep Dive, ตามสไตล์การ์ดแก้ว `gc-*` + `mc-*` เดิม):**
1. Long-term Signal: คะแนนใหญ่ + ชิปสถานะ 5 สี + Δ 30 วัน (▲▼) + แถบ 3 กลุ่ม (น้ำหนัก) + แถวรายตัว (ค่า · โซน · คะแนน · เหตุผล) + ความครอบคลุม + "ไม่ใช่การทำนายราคา"
2. 5 คำถาม (การ์ดเล็ก 5 ใบ)
3. Cost Basis: กราฟราคา + Realized + Active Investor + LTH Realized (log scale) + ชิป % ส่วนต่าง
4. Historical: ปุ่มมุมมอง + ช่วง (1Y/2Y/4Y/ทั้งหมด) + ราคาซ้อน + จุดก้น/ยอด + ตารางความแม่นยำ (สัญญาณแกนหลายรอบ + สัญญาณเต็ม ~4 ปี + หมายเหตุ)
5. แถวแหล่งข้อมูล: ชื่อ · อัปเดตล่าสุด · สถานะ · "ไม่มีข้อมูล" ตามจริง
- กราฟ SVG เอง (ไม่มีไลบรารี) · ย่อจุด ≤ 600 ต่อเส้นก่อนวาด · light/dark ใช้ token เดิม · มือถือ 390px ไม่มีสกรอลล์แนวนอนทั้งหน้า · ไม่มี ฿ ใน title/aria
- เทสต์: model จาก stub (BtcLtSignal จริง ถ้ามีไฟล์แล้ว ไม่มีก็ stub ตามสัญญา) · html ครบ 5 ส่วน · Data Unavailable · ปุ่ม/ช่วงเวลา · ES5 · ไม่มีคำแนะนำซื้อ/ขาย

### Task 4 — ต่อเข้าหน้าเว็บ (controller)
`bitcoin-monitor-page.js`: Deep Dive แทรก panel บนสุด · DD_CARDS เพิ่ม LTH-SOPR + Puell (series จาก BtcLtHistory) · LTH Supply บอก Net Position 30 วัน · โหลด BtcLtHistory + re-render ตาม event · `bitcoin-monitor.html` สคริปต์/CSS ใหม่ + bump เวอร์ชัน · เทสต์ทั้งชุด · Chrome probe (ดัก BGeometrics/Coin Metrics/Blockchain.com ด้วยข้อมูลจำลองที่ระบุชัด) · 390px

### Task 5 — final review (opus) → แก้ → รายงานผู้ใช้
