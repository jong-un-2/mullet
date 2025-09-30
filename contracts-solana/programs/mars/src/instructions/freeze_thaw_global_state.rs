use crate::*;

#[derive(Accounts)]
pub struct FreezeThawGlobalState<'info> {
    // only admin can add GlobalStateAuthority
    #[account(mut)]
    pub signer: Signer<'info>,

    //  Global state
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Stores GlobalStateAuthority info
    #[account(
        seeds = [GLOBAL_AUTHORITY_SEED],
        bump,
    )]
    pub global_state_authority: Box<Account<'info, GlobalStateAuthority>>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl FreezeThawGlobalState<'_> {
    pub fn freeze_global_state(ctx: Context<Self>) -> Result<()> {
        let global_state_authority = &ctx.accounts.global_state_authority;
        require!(
            global_state_authority.freeze_authority.contains(&ctx.accounts.signer.key),
            MarsError::InvalidAuthority
        );

        let global_state = &mut ctx.accounts.global_state;
        global_state.frozen = true;

        msg!(
            "FreezeGlobalState: {{\
            \"signer\":\"{:?}\"\
            }}",
            ctx.accounts.signer.key(),
        );

        Ok(())
    }

    pub fn thaw_global_state(ctx: Context<Self>) -> Result<()> {
        let global_state_authority = &ctx.accounts.global_state_authority;
        require!(
            global_state_authority.thaw_authority.contains(&ctx.accounts.signer.key),
            MarsError::InvalidAuthority
        );

        let global_state = &mut ctx.accounts.global_state;
        global_state.frozen = false;

        msg!(
            "ThawGlobalState: {{\
            \"signer\":\"{:?}\"\
            }}",
            ctx.accounts.signer.key(),
        );

        Ok(())
    }
}
