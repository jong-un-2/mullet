use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(amount: u64, target_token: Pubkey)]
pub struct WithdrawWithSwap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 用户的目标代币账户（接收最终的代币）
    #[account(
        mut,
        constraint = user_target_token_account.mint == target_token @ CustomError::InvalidMint
    )]
    pub user_target_token_account: Account<'info, TokenAccount>,
    
    /// 用户的份额代币账户
    #[account(
        mut,
        constraint = user_shares_account.amount >= amount @ CustomError::InsufficientShares
    )]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Mars Vault 的中间代币账户（接收赎回的代币）
    #[account(mut)]
    pub vault_intermediate_account: Account<'info, TokenAccount>,
    
    /// 目标代币的 Mint
    #[account(constraint = target_token_mint.key() == target_token)]
    pub target_token_mint: Account<'info, Mint>,
    
    /// Kamino 相关账户
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_token_vault: AccountInfo<'info>,
    
    /// CHECK: 硬编码程序 ID
    #[account(constraint = kamino_program.key() == crate::kamino_constants::kamino::KAMINO_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,
    
    /// Jupiter 兑换程序
    /// CHECK: Jupiter 程序验证
    pub jupiter_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

impl WithdrawWithSwap<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        amount: u64,           // 要赎回的份额数量
        target_token: Pubkey,  // 用户想要接收的代币
        minimum_out_amount: u64, // 最小输出数量（滑点保护）
        swap_data: Vec<u8>,    // Jupiter 兑换参数
    ) -> Result<()> {
        // 1. 验证用户权限
        let user_deposit = ctx.accounts.vault_state.find_user_deposit(&ctx.accounts.user.key())
            .ok_or(CustomError::NoDepositsFound)?.clone();
            
        require!(
            user_deposit.shares >= amount,
            CustomError::InsufficientShares
        );
        
        msg!(
            "Starting withdraw with swap: shares={}, target_token={}",
            amount,
            target_token
        );
        
        // 2. 提取需要的数据避免借用冲突
        let vault_id = ctx.accounts.vault_state.vault_id;
        let bump = ctx.accounts.vault_state.bump;
        let vault_base_token = ctx.accounts.vault_state.base_token_mint;
        
        // 3. 从 Kamino 赎回原始代币
        let redeemed_amount = Self::kamino_withdraw_cpi(
            &ctx,
            amount,
            vault_id,
            bump,
        )?;
        
        // 4. 检查是否需要兑换
        let final_amount = if vault_base_token != target_token {
            // 需要兑换
            Self::jupiter_swap_cpi(
                &ctx,
                vault_base_token,
                target_token,
                redeemed_amount,
                minimum_out_amount,
                swap_data,
                vault_id,
                bump,
            )?
        } else {
            // 不需要兑换，直接转账
            Self::direct_transfer(
                &ctx,
                redeemed_amount,
                vault_id,
                bump,
            )?;
            redeemed_amount
        };
        
        // 5. 更新状态
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposits -= redeemed_amount;
        vault_state.total_shares -= amount;
        
        // 6. 更新用户存款记录
        let mut updated_deposit = user_deposit.clone();
        updated_deposit.shares -= amount;
        updated_deposit.amount = updated_deposit.amount
            .saturating_sub(redeemed_amount);
        
        if updated_deposit.shares == 0 {
            vault_state.remove_user_deposit(&ctx.accounts.user.key());
        } else {
            vault_state.insert_user_deposit(
                ctx.accounts.user.key(),
                updated_deposit,
            );
        }
        
        msg!(
            "Withdraw with swap completed: final_amount={}",
            final_amount
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
        msg!("Withdrawing from Kamino via CPI");
        
        // 暂时返回模拟结果
        Ok(shares_amount) // 1:1 比例
    }
    
    fn jupiter_swap_cpi(
        ctx: &Context<Self>,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
        minimum_out_amount: u64,
        swap_data: Vec<u8>,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        let seeds = &[
            b"vault-state",
            vault_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        msg!(
            "Swapping via Jupiter: {} {} -> {} (min: {})",
            amount,
            from_token,
            to_token,
            minimum_out_amount
        );
        
        // 构建 Jupiter 兑换指令
        // 这里需要根据 Jupiter 的实际 API 构建
        
        // 暂时返回模拟结果
        let output_amount = amount * 97 / 100; // 假设 3% 滑点
        require!(
            output_amount >= minimum_out_amount,
            CustomError::SlippageTooHigh
        );
        
        Ok(output_amount)
    }
    
    fn direct_transfer(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<()> {
        let seeds = &[
            b"vault-state",
            vault_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // 直接从 Vault 中间账户转到用户账户
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault_intermediate_account.to_account_info(),
                to: ctx.accounts.user_target_token_account.to_account_info(),
                authority: ctx.accounts.vault_state.to_account_info(),
            },
            signer_seeds,
        );
        anchor_spl::token::transfer(transfer_ctx, amount)?;
        
        Ok(())
    }
}