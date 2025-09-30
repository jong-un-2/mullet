# Jupiter Lend & Kamino API 快速参考

## 🚀 Jupiter Lend API 参考

### 官方文档
- **API 文档**: https://dev.jup.ag/docs/lend-api/
- **基础 URL**: `https://earn.jup.ag/api/`
- **状态**: Beta 版本

### 主要端点

#### 1. 获取策略列表
```http
GET https://earn.jup.ag/api/strategies
Authorization: Bearer {your-api-key}
Content-Type: application/json
```

**响应示例:**
```json
{
  "strategies": [
    {
      "id": "usdc-earn-conservative",
      "name": "USDC Conservative Earn",
      "asset": "USDC",
      "apy": 8.5,
      "tvl": 1250000,
      "riskLevel": "low",
      "minDeposit": 10,
      "maxDeposit": 1000000
    }
  ]
}
```

#### 2. 获取用户仓位
```http
GET https://earn.jup.ag/api/positions/{userAddress}
Authorization: Bearer {your-api-key}
```

#### 3. 存款交易构建
```http
POST https://earn.jup.ag/api/deposit
Content-Type: application/json
Authorization: Bearer {your-api-key}

{
  "strategy": "usdc-earn-conservative",
  "amount": 1000,
  "user": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

#### 4. 获取收益数据
```http
GET https://earn.jup.ag/api/yields
GET https://earn.jup.ag/api/yields/{strategyId}
Authorization: Bearer {your-api-key}
```

### TypeScript 集成示例
```typescript
class JupiterLendAPI {
  private baseUrl = 'https://earn.jup.ag/api';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API Error: ${response.status}`);
    }

    return response.json();
  }

  async getStrategies(): Promise<JupiterStrategy[]> {
    const data = await this.request<{strategies: JupiterStrategy[]}>('/strategies');
    return data.strategies;
  }

  async getUserPositions(userAddress: string): Promise<JupiterPosition[]> {
    const data = await this.request<{positions: JupiterPosition[]}>(`/positions/${userAddress}`);
    return data.positions;
  }

  async createDepositTransaction(params: {
    strategy: string;
    amount: number;
    user: string;
  }): Promise<string> {
    const data = await this.request<{transaction: string}>('/deposit', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    return data.transaction;
  }
}
```

## 🏛️ Kamino SDK 参考

### 官方文档
- **SDK 文档**: https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts
- **NPM 包**: `@kamino-finance/klend-sdk`
- **GitHub**: https://github.com/Kamino-Finance/klend-sdk

### 安装
```bash
npm install @kamino-finance/klend-sdk @solana/web3.js
```

### 核心类使用

#### 1. KaminoMarket 初始化
```typescript
import { KaminoMarket } from '@kamino-finance/klend-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3');
const marketAddress = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

const market = await KaminoMarket.load(connection, marketAddress);
await market.loadReserves();
```

#### 2. 获取储备池信息
```typescript
// 获取所有储备池
const reserves = market.reserves;

// 筛选稳定币储备池
const stablecoinReserves = reserves.filter(reserve => 
  ['USDC', 'USDT', 'DAI'].includes(reserve.config.tokenInfo.symbol)
);

// 获取储备池统计
for (const reserve of stablecoinReserves) {
  console.log({
    symbol: reserve.config.tokenInfo.symbol,
    supplyAPY: reserve.stats.supplyInterestAPY,
    totalSupply: reserve.stats.totalSupplyWads.toString(),
    utilizationRate: reserve.stats.utilizationRate
  });
}
```

#### 3. 用户仓位管理
```typescript
import { VanillaObligation } from '@kamino-finance/klend-sdk';

// 获取用户仓位
const userPublicKey = new PublicKey('用户地址');
const obligations = await market.getUserObligationsByTag(
  VanillaObligation.tag,
  userPublicKey
);

// 创建存款交易
const reserve = market.getReserveBySymbol('USDC');
if (reserve) {
  const obligation = obligations[0] || await VanillaObligation.initialize(
    market,
    userPublicKey,
    connection
  );

  const depositTxs = await obligation.buildDepositTxn(
    reserve,
    1000, // 存款金额
    userPublicKey
  );
}
```

#### 4. 收益数据获取
```typescript
interface KaminoYieldData {
  asset: string;
  supplyAPY: number;
  borrowAPY: number;
  tvl: number;
  utilizationRate: number;
  riskScore: number;
}

function extractYieldData(reserve: any): KaminoYieldData {
  return {
    asset: reserve.config.tokenInfo.symbol,
    supplyAPY: reserve.stats.supplyInterestAPY,
    borrowAPY: reserve.stats.borrowInterestAPY,
    tvl: reserve.stats.totalSupplyWads.toNumber(),
    utilizationRate: reserve.stats.utilizationRate,
    riskScore: calculateRiskScore(reserve) // 自定义风险评分
  };
}
```

## 🌉 DeBridge API 参考

### 跨链桥接集成
```typescript
import { DlnOrderBuilder, DlnApiClient } from '@debridge-finance/dln-client';

const dlnClient = new DlnApiClient({
  apiKey: 'your-debridge-api-key',
  environment: 'production'
});

// 获取跨链报价
const quote = await dlnClient.getOrderQuote({
  srcChainId: 1,        // Ethereum
  dstChainId: 56,       // BSC
  srcTokenAddress: '0xA0b86a33E6411C8BA83D2C2761030b8D9B7Ce587', // USDC on Ethereum
  dstTokenAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC on BSC
  srcTokenAmount: '1000000000' // 1000 USDC (6 decimals)
});

// 创建跨链订单
const order = DlnOrderBuilder.fromQuote(quote);
const result = await dlnClient.createOrder(order);
```

## 🔑 环境变量配置

### .env 示例
```env
# Jupiter Lend
JUPITER_API_KEY=your_jupiter_lend_api_key
JUPITER_BASE_URL=https://earn.jup.ag/api

# Solana RPC
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
SOLANA_RPC_WSS=wss://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3

# Kamino
KAMINO_MARKET_ADDRESS=7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF

# DeBridge
DEBRIDGE_API_KEY=your_debridge_api_key
DEBRIDGE_BASE_URL=https://api.dln.trade

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

## 📊 错误处理代码

### 统一错误处理
```typescript
class APIError extends Error {
  constructor(
    public api: string,
    public status: number,
    public message: string,
    public retryAfter?: number
  ) {
    super(`${api} API Error: ${status} - ${message}`);
  }
}

async function handleApiCall<T>(
  apiName: string,
  apiCall: () => Promise<Response>
): Promise<T> {
  try {
    const response = await apiCall();
    
    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      throw new APIError(
        apiName,
        response.status,
        await response.text(),
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    throw new APIError(apiName, 0, error.message);
  }
}
```

## 🚦 Rate Limit 处理

### 请求队列管理
```typescript
class RateLimitManager {
  private queues: Map<string, Array<() => Promise<any>>> = new Map();
  private processing: Set<string> = new Set();
  
  async enqueue<T>(
    apiName: string,
    request: () => Promise<T>,
    rateLimit: { requests: number; windowMs: number }
  ): Promise<T> {
    if (!this.queues.has(apiName)) {
      this.queues.set(apiName, []);
    }
    
    return new Promise((resolve, reject) => {
      this.queues.get(apiName)!.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue(apiName, rateLimit);
    });
  }
  
  private async processQueue(
    apiName: string,
    rateLimit: { requests: number; windowMs: number }
  ): Promise<void> {
    if (this.processing.has(apiName)) return;
    
    this.processing.add(apiName);
    const queue = this.queues.get(apiName)!;
    const delay = rateLimit.windowMs / rateLimit.requests;
    
    while (queue.length > 0) {
      const request = queue.shift()!;
      await request();
      
      if (queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.processing.delete(apiName);
  }
}

// 使用示例
const rateLimiter = new RateLimitManager();

// Jupiter API: 60 requests per minute
const jupiterData = await rateLimiter.enqueue(
  'jupiter',
  () => fetch('https://earn.jup.ag/api/strategies'),
  { requests: 60, windowMs: 60000 }
);
```

## 📋 类型定义

```typescript
// Jupiter Lend 类型
interface JupiterStrategy {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: number;
  riskLevel: 'low' | 'medium' | 'high';
  minDeposit: number;
  maxDeposit: number;
}

interface JupiterPosition {
  strategyId: string;
  amount: number;
  shares: number;
  currentValue: number;
  unrealizedPnl: number;
  entryTime: string;
}

// Kamino 类型
interface KaminoReserveInfo {
  symbol: string;
  mint: string;
  supplyAPY: number;
  borrowAPY: number;
  tvl: number;
  utilizationRate: number;
}

// 通用收益数据类型
interface YieldOpportunity {
  protocol: 'jupiter' | 'kamino';
  id: string;
  asset: string;
  apy: number;
  tvl: number;
  riskScore: number;
  minDeposit: number;
  maxDeposit: number;
}
```

---

这个快速参考文档包含了：
- **Jupiter Lend API** 的完整端点和使用方法
- **Kamino SDK** 的核心类和功能
- **DeBridge** 跨链桥接集成
- **错误处理** 和 **Rate Limit** 管理
- **类型定义** 和环境配置

Daddy，现在有了完整的 API 参考，开发时可以直接查阅使用！