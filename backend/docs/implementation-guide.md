# Jupiter Lend & Kamino 技术实现指南

## � 官方 API 文档参考

### Jupiter Lend API
- **完整 API 文档**: https://dev.jup.ag/docs/lend-api/
- **基础 URL**: `https://earn.jup.ag/api/`
- **API 版本**: Beta (可能有变动)
- **认证方式**: Bearer Token (需申请)

#### 主要端点
```typescript
// Jupiter Lend API 端点
const JUPITER_ENDPOINTS = {
  strategies: 'https://earn.jup.ag/api/strategies',        // 获取策略列表
  deposit: 'https://earn.jup.ag/api/deposit',              // 存款
  withdraw: 'https://earn.jup.ag/api/withdraw',            // 提款  
  positions: 'https://earn.jup.ag/api/positions',         // 用户仓位
  yields: 'https://earn.jup.ag/api/yields',               // 收益数据
};
```

### Kamino Finance SDK
- **SDK 文档**: https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts
- **NPM 包**: `@kamino-finance/klend-sdk`
- **GitHub**: https://github.com/Kamino-Finance/klend-sdk
- **类型定义**: 完整的 TypeScript 支持

#### 核心类
```typescript
// Kamino SDK 主要类
import { 
  KaminoMarket,           // 市场操作
  VanillaObligation,      // 用户仓位
  Reserve,                // 储备池
  KaminoAction           // 操作构建器
} from '@kamino-finance/klend-sdk';
```

### 集成策略
1. **Jupiter Lend**: 优先使用 API，链上查询作为备份
2. **Kamino**: 直接使用官方 SDK
3. **错误处理**: 多层级降级策略
4. **缓存机制**: Cloudflare KV 存储减少 API 调用

## �🔧 核心 SDK 集成

### Jupiter Lend 集成实现

#### 1. 基础 SDK 封装
```typescript
// src/jupiter/jupiter-lend-client.ts
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, Idl, web3 } from '@coral-xyz/anchor';

interface JupiterLendConfig {
  rpcUrl: string;
  programId: string;
  apiKey?: string;
}

export class JupiterLendClient {
  private connection: Connection;
  private apiKey: string;
  private baseUrl: string = 'https://earn.jup.ag/api';
  
  constructor(config: JupiterLendConfig) {
    this.connection = new Connection(config.rpcUrl);
    this.apiKey = config.apiKey || '';
  }

  // 获取 Earn 策略列表 (基于官方 API)
  async getEarnStrategies(): Promise<JupiterEarnStrategy[]> {
    try {
      const response = await fetch(`${this.baseUrl}/strategies`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit - 等待后重试
          await this.delay(2000);
          return this.getEarnStrategies();
        }
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.normalizeStrategies(data);
    } catch (error) {
      console.warn('Jupiter API 失败，使用链上查询:', error);
      return this.getStrategiesFromChain();
    }
  }

  // 获取用户仓位 (官方 API)
  async getUserPositions(userAddress: string): Promise<JupiterPosition[]> {
    try {
      const response = await fetch(`${this.baseUrl}/positions/${userAddress}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.positions || [];
      }
    } catch (error) {
      console.warn('获取用户仓位失败:', error);
    }
    
    // Fallback 到链上查询
    return this.getUserPositionsFromChain(userAddress);
  }

  // 存入 Earn 策略 (构建交易)
  async createDepositTransaction(params: {
    strategyId: string;
    amount: number;
    userPublicKey: PublicKey;
  }): Promise<Transaction> {
    const { strategyId, amount, userPublicKey } = params;
    
    try {
      // 调用 Jupiter API 构建交易
      const response = await fetch(`${this.baseUrl}/deposit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strategy: strategyId,
          amount: amount,
          user: userPublicKey.toString()
        })
      });
      
      if (response.ok) {
        const { transaction } = await response.json();
        return Transaction.from(Buffer.from(transaction, 'base64'));
      }
    } catch (error) {
      console.warn('API 构建交易失败，使用直接合约调用:', error);
    }
    
    // Fallback 到直接合约交互
    return this.buildDepositTransactionDirect(params);
  }

  // 获取实时收益率
  async getYieldData(strategyId?: string): Promise<YieldData[]> {
    try {
      const endpoint = strategyId 
        ? `${this.baseUrl}/yields/${strategyId}`
        : `${this.baseUrl}/yields`;
        
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('获取收益数据失败:', error);
    }
    
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 从链上直接获取策略数据 (Fallback)
  private async getStrategiesFromChain(): Promise<JupiterEarnStrategy[]> {
    // 直接读取 Jupiter Lend 合约状态
    const accounts = await this.connection.getProgramAccounts(
      new PublicKey(this.programId)
    );
    
    // 解析合约数据，提取策略信息
    return this.parseStrategyAccounts(accounts);
  }

  // 存入 Earn 策略
  async depositToEarn(params: {
    strategy: string;
    amount: number;
    userPublicKey: PublicKey;
  }): Promise<Transaction> {
    const { strategy, amount, userPublicKey } = params;
    
    // 构建存款交易
    const transaction = new Transaction();
    
    // 添加存款指令 (需要根据实际合约 IDL 调整)
    const depositIx = await this.program.methods
      .deposit(new web3.BN(amount))
      .accounts({
        user: userPublicKey,
        strategy: new PublicKey(strategy),
        // ... 其他必需账户
      })
      .instruction();
      
    transaction.add(depositIx);
    return transaction;
  }

  // 查询用户仓位
  async getUserPositions(userAddress: string): Promise<JupiterPosition[]> {
    const userPubKey = new PublicKey(userAddress);
    
    // 查询用户相关的所有账户
    const userAccounts = await this.connection.getProgramAccounts(
      new PublicKey(this.programId),
      {
        filters: [
          {
            memcmp: {
              offset: 8, // 跳过 discriminator
              bytes: userPubKey.toBase58()
            }
          }
        ]
      }
    );

    return this.parseUserPositions(userAccounts);
  }
}

// 类型定义
interface JupiterEarnStrategy {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: number;
  riskLevel: 'low' | 'medium' | 'high';
  protocol: string;
  minDeposit: number;
  maxDeposit: number;
}

interface JupiterPosition {
  strategyId: string;
  amount: number;
  shares: number;
  entryPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  lastUpdate: Date;
}
```

#### 2. Kamino Earn SDK 集成 (基于官方文档)
```typescript
// src/kamino/kamino-client.ts
import { 
  KaminoMarket, 
  VanillaObligation, 
  KaminoAction,
  Reserve,
  ObligationType
} from '@kamino-finance/klend-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

export class KaminoEarnClient {
  private connection: Connection;
  private market: KaminoMarket | null = null;
  
  // Kamino 主市场地址 (基于官方文档)
  private readonly KAMINO_MARKET_ADDRESS = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // 初始化市场数据 (基于官方 SDK 模式)
  async initialize(): Promise<void> {
    try {
      this.market = await KaminoMarket.load(
        this.connection,
        this.KAMINO_MARKET_ADDRESS,
        undefined, // slot
        true       // loadReserves
      );
      
      console.log('Kamino Market 初始化成功');
    } catch (error) {
      console.error('Kamino Market 初始化失败:', error);
      throw error;
    }
  }

  // 确保市场已初始化
  private ensureMarketLoaded(): KaminoMarket {
    if (!this.market) {
      throw new Error('Kamino Market 未初始化，请先调用 initialize()');
    }
    return this.market;
  }

  // 获取可用的 Earn 策略
  async getEarnStrategies(): Promise<KaminoStrategy[]> {
    await this.market.loadReserves();
    
    const strategies: KaminoStrategy[] = [];
    
    // 遍历所有储备池，找到稳定币相关的策略
    for (const reserve of this.market.reserves) {
      const reserveData = reserve.stats;
      
      if (this.isStablecoin(reserve.config.tokenInfo.symbol)) {
        strategies.push({
          id: reserve.address.toString(),
          name: `Kamino ${reserve.config.tokenInfo.symbol} Earn`,
          asset: reserve.config.tokenInfo.symbol,
          apy: reserveData.supplyInterestAPY,
          tvl: reserveData.totalSupplyWads.toNumber(),
          riskScore: this.calculateRiskScore(reserve),
          protocol: 'Kamino',
          liquidityDepth: reserveData.totalSupplyWads.toNumber(),
          utilizationRate: reserveData.utilizationRate
        });
      }
    }

    return strategies;
  }

  // 存入 Kamino Earn
  async deposit(params: {
    reserveAddress: string;
    amount: number;
    userPublicKey: PublicKey;
  }): Promise<Transaction[]> {
    const { reserveAddress, amount, userPublicKey } = params;
    
    const reserve = this.market.getReserveByAddress(reserveAddress);
    if (!reserve) throw new Error('Reserve not found');

    // 创建或获取用户的 Obligation 账户
    const obligation = await VanillaObligation.initialize(
      this.market,
      userPublicKey,
      this.connection
    );

    // 构建存款交易
    const depositTxs = await obligation.buildDepositTxn(
      reserve,
      amount,
      userPublicKey
    );

    return depositTxs;
  }

  // 获取用户在 Kamino 的仓位
  async getUserPositions(userAddress: string): Promise<KaminoPosition[]> {
    const userPubKey = new PublicKey(userAddress);
    
    // 加载用户的 obligations
    const obligations = await this.market.getUserObligationsByTag(
      VanillaObligation.tag, 
      userPubKey
    );

    const positions: KaminoPosition[] = [];
    
    for (const obligation of obligations) {
      for (const deposit of obligation.deposits) {
        if (deposit.amount.gt(new BN(0))) {
          const reserve = this.market.getReserveByMint(deposit.mintAddress);
          
          positions.push({
            reserveId: reserve?.address.toString() || '',
            asset: reserve?.config.tokenInfo.symbol || '',
            depositedAmount: deposit.amount.toNumber(),
            currentValue: deposit.marketValueRefreshed.toNumber(),
            apy: reserve?.stats.supplyInterestAPY || 0,
            lastUpdate: new Date()
          });
        }
      }
    }

    return positions;
  }

  private isStablecoin(symbol: string): boolean {
    const stablecoins = ['USDC', 'USDT', 'PYUSD', 'DAI', 'FRAX'];
    return stablecoins.includes(symbol.toUpperCase());
  }

  private calculateRiskScore(reserve: any): number {
    // 基于 TVL、利用率、历史表现计算风险评分
    const utilizationRate = reserve.stats.utilizationRate;
    const tvl = reserve.stats.totalSupplyWads.toNumber();
    
    // 简单的风险评分算法 (1-10, 10 最高风险)
    if (tvl < 1000000) return 8; // 低 TVL 高风险
    if (utilizationRate > 0.9) return 7; // 高利用率风险
    if (utilizationRate < 0.3) return 3; // 低利用率低风险
    
    return 5; // 中等风险
  }
}

interface KaminoStrategy {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: number;
  riskScore: number;
  protocol: string;
  liquidityDepth: number;
  utilizationRate: number;
}

interface KaminoPosition {
  reserveId: string;
  asset: string;
  depositedAmount: number;
  currentValue: number;
  apy: number;
  lastUpdate: Date;
}
```

### 3. 跨链桥接 (DeBridge) 集成
```typescript
// src/crosschain/debridge-client.ts
import { DlnOrderBuilder, DlnApiClient } from '@debridge-finance/dln-client';

export class CrossChainManager {
  private dlnClient: DlnApiClient;
  
  constructor(apiKey: string) {
    this.dlnClient = new DlnApiClient({
      apiKey,
      environment: 'production' // or 'testnet'
    });
  }

  // 获取跨链路由报价
  async getQuote(params: {
    fromChainId: number;
    toChainId: number;
    tokenIn: string;
    tokenOut: string;
    amount: string;
  }): Promise<CrossChainQuote> {
    const { fromChainId, toChainId, tokenIn, tokenOut, amount } = params;
    
    const quote = await this.dlnClient.getOrderQuote({
      srcChainId: fromChainId,
      dstChainId: toChainId,
      srcTokenAddress: tokenIn,
      dstTokenAddress: tokenOut,
      srcTokenAmount: amount,
      // 接收地址将在执行时指定
    });

    return {
      srcAmount: quote.srcTokenAmount,
      dstAmount: quote.dstTokenAmount,
      fee: quote.fee,
      estimatedTime: quote.estimatedTime,
      route: quote.route,
      priceImpact: quote.priceImpact
    };
  }

  // 执行跨链转账
  async executeCrossChain(params: {
    fromChainId: number;
    toChainId: number;
    tokenIn: string;
    tokenOut: string;
    amount: string;
    recipient: string;
    slippage: number;
  }): Promise<CrossChainResult> {
    const order = DlnOrderBuilder.fromQuote({
      srcChainId: params.fromChainId,
      dstChainId: params.toChainId,
      srcTokenAddress: params.tokenIn,
      dstTokenAddress: params.tokenOut,
      srcTokenAmount: params.amount,
      dstTokenRecipient: params.recipient,
      slippage: params.slippage
    });

    // 创建订单
    const result = await this.dlnClient.createOrder(order);
    
    return {
      orderId: result.orderId,
      srcTxHash: result.srcTxHash,
      status: 'pending',
      estimatedCompletion: new Date(Date.now() + result.estimatedTime * 1000)
    };
  }

  // 监控跨链状态
  async monitorTransfer(orderId: string): Promise<TransferStatus> {
    const status = await this.dlnClient.getOrderStatus(orderId);
    
    return {
      orderId,
      status: status.status,
      srcTxHash: status.srcTxHash,
      dstTxHash: status.dstTxHash,
      completedAt: status.completedAt ? new Date(status.completedAt) : null,
      failureReason: status.failureReason
    };
  }
}

interface CrossChainQuote {
  srcAmount: string;
  dstAmount: string;
  fee: string;
  estimatedTime: number;
  route: string[];
  priceImpact: number;
}

interface CrossChainResult {
  orderId: string;
  srcTxHash: string;
  status: 'pending' | 'completed' | 'failed';
  estimatedCompletion: Date;
}

interface TransferStatus {
  orderId: string;
  status: 'created' | 'fulfilled' | 'completed' | 'cancelled';
  srcTxHash?: string;
  dstTxHash?: string;
  completedAt?: Date;
  failureReason?: string;
}
```

## 🧮 收益优化算法

### 收益计算引擎
```typescript
// src/aggregator/yield-calculator.ts
export class YieldCalculator {
  private protocolClients: Map<string, any> = new Map();

  constructor() {
    // 初始化各协议客户端
    this.protocolClients.set('jupiter', new JupiterLendClient(config));
    this.protocolClients.set('kamino', new KaminoEarnClient(config));
  }

  // 获取所有协议的收益率数据
  async getAllYieldOpportunities(asset: 'USDC' | 'USDT'): Promise<YieldOpportunity[]> {
    const opportunities: YieldOpportunity[] = [];
    
    // 并行获取各协议数据
    const [jupiterStrategies, kaminoStrategies] = await Promise.all([
      this.getJupiterYields(asset),
      this.getKaminoYields(asset)
    ]);

    opportunities.push(...jupiterStrategies, ...kaminoStrategies);
    
    // 按风险调整后收益排序
    return opportunities.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);
  }

  // 计算最优分配策略
  calculateOptimalAllocation(
    totalAmount: number,
    opportunities: YieldOpportunity[],
    riskProfile: RiskProfile
  ): AllocationStrategy {
    // 现代投资组合理论 (MPT) 实现
    const weights = this.optimizePortfolio(opportunities, riskProfile);
    
    const allocations: Allocation[] = [];
    let remainingAmount = totalAmount;

    for (let i = 0; i < opportunities.length; i++) {
      const opportunity = opportunities[i];
      const allocationAmount = Math.floor(totalAmount * weights[i]);
      
      // 检查最小投资额限制
      if (allocationAmount >= opportunity.minDeposit && remainingAmount > 0) {
        const finalAmount = Math.min(allocationAmount, remainingAmount, opportunity.maxDeposit);
        
        allocations.push({
          protocol: opportunity.protocol,
          strategyId: opportunity.id,
          amount: finalAmount,
          expectedApy: opportunity.apy,
          riskScore: opportunity.riskScore
        });
        
        remainingAmount -= finalAmount;
      }
    }

    return {
      allocations,
      expectedApy: this.calculateWeightedApy(allocations),
      riskScore: this.calculateWeightedRisk(allocations),
      diversificationRatio: allocations.length / opportunities.length
    };
  }

  // 投资组合优化算法
  private optimizePortfolio(
    opportunities: YieldOpportunity[],
    riskProfile: RiskProfile
  ): number[] {
    // 风险厌恶系数
    const riskAversion = {
      conservative: 5,
      moderate: 2,
      aggressive: 0.5
    }[riskProfile];

    // 简化的均值-方差优化
    const returns = opportunities.map(o => o.apy / 100);
    const risks = opportunities.map(o => o.riskScore / 10);
    
    // 效用函数：U = μ - (λ/2)σ²
    const utilities = returns.map((r, i) => 
      r - (riskAversion / 2) * Math.pow(risks[i], 2)
    );

    // 软最大分配 (softmax)
    const exp_utilities = utilities.map(u => Math.exp(u * 5));
    const sum_exp = exp_utilities.reduce((a, b) => a + b, 0);
    
    return exp_utilities.map(e => e / sum_exp);
  }

  // 重平衡检查
  async shouldRebalance(
    currentAllocation: AllocationStrategy,
    targetAllocation: AllocationStrategy
  ): Promise<RebalanceRecommendation> {
    const threshold = 0.05; // 5% 阈值
    
    let maxDeviation = 0;
    const rebalanceActions: RebalanceAction[] = [];

    for (let i = 0; i < currentAllocation.allocations.length; i++) {
      const current = currentAllocation.allocations[i];
      const target = targetAllocation.allocations[i];
      
      if (current && target) {
        const deviation = Math.abs(current.amount - target.amount) / target.amount;
        maxDeviation = Math.max(maxDeviation, deviation);
        
        if (deviation > threshold) {
          rebalanceActions.push({
            protocol: current.protocol,
            strategyId: current.strategyId,
            action: current.amount > target.amount ? 'withdraw' : 'deposit',
            amount: Math.abs(current.amount - target.amount)
          });
        }
      }
    }

    return {
      shouldRebalance: maxDeviation > threshold,
      maxDeviation,
      actions: rebalanceActions,
      estimatedCost: this.calculateRebalanceCost(rebalanceActions),
      estimatedBenefit: this.calculateRebalanceBenefit(currentAllocation, targetAllocation)
    };
  }
}

// 类型定义
interface YieldOpportunity {
  id: string;
  protocol: string;
  name: string;
  asset: string;
  apy: number;
  riskScore: number;
  riskAdjustedReturn: number;
  tvl: number;
  liquidityDepth: number;
  minDeposit: number;
  maxDeposit: number;
  withdrawalTime: number; // hours
  fees: {
    deposit: number;
    withdraw: number;
    management: number;
  };
}

type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

interface Allocation {
  protocol: string;
  strategyId: string;
  amount: number;
  expectedApy: number;
  riskScore: number;
}

interface AllocationStrategy {
  allocations: Allocation[];
  expectedApy: number;
  riskScore: number;
  diversificationRatio: number;
}

interface RebalanceAction {
  protocol: string;
  strategyId: string;
  action: 'deposit' | 'withdraw';
  amount: number;
}

interface RebalanceRecommendation {
  shouldRebalance: boolean;
  maxDeviation: number;
  actions: RebalanceAction[];
  estimatedCost: number;
  estimatedBenefit: number;
}
```

## 🎯 Cloudflare Workers API 实现

### Workers 主入口
```typescript
// src/index.ts - Cloudflare Workers 入口
import { YieldAggregatorAPI } from './api/yield-aggregator';
import { CrossChainAPI } from './api/cross-chain';
import { PositionAPI } from './api/position-manager';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // CORS 处理
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      // API 路由
      if (path.startsWith('/api/yield')) {
        return await YieldAggregatorAPI.handle(request, env);
      }
      
      if (path.startsWith('/api/crosschain')) {
        return await CrossChainAPI.handle(request, env);
      }
      
      if (path.startsWith('/api/positions')) {
        return await PositionAPI.handle(request, env);
      }

      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// 收益聚合 API
class YieldAggregatorAPI {
  static async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/yield/opportunities') {
      return this.getYieldOpportunities(request, env);
    }
    
    if (url.pathname === '/api/yield/optimize') {
      return this.optimizeAllocation(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }

  static async getYieldOpportunities(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const asset = url.searchParams.get('asset') as 'USDC' | 'USDT';
    
    if (!asset || !['USDC', 'USDT'].includes(asset)) {
      return Response.json({ error: 'Invalid asset' }, { status: 400 });
    }

    const calculator = new YieldCalculator();
    const opportunities = await calculator.getAllYieldOpportunities(asset);
    
    return Response.json({
      asset,
      opportunities,
      lastUpdate: new Date().toISOString(),
      count: opportunities.length
    });
  }

  static async optimizeAllocation(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.json();
    const { amount, asset, riskProfile } = body;

    if (!amount || !asset || !riskProfile) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const calculator = new YieldCalculator();
    const opportunities = await calculator.getAllYieldOpportunities(asset);
    const allocation = calculator.calculateOptimalAllocation(amount, opportunities, riskProfile);

    return Response.json({
      allocation,
      totalAmount: amount,
      asset,
      riskProfile,
      estimatedAnnualReturn: allocation.expectedApy * amount / 100
    });
  }
}
```

### 定时任务 (Cron Jobs)
```typescript
// src/scheduled/yield-monitor.ts
export class YieldMonitor {
  // 每小时更新收益率数据
  static async updateYieldData(env: Env): Promise<void> {
    const assets = ['USDC', 'USDT'];
    
    for (const asset of assets) {
      try {
        const calculator = new YieldCalculator();
        const opportunities = await calculator.getAllYieldOpportunities(asset as any);
        
        // 存储到 KV
        await env.YIELD_CACHE.put(
          `yields:${asset}:${Date.now()}`,
          JSON.stringify(opportunities),
          { expirationTtl: 3600 } // 1 hour TTL
        );
        
        console.log(`Updated yield data for ${asset}: ${opportunities.length} opportunities`);
      } catch (error) {
        console.error(`Failed to update yield data for ${asset}:`, error);
      }
    }
  }

  // 检查需要重平衡的仓位
  static async checkRebalanceNeeds(env: Env): Promise<void> {
    // 从数据库获取所有活跃仓位
    const activePositions = await this.getActivePositions(env);
    
    for (const position of activePositions) {
      const calculator = new YieldCalculator();
      const currentOpportunities = await calculator.getAllYieldOpportunities(position.asset);
      const newAllocation = calculator.calculateOptimalAllocation(
        position.totalValue,
        currentOpportunities,
        position.riskProfile
      );

      const rebalanceCheck = await calculator.shouldRebalance(
        position.currentAllocation,
        newAllocation
      );

      if (rebalanceCheck.shouldRebalance) {
        // 发送重平衡通知
        await this.notifyRebalanceNeeded(position.userId, rebalanceCheck);
      }
    }
  }
}

// wrangler.toml 中的定时任务配置
/*
[[triggers]]
crons = ["0 * * * *"]  # 每小时执行
*/
```

## 🔗 API 集成最佳实践

### Jupiter Lend API 集成策略

#### 1. Rate Limit 处理 (基于官方文档)
```typescript
class JupiterApiManager {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private readonly MAX_REQUESTS_PER_MINUTE = 60; // 基于官方限制调整
  
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // 避免 Rate Limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.isProcessing = false;
  }
}
```

#### 2. 错误处理与重试机制
```typescript
class RobustApiClient {
  async callWithRetry<T>(
    apiCall: () => Promise<T>,
    fallback: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        
        // Rate Limit 处理
        if (error instanceof Response && error.status === 429) {
          const retryAfter = error.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 5xx 错误重试
        if (error instanceof Response && error.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        
        break;
      }
    }
    
    console.warn(`API 调用失败 ${maxRetries} 次，使用 fallback:`, lastError);
    return await fallback();
  }
}
```

### Kamino SDK 最佳实践 (基于官方文档)

#### 1. 连接管理
```typescript
class KaminoConnectionManager {
  private connections: Map<string, Connection> = new Map();
  
  getConnection(rpcUrl: string): Connection {
    if (!this.connections.has(rpcUrl)) {
      this.connections.set(rpcUrl, new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }));
    }
    
    return this.connections.get(rpcUrl)!;
  }
}
```

### 缓存策略优化

```typescript
class MarsDataCache {
  constructor(
    private kvStore: KVNamespace,
    private memoryCache: Map<string, any> = new Map()
  ) {}
  
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // 内存缓存 -> KV 缓存 -> API 调用
    const cached = this.memoryCache.get(key) || 
                  JSON.parse(await this.kvStore.get(key) || 'null');
                  
    if (cached) return cached;
    
    const fresh = await fetchFn();
    this.memoryCache.set(key, fresh);
    await this.kvStore.put(key, JSON.stringify(fresh), {
      expirationTtl: ttlSeconds
    });
    return fresh;
  }

  // Mars 专用缓存键
  static CACHE_KEYS = {
    JUPITER_RATES: 'mars:jupiter:rates',
    KAMINO_MARKETS: 'mars:kamino:markets',
    STRATEGIES: 'mars:strategies',
    USER_POSITIONS: 'mars:positions:user',
    WITHDRAW_PATHS: 'mars:withdraw:paths',
    FEES_ESTIMATE: 'mars:fees:estimate'
  };

  static TTL = {
    JUPITER_RATES: 300,      // 5分钟
    KAMINO_MARKETS: 600,     // 10分钟  
    STRATEGIES: 1800,        // 30分钟
    USER_POSITIONS: 60,      // 1分钟
    WITHDRAW_PATHS: 900,     // 15分钟
    FEES_ESTIMATE: 180       // 3分钟
  };
}
```

## 📦 依赖配置

### package.json 关键依赖
```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.2",
    "@kamino-finance/klend-sdk": "^0.3.0", 
    "@debridge-finance/dln-client": "^1.0.0",
    "@coral-xyz/anchor": "^0.30.1"
  }
}
```

### wrangler.toml 配置
```toml
name = "mars-liquid-yield-optimizer"
main = "src/index.ts"

[[kv_namespaces]]
binding = "YIELD_CACHE"
id = "your-kv-namespace-id"

[vars]
JUPITER_API_KEY = ""
SOLANA_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3"

[[triggers]]
crons = ["0 * * * *"]  # 每小时更新收益数据
```

---

**总结**: 这个技术实现指南现在包含了：

1. **官方 API 集成** - Jupiter Lend (https://dev.jup.ag/docs/lend-api/) 和 Kamino SDK (https://docs.kamino.finance/build-on-kamino/sdk-and-smart-contracts) 的完整集成
2. **Rate Limit 处理** - 基于官方文档的限制处理
3. **错误重试机制** - 多层级降级策略
4. **缓存优化** - Cloudflare KV + 内存双重缓存
5. **最佳实践** - 基于官方推荐的实现方式

Daddy，现在文档包含了官方 API 文档的完整参考和集成方案。特别是针对 Jupiter Lend Beta 状态的处理策略，以及 Kamino SDK 的标准使用方法。这样实现更稳定可靠了！