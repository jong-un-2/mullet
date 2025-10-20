/**
 * PostgreSQL Database Schema using Drizzle ORM
 * Mars Protocol Tables - Substreams Real-time Event Indexing
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  decimal,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Mars Vault Events - Real-time event indexing from Substreams
// ============================================================

/**
 * Mars Vault Deposits - All deposit events from Substreams
 */
export const marsVaultDeposits = pgTable('mars_vault_deposits', {
  id: text('id').primaryKey(),
  signature: text('signature').notNull(),
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  amount: decimal('amount', { precision: 20, scale: 0 }).notNull(),
  sharesReceived: decimal('shares_received', { precision: 20, scale: 0 }).notNull(),
  protocolId: integer('protocol_id').notNull(),
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
  swapType: text('swap_type').notNull(),
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
  currentApy: decimal('current_apy', { precision: 10, scale: 4 }),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull(),
  lastUpdated: timestamp('last_updated').notNull(),
}, (table) => ({
  statusIdx: index('mars_vault_states_status_idx').on(table.status),
  updatedIdx: index('mars_vault_states_updated_idx').on(table.lastUpdated),
}));

/**
 * Mars User Positions - Aggregated user positions per vault
 * Extended with Kamino/Jupiter protocol details
 */
export const marsUserPositions = pgTable('mars_user_positions', {
  id: text('id').primaryKey(),
  userAddress: text('user_address').notNull(),
  vaultAddress: text('vault_address').notNull(),
  
  // Core position data
  totalShares: decimal('total_shares', { precision: 20, scale: 0 }).notNull(),
  totalDeposited: decimal('total_deposited', { precision: 20, scale: 0 }).notNull(),
  totalWithdrawn: decimal('total_withdrawn', { precision: 20, scale: 0 }).notNull(),
  realizedPnl: decimal('realized_pnl', { precision: 20, scale: 0 }).notNull(),
  
  // Protocol specific fields
  protocol: text('protocol').notNull(), // 'kamino' | 'jupiter' | 'mars'
  strategyAddress: text('strategy_address'), // Kamino strategy or Jupiter vault address
  strategyName: text('strategy_name'), // Strategy/Farm name
  
  // Token information
  baseToken: text('base_token').notNull(), // PYUSD, SOL, USDC, etc.
  baseTokenMint: text('base_token_mint').notNull(),
  rewardTokens: text('reward_tokens'), // JSON array of reward token mints
  
  // Performance metrics
  currentValue: decimal('current_value', { precision: 20, scale: 0 }), // Current position value in base token
  unrealizedPnl: decimal('unrealized_pnl', { precision: 20, scale: 0 }), // Current unrealized profit/loss
  apr: decimal('apr', { precision: 10, scale: 4 }), // Annual Percentage Rate
  apy: decimal('apy', { precision: 10, scale: 4 }), // Annual Percentage Yield (with compounding)
  
  // TVL and liquidity
  tvl: decimal('tvl', { precision: 20, scale: 0 }), // Total Value Locked in strategy
  liquidityDepth: decimal('liquidity_depth', { precision: 20, scale: 0 }), // Available liquidity for withdrawal
  
  // Rewards tracking
  pendingRewards: text('pending_rewards'), // JSON object: { tokenMint: amount }
  totalRewardsClaimed: text('total_rewards_claimed'), // JSON object: { tokenMint: totalAmount }
  lastRewardClaim: timestamp('last_reward_claim'), // Last time rewards were claimed
  
  // Risk and status
  riskLevel: text('risk_level'), // 'low' | 'medium' | 'high'
  status: text('status').notNull().default('active'), // 'active' | 'unstaking' | 'closed'
  
  // Timestamps
  firstDepositTime: timestamp('first_deposit_time').notNull(),
  lastActivityTime: timestamp('last_activity_time').notNull(),
  lastFetchTime: timestamp('last_fetch_time'), // Last time data was fetched from chain
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('mars_positions_user_idx').on(table.userAddress),
  vaultIdx: index('mars_positions_vault_idx').on(table.vaultAddress),
  protocolIdx: index('mars_positions_protocol_idx').on(table.protocol),
  statusIdx: index('mars_positions_status_idx').on(table.status),
  lastFetchIdx: index('mars_positions_last_fetch_idx').on(table.lastFetchTime),
  userVaultUnique: uniqueIndex('mars_positions_user_vault_unique').on(table.userAddress, table.vaultAddress),
}));

// ============================================================
// Relations
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
// Type Exports
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
