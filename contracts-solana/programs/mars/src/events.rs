use anchor_lang::prelude::*;

/// 兑换成本估算事件
#[event]
pub struct SwapCostEstimated {
    pub from_token: Pubkey,
    pub to_token: Pubkey,
    pub input_amount: u64,
    pub estimated_output: u64,
    pub price_impact_bps: u16,
    pub total_fees: u64,
}

/// 用户存款事件
#[event]
pub struct VaultDepositEvent {
    pub user: Pubkey,
    pub vault_id: [u8; 32],
    pub amount: u64,
    pub shares_received: u64,
    pub protocol_id: u8,
    pub timestamp: i64,
}

/// 用户提款事件
#[event]
pub struct VaultWithdrawEvent {
    pub user: Pubkey,
    pub vault_id: [u8; 32],
    pub shares_burned: u64,
    pub amount_received: u64,
    pub protocol_id: u8,
    pub timestamp: i64,
}

/// 再平衡事件
#[event]
pub struct RebalanceEvent {
    pub vault_id: [u8; 32],
    pub protocol_from: u8,
    pub protocol_to: u8,
    pub amount_in: u64,
    pub amount_out: u64,
    pub executor: Pubkey,
    pub timestamp: i64,
}

/// 兑换事件
#[event]
pub struct SwapEvent {
    pub vault_id: [u8; 32],
    pub from_token: Pubkey,
    pub to_token: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub price_impact_bps: u16,
    pub timestamp: i64,
}

/// 金库状态更新事件
#[event]
pub struct VaultStateUpdated {
    pub vault_id: [u8; 32],
    pub total_deposits: u64,
    pub total_shares: u64,
    pub apy: u64, // 年化收益率（基点）
    pub timestamp: i64,
}

/// 协议配置更新事件
#[event]
pub struct ProtocolConfigUpdated {
    pub vault_id: [u8; 32],
    pub protocol_id: u8,
    pub enabled: bool,
    pub allocation_weight_bps: u16,
    pub target_allocation_bps: u16,
    pub timestamp: i64,
}

/// 费用配置更新事件
#[event]
pub struct FeeConfigUpdated {
    pub vault_id: [u8; 32],
    pub deposit_fee_bps: u16,
    pub withdraw_fee_bps: u16,
    pub management_fee_bps: u16,
    pub performance_fee_bps: u16,
    pub timestamp: i64,
}

/// 紧急状态事件
#[event]
pub struct EmergencyEvent {
    pub vault_id: [u8; 32],
    pub event_type: EmergencyEventType,
    pub reason: String,
    pub executor: Pubkey,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum EmergencyEventType {
    Pause,
    Resume,
    EmergencyWithdraw,
    ForceRebalance,
}

/// Farm 奖励领取事件
#[event]
pub struct FarmRewardsClaimedEvent {
    pub user: Pubkey,
    pub vault_mint: Pubkey,
    pub farm_state: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_amount: u64,
    pub total_rewards_claimed: u64, // vault lifetime total
    pub timestamp: i64,
}