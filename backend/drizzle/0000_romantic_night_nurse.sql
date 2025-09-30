CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`tier` text DEFAULT 'free',
	`status` text DEFAULT 'active',
	`permissions` text NOT NULL,
	`rate_limit_per_hour` integer DEFAULT 1000,
	`rate_limit_per_day` integer DEFAULT 10000,
	`allowed_ips` text,
	`allowed_domains` text,
	`expires_at` integer,
	`last_used_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_status_idx` ON `api_keys` (`status`);--> statement-breakpoint
CREATE INDEX `api_keys_tier_idx` ON `api_keys` (`tier`);--> statement-breakpoint
CREATE INDEX `api_keys_expires_idx` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_id` text NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`status_code` integer NOT NULL,
	`response_time` integer,
	`request_size` integer,
	`response_size` integer,
	`user_agent` text,
	`ip_address` text,
	`chain` text,
	`error_message` text,
	`timestamp` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_usage_api_key_idx` ON `api_usage` (`api_key_id`);--> statement-breakpoint
CREATE INDEX `api_usage_user_idx` ON `api_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_usage_timestamp_idx` ON `api_usage` (`timestamp`);--> statement-breakpoint
CREATE INDEX `api_usage_date_idx` ON `api_usage` (`date`);--> statement-breakpoint
CREATE INDEX `api_usage_endpoint_idx` ON `api_usage` (`endpoint`);--> statement-breakpoint
CREATE INDEX `api_usage_status_idx` ON `api_usage` (`status_code`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`requested_tier` text,
	`requested_permissions` text,
	`reason` text NOT NULL,
	`use_case` text,
	`expected_volume` text,
	`status` text DEFAULT 'pending',
	`reviewed_by` text,
	`review_comment` text,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP,
	`reviewed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `applications_user_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_type_idx` ON `applications` (`type`);--> statement-breakpoint
CREATE INDEX `applications_submitted_idx` ON `applications` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `daily_usage_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`api_key_id` text,
	`date` text NOT NULL,
	`total_requests` integer DEFAULT 0,
	`successful_requests` integer DEFAULT 0,
	`error_requests` integer DEFAULT 0,
	`total_response_time` integer DEFAULT 0,
	`avg_response_time` real,
	`total_data_transfer` integer DEFAULT 0,
	`unique_endpoints` integer DEFAULT 0,
	`peak_hour_usage` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_usage_user_date_idx` ON `daily_usage_summary` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `daily_usage_api_key_date_idx` ON `daily_usage_summary` (`api_key_id`,`date`);--> statement-breakpoint
CREATE INDEX `daily_usage_date_idx` ON `daily_usage_summary` (`date`);--> statement-breakpoint
CREATE TABLE `liquidity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tx_hash` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`user` text NOT NULL,
	`event_type` text NOT NULL,
	`bin_ids` text NOT NULL,
	`amounts` text NOT NULL,
	`liquidity` text NOT NULL,
	`liquidity_usd` real,
	`block_number` integer NOT NULL,
	`log_index` integer NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `liquidity_events_tx_hash_idx` ON `liquidity_events` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `liquidity_events_pool_idx` ON `liquidity_events` (`pool_address`);--> statement-breakpoint
CREATE INDEX `liquidity_events_user_idx` ON `liquidity_events` (`user`);--> statement-breakpoint
CREATE INDEX `liquidity_events_timestamp_idx` ON `liquidity_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `liquidity_events_type_idx` ON `liquidity_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `mars_apy_data` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL,
	`asset` text NOT NULL,
	`raw_apy` real NOT NULL,
	`platform_fee` real NOT NULL,
	`net_apy` real NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_apy_protocol_idx` ON `mars_apy_data` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_apy_asset_idx` ON `mars_apy_data` (`asset`);--> statement-breakpoint
CREATE INDEX `mars_apy_timestamp_idx` ON `mars_apy_data` (`timestamp`);--> statement-breakpoint
CREATE INDEX `mars_apy_composite_idx` ON `mars_apy_data` (`protocol`,`asset`,`timestamp`);--> statement-breakpoint
CREATE TABLE `mars_protocol_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL,
	`asset` text NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`timestamp` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_performance_protocol_idx` ON `mars_protocol_performance` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_performance_metric_idx` ON `mars_protocol_performance` (`metric`);--> statement-breakpoint
CREATE INDEX `mars_performance_date_idx` ON `mars_protocol_performance` (`date`);--> statement-breakpoint
CREATE INDEX `mars_performance_timestamp_idx` ON `mars_protocol_performance` (`timestamp`);--> statement-breakpoint
CREATE INDEX `mars_performance_composite_idx` ON `mars_protocol_performance` (`protocol`,`asset`,`metric`,`date`);--> statement-breakpoint
CREATE TABLE `mars_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`transaction_type` text NOT NULL,
	`asset` text NOT NULL,
	`amount` text NOT NULL,
	`amount_usd` real,
	`protocol` text NOT NULL,
	`strategy` text,
	`risk_profile` text,
	`tx_hash` text,
	`signature` text,
	`status` text DEFAULT 'pending',
	`deposit_fee` real,
	`withdraw_fee` real,
	`protocol_fee` real,
	`total_fees` real,
	`expected_apy` real,
	`actual_apy` real,
	`yield_earned` real,
	`submitted_at` integer DEFAULT CURRENT_TIMESTAMP,
	`processed_at` integer,
	`completed_at` integer,
	`error_code` text,
	`error_message` text,
	`metadata` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_transactions_user_idx` ON `mars_transactions` (`user_address`);--> statement-breakpoint
CREATE INDEX `mars_transactions_type_idx` ON `mars_transactions` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `mars_transactions_asset_idx` ON `mars_transactions` (`asset`);--> statement-breakpoint
CREATE INDEX `mars_transactions_status_idx` ON `mars_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `mars_transactions_protocol_idx` ON `mars_transactions` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_transactions_submitted_idx` ON `mars_transactions` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `mars_transactions_tx_hash_idx` ON `mars_transactions` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `mars_tvl_data` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol` text NOT NULL,
	`asset` text NOT NULL,
	`tvl` text NOT NULL,
	`tvl_usd` real NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_tvl_protocol_idx` ON `mars_tvl_data` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_tvl_asset_idx` ON `mars_tvl_data` (`asset`);--> statement-breakpoint
CREATE INDEX `mars_tvl_timestamp_idx` ON `mars_tvl_data` (`timestamp`);--> statement-breakpoint
CREATE INDEX `mars_tvl_composite_idx` ON `mars_tvl_data` (`protocol`,`asset`,`timestamp`);--> statement-breakpoint
CREATE TABLE `mars_user_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`asset` text NOT NULL,
	`protocol` text NOT NULL,
	`balance` text NOT NULL,
	`balance_usd` real,
	`shares` text,
	`total_deposited` text DEFAULT '0' NOT NULL,
	`total_withdrawn` text DEFAULT '0' NOT NULL,
	`total_yield_earned` real DEFAULT 0,
	`current_apy` real,
	`risk_level` text DEFAULT 'medium',
	`last_yield_update` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_balances_user_idx` ON `mars_user_balances` (`user_address`);--> statement-breakpoint
CREATE INDEX `mars_balances_asset_idx` ON `mars_user_balances` (`asset`);--> statement-breakpoint
CREATE INDEX `mars_balances_protocol_idx` ON `mars_user_balances` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_balances_unique_idx` ON `mars_user_balances` (`user_address`,`asset`,`protocol`);--> statement-breakpoint
CREATE TABLE `mars_user_daily_earnings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`protocol` text NOT NULL,
	`asset` text NOT NULL,
	`principal` text NOT NULL,
	`principal_usd` real NOT NULL,
	`daily_earnings` real NOT NULL,
	`daily_earnings_usd` real NOT NULL,
	`cumulative_earnings` real NOT NULL,
	`cumulative_earnings_usd` real NOT NULL,
	`apy` real NOT NULL,
	`date` text NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_earnings_user_idx` ON `mars_user_daily_earnings` (`user_address`);--> statement-breakpoint
CREATE INDEX `mars_earnings_protocol_idx` ON `mars_user_daily_earnings` (`protocol`);--> statement-breakpoint
CREATE INDEX `mars_earnings_date_idx` ON `mars_user_daily_earnings` (`date`);--> statement-breakpoint
CREATE INDEX `mars_earnings_timestamp_idx` ON `mars_user_daily_earnings` (`timestamp`);--> statement-breakpoint
CREATE INDEX `mars_earnings_user_date_idx` ON `mars_user_daily_earnings` (`user_address`,`date`);--> statement-breakpoint
CREATE INDEX `mars_earnings_user_protocol_idx` ON `mars_user_daily_earnings` (`user_address`,`protocol`,`asset`);--> statement-breakpoint
CREATE TABLE `mars_user_monthly_summary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`protocol` text NOT NULL,
	`asset` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`month_key` text NOT NULL,
	`starting_balance` real DEFAULT 0 NOT NULL,
	`ending_balance` real DEFAULT 0 NOT NULL,
	`total_deposits` real DEFAULT 0 NOT NULL,
	`total_withdrawals` real DEFAULT 0 NOT NULL,
	`total_earnings` real DEFAULT 0 NOT NULL,
	`total_earnings_usd` real DEFAULT 0 NOT NULL,
	`active_days` integer DEFAULT 0 NOT NULL,
	`average_apy` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `mars_monthly_user_idx` ON `mars_user_monthly_summary` (`user_address`);--> statement-breakpoint
CREATE INDEX `mars_monthly_year_month_idx` ON `mars_user_monthly_summary` (`year`,`month`);--> statement-breakpoint
CREATE INDEX `mars_monthly_key_idx` ON `mars_user_monthly_summary` (`month_key`);--> statement-breakpoint
CREATE INDEX `mars_monthly_user_key_idx` ON `mars_user_monthly_summary` (`user_address`,`month_key`);--> statement-breakpoint
CREATE INDEX `mars_monthly_composite_idx` ON `mars_user_monthly_summary` (`user_address`,`protocol`,`asset`,`month_key`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`tier` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE INDEX `permissions_name_idx` ON `permissions` (`name`);--> statement-breakpoint
CREATE INDEX `permissions_category_idx` ON `permissions` (`category`);--> statement-breakpoint
CREATE INDEX `permissions_tier_idx` ON `permissions` (`tier`);--> statement-breakpoint
CREATE TABLE `pool_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`reserve_x` text NOT NULL,
	`reserve_y` text NOT NULL,
	`active_bin_id` integer NOT NULL,
	`total_supply` text NOT NULL,
	`liquidity_usd` real,
	`volume_24h` real,
	`volume_7d` real,
	`fees_24h` real,
	`apy` real,
	`block_number` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pool_stats_pool_idx` ON `pool_stats` (`pool_address`);--> statement-breakpoint
CREATE INDEX `pool_stats_timestamp_idx` ON `pool_stats` (`timestamp`);--> statement-breakpoint
CREATE INDEX `pool_stats_block_idx` ON `pool_stats` (`block_number`);--> statement-breakpoint
CREATE TABLE `pools` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`chain` text NOT NULL,
	`token_x` text NOT NULL,
	`token_y` text NOT NULL,
	`bin_step` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active',
	`version` text DEFAULT 'v2.2',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pools_address_unique` ON `pools` (`address`);--> statement-breakpoint
CREATE INDEX `pools_chain_idx` ON `pools` (`chain`);--> statement-breakpoint
CREATE INDEX `pools_address_idx` ON `pools` (`address`);--> statement-breakpoint
CREATE INDEX `pools_tokens_idx` ON `pools` (`token_x`,`token_y`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`token_address` text NOT NULL,
	`chain` text NOT NULL,
	`price_usd` real NOT NULL,
	`volume_24h` real,
	`market_cap` real,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_history_token_chain_idx` ON `price_history` (`token_address`,`chain`);--> statement-breakpoint
CREATE INDEX `price_history_timestamp_idx` ON `price_history` (`timestamp`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` text NOT NULL,
	`status` text DEFAULT 'active',
	`billing_cycle` text,
	`price_per_month` real,
	`currency` text DEFAULT 'USD',
	`payment_method` text,
	`stripe_subscription_id` text,
	`trial_ends_at` integer,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancelled_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_tier_idx` ON `subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_idx` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `swap_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tx_hash` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`sender` text NOT NULL,
	`to` text NOT NULL,
	`token_in_address` text NOT NULL,
	`token_out_address` text NOT NULL,
	`amount_in` text NOT NULL,
	`amount_out` text NOT NULL,
	`amount_in_usd` real,
	`amount_out_usd` real,
	`fees` text,
	`fees_usd` real,
	`block_number` integer NOT NULL,
	`log_index` integer NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `swap_events_tx_hash_idx` ON `swap_events` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `swap_events_pool_idx` ON `swap_events` (`pool_address`);--> statement-breakpoint
CREATE INDEX `swap_events_sender_idx` ON `swap_events` (`sender`);--> statement-breakpoint
CREATE INDEX `swap_events_timestamp_idx` ON `swap_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `swap_events_block_log_idx` ON `swap_events` (`block_number`,`log_index`);--> statement-breakpoint
CREATE TABLE `sync_status` (
	`id` text PRIMARY KEY NOT NULL,
	`chain` text NOT NULL,
	`contract_address` text NOT NULL,
	`event_type` text NOT NULL,
	`last_block_number` integer NOT NULL,
	`last_log_index` integer NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `sync_status_chain_contract_idx` ON `sync_status` (`chain`,`contract_address`);--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`chain` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimals` integer NOT NULL,
	`logo_uri` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `tokens_address_chain_idx` ON `tokens` (`address`,`chain`);--> statement-breakpoint
CREATE INDEX `tokens_symbol_idx` ON `tokens` (`symbol`);--> statement-breakpoint
CREATE TABLE `user_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_address` text NOT NULL,
	`pool_address` text NOT NULL,
	`chain` text NOT NULL,
	`bin_id` integer NOT NULL,
	`liquidity` text NOT NULL,
	`liquidity_usd` real,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`pool_address`) REFERENCES `pools`(`address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_positions_user_pool_idx` ON `user_positions` (`user_address`,`pool_address`);--> statement-breakpoint
CREATE INDEX `user_positions_user_idx` ON `user_positions` (`user_address`);--> statement-breakpoint
CREATE INDEX `user_positions_pool_bin_idx` ON `user_positions` (`pool_address`,`bin_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text,
	`name` text,
	`avatar` text,
	`company` text,
	`website` text,
	`bio` text,
	`wallet_address` text,
	`status` text DEFAULT 'pending',
	`email_verified` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_wallet_idx` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE TABLE `wallet_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`wallet_type` text NOT NULL,
	`chain_type` text NOT NULL,
	`network_id` text,
	`user_agent` text,
	`ip_address` text,
	`session_id` text,
	`privy_user_id` text,
	`privy_email` text,
	`privy_auth_method` text,
	`is_connected` integer DEFAULT true,
	`connected_at` integer DEFAULT CURRENT_TIMESTAMP,
	`disconnected_at` integer,
	`last_active_at` integer DEFAULT CURRENT_TIMESTAMP,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `wallet_connections_address_idx` ON `wallet_connections` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `wallet_connections_type_idx` ON `wallet_connections` (`wallet_type`);--> statement-breakpoint
CREATE INDEX `wallet_connections_chain_idx` ON `wallet_connections` (`chain_type`);--> statement-breakpoint
CREATE INDEX `wallet_connections_privy_user_idx` ON `wallet_connections` (`privy_user_id`);--> statement-breakpoint
CREATE INDEX `wallet_connections_session_idx` ON `wallet_connections` (`session_id`);--> statement-breakpoint
CREATE INDEX `wallet_connections_connected_at_idx` ON `wallet_connections` (`connected_at`);--> statement-breakpoint
CREATE INDEX `wallet_connections_active_idx` ON `wallet_connections` (`wallet_address`,`is_connected`,`connected_at`);