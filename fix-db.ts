import { db } from "./server/db";
import { sql } from "drizzle-orm";
import { latestPrices, instruments } from "./shared/schema";
import { eq } from "drizzle-orm";

async function fix() {
  try {
    // 1. Create wallet_transactions table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" varchar NOT NULL,
        "type" varchar NOT NULL,
        "amount" numeric(18, 6) NOT NULL,
        "status" varchar DEFAULT 'SUCCESS' NOT NULL,
        "reference_id" varchar,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("wallet_transactions table created or exists");

    // 2. Fix XAUUSD price
    const xau = await db.query.instruments.findFirst({ where: eq(instruments.symbol, "XAUUSD") });
    if (xau) {
      await db.update(latestPrices).set({ price: "2424.85", changePct: "0.00" }).where(eq(latestPrices.instrumentId, xau.id));
      console.log("XAUUSD price reset to 2424.85");
    }

  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
fix();
