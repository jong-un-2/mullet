use crate::error::CustomError;
use crate::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ClaimFees<'info> {
    /// 管理员（必须是 vault 的 admin）
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump,
        constraint = vault_state.admin == admin.key() @ CustomError::OnlyAdmin
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Mars Vault 的代币金库（费用存储处）
    #[account(
        mut,
        seeds = [b"vault-treasury", vault_state.vault_id.as_ref()],
        bump
    )]
    pub vault_treasury: Account<'info, TokenAccount>,

    /// 管理员的代币账户（接收费用）
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

impl ClaimFees<'_> {
    pub fn process_instruction(ctx: Context<Self>, amount: u64, fee_type: FeeType) -> Result<()> {
        let vault_state = &mut ctx.accounts.vault_state;

        // 验证并更新对应的费用
        match fee_type {
            FeeType::Deposit => {
                require!(vault_state.unclaimed_deposit_fee >= amount, MarsError::InvalidAmount);
                vault_state.unclaimed_deposit_fee = vault_state
                    .unclaimed_deposit_fee
                    .checked_sub(amount)
                    .ok_or(MarsError::InvalidAmount)?;
                msg!("💳 Claiming deposit fee: {}", amount);
            }
            FeeType::Withdraw => {
                require!(vault_state.unclaimed_withdraw_fee >= amount, MarsError::InvalidAmount);
                vault_state.unclaimed_withdraw_fee = vault_state
                    .unclaimed_withdraw_fee
                    .checked_sub(amount)
                    .ok_or(MarsError::InvalidAmount)?;
                msg!("💳 Claiming withdraw fee: {}", amount);
            }
            FeeType::Management => {
                require!(vault_state.unclaimed_management_fee >= amount, MarsError::InvalidAmount);
                vault_state.unclaimed_management_fee = vault_state
                    .unclaimed_management_fee
                    .checked_sub(amount)
                    .ok_or(MarsError::InvalidAmount)?;
                msg!("💳 Claiming management fee: {}", amount);
            }
            FeeType::Performance => {
                require!(vault_state.unclaimed_performance_fee >= amount, MarsError::InvalidAmount);
                vault_state.unclaimed_performance_fee = vault_state
                    .unclaimed_performance_fee
                    .checked_sub(amount)
                    .ok_or(MarsError::InvalidAmount)?;
                msg!("💳 Claiming performance fee: {}", amount);
            }
        }

        // 从 vault treasury 转账到管理员账户
        let vault_id = vault_state.vault_id;
        let bump = vault_state.bump;
        let seeds = &[b"vault-state".as_ref(), vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_treasury.to_account_info(),
                to: ctx.accounts.admin_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer_seeds,
        );
        anchor_spl::token::transfer(transfer_ctx, amount)?;

        msg!(
            "✅ ClaimedFee: admin={}, amount={}, fee_type={:?}",
            ctx.accounts.admin.key(),
            amount,
            fee_type
        );

        Ok(())
    }

    /// 提取所有未认领的费用
    pub fn claim_all_fees(ctx: Context<Self>) -> Result<()> {
        let vault_state = &ctx.accounts.vault_state;

        let total_unclaimed = vault_state
            .unclaimed_deposit_fee
            .checked_add(vault_state.unclaimed_withdraw_fee)
            .and_then(|v| v.checked_add(vault_state.unclaimed_management_fee))
            .and_then(|v| v.checked_add(vault_state.unclaimed_performance_fee))
            .ok_or(MarsError::InvalidAmount)?;

        require!(total_unclaimed > 0, MarsError::InvalidAmount);

        msg!("💰 Claiming all fees: total={}", total_unclaimed);
        msg!("  - Deposit: {}", vault_state.unclaimed_deposit_fee);
        msg!("  - Withdraw: {}", vault_state.unclaimed_withdraw_fee);
        msg!("  - Management: {}", vault_state.unclaimed_management_fee);
        msg!("  - Performance: {}", vault_state.unclaimed_performance_fee);

        // 转账总金额
        let vault_id = vault_state.vault_id;
        let bump = vault_state.bump;
        let seeds = &[b"vault-state".as_ref(), vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_treasury.to_account_info(),
                to: ctx.accounts.admin_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer_seeds,
        );
        anchor_spl::token::transfer(transfer_ctx, total_unclaimed)?;

        // 清零所有未认领费用
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.unclaimed_deposit_fee = 0;
        vault_state.unclaimed_withdraw_fee = 0;
        vault_state.unclaimed_management_fee = 0;
        vault_state.unclaimed_performance_fee = 0;

        msg!(
            "✅ Claimed all fees: admin={}, total_amount={}",
            ctx.accounts.admin.key(),
            total_unclaimed
        );

        Ok(())
    }
}
