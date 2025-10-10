# 取款批量交易修复总结

## 🐛 问题分析

### 主要问题
1. **指令反序列化失败** (`InstructionDidNotDeserialize`, 错误代码 0x66)
   - `kamino_start_unstake_from_farm` 需要 2 个参数：`shares_amount` 和 `current_slot`
   - 前端只传了 `amount`，缺少 `current_slot` 参数

2. **Blockhash 过期** (`Blockhash not found`)
   - 原来是 3 笔独立交易，每笔都需要单独签名
   - 第 2、3 笔交易签名时，第 1 笔的 blockhash 已经过期

3. **用户体验差**
   - 需要用户点击 3 次确认签名
   - 每笔交易之间等待 5 秒
   - 总耗时 15-30 秒
   - 有烦人的 `window.confirm` 弹窗

## ✅ 解决方案

### 1. 修复指令参数（`marsContract.ts`）

#### `createStartUnstakeInstruction`
```typescript
// 修复前：缺少 current_slot 参数
function createStartUnstakeInstruction(
  userPublicKey: PublicKey,
  farmAccounts: any,
  amount: number
): TransactionInstruction {
  const data = Buffer.concat([DISCRIMINATOR_START_UNSTAKE, amountBuffer]);
  // ❌ 缺少 slot 参数
}

// 修复后：添加 current_slot 参数
function createStartUnstakeInstruction(
  userPublicKey: PublicKey,
  farmAccounts: any,
  amount: number,
  currentSlot: number  // ✅ 新增
): TransactionInstruction {
  // discriminator (8) + amount (8) + slot (8) = 24 bytes
  const data = Buffer.concat([
    DISCRIMINATOR_START_UNSTAKE, 
    amountBuffer, 
    slotBuffer  // ✅ 新增
  ]);
}
```

#### `createUnstakeInstruction`
```typescript
// 修复前：账户列表不正确
function createUnstakeInstruction(...) {
  const keys = [
    ...
    { pubkey: farmAccounts.delegatedStake, ... },
    { pubkey: farmAccounts.farmsProgram, ... },  // ❌ 错误
    { pubkey: TOKEN_PROGRAM_ID, ... },
  ];
}

// 修复后：匹配合约定义
function createUnstakeInstruction(
  userPublicKey: PublicKey,
  farmAccounts: any,
  userSharesAta: PublicKey,  // ✅ 新增参数
  _amount: number
) {
  const data = DISCRIMINATOR_UNSTAKE;  // ✅ 无参数
  
  const keys = [
    { pubkey: userPublicKey, ... },
    { pubkey: farmAccounts.farmState, ... },
    { pubkey: farmAccounts.userFarm, ... },
    { pubkey: userSharesAta, ... },  // ✅ 新增
    { pubkey: farmAccounts.delegatedStake, ... },
    { pubkey: farmAccounts.scopePrices, ... },  // ✅ 新增
    { pubkey: TOKEN_PROGRAM_ID, ... },
  ];
}
```

### 2. 批量交易（`marsContract.ts`）

```typescript
// 修复前：3 笔独立交易
export async function createUnstakeAndWithdrawTransactions(...) {
  const tx1 = new Transaction();
  tx1.add(createStartUnstakeInstruction(...));
  
  const tx2 = new Transaction();
  tx2.add(createUnstakeInstruction(...));
  
  const tx3 = new Transaction();
  tx3.add(createWithdrawInstruction(...));
  
  return [tx1, tx2, tx3];  // ❌ 3 笔交易
}

// 修复后：1 笔批量交易
export async function createUnstakeAndWithdrawTransactions(...) {
  const currentSlot = await connection.getSlot();  // ✅ 获取当前 slot
  
  const batchTx = new Transaction();
  batchTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }));
  
  // ✅ 3 个指令放在同一笔交易中
  batchTx.add(createStartUnstakeInstruction(..., currentSlot));
  batchTx.add(createUnstakeInstruction(..., userSharesAta, ...));
  batchTx.add(createWithdrawInstruction(...));
  
  return [batchTx];  // ✅ 1 笔批量交易
}
```

### 3. 简化签名流程（`useMarsContract.ts`）

```typescript
// 修复前：循环 3 次签名
const withdraw = useCallback(async (...) => {
  for (let i = 0; i < transactions.length; i++) {
    const signature = await sendTransaction(transactions[i], ...);
    await connection.confirmTransaction(signature, ...);
    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 5000));  // ❌ 等待
    }
  }
}, []);

// 修复后：一次签名
const withdraw = useCallback(async (...) => {
  // ✅ 只有一笔批量交易
  const signature = await sendTransaction(transactions[0], connection);
  await connection.confirmTransaction(signature, 'confirmed');
  return [signature];
}, []);
```

### 4. 移除烦人的弹窗（`XFund.tsx`）

```typescript
// 修复前：烦人的确认弹窗
const confirmed = window.confirm(
  `取款需要执行 3 笔交易：\n\n` +
  `1. 发起取消质押请求\n` +
  `2. 从 Farm 提取已取消质押的 shares\n` +
  `3. 从 Vault 取款\n\n` +
  `请确保每笔交易都确认，整个流程约需 15-30 秒。\n\n` +
  `是否继续？`
);

// 修复后：移除弹窗，直接执行
setShowProgress(true);
setProgressTitle('Withdrawing PYUSD from the vault');
setTotalTxSteps(1);  // ✅ 改为 1 步
setProgressMessage('Preparing batch transaction...');
```

## 📊 对比表格

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 交易数量 | 3 笔独立交易 | 1 笔批量交易 |
| 签名次数 | 3 次 | 1 次 ✅ |
| 总耗时 | 15-30 秒 | 5-10 秒 ✅ |
| 用户体验 | 烦人的弹窗 + 多次点击 | 无弹窗，一次签名 ✅ |
| Blockhash 问题 | 容易过期 ❌ | 共享 blockhash ✅ |
| 指令参数 | 缺少 current_slot ❌ | 完整参数 ✅ |
| 账户列表 | 不匹配合约 ❌ | 完全匹配 ✅ |

## 🎯 技术细节

### 合约端指令定义

```rust
// kamino_start_unstake_from_farm
pub fn handler_kamino_start_unstake_from_farm(
    ctx: Context<KaminoStartUnstakeFromFarm>,
    shares_amount: u64,      // ✅ 参数 1
    current_slot: u64,       // ✅ 参数 2
) -> Result<()>

// kamino_unstake_from_farm
pub fn handler_kamino_unstake_from_farm(
    ctx: Context<KaminoUnstakeFromFarm>,
    // ✅ 无参数，Kamino 自动计算可取的 shares
) -> Result<()>

// kamino_withdraw
pub fn kamino_withdraw<'info>(
    ctx: Context<'_, '_, '_, 'info, KaminoWithdrawCPI<'info>>,
    max_amount: u64,         // ✅ 参数 1
) -> Result<()>
```

### 前端指令数据格式

```typescript
// Start Unstake: 24 bytes
[discriminator(8)] + [amount(8)] + [slot(8)]

// Unstake: 8 bytes
[discriminator(8)]  // 无额外参数

// Withdraw: 16 bytes
[discriminator(8)] + [amount(8)]
```

## 🚀 测试要点

1. **功能测试**
   - ✅ 批量交易能否成功执行
   - ✅ Start Unstake 指令是否包含 current_slot
   - ✅ Unstake 指令账户列表是否正确

2. **用户体验测试**
   - ✅ 是否只需要签名 1 次
   - ✅ 是否移除了烦人的 confirm 弹窗
   - ✅ 进度提示是否显示为 "1/1" 而不是 "3/3"

3. **错误处理**
   - ✅ Blockhash 是否有效（共享）
   - ✅ Compute units 是否足够（1,000,000）
   - ✅ 超时时间是否合理（60秒）

## 📝 相关文件

修改的文件：
- `frontend/src/services/marsContract.ts` - 核心交易构建逻辑
- `frontend/src/hooks/useMarsContract.ts` - Hook 签名流程
- `frontend/src/pages/XFund.tsx` - UI 交互

合约参考：
- `contracts-solana/programs/mars/src/instructions/kamino_farm.rs`
- `contracts-solana/programs/mars/src/lib.rs`
