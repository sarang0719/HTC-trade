CREATE TYPE "public"."kyc_status" AS ENUM('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."wallet_tx_type" AS ENUM('DEPOSIT', 'TRADE_DEBIT', 'TRADE_CREDIT', 'WITHDRAWAL', 'REFUND', 'BONUS');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"document_type" varchar(32) NOT NULL,
	"document_number" varchar(64),
	"front_image_url" text,
	"back_image_url" text,
	"selfie_url" text,
	"status" "kyc_status" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"razorpay_order_id" varchar(128),
	"razorpay_payment_id" varchar(128),
	"razorpay_signature" text,
	"amount" numeric(18, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"status" varchar(16) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"type" "wallet_tx_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"balance_before" numeric(18, 2) NOT NULL,
	"balance_after" numeric(18, 2) NOT NULL,
	"reference_type" varchar(32),
	"reference_id" varchar(128),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"frozen_balance" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"status" "withdrawal_status" DEFAULT 'PENDING' NOT NULL,
	"payment_method" varchar(32),
	"payment_details" jsonb,
	"rejection_reason" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kyc_user_id_idx" ON "kyc_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_razorpay_order_unique" ON "payments" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "wallet_tx_wallet_id_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_id_unique" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "withdrawals_user_id_idx" ON "withdrawals" USING btree ("user_id");