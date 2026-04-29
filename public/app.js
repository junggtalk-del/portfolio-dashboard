const TYPE_LABELS = {
  bitcoin: "Bitcoin",
  "foreign-stock": "หุ้นต่างประเทศ",
  "thai-stock": "หุ้นไทย",
  "provident-fund": "เงินสำรองเลี้ยงชีพ",
  "rmf-jang": "RMF-จัง",
  "rmf-tum": "RMF-ตุ๋ม",
  cash: "เงินสด",
  custom: "อื่นๆ"
};

const CHART_COLORS = ["#0f8b8d", "#c8902d", "#17324d", "#12805c", "#9b5de5", "#ef476f", "#3a86ff", "#6c778c"];

const state = {
  data: emptyData(),
  editingId: null,
  activeView: "overview",
  saving: false,
  hydrating: true,
  lastUpdated: null
};

const elements = {
  quarterInput: document.querySelector("#quarterInput"),
  newQuarterYearInput: document.querySelector("#newQuarterYearInput"),
  newQuarterNumberInput: document.querySelector("#newQuarterNumberInput"),
  newQuarterButton: document.querySelector("#newQuarterButton"),
  saveSnapshotButton: document.querySelector("#saveSnapshotButton"),
  quarterStatus: document.querySelector("#quarterStatus"),
  form: document.querySelector("#assetForm"),
  formTitle: document.querySelector("#formTitle"),
  submitButton: document.querySelector("#submitButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  typeInput: document.querySelector("#typeInput"),
  nameInput: document.querySelector("#nameInput"),
  valueInput: document.querySelector("#valueInput"),
  investedPercentInput: document.querySelector("#investedPercentInput"),
  investedPercentField: document.querySelector(".invested-percent-field"),
  rows: document.querySelector("#assetRows"),
  emptyState: document.querySelector("#emptyState"),
  refreshButton: document.querySelector("#refreshButton"),
  statusText: document.querySelector("#statusText"),
  totalWealth: document.querySelector("#totalWealth"),
  investedValue: document.querySelector("#investedValue"),
  investedPercent: document.querySelector("#investedPercent"),
  cashValue: document.querySelector("#cashValue"),
  cashPercent: document.querySelector("#cashPercent"),
  quarterGrowth: document.querySelector("#quarterGrowth"),
  quarterGrowthNote: document.querySelector("#quarterGrowthNote"),
  lastUpdated: document.querySelector("#lastUpdated"),
  panelSubtitle: document.querySelector("#panelSubtitle"),
  currencyNote: document.querySelector("#currencyNote"),
  allocationInvested: document.querySelector("#allocationInvested"),
  allocationCash: document.querySelector("#allocationCash"),
  allocationChart: document.querySelector("#allocationChart"),
  chartLegend: document.querySelector("#chartLegend"),
  pieSubtitle: document.querySelector("#pieSubtitle"),
  quarterRows: document.querySelector("#quarterRows"),
  assetGrowthRows: document.querySelector("#assetGrowthRows"),
  tabButtons: document.querySelectorAll(".tab-button"),
  viewPanels: document.querySelectorAll(".view-panel")
};

document.body.classList.add("is-unlocked");

function currentQuarterKey(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function emptyData() {
  const key = currentQuarterKey();
  return { currentQuarter: key, quarters: { [key]: { key, assets: [], savedAt: null } } };
}

function currentQuarter() {
  const key = state.data.currentQuarter || currentQuarterKey();
  if (!state.data.quarters[key]) state.data.quarters[key] = { key, assets: [], savedAt: null };
  return state.data.quarters[key];
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(text.slice(0, 180) || `Request failed with status ${response.status}`);
  }
}

async function loadRemoteData() {
  state.hydrating = true;
  elements.statusText.textContent = "กำลังโหลดข้อมูลจาก database...";
  try {
    const response = await fetch("/api/portfolio", { cache: "no-store" });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Unable to load portfolio");
    if (payload.data?.quarters && Object.keys(payload.data.quarters).length) state.data = payload.data;
    state.lastUpdated = new Date();
    elements.statusText.textContent = "โหลดข้อมูลจาก database แล้ว";
  } catch (error) {
    elements.statusText.textContent = `โหลดจาก database ไม่สำเร็จ: ${error.message}`;
  } finally {
    state.hydrating = false;
    render();
  }
}

async function persistRemoteData() {
  if (state.hydrating || state.saving) return;
  state.saving = true;
  elements.statusText.textContent = "กำลังบันทึกลง database...";
  try {
    const response = await fetch("/api/portfolio", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: state.data })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Unable to save portfolio");
    state.lastUpdated = new Date();
    elements.statusText.textContent = "บันทึกลง database แล้ว";
  } catch (error) {
    elements.statusText.textContent = `บันทึกไม่สำเร็จ: ${error.message}`;
  } finally {
    state.saving = false;
    renderSummary();
  }
}

function saveData() {
  persistRemoteData();
}

function compareQuarter(a, b) {
  const [ay, aq] = a.split("-Q").map(Number);
  const [by, bq] = b.split("-Q").map(Number);
  return ay === by ? aq - bq : ay - by;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

function formatPercent(value, signed = false) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function assetGrossValue(asset, options = {}) {
  if (options.useSnapshot && Number.isFinite(asset.snapshotValue)) return asset.snapshotValue;
  return Number(asset.manualValue) || 0;
}

function getTotals(assets = currentQuarter().assets, options = {}) {
  return assets.reduce((sum, asset) => {
    const gross = assetGrossValue(asset, options);
    const investedPercent = asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 0, 0, 100);
    const invested = asset.type === "cash" ? 0 : gross * (investedPercent / 100);
    const cash = asset.type === "cash" ? gross : gross - invested;
    sum.wealth += gross;
    sum.invested += invested;
    sum.cash += cash;
    return sum;
  }, { wealth: 0, invested: 0, cash: 0 });
}

function assetMetrics(asset, totalWealth, options = {}) {
  const gross = assetGrossValue(asset, options);
  const investedPercent = asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 0, 0, 100);
  const invested = asset.type === "cash" ? 0 : gross * (investedPercent / 100);
  const cash = asset.type === "cash" ? gross : gross - invested;
  return { gross, portfolioPercent: totalWealth > 0 ? (gross / totalWealth) * 100 : 0, investedPercent, invested, cash };
}

function growthPercent(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function assetKey(asset) {
  return `${asset.type}::${asset.name || TYPE_LABELS[asset.type]}`;
}

function renderQuarterOptions() {
  elements.quarterInput.innerHTML = "";
  for (const key of Object.keys(state.data.quarters).sort(compareQuarter).reverse()) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    elements.quarterInput.appendChild(option);
  }
  elements.quarterInput.value = state.data.currentQuarter;
}

function renderSummary() {
  const totals = getTotals();
  const investedPercent = totals.wealth > 0 ? (totals.invested / totals.wealth) * 100 : 0;
  const cashPercent = totals.wealth > 0 ? (totals.cash / totals.wealth) * 100 : 0;
  const previousQuarter = getPreviousSavedQuarter(state.data.currentQuarter);
  const previousTotals = previousQuarter ? getTotals(previousQuarter.assets, { useSnapshot: true }) : null;
  const qGrowth = previousTotals ? growthPercent(totals.wealth, previousTotals.wealth) : null;
  const quarter = currentQuarter();

  elements.totalWealth.textContent = formatMoney(totals.wealth);
  elements.investedValue.textContent = formatMoney(totals.invested);
  elements.investedPercent.textContent = `${formatPercent(investedPercent)} ของพอร์ต`;
  elements.cashValue.textContent = formatMoney(totals.cash);
  elements.cashPercent.textContent = `${formatPercent(cashPercent)} ของพอร์ต`;
  elements.quarterGrowth.textContent = qGrowth === null ? "0.00%" : formatPercent(qGrowth, true);
  elements.quarterGrowth.className = qGrowth === null || qGrowth >= 0 ? "positive" : "negative";
  elements.quarterGrowthNote.textContent = previousQuarter ? `เทียบกับ ${previousQuarter.key}` : "ยังไม่มีไตรมาสก่อนหน้า";
  elements.currencyNote.textContent = "THB";
  elements.allocationInvested.style.width = `${investedPercent}%`;
  elements.allocationCash.style.width = `${cashPercent}%`;
  elements.quarterStatus.textContent = quarter.savedAt ? `บันทึก ${quarter.key} ล่าสุด ${new Date(quarter.savedAt).toLocaleString("th-TH")}` : `${quarter.key} ยังไม่เคยบันทึก snapshot`;
  elements.lastUpdated.textContent = state.lastUpdated ? `อัปเดตล่าสุด ${state.lastUpdated.toLocaleTimeString("th-TH")}` : `ข้อมูล ${state.data.currentQuarter}`;
}

function renderRows() {
  const assets = currentQuarter().assets;
  const totals = getTotals();
  elements.rows.innerHTML = "";
  elements.emptyState.classList.toggle("is-visible", assets.length === 0);
  elements.panelSubtitle.textContent = assets.length ? `ติดตาม ${assets.length} รายการใน ${state.data.currentQuarter}` : "เพิ่มรายการเพื่อเริ่มดูสัดส่วนพอร์ต";

  for (const asset of assets) {
    const metrics = assetMetrics(asset, totals.wealth);
    const name = asset.name || TYPE_LABELS[asset.type] || "Asset";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><div class="asset-name"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(TYPE_LABELS[asset.type] || asset.type)}</span></div></td>
      <td>${formatMoney(metrics.gross)}</td>
      <td>${formatPercent(metrics.portfolioPercent)}</td>
      <td>${asset.type === "cash" ? "-" : formatPercent(metrics.investedPercent)}</td>
      <td>${formatMoney(metrics.invested)}</td>
      <td>${formatMoney(metrics.cash)}</td>
      <td class="row-actions"><button class="icon-button edit-button" type="button" data-edit-id="${asset.id}">แก้ไข</button><button class="delete-button" type="button" data-delete-id="${asset.id}">×</button></td>`;
    elements.rows.appendChild(row);
  }
}

function renderPieChart() {
  const assets = currentQuarter().assets;
  const totals = getTotals();
  const canvas = elements.allocationChart;
  const ctx = canvas.getContext("2d");
  const center = canvas.width / 2;
  const radius = center - 18;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  elements.chartLegend.innerHTML = "";
  elements.pieSubtitle.textContent = `${state.data.currentQuarter} · ${formatMoney(totals.wealth)}`;
  const slices = assets.map((asset, index) => ({ asset, value: assetGrossValue(asset), color: CHART_COLORS[index % CHART_COLORS.length] })).filter((slice) => slice.value > 0);
  if (!slices.length || totals.wealth <= 0) {
    ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.fillStyle = "#e7edf5"; ctx.fill(); drawDonutHole(ctx, center, radius);
    renderLegendItem("ยังไม่มีข้อมูล", 0, "#dfe6f1");
    return;
  }
  let start = -Math.PI / 2;
  for (const slice of slices) {
    const angle = (slice.value / totals.wealth) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(center, center); ctx.arc(center, center, radius, start, start + angle); ctx.closePath(); ctx.fillStyle = slice.color; ctx.fill();
    start += angle;
    renderLegendItem(slice.asset.name || TYPE_LABELS[slice.asset.type], (slice.value / totals.wealth) * 100, slice.color);
  }
  drawDonutHole(ctx, center, radius);
}

function drawDonutHole(ctx, center, radius) {
  ctx.beginPath(); ctx.arc(center, center, radius * 0.58, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
}

function renderLegendItem(label, percent, color) {
  const item = document.createElement("div");
  item.className = "legend-item";
  item.innerHTML = `<span class="legend-color" style="background:${color}"></span><span>${escapeHtml(label)}</span><strong>${formatPercent(percent)}</strong>`;
  elements.chartLegend.appendChild(item);
}

function renderGrowthTables() {
  const quarterKeys = Object.keys(state.data.quarters).sort(compareQuarter);
  elements.quarterRows.innerHTML = "";
  elements.assetGrowthRows.innerHTML = "";
  const summaries = quarterKeys.map((key) => ({ key, assets: state.data.quarters[key].assets, totals: getTotals(state.data.quarters[key].assets, { useSnapshot: true }) }));
  for (let index = summaries.length - 1; index >= 0; index -= 1) {
    const summary = summaries[index];
    const previous = summaries[index - 1];
    const growth = previous ? growthPercent(summary.totals.wealth, previous.totals.wealth) : null;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${summary.key}</td><td>${formatMoney(summary.totals.wealth)}</td><td class="${growth === null || growth >= 0 ? "positive" : "negative"}">${growth === null ? "-" : formatPercent(growth, true)}</td><td>${summary.assets.length}</td><td class="row-actions"><button class="delete-button" type="button" data-delete-quarter="${summary.key}">×</button></td>`;
    elements.quarterRows.appendChild(row);
  }
  const latestKey = quarterKeys[quarterKeys.length - 1];
  if (!latestKey) return;
  const latestAssets = mapAssetsByKey(state.data.quarters[latestKey].assets, { useSnapshot: true });
  const previousKey = quarterKeys[quarterKeys.length - 2];
  const previousAssets = previousKey ? mapAssetsByKey(state.data.quarters[previousKey].assets, { useSnapshot: true }) : new Map();
  const latestTotal = getTotals(state.data.quarters[latestKey].assets, { useSnapshot: true }).wealth;
  for (const [key, latest] of latestAssets.entries()) {
    const previous = previousAssets.get(key);
    const growth = previous ? growthPercent(latest.value, previous.value) : null;
    const row = document.createElement("tr");
    row.innerHTML = `<td><div class="asset-name"><strong>${escapeHtml(latest.name)}</strong><span>${escapeHtml(TYPE_LABELS[latest.type] || latest.type)}</span></div></td><td>${formatMoney(latest.value)}</td><td class="${growth === null || growth >= 0 ? "positive" : "negative"}">${growth === null ? "-" : formatPercent(growth, true)}</td><td>${formatPercent(latestTotal > 0 ? (latest.value / latestTotal) * 100 : 0)}</td><td>${renderTrendText(key, quarterKeys)}</td>`;
    elements.assetGrowthRows.appendChild(row);
  }
}

function mapAssetsByKey(assets, options = {}) {
  const map = new Map();
  for (const asset of assets) {
    const key = assetKey(asset);
    const value = assetGrossValue(asset, options);
    const existing = map.get(key);
    map.set(key, { key, name: asset.name || TYPE_LABELS[asset.type], type: asset.type, value: (existing?.value || 0) + value });
  }
  return map;
}

function renderTrendText(key, quarterKeys) {
  return quarterKeys.map((quarterKey) => {
    const asset = mapAssetsByKey(state.data.quarters[quarterKey].assets, { useSnapshot: true }).get(key);
    return `${quarterKey}: ${asset ? formatMoney(asset.value) : "-"}`;
  }).join(" · ");
}

function getPreviousSavedQuarter(key) {
  const keys = Object.keys(state.data.quarters).sort(compareQuarter);
  const index = keys.indexOf(key);
  return index > 0 ? state.data.quarters[keys[index - 1]] : null;
}

function render() {
  renderQuarterOptions(); renderSummary(); renderRows(); renderPieChart(); renderGrowthTables();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function refreshQuotes() {
  state.lastUpdated = new Date();
  elements.statusText.textContent = "รีเฟรชหน้าจอแล้ว";
  render();
}

function readAssetFromForm() {
  const type = elements.typeInput.value;
  const manualValue = Number(elements.valueInput.value);
  const investedPercent = clamp(Number(elements.investedPercentInput.value), 0, 100);
  if (!Number.isFinite(manualValue) || manualValue < 0) {
    elements.statusText.textContent = "กรุณากรอกมูลค่าปัจจุบันเป็นบาทให้ถูกต้อง";
    return null;
  }
  return { type, name: elements.nameInput.value.trim() || TYPE_LABELS[type], manualValue, investedPercent: type === "cash" ? 0 : investedPercent, snapshotValue: manualValue };
}

function handleFormSubmit(event) {
  event.preventDefault();
  const asset = readAssetFromForm();
  if (!asset) return;
  const quarter = currentQuarter();
  if (state.editingId) {
    const index = quarter.assets.findIndex((item) => item.id === state.editingId);
    if (index >= 0) quarter.assets[index] = { ...quarter.assets[index], ...asset, id: state.editingId, updatedAt: new Date().toISOString() };
  } else {
    quarter.assets.push({ ...asset, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: null });
  }
  resetForm(); render(); saveData();
}

function editAsset(id) {
  const asset = currentQuarter().assets.find((item) => item.id === id);
  if (!asset) return;
  state.editingId = id;
  elements.typeInput.value = asset.type;
  elements.nameInput.value = asset.name || "";
  elements.valueInput.value = asset.manualValue || "";
  elements.investedPercentInput.value = asset.type === "cash" ? "0" : asset.investedPercent;
  elements.formTitle.textContent = "แก้ไขรายการพอร์ต";
  elements.submitButton.textContent = "บันทึกการแก้ไข";
  elements.cancelEditButton.classList.remove("is-hidden");
  updateFormMode(); setActiveView("manage");
}

function deleteAsset(id) {
  currentQuarter().assets = currentQuarter().assets.filter((asset) => asset.id !== id);
  if (state.editingId === id) resetForm();
  render(); saveData();
}

function resetForm() {
  state.editingId = null;
  elements.form.reset();
  elements.investedPercentInput.value = "100";
  elements.formTitle.textContent = "เพิ่มรายการพอร์ต";
  elements.submitButton.textContent = "เพิ่มเข้าพอร์ต";
  elements.cancelEditButton.classList.add("is-hidden");
  updateFormMode();
}

function saveSnapshot() {
  const quarter = currentQuarter();
  for (const asset of quarter.assets) asset.snapshotValue = Number(asset.manualValue) || 0;
  quarter.savedAt = new Date().toISOString();
  render(); saveData();
}

function createOrSwitchQuarter() {
  const key = elements.quarterInput.value || currentQuarterKey();
  if (!state.data.quarters[key]) state.data.quarters[key] = { key, assets: [], savedAt: null };
  state.data.currentQuarter = key;
  resetForm(); render(); saveData();
}

function addQuarterFromInputs() {
  const year = Number(elements.newQuarterYearInput.value);
  const quarterNumber = Number(elements.newQuarterNumberInput.value);
  if (!Number.isInteger(year) || year < 1900 || year > 2500 || !Number.isInteger(quarterNumber) || quarterNumber < 1 || quarterNumber > 4) {
    elements.quarterStatus.textContent = "กรุณากรอกปีและไตรมาสให้ถูกต้อง";
    return;
  }
  const key = `${year}-Q${quarterNumber}`;
  if (!state.data.quarters[key]) state.data.quarters[key] = { key, assets: [], savedAt: null };
  state.data.currentQuarter = key;
  resetForm(); render(); saveData();
}

function deleteQuarter(key) {
  if (Object.keys(state.data.quarters).length <= 1) return;
  if (!window.confirm(`ลบข้อมูล ${key} ทั้งหมดใช่ไหม?`)) return;
  delete state.data.quarters[key];
  if (state.data.currentQuarter === key) state.data.currentQuarter = Object.keys(state.data.quarters).sort(compareQuarter).reverse()[0];
  resetForm(); render(); saveData();
}

function updateFormMode() {
  const isCash = elements.typeInput.value === "cash";
  elements.investedPercentField.classList.toggle("is-hidden", isCash);
  elements.investedPercentInput.required = !isCash;
  if (isCash) elements.investedPercentInput.value = "0";
}

function setActiveView(view) {
  state.activeView = view;
  elements.tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  elements.viewPanels.forEach((panel) => panel.classList.toggle("is-active", panel.id === `${view}View`));
}

function setDefaultNewQuarterInputs() {
  const now = new Date();
  elements.newQuarterYearInput.value = String(now.getFullYear());
  elements.newQuarterNumberInput.value = String(Math.floor(now.getMonth() / 3) + 1);
}

elements.form.addEventListener("submit", handleFormSubmit);
elements.typeInput.addEventListener("change", updateFormMode);
elements.cancelEditButton.addEventListener("click", resetForm);
elements.refreshButton.addEventListener("click", refreshQuotes);
elements.saveSnapshotButton.addEventListener("click", saveSnapshot);
elements.newQuarterButton.addEventListener("click", addQuarterFromInputs);
elements.quarterInput.addEventListener("change", createOrSwitchQuarter);
elements.tabButtons.forEach((button) => button.addEventListener("click", () => setActiveView(button.dataset.view)));
elements.rows.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  if (editButton) editAsset(editButton.dataset.editId);
  if (deleteButton) deleteAsset(deleteButton.dataset.deleteId);
});
elements.quarterRows.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-quarter]");
  if (deleteButton) deleteQuarter(deleteButton.dataset.deleteQuarter);
});

setDefaultNewQuarterInputs();
updateFormMode();
render();
loadRemoteData();
