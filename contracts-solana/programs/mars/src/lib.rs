#![allow(deprecated)]
// 编译优化标志
#![cfg_attr(not(feature = "anchor-debug"), allow(unused_variables))]
#![cfg_attr(not(feature = "anchor-debug"), allow(dead_code))]

use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod events;
pub mod instructions;
pub mod kamino_constants;
pub mod state;
pub mod util;
use constant::*;
use error::MarsError;
use events::*;
use instructions::*;
use state::*;
use util::*;

use anchor_lang::prelude::*;

// V19 deployment - Added FarmRewardsClaimedEvent for Substreams indexing
// Emits event when users claim farming rewards
// Enables tracking of all reward claims in PostgreSQL via Neon
declare_id!("83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N");

#[program]
pub mod mars {
    use super::*;

    // === 原有管理指令 ===
    
    //  called by contract deployer only 1 time to initialize global values
    //  send SOL to global_account, vault, ata_vault to initialize accounts
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Initialize::process_instruction(ctx)
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
    
    /// 用户存款到金库
    pub fn vault_deposit(ctx: Context<VaultDeposit>, amount: u64) -> Result<()> {
        VaultDeposit::process_instruction(ctx, amount)
    }
    
    /// 用户从金库提款
    pub fn vault_withdraw(ctx: Context<VaultWithdraw>, shares_amount: u64) -> Result<()> {
        VaultWithdraw::process_instruction(ctx, shares_amount)
    }
    
    /// 兑换并存入：处理兑换后再投入
    pub fn swap_and_deposit(
        ctx: Context<SwapAndDeposit>,
        protocol_id: u8,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
        minimum_out_amount: u64,
        swap_data: Vec<u8>,
    ) -> Result<()> {
        SwapAndDeposit::process_instruction(
            ctx,
            protocol_id,
            from_token,
            to_token,
            amount,
            minimum_out_amount,
            swap_data,
        )
    }
    
    /// 预估兑换成本（仅平台内部使用，不对用户展示）
    pub fn estimate_swap_cost(
        ctx: Context<EstimateSwapCost>,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let estimate = EstimateSwapCost::process_instruction(ctx, from_token, to_token, amount)?;
        
        // 发出事件供前端使用
        emit!(SwapCostEstimated {
            from_token,
            to_token,
            input_amount: amount,
            estimated_output: estimate.output_amount,
            price_impact_bps: estimate.price_impact_bps,
            total_fees: estimate.fees.total_fee,
        });
        
        Ok(())
    }
    
    /// 从一个协议赎回并转换再投另一协议
    pub fn rebalance_with_swap(
        ctx: Context<RebalanceWithSwap>,
        protocol_from: u8,
        protocol_to: u8,
        amount: u64,
        swap_data: Vec<u8>,
    ) -> Result<()> {
        RebalanceWithSwap::process_instruction(ctx, protocol_from, protocol_to, amount, swap_data)
    }
    
    /// 赎回用户份额并完成兑换返回给用户
    pub fn withdraw_with_swap(
        ctx: Context<WithdrawWithSwap>,
        amount: u64,
        target_token: Pubkey,
        minimum_out_amount: u64,
        swap_data: Vec<u8>,
    ) -> Result<()> {
        WithdrawWithSwap::process_instruction(ctx, amount, target_token, minimum_out_amount, swap_data)
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

    // 已移除 add_orchestrator 指令以优化合约大小

    //  Admin can set target chain min fee
    pub fn set_fee_tiers(
        ctx: Context<SetFeeTiers>,
        threshold_amounts: Vec<u64>,
        bps_fees: Vec<u64>,
    ) -> Result<()> {
        SetFeeTiers::process_instruction(ctx, threshold_amounts.as_ref(), bps_fees.as_ref())
    }

    //  Admin can set target chain min fee
    pub fn set_target_chain_min_fee(
        ctx: Context<SetTargetChainMinFee>,
        dest_chain_id: u32,
        min_fee: u64,
    ) -> Result<()> {
        SetTargetChainMinFee::process_instruction(ctx, dest_chain_id, min_fee)
    }

    // 已移除 remove_orchestrator 指令以优化合约大小

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

    //  orchestrator can remove bridge liquidity
    pub fn remove_bridge_liquidity(ctx: Context<RemoveBridgeLiquidity>, amount: u64) -> Result<()> {
        RemoveBridgeLiquidity::process_instruction(ctx, amount)
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
    pub fn kamino_stake_in_farm(
        ctx: Context<KaminoStakeInFarm>,
        shares_amount: u64,
    ) -> Result<()> {
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
    pub fn kamino_unstake_from_farm(
        ctx: Context<KaminoUnstakeFromFarm>,
    ) -> Result<()> {
        handler_kamino_unstake_from_farm(ctx)
    }

    // Kamino存款并自动质押: 一步完成存款+质押，像官方一样
    pub fn kamino_deposit_and_stake<'info>(
        ctx: Context<'_, '_, '_, 'info, KaminoDepositAndStake<'info>>,
        max_amount: u64,
    ) -> Result<()> {
        handler_kamino_deposit_and_stake(ctx, max_amount)
    }


}
