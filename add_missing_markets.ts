
import { db } from "./server/db";
import { instruments, latestPrices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Checking for missing institutional markets...");
  
  const targets = [
    { symbol: "USDINR",   exchange: "FOREX",   name: "US Dollar vs Indian Rupee", assetClass: "FOREX", currency: "INR", country: "IN", isActive: true, price: "83.50" },
    { symbol: "USDPKR",   exchange: "FOREX",   name: "US Dollar vs Pakistani Rupee", assetClass: "FOREX", currency: "PKR", country: "PK", isActive: true, price: "278.40" },
    { symbol: "USDJPY",   exchange: "FOREX",   name: "US Dollar vs Yen", assetClass: "FOREX", currency: "JPY", country: "JP", isActive: true, price: "151.20" },
    { symbol: "CADCHF",   exchange: "FOREX",   name: "Canadian Dollar vs Swiss Franc", assetClass: "FOREX", currency: "CHF", country: "CH", isActive: true, price: "0.66" },
  ];

  for (const target of targets) {
    const [existing] = await db.select().from(instruments).where(eq(instruments.symbol, target.symbol));
    if (!existing) {
      console.log(`Adding missing market: ${target.symbol}`);
      const [newInst] = await db.insert(instruments).values({
        symbol: target.symbol,
        exchange: target.exchange,
        name: target.name,
        assetClass: target.assetClass as any,
        currency: target.currency,
        country: target.country,
        isActive: true,
      }).returning();

      await db.insert(latestPrices).values({
        instrumentId: newInst.id,
        price: target.price,
        changeAbs: "0.01",
        changePct: "0.01",
        isOpen: true,
        asOf: new Date(),
        sparkline: [target.price]
      });
    } else {
      console.log(`Market ${target.symbol} already exists.`);
    }
  }

  console.log("Missing market synchronization complete.");
  process.exit(0);
}

main().catch(console.error);
