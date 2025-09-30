use crate::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

#[derive(Accounts)]
#[instruction(dest_chain_id: u32)]
pub struct SetFeeTiers<'info> {
    // only admin can add target_chain_min_fees
    #[account(
        mut,
        constraint = global_state.admin == *admin.key @MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Stores target_chain_min_fee info
    #[account(
        init_if_needed,
        space = FeeTiers::space(),
        seeds = [FEE_TIERS_SEED],
        bump,
        payer = admin
    )]
    pub fee_tiers: Box<Account<'info, FeeTiers>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl SetFeeTiers<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        threshold_amounts: &Vec<u64>,
        bps_fees: &Vec<u64>,
    ) -> Result<()> {
        let threshold_length = threshold_amounts.len();

        // Check for empty arrays
        require!(threshold_length > 0, MarsError::EmptyArray);
        require!(bps_fees.len() > 0, MarsError::EmptyArray);

        // Check for length mismatch
        require!(threshold_length == bps_fees.len(), MarsError::FeeTiersLengthMismatched);

        // Check for maximum allowed length
        require!(threshold_length <= MAX_FEE_TIERS_LENGTH, MarsError::FeeTiersLengthExceeded);

        let fee_tiers = &mut ctx.accounts.fee_tiers;
        fee_tiers.length = threshold_length as u16;

        let mut temp_fee_tiers: Vec<FeeTier> = Vec::new();
        let mut prev_threshold = 0;

        for i in 0..threshold_length {
            let threshold_amount = threshold_amounts[i];
            let bps_fee = bps_fees[i];

            // Ensure tiers are in strictly ascending order
            if i > 0 {
                require!(threshold_amount > prev_threshold, MarsError::InvalidAmount);
            }

            // Validate bps fee does not exceed BASE_PERCENTAGE
            require!(bps_fee <= BASE_PERCENTAGE, MarsError::InvalidBpsFee);

            prev_threshold = threshold_amount;

            temp_fee_tiers.push(FeeTier {
                threshold_amount,
                bps_fee,
            });
        }

        fee_tiers.fee_tiers = temp_fee_tiers;

        msg!(
            "SetFeeTiers: {{\
            \"admin\":\"{:?}\",\
            \"threshold_amounts\":\"{:?}\",\
            \"bps_fees\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            threshold_amounts,
            bps_fees
        );

        Ok(())
    }
}
