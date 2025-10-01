/**
 * PostgreSQL Database Schema using Drizzle ORM
 * 
 * This schema defines all tables for the Mars backend:
 * - Users and authentication
 * - API keys and permissions
 * - Transaction history
 * - Vault states and caching
 * - Farm positions
 * - Analytics and metrics
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  varchar,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Enums
// ============================================================

export const transactionTypeEnum = pgEnum('transaction_type', [
  'deposit',
  'withdraw',
  'stake',
  'unstake',
  'swap',
  'claim_rewards',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'confirming',
  'success',
  'failed',
  'cancelled',
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'basic',
  'pro',
  'enterprise',
]);

// ============================================================
// Users Table
// ============================================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    walletAddress: varchar('wallet_address', { length: 44 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    displayName: varchar('display_name', { length: 100 }),
    subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: uniqueIndex('wallet_idx').on(table.walletAddress),
    emailIdx: index('email_idx').on(table.email),
    subscriptionIdx: index('subscription_idx').on(table.subscriptionTier),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  })
);

// ============================================================
// API Keys Table
// ============================================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    key: varchar('key', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    rateLimit: integer('rate_limit').notNull().default(100), // requests per minute
    isActive: boolean('is_active').notNull().default(true),
    expiresAt: timestamp('expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: uniqueIndex('key_idx').on(table.key),
    userIdx: index('user_id_idx').on(table.userId),
    activeIdx: index('active_idx').on(table.isActive),
  })
);

// ============================================================
// Transactions Table
// ============================================================

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    txHash: varchar('tx_hash', { length: 88 }).notNull().unique(),
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').notNull().default('pending'),
    
    // Token information
    tokenMint: varchar('token_mint', { length: 44 }).notNull(),
    tokenSymbol: varchar('token_symbol', { length: 20 }),
    amount: decimal('amount', { precision: 36, scale: 18 }).notNull(),
    
    // Vault/Pool information
    vaultAddress: varchar('vault_address', { length: 44 }),
    poolAddress: varchar('pool_address', { length: 44 }),
    
    // Fees and prices
    fee: decimal('fee', { precision: 36, scale: 18 }),
    priceUsd: decimal('price_usd', { precision: 18, scale: 6 }),
    
    // Additional metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    errorMessage: text('error_message'),
    
    // Timestamps
    blockTime: timestamp('block_time'),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    txHashIdx: uniqueIndex('tx_hash_idx').on(table.txHash),
    userIdIdx: index('user_id_tx_idx').on(table.userId),
    typeIdx: index('type_idx').on(table.type),
    statusIdx: index('status_idx').on(table.status),
    vaultIdx: index('vault_idx').on(table.vaultAddress),
    createdAtIdx: index('tx_created_at_idx').on(table.createdAt),
    userTypeIdx: index('user_type_idx').on(table.userId, table.type),
  })
);

// ============================================================
// Vault States Table
// ============================================================

export const vaultStates = pgTable(
  'vault_states',
  {
    id: serial('id').primaryKey(),
    vaultAddress: varchar('vault_address', { length: 44 }).notNull().unique(),
    vaultName: varchar('vault_name', { length: 100 }),
    
    // Token information
    tokenMint: varchar('token_mint', { length: 44 }).notNull(),
    tokenSymbol: varchar('token_symbol', { length: 20 }),
    sharesMint: varchar('shares_mint', { length: 44 }).notNull(),
    
    // Financial data
    totalAssets: decimal('total_assets', { precision: 36, scale: 18 }).notNull(),
    totalShares: decimal('total_shares', { precision: 36, scale: 18 }).notNull(),
    apy: decimal('apy', { precision: 10, scale: 6 }),
    tvl: decimal('tvl', { precision: 18, scale: 2 }),
    
    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    
    // Cache control
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    vaultIdx: uniqueIndex('vault_address_idx').on(table.vaultAddress),
    tokenIdx: index('token_mint_idx').on(table.tokenMint),
    lastUpdatedIdx: index('last_updated_idx').on(table.lastUpdated),
  })
);

// ============================================================
// Farm Positions Table
// ============================================================

export const farmPositions = pgTable(
  'farm_positions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    
    // Farm information
    farmAddress: varchar('farm_address', { length: 44 }).notNull(),
    vaultAddress: varchar('vault_address', { length: 44 }).notNull(),
    
    // Position data
    stakedShares: decimal('staked_shares', { precision: 36, scale: 18 }).notNull(),
    pendingRewards: decimal('pending_rewards', { precision: 36, scale: 18 }).default('0'),
    
    // Timing
    stakedAt: timestamp('staked_at').notNull(),
    lastClaimAt: timestamp('last_claim_at'),
    unstakedAt: timestamp('unstaked_at'),
    
    // Status
    isActive: boolean('is_active').notNull().default(true),
    
    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userFarmIdx: index('user_farm_idx').on(table.userId, table.farmAddress),
    farmIdx: index('farm_address_idx').on(table.farmAddress),
    activeIdx: index('active_positions_idx').on(table.isActive),
  })
);

// ============================================================
// API Usage Logs Table
// ============================================================

export const apiUsageLogs = pgTable(
  'api_usage_logs',
  {
    id: serial('id').primaryKey(),
    apiKeyId: integer('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    
    // Request information
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    statusCode: integer('status_code').notNull(),
    
    // Performance metrics
    responseTime: integer('response_time'), // milliseconds
    requestSize: integer('request_size'), // bytes
    responseSize: integer('response_size'), // bytes
    
    // Client information
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    country: varchar('country', { length: 2 }),
    
    // Error tracking
    errorMessage: text('error_message'),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdx: index('api_key_usage_idx').on(table.apiKeyId),
    userIdx: index('user_usage_idx').on(table.userId),
    endpointIdx: index('endpoint_idx').on(table.endpoint),
    createdAtIdx: index('usage_created_at_idx').on(table.createdAt),
    statusIdx: index('status_code_idx').on(table.statusCode),
  })
);

// ============================================================
// Price History Table
// ============================================================

export const priceHistory = pgTable(
  'price_history',
  {
    id: serial('id').primaryKey(),
    tokenMint: varchar('token_mint', { length: 44 }).notNull(),
    tokenSymbol: varchar('token_symbol', { length: 20 }),
    
    // Price data
    priceUsd: decimal('price_usd', { precision: 18, scale: 6 }).notNull(),
    volume24h: decimal('volume_24h', { precision: 18, scale: 2 }),
    marketCap: decimal('market_cap', { precision: 18, scale: 2 }),
    
    // Change metrics
    priceChange1h: decimal('price_change_1h', { precision: 10, scale: 4 }),
    priceChange24h: decimal('price_change_24h', { precision: 10, scale: 4 }),
    priceChange7d: decimal('price_change_7d', { precision: 10, scale: 4 }),
    
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenTimeIdx: index('token_time_idx').on(table.tokenMint, table.timestamp),
    timestampIdx: index('price_timestamp_idx').on(table.timestamp),
  })
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  transactions: many(transactions),
  farmPositions: many(farmPositions),
  apiUsageLogs: many(apiUsageLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  usageLogs: many(apiUsageLogs),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const farmPositionsRelations = relations(farmPositions, ({ one }) => ({
  user: one(users, {
    fields: [farmPositions.userId],
    references: [users.id],
  }),
}));

export const apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiUsageLogs.userId],
    references: [users.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiUsageLogs.apiKeyId],
    references: [apiKeys.id],
  }),
}));

// ============================================================
// Mars Protocol Tables
// ============================================================

// Mars TVL Data (Total Value Locked)
export const marsTvlData = pgTable(
  'mars_tvl_data',
  {
    id: serial('id').primaryKey(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    tvl: decimal('tvl', { precision: 36, scale: 18 }).notNull(),
    tvlUsd: decimal('tvl_usd', { precision: 18, scale: 2 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    protocolIdx: index('mars_tvl_protocol_idx').on(table.protocol),
    assetIdx: index('mars_tvl_asset_idx').on(table.asset),
    timestampIdx: index('mars_tvl_timestamp_idx').on(table.timestamp),
    compositeIdx: index('mars_tvl_composite_idx').on(table.protocol, table.asset, table.timestamp),
  })
);

// Mars APY Data (Annual Percentage Yield)
export const marsApyData = pgTable(
  'mars_apy_data',
  {
    id: serial('id').primaryKey(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    rawApy: decimal('raw_apy', { precision: 10, scale: 6 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 10, scale: 6 }).notNull(),
    netApy: decimal('net_apy', { precision: 10, scale: 6 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    protocolIdx: index('mars_apy_protocol_idx').on(table.protocol),
    assetIdx: index('mars_apy_asset_idx').on(table.asset),
    timestampIdx: index('mars_apy_timestamp_idx').on(table.timestamp),
    compositeIdx: index('mars_apy_composite_idx').on(table.protocol, table.asset, table.timestamp),
  })
);

// Mars User Balances (User balances in various protocols)
export const marsUserBalances = pgTable(
  'mars_user_balances',
  {
    id: serial('id').primaryKey(),
    userAddress: varchar('user_address', { length: 44 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    balance: decimal('balance', { precision: 36, scale: 18 }).notNull(),
    balanceUsd: decimal('balance_usd', { precision: 18, scale: 2 }),
    shares: decimal('shares', { precision: 36, scale: 18 }),
    totalDeposited: decimal('total_deposited', { precision: 36, scale: 18 }).notNull().default('0'),
    totalWithdrawn: decimal('total_withdrawn', { precision: 36, scale: 18 }).notNull().default('0'),
    totalYieldEarned: decimal('total_yield_earned', { precision: 18, scale: 6 }).default('0'),
    currentApy: decimal('current_apy', { precision: 10, scale: 6 }),
    riskLevel: varchar('risk_level', { length: 20 }).default('medium'),
    lastYieldUpdate: timestamp('last_yield_update'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('mars_balances_user_idx').on(table.userAddress),
    assetIdx: index('mars_balances_asset_idx').on(table.asset),
    protocolIdx: index('mars_balances_protocol_idx').on(table.protocol),
    uniqueIdx: index('mars_balances_unique_idx').on(table.userAddress, table.asset, table.protocol),
  })
);

// Mars User Daily Earnings
export const marsUserDailyEarnings = pgTable(
  'mars_user_daily_earnings',
  {
    id: serial('id').primaryKey(),
    userAddress: varchar('user_address', { length: 44 }).notNull(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    principal: decimal('principal', { precision: 36, scale: 18 }).notNull(),
    principalUsd: decimal('principal_usd', { precision: 18, scale: 2 }).notNull(),
    dailyEarnings: decimal('daily_earnings', { precision: 18, scale: 6 }).notNull(),
    dailyEarningsUsd: decimal('daily_earnings_usd', { precision: 18, scale: 2 }).notNull(),
    cumulativeEarnings: decimal('cumulative_earnings', { precision: 18, scale: 6 }).notNull(),
    cumulativeEarningsUsd: decimal('cumulative_earnings_usd', { precision: 18, scale: 2 }).notNull(),
    apy: decimal('apy', { precision: 10, scale: 6 }).notNull(),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    timestamp: timestamp('timestamp').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('mars_earnings_user_idx').on(table.userAddress),
    protocolIdx: index('mars_earnings_protocol_idx').on(table.protocol),
    dateIdx: index('mars_earnings_date_idx').on(table.date),
    timestampIdx: index('mars_earnings_timestamp_idx').on(table.timestamp),
    userDateIdx: index('mars_earnings_user_date_idx').on(table.userAddress, table.date),
    userProtocolIdx: index('mars_earnings_user_protocol_idx').on(table.userAddress, table.protocol, table.asset),
  })
);

// Mars Protocol Performance
export const marsProtocolPerformance = pgTable(
  'mars_protocol_performance',
  {
    id: serial('id').primaryKey(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    metric: varchar('metric', { length: 10 }).notNull(), // 'apy' or 'tvl'
    value: decimal('value', { precision: 18, scale: 6 }).notNull(),
    timestamp: timestamp('timestamp').notNull(),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    protocolIdx: index('mars_performance_protocol_idx').on(table.protocol),
    metricIdx: index('mars_performance_metric_idx').on(table.metric),
    dateIdx: index('mars_performance_date_idx').on(table.date),
    timestampIdx: index('mars_performance_timestamp_idx').on(table.timestamp),
    compositeIdx: index('mars_performance_composite_idx').on(table.protocol, table.asset, table.metric, table.date),
  })
);

// Mars User Monthly Summary
export const marsUserMonthlySummary = pgTable(
  'mars_user_monthly_summary',
  {
    id: serial('id').primaryKey(),
    userAddress: varchar('user_address', { length: 44 }).notNull(),
    protocol: varchar('protocol', { length: 50 }).notNull(),
    asset: varchar('asset', { length: 20 }).notNull(),
    year: integer('year').notNull(),
    month: integer('month').notNull(), // 1-12
    monthKey: varchar('month_key', { length: 7 }).notNull(), // YYYY-MM
    startingBalance: decimal('starting_balance', { precision: 18, scale: 6 }).notNull().default('0'),
    endingBalance: decimal('ending_balance', { precision: 18, scale: 6 }).notNull().default('0'),
    totalDeposits: decimal('total_deposits', { precision: 18, scale: 6 }).notNull().default('0'),
    totalWithdrawals: decimal('total_withdrawals', { precision: 18, scale: 6 }).notNull().default('0'),
    totalEarnings: decimal('total_earnings', { precision: 18, scale: 6 }).notNull().default('0'),
    totalEarningsUsd: decimal('total_earnings_usd', { precision: 18, scale: 2 }).notNull().default('0'),
    activeDays: integer('active_days').notNull().default(0),
    averageApy: decimal('average_apy', { precision: 10, scale: 6 }).notNull().default('0'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('mars_monthly_user_idx').on(table.userAddress),
    yearMonthIdx: index('mars_monthly_year_month_idx').on(table.year, table.month),
    keyIdx: index('mars_monthly_key_idx').on(table.monthKey),
    userKeyIdx: index('mars_monthly_user_key_idx').on(table.userAddress, table.monthKey),
    compositeIdx: index('mars_monthly_composite_idx').on(table.userAddress, table.protocol, table.asset, table.monthKey),
  })
);

// Wallet Connections (Privy and other wallet connections)
export const walletConnections = pgTable(
  'wallet_connections',
  {
    id: serial('id').primaryKey(),
    walletAddress: varchar('wallet_address', { length: 44 }).notNull(),
    walletType: varchar('wallet_type', { length: 20 }).notNull(), // privy, metamask, phantom, etc.
    chainType: varchar('chain_type', { length: 20 }).notNull(), // ethereum, solana, multi-chain
    networkId: varchar('network_id', { length: 50 }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    sessionId: varchar('session_id', { length: 100 }),
    privyUserId: varchar('privy_user_id', { length: 100 }),
    privyEmail: varchar('privy_email', { length: 255 }),
    privyAuthMethod: varchar('privy_auth_method', { length: 20 }),
    isConnected: boolean('is_connected').default(true),
    connectedAt: timestamp('connected_at').defaultNow().notNull(),
    disconnectedAt: timestamp('disconnected_at'),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    addressIdx: index('wallet_connections_address_idx').on(table.walletAddress),
    typeIdx: index('wallet_connections_type_idx').on(table.walletType),
    chainIdx: index('wallet_connections_chain_idx').on(table.chainType),
    privyUserIdx: index('wallet_connections_privy_user_idx').on(table.privyUserId),
    sessionIdx: index('wallet_connections_session_idx').on(table.sessionId),
    connectedAtIdx: index('wallet_connections_connected_at_idx').on(table.connectedAt),
    activeIdx: index('wallet_connections_active_idx').on(table.walletAddress, table.isConnected, table.connectedAt),
  })
);

// ============================================================
// Mars Relations
// ============================================================

export const marsUserBalancesRelations = relations(marsUserBalances, ({ one }) => ({
  user: one(users, {
    fields: [marsUserBalances.userAddress],
    references: [users.walletAddress],
  }),
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

export const walletConnectionsRelations = relations(walletConnections, ({ one }) => ({
  user: one(users, {
    fields: [walletConnections.walletAddress],
    references: [users.walletAddress],
  }),
}));

// ============================================================
// Type Exports
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type VaultState = typeof vaultStates.$inferSelect;
export type NewVaultState = typeof vaultStates.$inferInsert;

export type FarmPosition = typeof farmPositions.$inferSelect;
export type NewFarmPosition = typeof farmPositions.$inferInsert;

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert;

export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;

// Mars Types
export type MarsTvlData = typeof marsTvlData.$inferSelect;
export type NewMarsTvlData = typeof marsTvlData.$inferInsert;

export type MarsApyData = typeof marsApyData.$inferSelect;
export type NewMarsApyData = typeof marsApyData.$inferInsert;

export type MarsUserBalance = typeof marsUserBalances.$inferSelect;
export type NewMarsUserBalance = typeof marsUserBalances.$inferInsert;

export type MarsUserDailyEarnings = typeof marsUserDailyEarnings.$inferSelect;
export type NewMarsUserDailyEarnings = typeof marsUserDailyEarnings.$inferInsert;

export type MarsProtocolPerformance = typeof marsProtocolPerformance.$inferSelect;
export type NewMarsProtocolPerformance = typeof marsProtocolPerformance.$inferInsert;

export type MarsUserMonthlySummary = typeof marsUserMonthlySummary.$inferSelect;
export type NewMarsUserMonthlySummary = typeof marsUserMonthlySummary.$inferInsert;

export type WalletConnection = typeof walletConnections.$inferSelect;
export type NewWalletConnection = typeof walletConnections.$inferInsert;

// ============================================================
// Substreams Tables (Real-time event indexing)
// ============================================================

/**
 * Mars Vault Deposits - All deposit events from Substreams
 */
export const marsVaultDeposits = pgTable('mars_vault_deposits', {
  id: text('id').primaryKey(), // signature-vaultAddress
  signature: text('signature').notNull(),
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  amount: decimal('amount', { precision: 20, scale: 0 }).notNull(), // u64 as string
  sharesReceived: decimal('shares_received', { precision: 20, scale: 0 }).notNull(),
  protocolId: integer('protocol_id').notNull(), // 1=Kamino, 2=Jupiter, 3=Mars
  timestamp: timestamp('timestamp').notNull(),
  slot: decimal('slot', { precision: 20, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('mars_deposits_user_idx').on(table.userAddress),
  vaultIdx: index('mars_deposits_vault_idx').on(table.vaultAddress),
  timestampIdx: index('mars_deposits_timestamp_idx').on(table.timestamp),
  signatureIdx: index('mars_deposits_signature_idx').on(table.signature),
}));

/**
 * Mars Vault Withdrawals - All withdrawal events from Substreams
 */
export const marsVaultWithdrawals = pgTable('mars_vault_withdrawals', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull(),
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  sharesBurned: decimal('shares_burned', { precision: 20, scale: 0 }).notNull(),
  amountReceived: decimal('amount_received', { precision: 20, scale: 0 }).notNull(),
  protocolId: integer('protocol_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  slot: decimal('slot', { precision: 20, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('mars_withdrawals_user_idx').on(table.userAddress),
  vaultIdx: index('mars_withdrawals_vault_idx').on(table.vaultAddress),
  timestampIdx: index('mars_withdrawals_timestamp_idx').on(table.timestamp),
  signatureIdx: index('mars_withdrawals_signature_idx').on(table.signature),
}));

/**
 * Mars Vault Swaps - Swap+Deposit and Withdraw+Swap events
 */
export const marsVaultSwaps = pgTable('mars_vault_swaps', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull(),
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  fromToken: text('from_token').notNull(),
  toToken: text('to_token').notNull(),
  amountIn: decimal('amount_in', { precision: 20, scale: 0 }).notNull(),
  amountOut: decimal('amount_out', { precision: 20, scale: 0 }).notNull(),
  sharesReceived: decimal('shares_received', { precision: 20, scale: 0 }),
  protocolId: integer('protocol_id').notNull(),
  swapType: text('swap_type').notNull(), // 'swap_and_deposit' | 'withdraw_with_swap'
  slippageBps: integer('slippage_bps'),
  timestamp: timestamp('timestamp').notNull(),
  slot: decimal('slot', { precision: 20, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('mars_swaps_user_idx').on(table.userAddress),
  vaultIdx: index('mars_swaps_vault_idx').on(table.vaultAddress),
  timestampIdx: index('mars_swaps_timestamp_idx').on(table.timestamp),
  typeIdx: index('mars_swaps_type_idx').on(table.swapType),
}));

/**
 * Mars Vault Rebalances - Protocol rebalancing events
 */
export const marsVaultRebalances = pgTable('mars_vault_rebalances', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull(),
  vaultAddress: text('vault_address').notNull(),
  protocolFrom: integer('protocol_from').notNull(),
  protocolTo: integer('protocol_to').notNull(),
  amountIn: decimal('amount_in', { precision: 20, scale: 0 }).notNull(),
  amountOut: decimal('amount_out', { precision: 20, scale: 0 }).notNull(),
  executor: text('executor').notNull(),
  reason: text('reason'),
  timestamp: timestamp('timestamp').notNull(),
  slot: decimal('slot', { precision: 20, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  vaultIdx: index('mars_rebalances_vault_idx').on(table.vaultAddress),
  timestampIdx: index('mars_rebalances_timestamp_idx').on(table.timestamp),
}));

/**
 * Mars Vault States - Current vault state snapshots (updated by Substreams)
 */
export const marsVaultStates = pgTable('mars_vault_states', {
  vaultAddress: text('vault_address').primaryKey(),
  admin: text('admin').notNull(),
  baseTokenMint: text('base_token_mint').notNull(),
  sharesMint: text('shares_mint').notNull(),
  totalDeposits: decimal('total_deposits', { precision: 20, scale: 0 }).notNull(),
  totalShares: decimal('total_shares', { precision: 20, scale: 0 }).notNull(),
  currentApy: decimal('current_apy', { precision: 10, scale: 4 }), // APY in basis points
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'closed'
  createdAt: timestamp('created_at').notNull(),
  lastUpdated: timestamp('last_updated').notNull(),
}, (table) => ({
  statusIdx: index('mars_vault_states_status_idx').on(table.status),
  updatedIdx: index('mars_vault_states_updated_idx').on(table.lastUpdated),
}));

/**
 * Mars User Positions - Aggregated user positions per vault
 */
export const marsUserPositions = pgTable('mars_user_positions', {
  id: text('id').primaryKey(), // userAddress-vaultAddress
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  totalShares: decimal('total_shares', { precision: 20, scale: 0 }).notNull(),
  totalDeposited: decimal('total_deposited', { precision: 20, scale: 0 }).notNull(),
  totalWithdrawn: decimal('total_withdrawn', { precision: 20, scale: 0 }).notNull(),
  realizedPnl: decimal('realized_pnl', { precision: 20, scale: 0 }).notNull(), // Can be negative
  firstDepositTime: timestamp('first_deposit_time').notNull(),
  lastActivityTime: timestamp('last_activity_time').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('mars_positions_user_idx').on(table.userAddress),
  vaultIdx: index('mars_positions_vault_idx').on(table.vaultAddress),
  userVaultUnique: uniqueIndex('mars_positions_user_vault_unique').on(table.userAddress, table.vaultAddress),
}));

// ============================================================
// Substreams Relations
// ============================================================

export const marsVaultDepositsRelations = relations(marsVaultDeposits, ({ one }) => ({
  vaultState: one(marsVaultStates, {
    fields: [marsVaultDeposits.vaultAddress],
    references: [marsVaultStates.vaultAddress],
  }),
}));

export const marsVaultWithdrawalsRelations = relations(marsVaultWithdrawals, ({ one }) => ({
  vaultState: one(marsVaultStates, {
    fields: [marsVaultWithdrawals.vaultAddress],
    references: [marsVaultStates.vaultAddress],
  }),
}));

export const marsVaultStatesRelations = relations(marsVaultStates, ({ many }) => ({
  deposits: many(marsVaultDeposits),
  withdrawals: many(marsVaultWithdrawals),
  swaps: many(marsVaultSwaps),
  rebalances: many(marsVaultRebalances),
  positions: many(marsUserPositions),
}));

export const marsUserPositionsRelations = relations(marsUserPositions, ({ one }) => ({
  vaultState: one(marsVaultStates, {
    fields: [marsUserPositions.vaultAddress],
    references: [marsVaultStates.vaultAddress],
  }),
}));

// ============================================================
// Substreams Type Exports
// ============================================================

export type MarsVaultDeposit = typeof marsVaultDeposits.$inferSelect;
export type NewMarsVaultDeposit = typeof marsVaultDeposits.$inferInsert;

export type MarsVaultWithdrawal = typeof marsVaultWithdrawals.$inferSelect;
export type NewMarsVaultWithdrawal = typeof marsVaultWithdrawals.$inferInsert;

export type MarsVaultSwap = typeof marsVaultSwaps.$inferSelect;
export type NewMarsVaultSwap = typeof marsVaultSwaps.$inferInsert;

export type MarsVaultRebalance = typeof marsVaultRebalances.$inferSelect;
export type NewMarsVaultRebalance = typeof marsVaultRebalances.$inferInsert;

export type MarsVaultState = typeof marsVaultStates.$inferSelect;
export type NewMarsVaultState = typeof marsVaultStates.$inferInsert;

export type MarsUserPosition = typeof marsUserPositions.$inferSelect;
export type NewMarsUserPosition = typeof marsUserPositions.$inferInsert;

