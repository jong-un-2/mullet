/**
 * Neon Database Commission API Routes
 * 佣金费用相关数据API
 */

import { Hono } from 'hono';
import { withDatabase } from '../database/postgres';
import type { Env } from '../index';

export function createNeonCommissionRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * 获取佣金记录列表
   */
  app.post('/commission-records', async (c) => {
    try {
      const params = await c.req.json();
      const { startDate, endDate, user, pageSize = 20, current = 1 } = params;

      if (!c.env.HYPERDRIVE) {
        throw new Error('Database connection not available');
      }

      return await withDatabase(c.env as any, async (sql) => {
        const offset = (current - 1) * pageSize;
        
        const result = await sql`
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
              ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
            END as "platformFee",
            CASE 
              WHEN platform_fee > 0 THEN 'success'
              ELSE 'success'
            END as "status"
          FROM farmrewardsclaimedevent 
          WHERE 1=1 
          ${startDate ? sql`AND _block_timestamp_ >= ${startDate}` : sql``}
          ${endDate ? sql`AND _block_timestamp_ <= ${endDate}` : sql``}
          ${user ? sql`AND "user" ILIKE ${`%${user}%`}` : sql``}
          ORDER BY _block_timestamp_ DESC 
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        
        // 获取总数
        const countResult = await sql`
          SELECT COUNT(*) as total 
          FROM farmrewardsclaimedevent 
          WHERE 1=1 
          ${startDate ? sql`AND _block_timestamp_ >= ${startDate}` : sql``}
          ${endDate ? sql`AND _block_timestamp_ <= ${endDate}` : sql``}
          ${user ? sql`AND "user" ILIKE ${`%${user}%`}` : sql``}
        `;

        return c.json({
          success: true,
          data: result || [],
          total: parseInt(countResult[0]?.total as string) || 0,
        });
      });
    } catch (error) {
      console.error('获取佣金记录失败:', error);
      return c.json({ 
        success: false, 
        message: '获取佣金记录失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  /**
   * 获取佣金统计数据
   */
  app.post('/commission-statistics', async (c) => {
    try {
      const params = await c.req.json();
      const { startDate, endDate } = params;

      if (!c.env.HYPERDRIVE) {
        throw new Error('Database connection not available');
      }

      return await withDatabase(c.env as any, async (sql) => {
        const result = await sql`
          SELECT 
            COUNT(*) as "totalTransactions",
            COALESCE(SUM(
              CASE 
                WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
                ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
              END
            ), 0) as "totalFee",
            COALESCE(AVG(
              CASE 
                WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
                ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
              END
            ), 0) as "avgFee",
            COUNT(DISTINCT "user") as "activeUsers"
          FROM farmrewardsclaimedevent 
          WHERE 1=1 ${startDate ? sql`AND _block_timestamp_ >= ${startDate}` : sql``} ${endDate ? sql`AND _block_timestamp_ <= ${endDate}` : sql``}
        `;
        
        return c.json({
          success: true,
          data: {
            totalFee: parseFloat(result[0]?.totalFee as string) || 0,
            totalTransactions: parseInt(result[0]?.totalTransactions as string) || 0,
            avgFee: parseFloat(result[0]?.avgFee as string) || 0,
            activeUsers: parseInt(result[0]?.activeUsers as string) || 0,
            currentFeeRate: 25, // 从配置中获取
          }
        });
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return c.json({ 
        success: false, 
        message: '获取统计数据失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  /**
   * 获取用户佣金排行榜
   */
  app.post('/user-statistics', async (c) => {
    try {
      const params = await c.req.json();
      const { startDate, endDate, limit = 10 } = params;

      if (!c.env.HYPERDRIVE) {
        throw new Error('Database connection not available');
      }

      return await withDatabase(c.env as any, async (sql) => {
        const result = await sql`
          SELECT 
            "user",
            COUNT(*) as "transactionCount",
            COALESCE(SUM(
              CASE 
                WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
                ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
              END
            ), 0) as "totalFee",
            MAX(_block_timestamp_) as "lastTransaction"
          FROM farmrewardsclaimedevent 
          WHERE 1=1 
          ${startDate ? sql`AND _block_timestamp_ >= ${startDate}` : sql``}
          ${endDate ? sql`AND _block_timestamp_ <= ${endDate}` : sql``}
          GROUP BY "user" 
          ORDER BY "totalFee" DESC 
          LIMIT ${limit}
        `;

        return c.json({
          success: true,
          data: result || []
        });
      });
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return c.json({ 
        success: false, 
        message: '获取用户统计失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  /**
   * 获取时间趋势数据
   */
  app.post('/trend-data', async (c) => {
    try {
      const params = await c.req.json();
      const { startDate, endDate, timeUnit = 'day' } = params;

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
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      if (!c.env.HYPERDRIVE) {
        throw new Error('Database connection not available');
      }

      return await withDatabase(c.env as any, async (sql) => {
        const result = await sql`
          SELECT 
            TO_CHAR(_block_timestamp_, ${dateFormat}) as date,
            COUNT(*) as "transactionCount",
            COALESCE(SUM(
              CASE 
                WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
                ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
              END
            ), 0) as "totalFee",
            COALESCE(AVG(
              CASE 
                WHEN platform_fee > 0 THEN platform_fee::numeric / 1000000.0
                ELSE (total_rewards_claimed::numeric * 0.25) / 1000000.0
              END
            ), 0) as "avgFee"
          FROM farmrewardsclaimedevent 
          WHERE 1=1
          ${startDate ? sql`AND _block_timestamp_ >= ${startDate}` : sql``}
          ${endDate ? sql`AND _block_timestamp_ <= ${endDate}` : sql``}
          GROUP BY date 
          ORDER BY date
        `;

        return c.json({
          success: true,
          data: result || []
        });
      });
    } catch (error) {
      console.error('获取趋势数据失败:', error);
      return c.json({ 
        success: false, 
        message: '获取趋势数据失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  });

  return app;
}