use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        init,
        space = 2 * (8 + std::mem::size_of::<GlobalState>()),
        seeds = [GLOBAL_SEED],
        bump,
        payer = admin
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Asset
    #[account(
        init,
        space = 2 * (8 + std::mem::size_of::<Asset>()),
        seeds = [ASSET_SEED],
        bump,
        payer = admin
    )]
    pub asset: Box<Account<'info, Asset>>,

    //  Store deposited assets
    #[account(	
        mut,
        seeds = [VAULT_SEED],	
        bump
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,

    //  USDC ata of vault
    #[account(
        init_if_needed, 
        payer = admin,
        associated_token::mint = usdc_mint,
        
        //  Authority is set to vault
        associated_token::authority = vault,
    )]
    pub ata_vault: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    pub fn process_instruction(ctx: Context<Self>) -> Result<()> {
        msg!("Initializing global state, admin: {:?}", ctx.accounts.admin.key());
        let global_state = &mut ctx.accounts.global_state;

        //  initialize global state
        global_state.admin = ctx.accounts.admin.key();
        global_state.rebalance_threshold = 0;
        global_state.cross_chain_fee_bps = 30; //  0.3%
        global_state.base_mint = ctx.accounts.usdc_mint.key();
        global_state.frozen = false;
        global_state.max_order_amount = 100_000_000_000; // 100k USDC

        let rent = Rent::get()?;
        let space = TokenAccount::LEN;
        let token_lamports = rent.minimum_balance(0) + rent.minimum_balance(space);

        sol_transfer_user(
            ctx.accounts.admin.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
            token_lamports,
        )
    }
}
