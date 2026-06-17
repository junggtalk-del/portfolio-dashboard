(function () {
  const summaryRoot = document.querySelector("#riskSummaryCards");
  const statusText = document.querySelector("#riskStatus");
  const timestampText = document.querySelector("#riskTimestamp");
  const refreshButton = document.querySelector("#refreshRiskButton");
  const leadershipPanel = document.querySelector("#leadershipPanel");
  const volatilityPanel = document.querySelector("#volatilityPanel");
  const hiddenRiskPanel = document.querySelector("#hiddenRiskPanel");
  const riskFlags = document.querySelector("#riskFlags");
  const actionGuide = document.querySelector("#actionGuide");
  const marketInterpretation = document.querySelector("#marketInterpretation");
  const indicatorGuide = document.querySelector("#indicatorGuide");
  const combinedSignals = document.querySelector("#combinedSignals");

  const EXPLANATIONS = {
    spx: {
      title: "SPX / S&P 500",
      shortLabel: "ภาพรวมตลาดหุ้นสหรัฐ",
      text: "SPX หรือ S&P 500 ใช้ดูภาพรวมตลาดหุ้นสหรัฐ ถ้า SPX ขึ้น แปลว่าตลาดโดยรวมยังแข็งแรง แต่ต้องดูด้วยว่าขึ้นจากหุ้นส่วนใหญ่ หรือถูกแบกโดยหุ้นบางกลุ่ม",
      interpretation: ["SPX ขึ้นพร้อมหลาย sector = ตลาดแข็งแรงกว่า", "SPX ขึ้นแต่ถูกแบกโดย sector เดียว = ต้องระวัง rally แคบ"]
    },
    xlk: {
      title: "XLK",
      shortLabel: "หุ้นเทคโนโลยี",
      text: "XLK คือ ETF กลุ่มหุ้นเทคโนโลยี ใช้ดูว่าหุ้นเทคกำลังนำตลาดหรือไม่ ถ้า XLK ขึ้นแรงกว่า SPX มาก แปลว่าหุ้นเทคกำลังแบกตลาด",
      interpretation: ["XLK ขึ้นมากกว่า SPX เล็กน้อย = tech leadership ปกติ", "XLK ขึ้นมากกว่า SPX มาก = ตลาดพึ่งหุ้นเทคสูง", "XLK ขึ้นแรง แต่ SPX ขึ้นน้อย = rally อาจแคบและเปราะ"]
    },
    spread: {
      title: "XLK - SPX Spread",
      shortLabel: "หุ้นเทคแบกตลาดหรือไม่",
      text: "ส่วนต่างผลตอบแทนระหว่าง XLK กับ SPX ใช้วัดว่าหุ้นเทคกำลังแบกตลาดมากแค่ไหน ถ้า spread กว้างมาก แปลว่าตลาดอาจพึ่งหุ้นเทคมากเกินไป",
      interpretation: ["Spread > +10% = หุ้นเทคเริ่มแบกตลาด", "Spread > +15% = ตลาดพึ่งหุ้นเทคสูง", "Spread > +20% = ตลาดพึ่งหุ้นเทครุนแรงมาก ต้องระวัง concentration risk", "ตัวอย่าง: SPX +6% และ XLK +25% จะได้ spread +19% แปลว่าหุ้นเทคกำลังแบกตลาดอย่างชัดเจน"],
      tooltip: "ส่วนต่าง XLK กับ SPX ใช้วัดว่าหุ้นเทคกำลังแบกตลาดมากแค่ไหน"
    },
    vix: {
      title: "VIX",
      shortLabel: "ความกลัวของตลาดรวม",
      text: "VIX ใช้วัดความกลัวของตลาดโดยรวม หรือความผันผวนที่ตลาดคาดหวังใน S&P 500 ถ้า VIX ต่ำ แปลว่าตลาดยังดูนิ่งหรือไม่กลัวมาก แต่ไม่ได้แปลว่าปลอดภัยเสมอไป",
      interpretation: ["VIX < 15 = ตลาดดูนิ่ง / ความกลัวต่ำ", "VIX 15-20 = ภาวะปกติ", "VIX > 20 = เริ่ม risk-off", "VIX > 30 = ตลาดเครียดสูง", "VIX ต่ำไม่ได้แปลว่าไม่มีความเสี่ยง ถ้า VVIX หรือ VIXEQ เริ่มพุ่ง ต้องระวังความเสี่ยงที่ซ่อนอยู่"],
      tooltip: "VIX ใช้วัดความกลัวของตลาดรวม ถ้าต่ำแปลว่าตลาดยังดูนิ่ง แต่ควรดู VVIX และ VIXEQ ประกอบ"
    },
    vvix: {
      title: "VVIX",
      shortLabel: "ความกลัวว่าความกลัวจะระเบิด",
      text: "VVIX ใช้วัดความผันผวนของ VIX หรือพูดง่าย ๆ คือใช้ดูว่าความกลัวของตลาดมีโอกาสจะระเบิดแรงแค่ไหน ถ้า VVIX สูง แปลว่านักลงทุนเริ่มซื้อประกันความเสี่ยงจาก volatility เพิ่มขึ้น",
      interpretation: ["VVIX > 90 = เริ่มมี demand สำหรับ hedge", "VVIX > 100 = ความต้องการ hedge สูง", "VVIX เพิ่มเร็วใน 5 วัน = นักลงทุนเริ่มป้องกันความเสี่ยงเร็วขึ้น", "ถ้า VIX ยังนิ่งหรือต่ำ แต่ VVIX พุ่ง ให้ระวัง เพราะอาจแปลว่านักลงทุนสถาบันเริ่ม hedge ก่อนที่ตลาดจะผันผวนจริง"],
      tooltip: "VVIX ใช้วัดโอกาสที่ความกลัวจะระเบิด ถ้า VVIX สูงขณะที่ VIX ยังนิ่ง แปลว่านักลงทุนอาจเริ่ม hedge"
    },
    vixeq: {
      title: "VIXEQ",
      shortLabel: "ความกลัวหุ้นรายตัว",
      text: "VIXEQ ใช้วัดความผันผวนหรือความกลัวของหุ้นรายตัวใน S&P 500 ถ้า VIXEQ สูงกว่า VIX แปลว่าหุ้นรายตัวเริ่มมีความเสี่ยงมากกว่าภาพรวมของดัชนี",
      interpretation: ["VIXEQ > VIX = ความเสี่ยงรายตัวสูงกว่าตลาดรวม", "VIXEQ เพิ่มขึ้น = หุ้นรายตัวเริ่มผันผวนมากขึ้น", "VIXEQ สูง แต่ VIX ต่ำ = index อาจดูนิ่ง แต่หุ้นข้างในเริ่มไม่นิ่ง"],
      tooltip: "VIXEQ ใช้วัดความผันผวนของหุ้นรายตัว ถ้าสูงกว่า VIX แปลว่าหุ้นรายตัวเริ่มเสี่ยงกว่าภาพรวมตลาด"
    },
    vixeqSpread: {
      title: "VIXEQ - VIX Spread",
      shortLabel: "ความเสี่ยงรายตัวเทียบกับตลาดรวม",
      text: "ส่วนต่างระหว่าง VIXEQ กับ VIX ใช้วัดว่าความเสี่ยงรายตัวสูงกว่าความเสี่ยงของดัชนีมากแค่ไหน ถ้า spread นี้กว้างขึ้นเรื่อย ๆ ถือว่าไม่ดี เพราะแปลว่าหุ้นรายตัวเริ่มผันผวนมากกว่าที่ดัชนีสะท้อน",
      interpretation: ["Spread เป็นบวก = หุ้นรายตัวเสี่ยงกว่าดัชนี", "Spread กว้างขึ้น = ความเสี่ยงใต้ผิวตลาดเพิ่มขึ้น", "Spread กว้างขึ้นพร้อม VVIX สูง = สัญญาณระวัง"],
      tooltip: "VIXEQ - VIX spread ใช้วัดว่าความเสี่ยงรายตัวสูงกว่าภาพรวมมากแค่ไหน"
    }
  };

  const COMBINED_SIGNAL_GUIDE = [
    {
      key: "hiddenHedge",
      label: "VIX ยังนิ่ง แต่เริ่มมีการ hedge",
      condition: "VIX < 18 และ VVIX > 90",
      text: "ถ้า VIX ยังต่ำหรือนิ่ง แต่ VVIX พุ่งขึ้น แปลว่าตลาดรวมยังดูสงบ แต่มีนักลงทุนเริ่มซื้อประกันความเสี่ยงล่วงหน้า ควรระวัง volatility spike",
      tone: "warning"
    },
    {
      key: "techLed",
      label: "หุ้นเทคแบกตลาด",
      condition: "XLK 1M return - SPX 1M return > 10%",
      text: "ถ้า XLK ขึ้นแรงกว่า SPX มาก แปลว่าหุ้นเทคกำลังแบกตลาด ถ้าตลาดพึ่งหุ้นเทคมากเกินไป rally จะเปราะขึ้น เพราะถ้าหุ้นเทคพัก ตลาดอาจอ่อนแรงเร็ว",
      tone: "warning"
    },
    {
      key: "singleStockRisk",
      label: "ความเสี่ยงรายตัวเพิ่มขึ้น",
      condition: "VIXEQ > VIX และ spread กว้างขึ้นใน 5 วัน",
      text: "ถ้า VIXEQ สูงกว่า VIX และ spread กว้างขึ้น แปลว่าความเสี่ยงรายตัวเริ่มสูงกว่าภาพรวมตลาด ดัชนีอาจดูนิ่ง แต่หุ้นข้างในเริ่มผันผวน",
      tone: "danger"
    },
    {
      key: "fragileMarket",
      label: "ตลาดเริ่มเปราะ",
      condition: "Tech-led rally + VVIX high + VIXEQ spread widening",
      text: "ถ้าหุ้นเทคแบกตลาด ขณะที่ VVIX สูง และ VIXEQ spread กว้างขึ้นพร้อมกัน แปลว่าตลาดเริ่มเปราะ ควรหลีกเลี่ยงการไล่ราคา และพิจารณาลดความเสี่ยงหรือ hedge",
      tone: "danger"
    }
  ];

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function formatNumber(value, digits = 2) {
    if (!isFiniteNumber(value)) return "-";
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatPct(value) {
    if (!isFiniteNumber(value)) return "-";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${formatNumber(number, 2)}%`;
  }

  function riskTone(score) {
    if (score >= 75) return "danger";
    if (score >= 50) return "caution";
    if (score >= 25) return "watch";
    return "normal";
  }

  function infoIcon(text) {
    if (!text) return "";
    return `<button class="info-icon" type="button" title="${text}" aria-label="${text}">i</button>`;
  }

  function card(title, value, note, tone, tooltip) {
    return `
      <article class="risk-card ${tone || ""}">
        <span>${title}${infoIcon(tooltip)}</span>
        <strong>${value}</strong>
        <small>${note || ""}</small>
      </article>
    `;
  }

  function metric(label, value) {
    return `
      <div class="metric-row">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  function interpretation(text) {
    return `<div class="interpretation">${text}</div>`;
  }

  function leadershipText(metrics) {
    const spread = metrics.techLeadershipSpread;
    if (!isFiniteNumber(spread)) return "ยังไม่มีข้อมูลพอสำหรับเทียบ SPX กับ XLK";
    if (spread > 20) return "ตลาดพึ่งหุ้นเทครุนแรงมาก / Extreme tech concentration";
    if (spread > 15) return "ตลาดพึ่งหุ้นเทคสูง / High concentration risk";
    if (spread > 10) return "หุ้นเทคแบกตลาด / Tech-led rally";
    if (spread > 0) return "XLK นำ SPX เล็กน้อย แต่ยังไม่ extreme";
    return "ตลาดไม่ได้ถูกนำโดย XLK อย่างชัดเจน";
  }

  function volatilityText(payload) {
    const m = payload.metrics;
    const parts = [];
    if (payload.vixRegime?.thai) parts.push(`${payload.vixRegime.thai} (${payload.vixRegime.label})`);
    if (m.vvix > 100) parts.push("ความต้องการ hedge สูง");
    else if (m.vvix > 90) parts.push("เริ่มมีการซื้อประกันความเสี่ยง");
    if (m.vvixFiveDayChangePct > 10) parts.push("VVIX เร่งขึ้นเร็ว");
    return parts.length ? parts.join(" · ") : "ยังไม่มีสัญญาณ volatility risk เด่น";
  }

  function hiddenRiskText(metrics) {
    const parts = [];
    if (metrics.vix < 18 && metrics.vvix > 90) parts.push("VIX ยังนิ่ง แต่เริ่มมีการ hedge");
    if (metrics.vixeq > metrics.vix) parts.push("ความผันผวนรายตัวสูงกว่าตลาดรวม");
    if (metrics.vixeqSpreadTrend > 0) parts.push("spread VIXEQ-VIX กว้างขึ้น");
    return parts.length ? parts.join(" · ") : "ยังไม่เห็น hidden risk จาก VVIX/VIXEQ ชัดเจน";
  }

  function combinedSignalState(metrics) {
    const techLed = metrics.techLeadershipSpread > 10;
    const hiddenHedge = metrics.vix < 18 && metrics.vvix > 90;
    const singleStockRisk = metrics.vixeq > metrics.vix && metrics.vixeqSpreadTrend > 0;
    const fragileMarket = techLed && metrics.vvix > 90 && metrics.vixeqSpreadTrend > 0;
    return { techLed, hiddenHedge, singleStockRisk, fragileMarket };
  }

  function currentMarketSummary(payload) {
    const m = payload.metrics || {};
    const states = combinedSignalState(m);
    const sentences = [];
    if (m.vix < 15) sentences.push("ตลาดยังดูนิ่งจาก VIX ที่ต่ำ");
    else if (m.vix >= 15 && m.vix <= 20) sentences.push("VIX อยู่ในภาวะปกติ");
    else if (m.vix > 30) sentences.push("VIX สะท้อนภาวะตลาดเครียดสูง");
    else if (m.vix > 20) sentences.push("VIX เริ่มสะท้อน risk-off");

    if (m.techLeadershipSpread > 20) sentences.push("หุ้นเทคกำลังแบกตลาดรุนแรงมาก ทำให้ rally เปราะขึ้น");
    else if (m.techLeadershipSpread > 15) sentences.push("หุ้นเทคกำลังแบกตลาดอย่างชัดเจน");
    else if (m.techLeadershipSpread > 10) sentences.push("หุ้นเทคเริ่มนำตลาดมากกว่าปกติ");
    else if (isFiniteNumber(m.techLeadershipSpread)) sentences.push("ยังไม่เห็น concentration จาก XLK เทียบ SPX ในระดับรุนแรง");

    if (m.vvix > 100) sentences.push("VVIX สูงมาก สะท้อนความต้องการ hedge ที่สูง");
    else if (m.vvix > 90) sentences.push("VVIX ที่สูงขึ้นสะท้อนว่านักลงทุนเริ่มซื้อประกันความเสี่ยง");
    if (states.hiddenHedge) sentences.push("ถ้า VIX ยังนิ่ง แต่ VVIX พุ่ง ต้องระวัง เพราะนักลงทุนสถาบันอาจเริ่ม hedge แล้ว");

    if (m.vixeq > m.vix) sentences.push("VIXEQ ที่สูงกว่า VIX แปลว่าความเสี่ยงรายตัวเริ่มสูงกว่าภาพรวม");
    if (m.vixeqSpreadTrend > 0) sentences.push("spread VIXEQ-VIX กว้างขึ้น ถือว่าไม่ดี เพราะความเสี่ยงรายตัวเพิ่มขึ้นใต้ผิวตลาด");
    if (states.fragileMarket) sentences.push("หลายสัญญาณเกิดพร้อมกัน ตลาดเริ่มเปราะ ควรระวังการไล่ราคาและพิจารณาลดความเสี่ยงหรือ hedge");

    return sentences.length
      ? sentences.join(" ")
      : "ยังไม่มีข้อมูลพอสำหรับสรุปภาวะตลาดอัตโนมัติ";
  }

  function renderIndicatorGuide() {
    indicatorGuide.innerHTML = Object.values(EXPLANATIONS).map((item) => `
      <article class="guide-card">
        <div>
          <h3>${item.title}</h3>
          <span>${item.shortLabel}</span>
        </div>
        <p>${item.text}</p>
        <ul>
          ${item.interpretation.map((line) => `<li>${line}</li>`).join("")}
        </ul>
      </article>
    `).join("");
  }

  function renderCombinedSignals(metrics) {
    const states = combinedSignalState(metrics || {});
    combinedSignals.innerHTML = COMBINED_SIGNAL_GUIDE.map((signal) => `
      <article class="combined-card ${signal.tone} ${states[signal.key] ? "is-active" : ""}">
        <strong>${signal.label}</strong>
        <span>${signal.condition}</span>
        <p>${signal.text}</p>
        <small>${states[signal.key] ? "Active now" : "Not active now"}</small>
      </article>
    `).join("");
  }

  function renderSummary(payload) {
    const m = payload.metrics || {};
    const risk = payload.risk || { score: 0, level: { label: "Normal", thai: "ปกติ" } };
    summaryRoot.innerHTML = [
      card("Overall Risk Score", String(risk.score ?? "-"), `${risk.level.thai} / ${risk.level.label}`, riskTone(risk.score || 0)),
      card("SPX 1M return", formatPct(m.spxOneMonthReturn), `SPX ${formatNumber(m.spxClose)} · ${m.spxDate || "-"}`, "blue"),
      card("XLK 1M return", formatPct(m.xlkOneMonthReturn), `XLK ${formatNumber(m.xlkClose)} · ${m.xlkDate || "-"}`, "blue"),
      card("XLK - SPX spread", formatPct(m.techLeadershipSpread), "Tech leadership spread", m.techLeadershipSpread > 15 ? "caution" : "blue", EXPLANATIONS.spread.tooltip),
      card("VIX", formatNumber(m.vix), m.vixDate || "-", m.vix > 20 ? "danger" : "normal", EXPLANATIONS.vix.tooltip),
      card("VVIX", formatNumber(m.vvix), `5D ${formatPct(m.vvixFiveDayChangePct)}`, m.vvix > 90 ? "caution" : "normal", EXPLANATIONS.vvix.tooltip),
      card("VIXEQ", formatNumber(m.vixeq), m.vixeqDate || "VIXEQ data source not available", isFiniteNumber(m.vixeq) ? "blue" : "watch", EXPLANATIONS.vixeq.tooltip),
      card("VIXEQ - VIX spread", formatNumber(m.vixeqSpread), `5D trend ${formatNumber(m.vixeqSpreadTrend)}`, m.vixeqSpreadTrend > 0 ? "watch" : "blue", EXPLANATIONS.vixeqSpread.tooltip)
    ].join("");
  }

  function renderPanels(payload) {
    const m = payload.metrics || {};
    leadershipPanel.innerHTML = [
      metric("SPX 1M return", formatPct(m.spxOneMonthReturn)),
      metric("XLK 1M return", formatPct(m.xlkOneMonthReturn)),
      metric("XLK minus SPX spread", formatPct(m.techLeadershipSpread)),
      interpretation(leadershipText(m))
    ].join("");

    volatilityPanel.innerHTML = [
      metric("VIX level", formatNumber(m.vix)),
      metric("VVIX level", formatNumber(m.vvix)),
      metric("VVIX 5-day change", formatPct(m.vvixFiveDayChangePct)),
      interpretation(volatilityText(payload))
    ].join("");

    hiddenRiskPanel.innerHTML = [
      metric("VIX low + VVIX high", m.vix < 18 && m.vvix > 90 ? "Active" : "Not active"),
      metric("VIXEQ level", formatNumber(m.vixeq)),
      metric("VIXEQ - VIX spread", formatNumber(m.vixeqSpread)),
      metric("VIXEQ spread trend 5D", formatNumber(m.vixeqSpreadTrend)),
      interpretation(hiddenRiskText(m))
    ].join("");
  }

  function renderFlags(payload) {
    const flags = payload.flags || [];
    if (!flags.length) {
      riskFlags.innerHTML = `<div class="risk-empty">ยังไม่มี risk flag ที่ active</div>`;
      return;
    }
    riskFlags.innerHTML = flags.map((flag) => `
      <div class="risk-flag ${flag.severity || "watch"}">
        <strong>${flag.thai}</strong>
        <span>${flag.label}</span>
        <small>${flag.detail || ""}</small>
      </div>
    `).join("");
  }

  function renderActionGuide(payload) {
    const active = payload.risk?.level?.label || "Normal";
    const actions = [
      ["Normal", "ปกติ", "No action / ถือแผนเดิมได้"],
      ["Watch", "เฝ้าระวัง", "Monitor closely / ดู breadth และ volatility ต่อ"],
      ["Caution", "ระวัง", "Avoid chasing, rebalance, tighten risk"],
      ["Hedge / Reduce Risk", "ควร hedge หรือลดความเสี่ยง", "Consider hedging or reducing exposure"]
    ];
    actionGuide.innerHTML = actions.map(([label, thai, text]) => `
      <div class="action-card ${label === active ? "is-active" : ""}">
        <strong>${thai}</strong>
        <p>${label}</p>
        <p>${text}</p>
      </div>
    `).join("");
  }

  async function loadRisk() {
    refreshButton.disabled = true;
    statusText.textContent = "กำลังโหลดข้อมูลความเสี่ยงตลาด...";
    timestampText.textContent = "กำลังดึง SPX, XLK, VIX, VVIX และ VIXEQ";
    try {
      const response = await fetch("/api/market-risk", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load market risk data");
      renderSummary(payload);
      marketInterpretation.textContent = currentMarketSummary(payload);
      renderIndicatorGuide();
      renderCombinedSignals(payload.metrics || {});
      renderPanels(payload);
      renderFlags(payload);
      renderActionGuide(payload);
      statusText.textContent = `${payload.risk.level.thai} / ${payload.risk.level.label}`;
      timestampText.textContent = `Updated ${payload.generatedAt} · Flags ${payload.flags.length}`;
      console.log("[market-risk]", {
        score: payload.risk.score,
        level: payload.risk.level.label,
        flags: payload.flags.map((flag) => flag.id),
        sources: payload.series
      });
    } catch (error) {
      statusText.textContent = "โหลดข้อมูล Market Risk ไม่สำเร็จ";
      timestampText.textContent = String(error.message || error);
      summaryRoot.innerHTML = `<div class="risk-empty">Market Risk failed: ${String(error.message || error)}</div>`;
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", loadRisk);
  loadRisk();
})();
