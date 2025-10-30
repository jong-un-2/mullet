use crate::constants::protocols::jupiter::LEND_PROGRAM_ID as JUPITER_LEND_PROGRAM_ID;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;

// Jupiter Lend Program ID: jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9

/// Jupiter Lend 存款 CPI 调用所需的账户
/// 
/// 基于 @jup-ag/lend SDK 的 getDepositIx 方法返回的完整账户结构 (17个账户):
/// 1. signer: 用户签名者
/// 2. depositorTokenAccount: 用户的代币账户（源）
/// 3. recipientTokenAccount: 接收 jlToken 的账户  
/// 4. mint: 代币铸造账户（USDC等）
/// 5. lendingAdmin: Lending 管理员 PDA
/// 6. lending: Lending 池状态账户
/// 7. fTokenMint: jlToken 铸造账户
/// 8-17. remaining_accounts: 其他所需账户由 SDK 提供
#[derive(Accounts)]
pub struct JupiterLendDepositCPI<'info> {
    /// 1. signer - 用户签名者
    #[account(mut)]
    pub signer: Signer<'info>,

    /// 2. depositorTokenAccount - 用户的代币账户（USDC等）
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub depositor_token_account: AccountInfo<'info>,

    /// 3. recipientTokenAccount - 接收 jlToken 的账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,

    /// 4. mint - 代币铸造账户（USDC, PYUSD等）
    /// CHECK: 由 Jupiter Lend 程序验证
    pub mint: AccountInfo<'info>,

    /// 5. lendingAdmin - Lending 管理员 PDA
    /// CHECK: 由 Jupiter Lend 程序验证
    pub lending_admin: AccountInfo<'info>,

    /// 6. lending - Lending 池状态账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub lending: AccountInfo<'info>,

    /// 7. fTokenMint - jlToken 铸造账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub f_token_mint: AccountInfo<'info>,

    /// 8. tokenProgram - SPL Token 程序
    /// CHECK: SPL Token 程序
    pub token_program: AccountInfo<'info>,

    /// 9. jupiterLendProgram - Jupiter Lend 程序
    /// CHECK: Jupiter Lend 程序 ID
    pub jupiter_lend_program: AccountInfo<'info>,
}

/// Jupiter Lend 取款 CPI 调用所需的账户
///
/// 基于 @jup-ag/lend SDK 的 getWithdrawIx 方法返回的完整账户结构 (18个账户):
/// 1. signer: 用户签名者
/// 2. recipientTokenAccount: 销毁 jlToken 的账户
/// 3. depositorTokenAccount: 接收代币的账户
/// 4. lendingAdmin: Lending 管理员 PDA
/// 5. lending: Lending 池状态账户
/// 6. mint: 代币铸造账户（USDC等）
/// 7. fTokenMint: jlToken 铸造账户
/// 8-18. remaining_accounts: 其他所需账户由 SDK 提供
#[derive(Accounts)]
pub struct JupiterLendWithdrawCPI<'info> {
    /// 1. signer - 用户签名者
    #[account(mut)]
    pub signer: Signer<'info>,

    /// 2. recipientTokenAccount - 销毁 jlToken 的账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,

    /// 3. depositorTokenAccount - 接收代币的账户（USDC等）
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub depositor_token_account: AccountInfo<'info>,

    /// 4. lendingAdmin - Lending 管理员 PDA
    /// CHECK: 由 Jupiter Lend 程序验证
    pub lending_admin: AccountInfo<'info>,

    /// 5. lending - Lending 池状态账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub lending: AccountInfo<'info>,

    /// 6. mint - 代币铸造账户（USDC, PYUSD等）
    /// CHECK: 由 Jupiter Lend 程序验证
    pub mint: AccountInfo<'info>,

    /// 7. fTokenMint - jlToken 铸造账户
    /// CHECK: 由 Jupiter Lend 程序验证
    #[account(mut)]
    pub f_token_mint: AccountInfo<'info>,

    /// 8. tokenProgram - SPL Token 程序
    /// CHECK: SPL Token 程序
    pub token_program: AccountInfo<'info>,

    /// 9. jupiterLendProgram - Jupiter Lend 程序
    /// CHECK: Jupiter Lend 程序 ID
    pub jupiter_lend_program: AccountInfo<'info>,
}

/// CPI 调用 Jupiter Lend 进行存款
///
/// 参数:
/// - amount: 存款金额（基础单位）
///
/// 示例:
/// ```rust
/// // 存入 1 USDC (1_000_000 基础单位)
/// jupiter_lend_deposit_cpi(ctx, 1_000_000)?;
/// ```
pub fn jupiter_lend_deposit_cpi<'info>(
    ctx: Context<'_, '_, '_, 'info, JupiterLendDepositCPI<'info>>,
    amount: u64,
) -> Result<()> {
    // 验证 Jupiter Lend 程序 ID
    require_eq!(
        ctx.accounts.jupiter_lend_program.key(),
        JUPITER_LEND_PROGRAM_ID,
        JupiterLendCPIError::InvalidJupiterLendProgram
    );

    // 验证金额
    require!(amount > 0, JupiterLendCPIError::InvalidAmount);

    // 构建账户数组（严格按照 Jupiter Lend 指令顺序）
    let mut account_metas = vec![
        // 1. signer
        AccountMeta::new(ctx.accounts.signer.key(), true),
        // 2. depositorTokenAccount
        AccountMeta::new(ctx.accounts.depositor_token_account.key(), false),
        // 3. recipientTokenAccount
        AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
        // 4. mint
        AccountMeta::new_readonly(ctx.accounts.mint.key(), false),
        // 5. lendingAdmin
        AccountMeta::new_readonly(ctx.accounts.lending_admin.key(), false),
        // 6. lending
        AccountMeta::new(ctx.accounts.lending.key(), false),
        // 7. fTokenMint
        AccountMeta::new(ctx.accounts.f_token_mint.key(), false),
    ];
    
    // 8-17. 添加 remaining_accounts (从 SDK 获取的其他必需账户)
    for acc in ctx.remaining_accounts.iter() {
        account_metas.push(AccountMeta {
            pubkey: *acc.key,
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        });
    }

    // 构建指令数据：discriminator (8 bytes) + amount (8 bytes)
    let mut data = Vec::with_capacity(16);
    // Jupiter Lend deposit 指令的 discriminator
    // 使用 anchor 的方法: sighash("global", "deposit")
    data.extend_from_slice(&[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]); // deposit discriminator
    data.extend_from_slice(&amount.to_le_bytes());

    // 创建指令
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: JUPITER_LEND_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // 构建 account_infos
    let mut account_infos = vec![
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.depositor_token_account.to_account_info(),
        ctx.accounts.recipient_token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.lending_admin.to_account_info(),
        ctx.accounts.lending.to_account_info(),
        ctx.accounts.f_token_mint.to_account_info(),
    ];
    
    // 添加 remaining_accounts
    for acc in ctx.remaining_accounts.iter() {
        account_infos.push(acc.to_account_info());
    }

    // 执行 CPI 调用
    anchor_lang::solana_program::program::invoke(&ix, &account_infos)?;
    Ok(())
}

/// CPI 调用 Jupiter Lend 进行取款
///
/// 参数:
/// - amount: 取款金额（基础单位）
///
/// 示例:
/// ```rust
/// // 取出 1 USDC (1_000_000 基础单位)
/// jupiter_lend_withdraw_cpi(ctx, 1_000_000)?;
/// ```
pub fn jupiter_lend_withdraw_cpi<'info>(
    ctx: Context<'_, '_, '_, 'info, JupiterLendWithdrawCPI<'info>>,
    amount: u64,
) -> Result<()> {
    // 验证 Jupiter Lend 程序 ID
    require_eq!(
        ctx.accounts.jupiter_lend_program.key(),
        JUPITER_LEND_PROGRAM_ID,
        JupiterLendCPIError::InvalidJupiterLendProgram
    );

    // 验证金额
    require!(amount > 0, JupiterLendCPIError::InvalidAmount);

    // 构建账户数组（严格按照 Jupiter Lend 指令顺序）
    // 注意：取款的顺序与存款不同
    let mut account_metas = vec![
        // 1. signer
        AccountMeta::new(ctx.accounts.signer.key(), true),
        // 2. recipientTokenAccount (销毁 jlToken)
        AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
        // 3. depositorTokenAccount (接收代币)
        AccountMeta::new(ctx.accounts.depositor_token_account.key(), false),
        // 4. lendingAdmin
        AccountMeta::new_readonly(ctx.accounts.lending_admin.key(), false),
        // 5. lending
        AccountMeta::new(ctx.accounts.lending.key(), false),
        // 6. mint
        AccountMeta::new_readonly(ctx.accounts.mint.key(), false),
        // 7. fTokenMint
        AccountMeta::new(ctx.accounts.f_token_mint.key(), false),
    ];
    
    // 8-18. 添加 remaining_accounts
    for acc in ctx.remaining_accounts.iter() {
        account_metas.push(AccountMeta {
            pubkey: *acc.key,
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        });
    }

    // 构建指令数据
    let mut data = Vec::with_capacity(16);
    // Jupiter Lend withdraw 指令的 discriminator
    data.extend_from_slice(&[0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22]); // withdraw discriminator
    data.extend_from_slice(&amount.to_le_bytes());

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: JUPITER_LEND_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // 构建 account_infos
    let mut account_infos = vec![
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.recipient_token_account.to_account_info(),
        ctx.accounts.depositor_token_account.to_account_info(),
        ctx.accounts.lending_admin.to_account_info(),
        ctx.accounts.lending.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.f_token_mint.to_account_info(),
    ];
    
    // 添加 remaining_accounts
    for acc in ctx.remaining_accounts.iter() {
        account_infos.push(acc.to_account_info());
    }

    anchor_lang::solana_program::program::invoke(&ix, &account_infos)?;
    Ok(())
}

#[error_code]
pub enum JupiterLendCPIError {
    #[msg("无效的 Jupiter Lend 程序 ID")]
    InvalidJupiterLendProgram,

    #[msg("金额必须大于0")]
    InvalidAmount,

    #[msg("账户余额不足")]
    InsufficientBalance,
}
