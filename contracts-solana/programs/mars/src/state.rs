use anchor_lang::prelude::*;
use crate::constant::*;

// 导入新的 Vault 状态定义
pub mod vault_state;
pub use vault_state::*;

/**
 * Stores global state of the program
 */
#[account]
#[derive(Default, Debug)]
pub struct GlobalState {
    //  admin manages orchestrators
    pub admin: Pubkey,

    //  use this for 2 step ownership transfer
    pub pending_admin: Option<Pubkey>,

    // The maximum % of deviation from total_assets
    pub rebalance_threshold: u16,

    // rate of cross chain fee
    pub cross_chain_fee_bps: u16,

    // base mint -> USDC mint
    pub base_mint: Pubkey,

    // if set to true, no new orders can be created
    pub frozen: bool,

    // maximum allowed amount for an order
    pub max_order_amount: u64,

    // Platform fee wallet address for collecting fees from farm rewards
    pub platform_fee_wallet: Pubkey,

    // unused u64, can be used in future, added to avoid data migration
    pub unused_u64_1: u64,

    // unused u64, can be used in future, added to avoid data migration
    pub unused_u64_2: u64,
}
/**
 * Stores states of the assets of the pool
 */
#[account]
#[derive(Default)]
pub struct Asset {
    // Total fee collected
    pub total_fee_collected: u64,

    // Base fee collected, this is the fee that will be used for operational cost
    pub base_fee_collected: u64,

    // lp fee collected, this is the fee can be claimed by investors
    pub lp_fee_collected: u64,

     // protocol fee collected, this is the fee that goes to the protocol
    pub protocol_fee_collected: u64,

    // Insurance fee collected, this is the fee that will be used in case of loss of funds due to block reorganisation
    pub insurance_fee_collected: u64,

    // Unclaimed base fee, this is the fee that can be claimed by the orchestrator
    pub unclaimed_base_fee: u64,

    // Unclaimed lp fee, this is the fee that can be claimed by the investors
    pub unclaimed_lp_fee: u64,

    // Unclaimed protocol fee, this is the fee that can be claimed by the protocol
    pub unclaimed_protocol_fee: u64,

    // Unclaimed insurance fee, this is the fee that can be claimed by the protocol
    pub unclaimed_insurance_fee: u64,
}

#[derive(Default, Clone, Debug, AnchorDeserialize, AnchorSerialize)]
pub struct FeeTier {
    pub threshold_amount: u64,
    pub bps_fee: u64,
}

/**
 * Stores fee tiers to be levied
 */
#[account]
#[derive(Default, Debug)]
pub struct FeeTiers {
    pub length: u16,
    pub fee_tiers: Vec<FeeTier>,
}

/**
 * Stores insurance fee fraction
 * This is the fee that will be levied on the order amount
 * to cover the insurance cost
 * This is a fraction, so the numerator and denominator must be specified
 * e.g. 1/10000 = 0.01% fee
 * e.g. 1/1000 = 0.1% fee
 * e.g. 1/100 = 1% fee
 */
#[account]
#[derive(Default, Debug)]
pub struct ProtocolFeeFraction {
    pub numerator: u64,
    pub denominator: u64,
}

#[derive(Default, Clone, Debug, AnchorDeserialize, AnchorSerialize)]
pub struct InsuranceFeeTier {
    pub threshold_amount: u64,
    pub insurance_fee: u64,
}

/**
 * Stores fee tiers to be levied
 */
#[account]
#[derive(Default, Debug)]
pub struct InsuranceFeeTiers {
    pub length: u16,
    pub insurance_fee_tiers: Vec<InsuranceFeeTier>,
}

#[account]
#[derive(Default)]
pub struct GlobalStateAuthority {
    // freeze authority
    pub freeze_authority: Vec<Pubkey>,

    // thaw authority
    pub thaw_authority: Vec<Pubkey>,
}

/**
 * State of an orchestrator
 */
#[account]
#[derive(Default)]
pub struct OrchestratorState {
    //  orchestrator address
    pub orchestrator: Pubkey,

    //  authorized/unauthorized
    pub authorized: bool,

    // fill order permission
    pub fill_order_permission: bool,

    // revert order permission
    pub revert_order_permission: bool,

    // remove bridge liquidity permission
    pub remove_bridge_liquidity_permission: bool,

    // claim base fee permission
    pub claim_base_fee_permission: bool,

    // claim lp fee permission
    pub claim_lp_fee_permission: bool,

    // claim protocol fee permission
    pub claim_protocol_fee_permission: bool,

    // unused space for future use
    pub unused_space: [bool; 8],
}

#[account]
#[derive(Default)]
pub struct TargetChainMinFee {
    // chain id
    pub dest_chain_id: u32,

    // mint of token_in (corresponding to bytes32 in Solidity)
    pub token_in: [u8; 32],

    // minimum fee
    pub min_fee: u64,
}

/**
 * State of an order
 */
#[derive(Default, Clone, Copy, Debug, PartialEq, Eq)]
#[derive(anchor_lang::AnchorDeserialize, anchor_lang::AnchorSerialize)]
#[repr(u16)]
pub enum OrderStatus {
    #[default]
    Unexistant,
    Created,
    Filled,
    Reverted,
}

/**
 * Stores state of an order
 */
#[account]
#[derive(Default, Debug)]
pub struct Order {
    pub seed: [u8; 32],

    // amount of token_in
    pub amount_in: u64,

    // 32-byte trader public key on the source chain (corresponding to bytes32 in Solidity)
    pub trader: [u8; 32],

    // 32-byte trader public key on the destination chain (corresponding to bytes32 in Solidity)
    pub receiver: [u8; 32],

    // chain id of the source chain
    pub src_chain_id: u32,

    // chain id of the destination chain
    pub dest_chain_id: u32,

    // unused i64, will be removed if we do data migration
    pub unused_i64_1: i64,

    // mint of token_in (corresponding to bytes32 in Solidity)
    pub token_in: [u8; 32],

    // status of the order
    pub status: OrderStatus,

    // fee associated with the order
    pub fee: u64,

    // minimum amount out the receiver expects
    pub min_amount_out: String,

    // mint of token out (corresponding to bytes32 in Solidity)
    pub token_out: [u8; 32],

    // uinique identifier of the order outside the chain
    pub order_hash: [u8; 32],
}

impl GlobalState {
    #[cfg(feature = "test-bpf")]
    pub fn generate_pda() -> Pubkey {
        use crate::ID;

        Pubkey::find_program_address(&[GLOBAL_SEED], &ID).0
    }

    #[cfg(feature = "test-bpf")]
    pub fn generate_vault_pda() -> Pubkey {
        use crate::ID;

        Pubkey::find_program_address(&[VAULT_SEED], &ID).0
    }

    #[cfg(feature = "test-bpf")]
    pub fn generate_asset_pda() -> Pubkey {
        use crate::ID;

        Pubkey::find_program_address(&[ASSET_SEED], &ID).0
    }
}

impl Asset {
    pub fn get_unclaimed_fees(&self) -> u64 {
        self.unclaimed_base_fee
            + self.unclaimed_lp_fee
            + self.unclaimed_protocol_fee
    }
}

impl FeeTiers {
    pub fn space() -> usize {
        // 10 fee tiers max can be stored
        return 8
            + std::mem::size_of::<Self>()
            + (std::mem::size_of::<u64>() * 2 * MAX_FEE_TIERS_LENGTH);
    }

    /// Determines the basis points fee based on order size.
    /// Returns the bps fee for the appropriate tier.
    /// If no tiers are set or amount is below the first tier, returns 0.
    pub fn get_bps_fee_for_amount(fee_tiers: &Vec<FeeTier>, amount: u64) -> u64 {
        if fee_tiers.is_empty() {
            return 0;
        }

        // Default to the lowest tier fee
        let mut bps_fee = fee_tiers[0].bps_fee;

        // Find the appropriate tier based on amount
        for tier in fee_tiers.iter() {
            if amount >= tier.threshold_amount {
                bps_fee = tier.bps_fee;
            } else {
                // Once we've found a tier with a threshold higher than the amount, stop
                break;
            }
        }

        bps_fee
    }
}

impl InsuranceFeeTiers {
    pub fn space() -> usize {
        // 10 fee tiers max can be stored
        return 8
            + std::mem::size_of::<Self>()
            + (std::mem::size_of::<u64>() * 2 * MAX_FEE_TIERS_LENGTH);
    }

    /// Determines the insurance fee based on order size.
    /// Returns the insurance fee for the appropriate tier.
    /// If no tiers are set or amount is below the first tier, returns 0.
    pub fn get_insurance_fee_for_amount(fee_tiers: &Vec<InsuranceFeeTier>, amount: u64) -> u64 {
        if fee_tiers.is_empty() {
            return 0;
        }

        // Default to the lowest tier fee
        let mut insurance_fee = fee_tiers[0].insurance_fee;

        // Find the appropriate tier based on amount
        for tier in fee_tiers.iter() {
            if amount >= tier.threshold_amount {
                insurance_fee = tier.insurance_fee;
            } else {
                // Once we've found a tier with a threshold higher than the amount, stop
                break;
            }
        }

        insurance_fee
    }
}

impl ProtocolFeeFraction {
    pub fn get_protocol_fee(&self, bps_amount: u64) -> u64 {
        let numerator_u128 = self.numerator as u128;
        let denominator_u128 = self.denominator as u128;
        let fee = numerator_u128 * bps_amount as u128 / denominator_u128;

        fee as u64
    }
}