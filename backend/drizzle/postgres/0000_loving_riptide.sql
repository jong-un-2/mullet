CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'basic', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'confirming', 'success', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdraw', 'stake', 'unstake', 'swap', 'claim_rewards');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"user_id" integer,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"request_size" integer,
	"response_size" integer,
	"user_agent" text,
	"ip_address" varchar(45),
	"country" varchar(2),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"farm_address" varchar(44) NOT NULL,
	"vault_address" varchar(44) NOT NULL,
	"staked_shares" numeric(36, 18) NOT NULL,
	"pending_rewards" numeric(36, 18) DEFAULT '0',
	"staked_at" timestamp NOT NULL,
	"last_claim_at" timestamp,
	"unstaked_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_mint" varchar(44) NOT NULL,
	"token_symbol" varchar(20),
	"price_usd" numeric(18, 6) NOT NULL,
	"volume_24h" numeric(18, 2),
	"market_cap" numeric(18, 2),
	"price_change_1h" numeric(10, 4),
	"price_change_24h" numeric(10, 4),
	"price_change_7d" numeric(10, 4),
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tx_hash" varchar(88) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"token_mint" varchar(44) NOT NULL,
	"token_symbol" varchar(20),
	"amount" numeric(36, 18) NOT NULL,
	"vault_address" varchar(44),
	"pool_address" varchar(44),
	"fee" numeric(36, 18),
	"price_usd" numeric(18, 6),
	"metadata" jsonb,
	"error_message" text,
	"block_time" timestamp,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(44) NOT NULL,
	"email" varchar(255),
	"display_name" varchar(100),
	"subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "vault_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"vault_address" varchar(44) NOT NULL,
	"vault_name" varchar(100),
	"token_mint" varchar(44) NOT NULL,
	"token_symbol" varchar(20),
	"shares_mint" varchar(44) NOT NULL,
	"total_assets" numeric(36, 18) NOT NULL,
	"total_shares" numeric(36, 18) NOT NULL,
	"apy" numeric(10, 6),
	"tvl" numeric(18, 2),
	"metadata" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_states_vault_address_unique" UNIQUE("vault_address")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_positions" ADD CONSTRAINT "farm_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "key_idx" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_key_usage_idx" ON "api_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "user_usage_idx" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "endpoint_idx" ON "api_usage_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "usage_created_at_idx" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "status_code_idx" ON "api_usage_logs" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "user_farm_idx" ON "farm_positions" USING btree ("user_id","farm_address");--> statement-breakpoint
CREATE INDEX "farm_address_idx" ON "farm_positions" USING btree ("farm_address");--> statement-breakpoint
CREATE INDEX "active_positions_idx" ON "farm_positions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "token_time_idx" ON "price_history" USING btree ("token_mint","timestamp");--> statement-breakpoint
CREATE INDEX "price_timestamp_idx" ON "price_history" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "tx_hash_idx" ON "transactions" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "user_id_tx_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vault_idx" ON "transactions" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "tx_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_type_idx" ON "transactions" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_idx" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "subscription_idx" ON "users" USING btree ("subscription_tier");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vault_address_idx" ON "vault_states" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "token_mint_idx" ON "vault_states" USING btree ("token_mint");--> statement-breakpoint
CREATE INDEX "last_updated_idx" ON "vault_states" USING btree ("last_updated");