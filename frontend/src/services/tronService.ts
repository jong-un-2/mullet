/**
 * TRON 区块链服务
 * 用于处理 TRON 网络的交互，包括钱包连接、余额查询和交易
 */

import { TronWeb } from 'tronweb';
import { tronMainnet, tronNile, type TronConfig } from '../config/networkConfig';
import { TRON_CHAIN_ID } from './marsLiFiService';

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
      this.tronWeb = new TronWeb({
        fullHost: this.config.fullHost,
        headers: { "TRON-PRO-API-KEY": import.meta.env.VITE_TRONGRID_API_KEY || '' },
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

      const contract = await this.tronWeb.contract().at(tokenAddress);
      const balance = await contract.balanceOf(targetAddress).call();
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
export const TRON_NILE_CHAIN_ID = 3448148188;

// 导出网络配置
export { tronMainnet, tronNile };
