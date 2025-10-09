use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(shares_amount: u64)]
pub struct VaultWithdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 用户的代币账户（接收提取的代币）
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// 用户的份额代币账户
    #[account(
        mut,
        constraint = user_shares_account.amount >= shares_amount @ CustomError::InsufficientShares
    )]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Mars Vault 的代币金库
    #[account(mut)]
    pub vault_treasury: Account<'info, TokenAccount>,
    
    /// Kamino Vault 状态账户
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// Kamino 代币金库
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_token_vault: AccountInfo<'info>,
    
    /// Kamino 程序
    /// CHECK: 硬编码程序 ID
    #[account(constraint = kamino_program.key() == crate::kamino_constants::kamino::KAMINO_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

impl VaultWithdraw<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        shares_amount: u64,
    ) -> Result<()> {
        // 1. 验证用户有足够的份额
        let user_deposit = ctx.accounts.vault_state.find_user_deposit(&ctx.accounts.user.key())
            .ok_or(CustomError::NoDepositsFound)?.clone();
            
        require!(
            user_deposit.shares >= shares_amount,
            CustomError::InsufficientShares
        );
        
        // 2. 提取需要的数据避免借用冲突
        let vault_id = ctx.accounts.vault_state.vault_id;
        let bump = ctx.accounts.vault_state.bump;
        let withdraw_fee_bps = ctx.accounts.vault_state.fee_config.withdraw_fee_bps;
        
        // 3. 通过 CPI 从 Kamino 赎回
        let tokens_received_from_kamino = Self::kamino_withdraw_cpi(
            &ctx,
            shares_amount,
            vault_id,
            bump,
        )?;
        
        // 4. 计算提款费用
        let withdraw_fee = (tokens_received_from_kamino as u128)
            .checked_mul(withdraw_fee_bps as u128)
            .and_then(|v| v.checked_div(10_000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(CustomError::MathOverflow)?;
        
        let net_withdrawal_amount = tokens_received_from_kamino
            .checked_sub(withdraw_fee)
            .ok_or(CustomError::MathOverflow)?;
        
        msg!(
            "💰 Withdraw: gross={}, fee={} ({} bps), net={}",
            tokens_received_from_kamino,
            withdraw_fee,
            withdraw_fee_bps,
            net_withdrawal_amount
        );
        
        // 5. 将代币从 Mars Treasury 转给用户（扣除费用后的净额）
        let seeds = &[
            b"vault-state",
            vault_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_treasury.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, net_withdrawal_amount)?;
        
        // 6. 更新状态和费用
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposits = vault_state
            .total_deposits
            .checked_sub(tokens_received_from_kamino)
            .ok_or(CustomError::MathOverflow)?;
        vault_state.total_shares = vault_state
            .total_shares
            .checked_sub(shares_amount)
            .ok_or(CustomError::MathOverflow)?;
        
        // 记录费用（留在 treasury 中）
        vault_state.unclaimed_withdraw_fee = vault_state
            .unclaimed_withdraw_fee
            .checked_add(withdraw_fee)
            .ok_or(CustomError::MathOverflow)?;
        vault_state.total_withdraw_fee_collected = vault_state
            .total_withdraw_fee_collected
            .checked_add(withdraw_fee)
            .ok_or(CustomError::MathOverflow)?;
        
        // 7. 更新用户存款记录
        let mut updated_deposit = user_deposit.clone();
        updated_deposit.shares = updated_deposit
            .shares
            .checked_sub(shares_amount)
            .ok_or(CustomError::MathOverflow)?;
        updated_deposit.amount = updated_deposit
            .amount
            .checked_sub(tokens_received_from_kamino)
            .ok_or(CustomError::MathOverflow)?;
        
        if updated_deposit.shares == 0 {
            vault_state.remove_user_deposit(&ctx.accounts.user.key());
        } else {
            vault_state.insert_user_deposit(
                ctx.accounts.user.key(),
                updated_deposit,
            );
        }
        
        msg!(
            "✅ Vault withdrawal successful: shares={}, gross_tokens={}, fee={}, net_tokens={}",
            shares_amount,
            tokens_received_from_kamino,
            withdraw_fee,
            net_withdrawal_amount
        );
        
        Ok(())
    }
    
    fn kamino_withdraw_cpi(
        ctx: &Context<Self>,
        shares_amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        let seeds = &[
            b"vault-state",
            vault_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // 构建 Kamino withdraw instruction
        let kamino_accounts = vec![
            ctx.accounts.user_shares_account.to_account_info(),
            ctx.accounts.vault_treasury.to_account_info(),
            ctx.accounts.kamino_vault_state.to_account_info(),
            ctx.accounts.kamino_token_vault.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ];
        
        // 这里需要根据 Kamino 的实际 IDL 构建指令
        // 暂时返回模拟结果
        Ok(shares_amount) // 1:1 比例，实际需要根据 Kamino 返回
    }
}