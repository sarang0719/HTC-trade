import { db } from "./server/db";
import { instruments, latestPrices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, "XAUUSD"));
    if (inst) {
       const [price] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, inst.id));
       console.log("DB Price:", price?.price, "AsOf:", price?.asOf, "Sparkline Length:", price?.sparkline?.length);
    } else {
       console.log("XAUUSD not found in DB");
    }
  } catch (e) {
    console.log("DB fetch error:", e.message);
  }

  // Test Binance
  try {
     const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT`);
     console.log("Binance PAXGUSDT:", await res.text());
  } catch(e) { console.error("Binance error", e.message) }

  // Test TwelveData
  try {
     const res = await fetch(`https://api.twelvedata.com/price?symbol=XAU/USD&apikey=5703b6c3bb53485bbf9b57232c9c59b1`);
     console.log("TwelveData XAU/USD:", await res.text());
  } catch(e) { console.error("TwelveData error", e.message) }

  // Test Yahoo
  try {
     const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=15m&range=1d`);
     console.log("Yahoo XAUUSD=X ok?", res.ok);
  } catch(e) { console.error("Yahoo error", e.message) }
  process.exit(0);
}
run();
