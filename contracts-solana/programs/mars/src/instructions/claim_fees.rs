use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct ClaimFees<'info> {
    //  need to check eligible withdraw
    #[account(mut)]
    pub orchestrator: Signer<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Asset
    #[account(
        mut,
        seeds = [ASSET_SEED],
        bump,
    )]
    pub asset: Box<Account<'info, Asset>>,

    //  Stores orchestrator info
    #[account(
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump,
        constraint = orchestrator_state.authorized == true @MarsError::IllegalOrchestrator,
    )]
    pub orchestrator_state: Box<Account<'info, OrchestratorState>>,

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

    //  USDC token account of the orchestrator
    #[account(
        init_if_needed,
        payer = orchestrator,
        associated_token::mint = usdc_mint,
        associated_token::authority = orchestrator,
    )]
    pub ata_orchestrator: Box<Account<'info, TokenAccount>>,

    // The mint of $USDC because it's needed from above ⬆ token::mint = ...
    #[account(
        address = global_state.base_mint,
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl ClaimFees<'_> {
    pub fn process_instruction(ctx: Context<Self>, amount: u64, fee_type: FeeType) -> Result<()> {
        //  check orchestrator is eligible
        let orchestrator_state = &ctx.accounts.orchestrator_state;

        let asset = &mut ctx.accounts.asset;

        match fee_type {
            FeeType::Base => {
                require!((orchestrator_state.claim_base_fee_permission == true), MarsError::InvalidOrchestratorPermission);
                require!(asset.unclaimed_base_fee >= amount, MarsError::InvalidAmount);
                asset.unclaimed_base_fee -= amount;
            }
            FeeType::Lp => {
                require!((orchestrator_state.claim_lp_fee_permission == true), MarsError::InvalidOrchestratorPermission);
                require!(asset.unclaimed_lp_fee >= amount, MarsError::InvalidAmount);
                asset.unclaimed_lp_fee -= amount;
            }
            FeeType::Protocol => {
                require!((orchestrator_state.claim_protocol_fee_permission == true), MarsError::InvalidOrchestratorPermission);
                require!(asset.unclaimed_protocol_fee >= amount, MarsError::InvalidAmount);
                asset.unclaimed_protocol_fee -= amount;
            }

        }

        msg!(
            "ClaimedFee: {{\
            \"orchestrator_address\":\"{:?}\",\
            \"amount\":\"{:?}\",\
            \"fee_type\":\"{:?}\"\
            }}",
            ctx.accounts.orchestrator.key(),
            amount,
            fee_type
        );

        // Transfer USDC from vault to orchestrator
        token_transfer_with_signer(
            ctx.accounts.ata_vault.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.ata_orchestrator.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            &[&[VAULT_SEED, &[ctx.bumps.vault]]],
            amount,
        )
    }
}
