use crate::*;

#[derive(Accounts)]
pub struct RemoveOrchestrator<'info> {
    // only admin can add orchestrators
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

    //  orchestrator to be removed
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub orchestrator: AccountInfo<'info>,

    //  Stores orchestrator info
    #[account(
        mut,
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump
    )]
    pub orchestrator_state: Box<Account<'info, OrchestratorState>>,
}

impl RemoveOrchestrator<'_> {
    pub fn process_instruction(ctx: Context<Self>) -> Result<()> {
        let orchestrator_state = &mut ctx.accounts.orchestrator_state;

        orchestrator_state.authorized = false;

        msg!(
            "RemovedOrchestrator: {{\
            \"admin\":\"{:?}\",\
            \"orchestrator_address\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            ctx.accounts.orchestrator.key()
        );

        Ok(())
    }
}
