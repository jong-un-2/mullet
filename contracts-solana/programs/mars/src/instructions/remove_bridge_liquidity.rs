use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct RemoveBridgeLiquidity<'info> {
    // only admin can remove bridge liquidity
    // receives USDC
    #[account(mut)]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.admin == admin.key() @MarsError::InvalidAdmin,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Asset
    #[account(
        seeds = [ASSET_SEED],
        bump,
    )]
    pub asset: Box<Account<'info, Asset>>,

    //  USDC token account of the admin
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = admin,
    )]
    pub ata_admin: Box<Account<'info, TokenAccount>>,

    //  Needed to check vault authority
    #[account(	
        seeds = [VAULT_SEED],	
        bump,	
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,

    //  USDC ata of vault
    #[account(
        mut, 
        associated_token::mint = usdc_mint, 
        
        //  Authority is set to vault
        associated_token::authority = vault,
    )]
    pub ata_vault: Box<Account<'info, TokenAccount>>,

    // The mint of $USDC because it's needed from above ⬆ token::mint = ...
    #[account(
        address = global_state.base_mint,
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl RemoveBridgeLiquidity<'_> {
    pub fn process_instruction(ctx: Context<Self>, amount: u64) -> Result<()> {
        let current_balance = get_vault_balance(&ctx.accounts.ata_vault)?;

        let asset = &ctx.accounts.asset;
        let unclaimed_fees = asset.get_unclaimed_fees();
        require!(
            balance_within_threshold(
                current_balance,
                current_balance
                    .checked_sub(amount)
                    .ok_or(MarsError::InvalidAmount)?,
                ctx.accounts.global_state.rebalance_threshold,
                unclaimed_fees
            ),
            MarsError::NeedRebalance
        );

        msg!(
            "RemoveBridgeLiquidity: {{\
            \"admin\":\"{:?}\",\
            \"current_balance\":\"{:?}\",\
            \"amount\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            current_balance,
            amount
        );

        // Transfer USDC from vault to admin
        token_transfer_with_signer(
            ctx.accounts.ata_vault.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.ata_admin.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            &[&[VAULT_SEED, &[ctx.bumps.vault]]],
            amount,
        )
    }
}
