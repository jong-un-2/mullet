/**
 * Mars LI.FI 跨链桥接集成
 * 前端服务，用于处理跨链存款和提款
 */

import { getApiBaseUrl } from '../config/api';

export interface LiFiChain {
  id: number;
  name: string;
  coin: string;
  logoURI: string;
  nativeToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
}

export interface LiFiToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  priceUSD?: string;
}

export interface LiFiQuote {
  route: any;
  estimatedTime: number;
  totalFees: number;
}

export interface CrossChainDepositParams {
  fromChain: number;
  fromToken: string;
  fromAmount: string;
  fromAddress: string;
  marsProtocol?: string;
}

export interface CrossChainWithdrawParams {
  toAddress: string; // 改为toAddress，自动判断目标链
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  marsProtocol?: string;
}

export interface ExecuteDepositParams {
  userAddress: string;
  fromChain: number;
  fromToken: string;
  fromAmount: string;
  transactionHash: string;
  marsProtocol?: string;
}

export interface ExecuteWithdrawParams {
  userAddress: string;
  toAddress: string; // 改为toAddress，自动判断目标链
  toToken: string;
  fromAmount: string;
  transactionHash: string;
  marsProtocol?: string;
}

class MarsLiFiService {
  private baseUrl = `${getApiBaseUrl()}/v1/api/mars/lifi`;

  /**
   * 获取LI.FI支持的链列表
   */
  async getSupportedChains(): Promise<LiFiChain[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chains`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chains: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.chains;
    } catch (error) {
      console.error('Failed to get supported chains:', error);
      throw error;
    }
  }

  /**
   * 获取指定链的代币列表
   */
  async getSupportedTokens(chainId?: number): Promise<LiFiToken[]> {
    try {
      const url = chainId 
        ? `${this.baseUrl}/tokens?chainId=${chainId}`
        : `${this.baseUrl}/tokens`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.tokens;
    } catch (error) {
      console.error('Failed to get supported tokens:', error);
      throw error;
    }
  }

  /**
   * 获取跨链存款报价
   */
  async getDepositQuote(params: CrossChainDepositParams): Promise<LiFiQuote> {
    try {
      const response = await fetch(`${this.baseUrl}/quote/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to get deposit quote: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Quote failed: ${data.error}`);
      }

      return data.quote;
    } catch (error) {
      console.error('Failed to get deposit quote:', error);
      throw error;
    }
  }

  /**
   * 获取跨链提款报价
   */
  async getWithdrawQuote(params: CrossChainWithdrawParams): Promise<LiFiQuote> {
    try {
      const response = await fetch(`${this.baseUrl}/quote/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to get withdraw quote: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Quote failed: ${data.error}`);
      }

      return data.quote;
    } catch (error) {
      console.error('Failed to get withdraw quote:', error);
      throw error;
    }
  }

  /**
   * 执行跨链存款
   */
  async executeDeposit(params: ExecuteDepositParams): Promise<{ success: boolean; transactionHash: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/execute/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute deposit: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Deposit execution failed: ${data.error}`);
      }

      return {
        success: data.success,
        transactionHash: data.transactionHash,
      };
    } catch (error) {
      console.error('Failed to execute deposit:', error);
      throw error;
    }
  }

  /**
   * 执行跨链提款
   */
  async executeWithdraw(params: ExecuteWithdrawParams): Promise<{ success: boolean; transactionHash: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/execute/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute withdraw: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Withdraw execution failed: ${data.error}`);
      }

      return {
        success: data.success,
        transactionHash: data.transactionHash,
      };
    } catch (error) {
      console.error('Failed to execute withdraw:', error);
      throw error;
    }
  }

  /**
   * 检查地址是否为EVM地址
   */
  private isEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * 检查地址是否为Solana地址  
   */
  private isSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  /**
   * 根据地址获取链ID
   */
  getChainIdFromAddress(address: string): number {
    if (this.isEvmAddress(address)) {
      return SUPPORTED_CHAINS.ETHEREUM; // 默认EVM链
    } else if (this.isSolanaAddress(address)) {
      return SOLANA_CHAIN_ID; // Solana链ID
    }
    throw new Error(`Unsupported address format: ${address}`);
  }

  /**
   * 检查是否支持跨链操作
   */
  async isCrossChainSupported(fromChain: number, toChain: number): Promise<boolean> {
    try {
      const chains = await this.getSupportedChains();
      const supportedChainIds = chains.map(chain => chain.id);
      
      return supportedChainIds.includes(fromChain) && supportedChainIds.includes(toChain);
    } catch (error) {
      console.error('Failed to check cross-chain support:', error);
      return false;
    }
  }

  /**
   * 检查地址是否支持跨链操作（基于地址）
   */
  async isCrossChainSupportedByAddress(fromAddress: string, toAddress: string): Promise<boolean> {
    try {
      const fromChain = this.getChainIdFromAddress(fromAddress);
      const toChain = this.getChainIdFromAddress(toAddress);
      return await this.isCrossChainSupported(fromChain, toChain);
    } catch (error) {
      console.error('Failed to check cross-chain support by address:', error);
      return false;
    }
  }

  /**
   * 获取推荐的跨链路径（基于地址）
   */
  async getRecommendedPathByAddress(fromAddress: string, toAddress: string, _asset: string): Promise<{
    supported: boolean;
    fromChain?: number;
    toChain?: number;
    estimatedTime?: number;
    estimatedFee?: number;
    route?: string;
  }> {
    try {
      const fromChain = this.getChainIdFromAddress(fromAddress);
      const toChain = this.getChainIdFromAddress(toAddress);
      const isSupported = await this.isCrossChainSupported(fromChain, toChain);
      
      if (!isSupported) {
        return { supported: false, fromChain, toChain };
      }

      // Mars特殊逻辑
      const isMarsDeposit = toChain === SOLANA_CHAIN_ID; // 目标是Solana
      const isMarsWithdraw = fromChain === SOLANA_CHAIN_ID; // 来源是Solana

      return {
        supported: true,
        fromChain,
        toChain,
        estimatedTime: isMarsDeposit || isMarsWithdraw ? 180 : 300, // Mars操作更快
        estimatedFee: 0.005, // 0.5% 手续费估计
        route: `${this.getChainName(fromChain)} -> ${this.getChainName(toChain)} via LI.FI ${isMarsDeposit ? '(Mars Deposit)' : isMarsWithdraw ? '(Mars Withdraw)' : ''}`,
      };
    } catch (error) {
      console.error('Failed to get recommended path:', error);
      return { supported: false };
    }
  }

  /**
   * 获取链名称
   */
  private getChainName(chainId: number): string {
    switch (chainId) {
      case SUPPORTED_CHAINS.ETHEREUM: return 'Ethereum';
      case SUPPORTED_CHAINS.BSC: return 'BSC';
      case SUPPORTED_CHAINS.POLYGON: return 'Polygon';
      case SUPPORTED_CHAINS.OPTIMISM: return 'Optimism';
      case SUPPORTED_CHAINS.ARBITRUM: return 'Arbitrum';
      case SOLANA_CHAIN_ID: return 'Solana';
      default: return `Chain ${chainId}`;
    }
  }
}

// 创建单例实例
export const marsLiFiService = new MarsLiFiService();

// 导出常用的链ID
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BSC: 56,
  POLYGON: 137, 
  OPTIMISM: 10,
  ARBITRUM: 42161,
} as const;

export const SOLANA_CHAIN_ID = 101;

// 导出常用代币地址
export const COMMON_TOKENS = {
  ETHEREUM: {
    USDC: '0xA0b86a33E6441a695a7e9B72b67B0a82f0913A50',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ETH: '0x0000000000000000000000000000000000000000',
  },
  BSC: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BNB: '0x0000000000000000000000000000000000000000',
  },
  POLYGON: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    MATIC: '0x0000000000000000000000000000000000000000',
  },
} as const;