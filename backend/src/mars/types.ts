/**
 * Mars Liquid - 核心类型定义
 * 统一管理 Jupiter Lend 和 Kamino Earn 的数据结构
 */

import { PublicKey } from '@solana/web3.js';

// ==================== 基础类型 ====================

export type SupportedAsset = 'USDC' | 'USDT' | 'SOL' | 'BONK';
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type TransactionType = 'deposit' | 'withdraw' | 'rebalance';

// ==================== Mars 收益机会 ====================

export interface MarsOpportunity {
  id: string;
  protocol: 'jupiter' | 'kamino';
  asset: SupportedAsset;
  apy: number;
  tvl: number;
  available: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  liquidityDepth: number;
  withdrawalTime: number; // 小时
  fees: {
    deposit: number;
    withdraw: number;
    management: number;
  };
}

// ==================== 用户仓位 ====================

export interface UserPosition {
  id: string;
  userAddress: string;
  protocol: 'jupiter' | 'kamino';
  asset: SupportedAsset;
  amount: number;
  shares: number;
  entryAPY: number;
  currentValue: number;
  unrealizedGain: number;
  depositTime: Date;
  lastUpdate: Date;
}

// ==================== 分配策略 ====================

export interface AllocationStrategy {
  totalAmount: number;
  asset: SupportedAsset;
  riskProfile: RiskProfile;
  allocations: {
    protocol: 'jupiter' | 'kamino';
    percentage: number;
    amount: number;
    expectedAPY: number;
  }[];
  expectedAPY: number;
  riskScore: number;
}

// ==================== 交易数据 ====================

export interface MarsTransaction {
  id: string;
  type: TransactionType;
  userAddress: string;
  asset: SupportedAsset;
  amount: number;
  protocol?: 'jupiter' | 'kamino';
  status: 'pending' | 'processing' | 'success' | 'failed';
  signature?: string;
  serializedTx?: string; // Base64 encoded Solana transaction
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface TransactionPreview {
  amount: number;
  asset: SupportedAsset;
  estimatedGas: number;
  fees: {
    protocol: number;
    network: number;
    total: number;
  };
  estimatedTime: number; // 秒
  allocation?: AllocationStrategy;
}

// ==================== 取款相关 ====================

export interface WithdrawPreview {
  availableAmount: number;
  requestedAmount: number;
  fees: {
    protocol: number;
    network: number;
    slippage: number;
    total: number;
  };
  estimatedReceived: number;
  estimatedTime: number; // 秒
  withdrawPaths: WithdrawPath[];
  optimalPath: WithdrawPath;
}

export interface WithdrawPath {
  protocol: 'jupiter' | 'kamino';
  percentage: number;
  amount: number;
  estimatedTime: number;
  fees: number;
  liquidity: number;
  priority: number; // 1-10, 10 is highest
}

// ==================== Jupiter Lend 特定类型 ====================

export interface JupiterEarnPosition {
  id: string;
  asset: SupportedAsset;
  apy: number;
  tvl: number;
  available: boolean;
  minDeposit: number;
  maxDeposit: number;
  depositFee: number;
  withdrawFee: number;
}

export interface JupiterLendConfig {
  apiUrl: string;
  apiKey?: string;
  rateLimit: number;
  retryDelay: number;
  maxRetries: number;
}

// ==================== Kamino 特定类型 ====================

export interface KaminoStrategy {
  id: string;
  name: string;
  asset: SupportedAsset;
  apy: number;
  tvl: number;
  riskScore: number; // 1-10
  protocols: string[]; // 底层协议组合
  minDeposit: number;
  maxDeposit: number;
  shareMint: PublicKey;
  reserve: PublicKey;
}

export interface KaminoMarketInfo {
  address: PublicKey;
  asset: SupportedAsset;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: number;
  totalBorrow: number;
  utilizationRate: number;
  liquidityMining: boolean;
}

// ==================== 缓存类型 ====================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface MarsCacheKeys {
  JUPITER_RATES: string;
  KAMINO_MARKETS: string;
  STRATEGIES: string;
  USER_POSITIONS: string;
  OPTIMIZATION: string;
  WITHDRAW_PATHS: string;
  FEES_ESTIMATE: string;
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface MarsHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    jupiter: boolean;
    kamino: boolean;
    cache: boolean;
    database: boolean;
  };
  metrics: {
    totalTVL: number;
    activeUsers: number;
    avgAPY: number;
    systemLoad: number;
  };
  timestamp: string;
}

// ==================== 错误类型 ====================

export class MarsError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MarsError';
  }
}

export class JupiterError extends MarsError {
  constructor(message: string, details?: any) {
    super('JUPITER_ERROR', message, details);
    this.name = 'JupiterError';
  }
}

export class KaminoError extends MarsError {
  constructor(message: string, details?: any) {
    super('KAMINO_ERROR', message, details);
    this.name = 'KaminoError';
  }
}

export class TransactionError extends MarsError {
  constructor(message: string, details?: any) {
    super('TRANSACTION_ERROR', message, details);
    this.name = 'TransactionError';
  }
}