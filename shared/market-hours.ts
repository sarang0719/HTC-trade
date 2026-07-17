export function isGlobalMarketOpen(assetClass: string, symbol: string): boolean {
  // To ensure continuous 24/7 trading without disappointment (like Quotex / Pocket Option OTC mode),
  // all markets (Crypto, Forex, Metals, Commodities, Stocks) remain OPEN and active 365 days a year!
  return true;
}
