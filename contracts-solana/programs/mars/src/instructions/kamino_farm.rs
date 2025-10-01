use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::{Token, TokenAccount, Mint};

#[derive(Accounts)]
pub struct KaminoStakeInFarm<'info> {
    /// 用户账户
    #[account(mut)]
    pub user: Signer<'info>,

    /// Farm state 账户
    /// CHECK: Kamino Farm state account
    #[account(mut)]
    pub farm_state: UncheckedAccount<'info>,

    /// User farm 账户（用户在 farm 中的质押记录）
    /// CHECK: User's farm account
    #[account(mut)]
    pub user_farm: UncheckedAccount<'info>,

    /// Delegated stake（委托质押账户）
    /// CHECK: Delegated stake account
    #[account(mut)]
    pub delegated_stake: UncheckedAccount<'info>,

    /// 用户的 shares token 账户
    #[account(mut)]
    pub user_shares_ata: Account<'info, TokenAccount>,

    /// Shares mint
    pub shares_mint: Account<'info, Mint>,

    /// Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,

    /// Token program (支持 Token 或 Token-2022)
    /// CHECK: Token 或 Token-2022 程序
    pub token_program: AccountInfo<'info>,
}

pub fn handler_kamino_stake_in_farm(
    ctx: Context<KaminoStakeInFarm>,
    shares_amount: u64,
) -> Result<()> {
    msg!("🌾 开始质押到 Kamino Farm，数量: {}", shares_amount);

    // 构造 CPI 账户
    let cpi_accounts = vec![
        AccountMeta::new_readonly(ctx.accounts.user.key(), true),         // 0: user (signer)
        AccountMeta::new(ctx.accounts.farm_state.key(), false),           // 1: farm_state (writable)
        AccountMeta::new(ctx.accounts.user_farm.key(), false),            // 2: user_farm (writable)
        AccountMeta::new(ctx.accounts.delegated_stake.key(), false),      // 3: delegated_stake (writable)
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),      // 4: user_shares_ata (writable)
        AccountMeta::new_readonly(ctx.accounts.shares_mint.key(), false), // 5: shares_mint (readonly)
        AccountMeta::new_readonly(ctx.accounts.farms_program.key(), false), // 6: farms_program (readonly)
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false), // 7: token_program (readonly)
    ];

    msg!("📋 准备 {} 个账户", cpi_accounts.len());

    // 构造指令数据
    // Farms 的 stake 指令: discriminator (8 bytes) + amount (8 bytes)
    let mut instruction_data = vec![0u8; 16];
    
    // Kamino Farms stake discriminator (从SDK获取)
    // Hex: ceb0ca12c8d1b36c
    instruction_data[0..8].copy_from_slice(&[0xce, 0xb0, 0xca, 0x12, 0xc8, 0xd1, 0xb3, 0x6c]);
    
    // Amount: u64::MAX 表示质押全部 shares
    instruction_data[8..16].copy_from_slice(&shares_amount.to_le_bytes());

    // 创建 CPI 指令
    let stake_ix = solana_program::instruction::Instruction {
        program_id: ctx.accounts.farms_program.key(),
        accounts: cpi_accounts,
        data: instruction_data,
    };

    msg!("🚀 执行 CPI 调用 Kamino Farms");

    // 执行 CPI
    solana_program::program::invoke(
        &stake_ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.farm_state.to_account_info(),
            ctx.accounts.user_farm.to_account_info(),
            ctx.accounts.delegated_stake.to_account_info(),
            ctx.accounts.user_shares_ata.to_account_info(),
            ctx.accounts.shares_mint.to_account_info(),
            ctx.accounts.farms_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
    )?;

    msg!("✅ 质押成功!");

    Ok(())
}

/// Unstake from Farm 所需账户
#[derive(Accounts)]
pub struct KaminoUnstakeFromFarm<'info> {
    /// 用户账户
    #[account(mut)]
    pub user: Signer<'info>,

    /// Farm state 账户
    /// CHECK: Kamino Farm state account
    #[account(mut)]
    pub farm_state: UncheckedAccount<'info>,

    /// User farm 账户
    /// CHECK: User's farm account
    #[account(mut)]
    pub user_farm: UncheckedAccount<'info>,

    /// 用户的 shares token 账户
    /// CHECK: User's shares ATA
    #[account(mut)]
    pub user_shares_ata: AccountInfo<'info>,

    /// Delegated stake 账户
    /// CHECK: Delegated stake account
    #[account(mut)]
    pub delegated_stake: UncheckedAccount<'info>,

    /// Scope prices 账户（用于价格 oracle）
    /// CHECK: Scope prices account
    pub scope_prices: UncheckedAccount<'info>,

    /// Token program
    /// CHECK: Token program
    pub token_program: AccountInfo<'info>,

    /// Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,
}

pub fn handler_kamino_unstake_from_farm(
    ctx: Context<KaminoUnstakeFromFarm>,
) -> Result<()> {
    msg!("🌾 开始从 Kamino Farm 取消质押");

    // 构造 CPI 账户（7个账户）
    let cpi_accounts = vec![
        AccountMeta::new(ctx.accounts.user.key(), true),              // 0: user (signer+writable)
        AccountMeta::new(ctx.accounts.farm_state.key(), false),       // 1: farm_state (writable)
        AccountMeta::new(ctx.accounts.user_farm.key(), false),        // 2: user_farm (writable)
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),  // 3: user_shares_ata (writable)
        AccountMeta::new(ctx.accounts.delegated_stake.key(), false),  // 4: delegated_stake (writable)
        AccountMeta::new_readonly(ctx.accounts.scope_prices.key(), false), // 5: scope_prices (readonly)
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false), // 6: token_program (readonly)
    ];

    msg!("📋 准备 {} 个账户", cpi_accounts.len());

    // 构造指令数据
    // Farms 的 unstake 指令: discriminator (8 bytes)
    let instruction_data = vec![0x24, 0x66, 0xbb, 0x31, 0xdc, 0x24, 0x84, 0x43]; // unstake discriminator
    
    msg!("🚀 执行 CPI 调用 Kamino Farms unstake");

    // 创建 CPI 指令
    let unstake_ix = solana_program::instruction::Instruction {
        program_id: ctx.accounts.farms_program.key(),
        accounts: cpi_accounts,
        data: instruction_data,
    };

    // 执行 CPI
    solana_program::program::invoke(
        &unstake_ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.farm_state.to_account_info(),
            ctx.accounts.user_farm.to_account_info(),
            ctx.accounts.user_shares_ata.to_account_info(),
            ctx.accounts.delegated_stake.to_account_info(),
            ctx.accounts.scope_prices.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
    )?;

    msg!("✅ 取消质押成功!");

    Ok(())
}

/// 存款并质押的组合账户结构
/// 这个结构包含存款所需的所有账户 + farm 质押所需的账户
#[derive(Accounts)]
pub struct KaminoDepositAndStake<'info> {
    // === 存款相关账户（13个） ===
    
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
    
    /// 4. tokenMint - 代币铸造账户（如PYUSD）
    /// CHECK: 由Kamino程序验证
    pub token_mint: AccountInfo<'info>,
    
    /// 5. baseVaultAuthority - Vault权限PDA
    /// CHECK: 由Kamino程序验证
    pub base_vault_authority: AccountInfo<'info>,
    
    /// 6. sharesMint - 份额铸造账户
    /// CHECK: 由Kamino程序验证
    #[account(mut)]
    pub shares_mint: AccountInfo<'info>,
    
    /// 7. userTokenAta - 用户的代币ATA（源）
    /// CHECK: 支持 Token 和 Token-2022
    #[account(mut)]
    pub user_token_ata: AccountInfo<'info>,
    
    /// 8. userSharesAta - 用户的份额ATA
    /// CHECK: 支持 Token 和 Token-2022
    #[account(mut)]
    pub user_shares_ata: AccountInfo<'info>,
    
    /// 9. klendProgram - Klend程序
    /// CHECK: Klend程序ID
    pub klend_program: AccountInfo<'info>,
    
    /// 10. tokenProgram - Token程序
    /// CHECK: Token 或 Token-2022
    pub token_program: AccountInfo<'info>,
    
    /// 11. sharesTokenProgram - 份额Token程序
    /// CHECK: Token 或 Token-2022
    pub shares_token_program: AccountInfo<'info>,
    
    /// 12. eventAuthority - 事件权限PDA
    /// CHECK: 由Kamino程序验证
    pub event_authority: AccountInfo<'info>,
    
    /// 13. kaminoVaultProgram - Kamino Vault程序
    /// CHECK: Kamino Vault程序ID
    pub kamino_vault_program: AccountInfo<'info>,
    
    // === Farm 质押相关账户（4个新增）===
    
    /// 14. farmState - Farm state 账户
    /// CHECK: Kamino Farm state account
    #[account(mut)]
    pub farm_state: UncheckedAccount<'info>,

    /// 15. userFarm - 用户在 farm 中的质押记录
    /// CHECK: User's farm account
    #[account(mut)]
    pub user_farm: UncheckedAccount<'info>,

    /// 16. delegatedStake - 委托质押账户
    /// CHECK: Delegated stake account
    #[account(mut)]
    pub delegated_stake: UncheckedAccount<'info>,

    /// 17. farmsProgram - Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,
    
    /// 18. farmTokenProgram - Farm 使用的 Token 程序（通常是普通 Token Program）
    /// CHECK: Token Program for Farm
    pub farm_token_program: AccountInfo<'info>,
}

/// 存款并自动质押到 Farm（组合操作）
/// 
/// remaining_accounts 应该包含 vault 的 reserves 和对应的 lending markets
pub fn handler_kamino_deposit_and_stake<'info>(
    ctx: Context<'_, '_, '_, 'info, KaminoDepositAndStake<'info>>,
    max_amount: u64,
) -> Result<()> {
    use anchor_lang::solana_program::instruction::AccountMeta;
    use crate::kamino_constants::kamino::KAMINO_PROGRAM_ID;
    
    msg!("💰 开始存款并质押流程，金额: {}", max_amount);
    
    // ===== 第一步：存款到 Kamino Vault =====
    msg!("📥 第一步：存款到 Vault");
    
    // 构建存款账户数组
    let mut deposit_accounts = vec![
        AccountMeta::new(ctx.accounts.user.key(), true),
        AccountMeta::new(ctx.accounts.vault_state.key(), false),
        AccountMeta::new(ctx.accounts.token_vault.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.base_vault_authority.key(), false),
        AccountMeta::new(ctx.accounts.shares_mint.key(), false),
        AccountMeta::new(ctx.accounts.user_token_ata.key(), false),
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),
        AccountMeta::new_readonly(ctx.accounts.klend_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.shares_token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
        AccountMeta::new_readonly(ctx.accounts.kamino_vault_program.key(), false),
    ];
    
    // 添加 remaining_accounts
    for (i, account) in ctx.remaining_accounts.iter().enumerate() {
        let is_writable = i % 2 == 0;
        if is_writable {
            deposit_accounts.push(AccountMeta::new(account.key(), false));
        } else {
            deposit_accounts.push(AccountMeta::new_readonly(account.key(), false));
        }
    }
    
    // 构建存款指令数据
    let mut deposit_data = Vec::with_capacity(16);
    deposit_data.extend_from_slice(&[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]); // deposit discriminator
    deposit_data.extend_from_slice(&max_amount.to_le_bytes());
    
    let deposit_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: KAMINO_PROGRAM_ID,
        accounts: deposit_accounts,
        data: deposit_data,
    };
    
    // 准备存款的 account_infos
    let mut deposit_account_infos = vec![
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
    
    for account in ctx.remaining_accounts.iter() {
        deposit_account_infos.push(account.to_account_info());
    }
    
    // 执行存款 CPI
    anchor_lang::solana_program::program::invoke(&deposit_ix, &deposit_account_infos)?;
    msg!("✅ 存款成功");
    
    // ===== 第二步：质押到 Farm =====
    msg!("🌾 第二步：质押到 Farm");
    
    let stake_accounts = vec![
        AccountMeta::new_readonly(ctx.accounts.user.key(), true),
        AccountMeta::new(ctx.accounts.farm_state.key(), false),
        AccountMeta::new(ctx.accounts.user_farm.key(), false),
        AccountMeta::new(ctx.accounts.delegated_stake.key(), false),
        AccountMeta::new(ctx.accounts.user_shares_ata.key(), false),
        AccountMeta::new_readonly(ctx.accounts.shares_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.farms_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.farm_token_program.key(), false),  // 使用 farm 专用的 token program
    ];
    
    // 构建质押指令数据
    let mut stake_data = vec![0u8; 16];
    stake_data[0..8].copy_from_slice(&[0xce, 0xb0, 0xca, 0x12, 0xc8, 0xd1, 0xb3, 0x6c]);
    stake_data[8..16].copy_from_slice(&u64::MAX.to_le_bytes()); // 质押全部 shares
    
    let stake_ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.farms_program.key(),
        accounts: stake_accounts,
        data: stake_data,
    };
    
    // 执行质押 CPI
    anchor_lang::solana_program::program::invoke(
        &stake_ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.farm_state.to_account_info(),
            ctx.accounts.user_farm.to_account_info(),
            ctx.accounts.delegated_stake.to_account_info(),
            ctx.accounts.user_shares_ata.to_account_info(),
            ctx.accounts.shares_mint.to_account_info(),
            ctx.accounts.farms_program.to_account_info(),
            ctx.accounts.farm_token_program.to_account_info(),  // 使用 farm 专用的 token program
        ],
    )?;
    
    msg!("✅ 质押成功");
    msg!("🎉 存款并质押完成!");
    
    Ok(())
}

/// StartUnstake from Farm 所需账户
#[derive(Accounts)]
pub struct KaminoStartUnstakeFromFarm<'info> {
    /// 用户账户
    #[account(mut)]
    pub user: Signer<'info>,

    /// Farm state 账户
    /// CHECK: Kamino Farm state account
    #[account(mut)]
    pub farm_state: UncheckedAccount<'info>,

    /// User farm 账户
    /// CHECK: User's farm account
    #[account(mut)]
    pub user_farm: UncheckedAccount<'info>,

    /// Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,
}

pub fn handler_kamino_start_unstake_from_farm(
    ctx: Context<KaminoStartUnstakeFromFarm>,
    shares_amount: u64,
    current_slot: u64,
) -> Result<()> {
    msg!("🌾 开始发起 Farm 取消质押请求");
    msg!("  数量: {}", shares_amount);
    msg!("  Slot: {}", current_slot);

    // 构造 CPI 账户（4个账户）
    let cpi_accounts = vec![
        AccountMeta::new(ctx.accounts.user.key(), true),          // 0: user (signer+writable)
        AccountMeta::new(ctx.accounts.farm_state.key(), false),   // 1: farm_state (writable)
        AccountMeta::new(ctx.accounts.user_farm.key(), false),    // 2: user_farm (writable)
        AccountMeta::new_readonly(ctx.accounts.farms_program.key(), false), // 3: farms_program (readonly)
    ];

    msg!("📋 准备 {} 个账户", cpi_accounts.len());

    // 构造指令数据
    // StartUnstake 指令: discriminator (8 bytes) + amount (8 bytes) + slot (8 bytes)
    let mut instruction_data = vec![0u8; 24];
    
    // StartUnstake discriminator
    instruction_data[0..8].copy_from_slice(&[0x5a, 0x5f, 0x6b, 0x2a, 0xcd, 0x7c, 0x32, 0xe1]);
    
    // Amount (u64)
    instruction_data[8..16].copy_from_slice(&shares_amount.to_le_bytes());
    
    // Slot (u64)
    instruction_data[16..24].copy_from_slice(&current_slot.to_le_bytes());
    
    msg!("🚀 执行 CPI 调用 Kamino Farms StartUnstake");

    // 创建 CPI 指令
    let start_unstake_ix = solana_program::instruction::Instruction {
        program_id: ctx.accounts.farms_program.key(),
        accounts: cpi_accounts,
        data: instruction_data,
    };

    // 执行 CPI
    solana_program::program::invoke(
        &start_unstake_ix,
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.farm_state.to_account_info(),
            ctx.accounts.user_farm.to_account_info(),
        ],
    )?;

    msg!("✅ StartUnstake 成功!");

    Ok(())
}
