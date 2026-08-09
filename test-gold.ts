import "dotenv/config";
import { db, runMigrations } from "./server/db";
import { instruments, latestPrices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  // Initialize the ephemeral database with our schema
  await runMigrations();

  try {
    const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, "XAUUSD"));
    if (inst) {
       const [price] = await db.select().from(latestPrices).where(eq(latestPrices.instrumentId, inst.id));
       console.log("DB Price:", price?.price, "AsOf:", price?.asOf, "Sparkline Length:", price?.sparkline?.length);
    } else {
       console.log("XAUUSD not found in DB");
    }
  } catch (e: any) {
    console.log("DB fetch error:", e.message);
  }

  // Test Binance
  try {
     const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT`);
     console.log("Binance PAXGUSDT:", await res.text());
  } catch(e: any) { console.error("Binance error", e.message) }

  // Test TwelveData
  try {
     const key = process.env.TWELVEDATA_API_KEY || "demo";
     const res = await fetch(`https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${key}`);
     console.log("TwelveData XAU/USD:", await res.text());
  } catch(e: any) { console.error("TwelveData error", e.message) }

  // Test Yahoo
  try {
     const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD=X?interval=15m&range=1d`, {
       headers: { 
         "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
         "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
       }
     });
     console.log("Yahoo Response:", res.status, res.statusText);
     if (!res.ok) {
       console.log("Yahoo Error Body:", await res.text());
     }
  } catch(e: any) { console.error("Yahoo error", e.message) }
  process.exit(0);
}
run();
