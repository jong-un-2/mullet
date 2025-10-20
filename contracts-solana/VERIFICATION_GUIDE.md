# Solana 合约验证和 IDL 发布指南

本指南介绍如何验证 Mars Protocol 合约并发布 IDL 到链上，使合约在区块链浏览器上显示"已验证"状态。

## 📋 目录

1. [安装验证工具](#1-安装验证工具)
2. [发布 IDL 到链上](#2-发布-idl-到链上)
3. [验证合约代码](#3-验证合约代码)
4. [在浏览器上查看](#4-在浏览器上查看)

---

## 1. 安装验证工具

### 1.1 安装系统依赖

`solana-verify` 依赖 OpenSSL，需要先安装系统依赖：

**macOS:**

```bash
# 方法 1: 使用 Homebrew（推荐）
brew install pkg-config openssl@3

# 方法 2: 如果没有 Homebrew，使用 MacPorts
sudo port install pkgconfig openssl

# 方法 3: 手动设置环境变量（使用系统 LibreSSL）
export PKG_CONFIG_PATH="/usr/local/opt/openssl@3/lib/pkgconfig"
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get update
sudo apt-get install pkg-config libssl-dev
```

**Linux (CentOS/RHEL/Fedora):**

```bash
sudo yum install pkgconfig openssl-devel
# 或
sudo dnf install pkgconfig openssl-devel
```

### 1.2 安装 Solana Verify CLI

```bash
cargo install solana-verify
```

**如果遇到 OpenSSL 错误：**

```bash
# macOS: 设置 OpenSSL 路径后重试
export OPENSSL_DIR="/opt/homebrew/opt/openssl@3"  # Apple Silicon
# 或
export OPENSSL_DIR="/usr/local/opt/openssl@3"     # Intel Mac

# 然后重新安装
cargo install solana-verify
```

### 1.3 验证安装

```bash
solana-verify --version
```

---

## 2. 发布 IDL 到链上

### 2.1 生成 IDL 文件

首先确保已经构建了合约：

```bash
anchor build
```

这会在 `target/idl/` 目录生成 IDL 文件。

### 2.2 上传 IDL 到链上

**初次上传 IDL：**

```bash
anchor idl init -f target/idl/mars.json <PROGRAM_ID>
```

**更新现有 IDL：**

```bash
anchor idl upgrade -f target/idl/mars.json <PROGRAM_ID>
```

**示例（使用我们的 Program ID）：**

```bash
# 初次上传
anchor idl init -f target/idl/mars.json 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5

# 更新 IDL
anchor idl upgrade -f target/idl/mars.json 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

### 2.3 从链上下载 IDL（验证上传）

```bash
# 下载到指定路径
anchor idl fetch -o ./downloaded-idl.json <PROGRAM_ID>

# 下载我们的合约 IDL
anchor idl fetch -o ./downloaded-idl.json 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

### 2.4 删除链上 IDL（如需要）

```bash
anchor idl close <PROGRAM_ID>
```

---

## 3. 验证合约代码

### 3.1 本地验证构建

使用 Docker 进行可验证构建：

```bash
# 确保 Docker 正在运行
docker --version

# 执行可验证构建
anchor build --verifiable
```

### 3.2 远程验证

使用 `solana-verify` 工具验证 GitHub 仓库中的代码：

```bash
solana-verify verify-from-repo \
  --remote \
  --program-id 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5 \
  --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" \
  https://github.com/jong-un-1/mars \
  --library-name mars \
  --mount-path contracts-solana
```

**参数说明：**
- `--remote`: 使用远程构建（在云端构建）
- `--program-id`: 您的程序 ID
- `--url`: Helius RPC URL（推荐使用）
- `--library-name`: Cargo.toml 中的包名
- `--mount-path`: 合约代码在仓库中的路径

### 3.3 验证已部署的程序

```bash
# 验证主网程序
solana-verify verify-from-repo \
  --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" \
  --program-id 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5 \
  https://github.com/jong-un-1/mars \
  --library-name mars \
  --mount-path contracts-solana

# 验证开发网程序
solana-verify verify-from-repo \
  --url https://api.devnet.solana.com \
  --program-id 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5 \
  https://github.com/jong-un-1/mars \
  --library-name mars \
  --mount-path contracts-solana
```

### 3.4 获取程序哈希

验证本地构建的程序哈希：

```bash
solana-verify get-program-hash target/deploy/mars.so
```

获取链上程序哈希：

```bash
solana-verify get-program-hash \
  --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" \
  5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

两个哈希应该匹配，证明链上代码与源代码一致。

---

## 4. 在浏览器上查看

### 4.1 支持的浏览器

验证后，您的合约将在以下浏览器上显示"已验证"状态：

#### Solana.fm
```
https://solana.fm/address/5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5?cluster=mainnet-alpha
```

#### Solscan
```
https://solscan.io/account/5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

#### SolanaFM Explorer
```
https://explorer.solana.com/address/5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

### 4.2 验证程序 API

查询已验证程序列表：

```bash
# 查看 Otter Sec 的验证程序 API
curl https://verify.osec.io/status/5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

API 仓库：https://github.com/otter-sec/solana-verified-programs-api

---

## 5. 完整验证流程

### 步骤 1：构建合约

```bash
cd contracts-solana
anchor build
```

### 步骤 2：部署合约

```bash
# 部署到开发网
anchor deploy --provider.cluster devnet

# 部署到主网
anchor deploy --provider.cluster mainnet
```

### 步骤 3：上传 IDL

```bash
anchor idl init -f target/idl/mars.json 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5
```

### 步骤 4：执行可验证构建

```bash
anchor build --verifiable
```

### 步骤 5：验证程序

```bash
solana-verify verify-from-repo \
  --remote \
  --program-id 5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5 \
  --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" \
  https://github.com/jong-un-1/mars \
  --library-name mars \
  --mount-path contracts-solana
```

### 步骤 6：检查验证状态

访问 Solana.fm 或 Solscan 查看"已验证"徽章。

---

## 6. 常见问题

### Q1: 验证失败，哈希不匹配？

确保使用相同的代码版本和构建环境：

```bash
# 1. 检查本地和链上的哈希
solana-verify get-program-hash target/deploy/mars.so
solana-verify get-program-hash --url <RPC_URL> <PROGRAM_ID>

# 2. 如果不匹配，重新部署程序
anchor build
anchor upgrade target/deploy/mars.so --program-id <ID>

# 3. 重新验证
solana-verify verify-from-repo --remote --program-id <ID> ...
```

### Q2: IDL 上传失败？

确保钱包有足够的 SOL 支付交易费用：

```bash
solana balance
solana airdrop 1  # 开发网
```

### Q3: 验证构建失败？

检查 Anchor 版本是否匹配：

```bash
anchor --version
# 应该匹配项目中的版本
```

### Q4: 如何更新已验证的程序？

1. 更新代码并提交到 GitHub
2. 重新构建：`anchor build --verifiable`
3. 升级程序：`anchor upgrade target/deploy/mars.so --program-id <ID>`
4. 更新 IDL：`anchor idl upgrade -f target/idl/mars.json <ID>`
5. 重新验证：再次运行 `solana-verify verify-from-repo`

---

## 7. 参考资源

- **Anchor 文档**: https://www.anchor-lang.com/
- **Solana Verify**: https://github.com/Ellipsis-Labs/solana-verifiable-build
- **验证程序 API**: https://github.com/otter-sec/solana-verified-programs-api
- **Solana.fm**: https://solana.fm/
- **Solscan**: https://solscan.io/

---

## 8. 项目信息

- **Program ID**: `5QctE8ENPTdeYBkBUrWcVYGQMQZtRqBFKEfQF6CZyvh5`
- **仓库**: https://github.com/jong-un-1/mars
- **合约路径**: `contracts-solana`
- **程序名称**: `mars`
- **部署时间**: 2025-10-20
- **RPC**: Helius (https://mainnet.helius-rpc.com)

---

## 9. 快速命令参考

```bash
# 构建
anchor build
anchor build --verifiable

# IDL 管理
anchor idl init -f target/idl/mars.json <PROGRAM_ID>
anchor idl upgrade -f target/idl/mars.json <PROGRAM_ID>
anchor idl fetch -o ./idl.json <PROGRAM_ID>

# 验证
solana-verify verify-from-repo --remote \
  --program-id <PROGRAM_ID> \
  --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" \
  https://github.com/jong-un-1/mars \
  --library-name mars \
  --mount-path contracts-solana

# 获取哈希
solana-verify get-program-hash target/deploy/mars.so
solana-verify get-program-hash --url "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY" <PROGRAM_ID>
```

---

**祝您验证顺利！如有问题，欢迎提 Issue。** 🚀
