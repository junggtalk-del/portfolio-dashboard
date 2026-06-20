(function () {
  const statusText = document.querySelector("#statusText");
  const sourceText = document.querySelector("#statusSourceText");
  const cardsRoot = document.querySelector("#statusCards");
  const summaryRoot = document.querySelector("#healthSummary");
  const tableRoot = document.querySelector("#assetBreakdownTable");
  const refreshButton = document.querySelector("#refreshStatusButton");

  const state = {
    investmentData: null,
    rows: []
  };

  async function readInvestmentDashboard() {
    const password = sessionStorage.getItem("portfolioPassword") || "open-dashboard";
    const response = await fetch("/api/portfolio", {
      cache: "no-store",
      headers: { "x-portfolio-password": password }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load Investment Dashboard");
    return payload?.data || null;
  }

  function latestQuarter(data) {
    const quarters = data?.quarters || {};
    const key = data?.currentQuarter && quarters[data.currentQuarter]
      ? data.currentQuarter
      : Object.keys(quarters).sort(compareQuarter).pop();
    return key ? quarters[key] : null;
  }

  function compareQuarter(a, b) {
    const [ay, aq] = String(a).split("-Q").map(Number);
    const [by, bq] = String(b).split("-Q").map(Number);
    return ay === by ? aq - bq : ay - by;
  }

  function investmentRows(data) {
    const quarter = latestQuarter(data);
    return (quarter?.assets || []).map((asset, index) => normalizeInvestmentAsset(asset, index)).filter(Boolean);
  }

  function normalizeInvestmentAsset(asset, index) {
    const marketValue = firstNumber(asset?.manualValue, asset?.value, asset?.snapshotValue);
    if (!Number.isFinite(marketValue) || marketValue <= 0) return null;
    return {
      id: asset?.id || `dashboard-row-${index}`,
      assetName: asset?.name || asset?.type || "ไม่ระบุชื่อสินทรัพย์",
      dashboardType: asset?.type || "",
      marketValue,
      manualValue: firstNumber(asset?.manualValue),
      snapshotValue: firstNumber(asset?.snapshotValue),
      investedPercent: firstNumber(asset?.investedPercent),
      createdAt: asset?.createdAt || null,
      updatedAt: asset?.updatedAt || null
    };
  }

  function calculatePortfolio(rows) {
    const total = rows.reduce((sum, row) => sum + row.marketValue, 0);
    const realRows = rows
      .map((row) => ({
        ...row,
        portfolioWeight: total > 0 ? (row.marketValue / total) * 100 : 0
      }))
      .sort((a, b) => b.portfolioWeight - a.portfolioWeight);
    return {
      rows: realRows,
      total,
      largest: realRows[0] || null,
      top5Weight: realRows.slice(0, 5).reduce((sum, row) => sum + row.portfolioWeight, 0)
    };
  }

  async function loadStatus() {
    statusText.textContent = "กำลังโหลดข้อมูลจาก Investment Dashboard...";
    sourceText.textContent = "Source: Investment Dashboard only";
    state.investmentData = await readInvestmentDashboard();
    state.rows = investmentRows(state.investmentData);
    render();
  }

  function render() {
    if (!state.investmentData && !state.rows.length) {
      statusText.textContent = "ไม่พบข้อมูลจาก Investment Dashboard";
      sourceText.textContent = "Source: Investment Dashboard only";
      summaryRoot.innerHTML = '<div class="empty-box">กรุณาเพิ่มข้อมูลใน Dashboard พอร์ตก่อน</div>';
      cardsRoot.innerHTML = "";
      tableRoot.innerHTML = "";
      return;
    }
    const result = calculatePortfolio(state.rows);
    statusText.textContent = `Portfolio Status พร้อมแล้ว ${result.rows.length} รายการ`;
    sourceText.textContent = "Source: Investment Dashboard only · ไม่มีการ map symbol, signal, exposure หรือ Underlying Holdings";
    renderHealthSummary(result);
    renderCards(result);
    renderTable(result);
  }

  function renderCards(result) {
    cardsRoot.innerHTML = [
      metric("Total Portfolio Value", "มูลค่าพอร์ตรวม", formatMoney(result.total)),
      metric("Number of Assets", "จำนวนสินทรัพย์", String(result.rows.length)),
      metric("Largest Asset", "สินทรัพย์ใหญ่สุด", result.largest ? `${result.largest.assetName} · ${result.largest.portfolioWeight.toFixed(1)}%` : "-"),
      metric("Top 5 Weight", "น้ำหนัก Top 5", `${result.top5Weight.toFixed(1)}%`)
    ].join("");
  }

  function renderHealthSummary(result) {
    if (!result.total) {
      summaryRoot.textContent = "ยังไม่มีข้อมูลมูลค่าพอร์ตจาก Dashboard จึงยังสรุปสถานะพอร์ตไม่ได้";
      return;
    }
    summaryRoot.textContent = `พอร์ตปัจจุบันมีมูลค่ารวม ${formatMoney(result.total)} จากข้อมูลที่บันทึกใน Investment Dashboard โดยตรง จำนวน ${result.rows.length} รายการ รายการที่ใหญ่ที่สุดคือ ${result.largest?.assetName || "-"} คิดเป็น ${result.largest ? result.largest.portfolioWeight.toFixed(1) : "0.0"}% ของพอร์ต`;
  }

  function renderTable(result) {
    if (!result.rows.length) {
      tableRoot.innerHTML = '<div class="empty-box">ยังไม่มีรายการจาก Dashboard</div>';
      return;
    }
    tableRoot.innerHTML = `
      <table class="status-table">
        <thead>
          <tr>
            <th>ชื่อสินทรัพย์</th>
            <th>มูลค่าปัจจุบัน</th>
            <th>น้ำหนักในพอร์ต</th>
            <th>สัดส่วนลงทุนจริง</th>
            <th>ข้อมูลจาก Dashboard</th>
          </tr>
        </thead>
        <tbody>
          ${result.rows.map(renderTableRow).join("")}
        </tbody>
      </table>`;
  }

  function renderTableRow(row) {
    return `
      <tr class="status-main-row">
        <td><strong>${escapeHtml(row.assetName)}</strong></td>
        <td>${formatMoney(row.marketValue)}</td>
        <td><strong>${row.portfolioWeight.toFixed(1)}%</strong></td>
        <td>${formatPercent(row.investedPercent)}</td>
        <td>${escapeHtml(dashboardValueNote(row))}</td>
      </tr>`;
  }

  function dashboardValueNote(row) {
    const source = Number.isFinite(row.manualValue) ? "manualValue" : Number.isFinite(row.snapshotValue) ? "snapshotValue" : "value";
    const updated = row.updatedAt || row.createdAt;
    return updated ? `${source} · ${formatDate(updated)}` : source;
  }

  function metric(label, thai, value) {
    return `<article class="metric-card"><span>${escapeHtml(label)}</span><small>${escapeHtml(thai)}</small><strong>${escapeHtml(value)}</strong></article>`;
  }

  function firstNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(number);
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(number)}%`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("th-TH");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  refreshButton.addEventListener("click", () => {
    loadStatus().catch((error) => {
      statusText.textContent = error?.message || "โหลด Portfolio Status ไม่สำเร็จ";
    });
  });

  loadStatus().catch((error) => {
    statusText.textContent = error?.message || "โหลด Portfolio Status ไม่สำเร็จ";
    sourceText.textContent = "Source: Investment Dashboard only";
  });
})();
