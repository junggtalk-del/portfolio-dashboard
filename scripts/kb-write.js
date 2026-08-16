// KB writer — เขียน public/thesis-data.js จาก patch file (ใช้แทน heredoc สคริปต์ชั่วคราว)
//
// วิธีใช้:  node scripts/kb-write.js <patch.json>
//
// patch.json รูปแบบ: { "TICKER": { "<dotted.path>": <value>, ... }, ... }
//   - dotted path ชี้ตำแหน่งใน company object เช่น "history.epsBasis", "forwardView", "asOf"
//   - value = null  → ลบ key นั้น
//   - path ที่ยังไม่มี object กลางทาง จะสร้างให้อัตโนมัติ
//
// เหตุผลที่มีไฟล์นี้: ตรรกะ mutate + rewrite เคยอยู่ในสคริปต์ชั่วคราวที่เขียนใหม่ทุกครั้ง
// (ตรวจทานยาก + สะดุด permission classifier ทุกรอบ) ย้ายมาเป็นไฟล์ถาวรที่ review แล้วครั้งเดียว
"use strict";
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "public", "thesis-data.js");
const HEADER = '(function () {\n  "use strict";\n  // ============================================================\n  // Investment Thesis — CURATED knowledge base. Structural judgment\n  // plane of the Thesis Engine (fundamentals / revenue quality / AI\n  // execution / moat / capital allocation / QoQ changes / risks).\n  // NOT live data — see per-company asOf stamps. Live overlays come\n  // from the running system at compute time.\n  // ============================================================\n  var ThesisData = ';
const FOOTER = ';\n  if (typeof window !== "undefined") window.ThesisData = ThesisData;\n  if (typeof module !== "undefined" && module.exports) module.exports = ThesisData;\n})();\n';

function setPath(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  const last = parts[parts.length - 1];
  if (value === null) delete cur[last];
  else cur[last] = value;
}

const patchFile = process.argv[2];
if (!patchFile) {
  console.error("usage: node scripts/kb-write.js <patch.json>");
  process.exit(1);
}
const patch = JSON.parse(fs.readFileSync(patchFile, "utf8"));
const DATA = require(DATA_PATH);

const applied = [];
for (const ticker of Object.keys(patch)) {
  const company = DATA.companies[ticker];
  if (!company) { console.error("unknown ticker in patch: " + ticker); process.exit(1); }
  for (const dotted of Object.keys(patch[ticker])) {
    setPath(company, dotted, patch[ticker][dotted]);
    applied.push(ticker + "." + dotted);
  }
}

fs.writeFileSync(DATA_PATH, HEADER + JSON.stringify(DATA, null, 2) + FOOTER, "utf8");
console.log("wrote " + applied.length + " field(s): " + applied.join(", "));
