use crate::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token};

#[derive(Accounts)]
#[instruction(dest_chain_id: u32)]
pub struct SetProtocolFeeFraction<'info> {
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
        space = 8 + std::mem::size_of::<ProtocolFeeFraction>(),
        seeds = [PROTOCOL_FEE_FRACTION_SEED],
        bump,
        payer = admin
    )]
    pub protocol_fee_fraction: Box<Account<'info, ProtocolFeeFraction>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl SetProtocolFeeFraction<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        protocol_fee_numerator: u64,
        protocol_fee_denominator: u64,
    ) -> Result<()> {
        require!(protocol_fee_denominator > 0, MarsError::ZeroDenominator);
        let protocol_fee_fraction = &mut ctx.accounts.protocol_fee_fraction;
        protocol_fee_fraction.numerator = protocol_fee_numerator;
        protocol_fee_fraction.denominator = protocol_fee_denominator;

        msg!(
            "SetProtocolFeeFraction: {{\
            \"admin\":\"{:?}\",\
            \"protocol_fee_numerator\":\"{:?}\",\
            \"protocol_fee_denominator\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            protocol_fee_numerator,
            protocol_fee_denominator
        );

        Ok(())
    }
}
