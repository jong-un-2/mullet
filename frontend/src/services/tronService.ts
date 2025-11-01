/**
 * TRON 区块链服务
 * 用于处理 TRON 网络的交互，包括钱包连接、余额查询和交易
 */

import { TronWeb } from 'tronweb';
import { type TronConfig } from '../config/networkConfig';
import { TRON_CHAIN_ID } from '../constants/tronConstants';

// TRON 网络配置
export const tronMainnet: TronConfig = {
  chainId: 0, // TRON 使用字符串标识符 'mainnet'
  name: 'TRON Mainnet',
  fullHost: import.meta.env.VITE_TRON_MAINNET_RPC || 'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
  solidityNode: import.meta.env.VITE_TRON_SOLIDITY_NODE || 'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
  eventServer: import.meta.env.VITE_TRON_EVENT_SERVER || 'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
  blockExplorer: 'https://tronscan.org',
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6,
  },
};

export const tronNile: TronConfig = {
  chainId: 0, // TRON 使用字符串标识符 'nile'
  name: 'TRON Nile Testnet',
  fullHost: import.meta.env.VITE_TRON_NILE_RPC || 'https://nile.trongrid.io',
  solidityNode: import.meta.env.VITE_TRON_NILE_SOLIDITY || 'https://nile.trongrid.io',
  eventServer: import.meta.env.VITE_TRON_NILE_EVENT || 'https://nile.trongrid.io',
  blockExplorer: 'https://nile.tronscan.org',
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6,
  },
};

// TronWeb 类型定义
type TronWebInstance = any;

export interface TronWalletInfo {
  address: string;
  connected: boolean;
  walletType: 'tronlink' | 'walletconnect' | 'other';
}

export interface TronBalance {
  trx: string; // TRX balance
  tokens: {
    [address: string]: {
      balance: string;
      decimals: number;
      symbol: string;
      name: string;
    };
  };
}

class TronService {
  private tronWeb: TronWebInstance | null = null;
  private config: TronConfig;
  private walletInfo: TronWalletInfo | null = null;

  constructor(config?: TronConfig) {
    this.config = config || tronMainnet;
    this.initializeTronWeb();
  }

  /**
   * 初始化 TronWeb 实例
   */
  private initializeTronWeb() {
    try {
      // Ankr RPC 不支持自定义 headers，直接使用 fullHost
      this.tronWeb = new TronWeb({
        fullHost: this.config.fullHost,
      });
      console.log('✅ TronWeb initialized:', this.config.name);
    } catch (error) {
      console.error('❌ Failed to initialize TronWeb:', error);
    }
  }

  /**
   * 切换网络
   */
  switchNetwork(config: TronConfig) {
    this.config = config;
    this.initializeTronWeb();
  }

  /**
   * 检测 TronLink 钱包
   */
  async detectTronLink(): Promise<boolean> {
    return !!(window as any).tronWeb || !!(window as any).tronLink;
  }

  /**
   * 检查 TronLink 是否已连接（无需用户授权）
   */
  async checkTronLinkConnection(): Promise<TronWalletInfo | null> {
    try {
      const tronWeb = (window as any).tronWeb;
      
      // 检查 TronLink 是否已经连接并授权
      if (tronWeb && tronWeb.defaultAddress && tronWeb.defaultAddress.base58) {
        const address = tronWeb.defaultAddress.base58;
        
        this.walletInfo = {
          address,
          connected: true,
          walletType: 'tronlink',
        };
        
        this.tronWeb = tronWeb;
        console.log('✅ TronLink already connected:', address);
        return this.walletInfo;
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ TronLink not connected yet');
      return null;
    }
  }

  /**
   * 连接 TronLink 钱包
   */
  async connectTronLink(): Promise<TronWalletInfo> {
    try {
      const tronLink = (window as any).tronLink;
      
      if (!tronLink) {
        throw new Error('TronLink wallet not found. Please install TronLink extension.');
      }

      // 请求连接
      const result = await tronLink.request({ method: 'tron_requestAccounts' });
      
      if (!result || result.code !== 200) {
        throw new Error('User rejected the connection request');
      }

      // 获取账户地址
      const tronWeb = (window as any).tronWeb;
      if (!tronWeb || !tronWeb.defaultAddress.base58) {
        throw new Error('Failed to get TronLink account');
      }

      const address = tronWeb.defaultAddress.base58;
      
      this.walletInfo = {
        address,
        connected: true,
        walletType: 'tronlink',
      };

      // 使用 TronLink 的 TronWeb 实例
      this.tronWeb = tronWeb;

      console.log('✅ TronLink connected:', address);
      return this.walletInfo;
    } catch (error) {
      console.error('❌ Failed to connect TronLink:', error);
      throw error;
    }
  }

  /**
   * 断开钱包连接
   */
  async disconnect(): Promise<void> {
    this.walletInfo = null;
    this.initializeTronWeb(); // Reset to default TronWeb instance
    console.log('✅ Wallet disconnected');
  }

  /**
   * 获取当前连接的钱包信息
   */
  getWalletInfo(): TronWalletInfo | null {
    return this.walletInfo;
  }

  /**
   * 获取 TRX 余额
   */
  async getTrxBalance(address?: string): Promise<string> {
    try {
      const targetAddress = address || this.walletInfo?.address;
      if (!targetAddress || !this.tronWeb) {
        throw new Error('No address or TronWeb instance available');
      }

      const balance = await this.tronWeb.trx.getBalance(targetAddress);
      // Convert from SUN to TRX (1 TRX = 1,000,000 SUN)
      return (balance / 1_000_000).toString();
    } catch (error) {
      console.error('❌ Failed to get TRX balance:', error);
      return '0';
    }
  }

  /**
   * 获取 TRC20 代币余额
   */
  async getTrc20Balance(tokenAddress: string, walletAddress?: string): Promise<string> {
    try {
      const targetAddress = walletAddress || this.walletInfo?.address;
      if (!targetAddress || !this.tronWeb) {
        throw new Error('No address or TronWeb instance available');
      }

      // 设置默认地址，这样合约调用时会使用这个地址
      this.tronWeb.setAddress(targetAddress);

      const contract = await this.tronWeb.contract().at(tokenAddress);
      
      // 调用 balanceOf 方法时需要明确指定 from 地址
      const balance = await contract.balanceOf(targetAddress).call({
        from: targetAddress
      });
      
      const decimals = await contract.decimals().call();

      // Convert balance based on decimals
      const balanceNumber = Number(balance.toString()) / Math.pow(10, Number(decimals));
      return balanceNumber.toString();
    } catch (error) {
      console.error(`❌ Failed to get TRC20 balance for ${tokenAddress}:`, error);
      return '0';
    }
  }

  /**
   * 获取完整余额信息（TRX + TRC20 tokens）
   */
  async getBalance(address?: string, tokenAddresses?: string[]): Promise<TronBalance> {
    const targetAddress = address || this.walletInfo?.address;
    if (!targetAddress) {
      throw new Error('No address available');
    }

    const trx = await this.getTrxBalance(targetAddress);
    const tokens: TronBalance['tokens'] = {};

    if (tokenAddresses && tokenAddresses.length > 0) {
      for (const tokenAddress of tokenAddresses) {
        try {
          const balance = await this.getTrc20Balance(tokenAddress, targetAddress);
          const contract = await this.tronWeb!.contract().at(tokenAddress);
          const symbol = await contract.symbol().call();
          const name = await contract.name().call();
          const decimals = await contract.decimals().call();

          tokens[tokenAddress] = {
            balance,
            decimals: Number(decimals),
            symbol,
            name,
          };
        } catch (error) {
          console.error(`Failed to get token info for ${tokenAddress}:`, error);
        }
      }
    }

    return { trx, tokens };
  }

  /**
   * 发送 TRX
   */
  async sendTrx(toAddress: string, amount: string): Promise<string> {
    try {
      if (!this.walletInfo?.address || !this.tronWeb) {
        throw new Error('Wallet not connected');
      }

      // Convert TRX to SUN
      const amountInSun = Number(amount) * 1_000_000;

      const transaction = await this.tronWeb.transactionBuilder.sendTrx(
        toAddress,
        amountInSun,
        this.walletInfo.address
      );

      const signedTx = await this.tronWeb.trx.sign(transaction);
      const result = await this.tronWeb.trx.sendRawTransaction(signedTx);

      if (!result.result) {
        throw new Error('Transaction failed');
      }

      console.log('✅ TRX sent:', result.txid);
      return result.txid;
    } catch (error) {
      console.error('❌ Failed to send TRX:', error);
      throw error;
    }
  }

  /**
   * 发送 TRC20 代币
   */
  async sendTrc20(
    tokenAddress: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    try {
      if (!this.walletInfo?.address || !this.tronWeb) {
        throw new Error('Wallet not connected');
      }

      const contract = await this.tronWeb.contract().at(tokenAddress);
      const decimals = await contract.decimals().call();
      
      // Convert amount to token's smallest unit
      const amountInSmallestUnit = Number(amount) * Math.pow(10, Number(decimals));

      const result = await contract.transfer(
        toAddress,
        amountInSmallestUnit
      ).send({
        feeLimit: 100_000_000, // 100 TRX fee limit
      });

      console.log('✅ TRC20 token sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send TRC20:', error);
      throw error;
    }
  }

  /**
   * 获取交易详情
   */
  async getTransaction(txId: string) {
    try {
      if (!this.tronWeb) {
        throw new Error('TronWeb not initialized');
      }

      const tx = await this.tronWeb.trx.getTransaction(txId);
      return tx;
    } catch (error) {
      console.error('❌ Failed to get transaction:', error);
      throw error;
    }
  }

  /**
   * 验证 TRON 地址
   */
  isValidAddress(address: string): boolean {
    if (!this.tronWeb) {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    }
    return this.tronWeb.isAddress(address);
  }

  /**
   * 获取当前网络配置
   */
  getNetworkConfig(): TronConfig {
    return this.config;
  }

  /**
   * 获取链 ID
   */
  getChainId(): number {
    return this.config.chainId;
  }
}

// 创建单例实例（默认使用主网）
export const tronService = new TronService();

// 导出用于创建自定义实例
export { TronService };

// 导出 TRON 相关常量
export { TRON_CHAIN_ID };

/**
 * 获取 TronWeb 实例（用于 OKX DEX 集成）
 * 优先使用用户连接的钱包，否则使用默认 RPC
 */
export async function getTronWeb(): Promise<any> {
  // 1. 尝试使用 TronLink 钱包的 TronWeb
  const tronWeb = (window as any).tronWeb;
  if (tronWeb && tronWeb.defaultAddress && tronWeb.defaultAddress.base58) {
    console.log('[getTronWeb] 使用 TronLink 钱包的 TronWeb');
    return tronWeb;
  }

  // 2. 使用默认的 TronWeb 实例（Ankr RPC 不需要额外 headers）
  console.log('[getTronWeb] 使用默认 RPC TronWeb');
  return new TronWeb({
    fullHost: tronMainnet.fullHost,
  });
}
