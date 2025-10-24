# Kamino 流动性池交易追踪系统 - 完整实现

## 系统概述

本系统实现了完整的 Kamino 流动性池交易追踪，包括存款/取款记录、成本基础计算和准确的 PnL（盈亏）计算。

---

## 核心功能实现

### ✅ 1. 追踪每笔存取款

#### Frontend 实现 (`frontend/src/services/kaminoLiquidity.ts`)

**存款追踪** (`depositAndStake` 函数):
```typescript
// 在交易成功后记录
await marsApiService.recordLiquidityTransaction({
  userAddress: userPublicKey.toString(),
  strategyAddress,
  type: 'deposit',
  tokenA: { mint, symbol, amount, amountUsd },
  tokenB: { mint, symbol, amount, amountUsd },
  shares: depositedShares.toString(),
  txHash: signature,
  timestamp: Date.now(),
  poolName: 'JITOSOL-SOL',
});
```

**取款追踪** (`unstakeAndWithdraw` 函数):
```typescript
// 在取款成功后记录
await marsApiService.recordLiquidityTransaction({
  userAddress: userPublicKey.toString(),
  strategyAddress,
  type: 'withdraw',
  tokenA: { mint, symbol, amount, amountUsd },
  tokenB: { mint, symbol, amount, amountUsd },
  shares: sharesToBurn.toString(),
  txHash: signature,
  timestamp: Date.now(),
  poolName: 'JITOSOL-SOL',
});
```

#### Backend 数据库表 (`backend/src/database/schema.ts`)

**交易记录表** `kaminoLiquidityTransactions`:
```typescript
export const kaminoLiquidityTransactions = sqliteTable("kamino_liquidity_transactions", {
  id: text("id").primaryKey(),
  userAddress: text("user_address").notNull(),
  strategyAddress: text("strategy_address").notNull(),
  poolName: text("pool_name"),
  
  // 交易类型
  transactionType: text("transaction_type", { enum: ["deposit", "withdraw"] }).notNull(),
  
  // Token A (SOL/wSOL)
  tokenAMint: text("token_a_mint").notNull(),
  tokenASymbol: text("token_a_symbol").notNull(),
  tokenAAmount: text("token_a_amount").notNull(),
  tokenAAmountUsd: real("token_a_amount_usd").notNull(),
  
  // Token B (JitoSOL)
  tokenBMint: text("token_b_mint").notNull(),
  tokenBSymbol: text("token_b_symbol").notNull(),
  tokenBAmount: text("token_b_amount").notNull(),
  tokenBAmountUsd: real("token_b_amount_usd").notNull(),
  
  // LP Shares
  shares: text("shares").notNull(),
  
  // 交易信息
  txHash: text("tx_hash").notNull().unique(),
  status: text("status").default("confirmed"),
  apy: real("apy"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
});
```

---

### ✅ 2. 计算真实成本基础 (Cost Basis)

#### Backend 业务逻辑 (`backend/src/mars/kamino/liquidity.ts`)

**成本基础计算公式**:
```typescript
// 成本基础 = 总存款 USD - 总取款 USD
const newCostBasis = newTotalDepositsUsd - newTotalWithdrawalsUsd;
```

**实现逻辑**:
```typescript
async function updatePositionSummary(request: LiquidityTransactionRequest) {
  if (type === 'deposit') {
    // 存款：增加成本基础
    newTotalDepositsUsd += totalAmountUsd;
    newCurrentShares = currentShares.add(sharesDecimal);
    newTotalSharesReceived = totalSharesReceived.add(sharesDecimal);
  } else {
    // 取款：减少成本基础
    newTotalWithdrawalsUsd += totalAmountUsd;
    newCurrentShares = currentShares.sub(sharesDecimal);
    newTotalSharesBurned = totalSharesBurned.add(sharesDecimal);
  }
  
  // 计算新的成本基础
  const newCostBasis = newTotalDepositsUsd - newTotalWithdrawalsUsd;
}
```

#### 汇总表结构 (`kaminoUserPositionSummary`):
```typescript
export const kaminoUserPositionSummary = sqliteTable("kamino_user_position_summary", {
  // 成本基础追踪
  totalDepositsUsd: real("total_deposits_usd").notNull().default(0),
  totalWithdrawalsUsd: real("total_withdrawals_usd").notNull().default(0),
  costBasis: real("cost_basis").notNull().default(0),
  
  // Token 数量追踪
  totalTokenADeposited: text("total_token_a_deposited").default("0"),
  totalTokenBDeposited: text("total_token_b_deposited").default("0"),
  totalTokenAWithdrawn: text("total_token_a_withdrawn").default("0"),
  totalTokenBWithdrawn: text("total_token_b_withdrawn").default("0"),
  
  // LP Shares 追踪
  totalSharesReceived: text("total_shares_received").default("0"),
  totalSharesBurned: text("total_shares_burned").default("0"),
  currentShares: text("current_shares").default("0"),
});
```

---

### ✅ 3. 计算准确的 PnL

#### PnL 计算公式

**公式**:
```
总 PnL = 已实现 PnL + 未实现 PnL

已实现 PnL = 总取款 USD - (总存款 USD × 取款比例)
未实现 PnL = 当前价值 USD - 剩余成本基础
```

#### 实现代码:
```typescript
// 计算已实现 PnL
let realizedPnL = 0;
if (newTotalDepositsUsd > 0 && newTotalWithdrawalsUsd > 0) {
  const withdrawnPortion = newTotalWithdrawalsUsd / (newTotalDepositsUsd + newTotalWithdrawalsUsd);
  const costOfWithdrawals = newTotalDepositsUsd * withdrawnPortion;
  realizedPnL = newTotalWithdrawalsUsd - costOfWithdrawals;
}

// 计算未实现 PnL
const currentValueUsd = existingSummary.currentValueUsd || newCostBasis;
const unrealizedPnL = currentValueUsd - newCostBasis;

// 总 PnL
const totalPnL = realizedPnL + unrealizedPnL;
```

#### 汇总表 PnL 字段:
```typescript
export const kaminoUserPositionSummary = sqliteTable("kamino_user_position_summary", {
  // PnL 信息
  currentValueUsd: real("current_value_usd").default(0),
  realizedPnL: real("realized_pnl").default(0),
  unrealizedPnL: real("unrealized_pnl").default(0),
  totalPnL: real("total_pnl").default(0),
});
```

---

## API 端点

### 1. 记录交易
**POST** `/v1/api/mars/liquidity/transaction`

**请求体**:
```json
{
  "userAddress": "string",
  "strategyAddress": "string",
  "type": "deposit" | "withdraw",
  "tokenA": {
    "mint": "string",
    "symbol": "string",
    "amount": "string",
    "amountUsd": number
  },
  "tokenB": {
    "mint": "string",
    "symbol": "string",
    "amount": "string",
    "amountUsd": number
  },
  "shares": "string",
  "txHash": "string",
  "timestamp": number,
  "apy": number (optional),
  "poolName": "string" (optional)
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "summary": {
      "costBasis": number,
      "totalDepositsUsd": number,
      "totalWithdrawalsUsd": number,
      "currentShares": "string",
      "realizedPnL": number,
      "unrealizedPnL": number,
      "totalPnL": number
    }
  }
}
```

### 2. 获取交易历史
**GET** `/v1/api/mars/liquidity/transactions/:userAddress?strategyAddress=xxx`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userAddress": "string",
      "strategyAddress": "string",
      "transactionType": "deposit" | "withdraw",
      "tokenAAmount": "string",
      "tokenASymbol": "string",
      "tokenAAmountUsd": number,
      "tokenBAmount": "string",
      "tokenBSymbol": "string",
      "tokenBAmountUsd": number,
      "shares": "string",
      "txHash": "string",
      "timestamp": number
    }
  ]
}
```

### 3. 获取仓位汇总
**GET** `/v1/api/mars/liquidity/position/:userAddress?strategyAddress=xxx`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "userAddress": "string",
      "strategyAddress": "string",
      "poolName": "string",
      "totalDepositsUsd": number,
      "totalWithdrawalsUsd": number,
      "costBasis": number,
      "currentShares": "string",
      "currentValueUsd": number,
      "realizedPnL": number,
      "unrealizedPnL": number,
      "totalPnL": number,
      "transactionCount": number
    }
  ]
}
```

---

## Frontend Activity Log

### 实现位置
`frontend/src/pages/PoolDetail.tsx`

### 功能
1. **自动加载**: 钱包连接时自动加载交易历史
2. **实时更新**: 存款/取款成功后自动刷新
3. **交易详情**: 显示日期、类型、Token 数量、USD 价值
4. **链接到区块浏览器**: 点击交易可跳转到 Solscan 查看详情

### 代码片段:
```typescript
// 加载 Activity Log
const loadActivityLog = useCallback(async () => {
  const userAddress = wallet.publicKey?.toString();
  if (!userAddress || !poolAddress) return;
  
  const response = await fetch(
    `https://api.marsliquid.xyz/v1/api/mars/liquidity/transactions/${userAddress}?strategyAddress=${poolAddress}`
  );
  
  if (response.ok) {
    const result = await response.json();
    setActivityLog(result.data);
  }
}, [wallet.publicKey, poolAddress]);

// 在交易成功后重新加载
await Promise.all([
  loadBalances(),
  loadUserPosition(pool),
  loadActivityLog()
]);
```

---

## 数据流程图

```
┌─────────────────┐
│  用户存款/取款   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  记录交易信息    │
└────────┬────────┘
         │
         ▼ POST /liquidity/transaction
┌─────────────────┐
│  Backend API    │
│  接收交易请求    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Liquidity Manager              │
│  1. 插入交易记录                 │
│  2. 更新用户仓位汇总             │
│  3. 计算成本基础                 │
│  4. 计算 PnL                    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  数据库保存                      │
│  - kaminoLiquidityTransactions  │
│  - kaminoUserPositionSummary    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│  返回结果       │
│  包含最新 PnL   │
└─────────────────┘
```

---

## 关键特性

### 1. 精确的数值处理
- 使用 `Decimal.js` 处理大数值运算
- Token 数量使用 `text` 类型存储避免精度损失
- USD 金额使用 `real` (float) 类型

### 2. 实时同步
- 每笔交易立即记录到后端
- 交易成功后自动更新前端显示
- Activity Log 实时刷新

### 3. 完整的审计追踪
- 每笔交易都有唯一的 txHash
- 记录完整的 Token 数量和 USD 价值
- 包含时间戳便于历史查询

### 4. 准确的 PnL 计算
- 区分已实现和未实现 PnL
- 考虑多次存取款的成本基础调整
- 支持更新当前价值以反映最新 PnL

---

## 使用示例

### 查看用户的所有交易
```bash
curl https://api.marsliquid.xyz/v1/api/mars/liquidity/transactions/YOUR_ADDRESS
```

### 查看特定策略的交易
```bash
curl https://api.marsliquid.xyz/v1/api/mars/liquidity/transactions/YOUR_ADDRESS?strategyAddress=STRATEGY_ADDRESS
```

### 查看用户仓位和 PnL
```bash
curl https://api.marsliquid.xyz/v1/api/mars/liquidity/position/YOUR_ADDRESS
```

---

## 总结

这个系统提供了完整的流动性池交易追踪功能：

✅ **追踪每笔存取款** - 记录所有交易详情（Token 数量、USD 价值、交易哈希等）
✅ **计算真实成本基础** - 基于累计存款和取款计算准确的成本基础
✅ **计算准确的 PnL** - 区分已实现和未实现 PnL，提供完整的盈亏视图

前端用户可以在 Activity Log 中查看完整的交易历史，并通过 PnL 卡片实时了解投资表现。
