use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token::{Token, TokenAccount};

/// 完整的 Kamino Vault Deposit CPI 实现
///
/// 基于 Kamino V2 IDL: https://github.com/Kamino-Finance/klend
/// 程序ID: KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd

#[derive(Accounts)]
pub struct KaminoDepositComplete<'info> {
    /// 存款人（调用者）
    pub depositor: Signer<'info>,

    /// Kamino Vault 账户
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// 存款人的代币账户（源）
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,

    /// 存款人的份额代币账户（目标）
    #[account(mut)]
    pub depositor_shares_account: Account<'info, TokenAccount>,

    /// Kamino Vault 的代币账户（接收存款）
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// 份额代币 Mint
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub shares_mint: AccountInfo<'info>,

    /// Token Program（支持 Token-2022）
    pub token_program: Program<'info, Token>,

    /// Kamino Vault 程序
    /// CHECK: 硬编码验证
    #[account(
        constraint = kamino_vault_program.key() == crate::constants::protocols::kamino::PROGRAM_ID
    )]
    pub kamino_vault_program: AccountInfo<'info>,
}

impl<'info> KaminoDepositComplete<'info> {
    /// 执行 Kamino Vault 存款 CPI
    ///
    /// 参数：
    /// - max_amount: 最大存款金额（实际可能少于此值）
    /// - vault_id: Vault 的唯一标识符（用于 PDA seeds）
    /// - bump: PDA bump seed
    ///
    /// 返回：
    /// - shares_received: 实际收到的份额数量
    pub fn execute_deposit(
        ctx: Context<'_, '_, '_, 'info, Self>,
        max_amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // 1. 记录存款前的份额余额
        let shares_before = ctx.accounts.depositor_shares_account.amount;

        msg!("🔵 Kamino Deposit CPI starting...");
        msg!("   Max amount: {}", max_amount);
        msg!("   Shares before: {}", shares_before);

        // 2. 构建 Kamino deposit 指令数据
        let mut instruction_data = Vec::with_capacity(16);
        // Instruction discriminator (deposit)
        instruction_data.extend_from_slice(&crate::constants::protocols::kamino::DEPOSIT_IX);
        // max_amount (u64)
        instruction_data.extend_from_slice(&max_amount.to_le_bytes());

        // 3. 构建账户列表（按照 Kamino IDL 顺序）
        let account_metas = vec![
            AccountMeta::new(ctx.accounts.vault.key(), false),
            AccountMeta::new(ctx.accounts.vault_token_account.key(), false),
            AccountMeta::new(ctx.accounts.shares_mint.key(), false),
            AccountMeta::new(ctx.accounts.depositor_token_account.key(), false),
            AccountMeta::new(ctx.accounts.depositor_shares_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.depositor.key(), true),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ];

        // 4. 添加 remaining_accounts（reserves, lending markets 等）
        // Kamino V2 需要传递所有相关的储备金账户
        let mut all_account_metas = account_metas;
        for remaining_account in ctx.remaining_accounts.iter() {
            all_account_metas.push(AccountMeta {
                pubkey: remaining_account.key(),
                is_signer: remaining_account.is_signer,
                is_writable: remaining_account.is_writable,
            });
        }

        // 5. 构建完整指令
        let instruction = Instruction {
            program_id: ctx.accounts.kamino_vault_program.key(),
            accounts: all_account_metas,
            data: instruction_data,
        };

        // 6. 准备 PDA seeds 用于签名
        let seeds = &[b"vault-state", vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        // 7. 执行 CPI 调用
        let account_infos = vec![
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.shares_mint.to_account_info(),
            ctx.accounts.depositor_token_account.to_account_info(),
            ctx.accounts.depositor_shares_account.to_account_info(),
            ctx.accounts.depositor.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.kamino_vault_program.to_account_info(),
        ];

        // 添加所有 remaining accounts
        let mut all_account_infos = account_infos;
        all_account_infos.extend_from_slice(ctx.remaining_accounts);

        anchor_lang::solana_program::program::invoke_signed(
            &instruction,
            &all_account_infos,
            signer_seeds,
        )?;

        // 8. 刷新份额账户数据并计算收到的份额
        ctx.accounts.depositor_shares_account.reload()?;
        let shares_after = ctx.accounts.depositor_shares_account.amount;
        let shares_received = shares_after
            .checked_sub(shares_before)
            .ok_or(error!(crate::error::CustomError::CpiCallFailed))?;

        msg!("✅ Kamino Deposit CPI completed");
        msg!("   Shares after: {}", shares_after);
        msg!("   Shares received: {}", shares_received);

        require!(shares_received > 0, crate::error::CustomError::CpiCallFailed);

        Ok(shares_received)
    }
}

/// 完整的 Kamino Vault Withdraw CPI 实现
#[derive(Accounts)]
pub struct KaminoWithdrawComplete<'info> {
    /// 提款人（调用者）
    pub withdrawer: Signer<'info>,

    /// Kamino Vault 账户
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// 提款人的份额代币账户（源）
    #[account(mut)]
    pub withdrawer_shares_account: Account<'info, TokenAccount>,

    /// 提款人的代币账户（目标）
    #[account(mut)]
    pub withdrawer_token_account: Account<'info, TokenAccount>,

    /// Kamino Vault 的代币账户（发送代币）
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub vault_token_account: AccountInfo<'info>,

    /// 份额代币 Mint
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub shares_mint: AccountInfo<'info>,

    /// Token Program
    pub token_program: Program<'info, Token>,

    /// Kamino Vault 程序
    /// CHECK: 硬编码验证
    #[account(
        constraint = kamino_vault_program.key() == crate::constants::protocols::kamino::PROGRAM_ID
    )]
    pub kamino_vault_program: AccountInfo<'info>,
}

impl<'info> KaminoWithdrawComplete<'info> {
    /// 执行 Kamino Vault 提款 CPI
    ///
    /// 参数：
    /// - shares_amount: 要赎回的份额数量
    /// - vault_id: Vault 的唯一标识符
    /// - bump: PDA bump seed
    ///
    /// 返回：
    /// - tokens_received: 实际收到的代币数量
    pub fn execute_withdraw(
        ctx: Context<'_, '_, '_, 'info, Self>,
        shares_amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<u64> {
        // 1. 记录提款前的代币余额
        let tokens_before = ctx.accounts.withdrawer_token_account.amount;

        msg!("🔵 Kamino Withdraw CPI starting...");
        msg!("   Shares to redeem: {}", shares_amount);
        msg!("   Tokens before: {}", tokens_before);

        // 2. 构建 Kamino withdraw 指令数据
        let mut instruction_data = Vec::with_capacity(16);
        // Instruction discriminator (withdraw/redeem)
        instruction_data.extend_from_slice(&crate::constants::protocols::kamino::WITHDRAW_IX);
        // shares_amount (u64)
        instruction_data.extend_from_slice(&shares_amount.to_le_bytes());

        // 3. 构建账户列表
        let mut account_metas = vec![
            AccountMeta::new(ctx.accounts.vault.key(), false),
            AccountMeta::new(ctx.accounts.vault_token_account.key(), false),
            AccountMeta::new(ctx.accounts.shares_mint.key(), false),
            AccountMeta::new(ctx.accounts.withdrawer_shares_account.key(), false),
            AccountMeta::new(ctx.accounts.withdrawer_token_account.key(), false),
            AccountMeta::new_readonly(ctx.accounts.withdrawer.key(), true),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ];

        // 4. 添加 remaining_accounts
        for remaining_account in ctx.remaining_accounts.iter() {
            account_metas.push(AccountMeta {
                pubkey: remaining_account.key(),
                is_signer: remaining_account.is_signer,
                is_writable: remaining_account.is_writable,
            });
        }

        // 5. 构建完整指令
        let instruction = Instruction {
            program_id: ctx.accounts.kamino_vault_program.key(),
            accounts: account_metas,
            data: instruction_data,
        };

        // 6. 准备签名 seeds
        let seeds = &[b"vault-state", vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        // 7. 执行 CPI
        let mut account_infos = vec![
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.shares_mint.to_account_info(),
            ctx.accounts.withdrawer_shares_account.to_account_info(),
            ctx.accounts.withdrawer_token_account.to_account_info(),
            ctx.accounts.withdrawer.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.kamino_vault_program.to_account_info(),
        ];

        account_infos.extend_from_slice(ctx.remaining_accounts);

        anchor_lang::solana_program::program::invoke_signed(
            &instruction,
            &account_infos,
            signer_seeds,
        )?;

        // 8. 计算收到的代币数量
        ctx.accounts.withdrawer_token_account.reload()?;
        let tokens_after = ctx.accounts.withdrawer_token_account.amount;
        let tokens_received = tokens_after
            .checked_sub(tokens_before)
            .ok_or(error!(crate::error::CustomError::CpiCallFailed))?;

        msg!("✅ Kamino Withdraw CPI completed");
        msg!("   Tokens after: {}", tokens_after);
        msg!("   Tokens received: {}", tokens_received);

        require!(tokens_received > 0, crate::error::CustomError::CpiCallFailed);

        Ok(tokens_received)
    }
}

/// 辅助函数：获取 Kamino Vault 的当前汇率
///
/// 可以通过读取 Vault 账户数据获取 shares_to_value 的比率
pub fn get_kamino_vault_exchange_rate(vault_account: &AccountInfo) -> Result<(u64, u64)> {
    // 这里需要解析 Kamino Vault 账户数据结构
    // 返回 (total_value, total_shares)

    // 简化实现：假设可以从账户数据中读取
    // 实际需要根据 Kamino 的账户布局解析

    let data = vault_account.try_borrow_data()?;

    // Kamino Vault 数据布局（简化版本）：
    // - discriminator: 8 bytes
    // - total_value: 8 bytes (offset 8)
    // - total_shares: 8 bytes (offset 16)

    if data.len() < 24 {
        return Err(error!(crate::error::CustomError::InvalidVaultState));
    }

    let total_value = u64::from_le_bytes(data[8..16].try_into().unwrap());
    let total_shares = u64::from_le_bytes(data[16..24].try_into().unwrap());

    Ok((total_value, total_shares))
}

/// 计算预期收到的份额数量（用于前端估算）
pub fn estimate_shares_to_receive(
    deposit_amount: u64,
    total_vault_value: u64,
    total_vault_shares: u64,
) -> u64 {
    if total_vault_shares == 0 || total_vault_value == 0 {
        // 初始存款，1:1 比例
        return deposit_amount;
    }

    // shares = deposit_amount * total_shares / total_value
    (deposit_amount as u128)
        .checked_mul(total_vault_shares as u128)
        .and_then(|v| v.checked_div(total_vault_value as u128))
        .and_then(|v| u64::try_from(v).ok())
        .unwrap_or(0)
}

/// 计算预期收到的代币数量（用于提款估算）
pub fn estimate_tokens_to_receive(
    shares_amount: u64,
    total_vault_value: u64,
    total_vault_shares: u64,
) -> u64 {
    if total_vault_shares == 0 {
        return 0;
    }

    // tokens = shares_amount * total_value / total_shares
    (shares_amount as u128)
        .checked_mul(total_vault_value as u128)
        .and_then(|v| v.checked_div(total_vault_shares as u128))
        .and_then(|v| u64::try_from(v).ok())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shares_estimation() {
        // 场景1: 初始存款
        let shares = estimate_shares_to_receive(1_000_000, 0, 0);
        assert_eq!(shares, 1_000_000);

        // 场景2: Vault已有资金，1:1比率
        let shares = estimate_shares_to_receive(1_000_000, 10_000_000, 10_000_000);
        assert_eq!(shares, 1_000_000);

        // 场景3: Vault增值50%
        let shares = estimate_shares_to_receive(
            1_000_000, 15_000_000, // 增值到1.5倍
            10_000_000,
        );
        assert_eq!(shares, 666_666); // 收到更少的份额
    }

    #[test]
    fn test_tokens_estimation() {
        // 场景: 赎回份额时Vault已增值
        let tokens = estimate_tokens_to_receive(
            1_000_000,  // 份额
            15_000_000, // 总价值（增值50%）
            10_000_000, // 总份额
        );
        assert_eq!(tokens, 1_500_000); // 收到更多代币
    }
}
