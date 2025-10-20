/**
 * Mars Liquid Routes
 * 统一的 Mars API 端点处理
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../index';

import { MarsDataCache } from './cache';
import { createJupiterLendClient } from './jupiter/client';
import { createKaminoSDKClient } from './kamino/client';
import { createMarsTransactionManager } from './transactions/manager';
import { createMarsWithdrawManager } from './transactions/withdraw';
import { createWalletConnectionManager } from './wallet/manager';
import { marsVaultRoutes } from './vault/routes';
import { handleLiFiRoutes } from './lifi/routes';
import positionsRoutes from './positions/routes';

import type { 
  ApiResponse, 
  MarsOpportunity, 
  AllocationStrategy,
  UserPosition,
  WithdrawPreview,
  MarsHealthStatus,
  SupportedAsset,
  RiskProfile
} from './types';

// 请求验证 schemas
const assetSchema = z.enum(['USDC', 'USDT', 'SOL', 'BONK']);
const riskProfileSchema = z.enum(['conservative', 'moderate', 'aggressive']);

const depositRequestSchema = z.object({
  userAddress: z.string().min(1),
  asset: assetSchema,
  amount: z.number().positive(),
  riskProfile: riskProfileSchema
});

const withdrawRequestSchema = z.object({
  userAddress: z.string().min(1),
  asset: assetSchema,
  amount: z.number().positive()
});

const walletConnectionSchema = z.object({
  walletAddress: z.string().min(1),
  walletType: z.enum(['privy', 'metamask', 'phantom', 'solflare', 'backpack', 'trust', 'coinbase', 'rainbow', 'other']),
  chainType: z.enum(['ethereum', 'solana', 'multi-chain']),
  networkId: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  privyUserId: z.string().optional(),
  privyEmail: z.string().optional(),
  privyAuthMethod: z.string().optional(),
});

const walletDisconnectionSchema = z.object({
  walletAddress: z.string().min(1),
  sessionId: z.string().optional(),
});

/**
 * 创建 Mars API 路由
 */
export function createMarsRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // ==================== 收益机会端点 ====================

  /**
   * GET /opportunities - 获取收益机会
   */
  app.get('/opportunities',
    zValidator('query', z.object({
      asset: assetSchema.optional()
    })),
    async (c) => {
      try {
        const { asset } = c.req.valid('query');
        const cache = new MarsDataCache(c.env.KV);
        
        const jupiterClient = createJupiterLendClient(cache);
        const kaminoClient = createKaminoSDKClient(cache);

        // 获取所有收益机会
        const opportunities: MarsOpportunity[] = [];

        // Jupiter 收益数据
        if (!asset || asset === 'USDC' || asset === 'USDT') {
          const jupiterPositions = await jupiterClient.getEarnPositions();
          opportunities.push(...jupiterPositions.map(p => ({
            id: `jupiter-${p.id}`,
            protocol: 'jupiter' as const,
            asset: p.asset,
            apy: p.apy,
            tvl: p.tvl,
            available: p.available,
            riskLevel: 'low' as const,
            liquidityDepth: p.tvl * 0.1, // 假设 10% 可立即取出
            withdrawalTime: 0.5, // 30分钟
            fees: {
              deposit: p.depositFee,
              withdraw: p.withdrawFee,
              management: 0
            }
          })));
        }

        // Kamino 策略数据
        const kaminoStrategies = await kaminoClient.getAvailableStrategies();
        opportunities.push(...kaminoStrategies
          .filter(s => !asset || s.asset === asset)
          .map(s => ({
            id: `kamino-${s.id}`,
            protocol: 'kamino' as const,
            asset: s.asset,
            apy: s.apy,
            tvl: s.tvl,
            available: true,
            riskLevel: s.riskScore <= 3 ? 'low' : s.riskScore <= 7 ? 'medium' : 'high',
            liquidityDepth: s.tvl * 0.05, // 假设 5% 可立即取出
            withdrawalTime: 1, // 1小时
            fees: {
              deposit: 0.001, // 0.1%
              withdraw: 0.002, // 0.2%
              management: 0.005 // 0.5%
            }
          } as MarsOpportunity))
        );

        const response: ApiResponse<MarsOpportunity[]> = {
          success: true,
          data: opportunities,
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Failed to fetch opportunities:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FETCH_OPPORTUNITIES_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  /**
   * POST /optimize - 获取最优分配建议
   */
  app.post('/optimize',
    zValidator('json', z.object({
      amount: z.number().positive(),
      asset: assetSchema,
      riskProfile: riskProfileSchema
    })),
    async (c) => {
      try {
        const { amount, asset, riskProfile } = c.req.valid('json');
        const cache = new MarsDataCache(c.env.KV);
        
        const jupiterClient = createJupiterLendClient(cache);
        const kaminoClient = createKaminoSDKClient(cache);
        const transactionManager = createMarsTransactionManager(jupiterClient, kaminoClient, cache, c.env);

        // 这里我们重用 transaction manager 的逻辑来获取最优分配
        const mockTransaction = await transactionManager.createDepositTransaction({
          userAddress: 'mock-address', // 用于优化计算
          asset,
          amount,
          riskProfile
        });

        const response: ApiResponse<AllocationStrategy> = {
          success: true,
          data: mockTransaction.allocation,
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Optimization failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'OPTIMIZATION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  // ==================== 用户仓位端点 ====================

  /**
   * GET /positions/:userAddress - 获取用户仓位
   * DEPRECATED: This route does live blockchain queries (slow!)
   * Use /positions routes from positions/routes.ts instead (reads from cache)
   */
  /*
  app.get('/positions/:userAddress', async (c) => {
    try {
      const userAddress = c.req.param('userAddress');
      const cache = new MarsDataCache(c.env.KV);
      
      const jupiterClient = createJupiterLendClient(cache);
      
      // Import the new positions collector for Kamino data
      const { getUserPositionsCollector } = await import('../services/userPositionsCollector');
      const positionsCollector = await getUserPositionsCollector(c.env.SOLANA_RPC_URL);

      // 获取用户在各协议的仓位
      const jupiterPositions = await jupiterClient.getUserPositions(userAddress);
      
      // Get Kamino positions from the new collector service
      const kaminoPositions = await positionsCollector.fetchUserPositions(userAddress);

      // 按协议分类处理仓位数据
      const jupiterActivePositions = jupiterPositions
        .filter(p => p.tvl && p.tvl > 0) // 过滤掉余额为 0 的仓位
        .map(p => ({
          id: `jupiter-${p.id}`,
          userAddress,
          protocol: 'jupiter' as const,
          asset: p.asset,
          amount: p.tvl || 0,
          shares: 1, // TODO: 从 Jupiter API 获取实际 shares
          entryAPY: p.apy,
          currentValue: p.tvl || 0,
          unrealizedGain: 0, // TODO: 计算收益
          depositTime: new Date(),
          lastUpdate: new Date()
        }));

      // Format Kamino positions for response
      const kaminoActivePositions = kaminoPositions
        .filter(p => parseFloat(p.totalShares) > 0)
        .map(p => ({
          id: p.id,
          userAddress: p.userAddress,
          protocol: p.protocol,
          asset: p.baseToken,
          amount: parseFloat(p.totalSupplied),
          shares: parseFloat(p.totalShares),
          entryAPY: p.totalAPY,
          lendingAPY: p.lendingAPY,
          incentivesAPY: p.incentivesAPY,
          currentValue: parseFloat(p.currentValue),
          unrealizedGain: parseFloat(p.unrealizedPnl),
          interestEarned: parseFloat(p.interestEarned),
          dailyInterestUSD: parseFloat(p.dailyInterestUSD),
          rewards: p.rewards,
          pendingRewards: p.pendingRewards,
          depositTime: p.firstDepositTime,
          lastUpdate: p.lastFetchTime
        }));

      // 按协议分类返回数据
      const positionsData = {
        jupiter: {
          protocol: 'jupiter',
          totalPositions: jupiterActivePositions.length,
          totalValue: jupiterActivePositions.reduce((sum, p) => sum + (p.currentValue || 0), 0),
          avgAPY: jupiterActivePositions.length > 0 
            ? jupiterActivePositions.reduce((sum, p) => sum + p.entryAPY, 0) / jupiterActivePositions.length 
            : 0,
          positions: jupiterActivePositions
        },
        kamino: {
          protocol: 'kamino',
          totalPositions: kaminoActivePositions.length,
          totalValue: kaminoActivePositions.reduce((sum, p) => sum + (p.amount || 0), 0),
          avgAPY: kaminoActivePositions.length > 0
            ? kaminoActivePositions.reduce((sum, p) => sum + (p.entryAPY || 0), 0) / kaminoActivePositions.length
            : 0,
          positions: kaminoActivePositions
        },
        summary: {
          totalProtocols: [jupiterActivePositions.length > 0 ? 'jupiter' : null, kaminoActivePositions.length > 0 ? 'kamino' : null].filter(Boolean).length,
          totalPositions: jupiterActivePositions.length + kaminoActivePositions.length,
          totalValue: jupiterActivePositions.reduce((sum, p) => sum + (p.currentValue || 0), 0) + 
                     kaminoActivePositions.reduce((sum, p) => sum + (p.amount || 0), 0),
          avgAPY: (jupiterActivePositions.length + kaminoActivePositions.length) > 0
            ? (jupiterActivePositions.reduce((sum, p) => sum + p.entryAPY, 0) + 
               kaminoActivePositions.reduce((sum, p) => sum + (p.entryAPY || 0), 0)) / 
              (jupiterActivePositions.length + kaminoActivePositions.length)
            : 0
        }
      };

      const response: ApiResponse<typeof positionsData> = {
        success: true,
        data: positionsData,
        timestamp: new Date().toISOString()
      };

      return c.json(response);

    } catch (error) {
      console.error('Failed to fetch positions:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'FETCH_POSITIONS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      return c.json(response, 500);
    }
  });
  */

  // ==================== 交易端点 ====================

  /**
   * POST /transactions/deposit - 创建存款交易
   */
  app.post('/transactions/deposit',
    zValidator('json', depositRequestSchema),
    async (c) => {
      try {
        const params = c.req.valid('json');
        const cache = new MarsDataCache(c.env.KV);
        
        const jupiterClient = createJupiterLendClient(cache);
        const kaminoClient = createKaminoSDKClient(cache);
        const transactionManager = createMarsTransactionManager(jupiterClient, kaminoClient, cache, c.env);

        const result = await transactionManager.createDepositTransaction(params);

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Deposit transaction creation failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'DEPOSIT_TRANSACTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  /**
   * POST /transactions/withdraw - 创建取款交易
   */
  app.post('/transactions/withdraw',
    zValidator('json', withdrawRequestSchema),
    async (c) => {
      try {
        const params = c.req.valid('json');
        const cache = new MarsDataCache(c.env.KV);
        
        const jupiterClient = createJupiterLendClient(cache);
        const kaminoClient = createKaminoSDKClient(cache);
        const transactionManager = createMarsTransactionManager(jupiterClient, kaminoClient, cache, c.env);

        const result = await transactionManager.createWithdrawTransaction(params);

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Withdraw transaction creation failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'WITHDRAW_TRANSACTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  /**
   * POST /withdraw/preview - 获取取款预览
   */
  app.post('/withdraw/preview',
    zValidator('json', withdrawRequestSchema),
    async (c) => {
      try {
        const { userAddress, asset, amount } = c.req.valid('json');
        const cache = new MarsDataCache(c.env.KV);
        
        const jupiterClient = createJupiterLendClient(cache);
        const kaminoClient = createKaminoSDKClient(cache);
        const withdrawManager = createMarsWithdrawManager(jupiterClient, kaminoClient, cache);

        const preview = await withdrawManager.getWithdrawPreview(userAddress, asset, amount);

        const response: ApiResponse<WithdrawPreview> = {
          success: true,
          data: preview,
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Withdraw preview failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'WITHDRAW_PREVIEW_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  // ==================== 健康检查端点 ====================

  /**
   * GET /health - Mars 系统健康状态
   */
  app.get('/health', async (c) => {
    try {
      const cache = new MarsDataCache(c.env.KV);
      
      const jupiterClient = createJupiterLendClient(cache);
      const kaminoClient = createKaminoSDKClient(cache);

      // 并行检查各服务状态
      const [jupiterHealth, kaminoHealth] = await Promise.allSettled([
        jupiterClient.healthCheck(),
        kaminoClient.healthCheck()
      ]);

      const healthStatus: MarsHealthStatus = {
        status: 'healthy',
        services: {
          jupiter: jupiterHealth.status === 'fulfilled' && jupiterHealth.value.status === 'healthy',
          kamino: kaminoHealth.status === 'fulfilled' && kaminoHealth.value.status === 'healthy',
          cache: !!c.env.KV,
          database: !!c.env.D1_DATABASE
        },
        metrics: {
          totalTVL: 0, // TODO: 计算实际 TVL
          activeUsers: 0, // TODO: 从数据库获取
          avgAPY: 8.5, // TODO: 计算加权平均 APY
          systemLoad: 0.3 // TODO: 系统负载监控
        },
        timestamp: new Date().toISOString()
      };

      // 如果任何核心服务不健康，设置为降级状态
      const coreServicesHealthy = healthStatus.services.jupiter || healthStatus.services.kamino;
      if (!coreServicesHealthy) {
        healthStatus.status = 'degraded';
      }

      return c.json(healthStatus);

    } catch (error) {
      console.error('Health check failed:', error);
      const healthStatus: MarsHealthStatus = {
        status: 'down',
        services: {
          jupiter: false,
          kamino: false,
          cache: false,
          database: false
        },
        metrics: {
          totalTVL: 0,
          activeUsers: 0,
          avgAPY: 0,
          systemLoad: 1.0
        },
        timestamp: new Date().toISOString()
      };
      return c.json(healthStatus, 503);
    }
  });

  /**
   * POST /wallet/connect - 记录钱包连接
   */
  app.post('/wallet/connect',
    zValidator('json', walletConnectionSchema),
    async (c) => {
      try {
        const data = c.req.valid('json');
        const walletManager = createWalletConnectionManager(c.env);

        // 获取请求的附加信息
        const userAgent = c.req.header('user-agent') || data.userAgent;
        const sessionId = data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await walletManager.recordConnection({
          ...data,
          userAgent,
          sessionId,
        });

        const response: ApiResponse<{ success: boolean; sessionId: string }> = {
          success: true,
          data: { success: true, sessionId },
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Wallet connection recording failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'WALLET_CONNECTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  /**
   * POST /wallet/disconnect - 记录钱包断开连接
   */
  app.post('/wallet/disconnect',
    zValidator('json', walletDisconnectionSchema),
    async (c) => {
      try {
        const data = c.req.valid('json');
        const walletManager = createWalletConnectionManager(c.env);

        await walletManager.recordDisconnection(data);

        const response: ApiResponse<{ success: boolean }> = {
          success: true,
          data: { success: true },
          timestamp: new Date().toISOString()
        };

        return c.json(response);

      } catch (error) {
        console.error('Wallet disconnection recording failed:', error);
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'WALLET_DISCONNECTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        };
        return c.json(response, 500);
      }
    }
  );

  /**
   * GET /wallet/history/:address - 获取钱包连接历史
   */
  app.get('/wallet/history/:address', async (c) => {
    try {
      const address = c.req.param('address');
      const limit = parseInt(c.req.query('limit') || '10');
      const walletManager = createWalletConnectionManager(c.env);

      const history = await walletManager.getConnectionHistory(address, limit);

      const response: ApiResponse<any[]> = {
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      };

      return c.json(response);

    } catch (error) {
      console.error('Wallet history retrieval failed:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'WALLET_HISTORY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      return c.json(response, 500);
    }
  });

  // ==================== 数据API端点 ====================
  // 挂载Mars Vault API routes (real data from Neon PostgreSQL)
  app.route('/vault', marsVaultRoutes);
  
  // User Positions API routes (cached position data)
  app.route('/positions', positionsRoutes);

  // ==================== LI.FI跨链桥接端点 ====================
  app.all('/lifi/*', async (c) => {
    const request = c.req.raw;
    return await handleLiFiRoutes(request, c.env);
  });

  return app;
}