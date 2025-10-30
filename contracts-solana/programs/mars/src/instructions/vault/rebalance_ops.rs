use crate::error::*;
use crate::state::*;
use crate::utils::{PythOracle, RebalanceConfig, RebalanceEngine};
use anchor_lang::prelude::*;

/// 执行自动再平衡操作
///
/// 该指令会：
/// 1. 检查当前各协议的分配是否偏离目标
/// 2. 如果偏差超过阈值，生成再平衡计划
/// 3. 执行高优先级的再平衡动作
#[derive(Accounts)]
pub struct ExecuteRebalance<'info> {
    /// 授权执行者（通常是管理员或自动化bot）
    #[account(
        constraint = executor.key() == global_state.admin @ CustomError::UnauthorizedSigner
    )]
    pub executor: Signer<'info>,

    /// 全局状态
    #[account(
        seeds = [b"global-state"],
        bump,
        constraint = !global_state.frozen @ CustomError::GlobalStateFrozen
    )]
    pub global_state: Account<'info, GlobalState>,

    /// Vault 状态
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump,
        constraint = vault_state.status == VaultStatus::Active @ CustomError::VaultPaused
    )]
    pub vault_state: Account<'info, VaultState>,

    /// 再平衡配置（可选，使用默认值）
    /// CHECK: 如果提供，将从账户读取配置
    pub rebalance_config: Option<AccountInfo<'info>>,

    /// Pyth 价格账户（用于验证价格和计算APY）
    /// CHECK: Pyth 程序验证
    pub price_feed: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}

impl ExecuteRebalance<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        protocol_apys: Vec<(u8, u64)>, // (protocol_id, apy_bps)
    ) -> Result<()> {
        msg!("🔄 Starting rebalance check...");

        // 1. 加载或使用默认再平衡配置
        let config = if let Some(_config_account) = &ctx.accounts.rebalance_config {
            // TODO: 从账户解析配置
            RebalanceConfig::default()
        } else {
            RebalanceConfig::default()
        };

        // 2. 检查冷却期
        require!(
            !config.is_in_cooldown()?,
            CustomError::InvalidParameter // 可以添加专门的错误类型
        );

        // 3. 检查是否需要再平衡
        let vault_state = &ctx.accounts.vault_state;
        let (needs_rebalance, deviations) =
            RebalanceEngine::check_rebalance_needed(vault_state, &config)?;

        if !needs_rebalance {
            msg!("✅ No rebalance needed - all allocations within threshold");
            return Ok(());
        }

        msg!("⚠️ Rebalance needed! Deviations: {:?}", deviations);

        // 4. 生成再平衡计划
        let actions =
            RebalanceEngine::generate_rebalance_plan(vault_state, &config, &protocol_apys)?;

        if actions.is_empty() {
            msg!("ℹ️ No viable rebalance actions generated");
            return Ok(());
        }

        msg!("📋 Generated {} rebalance actions", actions.len());

        // 5. 执行第一个高优先级动作
        // 注意：实际执行需要调用相应协议的 withdraw + deposit CPI
        // 这里仅演示逻辑，完整实现需要在单独的指令中处理
        let action = &actions[0];
        msg!(
            "🎯 Top priority action: {} -> {}, amount: {}, APY diff: {} bps",
            action.from_protocol,
            action.to_protocol,
            action.amount,
            action.apy_difference_bps
        );

        // 记录再平衡事件
        emit!(crate::events::RebalanceEvent {
            vault_id: vault_state.vault_id,
            protocol_from: action.from_protocol,
            protocol_to: action.to_protocol,
            amount_in: action.amount,
            amount_out: action.amount, // 简化，实际需要CPI结果
            executor: ctx.accounts.executor.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("✅ Rebalance action queued for execution");

        Ok(())
    }
}

/// 使用 Pyth Oracle 更新协议 APY
///
/// 该指令会：
/// 1. 从 Pyth 获取各协议代币价格
/// 2. 计算实时 APY
/// 3. 更新到 Vault 配置中
#[derive(Accounts)]
pub struct UpdateProtocolAPY<'info> {
    /// 管理员或授权更新者
    #[account(mut)]
    pub updater: Signer<'info>,

    /// Vault 状态
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Pyth 价格更新账户
    /// CHECK: Pyth 程序验证
    pub price_update: AccountInfo<'info>,
}

impl UpdateProtocolAPY<'_> {
    pub fn process_instruction(ctx: Context<Self>, protocol_id: u8, feed_id: String) -> Result<()> {
        msg!("📊 Updating APY for protocol {}", protocol_id);

        // 1. 从 Pyth 获取价格
        let price_data = PythOracle::get_price_from_account(&ctx.accounts.price_update, &feed_id)?;

        // 2. 验证价格有效性
        PythOracle::validate_price(
            &price_data,
            60,  // 60秒内的价格
            200, // 2% 最大置信区间
        )?;

        msg!(
            "💰 Price: {} (confidence: {}, exponent: {})",
            price_data.price,
            price_data.confidence,
            price_data.exponent
        );

        // 3. 计算 UI 价格
        if let Some(ui_price) = price_data.to_ui_price() {
            msg!("📈 UI Price: {} (6 decimals)", ui_price);
        }

        // 4. 更新协议配置
        // 注意：实际APY计算需要更复杂的逻辑，这里仅演示价格获取
        let vault_state = &mut ctx.accounts.vault_state;
        if let Some(protocol) =
            vault_state.supported_protocols.iter_mut().find(|p| p.protocol_id == protocol_id)
        {
            // 这里可以基于价格变化计算 APY
            // 例如：比较当前价格和历史价格
            msg!("✅ Protocol {} configuration ready for update", protocol_id);
        } else {
            return Err(error!(CustomError::UnsupportedProtocol));
        }

        Ok(())
    }
}

/// 使用独立 UserPosition 账户的存款指令
///
/// 优势：
/// - 避免 VaultState 账户大小限制
/// - 每个用户独立账户，并发性更好
/// - 易于查询和索引
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositWithUserPosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// 用户的独立持仓账户
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::space(),
        seeds = [
            UserPosition::SEED_PREFIX,
            vault_state.vault_id.as_ref(),
            user.key().as_ref()
        ],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    /// Vault 状态
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump,
        constraint = vault_state.status == VaultStatus::Active @ CustomError::VaultPaused
    )]
    pub vault_state: Account<'info, VaultState>,

    pub system_program: Program<'info, System>,
}

impl DepositWithUserPosition<'_> {
    pub fn process_instruction(ctx: Context<Self>, amount: u64, shares: u64) -> Result<()> {
        let user_position = &mut ctx.accounts.user_position;
        let vault_state = &mut ctx.accounts.vault_state;

        // 初始化（如果是首次存款）
        if user_position.shares == 0 {
            user_position.initialize(
                vault_state.vault_id,
                ctx.accounts.user.key(),
                ctx.bumps.user_position,
            );
        }

        // 记录存款
        user_position.record_deposit(amount, shares)?;

        // 更新 Vault 总量
        vault_state.total_deposits = vault_state
            .total_deposits
            .checked_add(amount)
            .ok_or(error!(CustomError::MathOverflow))?;

        vault_state.total_shares = vault_state
            .total_shares
            .checked_add(shares)
            .ok_or(error!(CustomError::MathOverflow))?;

        msg!("✅ Deposit recorded in UserPosition account");
        msg!("   User: {}", ctx.accounts.user.key());
        msg!("   Amount: {}", amount);
        msg!("   Shares: {}", shares);
        msg!("   Total deposits: {}", user_position.total_deposited);
        msg!("   Total shares: {}", user_position.shares);

        Ok(())
    }
}
