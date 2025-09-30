use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(
    from_token: Pubkey,
    to_token: Pubkey,
    amount: u64
)]
pub struct SwapAndDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 用户的输入代币账户
    #[account(
        mut,
        constraint = user_from_token_account.mint == from_token @ CustomError::InvalidMint,
        constraint = user_from_token_account.amount >= amount @ CustomError::InsufficientFunds
    )]
    pub user_from_token_account: Account<'info, TokenAccount>,
    
    /// 用户的份额代币账户
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// 输入代币的 Mint
    #[account(constraint = from_token_mint.key() == from_token)]
    pub from_token_mint: Account<'info, Mint>,
    
    /// 输出代币的 Mint
    #[account(constraint = to_token_mint.key() == to_token)]
    pub to_token_mint: Account<'info, Mint>,
    
    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Mars Vault 的中间代币账户（用于接收兑换后的代币）
    #[account(
        mut,
        constraint = vault_intermediate_account.mint == to_token
    )]
    pub vault_intermediate_account: Account<'info, TokenAccount>,
    
    /// Jupiter 兑换相关账户
    /// CHECK: Jupiter 程序验证
    pub jupiter_program: AccountInfo<'info>,
    
    // Remaining accounts are available via ctx.remaining_accounts
    
    /// Kamino 相关账户
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_token_vault: AccountInfo<'info>,
    
    /// CHECK: 由 Kamino 程序验证
    pub kamino_shares_mint: AccountInfo<'info>,
    
    /// CHECK: 硬编码程序 ID
    #[account(constraint = kamino_program.key() == crate::kamino_constants::kamino::KAMINO_PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl SwapAndDeposit<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        protocol_id: u8,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
        minimum_out_amount: u64,
        swap_data: Vec<u8>, // Jupiter 兑换数据
    ) -> Result<()> {
        msg!(
            "Starting swap and deposit: {} {} -> {} {}",
            amount,
            from_token,
            minimum_out_amount,
            to_token
        );
        
        // 1. 提取需要的数据避免借用冲突
        let vault_id = ctx.accounts.vault_state.vault_id;
        let bump = ctx.accounts.vault_state.bump;
        
        // 2. 执行代币兑换（通过 Jupiter）
        let swapped_amount = Self::jupiter_swap_cpi(
            &ctx,
            from_token,
            to_token,
            amount,
            minimum_out_amount,
            swap_data,
            vault_id,
            bump,
        )?;
        
        // 3. 将兑换后的代币存入 Kamino
        let shares_received = Self::kamino_deposit_cpi(
            &ctx,
            swapped_amount,
            vault_id,
            bump,
        )?;
        
        // 4. 更新状态
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposits += swapped_amount;
        vault_state.total_shares += shares_received;
        
        // 5. 记录用户操作
        vault_state.insert_user_deposit(
            ctx.accounts.user.key(),
            UserDeposit {
                amount: swapped_amount,
                shares: shares_received,
                timestamp: Clock::get()?.unix_timestamp,
                last_action_time: Clock::get()?.unix_timestamp,
                total_rewards: 0,
            }
        );
        
        msg!(
            "Swap and deposit completed: swapped={}, shares={}",
            swapped_amount,
            shares_received
        );
        
        Ok(())
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
        
        // 构建 Jupiter 兑换指令
        // 这里需要根据 Jupiter 的实际 API 构建
        // 参考: https://docs.jup.ag/
        
        msg!("Executing Jupiter swap via CPI");
        
        // 暂时返回模拟结果
        let simulated_output = amount * 95 / 100; // 假设 5% 滑点
        require!(
            simulated_output >= minimum_out_amount,
            CustomError::SlippageTooHigh
        );
        
        Ok(simulated_output)
    }
    
    fn kamino_deposit_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        let seeds = &[
            b"vault-state",
            vault_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // 调用 Kamino 存款（复用之前的逻辑）
        msg!("Depositing to Kamino via CPI");
        
        // 暂时返回模拟结果
        Ok(amount) // 1:1 比例
    }
}