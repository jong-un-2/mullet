CREATE TABLE `kamino_liquidity_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`strategy_address` text NOT NULL,
	`pool_name` text,
	`transaction_type` text NOT NULL,
	`token_a_mint` text NOT NULL,
	`token_a_symbol` text NOT NULL,
	`token_a_amount` text NOT NULL,
	`token_a_amount_usd` real NOT NULL,
	`token_b_mint` text NOT NULL,
	`token_b_symbol` text NOT NULL,
	`token_b_amount` text NOT NULL,
	`token_b_amount_usd` real NOT NULL,
	`shares` text NOT NULL,
	`tx_hash` text NOT NULL,
	`status` text DEFAULT 'confirmed',
	`apy` real,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kamino_liquidity_transactions_tx_hash_unique` ON `kamino_liquidity_transactions` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `kamino_tx_user_idx` ON `kamino_liquidity_transactions` (`user_address`);--> statement-breakpoint
CREATE INDEX `kamino_tx_strategy_idx` ON `kamino_liquidity_transactions` (`strategy_address`);--> statement-breakpoint
CREATE INDEX `kamino_tx_type_idx` ON `kamino_liquidity_transactions` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `kamino_tx_timestamp_idx` ON `kamino_liquidity_transactions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `kamino_tx_hash_idx` ON `kamino_liquidity_transactions` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `kamino_tx_user_strategy_idx` ON `kamino_liquidity_transactions` (`user_address`,`strategy_address`);--> statement-breakpoint
CREATE TABLE `kamino_user_position_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`strategy_address` text NOT NULL,
	`pool_name` text,
	`total_deposits_usd` real DEFAULT 0 NOT NULL,
	`total_withdrawals_usd` real DEFAULT 0 NOT NULL,
	`cost_basis` real DEFAULT 0 NOT NULL,
	`total_token_a_deposited` text DEFAULT '0' NOT NULL,
	`total_token_b_deposited` text DEFAULT '0' NOT NULL,
	`total_token_a_withdrawn` text DEFAULT '0' NOT NULL,
	`total_token_b_withdrawn` text DEFAULT '0' NOT NULL,
	`total_shares_received` text DEFAULT '0' NOT NULL,
	`total_shares_burned` text DEFAULT '0' NOT NULL,
	`current_shares` text DEFAULT '0' NOT NULL,
	`current_value_usd` real DEFAULT 0,
	`realized_pnl` real DEFAULT 0,
	`unrealized_pnl` real DEFAULT 0,
	`total_pnl` real DEFAULT 0,
	`transaction_count` integer DEFAULT 0 NOT NULL,
	`deposit_count` integer DEFAULT 0 NOT NULL,
	`withdraw_count` integer DEFAULT 0 NOT NULL,
	`first_deposit_at` integer,
	`last_transaction_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `kamino_summary_user_idx` ON `kamino_user_position_summary` (`user_address`);--> statement-breakpoint
CREATE INDEX `kamino_summary_strategy_idx` ON `kamino_user_position_summary` (`strategy_address`);--> statement-breakpoint
CREATE INDEX `kamino_summary_user_strategy_idx` ON `kamino_user_position_summary` (`user_address`,`strategy_address`);