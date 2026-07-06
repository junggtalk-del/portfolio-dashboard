"use strict";

// Public reference provider — does NOT fetch values. It supplies stable public
// chart links per metric so the UI can show "Public chart available / มีกราฟอ้างอิง"
// with an "Open source" button instead of an empty card when no API value exists.
// These are public chart pages (opened in a new tab); we do not scrape them.

const REFERENCES = {
  mvrvZScore: [
    { name: "Bitcoin Magazine Pro — MVRV Z-Score", url: "https://www.bitcoinmagazinepro.com/charts/mvrv-zscore/", type: "public_chart" },
    { name: "Bitbo — MVRV Z-Score", url: "https://charts.bitbo.io/mvrv-zscore/", type: "public_chart" }
  ],
  mvrvRatio: [
    { name: "Bitcoin Magazine Pro — MVRV Ratio", url: "https://www.bitcoinmagazinepro.com/charts/mvrv-ratio/", type: "public_chart" },
    { name: "Bitbo — MVRV Ratio", url: "https://charts.bitbo.io/mvrv-ratio/", type: "public_chart" }
  ],
  nupl: [
    { name: "Bitcoin Magazine Pro — NUPL", url: "https://www.bitcoinmagazinepro.com/charts/relative-unrealized-profit--loss/", type: "public_chart" },
    { name: "Bitbo — NUPL", url: "https://charts.bitbo.io/nupl/", type: "public_chart" }
  ],
  puellMultiple: [
    { name: "Bitcoin Magazine Pro — Puell Multiple", url: "https://www.bitcoinmagazinepro.com/charts/puell-multiple/", type: "public_chart" },
    { name: "Bitbo — Puell Multiple", url: "https://charts.bitbo.io/puell-multiple/", type: "public_chart" }
  ],
  sthRealizedPrice: [
    { name: "Bitcoin Magazine Pro — STH Realized Price", url: "https://www.bitcoinmagazinepro.com/charts/short-term-holder-realized-price/", type: "public_chart" },
    { name: "Bitbo — STH Realized Price", url: "https://charts.bitbo.io/short-term-holder-realized-price/", type: "public_chart" }
  ],
  lthRealizedPrice: [
    { name: "Bitcoin Magazine Pro — LTH Realized Price", url: "https://www.bitcoinmagazinepro.com/charts/long-term-holder-realized-price/", type: "public_chart" },
    { name: "Bitbo — LTH Realized Price", url: "https://charts.bitbo.io/long-term-holder-realized-price/", type: "public_chart" }
  ],
  sthSopr: [
    { name: "Bitcoin Magazine Pro — STH-SOPR", url: "https://www.bitcoinmagazinepro.com/charts/short-term-holder-sopr/", type: "public_chart" },
    { name: "Bitbo — STH-SOPR", url: "https://charts.bitbo.io/sth-sopr/", type: "public_chart" }
  ],
  lthSopr: [
    { name: "Bitcoin Magazine Pro — LTH-SOPR", url: "https://www.bitcoinmagazinepro.com/charts/long-term-holder-sopr/", type: "public_chart" },
    { name: "Bitbo — LTH-SOPR", url: "https://charts.bitbo.io/lth-sopr/", type: "public_chart" }
  ],
  openInterest: [
    { name: "CoinGlass — Open Interest", url: "https://www.coinglass.com/BitcoinOpenInterest", type: "public_chart" }
  ],
  fundingRate: [
    { name: "CoinGlass — Funding Rate", url: "https://www.coinglass.com/FundingRate", type: "public_chart" }
  ],
  estimatedLeverageRatio: [
    { name: "CoinGlass — Estimated Leverage Ratio", url: "https://www.coinglass.com/pro/futures/LeverageRatio", type: "public_chart" }
  ],
  exchangeNetflow: [
    { name: "CoinGlass — Exchange Balance / Netflow", url: "https://www.coinglass.com/Balance", type: "public_chart" }
  ]
};

function getReferenceLinks(metricKey) {
  return REFERENCES[metricKey] ? REFERENCES[metricKey].slice() : [];
}

module.exports = { REFERENCES, getReferenceLinks };
