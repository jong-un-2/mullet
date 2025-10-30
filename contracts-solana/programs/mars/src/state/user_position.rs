use anchor_lang::prelude::*;

/// 独立的用户持仓账户（解决VaultState账户大小限制问题）
///
/// 设计思路：
/// - 每个用户一个独立的PDA账户，而不是存储在VaultState的Vec中
/// - 账户大小固定，避免动态增长超过10KB限制
/// - 支持高效的用户数据查询和更新
#[account]
pub struct UserPosition {
    /// 所属Vault的ID
    pub vault_id: [u8; 32],

    /// 用户钱包地址
    pub user: Pubkey,

    /// 用户存入的原始金额（累计）
    pub total_deposited: u64,

    /// 用户持有的份额数量
    pub shares: u64,

    /// 首次存款时间戳
    pub first_deposit_time: i64,

    /// 最后一次操作时间
    pub last_action_time: i64,

    /// 累计获得的奖励
    pub total_rewards_claimed: u64,

    /// 累计存款次数
    pub deposit_count: u32,

    /// 累计提款次数
    pub withdraw_count: u32,

    /// 用户在各协议中的分配情况
    pub protocol_allocations: Vec<ProtocolAllocation>,

    /// 用户的历史收益率（基点）
    pub lifetime_apy_bps: u64,

    /// PDA bump
    pub bump: u8,

    /// 保留字段用于未来扩展
    pub reserved: [u8; 64],
}

impl UserPosition {
    /// PDA种子前缀
    pub const SEED_PREFIX: &'static [u8] = b"user-position";

    /// 计算账户空间
    pub fn space() -> usize {
        8 +      // discriminator
        32 +     // vault_id
        32 +     // user
        8 +      // total_deposited
        8 +      // shares
        8 +      // first_deposit_time
        8 +      // last_action_time
        8 +      // total_rewards_claimed
        4 +      // deposit_count
        4 +      // withdraw_count
        4 + (10 * ProtocolAllocation::space()) + // protocol_allocations (最多10个协议)
        8 +      // lifetime_apy_bps
        1 +      // bump
        64 // reserved
    }

    /// 派生PDA地址
    pub fn derive_pda(vault_id: &[u8; 32], user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEED_PREFIX, vault_id.as_ref(), user.as_ref()],
            program_id,
        )
    }

    /// 初始化用户持仓
    pub fn initialize(&mut self, vault_id: [u8; 32], user: Pubkey, bump: u8) {
        self.vault_id = vault_id;
        self.user = user;
        self.total_deposited = 0;
        self.shares = 0;
        self.first_deposit_time = Clock::get().unwrap().unix_timestamp;
        self.last_action_time = Clock::get().unwrap().unix_timestamp;
        self.total_rewards_claimed = 0;
        self.deposit_count = 0;
        self.withdraw_count = 0;
        self.protocol_allocations = Vec::new();
        self.lifetime_apy_bps = 0;
        self.bump = bump;
        self.reserved = [0; 64];
    }

    /// 记录存款
    pub fn record_deposit(&mut self, amount: u64, shares: u64) -> Result<()> {
        self.total_deposited = self
            .total_deposited
            .checked_add(amount)
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        self.shares = self
            .shares
            .checked_add(shares)
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        self.deposit_count = self.deposit_count.saturating_add(1);
        self.last_action_time = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// 记录提款
    pub fn record_withdraw(&mut self, shares_burned: u64) -> Result<()> {
        require!(self.shares >= shares_burned, crate::error::CustomError::InsufficientShares);

        self.shares = self
            .shares
            .checked_sub(shares_burned)
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        self.withdraw_count = self.withdraw_count.saturating_add(1);
        self.last_action_time = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// 记录奖励领取
    pub fn record_rewards_claimed(&mut self, amount: u64) -> Result<()> {
        self.total_rewards_claimed = self
            .total_rewards_claimed
            .checked_add(amount)
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        self.last_action_time = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// 更新协议分配
    pub fn update_protocol_allocation(
        &mut self,
        protocol_id: u8,
        amount: u64,
        shares: u64,
    ) -> Result<()> {
        if let Some(allocation) =
            self.protocol_allocations.iter_mut().find(|a| a.protocol_id == protocol_id)
        {
            allocation.amount = amount;
            allocation.shares = shares;
            allocation.last_updated = Clock::get()?.unix_timestamp;
        } else {
            // 限制最多10个协议
            require!(
                self.protocol_allocations.len() < 10,
                crate::error::CustomError::AllocationLimitExceeded
            );

            self.protocol_allocations.push(ProtocolAllocation {
                protocol_id,
                amount,
                shares,
                last_updated: Clock::get()?.unix_timestamp,
            });
        }

        Ok(())
    }

    /// 计算用户当前价值（基于总份额和Vault总价值）
    pub fn calculate_current_value(&self, vault_total_value: u64, vault_total_shares: u64) -> u64 {
        if vault_total_shares == 0 {
            return 0;
        }

        (self.shares as u128)
            .checked_mul(vault_total_value as u128)
            .and_then(|v| v.checked_div(vault_total_shares as u128))
            .and_then(|v| u64::try_from(v).ok())
            .unwrap_or(0)
    }

    /// 计算盈亏（当前价值 - 总存款）
    pub fn calculate_pnl(&self, vault_total_value: u64, vault_total_shares: u64) -> i64 {
        let current_value = self.calculate_current_value(vault_total_value, vault_total_shares);
        (current_value as i64).saturating_sub(self.total_deposited as i64)
    }
}

/// 用户在单个协议中的分配信息
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProtocolAllocation {
    /// 协议ID
    pub protocol_id: u8,

    /// 分配金额
    pub amount: u64,

    /// 持有份额
    pub shares: u64,

    /// 最后更新时间
    pub last_updated: i64,
}

impl ProtocolAllocation {
    pub fn space() -> usize {
        1 + 8 + 8 + 8 // protocol_id + amount + shares + last_updated
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_position_space() {
        // 确保账户大小不超过10KB
        let space = UserPosition::space();
        assert!(space < 10240, "UserPosition space {} exceeds 10KB limit", space);
        println!("UserPosition space: {} bytes", space);
    }

    #[test]
    fn test_pda_derivation() {
        let vault_id = [1u8; 32];
        let user = Pubkey::new_unique();
        let program_id = Pubkey::new_unique();

        let (pda1, bump1) = UserPosition::derive_pda(&vault_id, &user, &program_id);
        let (pda2, bump2) = UserPosition::derive_pda(&vault_id, &user, &program_id);

        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }
}
