use anchor_lang::prelude::*;
use anchor_lang::solana_program::{pubkey, pubkey::Pubkey};

//  seeds
pub const GLOBAL_SEED: &[u8] = b"genius-global-state-seed";
pub const GLOBAL_AUTHORITY_SEED: &[u8] = b"genius-global-authority";
pub const ASSET_SEED: &[u8] = b"asset-seed";
pub const FEE_TIERS_SEED: &[u8] = b"fee-tiers-seed";
pub const TARGET_CHAIN_MIN_FEE_SEED: &[u8] = b"genius-target-chain-min-fee";
pub const PROTOCOL_FEE_FRACTION_SEED: &[u8] = b"protocol-fee-fraction-seed";
pub const INSURANCE_FEE_TIERS_SEED: &[u8] = b"insurance-fee-tiers-seed";

pub const VAULT_SEED: &[u8] = b"genius-vault";
pub const ORDER_SEED: &[u8] = b"genius-order";

//  address of stable coin (devnet)
// pub const USDC_ADDRESS: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// //  address of stable coin (mainnet)
pub const USDC_ADDRESS: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const MAX_FREEZE_AUTHORITY_LENGTH: usize = 10;
pub const MAX_THAW_AUTHORITY_LENGTH: usize = 10;
pub const MAX_FEE_TIERS_LENGTH: usize = 10;
pub const BASE_PERCENTAGE: u64 = 10_000;

// Wrapped SOL address
pub const WRAPPED_SOL_MINT: &str = "So11111111111111111111111111111111111111112";

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq, AnchorDeserialize, AnchorSerialize)]
#[repr(u8)]
pub enum FeeType {
    #[default]
    Deposit = 0,
    Withdraw = 1,
    Management = 2,
    Performance = 3,
}
