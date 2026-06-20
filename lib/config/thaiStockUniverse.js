"use strict";

function makeStock(displaySymbol, name, market, universe) {
  const symbol = String(displaySymbol || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return {
    displaySymbol: symbol,
    providerSymbol: `${symbol}.BK`,
    name: name || symbol,
    market,
    assetType: "THAI_STOCK",
    currency: "THB",
    universe
  };
}

const SET100_UNIVERSE = [
  ["ADVANC", "Advanced Info Service PCL"],
  ["AOT", "Airports of Thailand PCL"],
  ["AWC", "Asset World Corp PCL"],
  ["BANPU", "Banpu PCL"],
  ["BBL", "Bangkok Bank PCL"],
  ["BCP", "Bangchak Corporation PCL"],
  ["BDMS", "Bangkok Dusit Medical Services PCL"],
  ["BEM", "Bangkok Expressway and Metro PCL"],
  ["BH", "Bumrungrad Hospital PCL"],
  ["BJC", "Berli Jucker PCL"],
  ["BTS", "BTS Group Holdings PCL"],
  ["CBG", "Carabao Group PCL"],
  ["CCET", "Cal-Comp Electronics Thailand PCL"],
  ["COM7", "Com7 PCL"],
  ["CPALL", "CP All PCL"],
  ["CPF", "Charoen Pokphand Foods PCL"],
  ["CPN", "Central Pattana PCL"],
  ["CRC", "Central Retail Corporation PCL"],
  ["DELTA", "Delta Electronics Thailand PCL"],
  ["EGCO", "Electricity Generating PCL"],
  ["GPSC", "Global Power Synergy PCL"],
  ["GULF", "Gulf Development PCL"],
  ["HMPRO", "Home Product Center PCL"],
  ["IVL", "Indorama Ventures PCL"],
  ["KBANK", "Kasikornbank PCL"],
  ["KCE", "KCE Electronics PCL"],
  ["KKP", "Kiatnakin Phatra Bank PCL"],
  ["KTB", "Krung Thai Bank PCL"],
  ["KTC", "Krungthai Card PCL"],
  ["LH", "Land and Houses PCL"],
  ["MINT", "Minor International PCL"],
  ["MTC", "Muangthai Capital PCL"],
  ["OR", "PTT Oil and Retail Business PCL"],
  ["OSP", "Osotspa PCL"],
  ["PTT", "PTT PCL"],
  ["PTTEP", "PTT Exploration and Production PCL"],
  ["PTTGC", "PTT Global Chemical PCL"],
  ["RATCH", "Ratch Group PCL"],
  ["SCB", "SCB X PCL"],
  ["SCC", "Siam Cement PCL"],
  ["SCGP", "SCG Packaging PCL"],
  ["TCAP", "Thanachart Capital PCL"],
  ["TIDLOR", "Ngern Tid Lor PCL"],
  ["TISCO", "TISCO Financial Group PCL"],
  ["TLI", "Thai Life Insurance PCL"],
  ["TOP", "Thai Oil PCL"],
  ["TRUE", "True Corporation PCL"],
  ["TTB", "TMBThanachart Bank PCL"],
  ["TU", "Thai Union Group PCL"],
  ["VGI", "VGI PCL"],
  ["WHA", "WHA Corporation PCL"],
  ["AEONTS", "AEON Thana Sinsap Thailand PCL"],
  ["AAV", "Asia Aviation PCL"],
  ["AMATA", "Amata Corporation PCL"],
  ["AP", "AP Thailand PCL"],
  ["BA", "Bangkok Airways PCL"],
  ["BAM", "Bangkok Commercial Asset Management PCL"],
  ["BCH", "Bangkok Chain Hospital PCL"],
  ["BCPG", "BCPG PCL"],
  ["BGRIM", "B.Grimm Power PCL"],
  ["BLA", "Bangkok Life Assurance PCL"],
  ["BPP", "Banpu Power PCL"],
  ["BSRC", "Bangchak Sriracha PCL"],
  ["BTG", "Betagro PCL"],
  ["CENTEL", "Central Plaza Hotel PCL"],
  ["CHG", "Chularat Hospital PCL"],
  ["CK", "CH. Karnchang PCL"],
  ["CKP", "CK Power PCL"],
  ["DOHOME", "Dohome PCL"],
  ["EA", "Energy Absolute PCL"],
  ["ERW", "The Erawan Group PCL"],
  ["FORTH", "Forth Corporation PCL"],
  ["GLOBAL", "Siam Global House PCL"],
  ["GUNKUL", "Gunkul Engineering PCL"],
  ["HANA", "Hana Microelectronics PCL"],
  ["ICHI", "Ichitan Group PCL"],
  ["IRPC", "IRPC PCL"],
  ["ITC", "i-Tail Corporation PCL"],
  ["JAS", "Jasmine International PCL"],
  ["JMART", "Jaymart Group Holdings PCL"],
  ["JMT", "JMT Network Services PCL"],
  ["M", "MK Restaurant Group PCL"],
  ["MEGA", "Mega Lifesciences PCL"],
  ["MOSHI", "Moshi Moshi Retail Corporation PCL"],
  ["PLANB", "Plan B Media PCL"],
  ["PRM", "Prima Marine PCL"],
  ["PSL", "Precious Shipping PCL"],
  ["QH", "Quality Houses PCL"],
  ["RCL", "Regional Container Lines PCL"],
  ["SABUY", "Sabuy Technology PCL"],
  ["SIRI", "Sansiri PCL"],
  ["SISB", "SISB PCL"],
  ["SPALI", "Supalai PCL"],
  ["SPRC", "Star Petroleum Refining PCL"],
  ["STA", "Sri Trang Agro-Industry PCL"],
  ["STGT", "Sri Trang Gloves Thailand PCL"],
  ["TASCO", "Tipco Asphalt PCL"],
  ["THG", "Thonburi Healthcare Group PCL"],
  ["TQM", "TQM Alpha PCL"],
  ["WHAUP", "WHA Utilities and Power PCL"]
].map(([displaySymbol, name]) => makeStock(displaySymbol, name, "SET", "SET100"));

const MAI_UNIVERSE = [
  ["24CS", "Twenty-Four Con & Supply PCL"],
  ["2S", "2S Metal PCL"],
  ["A5", "Asset Five Group PCL"],
  ["ABM", "Asia Biomass PCL"],
  ["ADB", "Applied DB PCL"],
  ["AIE", "AI Energy PCL"],
  ["ALT", "ALT Telecom PCL"],
  ["AMR", "AMR Asia PCL"],
  ["APP", "AppliCad PCL"],
  ["ARIN", "Arinsiri Land PCL"],
  ["ASN", "ASN Broker PCL"],
  ["ATP30", "ATP 30 PCL"],
  ["BIZ", "Business Alignment PCL"],
  ["BROOK", "The Brooker Group PCL"],
  ["CHAYO", "Chayo Group PCL"],
  ["CHEWA", "Chewathai PCL"],
  ["DOD", "DOD Biotech PCL"],
  ["EKH", "Ekachai Medical Care PCL"],
  ["FPI", "Fortune Parts Industry PCL"],
  ["FSMART", "Forth Smart Service PCL"],
  ["GTB", "Getabec PCL"],
  ["HL", "Healthlead PCL"],
  ["HUMAN", "Humanica PCL"],
  ["IIG", "I&I Group PCL"],
  ["III", "Triple i Logistics PCL"],
  ["ILINK", "Interlink Communication PCL"],
  ["JKN", "JKN Global Group PCL"],
  ["KUMWEL", "Kumwell Corporation PCL"],
  ["LIT", "Lease It PCL"],
  ["MENA", "Mena Transport PCL"],
  ["NER", "North East Rubber PCL"],
  ["NEX", "Nex Point PCL"],
  ["NOVA", "Nova Empire PCL"],
  ["PIMO", "Pioneer Motor PCL"],
  ["PRAPAT", "Peerapat Technology PCL"],
  ["SABINA", "Sabina PCL"],
  ["SANKO", "Sanko Diecasting Thailand PCL"],
  ["SIS", "SIS Distribution Thailand PCL"],
  ["SONIC", "Sonic Interfreight PCL"],
  ["SPA", "Siam Wellness Group PCL"],
  ["TACC", "T.A.C. Consumer PCL"],
  ["TNP", "Thanapiriya PCL"],
  ["UAC", "UAC Global PCL"],
  ["XO", "Exotic Food PCL"]
].map(([displaySymbol, name]) => makeStock(displaySymbol, name, "mai", "mai"));

function makeCustomUniverse(customSymbols = []) {
  return (Array.isArray(customSymbols) ? customSymbols : [])
    .map((raw) => String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9.]/g, ""))
    .filter(Boolean)
    .map((raw) => {
      const displaySymbol = raw.endsWith(".BK") ? raw.slice(0, -3) : raw;
      return makeStock(displaySymbol, displaySymbol, "SET", "CUSTOM");
    });
}

function getThaiStockUniverse(universe = "SET100", options = {}) {
  const key = String(universe || "SET100").toUpperCase();
  if (key === "SET50") return SET100_UNIVERSE.slice(0, 50);
  if (key === "SET100") return SET100_UNIVERSE;
  if (key === "MAI") return MAI_UNIVERSE;
  if (key === "SET100_MAI" || key === "SET100+MAI") return [...SET100_UNIVERSE, ...MAI_UNIVERSE];
  if (key === "CUSTOM") return makeCustomUniverse(options.customSymbols);
  return SET100_UNIVERSE;
}

module.exports = {
  SET100_STOCKS: SET100_UNIVERSE,
  SET100_UNIVERSE,
  MAI_UNIVERSE,
  getThaiStockUniverse
};
