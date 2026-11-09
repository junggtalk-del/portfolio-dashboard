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

// หุ้นต่างประเทศของไตรมาสปัจจุบันตามหน้า AI Portfolio Manager (spec 2026-11-09-pm-foreign-sleeve-design.md · Addendum)
const PM_SYNC_STATUS_TH = "หุ้นต่างประเทศอัปเดตจาก AI Portfolio Manager แล้ว — จะบันทึกพร้อมการแก้ครั้งถัดไป";
const PM_FOREIGN_LOCKED_TH = "หุ้นต่างประเทศดึงจาก AI Portfolio Manager — แก้มูลค่าที่หน้านั้น";
const PM_DELETE_TITLE_TH = "แก้มูลค่าที่หน้า AI Portfolio Manager";
// ไตรมาสล่าสุดของเอกสารจบแล้วตามปฏิทิน (ForeignSleeve reason "quarter-ended" · Addendum ข้อ 5) → ไม่ซิงก์ ไม่ล็อก
//   ค่าที่เก็บไว้ = ค่าล่าสุดที่หน้า PM เขียนลงไตรมาสนี้ก่อนสิ้นไตรมาส (หน้า PM เขียนแถวทุกครั้งที่บันทึกเงินสด/มูลค่าหุ้น)
const PM_QUARTER_ENDED_TH = "ไตรมาสนี้จบแล้วตามปฏิทิน — ค่าหุ้นต่างประเทศที่เก็บไว้คือประวัติของไตรมาสนี้ (แก้ได้) · สร้างไตรมาสใหม่เพื่อให้ตาม AI Portfolio Manager";
// โหลดเอกสารจาก server ครั้งแรกไม่สำเร็จ → state.data เป็นแค่ไตรมาสว่างของปฏิทิน · PUT ตอนนี้ = ประวัติทุกไตรมาสบน server หาย
const NOT_LOADED_TH = "ยังโหลดข้อมูลพอร์ตจาก server ไม่สำเร็จ — ยังไม่บันทึกเพื่อกันข้อมูลหาย (ลองรีเฟรชหน้าจอ)";

const state = {
  data: emptyData(),
  editingId: null,
  activeView: "overview",
  saving: false,
  hydrating: true,
  // true หลัง loadRemoteData สำเร็จเท่านั้น (เอกสารว่างบน server ก็นับว่าโหลดแล้ว) · false = ห้าม PUT / ห้ามซิงก์ / ห้ามรับคีย์จาก server ทับ
  loaded: false,
  lastUpdated: null,
  storageMode: "supabase",
  // true = แถวหุ้นต่างประเทศของไตรมาสที่เปิดอยู่ซิงก์จากหน้า PM แล้วและถูกล็อก (ตั้งโดย syncForeignFromPM เท่านั้น)
  foreignFromPM: false,
  // เหตุผลที่ไม่ซิงก์ของรอบล่าสุด (ForeignSleeve.sleeveOf reason · null = ซิงก์แล้ว / ยังไม่เคยดู)
  pmReason: null,
  // รายการหุ้นของหน้า PM ที่โหลดล่าสุด · null = ยังไม่โหลด (= โหมด editor)
  pmHoldings: null,
  pmRefreshing: false,
  // รอบดึงรายการหุ้นที่กำลังค้าง (Promise) — saveSnapshot รอรอบนี้ก่อนแช่ค่า · null = ไม่มีรอบค้าง
  pmRefreshRun: null,
  // ซิงก์ถูกข้ามเพราะฟอร์มแก้ไขเปิดอยู่ → ทำต่อตอนฟอร์มปิด (resetForm) / ก่อนบันทึก
  pmSyncPending: false
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
  netFlowInput: document.querySelector("#netFlowInput"),
  pmLockNote: document.querySelector("#pmLockNote"),
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
    // ได้คำตอบจาก server แล้ว (เอกสารว่าง = ผู้ใช้ใหม่ เริ่มกรอกได้) → บันทึก / ซิงก์ได้
    state.loaded = true;
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
  // โหลดครั้งแรกไม่สำเร็จ: state.data มีแค่ไตรมาสว่างของปฏิทิน → PUT จะเขียนทับประวัติทุกไตรมาสบน server
  //   (server รับเอกสารไตรมาสเดียวได้) → ไม่ส่ง บอกผู้ใช้ · กลับมาที่แท็บ / กดรีเฟรช = โหลดใหม่ (reloadRemoteData)
  if (!state.loaded) {
    elements.statusText.textContent = NOT_LOADED_TH;
    return;
  }
  state.saving = true;
  elements.statusText.textContent =
    state.storageMode === "local-fallback"
      ? "กำลังบันทึกลง local fallback..."
      : "กำลังบันทึกลง database...";
  let resynced = false;
  try {
    const sleeveBefore = JSON.stringify(state.data.foreignSleeve === undefined ? null : state.data.foreignSleeve);
    await adoptServerAllocation();
    const sleeveAfter = JSON.stringify(state.data.foreignSleeve === undefined ? null : state.data.foreignSleeve);
    // เงินสดรอซื้อเพิ่งเปลี่ยนในหน้า PM (หรือมีซิงก์ค้าง) → ซิงก์แถวหุ้นต่างประเทศก่อนส่ง ไม่งั้นบันทึกค่าตามเงินสดเก่า
    //   ฟอร์มแก้ไขยังเปิดอยู่ → ไม่ซิงก์ใต้ฟอร์ม จำไว้ทำตอนฟอร์มปิด
    if (sleeveAfter !== sleeveBefore || state.pmSyncPending) {
      if (state.editingId) state.pmSyncPending = true;
      else resynced = syncForeignFromPM();
    }
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
    // ซิงก์ใหม่ระหว่างบันทึก = แถวในตารางเปลี่ยน → วาดทั้งหน้า
    if (resynced) render(); else renderSummary();
  }
}

// หน้านี้ไม่ได้แก้ allocation (แบ่งพอร์ต / แผนเกษียณ / เงินเติมไตรมาสละ ที่ตั้งในหน้า /portfolio) · allocationPlan · foreignSleeve
// จึงต้องใช้ฉบับล่าสุดบน server ทุกครั้งก่อนบันทึก ไม่งั้นแท็บนี้ที่เปิดค้างไว้จะเขียนทับค่าที่เพิ่งตั้งด้วยของเก่า
// อ่านไม่ได้ (เช่นเน็ตหลุด) ก็บันทึกไตรมาสต่อด้วยข้อมูลที่มี — ไม่ขวางการบันทึก
// ยังโหลดเอกสารไม่สำเร็จ (state.loaded false) → ไม่รับคีย์ใด ๆ มาวางบนเอกสารว่าง (ต้องโหลดใหม่ทั้งเอกสารแทน)
async function adoptServerAllocation() {
  if (!state.loaded) return;
  try {
    const response = await fetch("/api/portfolio", { cache: "no-store", headers: portfolioHeaders() });
    if (!response.ok) return;
    const payload = await readJsonResponse(response);
    const latest = payload && payload.data;
    if (latest && Object.prototype.hasOwnProperty.call(latest, "allocation")) state.data.allocation = latest.allocation;
    // กรอบเงินสดของการ์ด Asset allocation (/portfolio) — หน้านี้ไม่ได้แก้เช่นกัน ใช้ฉบับบน server
    if (latest && Object.prototype.hasOwnProperty.call(latest, "allocationPlan")) state.data.allocationPlan = latest.allocationPlan;
    // เงินสดรอซื้อหุ้นต่างประเทศ (ช่อง cash หน้า AI Portfolio Manager) — หน้านี้ไม่ได้แก้เช่นกัน ใช้ฉบับบน server
    if (latest && Object.prototype.hasOwnProperty.call(latest, "foreignSleeve")) state.data.foreignSleeve = latest.foreignSleeve;
  } catch (error) {
    // อ่านไม่ได้ — บันทึกต่อด้วยข้อมูลที่มี
  }
}

function saveData() {
  persistRemoteData();
}

// โหลดครั้งแรกไม่สำเร็จ → กลับมาที่แท็บ / กดรีเฟรช = โหลดเอกสารใหม่ทั้งก้อน (ไม่ใช่รับคีย์ทีละคีย์มาวางบนเอกสารว่าง)
//   สำเร็จ → ดึงรายการหุ้นของหน้า PM แล้วซิงก์ตามปกติ · กำลังโหลดอยู่ (focus + visibilitychange มาคู่กัน) = ไม่ยิงซ้ำ
async function reloadRemoteData() {
  if (state.hydrating) return false;
  await loadRemoteData();
  if (!state.loaded) return false;
  return refreshForeignFromPM({});
}

// ---------------------------------------------------------------- หุ้นต่างประเทศตามหน้า AI Portfolio Manager
// รายการหุ้นของหน้า PM: server ก่อน (ส่งรหัสผ่านแบบเดียวกับเอกสารพอร์ต) · อ่านไม่ได้ = ฉบับใน data snapshot
// · ไม่มีทั้งคู่ = [] (โหมด editor — ไม่ล็อกอะไร กรอกเองตามปกติ) · ไม่ throw
async function fetchPMHoldings() {
  try {
    const response = await fetch("/api/portfolio-holdings", { cache: "no-store", headers: portfolioHeaders() });
    if (response.ok) {
      const payload = await readJsonResponse(response);
      if (payload && Array.isArray(payload.data)) return payload.data;
    }
  } catch (error) {
    // เน็ตหลุด / server ไม่พร้อม → ใช้ฉบับใน snapshot
  }
  try {
    const snapshot = window.PortfolioDataSnapshot && typeof window.PortfolioDataSnapshot.read === "function" ? window.PortfolioDataSnapshot.read() : null;
    const list = snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data;
    if (Array.isArray(list)) return list;
  } catch (error) {
    // อ่าน snapshot ไม่ได้ → โหมด editor
  }
  return [];
}

// แถวหุ้นต่างประเทศของไตรมาสที่เปิดอยู่ใน state ตามหน้า PM (ForeignSleeve — โมดูลเดียวกับทุกหน้า)
//   โหมด pm (กรอกเงินสดในหน้า PM แล้ว + มีรายการหุ้น + ไตรมาสที่เปิด = ไตรมาสล่าสุด) → แทนแถว foreign-stock ทุกแถวด้วยแถวเดียว:
//   คงชื่อ/id ของแถวแรก (ตัวคิดผลตอบแทนจับคู่ข้ามไตรมาสด้วย type+name) · มูลค่ารวม/% ลงทุนจริงจาก PM
//   · เงินเติม/ถอนรวมของทุกแถว · ไม่มี fromPM (state นี้คือสิ่งที่ถูก PUT)
//   ไตรมาสนี้ยังไม่มีแถวหุ้นต่างประเทศ (เช่นเพิ่งเพิ่มไตรมาสใหม่) → แถวใหม่ชื่อตาม ForeignSleeve.newRowNameOf
//   (ชื่อแถวหุ้นต่างประเทศแรกของไตรมาสก่อน — ตัวเดียวกับที่ผู้อ่านทุกหน้าและหน้า PM ใช้ ชื่อจึงตรงกันทุกทาง)
//   โหมดอื่น (รวม quarter-ended = ไตรมาสล่าสุดจบแล้วตามปฏิทิน · Addendum ข้อ 5) → foreignFromPM = false และไม่แตะ state
//   state.pmReason = เหตุผลของโมดูล (null = ซิงก์แล้ว) · ล้างซิงก์ที่ค้าง (pmSyncPending)
//   ยังโหลดเอกสารไม่สำเร็จ (state.loaded false) → ไม่ซิงก์ ไม่ล็อก (state.data เป็นแค่ไตรมาสว่างของปฏิทิน)
// ไม่บันทึกเอง — ค่าที่ซิงก์ไปกับการบันทึกครั้งถัดไปของหน้านี้ · คืน true เมื่อรายการในไตรมาสเปลี่ยนจริง
function syncForeignFromPM() {
  if (!state.loaded) {
    state.foreignFromPM = false;
    state.pmReason = null;
    return false;
  }
  const FS = window.ForeignSleeve;
  const quarter = currentQuarter();
  const sleeve = FS && typeof FS.sleeveOf === "function" ? FS.sleeveOf(state.data, state.pmHoldings || []) : null;
  state.pmSyncPending = false;
  if (!sleeve || sleeve.source !== "pm") {
    state.foreignFromPM = false;
    state.pmReason = sleeve ? sleeve.reason : null;
    return false;
  }
  state.foreignFromPM = true;
  state.pmReason = null;
  const before = Array.isArray(quarter.assets) ? quarter.assets : [];
  let base = before;
  if (!before.some((asset) => asset && asset.type === "foreign-stock")) {
    base = [...before, {
      id: crypto.randomUUID(),
      type: "foreign-stock",
      name: typeof FS.newRowNameOf === "function" ? FS.newRowNameOf(state.data) : TYPE_LABELS["foreign-stock"],
      createdAt: new Date().toISOString(),
      updatedAt: null
    }];
  }
  const next = FS.applyToAssets(base, sleeve, { mark: false });
  // แถวที่แทนเป็นสำเนาใหม่เสมอ — แถวเดิมไม่มี id (ข้อมูลเก่า) → ให้ id ปุ่มแก้ไขจะได้อ้างถึงได้
  const synced = next.find((asset) => asset && asset.type === "foreign-stock");
  if (synced && !synced.id) synced.id = crypto.randomUUID();
  if (JSON.stringify(next) === JSON.stringify(before)) return false;
  quarter.assets = next;
  return true;
}

// โหลดรายการหุ้นของหน้า PM → ซิงก์ → วาดใหม่ (ไม่บันทึก)
//   ตอนเปิดหน้า: เรียกหลัง loadRemoteData โดยส่ง holdings ที่เริ่มโหลดคู่ขนานไว้ (options.holdings = Promise)
//   ตอนกลับมาที่แท็บ: options.adoptServer → รับ foreignSleeve/allocation ฉบับ server ก่อน (เงินสดอาจเพิ่งแก้ในหน้า PM)
//   ข้ามเมื่อมีรอบอื่นค้าง / กำลังโหลดเอกสาร · กำลังแก้รายการในฟอร์ม = ไม่ทับสิ่งที่กำลังพิมพ์ แต่จำไว้ (pmSyncPending)
//   แล้วซิงก์ตอนฟอร์มปิด (resetForm → runPendingPMSync)
//   รอบที่ค้างเก็บไว้ที่ state.pmRefreshRun — saveSnapshot รอให้จบก่อนแช่ค่า
async function refreshForeignFromPM(options = {}) {
  if (state.pmRefreshing || state.hydrating) return false;
  if (state.editingId) {
    state.pmSyncPending = true;
    return false;
  }
  state.pmRefreshing = true;
  const run = pullPMHoldings(options);
  state.pmRefreshRun = run;
  try {
    return await run;
  } finally {
    state.pmRefreshing = false;
    state.pmRefreshRun = null;
  }
}

// ตัวรอบดึงของ refreshForeignFromPM: รายการหุ้น (+ คีย์ allocation/foreignSleeve ฉบับ server เมื่อ adoptServer) → ซิงก์
//   รับคีย์จาก server เฉพาะหลังโหลดเอกสารสำเร็จ (adoptServerAllocation กันซ้ำอีกชั้น)
async function pullPMHoldings(options) {
  const pending = [options.holdings || fetchPMHoldings()];
  if (options.adoptServer && state.loaded) pending.push(adoptServerAllocation());
  const [holdings] = await Promise.all(pending);
  state.pmHoldings = Array.isArray(holdings) ? holdings : [];
  if (state.hydrating) return false;
  // ระหว่างรอ ผู้ใช้กดแก้รายการ → จำไว้ ซิงก์ตอนฟอร์มปิด
  if (state.editingId) {
    state.pmSyncPending = true;
    return false;
  }
  return applyPMSync();
}

// ซิงก์ + วาดใหม่เมื่อค่า / สถานะล็อก / เหตุผลเปลี่ยน (focus เกิดบ่อย) + ข้อความสถานะ — ใช้ร่วมกันโดยรอบดึงใหม่และซิงก์ที่ค้าง
function applyPMSync() {
  const wasLocked = state.foreignFromPM;
  const wasReason = state.pmReason;
  const changed = syncForeignFromPM();
  if (changed || wasLocked !== state.foreignFromPM || wasReason !== state.pmReason) render();
  if (changed) elements.statusText.textContent = PM_SYNC_STATUS_TH;
  else if (state.pmReason === "quarter-ended" && wasReason !== "quarter-ended") elements.statusText.textContent = PM_QUARTER_ENDED_TH;
  return changed;
}

// ซิงก์ที่ถูกข้ามไว้ (ฟอร์มแก้ไขเปิดอยู่ตอน holdings มา / ตอนกลับมาที่แท็บ / ตอนบันทึกรับเงินสดใหม่) → ทำเมื่อฟอร์มปิด
//   ใช้ holdings ที่โหลดไว้ล่าสุด · เรียกจาก resetForm (ปิดฟอร์มทุกทาง รวมส่งฟอร์มก่อน saveData)
function runPendingPMSync() {
  if (!state.pmSyncPending || state.editingId || state.hydrating) return false;
  return applyPMSync();
}

// กลับมาที่แท็บ (เช่นเพิ่งไปแก้หุ้น/เงินสดในหน้า AI Portfolio Manager) → ดึงค่าล่าสุด
//   ยังโหลดเอกสารไม่สำเร็จ → โหลดใหม่ทั้งเอกสาร (ไม่รับ foreignSleeve มาวางบนเอกสารว่างแล้วซิงก์)
function onEditorTabReturn() {
  if (document.hidden) return;
  if (!state.loaded) {
    reloadRemoteData();
    return;
  }
  refreshForeignFromPM({ adoptServer: true });
}

// แถวที่ล็อกตาม PM = แถวหุ้นต่างประเทศของไตรมาสที่เปิดอยู่ ขณะโหมด pm (ซิงก์แล้วเหลือแถวเดียว)
function isPMSyncedAsset(asset) {
  return Boolean(state.foreignFromPM && asset && asset.type === "foreign-stock");
}

// ฟอร์มแก้แถวที่ล็อก: ปิดช่องมูลค่า / % ลงทุนจริง / ประเภท + แสดงคำอธิบาย · ชื่อกับเงินเติม/ถอนยังแก้ได้
function setFormPMLock(locked) {
  elements.valueInput.disabled = locked;
  elements.investedPercentInput.disabled = locked;
  elements.typeInput.disabled = locked;
  if (elements.pmLockNote) elements.pmLockNote.classList.toggle("is-hidden", !locked);
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

// รายการเก่าที่ยังไม่เคยบันทึกเงินเติม/ถอน ต้องแยกออกจาก "บันทึกว่าเป็น 0" ให้เห็น
function formatNetFlow(value) {
  if (value === null || value === undefined || value === "") return '<span title="ยังไม่มีข้อมูลเงินเติม/ถอน — หน้า Asset Allocation จะคิดเป็น 0 และทำเครื่องหมายไว้">—</span>';
  const n = Number(value);
  if (!Number.isFinite(n)) return '<span title="ค่าไม่ถูกต้อง">—</span>';
  if (n === 0) return "฿0";
  return `${n > 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`;
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
  const savedLine = quarter.savedAt ? `บันทึก ${quarter.key} ล่าสุด ${new Date(quarter.savedAt).toLocaleString("th-TH")}` : `${quarter.key} ยังไม่เคยบันทึก snapshot`;
  // ไตรมาสล่าสุดจบแล้วตามปฏิทิน → บอกค้างไว้ที่แถบไตรมาส (ข้อความสถานะในฟอร์มถูกทับเมื่อบันทึก)
  elements.quarterStatus.textContent = state.pmReason === "quarter-ended" ? `${savedLine} · ${PM_QUARTER_ENDED_TH}` : savedLine;
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
    // แถวหุ้นต่างประเทศที่ซิงก์จากหน้า PM: ป้ายบอกที่มา + ลิงก์ · ลบไม่ได้ (title ไม่มีตัวเงิน)
    const fromPM = isPMSyncedAsset(asset);
    const badge = fromPM ? '<a class="pm-source-badge" href="/portfolio-manager">จาก AI Portfolio Manager</a>' : "";
    const deleteLock = fromPM ? ` disabled title="${escapeHtml(PM_DELETE_TITLE_TH)}"` : "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><div class="asset-name"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(TYPE_LABELS[asset.type] || asset.type)}</span>${badge}</div></td>
      <td>${formatMoney(metrics.gross)}</td>
      <td>${formatNetFlow(asset.netFlow)}</td>
      <td>${formatPercent(metrics.portfolioPercent)}</td>
      <td>${asset.type === "cash" ? "-" : formatPercent(metrics.investedPercent)}</td>
      <td>${formatMoney(metrics.invested)}</td>
      <td>${formatMoney(metrics.cash)}</td>
      <td class="row-actions"><button class="icon-button edit-button" type="button" data-edit-id="${asset.id}">แก้ไข</button><button class="delete-button" type="button" data-delete-id="${asset.id}"${deleteLock}>×</button></td>`;
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
  // สีผูกกับลำดับที่บันทึกข้อมูล (index เดิม) เพื่อให้สินทรัพย์ตัวเดิมได้สีเดิมทุกไตรมาส
  // แล้วค่อยเรียงจากมากไปน้อย — ทั้งวงกลมและ legend ใช้ลำดับเดียวกันนี้
  const slices = assets
    .map((asset, index) => ({ asset, value: assetGrossValue(asset), color: CHART_COLORS[index % CHART_COLORS.length] }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
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
  // ยังโหลดเอกสารไม่สำเร็จ → ปุ่มรีเฟรช = ลองโหลดใหม่ทั้งเอกสาร (ข้อความสถานะมาจากรอบโหลด)
  if (!state.loaded) {
    reloadRemoteData();
    return;
  }
  state.lastUpdated = new Date();
  elements.statusText.textContent = "รีเฟรชหน้าจอแล้ว";
  render();
  // ดึงหุ้นต่างประเทศจากหน้า PM รอบใหม่ด้วย (ไม่บันทึก · กำลังแก้รายการอยู่ = ข้าม)
  refreshForeignFromPM({ adoptServer: true });
}

function readAssetFromForm() {
  const type = elements.typeInput.value;
  const manualValue = Number(elements.valueInput.value);
  const investedPercent = clamp(Number(elements.investedPercentInput.value), 0, 100);
  if (!Number.isFinite(manualValue) || manualValue < 0) {
    elements.statusText.textContent = "กรุณากรอกมูลค่าปัจจุบันเป็นบาทให้ถูกต้อง";
    return null;
  }
  const rawFlow = elements.netFlowInput ? elements.netFlowInput.value.trim() : "";
  const netFlow = rawFlow === "" ? 0 : Number(rawFlow);
  if (!Number.isFinite(netFlow)) {
    elements.statusText.textContent = "กรุณากรอกเงินเติม/ถอนเป็นตัวเลข (ติดลบได้ เว้นว่าง = 0)";
    return null;
  }
  return { type, name: elements.nameInput.value.trim() || TYPE_LABELS[type], manualValue, investedPercent: type === "cash" ? 0 : investedPercent, snapshotValue: manualValue, netFlow };
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (state.hydrating) {
    elements.statusText.textContent = "กำลังโหลดข้อมูลอยู่ — ลองอีกครั้งในอีกสักครู่";
    return;
  }
  const asset = readAssetFromForm();
  if (!asset) return;
  const quarter = currentQuarter();
  const index = state.editingId ? quarter.assets.findIndex((item) => item.id === state.editingId) : -1;
  const existing = index >= 0 ? quarter.assets[index] : null;
  const lockedRow = isPMSyncedAsset(existing);
  // โหมด pm: หุ้นต่างประเทศมีได้แถวเดียว (แถวที่ซิงก์) — เพิ่มใหม่ / เปลี่ยนรายการอื่นเป็นหุ้นต่างประเทศไม่ได้
  if (state.foreignFromPM && asset.type === "foreign-stock" && !lockedRow) {
    elements.statusText.textContent = PM_FOREIGN_LOCKED_TH;
    return;
  }
  if (state.editingId) {
    // แถวที่ซิงก์: มูลค่ารวม / % ลงทุนจริง / ประเภท คงค่าจาก PM — รับเฉพาะชื่อและเงินเติม/ถอน
    const changes = lockedRow ? { name: elements.nameInput.value.trim() || TYPE_LABELS[existing.type], netFlow: asset.netFlow } : asset;
    if (index >= 0) quarter.assets[index] = { ...existing, ...changes, id: state.editingId, updatedAt: new Date().toISOString() };
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
  if (elements.netFlowInput) elements.netFlowInput.value = Number.isFinite(Number(asset.netFlow)) && asset.netFlow !== null && asset.netFlow !== "" ? String(asset.netFlow) : "0";
  elements.formTitle.textContent = "แก้ไขรายการพอร์ต";
  elements.submitButton.textContent = "บันทึกการแก้ไข";
  elements.cancelEditButton.classList.remove("is-hidden");
  updateFormMode(); setFormPMLock(isPMSyncedAsset(asset)); setActiveView("manage");
  // แถวหุ้นต่างประเทศของไตรมาสที่จบแล้ว: แก้เองได้ตามปกติ แต่บอกว่าทำไมไม่ตาม AI Portfolio Manager
  if (asset.type === "foreign-stock" && state.pmReason === "quarter-ended") elements.statusText.textContent = PM_QUARTER_ENDED_TH;
}

function deleteAsset(id) {
  // แถวหุ้นต่างประเทศที่ซิงก์จากหน้า PM ลบไม่ได้ (ปุ่มถูกปิดอยู่แล้ว — กันทางอื่นด้วย)
  if (isPMSyncedAsset(currentQuarter().assets.find((asset) => asset.id === id))) {
    elements.statusText.textContent = PM_FOREIGN_LOCKED_TH;
    return;
  }
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
  setFormPMLock(false);
  updateFormMode();
  // ฟอร์มปิดแล้ว → ทำซิงก์ที่ค้างไว้ (+ วาดใหม่) ก่อนผู้เรียกบันทึก
  runPendingPMSync();
}

async function saveSnapshot() {
  // ปิดฟอร์มก่อน (แบบปุ่มไตรมาสอื่น ๆ): ค่าที่พิมพ์ค้างไม่ถูกบันทึก และการซิงก์ด้านล่างไม่เปลี่ยนสถานะล็อกใต้ฟอร์มที่เปิดอยู่
  resetForm();
  // รอบดึงรายการหุ้นยังค้าง (เช่นเพิ่งกลับมาที่แท็บ) → รอให้จบก่อน ไม่งั้นแช่ค่าจากรายการหุ้นชุดเก่า
  if (state.pmRefreshRun) {
    try {
      await state.pmRefreshRun;
    } catch (error) {
      // ดึงไม่ได้ — แช่ด้วยรายการหุ้นที่มีอยู่
    }
    // ระหว่างรอ ผู้ใช้เปิดฟอร์มแก้ไขอีก → ปิดก่อนแช่ (กติกาเดียวกับด้านบน)
    if (state.editingId) resetForm();
  }
  // แช่ค่าหุ้นต่างประเทศล่าสุดจากหน้า PM เป็นประวัติของไตรมาสนี้ (โหมด editor = ไม่แตะ)
  syncForeignFromPM();
  const quarter = currentQuarter();
  for (const asset of quarter.assets) asset.snapshotValue = Number(asset.manualValue) || 0;
  quarter.savedAt = new Date().toISOString();
  render(); saveData();
}

function createOrSwitchQuarter() {
  const key = elements.quarterInput.value || currentQuarterKey();
  if (!state.data.quarters[key]) state.data.quarters[key] = { key, assets: [], savedAt: null };
  state.data.currentQuarter = key;
  // ไตรมาสล่าสุด + โหมด pm → ซิงก์/ล็อก · ไตรมาสเก่า → ปลดล็อก ไม่ทับประวัติ
  resetForm(); syncForeignFromPM(); render(); saveData();
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
  resetForm(); syncForeignFromPM(); render(); saveData();
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
  // โหมด pm: หุ้นต่างประเทศของไตรมาสนี้มาจากหน้า PM แล้ว (แถวเดียว) → ไม่คัดลอกแถวหุ้นต่างประเทศของไตรมาสก่อน
  const toCopy = sourceAssets.filter((asset) => !existingKeys.has(assetKey(asset)) && !(state.foreignFromPM && asset.type === "foreign-stock"));
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
      netFlow: 0,
      createdAt: now,
      updatedAt: null,
      copiedFrom: previous.key
    });
  }
  resetForm();
  syncForeignFromPM();
  render();
  saveData();
  elements.quarterStatus.textContent = `คัดลอก ${toCopy.length} รายการจาก ${previous.key} มา ${target.key} แล้ว${skipped ? ` (ข้าม ${skipped} รายการซ้ำ)` : ""} — ปรับมูลค่าแล้วกด “บันทึกไตรมาสนี้”`;
}

function deleteQuarter(key) {
  if (Object.keys(state.data.quarters).length <= 1) return;
  if (!window.confirm(`ลบข้อมูล ${key} ทั้งหมดใช่ไหม?`)) return;
  delete state.data.quarters[key];
  if (state.data.currentQuarter === key) state.data.currentQuarter = Object.keys(state.data.quarters).sort(compareQuarter).reverse()[0];
  // ไตรมาสที่เปิดอยู่อาจกลายเป็นไตรมาสล่าสุด → ตั้งโหมดใหม่
  resetForm(); syncForeignFromPM(); render(); saveData();
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
// รายการหุ้นของหน้า PM โหลดคู่ขนานกับเอกสารพอร์ต → ซิงก์แถวหุ้นต่างประเทศหลังเอกสารมาแล้ว (ไม่บันทึกเองตอนเปิดหน้า)
//   โหลดเอกสารไม่สำเร็จ → ไม่ซิงก์ (ข้อความผิดพลาดคงอยู่) · กลับมาที่แท็บ / กดรีเฟรช = โหลดใหม่
const initialPMHoldings = fetchPMHoldings();
loadRemoteData().then(() => {
  if (state.loaded) refreshForeignFromPM({ holdings: initialPMHoldings });
});
window.addEventListener("focus", onEditorTabReturn);
document.addEventListener("visibilitychange", onEditorTabReturn);
