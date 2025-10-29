use crate::error::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct VaultDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// 用户的代币账户（存入的代币）
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ CustomError::InvalidOwner,
        constraint = user_token_account.amount >= amount @ CustomError::InsufficientFunds
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// 用户的份额代币账户
    #[account(mut)]
    pub user_shares_account: Account<'info, TokenAccount>,

    /// Mars Vault 状态账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,

    /// Mars Vault 的代币金库
    #[account(
        mut,
        seeds = [b"vault-treasury", vault_state.vault_id.as_ref()],
        bump
    )]
    pub vault_treasury: Account<'info, TokenAccount>,

    /// Kamino Vault 状态账户（CPI 目标）
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_vault_state: AccountInfo<'info>,

    /// Kamino 代币金库
    /// CHECK: 由 Kamino 程序验证
    #[account(mut)]
    pub kamino_token_vault: AccountInfo<'info>,

    /// Kamino 份额 Mint
    /// CHECK: 由 Kamino 程序验证
    pub kamino_shares_mint: AccountInfo<'info>,

    /// Kamino 程序
    /// CHECK: 硬编码程序 ID
    #[account(constraint = kamino_program.key() == crate::constants::protocols::kamino::PROGRAM_ID)]
    pub kamino_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl VaultDeposit<'_> {
    pub fn process_instruction(ctx: Context<Self>, amount: u64) -> Result<()> {
        // 验证输入
        require!(amount > 0, CustomError::ZeroAmount);
        require!(ctx.accounts.vault_state.status == VaultStatus::Active, CustomError::VaultPaused);

        // 1. 计算存款费用
        let vault_state = &ctx.accounts.vault_state;
        let deposit_fee_bps = vault_state.fee_config.deposit_fee_bps;
        let deposit_fee = (amount as u128)
            .checked_mul(deposit_fee_bps as u128)
            .and_then(|v| v.checked_div(10_000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(CustomError::MathOverflow)?;

        let net_deposit_amount =
            amount.checked_sub(deposit_fee).ok_or(CustomError::MathOverflow)?;

        msg!(
            "💰 Deposit: total={}, fee={} ({} bps), net={}",
            amount,
            deposit_fee,
            deposit_fee_bps,
            net_deposit_amount
        );

        // 2. 将用户代币转入 Mars Vault Treasury
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // 3. 提取需要的数据避免借用冲突
        let vault_id = ctx.accounts.vault_state.vault_id;
        let bump = ctx.accounts.vault_state.bump;

        // 4. 通过 CPI 调用 Kamino 存款（使用净金额）
        let kamino_deposit_result =
            Self::kamino_deposit_cpi(&ctx, net_deposit_amount, vault_id, bump)?;

        // 5. 更新 Mars Vault 状态和费用
        let vault_state = &mut ctx.accounts.vault_state;
        vault_state.total_deposits += net_deposit_amount;
        vault_state.total_shares += kamino_deposit_result.shares_received;

        // 记录费用
        vault_state.unclaimed_deposit_fee = vault_state
            .unclaimed_deposit_fee
            .checked_add(deposit_fee)
            .ok_or(CustomError::MathOverflow)?;
        vault_state.total_deposit_fee_collected = vault_state
            .total_deposit_fee_collected
            .checked_add(deposit_fee)
            .ok_or(CustomError::MathOverflow)?;

        // 6. 记录用户存款（净金额）
        vault_state.insert_user_deposit(
            ctx.accounts.user.key(),
            UserDeposit {
                amount: net_deposit_amount,
                shares: kamino_deposit_result.shares_received,
                timestamp: Clock::get()?.unix_timestamp,
                last_action_time: Clock::get()?.unix_timestamp,
                total_rewards: 0,
            },
        );

        msg!(
            "✅ Vault deposit successful: amount={}, fee={}, net={}, shares={}",
            amount,
            deposit_fee,
            net_deposit_amount,
            kamino_deposit_result.shares_received
        );

        Ok(())
    }

    fn kamino_deposit_cpi(
        ctx: &Context<Self>,
        amount: u64,
        vault_id: [u8; 32],
        bump: u8,
    ) -> Result<KaminoDepositResult> {
        // Kamino CPI 调用逻辑
        let seeds = &[b"vault-state", vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        // 构建 Kamino deposit instruction
        let kamino_accounts = vec![
            ctx.accounts.vault_treasury.to_account_info(),
            ctx.accounts.user_shares_account.to_account_info(),
            ctx.accounts.kamino_vault_state.to_account_info(),
            ctx.accounts.kamino_token_vault.to_account_info(),
            ctx.accounts.kamino_shares_mint.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ];

        // 这里需要根据 Kamino 的实际 IDL 构建指令
        // 暂时返回模拟结果
        Ok(KaminoDepositResult {
            shares_received: amount, // 1:1 比例，实际需要根据 Kamino 返回
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct KaminoDepositResult {
    pub shares_received: u64,
}
