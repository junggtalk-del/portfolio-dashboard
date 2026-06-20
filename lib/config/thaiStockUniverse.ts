export type ThaiStockUniverseItem = {
  displaySymbol: string;
  providerSymbol: string;
  name: string;
  market: "SET" | "mai";
  assetType: "THAI_STOCK";
  currency: "THB";
  universe: "SET100" | "mai" | "CUSTOM";
};

// Runtime code imports the CommonJS sibling file because this project is served as plain Node/static JS.
// This TypeScript shape is kept here to document and preserve the requested SET100 config contract.
export const scanUniverse = "SET100";
export const SET100_UNIVERSE: ThaiStockUniverseItem[] = [];
export const MAI_UNIVERSE: ThaiStockUniverseItem[] = [];
export function getThaiStockUniverse(_scanUniverse: "SET100" | "MAI" | "SET100_MAI" | "CUSTOM"): ThaiStockUniverseItem[] {
  return [];
}
