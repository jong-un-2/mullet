import { createConfig, getRoutes, getTokens, getChains, ChainId } from '@lifi/sdk';
import type { Route, RoutesRequest, ExtendedChain } from '@lifi/sdk';
import { MARS_CHAIN_IDS } from './constants';

/**
 * LI.FI 跨链桥接服务
 * 用于Mars协议的deposit/withdraw跨链操作
 */
export class LiFiService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化LI.FI SDK配置
   * 使用默认配置支持所有可用链（包括Solana）
   */
  private initialize() {
    createConfig({
      integrator: 'MarsLiquid',
      apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
    });
    
    this.initialized = true;
    console.log('LI.FI SDK initialized with full chain support for Mars Liquid');
  }

  /**
   * 获取跨链路由报价
   */
  async getQuote(params: {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress?: string;
  }): Promise<Route[]> {
    if (!this.initialized) {
      throw new Error('LI.FI service not initialized');
    }

    const routeRequest: RoutesRequest = {
      fromChainId: params.fromChain,
      toChainId: params.toChain,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress || params.fromAddress,
      options: {
        slippage: 0.03, // 3% slippage tolerance
        order: 'FASTEST', // 优先最快路由
      },
    };

    try {
      const result = await getRoutes(routeRequest);
      console.log(`Found ${result.routes.length} routes for cross-chain transfer`);
      return result.routes;
    } catch (error) {
      console.error('Failed to get LI.FI routes:', error);
      throw new Error(`Failed to get cross-chain quote: ${error}`);
    }
  }

  /**
   * 获取支持的代币列表
   */
  async getSupportedTokens(chainId?: number) {
    try {
      const tokens = await getTokens();
      return chainId ? tokens.tokens[chainId] || [] : tokens.tokens;
    } catch (error) {
      console.error('Failed to get supported tokens:', error);
      throw new Error(`Failed to get supported tokens: ${error}`);
    }
  }

  /**
   * 获取支持的链列表
   */
  async getSupportedChains(): Promise<ExtendedChain[]> {
    try {
      const chains = await getChains();
      return chains;
    } catch (error) {
      console.error('Failed to get supported chains:', error);
      throw new Error(`Failed to get supported chains: ${error}`);
    }
  }

  /**
   * 检查地址是否为EVM地址
   */
  private isEvmAddress(address: string): boolean {
    // EVM地址: 0x开头，42字符长度
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * 检查地址是否为Solana地址  
   */
  private isSolanaAddress(address: string): boolean {
    // Solana地址: base58编码，32-44字符长度
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  /**
   * 根据地址获取目标链ID
   */
  private getTargetChainFromAddress(address: string): number {
    if (this.isEvmAddress(address)) {
      return MARS_CHAIN_IDS.ETHEREUM; // 默认EVM链
    } else if (this.isSolanaAddress(address)) {
      return MARS_CHAIN_IDS.SOLANA;
    }
    throw new Error(`Unsupported address format: ${address}`);
  }

  /**
   * 为Mars协议获取最优跨链存款路由
   * Mars deposit目标都是Solana
   */
  async getBestDepositRoute(params: {
    fromChain: number;
    fromToken: string;
    toToken: string; // 目标链上的代币地址
    fromAmount: string;
    fromAddress: string;
    toAddress?: string; // 目标Solana地址（可选）
    marsProtocol: string; // 目标Mars协议
  }) {
    // Mars deposit目标都是Solana
    const toChain = MARS_CHAIN_IDS.SOLANA;
    
    // 如果没有提供toAddress，使用一个默认的Solana地址用于报价
    // 注意：实际执行时需要用户提供真实的Solana地址
    const toAddress = params.toAddress || 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // Mars协议地址或用户地址

    console.log('📊 LiFi getBestDepositRoute params:', {
      fromChain: params.fromChain,
      toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress,
    });

    const routes = await this.getQuote({
      fromChain: params.fromChain,
      toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress,
    });

    if (routes.length === 0) {
      throw new Error('No cross-chain routes available for Mars deposit');
    }

    // 返回最优路由（默认按FASTEST排序）
    const bestRoute = routes[0];
    if (!bestRoute) {
      throw new Error('No valid route found');
    }
    
    // 直接使用 LiFi route 中的字段
    const gasCostUSD = bestRoute.gasCostUSD ? parseFloat(bestRoute.gasCostUSD) : 0;
    
    // LiFi 在 steps[0].estimate 中有 executionDuration（秒）
    // 我们也可以直接累加，但通常第一个 step 的时间就是总时间
    const estimatedTime = bestRoute.steps.reduce((acc, step) => 
      acc + (step.estimate.executionDuration || 0), 0
    );
    
    console.log('📊 LiFi Route details:', {
      gasCostUSD: bestRoute.gasCostUSD,
      fromAmountUSD: bestRoute.fromAmountUSD,
      toAmountUSD: bestRoute.toAmountUSD,
      estimatedTime: estimatedTime,
      stepsCount: bestRoute.steps.length,
    });
    
    return {
      route: bestRoute,
      estimatedTime: estimatedTime, // 秒为单位
      totalFees: gasCostUSD,
    };
  }

  /**
   * 为Mars协议获取最优跨链提款路由
   * 提款默认从Solana开始，但要根据目标地址判断目标链
   */
  async getBestWithdrawRoute(params: {
    toAddress: string; // 改为使用toAddress来判断目标链
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    marsProtocol: string;
  }) {
    // Mars提款默认从Solana开始
    const fromChain = MARS_CHAIN_IDS.SOLANA;
    const fromToken = params.toToken; // 保持同样的代币
    
    // 根据目标地址自动判断目标链
    const toChain = this.getTargetChainFromAddress(params.toAddress);

    const routes = await this.getQuote({
      fromChain,
      toChain,
      fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
    });

    if (routes.length === 0) {
      throw new Error('No cross-chain routes available for Mars withdraw');
    }

    const bestRoute = routes[0];
    if (!bestRoute) {
      throw new Error('No valid route found');
    }
    
    return {
      route: bestRoute,
      estimatedTime: bestRoute.steps.reduce((acc, step) => acc + (step.estimate.executionDuration || 0), 0),
      totalFees: bestRoute.steps.reduce((acc, step) => acc + parseFloat(step.estimate.feeCosts?.[0]?.amount || '0'), 0),
    };
  }
}

export const lifiService = new LiFiService();