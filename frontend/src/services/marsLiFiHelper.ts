/**
 * Mars 跨链操作辅助工具
 * 处理Mars协议特殊的存款和提款逻辑
 */

import { marsLiFiService, SUPPORTED_CHAINS, SOLANA_CHAIN_ID } from './marsLiFiService';
import type { 
  CrossChainDepositParams, 
  CrossChainWithdrawParams,
  ExecuteDepositParams,
  ExecuteWithdrawParams,
  LiFiQuote 
} from './marsLiFiService';

// Mars协议支持的链ID常量
export const MARS_SUPPORTED_CHAINS = {
  SOLANA: SOLANA_CHAIN_ID, // Mars主链
  ETHEREUM: SUPPORTED_CHAINS.ETHEREUM,
  BSC: SUPPORTED_CHAINS.BSC,
  POLYGON: SUPPORTED_CHAINS.POLYGON,
} as const;

export interface MarsDepositConfig {
  userAddress: string;
  sourceChain: number;
  asset: string;
  amount: string;
  marsProtocol?: string;
}

export interface MarsWithdrawConfig {
  userAddress: string;
  targetAddress: string; // 目标地址，自动判断链
  asset: string;
  amount: string;
  marsProtocol?: string;
}

class MarsLiFiHelper {
  
  /**
   * Mars存款 - 目标都是Solana
   */
  async prepareMarsDeposit(config: MarsDepositConfig): Promise<{
    quote: LiFiQuote;
    targetChain: number;
    isDirectDeposit: boolean;
  }> {
    const { userAddress, sourceChain, asset, amount, marsProtocol } = config;
    
    // Mars存款目标都是Solana
    const targetChain = MARS_SUPPORTED_CHAINS.SOLANA;
    const isDirectDeposit = sourceChain === targetChain;
    
    if (isDirectDeposit) {
      // 直接存款到Solana，不需要跨链
      return {
        quote: {
          route: null,
          estimatedTime: 0,
          totalFees: 0,
        },
        targetChain,
        isDirectDeposit: true,
      };
    }
    
    // 需要跨链存款
    const depositParams: CrossChainDepositParams = {
      fromChain: sourceChain,
      fromToken: this.getTokenAddress(asset, sourceChain),
      fromAmount: amount,
      fromAddress: userAddress,
      marsProtocol: marsProtocol || 'default',
    };
    
    const quote = await marsLiFiService.getDepositQuote(depositParams);
    
    return {
      quote,
      targetChain,
      isDirectDeposit: false,
    };
  }
  
  /**
   * Mars提款 - 根据目标地址判断目标链
   */
  async prepareMarsWithdraw(config: MarsWithdrawConfig): Promise<{
    quote: LiFiQuote;
    sourceChain: number;
    targetChain: number;
    isDirectWithdraw: boolean;
  }> {
    const { userAddress, targetAddress, asset, amount, marsProtocol } = config;
    
    // Mars提款源头都是Solana
    const sourceChain = MARS_SUPPORTED_CHAINS.SOLANA;
    const targetChain = marsLiFiService.getChainIdFromAddress(targetAddress);
    const isDirectWithdraw = sourceChain === targetChain;
    
    if (isDirectWithdraw) {
      // 直接在Solana上提款，不需要跨链
      return {
        quote: {
          route: null,
          estimatedTime: 0,
          totalFees: 0,
        },
        sourceChain,
        targetChain,
        isDirectWithdraw: true,
      };
    }
    
    // 需要跨链提款
    const withdrawParams: CrossChainWithdrawParams = {
      toAddress: targetAddress,
      toToken: this.getTokenAddress(asset, targetChain),
      fromAmount: amount,
      fromAddress: userAddress,
      marsProtocol: marsProtocol || 'default',
    };
    
    const quote = await marsLiFiService.getWithdrawQuote(withdrawParams);
    
    return {
      quote,
      sourceChain,
      targetChain,
      isDirectWithdraw: false,
    };
  }
  
  /**
   * 执行Mars跨链存款
   */
  async executeMarsDeposit(params: Omit<ExecuteDepositParams, 'marsProtocol'> & { marsProtocol?: string }) {
    const executeParams: ExecuteDepositParams = {
      ...params,
      marsProtocol: params.marsProtocol || 'default',
    };
    
    return await marsLiFiService.executeDeposit(executeParams);
  }
  
  /**
   * 执行Mars跨链提款
   */
  async executeMarsWithdraw(params: Omit<ExecuteWithdrawParams, 'marsProtocol'> & { marsProtocol?: string }) {
    const executeParams: ExecuteWithdrawParams = {
      ...params,
      marsProtocol: params.marsProtocol || 'default',
    };
    
    return await marsLiFiService.executeWithdraw(executeParams);
  }
  
  /**
   * 获取代币地址
   */
  private getTokenAddress(asset: string, chainId: number): string {
    const tokenMaps = {
      [SUPPORTED_CHAINS.ETHEREUM]: {
        'USDC': '0xA0b86a33E6441a695a7e9B72b67B0a82f0913A50',
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'ETH': '0x0000000000000000000000000000000000000000',
      },
      [SUPPORTED_CHAINS.BSC]: {
        'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        'USDT': '0x55d398326f99059fF775485246999027B3197955',
        'BNB': '0x0000000000000000000000000000000000000000',
      },
      [SUPPORTED_CHAINS.POLYGON]: {
        'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        'MATIC': '0x0000000000000000000000000000000000000000',
      },
      [SOLANA_CHAIN_ID]: { // Solana
        'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        'SOL': 'So11111111111111111111111111111111111111112',
      },
    };
    
    const chainTokens = tokenMaps[chainId as keyof typeof tokenMaps];
    if (!chainTokens) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    
    const tokenAddress = chainTokens[asset as keyof typeof chainTokens];
    if (!tokenAddress) {
      throw new Error(`Unsupported asset ${asset} on chain ${chainId}`);
    }
    
    return tokenAddress;
  }
  
  /**
   * 检查Mars操作是否支持
   */
  async isMarsOperationSupported(operation: 'deposit' | 'withdraw', fromAddress: string, toAddress?: string): Promise<{
    supported: boolean;
    reason?: string;
    needsCrossChain: boolean;
  }> {
    try {
      if (operation === 'deposit') {
        // 存款：检查源地址是否支持
        const fromChain = marsLiFiService.getChainIdFromAddress(fromAddress);
        const toChain = MARS_SUPPORTED_CHAINS.SOLANA;
        
        if (fromChain === toChain) {
          return { supported: true, needsCrossChain: false };
        }
        
        const isSupported = await marsLiFiService.isCrossChainSupported(fromChain, toChain);
        return {
          supported: isSupported,
          reason: isSupported ? undefined : `Cross-chain not supported from chain ${fromChain} to Solana`,
          needsCrossChain: true,
        };
      } else {
        // 提款：检查目标地址是否支持
        if (!toAddress) {
          return { supported: false, reason: 'Target address required for withdraw', needsCrossChain: false };
        }
        
        const fromChain = MARS_SUPPORTED_CHAINS.SOLANA;
        const toChain = marsLiFiService.getChainIdFromAddress(toAddress);
        
        if (fromChain === toChain) {
          return { supported: true, needsCrossChain: false };
        }
        
        const isSupported = await marsLiFiService.isCrossChainSupported(fromChain, toChain);
        return {
          supported: isSupported,
          reason: isSupported ? undefined : `Cross-chain not supported from Solana to chain ${toChain}`,
          needsCrossChain: true,
        };
      }
    } catch (error) {
      return {
        supported: false,
        reason: `Error checking support: ${error}`,
        needsCrossChain: false,
      };
    }
  }
}

// 创建单例实例
export const marsLiFiHelper = new MarsLiFiHelper();

export const MARS_SUPPORTED_ASSETS = ['USDC', 'USDT', 'SOL', 'ETH', 'BNB', 'MATIC'] as const;