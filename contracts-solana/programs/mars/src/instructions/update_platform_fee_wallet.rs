use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::MarsError;

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
        seeds = [b"global-state"],
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
        msg!("🔧 Updating platform fee wallet");
        msg!("  Old wallet: {}", ctx.accounts.global_state.platform_fee_wallet);
        msg!("  New wallet: {}", new_platform_fee_wallet);

        // 验证新地址不是默认值
        require!(
            new_platform_fee_wallet != Pubkey::default(),
            MarsError::InvalidParameter
        );

        // 更新平台费用钱包地址
        ctx.accounts.global_state.platform_fee_wallet = new_platform_fee_wallet;

        msg!("✅ Platform fee wallet updated successfully");

        Ok(())
    }
}
