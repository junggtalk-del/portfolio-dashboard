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
  lastUpdated: null,
  storageMode: "supabase"
};

const elements = {
  quarterInput: document.querySelector("#quarterInput"),
  newQuarterYearInput: document.querySelector("#newQuarterYearInput"),
  newQuarterNumberInput: document.querySelector("#newQuarterNumberInput"),
  newQuarterButton: document.querySelector("#newQuarterButton"),
  copyPrevQuarterButton: document.querySelector("#copyPrevQuarterButton"),
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

function portfolioHeaders() {
  const password = sessionStorage.getItem("portfolioPassword");
  return password ? { "x-portfolio-password": password } : {};
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
    const response = await fetch("/api/portfolio", {
      cache: "no-store",
      headers: portfolioHeaders()
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Unable to load portfolio");
    state.storageMode = payload.mode === "local-fallback" ? "local-fallback" : "supabase";
    if (payload.data?.quarters && Object.keys(payload.data.quarters).length) state.data = payload.data;
    state.lastUpdated = new Date();
    elements.statusText.textContent =
      state.storageMode === "local-fallback"
        ? "โหลดข้อมูลแล้ว (Local fallback mode)"
        : "โหลดข้อมูลจาก database แล้ว";
  } catch (error) {
    state.storageMode = "supabase";
    elements.statusText.textContent = `โหลดจาก database ไม่สำเร็จ: ${error.message}`;
  } finally {
    state.hydrating = false;
    render();
  }
}

async function persistRemoteData() {
  if (state.hydrating || state.saving) return;
  state.saving = true;
  elements.statusText.textContent =
    state.storageMode === "local-fallback"
      ? "กำลังบันทึกลง local fallback..."
      : "กำลังบันทึกลง database...";
  try {
    const response = await fetch("/api/portfolio", {
      method: "PUT",
      headers: { "content-type": "application/json", ...portfolioHeaders() },
      body: JSON.stringify({ data: state.data })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || "Unable to save portfolio");
    state.storageMode = payload.mode === "local-fallback" ? "local-fallback" : state.storageMode;
    state.lastUpdated = new Date();
    elements.statusText.textContent =
      state.storageMode === "local-fallback"
        ? "บันทึกแล้ว (Local fallback mode)"
        : "บันทึกลง database แล้ว";
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
  if (elements.copyPrevQuarterButton) {
    elements.copyPrevQuarterButton.disabled = !previousQuarter;
    elements.copyPrevQuarterButton.title = previousQuarter ? `คัดลอกรายการสินทรัพย์จาก ${previousQuarter.key} มา ${state.data.currentQuarter}` : "ยังไม่มีไตรมาสก่อนหน้าให้คัดลอก";
  }
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
  // อิง "ไตรมาสที่เลือก" (ไม่ใช่ไตรมาสสุดท้ายเสมอไป) → ตารางนี้ refresh ตาม dropdown
  const selectedKey = state.data.currentQuarter && state.data.quarters[state.data.currentQuarter] ? state.data.currentQuarter : quarterKeys[quarterKeys.length - 1];
  const latestKey = selectedKey;
  if (!latestKey) return;
  const selIdx = quarterKeys.indexOf(latestKey);
  const latestAssets = mapAssetsByKey(state.data.quarters[latestKey].assets, { useSnapshot: true });
  const previousKey = selIdx > 0 ? quarterKeys[selIdx - 1] : undefined;
  const previousAssets = previousKey ? mapAssetsByKey(state.data.quarters[previousKey].assets, { useSnapshot: true }) : new Map();
  const latestTotal = getTotals(state.data.quarters[latestKey].assets, { useSnapshot: true }).wealth;
  const subtitle = document.querySelector("#assetGrowthSubtitle");
  if (subtitle) subtitle.textContent = previousKey ? `ไตรมาส ${latestKey} เทียบกับ ${previousKey} · แนวโน้มย้อนหลังทุกไตรมาส` : `ไตรมาส ${latestKey} (ยังไม่มีไตรมาสก่อนหน้าให้เทียบ)`;
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

// ---------------------------------------------------------------- growth line chart
// เส้นพอร์ตรวม + ทุกสินทรัพย์ ต่อไตรมาส (snapshot-first เหมือนตาราง growth ด้านล่าง)
// โหมด "มูลค่า ฿" = เงินจริง · โหมด "ดัชนีเติบโต" = ทุกเส้นเริ่ม 100 เทียบอัตราโตกันตรงๆ
let growthChartMode = "value";

function compactMoney(v) {
  if (!Number.isFinite(v)) return "-";
  const abs = Math.abs(v);
  if (abs >= 1e6) return `฿${(v / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `฿${Math.round(v / 1e3)}k`;
  return `฿${Math.round(v)}`;
}

function growthChartSeries() {
  const keys = Object.keys(state.data.quarters).sort(compareQuarter);
  const perQuarterMaps = keys.map((k) => mapAssetsByKey(state.data.quarters[k].assets, { useSnapshot: true }));
  const totals = keys.map((k) => getTotals(state.data.quarters[k].assets, { useSnapshot: true }).wealth);
  const assetMeta = new Map();
  perQuarterMaps.forEach((m) => m.forEach((v, kk) => { if (!assetMeta.has(kk)) assetMeta.set(kk, v); }));
  const assets = [...assetMeta.entries()].map(([kk, meta], i) => ({
    name: meta.name,
    color: CHART_COLORS[i % CHART_COLORS.length],
    values: perQuarterMaps.map((m) => (m.get(kk) ? m.get(kk).value : null))
  }));
  assets.sort((a, b) => (b.values[b.values.length - 1] || 0) - (a.values[a.values.length - 1] || 0));
  return { keys, series: [{ name: "พอร์ตรวม", color: "#17324d", values: totals, total: true }, ...assets] };
}

function indexifySeries(s) {
  const base = s.values.find((v) => Number.isFinite(v) && v > 0);
  return { ...s, values: s.values.map((v) => (Number.isFinite(v) && base ? (v / base) * 100 : null)) };
}

// ---------------------------------------------------------------- growth contribution (%)
// แตกการเติบโต QoQ % ของพอร์ตเป็น "ส่วนที่มาจากสินทรัพย์แต่ละตัว" (percentage points)
// contribution = (มูลค่าสินทรัพย์เปลี่ยนไป) ÷ (พอร์ตรวมไตรมาสก่อน) × 100 → ผลรวมทุกตัว = QoQ% ของพอร์ตพอดี
// หมายเหตุ: มูลค่าใน Quarterly Editor รวมทั้งราคาที่โตและเงินที่เติม/ถอน — contribution สะท้อนทั้งสองอย่าง
function contribData(keys, rawSeries) {
  const totalSeries = rawSeries.find((s) => s.total);
  const assets = rawSeries.filter((s) => !s.total);
  const out = [];
  for (let i = 1; i < keys.length; i += 1) {
    const prevTotal = totalSeries.values[i - 1];
    if (!Number.isFinite(prevTotal) || prevTotal <= 0) continue;
    const entries = assets.map((a) => {
      const prev = Number.isFinite(a.values[i - 1]) ? a.values[i - 1] : 0;
      const now = Number.isFinite(a.values[i]) ? a.values[i] : 0;
      return { name: a.name, color: a.color, pp: ((now - prev) / prevTotal) * 100 };
    }).filter((e) => Math.abs(e.pp) > 0.0005);
    const totalPct = ((totalSeries.values[i] - prevTotal) / prevTotal) * 100;
    out.push({ key: keys[i], fromKey: keys[i - 1], entries, totalPct });
  }
  return out;
}

function renderContribChart(host, legend, keys, rawSeries) {
  const cols = contribData(keys, rawSeries);
  if (!cols.length) {
    host.innerHTML = '<p class="growth-chart-empty">ยังคำนวณ contribution ไม่ได้ — ต้องมีไตรมาสก่อนหน้าที่มีมูลค่ามากกว่า 0</p>';
    if (legend) legend.innerHTML = "";
    return;
  }
  // สเกลจากยอด stack บวก/ลบ ของทุกคอลัมน์
  let maxUp = 0, maxDown = 0;
  cols.forEach((c) => {
    const up = c.entries.filter((e) => e.pp > 0).reduce((s, e) => s + e.pp, 0);
    const down = c.entries.filter((e) => e.pp < 0).reduce((s, e) => s + e.pp, 0);
    if (up > maxUp) maxUp = up;
    if (down < maxDown) maxDown = down;
  });
  if (maxUp === 0 && maxDown === 0) maxUp = 1;
  const padScale = (maxUp - maxDown) * 0.12 || 1;
  const top = maxUp + padScale, bottom = maxDown - padScale * 0.5;

  const W = 940, H = 330, L = 62, R = 18, T = 16, B = 42;
  const Y = (v) => T + (1 - (v - bottom) / (top - bottom)) * (H - T - B);
  const slot = (W - L - R) / cols.length;
  const barW = Math.min(84, slot * 0.55);

  let svg = "";
  // gridlines + แกน 0
  for (let g = 0; g <= 3; g += 1) {
    const val = bottom + ((top - bottom) * g) / 3;
    svg += `<line x1="${L}" y1="${Y(val).toFixed(1)}" x2="${W - R}" y2="${Y(val).toFixed(1)}" class="gc-grid" />`;
    svg += `<text x="${L - 8}" y="${(Y(val) + 4).toFixed(1)}" text-anchor="end" class="gc-axis">${val.toFixed(1)}%</text>`;
  }
  svg += `<line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="#17324d" stroke-width="1.4" />`;

  cols.forEach((c, ci) => {
    const cx = L + slot * ci + slot / 2;
    const x0 = cx - barW / 2;
    let upCursor = 0, downCursor = 0;
    // เรียง segment ใหญ่→เล็ก ให้อ่านง่าย
    c.entries.slice().sort((a, b) => Math.abs(b.pp) - Math.abs(a.pp)).forEach((e) => {
      const isUp = e.pp >= 0;
      const from = isUp ? upCursor : downCursor;
      const to = from + e.pp;
      const y1 = Y(Math.max(from, to)), y2 = Y(Math.min(from, to));
      const h = Math.max(1, y2 - y1);
      svg += `<rect x="${x0.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${e.color}" ${isUp ? "" : 'opacity="0.82"'}><title>${escapeHtml(e.name)} · ${escapeHtml(c.key)} · ${e.pp >= 0 ? "+" : ""}${e.pp.toFixed(2)}pp</title></rect>`;
      // แสดง % บนท่อนแท่งโดยตรง (ท่อนสูงพอ: ≥28px = ชื่อ+ค่า, ≥13px = ค่าอย่างเดียว)
      const midY = y1 + h / 2;
      const ppTxt = `${e.pp >= 0 ? "+" : ""}${e.pp.toFixed(1)}%`;
      if (h >= 28) {
        const shortName = e.name.length > 10 ? e.name.slice(0, 10) + "…" : e.name;
        svg += `<text x="${cx.toFixed(1)}" y="${(midY - 2.5).toFixed(1)}" text-anchor="middle" font-size="9" fill="#fff" opacity="0.92">${escapeHtml(shortName)}</text>`;
        svg += `<text x="${cx.toFixed(1)}" y="${(midY + 9.5).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${ppTxt}</text>`;
      } else if (h >= 13) {
        svg += `<text x="${cx.toFixed(1)}" y="${(midY + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">${ppTxt}</text>`;
      }
      if (isUp) upCursor = to; else downCursor = to;
    });
    // จุด+ตัวเลขรวม QoQ%
    const ty = Y(c.totalPct);
    svg += `<circle cx="${cx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4" fill="#17324d" stroke="#fff" stroke-width="1.5"><title>พอร์ตรวม ${escapeHtml(c.key)} · ${c.totalPct >= 0 ? "+" : ""}${c.totalPct.toFixed(2)}%</title></circle>`;
    svg += `<text x="${cx.toFixed(1)}" y="${(Math.min(ty, Y(Math.max(upCursor, 0))) - 8).toFixed(1)}" text-anchor="middle" class="gc-axis" font-weight="800" fill="${c.totalPct >= 0 ? "#12805c" : "#c0392b"}">${c.totalPct >= 0 ? "+" : ""}${c.totalPct.toFixed(1)}%</text>`;
    svg += `<text x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle" class="gc-axis">${escapeHtml(c.key)}</text>`;
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="ที่มาการเติบโตของพอร์ตรายไตรมาส (%)">${svg}</svg>` +
    '<p class="growth-chart-note">แต่ละแท่ง = การเติบโต QoQ ของพอร์ต แยกตามสินทรัพย์ (หน่วย percentage point ของพอร์ตรวม) · จุดน้ำเงินเข้ม = QoQ รวม · ค่ารวมทั้งราคาที่เปลี่ยนและเงินที่เติม/ถอนระหว่างไตรมาส</p>';

  if (legend) {
    const last = cols[cols.length - 1];
    const items = last.entries.slice().sort((a, b) => Math.abs(b.pp) - Math.abs(a.pp)).map((e) =>
      `<span class="growth-legend-item"><i style="background:${e.color}"></i>${escapeHtml(e.name)} <em class="${e.pp >= 0 ? "positive" : "negative"}">${e.pp >= 0 ? "+" : ""}${e.pp.toFixed(2)}pp</em></span>`
    ).join("");
    legend.innerHTML = `<span class="growth-legend-item is-total"><i style="background:#17324d"></i>${escapeHtml(last.key)} รวม <em class="${last.totalPct >= 0 ? "positive" : "negative"}">${last.totalPct >= 0 ? "+" : ""}${last.totalPct.toFixed(2)}%</em></span>` + items;
  }
}

function renderGrowthChart() {
  const host = document.querySelector("#growthChart");
  const legend = document.querySelector("#growthChartLegend");
  if (!host) return;
  const { keys, series: rawSeries } = growthChartSeries();
  if (keys.length < 2) {
    host.innerHTML = '<p class="growth-chart-empty">ต้องมีข้อมูลอย่างน้อย 2 ไตรมาสจึงจะวาดกราฟได้ — เพิ่ม/บันทึกไตรมาสก่อนหน้าเพื่อดูแนวโน้ม</p>';
    if (legend) legend.innerHTML = "";
    return;
  }
  if (growthChartMode === "contrib") { renderContribChart(host, legend, keys, rawSeries); return; }
  const series = growthChartMode === "index" ? rawSeries.map(indexifySeries) : rawSeries;

  const W = 940, H = 330, L = 62, R = 18, T = 14, B = 42;
  let min = Infinity, max = -Infinity;
  series.forEach((s) => s.values.forEach((v) => { if (Number.isFinite(v)) { if (v < min) min = v; if (v > max) max = v; } }));
  if (!Number.isFinite(min) || !Number.isFinite(max)) { host.innerHTML = ""; return; }
  if (growthChartMode === "value") min = 0; // เงินจริงเริ่มแกนที่ 0 เพื่อไม่บิดสัดส่วน
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.06;
  max += pad; if (growthChartMode === "index") min -= pad;

  const X = (i) => L + (keys.length === 1 ? 0 : (i / (keys.length - 1)) * (W - L - R));
  const Y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);

  let svg = "";
  // y gridlines (4 ระดับ)
  for (let g = 0; g <= 3; g += 1) {
    const val = min + ((max - min) * g) / 3;
    const gy = Y(val).toFixed(1);
    svg += `<line x1="${L}" y1="${gy}" x2="${W - R}" y2="${gy}" class="gc-grid" />`;
    svg += `<text x="${L - 8}" y="${(Number(gy) + 4).toFixed(1)}" text-anchor="end" class="gc-axis">${growthChartMode === "value" ? compactMoney(val) : Math.round(val)}</text>`;
  }
  // x labels (ถี่เกินให้เว้น)
  const step = keys.length > 8 ? Math.ceil(keys.length / 8) : 1;
  keys.forEach((k, i) => {
    if (i % step !== 0 && i !== keys.length - 1) return;
    svg += `<text x="${X(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="gc-axis">${escapeHtml(k)}</text>`;
  });
  // เส้นราย series (ข้ามช่วงที่ไม่มีข้อมูล — วาดเป็นช่วงต่อเนื่องทีละ run)
  series.forEach((s) => {
    let run = [];
    const flush = () => {
      if (run.length >= 2) svg += `<polyline points="${run.join(" ")}" fill="none" stroke="${s.color}" stroke-width="${s.total ? 3 : 1.8}" stroke-linejoin="round" ${s.total ? "" : 'opacity="0.85"'} />`;
      run = [];
    };
    s.values.forEach((v, i) => {
      if (Number.isFinite(v)) run.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
      else flush();
    });
    flush();
    s.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      svg += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${s.total ? 4 : 3}" fill="${s.color}"><title>${escapeHtml(s.name)} · ${escapeHtml(keys[i])} · ${growthChartMode === "value" ? formatMoney(v) : Math.round(v)}</title></circle>`;
    });
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="กราฟการเติบโตรายไตรมาส">${svg}</svg>`;

  if (legend) {
    legend.innerHTML = series.map((s) => {
      const vals = s.values.filter((v) => Number.isFinite(v));
      const first = vals[0], latest = vals[vals.length - 1];
      const growth = growthPercent(latest, first);
      const latestTxt = growthChartMode === "value" ? formatMoney(latest) : Math.round(latest);
      const growthTxt = growth === null ? "" : ` <em class="${growth >= 0 ? "positive" : "negative"}">${formatPercent(growth, true)}</em>`;
      return `<span class="growth-legend-item${s.total ? " is-total" : ""}"><i style="background:${s.color}"></i>${escapeHtml(s.name)} <strong>${latestTxt}</strong>${growthTxt}</span>`;
    }).join("");
  }
}

function render() {
  renderQuarterOptions(); renderSummary(); renderRows(); renderPieChart(); renderGrowthTables(); renderGrowthChart();
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

function copyFromPreviousQuarter() {
  const previous = getPreviousSavedQuarter(state.data.currentQuarter);
  if (!previous) {
    elements.quarterStatus.textContent = "ยังไม่มีไตรมาสก่อนหน้าให้คัดลอก";
    return;
  }
  const sourceAssets = previous.assets || [];
  if (!sourceAssets.length) {
    elements.quarterStatus.textContent = `${previous.key} ไม่มีรายการให้คัดลอก`;
    return;
  }
  const target = currentQuarter();
  const existingKeys = new Set(target.assets.map((asset) => assetKey(asset)));
  const toCopy = sourceAssets.filter((asset) => !existingKeys.has(assetKey(asset)));
  const skipped = sourceAssets.length - toCopy.length;
  if (!toCopy.length) {
    elements.quarterStatus.textContent = `รายการทั้งหมดจาก ${previous.key} มีอยู่ใน ${target.key} แล้ว (ซ้ำ ${skipped} รายการ)`;
    return;
  }
  const confirmMessage = `คัดลอก ${toCopy.length} รายการจาก ${previous.key} มา ${target.key}?${skipped ? ` (ข้าม ${skipped} รายการที่มีอยู่แล้ว)` : ""}`;
  if (!window.confirm(confirmMessage)) return;
  const now = new Date().toISOString();
  for (const asset of toCopy) {
    const manualValue = Number(asset.manualValue) || 0;
    target.assets.push({
      id: crypto.randomUUID(),
      type: asset.type,
      name: asset.name || "",
      manualValue,
      investedPercent: asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 0, 0, 100),
      snapshotValue: manualValue,
      createdAt: now,
      updatedAt: null,
      copiedFrom: previous.key
    });
  }
  resetForm();
  render();
  saveData();
  elements.quarterStatus.textContent = `คัดลอก ${toCopy.length} รายการจาก ${previous.key} มา ${target.key} แล้ว${skipped ? ` (ข้าม ${skipped} รายการซ้ำ)` : ""} — ปรับมูลค่าแล้วกด “บันทึกไตรมาสนี้”`;
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
if (elements.copyPrevQuarterButton) elements.copyPrevQuarterButton.addEventListener("click", copyFromPreviousQuarter);
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
const growthModeBox = document.querySelector("#growthChartMode");
if (growthModeBox) growthModeBox.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-gmode]");
  if (!btn || btn.dataset.gmode === growthChartMode) return;
  growthChartMode = btn.dataset.gmode;
  growthModeBox.querySelectorAll(".growth-mode-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
  renderGrowthChart();
});

setDefaultNewQuarterInputs();
updateFormMode();
render();
loadRemoteData();
