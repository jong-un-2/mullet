use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::TokenAccount;
use crate::state::*;
use crate::error::MarsError;

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
    #[account(mut)]
    pub user_reward_ata: Account<'info, TokenAccount>,

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
            ctx.accounts.vault_state.created_at = Clock::get()?.unix_timestamp;
            ctx.accounts.vault_state.last_updated = Clock::get()?.unix_timestamp;
        }

        // 检查 vault 是否冻结
        require!(
            !ctx.accounts.global_state.frozen,
            MarsError::GlobalStateFrozen
        );

        // 记录领取前的奖励余额
        let reward_before = ctx.accounts.user_reward_ata.amount;
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

        // 重新加载账户以获取最新余额
        ctx.accounts.user_reward_ata.reload()?;

        let reward_after = ctx.accounts.user_reward_ata.amount;
        let reward_claimed = reward_after.saturating_sub(reward_before);

        msg!("📊 Rewards claimed:");
        msg!("  Reward: {} (+{})", reward_after, reward_claimed);

        // 可选：收取一定比例的奖励作为协议费用
        // 暂时不收费，只记录
        ctx.accounts.vault_state.total_rewards_claimed = ctx
            .accounts
            .vault_state
            .total_rewards_claimed
            .saturating_add(reward_claimed);

        msg!("🎉 Claim farm rewards completed!");
        msg!("  Total rewards claimed (lifetime): {}", ctx.accounts.vault_state.total_rewards_claimed);

        Ok(())
    }
}
