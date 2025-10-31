# Mars Protocol - Solana 智能合约开发指南

## 🎯 项目概述

Mars Protocol 是一个基于 Solana 的跨协议收益聚合器，通过 CPI (Cross-Program Invocation) 集成 Kamino Earn 和 Jupiter Lend 等 DeFi 协议。合约使用 Anchor Framework 0.32.1 构建，程序 ID: `G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy`。

### 核心架构模式

**三层状态管理**：

- `GlobalState`: 全局配置（admin、fees、frozen 状态）- PDA seed: `"mars-global-state-seed"`
- `VaultState`: 每个 vault 的状态（shares、平台费率、协议分配）
- `UserPosition`: 用户在各 vault 中的仓位（shares、deposits、协议分配）

**CPI 集成流程**：用户 → Mars Vault → CPI 调用（Kamino/Jupiter）→ 收益生成 → 平台费分成

## 🏗️ 关键开发约定

### 1. Rust 合约开发

**状态结构位置**（`programs/mars/src/state/`）：

- `global_state.rs`: GlobalState, Asset, GlobalStateAuthority
- `vault_state.rs`: VaultState, UserDepositEntry, ProtocolConfig, FeeConfig
- `user_position.rs`: UserPosition, ProtocolAllocation

**指令组织**（`programs/mars/src/instructions/`）：

- `admin/`: 管理员操作（authority.rs, fee_config.rs, global_state.rs）
- `vault/`: Vault 核心操作（lifecycle.rs, user_ops_deposit.rs, user_ops_withdraw.rs）
- `integrations/kamino/`: Kamino CPI（vault.rs, farm.rs, cpi_complete.rs）
- `integrations/jupiter/`: Jupiter CPI（lend.rs）

**CPI 调用模式**（见 `kamino/vault.rs`）：

```rust
// 所有 Kamino CPI 必须通过 invoke_signed 使用 vault PDA 作为 signer
invoke_signed(&ix, &remaining_accounts, &[&vault_seeds])
// vault_seeds = [b"mars-vault", vault_state.vault_id.as_ref(), &[vault_state.vault_bump]]
```

**Token-2022 支持**：合约支持 PYUSD 等 Token-2022 代币，需使用 `token_2022_program` 账户（见 Kamino 集成）。

### 2. TypeScript/CLI 开发

**关键入口文件**：

- `cli/command.ts`: CLI 命令定义（使用 commander）
- `cli/scripts.ts`: 实际执行逻辑
- `lib/executor.ts`: Jito bundling 交易执行器

**环境配置**（`lib/constant.ts`）：

- 主网 USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Kamino Vault 程序: `KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd`
- Jupiter Lend 程序: `jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9`

**PDA 派生约定**：

```typescript
// GlobalState
[Buffer.from("mars-global-state-seed")][
  // VaultState - 必须使用 kamino vault 地址作为 vault_id
  (Buffer.from("vault-state"), vaultIdPubkey.toBuffer())
][
  // UserPosition
  (Buffer.from("user-position"),
  vaultStatePda.toBuffer(),
  userPubkey.toBuffer())
];
```

### 3. 构建与部署

**本地开发**：

```bash
anchor build                    # 编译合约
anchor test                     # 运行测试（tests/*.test.ts）
npm run script <command>        # 执行 CLI 命令
```

**主网部署流程**（详见 `docs/BUILD_DEPLOY.md`）：

1. `npm run script init` - 初始化 GlobalState
2. 创建 shares mint（`ops/deployment/create-shares-mint.ts`）
3. `npm run script initialize-vault` - 初始化 vault（必需参数：vault_id, base_token_mint, shares_mint, fee_bps）
4. `npm run script set-fee-tiers` - 配置费用等级
5. 使用 Otter Sec 验证（`docs/VERIFICATION_GUIDE.md`）

**重要**：`initialize-vault` 的 `vault_id` 参数使用 Kamino vault 地址，不是自定义 ID。

### 4. 测试约定

**测试执行顺序**（使用 ts-mocha）：

1. `0-setup.test.ts` - 初始化 GlobalState、创建 USDC mint、基础配置
2. `1-admin.test.ts` - 管理员功能测试
3. `2-vault.test.ts` - Vault 存取款测试
4. `3-kamino.test.ts` - Kamino 集成测试

**共享状态**（`tests/shared-state.ts`）：所有测试通过 SharedTestState 共享 mint、keypair、PDAs，避免重复初始化。

### 5. 费用系统

**平台费配置**（`VaultState.platform_fee_bps`）：

- 默认：2500 bps (25%)
- 范围：0-10000 bps (0%-100%)
- 命令：`npm run script update-vault-platform-fee -m <mint> -f <bps>`

**多级费用系统**（见 `state/fee_config.rs`）：

- FeeTiers: 基于金额的分级费率
- ProtocolFeeFraction: 协议费用分成比例
- InsuranceFeeTiers: 保险费用等级

### 6. Jito 集成

**Bundling 模式**（`lib/executor.ts`）：

- 每 3 笔交易打包成一个 bundle
- 随机选择 Jito validator（8 个验证器地址）
- 环境变量 `JITO_FEE` 控制小费金额
- 端点：`https://mainnet.block-engine.jito.wtf/api/v1/bundles`

## 📂 关键文件路径

**合约核心**：

- `programs/mars/src/lib.rs` - 程序入口，所有指令定义
- `programs/mars/src/instructions/vault/lifecycle.rs` - `initialize_vault` 实现
- `programs/mars/src/instructions/integrations/kamino/vault.rs` - Kamino CPI 底层调用
- `programs/mars/src/instructions/integrations/kamino/cpi_complete.rs` - Kamino deposit/withdraw 完整逻辑

**运维脚本**：

- `ops/samples/` - 各协议调用示例
- `ops/query/` - 查询工具（Kamino/Jupiter 仓位查询）
- `ops/diagnostics/` - 诊断工具（验证平台费钱包等）
- `ops/deployment/` - 部署脚本

**文档**：

- `docs/CLI_COMMANDS.md` - 所有 CLI 命令完整列表
- `docs/JUPITER_LEND_CPI_GUIDE.md` - Jupiter Lend CPI 集成指南
- `docs/PLATFORM_FEE_GUIDE.md` - 平台费系统详细说明

## ⚠️ 常见陷阱

1. **Kamino remaining_accounts**：Kamino deposit/withdraw 需要动态传入 reserves 和 lending markets 账户（通过 `remaining_accounts`）
2. **Vault ID 混淆**：`initialize-vault` 使用 Kamino vault 地址作为 `vault_id`，不是自定义标识符
3. **Token Program**：PYUSD 等 Token-2022 代币需使用 `token_2022_program`，传统代币使用 `token_program`
4. **PDA Signer**：所有 CPI 调用必须使用 vault PDA (`vault_seeds`) 作为 signer，不能用用户地址
5. **Admin 切换**：管理员变更是两步流程（`nominate_authority` → `accept_authority`），pending_admin 必须主动接受

## 🔧 快速命令参考

```bash
# 查询 Kamino vault 信息
npm run kamino:query:vault

# 查询用户 Kamino 仓位
npm run kamino:query:position

# 执行 Mars + Jupiter Lend 集成
npm run mars:jupiter:deposit
npm run mars:jupiter:withdraw

# 验证平台费钱包配置
npm run mars:verify:wallet

# 完整 CLI 命令
npm run script init --keypair phantom-wallet.json
npm run script initialize-vault --keypair <path> --vault_id <kamino_vault> --base_token_mint <mint> --shares_mint <shares> --fee_bps 2500
```

---

**技术栈**: Anchor 0.32.1 | Solana 1.18+ | TypeScript | Kamino SDK 7.2.3 | Jupiter Lend SDK 0.0.102
