use crate::*;

#[derive(Accounts)]
pub struct UpdateGlobalStateParams<'info> {
    // only admin can add orchestrators
    #[account(
        mut,
        constraint = global_state.admin == *admin.key @MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

impl UpdateGlobalStateParams<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        rebalance_threshold: Option<u16>,
        cross_chain_fee_bps: Option<u16>,
        max_order_amount: Option<u64>,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        global_state.rebalance_threshold =
            rebalance_threshold.unwrap_or(global_state.rebalance_threshold);
        global_state.cross_chain_fee_bps =
            cross_chain_fee_bps.unwrap_or(global_state.cross_chain_fee_bps);
        global_state.max_order_amount = max_order_amount.unwrap_or(global_state.max_order_amount);

        msg!(
            "Updated global state params, new rebalance_threshold: {:?}, new cross_chain_fee_bps: {:?}, new max_order_amount: {:?}",
            global_state.rebalance_threshold,
            global_state.cross_chain_fee_bps,
            global_state.max_order_amount,
        );

        msg!(
            "UpdateGlobalStateParams: {{\
            \"admin\":\"{:?}\",\
            \"rebalance_threshold\":\"{:?}\",\
            \"cross_chain_fee_bps\":\"{:?}\",\
            \"max_order_amount\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            global_state.rebalance_threshold,
            global_state.cross_chain_fee_bps,
            global_state.max_order_amount,
        );
        Ok(())
    }
}
