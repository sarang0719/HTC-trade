CREATE TYPE "public"."asset_class" AS ENUM('INDIAN_STOCK', 'US_STOCK', 'ETF', 'MUTUAL_FUND', 'FOREX', 'CRYPTO');--> statement-breakpoint
CREATE TYPE "public"."order_side" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('MARKET', 'LIMIT', 'STOP_LOSS');--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"avg_cost" numeric(18, 6) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"exchange" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"currency" varchar(8) NOT NULL,
	"country" varchar(2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "latest_prices" (
	"instrument_id" integer NOT NULL,
	"as_of" timestamp DEFAULT now() NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"change_abs" numeric(18, 6),
	"change_pct" numeric(9, 4),
	"sparkline" numeric(18, 6)[]
);
--> statement-breakpoint
CREATE TABLE "learn_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"title" text NOT NULL,
	"level" varchar(16) NOT NULL,
	"category" varchar(32) NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"summary" text,
	"image_url" text,
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"portfolio_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"side" "order_side" NOT NULL,
	"type" "order_type" NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"limit_price" numeric(18, 6),
	"stop_price" numeric(18, 6),
	"filled_price" numeric(18, 6),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(64) NOT NULL,
	"base_currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"watchlist_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "latest_prices" ADD CONSTRAINT "latest_prices_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_watchlists_id_fk" FOREIGN KEY ("watchlist_id") REFERENCES "public"."watchlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_portfolio_instrument_unique" ON "holdings" USING btree ("portfolio_id","instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instruments_symbol_exchange_unique" ON "instruments" USING btree ("symbol","exchange");--> statement-breakpoint
CREATE UNIQUE INDEX "latest_prices_instrument_unique" ON "latest_prices" USING btree ("instrument_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learn_slug_unique" ON "learn_articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "news_url_unique" ON "news_articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolios_user_id_idx" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_item_unique" ON "watchlist_items" USING btree ("watchlist_id","instrument_id");--> statement-breakpoint
CREATE INDEX "watchlists_user_id_idx" ON "watchlists" USING btree ("user_id");