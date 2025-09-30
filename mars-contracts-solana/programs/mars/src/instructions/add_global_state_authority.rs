use crate::*;

#[derive(Accounts)]
pub struct AddGlobalStateAuthority<'info> {
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
        init_if_needed,
        // assuming max 10 freeze and 10 thaw authorities
        space = 8 + std::mem::size_of::<GlobalStateAuthority>() + (MAX_FREEZE_AUTHORITY_LENGTH * 32) + (MAX_THAW_AUTHORITY_LENGTH * 32),
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump,
        payer = admin
    )]
    pub global_state_authority: Box<Account<'info, GlobalStateAuthority>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl AddGlobalStateAuthority<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        authority_address: Pubkey,
        is_freeze_authority: bool,
    ) -> Result<()> {
        let global_state_authority = &mut ctx.accounts.global_state_authority;
        if is_freeze_authority {
            require!(
                !global_state_authority.freeze_authority.contains(&authority_address),
                MarsError::AuthorityAlreadyExists
            );
            require!(
                global_state_authority.freeze_authority.len() < MAX_FREEZE_AUTHORITY_LENGTH,
                MarsError::MaxAuthoritiesAlreadySet
            );
            global_state_authority.freeze_authority.push(authority_address);
        } else {
            require!(
                !global_state_authority.thaw_authority.contains(&authority_address),
                MarsError::AuthorityAlreadyExists
            );
            require!(
                global_state_authority.thaw_authority.len() < MAX_THAW_AUTHORITY_LENGTH,
                MarsError::MaxAuthoritiesAlreadySet
            );
            global_state_authority.thaw_authority.push(authority_address);
        }
        msg!(
            "AddedGlobalStateAuthority: {{\
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
