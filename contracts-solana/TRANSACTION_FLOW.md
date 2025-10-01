# 交易流程说明

## 📋 交易中的程序调用顺序

### 你的交易: 48bQfA361DsT9FjNpetAV6HR4x6Cw8nPKwMdJrXVL6FCSJGjjXxkXZBpM4RZ2FitvTcqVraGfdET4sJr15PNGzjS

### 🔄 完整调用链:

```
1️⃣ 你的钱包发起交易
    ↓
2️⃣ Mars Program (AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8)
    ├─ 调用: kamino_deposit(5 PYUSD)
    ├─ 检查账户、权限
    ├─ 准备 remaining_accounts (reserves + lending markets)
    │
    └─ CPI 调用 Kamino Vault ──┐
                                 ↓
3️⃣ Kamino Vault Program (KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd)
    ├─ 执行: deposit 指令
    ├─ 从你的 PYUSD 账户转账 5 PYUSD
    ├─ 计算应该发行多少 shares
    │
    └─ CPI 调用 Token Programs ──┐
                                   ↓
4️⃣ Token-2022 Program (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
    └─ 转移 5 PYUSD 到 vault
                                   ↓
5️⃣ Associated Token Account Program (ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL)
    └─ 如果需要，创建 Shares ATA
                                   ↓
6️⃣ Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
    └─ 铸造 4.998845 shares 给你
```

## 📊 程序说明

### Mars Program (你的合约)
- **地址**: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
- **作用**: 
  - 接收用户调用
  - 验证参数和账户
  - 构造 remaining_accounts
  - CPI 到 Kamino 完成实际存款
- **版本**: Mars V3 (支持 Token-2022 + remaining_accounts)

### Associated Token Account Program (官方)
- **地址**: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
- **作用**: 
  - Solana 官方程序
  - 自动创建关联代币账户 (ATA)
  - 在这笔交易中，如果你的 Shares ATA 不存在，会自动创建
- **特点**: 
  - 所有人都用这个程序
  - 确保每个钱包对每个 token 只有一个标准地址

### Kamino Vault Program (被 CPI 调用)
- **地址**: KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd
- **作用**: 
  - 管理 vault 逻辑
  - 处理存取款
  - 计算 shares
  - 调用 lending 协议赚取收益

## 🎯 为什么 Solscan 显示这两个程序？

Solscan 显示的是**顶层调用**：

1. **Mars Program** - 你直接调用的程序
2. **ATA Program** - SDK 构造的指令（创建 Shares 账户）

**实际上还有更多程序被调用**（通过 CPI），但 Solscan 只显示顶层的：
- Kamino Vault Program (CPI)
- Token-2022 Program (CPI)
- Token Program (CPI)
- Klend Program (CPI，如果有 lending 操作)

## 🌾 关于 Farm Program

如果你在 Solscan 上看到官方的交易包含 **Farm Program**：
```
FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr
```

这是因为：
1. **Kamino SDK 会自动检测** vault 是否有关联的 farm
2. 如果有 farm，SDK 返回 `depositIx.stakeInFarmIfNeededIxs`
3. 官方前端会同时发送：
   - Deposit 指令（存款）
   - Stake 指令（质押到 farm）

### 我们当前的实现：
- ✅ 支持存款到 vault
- ❌ **暂未实现** farm 质押

### Farm 的作用：
- 🎁 提供额外的代币奖励（如 KMNO 代币）
- 📈 在获得 vault 收益的同时，获得 farm 奖励
- 🔄 自动质押，无需手动操作

### 如何完整实现：
需要在 Mars 合约中添加：
1. `kamino_stake_in_farm` 函数
2. 构造完整的 farm 账户列表
3. CPI 调用 Farms Program

## ✅ 这是正常的！

这说明：
1. ✅ 你的 Mars 合约正确执行
2. ✅ SDK 指令正确构造（包括 ATA 创建）
3. ✅ CPI 到 Kamino 成功
4. ✅ 所有 token 转账成功

## 🔍 查看完整调用链

在 Solscan 交易页面：
- 点击 "Program Instruction Logs" 标签
- 可以看到完整的程序调用日志
- 包括所有 CPI 调用和账户操作

例如你会看到：
```
Program AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8 invoke [1]
  Program log: 🚀 开始Kamino存款CPI调用
  Program KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd invoke [2]
    Program log: Instruction: Deposit
    Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb invoke [3]
      ...
```

数字 [1], [2], [3] 表示调用深度（嵌套层级）。
