# Mars Liquid API 指南

## 🚀 API 概览

Mars Liquid 是一个 DeFi 聚合收益平台，通过整合 Jupiter Lend 和 Kamino Earn，为用户提供最优的资产分配策略。

**基础 URL:** `https://mars.jongun2038.win`

## 📋 API 端点

### 1. 健康检查

**端点:** `GET /v1/api/mars/health`

检查系统健康状态和各服务连接情况。

```bash
curl "https://mars.jongun2038.win/v1/api/mars/health"
```

**响应示例:**
```json
{
  "status": "healthy",
  "services": {
    "jupiter": true,
    "kamino": true,
    "cache": true,
    "database": true
  },
  "metrics": {
    "totalTVL": 0,
    "activeUsers": 0,
    "avgAPY": 8.5,
    "systemLoad": 0.3
  },
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

### 2. 获取投资机会

**端点:** `GET /v1/api/mars/opportunities`

获取所有可用的 DeFi 投资机会（Jupiter Lend + Kamino）。

```bash
curl "https://mars.jongun2038.win/v1/api/mars/opportunities"
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "jupiter-9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
      "protocol": "jupiter",
      "asset": "USDC",
      "apy": 6.77,
      "tvl": 366496702129550,
      "available": true,
      "riskLevel": "low",
      "liquidityDepth": 36649670212955,
      "withdrawalTime": 0.5,
      "fees": {
        "deposit": 0,
        "withdraw": 0,
        "management": 0
      }
    }
  ],
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

### 3. 用户仓位查询

**端点:** `GET /v1/api/mars/positions/{userAddress}`

获取指定用户的所有 DeFi 仓位。

```bash
curl "https://mars.jongun2038.win/v1/api/mars/positions/A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "jupiter": {
      "protocol": "jupiter",
      "totalPositions": 1,
      "totalValue": 1284498,
      "avgAPY": 6.83,
      "positions": [
        {
          "id": "jupiter-9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
          "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
          "protocol": "jupiter",
          "asset": "USDC",
          "amount": 1284498,
          "shares": 1,
          "entryAPY": 6.83,
          "currentValue": 1284498,
          "unrealizedGain": 0,
          "depositTime": "2025-09-24T08:55:41.521Z",
          "lastUpdate": "2025-09-24T08:55:41.521Z"
        }
      ]
    },
    "kamino": {
      "protocol": "kamino",
      "totalPositions": 0,
      "totalValue": 0,
      "avgAPY": 0,
      "positions": []
    },
    "summary": {
      "totalProtocols": 1,
      "totalPositions": 1,
      "totalValue": 1284498,
      "avgAPY": 6.83
    }
  },
  "timestamp": "2025-09-24T08:55:41.521Z"
}
```

### 4. 创建存款交易

**端点:** `POST /v1/api/mars/transactions/deposit`

创建存款交易，返回优化的资产分配策略和交易预览。

**请求体:**
```json
{
  "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
  "asset": "USDC",
  "amount": 10,
  "riskProfile": "moderate"
}
```

```bash
curl -X POST "https://mars.jongun2038.win/v1/api/mars/transactions/deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
    "asset": "USDC",
    "amount": 10,
    "riskProfile": "moderate"
  }'
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "mars_1758703739464_6462k34el",
      "type": "deposit",
      "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
      "asset": "USDC",
      "amount": 10,
      "status": "pending",
      "createdAt": "2025-09-24T08:48:59.464Z"
    },
    "allocation": {
      "totalAmount": 10,
      "asset": "USDC",
      "riskProfile": "moderate",
      "allocations": [
        {
          "protocol": "jupiter",
          "percentage": 50,
          "amount": 5,
          "expectedAPY": 6.77
        },
        {
          "protocol": "kamino",
          "percentage": 50,
          "amount": 5,
          "expectedAPY": 8.5
        }
      ],
      "expectedAPY": 7.635,
      "riskScore": 5
    },
    "preview": {
      "estimatedGas": 5000,
      "fees": {
        "protocol": 0.01,
        "network": 5000,
        "total": 5000.01
      },
      "estimatedTime": 30
    }
  },
  "timestamp": "2025-09-24T08:49:00.211Z"
}
```

### 5. 创建取款交易

**端点:** `POST /v1/api/mars/transactions/withdraw`

创建取款交易，返回取款预览和费用估算。

**请求体:**
```json
{
  "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
  "asset": "USDC",
  "amount": 1
}
```

```bash
curl -X POST "https://mars.jongun2038.win/v1/api/mars/transactions/withdraw" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
    "asset": "USDC",
    "amount": 1
  }'
```

### 6. 资产分配优化

**端点:** `POST /v1/api/mars/optimize`

获取资产分配优化建议。

### 7. 取款预览

**端点:** `POST /v1/api/mars/withdraw/preview`

获取取款交易的预览信息和费用估算。

## 🔧 支持的资产

- **USDC**: USD Coin
- **USDT**: Tether USD  
- **SOL**: Solana
- **BONK**: Bonk

## 🛡️ 风险等级

- **conservative**: 保守型（低风险，稳定收益）
- **moderate**: 平衡型（中等风险，平衡收益）
- **aggressive**: 激进型（高风险，高收益）

## 📊 响应格式

所有 API 响应遵循统一格式：

**成功响应:**
```json
{
  "success": true,
  "data": { /* 响应数据 */ },
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

## 🚨 错误代码

- `FETCH_OPPORTUNITIES_ERROR`: 获取投资机会失败
- `FETCH_POSITIONS_ERROR`: 获取用户仓位失败
- `DEPOSIT_TRANSACTION_ERROR`: 创建存款交易失败
- `WITHDRAW_TRANSACTION_ERROR`: 创建取款交易失败
- `VALIDATION_ERROR`: 请求参数验证失败

## 💡 使用建议

1. **存款流程**: 
   - 调用 `/opportunities` 查看可用投资机会
   - 调用 `/transactions/deposit` 获得优化分配策略
   - 前端钱包签名并广播交易

2. **取款流程**:
   - 调用 `/positions/{userAddress}` 查看当前仓位
   - 调用 `/withdraw/preview` 预览取款费用
   - 调用 `/transactions/withdraw` 创建取款交易
   - 前端钱包签名并广播交易

3. **监控仓位**:
   - 定期调用 `/positions/{userAddress}` 监控仓位变化
   - 调用 `/health` 监控系统状态

## 🔗 集成示例

### JavaScript/TypeScript

```typescript
const MARS_API_BASE = 'https://mars.jongun2038.win';

// 获取投资机会
async function getOpportunities() {
  const response = await fetch(`${MARS_API_BASE}/v1/api/mars/opportunities`);
  return response.json();
}

// 创建存款交易
async function createDeposit(userAddress: string, asset: string, amount: number) {
  const response = await fetch(`${MARS_API_BASE}/v1/api/mars/transactions/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress,
      asset,
      amount,
      riskProfile: 'moderate'
    })
  });
  return response.json();
}

// 获取用户仓位
async function getUserPositions(userAddress: string) {
  const response = await fetch(`${MARS_API_BASE}/v1/api/mars/positions/${userAddress}`);
  return response.json();
}
```

## 📈 性能优化

- 所有数据都有缓存机制，减少外部 API 调用
- 健康检查响应时间 < 1秒
- 投资机会数据缓存 5分钟
- 用户仓位数据缓存 1分钟

## 🔒 安全性

- 所有交易都返回未签名状态，需要用户钱包签名
- API 无需认证，但有速率限制
- 敏感操作需要用户主动确认

---

**更新时间:** 2025年9月24日  
**API 版本:** v1.0.0  
**部署环境:** Cloudflare Workers  
**监控地址:** https://mars.jongun2038.win/v1/api/mars/health