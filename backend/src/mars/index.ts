/**
 * Mars Liquid - 主入口模块
 * 统一导出所有 Mars 相关功能
 */

// 类型导出
export type {
  SupportedAsset,
  RiskProfile,
  TransactionType,
  MarsOpportunity,
  UserPosition,
  AllocationStrategy,
  MarsTransaction,
  TransactionPreview,
  WithdrawPreview,
  WithdrawPath,
  JupiterEarnPosition,
  JupiterLendConfig,
  KaminoStrategy,
  KaminoMarketInfo,
  ApiResponse,
  MarsHealthStatus,
  CacheEntry,
  MarsCacheKeys
} from './types';

// 错误类导出
export {
  MarsError,
  JupiterError,
  KaminoError,
  TransactionError
} from './types';

// 核心类导出
export { MarsDataCache } from './cache';

// 客户端导出
export { 
  JupiterLendClient,
  createJupiterLendClient 
} from './jupiter/client';

export { 
  KaminoSDKClient,
  createKaminoSDKClient 
} from './kamino/client';

// 交易管理导出
export { 
  MarsTransactionManager,
  createMarsTransactionManager 
} from './transactions/manager';

export { 
  MarsWithdrawManager,
  createMarsWithdrawManager 
} from './transactions/withdraw';

// 路由导出
export { createMarsRoutes } from './routes';

// 导入用于内部使用
import { MarsDataCache } from './cache';
import { createJupiterLendClient } from './jupiter/client';
import { createKaminoSDKClient } from './kamino/client';
import { createMarsTransactionManager } from './transactions/manager';
import { createMarsWithdrawManager } from './transactions/withdraw';
import type { SupportedAsset, RiskProfile } from './types';

/**
 * Mars 模块工厂函数
 * 一站式创建所有 Mars 相关实例
 */
export function createMarsModule(env: {
  KV?: any;
  D1_DATABASE?: any;
  JUPITER_API_KEY?: string;
  JUPITER_LEND_API_BASE_URL?: string;
  JUPITER_API_BASE_URL?: string;
  SOLANA_RPC_URL?: string;
}) {
  // 创建缓存实例
  const cache = new MarsDataCache(env.KV);

  // 创建客户端实例
  const jupiterClient = createJupiterLendClient(cache, env);
  const kaminoClient = createKaminoSDKClient(cache, env);

  // 创建管理器实例
  const transactionManager = createMarsTransactionManager(jupiterClient, kaminoClient, cache);
  const withdrawManager = createMarsWithdrawManager(jupiterClient, kaminoClient, cache);

  return {
    cache,
    clients: {
      jupiter: jupiterClient,
      kamino: kaminoClient
    },
    managers: {
      transaction: transactionManager,
      withdraw: withdrawManager
    },
    // 便捷方法
    async getOpportunities(asset?: SupportedAsset) {
      const opportunities = [];
      
      // Jupiter 机会
      const jupiterPositions = await jupiterClient.getEarnPositions();
      opportunities.push(...jupiterPositions
        .filter(p => !asset || p.asset === asset)
        .map(p => ({
          ...p,
          id: `jupiter-${p.id}`,
          protocol: 'jupiter' as const
        }))
      );

      // Kamino 机会
      const kaminoStrategies = await kaminoClient.getAvailableStrategies();
      opportunities.push(...kaminoStrategies
        .filter(s => !asset || s.asset === asset)
        .map(s => ({
          ...s,
          id: `kamino-${s.id}`,
          protocol: 'kamino' as const
        }))
      );

      return opportunities;
    },

    async getUserPositions(userAddress: string) {
      const jupiterPositions = await jupiterClient.getUserPositions(userAddress);
      const kaminoPositions = await kaminoClient.getUserPositions(userAddress);

      return [
        ...jupiterPositions.map(p => ({
          id: `jupiter-${p.id}`,
          userAddress,
          protocol: 'jupiter' as const,
          asset: p.asset,
          amount: p.tvl || 0,
          shares: 1,
          entryAPY: p.apy,
          currentValue: p.tvl || 0,
          unrealizedGain: 0,
          depositTime: new Date(),
          lastUpdate: new Date()
        })),
        ...kaminoPositions
      ];
    },

    async healthCheck() {
      const [jupiterHealth, kaminoHealth] = await Promise.allSettled([
        jupiterClient.healthCheck(),
        kaminoClient.healthCheck()
      ]);

      return {
        status: 'healthy' as const,
        services: {
          jupiter: jupiterHealth.status === 'fulfilled' && jupiterHealth.value.status === 'healthy',
          kamino: kaminoHealth.status === 'fulfilled' && kaminoHealth.value.status === 'healthy',
          cache: !!env.KV,
          database: !!env.D1_DATABASE
        },
        timestamp: new Date().toISOString()
      };
    }
  };
}

// 默认配置
export const MARS_CONFIG = {
  CACHE_TTL: MarsDataCache.TTL,
  CACHE_KEYS: MarsDataCache.CACHE_KEYS,
  SUPPORTED_ASSETS: ['USDC', 'USDT', 'SOL', 'BONK'] as SupportedAsset[],
  RISK_PROFILES: ['conservative', 'moderate', 'aggressive'] as RiskProfile[]
} as const;