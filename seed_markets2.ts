import { db } from "./server/db";
import { instruments, latestPrices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const list = [
        // Forex
        { symbol: "EURUSD", name: "Euro vs Dollar" },
        { symbol: "USDJPY", name: "US Dollar vs Yen" },
        { symbol: "GBPUSD", name: "British Pound vs Dollar" },
        { symbol: "AUDUSD", name: "Aussie Dollar vs US Dollar" },
        { symbol: "USDCHF", name: "US Dollar vs Swiss Franc" },
        { symbol: "EURJPY", name: "Euro vs Yen" },
        // Crypto
        { symbol: "BTCUSD", name: "Bitcoin (USD)" },
        { symbol: "BTCUSDT", name: "Bitcoin (USDT)" },
        { symbol: "ETHUSDT", name: "Ethereum" },
        { symbol: "BNBUSDT", name: "Binance Coin" },
        { symbol: "SOLUSDT", name: "Solana" },
        { symbol: "XRPUSDT", name: "Ripple XRP" },
        // Commodities
        { symbol: "XAUUSD", name: "Gold" },
        { symbol: "XAGUSD", name: "Silver" },
        { symbol: "WTIUSD", name: "WTI Crude Oil" },
        { symbol: "BRENTUSD", name: "Brent Crude" },
        // Stocks
        { symbol: "AAPL", name: "Apple Inc." },
        { symbol: "TSLA", name: "Tesla Inc." },
        { symbol: "AMZN", name: "Amazon" },
        { symbol: "GOOGL", name: "Alphabet (Google)" },
        { symbol: "MSFT", name: "Microsoft Corporation" },
        // OTC
        { symbol: "EURUSD-OTC", name: "EUR/USD (OTC)" },
        { symbol: "BTCUSD-OTC", name: "BTC/USDT (OTC)" },
        { symbol: "USDJPY-OTC", name: "USD/JPY (OTC)" },
    ];

    for (const item of list) {
        let ac: any = "US_STOCK";
        let ex = "NASDAQ";
        if (item.symbol.includes("USDT") || item.symbol.includes("BTC")) { ac = "CRYPTO"; ex = "BINANCE"; }
        if (item.symbol.includes("USD") && item.symbol.length === 6 && !item.symbol.includes("USDT")) { ac = "FOREX"; ex = "FOREX"; }
        if (item.symbol.includes("OTC")) { ac = "FOREX"; ex = "OTC"; }
        if (["XAUUSD", "XAGUSD", "WTIUSD", "BRENTUSD"].includes(item.symbol)) { ac = "ETF"; ex = "COMMODITY"; }

        const existing = await db.select().from(instruments).where(eq(instruments.symbol, item.symbol));
        if (existing.length === 0) {
            console.log("Inserting:", item.symbol);
            const inserted = await db.insert(instruments).values({
                symbol: item.symbol,
                exchange: ex,
                name: item.name,
                assetClass: ac,
                currency: "USD",
                country: "US",
                isActive: true
            }).returning();

            const inst = inserted[0];
            const base = item.symbol.includes("BTC") ? 60000 : item.symbol.includes("ETH") ? 3000 : item.symbol.includes("XAU") ? 4791 : item.symbol.includes("TSLA") ? 200 : 1.1;
            const price = base;
            const sparkline = Array.from({ length: 15 }, () => (price * (0.98 + Math.random() * 0.04)).toString());

            await db.insert(latestPrices).values({
                instrumentId: inst.id,
                asOf: new Date(),
                price: String(price),
                changeAbs: "0",
                changePct: "0",
                sparkline,
            });
        }
    }
    console.log("Done");
    process.exit(0);
}
main();
