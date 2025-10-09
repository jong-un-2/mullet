# Mars 合约部署指南

## 前置条件

- 确保钱包有足够的 SOL（约 4-5 SOL）
- 已配置 Solana CLI 钱包：
  ```bash
  solana config set --keypair /Users/joung-un/mars-projects/contracts-solana/phantom-wallet.json
  ```

## 部署步骤

### 1. 生成新的程序密钥对

```bash
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase
```

**说明：**
- `--force`: 强制覆盖已存在的文件
- `--no-bip39-passphrase`: 不使用 BIP39 助记词

### 2. 检查钱包余额

```bash
solana balance
```

确保有足够的 SOL 用于部署（建议 ≥ 4 SOL）

### 3. 部署合约到主网

```bash
solana program deploy ./target/deploy/mars.so \
  --program-id ./target/deploy/mars-keypair.json \
  --max-sign-attempts 20 2>&1
```

**参数说明：**
- `--program-id`: 指定程序密钥对文件
- `--max-sign-attempts 20`: 最大签名尝试次数（避免网络问题导致失败）
- `2>&1`: 重定向错误输出到标准输出

### 4. 清理旧的 Buffer（可选）

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

## 部署后配置

部署成功后，需要更新以下文件中的程序 ID：

### 1. 获取新的程序 ID

```bash
solana-keygen pubkey ./target/deploy/mars-keypair.json
```

### 2. 更新配置文件

假设新程序 ID 为 `5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue`：

#### a. `Anchor.toml`

```toml
[programs.localnet]
mars = "5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue"
```

#### b. `programs/mars/src/lib.rs`

```rust
declare_id!("5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue");
```

#### c. `contracts-solana/constants.ts`

```typescript
export const MARS_PROGRAM_ID = new PublicKey("5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue");
```

#### d. `backend/container_src/src/lib.rs`

```rust
// Mars V9 Program ID
const MARS_PROGRAM_ID: &str = "5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue";
```

### 3. 重新构建

```bash
anchor build
```

## 验证部署

```bash
# 查看程序信息
solana program show 5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue

# 查看程序账户余额
solana balance 5YqidgxLf3yaoGtd1ritzRhmPPPWKSxVgcadLLTFo4Ue
```

## 常见问题

### 1. 部署失败：余额不足

**解决方案：**
- 转入更多 SOL 到钱包
- 或先关闭旧的 buffer 回收 SOL

### 2. 部署超时

**解决方案：**
- 增加 `--max-sign-attempts` 参数值
- 检查网络连接
- 稍后重试

### 3. 程序已存在

**错误信息：** `Program <ID> has been closed, use a new Program Id`

**解决方案：**
- 生成新的程序密钥对（步骤 1）
- 使用新的程序 ID 重新部署

## 快速命令

```bash
# 完整部署流程
solana-keygen new -o ./target/deploy/mars-keypair.json --force --no-bip39-passphrase && \
solana program deploy ./target/deploy/mars.so --program-id ./target/deploy/mars-keypair.json --max-sign-attempts 20 2>&1

# 查看新程序 ID
solana-keygen pubkey ./target/deploy/mars-keypair.json

# 清理所有 buffer
solana program show --buffers | grep -v "Buffer Address" | awk '{print $1}' | xargs -I {} solana program close {} --bypass-warning
```

## 相关链接

- **Solana Explorer:** https://explorer.solana.com/address/<PROGRAM_ID>
- **Solscan:** https://solscan.io/account/<PROGRAM_ID>
- **Anchor 文档:** https://www.anchor-lang.com/docs/deployment
