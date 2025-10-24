/**
 * Kamino Liquidity Transaction Manager
 * 处理流动性池的存取款交易记录和 PnL 计算
 */

import { eq, and, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../database/schema';
import { Decimal } from 'decimal.js';

export interface LiquidityTransactionRequest {
  userAddress: string;
  strategyAddress: string;
  type: 'deposit' | 'withdraw';
  tokenA: {
    mint: string;
    symbol: string;
    amount: string;
    amountUsd: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    amount: string;
    amountUsd: number;
  };
  shares: string;
  txHash: string;
  timestamp: number;
  apy?: number;
  poolName?: string;
}

export interface LiquidityTransactionResponse {
  success: boolean;
  transactionId: string;
  message?: string;
  summary?: {
    costBasis: number;
    totalDepositsUsd: number;
    totalWithdrawalsUsd: number;
    currentShares: string;
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
  };
}

/**
 * 创建 Kamino 流动性交易管理器
 */
export function createKaminoLiquidityManager(db: D1Database) {
  const drizzleDb = drizzle(db, { schema }) as DrizzleD1Database<typeof schema>;

  /**
   * 记录流动性交易
   */
  async function recordTransaction(
    request: LiquidityTransactionRequest
  ): Promise<LiquidityTransactionResponse> {
    try {
      console.log('[KaminoLiquidity] Recording transaction:', {
        user: request.userAddress,
        strategy: request.strategyAddress,
        type: request.type,
        txHash: request.txHash,
      });

      // 1. 插入交易记录
      const transactionId = await insertTransaction(request);

      // 2. 更新用户仓位汇总
      const summary = await updatePositionSummary(request);

      console.log('[KaminoLiquidity] Transaction recorded successfully:', {
        transactionId,
        costBasis: summary.costBasis,
        totalPnL: summary.totalPnL,
      });

      return {
        success: true,
        transactionId,
        message: 'Transaction recorded successfully',
        summary: {
          costBasis: summary.costBasis,
          totalDepositsUsd: summary.totalDepositsUsd,
          totalWithdrawalsUsd: summary.totalWithdrawalsUsd,
          currentShares: summary.currentShares,
          realizedPnL: summary.realizedPnL || 0,
          unrealizedPnL: summary.unrealizedPnL || 0,
          totalPnL: summary.totalPnL || 0,
        },
      };
    } catch (error: any) {
      console.error('[KaminoLiquidity] Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  }

  /**
   * 插入交易记录
   */
  async function insertTransaction(request: LiquidityTransactionRequest): Promise<string> {
    const totalAmountUsd = request.tokenA.amountUsd + request.tokenB.amountUsd;

    const [result] = await drizzleDb
      .insert(schema.kaminoLiquidityTransactions)
      .values({
        userAddress: request.userAddress,
        strategyAddress: request.strategyAddress,
        poolName: request.poolName || null,
        transactionType: request.type,
        tokenAMint: request.tokenA.mint,
        tokenASymbol: request.tokenA.symbol,
        tokenAAmount: request.tokenA.amount,
        tokenAAmountUsd: request.tokenA.amountUsd,
        tokenBMint: request.tokenB.mint,
        tokenBSymbol: request.tokenB.symbol,
        tokenBAmount: request.tokenB.amount,
        tokenBAmountUsd: request.tokenB.amountUsd,
        shares: request.shares,
        txHash: request.txHash,
        status: 'confirmed',
        apy: request.apy || null,
        timestamp: new Date(request.timestamp),
      })
      .returning({ id: schema.kaminoLiquidityTransactions.id });

    if (!result) {
      throw new Error('Failed to insert transaction');
    }

    return result.id;
  }

  /**
   * 更新用户仓位汇总
   * 计算成本基础和 PnL
   */
  async function updatePositionSummary(
    request: LiquidityTransactionRequest
  ): Promise<schema.KaminoUserPositionSummary> {
    const { userAddress, strategyAddress, type, tokenA, tokenB, shares, timestamp } = request;

    // 获取现有汇总
    const [existingSummary] = await drizzleDb
      .select()
      .from(schema.kaminoUserPositionSummary)
      .where(
        and(
          eq(schema.kaminoUserPositionSummary.userAddress, userAddress),
          eq(schema.kaminoUserPositionSummary.strategyAddress, strategyAddress)
        )
      )
      .limit(1);

    const totalAmountUsd = tokenA.amountUsd + tokenB.amountUsd;
    const sharesDecimal = new Decimal(shares);

    if (!existingSummary) {
      // 创建新的汇总记录（首次存款）
      if (type !== 'deposit') {
        throw new Error('First transaction must be a deposit');
      }

      const [newSummary] = await drizzleDb
        .insert(schema.kaminoUserPositionSummary)
        .values({
          userAddress,
          strategyAddress,
          poolName: request.poolName || null,
          totalDepositsUsd: totalAmountUsd,
          totalWithdrawalsUsd: 0,
          costBasis: totalAmountUsd,
          totalTokenADeposited: tokenA.amount,
          totalTokenBDeposited: tokenB.amount,
          totalTokenAWithdrawn: '0',
          totalTokenBWithdrawn: '0',
          totalSharesReceived: shares,
          totalSharesBurned: '0',
          currentShares: shares,
          currentValueUsd: totalAmountUsd,
          realizedPnL: 0,
          unrealizedPnL: 0,
          totalPnL: 0,
          transactionCount: 1,
          depositCount: 1,
          withdrawCount: 0,
          firstDepositAt: timestamp,
          lastTransactionAt: timestamp,
        })
        .returning();

      return newSummary;
    }

    // 更新现有汇总
    const currentShares = new Decimal(existingSummary.currentShares);
    const totalDepositsUsd = existingSummary.totalDepositsUsd;
    const totalWithdrawalsUsd = existingSummary.totalWithdrawalsUsd;
    const totalSharesReceived = new Decimal(existingSummary.totalSharesReceived);
    const totalSharesBurned = new Decimal(existingSummary.totalSharesBurned);

    let newTotalDepositsUsd = totalDepositsUsd;
    let newTotalWithdrawalsUsd = totalWithdrawalsUsd;
    let newCurrentShares = currentShares;
    let newTotalSharesReceived = totalSharesReceived;
    let newTotalSharesBurned = totalSharesBurned;
    let newDepositCount = existingSummary.depositCount;
    let newWithdrawCount = existingSummary.withdrawCount;

    let newTotalTokenADeposited = existingSummary.totalTokenADeposited;
    let newTotalTokenBDeposited = existingSummary.totalTokenBDeposited;
    let newTotalTokenAWithdrawn = existingSummary.totalTokenAWithdrawn;
    let newTotalTokenBWithdrawn = existingSummary.totalTokenBWithdrawn;

    if (type === 'deposit') {
      // 存款：增加成本基础
      newTotalDepositsUsd += totalAmountUsd;
      newCurrentShares = currentShares.add(sharesDecimal);
      newTotalSharesReceived = totalSharesReceived.add(sharesDecimal);
      newDepositCount++;

      newTotalTokenADeposited = new Decimal(newTotalTokenADeposited)
        .add(new Decimal(tokenA.amount))
        .toString();
      newTotalTokenBDeposited = new Decimal(newTotalTokenBDeposited)
        .add(new Decimal(tokenB.amount))
        .toString();
    } else {
      // 取款：减少成本基础，计算已实现 PnL
      newTotalWithdrawalsUsd += totalAmountUsd;
      newCurrentShares = currentShares.sub(sharesDecimal);
      newTotalSharesBurned = totalSharesBurned.add(sharesDecimal);
      newWithdrawCount++;

      newTotalTokenAWithdrawn = new Decimal(newTotalTokenAWithdrawn)
        .add(new Decimal(tokenA.amount))
        .toString();
      newTotalTokenBWithdrawn = new Decimal(newTotalTokenBWithdrawn)
        .add(new Decimal(tokenB.amount))
        .toString();
    }

    // 计算成本基础 = 总存款 - 总取款
    const newCostBasis = newTotalDepositsUsd - newTotalWithdrawalsUsd;

    // 计算已实现 PnL = 总取款 - (总存款 * (总取款 / (总存款)))
    // 简化：已实现 PnL = 总取款 - (成本基础中已取出的部分)
    let realizedPnL = 0;
    if (newTotalDepositsUsd > 0 && newTotalWithdrawalsUsd > 0) {
      const withdrawnPortion = newTotalWithdrawalsUsd / (newTotalDepositsUsd + newTotalWithdrawalsUsd);
      const costOfWithdrawals = newTotalDepositsUsd * withdrawnPortion;
      realizedPnL = newTotalWithdrawalsUsd - costOfWithdrawals;
    }

    // 未实现 PnL = 当前价值 - 剩余成本基础
    // 注意：这里我们使用当前价值，需要从外部传入或查询
    // 暂时使用存款时的价值作为占位符
    const currentValueUsd = existingSummary.currentValueUsd || newCostBasis;
    const unrealizedPnL = currentValueUsd - newCostBasis;

    // 总 PnL = 已实现 + 未实现
    const totalPnL = realizedPnL + unrealizedPnL;

    // 更新汇总记录
    const [updatedSummary] = await drizzleDb
      .update(schema.kaminoUserPositionSummary)
      .set({
        totalDepositsUsd: newTotalDepositsUsd,
        totalWithdrawalsUsd: newTotalWithdrawalsUsd,
        costBasis: newCostBasis,
        totalTokenADeposited: newTotalTokenADeposited,
        totalTokenBDeposited: newTotalTokenBDeposited,
        totalTokenAWithdrawn: newTotalTokenAWithdrawn,
        totalTokenBWithdrawn: newTotalTokenBWithdrawn,
        totalSharesReceived: newTotalSharesReceived.toString(),
        totalSharesBurned: newTotalSharesBurned.toString(),
        currentShares: newCurrentShares.toString(),
        realizedPnL,
        unrealizedPnL,
        totalPnL,
        transactionCount: existingSummary.transactionCount + 1,
        depositCount: newDepositCount,
        withdrawCount: newWithdrawCount,
        lastTransactionAt: timestamp,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(schema.kaminoUserPositionSummary.userAddress, userAddress),
          eq(schema.kaminoUserPositionSummary.strategyAddress, strategyAddress)
        )
      )
      .returning();

    return updatedSummary;
  }

  /**
   * 获取用户在特定策略的交易历史
   */
  async function getTransactionHistory(
    userAddress: string,
    strategyAddress?: string,
    limit = 50
  ): Promise<schema.KaminoLiquidityTransaction[]> {
    const conditions = [eq(schema.kaminoLiquidityTransactions.userAddress, userAddress)];

    if (strategyAddress) {
      conditions.push(eq(schema.kaminoLiquidityTransactions.strategyAddress, strategyAddress));
    }

    const transactions = await drizzleDb
      .select()
      .from(schema.kaminoLiquidityTransactions)
      .where(and(...conditions))
      .orderBy(desc(schema.kaminoLiquidityTransactions.timestamp))
      .limit(limit);

    return transactions;
  }

  /**
   * 获取用户仓位汇总
   */
  async function getPositionSummary(
    userAddress: string,
    strategyAddress?: string
  ): Promise<schema.KaminoUserPositionSummary[]> {
    const conditions = [eq(schema.kaminoUserPositionSummary.userAddress, userAddress)];

    if (strategyAddress) {
      conditions.push(eq(schema.kaminoUserPositionSummary.strategyAddress, strategyAddress));
    }

    const summaries = await drizzleDb
      .select()
      .from(schema.kaminoUserPositionSummary)
      .where(and(...conditions));

    return summaries;
  }

  /**
   * 更新仓位的当前价值（用于计算未实现 PnL）
   */
  async function updateCurrentValue(
    userAddress: string,
    strategyAddress: string,
    currentValueUsd: number
  ): Promise<void> {
    const [summary] = await drizzleDb
      .select()
      .from(schema.kaminoUserPositionSummary)
      .where(
        and(
          eq(schema.kaminoUserPositionSummary.userAddress, userAddress),
          eq(schema.kaminoUserPositionSummary.strategyAddress, strategyAddress)
        )
      )
      .limit(1);

    if (!summary) {
      throw new Error('Position summary not found');
    }

    // 重新计算未实现 PnL
    const unrealizedPnL = currentValueUsd - summary.costBasis;
    const totalPnL = summary.realizedPnL + unrealizedPnL;

    await drizzleDb
      .update(schema.kaminoUserPositionSummary)
      .set({
        currentValueUsd,
        unrealizedPnL,
        totalPnL,
        updatedAt: Date.now(),
      })
      .where(
        and(
          eq(schema.kaminoUserPositionSummary.userAddress, userAddress),
          eq(schema.kaminoUserPositionSummary.strategyAddress, strategyAddress)
        )
      );
  }

  return {
    recordTransaction,
    getTransactionHistory,
    getPositionSummary,
    updateCurrentValue,
  };
}
