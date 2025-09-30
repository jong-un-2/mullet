pub mod initialize;
pub use initialize::*;
pub mod nominate_authority;
pub use nominate_authority::*;
pub mod accept_authority;
pub use accept_authority::*;
// 已移除 orchestrator 系列指令以优化合约大小
pub mod update_global_state_params;
pub use update_global_state_params::*;
pub mod remove_bridge_liquidity;
pub use remove_bridge_liquidity::*;
// 已移除订单系统指令以优化合约大小
pub mod claim_fees;
pub use claim_fees::*;
pub mod add_global_state_authority;
pub use add_global_state_authority::*;
pub mod remove_global_state_authority;
pub use remove_global_state_authority::*;
pub mod freeze_thaw_global_state;
pub use freeze_thaw_global_state::*;
pub mod set_target_chain_min_fee;
pub use set_target_chain_min_fee::*;
// 已移除 revert_order 指令

// === 新增 Vault 指令模块 ===
pub mod vault_deposit;
pub use vault_deposit::*;
pub mod vault_withdraw;
pub use vault_withdraw::*;
pub mod swap_and_deposit;
pub use swap_and_deposit::*;
pub mod estimate_swap_cost;
pub use estimate_swap_cost::*;
pub mod rebalance_with_swap;
pub use rebalance_with_swap::*;
pub mod withdraw_with_swap;
pub use withdraw_with_swap::*;
// 已移除 fill_order_token_transfer 指令
pub mod set_fee_tiers;
pub use set_fee_tiers::*;
pub mod set_protocol_fee_fraction;
pub use set_protocol_fee_fraction::*;
pub mod set_insurance_fee_tiers;
pub use set_insurance_fee_tiers::*;
pub mod kamino_cpi;
pub use kamino_cpi::*;
