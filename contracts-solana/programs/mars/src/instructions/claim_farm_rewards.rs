use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::token::TokenAccount;
use crate::state::*;
use crate::error::MarsError;

/// 从 Kamino Farm 领取奖励
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

    /// Reward Token 0 Mint
    /// CHECK: Reward token mint
    pub reward_token_0_mint: UncheckedAccount<'info>,

    /// Reward Token 0 Vault (farm 的奖励池)
    /// CHECK: Farm's reward vault
    #[account(mut)]
    pub reward_token_0_vault: UncheckedAccount<'info>,

    /// User Reward Token 0 ATA (用户接收奖励的账户)
    #[account(mut)]
    pub user_reward_token_0_ata: Account<'info, TokenAccount>,

    /// Reward Token 1 Mint (可选)
    /// CHECK: Reward token mint
    pub reward_token_1_mint: UncheckedAccount<'info>,

    /// Reward Token 1 Vault (可选)
    /// CHECK: Farm's reward vault
    #[account(mut)]
    pub reward_token_1_vault: UncheckedAccount<'info>,

    /// User Reward Token 1 ATA (可选)
    #[account(mut)]
    pub user_reward_token_1_ata: Account<'info, TokenAccount>,

    /// Farm Authority PDA (用于签名)
    /// CHECK: Farm authority
    pub farm_authority: UncheckedAccount<'info>,

    /// Kamino Farms 程序
    /// CHECK: Kamino Farms program
    pub farms_program: UncheckedAccount<'info>,

    /// Token program (支持 SPL Token 和 Token-2022)
    /// CHECK: Can be either SPL Token or Token-2022
    pub token_program: AccountInfo<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> ClaimFarmRewards<'info> {
    pub fn process_instruction(ctx: Context<ClaimFarmRewards>) -> Result<()> {
        msg!("🎁 Starting claim farm rewards");

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
        let reward_0_before = ctx.accounts.user_reward_token_0_ata.amount;
        let reward_1_before = ctx.accounts.user_reward_token_1_ata.amount;

        msg!("📊 Reward balances before claim:");
        msg!("  Reward 0: {}", reward_0_before);
        msg!("  Reward 1: {}", reward_1_before);

        // 构造 Kamino Farms harvest (claim) CPI 账户
        let cpi_accounts = vec![
            AccountMeta::new(ctx.accounts.user.key(), true),                    // 0: user (signer+writable)
            AccountMeta::new(ctx.accounts.farm_state.key(), false),             // 1: farm_state (writable)
            AccountMeta::new(ctx.accounts.user_farm.key(), false),              // 2: user_farm (writable)
            AccountMeta::new_readonly(ctx.accounts.reward_token_0_mint.key(), false), // 3: reward_token_0_mint
            AccountMeta::new(ctx.accounts.reward_token_0_vault.key(), false),   // 4: reward_token_0_vault (writable)
            AccountMeta::new(ctx.accounts.user_reward_token_0_ata.key(), false), // 5: user_reward_token_0_ata (writable)
            AccountMeta::new_readonly(ctx.accounts.reward_token_1_mint.key(), false), // 6: reward_token_1_mint
            AccountMeta::new(ctx.accounts.reward_token_1_vault.key(), false),   // 7: reward_token_1_vault (writable)
            AccountMeta::new(ctx.accounts.user_reward_token_1_ata.key(), false), // 8: user_reward_token_1_ata (writable)
            AccountMeta::new_readonly(ctx.accounts.farm_authority.key(), false), // 9: farm_authority
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),  // 10: token_program
        ];

        msg!("📋 Prepared {} accounts for harvest CPI", cpi_accounts.len());

        // Kamino Farms harvest discriminator
        // harvest([u8; 8]) - 从 Kamino SDK 获取
        let mut instruction_data = vec![0u8; 8];
        instruction_data[0..8].copy_from_slice(&[0x25, 0x90, 0x4e, 0x7b, 0x2d, 0x4e, 0x5a, 0x0c]);

        msg!("🚀 Executing CPI call to Kamino Farms harvest");

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
                ctx.accounts.farm_state.to_account_info(),
                ctx.accounts.user_farm.to_account_info(),
                ctx.accounts.reward_token_0_mint.to_account_info(),
                ctx.accounts.reward_token_0_vault.to_account_info(),
                ctx.accounts.user_reward_token_0_ata.to_account_info(),
                ctx.accounts.reward_token_1_mint.to_account_info(),
                ctx.accounts.reward_token_1_vault.to_account_info(),
                ctx.accounts.user_reward_token_1_ata.to_account_info(),
                ctx.accounts.farm_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        msg!("✅ Harvest CPI successful!");

        // 重新加载账户以获取最新余额
        ctx.accounts.user_reward_token_0_ata.reload()?;
        ctx.accounts.user_reward_token_1_ata.reload()?;

        let reward_0_after = ctx.accounts.user_reward_token_0_ata.amount;
        let reward_1_after = ctx.accounts.user_reward_token_1_ata.amount;

        let reward_0_claimed = reward_0_after.saturating_sub(reward_0_before);
        let reward_1_claimed = reward_1_after.saturating_sub(reward_1_before);

        msg!("📊 Rewards claimed:");
        msg!("  Reward 0: {} (+{})", reward_0_after, reward_0_claimed);
        msg!("  Reward 1: {} (+{})", reward_1_after, reward_1_claimed);

        // 可选：收取一定比例的奖励作为协议费用
        // 暂时不收费，只记录
        ctx.accounts.vault_state.total_rewards_claimed = ctx
            .accounts
            .vault_state
            .total_rewards_claimed
            .saturating_add(reward_0_claimed)
            .saturating_add(reward_1_claimed);

        msg!("🎉 Claim farm rewards completed!");
        msg!("  Total rewards claimed (lifetime): {}", ctx.accounts.vault_state.total_rewards_claimed);

        Ok(())
    }
}
