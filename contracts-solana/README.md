# Mars Protocol - Solana 智能合约

Mars Protocol 是一个基于 Solana 的跨协议收益聚合智能合约，通过 CPI (Cross-Program Invocation) 调用集成 Kamino Earn 和 Jupiter Lend 等主流 DeFi 协议，为用户提供自动化的收益优化策略。

## 🚀 核心功能

### 💰 收益聚合
- **Kamino Earn 集成**: 通过 CPI 调用实现自动化流动性挖矿
- **Jupiter Lend 集成**: 借贷和收益优化策略
- **多协议支持**: 自动在多个协议间寻找最佳收益
- **动态再平衡**: 智能资产分配和风险管理

### 🔐 安全特性
- **多签治理**: Squads 协议集成，去中心化决策
- **权限控制**: 基于角色的访问控制
- **平台费用**: 灵活的费用收取机制
- **紧急暂停**: 全局紧急停止功能

### 📊 事件追踪
- **Deposit Events**: 存款事件记录
- **Withdraw Events**: 提款事件记录
- **Farm Events**: 流动性挖矿事件
- **Rewards Events**: 奖励领取事件
- **Substreams 集成**: 实时事件索引到 PostgreSQL

## 🏗️ 项目结构

```
contracts-solana/
├── programs/mars/              # Mars 主程序
│   ├── src/
│   │   ├── lib.rs             # 程序入口
│   │   ├── constant.rs        # 常量定义
│   │   ├── error.rs           # 错误类型
│   │   ├── events.rs          # 事件定义
│   │   ├── state.rs           # 状态管理
│   │   ├── util.rs            # 工具函数
│   │   ├── kamino_constants.rs # Kamino 常量
│   │   ├── instructions/      # 指令集
│   │   │   ├── mod.rs
│   │   │   ├── initialize.rs
│   │   │   ├── authority.rs
│   │   │   ├── deposit.rs
│   │   │   ├── withdraw.rs
│   │   │   ├── kamino_ops.rs  # Kamino 操作
│   │   │   └── jupiter_ops.rs # Jupiter 操作
│   │   └── state/             # 状态结构
│   │       ├── global_state.rs
│   │       ├── user_state.rs
│   │       └── vault_state.rs
│   ├── tests/                 # 单元测试
│   │   └── initialize.rs
│   └── Cargo.toml
│
├── tests/                      # 集成测试
│   ├── mars.ts                # 主测试套件
│   ├── kamino-integration.ts  # Kamino 集成测试
│   ├── kamino-cross-contract-call.ts
│   └── kamino-deposit-info.ts
│
├── cli/                        # 命令行工具
│   ├── command.ts             # CLI 入口
│   └── scripts.ts             # CLI 脚本
│
├── lib/                        # 工具库
│   ├── constant.ts            # 常量
│   ├── executor.ts            # 交易执行器
│   ├── scripts.ts             # 脚本工具
│   ├── types.ts               # 类型定义
│   └── util.ts                # 工具函数
│
├── migrations/                 # 部署脚本
│   └── deploy.ts
│
├── target/                     # 编译输出
│   ├── deploy/                # 部署密钥
│   │   └── mars-keypair.json
│   ├── idl/                   # IDL 定义
│   │   └── mars.json
│   └── types/                 # 生成的类型
│       └── mars.ts
│
├── Anchor.toml                 # Anchor 配置
├── Cargo.toml                  # Rust 工作空间
├── package.json                # Node.js 依赖
├── BUILD_DEPLOY.md            # 构建部署指南
├── CLI_COMMANDS.md            # CLI 命令文档
└── PLATFORM_FEE_GUIDE.md      # 平台费用指南
```

## 🛠️ 环境要求

### 必需工具
- **Node.js 18+** 和 npm/yarn
- **Rust 1.70+**: Solana 程序开发
- **Solana CLI 1.18+**: 区块链交互
- **Anchor Framework 0.32+**: 智能合约框架

### 安装 Anchor 框架

```bash
# 安装 Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1

# 验证安装
anchor --version  # 应显示 anchor-cli 0.32.1
```

更多安装说明: https://www.anchor-lang.com/docs/installation

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 Node.js 依赖
npm install
# 或
yarn install
```

### 2. 配置钱包

```bash
# 创建新钱包（如果没有）
solana-keygen new -o ~/.config/solana/id.json

# 查看钱包地址
solana address

# Devnet 空投测试 SOL
solana airdrop 2 --url devnet

# 查看余额
solana balance --url devnet
```

### 3. 构建程序

```bash
# 构建 Solana 程序
anchor build

# 查看程序地址
solana-keygen pubkey ./target/deploy/mars-keypair.json
```

### 4. 部署程序

**重要**: 部署前需要更新程序 ID

1. 构建程序获取新的程序 ID:
   ```bash
   anchor build
   solana-keygen pubkey ./target/deploy/mars-keypair.json
   ```

2. 更新程序 ID 到代码中:
   - 在 `programs/mars/src/lib.rs` 中:
     ```rust
     declare_id!("YOUR_PROGRAM_ID_HERE");
     ```
   - 在 `Anchor.toml` 中:
     ```toml
     [programs.localnet]
     mars = "YOUR_PROGRAM_ID_HERE"
     
     [programs.mainnet]
     mars = "YOUR_PROGRAM_ID_HERE"
     ```

3. 重新构建:
   ```bash
   anchor build
   ```

4. 部署到 Devnet:
   ```bash
   # 配置到 Devnet
   solana config set --url devnet
   
   # 部署程序
   anchor deploy
   ```

5. 部署到 Mainnet:
   ```bash
   # 配置到 Mainnet
   solana config set --url mainnet-beta
   
   # 部署程序（需要足够的 SOL）
   anchor deploy
   ```

完整部署指南请查看 [BUILD_DEPLOY.md](./BUILD_DEPLOY.md)

## 📝 使用 CLI

项目提供了完整的命令行工具来管理合约。

### 初始化合约

```bash
# 初始化全局状态和 Vault 账户
npm run script init
```

### 管理员操作

```bash
# 提名新管理员
npm run script nominate-admin -- -n <NEW_ADMIN_ADDRESS>

# 接受管理员角色（新管理员执行）
npm run script accept-admin

```

### 用户操作

```bash
# 存款到 Vault
npm run script deposit -- -a <AMOUNT>

# 从 Vault 提款
npm run script withdraw -- -a <AMOUNT>

# 质押到 Kamino Farm
npm run script stake -- -a <AMOUNT>

# 从 Kamino Farm 解除质押
npm run script unstake -- -a <AMOUNT>

# 领取奖励
npm run script claim-rewards
```

### 查询操作

```bash
# 查询 Vault 信息
npm run script query-vault

# 查询用户持仓
npm run script query-position

# 查询 Farm 状态
npm run script query-farm
```

完整 CLI 命令请查看 [CLI_COMMANDS.md](./CLI_COMMANDS.md)


## 🧪 测试

### 运行测试

```bash
# 运行所有测试
anchor test

# 运行特定测试文件
anchor test --skip-build tests/mars.ts
anchor test --skip-build tests/kamino-integration.ts

# 使用本地验证器测试
anchor test --skip-local-validator
```

### 测试脚本

```bash
# 测试所有 CLI 命令
npm run test:cli

# 测试 PYUSD 存款和质押
npm run test:pyusd-deposit

# 测试 PYUSD 解除质押和提款
npm run test:pyusd-withdraw

# 测试领取奖励
npm run test:claim-rewards
```

## 🔑 程序地址

| 网络 | 程序 ID | 状态 |
|------|---------|------|
| **Mainnet** | `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N` | ✅ 已部署 |
| **Devnet** | `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N` | ✅ 已部署 |
| **Localnet** | `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N` | 🔄 开发中 |

## 📊 智能合约架构

### 核心指令

#### 管理指令
- `initialize()` - 初始化全局状态和 Vault
- `nominate_authority()` - 提名新管理员
- `accept_authority()` - 接受管理员角色
- `pause_contract()` - 暂停合约
- `resume_contract()` - 恢复合约

#### 用户指令
- `deposit_sol()` - SOL 存款
- `deposit_spl()` - SPL 代币存款
- `withdraw_sol()` - SOL 提款
- `withdraw_spl()` - SPL 代币提款

#### Kamino 集成指令
- `kamino_deposit()` - 存款到 Kamino Vault
- `kamino_withdraw()` - 从 Kamino Vault 提款
- `kamino_stake()` - 质押到 Kamino Farm
- `kamino_unstake()` - 从 Kamino Farm 解除质押
- `claim_kamino_rewards()` - 领取 Kamino 奖励

#### Jupiter 集成指令
- `jupiter_swap()` - 通过 Jupiter 交换代币
- `jupiter_lend_deposit()` - 存款到 Jupiter Lend
- `jupiter_lend_borrow()` - 从 Jupiter Lend 借款
- `jupiter_lend_repay()` - 偿还 Jupiter Lend 借款

### 账户结构

#### GlobalState
```rust
pub struct GlobalState {
    pub admin: Pubkey,              // 管理员地址
    pub pending_admin: Pubkey,      // 待定管理员
    pub vault: Pubkey,              // Vault 地址
    pub is_paused: bool,            // 合约是否暂停
    pub platform_fee_bps: u16,      // 平台费用（基点）
    pub total_deposited: u64,       // 总存款量
}
```

#### UserState
```rust
pub struct UserState {
    pub owner: Pubkey,              // 用户地址
    pub deposited_amount: u64,      // 存款金额
    pub shares: u64,                // 份额
    pub last_deposit_time: i64,     // 最后存款时间
    pub kamino_farm_shares: u64,    // Kamino Farm 份额
}
```

### 事件定义

```rust
// 存款事件
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub timestamp: i64,
}

// 提款事件
#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub timestamp: i64,
}

// 奖励领取事件
#[event]
pub struct FarmRewardsClaimedEvent {
    pub user: Pubkey,
    pub farm: Pubkey,
    pub reward_mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

## 🔗 集成的协议

### Kamino Finance
- **Kamino Earn**: 流动性挖矿和收益优化
- **Program ID**: `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`
- **文档**: https://docs.kamino.finance/

### Jupiter
- **Jupiter Aggregator**: 代币交换
- **Jupiter Lend**: 借贷协议
- **Program ID**: `JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB`
- **文档**: https://docs.jup.ag/

### Squads Protocol
- **多签钱包**: 去中心化治理
- **Program ID**: `SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu`
- **文档**: https://docs.squads.so/

## 📚 相关文档

- 📖 [构建部署指南](./BUILD_DEPLOY.md) - 详细的构建和部署步骤
- 📖 [CLI 命令文档](./CLI_COMMANDS.md) - 完整的命令行工具使用说明
- 📖 [平台费用指南](./PLATFORM_FEE_GUIDE.md) - 平台费用机制和配置

## 🛠️ 开发工具

### 诊断脚本

```bash
# 检查 Farm 状态账户
npx ts-node check-farm-state-accounts.ts

# 诊断 Farm 状态
npx ts-node diagnose-farm-states.ts

# 诊断 Farms
npx ts-node diagnose-farms.ts

# 查询我的持仓
npx ts-node query-my-position.ts

# 查询 Vault 信息
npx ts-node query-vault-info.ts
```

### SDK 帮助工具

```bash
# 使用 Kamino SDK 帮助器
npx ts-node sdk-helper.ts
```

## 🔐 安全考虑

### 审计状态
- ⏳ **待审计**: 合约尚未经过正式安全审计
- 🔍 **内部审查**: 已完成内部代码审查
- 🧪 **测试覆盖**: 核心功能已测试

### 最佳实践
- ✅ 使用 Anchor 框架的安全特性
- ✅ PDA (Program Derived Address) 验证
- ✅ 账户所有权检查
- ✅ 算术溢出保护
- ✅ 重入攻击防护
- ✅ 紧急暂停机制

### 风险提示
⚠️ **警告**: 
- 智能合约处于活跃开发阶段
- 请勿在生产环境中使用未审计的代码
- 始终在 Devnet 上充分测试后再部署到 Mainnet
- 使用多签钱包进行管理操作

## 🤝 贡献指南

### 开发流程

```bash
# 1. Fork 项目
git clone https://github.com/your-username/mars-liquid.git
cd mars-liquid/contracts-solana

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 开发和测试
anchor build
anchor test

# 4. 提交更改
git commit -m "feat: add your feature"

# 5. 推送并创建 Pull Request
git push origin feature/your-feature
```

### 代码规范
- **Rust**: 遵循 Rust 官方编码规范和 Clippy 建议
- **TypeScript**: 使用 Prettier 格式化
- **测试**: 新功能必须包含测试用例
- **文档**: 公共接口需要完整的文档注释

## 📞 支持与反馈

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/jong-un-1/mars-liquid/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- 📧 **邮件联系**: support@mars-liquid.finance

## 🔗 相关链接

- **主项目**: [Mars Liquid](https://github.com/jong-un-1/mars-liquid)
- **后端 API**: [../backend](../backend)
- **前端应用**: [../frontend](../frontend)
- **管理后台**: [../mars-admin](../mars-admin)
- **生产环境**: [https://mars.jongun2038.win](https://mars.jongun2038.win)

## 📄 许可证

本项目采用 [MIT License](../LICENSE) 开源协议。

---

**开发团队**: Mars Liquid Protocol Team  
**程序版本**: 1.0.0  
**Anchor 版本**: 0.32.1  
**最后更新**: 2025年10月

**Mars Protocol** - Solana 上的跨协议收益聚合器 🚀

<br/>

### Swap deposit

User can deposit any token to the program

```js
   yarn script swap-deposit -t <TOKEN_ADDRESS> -a <TOKEN_AMOUNT>
```