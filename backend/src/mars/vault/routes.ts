/**
 * Mars Vault Data API Routes - Reading from Neon PostgreSQL
 * 从 Neon 数据库读取真实的 vault 交易历史和收益数据
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { withDrizzle } from '../../database/postgres';
import type { Env } from '../../index';
import type { HyperdriveEnv } from '../../database/postgres';
import * as schema from '../../database/postgres-schema';

const marsVaultRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const userAddressSchema = z.object({
  userAddress: z.string().min(1),
  vaultAddress: z.string().optional(),
});

const calendarSchema = z.object({
  userAddress: z.string().min(1),
  vaultAddress: z.string().optional(),
  year: z.number().int().min(2024).max(2030),
  month: z.number().int().min(1).max(12),
});

/**
 * GET /vault/transactions - 获取用户的交易历史
 * 从 mars_vault_deposits 和 mars_vault_withdrawals 表读取
 */
marsVaultRoutes.post('/transactions',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress, vaultAddress } = c.req.valid('json');

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        // Query raw SQL since we're using the kamino event tables
        // Get deposits from kaminodepositevent table
        const depositsResult = await db.execute(sql`
          SELECT 
            CONCAT('deposit-', _block_number_::text, '-', "user") as id,
            '' as signature,
            'deposit' as type,
            "user" as user_address,
            kamino_vault as vault_address,
            amount,
            shares_received as shares,
            _block_timestamp_ as timestamp
          FROM kaminodepositevent
          WHERE ${vaultAddress 
            ? sql`"user" = ${userAddress} AND kamino_vault = ${vaultAddress}`
            : sql`"user" = ${userAddress}`}
          ORDER BY _block_timestamp_ DESC
          LIMIT 50
        `);

        // Get withdrawals from kaminowithdrawevent table
        const withdrawalsResult = await db.execute(sql`
          SELECT 
            CONCAT('withdraw-', _block_number_::text, '-', "user") as id,
            '' as signature,
            'withdraw' as type,
            "user" as user_address,
            kamino_vault as vault_address,
            amount_received as amount,
            shares_burned as shares,
            _block_timestamp_ as timestamp
          FROM kaminowithdrawevent
          WHERE ${vaultAddress 
            ? sql`"user" = ${userAddress} AND kamino_vault = ${vaultAddress}`
            : sql`"user" = ${userAddress}`}
          ORDER BY _block_timestamp_ DESC
          LIMIT 50
        `);

        const deposits = Array.from(depositsResult) as any[];
        const withdrawals = Array.from(withdrawalsResult) as any[];

        // Combine and sort by timestamp
        const transactions = [...deposits, ...withdrawals]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50)
          .map((tx) => ({
            id: tx.id,
            signature: tx.signature,
            // 返回 ISO 时间戳，让前端根据用户本地时区格式化
            date: new Date(tx.timestamp).toISOString(),
            type: tx.type,
            asset: 'PYUSD', // TODO: Get from vault state or token mint
            amount: (Number(tx.amount) / 1e6).toFixed(2), // Assuming 6 decimals
            amountUsd: Number(tx.amount) / 1e6, // PYUSD = $1
            vaultAddress: tx.vaultAddress,
            status: 'completed',
            txHash: tx.signature,
            timestamp: tx.timestamp,
          }));

        return {
          transactions,
          total: transactions.length,
          page: 1,
          limit: 50,
        };
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Vault transactions API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch vault transactions',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /vault/calendar - 获取用户的月度收益日历
 * 基于每日的交易和持仓变化计算收益
 */
marsVaultRoutes.post('/calendar',
  zValidator('json', calendarSchema),
  async (c) => {
    const { userAddress, vaultAddress, year, month } = c.req.valid('json');

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        // Calculate date range for the month (convert to ISO format for PostgreSQL)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        // Get all deposits and withdrawals for the month from kamino tables
        const depositsResult = await db.execute(sql`
          SELECT 
            "user",
            kamino_vault,
            amount,
            shares_received,
            _block_timestamp_ as timestamp
          FROM kaminodepositevent
          WHERE "user" = ${userAddress}
            ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
            AND _block_timestamp_ >= ${startDateStr}::timestamp
            AND _block_timestamp_ <= ${endDateStr}::timestamp
        `);

        const withdrawalsResult = await db.execute(sql`
          SELECT 
            "user",
            kamino_vault,
            amount_received,
            shares_burned,
            _block_timestamp_ as timestamp
          FROM kaminowithdrawevent
          WHERE "user" = ${userAddress}
            ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
            AND _block_timestamp_ >= ${startDateStr}::timestamp
            AND _block_timestamp_ <= ${endDateStr}::timestamp
        `);

        const deposits = Array.from(depositsResult) as any[];
        const withdrawals = Array.from(withdrawalsResult) as any[];

        // Calculate user position from transaction history
        // TODO: Use mars_user_positions table when it's populated
        const positions: any[] = [];

        // Calculate daily earnings
        // For now, we'll use a simple approximation based on APY
        // TODO: Get actual tokensPerShare history for accurate calculation
        const dailyBreakdown: Array<{ date: string; earnings: number; apy: number }> = [];
        const activeDaysSet = new Set<string>();
        
        // Mark days with activity
        [...deposits, ...withdrawals].forEach((tx) => {
          const date = new Date(tx.timestamp).toISOString().split('T')[0];
          if (date) {
            activeDaysSet.add(date);
          }
        });

        // Calculate earnings for active days
        // Simplified: assume 10% APY and calculate daily interest
        const dailyApyRate = 0.1041 / 365; // 10.41% annual APY
        
        activeDaysSet.forEach((dateStr) => {
          // Get the total shares on this day
          let totalShares = 0;
          positions.forEach((pos) => {
            totalShares += Number(pos.totalShares);
          });

          // Estimate daily earnings based on shares
          // earnings = shares × tokensPerShare × dailyApyRate
          // Simplified: assume 1:1 shares to tokens ratio
          const dailyEarnings = (totalShares / 1e6) * dailyApyRate; // Convert from lamports

          if (dailyEarnings > 0) {
            dailyBreakdown.push({
              date: dateStr,
              earnings: dailyEarnings,
              apy: 10.41,
            });
          }
        });

        const totalEarnings = dailyBreakdown.reduce((sum, day) => sum + day.earnings, 0);
        const activeDays = activeDaysSet.size;

        return {
          year,
          month,
          monthKey: `${year}-${month.toString().padStart(2, '0')}`,
          totalEarnings,
          activeDays,
          dailyBreakdown,
        };
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Vault calendar API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch vault calendar',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /vault/earnings - 获取用户的总收益统计
 */
marsVaultRoutes.post('/earnings',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress, vaultAddress } = c.req.valid('json');

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        // Get user total deposits and withdrawals to calculate earnings
        const depositsResult = await db.execute(sql`
          SELECT 
            SUM(amount::numeric) as total_deposited,
            SUM(shares_received::numeric) as total_shares_received
          FROM kaminodepositevent
          WHERE "user" = ${userAddress}
            ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
        `);

        const withdrawalsResult = await db.execute(sql`
          SELECT 
            SUM(amount_received::numeric) as total_withdrawn,
            SUM(shares_burned::numeric) as total_shares_burned
          FROM kaminowithdrawevent
          WHERE "user" = ${userAddress}
            ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
        `);

        const depositData = Array.from(depositsResult)[0] as any;
        const withdrawalData = Array.from(withdrawalsResult)[0] as any;

        const positions = depositData?.total_deposited ? [depositData] : [];

        // Calculate total earnings from all positions
        let totalEarningsUsd = 0;
        let totalShares = 0;
        
        positions.forEach((pos) => {
          const realizedPnl = Number(pos.realizedPnl) / 1e6;
          totalEarningsUsd += realizedPnl;
          totalShares += Number(pos.totalShares);
        });

        // Estimate daily earnings based on APY
        const dailyApyRate = 0.1041 / 365;
        const dailyEarnings = (totalShares / 1e6) * dailyApyRate;

        // Estimate monthly earnings
        const monthlyEarnings = dailyEarnings * 30;

        return {
          totalEarningsUsd,
          dailyEarnings,
          monthlyEarnings,
          activeDays: positions.length > 0 ? 1 : 0, // Simplified
          byAsset: {
            PYUSD: {
              totalEarnings: totalEarningsUsd,
              dailyEarnings,
              apy: 10.41,
            },
          },
        };
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Vault earnings API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch vault earnings',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * GET /vault/position - 获取用户的持仓信息
 */
marsVaultRoutes.post('/position',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress, vaultAddress } = c.req.valid('json');

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        // Calculate position from transaction history
        const positionResult = await db.execute(sql`
          SELECT 
            kamino_vault as vault_address,
            SUM(CASE WHEN type = 'deposit' THEN amount::numeric ELSE 0 END) as total_deposited,
            SUM(CASE WHEN type = 'deposit' THEN shares::numeric ELSE 0 END) as total_shares_received,
            SUM(CASE WHEN type = 'withdraw' THEN amount::numeric ELSE 0 END) as total_withdrawn,
            SUM(CASE WHEN type = 'withdraw' THEN shares::numeric ELSE 0 END) as total_shares_burned,
            MIN(CASE WHEN type = 'deposit' THEN timestamp ELSE NULL END) as first_deposit_time,
            MAX(timestamp) as last_activity_time
          FROM (
            SELECT 
              kamino_vault,
              amount,
              shares_received as shares,
              _block_timestamp_ as timestamp,
              'deposit' as type
            FROM kaminodepositevent
            WHERE "user" = ${userAddress}
              ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
            UNION ALL
            SELECT 
              kamino_vault,
              amount_received as amount,
              shares_burned as shares,
              _block_timestamp_ as timestamp,
              'withdraw' as type
            FROM kaminowithdrawevent
            WHERE "user" = ${userAddress}
              ${vaultAddress ? sql`AND kamino_vault = ${vaultAddress}` : sql``}
          ) combined
          GROUP BY kamino_vault
        `);

        const positions = Array.from(positionResult) as any[];

        return positions.map((pos) => {
          const totalShares = (Number(pos.total_shares_received || 0) - Number(pos.total_shares_burned || 0));
          const totalDeposited = Number(pos.total_deposited || 0);
          const totalWithdrawn = Number(pos.total_withdrawn || 0);
          const realizedPnl = totalWithdrawn - totalDeposited;
          
          return {
            vaultAddress: pos.vault_address,
            totalShares: totalShares.toString(),
            totalDeposited: totalDeposited.toString(),
            totalWithdrawn: totalWithdrawn.toString(),
            realizedPnl: realizedPnl.toString(),
            firstDepositTime: pos.first_deposit_time,
            lastActivityTime: pos.last_activity_time,
            // Calculate current value (simplified)
            currentValue: (totalShares / 1e6).toFixed(2),
          };
        });
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Vault position API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch vault position',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /vault/earning-details - 获取用户的收益明细历史
 * 从 farmrewardsclaimedevent 表读取真实的claim记录
 */
marsVaultRoutes.post('/earning-details',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress, vaultAddress } = c.req.valid('json');

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        // Query farmrewardsclaimedevent table
        const earningDetailsResult = await db.execute(sql`
          SELECT 
            CONCAT('reward-', _block_number_::text, '-', "user") as id,
            "user" as user_address,
            vault_mint,
            farm_state,
            reward_mint,
            reward_amount,
            total_rewards_claimed,
            timestamp as claimed_at,
            _block_timestamp_ as block_timestamp,
            _block_number_ as block_number
          FROM farmrewardsclaimedevent
          WHERE ${vaultAddress 
            ? sql`"user" = ${userAddress} AND vault_mint = ${vaultAddress}`
            : sql`"user" = ${userAddress}`}
          ORDER BY _block_timestamp_ DESC
          LIMIT 100
        `);

        const earningDetails = Array.from(earningDetailsResult) as any[];

        // Format earning details for frontend
        const formattedDetails = earningDetails.map((detail) => ({
          id: detail.id,
          // 返回 ISO 时间戳，让前端根据用户本地时区格式化
          date: new Date(detail.block_timestamp).toISOString(),
          type: 'claim' as const,
          rewardMint: detail.reward_mint,
          rewardAmount: (Number(detail.reward_amount) / 1e6).toFixed(6), // Assuming 6 decimals
          rewardAmountRaw: detail.reward_amount,
          totalRewardsClaimed: (Number(detail.total_rewards_claimed) / 1e6).toFixed(6),
          vaultMint: detail.vault_mint,
          farmState: detail.farm_state,
          claimedAt: detail.claimed_at,
          blockNumber: detail.block_number,
          timestamp: detail.block_timestamp,
        }));

        return {
          earningDetails: formattedDetails,
          total: formattedDetails.length,
          page: 1,
          limit: 100,
        };
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Earning details API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch earning details',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * POST /historical - 获取 Vault 的历史 APY 和 TVL 数据
 * 用于显示图表趋势
 */
marsVaultRoutes.post('/historical',
  zValidator('json', z.object({
    vaultAddress: z.string().optional(),
    days: z.number().int().min(1).max(365).optional().default(30),
  })),
  async (c) => {
    const { vaultAddress, days } = c.req.valid('json');
    const vault = vaultAddress || 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK';

    try {
      const result = await withDrizzle(c.env as HyperdriveEnv, async (db) => {
        const histResult = await db.execute(sql`
          SELECT 
            id,
            vault_address,
            recorded_at,
            lending_apy,
            incentives_apy,
            total_apy,
            total_supplied,
            total_supplied_usd,
            token_symbol,
            slot_number,
            metadata
          FROM vault_historical_data
          WHERE vault_address = ${vault}
            AND recorded_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
          ORDER BY recorded_at ASC
          LIMIT 1000
        `);

        const historicalData = Array.from(histResult).map((row: any) => ({
          date: new Date(row.recorded_at).toISOString().split('T')[0],
          recordedAt: row.recorded_at,
          lendingApy: parseFloat(row.lending_apy),
          incentivesApy: parseFloat(row.incentives_apy),
          totalApy: parseFloat(row.total_apy),
          totalSupplied: parseFloat(row.total_supplied),
          totalSuppliedUsd: parseFloat(row.total_supplied_usd),
          tokenSymbol: row.token_symbol,
        }));

        return {
          vaultAddress: vault,
          days,
          dataPoints: historicalData.length,
          historical: historicalData,
        };
      });

      return c.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Historical data API error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to fetch historical data',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

export { marsVaultRoutes };
