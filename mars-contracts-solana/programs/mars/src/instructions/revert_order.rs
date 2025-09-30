use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
#[instruction(order_hash: [u8; 32],)]
pub struct RevertOrder<'info> {
    //  need this to check the deposit amount is correct
    #[account(mut)]
    pub orchestrator: Signer<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub trader: AccountInfo<'info>,

    //  Stores orchestrator info
    #[account(
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump,
        constraint = orchestrator_state.authorized == true @MarsError::IllegalOrchestrator,
        constraint = orchestrator_state.revert_order_permission == true @MarsError::InvalidOrchestratorPermission
    )]
    pub orchestrator_state: Box<Account<'info, OrchestratorState>>,

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

    #[account(
        mut,
        seeds = [&order_hash, ORDER_SEED],
        bump,
    )]
    pub order: Box<Account<'info, Order>>,

    //  USDC token account of the trader
    #[account(
        init_if_needed,
        payer = trader,
        associated_token::mint = usdc_mint,
        associated_token::authority = trader,
    )]
    pub ata_trader: Box<Account<'info, TokenAccount>>,

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
    pub system_program: Program<'info, System>,
}

impl RevertOrder<'_> {
    pub fn process_instruction(ctx: Context<Self>, order_hash: [u8; 32],) -> Result<()> {
        msg!("Revert order with order_hash: {:?}", order_hash);

        let order = &mut ctx.accounts.order;

        let trader = &ctx.accounts.trader;
        // Convert trader key and orchestrator key to [u8; 32] for comparison
        let trader_key_bytes: [u8; 32] = trader.key().to_bytes();
        require!(
            trader_key_bytes == order.trader,
            MarsError::InvalidTrader
        );
       
        if order.status != OrderStatus::Created {
            return err!(MarsError::InvalidOrderStatus);
        }

        order.status = OrderStatus::Reverted;

        let refund_amount = order.amount_in - order.fee;

        let global_state = &ctx.accounts.global_state;
        let current_balance = get_vault_balance(&ctx.accounts.ata_vault)?;

        let asset = &ctx.accounts.asset;
        let unclaimed_fees = asset.get_unclaimed_fees();
        require!(
            balance_within_threshold(
                current_balance,
                current_balance - refund_amount,
                global_state.rebalance_threshold,
                unclaimed_fees
            ),
            MarsError::NeedRebalance
        );

        // Transfer USDC from vault to trader
        token_transfer_with_signer(
            ctx.accounts.ata_vault.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.ata_trader.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            &[&[VAULT_SEED, &[ctx.bumps.vault]]],
            refund_amount,
        )?;

         // Convert trader key
         let trader_key_bytes: [u8; 32] = ctx.accounts.trader.key().to_bytes();
        msg!(
            "OrderReverted: {{\
            \"order_hash\":\"{:?}\",\
            \"seed\":\"{:?}\",\
            \"receiver\":\"{:?}\",\
            \"trader\":\"{:?}\",\
            \"refund_amount\":\"{:?}\"\
            }}",
            order_hash,
            order.seed,
            order.receiver,
            trader_key_bytes,
            refund_amount,
        );

        Ok(())
    }
}