/**
 * Jupiter Lend API Client
 * 处理 Jupiter Lend API 的所有交互
 */

import type { 
  JupiterEarnPosition, 
  JupiterLendConfig, 
  SupportedAsset
} from '../types';
import { JupiterError } from '../types';
import { MarsDataCache } from '../cache';

export class JupiterLendClient {
  private config: JupiterLendConfig;
  private cache: MarsDataCache;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  // Rate limiting 状态
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1分钟

  constructor(config: JupiterLendConfig, cache: MarsDataCache) {
    this.config = config;
    this.cache = cache;
  }

  /**
   * 获取 Jupiter Earn 可用代币信息
   */
  async getEarnPositions(): Promise<JupiterEarnPosition[]> {
    return this.cache.getOrFetch(
      MarsDataCache.CACHE_KEYS.JUPITER_RATES,
      async () => {
        return this.rateLimitedRequest(async () => {
          // 获取 Jupiter Lend 可用代币信息
          const url = `${this.config.apiUrl}/lend/v1/earn/tokens`;
          console.log(`Fetching Jupiter Lend tokens from: ${url}`);
          
          const response = await fetch(url, {
            headers: this.getHeaders(),
          });

          if (!response.ok) {
            throw new JupiterError(`HTTP ${response.status}: ${response.statusText}`);
          }

          const tokensData = await response.json();
          console.log(`Jupiter API Success: Got ${Array.isArray(tokensData) ? tokensData.length : 'unknown'} tokens`);
          return this.normalizeJupiterTokensResponse(tokensData);
        });
      },
      MarsDataCache.TTL.JUPITER_RATES
    );
  }

  /**
   * 获取特定资产的收益数据
   */
  async getAssetEarnData(asset: SupportedAsset): Promise<JupiterEarnPosition | null> {
    const positions = await this.getEarnPositions();
    return positions.find(p => p.asset === asset) || null;
  }

  /**
   * 创建存款交易 - 返回未签名的交易给前端签名
   */
  async createDepositTransaction(
    asset: SupportedAsset,
    amount: number,
    userPublicKey: string
  ): Promise<{
    transaction: string; // Base64 编码的未签名交易
    message: string;
    estimatedFee?: number; // 估算的交易费用（lamports）
  }> {
    return this.rateLimitedRequest(async () => {
      // 获取资产的 mint address
      const assetMintMap: { [key: string]: string } = {
        'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        'SOL': 'So11111111111111111111111111111111111111112',
      };

      const assetMint = assetMintMap[asset];
      if (!assetMint) {
        throw new JupiterError(`Unsupported asset for deposits: ${asset}`);
      }

      const response = await fetch(`${this.config.apiUrl}/lend/v1/earn/deposit`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          asset: assetMint,
          amount: (amount * Math.pow(10, 6)).toString(), // 转换为最小单位
          signer: userPublicKey,
          userPublicKey: userPublicKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new JupiterError(`Deposit transaction creation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;
      
      return {
        transaction: result.transaction || '',
        message: `Deposit ${amount} ${asset} to Jupiter Lend`,
        estimatedFee: 5000, // 估算 5000 lamports 作为基础费用
      };
    });
  }

  /**
   * 创建取款交易 - 返回未签名的交易给前端签名
   */
  async createWithdrawTransaction(
    asset: SupportedAsset,
    amount: number,
    userPublicKey: string
  ): Promise<{
    transaction: string;
    message: string;
    estimatedFee?: number;
  }> {
    return this.rateLimitedRequest(async () => {
      // 获取资产的 mint address
      const assetMintMap: { [key: string]: string } = {
        'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        'SOL': 'So11111111111111111111111111111111111111112',
      };

      const assetMint = assetMintMap[asset];
      if (!assetMint) {
        throw new JupiterError(`Unsupported asset for withdrawal: ${asset}`);
      }

      const response = await fetch(`${this.config.apiUrl}/lend/v1/earn/withdraw`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          asset: assetMint,
          amount: (amount * Math.pow(10, 6)).toString(), // 转换为最小单位
          signer: userPublicKey,
          userPublicKey: userPublicKey,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new JupiterError(`Withdraw transaction creation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;

      return {
        transaction: result.transaction || '',
        message: `Withdraw ${amount} ${asset} from Jupiter Lend`,
        estimatedFee: 5000, // 估算 5000 lamports 作为基础费用
      };
    });
  }

  /**
   * 获取用户在 Jupiter Earn 的仓位
   */
  async getUserPositions(userPublicKey: string): Promise<JupiterEarnPosition[]> {
    const cacheKey = MarsDataCache.userKey(MarsDataCache.CACHE_KEYS.USER_POSITIONS, userPublicKey);
    
    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        return this.rateLimitedRequest(async () => {
          const response = await fetch(`${this.config.apiUrl}/lend/v1/earn/positions?users=${userPublicKey}`, {
            headers: this.getHeaders(),
          });

          if (!response.ok) {
            throw new JupiterError(`Get user positions failed: ${response.status}`);
          }

          const data = await response.json();
          return this.normalizeEarnPositions(data as any[]);
        });
      },
      MarsDataCache.TTL.USER_POSITIONS
    );
  }

  /**
   * 获取用户收益信息
   */
  async getUserEarnings(userAddress: string, positions: string[]): Promise<any> {
    return this.rateLimitedRequest(async () => {
      const positionsParam = positions.join(',');
      const response = await fetch(
        `${this.config.apiUrl}/lend/v1/earn/earnings?user=${userAddress}&positions=${positionsParam}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new JupiterError(`Get user earnings failed: ${response.status}`);
      }

      return response.json();
    });
  }



  /**
   * Rate limiting 管理器
   */
  private async rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * 处理请求队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      // 检查 rate limit
      const now = Date.now();
      if (now - this.windowStart >= this.RATE_LIMIT_WINDOW) {
        // 重置计数器
        this.requestCount = 0;
        this.windowStart = now;
      }

      if (this.requestCount >= this.config.rateLimit) {
        // 等待到下个时间窗口
        const waitTime = this.RATE_LIMIT_WINDOW - (now - this.windowStart);
        await this.sleep(waitTime);
        continue;
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.requestCount++;
        try {
          await request();
        } catch (error) {
          // 错误会在 rateLimitedRequest 中处理
        }
      }
    }

    this.isProcessing = false;
  }



  /**
   * 规范化真实的 Jupiter Lend tokens API 响应
   */
  private normalizeJupiterTokensResponse(data: unknown): JupiterEarnPosition[] {
    if (!Array.isArray(data)) {
      throw new JupiterError(`Invalid API response format: expected array, got ${typeof data}`);
    }

    const positions: JupiterEarnPosition[] = [];
    
    for (const token of data) {
      try {
        // 从 totalRate 字段获取 APY（以基点为单位，需要转换为百分比）
        const apyBasisPoints = token.totalRate || 0;
        const apy = apyBasisPoints / 100; // 转换为百分比

        const position: JupiterEarnPosition = {
          id: token.address || `jupiter-${token.id || 'unknown'}`,
          asset: this.normalizeAsset(token.asset?.symbol || token.symbol || 'UNKNOWN'), // fallback to USDC
          apy: apy,
          tvl: parseFloat(token.totalAssets || '0'),
          available: true, // Jupiter 返回的都是可用的
          minDeposit: 0.000001, // 很小的最小存款
          maxDeposit: Number.MAX_SAFE_INTEGER,
          depositFee: 0, // Jupiter Lend 无费用
          withdrawFee: 0,
        };
        positions.push(position);
      } catch (error) {
        console.log(`Skipping unsupported token: ${token.asset?.symbol}`, error);
        // 跳过不支持的资产
      }
    }

    return positions;
  }

  /**
   * 将 Jupiter Lend tokens API 数据转换为 EarnPositions 格式（保持兼容）
   */
  private normalizeTokensToEarnPositions(data: any): JupiterEarnPosition[] {
    if (!data || !data.tokens) {
      return [];
    }

    return data.tokens.map((token: any) => ({
      id: token.mint || token.address,
      asset: this.normalizeAsset(token.symbol || token.mint || 'UNKNOWN'),
      apy: token.supplyApy || token.apy || 0,
      tvl: token.totalSupply || token.tvl || 0,
      available: token.isActive !== false,
      minDeposit: 0.01, // 默认最小存款
      maxDeposit: token.supplyCap || Number.MAX_SAFE_INTEGER,
      depositFee: 0, // Jupiter Lend 无存款费用
      withdrawFee: 0, // Jupiter Lend 无提款费用
    }));
  }

  /**
   * 规范化 Jupiter Earn 用户仓位数据格式
   */
  private normalizeEarnPositions(data: any[]): JupiterEarnPosition[] {
    return data.map(item => {
      // 从 token.asset.symbol 获取资产符号
      const symbol = item.token?.asset?.symbol || item.token?.symbol || item.asset || 'UNKNOWN';
      
      try {
        return {
          id: item.token?.address || item.id || item.address || `position-${Date.now()}`,
          asset: this.normalizeAsset(symbol),
          apy: (item.token?.totalRate || 0) / 100, // 转换基点为百分比
          tvl: parseFloat(item.underlyingBalance || item.shares || '0'),
          available: parseFloat(item.underlyingBalance || '0') > 0,
          minDeposit: 0,
          maxDeposit: Number.MAX_SAFE_INTEGER,
          depositFee: 0,
          withdrawFee: 0,
        };
      } catch (error) {
        console.warn(`Failed to normalize position for asset ${symbol}:`, error);
        // 跳过无法处理的资产
        return null;
      }
    }).filter(Boolean) as JupiterEarnPosition[];
  }

  /**
   * 规范化资产名称
   */
  private normalizeAsset(asset: string | undefined): SupportedAsset {
    if (!asset || typeof asset !== 'string') {
      throw new JupiterError(`Invalid asset: ${asset}`);
    }
    
    const normalized = asset.toUpperCase();
    
    // 处理常见的资产映射
    const assetMap: { [key: string]: SupportedAsset } = {
      'USDC': 'USDC',
      'USDT': 'USDT', 
      'SOL': 'SOL',
      'WSOL': 'SOL', // Wrapped SOL -> SOL
      'BONK': 'BONK',
      'EURC': 'USDC', // 将 EURC 映射为 USDC 兼容
      'USDS': 'USDC', // 将 USDS 映射为 USDC 兼容
      'USDG': 'USDC'  // 将 USDG 映射为 USDC 兼容
    };
    
    if (assetMap[normalized]) {
      return assetMap[normalized];
    }
    
    throw new JupiterError(`Unsupported asset: ${asset}`);
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mars-Liquid/1.0.0',
    };

    // 添加 Jupiter API 密钥（如果存在）
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * 简单的 sleep 函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查 - 使用轻量级的 tokens API 检查连接性
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // 使用 tokens API 进行快速健康检查，设置 5 秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.apiUrl}/lend/v1/earn/tokens?limit=1`, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { status: 'healthy', responseTime };
      } else {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: `HTTP ${response.status}` 
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: 'Request timeout (>5s)'
        };
      }
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取客户端统计信息
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      windowStart: this.windowStart,
      cacheStats: this.cache.getStats(),
    };
  }
}

/**
 * 创建 Jupiter Lend 客户端
 */
export function createJupiterLendClient(cache: MarsDataCache, env?: {
  JUPITER_API_KEY?: string;
  JUPITER_LEND_API_BASE_URL?: string;
  JUPITER_API_BASE_URL?: string;
}): JupiterLendClient {
  const config: JupiterLendConfig = {
    apiUrl: env?.JUPITER_LEND_API_BASE_URL || 'https://lite-api.jup.ag',
    apiKey: env?.JUPITER_API_KEY,
    rateLimit: 60, // 60 requests per minute
    retryDelay: 1000,
    maxRetries: 3,
  };

  return new JupiterLendClient(config, cache);
}