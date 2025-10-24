import { integer, sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { relations, sql } from "drizzle-orm";

// DEX Related Tables

// 流动性池表
export const pools = sqliteTable("pools", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	address: text("address").notNull().unique(),
	chain: text("chain").notNull(),
	tokenX: text("token_x").notNull(),
	tokenY: text("token_y").notNull(),
	binStep: integer("bin_step").notNull(),
	name: text("name").notNull(),
	status: text("status").default("active"),
	version: text("version").default("v2.2"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("pools_chain_idx").on(table.chain),
	index("pools_address_idx").on(table.address),
	index("pools_tokens_idx").on(table.tokenX, table.tokenY),
]);

// 代币表
export const tokens = sqliteTable("tokens", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	address: text("address").notNull(),
	chain: text("chain").notNull(),
	name: text("name").notNull(),
	symbol: text("symbol").notNull(),
	decimals: integer("decimals").notNull(),
	logoURI: text("logo_uri"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("tokens_address_chain_idx").on(table.address, table.chain),
	index("tokens_symbol_idx").on(table.symbol),
]);

// 池统计表（实时更新）
export const poolStats = sqliteTable("pool_stats", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	reserveX: text("reserve_x").notNull(), // 使用text存储大数值
	reserveY: text("reserve_y").notNull(),
	activeBinId: integer("active_bin_id").notNull(),
	totalSupply: text("total_supply").notNull(),
	liquidityUsd: real("liquidity_usd"),
	volume24h: real("volume_24h"),
	volume7d: real("volume_7d"),
	fees24h: real("fees_24h"),
	apy: real("apy"),
	blockNumber: integer("block_number").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("pool_stats_pool_idx").on(table.poolAddress),
	index("pool_stats_timestamp_idx").on(table.timestamp),
	index("pool_stats_block_idx").on(table.blockNumber),
]);

// 交易事件表
export const swapEvents = sqliteTable("swap_events", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	txHash: text("tx_hash").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	sender: text("sender").notNull(),
	to: text("to").notNull(),
	tokenInAddress: text("token_in_address").notNull(),
	tokenOutAddress: text("token_out_address").notNull(),
	amountIn: text("amount_in").notNull(),
	amountOut: text("amount_out").notNull(),
	amountInUsd: real("amount_in_usd"),
	amountOutUsd: real("amount_out_usd"),
	fees: text("fees"),
	feesUsd: real("fees_usd"),
	blockNumber: integer("block_number").notNull(),
	logIndex: integer("log_index").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("swap_events_tx_hash_idx").on(table.txHash),
	index("swap_events_pool_idx").on(table.poolAddress),
	index("swap_events_sender_idx").on(table.sender),
	index("swap_events_timestamp_idx").on(table.timestamp),
	index("swap_events_block_log_idx").on(table.blockNumber, table.logIndex),
]);

// 流动性事件表
export const liquidityEvents = sqliteTable("liquidity_events", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	txHash: text("tx_hash").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	user: text("user").notNull(),
	eventType: text("event_type").notNull(), // 'deposit' | 'withdraw'
	binIds: text("bin_ids").notNull(), // JSON array of bin IDs
	amounts: text("amounts").notNull(), // JSON array of amounts
	liquidity: text("liquidity").notNull(),
	liquidityUsd: real("liquidity_usd"),
	blockNumber: integer("block_number").notNull(),
	logIndex: integer("log_index").notNull(),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("liquidity_events_tx_hash_idx").on(table.txHash),
	index("liquidity_events_pool_idx").on(table.poolAddress),
	index("liquidity_events_user_idx").on(table.user),
	index("liquidity_events_timestamp_idx").on(table.timestamp),
	index("liquidity_events_type_idx").on(table.eventType),
]);

// 用户流动性仓位表
export const userPositions = sqliteTable("user_positions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userAddress: text("user_address").notNull(),
	poolAddress: text("pool_address").notNull().references(() => pools.address),
	chain: text("chain").notNull(),
	binId: integer("bin_id").notNull(),
	liquidity: text("liquidity").notNull(),
	liquidityUsd: real("liquidity_usd"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("user_positions_user_pool_idx").on(table.userAddress, table.poolAddress),
	index("user_positions_user_idx").on(table.userAddress),
	index("user_positions_pool_bin_idx").on(table.poolAddress, table.binId),
]);

// 价格历史表
export const priceHistory = sqliteTable("price_history", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	tokenAddress: text("token_address").notNull(),
	chain: text("chain").notNull(),
	priceUsd: real("price_usd").notNull(),
	volume24h: real("volume_24h"),
	marketCap: real("market_cap"),
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
	index("price_history_token_chain_idx").on(table.tokenAddress, table.chain),
	index("price_history_timestamp_idx").on(table.timestamp),
]);

// 事件处理状态表（用于跟踪同步进度）
export const syncStatus = sqliteTable("sync_status", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	chain: text("chain").notNull(),
	contractAddress: text("contract_address").notNull(),
	eventType: text("event_type").notNull(),
	lastBlockNumber: integer("last_block_number").notNull(),
	lastLogIndex: integer("last_log_index").notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("sync_status_chain_contract_idx").on(table.chain, table.contractAddress),
]);

// Relations
export const poolsRelations = relations(pools, ({ many, one }) => ({
	stats: many(poolStats),
	swapEvents: many(swapEvents),
	liquidityEvents: many(liquidityEvents),
	userPositions: many(userPositions),
	tokenX: one(tokens, {
		fields: [pools.tokenX],
		references: [tokens.address],
	}),
	tokenY: one(tokens, {
		fields: [pools.tokenY],
		references: [tokens.address],
	}),
}));

export const tokensRelations = relations(tokens, ({ many }) => ({
	priceHistory: many(priceHistory),
	poolsAsTokenX: many(pools, { relationName: "tokenX" }),
	poolsAsTokenY: many(pools, { relationName: "tokenY" }),
}));

export const poolStatsRelations = relations(poolStats, ({ one }) => ({
	pool: one(pools, {
		fields: [poolStats.poolAddress],
		references: [pools.address],
	}),
}));

export const swapEventsRelations = relations(swapEvents, ({ one }) => ({
	pool: one(pools, {
		fields: [swapEvents.poolAddress],
		references: [pools.address],
	}),
}));

export const liquidityEventsRelations = relations(liquidityEvents, ({ one }) => ({
	pool: one(pools, {
		fields: [liquidityEvents.poolAddress],
		references: [pools.address],
	}),
}));

export const userPositionsRelations = relations(userPositions, ({ one }) => ({
	pool: one(pools, {
		fields: [userPositions.poolAddress],
		references: [pools.address],
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
	token: one(tokens, {
		fields: [priceHistory.tokenAddress],
		references: [tokens.address],
	}),
}));

// Types
export type Pool = typeof pools.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type PoolStats = typeof poolStats.$inferSelect;
export type SwapEvent = typeof swapEvents.$inferSelect;
export type LiquidityEvent = typeof liquidityEvents.$inferSelect;
export type UserPosition = typeof userPositions.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type SyncStatus = typeof syncStatus.$inferSelect;

// User Account & API Management System

// 用户账户表
export const users = sqliteTable("users", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	email: text("email").notNull().unique(),
	username: text("username").unique(),
	name: text("name"),
	avatar: text("avatar"),
	company: text("company"),
	website: text("website"),
	bio: text("bio"),
	walletAddress: text("wallet_address"), // 可选的钱包地址绑定
	status: text("status", { enum: ["active", "suspended", "pending"] }).default("pending"),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
}, (table) => [
	index("users_email_idx").on(table.email),
	index("users_username_idx").on(table.username),
	index("users_wallet_idx").on(table.walletAddress),
	index("users_status_idx").on(table.status),
]);

// API密钥表
export const apiKeys = sqliteTable("api_keys", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	keyHash: text("key_hash").notNull().unique(), // 存储API密钥的哈希值
	keyPrefix: text("key_prefix").notNull(), // 存储密钥前缀用于显示 (如: "dex_xxx...")
	name: text("name").notNull(), // 用户自定义的密钥名称
	description: text("description"), // 密钥用途描述
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).default("free"),
	status: text("status", { enum: ["active", "suspended", "revoked"] }).default("active"),
	permissions: text("permissions").notNull(), // JSON数组，存储权限列表
	rateLimitPerHour: integer("rate_limit_per_hour").default(1000), // 每小时请求限制
	rateLimitPerDay: integer("rate_limit_per_day").default(10000), // 每日请求限制
	allowedIps: text("allowed_ips"), // JSON数组，允许的IP地址
	allowedDomains: text("allowed_domains"), // JSON数组，允许的域名
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }), // 过期时间，null表示永不过期
	lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("api_keys_user_idx").on(table.userId),
	index("api_keys_hash_idx").on(table.keyHash),
	index("api_keys_status_idx").on(table.status),
	index("api_keys_tier_idx").on(table.tier),
	index("api_keys_expires_idx").on(table.expiresAt),
]);

// API使用统计表
export const apiUsage = sqliteTable("api_usage", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	endpoint: text("endpoint").notNull(), // 请求的端点
	method: text("method").notNull(), // HTTP方法
	statusCode: integer("status_code").notNull(), // 响应状态码
	responseTime: integer("response_time"), // 响应时间(毫秒)
	requestSize: integer("request_size"), // 请求大小(字节)
	responseSize: integer("response_size"), // 响应大小(字节)
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	chain: text("chain"), // 请求的区块链网络
	errorMessage: text("error_message"), // 错误信息(如果有)
	timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
	date: text("date").notNull(), // YYYY-MM-DD格式，用于按日期聚合
}, (table) => [
	index("api_usage_api_key_idx").on(table.apiKeyId),
	index("api_usage_user_idx").on(table.userId),
	index("api_usage_timestamp_idx").on(table.timestamp),
	index("api_usage_date_idx").on(table.date),
	index("api_usage_endpoint_idx").on(table.endpoint),
	index("api_usage_status_idx").on(table.statusCode),
]);

// 权限定义表
export const permissions = sqliteTable("permissions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	name: text("name").notNull().unique(), // 权限名称，如: "dex:pools:read"
	description: text("description").notNull(),
	category: text("category").notNull(), // 权限分类，如: "dex", "admin", "analytics"
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).notNull(), // 需要的最低tier
	isActive: integer("is_active", { mode: "boolean" }).default(true),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("permissions_name_idx").on(table.name),
	index("permissions_category_idx").on(table.category),
	index("permissions_tier_idx").on(table.tier),
]);

// 用户申请记录表（API密钥申请）
export const applications = sqliteTable("applications", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["api_key", "tier_upgrade", "permission_request"] }).notNull(),
	requestedTier: text("requested_tier", { enum: ["basic", "pro", "enterprise"] }),
	requestedPermissions: text("requested_permissions"), // JSON数组
	reason: text("reason").notNull(), // 申请理由
	useCase: text("use_case"), // 使用场景描述
	expectedVolume: text("expected_volume"), // 预期请求量
	status: text("status", { enum: ["pending", "approved", "rejected", "processing"] }).default("pending"),
	reviewedBy: text("reviewed_by").references(() => users.id),
	reviewComment: text("review_comment"),
	submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
}, (table) => [
	index("applications_user_idx").on(table.userId),
	index("applications_status_idx").on(table.status),
	index("applications_type_idx").on(table.type),
	index("applications_submitted_idx").on(table.submittedAt),
]);

// 用户订阅/计费表
export const subscriptions = sqliteTable("subscriptions", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	tier: text("tier", { enum: ["free", "basic", "pro", "enterprise"] }).notNull(),
	status: text("status", { enum: ["active", "cancelled", "expired", "trial"] }).default("active"),
	billingCycle: text("billing_cycle", { enum: ["monthly", "yearly"] }),
	pricePerMonth: real("price_per_month"), // 月费用
	currency: text("currency").default("USD"),
	paymentMethod: text("payment_method"), // 支付方式
	stripeSubscriptionId: text("stripe_subscription_id"), // Stripe订阅ID
	trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
	currentPeriodStart: integer("current_period_start", { mode: "timestamp_ms" }),
	currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
	cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("subscriptions_user_idx").on(table.userId),
	index("subscriptions_status_idx").on(table.status),
	index("subscriptions_tier_idx").on(table.tier),
	index("subscriptions_stripe_idx").on(table.stripeSubscriptionId),
]);

// 每日使用量汇总表（用于计费和限制检查）
export const dailyUsageSummary = sqliteTable("daily_usage_summary", {
 id: text("id").$defaultFn(() => nanoid()).primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	apiKeyId: text("api_key_id").references(() => apiKeys.id, { onDelete: "cascade" }),
	date: text("date").notNull(), // YYYY-MM-DD
	totalRequests: integer("total_requests").default(0),
	successfulRequests: integer("successful_requests").default(0),
	errorRequests: integer("error_requests").default(0),
	totalResponseTime: integer("total_response_time").default(0), // 总响应时间
	avgResponseTime: real("avg_response_time"), // 平均响应时间
	totalDataTransfer: integer("total_data_transfer").default(0), // 总数据传输量(字节)
	uniqueEndpoints: integer("unique_endpoints").default(0), // 访问的不同端点数
	peakHourUsage: integer("peak_hour_usage").default(0), // 峰值小时使用量
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("daily_usage_user_date_idx").on(table.userId, table.date),
	index("daily_usage_api_key_date_idx").on(table.apiKeyId, table.date),
	index("daily_usage_date_idx").on(table.date),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	apiKeys: many(apiKeys),
	apiUsage: many(apiUsage),
	applications: many(applications),
	subscriptions: many(subscriptions),
	dailyUsage: many(dailyUsageSummary),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id],
	}),
	usage: many(apiUsage),
	dailyUsage: many(dailyUsageSummary),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
	apiKey: one(apiKeys, {
		fields: [apiUsage.apiKeyId],
		references: [apiKeys.id],
	}),
	user: one(users, {
		fields: [apiUsage.userId],
		references: [users.id],
	}),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
	user: one(users, {
		fields: [applications.userId],
		references: [users.id],
	}),
	reviewer: one(users, {
		fields: [applications.reviewedBy],
		references: [users.id],
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id],
	}),
}));

export const dailyUsageSummaryRelations = relations(dailyUsageSummary, ({ one }) => ({
	user: one(users, {
		fields: [dailyUsageSummary.userId],
		references: [users.id],
	}),
	apiKey: one(apiKeys, {
		fields: [dailyUsageSummary.apiKeyId],
		references: [apiKeys.id],
	}),
}));

// Mars Liquid Transaction Records

// Mars 交易记录表
export const marsTransactions = sqliteTable("mars_transactions", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  transactionType: text("transaction_type", { enum: ["deposit", "withdraw"] }).notNull(),
  asset: text("asset").notNull(), // USDC, USDT, SOL, BONK etc.
  amount: text("amount").notNull(), // 使用 text 存储大数值
  amountUsd: real("amount_usd"), // USD 价值
  protocol: text("protocol").notNull(), // jupiter_lend, kamino, etc.
  strategy: text("strategy"), // 使用的策略
  riskProfile: text("risk_profile", { enum: ["conservative", "moderate", "aggressive"] }),
  
  // 交易详情
  txHash: text("tx_hash"), // 区块链交易哈希
  signature: text("signature"), // Solana 交易签名
  status: text("status", { enum: ["pending", "processing", "completed", "failed", "cancelled"] }).default("pending"),
  
  // 费用信息
  depositFee: real("deposit_fee"),
  withdrawFee: real("withdraw_fee"),
  protocolFee: real("protocol_fee"),
  totalFees: real("total_fees"),
  
  // APY 和收益信息
  expectedApy: real("expected_apy"),
  actualApy: real("actual_apy"), // 实际获得的 APY (取款时计算)
  yieldEarned: real("yield_earned"), // 获得的收益
  
  // 时间戳
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  
  // 错误信息
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  
  // 元数据
  metadata: text("metadata"), // JSON 格式的额外信息
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_transactions_user_idx").on(table.userAddress),
  index("mars_transactions_type_idx").on(table.transactionType),
  index("mars_transactions_asset_idx").on(table.asset),
  index("mars_transactions_status_idx").on(table.status),
  index("mars_transactions_protocol_idx").on(table.protocol),
  index("mars_transactions_submitted_idx").on(table.submittedAt),
  index("mars_transactions_tx_hash_idx").on(table.txHash),
]);

// Mars 用户余额表 (跟踪用户在各协议的余额)
export const marsUserBalances = sqliteTable("mars_user_balances", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  asset: text("asset").notNull(),
  protocol: text("protocol").notNull(), // jupiter_lend, kamino, etc.
  
  // 余额信息
  balance: text("balance").notNull(), // 当前余额
  balanceUsd: real("balance_usd"), // USD 价值
  shares: text("shares"), // 在协议中的份额
  
  // 收益信息
  totalDeposited: text("total_deposited").notNull().default("0"),
  totalWithdrawn: text("total_withdrawn").notNull().default("0"),
  totalYieldEarned: real("total_yield_earned").default(0),
  currentApy: real("current_apy"),
  
  // 风险信息
  riskLevel: text("risk_level", { enum: ["low", "medium", "high"] }).default("medium"),
  lastYieldUpdate: integer("last_yield_update", { mode: "timestamp_ms" }),
  
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_balances_user_idx").on(table.userAddress),
  index("mars_balances_asset_idx").on(table.asset),
  index("mars_balances_protocol_idx").on(table.protocol),
  // 组合索引确保一个用户在一个协议中每种资产只有一条记录
  index("mars_balances_unique_idx").on(table.userAddress, table.asset, table.protocol),
]);

// 用户钱包连接记录表（记录用户登录信息）
export const walletConnections = sqliteTable("wallet_connections", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  walletType: text("wallet_type", { 
    enum: ["privy", "metamask", "phantom", "solflare", "backpack", "trust", "coinbase", "rainbow", "other"] 
  }).notNull(),
  chainType: text("chain_type", { 
    enum: ["ethereum", "solana", "multi-chain"] 
  }).notNull(),
  networkId: text("network_id"), // 链 ID 或网络标识
  userAgent: text("user_agent"), // 浏览器信息
  ipAddress: text("ip_address"), // IP 地址（如果可获取）
  sessionId: text("session_id"), // 会话标识
  
  // Privy 特有信息
  privyUserId: text("privy_user_id"), // Privy 用户 ID
  privyEmail: text("privy_email"), // Privy 绑定邮箱
  privyAuthMethod: text("privy_auth_method"), // email, google, twitter, wallet
  
  // 连接状态
  isConnected: integer("is_connected", { mode: "boolean" }).default(true),
  
  // 时间戳
  connectedAt: integer("connected_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  disconnectedAt: integer("disconnected_at", { mode: "timestamp_ms" }),
  lastActiveAt: integer("last_active_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("wallet_connections_address_idx").on(table.walletAddress),
  index("wallet_connections_type_idx").on(table.walletType),
  index("wallet_connections_chain_idx").on(table.chainType),
  index("wallet_connections_privy_user_idx").on(table.privyUserId),
  index("wallet_connections_session_idx").on(table.sessionId),
  index("wallet_connections_connected_at_idx").on(table.connectedAt),
  // 活跃连接索引
  index("wallet_connections_active_idx").on(table.walletAddress, table.isConnected, table.connectedAt),
]);

// Relations
export const marsTransactionsRelations = relations(marsTransactions, ({ one }) => ({
  user: one(users, {
    fields: [marsTransactions.userAddress],
    references: [users.walletAddress],
  }),
}));

export const marsUserBalancesRelations = relations(marsUserBalances, ({ one }) => ({
  user: one(users, {
    fields: [marsUserBalances.userAddress],
    references: [users.walletAddress],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type DailyUsageSummary = typeof dailyUsageSummary.$inferSelect;
export type MarsTransaction = typeof marsTransactions.$inferSelect;
export type MarsUserBalance = typeof marsUserBalances.$inferSelect;

// Mars Protocol 数据表
// 协议TVL数据表 (Total Value Locked)
export const marsTvlData = sqliteTable("mars_tvl_data", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  protocol: text("protocol").notNull(), // jupiter_lend, kamino, etc.
  asset: text("asset").notNull(), // USDC, USDT, SOL, etc.
  tvl: text("tvl").notNull(), // 总锁仓价值 (使用text存储大数值)
  tvlUsd: real("tvl_usd").notNull(), // USD价值
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_tvl_protocol_idx").on(table.protocol),
  index("mars_tvl_asset_idx").on(table.asset),
  index("mars_tvl_timestamp_idx").on(table.timestamp),
  index("mars_tvl_composite_idx").on(table.protocol, table.asset, table.timestamp),
]);

// 协议APY数据表 (Annual Percentage Yield)
export const marsApyData = sqliteTable("mars_apy_data", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  protocol: text("protocol").notNull(),
  asset: text("asset").notNull(),
  rawApy: real("raw_apy").notNull(), // 协议原始APY
  platformFee: real("platform_fee").notNull(), // 平台费率
  netApy: real("net_apy").notNull(), // 扣除费用后的净APY
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_apy_protocol_idx").on(table.protocol),
  index("mars_apy_asset_idx").on(table.asset),
  index("mars_apy_timestamp_idx").on(table.timestamp),
  index("mars_apy_composite_idx").on(table.protocol, table.asset, table.timestamp),
]);

// 用户日收益表 (Daily Interest/Earnings)
export const marsUserDailyEarnings = sqliteTable("mars_user_daily_earnings", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  protocol: text("protocol").notNull(),
  asset: text("asset").notNull(),
  principal: text("principal").notNull(), // 本金数量
  principalUsd: real("principal_usd").notNull(), // 本金USD价值
  dailyEarnings: real("daily_earnings").notNull(), // 当日收益
  dailyEarningsUsd: real("daily_earnings_usd").notNull(), // 当日收益USD
  cumulativeEarnings: real("cumulative_earnings").notNull(), // 累计收益
  cumulativeEarningsUsd: real("cumulative_earnings_usd").notNull(), // 累计收益USD
  apy: real("apy").notNull(), // 当日APY
  date: text("date").notNull(), // YYYY-MM-DD格式
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(), // 0点时间戳
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_earnings_user_idx").on(table.userAddress),
  index("mars_earnings_protocol_idx").on(table.protocol),
  index("mars_earnings_date_idx").on(table.date),
  index("mars_earnings_timestamp_idx").on(table.timestamp),
  index("mars_earnings_user_date_idx").on(table.userAddress, table.date),
  index("mars_earnings_user_protocol_idx").on(table.userAddress, table.protocol, table.asset),
]);

// 协议性能数据表 (Performance Graph Data)
export const marsProtocolPerformance = sqliteTable("mars_protocol_performance", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  protocol: text("protocol").notNull(),
  asset: text("asset").notNull(),
  metric: text("metric", { enum: ["apy", "tvl"] }).notNull(), // 指标类型
  value: real("value").notNull(), // 指标值
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD格式
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_performance_protocol_idx").on(table.protocol),
  index("mars_performance_metric_idx").on(table.metric),
  index("mars_performance_date_idx").on(table.date),
  index("mars_performance_timestamp_idx").on(table.timestamp),
  index("mars_performance_composite_idx").on(table.protocol, table.asset, table.metric, table.date),
]);

// 用户累计收益表 (Interest Earned - 按月汇总)
export const marsUserMonthlySummary = sqliteTable("mars_user_monthly_summary", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  protocol: text("protocol").notNull(),
  asset: text("asset").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  monthKey: text("month_key").notNull(), // YYYY-MM格式
  
  // 月度统计
  startingBalance: real("starting_balance").notNull().default(0),
  endingBalance: real("ending_balance").notNull().default(0),
  totalDeposits: real("total_deposits").notNull().default(0),
  totalWithdrawals: real("total_withdrawals").notNull().default(0),
  totalEarnings: real("total_earnings").notNull().default(0),
  totalEarningsUsd: real("total_earnings_usd").notNull().default(0),
  
  // 活跃天数和平均APY
  activeDays: integer("active_days").notNull().default(0),
  averageApy: real("average_apy").notNull().default(0),
  
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("mars_monthly_user_idx").on(table.userAddress),
  index("mars_monthly_year_month_idx").on(table.year, table.month),
  index("mars_monthly_key_idx").on(table.monthKey),
  index("mars_monthly_user_key_idx").on(table.userAddress, table.monthKey),
  index("mars_monthly_composite_idx").on(table.userAddress, table.protocol, table.asset, table.monthKey),
]);

// 关系定义
export const marsTvlDataRelations = relations(marsTvlData, ({ one }) => ({
  // 可以添加与其他表的关联
}));

export const marsApyDataRelations = relations(marsApyData, ({ one }) => ({
  // 可以添加与其他表的关联
}));

export const marsUserDailyEarningsRelations = relations(marsUserDailyEarnings, ({ one }) => ({
  user: one(users, {
    fields: [marsUserDailyEarnings.userAddress],
    references: [users.walletAddress],
  }),
}));

export const marsUserMonthlySummaryRelations = relations(marsUserMonthlySummary, ({ one }) => ({
  user: one(users, {
    fields: [marsUserMonthlySummary.userAddress],
    references: [users.walletAddress],
  }),
}));

// 新增类型定义
export type MarsTvlData = typeof marsTvlData.$inferSelect;
export type MarsApyData = typeof marsApyData.$inferSelect;
export type MarsUserDailyEarnings = typeof marsUserDailyEarnings.$inferSelect;
export type MarsProtocolPerformance = typeof marsProtocolPerformance.$inferSelect;
export type MarsUserMonthlySummary = typeof marsUserMonthlySummary.$inferSelect;

// ==================== Kamino 流动性池交易表 ====================

/**
 * Kamino 流动性池交易记录表
 * 追踪每笔存取款，用于计算真实成本基础和准确的 PnL
 */
export const kaminoLiquidityTransactions = sqliteTable("kamino_liquidity_transactions", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  strategyAddress: text("strategy_address").notNull(),
  poolName: text("pool_name"), // 如 "JITOSOL-SOL"
  
  // 交易类型
  transactionType: text("transaction_type", { enum: ["deposit", "withdraw"] }).notNull(),
  
  // Token A (通常是 SOL/wSOL)
  tokenAMint: text("token_a_mint").notNull(),
  tokenASymbol: text("token_a_symbol").notNull(),
  tokenAAmount: text("token_a_amount").notNull(), // UI amount
  tokenAAmountUsd: real("token_a_amount_usd").notNull(),
  
  // Token B (通常是 JitoSOL)
  tokenBMint: text("token_b_mint").notNull(),
  tokenBSymbol: text("token_b_symbol").notNull(),
  tokenBAmount: text("token_b_amount").notNull(), // UI amount
  tokenBAmountUsd: real("token_b_amount_usd").notNull(),
  
  // LP Shares
  shares: text("shares").notNull(), // LP shares amount
  
  // 交易信息
  txHash: text("tx_hash").notNull().unique(),
  status: text("status", { enum: ["pending", "confirmed", "failed"] }).default("confirmed"),
  
  // APY 信息
  apy: real("apy"), // 存款时的 APY 或取款时的实际 APY
  
  // 时间戳
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("kamino_tx_user_idx").on(table.userAddress),
  index("kamino_tx_strategy_idx").on(table.strategyAddress),
  index("kamino_tx_type_idx").on(table.transactionType),
  index("kamino_tx_timestamp_idx").on(table.timestamp),
  index("kamino_tx_hash_idx").on(table.txHash),
  index("kamino_tx_user_strategy_idx").on(table.userAddress, table.strategyAddress),
]);

/**
 * Kamino 用户仓位汇总表
 * 追踪用户在每个策略的成本基础和 PnL
 */
export const kaminoUserPositionSummary = sqliteTable("kamino_user_position_summary", {
  id: text("id").$defaultFn(() => nanoid()).primaryKey(),
  userAddress: text("user_address").notNull(),
  strategyAddress: text("strategy_address").notNull(),
  poolName: text("pool_name"),
  
  // 成本基础 (Cost Basis)
  totalDepositsUsd: real("total_deposits_usd").notNull().default(0), // 总存款 USD
  totalWithdrawalsUsd: real("total_withdrawals_usd").notNull().default(0), // 总取款 USD
  costBasis: real("cost_basis").notNull().default(0), // 成本基础 = 总存款 - 总取款
  
  // Token 数量追踪
  totalTokenADeposited: text("total_token_a_deposited").notNull().default("0"),
  totalTokenBDeposited: text("total_token_b_deposited").notNull().default("0"),
  totalTokenAWithdrawn: text("total_token_a_withdrawn").notNull().default("0"),
  totalTokenBWithdrawn: text("total_token_b_withdrawn").notNull().default("0"),
  
  // LP Shares 追踪
  totalSharesReceived: text("total_shares_received").notNull().default("0"), // 存款获得的总 shares
  totalSharesBurned: text("total_shares_burned").notNull().default("0"), // 取款销毁的总 shares
  currentShares: text("current_shares").notNull().default("0"), // 当前持有的 shares
  
  // PnL 信息
  currentValueUsd: real("current_value_usd").default(0), // 当前价值 USD
  realizedPnL: real("realized_pnl").default(0), // 已实现损益 = 总取款 - (总存款 * 取款比例)
  unrealizedPnL: real("unrealized_pnl").default(0), // 未实现损益 = 当前价值 - 剩余成本基础
  totalPnL: real("total_pnl").default(0), // 总损益 = 已实现 + 未实现
  
  // 统计信息
  transactionCount: integer("transaction_count").notNull().default(0),
  depositCount: integer("deposit_count").notNull().default(0),
  withdrawCount: integer("withdraw_count").notNull().default(0),
  
  // 时间信息
  firstDepositAt: integer("first_deposit_at", { mode: "timestamp_ms" }),
  lastTransactionAt: integer("last_transaction_at", { mode: "timestamp_ms" }),
  
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("kamino_summary_user_idx").on(table.userAddress),
  index("kamino_summary_strategy_idx").on(table.strategyAddress),
  index("kamino_summary_user_strategy_idx").on(table.userAddress, table.strategyAddress),
]);

// Relations
export const kaminoLiquidityTransactionsRelations = relations(kaminoLiquidityTransactions, ({ one }) => ({
  user: one(users, {
    fields: [kaminoLiquidityTransactions.userAddress],
    references: [users.walletAddress],
  }),
  positionSummary: one(kaminoUserPositionSummary, {
    fields: [kaminoLiquidityTransactions.userAddress, kaminoLiquidityTransactions.strategyAddress],
    references: [kaminoUserPositionSummary.userAddress, kaminoUserPositionSummary.strategyAddress],
  }),
}));

export const kaminoUserPositionSummaryRelations = relations(kaminoUserPositionSummary, ({ one, many }) => ({
  user: one(users, {
    fields: [kaminoUserPositionSummary.userAddress],
    references: [users.walletAddress],
  }),
  transactions: many(kaminoLiquidityTransactions),
}));

// Types
export type KaminoLiquidityTransaction = typeof kaminoLiquidityTransactions.$inferSelect;
export type KaminoUserPositionSummary = typeof kaminoUserPositionSummary.$inferSelect;
