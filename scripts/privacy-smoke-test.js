"use strict";

// Smoke tests for the Privacy Lock masking core (public/privacy.js maskText).
// Only ฿ / บาท / THB portfolio amounts get masked to XXX; $, %, plain numbers stay.
// Run: node scripts/privacy-smoke-test.js

const { maskText } = require("../public/privacy.js");

let passed = 0, failed = 0;
function eq(name, got, want) {
  if (got === want) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}\n          got:  ${JSON.stringify(got)}\n          want: ${JSON.stringify(want)}`); }
}

console.log("\n[1] mask ฿ (baht) amounts");
eq("฿1,234,567 → ฿XXX", maskText("฿1,234,567"), "฿XXX");
eq("฿1,234.56 → ฿XXX", maskText("฿1,234.56"), "฿XXX");
eq("฿0 → ฿XXX", maskText("฿0"), "฿XXX");
eq("฿ 2,500,000 (space) → ฿ XXX", maskText("฿ 2,500,000"), "฿ XXX");
eq("มูลค่ารวม ฿12,345,678 → มูลค่ารวม ฿XXX", maskText("มูลค่ารวม ฿12,345,678"), "มูลค่ารวม ฿XXX");
eq("negative ฿-1,234 → ฿-XXX", maskText("฿-1,234"), "฿-XXX");

console.log("\n[2] mask bare number + บาท / THB");
eq("1,234.56 THB · 45.0% → XXX THB · 45.0%", maskText("1,234.56 THB · 45.0%"), "XXX THB · 45.0%");
eq("2,500,000 บาท → XXX บาท", maskText("2,500,000 บาท"), "XXX บาท");
eq("รวม 987,654 บาท → รวม XXX บาท", maskText("รวม 987,654 บาท"), "รวม XXX บาท");

console.log("\n[3] leave non-baht values untouched");
eq("$120,000 unchanged", maskText("$120,000"), "$120,000");
eq("$119.8B unchanged (Thesis)", maskText("~+24% YoY ($119.8B)"), "~+24% YoY ($119.8B)");
eq("45.6% unchanged", maskText("45.6%"), "45.6%");
eq("+12.34% unchanged", maskText("+12.34%"), "+12.34%");
eq("plain number 1,234,567 unchanged", maskText("1,234,567"), "1,234,567");
eq("score 85/100 unchanged", maskText("85/100"), "85/100");
eq("date 2026-07 unchanged", maskText("2026-07"), "2026-07");
eq("THBx (not a unit) unchanged", maskText("500 THBx"), "500 THBx");
eq("header '฿ บาท' (no digits) unchanged", maskText("฿ บาท"), "฿ บาท");

console.log("\n[4] mixed / multiple in one string");
eq("two baht amounts", maskText("ลงทุน ฿5,000,000 · เงินสด ฿1,200,000"), "ลงทุน ฿XXX · เงินสด ฿XXX");
eq("baht + percent together", maskText("฿3,400,000 (+8.5%)"), "฿XXX (+8.5%)");
eq("baht + dollar together (only baht masked)", maskText("฿3,400,000 ≈ $95,000"), "฿XXX ≈ $95,000");

console.log("\n[5] edge / safety");
eq("null passthrough", maskText(null), null);
eq("empty string", maskText(""), "");
eq("no-op idempotent (฿XXX stays)", maskText(maskText("฿1,234,567")), "฿XXX");

console.log(`\n${passed + failed} checks · ${passed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
