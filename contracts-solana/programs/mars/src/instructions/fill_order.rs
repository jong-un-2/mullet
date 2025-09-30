use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::mem::size_of;

#[derive(Accounts)]
#[instruction(amount: u64, seed: [u8; 32], order_hash: [u8; 32],)]
pub struct FillOrder<'info> {
    //  need to check eligible withdraw
    //  receives USDC
    #[account(mut)]
    pub orchestrator: Signer<'info>,

    //  Needed to check user pre and post swap balances
    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub receiver: AccountInfo<'info>,

    //  Stores orchestrator info
    #[account(
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump,
        constraint = orchestrator_state.authorized == true @MarsError::IllegalOrchestrator,
        constraint = orchestrator_state.fill_order_permission == true @MarsError::InvalidOrchestratorPermission
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
        seeds = [ASSET_SEED],
        bump,
    )]
    pub asset: Box<Account<'info, Asset>>,

    // USDC token account of the orchestrator
    // orchestrator ata is already initialized
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = orchestrator,
    )]
    pub ata_orchestrator: Box<Account<'info, TokenAccount>>,

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

    // The mint of token out
    #[account(mut)]
    pub token_out: Box<Account<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = orchestrator,
        seeds = [&order_hash, ORDER_SEED],
        bump,
        space = 2 * size_of::<Order>() + 8,
    )]
    pub order: Box<Account<'info, Order>>,

    //  Needed to transfer tokens
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl FillOrder<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        amount: u64,
        seed: [u8; 32],
        order_hash: [u8; 32],
        trader: [u8; 32],
        src_chain_id: u32,
        dest_chain_id: u32,
        token_in: [u8; 32],
        fee: u64,
        min_amount_out: String,
    ) -> Result<()> {
        msg!("withdraw USDC amount: {:?}", amount);

        require!(src_chain_id != dest_chain_id, MarsError::SameSourceAndDestinationChainIds);

        if ctx.accounts.order.status != OrderStatus::Unexistant {
            return err!(MarsError::OrderAlreadyExists);
        }

        require!(amount > 0, MarsError::ZeroAmount);
        require!(fee < amount, MarsError::ExcessFee);

        let order = &mut ctx.accounts.order;

        order.amount_in = amount;
        order.seed = seed;
        order.trader = trader;
        order.receiver = ctx.accounts.receiver.key().to_bytes();
        order.src_chain_id = src_chain_id;
        order.dest_chain_id = dest_chain_id;
        order.token_in = token_in;
        order.fee = fee;
        order.status = OrderStatus::Filled;
        order.min_amount_out = min_amount_out.clone();
        order.token_out = ctx.accounts.token_out.key().to_bytes();
        order.order_hash = order_hash;

        let global_state = &ctx.accounts.global_state;
        let current_balance = get_vault_balance(&ctx.accounts.ata_vault)?;

        let asset = &ctx.accounts.asset;
        let unclaimed_fees = asset.get_unclaimed_fees();
        let withdraw_amount = amount - order.fee;
        require!(
            balance_within_threshold(
                current_balance,
                current_balance - withdraw_amount,
                global_state.rebalance_threshold,
                unclaimed_fees
            ),
            MarsError::NeedRebalance
        );

        // Transfer USDC from vault to orchestrator
        token_transfer_with_signer(
            ctx.accounts.ata_vault.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.ata_orchestrator.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            &[&[VAULT_SEED, &[ctx.bumps.vault]]],
            withdraw_amount,
        )?;

        msg!(
            "OrderFilled: {{\
            \"seed\":\"{:?}\",\
            \"order_hash\":\"{:?}\",\
            \"trader\":\"{:?}\",\
            \"receiver\":\"{:?}\",\
            \"token_in\":\"{:?}\",\
            \"token_out\":\"{:?}\",\
            \"amount_out\":{},\
            \"min_amount_out\":{},\
            \"src_chain_id\":{},\
            \"dest_chain_id\":{},\
            \"fee\":{},\
            \"status\":\"{}\"\
            }}",
            seed,
            order_hash,
            trader,
            ctx.accounts.receiver.key().to_bytes(),
            token_in,
            ctx.accounts.token_out.key().to_bytes(),
            amount,
            min_amount_out,
            src_chain_id,
            dest_chain_id,
            fee,
            "Filled"
        );

        Ok(())
    }
}
