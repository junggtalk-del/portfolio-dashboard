const STORAGE_KEY = "investment-dashboard-quarterly-v1";
const LEGACY_KEYS = ["investment-dashboard-assets-v2", "investment-dashboard-assets"];
const BTC_SYMBOL = "BTC-USD";

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
  data: loadData(),
  quotes: new Map(),
  loading: false,
  lastUpdated: null,
  editingId: null,
  activeView: "overview",
  supabase: null,
  user: null,
  remoteReady: false,
  hydratingRemote: false
};

const elements = {
  quarterInput: document.querySelector("#quarterInput"),
  newQuarterYearInput: document.querySelector("#newQuarterYearInput"),
  newQuarterNumberInput: document.querySelector("#newQuarterNumberInput"),
  newQuarterButton: document.querySelector("#newQuarterButton"),
  saveSnapshotButton: document.querySelector("#saveSnapshotButton"),
  quarterStatus: document.querySelector("#quarterStatus"),
  authPanel: document.querySelector("#authPanel"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authStatus: document.querySelector("#authStatus"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  form: document.querySelector("#assetForm"),
  formTitle: document.querySelector("#formTitle"),
  submitButton: document.querySelector("#submitButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  typeInput: document.querySelector("#typeInput"),
  nameInput: document.querySelector("#nameInput"),
  valueInput: document.querySelector("#valueInput"),
  investedPercentInput: document.querySelector("#investedPercentInput"),
  manualValueField: document.querySelector(".manual-value-field"),
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

function currentQuarterKey() {
  return state.data.currentQuarter;
}

function currentQuarter() {
  const key = currentQuarterKey();
  if (!state.data.quarters[key]) {
    state.data.quarters[key] = { key, assets: [], savedAt: null };
  }
  return state.data.quarters[key];
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    const migratedAssets = loadLegacyAssets();
    const key = getCurrentQuarterKey();
    return {
      currentQuarter: key,
      quarters: {
        [key]: {
          key,
          assets: migratedAssets,
          savedAt: migratedAssets.length ? new Date().toISOString() : null
        }
      }
    };
  } catch {
    const key = getCurrentQuarterKey();
    return { currentQuarter: key, quarters: { [key]: { key, assets: [], savedAt: null } } };
  }
}

function loadLegacyAssets() {
  for (const storageKey of LEGACY_KEYS) {
    const saved = localStorage.getItem(storageKey);
    if (!saved) continue;
    try {
      return JSON.parse(saved).map(normalizeAsset);
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeAsset(asset) {
  if (asset.type) {
    return {
      id: asset.id || crypto.randomUUID(),
      type: asset.type,
      name: asset.name || TYPE_LABELS[asset.type] || "Asset",
      btcQuantity: 0,
      manualValue: Number(asset.manualValue) || Number(asset.snapshotValue) || 0,
      investedPercent: asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 100, 0, 100),
      snapshotValue: Number(asset.snapshotValue) || null,
      createdAt: asset.createdAt || new Date().toISOString(),
      updatedAt: asset.updatedAt || null
    };
  }

  return {
    id: asset.id || crypto.randomUUID(),
    type: asset.symbol === BTC_SYMBOL ? "bitcoin" : "custom",
    name: asset.name || asset.symbol || "Asset",
    btcQuantity: 0,
    manualValue: (Number(asset.quantity) || 0) * (Number(asset.cost) || 0),
    investedPercent: 100,
    snapshotValue: null,
    createdAt: asset.createdAt || new Date().toISOString(),
    updatedAt: null
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  persistCurrentQuarter();
}

function isSupabaseConfigured() {
  const config = window.PORTFOLIO_CONFIG || {};
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
}

async function initSupabase() {
  if (!isSupabaseConfigured()) {
    renderAuth();
    return;
  }

  const config = window.PORTFOLIO_CONFIG;
  const supabaseUrl = normalizeSupabaseUrl(config.SUPABASE_URL);
  if (!isValidSupabaseProjectUrl(supabaseUrl)) {
    elements.authTitle.textContent = "Supabase config error";
    elements.authStatus.textContent = "SUPABASE_URL ต้องเป็น Project URL เช่น https://xxxx.supabase.co";
    return;
  }

  state.supabase = window.supabase.createClient(supabaseUrl, config.SUPABASE_ANON_KEY, {
    db: { schema: config.SUPABASE_SCHEMA || "portfolio_dashboard" }
  });
  const { data } = await state.supabase.auth.getSession();
  state.user = data.session?.user || null;
  state.remoteReady = Boolean(state.user);

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;
    state.remoteReady = Boolean(state.user);
    if (state.user) await loadRemoteData();
    renderAuth();
    render();
  });

  if (state.user) await loadRemoteData();
  renderAuth();
  render();
}

function normalizeSupabaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function isValidSupabaseProjectUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co") && parsed.pathname === "/";
  } catch {
    return false;
  }
}

function renderAuth() {
  if (!isSupabaseConfigured()) {
    elements.authTitle.textContent = "Local mode";
    elements.authStatus.textContent = "ยังไม่ได้ใส่ Supabase config ข้อมูลจะอยู่ใน browser นี้เท่านั้น";
    elements.authForm.classList.add("is-hidden");
    return;
  }

  elements.authForm.classList.remove("is-hidden");
  if (state.user) {
    elements.authTitle.textContent = "Supabase connected";
    elements.authStatus.textContent = `กำลัง sync กับบัญชี ${state.user.email}`;
    elements.authEmailInput.classList.add("is-hidden");
    elements.authPasswordInput.classList.add("is-hidden");
    elements.signInButton.classList.add("is-hidden");
    elements.signUpButton.classList.add("is-hidden");
    elements.signOutButton.classList.remove("is-hidden");
  } else {
    elements.authTitle.textContent = "Supabase login";
    elements.authStatus.textContent = "เข้าสู่ระบบเพื่อบันทึกและเปิดข้อมูลได้หลายเครื่อง";
    elements.authEmailInput.classList.remove("is-hidden");
    elements.authPasswordInput.classList.remove("is-hidden");
    elements.signInButton.classList.remove("is-hidden");
    elements.signUpButton.classList.remove("is-hidden");
    elements.signOutButton.classList.add("is-hidden");
  }
}

async function loadRemoteData() {
  if (!state.supabase || !state.user) return;
  state.hydratingRemote = true;
  const localBeforeRemote = state.data;

  const { data: quarters, error: quarterError } = await state.supabase
    .from("portfolio_quarters")
    .select("id,key,saved_at")
    .order("key", { ascending: true });

  if (quarterError) {
    elements.quarterStatus.textContent = quarterError.message;
    state.hydratingRemote = false;
    return;
  }

  const remoteData = { currentQuarter: state.data.currentQuarter || getCurrentQuarterKey(), quarters: {} };
  for (const quarter of quarters || []) {
    remoteData.quarters[quarter.key] = {
      key: quarter.key,
      remoteId: quarter.id,
      savedAt: quarter.saved_at,
      assets: []
    };
  }

  const { data: assets, error: assetError } = await state.supabase
    .from("portfolio_assets")
    .select("id,quarter_id,type,name,manual_value,invested_percent,snapshot_value,created_at,updated_at");

  if (assetError) {
    elements.quarterStatus.textContent = assetError.message;
    state.hydratingRemote = false;
    return;
  }

  const quarterById = new Map(Object.values(remoteData.quarters).map((quarter) => [quarter.remoteId, quarter]));
  for (const asset of assets || []) {
    const quarter = quarterById.get(asset.quarter_id);
    if (!quarter) continue;
    quarter.assets.push({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      btcQuantity: 0,
      manualValue: Number(asset.manual_value) || 0,
      investedPercent: Number(asset.invested_percent) || 0,
      snapshotValue: asset.snapshot_value === null ? null : Number(asset.snapshot_value),
      createdAt: asset.created_at,
      updatedAt: asset.updated_at
    });
  }

  if (!Object.keys(remoteData.quarters).length) {
    const localHasData = Object.values(localBeforeRemote.quarters || {}).some((quarter) => quarter.assets?.length);
    if (localHasData) {
      remoteData.currentQuarter = localBeforeRemote.currentQuarter;
      remoteData.quarters = localBeforeRemote.quarters;
    } else {
      const key = getCurrentQuarterKey();
      remoteData.currentQuarter = key;
      remoteData.quarters[key] = { key, assets: [], savedAt: null };
    }
  } else if (!remoteData.quarters[remoteData.currentQuarter]) {
    remoteData.currentQuarter = Object.keys(remoteData.quarters).sort(compareQuarter).reverse()[0];
  }

  state.data = remoteData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  state.hydratingRemote = false;
  if (Object.values(localBeforeRemote.quarters || {}).some((quarter) => quarter.assets?.length) && !quarters?.length) {
    persistCurrentQuarter();
  }
}

async function persistCurrentQuarter() {
  if (!state.supabase || !state.user || state.hydratingRemote) return;
  const quarter = currentQuarter();

  const { data: savedQuarter, error: quarterError } = await state.supabase
    .from("portfolio_quarters")
    .upsert(
      {
        user_id: state.user.id,
        key: quarter.key,
        saved_at: quarter.savedAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,key" }
    )
    .select("id")
    .single();

  if (quarterError) {
    elements.quarterStatus.textContent = quarterError.message;
    return;
  }

  quarter.remoteId = savedQuarter.id;
  await state.supabase.from("portfolio_assets").delete().eq("quarter_id", savedQuarter.id);

  if (quarter.assets.length) {
    const rows = quarter.assets.map((asset) => ({
      id: asset.id,
      quarter_id: savedQuarter.id,
      user_id: state.user.id,
      type: asset.type,
      name: asset.name || TYPE_LABELS[asset.type],
      manual_value: Number(asset.manualValue) || 0,
      invested_percent: Number(asset.investedPercent) || 0,
      snapshot_value: Number.isFinite(asset.snapshotValue) ? asset.snapshotValue : null,
      created_at: asset.createdAt || new Date().toISOString(),
      updated_at: asset.updatedAt || new Date().toISOString()
    }));

    const { error: assetError } = await state.supabase.from("portfolio_assets").insert(rows);
    if (assetError) elements.quarterStatus.textContent = assetError.message;
  }
}

function getCurrentQuarterKey(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function getQuarterOptions() {
  return Object.keys(state.data.quarters).sort(compareQuarter).reverse();
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
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

function formatPercent(value, signed = false) {
  if (!Number.isFinite(value)) return "0.00%";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function assetGrossValue(asset, options = {}) {
  if (options.useSnapshot && Number.isFinite(asset.snapshotValue)) return asset.snapshotValue;
  return Number(asset.manualValue) || 0;
}

function getTotals(assets = currentQuarter().assets, options = {}) {
  return assets.reduce(
    (sum, asset) => {
      const gross = assetGrossValue(asset, options);
      if (!Number.isFinite(gross)) {
        sum.hasPendingPrice = true;
        return sum;
      }

      const investedPercent = asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 0, 0, 100);
      const invested = asset.type === "cash" ? 0 : gross * (investedPercent / 100);
      const cash = asset.type === "cash" ? gross : gross - invested;

      sum.wealth += gross;
      sum.invested += invested;
      sum.cash += cash;
      return sum;
    },
    { wealth: 0, invested: 0, cash: 0, hasPendingPrice: false }
  );
}

function assetMetrics(asset, totalWealth, options = {}) {
  const gross = assetGrossValue(asset, options);
  const investedPercent = asset.type === "cash" ? 0 : clamp(Number(asset.investedPercent) || 0, 0, 100);
  if (!Number.isFinite(gross)) {
    return { gross: null, portfolioPercent: null, investedPercent, invested: null, cash: null };
  }

  const invested = asset.type === "cash" ? 0 : gross * (investedPercent / 100);
  const cash = asset.type === "cash" ? gross : gross - invested;
  return {
    gross,
    portfolioPercent: totalWealth > 0 ? (gross / totalWealth) * 100 : 0,
    investedPercent,
    invested,
    cash
  };
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
  for (const key of getQuarterOptions()) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    elements.quarterInput.appendChild(option);
  }
  elements.quarterInput.value = currentQuarterKey();
}

function renderSummary() {
  const totals = getTotals();
  const investedPercent = totals.wealth > 0 ? (totals.invested / totals.wealth) * 100 : 0;
  const cashPercent = totals.wealth > 0 ? (totals.cash / totals.wealth) * 100 : 0;
  const previousQuarter = getPreviousSavedQuarter(currentQuarterKey());
  const previousTotals = previousQuarter ? getTotals(previousQuarter.assets, { useSnapshot: true }) : null;
  const qGrowth = previousTotals ? growthPercent(totals.wealth, previousTotals.wealth) : null;

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

  const quarter = currentQuarter();
  elements.quarterStatus.textContent = quarter.savedAt
    ? `บันทึก ${quarter.key} ล่าสุด ${new Date(quarter.savedAt).toLocaleString("th-TH")}`
    : `${quarter.key} ยังไม่เคยบันทึก snapshot`;

  if (state.lastUpdated) {
    elements.lastUpdated.textContent = `อัปเดตหน้าจอล่าสุด ${state.lastUpdated.toLocaleTimeString("th-TH")}`;
  } else if (totals.hasPendingPrice) {
    elements.lastUpdated.textContent = "กำลังรอราคา Bitcoin";
  } else {
    elements.lastUpdated.textContent = `ข้อมูล ${currentQuarterKey()}`;
  }
}

function renderRows() {
  const assets = currentQuarter().assets;
  const totals = getTotals();
  elements.rows.innerHTML = "";
  elements.emptyState.classList.toggle("is-visible", assets.length === 0);
  elements.panelSubtitle.textContent = assets.length
    ? `ติดตาม ${assets.length} รายการใน ${currentQuarterKey()}`
    : "เพิ่มรายการเพื่อเริ่มดูสัดส่วนพอร์ต";

  for (const asset of assets) {
    const metrics = assetMetrics(asset, totals.wealth);
    const row = document.createElement("tr");
    const name = asset.name || TYPE_LABELS[asset.type] || "Asset";

    row.innerHTML = `
      <td>
        <div class="asset-name">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(getAssetDetail(asset))}</span>
        </div>
      </td>
      <td>${formatMoney(metrics.gross)}</td>
      <td>${formatPercent(metrics.portfolioPercent)}</td>
      <td>${asset.type === "cash" ? "-" : formatPercent(metrics.investedPercent)}</td>
      <td>${formatMoney(metrics.invested)}</td>
      <td>${formatMoney(metrics.cash)}</td>
      <td class="row-actions">
        <button class="icon-button edit-button" type="button" title="แก้ไข asset" data-edit-id="${asset.id}">แก้ไข</button>
        <button class="delete-button" type="button" title="ลบ asset" data-delete-id="${asset.id}">×</button>
      </td>
    `;
    elements.rows.appendChild(row);
  }
}

function renderPieChart() {
  const assets = currentQuarter().assets;
  const totals = getTotals();
  const canvas = elements.allocationChart;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 18;
  ctx.clearRect(0, 0, size, size);
  elements.chartLegend.innerHTML = "";
  elements.pieSubtitle.textContent = `${currentQuarterKey()} · ${formatMoney(totals.wealth)}`;

  const slices = assets
    .map((asset, index) => ({
      asset,
      value: assetGrossValue(asset),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .filter((slice) => Number.isFinite(slice.value) && slice.value > 0);

  if (!slices.length || totals.wealth <= 0) {
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#e7edf5";
    ctx.fill();
    drawDonutHole(ctx, center, radius);
    renderLegendItem("ยังไม่มีข้อมูล", 0, "#dfe6f1");
    return;
  }

  let start = -Math.PI / 2;
  for (const slice of slices) {
    const angle = (slice.value / totals.wealth) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    start += angle;
    renderLegendItem(slice.asset.name || TYPE_LABELS[slice.asset.type], (slice.value / totals.wealth) * 100, slice.color);
  }

  drawDonutHole(ctx, center, radius);
  ctx.fillStyle = "#17324d";
  ctx.font = "700 18px Noto Sans Thai, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Wealth", center, center - 6);
  ctx.font = "600 15px Noto Sans Thai, sans-serif";
  ctx.fillText(formatMoney(totals.wealth), center, center + 20);
}

function drawDonutHole(ctx, center, radius) {
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function renderLegendItem(label, percent, color) {
  const item = document.createElement("div");
  item.className = "legend-item";
  item.innerHTML = `
    <span class="legend-color" style="background:${color}"></span>
    <span>${escapeHtml(label)}</span>
    <strong>${formatPercent(percent)}</strong>
  `;
  elements.chartLegend.appendChild(item);
}

function renderGrowthTables() {
  const quarterKeys = Object.keys(state.data.quarters).sort(compareQuarter);
  elements.quarterRows.innerHTML = "";
  elements.assetGrowthRows.innerHTML = "";

  const quarterSummaries = quarterKeys.map((key) => {
    const quarter = state.data.quarters[key];
    return { key, assets: quarter.assets, totals: getTotals(quarter.assets, { useSnapshot: true }) };
  });

  for (let index = quarterSummaries.length - 1; index >= 0; index -= 1) {
    const summary = quarterSummaries[index];
    const previous = quarterSummaries[index - 1];
    const growth = previous ? growthPercent(summary.totals.wealth, previous.totals.wealth) : null;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${summary.key}</td>
      <td>${formatMoney(summary.totals.wealth)}</td>
      <td class="${growth === null || growth >= 0 ? "positive" : "negative"}">${growth === null ? "-" : formatPercent(growth, true)}</td>
      <td>${summary.assets.length}</td>
      <td class="row-actions">
        <button class="delete-button" type="button" title="ลบข้อมูลไตรมาส" data-delete-quarter="${summary.key}">×</button>
      </td>
    `;
    elements.quarterRows.appendChild(row);
  }

  const latestKey = quarterKeys[quarterKeys.length - 1];
  const previousKey = quarterKeys[quarterKeys.length - 2];
  if (!latestKey) return;

  const latestAssets = mapAssetsByKey(state.data.quarters[latestKey].assets, { useSnapshot: true });
  const previousAssets = previousKey ? mapAssetsByKey(state.data.quarters[previousKey].assets, { useSnapshot: true }) : new Map();
  const latestTotal = getTotals(state.data.quarters[latestKey].assets, { useSnapshot: true }).wealth;

  for (const [key, latest] of latestAssets.entries()) {
    const previous = previousAssets.get(key);
    const growth = previous ? growthPercent(latest.value, previous.value) : null;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="asset-name">
          <strong>${escapeHtml(latest.name)}</strong>
          <span>${escapeHtml(TYPE_LABELS[latest.type] || latest.type)}</span>
        </div>
      </td>
      <td>${formatMoney(latest.value)}</td>
      <td class="${growth === null || growth >= 0 ? "positive" : "negative"}">${growth === null ? "-" : formatPercent(growth, true)}</td>
      <td>${formatPercent(latestTotal > 0 ? (latest.value / latestTotal) * 100 : 0)}</td>
      <td>${renderTrendText(key, quarterKeys)}</td>
    `;
    elements.assetGrowthRows.appendChild(row);
  }
}

function mapAssetsByKey(assets, options = {}) {
  const map = new Map();
  for (const asset of assets) {
    const key = assetKey(asset);
    const value = assetGrossValue(asset, options);
    if (!Number.isFinite(value)) continue;
    const existing = map.get(key);
    map.set(key, {
      key,
      name: asset.name || TYPE_LABELS[asset.type],
      type: asset.type,
      value: (existing?.value || 0) + value
    });
  }
  return map;
}

function renderTrendText(key, quarterKeys) {
  return quarterKeys
    .map((quarterKey) => {
      const asset = mapAssetsByKey(state.data.quarters[quarterKey].assets, { useSnapshot: true }).get(key);
      return `${quarterKey}: ${asset ? formatMoney(asset.value) : "-"}`;
    })
    .join(" · ");
}

function getPreviousSavedQuarter(key) {
  const keys = Object.keys(state.data.quarters).sort(compareQuarter);
  const index = keys.indexOf(key);
  if (index <= 0) return null;
  return state.data.quarters[keys[index - 1]];
}

function getAssetDetail(asset) {
  const parts = [TYPE_LABELS[asset.type] || "Asset"];
  if (Number.isFinite(asset.snapshotValue)) parts.push(`Snapshot ${formatMoney(asset.snapshotValue)}`);
  return parts.join(" · ");
}

function render() {
  renderQuarterOptions();
  renderSummary();
  renderRows();
  renderPieChart();
  renderGrowthTables();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

async function refreshQuotes() {
  state.lastUpdated = new Date();
  elements.statusText.textContent = "รีเฟรชข้อมูลบนหน้าจอแล้ว";
  render();
}

function handleFormSubmit(event) {
  event.preventDefault();
  const asset = readAssetFromForm();
  if (!asset) return;

  const quarter = currentQuarter();
  if (state.editingId) {
    const index = quarter.assets.findIndex((item) => item.id === state.editingId);
    if (index >= 0) quarter.assets[index] = { ...quarter.assets[index], ...asset, id: state.editingId, updatedAt: new Date().toISOString() };
    elements.statusText.textContent = "แก้ไข asset แล้ว";
  } else {
    quarter.assets.push({ ...asset, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: null });
    elements.statusText.textContent = "เพิ่ม asset แล้ว";
  }

  saveData();
  resetForm();
  render();
  refreshQuotes();
}

function readAssetFromForm() {
  const type = elements.typeInput.value;
  const name = elements.nameInput.value.trim() || TYPE_LABELS[type];
  const manualValue = Number(elements.valueInput.value);
  const investedPercent = clamp(Number(elements.investedPercentInput.value), 0, 100);

  if (!Number.isFinite(manualValue) || manualValue < 0) {
    elements.statusText.textContent = "กรุณากรอกมูลค่าปัจจุบันเป็นบาทให้ถูกต้อง";
    return null;
  }
  if (type !== "cash" && !Number.isFinite(investedPercent)) {
    elements.statusText.textContent = "กรุณากรอก % ที่ลงทุนจริงระหว่าง 0 ถึง 100";
    return null;
  }

  return {
    type,
    name,
    btcQuantity: 0,
    manualValue,
    investedPercent: type === "cash" ? 0 : investedPercent,
    snapshotValue: manualValue
  };
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
  updateFormMode();
  setActiveView("manage");
}

function deleteAsset(id) {
  currentQuarter().assets = currentQuarter().assets.filter((asset) => asset.id !== id);
  if (state.editingId === id) resetForm();
  saveData();
  render();
  refreshQuotes();
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
  for (const asset of quarter.assets) {
    asset.snapshotValue = Number(asset.manualValue) || 0;
  }
  quarter.savedAt = new Date().toISOString();
  saveData();
  elements.statusText.textContent = `บันทึก snapshot ${quarter.key} แล้ว`;
  render();
}

function createOrSwitchQuarter() {
  const key = elements.quarterInput.value || currentQuarterKey();
  if (!state.data.quarters[key]) {
    state.data.quarters[key] = { key, assets: [], savedAt: null };
  }
  state.data.currentQuarter = key;
  resetForm();
  saveData();
  render();
  refreshQuotes();
}

function addQuarterFromInputs() {
  const year = Number(elements.newQuarterYearInput.value);
  const quarterNumber = Number(elements.newQuarterNumberInput.value);
  if (!Number.isInteger(year) || year < 1900 || year > 2500 || !Number.isInteger(quarterNumber) || quarterNumber < 1 || quarterNumber > 4) {
    elements.quarterStatus.textContent = "กรุณากรอกปีและไตรมาสให้ถูกต้อง";
    return;
  }

  const key = `${year}-Q${quarterNumber}`;
  if (!state.data.quarters[key]) {
    state.data.quarters[key] = { key, assets: [], savedAt: null };
  }
  state.data.currentQuarter = key;
  resetForm();
  saveData();
  render();
}

function deleteQuarter(key) {
  const quarterKeys = Object.keys(state.data.quarters);
  if (quarterKeys.length <= 1) {
    elements.quarterStatus.textContent = "ต้องมีอย่างน้อย 1 ไตรมาสในระบบ";
    return;
  }

  const ok = window.confirm(`ลบข้อมูล ${key} ทั้งหมดใช่ไหม? การลบนี้ย้อนกลับไม่ได้`);
  if (!ok) return;

  const remoteId = state.data.quarters[key]?.remoteId;
  delete state.data.quarters[key];
  if (state.data.currentQuarter === key) {
    state.data.currentQuarter = Object.keys(state.data.quarters).sort(compareQuarter).reverse()[0];
  }
  resetForm();
  saveData();
  if (state.supabase && state.user && remoteId) {
    state.supabase.from("portfolio_quarters").delete().eq("id", remoteId).then(({ error }) => {
      if (error) elements.quarterStatus.textContent = error.message;
    });
  }
  render();
}

async function signIn(event) {
  event.preventDefault();
  if (!state.supabase) return;
  const email = elements.authEmailInput.value.trim();
  const password = elements.authPasswordInput.value;
  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) elements.authStatus.textContent = error.message;
}

async function signUp() {
  if (!state.supabase) return;
  const email = elements.authEmailInput.value.trim();
  const password = elements.authPasswordInput.value;
  const { error } = await state.supabase.auth.signUp({ email, password });
  elements.authStatus.textContent = error
    ? error.message
    : "สมัครแล้ว ถ้า Supabase เปิด email confirmation ไว้ ให้ยืนยันอีเมลก่อนเข้าสู่ระบบ";
}

async function signOut() {
  if (!state.supabase) return;
  await state.supabase.auth.signOut();
  state.user = null;
  state.remoteReady = false;
  renderAuth();
}

function updateFormMode() {
  const type = elements.typeInput.value;
  const isCash = type === "cash";
  elements.manualValueField.classList.remove("is-hidden");
  elements.investedPercentField.classList.toggle("is-hidden", isCash);
  elements.valueInput.required = true;
  elements.investedPercentInput.required = !isCash;
  elements.nameInput.placeholder = TYPE_LABELS[type] || "ชื่อรายการ";
  if (isCash) elements.investedPercentInput.value = "0";
  if (!isCash && !elements.investedPercentInput.value) elements.investedPercentInput.value = "100";
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
elements.authForm.addEventListener("submit", signIn);
elements.signUpButton.addEventListener("click", signUp);
elements.signOutButton.addEventListener("click", signOut);
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
refreshQuotes();
initSupabase();
