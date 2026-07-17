CREATE TYPE "public"."time_trade_status" AS ENUM('ACTIVE', 'WIN', 'LOSS', 'TIE');--> statement-breakpoint
CREATE TABLE "time_based_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"instrument_id" integer NOT NULL,
	"side" "order_side" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"payout_ratio" numeric(5, 2) DEFAULT '0.85' NOT NULL,
	"strike_price" numeric(18, 6) NOT NULL,
	"settle_price" numeric(18, 6),
	"duration_seconds" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" time_trade_status DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_based_orders" ADD CONSTRAINT "time_based_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_based_orders" ADD CONSTRAINT "time_based_orders_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_orders_user_id_idx" ON "time_based_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_orders_expires_at_idx" ON "time_based_orders" USING btree ("expires_at");