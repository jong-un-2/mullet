use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};

#[derive(Accounts)]
#[instruction(dest_chain_id: u32)]
pub struct SetTargetChainMinFee<'info> {
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
        space = 8 + std::mem::size_of::<TargetChainMinFee>(),
        seeds = [dest_chain_id.to_le_bytes().as_ref(), usdc_mint.key().as_ref(), TARGET_CHAIN_MIN_FEE_SEED],
        bump,
        payer = admin
    )]
    pub target_chain_min_fee: Box<Account<'info, TargetChainMinFee>>,

    // The mint of $USDC because it's needed from above ⬆ token::mint = ...
    #[account(
        address = global_state.base_mint,
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl SetTargetChainMinFee<'_> {
    pub fn process_instruction(ctx: Context<Self>, dest_chain_id: u32, min_fee: u64) -> Result<()> {
        let target_chain_min_fee = &mut ctx.accounts.target_chain_min_fee;
        target_chain_min_fee.dest_chain_id = dest_chain_id;
        target_chain_min_fee.token_in = ctx.accounts.usdc_mint.key().to_bytes();
        target_chain_min_fee.min_fee = min_fee;

        msg!(
            "SetTargetChainMinFee: {{\
            \"admin\":\"{:?}\",\
            \"dest_chain_id\":\"{:?}\",\
            \"min_fee\":\"{:?}\",\
            \"token_in\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            dest_chain_id,
            min_fee,
            ctx.accounts.usdc_mint.key()
        );

        Ok(())
    }
}
