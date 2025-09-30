# Mars Liquid Backend Module

Mars Liquid 是一个统一的 DeFi 收益优化平台，集成了 Jupiter Lend 和 Kamino Earn 协议。

## 🏗️ 架构概览

```
backend/src/mars/
├── index.ts                 # 主入口模块
├── types.ts                 # 类型定义
├── cache.ts                 # 缓存管理
├── routes.ts                # API 路由
├── jupiter/
│   └── client.ts           # Jupiter Lend 客户端
├── kamino/  
│   └── client.ts           # Kamino SDK 客户端
└── transactions/
    ├── manager.ts          # 交易管理器
    └── withdraw.ts         # 取款管理器
```

## 📡 API 端点

### 基础 URL
```
https://your-worker.workers.dev/v1/api/mars
```

### 1. 收益机会

**GET /opportunities**
```bash
curl "https://your-worker.workers.dev/v1/api/mars/opportunities?asset=USDC"
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "jupiter-usdc-earn",
      "protocol": "jupiter",
      "asset": "USDC", 
      "apy": 7.5,
      "tvl": 50000000,
      "available": true,
      "riskLevel": "low",
      "liquidityDepth": 5000000,
      "withdrawalTime": 0.5,
      "fees": {
        "deposit": 0,
        "withdraw": 0.001,
        "management": 0
      }
    }
  ],
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 2. 分配优化

**POST /optimize**
```bash
curl -X POST "https://your-worker.workers.dev/v1/api/mars/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "asset": "USDC",
    "riskProfile": "moderate"
  }'
```

**响应:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 1000,
    "asset": "USDC",
    "riskProfile": "moderate",
    "allocations": [
      {
        "protocol": "jupiter",
        "percentage": 50,
        "amount": 500,
        "expectedAPY": 7.5
      },
      {
        "protocol": "kamino", 
        "percentage": 50,
        "amount": 500,
        "expectedAPY": 9.2
      }
    ],
    "expectedAPY": 8.35,
    "riskScore": 5
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 3. 用户仓位

**GET /positions/:userAddress**
```bash
curl "https://your-worker.workers.dev/v1/api/mars/positions/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
```

### 4. 存款交易

**POST /transactions/deposit**
```bash
curl -X POST "https://your-worker.workers.dev/v1/api/mars/transactions/deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "asset": "USDC", 
    "amount": 1000,
    "riskProfile": "moderate"
  }'
```

### 5. 取款交易

**POST /transactions/withdraw**
```bash
curl -X POST "https://your-worker.workers.dev/v1/api/mars/transactions/withdraw" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "asset": "USDC",
    "amount": 500
  }'
```

### 6. 取款预览

**POST /withdraw/preview**
```bash
curl -X POST "https://your-worker.workers.dev/v1/api/mars/withdraw/preview" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "asset": "USDC",
    "amount": 500
  }'
```

**响应:**
```json
{
  "success": true,
  "data": {
    "availableAmount": 1000,
    "requestedAmount": 500,
    "fees": {
      "protocol": 1.0,
      "network": 0.125,
      "slippage": 0.125,
      "total": 1.25
    },
    "estimatedReceived": 498.75,
    "estimatedTime": 60,
    "withdrawPaths": [
      {
        "protocol": "jupiter",
        "percentage": 60,
        "amount": 300,
        "estimatedTime": 30,
        "fees": 0.6,
        "liquidity": 6000,
        "priority": 8
      },
      {
        "protocol": "kamino", 
        "percentage": 40,
        "amount": 200,
        "estimatedTime": 60,
        "fees": 0.4,
        "liquidity": 1000,
        "priority": 6
      }
    ],
    "optimalPath": {
      "protocol": "jupiter",
      "percentage": 60,
      "amount": 300,
      "estimatedTime": 30,
      "fees": 0.6,
      "liquidity": 6000,
      "priority": 8
    }
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 7. 健康检查

**GET /health**
```bash
curl "https://your-worker.workers.dev/v1/api/mars/health"
```

**响应:**
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
    "totalTVL": 125000000,
    "activeUsers": 1250,
    "avgAPY": 8.5,
    "systemLoad": 0.3
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## 🔧 使用示例

### TypeScript 客户端

```typescript
import { createMarsModule } from './mars';

// 创建 Mars 模块实例
const mars = createMarsModule({
  KV: env.KV,
  D1_DATABASE: env.D1_DATABASE
});

// 获取收益机会
const opportunities = await mars.getOpportunities('USDC');

// 获取用户仓位
const positions = await mars.getUserPositions(userAddress);

// 创建存款交易
const depositResult = await mars.managers.transaction.createDepositTransaction({
  userAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  asset: 'USDC',
  amount: 1000,
  riskProfile: 'moderate'
});

// 获取取款预览
const withdrawPreview = await mars.managers.withdraw.getWithdrawPreview(
  userAddress,
  'USDC', 
  500
);
```

### 缓存使用

```typescript
import { MarsDataCache } from './mars/cache';

const cache = new MarsDataCache(env.KV);

// 获取或缓存数据
const data = await cache.getOrFetch(
  'my-key',
  async () => {
    // 昂贵的 API 调用
    return await fetchExpensiveData();
  },
  300 // TTL 5分钟
);

// 清除特定前缀的缓存
await cache.clearPrefix('mars:jupiter:');
```

## 🚀 部署

1. **安装依赖:**
```bash
cd backend
npm install
```

2. **配置环境:**
```bash
cp wrangler.example.toml wrangler.toml
# 编辑 wrangler.toml 配置
```

3. **部署:**
```bash
npm run deploy
```

## 📊 监控

### 缓存统计
```bash
curl "https://your-worker.workers.dev/v1/api/cache/status"
```

### 性能指标
```bash
curl "https://your-worker.workers.dev/v1/api/mars/health"
```

## 🔒 错误处理

所有 API 端点都使用统一的错误格式:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 常见错误代码

- `FETCH_OPPORTUNITIES_ERROR` - 获取收益机会失败
- `OPTIMIZATION_ERROR` - 分配优化失败  
- `DEPOSIT_TRANSACTION_ERROR` - 存款交易创建失败
- `WITHDRAW_TRANSACTION_ERROR` - 取款交易创建失败
- `WITHDRAW_PREVIEW_ERROR` - 取款预览失败
- `JUPITER_ERROR` - Jupiter API 相关错误
- `KAMINO_ERROR` - Kamino SDK 相关错误
- `TRANSACTION_ERROR` - 交易处理错误

## 📝 开发指南

### 添加新协议

1. 在 `types.ts` 中添加协议类型
2. 创建新的客户端类（参考 `jupiter/client.ts`）
3. 更新 `transactions/manager.ts` 以支持新协议
4. 添加相应的路由处理

### 缓存策略

- 使用 `@cached` 装饰器自动缓存方法结果
- 为不同类型的数据设置合适的 TTL
- 利用 `MarsDataCache.userKey()` 等工具函数创建结构化缓存键

### 测试

```bash
# 运行所有测试
npm run test

# 运行 Mars 模块测试
npm run test test/mars.spec.ts
```

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件