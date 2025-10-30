use crate::state::VaultState;
use anchor_lang::prelude::*;

/// 再平衡策略引擎
///
/// 功能：
/// - 监控各协议的资产分配比例
/// - 计算是否需要再平衡
/// - 生成再平衡执行计划
/// - 执行跨协议资产转移

/// 再平衡阈值配置
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RebalanceConfig {
    /// 触发再平衡的偏差阈值（基点）
    /// 例如：500 = 5% 的偏差将触发再平衡
    pub deviation_threshold_bps: u16,

    /// 最小再平衡金额（避免频繁小额操作）
    pub min_rebalance_amount: u64,

    /// 最大单次再平衡金额（风险控制）
    pub max_rebalance_amount: u64,

    /// 再平衡冷却时间（秒）
    pub cooldown_seconds: i64,

    /// 最后一次再平衡时间
    pub last_rebalance_time: i64,
}

impl RebalanceConfig {
    pub const DEFAULT_DEVIATION_THRESHOLD_BPS: u16 = 500; // 5%
    pub const DEFAULT_MIN_AMOUNT: u64 = 10_000_000; // $10 (6位小数)
    pub const DEFAULT_MAX_AMOUNT: u64 = 1_000_000_000_000; // $1M
    pub const DEFAULT_COOLDOWN_SECONDS: i64 = 3600; // 1小时

    pub fn default() -> Self {
        Self {
            deviation_threshold_bps: Self::DEFAULT_DEVIATION_THRESHOLD_BPS,
            min_rebalance_amount: Self::DEFAULT_MIN_AMOUNT,
            max_rebalance_amount: Self::DEFAULT_MAX_AMOUNT,
            cooldown_seconds: Self::DEFAULT_COOLDOWN_SECONDS,
            last_rebalance_time: 0,
        }
    }

    /// 检查是否在冷却期
    pub fn is_in_cooldown(&self) -> Result<bool> {
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last = current_time.saturating_sub(self.last_rebalance_time);
        Ok(time_since_last < self.cooldown_seconds)
    }
}

/// 再平衡动作
#[derive(Debug, Clone)]
pub struct RebalanceAction {
    /// 源协议ID
    pub from_protocol: u8,

    /// 目标协议ID
    pub to_protocol: u8,

    /// 转移金额
    pub amount: u64,

    /// 预期收益率差异（基点）
    pub apy_difference_bps: i64,

    /// 优先级（数字越大优先级越高）
    pub priority: u8,
}

/// 再平衡引擎
pub struct RebalanceEngine;

impl RebalanceEngine {
    /// 检查是否需要再平衡
    ///
    /// 返回：(是否需要, 偏差值基点, 需要调整的协议列表)
    pub fn check_rebalance_needed(
        vault_state: &VaultState,
        config: &RebalanceConfig,
    ) -> Result<(bool, Vec<(u8, i64)>)> {
        let protocols = &vault_state.supported_protocols;

        if protocols.is_empty() {
            return Ok((false, Vec::new()));
        }

        let total_value = vault_state.total_deposits;
        if total_value == 0 {
            return Ok((false, Vec::new()));
        }

        let mut deviations = Vec::new();
        let mut needs_rebalance = false;

        for protocol in protocols {
            if !protocol.enabled {
                continue;
            }

            // 计算实际分配比例
            let actual_allocation_bps = ((protocol.current_allocation as u128)
                .checked_mul(10_000)
                .and_then(|v| v.checked_div(total_value as u128))
                .and_then(|v| u64::try_from(v).ok())
                .unwrap_or(0)) as i64;

            // 计算与目标的偏差
            let target_bps = protocol.target_allocation_bps as i64;
            let deviation = actual_allocation_bps - target_bps;

            deviations.push((protocol.protocol_id, deviation));

            // 检查偏差是否超过阈值
            if deviation.abs() > config.deviation_threshold_bps as i64 {
                needs_rebalance = true;
            }
        }

        Ok((needs_rebalance, deviations))
    }

    /// 生成再平衡计划
    ///
    /// 算法：
    /// 1. 识别过度分配的协议（需要减少）
    /// 2. 识别分配不足的协议（需要增加）
    /// 3. 按APY排序，优先从低APY转向高APY
    /// 4. 考虑gas成本和滑点
    pub fn generate_rebalance_plan(
        vault_state: &VaultState,
        config: &RebalanceConfig,
        protocol_apys: &[(u8, u64)], // (protocol_id, apy_bps)
    ) -> Result<Vec<RebalanceAction>> {
        let (needs_rebalance, deviations) = Self::check_rebalance_needed(vault_state, config)?;

        if !needs_rebalance {
            return Ok(Vec::new());
        }

        let total_value = vault_state.total_deposits;
        let mut actions = Vec::new();

        // 分离过度分配和分配不足的协议
        let mut over_allocated: Vec<(u8, u64)> = Vec::new(); // (protocol_id, excess_amount)
        let mut under_allocated: Vec<(u8, u64)> = Vec::new(); // (protocol_id, needed_amount)

        for (protocol_id, deviation_bps) in deviations {
            if deviation_bps.abs() < config.deviation_threshold_bps as i64 {
                continue;
            }

            // 计算需要调整的金额
            let amount = ((deviation_bps.abs() as u128)
                .checked_mul(total_value as u128)
                .and_then(|v| v.checked_div(10_000))
                .and_then(|v| u64::try_from(v).ok())
                .unwrap_or(0))
            .min(config.max_rebalance_amount);

            if amount < config.min_rebalance_amount {
                continue;
            }

            if deviation_bps > 0 {
                // 过度分配
                over_allocated.push((protocol_id, amount));
            } else {
                // 分配不足
                under_allocated.push((protocol_id, amount));
            }
        }

        // 按APY排序
        // 优先从低APY的协议转出，转入高APY的协议
        over_allocated.sort_by(|a, b| {
            let apy_a = protocol_apys.iter().find(|x| x.0 == a.0).map(|x| x.1).unwrap_or(0);
            let apy_b = protocol_apys.iter().find(|x| x.0 == b.0).map(|x| x.1).unwrap_or(0);
            apy_a.cmp(&apy_b) // 低APY在前
        });

        under_allocated.sort_by(|a, b| {
            let apy_a = protocol_apys.iter().find(|x| x.0 == a.0).map(|x| x.1).unwrap_or(0);
            let apy_b = protocol_apys.iter().find(|x| x.0 == b.0).map(|x| x.1).unwrap_or(0);
            apy_b.cmp(&apy_a) // 高APY在前
        });

        // 生成转移动作
        for (from_protocol, excess_amount) in over_allocated.iter() {
            for (to_protocol, needed_amount) in under_allocated.iter_mut() {
                if *needed_amount == 0 {
                    continue;
                }

                let transfer_amount = (*excess_amount).min(*needed_amount);

                // 计算APY差异
                let from_apy = protocol_apys
                    .iter()
                    .find(|x| x.0 == *from_protocol)
                    .map(|x| x.1 as i64)
                    .unwrap_or(0);
                let to_apy = protocol_apys
                    .iter()
                    .find(|x| x.0 == *to_protocol)
                    .map(|x| x.1 as i64)
                    .unwrap_or(0);
                let apy_diff = to_apy - from_apy;

                // 计算优先级（APY差异越大，优先级越高）
                let priority = (apy_diff.max(0) / 100).min(255) as u8;

                actions.push(RebalanceAction {
                    from_protocol: *from_protocol,
                    to_protocol: *to_protocol,
                    amount: transfer_amount,
                    apy_difference_bps: apy_diff,
                    priority,
                });

                *needed_amount = needed_amount.saturating_sub(transfer_amount);

                if *needed_amount == 0 {
                    break;
                }
            }
        }

        // 按优先级排序（高优先级在前）
        actions.sort_by(|a, b| b.priority.cmp(&a.priority));

        Ok(actions)
    }

    /// 执行单个再平衡动作
    ///
    /// 步骤：
    /// 1. 从源协议提取资产
    /// 2. （可选）通过Jupiter兑换代币
    /// 3. 存入目标协议
    /// 4. 更新VaultState
    pub fn execute_rebalance_action(
        vault_state: &mut VaultState,
        action: &RebalanceAction,
        actual_amount_out: u64, // 实际收到的金额（扣除滑点和费用）
    ) -> Result<()> {
        // 更新源协议分配
        if let Some(from_protocol) = vault_state
            .supported_protocols
            .iter_mut()
            .find(|p| p.protocol_id == action.from_protocol)
        {
            from_protocol.current_allocation = from_protocol
                .current_allocation
                .checked_sub(action.amount)
                .ok_or(error!(crate::error::CustomError::MathOverflow))?;
        }

        // 更新目标协议分配
        if let Some(to_protocol) =
            vault_state.supported_protocols.iter_mut().find(|p| p.protocol_id == action.to_protocol)
        {
            to_protocol.current_allocation = to_protocol
                .current_allocation
                .checked_add(actual_amount_out)
                .ok_or(error!(crate::error::CustomError::MathOverflow))?;
        }

        // 记录再平衡历史
        vault_state.update_rebalance_record(
            action.from_protocol,
            action.to_protocol,
            action.amount,
            actual_amount_out,
            actual_amount_out, // shares_received (简化处理)
        )?;

        msg!(
            "✅ Rebalance executed: {} -> {}, amount: {}, received: {}",
            action.from_protocol,
            action.to_protocol,
            action.amount,
            actual_amount_out
        );

        Ok(())
    }

    /// 计算最优协议分配
    ///
    /// 基于风险调整后的收益率（Sharpe Ratio）
    /// 公式：allocation = (APY - risk_free_rate) / volatility
    pub fn calculate_optimal_allocation(
        protocols: &[(u8, u64, u64)], // (id, apy_bps, volatility_bps)
        risk_free_rate_bps: u64,
    ) -> Vec<(u8, u16)> {
        let mut allocations = Vec::new();
        let mut total_score = 0u128;

        // 计算每个协议的Sharpe比率
        let scores: Vec<(u8, u128)> = protocols
            .iter()
            .filter(|(_, apy, volatility)| *volatility > 0 && *apy > risk_free_rate_bps)
            .map(|(id, apy, volatility)| {
                let excess_return = apy.saturating_sub(risk_free_rate_bps) as u128;
                let sharpe = excess_return
                    .checked_mul(10_000)
                    .and_then(|v| v.checked_div(*volatility as u128))
                    .unwrap_or(0);
                (*id, sharpe)
            })
            .collect();

        // 计算总分
        for (_, score) in &scores {
            total_score = total_score.saturating_add(*score);
        }

        if total_score == 0 {
            // 如果没有合适的协议，平均分配
            let equal_weight = 10_000 / protocols.len() as u16;
            for (id, _, _) in protocols {
                allocations.push((*id, equal_weight));
            }
            return allocations;
        }

        // 按Sharpe比率分配权重
        for (id, score) in scores {
            let allocation_bps = (score as u128)
                .checked_mul(10_000)
                .and_then(|v| v.checked_div(total_score))
                .and_then(|v| u16::try_from(v).ok())
                .unwrap_or(0);
            allocations.push((id, allocation_bps));
        }

        // 归一化确保总和为10000
        let total_bps: u32 = allocations.iter().map(|(_, bps)| *bps as u32).sum();
        if total_bps < 10_000 && !allocations.is_empty() {
            // 将余数加到第一个协议
            allocations[0].1 += (10_000 - total_bps) as u16;
        }

        allocations
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deviation_calculation() {
        // 测试偏差计算逻辑
        let total_value = 1_000_000_000; // $1000
        let current_allocation = 600_000_000; // $600 (60%)
        let target_bps = 5000; // 50%

        let actual_bps = ((current_allocation as u128)
            .checked_mul(10_000)
            .unwrap()
            .checked_div(total_value as u128)
            .unwrap()) as i64;

        let deviation = actual_bps - target_bps as i64;
        assert_eq!(deviation, 1000); // 10% 偏差
    }

    #[test]
    fn test_optimal_allocation() {
        let protocols = vec![
            (1, 800, 200),  // Protocol 1: 8% APY, 2% volatility (Sharpe = 3)
            (2, 1200, 400), // Protocol 2: 12% APY, 4% volatility (Sharpe = 2.5)
            (3, 500, 100),  // Protocol 3: 5% APY, 1% volatility (Sharpe = 4)
        ];

        let risk_free_rate = 100; // 1%
        let allocations = RebalanceEngine::calculate_optimal_allocation(&protocols, risk_free_rate);

        // 验证总和为10000
        let total: u32 = allocations.iter().map(|(_, bps)| *bps as u32).sum();
        assert_eq!(total, 10000);

        // 打印分配结果
        for (id, bps) in allocations {
            println!("Protocol {}: {}%", id, bps as f64 / 100.0);
        }
    }
}
