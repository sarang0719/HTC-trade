ALTER TABLE "time_based_orders" ADD COLUMN "placed_by" varchar DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auto_trade_enabled" boolean;