use crate::*;

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    //  Pending admin
    #[account(
        mut,
        constraint = global_state.pending_admin == Some(new_admin.key()) @MarsError::InvalidAdmin
    )]
    pub new_admin: Signer<'info>,

    //  Stores admin address
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

impl AcceptAuthority<'_> {
    pub fn process_instruction(ctx: Context<Self>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        global_state.admin = ctx.accounts.new_admin.key();
        global_state.pending_admin = None;

        msg!(
            "AcceptedAuthority: {{\
            \"new_admin\":\"{:?}\"\
            }}",
            ctx.accounts.new_admin.key()
        );

        Ok(())
    }
}
