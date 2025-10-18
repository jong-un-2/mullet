/// Kamino Vaults 程序信息
pub mod kamino {

use anchor_lang::prelude::*;

/// Kamino Vaults Program ID (V2 - Current Mainnet Version)
/// Program ID: KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd
/// 注意: 这是Kamino V2程序，主网上所有活跃的vault都使用这个版本
/// V1程序 (Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE) 已废弃
pub const KAMINO_PROGRAM_ID: Pubkey = pubkey!("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");

/// Kamino Lend (Klend) Program ID
/// Program ID: KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
pub const KLEND_PROGRAM_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

/// Jupiter Program ID for DEX aggregation
pub const JUPITER_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

/// USDC Mint Address (Solana Mainnet)
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/// SOL Wrapped Mint Address
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

/// Protocol IDs for supported yield protocols
pub const PROTOCOL_KAMINO: u8 = 1;
pub const PROTOCOL_LIDO: u8 = 2;
pub const PROTOCOL_MARINADE: u8 = 3;
pub const PROTOCOL_JITO: u8 = 4;

// === Kamino 指令识别码 ===

/// Deposit 指令的识别码 (基于 Kamino IDL)
pub const DEPOSIT_INSTRUCTION_DISCRIMINATOR: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];

/// Withdraw 指令的识别码
pub const WITHDRAW_INSTRUCTION_DISCRIMINATOR: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];

/// Redeem 指令的识别码
pub const REDEEM_INSTRUCTION_DISCRIMINATOR: [u8; 8] = [184, 12, 86, 149, 70, 196, 97, 225];

/// Borrow 指令的识别码
pub const BORROW_INSTRUCTION_DISCRIMINATOR: [u8; 8] = [228, 253, 131, 202, 207, 116, 89, 18];

/// Repay 指令的识别码
pub const REPAY_INSTRUCTION_DISCRIMINATOR: [u8; 8] = [234, 103, 67, 82, 208, 234, 219, 166];

/// Default fee configurations (in basis points)
pub const DEFAULT_DEPOSIT_FEE_BPS: u16 = 0;      // 0% deposit fee
pub const DEFAULT_WITHDRAW_FEE_BPS: u16 = 50;    // 0.5% withdraw fee
pub const DEFAULT_MANAGEMENT_FEE_BPS: u16 = 200; // 2% annual management fee
pub const DEFAULT_PERFORMANCE_FEE_BPS: u16 = 1000; // 10% performance fee
pub const DEFAULT_PLATFORM_FEE_BPS: u16 = 30;    // 0.3% platform fee

/// Slippage and risk management
pub const MAX_SLIPPAGE_BPS: u16 = 500;           // 5% maximum slippage
pub const DEFAULT_SLIPPAGE_BPS: u16 = 100;       // 1% default slippage
pub const REBALANCE_THRESHOLD_BPS: u16 = 500;    // 5% rebalance threshold

/// Vault limits
pub const MAX_USERS_PER_VAULT: usize = 1000;
pub const MAX_PROTOCOLS_PER_VAULT: usize = 10;
pub const MAX_REBALANCE_HISTORY: usize = 100;

/// Seeds for PDA derivation
pub const VAULT_STATE_SEED: &[u8] = b"vault-state";
pub const VAULT_TREASURY_SEED: &[u8] = b"vault-treasury";
pub const GLOBAL_STATE_SEED: &[u8] = b"mars-global-state"; // Mars protocol global state

/// Event discriminators for indexing
pub const VAULT_DEPOSIT_EVENT: &str = "VaultDepositEvent";
pub const VAULT_WITHDRAW_EVENT: &str = "VaultWithdrawEvent";
pub const REBALANCE_EVENT: &str = "RebalanceEvent";
pub const SWAP_EVENT: &str = "SwapEvent";    /// Kamino Multisig
    pub const KAMINO_MULTISIG: &str = "8ksXVE6SMSjQ9sPbj2XQ4Uxx6b7aXh9kHeq4nXMD2tDn";
    
    /// IDL账户地址
    pub const KAMINO_IDL_ACCOUNT: &str = "6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc";
}

/// Kamino指令选择器（基于IDL）
pub mod instructions {
    /// 存款指令选择器
    pub const DEPOSIT: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];
    
    /// 提取指令选择器
    pub const WITHDRAW: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];
    
    /// 收获奖励指令选择器
    pub const HARVEST: [u8; 8] = [37, 144, 78, 123, 45, 78, 90, 12];
}

/// Kamino账户大小
pub mod account_sizes {
    /// Vault状态账户大小
    pub const VAULT_STATE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 32;
    
    /// 用户份额账户大小（标准代币账户）
    pub const USER_SHARES: usize = 165;
    
    /// 用户代币账户大小
    pub const USER_TOKEN: usize = 165;
}