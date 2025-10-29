# Solana 合约验证和 IDL 发布指南

本指南介绍如何验证 Mars Protocol 合约并发布 IDL 到链上，使合约在区块链浏览器上显示"已验证"状态。

> ✅ **验证成功！** 我们的程序已通过 Otter Sec 的远程验证。
> - Program ID: `G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy`
> - 验证状态: https://verify.osec.io/status/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
> - GitHub Commit: `dd9283035f6f2a0660e7c2959c68f9d516b18841`
> - 验证时间: 2025-10-29
> - On-chain Hash: `79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be`

## 📋 目录

1. [前置条件](#1-前置条件)
2. [可验证构建](#2-可验证构建)
3. [部署程序](#3-部署程序)
4. [远程验证](#4-远程验证)
5. [发布 IDL 到链上](#5-发布-idl-到链上)
6. [上传安全元数据](#6-上传安全元数据)
7. [在浏览器上查看](#7-在浏览器上查看)
8. [最佳实践](#8-最佳实践)
9. [常见问题 FAQ](#9-常见问题-faq)
10. [参考资料](#10-参考资料)
11. [快速命令参考](#11-快速命令参考)

---

## 1. 前置条件

### 1.1 安装必要工具

#### 安装 Solana Verify CLI

```bash
cargo install solana-verify
```

验证安装：

```bash
solana-verify --version
```

#### 安装 OpenSSL 和 pkg-config

Docker 构建需要 OpenSSL 和 pkg-config：

**macOS (使用 Homebrew)：**

```bash
brew install pkg-config openssl@3
```

**Linux (Ubuntu/Debian)：**

```bash
sudo apt-get update
sudo apt-get install pkg-config libssl-dev
```

### 1.2 配置 Docker 代理（中国大陆用户）

如果使用 OrbStack 且需要通过代理拉取 Docker 镜像：

```bash
# 创建或编辑 OrbStack 配置
mkdir -p ~/.orbstack/config
cat > ~/.orbstack/config/docker.json << 'EOF'
{
  "proxies": {
    "http-proxy": "http://127.0.0.1:7890",
    "https-proxy": "http://127.0.0.1:7890"
  }
}
EOF

# 重启 OrbStack
orb restart -a
```

### 1.3 准备 Cargo.lock

**重要！** 可验证构建需要 `Cargo.lock` 文件：

```bash
# 在项目根目录生成 Cargo.lock
cd contracts-solana
cargo generate-lockfile

# 确保 Cargo.lock 不被 gitignore
# 编辑 .gitignore，注释掉根目录的 Cargo.lock
```

修改 `.gitignore`:

```gitignore
# ==================== 
# Rust specific
# ====================
# Cargo.lock is needed for verifiable builds
# !Cargo.lock
!programs/*/Cargo.lock
```

---

## 2. 可验证构建

### 2.1 使用 Docker 构建

**重要！** 必须使用 Docker 构建才能保证可重现性。普通的 `anchor build` **不是**可重现构建。

```bash
cd contracts-solana

# 使用 solana-verify 进行 Docker 构建（不需要指定 --library-name）
solana-verify build .

# 构建完成后检查哈希
sha256sum target/deploy/mars.so
```

**构建时间：** 约 2-5 分钟（首次构建需要下载 Docker 镜像）

### 2.2 验证构建产物

构建成功后，你会看到：

```
Finished building program
Program Solana version: v2.3.0
Docker image Solana version: v2.3.0
```

检查文件和哈希：

```bash
ls -lh target/deploy/mars.so
# -rwxr-xr-x  1 user  staff   557K Oct 29 23:29 target/deploy/mars.so

sha256sum target/deploy/mars.so
# 397f9743e737522b8c5b1fe4d2395f2b6b540fff06eb01a873250f124cc82f4d  target/deploy/mars.so
```

**重要提示：**
- Docker 构建的哈希是固定的，每次构建结果相同
- `anchor build` 的哈希每次都不同，不可用于验证

---

## 3. 部署到 Mainnet

### 3.1 准备工作

确保：
1. Docker 构建已完成
2. 有足够的 SOL（约 4 SOL 用于部署）
3. 钱包配置正确

```bash
# 检查余额
solana balance

# 检查网络
solana config get
# RPC URL: https://api.mainnet-beta.solana.com
```

### 3.2 两步部署方法（推荐）

分两步部署更可靠，可以避免网络拥堵导致的失败：

#### 步骤 1: 写入缓冲区

```bash
solana program write-buffer target/deploy/mars.so
```

成功后会显示：

```
Buffer: 6sEyK4qwdQzug634EoGNiz1N5R9ofuRmFag9L6tRdvvP
```

#### 步骤 2: 从缓冲区部署

```bash
solana program deploy \
  --buffer 6sEyK4qwdQzug634EoGNiz1N5R9ofuRmFag9L6tRdvvP \
  --program-id target/deploy/mars-keypair.json
```

成功输出：

```
Program Id: G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy

Signature: 2FqS3YeKBVi9gYFwcjyMZSNa3B9RSTmaB5wJYBYdaLu1tVuZLoWouXoX4yQjy6vraS6ry7DF9v7VK62DTAWqFtL5
```

### 3.3 验证部署

部署后验证链上程序的哈希：

```bash
# 下载链上程序
solana program dump G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy deployed-mars.so

# 计算哈希
sha256sum deployed-mars.so
# 397f9743e737522b8c5b1fe4d2395f2b6b540fff06eb01a873250f124cc82f4d

# 与本地构建比较
sha256sum target/deploy/mars.so
# 397f9743e737522b8c5b1fe4d2395f2b6b540fff06eb01a873250f124cc82f4d
```

**✅ 哈希匹配！** 链上程序与本地 Docker 构建完全一致。

### 3.4 故障排除

#### 部署失败

如果部署失败，可能是网络拥堵。可以：

```bash
# 关闭失败的缓冲区回收资金
solana program close <buffer-address>

# 重新尝试两步部署
```

#### 资金不足

如果 SOL 不足，可以关闭旧的程序或缓冲区：

```bash
# 列出所有缓冲区
solana program show --buffers

# 关闭不需要的缓冲区
solana program close <buffer-address>

# 关闭旧程序（谨慎！）
solana program close <old-program-id> --bypass-warning
```

---

## 4. 远程验证

### 4.1 执行远程验证

```bash
cd contracts-solana

solana-verify verify-from-repo \
  --remote \
  -um \
  --program-id G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy \
  https://github.com/jong-un-2/mullet
```

**参数说明：**
- `--remote`: 使用远程构建服务器（verify.osec.io）
- `-u`: 使用默认的 mainnet RPC
- `-m`: 使用默认的 mainnet 集群
- `--program-id`: 你的程序 ID
- 如果合约在子目录，添加：`--mount-path contracts-solana`

### 4.2 验证过程

验证会经过以下步骤：

#### 步骤 1: 检测 Git 提交

```
Commit used for build: dd92830
```

工具会自动检测当前的 Git 提交哈希。

#### 步骤 2: 上传验证参数

```
Do you want to upload the program verification to the Solana Blockchain? (y/n)
```

选择 `y`，然后会将验证参数上传到链上：

```
Uploaded verification params to on-chain PDA
Signature: 4fV8mjkBgrWHVqtKDdi3Cr29ona5WdKGPbXMe4NaCEBAcHRHGRWMnK9B28gut5RaT4wJGDkTx9Db8op5eYcZJyW
```

#### 步骤 3: 创建验证任务

```
Created verification job: 90160950-561f-433f-94ce-2717f6802e5b
```

#### 步骤 4: 远程构建

Otter Sec 的服务器会：
1. 克隆 GitHub 仓库
2. 检出指定的提交
3. 使用 Docker 执行可重现构建
4. 提取可执行代码哈希

```
Verification in progress... ⏳
Building with Docker image: solanafoundation/solana-verifiable-build:2.3.0
[00:04:43]    ✅ Process completed. (Done in 5 minutes)
```

#### 步骤 5: 哈希比对

```
Executable hash: 79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be
On-chain hash:   79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be
```

### 4.3 验证成功 ✅

看到以下输出表示验证成功：

```
Program G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy has been verified. ✅
The provided GitHub build matches the on-chain hash.

On Chain Hash: 79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be
Executable Hash: 79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be
Repo URL: https://github.com/jong-un-2/mullet/tree/dd9283035f6f2a0660e7c2959c68f9d516b18841

Check the verification status at: https://verify.osec.io/status/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

**验证状态页面：**
- URL: https://verify.osec.io/status/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
- GitHub 仓库：jong-un-2/mullet
- 提交哈希：dd92830
- 上传交易：4fV8mjkBgrWHVqtKDdi3Cr29ona5WdKGPbXMe4NaCEBAcHRHGRWMnK9B28gut5RaT4wJGDkTx9Db8op5eYcZJyW
- 任务 ID：90160950-561f-433f-94ce-2717f6802e5b

### 4.4 哈希说明

**为什么有两个不同的哈希值？**

1. **.so 文件哈希（本地 Docker 构建）：**
   ```bash
   sha256sum target/deploy/mars.so
   # 397f9743e737522b8c5b1fe4d2395f2b6b540fff06eb01a873250f124cc82f4d
   ```
   - 这是整个 .so 文件的哈希
   - 包含代码 + 元数据 + 调试信息
   - 用于验证本地构建与链上部署是否一致

2. **可执行代码哈希（验证服务使用）：**
   ```
   79fa6337a7f2c46395eba95ce26ef3afe949976600b340a729a741bce38745be
   ```
   - 这是从 .so 文件中提取的**纯可执行代码段**的哈希
   - 去除了元数据和调试信息
   - 验证服务使用此哈希进行比较
   - 这是真正在链上执行的代码

**验证流程：**
```
本地 .so 文件 (397f9743...)
    ↓ 提取可执行代码
可执行代码 (79fa6337...)
    ↓ 部署到链上
链上程序 (79fa6337...)
    ↓ 远程验证
远程构建 (79fa6337...) ✅ 匹配！
```

### 4.5 验证失败排查

#### 问题 1: 找不到 Cargo.lock

```
Error: Cargo.lock not found at repository root
```

**解决方案：**

Cargo.lock 必须在仓库根目录，并且已提交到 Git。

```bash
# 1. 修改 .gitignore，允许根目录的 Cargo.lock
# 注释掉这一行：
# Cargo.lock

# 2. 生成 Cargo.lock
cargo generate-lockfile

# 3. 提交并推送
git add Cargo.lock .gitignore
git commit -m "feat: Add Cargo.lock for verifiable builds"
git push
```

**验证 Cargo.lock 已提交：**

```bash
git ls-files | grep "^Cargo.lock$"
# 应该输出：Cargo.lock
```

#### 问题 2: 哈希不匹配

```
Error: Executable hash mismatch
Executable hash: abc123...
On-chain hash:   def456...
```

**可能原因：**

1. **使用了 `anchor build` 而不是 `solana-verify build`**
   - `anchor build` 不是可重现构建
   - 每次构建产生不同的哈希
   
   **解决：** 使用 Docker 构建
   ```bash
   solana-verify build .
   ```

2. **代码修改后未重新部署**
   - 本地代码与链上代码不一致
   
   **解决：** 重新部署
   ```bash
   # 先验证本地构建与链上是否一致
   solana program dump <PROGRAM_ID> onchain.so
   sha256sum onchain.so target/deploy/mars.so
   
   # 如果不一致，重新部署
   solana program deploy target/deploy/mars.so --program-id target/deploy/mars-keypair.json
   ```

3. **Cargo.lock 版本不一致**
   - 本地 Cargo.lock 与 Git 上的不同
   
   **解决：** 同步 Cargo.lock
   ```bash
   git pull
   cargo update  # 如果需要更新依赖
   cargo generate-lockfile  # 重新生成
   git add Cargo.lock
   git commit -m "chore: Update Cargo.lock"
   git push
   ```

#### 问题 3: 验证超时

```
Error: Verification timeout
```

**可能原因：**
- 网络连接问题
- 验证服务负载高
- GitHub 仓库访问问题

**解决方案：**

1. 检查网络连接
2. 稍后重试（等待 5-10 分钟）
3. 确保 GitHub 仓库是公开的
4. 使用 `--verbose` 查看详细日志：
   ```bash
   solana-verify verify-from-repo --verbose --remote -um --program-id <PROGRAM_ID> <REPO_URL>
   ```

#### 问题 4: RPC 限流

```
Error: RPC rate limit exceeded
```

**解决方案：**

使用自己的 RPC endpoint：

```bash
solana-verify verify-from-repo \
  --remote \
  -um \
  --url https://your-rpc-endpoint.com \
  --program-id <PROGRAM_ID> \
  <REPO_URL>
```

或者等待几分钟后重试。

---

## 5. 发布 IDL 到链上

### 5.1 生成 IDL 文件

首先确保已经构建了合约：

```bash
anchor build
```

这会在 `target/idl/` 目录生成 IDL 文件。

### 5.2 上传 IDL 到链上

**初次上传 IDL：**

```bash
anchor idl init -f target/idl/mars.json G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

**更新现有 IDL：**

```bash
anchor idl upgrade -f target/idl/mars.json G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

### 5.3 从链上下载 IDL（验证上传）

```bash
# 下载到指定路径
anchor idl fetch -o ./downloaded-idl.json G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

### 5.4 删除链上 IDL（如需要）

```bash
anchor idl close G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

---

## 6. 上传安全元数据

### 6.1 创建 security.json 文件

创建一个包含项目安全信息的 JSON 文件：

```json
{
  "name": "Mars Protocol",
  "description": "A cross-protocol yield aggregation vault on Solana",
  "repository": "https://github.com/jong-un-2/mullet",
  "contacts": {
    "email": "security@mars-protocol.com",
    "discord": "https://discord.gg/mars-protocol"
  },
  "policy": {
    "disclosure": "Please report security vulnerabilities to security@mars-protocol.com",
    "bug_bounty": "Bug bounty program details available in repository"
  },
  "auditors": [],
  "acknowledgements": "Built with Anchor framework"
}
```

### 6.2 上传安全元数据到链上

使用 Solana Program Metadata 工具上传：

```bash
npx @solana-program/program-metadata@latest write security \
  G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy \
  ./security.json
```

成功输出：

```
Writing metadata account...
 ├─ metadata: 54u2wtC2aEemHEmorJieZT7X3WL8sFKk4rnpriyADuE5
 ├─ program: G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
 └─ seed: security

[Success] Operation executed successfully
```

### 6.3 验证安全元数据

从链上读取元数据验证上传成功：

```bash
npx @solana-program/program-metadata@latest fetch security \
  G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

### 6.4 更新安全元数据

如果需要更新元数据，使用 `update` 命令：

```bash
npx @solana-program/program-metadata@latest update security \
  G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy \
  ./security.json
```

### 6.5 安全元数据字段说明

**必填字段：**
- `name`: 项目名称
- `description`: 项目描述

**可选字段：**
- `repository`: GitHub 仓库 URL
- `contacts`: 联系方式（email, discord, twitter 等）
- `policy`: 安全政策
  - `disclosure`: 漏洞披露政策
  - `bug_bounty`: 漏洞赏金计划
- `auditors`: 审计机构列表
- `acknowledgements`: 致谢信息

---

## 7. 在浏览器上查看

### 7.1 Solana Explorer

访问 Solana Explorer 查看已验证的程序：

```
https://explorer.solana.com/address/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

如果验证成功，你会看到：
- ✅ "Verified" 标记
- GitHub 仓库链接
- 提交哈希
- 可以查看源代码

### 7.2 SolScan

```
https://solscan.io/account/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

### 7.3 Otter Sec 验证状态

```
https://verify.osec.io/status/G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy
```

---

## 8. 最佳实践

### 8.1 部署前检查清单

在部署到 mainnet 之前，确保：

- [ ] 使用 `solana-verify build .` 进行 Docker 构建
- [ ] 检查 .so 文件哈希：`sha256sum target/deploy/mars.so`
- [ ] 确保 Cargo.lock 已提交到 Git
- [ ] 代码已推送到 GitHub（确保提交哈希正确）
- [ ] 钱包有足够的 SOL（约 4 SOL）
- [ ] 已配置正确的网络：`solana config get`
- [ ] 测试网测试通过

### 8.2 推荐的完整工作流

```bash
# 1. 编写代码并提交
git add .
git commit -m "feat: Add new feature"
git push

# 2. Docker 构建
cd contracts-solana
solana-verify build .

# 3. 检查哈希
sha256sum target/deploy/mars.so

# 4. 两步部署
solana program write-buffer target/deploy/mars.so
# 记录 buffer 地址
solana program deploy --buffer <buffer> --program-id target/deploy/mars-keypair.json

# 5. 验证部署
solana program dump <PROGRAM_ID> deployed.so
sha256sum deployed.so target/deploy/mars.so  # 应该匹配

# 6. 远程验证
solana-verify verify-from-repo --remote -um --program-id <PROGRAM_ID> https://github.com/your-repo

# 7. 上传 IDL
anchor idl init -f target/idl/mars.json <PROGRAM_ID>
```

### 8.3 版本管理

使用 Git Tags 标记版本：

```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 在验证时引用标签
solana-verify verify-from-repo \
  --remote -um \
  --program-id <PROGRAM_ID> \
  --commit-hash <tag-or-commit> \
  https://github.com/your-repo
```

### 8.4 安全建议

1. **保护私钥**
   - 不要将 keypair.json 提交到 Git
   - 使用硬件钱包管理 upgrade authority
   - 定期备份 keypair

2. **多重签名**
   - 对于生产环境，使用多签钱包作为 upgrade authority
   - 至少 2/3 或 3/5 多签配置

3. **审计**
   - 部署前进行安全审计
   - 使用 `anchor test` 进行全面测试
   - 考虑使用第三方审计服务

### 8.5 故障恢复

如果需要重新开始：

```bash
# 1. 关闭旧程序（回收押金）
solana program close <OLD_PROGRAM_ID> --bypass-warning

# 2. 生成新的程序 ID
solana-keygen new -o target/deploy/mars-keypair.json

# 3. 更新 Anchor.toml 和 lib.rs
# 手动更新 declare_id 和 Anchor.toml 中的 program ID

# 4. 重新构建
solana-verify build .

# 5. 提交更改
git add -A
git commit -m "feat: Update program ID to <NEW_ID>"
git push

# 6. 重新部署和验证
```

---

## 9. 常见问题 (FAQ)

### Q1: 为什么 anchor build 和 solana-verify build 的哈希不同？

**A:** `anchor build` 不是可重现构建。每次构建都会生成不同的哈希，因为：
- 包含时间戳
- 包含构建环境信息
- 优化选项可能不同

**解决方案：** 始终使用 `solana-verify build .` 进行可验证构建。

### Q2: 验证时提示 "Cargo.lock not found"

**A:** solana-verify 需要 Cargo.lock 在仓库根目录。

**解决方案：**
```bash
# 1. 生成 Cargo.lock
cargo generate-lockfile

# 2. 确保 .gitignore 允许 Cargo.lock
# 注释掉：# Cargo.lock

# 3. 提交
git add Cargo.lock .gitignore
git commit -m "chore: Add Cargo.lock for verifiable builds"
git push
```

### Q3: 哈希不匹配怎么办？

**A:** 检查以下几点：

1. 确保使用 Docker 构建：`solana-verify build .`
2. 确保链上程序与本地构建一致：
   ```bash
   solana program dump <PROGRAM_ID> onchain.so
   sha256sum onchain.so target/deploy/mars.so
   ```
3. 确保 Git 代码与本地代码一致：
   ```bash
   git status  # 应该没有未提交的更改
   git push    # 确保已推送到 GitHub
   ```

### Q4: 部署失败，如何回收 SOL？

**A:** 可以关闭失败的缓冲区或程序：

```bash
# 查看所有缓冲区
solana program show --buffers

# 关闭缓冲区
solana program close <BUFFER_ADDRESS>

# 关闭程序（谨慎！会永久删除）
solana program close <PROGRAM_ID> --bypass-warning
```

### Q5: 验证超时怎么办？

**A:** 验证服务可能负载高或网络问题。

**解决方案：**
1. 等待 5-10 分钟后重试
2. 使用 `--verbose` 查看详细日志
3. 检查 GitHub 仓库是否公开可访问
4. 尝试使用不同的 RPC endpoint

### Q6: 如何更新已验证的程序？

**A:** 更新流程：

```bash
# 1. 修改代码并提交
git add .
git commit -m "feat: Update feature X"
git push

# 2. Docker 构建
solana-verify build .

# 3. 升级程序（需要 upgrade authority）
solana program deploy target/deploy/mars.so --program-id <PROGRAM_ID>

# 4. 重新验证
solana-verify verify-from-repo --remote -um --program-id <PROGRAM_ID> <REPO_URL>

# 5. 更新 IDL
anchor idl upgrade -f target/idl/mars.json <PROGRAM_ID>
```

### Q7: 两个哈希值（.so 文件哈希 vs 可执行代码哈希）的区别？

**A:** 
- **.so 文件哈希 (397f9743...)**: 整个文件的哈希，包含代码、元数据、调试信息
- **可执行代码哈希 (79fa6337...)**: 只包含真正在链上执行的代码部分

验证服务使用可执行代码哈希，因为链上只存储可执行代码部分。

### Q8: 可以在 devnet 上验证吗？

**A:** 可以，但验证服务主要支持 mainnet。对于 devnet：

```bash
solana-verify verify-from-repo \
  --url https://api.devnet.solana.com \
  --program-id <PROGRAM_ID> \
  <REPO_URL>
```

注意：远程验证服务（verify.osec.io）主要用于 mainnet。

### Q9: 验证后还能修改程序吗？

**A:** 可以，如果你是 upgrade authority。修改后需要：
1. 重新部署
2. 重新验证
3. 更新 IDL

如果设置了 `immutable`（不可升级），则无法修改。

### Q10: 如何让程序不可升级？

**A:** 设置 upgrade authority 为 null：

```bash
solana program set-upgrade-authority <PROGRAM_ID> --final
```

**警告：** 这是不可逆的操作！设置后无法再更新程序。

---

## 10. 参考资料

### 官方文档

- [Solana Verify 文档](https://github.com/Ellipsis-Labs/solana-verifiable-build)
- [Anchor 文档](https://www.anchor-lang.com/)
- [Solana 开发者文档](https://docs.solana.com/)
- [Otter Sec 验证服务](https://verify.osec.io/)

### 工具链

- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- [Rust](https://www.rust-lang.org/tools/install)
- [Docker](https://www.docker.com/get-started)

### 区块链浏览器

- [Solana Explorer](https://explorer.solana.com/)
- [SolScan](https://solscan.io/)
- [Solana FM](https://solana.fm/)

### 社区资源

- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/examples)
- [Solana Stack Exchange](https://solana.stackexchange.com/)

---

## 11. 快速命令参考

```bash
# 构建
solana-verify build .                    # Docker 可验证构建
sha256sum target/deploy/mars.so          # 检查哈希

# 部署
solana program write-buffer target/deploy/mars.so                    # 写入缓冲区
solana program deploy --buffer <BUFFER> --program-id <KEYPAIR>      # 从缓冲区部署
solana program dump <PROGRAM_ID> deployed.so                        # 下载链上程序

# IDL 管理
anchor idl init -f target/idl/mars.json <PROGRAM_ID>                # 初次上传
anchor idl upgrade -f target/idl/mars.json <PROGRAM_ID>             # 更新 IDL
anchor idl fetch -o ./idl.json <PROGRAM_ID>                         # 下载 IDL

# 安全元数据管理
npx @solana-program/program-metadata@latest write security <PROGRAM_ID> ./security.json    # 上传
npx @solana-program/program-metadata@latest fetch security <PROGRAM_ID>                   # 读取
npx @solana-program/program-metadata@latest update security <PROGRAM_ID> ./security.json  # 更新

# 验证
solana-verify verify-from-repo --remote -um --program-id <PROGRAM_ID> <REPO_URL>

# 程序管理
solana program show --buffers                                       # 查看所有缓冲区
solana program show --programs                                      # 查看所有程序
solana program close <ADDRESS>                                      # 关闭程序/缓冲区
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <NEW_AUTH>

# 其他
solana balance                                                      # 查看余额
solana config get                                                   # 查看配置
git ls-files | grep "^Cargo.lock$"                                 # 验证 Cargo.lock 已提交
```

---

**最后更新：** 2025-01-29  
**文档版本：** 2.1  
**验证状态：** ✅ Program G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy 已验证  
**IDL 状态：** ✅ IDL Account EWGvoVaGwvBuQBwfqkz21wzCBSc1EZ4yiCDxEP78mnvC 已上传  
**元数据状态：** ✅ Security Metadata 54u2wtC2aEemHEmorJieZT7X3WL8sFKk4rnpriyADuE5 已上传
