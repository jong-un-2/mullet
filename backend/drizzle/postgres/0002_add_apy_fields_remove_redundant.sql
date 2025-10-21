-- Add missing APY and interest fields
ALTER TABLE "mars_user_positions" ADD COLUMN IF NOT EXISTS "interest_earned" numeric(20, 0) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN IF NOT EXISTS "daily_interest_usd" numeric(10, 6) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN IF NOT EXISTS "lending_apy" numeric(10, 4) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN IF NOT EXISTS "incentives_apy" numeric(10, 4) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "mars_user_positions" ADD COLUMN IF NOT EXISTS "total_apy" numeric(10, 4) DEFAULT 0;--> statement-breakpoint

-- Remove redundant vault-level fields (these should be in a separate vault_info table)
ALTER TABLE "mars_user_positions" DROP COLUMN IF EXISTS "tvl";--> statement-breakpoint
ALTER TABLE "mars_user_positions" DROP COLUMN IF EXISTS "liquidity_depth";--> statement-breakpoint

-- Remove redundant APR field (we only need APY)
ALTER TABLE "mars_user_positions" DROP COLUMN IF EXISTS "apr";--> statement-breakpoint

-- Add index for performance
CREATE INDEX IF NOT EXISTS "mars_positions_last_activity_idx" ON "mars_user_positions" USING btree ("last_activity_time");--> statement-breakpoint
