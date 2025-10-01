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

declare_id!("6668zv314yKTUWEo3EygNaeEkQRPbczvaMiubksH67V");

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

    // orchestrator can claim fee
    pub fn claim_fees(ctx: Context<ClaimFees>, amount: u64, fee_type: FeeType) -> Result<()> {
        ClaimFees::process_instruction(ctx, amount, fee_type)
    }

    // 已移除 create_order 指令以优化合约大小

    // 已移除 fill_order 指令以优化合约大小

    // 已移除 fill_order_token_transfer 指令以优化合约大小

    // 已移除 revert_order 指令以优化合约大小

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

    // Kamino CPI调用: 存款到Kamino Vault
    pub fn kamino_deposit(
        ctx: Context<KaminoDepositCPI>,
        amount: u64,
    ) -> Result<()> {
        kamino_deposit_cpi(ctx, amount)
    }

    // Kamino CPI调用: 从Kamino Vault提取
    pub fn kamino_withdraw(
        ctx: Context<KaminoWithdrawCPI>,
        shares_amount: u64,
    ) -> Result<()> {
        kamino_withdraw_cpi(ctx, shares_amount)
    }

    // Kamino CPI调用: 使用PDA权限存款
    pub fn kamino_deposit_with_pda(
        ctx: Context<KaminoDepositCPIWithPDA>,
        amount: u64,
    ) -> Result<()> {
        kamino_deposit_cpi_with_pda(ctx, amount)
    }
}
