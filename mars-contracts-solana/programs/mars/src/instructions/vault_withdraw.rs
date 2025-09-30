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
        
        // 3. 通过 CPI 从 Kamino 赎回
        let tokens_received = Self::kamino_withdraw_cpi(
            &ctx,
            shares_amount,
            vault_id,
            bump,
        )?;
        
        // 4. 将代币从 Mars Treasury 转给用户
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
        token::transfer(transfer_ctx, tokens_received)?;
        
        // 5. 更新状态
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposits -= tokens_received;
        vault_state.total_shares -= shares_amount;
        
        // 6. 更新用户存款记录
        let mut updated_deposit = user_deposit.clone();
        updated_deposit.shares -= shares_amount;
        updated_deposit.amount -= tokens_received;
        
        if updated_deposit.shares == 0 {
            vault_state.remove_user_deposit(&ctx.accounts.user.key());
        } else {
            vault_state.insert_user_deposit(
                ctx.accounts.user.key(),
                updated_deposit,
            );
        }
        
        msg!(
            "Vault withdrawal successful: shares={}, tokens={}",
            shares_amount,
            tokens_received
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