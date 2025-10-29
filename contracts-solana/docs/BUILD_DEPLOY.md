# Mars 合约编译与部署完整指南

## 📋 目录
- [项目概述](#项目概述)
- [前置条件](#前置条件)
- [钱包配置](#钱包配置)
- [编译构建](#编译构建)
- [部署流程](#部署流程)
- [部署后配置](#部署后配置)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

---

## 项目概述

### Mars Vault - 多协议收益聚合器

Mars Vault 是一个基于 Solana 的多协议收益聚合器，作为用户和多个 DeFi 协议之间的代理，通过智能路由和再平衡机制最大化用户收益。

#### 核心特性

- 🔄 **多协议集成**: 支持 Kamino、Jupiter、Jito 等主流协议
- 💱 **智能兑换**: 集成 Jupiter 进行最优路由兑换
- ⚖️ **自动再平衡**: 根据市场条件自动调整资产配置
- 💰 **收益优化**: 通过分散投资最大化收益率
- 🛡️ **风险管理**: 滑点保护和紧急暂停机制

#### 技术架构

```
用户 → Mars Vault → [Kamino/Jupiter/其他协议] → 收益生成
         ↕️
    Jupiter 兑换聚合器
```

#### 当前版本信息

**主网部署 (V3)**
- **程序ID**: `AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8`
- **网络**: Solana Mainnet Beta
- **部署时间**: 2025-10-01 21:45
- **程序大小**: 494KB (506,000 bytes)
- **新特性**: 
  - ✨ 支持 Token-2022 (可处理 PYUSD 等新型代币)
  - ✨ 支持 Kamino Vault remaining_accounts (reserves + lending markets)
  - ✨ 重命名为 KaminoDepositCPI（更简洁的命名）

**Kamino 集成**
- **Kamino Vault 程序ID (V2)**: `KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd`
- **Klend 程序ID**: `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`
- **集成功能**: 
  - ✅ kamino_deposit - 存款到任意Kamino Vault
  - ✅ kamino_withdraw - 从任意Kamino Vault取款
  - ✅ 支持所有Kamino V2 vaults (USDC, PYUSD, SOL等)
  - ✅ 支持 Token-2022 程序

---

## 前置条件

### 1. 系统要求

- **操作系统**: macOS, Linux, 或 WSL2 (Windows)
- **RAM**: 至少 8GB
- **磁盘空间**: 至少 10GB 可用空间

### 2. 安装依赖

#### 安装 Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update
```

#### 安装 Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 验证安装
solana --version
```

#### 安装 Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# 验证安装
anchor --version
```

#### 安装 Node.js 和 Yarn
```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 安装 Yarn
npm install -g yarn

# 验证安装
node --version
yarn --version
```

### 3. 资金要求

- **Devnet**: 可通过 Airdrop 获得测试 SOL
- **Mainnet**: 建议准备 4-5 SOL 用于部署

---

## 钱包配置

### 钱包文件说明

#### 主钱包 - recover.json
- **地址**: `CNoytfbY9TDT2sGVG4yvz1pranT2mbahsxjnxdY74gzB`
- **用途**: 主要的开发和部署钱包
- **当前状态**: 已设置为默认钱包
- **余额**: 0 SOL (需要充值)

#### 备用钱包 - recover-2.json  
- **地址**: `43si8unpvF2xVpg4ZKu93B7931Zv9ouZY2WaBPfpEUCs`
- **用途**: 备用钱包，用于备份和紧急情况
- **当前状态**: 待激活
- **余额**: 0 SOL

#### 部署钱包 - recover1.json
- **地址**: `AaZM1f2SKvnZGg8mXqoNJh52vhVFSSWthzGGyoE9qoeg`  
- **用途**: 专用于合约部署和程序管理
- **当前状态**: 待激活
- **余额**: 0 SOL

#### 用户钱包 - user.json (phantom-wallet.json)
- **地址**: `4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w`
- **用途**: 用户测试和交互钱包
- **当前状态**: 已激活 ✅ (主网)
- **余额**: 1.505231796 SOL ✅
- **权限**: Mars 程序升级权限拥有者

#### Mars Admin 钱包 - ~/.config/solana/mars-admin.json
- **地址**: `7hqw1eavxzT3GUidn9yPzaf3HsJ3momzxpRdMxvE2XXW`
- **用途**: Anchor 项目的管理钱包，用于部署和升级合约
- **当前状态**: 已激活 (本地测试网)
- **余额**: 29.99615356 SOL ✅

### 钱包管理命令

#### 生成新钱包
```bash
# 生成新的钱包文件
solana-keygen new -o ./my-wallet.json

# 生成不带助记词的钱包（部署专用）
solana-keygen new -o ./deploy-wallet.json --force --no-bip39-passphrase
```

#### 切换钱包
```bash
# 切换到主钱包
solana config set --keypair recover.json

# 切换到备用钱包  
solana config set --keypair recover-2.json

# 切换到部署钱包
solana config set --keypair recover1.json

# 切换到用户钱包
solana config set --keypair user.json
```

#### 查看钱包信息
```bash
# 查看当前钱包地址
solana address

# 查看钱包余额
solana balance

# 查看所有钱包地址
solana-keygen pubkey recover.json
solana-keygen pubkey recover-2.json  
solana-keygen pubkey recover1.json
solana-keygen pubkey user.json
```

#### 充值建议
- **主钱包**: 建议保持 1-2 SOL 用于日常开发
- **备用钱包**: 建议保持 0.5 SOL 作为备用
- **部署钱包**: 根据部署需求充值 (合约部署通常需要 4-5 SOL)

### 安全提示

⚠️ **重要**: 这些钱包文件包含私钥，请妥善保管！

- ✅ 定期备份到安全位置
- ✅ 不要提交到 git 仓库（已在 .gitignore 中）
- ✅ 不要在不安全的网络环境中使用
- ✅ 考虑使用硬件钱包进行大额操作

---

## 编译构建

### 1. 克隆项目

```bash
git clone <repository-url>
cd mars-projects/contracts-solana
```

### 2. 安装依赖

```bash
# 安装 Node.js 依赖
yarn install

# 或使用 npm
npm install
```

### 3. 配置网络

#### Mainnet 配置
```bash
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
solana config set --keypair ./user.json
```

#### Devnet 配置
```bash
solana config set --url https://api.devnet.solana.com
solana config set --keypair ./deploy-wallet.json
```

#### 检查配置
```bash
solana config get
```

输出示例：
```
Config File: /Users/username/.config/solana/cli/config.yml
RPC URL: https://mainnet.helius-rpc.com/?api-key=xxx
WebSocket URL: wss://mainnet.helius-rpc.com/?api-key=xxx (computed)
Keypair Path: ./user.json
Commitment: confirmed
```

### 4. 编译合约

```bash
# 清理之前的构建
anchor clean

# 编译程序
anchor build

# 验证编译输出
ls -lh target/deploy/mars.so
```

**预期输出：**
```
-rw-r--r--  1 user  staff   494K  target/deploy/mars.so
```

### 5. 运行测试

```bash
# 运行所有测试
anchor test

# 只运行编译测试（不部署）
anchor test --skip-deploy

# 运行特定测试文件
anchor test tests/mars.ts
```

### 6. 生成 TypeScript 类型

```bash
# 编译后会自动生成
# 文件位置: target/types/mars.ts

# 手动生成 IDL
anchor idl init --filepath target/idl/mars.json <PROGRAM_ID>
```

---

## 部署流程

### 部署到 Devnet

#### 步骤 1: 准备钱包

```bash
# 切换到 devnet
solana config set --url https://api.devnet.solana.com

# 设置钱包
solana config set --keypair ./deploy-wallet.json

# 请求 Airdrop (devnet)
solana airdrop 2

# 检查余额
solana balance
```

#### 步骤 2: 生成程序密钥对

```bash
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase
```

**说明：**
- `--force`: 强制覆盖已存在的文件
- `--no-bip39-passphrase`: 不使用 BIP39 助记词（简化部署）

#### 步骤 3: 部署程序

```bash
anchor deploy --provider.cluster devnet
```

**或使用 Solana CLI：**
```bash
solana program deploy ./target/deploy/mars.so \
  --program-id ./target/deploy/mars-keypair.json \
  --url https://api.devnet.solana.com
```

### 部署到 Mainnet

#### 步骤 1: 检查钱包余额

```bash
# 切换到 mainnet
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# 设置钱包
solana config set --keypair ./user.json

# 检查余额（至少需要 4-5 SOL）
solana balance
```

**确保余额充足！**
- 程序部署: ~3.5 SOL
- 交易费用: ~0.5-1 SOL
- 建议余额: ≥ 4 SOL

#### 步骤 2: 生成程序密钥对

```bash
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase
```

#### 步骤 3: 部署到主网

```bash
solana program deploy ./target/deploy/mars.so \
  --program-id ./target/deploy/mars-keypair.json \
  --max-sign-attempts 20 2>&1
```

**参数说明：**
- `--program-id`: 指定程序密钥对文件
- `--max-sign-attempts 20`: 最大签名尝试次数（避免网络问题导致失败）
- `2>&1`: 重定向错误输出到标准输出

**预期输出：**
```
Deploying... This may take a while.
Deployment successful. Program Id: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

#### 步骤 4: 清理旧的 Buffer（可选）

如果之前部署失败留下了 buffer，可以关闭它们回收 SOL：

```bash
# 查看所有 buffer
solana program show --buffers

# 关闭特定 buffer
solana program close <BUFFER_ADDRESS> --bypass-warning
```

**示例：**
```bash
solana program close EAxbozKaq9BmPdUwNhXPMMC7UUswTb8A9tbpVrSMaur7 --bypass-warning
```

**批量关闭所有 buffer：**
```bash
solana program show --buffers | grep -v "Buffer Address" | awk '{print $1}' | xargs -I {} solana program close {} --bypass-warning
```

---

## 部署后配置

部署成功后，需要更新项目中的程序 ID。

### 步骤 1: 获取新的程序 ID

```bash
solana-keygen pubkey ./target/deploy/mars-keypair.json
```

**输出示例：**
```
AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

### 步骤 2: 更新配置文件

假设新程序 ID 为 `AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8`：

#### a. `Anchor.toml`

```toml
[programs.mainnet]
mars = "AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8"

[programs.devnet]
mars = "AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8"

[programs.localnet]
mars = "AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8"
```

#### b. `programs/mars/src/lib.rs`

```rust
use anchor_lang::prelude::*;

declare_id!("AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8");

#[program]
pub mod mars {
    use super::*;
    // ... 程序代码
}
```

#### c. `constants.ts`

```typescript
import { PublicKey } from "@solana/web3.js";

export const MARS_PROGRAM_ID = new PublicKey(
  "AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8"
);
```

#### d. `backend/container_src/src/lib.rs` (如果存在)

```rust
// Mars Program ID
const MARS_PROGRAM_ID: &str = "AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8";
```

### 步骤 3: 重新构建

```bash
# 清理旧的构建
anchor clean

# 重新编译
anchor build

# 验证 IDL
cat target/idl/mars.json | jq '.metadata.address'
```

**预期输出：**
```
"AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8"
```

### 步骤 4: 上传 IDL 到链上（推荐）

```bash
# 初始化 IDL
anchor idl init \
  --filepath target/idl/mars.json \
  AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8

# 或更新已存在的 IDL
anchor idl upgrade \
  --filepath target/idl/mars.json \
  AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

### 步骤 5: Mainnet 初始化和配置

部署程序到主网后，需要初始化全局状态、配置 vault、设置费率等。

#### a. 初始化全局状态

```bash
npm run script init -- \
  --env mainnet \
  --keypair ./phantom-wallet.json \
  --rpc "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
```

**输出示例：**
```
Global State PDA: 8MLg352JHqDZPffN4aWTND6qXrGWGh9Jm1EcHJgShDGh
Transaction: 3uoVeBisGg3nBKQ3B22pagJ4iP2VyYBqkx9qWqQTkBLt...
```

**说明：**
- 初始化全局状态账户
- 设置管理员为当前钱包
- 创建 vault 相关的 ATA 账户

#### b. 初始化 Vault

```bash
npm run script initialize-vault -- \
  --env mainnet \
  --keypair ./phantom-wallet.json \
  --rpc "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3" \
  -v A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  -b 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -s HrDJX7DZL86K6DYvDNHPXrkkGEEoZ91tNT6o1cPLXs78 \
  -f 2500
```

**参数说明：**
- `-v`: Vault ID (唯一标识符)
- `-b`: Base Token Mint (基础代币，如 PYUSD)
- `-s`: Shares Mint (份额代币)
- `-f`: Platform Fee (平台费率，2500 bps = 25%)

**输出示例：**
```
Vault State PDA: 9VLG4w2QXMmRpxpogXQueQhHVCSjdQNU1gxa4v3LipJm
Vault Treasury PDA: 6fnfS8pTME9HPoj3WycWst4DFVCN1EK5ZdbithJdK5sH
Transaction: 4oJRxu87BjL571DxEXAQEzXAVv9Fzc5wNN1mweuaGdfj...
```

#### c. 设置费率层级

```bash
npm run script set-fee-tiers -- \
  --env mainnet \
  --keypair ./phantom-wallet.json \
  --rpc "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
```

**默认费率配置：**
- 0-100: 3 bps (0.03%)
- 100-1000: 2 bps (0.02%)
- 1000+: 1 bps (0.01%)

**输出示例：**
```
Transaction: 5D5Hanc1oh5xtCdT6EvW6knRTLb4vuUQsiwCSbbeZkZB...
```

#### d. 设置协议费率

```bash
npm run script set-protocol-fee-fraction -- \
  --env mainnet \
  --keypair ./phantom-wallet.json \
  --rpc "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3" \
  -n 1 \
  -d 100
```

**参数说明：**
- `-n`: 分子 (numerator)
- `-d`: 分母 (denominator)
- 费率 = n/d = 1/100 = 1%

**输出示例：**
```
Transaction: 4uvDWuyGEYbhsqpu7eK3KLBougkqMQ6d5jLnYL9jS8Na...
```

#### e. 更新平台费用钱包

```bash
npm run script update-platform-fee-wallet -- \
  --env mainnet \
  --keypair ./phantom-wallet.json \
  --rpc "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3" \
  -w A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6
```

**参数说明：**
- `-w`: 新的平台费用钱包地址

**输出示例：**
```
Transaction: 4mQPr3ZDaPTHAsCKTmvRMUoHRijXBqX8p9qB3h6DooWU...
Platform Fee Wallet: A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6
```

#### 完整初始化脚本

创建一个 bash 脚本 `initialize-mainnet.sh` 来自动化所有步骤：

```bash
#!/bin/bash

RPC_URL="https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"
KEYPAIR="./phantom-wallet.json"

echo "🚀 开始 Mainnet 初始化..."

# 1. 初始化全局状态
echo "📝 步骤 1: 初始化全局状态"
npm run script init -- --env mainnet --keypair $KEYPAIR --rpc "$RPC_URL"

# 2. 初始化 Vault
echo "📝 步骤 2: 初始化 Vault"
npm run script initialize-vault -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -v A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK \
  -b 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -s HrDJX7DZL86K6DYvDNHPXrkkGEEoZ91tNT6o1cPLXs78 \
  -f 2500

# 3. 设置费率层级
echo "📝 步骤 3: 设置费率层级"
npm run script set-fee-tiers -- --env mainnet --keypair $KEYPAIR --rpc "$RPC_URL"

# 4. 设置协议费率
echo "📝 步骤 4: 设置协议费率"
npm run script set-protocol-fee-fraction -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -n 1 \
  -d 100

# 5. 更新平台费用钱包
echo "📝 步骤 5: 更新平台费用钱包"
npm run script update-platform-fee-wallet -- \
  --env mainnet \
  --keypair $KEYPAIR \
  --rpc "$RPC_URL" \
  -w A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6

echo "✅ Mainnet 初始化完成！"
```

**使用方法：**
```bash
chmod +x initialize-mainnet.sh
./initialize-mainnet.sh
```

---

## 验证部署

### 1. 查看程序信息

```bash
solana program show AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

**输出示例：**
```
Program Id: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
Owner: BPFLoaderUpgradeab1e11111111111111111111111
ProgramData Address: 8kXxxxx...
Authority: 4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w
Last Deployed In Slot: 123456789
Data Length: 506000 (0x7b790) bytes
Balance: 3.52394856 SOL
```

### 2. 查看程序账户余额

```bash
solana balance AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

### 3. 在 Solana Explorer 查看

**Mainnet:**
```
https://explorer.solana.com/address/AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8?cluster=mainnet
```

**Devnet:**
```
https://explorer.solana.com/address/AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8?cluster=devnet
```

**Solscan:**
```
https://solscan.io/account/AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

### 4. 测试程序调用

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mars } from "./target/types/mars";

// 初始化连接
const connection = new anchor.web3.Connection(
  "https://api.mainnet-beta.solana.com"
);

const wallet = anchor.Wallet.local();
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const program = anchor.workspace.Mars as Program<Mars>;

// 测试调用
const tx = await program.methods
  .initialize()
  .accounts({
    // ... 账户列表
  })
  .rpc();

console.log("Transaction signature:", tx);
```

---

## 常见问题

### 1. 部署失败：余额不足

**错误信息：**
```
Error: Account <address> has insufficient funds for spend
```

**解决方案：**
- 检查钱包余额: `solana balance`
- 转入更多 SOL 到钱包
- 或先关闭旧的 buffer 回收 SOL

### 2. 部署超时

**错误信息：**
```
Error: Transaction was not confirmed in 60.00 seconds
```

**解决方案：**
- 增加 `--max-sign-attempts` 参数值
- 检查网络连接
- 稍后重试
- 使用更可靠的 RPC（如 Helius）

### 3. 程序已存在

**错误信息：**
```
Error: Program <ID> has been closed, use a new Program Id
```

**解决方案：**
- 生成新的程序密钥对（步骤 1）
- 使用新的程序 ID 重新部署

### 4. 编译错误

**错误信息：**
```
error: could not compile `mars`
```

**解决方案：**
```bash
# 清理构建缓存
anchor clean
cargo clean

# 更新依赖
cargo update

# 重新构建
anchor build
```

### 5. IDL 不匹配

**错误信息：**
```
Error: IDL does not match deployed program
```

**解决方案：**
```bash
# 更新链上 IDL
anchor idl upgrade \
  --filepath target/idl/mars.json \
  AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
```

### 6. 权限不足

**错误信息：**
```
Error: Insufficient permissions to upgrade program
```

**解决方案：**
- 确认当前钱包是程序的 upgrade authority
- 检查钱包配置: `solana config get`
- 切换到正确的管理员钱包

### 7. 网络配置错误

**错误信息：**
```
Error: Connection refused
```

**解决方案：**
```bash
# 检查 RPC URL
solana config get

# 设置正确的 RPC
solana config set --url https://api.mainnet-beta.solana.com
```

---

## 快速参考命令

### 完整部署流程（一键命令）

```bash
# Devnet 部署
solana config set --url https://api.devnet.solana.com && \
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase && \
anchor build && \
anchor deploy --provider.cluster devnet

# Mainnet 部署
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY && \
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase && \
anchor build && \
solana program deploy ./target/deploy/mars.so --program-id ./target/deploy/mars-keypair.json --max-sign-attempts 20
```

### 查看程序 ID

```bash
solana-keygen pubkey ./target/deploy/mars-keypair.json
```

### 清理所有 Buffer

```bash
solana program show --buffers | grep -v "Buffer Address" | awk '{print $1}' | xargs -I {} solana program close {} --bypass-warning
```

### 升级已部署的程序

```bash
# 编译新版本
anchor build

# 升级程序
solana program deploy ./target/deploy/mars.so \
  --program-id ./target/deploy/mars-keypair.json \
  --upgrade-authority ./user.json
```

---

## 开发工作流程

### 本地开发

```bash
# 1. 启动本地验证器
solana-test-validator

# 2. 在新终端部署到本地
anchor deploy --provider.cluster localnet

# 3. 运行测试
anchor test --skip-local-validator

# 4. 查看日志
solana logs
```

### Devnet 测试

```bash
# 1. 切换到 devnet
solana config set --url https://api.devnet.solana.com

# 2. 请求 airdrop
solana airdrop 2

# 3. 部署
anchor deploy --provider.cluster devnet

# 4. 测试
anchor test --skip-deploy --provider.cluster devnet
```

### Mainnet 部署

```bash
# 1. 切换到 mainnet
solana config set --url https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# 2. 检查余额
solana balance

# 3. 部署
solana program deploy ./target/deploy/mars.so \
  --program-id ./target/deploy/mars-keypair.json \
  --max-sign-attempts 20

# 4. 验证
solana program show <PROGRAM_ID>
```

---

## 版本更新历史

### V3 (2025-10-01 21:45) - Current ✅
- **程序ID**: `AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8`
- **新特性**: 
  - ✨ 支持 Kamino Vault remaining_accounts
  - ✨ 重命名为 KaminoDepositCPI
- **升级说明**: 从 V2 升级，关闭旧程序回收 3.52 SOL

### V2 (2025-10-01 20:30) - Deprecated
- **程序ID**: `BFw4j7oRUpS19jGfnTSw9HiW4MVyKh1z1U2dvh7CtLN9`
- **新特性**: 
  - ✨ 支持 Token-2022 程序
  - ✨ PYUSD 等新型代币支持
- **状态**: 已关闭，租金已回收

### V1 (2025-10-01 19:50) - Deprecated
- **程序ID**: `FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY`
- **新特性**: 
  - ✨ 更新为 Kamino V2 程序ID
  - ✨ 修复 deposit discriminator
- **状态**: 已关闭，租金已回收

---

## 相关资源

### 官方文档
- **Anchor 文档**: https://www.anchor-lang.com/docs
- **Solana 文档**: https://docs.solana.com
- **Kamino 文档**: https://docs.kamino.finance

### 浏览器工具
- **Solana Explorer**: https://explorer.solana.com
- **Solscan**: https://solscan.io
- **SolanaFM**: https://solana.fm

### RPC 提供商
- **Helius**: https://helius.xyz
- **QuickNode**: https://quicknode.com
- **Alchemy**: https://alchemy.com

### 社区支持
- **GitHub**: https://github.com/mars-protocol/mars-vault
- **Discord**: https://discord.gg/marsprotocol
- **Twitter**: @MarsProtocol

---

## 总结

通过本指南，你已经学会了：

✅ **环境配置**: 安装所有必需的工具和依赖  
✅ **钱包管理**: 生成、配置和管理多个钱包  
✅ **编译构建**: 编译 Anchor 程序并生成类型  
✅ **部署流程**: 部署到 Devnet 和 Mainnet  
✅ **配置更新**: 更新项目中的程序 ID  
✅ **验证测试**: 验证部署并测试程序功能  
✅ **问题排查**: 解决常见的部署问题  

🚀 现在你可以开始部署你的 Mars Vault 合约了！

**下一步:**
1. 查看 [CLI_COMMANDS.md](./CLI_COMMANDS.md) 学习如何使用 CLI 工具
2. 查看 [PROGRAM.md](./PROGRAM.md) 了解合约架构和功能
3. 查看 [PLATFORM_FEE_GUIDE.md](./PLATFORM_FEE_GUIDE.md) 配置平台费率

祝你部署顺利！🎉
