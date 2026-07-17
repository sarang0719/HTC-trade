import { insertTimeBasedOrderSchema } from "./shared/schema";

try {
  const result = insertTimeBasedOrderSchema.parse({
    instrumentId: 1,
    side: "BUY",
    amount: "5",
    strikePrice: "77163.17",
    durationSeconds: 60,
  });
  console.log("Success:", result);
} catch (e: any) {
  console.log("Error:", JSON.stringify(e.errors, null, 2));
}
