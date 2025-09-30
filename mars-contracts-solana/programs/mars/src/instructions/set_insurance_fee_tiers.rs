use crate::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

#[derive(Accounts)]
#[instruction(dest_chain_id: u32)]
pub struct SetInsuranceFeeTiers<'info> {
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
        space = InsuranceFeeTiers::space(),
        seeds = [INSURANCE_FEE_TIERS_SEED],
        bump,
        payer = admin
    )]
    pub insurance_fee_tiers: Box<Account<'info, InsuranceFeeTiers>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl SetInsuranceFeeTiers<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        threshold_amounts: &Vec<u64>,
        insurance_fees: &Vec<u64>,
    ) -> Result<()> {
        let threshold_length = threshold_amounts.len();

        // Check for empty arrays
        require!(threshold_length > 0, MarsError::EmptyArray);
        require!(insurance_fees.len() > 0, MarsError::EmptyArray);

        // Check for length mismatch
        require!(threshold_length == insurance_fees.len(), MarsError::InsuranceFeeTiersLengthMismatched);

        // Check for maximum allowed length
        require!(threshold_length <= MAX_FEE_TIERS_LENGTH, MarsError::InsuranceFeeTiersLengthExceeded);

        let insurance_fee_tiers = &mut ctx.accounts.insurance_fee_tiers;
        insurance_fee_tiers.length = threshold_length as u16;

        let mut temp_fee_tiers: Vec<InsuranceFeeTier> = Vec::new();
        let mut prev_threshold = 0;

        for i in 0..threshold_length {
            let threshold_amount = threshold_amounts[i];
            let insurance_fee = insurance_fees[i];

            // Ensure tiers are in strictly ascending order
            if i > 0 {
                require!(threshold_amount > prev_threshold, MarsError::InvalidAmount);
            }

            // Validate insurance fee does not exceed BASE_PERCENTAGE
            require!(insurance_fee <= BASE_PERCENTAGE, MarsError::InvalidInsuranceFee);

            prev_threshold = threshold_amount;

            temp_fee_tiers.push(InsuranceFeeTier {
                threshold_amount,
                insurance_fee,
            });
        }

        insurance_fee_tiers.insurance_fee_tiers = temp_fee_tiers;

        msg!(
            "SetInsuranceFeeTiers: {{\
            \"admin\":\"{:?}\",\
            \"threshold_amounts\":\"{:?}\",\
            \"insurance_fees\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            threshold_amounts,
            insurance_fees
        );

        Ok(())
    }
}
