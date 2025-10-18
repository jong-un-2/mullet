import { request } from '@umijs/max';

// 后端 API 基础地址
const MARS_BACKEND_API = 'https://api.marsliquidity.com';

// 佣金记录接口
export interface CommissionRecord {
  id?: string;
  blockNumber: number;
  blockTimestamp: string;
  user: string;
  vaultMint: string;
  farmState: string;
  rewardMint: string;
  rewardAmount: number;
  totalRewardsClaimed: number;
  platformFee: number;
  transactionSignature?: string;
  status: 'success' | 'pending' | 'failed';
}

// 统计数据接口
export interface CommissionStatistics {
  totalFee: number;
  totalTransactions: number;
  avgFee: number;
  activeUsers: number;
  currentFeeRate: number;
}

// 用户统计接口
export interface UserStatistics {
  user: string;
  totalFee: number;
  transactionCount: number;
  lastTransaction: string;
}

// 时间趋势数据接口
export interface TrendData {
  date: string;
  totalFee: number;
  transactionCount: number;
  avgFee: number;
}

/**
 * 获取佣金记录列表 - 调用后端API
 */
export async function getCommissionRecords(params?: {
  startDate?: string;
  endDate?: string;
  user?: string;
  status?: string;
  pageSize?: number;
  current?: number;
}) {
  try {
    const response = await request(`${MARS_BACKEND_API}/api/neon/commission-records`, {
      method: 'POST',
      data: params,
    });
    
    return {
      data: response.data || [],
      success: response.success,
      total: response.total || 0,
    };
  } catch (error) {
    console.error('获取佣金记录失败:', error);
    return {
      data: [],
      success: false,
      total: 0,
    };
  }
}

/**
 * 获取佣金统计数据 - 调用后端API
 */
export async function getCommissionStatistics(params?: {
  startDate?: string;
  endDate?: string;
}) {
  try {
    const response = await request(`${MARS_BACKEND_API}/api/neon/commission-statistics`, {
      method: 'POST',
      data: params,
    });
    
    return response.data || {
      totalFee: 0,
      totalTransactions: 0,
      avgFee: 0,
      activeUsers: 0,
      currentFeeRate: 25,
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      totalFee: 0,
      totalTransactions: 0,
      avgFee: 0,
      activeUsers: 0,
      currentFeeRate: 25,
    };
  }
}

/**
 * 获取用户佣金排行榜 - 调用后端API
 */
export async function getUserStatistics(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  try {
    const response = await request(`${MARS_BACKEND_API}/api/neon/user-statistics`, {
      method: 'POST',
      data: params,
    });
    
    return response.data || [];
  } catch (error) {
    console.error('获取用户统计失败:', error);
    return [];
  }
}

/**
 * 获取时间趋势数据 - 调用后端API
 */
export async function getTrendData(params?: {
  startDate?: string;
  endDate?: string;
  timeUnit?: 'day' | 'week' | 'month';
}) {
  try {
    const response = await request(`${MARS_BACKEND_API}/api/neon/trend-data`, {
      method: 'POST',
      data: params,
    });
    
    return response.data || [];
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return [];
  }
}