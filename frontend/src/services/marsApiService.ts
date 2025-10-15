/**
 * Mars Liquid API service for DeFi operations and data
 * 统一的Mars API服务，包含交易和数据接口
 */

import { API_CONFIG, getDefaultHeaders, type ApiResponse as BaseApiResponse } from '../config/api';

// ==================== 数据API接口定义 ====================
export interface MarsTvlData {
  totalTvlUsd: number;
  byAsset: Record<string, number>;
  protocols: Array<{
    protocol: string;
    asset: string;
    tvlUsd: number;
    apy: number;
    timestamp: number;
  }>;
}

export interface MarsApyData {
  bestApy: number;
  averageApy: number;
  protocols: Array<{
    protocol: string;
    asset: string;
    rawApy: number;
    platformFee: number;
    netApy: number;
    timestamp: number;
  }>;
}

export interface MarsUserEarnings {
  totalEarningsUsd: number;
  dailyEarnings: number;
  monthlyEarnings: number;
  activeDays: number;
  byAsset: Record<string, {
    totalEarnings: number;
    dailyEarnings: number;
    apy: number;
  }>;
}

export interface MarsCalendarData {
  year: number;
  month: number;
  monthKey: string;
  totalEarnings: number;
  activeDays: number;
  dailyBreakdown: Array<{
    date: string;
    earnings: number;
    apy: number;
  }>;
}

export interface MarsPerformanceData {
  date: string;
  apy: number;
  tvl: number;
}

export interface VaultHistoricalData {
  date: string;
  recordedAt: string;
  lendingApy: number;
  incentivesApy: number;
  totalApy: number;
  totalSupplied: number;
  totalSuppliedUsd: number;
  tokenSymbol: string;
}

export interface MarsTransactionHistory {
  id: string;
  date: string;
  type: 'deposit' | 'withdraw';
  asset: string;
  amount: string;
  amountUsd: number;
  protocol: string;
  status: string;
  txHash: string;
  apy: number;
}

export interface MarsEarningDetail {
  id: string;
  date: string;
  type: 'claim';
  rewardMint: string;
  rewardAmount: string;
  rewardAmountRaw: string;
  totalRewardsClaimed: string;
  vaultMint: string;
  farmState: string;
  claimedAt: number;
  blockNumber: number;
  timestamp: string;
}

// ==================== 交易API接口定义 ====================
export interface MarsOpportunity {
  id: string;
  protocol: 'jupiter' | 'kamino';
  asset: string;
  apy: number;
  tvl: number;
  available: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  liquidityDepth: number;
  withdrawalTime: number;
  fees: {
    deposit: number;
    withdraw: number;
    management: number;
  };
}

export interface MarsUserPosition {
  id: string;
  userAddress: string;
  protocol: 'jupiter' | 'kamino';
  asset: string;
  amount: number;
  shares: number;
  entryAPY: number;
  currentValue: number;
  unrealizedGain: number;
  depositTime: string;
  lastUpdate: string;
}

export interface MarsPositionsResponse {
  jupiter: {
    protocol: 'jupiter';
    totalPositions: number;
    totalValue: number;
    avgAPY: number;
    positions: MarsUserPosition[];
  };
  kamino: {
    protocol: 'kamino';
    totalPositions: number;
    totalValue: number;
    avgAPY: number;
    positions: MarsUserPosition[];
  };
  summary: {
    totalProtocols: number;
    totalPositions: number;
    totalValue: number;
    avgAPY: number;
  };
}

export interface MarsDepositRequest {
  userAddress: string;
  asset: string;
  amount: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export interface MarsDepositResponse {
  transaction: {
    id: string;
    type: 'deposit';
    userAddress: string;
    asset: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'failed';
    createdAt: string;
    // Add transaction data for wallet signing
    serializedTx?: string; // Base64 encoded transaction
    instructions?: any[]; // Transaction instructions
  };
  allocation: {
    totalAmount: number;
    asset: string;
    riskProfile: string;
    allocations: Array<{
      protocol: 'jupiter' | 'kamino';
      percentage: number;
      amount: number;
      expectedAPY: number;
    }>;
    expectedAPY: number;
    riskScore: number;
  };
  preview: {
    estimatedGas: number;
    fees: {
      protocol: number;
      network: number;
      total: number;
    };
    estimatedTime: number;
  };
}

export interface MarsWithdrawRequest {
  userAddress: string;
  asset: string;
  amount: number | 'max'; // Support partial or full withdrawal
  positionId?: string; // Optional specific position to withdraw from
}

export interface MarsWithdrawResponse {
  transaction: {
    id: string;
    type: 'withdraw';
    userAddress: string;
    asset: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'failed';
    createdAt: string;
    serializedTx?: string; // Base64 encoded transaction
    instructions?: any[]; // Transaction instructions
  };
  withdrawal: {
    totalAmount: number;
    asset: string;
    withdrawals: Array<{
      protocol: 'jupiter' | 'kamino';
      positionId: string;
      shares: number;
      amount: number;
      penalty: number; // Early withdrawal penalty if any
    }>;
    totalReceived: number; // Amount after fees and penalties
    totalFees: number;
  };
  preview: {
    estimatedGas: number;
    fees: {
      protocol: number;
      network: number;
      total: number;
    };
    estimatedTime: number;
  };
}

// 使用统一的ApiResponse接口
export interface ApiResponse<T> extends BaseApiResponse<T> {}

class MarsApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private dataApiUrl = API_CONFIG.BASE_URL;

  // ==================== 通用HTTP方法 ====================
  private getHeaders(): HeadersInit {
    return getDefaultHeaders(true);
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // 数据API专用请求方法
  private async fetchDataApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/data${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data as T;
    } catch (error) {
      console.error(`Mars Data API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // 获取健康状态
  async getHealth() {
    return this.get('/v1/api/mars/health');
  }

  // 获取投资机会
  async getOpportunities(): Promise<ApiResponse<MarsOpportunity[]>> {
    return this.get('/v1/api/mars/opportunities');
  }

  // 获取用户仓位
  async getUserPositions(userAddress: string): Promise<ApiResponse<MarsPositionsResponse>> {
    return this.get(`/v1/api/mars/positions/${userAddress}`);
  }

  // 创建存款交易
  async createDeposit(request: MarsDepositRequest): Promise<ApiResponse<MarsDepositResponse>> {
    return this.post('/v1/api/mars/transactions/deposit', request);
  }

  // 创建取款交易
  async createWithdraw(request: MarsWithdrawRequest): Promise<ApiResponse<MarsWithdrawResponse>> {
    return this.post('/v1/api/mars/transactions/withdraw', request);
  }

  // 获取资产分配优化建议
  async getOptimization(userAddress: string, riskProfile: string) {
    return this.post('/v1/api/mars/optimize', {
      userAddress,
      riskProfile,
    });
  }

  // 取款预览
  async getWithdrawPreview(userAddress: string, asset: string, amount: number) {
    return this.post('/v1/api/mars/withdraw/preview', {
      userAddress,
      asset,
      amount,
    });
  }

  // ==================== 数据API方法 ====================
  
  // 获取TVL汇总数据
  async getTvlData(): Promise<MarsTvlData> {
    return this.fetchDataApi<MarsTvlData>('/tvl');
  }

  // 获取APY数据
  async getApyData(asset?: string): Promise<MarsApyData> {
    const params = asset ? `?asset=${encodeURIComponent(asset)}` : '';
    return this.fetchDataApi<MarsApyData>(`/apy${params}`);
  }

  // 获取用户收益汇总
  async getUserEarnings(userAddress: string): Promise<MarsUserEarnings> {
    return this.fetchDataApi<MarsUserEarnings>('/user/earnings', {
      method: 'POST',
      body: JSON.stringify({ userAddress }),
    });
  }

  // 获取日历收益数据
  async getUserCalendar(
    userAddress: string, 
    year: number, 
    month: number
  ): Promise<MarsCalendarData> {
    return this.fetchDataApi<MarsCalendarData>('/user/calendar', {
      method: 'POST',
      body: JSON.stringify({ userAddress, year, month }),
    });
  }

  // 获取性能图表数据
  async getPerformanceData(
    protocol?: string, 
    asset: string = 'USDC', 
    days: number = 30
  ): Promise<MarsPerformanceData[]> {
    const params = new URLSearchParams({
      asset,
      days: days.toString(),
    });
    
    if (protocol) {
      params.append('protocol', protocol);
    }

    return this.fetchDataApi<MarsPerformanceData[]>(`/performance?${params}`);
  }

  // 获取交易历史（从 Neon PostgreSQL 读取真实数据）
  async getUserTransactions(userAddress: string, vaultAddress?: string): Promise<{
    transactions: MarsTransactionHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.fetchDataApi('/user/transactions', {
      method: 'POST',
      body: JSON.stringify({ userAddress, vaultAddress }),
    });
  }

  // 从 Neon 数据库获取真实的交易历史
  async getVaultTransactions(userAddress: string, vaultAddress?: string): Promise<{
    transactions: MarsTransactionHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/vault/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress, vaultAddress }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<{
        transactions: MarsTransactionHistory[];
        total: number;
        page: number;
        limit: number;
      }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Vault transactions API Error:', error);
      throw error;
    }
  }

  // 从 Neon 数据库获取真实的日历数据
  async getVaultCalendar(
    userAddress: string,
    year: number,
    month: number,
    vaultAddress?: string
  ): Promise<MarsCalendarData> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/vault/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress, year, month, vaultAddress }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<MarsCalendarData> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Vault calendar API Error:', error);
      throw error;
    }
  }

  // 从 Neon 数据库获取真实的收益数据
  async getVaultEarnings(userAddress: string, vaultAddress?: string): Promise<MarsUserEarnings> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/vault/earnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress, vaultAddress }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<MarsUserEarnings> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Vault earnings API Error:', error);
      throw error;
    }
  }

  // 从 Neon 数据库获取真实的收益明细历史
  async getVaultEarningDetails(userAddress: string, vaultAddress?: string): Promise<{
    earningDetails: MarsEarningDetail[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/vault/earning-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress, vaultAddress }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<{
        earningDetails: MarsEarningDetail[];
        total: number;
        page: number;
        limit: number;
      }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Vault earning details API Error:', error);
      throw error;
    }
  }

  // 获取 Vault 历史数据（APY 和 TVL 趋势图）
  async getVaultHistoricalData(
    vaultAddress?: string,
    days: number = 30
  ): Promise<{
    vaultAddress: string;
    days: number;
    dataPoints: number;
    historical: VaultHistoricalData[];
  }> {
    try {
      const response = await fetch(`${this.dataApiUrl}/v1/api/mars/vault/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vaultAddress, days }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<{
        vaultAddress: string;
        days: number;
        dataPoints: number;
        historical: VaultHistoricalData[];
      }> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'API request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Vault historical data API Error:', error);
      throw error;
    }
  }
}

export const marsApiService = new MarsApiService();