use crate::constants::protocols::kamino::PROGRAM_ID as KAMINO_PROGRAM_ID;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;

// Kamino Vaults Program ID (V2): KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd
// Klend Program ID: KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD

/// Kamino存款CPI调用所需的账户（完整版本，匹配IDL）
#[derive(Accounts)]
pub struct KaminoDepositCPI<'info> {
    /// 1. user - 用户账户
    #[account(mut)]
    pub user: Signer<'info>,

    /// 2. vaultState - Kamino Vault状态账户
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub vault_state: AccountInfo<'info>,

    /// 3. tokenVault - Vault的代币金库
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub token_vault: AccountInfo<'info>,

    /// 4. tokenMint - 代币铸造账户（如USDC）
    /// CHECK: 由Kamino程序验证
    pub token_mint: AccountInfo<'info>,

    /// 5. baseVaultAuthority - Vault权限PDA
    /// CHECK: 由Kamino程序验证，从vault_state派生
    pub base_vault_authority: AccountInfo<'info>,

    /// 6. sharesMint - 份额铸造账户
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub shares_mint: AccountInfo<'info>,

    /// 7. userTokenAta - 用户的代币ATA（源）
    /// CHECK: 支持 Token 和 Token-2022，由 Kamino 验证
    #[account(mut)]
    pub user_token_ata: AccountInfo<'info>,

    /// 8. userSharesAta - 用户的份额ATA（接收份额）
    /// CHECK: 支持 Token 和 Token-2022，由 Kamino 验证
    #[account(mut)]
    pub user_shares_ata: AccountInfo<'info>,

    /// 9. klendProgram - Klend程序
    /// CHECK: 这是已知的Klend程序ID
    pub klend_program: AccountInfo<'info>,

    /// 10. tokenProgram - Token程序（支持 Token 或 Token-2022）
    /// CHECK: Token 或 Token-2022 程序
    pub token_program: AccountInfo<'info>,

    /// 11. sharesTokenProgram - 份额Token程序（通常与tokenProgram相同）
    /// CHECK: Token 或 Token-2022 程序
    pub shares_token_program: AccountInfo<'info>,

    /// 12. eventAuthority - 事件权限PDA
    /// CHECK: 由Kamino程序验证
    pub event_authority: AccountInfo<'info>,

    /// 13. program - Kamino Vault程序自身
    /// CHECK: 这是Kamino Vault程序ID
    pub kamino_vault_program: AccountInfo<'info>,
}

/// Kamino提取CPI调用所需的账户（简化版本 - withdrawFromAvailable）
#[derive(Accounts)]
pub struct KaminoWithdrawCPI<'info> {
    /// withdrawFromAvailable 部分
    /// 1. user
    #[account(mut)]
    pub user: Signer<'info>,

    /// 2. vaultState
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub vault_state: AccountInfo<'info>,

    /// 3. tokenVault
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub token_vault: AccountInfo<'info>,

    /// 4. baseVaultAuthority
    /// CHECK: 由Kamino程序验证
    pub base_vault_authority: AccountInfo<'info>,

    /// 5. userTokenAta - 用户接收代币的ATA
    /// CHECK: 支持 Token 和 Token-2022，由 Kamino 验证
    #[account(mut)]
    pub user_token_ata: AccountInfo<'info>,

    /// 6. tokenMint
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub token_mint: AccountInfo<'info>,

    /// 7. userSharesAta - 用户销毁份额的ATA
    /// CHECK: 支持 Token 和 Token-2022，由 Kamino 验证
    #[account(mut)]
    pub user_shares_ata: AccountInfo<'info>,

    /// 8. sharesMint
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub shares_mint: AccountInfo<'info>,

    /// 9. tokenProgram - Token程序（支持 Token 或 Token-2022）
    /// CHECK: Token 或 Token-2022 程序
    pub token_program: AccountInfo<'info>,

    /// 10. sharesTokenProgram
    /// CHECK: Token 或 Token-2022 程序
    pub shares_token_program: AccountInfo<'info>,

    /// 11. klendProgram
    /// CHECK: Klend程序
    pub klend_program: AccountInfo<'info>,

    /// 12. eventAuthority
    /// CHECK: 由Kamino程序验证
    pub event_authority: AccountInfo<'info>,

    /// 13. program
    /// CHECK: Kamino Vault程序
    pub kamino_vault_program: AccountInfo<'info>,
}

/// CPI调用Kamino进行存款（完整实现）
///
/// remaining_accounts 应该包含 vault 的 reserves 和对应的 lending markets:
/// - reserve_0 (writable)
/// - lending_market_0 (readonly)
/// - reserve_1 (writable)
/// - lending_market_1 (readonly)
/// - ...
pub fn kamino_deposit_cpi<'info>(
    ctx: Context<'_, '_, '_, 'info, KaminoDepositCPI<'info>>,
    max_amount: u64,
) -> Result<()> {
    msg!("🚀 Starting Kamino deposit CPI call, amount: {}", max_amount);

    // 验证Kamino程序ID
    require_eq!(
        ctx.accounts.kamino_vault_program.key(),
        KAMINO_PROGRAM_ID,
        KaminoCPIError::InvalidKaminoProgram
    );

    // 构建账户数组（严格按照Kamino IDL顺序）
    let mut account_metas = vec![
        // 1. user
        AccountMeta::new(ctx.accounts.user.key(), true),
        // 2. vaultState
        AccountMeta::new(ctx.accounts.vault_state.key(), false),
        // 3. tokenVault
        AccountMeta::new(ctx.accounts.token_vault.key(), false),
        // 4. tokenMint
        AccountMeta::new_readonly(ctx.accounts.token_mint.key(), false),
        // 5. baseVaultAuthority
        AccountMeta::new_readonly(ctx.accounts.base_vault_authority.key(), false),
        // 6. sharesMint
        AccountMeta::new(ctx.accounts.shares_mint.key(), false),
        // 7. userTokenAta
        AccountMeta::new(ctx.accounts.user_token_ata.key(), false),
        // 8. userSharesAta
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),
        // 9. klendProgram
        AccountMeta::new_readonly(ctx.accounts.klend_program.key(), false),
        // 10. tokenProgram
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        // 11. sharesTokenProgram
        AccountMeta::new_readonly(ctx.accounts.shares_token_program.key(), false),
        // 12. eventAuthority
        AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
        // 13. program
        AccountMeta::new_readonly(ctx.accounts.kamino_vault_program.key(), false),
    ];

    // Add remaining_accounts (reserves + lending markets)
    // Format: [reserve (writable), lending_market (readonly), ...]
    msg!("📋 Adding {} remaining accounts", ctx.remaining_accounts.len());
    for (i, account) in ctx.remaining_accounts.iter().enumerate() {
        // Even indices are reserves (writable), odd indices are lending markets (readonly)
        let is_writable = i % 2 == 0;
        if is_writable {
            account_metas.push(AccountMeta::new(account.key(), false));
            msg!("  - Reserve {}: {} (writable)", i / 2, account.key());
        } else {
            account_metas.push(AccountMeta::new_readonly(account.key(), false));
            msg!("  - Lending Market {}: {} (readonly)", i / 2, account.key());
        }
    }

    // 构建指令数据：discriminator (8 bytes) + max_amount (8 bytes)
    let mut data = Vec::with_capacity(16);
    // Kamino deposit指令的discriminator
    // 使用anchor的方法: sighash("global", "deposit")
    // 正确的discriminator: sha256("global:deposit")[0..8]
    data.extend_from_slice(&[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]); // deposit discriminator
    data.extend_from_slice(&max_amount.to_le_bytes());

    // 创建指令
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: KAMINO_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // 构建account_infos (包含 remaining_accounts)
    let mut account_infos = vec![
        ctx.accounts.user.to_account_info(),
        ctx.accounts.vault_state.to_account_info(),
        ctx.accounts.token_vault.to_account_info(),
        ctx.accounts.token_mint.to_account_info(),
        ctx.accounts.base_vault_authority.to_account_info(),
        ctx.accounts.shares_mint.to_account_info(),
        ctx.accounts.user_token_ata.to_account_info(),
        ctx.accounts.user_shares_ata.to_account_info(),
        ctx.accounts.klend_program.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.shares_token_program.to_account_info(),
        ctx.accounts.event_authority.to_account_info(),
        ctx.accounts.kamino_vault_program.to_account_info(),
    ];

    // 添加 remaining_accounts 到 account_infos
    for account in ctx.remaining_accounts.iter() {
        account_infos.push(account.to_account_info());
    }

    // 执行CPI调用
    anchor_lang::solana_program::program::invoke(&ix, &account_infos)?;

    msg!("✅ Kamino deposit CPI call successful");
    Ok(())
}

/// CPI调用Kamino进行提取（完整实现）
///
/// remaining_accounts 应该包含复杂的 vault 相关账户:
/// - vault_state (writable)
/// - reserve_0 (writable)
/// - reserve_1 (writable)
/// - lending_market_0 (readonly)
/// - lending_market_1 (readonly)
/// - reserve_liquidity_supply_0 (writable)
/// - reserve_liquidity_supply_1 (writable)
/// - token_program (readonly)
/// - sysvar_instructions (readonly)
/// - event_authority (readonly)
/// - kamino_vault_program (readonly)
/// - reserve_0 (writable, duplicate)
/// - lending_market_0 (readonly, duplicate)
pub fn kamino_withdraw_cpi<'info>(
    ctx: Context<'_, '_, '_, 'info, KaminoWithdrawCPI<'info>>,
    max_amount: u64,
) -> Result<()> {
    msg!("🚀 Starting Kamino withdraw CPI call, max amount: {}", max_amount);

    // 验证Kamino程序ID
    require_eq!(
        ctx.accounts.kamino_vault_program.key(),
        KAMINO_PROGRAM_ID,
        KaminoCPIError::InvalidKaminoProgram
    );

    // withdrawFromAvailable 账户
    let mut account_metas = vec![
        // 1. user
        AccountMeta::new(ctx.accounts.user.key(), true),
        // 2. vaultState
        AccountMeta::new(ctx.accounts.vault_state.key(), false),
        // 3. tokenVault
        AccountMeta::new(ctx.accounts.token_vault.key(), false),
        // 4. baseVaultAuthority
        AccountMeta::new_readonly(ctx.accounts.base_vault_authority.key(), false),
        // 5. userTokenAta
        AccountMeta::new(ctx.accounts.user_token_ata.key(), false),
        // 6. tokenMint
        AccountMeta::new(ctx.accounts.token_mint.key(), false),
        // 7. userSharesAta
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),
        // 8. sharesMint
        AccountMeta::new(ctx.accounts.shares_mint.key(), false),
        // 9. tokenProgram
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        // 10. sharesTokenProgram
        AccountMeta::new_readonly(ctx.accounts.shares_token_program.key(), false),
        // 11. klendProgram
        AccountMeta::new_readonly(ctx.accounts.klend_program.key(), false),
        // 12. eventAuthority
        AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
        // 13. program
        AccountMeta::new_readonly(ctx.accounts.kamino_vault_program.key(), false),
    ];

    // Add remaining_accounts
    // Use account.is_writable to determine permissions (like in deposit)
    msg!("📋 Adding {} remaining accounts", ctx.remaining_accounts.len());
    for account in ctx.remaining_accounts.iter() {
        if account.is_writable {
            account_metas.push(AccountMeta::new(account.key(), false));
        } else {
            account_metas.push(AccountMeta::new_readonly(account.key(), false));
        }
    }

    // 构建指令数据
    let mut data = Vec::with_capacity(16);
    // Kamino withdraw指令的discriminator
    data.extend_from_slice(&[0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22]); // withdraw discriminator
    data.extend_from_slice(&max_amount.to_le_bytes());

    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: KAMINO_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // 构建 account_infos (包含 remaining_accounts)
    let mut account_infos = vec![
        ctx.accounts.user.to_account_info(),
        ctx.accounts.vault_state.to_account_info(),
        ctx.accounts.token_vault.to_account_info(),
        ctx.accounts.base_vault_authority.to_account_info(),
        ctx.accounts.user_token_ata.to_account_info(),
        ctx.accounts.token_mint.to_account_info(),
        ctx.accounts.user_shares_ata.to_account_info(),
        ctx.accounts.shares_mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        ctx.accounts.shares_token_program.to_account_info(),
        ctx.accounts.klend_program.to_account_info(),
        ctx.accounts.event_authority.to_account_info(),
        ctx.accounts.kamino_vault_program.to_account_info(),
    ];

    // 添加 remaining_accounts 到 account_infos
    for account in ctx.remaining_accounts.iter() {
        account_infos.push(account.to_account_info());
    }

    anchor_lang::solana_program::program::invoke(&ix, &account_infos)?;

    msg!("✅ Kamino withdraw CPI call successful");
    Ok(())
}

/// 辅助函数：计算baseVaultAuthority PDA
pub fn get_base_vault_authority(vault_state: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"base_vault_authority", vault_state.as_ref()],
        &KAMINO_PROGRAM_ID,
    )
}

/// 辅助函数：计算eventAuthority PDA
pub fn get_event_authority() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"__event_authority"], &KAMINO_PROGRAM_ID)
}

#[error_code]
pub enum KaminoCPIError {
    #[msg("无效的Kamino程序ID")]
    InvalidKaminoProgram,

    #[msg("金额必须大于0")]
    InvalidAmount,

    #[msg("账户余额不足")]
    InsufficientBalance,
}
