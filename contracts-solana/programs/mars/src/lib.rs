#![allow(deprecated)]
// 编译优化标志
#![cfg_attr(not(feature = "anchor-debug"), allow(unused_variables))]
#![cfg_attr(not(feature = "anchor-debug"), allow(dead_code))]

use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod util;

use constants::*;
use error::MarsError;
use instructions::*;
use state::*;
use util::*;

declare_id!("G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy");

#[program]
pub mod mars {
    use super::*;

    // === 原有管理指令 ===

    //  called by contract deployer only 1 time to initialize global values
    //  send SOL to global_account, vault, ata_vault to initialize accounts
    pub fn initialize(ctx: Context<Initialize>, platform_fee_wallet: Option<Pubkey>) -> Result<()> {
        Initialize::process_instruction(ctx, platform_fee_wallet)
    }

    //  Admin can hand over admin role
    pub fn nominate_authority(ctx: Context<NominateAuthority>, new_admin: Pubkey) -> Result<()> {
        NominateAuthority::process_instruction(ctx, new_admin)
    }

    //  Pending admin should accept the admin role
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        AcceptAuthority::process_instruction(ctx)
    }

    // === 新增 Vault 核心功能 ===

    /// 初始化新的金库
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: [u8; 32],
        platform_fee_bps: u16,
    ) -> Result<()> {
        InitializeVault::process_instruction(ctx, vault_id, platform_fee_bps)
    }

    /// 用户存款到金库
    pub fn vault_deposit(ctx: Context<VaultDeposit>, amount: u64) -> Result<()> {
        VaultDeposit::process_instruction(ctx, amount)
    }

    /// 用户从金库提款
    pub fn vault_withdraw(ctx: Context<VaultWithdraw>, shares_amount: u64) -> Result<()> {
        VaultWithdraw::process_instruction(ctx, shares_amount)
    }

    //  Admin can add new freeze authority
    pub fn add_freeze_authority(
        ctx: Context<AddGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        AddGlobalStateAuthority::process_instruction(ctx, authority_address, true)
    }

    //  Admin can remove a freeze authority
    pub fn remove_freeze_authority(
        ctx: Context<RemoveGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        RemoveGlobalStateAuthority::process_instruction(ctx, authority_address, true)
    }

    //  Admin can add new thaw authority
    pub fn add_thaw_authority(
        ctx: Context<AddGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        AddGlobalStateAuthority::process_instruction(ctx, authority_address, false)
    }

    //  Admin can remove a freeze authority
    pub fn remove_thaw_authority(
        ctx: Context<RemoveGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        RemoveGlobalStateAuthority::process_instruction(ctx, authority_address, false)
    }

    // Freeze authority can freeze global state
    pub fn freeze_global_state(ctx: Context<FreezeThawGlobalState>) -> Result<()> {
        FreezeThawGlobalState::freeze_global_state(ctx)
    }

    // Thaw authority can thaw global state
    pub fn thaw_global_state(ctx: Context<FreezeThawGlobalState>) -> Result<()> {
        FreezeThawGlobalState::thaw_global_state(ctx)
    }

    //  Admin can set target chain min fee
    pub fn set_fee_tiers(
        ctx: Context<SetFeeTiers>,
        threshold_amounts: Vec<u64>,
        bps_fees: Vec<u64>,
    ) -> Result<()> {
        SetFeeTiers::process_instruction(ctx, threshold_amounts.as_ref(), bps_fees.as_ref())
    }

    //  admin can update threshold amount
    pub fn update_global_state_params(
        ctx: Context<UpdateGlobalStateParams>,
        rebalance_threshold: Option<u16>,
        cross_chain_fee_bps: Option<u16>,
        max_order_amount: Option<u64>,
    ) -> Result<()> {
        UpdateGlobalStateParams::process_instruction(
            ctx,
            rebalance_threshold,
            cross_chain_fee_bps,
            max_order_amount,
        )
    }

    /// 管理员提取 Vault 累积的费用（按类型）
    pub fn claim_fees(ctx: Context<ClaimFees>, amount: u64, fee_type: FeeType) -> Result<()> {
        ClaimFees::process_instruction(ctx, amount, fee_type)
    }

    /// 管理员提取 Vault 所有累积的费用
    pub fn claim_all_fees(ctx: Context<ClaimFees>) -> Result<()> {
        ClaimFees::claim_all_fees(ctx)
    }

    /// 用户领取 Farm 奖励
    /// reward_index: 0 或 1，表示要领取第几个奖励
    pub fn claim_farm_rewards(ctx: Context<ClaimFarmRewards>, reward_index: u64) -> Result<()> {
        ClaimFarmRewards::process_instruction(ctx, reward_index)
    }

    /// 管理员更新 Vault 的平台费率配置
    /// new_platform_fee_bps: 新的平台费率（basis points，如 2500 = 25%）
    pub fn update_vault_platform_fee(
        ctx: Context<UpdateVaultPlatformFee>,
        new_platform_fee_bps: u16,
    ) -> Result<()> {
        UpdateVaultPlatformFee::process_instruction(ctx, new_platform_fee_bps)
    }

    /// 管理员更新平台费用钱包地址
    /// new_platform_fee_wallet: 新的平台费用接收钱包地址
    pub fn update_platform_fee_wallet(
        ctx: Context<UpdatePlatformFeeWallet>,
        new_platform_fee_wallet: Pubkey,
    ) -> Result<()> {
        UpdatePlatformFeeWallet::process_instruction(ctx, new_platform_fee_wallet)
    }

    // set protocol fee fraction
    pub fn set_protocol_fee_fraction(
        ctx: Context<SetProtocolFeeFraction>,
        protocol_fee_numerator: u64,
        protocol_fee_denominator: u64,
    ) -> Result<()> {
        SetProtocolFeeFraction::process_instruction(
            ctx,
            protocol_fee_numerator,
            protocol_fee_denominator,
        )
    }

    //  Admin can set insurance fee tiers
    pub fn set_insurance_fee_tiers(
        ctx: Context<SetInsuranceFeeTiers>,
        threshold_amounts: Vec<u64>,
        insurance_fees: Vec<u64>,
    ) -> Result<()> {
        SetInsuranceFeeTiers::process_instruction(
            ctx,
            threshold_amounts.as_ref(),
            insurance_fees.as_ref(),
        )
    }

    // Kamino CPI调用: 存款到Kamino Vault（完整实现，匹配Kamino IDL）
    pub fn kamino_deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, KaminoDepositCPI<'info>>,
        max_amount: u64,
    ) -> Result<()> {
        kamino_deposit_cpi(ctx, max_amount)
    }

    // Kamino CPI调用: 从Kamino Vault提取（完整实现，匹配Kamino IDL）
    pub fn kamino_withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, KaminoWithdrawCPI<'info>>,
        max_amount: u64,
    ) -> Result<()> {
        kamino_withdraw_cpi(ctx, max_amount)
    }

    // Kamino Farm质押: 将vault shares质押到farm赚取奖励
    pub fn kamino_stake_in_farm(ctx: Context<KaminoStakeInFarm>, shares_amount: u64) -> Result<()> {
        handler_kamino_stake_in_farm(ctx, shares_amount)
    }

    // Kamino Farm发起取消质押: 第一步，发起unstake请求
    pub fn kamino_start_unstake_from_farm(
        ctx: Context<KaminoStartUnstakeFromFarm>,
        shares_amount: u64,
        current_slot: u64,
    ) -> Result<()> {
        handler_kamino_start_unstake_from_farm(ctx, shares_amount, current_slot)
    }

    // Kamino Farm取消质押: 第二步，从farm取回已unstake的shares到钱包
    pub fn kamino_unstake_from_farm(ctx: Context<KaminoUnstakeFromFarm>) -> Result<()> {
        handler_kamino_unstake_from_farm(ctx)
    }

    // Kamino存款并自动质押: 一步完成存款+质押，像官方一样
    pub fn kamino_deposit_and_stake<'info>(
        ctx: Context<'_, '_, '_, 'info, KaminoDepositAndStake<'info>>,
        max_amount: u64,
    ) -> Result<()> {
        handler_kamino_deposit_and_stake(ctx, max_amount)
    }

    // === Jupiter Lend CPI 指令 ===

    /// Jupiter Lend CPI 调用: 存款到 Jupiter Lend Earn
    /// 
    /// 参数:
    /// - amount: 存款金额（基础单位，如 1 USDC = 1_000_000）
    /// 
    /// 账户需要通过 @jup-ag/lend SDK 的 getDepositContext() 方法获取
    pub fn jupiter_lend_deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, JupiterLendDepositCPI<'info>>,
        amount: u64,
    ) -> Result<()> {
        jupiter_lend_deposit_cpi(ctx, amount)
    }

    /// Jupiter Lend CPI 调用: 从 Jupiter Lend Earn 取款
    ///
    /// 参数:
    /// - amount: 取款金额（基础单位，如 1 USDC = 1_000_000）
    ///
    /// 账户需要通过 @jup-ag/lend SDK 的 getWithdrawContext() 方法获取
    pub fn jupiter_lend_withdraw<'info>(
        ctx: Context<'_, '_, '_, 'info, JupiterLendWithdrawCPI<'info>>,
        amount: u64,
    ) -> Result<()> {
        jupiter_lend_withdraw_cpi(ctx, amount)
    }
}
