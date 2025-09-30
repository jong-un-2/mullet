/**
 * Mars Wallet Connection API Service
 * 处理钱包连接记录的 API 调用
 */

import { API_CONFIG, getDefaultHeaders } from '../config/api';

export interface WalletConnectionData {
  walletAddress: string;
  walletType: 'privy' | 'metamask' | 'phantom' | 'trust' | 'solflare' | 'backpack' | 'coinbase' | 'rainbow' | 'other';
  chainType: 'ethereum' | 'solana' | 'multi-chain';
  networkId?: string;
  userAgent?: string;
  sessionId?: string;
  
  // Privy 特有信息
  privyUserId?: string;
  privyEmail?: string;
  privyAuthMethod?: string;
}

export interface WalletDisconnectionData {
  walletAddress: string;
  sessionId?: string;
}

export interface WalletConnectionResponse {
  success: boolean;
  sessionId: string;
}

class MarsWalletConnectionAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MARS_API}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getDefaultHeaders(true),
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * 记录钱包连接
   */
  async recordConnection(data: WalletConnectionData): Promise<WalletConnectionResponse> {
    try {
      const result = await this.makeRequest('/wallet/connect', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ Wallet connection recorded:', result);
      return result.data;
    } catch (error) {
      console.error('❌ Failed to record wallet connection:', error);
      throw error;
    }
  }

  /**
   * 记录钱包断开连接
   */
  async recordDisconnection(data: WalletDisconnectionData): Promise<{ success: boolean }> {
    try {
      const result = await this.makeRequest('/wallet/disconnect', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ Wallet disconnection recorded:', result);
      return result.data;
    } catch (error) {
      console.error('❌ Failed to record wallet disconnection:', error);
      throw error;
    }
  }

  /**
   * 获取钱包连接历史
   */
  async getConnectionHistory(address: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.makeRequest(`/wallet/history/${address}?limit=${limit}`, {
        method: 'GET',
      });

      return result.data;
    } catch (error) {
      console.error('❌ Failed to get wallet connection history:', error);
      return [];
    }
  }
}

export const marsWalletAPI = new MarsWalletConnectionAPI();