use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::kamino_constants::kamino::KAMINO_PROGRAM_ID;

// Kamino Vaults Program ID: Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE
// Multisig: 8ksXVE6SMSjQ9sPbj2XQ4Uxx6b7aXh9kHeq4nXMD2tDn
// IDL: https://explorer.solana.com/address/6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc/anchor-program
// 注意：不要在这里使用 declare_id!，只能在 lib.rs 中使用

#[derive(Accounts)]
pub struct KaminoDepositCPI<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 用户的代币账户
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// 用户的份额账户
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// Kamino Vault状态账户
    /// CHECK: 这是Kamino程序管理的账户
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// Kamino Vault的代币金库
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub kamino_vault_token_account: AccountInfo<'info>,
    
    /// Kamino Vault的份额铸造账户
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub kamino_shares_mint: AccountInfo<'info>,
    
    /// Kamino Vault Program
    /// CHECK: 这是已知的Kamino程序ID
    pub kamino_vault_program: AccountInfo<'info>,
    
    /// 代币程序
    pub token_program: Program<'info, Token>,
    
    /// 系统程序
    pub system_program: Program<'info, System>,
    
    /// 租金系统变量
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct KaminoWithdrawCPI<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// 用户的代币账户 (接收提取的代币)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// 用户的份额账户 (提供要销毁的份额)
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// Kamino Vault状态账户
    /// CHECK: 这是Kamino程序管理的账户
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// Kamino Vault的代币金库
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub kamino_vault_token_account: AccountInfo<'info>,
    
    /// Kamino Vault的份额铸造账户
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub kamino_shares_mint: AccountInfo<'info>,
    
    /// Kamino Vault Program
    /// CHECK: 这是已知的Kamino程序ID
    pub kamino_vault_program: AccountInfo<'info>,
    
    /// 代币程序
    pub token_program: Program<'info, Token>,
}

/// CPI调用Kamino进行存款
pub fn kamino_deposit_cpi(
    ctx: Context<KaminoDepositCPI>,
    amount: u64,
) -> Result<()> {
    msg!("开始CPI调用Kamino存款，金额: {}", amount);

    // 验证Kamino程序ID
    require_eq!(
        ctx.accounts.kamino_vault_program.key(),
        KAMINO_PROGRAM_ID,
        ErrorCode::InvalidKaminoProgram
    );

    // 构建Kamino存款指令的账户
    let kamino_accounts = vec![
        // 用户签名者
        ctx.accounts.user.to_account_info(),
        // Kamino Vault状态
        ctx.accounts.kamino_vault_state.to_account_info(),
        // 用户代币账户 (源)
        ctx.accounts.user_token_account.to_account_info(),
        // Kamino金库代币账户 (目标)
        ctx.accounts.kamino_vault_token_account.to_account_info(),
        // 用户份额账户 (接收份额)
        ctx.accounts.user_shares_account.to_account_info(),
        // 份额铸造账户
        ctx.accounts.kamino_shares_mint.to_account_info(),
        // 代币程序
        ctx.accounts.token_program.to_account_info(),
    ];

    // 构建Kamino存款指令数据 - Kamino Vault deposit 指令格式
    let deposit_instruction_data = build_kamino_deposit_instruction_data(amount)?;

    // 创建指令
    let deposit_instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.kamino_vault_program.key(),
        accounts: kamino_accounts.iter().map(|acc| {
            anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: acc.key(),
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }
        }).collect(),
        data: deposit_instruction_data,
    };

    // 执行CPI调用
    anchor_lang::solana_program::program::invoke(
        &deposit_instruction,
        &kamino_accounts,
    )?;

    msg!("Kamino存款CPI调用成功完成");
    Ok(())
}

/// CPI调用Kamino进行提取
pub fn kamino_withdraw_cpi(
    ctx: Context<KaminoWithdrawCPI>,
    shares_amount: u64,
) -> Result<()> {
    msg!("开始CPI调用Kamino提取，份额数量: {}", shares_amount);

    // 验证Kamino程序ID
    require_eq!(
        ctx.accounts.kamino_vault_program.key(),
        KAMINO_PROGRAM_ID,
        ErrorCode::InvalidKaminoProgram
    );

    // 构建Kamino提取指令的账户
    let kamino_accounts = vec![
        // 用户签名者
        ctx.accounts.user.to_account_info(),
        // Kamino Vault状态
        ctx.accounts.kamino_vault_state.to_account_info(),
        // 用户份额账户 (源，提供份额)
        ctx.accounts.user_shares_account.to_account_info(),
        // 用户代币账户 (目标，接收代币)
        ctx.accounts.user_token_account.to_account_info(),
        // Kamino金库代币账户
        ctx.accounts.kamino_vault_token_account.to_account_info(),
        // 份额铸造账户
        ctx.accounts.kamino_shares_mint.to_account_info(),
        // 代币程序
        ctx.accounts.token_program.to_account_info(),
    ];

    // 构建Kamino提取指令数据
    let withdraw_instruction_data = build_kamino_withdraw_instruction_data(shares_amount)?;

    // 创建指令
    let withdraw_instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.kamino_vault_program.key(),
        accounts: kamino_accounts.iter().map(|acc| {
            anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: acc.key(),
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            }
        }).collect(),
        data: withdraw_instruction_data,
    };

    // 执行CPI调用
    anchor_lang::solana_program::program::invoke(
        &withdraw_instruction,
        &kamino_accounts,
    )?;

    msg!("Kamino提取CPI调用成功完成");
    Ok(())
}

/// 构建 Kamino 存款指令数据
/// 基于 Kamino Vaults 程序的实际 IDL 实现
fn build_kamino_deposit_instruction_data(amount: u64) -> Result<Vec<u8>> {
    use crate::kamino_constants::kamino::DEPOSIT_INSTRUCTION_DISCRIMINATOR;
    
    let mut data = Vec::new();
    
    // Kamino deposit 指令识别码
    data.extend_from_slice(&DEPOSIT_INSTRUCTION_DISCRIMINATOR);
    
    // 存款金额 (u64, little endian)
    data.extend_from_slice(&amount.to_le_bytes());
    
    Ok(data)
}

/// 构建 Kamino 提取指令数据
fn build_kamino_withdraw_instruction_data(shares_amount: u64) -> Result<Vec<u8>> {
    use crate::kamino_constants::kamino::WITHDRAW_INSTRUCTION_DISCRIMINATOR;
    
    let mut data = Vec::new();
    
    // Kamino withdraw 指令识别码
    data.extend_from_slice(&WITHDRAW_INSTRUCTION_DISCRIMINATOR);
    
    // 提取份额数量 (u64, little endian)
    data.extend_from_slice(&shares_amount.to_le_bytes());
    
    Ok(data)
}

/// 带有PDA签名的Kamino存款CPI调用
#[derive(Accounts)]
pub struct KaminoDepositCPIWithPDA<'info> {
    /// 程序的PDA权限
    /// CHECK: 这是程序派生的权限账户
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: AccountInfo<'info>,
    
    /// 其他账户与KaminoDepositCPI相同
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,
    
    /// CHECK: Kamino Vault状态
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,
    
    /// CHECK: Kamino金库
    #[account(mut)]
    pub kamino_vault_token_account: AccountInfo<'info>,
    
    /// CHECK: 份额铸造
    #[account(mut)]
    pub kamino_shares_mint: AccountInfo<'info>,
    
    /// CHECK: Kamino程序
    pub kamino_vault_program: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

/// 使用PDA权限进行Kamino存款的CPI调用
pub fn kamino_deposit_cpi_with_pda(
    ctx: Context<KaminoDepositCPIWithPDA>,
    amount: u64,
) -> Result<()> {
    msg!("使用PDA权限进行Kamino存款CPI调用");

    let seeds = &[b"vault_authority".as_ref(), &[ctx.bumps.vault_authority]];
    let signer_seeds = &[&seeds[..]];

    // 构建账户列表
    let kamino_accounts = vec![
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.kamino_vault_state.to_account_info(),
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.kamino_vault_token_account.to_account_info(),
        ctx.accounts.user_shares_account.to_account_info(),
        ctx.accounts.kamino_shares_mint.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
    ];

    let deposit_instruction_data = build_kamino_deposit_instruction_data(amount)?;

    let deposit_instruction = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.kamino_vault_program.key(),
        accounts: kamino_accounts.iter().map(|acc| {
            anchor_lang::solana_program::instruction::AccountMeta {
                pubkey: acc.key(),
                is_signer: acc.key() == ctx.accounts.vault_authority.key(),
                is_writable: acc.is_writable,
            }
        }).collect(),
        data: deposit_instruction_data,
    };

    // 使用PDA签名执行CPI
    anchor_lang::solana_program::program::invoke_signed(
        &deposit_instruction,
        &kamino_accounts,
        signer_seeds,
    )?;

    msg!("PDA权限Kamino存款CPI调用成功");
    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("无效的Kamino程序ID")]
    InvalidKaminoProgram,
    
    #[msg("存款金额必须大于0")]
    InvalidDepositAmount,
    
    #[msg("提取份额数量必须大于0")]
    InvalidWithdrawAmount,
    
    #[msg("账户余额不足")]
    InsufficientBalance,
}