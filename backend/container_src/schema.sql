-- Mars V8 Vaults Database Schema
-- Compatible with substreams-sink-sql PostgreSQL

-- Vault deposits table
CREATE TABLE IF NOT EXISTS mars_vault_deposits (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    user_pubkey TEXT NOT NULL,
    amount BIGINT NOT NULL,
    shares BIGINT NOT NULL,
    block_num BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL
);

-- Indexes for deposits table
CREATE INDEX IF NOT EXISTS idx_vault_deposits_vault_id ON mars_vault_deposits (vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_deposits_user ON mars_vault_deposits (user_pubkey);
CREATE INDEX IF NOT EXISTS idx_vault_deposits_block ON mars_vault_deposits (block_num);

-- Vault withdrawals table  
CREATE TABLE IF NOT EXISTS mars_vault_withdrawals (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    user_pubkey TEXT NOT NULL,
    shares BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    block_num BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL
);

-- Indexes for withdrawals table
CREATE INDEX IF NOT EXISTS idx_vault_withdrawals_vault_id ON mars_vault_withdrawals (vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_withdrawals_user ON mars_vault_withdrawals (user_pubkey);
CREATE INDEX IF NOT EXISTS idx_vault_withdrawals_block ON mars_vault_withdrawals (block_num);

-- Vault swaps table (Jupiter integration)
CREATE TABLE IF NOT EXISTS mars_vault_swaps (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    token_in_mint TEXT NOT NULL,
    token_out_mint TEXT NOT NULL,
    amount_in BIGINT NOT NULL,
    amount_out BIGINT NOT NULL,
    swap_type TEXT NOT NULL,
    jupiter_route JSONB,
    block_num BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL
);

-- Indexes for swaps table
CREATE INDEX IF NOT EXISTS idx_vault_swaps_vault_id ON mars_vault_swaps (vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_swaps_tokens ON mars_vault_swaps (token_in_mint, token_out_mint);
CREATE INDEX IF NOT EXISTS idx_vault_swaps_block ON mars_vault_swaps (block_num);

-- Vault rebalances table (Kamino integration)
CREATE TABLE IF NOT EXISTS mars_vault_rebalances (
    id TEXT PRIMARY KEY,
    vault_id TEXT NOT NULL,
    strategy_type TEXT NOT NULL,
    old_allocation JSONB NOT NULL,
    new_allocation JSONB NOT NULL,
    kamino_position_id TEXT,
    performance_fee BIGINT,
    block_num BIGINT NOT NULL,
    block_timestamp TIMESTAMP NOT NULL,
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL
);

-- Indexes for rebalances table
CREATE INDEX IF NOT EXISTS idx_vault_rebalances_vault_id ON mars_vault_rebalances (vault_id);
CREATE INDEX IF NOT EXISTS idx_vault_rebalances_strategy ON mars_vault_rebalances (strategy_type);
CREATE INDEX IF NOT EXISTS idx_vault_rebalances_block ON mars_vault_rebalances (block_num);

-- Vault states table (current snapshots)
CREATE TABLE IF NOT EXISTS mars_vault_states (
    vault_id TEXT PRIMARY KEY,
    total_assets BIGINT NOT NULL,
    total_shares BIGINT NOT NULL,
    asset_mint TEXT NOT NULL,
    share_mint TEXT NOT NULL,
    kamino_position_id TEXT,
    current_strategy TEXT NOT NULL,
    performance_fee_rate BIGINT NOT NULL,
    last_rebalance_block BIGINT,
    last_updated_block BIGINT NOT NULL,
    last_updated_timestamp TIMESTAMP NOT NULL
);

-- Indexes for vault states table
CREATE INDEX IF NOT EXISTS idx_vault_states_asset_mint ON mars_vault_states (asset_mint);
CREATE INDEX IF NOT EXISTS idx_vault_states_strategy ON mars_vault_states (current_strategy);
CREATE INDEX IF NOT EXISTS idx_vault_states_updated ON mars_vault_states (last_updated_block);

-- User positions table
CREATE TABLE IF NOT EXISTS mars_user_positions (
    id TEXT PRIMARY KEY,
    user_pubkey TEXT NOT NULL,
    vault_id TEXT NOT NULL,
    shares BIGINT NOT NULL,
    deposited_amount BIGINT NOT NULL,
    last_deposit_block BIGINT,
    last_withdraw_block BIGINT,
    created_block BIGINT NOT NULL,
    created_timestamp TIMESTAMP NOT NULL,
    updated_block BIGINT NOT NULL,
    updated_timestamp TIMESTAMP NOT NULL,
    UNIQUE(user_pubkey, vault_id)
);

-- Indexes for user positions table
CREATE INDEX IF NOT EXISTS idx_user_positions_user ON mars_user_positions (user_pubkey);
CREATE INDEX IF NOT EXISTS idx_user_positions_vault ON mars_user_positions (vault_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_shares ON mars_user_positions (shares);
CREATE INDEX IF NOT EXISTS idx_user_positions_updated ON mars_user_positions (updated_block);

-- Performance tracking view
CREATE OR REPLACE VIEW vault_performance AS
SELECT 
    vs.vault_id,
    vs.total_assets,
    vs.total_shares,
    vs.asset_mint,
    COALESCE(SUM(vd.amount), 0) as total_deposits,
    COALESCE(SUM(vw.amount), 0) as total_withdrawals,
    COUNT(DISTINCT vd.user_pubkey) as unique_depositors,
    COUNT(DISTINCT vw.user_pubkey) as unique_withdrawers,
    vs.last_updated_timestamp
FROM mars_vault_states vs
LEFT JOIN mars_vault_deposits vd ON vs.vault_id = vd.vault_id
LEFT JOIN mars_vault_withdrawals vw ON vs.vault_id = vw.vault_id
GROUP BY vs.vault_id, vs.total_assets, vs.total_shares, vs.asset_mint, vs.last_updated_timestamp;

-- Liquidity tracking view  
CREATE OR REPLACE VIEW vault_liquidity AS
SELECT
    vault_id,
    COUNT(*) as swap_count,
    SUM(amount_in) as total_volume_in,
    SUM(amount_out) as total_volume_out,
    COUNT(DISTINCT token_in_mint) as unique_tokens_in,
    COUNT(DISTINCT token_out_mint) as unique_tokens_out,
    MAX(block_timestamp) as last_swap_time
FROM mars_vault_swaps
GROUP BY vault_id;