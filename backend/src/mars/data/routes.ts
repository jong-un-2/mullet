/**
 * Mars Protocol Data API Routes
 * 提供TVL、APY、收益等核心数据的API端点
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import type { Env } from '../../index';
import * as schema from '../../database/schema';

const marsDataRoutes = new Hono<{ Bindings: Env }>();

// 验证schemas
const userAddressSchema = z.object({
  userAddress: z.string().min(1),
});

const calendarSchema = z.object({
  userAddress: z.string().min(1),
  year: z.number().int().min(2024).max(2030),
  month: z.number().int().min(1).max(12),
});

// 获取TVL汇总数据
marsDataRoutes.get('/tvl', async (c) => {
  try {
    const db = drizzle(c.env.D1_DATABASE!);
    
    // Mock数据 - 后续替换为实际数据库查询
    const tvlData = {
      totalTvlUsd: 125000000, // $125M
      byAsset: {
        'USDC': 75000000,
        'USDT': 30000000,
        'SOL': 15000000,
        'BONK': 5000000
      },
      protocols: [
        {
          protocol: 'jupiter_lend',
          asset: 'USDC',
          tvlUsd: 45000000,
          apy: 8.5,
          timestamp: Date.now()
        },
        {
          protocol: 'kamino',
          asset: 'USDC',
          tvlUsd: 30000000,
          apy: 7.2,
          timestamp: Date.now()
        }
      ]
    };

    return c.json({
      success: true,
      data: tvlData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TVL API error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch TVL data'
    }, 500);
  }
});

// 获取APY数据
marsDataRoutes.get('/apy', async (c) => {
  const asset = c.req.query('asset'); // 可选的资产过滤

  try {
    const db = drizzle(c.env.D1_DATABASE!);
    
    // Mock数据
    const apyData = {
      bestApy: 12.5,
      averageApy: 8.7,
      protocols: [
        {
          protocol: 'jupiter_lend',
          asset: 'USDC',
          rawApy: 9.0,
          platformFee: 0.5,
          netApy: 8.5,
          timestamp: Date.now()
        },
        {
          protocol: 'kamino',
          asset: 'USDC',
          rawApy: 7.5,
          platformFee: 0.3,
          netApy: 7.2,
          timestamp: Date.now()
        }
      ].filter(p => !asset || p.asset === asset)
    };

    return c.json({
      success: true,
      data: apyData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('APY API error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch APY data'
    }, 500);
  }
});

// 获取用户收益汇总
marsDataRoutes.post('/user/earnings',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress } = c.req.valid('json');

    try {
      const db = drizzle(c.env.D1_DATABASE!);
      
      // Mock数据 - 基于用户地址
      const earningsData = {
        totalEarningsUsd: 1.32,
        dailyEarnings: 0.42,
        monthlyEarnings: 12.65,
        activeDays: 3,
        byAsset: {
          'USDC': {
            totalEarnings: 1.32,
            dailyEarnings: 0.42,
            apy: 8.5
          }
        }
      };

      return c.json({
        success: true,
        data: earningsData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('User earnings API error:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch user earnings'
      }, 500);
    }
  }
);

// 获取日历收益数据
marsDataRoutes.post('/user/calendar',
  zValidator('json', calendarSchema),
  async (c) => {
    const { userAddress, year, month } = c.req.valid('json');

    try {
      const db = drizzle(c.env.D1_DATABASE!);
      
      // Mock数据 - 生成当月收益日历
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const dailyBreakdown = [];
      let totalEarnings = 0;
      let activeDays = 0;

      // 只有27、28、29号有收益（示例数据）
      for (let day = 1; day <= daysInMonth; day++) {
        const hasEarning = [27, 28, 29].includes(day) && month === 9 && year === 2025;
        const earnings = hasEarning ? 
          (day === 27 ? 0.52 : day === 28 ? 0.38 : 0.42) : 0;
        
        if (hasEarning) {
          const date = `${monthKey}-${day.toString().padStart(2, '0')}`;
          dailyBreakdown.push({
            date,
            earnings,
            apy: 8.5
          });
          totalEarnings += earnings;
          activeDays++;
        }
      }

      const calendarData = {
        year,
        month,
        monthKey,
        totalEarnings,
        activeDays,
        dailyBreakdown
      };

      return c.json({
        success: true,
        data: calendarData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Calendar API error:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch calendar data'
      }, 500);
    }
  }
);

// 获取性能图表数据
marsDataRoutes.get('/performance', async (c) => {
  const protocol = c.req.query('protocol');
  const asset = c.req.query('asset') || 'USDC';
  const days = parseInt(c.req.query('days') || '30');

  try {
    const db = drizzle(c.env.D1_DATABASE!);
    
    // Mock图表数据
    const chartData = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // 生成模拟的APY和TVL数据
      const baseApy = 8.5;
      const baseTvl = 45000000;
      const variance = Math.sin(i * 0.1) * 0.5;
      
      chartData.push({
        date: dateStr,
        apy: baseApy + variance,
        tvl: baseTvl + (variance * 1000000)
      });
    }

    return c.json({
      success: true,
      data: chartData,
      meta: {
        protocol,
        asset,
        days,
        dataPoints: chartData.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Performance API error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch performance data'
    }, 500);
  }
});

// 获取交易历史
marsDataRoutes.post('/user/transactions',
  zValidator('json', userAddressSchema),
  async (c) => {
    const { userAddress } = c.req.valid('json');
    
    try {
      const db = drizzle(c.env.D1_DATABASE!);
      
      // Mock交易历史数据
      const transactions = [
        {
          id: '1',
          date: 'Sep 23, 10:56',
          type: 'deposit',
          asset: 'USDC',
          amount: '20120',
          amountUsd: 20120,
          protocol: 'jupiter_lend',
          status: 'completed',
          txHash: '0x123...',
          apy: 8.5
        },
        {
          id: '2', 
          date: 'Sep 22, 14:32',
          type: 'withdraw',
          asset: 'USDC',
          amount: '15500',
          amountUsd: 15500,
          protocol: 'jupiter_lend',
          status: 'completed',
          txHash: '0x456...',
          apy: 8.2
        }
      ];

      return c.json({
        success: true,
        data: {
          transactions,
          total: transactions.length,
          page: 1,
          limit: 50
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Transactions API error:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch transaction history'
      }, 500);
    }
  }
);

export { marsDataRoutes };