use anchor_lang::prelude::*;

/**
 * Stores global state of the program
 */
#[account]
#[derive(Default, Debug)]
pub struct GlobalState {
    //  admin address
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

    // Unclaimed base fee
    pub unclaimed_base_fee: u64,

    // Unclaimed lp fee, this is the fee that can be claimed by the investors
    pub unclaimed_lp_fee: u64,

    // Unclaimed protocol fee, this is the fee that can be claimed by the protocol
    pub unclaimed_protocol_fee: u64,

    // Unclaimed insurance fee, this is the fee that can be claimed by the protocol
    pub unclaimed_insurance_fee: u64,
}

#[account]
#[derive(Default)]
pub struct GlobalStateAuthority {
    // freeze authority
    pub freeze_authority: Vec<Pubkey>,

    // thaw authority
    pub thaw_authority: Vec<Pubkey>,
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
        self.unclaimed_base_fee + self.unclaimed_lp_fee + self.unclaimed_protocol_fee
    }
}
