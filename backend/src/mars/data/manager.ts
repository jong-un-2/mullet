/**
 * Mars Protocol Data Manager
 * 管理TVL、APY、收益等核心数据
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import { 
  marsTvlData, 
  marsApyData, 
  marsUserDailyEarnings, 
  marsUserMonthlySummary 
} from '../../database/schema';

export interface TvlSummary {
  totalTvlUsd: number;
  byAsset: Record<string, number>;
  protocols: Array<{
    protocol: string;
    asset: string;
    tvlUsd: number;
    timestamp: number;
  }>;
}

export interface ApySummary {
  bestApy: number;
  averageApy: number;
  protocols: Array<{
    protocol: string;
    asset: string;
    netApy: number;
    timestamp: number;
  }>;
}

export interface UserEarningsSummary {
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

export interface MonthlyCalendarData {
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

export class MarsProtocolDataManager {
  constructor(private db: DrizzleD1Database) {}

  // TVL 汇总数据
  async getTvlSummary(): Promise<TvlSummary> {
    // 获取最新的TVL数据
    const latestTvlData = await this.db
      .select()
      .from(marsTvlData)
      .orderBy(desc(marsTvlData.timestamp))
      .limit(20);

    const byAsset: Record<string, number> = {};
    let totalTvlUsd = 0;

    // 按资产汇总TVL
    latestTvlData.forEach(row => {
      if (!byAsset[row.asset]) {
        byAsset[row.asset] = 0;
      }
      byAsset[row.asset]! += row.tvlUsd;
      totalTvlUsd += row.tvlUsd;
    });

    const protocols = latestTvlData.map(row => ({
      protocol: row.protocol,
      asset: row.asset,
      tvlUsd: row.tvlUsd,
      timestamp: row.timestamp instanceof Date ? row.timestamp.getTime() : row.timestamp,
    }));

    return {
      totalTvlUsd,
      byAsset,
      protocols
    };
  }

  // APY 汇总数据
  async getApySummary(asset?: string): Promise<ApySummary> {
    const conditions = [];
    if (asset) conditions.push(eq(marsApyData.asset, asset));

    const latestApyData = await this.db
      .select()
      .from(marsApyData)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marsApyData.timestamp))
      .limit(10);

    let bestApy = 0;
    let totalApy = 0;
    const protocols = latestApyData.map(row => {
      if (row.netApy > bestApy) bestApy = row.netApy;
      totalApy += row.netApy;
      
      return {
        protocol: row.protocol,
        asset: row.asset,
        netApy: row.netApy,
        timestamp: row.timestamp instanceof Date ? row.timestamp.getTime() : row.timestamp,
      };
    });

    const averageApy = latestApyData.length > 0 ? totalApy / latestApyData.length : 0;

    return {
      bestApy,
      averageApy,
      protocols
    };
  }

  // 用户收益汇总
  async getUserEarningsSummary(userAddress: string): Promise<UserEarningsSummary> {
    // 获取用户最新收益数据
    const earningsData = await this.db
      .select()
      .from(marsUserDailyEarnings)
      .where(eq(marsUserDailyEarnings.userAddress, userAddress))
      .orderBy(desc(marsUserDailyEarnings.date))
      .limit(30);

    if (earningsData.length === 0) {
      return {
        totalEarningsUsd: 0,
        dailyEarnings: 0,
        monthlyEarnings: 0,
        activeDays: 0,
        byAsset: {}
      };
    }

    // 计算总收益（取最新的累计收益）
    const latestEarning = earningsData[0];
    const totalEarningsUsd = latestEarning.cumulativeEarningsUsd;
    const dailyEarnings = latestEarning.dailyEarningsUsd;

    // 计算月收益（最近30天）
    const monthlyEarnings = earningsData.reduce((sum, row) => sum + row.dailyEarningsUsd, 0);
    const activeDays = earningsData.length;

    // 按资产分组
    const byAsset: Record<string, { totalEarnings: number; dailyEarnings: number; apy: number }> = {};
    
    earningsData.forEach(row => {
      if (!byAsset[row.asset]) {
        byAsset[row.asset] = {
          totalEarnings: 0,
          dailyEarnings: 0,
          apy: 0
        };
      }
      
      if (row.cumulativeEarningsUsd > byAsset[row.asset].totalEarnings) {
        byAsset[row.asset].totalEarnings = row.cumulativeEarningsUsd;
      }
      
      byAsset[row.asset].dailyEarnings += row.dailyEarningsUsd;
      byAsset[row.asset].apy = row.apy; // 使用最新的APY
    });

    return {
      totalEarningsUsd,
      dailyEarnings,
      monthlyEarnings,
      activeDays,
      byAsset
    };
  }

  // 获取日历收益数据
  async getUserMonthlyCalendarData(
    userAddress: string,
    year: number,
    month: number
  ): Promise<MonthlyCalendarData | null> {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    const startDate = `${monthKey}-01`;
    const endDate = `${monthKey}-31`;

    // 获取该月的日收益数据
    const dailyEarnings = await this.db
      .select()
      .from(marsUserDailyEarnings)
      .where(
        and(
          eq(marsUserDailyEarnings.userAddress, userAddress),
          gte(marsUserDailyEarnings.date, startDate),
          lte(marsUserDailyEarnings.date, endDate)
        )
      )
      .orderBy(marsUserDailyEarnings.date);

    if (dailyEarnings.length === 0) {
      return null;
    }

    const totalEarnings = dailyEarnings.reduce((sum, row) => sum + row.dailyEarningsUsd, 0);
    const activeDays = dailyEarnings.length;

    const dailyBreakdown = dailyEarnings.map(row => ({
      date: row.date,
      earnings: row.dailyEarningsUsd,
      apy: row.apy,
    }));

    return {
      year,
      month,
      monthKey,
      totalEarnings,
      activeDays,
      dailyBreakdown
    };
  }

  // 获取性能图表数据
  async getPerformanceChartData(
    protocol?: string,
    asset?: string,
    days: number = 30
  ): Promise<Array<{ date: string; apy: number; tvl: number }>> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 获取APY数据
    const apyConditions = [gte(marsApyData.timestamp, new Date(startDate))];
    if (protocol) apyConditions.push(eq(marsApyData.protocol, protocol));
    if (asset) apyConditions.push(eq(marsApyData.asset, asset));

    const apyData = await this.db
      .select()
      .from(marsApyData)
      .where(and(...apyConditions))
      .orderBy(marsApyData.timestamp);

    // 获取TVL数据
    const tvlConditions = [gte(marsTvlData.timestamp, new Date(startDate))];
    if (protocol) tvlConditions.push(eq(marsTvlData.protocol, protocol));
    if (asset) tvlConditions.push(eq(marsTvlData.asset, asset));

    const tvlData = await this.db
      .select()
      .from(marsTvlData)
      .where(and(...tvlConditions))
      .orderBy(marsTvlData.timestamp);

    // 合并数据按日期
    const chartData: Record<string, { date: string; apy: number; tvl: number }> = {};

    apyData.forEach(row => {
      const date = row.timestamp instanceof Date 
        ? row.timestamp.toISOString().split('T')[0]
        : new Date(row.timestamp).toISOString().split('T')[0];
      
      if (!chartData[date]) {
        chartData[date] = { date, apy: 0, tvl: 0 };
      }
      chartData[date].apy = row.netApy;
    });

    tvlData.forEach(row => {
      const date = row.timestamp instanceof Date 
        ? row.timestamp.toISOString().split('T')[0]
        : new Date(row.timestamp).toISOString().split('T')[0];
      
      if (!chartData[date]) {
        chartData[date] = { date, apy: 0, tvl: 0 };
      }
      chartData[date].tvl = row.tvlUsd;
    });

    return Object.values(chartData).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export function createMarsProtocolDataManager(db: DrizzleD1Database): MarsProtocolDataManager {
  return new MarsProtocolDataManager(db);
}