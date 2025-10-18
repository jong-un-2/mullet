use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::state::*;
use crate::error::MarsError;

#[derive(Accounts)]
#[instruction(vault_id: [u8; 32])]
pub struct InitializeVault<'info> {
    /// 管理员账户 - 必须是 global admin
    #[account(
        mut,
        constraint = admin.key() == global_state.admin @ MarsError::OnlyAdmin,
    )]
    pub admin: Signer<'info>,

    /// Global state - 必须已经初始化
    #[account(
        seeds = [b"global-state"],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Vault state - 要初始化的账户
    #[account(
        init,
        payer = admin,
        space = VaultState::space(),
        seeds = [b"vault-state", vault_id.as_ref()],
        bump,
    )]
    pub vault_state: Box<Account<'info, VaultState>>,

    /// 基础代币 Mint (例如 USDC, PYUSD)
    pub base_token_mint: Account<'info, Mint>,

    /// 份额代币 Mint (代表用户在 vault 中的权益)
    /// 注意：需要预先创建好
    pub shares_mint: Account<'info, Mint>,

    /// Vault Treasury (PDA)
    /// CHECK: PDA 验证
    #[account(
        seeds = [b"vault-treasury", vault_id.as_ref()],
        bump,
    )]
    pub vault_treasury: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeVault<'info> {
    pub fn process_instruction(
        ctx: Context<Self>,
        vault_id: [u8; 32],
        platform_fee_bps: u16,
    ) -> Result<()> {
        msg!("🏦 Initializing new vault");
        msg!("  Vault ID: {:?}", vault_id);
        msg!("  Base token: {}", ctx.accounts.base_token_mint.key());
        msg!("  Admin: {}", ctx.accounts.admin.key());

        // 验证平台费率在合理范围内 (0-10000 = 0%-100%)
        require!(
            platform_fee_bps <= 10_000,
            MarsError::InvalidParameter
        );

        let vault_state = &mut ctx.accounts.vault_state;
        let bump = ctx.bumps.vault_state;

        // 初始化 vault state
        vault_state.vault_id = vault_id;
        vault_state.admin = ctx.accounts.admin.key();
        vault_state.pending_admin = None;
        vault_state.base_token_mint = ctx.accounts.base_token_mint.key();
        vault_state.shares_mint = ctx.accounts.shares_mint.key();
        vault_state.treasury = ctx.accounts.vault_treasury.key();
        vault_state.total_deposits = 0;
        vault_state.total_shares = 0;
        vault_state.created_at = Clock::get()?.unix_timestamp;
        vault_state.last_updated = Clock::get()?.unix_timestamp;
        vault_state.status = VaultStatus::Active;
        vault_state.bump = bump;

        // 初始化空的动态数组
        vault_state.supported_protocols = Vec::new();
        vault_state.user_deposits = Vec::new();
        vault_state.rebalance_history = Vec::new();

        // 初始化费用配置
        vault_state.fee_config = FeeConfig {
            deposit_fee_bps: crate::kamino_constants::kamino::DEFAULT_DEPOSIT_FEE_BPS,
            withdraw_fee_bps: crate::kamino_constants::kamino::DEFAULT_WITHDRAW_FEE_BPS,
            management_fee_bps: crate::kamino_constants::kamino::DEFAULT_MANAGEMENT_FEE_BPS,
            performance_fee_bps: crate::kamino_constants::kamino::DEFAULT_PERFORMANCE_FEE_BPS,
            fee_recipient: ctx.accounts.admin.key(),
        };

        vault_state.platform_fee_bps = platform_fee_bps;
        vault_state.max_slippage_bps = crate::kamino_constants::kamino::MAX_SLIPPAGE_BPS;

        // 初始化费用统计
        vault_state.unclaimed_deposit_fee = 0;
        vault_state.unclaimed_withdraw_fee = 0;
        vault_state.unclaimed_management_fee = 0;
        vault_state.unclaimed_performance_fee = 0;
        vault_state.total_deposit_fee_collected = 0;
        vault_state.total_withdraw_fee_collected = 0;
        vault_state.total_management_fee_collected = 0;
        vault_state.total_performance_fee_collected = 0;
        vault_state.total_rewards_claimed = 0;
        vault_state.total_platform_fee_collected = 0;

        // 保留字段
        vault_state.reserved = [0u8; 48];

        msg!("✅ Vault initialized successfully");
        msg!("  Platform fee: {} bps ({}%)", platform_fee_bps, platform_fee_bps as f64 / 100.0);
        msg!("  Vault bump: {}", bump);

        Ok(())
    }
}
