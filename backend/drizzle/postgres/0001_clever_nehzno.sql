ALTER TABLE "mars_user_positions" ADD COLUMN "protocol" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "strategy_address" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "strategy_name" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "base_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "base_token_mint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "reward_tokens" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "current_value" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "unrealized_pnl" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "apr" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "apy" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "tvl" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "liquidity_depth" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "pending_rewards" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "total_rewards_claimed" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "last_reward_claim" timestamp;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "risk_level" text;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN "last_fetch_time" timestamp;--> statement-breakpoint
CREATE INDEX "mars_positions_protocol_idx" ON "mars_user_positions" USING btree ("protocol");--> statement-breakpoint
CREATE INDEX "mars_positions_status_idx" ON "mars_user_positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mars_positions_last_fetch_idx" ON "mars_user_positions" USING btree ("last_fetch_time");