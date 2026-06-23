"use strict";

// Guards against catastrophic overwrites: an empty/null/garbage payload must
// never be allowed to replace the whole portfolio blob in the database.
// A legitimate portfolio is a plain object with a non-empty `quarters` map.
function isValidPortfolioData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const quarters = data.quarters;
  if (!quarters || typeof quarters !== "object" || Array.isArray(quarters)) return false;
  if (Object.keys(quarters).length < 1) return false;
  return true;
}

module.exports = { isValidPortfolioData };
