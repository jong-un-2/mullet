use anchor_lang::prelude::*;

// ============================================================
// 代币 Mint 地址
// ============================================================

/// USDC Mint Address (Solana Mainnet)
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/// Wrapped SOL Mint Address
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");

// 别名，保持向后兼容
pub const USDC_ADDRESS: Pubkey = USDC_MINT;
