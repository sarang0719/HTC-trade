import { db } from "./server/db";
import { instruments, latestPrices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const btc = await db.select().from(instruments).where(eq(instruments.symbol, "BTCUSD"));
  if (btc.length > 0) {
    await db.update(latestPrices).set({ price: "69563.25" }).where(eq(latestPrices.instrumentId, btc[0].id));
    console.log("Updated BTC price to 69563.25");
  }

  const xau = await db.select().from(instruments).where(eq(instruments.symbol, "XAUUSD"));
  if (xau.length > 0) {
    await db.update(latestPrices).set({ price: "4791.55", sparkline: ["4791.55"] }).where(eq(latestPrices.instrumentId, xau[0].id));
    console.log("Updated Gold price to 4791.55");
  }
}
main().catch(console.error);
