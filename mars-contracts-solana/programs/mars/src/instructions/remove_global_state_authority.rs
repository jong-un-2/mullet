use crate::*;

#[derive(Accounts)]
pub struct RemoveGlobalStateAuthority<'info> {
    // only admin can add GlobalStateAuthority
    #[account(
        mut,
        constraint = global_state.admin == *admin.key @MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Stores GlobalStateAuthority info
    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump,
    )]
    pub global_state_authority: Box<Account<'info, GlobalStateAuthority>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl RemoveGlobalStateAuthority<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        authority_address: Pubkey,
        is_freeze_authority: bool,
    ) -> Result<()> {
        let global_state_authority = &mut ctx.accounts.global_state_authority;
        if is_freeze_authority {
            require!(
                global_state_authority.freeze_authority.contains(&authority_address),
                MarsError::AuthorityDoesNotExist
            );
            // Remove the freeze authority
            global_state_authority.freeze_authority.retain(|&x| x != authority_address);
        } else {
            require!(
                global_state_authority.thaw_authority.contains(&authority_address),
                MarsError::AuthorityDoesNotExist
            );
            // Remove the thaw authority
            global_state_authority.thaw_authority.retain(|&x| x != authority_address);
        }

        msg!(
            "RemoveGlobalStateAuthority: {{\
            \"admin\":\"{:?}\",\
            \"authority_address\":\"{:?}\",\
            \"is_freeze_authority\":\"{:?}\"\
            }}",
            ctx.accounts.admin.key(),
            authority_address.key(),
            is_freeze_authority
        );

        Ok(())
    }
}
