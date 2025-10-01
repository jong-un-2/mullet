CREATE TABLE "mars_apy_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"raw_apy" numeric(10, 6) NOT NULL,
	"platform_fee" numeric(10, 6) NOT NULL,
	"net_apy" numeric(10, 6) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_protocol_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"metric" varchar(10) NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"date" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_tvl_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"tvl" numeric(36, 18) NOT NULL,
	"tvl_usd" numeric(18, 2) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_user_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(44) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"balance" numeric(36, 18) NOT NULL,
	"balance_usd" numeric(18, 2),
	"shares" numeric(36, 18),
	"total_deposited" numeric(36, 18) DEFAULT '0' NOT NULL,
	"total_withdrawn" numeric(36, 18) DEFAULT '0' NOT NULL,
	"total_yield_earned" numeric(18, 6) DEFAULT '0',
	"current_apy" numeric(10, 6),
	"risk_level" varchar(20) DEFAULT 'medium',
	"last_yield_update" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_user_daily_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(44) NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"principal" numeric(36, 18) NOT NULL,
	"principal_usd" numeric(18, 2) NOT NULL,
	"daily_earnings" numeric(18, 6) NOT NULL,
	"daily_earnings_usd" numeric(18, 2) NOT NULL,
	"cumulative_earnings" numeric(18, 6) NOT NULL,
	"cumulative_earnings_usd" numeric(18, 2) NOT NULL,
	"apy" numeric(10, 6) NOT NULL,
	"date" varchar(10) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_user_monthly_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_address" varchar(44) NOT NULL,
	"protocol" varchar(50) NOT NULL,
	"asset" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"month_key" varchar(7) NOT NULL,
	"starting_balance" numeric(18, 6) DEFAULT '0' NOT NULL,
	"ending_balance" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_deposits" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_withdrawals" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_earnings" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_earnings_usd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"active_days" integer DEFAULT 0 NOT NULL,
	"average_apy" numeric(10, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(44) NOT NULL,
	"wallet_type" varchar(20) NOT NULL,
	"chain_type" varchar(20) NOT NULL,
	"network_id" varchar(50),
	"user_agent" text,
	"ip_address" varchar(45),
	"session_id" varchar(100),
	"privy_user_id" varchar(100),
	"privy_email" varchar(255),
	"privy_auth_method" varchar(20),
	"is_connected" boolean DEFAULT true,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mars_apy_protocol_idx" ON "mars_apy_data" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_apy_asset_idx" ON "mars_apy_data" USING btree ("asset");--> statement-breakpoint
CREATE INDEX "mars_apy_timestamp_idx" ON "mars_apy_data" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_apy_composite_idx" ON "mars_apy_data" USING btree ("protocol","asset","timestamp");--> statement-breakpoint
CREATE INDEX "mars_performance_protocol_idx" ON "mars_protocol_performance" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_performance_metric_idx" ON "mars_protocol_performance" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "mars_performance_date_idx" ON "mars_protocol_performance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "mars_performance_timestamp_idx" ON "mars_protocol_performance" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_performance_composite_idx" ON "mars_protocol_performance" USING btree ("protocol","asset","metric","date");--> statement-breakpoint
CREATE INDEX "mars_tvl_protocol_idx" ON "mars_tvl_data" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_tvl_asset_idx" ON "mars_tvl_data" USING btree ("asset");--> statement-breakpoint
CREATE INDEX "mars_tvl_timestamp_idx" ON "mars_tvl_data" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_tvl_composite_idx" ON "mars_tvl_data" USING btree ("protocol","asset","timestamp");--> statement-breakpoint
CREATE INDEX "mars_balances_user_idx" ON "mars_user_balances" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_balances_asset_idx" ON "mars_user_balances" USING btree ("asset");--> statement-breakpoint
CREATE INDEX "mars_balances_protocol_idx" ON "mars_user_balances" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_balances_unique_idx" ON "mars_user_balances" USING btree ("user_address","asset","protocol");--> statement-breakpoint
CREATE INDEX "mars_earnings_user_idx" ON "mars_user_daily_earnings" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_earnings_protocol_idx" ON "mars_user_daily_earnings" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_earnings_date_idx" ON "mars_user_daily_earnings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "mars_earnings_timestamp_idx" ON "mars_user_daily_earnings" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_earnings_user_date_idx" ON "mars_user_daily_earnings" USING btree ("user_address","date");--> statement-breakpoint
CREATE INDEX "mars_earnings_user_protocol_idx" ON "mars_user_daily_earnings" USING btree ("user_address","protocol","asset");--> statement-breakpoint
CREATE INDEX "mars_monthly_user_idx" ON "mars_user_monthly_summary" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_monthly_year_month_idx" ON "mars_user_monthly_summary" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "mars_monthly_key_idx" ON "mars_user_monthly_summary" USING btree ("month_key");--> statement-breakpoint
CREATE INDEX "mars_monthly_user_key_idx" ON "mars_user_monthly_summary" USING btree ("user_address","month_key");--> statement-breakpoint
CREATE INDEX "mars_monthly_composite_idx" ON "mars_user_monthly_summary" USING btree ("user_address","protocol","asset","month_key");--> statement-breakpoint
CREATE INDEX "wallet_connections_address_idx" ON "wallet_connections" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "wallet_connections_type_idx" ON "wallet_connections" USING btree ("wallet_type");--> statement-breakpoint
CREATE INDEX "wallet_connections_chain_idx" ON "wallet_connections" USING btree ("chain_type");--> statement-breakpoint
CREATE INDEX "wallet_connections_privy_user_idx" ON "wallet_connections" USING btree ("privy_user_id");--> statement-breakpoint
CREATE INDEX "wallet_connections_session_idx" ON "wallet_connections" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "wallet_connections_connected_at_idx" ON "wallet_connections" USING btree ("connected_at");--> statement-breakpoint
CREATE INDEX "wallet_connections_active_idx" ON "wallet_connections" USING btree ("wallet_address","is_connected","connected_at");