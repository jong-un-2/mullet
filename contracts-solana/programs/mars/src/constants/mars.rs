// ============================================================
// Mars Protocol 核心常量
// ============================================================

// === PDA Seeds ===
pub const GLOBAL_SEED: &[u8] = b"mars-global-state-seed";
pub const GLOBAL_AUTHORITY_SEED: &[u8] = b"mars-global-authority";
pub const VAULT_SEED: &[u8] = b"mars-vault";
pub const VAULT_STATE_SEED: &[u8] = b"vault-state";
pub const VAULT_TREASURY_SEED: &[u8] = b"vault-treasury";
pub const ASSET_SEED: &[u8] = b"asset-seed";
pub const ORDER_SEED: &[u8] = b"mars-order";
pub const FEE_TIERS_SEED: &[u8] = b"fee-tiers-seed";
pub const TARGET_CHAIN_MIN_FEE_SEED: &[u8] = b"mars-target-chain-min-fee";
pub const PROTOCOL_FEE_FRACTION_SEED: &[u8] = b"protocol-fee-fraction-seed";
pub const INSURANCE_FEE_TIERS_SEED: &[u8] = b"insurance-fee-tiers-seed";

// === Array Limits ===
pub const MAX_FREEZE_AUTHORITY_LENGTH: usize = 10;
pub const MAX_THAW_AUTHORITY_LENGTH: usize = 10;
pub const MAX_FEE_TIERS_LENGTH: usize = 10;
pub const MAX_USERS_PER_VAULT: usize = 1000;
pub const MAX_PROTOCOLS_PER_VAULT: usize = 10;
pub const MAX_REBALANCE_HISTORY: usize = 100;

// === Fee Configurations (Basis Points) ===
pub const BASE_PERCENTAGE: u64 = 10_000;
pub const DEFAULT_PLATFORM_FEE_BPS: u64 = 2500; // 25%
pub const MAX_PLATFORM_FEE_BPS: u64 = 10_000; // 100%
pub const DEFAULT_DEPOSIT_FEE_BPS: u16 = 0; // 0%
pub const DEFAULT_WITHDRAW_FEE_BPS: u16 = 50; // 0.5%
pub const DEFAULT_MANAGEMENT_FEE_BPS: u16 = 200; // 2% annual
pub const DEFAULT_PERFORMANCE_FEE_BPS: u16 = 1000; // 10%

// === Risk Management ===
pub const MAX_SLIPPAGE_BPS: u16 = 500; // 5%
pub const DEFAULT_SLIPPAGE_BPS: u16 = 100; // 1%
pub const REBALANCE_THRESHOLD_BPS: u16 = 500; // 5%

// === Event Names ===
pub const VAULT_DEPOSIT_EVENT: &str = "VaultDepositEvent";
pub const VAULT_WITHDRAW_EVENT: &str = "VaultWithdrawEvent";
pub const REBALANCE_EVENT: &str = "RebalanceEvent";
pub const SWAP_EVENT: &str = "SwapEvent";

// === Account Sizes ===
pub const VAULT_STATE_SIZE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 32;
pub const TOKEN_ACCOUNT_SIZE: usize = 165;
pub const MINT_ACCOUNT_SIZE: usize = 82;
