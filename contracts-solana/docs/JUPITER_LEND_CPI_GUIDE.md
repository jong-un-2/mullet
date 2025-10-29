# Jupiter Lend CPI 集成文档

本文档说明如何在 Mars Protocol 合约中集成 Jupiter Lend 的 CPI (Cross-Program Invocation) 功能。

## 📋 目录

1. [概述](#概述)
2. [架构设计](#架构设计)
3. [合约实现](#合约实现)
4. [TypeScript 调用示例](#typescript-调用示例)
5. [测试指南](#测试指南)
6. [常见问题](#常见问题)

---

## 概述

### 什么是 Jupiter Lend?

Jupiter Lend Earn 是 Jupiter 推出的借贷产品，允许用户：
- 存入代币（如 USDC）赚取利息
- 获得 jlToken（Jupiter Lend Token）作为凭证
- 随时取款，赎回本金和利息

### 为什么需要 CPI 集成?

通过 CPI（跨程序调用），Mars Protocol 合约可以：
- **自动化策略**: 在合约内直接调用 Jupiter Lend，无需用户手动操作
- **原子性保证**: 所有操作在同一交易内完成，要么全部成功，要么全部回滚
- **复杂策略**: 组合多个协议（如 Kamino + Jupiter Lend）实现高级收益策略

---

## 架构设计

### 账户结构

Jupiter Lend CPI 需要以下账户：

```rust
// 存款账户
pub struct JupiterLendDepositCPI<'info> {
    pub signer: Signer<'info>,                  // 用户签名者
    pub depositor_token_account: AccountInfo,   // 用户的代币账户（USDC等）
    pub recipient_token_account: AccountInfo,   // 接收 jlToken 的账户
    pub lending_admin: AccountInfo,             // Lending 管理员 PDA
    pub lending: AccountInfo,                   // Lending 池状态账户
    pub f_token_mint: AccountInfo,              // jlToken 铸造账户
    pub token_program: AccountInfo,             // SPL Token 程序
    pub jupiter_lend_program: AccountInfo,      // Jupiter Lend 程序
}

// 取款账户
pub struct JupiterLendWithdrawCPI<'info> {
    pub signer: Signer<'info>,                  // 用户签名者
    pub depositor_token_account: AccountInfo,   // 接收代币的账户（USDC等）
    pub recipient_token_account: AccountInfo,   // 销毁 jlToken 的账户
    pub lending_admin: AccountInfo,             // Lending 管理员 PDA
    pub lending: AccountInfo,                   // Lending 池状态账户
    pub f_token_mint: AccountInfo,              // jlToken 铸造账户
    pub token_program: AccountInfo,             // SPL Token 程序
    pub jupiter_lend_program: AccountInfo,      // Jupiter Lend 程序
}
```

### 指令数据格式

```rust
// 存款: discriminator (8 bytes) + amount (8 bytes)
[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6, ...amount_le_bytes]

// 取款: discriminator (8 bytes) + amount (8 bytes)
[0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22, ...amount_le_bytes]
```

---

## 合约实现

### 1. 添加常量定义

在 `kamino_constants.rs` 中添加 Jupiter Lend 常量：

```rust
pub mod jupiter_lend {
    use anchor_lang::prelude::*;

    pub const JUPITER_LEND_PROGRAM_ID: Pubkey = 
        pubkey!("jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9");

    pub const DEPOSIT_INSTRUCTION_DISCRIMINATOR: [u8; 8] = 
        [0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6];

    pub const WITHDRAW_INSTRUCTION_DISCRIMINATOR: [u8; 8] = 
        [0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22];
}
```

### 2. 实现 CPI 调用

在 `jupiter_lend_cpi.rs` 中实现：

```rust
pub fn jupiter_lend_deposit_cpi<'info>(
    ctx: Context<'_, '_, '_, 'info, JupiterLendDepositCPI<'info>>,
    amount: u64,
) -> Result<()> {
    // 验证程序 ID
    require_eq!(
        ctx.accounts.jupiter_lend_program.key(),
        JUPITER_LEND_PROGRAM_ID,
        JupiterLendCPIError::InvalidJupiterLendProgram
    );

    // 构建账户数组
    let account_metas = vec![
        AccountMeta::new(ctx.accounts.signer.key(), true),
        AccountMeta::new(ctx.accounts.depositor_token_account.key(), false),
        AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
        AccountMeta::new(ctx.accounts.lending_admin.key(), false),
        AccountMeta::new(ctx.accounts.lending.key(), false),
        AccountMeta::new(ctx.accounts.f_token_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.jupiter_lend_program.key(), false),
    ];

    // 构建指令数据
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]);
    data.extend_from_slice(&amount.to_le_bytes());

    // 创建指令
    let ix = Instruction {
        program_id: JUPITER_LEND_PROGRAM_ID,
        accounts: account_metas,
        data,
    };

    // 执行 CPI
    invoke(&ix, &account_infos)?;
    Ok(())
}
```

### 3. 导出公共接口

在 `lib.rs` 中添加：

```rust
pub fn jupiter_lend_deposit<'info>(
    ctx: Context<'_, '_, '_, 'info, JupiterLendDepositCPI<'info>>,
    amount: u64,
) -> Result<()> {
    jupiter_lend_deposit_cpi(ctx, amount)
}

pub fn jupiter_lend_withdraw<'info>(
    ctx: Context<'_, '_, '_, 'info, JupiterLendWithdrawCPI<'info>>,
    amount: u64,
) -> Result<()> {
    jupiter_lend_withdraw_cpi(ctx, amount)
}
```

---

## TypeScript 调用示例

### 1. 安装依赖

```bash
npm install @jup-ag/lend @coral-xyz/anchor @solana/web3.js
```

### 2. 获取账户上下文

```typescript
import { getDepositContext, getWithdrawContext } from "@jup-ag/lend/earn";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// 获取存款上下文
const depositContext = await getDepositContext({
  asset: USDC_MINT,
  signer: userPublicKey,
  connection,
});

// 获取取款上下文
const withdrawContext = await getWithdrawContext({
  asset: USDC_MINT,
  signer: userPublicKey,
  connection,
});
```

### 3. 调用 Mars Protocol CPI

```typescript
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "bn.js";

// 加载 Mars Protocol 程序
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
const marsProgram = new Program(idl, provider);

// 存款 1 USDC
const depositAmount = new BN(1_000_000);
const depositTx = await marsProgram.methods
  .jupiterLendDeposit(depositAmount)
  .accounts({
    signer: wallet.publicKey,
    depositorTokenAccount: depositContext.depositorTokenAccount,
    recipientTokenAccount: depositContext.recipientTokenAccount,
    lendingAdmin: depositContext.lendingAdmin,
    lending: depositContext.lending,
    fTokenMint: depositContext.fTokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
    jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
  })
  .rpc();

console.log("Deposit TX:", depositTx);

// 取款 1 USDC
const withdrawAmount = new BN(1_000_000);
const withdrawTx = await marsProgram.methods
  .jupiterLendWithdraw(withdrawAmount)
  .accounts({
    signer: wallet.publicKey,
    depositorTokenAccount: withdrawContext.ownerTokenAccount,
    recipientTokenAccount: withdrawContext.recipientTokenAccount,
    lendingAdmin: withdrawContext.lendingAdmin,
    lending: withdrawContext.lending,
    fTokenMint: withdrawContext.fTokenMint,
    tokenProgram: TOKEN_PROGRAM_ID,
    jupiterLendProgram: JUPITER_LEND_PROGRAM_ID,
  })
  .rpc();

console.log("Withdraw TX:", withdrawTx);
```

---

## 测试指南

### 构建合约

```bash
cd contracts-solana
anchor build
```

### 运行示例脚本

```bash
# 存款示例
npm run mars:jupiter:deposit

# 取款示例
npm run mars:jupiter:withdraw
```

### 预期输出

```
=== Mars Protocol → Jupiter Lend 存款示例 ===

👤 用户钱包: YourWalletAddress...

📋 获取 Jupiter Lend 存款上下文...
✅ 存款上下文账户:
  - signer: YourWalletAddress...
  - depositorTokenAccount: TokenAccountAddress...
  - recipientTokenAccount: JlTokenAccountAddress...
  - lendingAdmin: AdminPDAAddress...
  - lending: LendingPoolAddress...
  - fTokenMint: JlTokenMintAddress...

💰 存款金额: 1 USDC (1,000,000 基础单位)

📤 发送 Mars Protocol CPI 调用...

✅ 存款成功!
📝 交易签名: 5zy8x...
🔗 Solscan: https://solscan.io/tx/5zy8x...
```

---

## 常见问题

### Q1: 如何获取正确的账户地址?

**A**: 使用 `@jup-ag/lend` SDK 的 `getDepositContext()` 和 `getWithdrawContext()` 方法自动获取。这些方法会返回所有必需的账户地址。

### Q2: 存款和取款的 discriminator 是什么?

**A**: 
- 存款: `[0xf2, 0x23, 0xc6, 0x89, 0x52, 0xe1, 0xf2, 0xb6]`
- 取款: `[0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa1, 0x22]`

这些是 Anchor 程序的指令识别码，用于区分不同的指令。

### Q3: 如何处理精度问题?

**A**: 
- USDC 使用 6 位小数
- 1 USDC = 1,000,000 基础单位
- 使用 `BN` (Big Number) 处理大整数

```typescript
import BN from "bn.js";

// 1 USDC
const amount = new BN(1_000_000);

// 0.5 USDC
const halfUSDC = new BN(500_000);
```

### Q4: CPI 调用失败怎么办?

**A**: 检查以下几点：
1. ✅ 程序 ID 是否正确: `jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9`
2. ✅ 账户顺序是否正确（严格按照 SDK 返回的顺序）
3. ✅ 用户是否有足够的代币余额
4. ✅ 代币账户是否已初始化
5. ✅ 指令 discriminator 是否正确

### Q5: 如何查询用户的 jlToken 余额?

**A**: 使用 Jupiter Lend SDK:

```typescript
import { getUserLendingPositionByAsset } from "@jup-ag/lend/earn";

const position = await getUserLendingPositionByAsset({
  asset: USDC_MINT,
  user: userPublicKey,
  connection,
});

console.log("jlToken shares:", position.lendingTokenShares.toString());
console.log("Underlying assets:", position.underlyingAssets.toString());
```

### Q6: 与 Kamino CPI 有什么区别?

**A**: 

| 特性 | Kamino | Jupiter Lend |
|------|--------|--------------|
| 账户数量 | 13+ remaining accounts | 8 个固定账户 |
| 复杂度 | 较高（需要 reserves/markets） | 较低（简单账户结构） |
| 收益类型 | Lending + LP 奖励 | Lending + 协议奖励 |
| SDK 支持 | @kamino-finance/klend-sdk | @jup-ag/lend |

---

## 参考资源

- [Jupiter Lend 官方文档](https://dev.jup.ag/docs/lend/sdk)
- [Jupiter Lend SDK GitHub](https://github.com/jup-ag/lend)
- [Mars Protocol 合约代码](./programs/mars/src/instructions/jupiter_lend_cpi.rs)
- [示例脚本](./ops/samples/mars-jupiter-lend-cpi-example.ts)

---

## 许可证

MIT License
