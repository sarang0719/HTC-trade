import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const email = "saran123@gmail.com";
  const password = "saran";

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length === 0) {
    const hashed = await hashPassword(password);
    await db.insert(users).values({
      email,
      password: hashed,
      firstName: "Saran",
      autoTradeEnabled: true
    });
    console.log("Created user saran123@gmail.com");
  } else {
    const hashed = await hashPassword(password);
    await db.update(users).set({ password: hashed }).where(eq(users.email, email));
    console.log("Updated user saran123@gmail.com");
  }
  process.exit(0);
}
main();
