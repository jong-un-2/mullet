use crate::*;

#[derive(Accounts)]
pub struct NominateAuthority<'info> {
    // Current admin
    #[account(
        mut,
        constraint = global_state.admin == *admin.key @MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,

    //  Stores admin address
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

impl NominateAuthority<'_> {
    pub fn process_instruction(ctx: Context<Self>, new_admin: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        global_state.pending_admin = Some(new_admin);

        msg!(
            "NominateAuthority: {{\
            \"admin\":\"{:?}\",\
            \"new_admin\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            new_admin.key(),
        );

        Ok(())
    }
}
