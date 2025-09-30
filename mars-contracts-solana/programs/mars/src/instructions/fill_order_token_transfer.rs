use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct FillOrderTokenTransfer<'info> {
    //  need this to check the deposit amount is correct
    #[account(mut)]
    pub orchestrator: Signer<'info>,

    //  Needed to check user pre and post swap balances
    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub receiver: AccountInfo<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Stores orchestrator info
    #[account(
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump,
    )]
    pub orchestrator_state: Box<Account<'info, OrchestratorState>>,

    #[account(
        init_if_needed,
        associated_token::mint = token_out,
        associated_token::authority = orchestrator,
        payer = orchestrator,
    )]
    pub orchestrator_token_out_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        associated_token::mint = token_out,
        associated_token::authority = receiver,
        payer = orchestrator,
    )]
    pub receiver_token_out_ata: Box<Account<'info, TokenAccount>>,

    // The mint of token out
    #[account()]
    pub token_out: Box<Account<'info, Mint>>,

    //  Needed to transfer tokens
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl FillOrderTokenTransfer<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        min_amount_out: u64,
        orchestrator_prev_balance: u64,
    ) -> Result<()> {
        //  check orchestrator is eligible
        let orchestrator_state = &ctx.accounts.orchestrator_state;

        require!(orchestrator_state.authorized == true, MarsError::IllegalOrchestrator);

        let orchestrator_token_out_amount = ctx.accounts.orchestrator_token_out_ata.amount;
        let token_swap_amount = orchestrator_token_out_amount - orchestrator_prev_balance;

        require!(token_swap_amount >= min_amount_out, MarsError::InsufficientTokenOut);

        // Check if token_out is Wrapped SOL
        let is_wrapped_sol = ctx.accounts.token_out.key().to_string() == WRAPPED_SOL_MINT;

        if is_wrapped_sol {
            // Unwrap SOL and send directly to receiver
            unwrap_and_transfer_sol(
                ctx.accounts.orchestrator_token_out_ata.to_account_info().clone(),
                ctx.accounts.orchestrator.to_account_info().clone(),
                ctx.accounts.receiver.to_account_info().clone(),
                ctx.accounts.token_program.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone(),
                token_swap_amount,
            )?;
        } else {
            token_transfer_user(
                ctx.accounts.orchestrator_token_out_ata.to_account_info().clone(),
                ctx.accounts.orchestrator.to_account_info().clone(),
                ctx.accounts.receiver_token_out_ata.to_account_info().clone(),
                ctx.accounts.token_program.to_account_info().clone(),
                token_swap_amount,
            )?;
        }

        msg!(
            "TokenTransferred: {{\
            \"token_out\":\"{:?}\",\
            \"receiver\":\"{:?}\",\
            \"min_amount_out\":\"{:?}\",\
            \"token_swap_amount\":\"{:?}\"\
            }}",
            ctx.accounts.token_out.key().to_bytes(),
            ctx.accounts.receiver.key().to_bytes(),
            min_amount_out,
            token_swap_amount,
        );

        Ok(())
    }
}
