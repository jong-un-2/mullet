import { request } from '@umijs/max';

// Neon数据库配置
const NEON_CONFIG = {
  projectId: 'quiet-wildflower-19104231',
  databaseName: 'neondb',
};

/**
 * Neon数据库查询接口
 */
export async function queryNeonDatabase(sql: string, params?: any[]) {
  try {
    const response = await request('/api/neon/query', {
      method: 'POST',
      data: {
        projectId: NEON_CONFIG.projectId,
        databaseName: NEON_CONFIG.databaseName,
        sql,
        params: params || [],
      },
    });

    return {
      success: true,
      data: response.data || [],
      total: response.total || response.data?.length || 0,
    };
  } catch (error) {
    console.error('Neon数据库查询失败:', error);
    return {
      success: false,
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取佣金记录
 */
export async function getCommissionRecordsFromNeon(params?: {
  startDate?: string;
  endDate?: string;
  user?: string;
  pageSize?: number;
  current?: number;
}) {
  let sql = `
    SELECT 
      _block_number_ as "blockNumber",
      _block_timestamp_ as "blockTimestamp", 
      "user",
      vault_mint as "vaultMint",
      farm_state as "farmState",
      reward_mint as "rewardMint",
      reward_amount::numeric / 1000000.0 as "rewardAmount",
      total_rewards_claimed::numeric / 1000000.0 as "totalRewardsClaimed",
      CASE 
        WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
        ELSE total_rewards_claimed::numeric / 1000000.0
      END as "platformFee"
    FROM farmrewardsclaimedevent 
    WHERE 1=1
  `;

  const sqlParams: any[] = [];
  
  if (params?.startDate) {
    sql += ` AND _block_timestamp_ >= $${sqlParams.length + 1}`;
    sqlParams.push(params.startDate);
  }
  
  if (params?.endDate) {
    sql += ` AND _block_timestamp_ <= $${sqlParams.length + 1}`;
    sqlParams.push(params.endDate);
  }
  
  if (params?.user) {
    sql += ` AND "user" ILIKE $${sqlParams.length + 1}`;
    sqlParams.push(`%${params.user}%`);
  }

  sql += ` ORDER BY _block_timestamp_ DESC`;
  
  if (params?.pageSize) {
    sql += ` LIMIT $${sqlParams.length + 1}`;
    sqlParams.push(params.pageSize);
    
    if (params?.current && params.current > 1) {
      sql += ` OFFSET $${sqlParams.length + 1}`;
      sqlParams.push((params.current - 1) * params.pageSize);
    }
  }

  return queryNeonDatabase(sql, sqlParams);
}

/**
 * 获取佣金统计数据
 */
export async function getCommissionStatisticsFromNeon(params?: {
  startDate?: string;
  endDate?: string;
}) {
  let sql = `
    SELECT 
      COUNT(*) as "totalTransactions",
      COALESCE(SUM(
        CASE 
          WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
          ELSE total_rewards_claimed::numeric / 1000000.0
        END
      ), 0) as "totalFee",
      COALESCE(AVG(
        CASE 
          WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
          ELSE total_rewards_claimed::numeric / 1000000.0
        END
      ), 0) as "avgFee",
      COUNT(DISTINCT "user") as "activeUsers"
    FROM farmrewardsclaimedevent 
    WHERE 1=1
  `;

  const sqlParams: any[] = [];
  
  if (params?.startDate) {
    sql += ` AND _block_timestamp_ >= $${sqlParams.length + 1}`;
    sqlParams.push(params.startDate);
  }
  
  if (params?.endDate) {
    sql += ` AND _block_timestamp_ <= $${sqlParams.length + 1}`;
    sqlParams.push(params.endDate);
  }

  const result = await queryNeonDatabase(sql, sqlParams);
  
  if (result.success && result.data.length > 0) {
    const data = result.data[0];
    return {
      totalFee: parseFloat(data.totalFee) || 0,
      totalTransactions: parseInt(data.totalTransactions) || 0,
      avgFee: parseFloat(data.avgFee) || 0,
      activeUsers: parseInt(data.activeUsers) || 0,
      currentFeeRate: 25, // 从配置中获取
    };
  }
  
  return {
    totalFee: 0,
    totalTransactions: 0,
    avgFee: 0,
    activeUsers: 0,
    currentFeeRate: 25,
  };
}

/**
 * 获取用户佣金排行榜
 */
export async function getUserStatisticsFromNeon(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  let sql = `
    SELECT 
      "user",
      COUNT(*) as "transactionCount",
      COALESCE(SUM(
        CASE 
          WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
          ELSE total_rewards_claimed::numeric / 1000000.0
        END
      ), 0) as "totalFee",
      MAX(_block_timestamp_) as "lastTransaction"
    FROM farmrewardsclaimedevent 
    WHERE 1=1
  `;

  const sqlParams: any[] = [];
  
  if (params?.startDate) {
    sql += ` AND _block_timestamp_ >= $${sqlParams.length + 1}`;
    sqlParams.push(params.startDate);
  }
  
  if (params?.endDate) {
    sql += ` AND _block_timestamp_ <= $${sqlParams.length + 1}`;
    sqlParams.push(params.endDate);
  }

  sql += ` GROUP BY "user" ORDER BY "totalFee" DESC`;
  
  if (params?.limit) {
    sql += ` LIMIT $${sqlParams.length + 1}`;
    sqlParams.push(params.limit);
  }

  const result = await queryNeonDatabase(sql, sqlParams);
  return result.success ? result.data : [];
}

/**
 * 获取时间趋势数据
 */
export async function getTrendDataFromNeon(params?: {
  startDate?: string;
  endDate?: string;
  timeUnit?: 'day' | 'week' | 'month';
}) {
  const timeUnit = params?.timeUnit || 'day';
  let dateFormat = '';
  
  switch (timeUnit) {
    case 'day':
      dateFormat = 'YYYY-MM-DD';
      break;
    case 'week':
      dateFormat = 'YYYY-"W"WW';
      break;
    case 'month':
      dateFormat = 'YYYY-MM';
      break;
  }

  let sql = `
    SELECT 
      TO_CHAR(_block_timestamp_, '${dateFormat}') as date,
      COUNT(*) as "transactionCount",
      COALESCE(SUM(
        CASE 
          WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
          ELSE total_rewards_claimed::numeric / 1000000.0
        END
      ), 0) as "totalFee",
      COALESCE(AVG(
        CASE 
          WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
          ELSE total_rewards_claimed::numeric / 1000000.0
        END
      ), 0) as "avgFee"
    FROM farmrewardsclaimedevent 
    WHERE 1=1
  `;

  const sqlParams: any[] = [];
  
  if (params?.startDate) {
    sql += ` AND _block_timestamp_ >= $${sqlParams.length + 1}`;
    sqlParams.push(params.startDate);
  }
  
  if (params?.endDate) {
    sql += ` AND _block_timestamp_ <= $${sqlParams.length + 1}`;
    sqlParams.push(params.endDate);
  }

  sql += ` GROUP BY date ORDER BY date`;

  const result = await queryNeonDatabase(sql, sqlParams);
  return result.success ? result.data : [];
}