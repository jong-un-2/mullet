# Mars CLI 命令完整列表

## 📋 目录
- [初始化和管理员命令](#1-初始化和管理员命令)
- [Vault 管理命令](#2-vault-管理命令)
- [全局配置命令](#3-全局配置命令)
- [费用配置命令](#4-费用配置命令)
- [费用提取命令](#5-费用提取命令)
- [Jito 工具命令](#6-jito-工具命令)
- [通用参数](#-通用参数)
- [完整示例](#-完整命令示例)

---

## 📋 所有可用命令

### 1. 初始化和管理员命令

#### `init` - 初始化项目 GlobalState
初始化 Mars 程序的全局状态（仅需执行一次）
```bash
npm run script init --keypair <KEYPAIR_PATH>

# 示例
npm run script init --keypair phantom-wallet.json
```
**功能**：
- 创建 GlobalState PDA
- 设置管理员地址
- 配置 USDC mint 地址
- 初始化默认参数

#### `change-admin` - 更改管理员
将管理员权限转移给新地址（两步流程的第一步）
```bash
npm run script change-admin -n <NEW_ADMIN_ADDRESS>

# 示例
npm run script change-admin -n A9WxRgrw9m3PMU7X3kgN9baSaBnLyNMpxnb3ENBzXaGr
```

#### `accept-authority` - 接受管理员权限
新管理员接受管理员角色（两步流程的第二步）
```bash
npm run script accept-authority --keypair <NEW_ADMIN_KEYPAIR>

# 示例
npm run script accept-authority --keypair new-admin.json
```

---

### 2. Vault 管理命令

#### `initialize-vault` - 初始化 Vault ⭐ 主网部署必备
创建新的 Vault 并与 Kamino vault 集成
```bash
npm run script initialize-vault \
  --keypair <KEYPAIR_PATH> \
  --vault_id <KAMINO_VAULT_ADDRESS> \
  --base_token_mint <TOKEN_MINT_ADDRESS> \
  --shares_mint <SHARES_MINT_ADDRESS> \
  --fee_bps <PLATFORM_FEE_BPS>

# 示例：初始化 Kamino USDC Vault（主网）
npm run script initialize-vault \
  --keypair phantom-wallet.json \
  --vault_id A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  --base_token_mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --shares_mint BuriTezg7onbXBKGEpU3ZxsdvGNXFJZ84vdn32ArpdfB \
  --fee_bps 2500
```
**参数说明**：
- `-v, --vault_id`: Kamino vault 地址（作为 vault_id）
- `-b, --base_token_mint`: 基础代币 mint（如 USDC）
- `-s, --shares_mint`: 份额代币 mint 地址
- `-f, --fee_bps`: 平台费率（basis points，2500 = 25%）

**重要地址**：
- USDC Mint (主网): `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Kamino USDC Vault: `A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK`
- Shares Mint (已创建): `BuriTezg7onbXBKGEpU3ZxsdvGNXFJZ84vdn32ArpdfB`

#### `update-vault-platform-fee` - 更新 Vault 平台费率
动态调整 Vault 的平台费率配置
```bash
npm run script update-vault-platform-fee \
  --keypair <KEYPAIR_PATH> \
  -m <VAULT_MINT> \
  -f <FEE_BPS>

# 示例：调整为 20%
npm run script update-vault-platform-fee \
  --keypair phantom-wallet.json \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -f 2000
```
**参数说明**：
- `-m, --vault_mint`: Vault 基础代币 mint 地址
- `-f, --fee_bps`: 新的平台费率（basis points）

---

### 3. 全局配置命令

#### `update-global-state-params` - 更新全局状态参数
更新再平衡阈值、跨链费用和最大订单金额
```bash
npm run script update-global-state-params \
  --keypair <KEYPAIR_PATH> \
  -rt <REBALANCE_THRESHOLD> \
  -cfb <CROSS_CHAIN_FEE_BPS> \
  -moa <MAX_ORDER_AMOUNT>

# 示例
npm run script update-global-state-params \
  --keypair phantom-wallet.json \
  -rt 80 \
  -cfb 5 \
  -moa 110000000000
```
**参数说明**：
- `-rt, --rebalance_threshold`: 再平衡阈值（百分比）
- `-cfb, --cross_chain_fee_bps`: 跨链费用（basis points）
- `-moa, --max_order_amount`: 最大订单金额

#### `set-target-chain-min-fee` - 设置目标链最小费用
设置特定目标链的最小费用
```bash
npm run script set-target-chain-min-fee \
  --keypair <KEYPAIR_PATH> \
  -d <DEST_CHAIN_ID> \
  -f <MIN_FEE>

# 示例
npm run script set-target-chain-min-fee \
  --keypair phantom-wallet.json \
  -d 10 \
  -f 1
```
**参数说明**：
- `-d, --dest_chain_id`: 目标链 ID
- `-f, --min_fee`: 最小费用

---

### 4. 费用配置命令

#### `set-fee-tiers` - 设置费用等级 ⭐ 主网部署必备
配置基于交易金额的分层费率
```bash
npm run script set-fee-tiers --keypair <KEYPAIR_PATH>

# 示例
npm run script set-fee-tiers --keypair phantom-wallet.json
```
**默认配置**：
- Tier 1: 金额 >= 0 → 3 bps (0.03%)
- Tier 2: 金额 >= 100 → 2 bps (0.02%)
- Tier 3: 金额 >= 1000 → 1 bps (0.01%)

#### `set-insurance-fee-tiers` - 设置保险费用等级
设置保险费用的分层结构
```bash
npm run script set-insurance-fee-tiers --keypair <KEYPAIR_PATH>

# 示例
npm run script set-insurance-fee-tiers --keypair phantom-wallet.json
```

#### `set-protocol-fee-fraction` - 设置协议费用比例 ⭐ 主网部署必备
设置协议费用的分子和分母
```bash
npm run script set-protocol-fee-fraction \
  --keypair <KEYPAIR_PATH> \
  -n <NUMERATOR> \
  -d <DENOMINATOR>

# 示例：设置为 1% (1/100)
npm run script set-protocol-fee-fraction \
  --keypair phantom-wallet.json \
  -n 1 \
  -d 100

# 示例：设置为 0.5% (1/200)
npm run script set-protocol-fee-fraction \
  --keypair phantom-wallet.json \
  -n 1 \
  -d 200
```
**参数说明**：
- `-n, --numerator`: 分子
- `-d, --denominator`: 分母

---

### 5. 费用提取命令

#### `claim-fees` - 提取指定类型的费用
管理员提取 Vault 中累积的特定类型费用
```bash
npm run script claim-fees \
  --keypair <KEYPAIR_PATH> \
  -v <VAULT_ID> \
  -a <AMOUNT> \
  -t <FEE_TYPE>

# 示例：提取 100 个存款费用
npm run script claim-fees \
  --keypair phantom-wallet.json \
  -v 0000000000000000000000000000000000000000000000000000000000000001 \
  -a 100 \
  -t deposit
```
**参数说明**：
- `-v, --vault_id`: Vault ID (32 字节 hex)
- `-a, --amount`: 提取金额
- `-t, --fee_type`: 费用类型 (deposit, withdraw, management, performance)

#### `claim-all-fees` - 提取所有费用
管理员一次性提取 Vault 中所有累积的费用
```bash
npm run script claim-all-fees \
  --keypair <KEYPAIR_PATH> \
  -v <VAULT_ID>

# 示例
npm run script claim-all-fees \
  --keypair phantom-wallet.json \
  -v 0000000000000000000000000000000000000000000000000000000000000001
```
**参数说明**：
- `-v, --vault_id`: Vault ID (32 字节 hex)

---

### 6. Jito 工具命令
- `-v, --vault_id`: Vault ID (32 字节 hex)
- `-a, --amount`: 提取金额
- `-t, --fee_type`: 费用类型 (deposit, withdraw, management, performance)

#### `claim-all-fees` - 提取所有费用
管理员一次性提取 Vault 中所有累积的费用
```bash
npm run script claim-all-fees -v <VAULT_ID>

# 示例
npm run script claim-all-fees -v 0000000000000000000000000000000000000000000000000000000000000001
```
**参数说明**：
- `-v, --vault_id`: Vault ID (32 字节 hex)

#### `update-vault-platform-fee` - 更新 Vault 平台费率 ⭐ 新增
动态更新 Vault 的平台费率配置
```bash
npm run script update-vault-platform-fee \
  -m <VAULT_MINT> \
  -f <FEE_BPS>

# 示例：设置为 25% (2500 bps)
npm run script update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 2500

# 示例：设置为 10% (1000 bps)
npm run script update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 1000
```
**参数说明**：
- `-m, --vault_mint`: Vault 基础代币 mint 地址
- `-f, --fee_bps`: 新的平台费率（basis points，如 2500 = 25%）

### 5. Jito 相关命令

#### `get-jito-tip` - 获取 Jito tip 金额
查询 Jito tip 账户的平均 tip 金额
```bash
npm run script get-jito-tip

# 示例（带自定义 keypair）
npm run script get-jito-tip --keypair phantom-wallet.json
```

---

## 🔧 通用参数

所有命令都支持以下可选参数：

### `--keypair <path>` - 钱包路径 ⭐ 必需
指定管理员钱包的 keypair 文件路径
```bash
--keypair phantom-wallet.json        # 相对路径
--keypair ~/.config/solana/id.json   # 绝对路径
--keypair /path/to/admin.json        # 自定义路径
```

### `-e, --env <string>` - Solana 网络环境（已弃用）
**注意**：当前版本使用固定的 RPC URL，不再支持环境切换。
如需切换网络，请修改代码中的 RPC_URL 常量。

---

## 📝 完整命令示例

### 🚀 主网完整部署流程

#### 步骤 1：部署程序
```bash
# 1.1 编译程序
anchor build

# 1.2 生成新的 Program ID（如需要）
solana-keygen grind --starts-with mars:1

# 1.3 更新 Program ID（在所有文件中）
# - Anchor.toml
# - lib.rs
# - frontend/backend 代码

# 1.4 部署到主网
solana program deploy \
  --program-id <PROGRAM_KEYPAIR> \
  --url https://mainnet.helius-rpc.com/?api-key=YOUR_KEY \
  target/deploy/mars.so
```

#### 步骤 2：初始化 GlobalState
```bash
npm run script init --keypair phantom-wallet.json
```
**预期结果**：
- GlobalState PDA: `FJs2uSR4zMjhpyyUZTFxFngSFQQx9ThipWq1iuxo53FK`
- Admin: `4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w`
- Base Mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)

#### 步骤 3：配置费用结构
```bash
# 3.1 设置费用等级（0.01%-0.03%）
npm run script set-fee-tiers --keypair phantom-wallet.json

# 3.2 设置协议费用（1%）
npm run script set-protocol-fee-fraction \
  --keypair phantom-wallet.json \
  -n 1 \
  -d 100
```
**预期结果**：
- Fee Tiers PDA: `EyRMAhAJoqgtjDbniZoN9fBcbrfgydeT6MFAGEfPuTwo`
- Protocol Fee PDA: `ErRAALdPB7kYxaQYF7ERu22fbUPuXazAo3snQvYLAcJG`

#### 步骤 4：初始化 Vault
```bash
# 4.1 创建 Shares Mint（如未创建）
npx ts-node create-shares-mint.ts

# 4.2 初始化 Kamino USDC Vault（平台费 25%）
npm run script initialize-vault \
  --keypair phantom-wallet.json \
  --vault_id A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  --base_token_mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --shares_mint BuriTezg7onbXBKGEpU3ZxsdvGNXFJZ84vdn32ArpdfB \
  --fee_bps 2500
```
**预期结果**：
- Vault State PDA: `CNxqeDdinwY3gijUufgRj9t9gATsaTWi8eamGx8qpoJ8`
- Vault Treasury: `646UcHJmNrJREekjqDmpxdHUYrKhEyxRdKAdeQYzjFVm`
- Platform Fee: 2500 bps (25%)

#### 步骤 5：验证配置
```bash
# 查询 GlobalState
npx ts-node query-global-state.ts

# 验证 Vault State
solana account CNxqeDdinwY3gijUufgRj9t9gATsaTWi8eamGx8qpoJ8
```

---

### 🎯 日常运维工作流程

#### 每日检查
```bash
# 1. 查询配置状态
npx ts-node query-global-state.ts

# 2. 检查 Vault 余额
solana account CNxqeDdinwY3gijUufgRj9t9gATsaTWi8eamGx8qpoJ8

# 3. 查询管理员余额
solana balance 4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w
```

#### 费用管理
```bash
# 提取累积的所有费用
npm run script claim-all-fees \
  --keypair phantom-wallet.json \
  -v <VAULT_ID>

# 或按类型提取
npm run script claim-fees \
  --keypair phantom-wallet.json \
  -v <VAULT_ID> \
  -a 1000 \
  -t deposit
```

#### 费率调整
```bash
# 根据市场情况调整平台费率
npm run script update-vault-platform-fee \
  --keypair phantom-wallet.json \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -f 2000  # 调整为 20%
```

---

### 初始化新项目（开发网）
```bash
# 1. 初始化项目（仅执行一次）
npm run script init --keypair ./admin-keypair.json

# 1. 初始化项目（仅执行一次）
npm run script init --keypair ./admin-keypair.json

# 2. 配置费用结构
npm run script set-fee-tiers --keypair ./admin-keypair.json
npm run script set-protocol-fee-fraction -n 1 -d 100 --keypair ./admin-keypair.json

# 3. 初始化 Vault
npm run script initialize-vault \
  --keypair ./admin-keypair.json \
  --vault_id <KAMINO_VAULT_ADDRESS> \
  --base_token_mint <TOKEN_MINT> \
  --shares_mint <SHARES_MINT> \
  --fee_bps 2500
```

---

### 🔄 管理员权限转移流程
```bash
# 步骤 1：当前管理员提名新管理员
npm run script change-admin \
  --keypair current-admin.json \
  -n A9WxRgrw9m3PMU7X3kgN9baSaBnLyNMpxnb3ENBzXaGr

# 步骤 2：新管理员接受权限
npm run script accept-authority \
  --keypair new-admin.json
```

---

### 🚨 应急响应流程
```bash
# 场景：需要立即调整费率或提取资金

# 1. 紧急调整费率为 0（免费）
npm run script update-vault-platform-fee \
  --keypair phantom-wallet.json \
  -m EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  -f 0

# 2. 提取所有累积费用
npm run script claim-all-fees \
  --keypair phantom-wallet.json \
  -v <VAULT_ID>

# 3. 如有必要，转移管理员权限
npm run script change-admin \
  --keypair phantom-wallet.json \
  -n <EMERGENCY_ADMIN>
```

---

## ⚠️ 注意事项

### 1. 权限要求
- ✅ 大部分命令需要管理员权限
- ✅ 确保使用正确的 keypair 文件
- ✅ 管理员地址：`4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w`

### 2. 网络配置
- ✅ 主网 RPC：`https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`
- ✅ 程序 ID：`9zQDLH3JHe1tEzdkPrJJENrWV5pfcK3UCPs7MZCjifyu`
- ✅ 当前固定使用 Helius RPC（代码中配置）

### 3. Gas 费用和余额
- ⚠️ 主网操作会消耗 SOL
- ⚠️ 确保管理员钱包有足够余额（建议 >= 1 SOL）
- ⚠️ 部署程序需要约 4.14 SOL（program rent）
- ⚠️ 每个 PDA 初始化需要租金豁免

### 4. 数据验证
- ✅ 重要操作前在 devnet 测试
- ✅ 使用 Solscan 验证交易
  - Mainnet: https://solscan.io/tx/<SIGNATURE>
  - Devnet: https://solscan.io/tx/<SIGNATURE>?cluster=devnet

### 5. 备份和安全
- 🔐 妥善保管 keypair 文件
- 🔐 记录所有重要的 PDA 地址
- 🔐 定期备份配置信息
- 🔐 不要提交 keypair 到 git

### 6. 费率限制
- 📊 平台费率：0 - 10000 bps (0% - 100%)
- 📊 协议费率：建议 0.5% - 2%
- 📊 交易费率：0.01% - 0.03% (根据金额分层)

---

## 📊 重要地址汇总

### 主网部署地址
```
Program ID:        9zQDLH3JHe1tEzdkPrJJENrWV5pfcK3UCPs7MZCjifyu
GlobalState PDA:   FJs2uSR4zMjhpyyUZTFxFngSFQQx9ThipWq1iuxo53FK
Admin Wallet:      4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w

Fee Tiers PDA:    EyRMAhAJoqgtjDbniZoN9fBcbrfgydeT6MFAGEfPuTwo
Protocol Fee PDA:  ErRAALdPB7kYxaQYF7ERu22fbUPuXazAo3snQvYLAcJG

Vault State PDA:   CNxqeDdinwY3gijUufgRj9t9gATsaTWi8eamGx8qpoJ8
Vault Treasury:    646UcHJmNrJREekjqDmpxdHUYrKhEyxRdKAdeQYzjFVm
```

### 代币地址
```
USDC Mint:         EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
Shares Mint:       BuriTezg7onbXBKGEpU3ZxsdvGNXFJZ84vdn32ArpdfB
Kamino USDC Vault: A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK
```

### Kamino 相关
```
Kamino Program:    KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD
Kamino USDC Vault: A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK
```

---

## 📞 获取帮助

### 查看命令列表
```bash
# 查看所有可用命令
npm run script --help

# 查看特定命令帮助
npm run script <command> --help
```

### 查询配置状态
```bash
# 查询 GlobalState 和费用配置
npx ts-node query-global-state.ts

# 查询特定账户
solana account <ADDRESS>

# 查询账户余额
solana balance <ADDRESS>
```

### 交易验证
```bash
# 在 Solscan 上查看交易
https://solscan.io/tx/<SIGNATURE>

# 使用 Solana CLI 查看
solana confirm <SIGNATURE>

# 查看交易日志
solana logs --url mainnet
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目总体说明
- [BUILD_DEPLOY.md](./BUILD_DEPLOY.md) - 构建和部署指南
- [PLATFORM_FEE_GUIDE.md](./PLATFORM_FEE_GUIDE.md) - 平台费配置指南
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 环境设置指南

---

## 📊 命令分类汇总

### 初始化命令 (1 个)
- `init` - 初始化 GlobalState

### 管理员管理 (2 个)
- `change-admin` - 提名新管理员
- `accept-authority` - 接受管理员权限

### Vault 管理 (2 个)
- `initialize-vault` ⭐ - 初始化新 Vault
- `update-vault-platform-fee` - 更新平台费率

### 全局配置 (2 个)
- `update-global-state-params` - 更新全局参数
- `set-target-chain-min-fee` - 设置跨链最小费用

### 费用配置 (3 个)
- `set-fee-tiers` ⭐ - 设置交易费用等级
- `set-insurance-fee-tiers` - 设置保险费用等级
- `set-protocol-fee-fraction` ⭐ - 设置协议费用

### 费用提取 (2 个)
- `claim-fees` - 提取指定类型费用
- `claim-all-fees` - 提取所有费用

### 工具命令 (1 个)
- `get-jito-tip` - 查询 Jito tip

**总计：13 个命令** (其中 3 个为主网部署必备 ⭐)

---

## 🎉 快速开始

### 全新主网部署（5 分钟）
```bash
# 1. 初始化 GlobalState
npm run script init --keypair phantom-wallet.json

# 2. 配置费用
npm run script set-fee-tiers --keypair phantom-wallet.json
npm run script set-protocol-fee-fraction -n 1 -d 100 --keypair phantom-wallet.json

# 3. 初始化 Vault
npm run script initialize-vault \
  --keypair phantom-wallet.json \
  --vault_id A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  --base_token_mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --shares_mint BuriTezg7onbXBKGEpU3ZxsdvGNXFJZ84vdn32ArpdfB \
  --fee_bps 2500

# 4. 验证配置
npx ts-node query-global-state.ts
```

✅ 完成！您的 Mars 合约已在主网上线！
