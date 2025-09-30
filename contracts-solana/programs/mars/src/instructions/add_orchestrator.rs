use crate::*;

#[derive(Accounts)]
pub struct AddOrchestrator<'info> {
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

    //  orchestrator to be added
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub orchestrator: AccountInfo<'info>,

    //  Stores orchestrator info
    #[account(
        init_if_needed,
        space = 8 + std::mem::size_of::<OrchestratorState>(),
        seeds = [orchestrator.key().as_ref(), ORCHESTRATOR_SEED],
        bump,
        payer = admin
    )]
    pub orchestrator_state: Box<Account<'info, OrchestratorState>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl AddOrchestrator<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        fill_order_permission: bool,
        revert_order_permission: bool,
        remove_bridge_liquidity_permission: bool,
        claim_base_fee_permission: bool,
        claim_lp_fee_permission: bool,
        claim_protocol_fee_permission: bool,
    ) -> Result<()> {
        require!(
            ctx.accounts.admin.key() != ctx.accounts.orchestrator.key(),
            MarsError::InvalidOrchestrator
        );

        let orchestrator_state = &mut ctx.accounts.orchestrator_state;

        orchestrator_state.authorized = true;
        orchestrator_state.fill_order_permission = fill_order_permission;
        orchestrator_state.revert_order_permission = revert_order_permission;
        orchestrator_state.remove_bridge_liquidity_permission = remove_bridge_liquidity_permission;
        orchestrator_state.claim_base_fee_permission = claim_base_fee_permission;
        orchestrator_state.claim_lp_fee_permission = claim_lp_fee_permission;
        orchestrator_state.claim_protocol_fee_permission = claim_protocol_fee_permission;

        msg!(
            "AddedNewOrchestrator: {{\
            \"admin\":\"{:?}\",\
            \"fill_order_permission\":\"{:?}\",\
            \"revert_order_permission\":\"{:?}\",\
            \"remove_bridge_liquidity_permission\":\"{:?}\",\
            \"claim_base_fee_permission\":\"{:?}\",\
            \"claim_lp_fee_permission\":\"{:?}\",\
            \"claim_protocol_fee_permission\":\"{:?}\",\
            \"orchestrator_address\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            fill_order_permission,
            revert_order_permission,
            remove_bridge_liquidity_permission,
            claim_base_fee_permission,
            claim_lp_fee_permission,
            claim_protocol_fee_permission,
            ctx.accounts.orchestrator.key()
        );

        Ok(())
    }
}
