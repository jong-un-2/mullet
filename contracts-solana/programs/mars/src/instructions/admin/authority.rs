use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

// ============================================================================
// Initialize - 初始化全局状态
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    //  Global state
    #[account(
        init,
        space = 2 * (8 + std::mem::size_of::<GlobalState>()),
        seeds = [GLOBAL_SEED],
        bump,
        payer = admin
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Asset
    #[account(
        init,
        space = 2 * (8 + std::mem::size_of::<Asset>()),
        seeds = [ASSET_SEED],
        bump,
        payer = admin
    )]
    pub asset: Box<Account<'info, Asset>>,

    //  Store deposited assets
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,

    //  USDC ata of vault
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = usdc_mint,

        //  Authority is set to vault
        associated_token::authority = vault,
    )]
    pub ata_vault: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        platform_fee_wallet: Option<Pubkey>,
    ) -> Result<()> {
        msg!("Initializing global state, admin: {:?}", ctx.accounts.admin.key());
        let global_state = &mut ctx.accounts.global_state;

        //  initialize global state
        global_state.admin = ctx.accounts.admin.key();
        global_state.rebalance_threshold = 0;
        global_state.cross_chain_fee_bps = 30; //  0.3%
        global_state.base_mint = ctx.accounts.usdc_mint.key();
        global_state.frozen = false;
        global_state.max_order_amount = 100_000_000_000; // 100k USDC

        // Set platform_fee_wallet: use provided value or default to admin
        global_state.platform_fee_wallet = platform_fee_wallet.unwrap_or(ctx.accounts.admin.key());
        msg!("Platform fee wallet set to: {:?}", global_state.platform_fee_wallet);

        let rent = Rent::get()?;
        let space = TokenAccount::LEN;
        let token_lamports = rent.minimum_balance(0) + rent.minimum_balance(space);

        sol_transfer_user(
            ctx.accounts.admin.to_account_info().clone(),
            ctx.accounts.vault.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
            token_lamports,
        )
    }
}

// ============================================================================
// Nominate Authority - 提名新管理员
// ============================================================================

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

// ============================================================================
// Accept Authority - 接受管理员角色
// ============================================================================

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

// ============================================================================
// Add/Remove Global State Authority - 管理 Freeze/Thaw 权限
// ============================================================================

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
        space = 8 + std::mem::size_of::<GlobalStateAuthority>(),
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
            // Add the freeze authority
            global_state_authority.freeze_authority.push(authority_address);
        } else {
            require!(
                !global_state_authority.thaw_authority.contains(&authority_address),
                MarsError::AuthorityAlreadyExists
            );
            // Add the thaw authority
            global_state_authority.thaw_authority.push(authority_address);
        }

        msg!(
            "AddGlobalStateAuthority: {{\
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
