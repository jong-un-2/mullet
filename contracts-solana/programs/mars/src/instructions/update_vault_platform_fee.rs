use crate::*;

/// 更新 Vault 的平台费率配置
/// 只有 admin 可以调用
#[derive(Accounts)]
pub struct UpdateVaultPlatformFee<'info> {
    /// Admin 账户
    #[account(
        mut,
        constraint = vault_state.admin == admin.key() @ MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,

    /// Vault state 账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Box<Account<'info, VaultState>>,
}

impl UpdateVaultPlatformFee<'_> {
    pub fn process_instruction(ctx: Context<Self>, new_platform_fee_bps: u16) -> Result<()> {
        // 验证费率在合理范围内（0-10000，即 0%-100%）
        require!(new_platform_fee_bps <= 10_000, MarsError::InvalidParameter);

        let vault_state = &mut ctx.accounts.vault_state;
        let old_fee = vault_state.platform_fee_bps;

        vault_state.platform_fee_bps = new_platform_fee_bps;
        vault_state.last_updated = Clock::get()?.unix_timestamp;

        msg!("✅ Platform fee updated for vault");
        msg!("  Vault mint: {}", vault_state.base_token_mint);
        msg!("  Old fee: {} bps ({}%)", old_fee, old_fee as f64 / 100.0);
        msg!("  New fee: {} bps ({}%)", new_platform_fee_bps, new_platform_fee_bps as f64 / 100.0);
        msg!("  Updated by: {}", ctx.accounts.admin.key());

        // 发出平台费更新事件
        emit!(crate::events::PlatformFeeUpdatedEvent {
            vault_id: vault_state.vault_id,
            old_platform_fee_bps: old_fee,
            new_platform_fee_bps: new_platform_fee_bps,
            updated_by: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
