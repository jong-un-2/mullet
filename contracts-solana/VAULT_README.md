# Mars Vault 合约 - 多协议收益聚合器

## 🎯 项目概述

Mars Vault 是一个基于 Solana 的多协议收益聚合器，作为用户和多个 DeFi 协议之间的代理，通过智能路由和再平衡机制最大化用户收益。

### 核心特性

- 🔄 **多协议集成**: 支持 Kamino、Lido、Marinade、Jito 等主流协议
- 💱 **智能兑换**: 集成 Jupiter 进行最优路由兑换
- ⚖️ **自动再平衡**: 根据市场条件自动调整资产配置
- 💰 **收益优化**: 通过分散投资最大化收益率
- 🛡️ **风险管理**: 滑点保护和紧急暂停机制

## 🏗️ 架构设计

```
用户 → Mars Vault → [Kamino/Lido/其他协议] → 收益生成
         ↕️
    Jupiter 兑换聚合器
```

## 📋 核心接口

### 1. 基础功能

#### `vault_deposit(amount: u64)`
- **功能**: 用户存款到金库
- **参数**: 存款金额
- **返回**: 用户获得的份额代币数量

#### `vault_withdraw(shares_amount: u64)`  
- **功能**: 用户从金库提款
- **参数**: 要赎回的份额数量
- **返回**: 用户获得的代币数量

### 2. 智能兑换功能

#### `swap_and_deposit(protocol_id, from_token, to_token, amount)`
- **功能**: 处理兑换后再投入协议
- **流程**: 
  1. 用户代币 → Jupiter 兑换 → 目标代币
  2. 目标代币 → 存入指定协议
  3. 更新用户份额

#### `withdraw_with_swap(amount, target_token)`
- **功能**: 赎回用户份额并完成兑换返回给用户
- **流程**:
  1. 从协议赎回代币
  2. Jupiter 兑换为用户指定代币
  3. 转账给用户

### 3. 管理功能

#### `rebalance_with_swap(protocol_from, protocol_to, amount)`
- **功能**: 从一个协议赎回并转换再投另一协议
- **用途**: 优化收益配置，风险管理

#### `estimate_swap_cost(from_token, to_token, amount)` 
- **功能**: 预估兑换成本（仅平台内部使用）
- **返回**: 价格影响、费用明细、最优路由

## 🔧 技术实现

### 状态管理

```rust
pub struct VaultState {
    pub vault_id: [u8; 32],
    pub admin: Pubkey,
    pub base_token_mint: Pubkey,
    pub shares_mint: Pubkey,
    pub total_deposits: u64,
    pub total_shares: u64,
    pub supported_protocols: Vec<ProtocolConfig>,
    pub user_deposits: HashMap<Pubkey, UserDeposit>,
    // ...更多字段
}
```

### 协议集成

```rust
pub const PROTOCOL_KAMINO: u8 = 1;
pub const PROTOCOL_LIDO: u8 = 2;
pub const PROTOCOL_MARINADE: u8 = 3;
pub const PROTOCOL_JITO: u8 = 4;
```

### CPI 调用示例

```rust
// Kamino 存款 CPI
fn kamino_deposit_cpi(
    ctx: &Context<VaultDeposit>,
    amount: u64,
) -> Result<u64> {
    // 构建 Kamino 存款指令
    // 执行 CPI 调用
    // 返回获得的份额数量
}
```

## 📊 Substreams 索引器集成

### GraphQL Schema 设计

```graphql
type Vault @entity {
  id: ID!
  vaultId: Bytes!
  admin: Bytes!
  totalDeposits: BigInt!
  totalShares: BigInt!
  apy: BigInt!
  protocols: [ProtocolAllocation!]!
  users: [UserDeposit!]!
  rebalanceHistory: [RebalanceRecord!]!
}

type UserDeposit @entity {
  id: ID!
  user: Bytes!
  vault: Vault!
  amount: BigInt!
  shares: BigInt!
  timestamp: BigInt!
}

type RebalanceRecord @entity {
  id: ID!
  vault: Vault!
  protocolFrom: Int!
  protocolTo: Int!
  amountIn: BigInt!
  amountOut: BigInt!
  timestamp: BigInt!
}
```

### 事件索引

程序发出的关键事件：
- `VaultDepositEvent`: 用户存款
- `VaultWithdrawEvent`: 用户提款  
- `RebalanceEvent`: 协议间再平衡
- `SwapEvent`: 代币兑换
- `VaultStateUpdated`: 金库状态更新

## 🚀 部署和使用

### 构建项目

```bash
# 构建程序
anchor build

# 运行测试
anchor test

# 部署到 devnet
anchor deploy --provider.cluster devnet
```

### 前端集成

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";

// 初始化连接
const program = anchor.workspace.Mars as Program<Mars>;

// 用户存款
await program.methods
  .vaultDeposit(new anchor.BN(1000000)) // 1 USDC
  .accounts({
    user: userKeypair.publicKey,
    userTokenAccount: userUsdcAccount,
    vaultState: vaultStatePda,
    // ...其他账户
  })
  .rpc();
```

## 🛡️ 安全特性

### 访问控制
- 管理员权限管理
- 多重签名支持
- 权限分离设计

### 风险管理
- 滑点保护机制
- 最大分配限制
- 紧急暂停功能
- 协议白名单

### 审计和监控
- 事件完整记录
- 状态一致性检查
- 异常检测告警

## 📈 收益策略

### 动态再平衡
- 根据协议 APY 变化自动调整分配
- 考虑流动性和风险因素
- 最小化 MEV 影响

### 费用优化
- 智能路由减少交易费用
- 批量操作降低成本
- Gas 费用补贴机制

## 🔮 未来规划

### Phase 1: 核心功能 ✅
- [x] 基础存取款功能
- [x] Kamino 协议集成
- [x] Jupiter 兑换集成

### Phase 2: 多协议支持 🚧
- [ ] Lido stSOL 集成
- [ ] Marinade mSOL 集成  
- [ ] Jito jitoSOL 集成
- [ ] 自动再平衡机制

### Phase 3: 高级功能 📋
- [ ] 智能收益优化算法
- [ ] 跨链桥接支持
- [ ] NFT 收益凭证
- [ ] DAO 治理机制

## 📞 联系我们

- **GitHub**: https://github.com/mars-protocol/mars-vault
- **Twitter**: @MarsProtocol
- **Discord**: https://discord.gg/marsprotocol
- **文档**: https://docs.marsprotocol.io

---

*Mars Vault - 让您的 DeFi 收益飞向火星！* 🚀