CREATE TABLE "mars_user_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_address" text NOT NULL,
	"vault_address" text NOT NULL,
	"total_shares" numeric(20, 0) NOT NULL,
	"total_deposited" numeric(20, 0) NOT NULL,
	"total_withdrawn" numeric(20, 0) NOT NULL,
	"realized_pnl" numeric(20, 0) NOT NULL,
	"first_deposit_time" timestamp NOT NULL,
	"last_activity_time" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_vault_deposits" (
	"id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"user_address" text NOT NULL,
	"vault_address" text NOT NULL,
	"amount" numeric(20, 0) NOT NULL,
	"shares_received" numeric(20, 0) NOT NULL,
	"protocol_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"slot" numeric(20, 0) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_vault_rebalances" (
	"id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"vault_address" text NOT NULL,
	"protocol_from" integer NOT NULL,
	"protocol_to" integer NOT NULL,
	"amount_in" numeric(20, 0) NOT NULL,
	"amount_out" numeric(20, 0) NOT NULL,
	"executor" text NOT NULL,
	"reason" text,
	"timestamp" timestamp NOT NULL,
	"slot" numeric(20, 0) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_vault_states" (
	"vault_address" text PRIMARY KEY NOT NULL,
	"admin" text NOT NULL,
	"base_token_mint" text NOT NULL,
	"shares_mint" text NOT NULL,
	"total_deposits" numeric(20, 0) NOT NULL,
	"total_shares" numeric(20, 0) NOT NULL,
	"current_apy" numeric(10, 4),
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp NOT NULL,
	"last_updated" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_vault_swaps" (
	"id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"user_address" text NOT NULL,
	"vault_address" text NOT NULL,
	"from_token" text NOT NULL,
	"to_token" text NOT NULL,
	"amount_in" numeric(20, 0) NOT NULL,
	"amount_out" numeric(20, 0) NOT NULL,
	"shares_received" numeric(20, 0),
	"protocol_id" integer NOT NULL,
	"swap_type" text NOT NULL,
	"slippage_bps" integer,
	"timestamp" timestamp NOT NULL,
	"slot" numeric(20, 0) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mars_vault_withdrawals" (
	"id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"user_address" text NOT NULL,
	"vault_address" text NOT NULL,
	"shares_burned" numeric(20, 0) NOT NULL,
	"amount_received" numeric(20, 0) NOT NULL,
	"protocol_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"slot" numeric(20, 0) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mars_positions_user_idx" ON "mars_user_positions" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_positions_vault_idx" ON "mars_user_positions" USING btree ("vault_address");--> statement-breakpoint
CREATE UNIQUE INDEX "mars_positions_user_vault_unique" ON "mars_user_positions" USING btree ("user_address","vault_address");--> statement-breakpoint
CREATE INDEX "mars_deposits_user_idx" ON "mars_vault_deposits" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_deposits_vault_idx" ON "mars_vault_deposits" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "mars_deposits_timestamp_idx" ON "mars_vault_deposits" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_deposits_signature_idx" ON "mars_vault_deposits" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "mars_rebalances_vault_idx" ON "mars_vault_rebalances" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "mars_rebalances_timestamp_idx" ON "mars_vault_rebalances" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_vault_states_status_idx" ON "mars_vault_states" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mars_vault_states_updated_idx" ON "mars_vault_states" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "mars_swaps_user_idx" ON "mars_vault_swaps" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_swaps_vault_idx" ON "mars_vault_swaps" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "mars_swaps_timestamp_idx" ON "mars_vault_swaps" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_swaps_type_idx" ON "mars_vault_swaps" USING btree ("swap_type");--> statement-breakpoint
CREATE INDEX "mars_withdrawals_user_idx" ON "mars_vault_withdrawals" USING btree ("user_address");--> statement-breakpoint
CREATE INDEX "mars_withdrawals_vault_idx" ON "mars_vault_withdrawals" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "mars_withdrawals_timestamp_idx" ON "mars_vault_withdrawals" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "mars_withdrawals_signature_idx" ON "mars_vault_withdrawals" USING btree ("signature");