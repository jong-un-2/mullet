use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use crate::state::*;
use crate::error::MarsError;

/// 读取 Token Account 的 amount 字段（支持 SPL Token 和 Token-2022）
/// Token Account 布局：mint(32) + owner(32) + amount(8) + ...
fn get_token_account_amount(account: &UncheckedAccount) -> Result<u64> {
    let data = account.try_borrow_data()?;
    require!(data.len() >= 72, MarsError::InvalidTokenAccount);
    
    // amount 字段在偏移量 64 处（32 bytes mint + 32 bytes owner）
    let amount_bytes: [u8; 8] = data[64..72]
        .try_into()
        .map_err(|_| MarsError::InvalidTokenAccount)?;
    
    Ok(u64::from_le_bytes(amount_bytes))
}

/// 从 Kamino Farm 领取奖励
/// 注意：Kamino harvest 指令每次只能领取一个奖励，所以需要传入 reward_index
#[derive(Accounts)]
pub struct ClaimFarmRewards<'info> {
    /// 用户账户
    #[account(mut)]
    pub user: Signer<'info>,

    /// Global state - 用于记录和收取手续费
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<GlobalState>(),
        seeds = [b"global-state"],
        bump,
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    /// Vault state - PYUSD vault
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<VaultState>(),
        seeds = [b"vault-state", vault_mint.key().as_ref()],
        bump,
    )]
    pub vault_state: Box<Account<'info, VaultState>>,

    /// Vault mint (PYUSD)
    /// CHECK: Verified through seeds
    pub vault_mint: AccountInfo<'info>,

    /// Farm state 账户
    /// CHECK: Kamino Farm state account
    #[account(mut)]
    pub farm_state: UncheckedAccount<'info>,

    /// User farm 账户
    /// CHECK: User's farm account
    #[account(mut)]
    pub user_farm: UncheckedAccount<'info>,

    /// Global Config (Kamino)
    /// CHECK: Kamino global config
    pub global_config: UncheckedAccount<'info>,

    /// Reward Token Mint
    /// CHECK: Reward token mint
    pub reward_mint: UncheckedAccount<'info>,

    /// Reward Vault (farm 的奖励池)
    /// CHECK: Farm's reward vault
    #[account(mut)]
    pub reward_vault: UncheckedAccount<'info>,

    /// Treasury Vault (Kamino treasury)
    /// CHECK: Kamino treasury vault
    #[account(mut)]
    pub treasury_vault: UncheckedAccount<'info>,

    /// User Reward Token ATA (用户接收奖励的账户)
    /// 使用 UncheckedAccount 以支持 Token-2022 (不再硬编码 SPL Token owner check)
    /// CHECK: Token account manually validated in instruction
    #[account(mut)]
    pub user_reward_ata: UncheckedAccount<'info>,

    /// Platform Fee Reward Token ATA (平台收取费用的账户)
    /// CHECK: Platform fee account for reward tokens
    #[account(mut)]
    pub platform_fee_ata: UncheckedAccount<'info>,

    /// Farm Authority PDA (用于签名)
    /// CHECK: Farm authority
    pub farm_authority: UncheckedAccount<'info>,

    /// Scope Prices (optional, can be Program ID if not used)
    /// CHECK: Scope prices oracle
    pub scope_prices: UncheckedAccount<'info>,

    /// Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,

    /// Reward Token program (支持 SPL Token 和 Token-2022)
    /// CHECK: Can be either SPL Token or Token-2022
    pub reward_token_program: AccountInfo<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimFarmRewards<'info> {
    pub fn process_instruction(ctx: Context<ClaimFarmRewards>, reward_index: u64) -> Result<()> {
        msg!("🎁 Starting claim farm rewards (reward index: {})", reward_index);

        // 如果 global_state 是新创建的，初始化默认值
        if ctx.accounts.global_state.admin == Pubkey::default() {
            msg!("🆕 Initializing global_state for the first time");
            ctx.accounts.global_state.admin = ctx.accounts.user.key();
            ctx.accounts.global_state.frozen = false;
            ctx.accounts.global_state.base_mint = ctx.accounts.vault_mint.key();
            ctx.accounts.global_state.cross_chain_fee_bps = 30; // 0.3%
            ctx.accounts.global_state.rebalance_threshold = 0;
            ctx.accounts.global_state.max_order_amount = 100_000_000_000; // 100k
        }

        // 如果 vault_state 是新创建的，初始化默认值
        if ctx.accounts.vault_state.base_token_mint == Pubkey::default() {
            msg!("🆕 Initializing vault_state for the first time");
            ctx.accounts.vault_state.admin = ctx.accounts.user.key();
            ctx.accounts.vault_state.base_token_mint = ctx.accounts.vault_mint.key();
            ctx.accounts.vault_state.status = VaultStatus::Active;
            ctx.accounts.vault_state.total_rewards_claimed = 0;
            ctx.accounts.vault_state.total_platform_fee_collected = 0;
            ctx.accounts.vault_state.created_at = Clock::get()?.unix_timestamp;
            ctx.accounts.vault_state.last_updated = Clock::get()?.unix_timestamp;
        }

        // 检查 vault 是否冻结
        require!(
            !ctx.accounts.global_state.frozen,
            MarsError::GlobalStateFrozen
        );

        // 记录领取前的奖励余额（手动读取 Token Account）
        let reward_before = get_token_account_amount(&ctx.accounts.user_reward_ata)?;
        msg!("📊 Reward balance before claim: {}", reward_before);

        // 构造 Kamino Farms harvestReward CPI 账户
        // harvestReward 账户结构 (参考 Kamino SDK):
        // 0: owner (signer+writable)
        // 1: userState (writable)
        // 2: farmState (writable)
        // 3: globalConfig (readonly)
        // 4: rewardMint (readonly)
        // 5: userRewardAta (writable)
        // 6: rewardsVault (writable)
        // 7: rewardsTreasuryVault (writable)
        // 8: farmVaultsAuthority (readonly)
        // 9: scopePrices (readonly, optional)
        // 10: tokenProgram (readonly)
        let cpi_accounts = vec![
            AccountMeta::new(ctx.accounts.user.key(), true),                          // 0: owner
            AccountMeta::new(ctx.accounts.user_farm.key(), false),                    // 1: userState
            AccountMeta::new(ctx.accounts.farm_state.key(), false),                   // 2: farmState
            AccountMeta::new_readonly(ctx.accounts.global_config.key(), false),       // 3: globalConfig
            AccountMeta::new_readonly(ctx.accounts.reward_mint.key(), false),         // 4: rewardMint
            AccountMeta::new(ctx.accounts.user_reward_ata.key(), false),              // 5: userRewardAta
            AccountMeta::new(ctx.accounts.reward_vault.key(), false),                 // 6: rewardsVault
            AccountMeta::new(ctx.accounts.treasury_vault.key(), false),               // 7: rewardsTreasuryVault
            AccountMeta::new_readonly(ctx.accounts.farm_authority.key(), false),      // 8: farmVaultsAuthority
            AccountMeta::new_readonly(ctx.accounts.scope_prices.key(), false),        // 9: scopePrices
            AccountMeta::new_readonly(ctx.accounts.reward_token_program.key(), false), // 10: tokenProgram
        ];

        msg!("📋 Prepared {} accounts for harvestReward CPI", cpi_accounts.len());

        // Kamino Farms harvestReward discriminator + rewardIndex (u64)
        // discriminator: [68, 200, 228, 233, 184, 32, 226, 188]
        let mut instruction_data = vec![0u8; 16]; // 8 bytes discriminator + 8 bytes u64
        instruction_data[0..8].copy_from_slice(&[68, 200, 228, 233, 184, 32, 226, 188]);
        instruction_data[8..16].copy_from_slice(&reward_index.to_le_bytes());

        msg!("🚀 Executing CPI call to Kamino Farms harvestReward");

        // 创建 CPI 指令
        let harvest_ix = solana_program::instruction::Instruction {
            program_id: ctx.accounts.farms_program.key(),
            accounts: cpi_accounts,
            data: instruction_data,
        };

        // 执行 CPI
        solana_program::program::invoke(
            &harvest_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.user_farm.to_account_info(),
                ctx.accounts.farm_state.to_account_info(),
                ctx.accounts.global_config.to_account_info(),
                ctx.accounts.reward_mint.to_account_info(),
                ctx.accounts.user_reward_ata.to_account_info(),
                ctx.accounts.reward_vault.to_account_info(),
                ctx.accounts.treasury_vault.to_account_info(),
                ctx.accounts.farm_authority.to_account_info(),
                ctx.accounts.scope_prices.to_account_info(),
                ctx.accounts.reward_token_program.to_account_info(),
            ],
        )?;

        msg!("✅ HarvestReward CPI successful!");

        // 读取 CPI 后的最新余额（手动读取 Token Account）
        let reward_after = get_token_account_amount(&ctx.accounts.user_reward_ata)?;
        let reward_claimed = reward_after.saturating_sub(reward_before);

        msg!("📊 Rewards claimed:");
        msg!("  Reward: {} (+{})", reward_after, reward_claimed);

        // 使用 vault_state 中配置的平台费率（可通过管理指令更新）
        // 如果未设置或为 0，则使用默认值 2500 (25%)
        let platform_fee_bps: u64 = if ctx.accounts.vault_state.platform_fee_bps == 0 {
            2500 // 默认 25%
        } else {
            ctx.accounts.vault_state.platform_fee_bps as u64
        };
        
        let platform_fee = reward_claimed
            .checked_mul(platform_fee_bps)
            .ok_or(MarsError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(MarsError::MathOverflow)?;
        
        let user_reward_after_fee = reward_claimed.saturating_sub(platform_fee);

        msg!("💰 Fee calculation:");
        msg!("  Total claimed: {}", reward_claimed);
        msg!("  Platform fee ({}%): {}", platform_fee_bps as f64 / 100.0, platform_fee);
        msg!("  User receives: {}", user_reward_after_fee);

        // 如果平台费大于 0，则转账到平台费用账户
        if platform_fee > 0 {
            // 构建 Token transfer 指令数据
            // Transfer instruction layout: [1, amount_bytes]
            // 1 = Transfer instruction discriminator
            let mut transfer_data = vec![3u8]; // 3 = Transfer instruction for SPL Token
            transfer_data.extend_from_slice(&platform_fee.to_le_bytes());

            // 构建转账指令账户
            let transfer_accounts = vec![
                AccountMeta::new(ctx.accounts.user_reward_ata.key(), false),      // source
                AccountMeta::new(ctx.accounts.platform_fee_ata.key(), false),     // destination
                AccountMeta::new_readonly(ctx.accounts.user.key(), true),         // authority
            ];

            let transfer_ix = solana_program::instruction::Instruction {
                program_id: ctx.accounts.reward_token_program.key(),
                accounts: transfer_accounts,
                data: transfer_data,
            };

            // 执行转账
            solana_program::program::invoke(
                &transfer_ix,
                &[
                    ctx.accounts.user_reward_ata.to_account_info(),
                    ctx.accounts.platform_fee_ata.to_account_info(),
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.reward_token_program.to_account_info(),
                ],
            )?;

            msg!("✅ Platform fee transferred: {}", platform_fee);
        }

        // 更新 vault_state 中的统计信息
        ctx.accounts.vault_state.total_rewards_claimed = ctx
            .accounts
            .vault_state
            .total_rewards_claimed
            .saturating_add(reward_claimed);
        
        // 记录平台费
        ctx.accounts.vault_state.total_platform_fee_collected = ctx
            .accounts
            .vault_state
            .total_platform_fee_collected
            .saturating_add(platform_fee);

        msg!("🎉 Claim farm rewards completed!");
        msg!("  Total rewards claimed (lifetime): {}", ctx.accounts.vault_state.total_rewards_claimed);
        msg!("  Platform fee collected: {}", platform_fee);
        msg!("  Total platform fees (lifetime): {}", ctx.accounts.vault_state.total_platform_fee_collected);

        // 发出事件
        emit!(crate::events::FarmRewardsClaimedEvent {
            user: ctx.accounts.user.key(),
            vault_mint: ctx.accounts.vault_mint.key(),
            farm_state: ctx.accounts.farm_state.key(),
            reward_mint: ctx.accounts.reward_mint.key(),
            reward_amount: user_reward_after_fee, // 用户实际收到的奖励（扣除平台费后）
            platform_fee: platform_fee,           // 平台收取的费用
            total_rewards_claimed: ctx.accounts.vault_state.total_rewards_claimed,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
