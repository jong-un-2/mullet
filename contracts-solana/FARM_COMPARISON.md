# Kamino Vault 存款 - 完整流程对比

## 🔄 官方前端的完整流程

当你在 Kamino 官网存款时，会发送：

### 交易指令顺序：
```
1. Create ATA (如果需要)
   Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
   └─ 创建 Shares 账户

2. Deposit to Vault
   Program: KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd
   ├─ 转入 PYUSD
   └─ 铸造 Shares

3. Stake to Farm (如果 vault 有 farm)
   Program: FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr
   └─ 质押 Shares 到 farm，获得额外奖励
```

### Solscan 会显示：
- ✅ ATA Program
- ✅ Kamino Vault Program
- ✅ **Farms Program** ← 这就是你看到的官方程序

---

## 🚀 我们的 Mars 合约实现

当前通过 Mars 合约存款时：

### 交易指令顺序：
```
1. Create ATA (SDK 自动添加)
   Program: ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
   └─ 创建 Shares 账户

2. Mars kamino_deposit
   Program: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
   └─ CPI to Kamino Vault
      ├─ 转入 PYUSD
      └─ 铸造 Shares

❌ 没有 Farm 质押步骤
```

### Solscan 会显示：
- ✅ ATA Program
- ✅ Mars Program
- ❌ **没有 Farms Program**

---

## 📊 功能对比

| 功能 | 官方前端 | Mars V3 | 说明 |
|------|---------|---------|------|
| 存款到 Vault | ✅ | ✅ | 都支持 |
| 支持 Token-2022 | ✅ | ✅ | PYUSD 等 |
| 自动处理 Reserves | ✅ | ✅ | remaining_accounts |
| 质押到 Farm | ✅ | ❌ | 官方有，我们没有 |
| 获得 Vault 收益 | ✅ | ✅ | 都有 |
| 获得 Farm 奖励 | ✅ | ❌ | 需要质押到 farm |

---

## 🎯 你的存款情况

### 当前状态：
- ✅ 已存入 5 PYUSD 到 vault
- ✅ 获得 4.998845 shares
- ✅ 可以获得 vault 的 APY 收益
- ❌ **未质押到 farm**，不会获得 farm 奖励

### 是否影响收益？
- **Vault 收益**: ✅ 正常获得（通过 lending 赚取利息）
- **Farm 奖励**: ❌ 没有（因为没有质押）

### Farm 奖励说明：
- Farm 通常提供 **KMNO** 或其他代币作为奖励
- 这是 **额外奖励**，不影响 vault 本身的收益
- 如果 vault 有 farm，不质押就拿不到这部分奖励

---

## 🛠️ 如何添加 Farm 支持？

### 方案 1: 在 Mars 合约中添加 Farm CPI

需要实现：
```rust
pub fn kamino_stake_in_farm<'info>(
    ctx: Context<'_, '_, '_, 'info, KaminoStakeInFarm<'info>>,
    shares_amount: u64,
) -> Result<()> {
    // CPI 到 Farms Program
    // 质押 shares 到 farm
}
```

优点：
- ✅ 完整功能，用户体验好
- ✅ 一次交易完成存款+质押

缺点：
- ❌ 需要处理更多账户
- ❌ Farm 结构复杂

### 方案 2: 分两步操作

1. 通过 Mars 合约存款（当前已实现）
2. 用户手动在 Kamino 网站质押

优点：
- ✅ 简单，不需要改代码
- ✅ Mars 合约专注于存取款

缺点：
- ❌ 用户体验差，需要两次操作

### 方案 3: 混合方案

Mars 合约提供两个函数：
- `kamino_deposit` - 只存款（当前）
- `kamino_deposit_and_stake` - 存款+质押（新功能）

优点：
- ✅ 灵活，用户可选择
- ✅ 向后兼容

---

## 💡 建议

### 短期：
- ℹ️  当前实现已经可用
- ℹ️  vault 收益正常获得
- ℹ️  如果需要 farm 奖励，可以手动在官网质押

### 长期：
- 🎯 添加 farm 支持，提供完整功能
- 🎯 参考 SDK 的 `stakeSharesIxs` 实现
- 🎯 构造完整的 farm 账户列表

---

## 📚 Farm Program 地址

```
Current: FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr
Old:     FarmqiPv5eAj3j1GMdMCMUGXqPUvmquZtMy86QH6rzhG
```

这就是你在 Solscan 上看到的"官方程序"！
