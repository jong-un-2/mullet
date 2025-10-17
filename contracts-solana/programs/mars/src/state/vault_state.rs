use anchor_lang::prelude::*;

#[account]
pub struct VaultState {
    /// 金库唯一标识符
    pub vault_id: [u8; 32],
    
    /// 管理员地址
    pub admin: Pubkey,
    
    /// 待接受的新管理员
    pub pending_admin: Option<Pubkey>,
    
    /// 基础代币 Mint（金库接受的主要代币）
    pub base_token_mint: Pubkey,
    
    /// 份额代币 Mint（代表用户在金库中的权益）
    pub shares_mint: Pubkey,
    
    /// 金库Treasury账户（持有代币）
    pub treasury: Pubkey,
    
    /// 总存款数量
    pub total_deposits: u64,
    
    /// 总份额数量
    pub total_shares: u64,
    
    /// 金库创建时间
    pub created_at: i64,
    
    /// 最后更新时间
    pub last_updated: i64,
    
    /// 金库状态（活跃、暂停、已关闭）
    pub status: VaultStatus,
    
    /// 支持的协议列表
    pub supported_protocols: Vec<ProtocolConfig>,
    
    /// 用户存款记录 (使用Vec存储)
    pub user_deposits: Vec<UserDepositEntry>,
    
    /// 再平衡记录
    pub rebalance_history: Vec<RebalanceRecord>,
    
    /// 费用配置
    pub fee_config: FeeConfig,
    
    /// 平台费用基点（例如：100 = 1%）
    pub platform_fee_bps: u16,
    
    /// 最大滑点保护基点
    pub max_slippage_bps: u16,
    
    /// PDA bump
    pub bump: u8,
    
    /// 已收集但未认领的存款费用
    pub unclaimed_deposit_fee: u64,
    
    /// 已收集但未认领的提款费用
    pub unclaimed_withdraw_fee: u64,
    
    /// 已收集但未认领的管理费用
    pub unclaimed_management_fee: u64,
    
    /// 已收集但未认领的性能费用
    pub unclaimed_performance_fee: u64,
    
    /// 总费用收集统计
    pub total_deposit_fee_collected: u64,
    pub total_withdraw_fee_collected: u64,
    pub total_management_fee_collected: u64,
    pub total_performance_fee_collected: u64,
    
    /// 总共领取的奖励数量（用于统计）
    pub total_rewards_claimed: u64,
    
    /// 总共收取的平台费（从奖励中收取）
    pub total_platform_fee_collected: u64,
    
    /// 保留字段用于未来扩展
    pub reserved: [u8; 48],
}

impl VaultState {
    pub const SEED_PREFIX: &'static [u8] = b"vault-state";
    
    /// 计算需要的空间大小
    pub fn space() -> usize {
        8 + // discriminator
        32 + // vault_id
        32 + // admin
        33 + // pending_admin (1 + 32)
        32 + // base_token_mint
        32 + // shares_mint
        32 + // treasury
        8 + // total_deposits
        8 + // total_shares
        8 + // created_at
        8 + // last_updated
        1 + // status
        4 + 10 * ProtocolConfig::space() + // supported_protocols (max 10)
        4 + 1000 * (32 + UserDeposit::space()) + // user_deposits (max 1000 users)
        4 + 100 * RebalanceRecord::space() + // rebalance_history (max 100 records)
        FeeConfig::space() + // fee_config
        2 + // platform_fee_bps
        2 + // max_slippage_bps
        1 + // bump
        8 + // unclaimed_deposit_fee
        8 + // unclaimed_withdraw_fee
        8 + // unclaimed_management_fee
        8 + // unclaimed_performance_fee
        8 + // total_deposit_fee_collected
        8 + // total_withdraw_fee_collected
        8 + // total_management_fee_collected
        8 + // total_performance_fee_collected
        8 + // total_rewards_claimed
        8 + // total_platform_fee_collected
        48 // reserved
    }
    
    /// 更新再平衡记录
    pub fn update_rebalance_record(
        &mut self,
        protocol_from: u8,
        protocol_to: u8,
        amount_in: u64,
        amount_out: u64,
        shares_received: u64,
    ) -> Result<()> {
        let record = RebalanceRecord {
            protocol_from,
            protocol_to,
            amount_in,
            amount_out,
            shares_received,
            timestamp: Clock::get()?.unix_timestamp,
            executed_by: Clock::get()?.slot, // 使用 slot 作为执行标识
        };
        
        self.rebalance_history.push(record);
        
        // 保留最近100条记录
        if self.rebalance_history.len() > 100 {
            self.rebalance_history.remove(0);
        }
        
        self.last_updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// 计算当前金库的APY
    pub fn calculate_apy(&self) -> Result<u64> {
        // 基于历史数据计算年化收益率
        // 这里需要更复杂的计算逻辑
        Ok(500) // 5% APY (基点表示)
    }
    
    /// 获取用户的总份额价值
    pub fn get_user_share_value(&self, user: &Pubkey) -> Option<u64> {
        self.user_deposits.iter()
            .find(|entry| entry.user == *user)
            .map(|entry| {
                if self.total_shares == 0 {
                    0
                } else {
                    entry.deposit.shares * self.total_deposits / self.total_shares
                }
            })
    }
    
    /// 查找用户存款记录
    pub fn find_user_deposit(&self, user: &Pubkey) -> Option<&UserDeposit> {
        self.user_deposits.iter()
            .find(|entry| entry.user == *user)
            .map(|entry| &entry.deposit)
    }
    
    /// 查找用户存款记录的可变引用
    pub fn find_user_deposit_mut(&mut self, user: &Pubkey) -> Option<&mut UserDeposit> {
        self.user_deposits.iter_mut()
            .find(|entry| entry.user == *user)
            .map(|entry| &mut entry.deposit)
    }
    
    /// 添加或更新用户存款
    pub fn insert_user_deposit(&mut self, user: Pubkey, deposit: UserDeposit) {
        if let Some(entry) = self.user_deposits.iter_mut().find(|entry| entry.user == user) {
            entry.deposit = deposit;
        } else {
            self.user_deposits.push(UserDepositEntry { user, deposit });
        }
    }
    
    /// 删除用户存款记录
    pub fn remove_user_deposit(&mut self, user: &Pubkey) -> Option<UserDeposit> {
        if let Some(pos) = self.user_deposits.iter().position(|entry| entry.user == *user) {
            Some(self.user_deposits.remove(pos).deposit)
        } else {
            None
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserDepositEntry {
    /// 用户地址
    pub user: Pubkey,
    /// 用户存款信息
    pub deposit: UserDeposit,
}

impl UserDepositEntry {
    pub fn space() -> usize {
        32 + UserDeposit::space() // Pubkey + UserDeposit
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserDeposit {
    /// 用户存入的原始金额
    pub amount: u64,
    
    /// 用户持有的份额数量
    pub shares: u64,
    
    /// 存款时间戳
    pub timestamp: i64,
    
    /// 最后一次操作时间
    pub last_action_time: i64,
    
    /// 累计获得的奖励
    pub total_rewards: u64,
}

impl UserDeposit {
    pub fn space() -> usize {
        8 + 8 + 8 + 8 + 8 // 5个u64字段
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProtocolConfig {
    /// 协议ID（1=Kamino, 2=Lido, 等）
    pub protocol_id: u8,
    
    /// 协议程序地址
    pub program_id: Pubkey,
    
    /// 协议状态（启用/禁用）
    pub enabled: bool,
    
    /// 分配权重（基点，总和应该为10000）
    pub allocation_weight_bps: u16,
    
    /// 当前在该协议中的资产数量
    pub current_allocation: u64,
    
    /// 目标分配比例
    pub target_allocation_bps: u16,
    
    /// 协议特定参数
    pub params: Vec<u8>,
}

impl ProtocolConfig {
    pub fn space() -> usize {
        1 + 32 + 1 + 2 + 8 + 2 + 4 + 32 // protocol_id + program_id + enabled + weights + allocation + params
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RebalanceRecord {
    /// 源协议ID
    pub protocol_from: u8,
    
    /// 目标协议ID
    pub protocol_to: u8,
    
    /// 输入数量
    pub amount_in: u64,
    
    /// 输出数量
    pub amount_out: u64,
    
    /// 获得的份额
    pub shares_received: u64,
    
    /// 执行时间戳
    pub timestamp: i64,
    
    /// 执行者标识（slot）
    pub executed_by: u64,
}

impl RebalanceRecord {
    pub fn space() -> usize {
        1 + 1 + 8 + 8 + 8 + 8 + 8 // 所有字段
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FeeConfig {
    /// 存款费用基点
    pub deposit_fee_bps: u16,
    
    /// 提款费用基点
    pub withdraw_fee_bps: u16,
    
    /// 管理费用基点（年化）
    pub management_fee_bps: u16,
    
    /// 性能费用基点
    pub performance_fee_bps: u16,
    
    /// 费用接收地址
    pub fee_recipient: Pubkey,
}

impl FeeConfig {
    pub fn space() -> usize {
        2 + 2 + 2 + 2 + 32 // 4个u16 + 1个Pubkey
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VaultStatus {
    Active,
    Paused,
    Closed,
    Emergency,
}

/// 全局配置状态（保持兼容现有代码）
#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub pending_admin: Option<Pubkey>,
    pub freeze_authorities: Vec<Pubkey>,
    pub thaw_authorities: Vec<Pubkey>,
    pub orchestrators: Vec<Pubkey>,
    pub frozen: bool,
    pub fee_tiers: Vec<FeeTier>,
    pub insurance_fee_tiers: Vec<InsuranceFeeTier>,
    pub target_chain_min_fee: Vec<ChainFeeEntry>,
    pub protocol_fee_fraction: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FeeTier {
    pub threshold_amount: u64,
    pub bps_fee: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InsuranceFeeTier {
    pub threshold_amount: u64,
    pub insurance_fee: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ChainFeeEntry {
    pub chain_id: u16,
    pub min_fee: u64,
}