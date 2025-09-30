use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(
    protocol_from: u8,
    protocol_to: u8,
    amount: u64
)]
pub struct RebalanceWithSwap<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump,
        constraint = vault_state.admin == authority.key() @ CustomError::InvalidAdmin
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// 源协议相关账户
    /// CHECK: 由源协议验证
    #[account(mut)]
    pub source_protocol_state: AccountInfo<'info>,
    
    /// 目标协议相关账户  
    /// CHECK: 由目标协议验证
    #[account(mut)]
    pub target_protocol_state: AccountInfo<'info>,
    
    /// 中间代币账户（用于接收赎回的代币）
    #[account(mut)]
    pub intermediate_token_account: Account<'info, TokenAccount>,
    
    /// 兑换后代币账户（用于接收兑换后的代币）
    #[account(mut)]
    pub swapped_token_account: Account<'info, TokenAccount>,
    
    /// Jupiter 兑换程序
    /// CHECK: Jupiter 程序验证
    pub jupiter_program: AccountInfo<'info>,
    
    /// 源协议程序
    /// CHECK: 根据 protocol_from 验证
    pub source_protocol_program: AccountInfo<'info>,
    
    /// 目标协议程序
    /// CHECK: 根据 protocol_to 验证  
    pub target_protocol_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl RebalanceWithSwap<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        protocol_from: u8,   // 1=Kamino, 2=Lido, 等
        protocol_to: u8,     // 目标协议
        amount: u64,
        swap_data: Vec<u8>,  // Jupiter 兑换参数
    ) -> Result<()> {
        // 提取需要的数据以避免借用冲突
        let vault_id = ctx.accounts.vault_state.vault_id;
        let bump = ctx.accounts.vault_state.bump;
        
        msg!(
            "Starting rebalance: protocol {} -> protocol {}, amount: {}",
            protocol_from,
            protocol_to,
            amount
        );
        
        // 1. 从源协议赎回
        let redeemed_amount = Self::withdraw_from_protocol(
            &ctx,
            protocol_from,
            amount,
            vault_id,
            bump,
        )?;
        
        // 2. 执行代币兑换（如果需要）
        let swapped_amount = if Self::need_swap(protocol_from, protocol_to) {
            Self::jupiter_swap_cpi(
                &ctx,
                redeemed_amount,
                swap_data,
                vault_id,
                bump,
            )?
        } else {
            redeemed_amount
        };
        
        // 3. 存入目标协议
        let new_shares = Self::deposit_to_protocol(
            &ctx,
            protocol_to,
            swapped_amount,
            vault_id,
            bump,
        )?;
        
        // 4. 更新 Vault 状态
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.update_rebalance_record(
            protocol_from,
            protocol_to,
            amount,
            swapped_amount,
            new_shares,
        )?;
        
        msg!(
            "Rebalance completed: redeemed={}, swapped={}, new_shares={}",
            redeemed_amount,
            swapped_amount,
            new_shares
        );
        
        Ok(())
    }
    
    fn withdraw_from_protocol(
        ctx: &Context<Self>,
        protocol_id: u8,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        match protocol_id {
            1 => {
                // Kamino 赎回
                Self::kamino_withdraw_cpi(ctx, amount, vault_id, bump)
            },
            2 => {
                // Lido 赎回
                Self::lido_withdraw_cpi(ctx, amount, vault_id, bump)
            },
            _ => {
                err!(CustomError::UnsupportedProtocol)
            }
        }
    }
    
    fn deposit_to_protocol(
        ctx: &Context<Self>,
        protocol_id: u8,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        match protocol_id {
            1 => {
                // Kamino 存款
                Self::kamino_deposit_cpi(ctx, amount, vault_id, bump)
            },
            2 => {
                // Lido 存款
                Self::lido_deposit_cpi(ctx, amount, vault_id, bump)
            },
            _ => {
                err!(CustomError::UnsupportedProtocol)
            }
        }
    }
    
    fn need_swap(protocol_from: u8, protocol_to: u8) -> bool {
        // 判断是否需要兑换代币
        // 例如：Kamino USDC -> Lido ETH 需要兑换
        match (protocol_from, protocol_to) {
            (1, 2) => true,  // Kamino -> Lido
            (2, 1) => true,  // Lido -> Kamino
            _ => false,      // 同类型协议不需要兑换
        }
    }
    
    fn jupiter_swap_cpi(
        ctx: &Context<Self>,
        amount: u64,
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
        
        // Jupiter 兑换逻辑
        msg!("Executing rebalance swap via Jupiter");
        
        // 暂时返回模拟结果
        Ok(amount * 98 / 100) // 假设 2% 滑点
    }
    
    fn kamino_withdraw_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // Kamino 赎回逻辑
        Ok(amount)
    }
    
    fn kamino_deposit_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // Kamino 存款逻辑
        Ok(amount)
    }
    
    fn lido_withdraw_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // Lido 赎回逻辑
        Ok(amount)
    }
    
    fn lido_deposit_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // Lido 存款逻辑
        Ok(amount)
    }
}