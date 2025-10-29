use crate::constants::GLOBAL_SEED;
use crate::error::MarsError;
use crate::state::*;
use anchor_lang::prelude::*;

/// 更新平台费用钱包地址
/// 只有管理员可以调用此指令
#[derive(Accounts)]
pub struct UpdatePlatformFeeWallet<'info> {
    /// Admin/Authority
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Global state
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.admin == admin.key() @ MarsError::OnlyAdmin,
    )]
    pub global_state: Box<Account<'info, GlobalState>>,
}

impl<'info> UpdatePlatformFeeWallet<'info> {
    pub fn process_instruction(
        ctx: Context<UpdatePlatformFeeWallet>,
        new_platform_fee_wallet: Pubkey,
    ) -> Result<()> {
        let old_wallet = ctx.accounts.global_state.platform_fee_wallet;

        msg!("🔧 Updating platform fee wallet");
        msg!("  Old wallet: {}", old_wallet);
        msg!("  New wallet: {}", new_platform_fee_wallet);

        // 验证新地址不是默认值
        require!(new_platform_fee_wallet != Pubkey::default(), MarsError::InvalidParameter);

        // 更新平台费用钱包地址
        ctx.accounts.global_state.platform_fee_wallet = new_platform_fee_wallet;

        msg!("✅ Platform fee wallet updated successfully");

        // 发出平台费钱包更新事件
        emit!(crate::events::PlatformFeeWalletUpdatedEvent {
            old_wallet,
            new_wallet: new_platform_fee_wallet,
            updated_by: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
