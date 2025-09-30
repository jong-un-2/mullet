/**
 * Mars Transaction Manager
 * 统一处理存款和取款交易的创建和管理
 */

import type {
  MarsTransaction,
  TransactionPreview,
  AllocationStrategy,
  SupportedAsset,
  RiskProfile,
  TransactionType
} from '../types';
import { TransactionError } from '../types';
import { JupiterLendClient } from '../jupiter/client';
import { KaminoSDKClient } from '../kamino/client';
import { MarsDataCache } from '../cache';
import { Transaction, PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { marsTransactions, marsUserBalances } from '../../database/schema';
import { nanoid } from 'nanoid';

// 协议常量
const JUPITER_LEND_PROGRAMS = {
  LIQUIDITY_PROGRAM: 'jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC',
  LENDING_PROGRAM: 'jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9'
};

const KAMINO_PROGRAMS = {
  LEND_PROGRAM: 'GzFgdRJXmawPhGeBsyRCDLx4jAKPsvbUqoqitzppkzkW',
  MULTISIG: '6hhBGCtmg7tPWUSgp3LG6X2rsmYWAc4tNsA6G4CnfQbM',
  LIQUIDITY_PROGRAM: 'E35i5qn7872eEmBt15e5VGhziUBzCTm43XCSWvDoQNNv',
  LIQUIDITY_MULTISIG: 'BccSdKrSsjw4XKKjTPKak2wur1C9dMX3tmXoFwFAU7oh',
  VAULTS_PROGRAM: 'Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE',
  VAULTS_MULTISIG: '8ksXVE6SMSjQ9sPbj2XQ4Uxx6b7aXh9kHeq4nXMD2tDn'
};

export class MarsTransactionManager {
  private db: any;

  constructor(
    private jupiterClient: JupiterLendClient,
    private kaminoClient: KaminoSDKClient,
    private cache: MarsDataCache,
    private env?: any
  ) {
    // 初始化数据库连接
    if (this.env?.D1_DATABASE) {
      this.db = drizzle(this.env.D1_DATABASE);
    }
  }

  /**
   * 记录 Mars 交易到数据库
   */
  private async recordMarsTransaction(params: {
    userAddress: string;
    transactionType: 'deposit' | 'withdraw';
    asset: string;
    amount: number;
    amountUsd?: number;
    protocol: string;
    strategy?: string;
    riskProfile?: 'conservative' | 'moderate' | 'aggressive';
    expectedApy?: number;
    depositFee?: number;
    withdrawFee?: number;
    protocolFee?: number;
    totalFees?: number;
    txHash?: string;
    signature?: string;
    metadata?: any;
  }): Promise<string> {
    if (!this.db) {
      console.warn('Database not available, skipping Mars transaction record');
      return nanoid(); // 返回一个ID以保持兼容性
    }

    try {
      const transactionId = nanoid();
      const now = new Date();

      await this.db.insert(marsTransactions).values({
        id: transactionId,
        userAddress: params.userAddress,
        transactionType: params.transactionType,
        asset: params.asset,
        amount: params.amount.toString(),
        amountUsd: params.amountUsd,
        protocol: params.protocol,
        strategy: params.strategy,
        riskProfile: params.riskProfile,
        expectedApy: params.expectedApy,
        depositFee: params.depositFee,
        withdrawFee: params.withdrawFee,
        protocolFee: params.protocolFee,
        totalFees: params.totalFees,
        txHash: params.txHash,
        signature: params.signature,
        status: 'pending',
        submittedAt: now,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`Mars transaction recorded: ${transactionId} - ${params.transactionType} ${params.amount} ${params.asset}`);
      return transactionId;

    } catch (error) {
      console.error('Failed to record Mars transaction:', error);
      throw error;
    }
  }

  /**
   * 更新用户余额记录
   */
  private async updateUserBalance(params: {
    userAddress: string;
    asset: string;
    protocol: string;
    balanceChange: number; // 正数表示存款，负数表示取款
    currentBalance: number;
    balanceUsd?: number;
    shares?: string;
    currentApy?: number;
  }): Promise<void> {
    if (!this.db) {
      console.warn('Database not available, skipping user balance update');
      return;
    }

    try {
      const now = new Date();

      // 尝试更新现有记录
      const existing = await this.db
        .select()
        .from(marsUserBalances)
        .where(
          and(
            eq(marsUserBalances.userAddress, params.userAddress),
            eq(marsUserBalances.asset, params.asset),
            eq(marsUserBalances.protocol, params.protocol)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新现有记录
        const record = existing[0];
        const newTotalDeposited = params.balanceChange > 0 
          ? (parseFloat(record.totalDeposited) + Math.abs(params.balanceChange)).toString()
          : record.totalDeposited;
        const newTotalWithdrawn = params.balanceChange < 0 
          ? (parseFloat(record.totalWithdrawn) + Math.abs(params.balanceChange)).toString()
          : record.totalWithdrawn;

        await this.db
          .update(marsUserBalances)
          .set({
            balance: params.currentBalance.toString(),
            balanceUsd: params.balanceUsd,
            shares: params.shares,
            totalDeposited: newTotalDeposited,
            totalWithdrawn: newTotalWithdrawn,
            currentApy: params.currentApy,
            lastYieldUpdate: now,
            updatedAt: now,
          })
          .where(eq(marsUserBalances.id, record.id));

      } else {
        // 创建新记录
        await this.db.insert(marsUserBalances).values({
          id: nanoid(),
          userAddress: params.userAddress,
          asset: params.asset,
          protocol: params.protocol,
          balance: params.currentBalance.toString(),
          balanceUsd: params.balanceUsd,
          shares: params.shares,
          totalDeposited: params.balanceChange > 0 ? Math.abs(params.balanceChange).toString() : "0",
          totalWithdrawn: params.balanceChange < 0 ? Math.abs(params.balanceChange).toString() : "0",
          totalYieldEarned: 0,
          totalYieldEarnedUsd: 0,
          currentApy: params.currentApy,
          riskLevel: 'medium',
          lastYieldUpdate: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log(`User balance updated: ${params.userAddress} - ${params.asset} on ${params.protocol}`);

    } catch (error) {
      console.error('Failed to update user balance:', error);
      throw error;
    }
  }

  /**
   * 创建存款交易
   */
  async createDepositTransaction(params: {
    userAddress: string;
    asset: SupportedAsset;
    amount: number;
    riskProfile: RiskProfile;
  }): Promise<{
    transaction: MarsTransaction;
    preview: TransactionPreview;
    allocation: AllocationStrategy;
  }> {
    try {
      // 1. 获取最优分配策略
      const allocation = await this.getOptimalAllocation(
        params.amount,
        params.asset,
        params.riskProfile
      );

      // 2. 预估交易费用和时间
      const preview = await this.estimateTransaction('deposit', params.amount, params.asset);
      preview.allocation = allocation;

      // 3. 确定主要协议 (优先 Jupiter)
      const primaryAllocation = allocation.allocations.find(a => a.protocol === 'jupiter') 
        || allocation.allocations[0];
      
      if (!primaryAllocation) {
        throw new TransactionError('No allocation available for deposit');
      }
      
      // 4. 记录交易到数据库
      const transactionId = await this.recordMarsTransaction({
        userAddress: params.userAddress,
        transactionType: 'deposit',
        asset: params.asset,
        amount: params.amount,
        amountUsd: params.amount * 1, // TODO: 获取实际价格
        protocol: primaryAllocation.protocol,
        strategy: `${params.riskProfile}_allocation`,
        riskProfile: params.riskProfile,
        expectedApy: primaryAllocation.expectedAPY,
        depositFee: 0, // TODO: 从协议获取实际费用
        protocolFee: preview.fees.protocol,
        totalFees: preview.fees.total,
        metadata: {
          allocation,
          estimatedGas: preview.estimatedGas,
          estimatedTime: preview.estimatedTime
        }
      });

      // 5. 创建交易记录
      const transaction: MarsTransaction = {
        id: transactionId,
        type: 'deposit',
        userAddress: params.userAddress,
        asset: params.asset,
        amount: params.amount,
        status: 'pending',
        createdAt: new Date()
      };

      // 6. 根据分配策略构建交易参数
      const transactionParams = await this.buildTransactionParams(allocation, params);
      
      // 7. 更新用户余额预期 (乐观更新)
      await this.updateUserBalance({
        userAddress: params.userAddress,
        asset: params.asset,
        protocol: primaryAllocation.protocol,
        balanceChange: params.amount,
        currentBalance: params.amount, // 新余额 (简化处理)
        currentApy: primaryAllocation.expectedAPY
      });
      
      return {
        transaction: {
          ...transaction,
          serializedTx: transactionParams.serializedTx
        },
        preview,
        allocation
      };

    } catch (error) {
      throw new TransactionError('Failed to create deposit transaction', error);
    }
  }

  /**
   * 创建取款交易
   */
  async createWithdrawTransaction(params: {
    userAddress: string;
    asset: SupportedAsset;
    amount: number;
  }): Promise<{
    transaction: MarsTransaction;
    preview: TransactionPreview;
  }> {
    try {
      // 1. 检查用户仓位
      const positions = await this.getUserPositions(params.userAddress);
      const availableAmount = positions
        .filter(p => p.asset === params.asset)
        .reduce((sum, p) => sum + ('currentValue' in p ? p.currentValue : p.tvl), 0);

      if (params.amount > availableAmount) {
        throw new TransactionError(
          `Insufficient balance: ${availableAmount} available, ${params.amount} requested`
        );
      }

      // 2. 确定主要协议 (从现有仓位)
      const primaryPosition = positions
        .filter(p => p.asset === params.asset)
        .sort((a, b) => ('currentValue' in b ? b.currentValue : b.tvl) - ('currentValue' in a ? a.currentValue : a.tvl))[0];

      // 确定协议 - 优先从 UserPosition 获取，否则默认为 jupiter
      const primaryProtocol = (primaryPosition && 'protocol' in primaryPosition && primaryPosition.protocol) ? primaryPosition.protocol : 'jupiter';

      // 3. 预估取款费用和时间
      const preview = await this.estimateTransaction('withdraw', params.amount, params.asset);

      // 4. 记录取款交易到数据库
      const transactionId = await this.recordMarsTransaction({
        userAddress: params.userAddress,
        transactionType: 'withdraw',
        asset: params.asset,
        amount: params.amount,
        amountUsd: params.amount * 1, // TODO: 获取实际价格
        protocol: primaryProtocol,
        strategy: 'withdraw',
        withdrawFee: preview.fees.protocol, // 使用协议费用作为取款费用
        protocolFee: preview.fees.protocol,
        totalFees: preview.fees.total,
        metadata: {
          availableAmount,
          positions: positions.length,
          estimatedGas: preview.estimatedGas,
          estimatedTime: preview.estimatedTime
        }
      });

      // 5. 创建交易记录
      const transaction: MarsTransaction = {
        id: transactionId,
        type: 'withdraw',
        userAddress: params.userAddress,
        asset: params.asset,
        amount: params.amount,
        status: 'pending',
        createdAt: new Date()
      };

      // 6. 更新用户余额 (减少余额)
      if (primaryPosition) {
        const currentBalance = 'currentValue' in primaryPosition ? primaryPosition.currentValue : primaryPosition.tvl;
        const newBalance = Math.max(0, currentBalance - params.amount);
        
        await this.updateUserBalance({
          userAddress: params.userAddress,
          asset: params.asset,
          protocol: primaryProtocol,
          balanceChange: -params.amount, // 负数表示取款
          currentBalance: newBalance,
          currentApy: 'entryAPY' in primaryPosition ? primaryPosition.entryAPY : 0
        });
      }

      return {
        transaction,
        preview
      };

    } catch (error) {
      throw new TransactionError('Failed to create withdraw transaction', error);
    }
  }

  /**
   * 获取Solana连接
   */
  private getSolanaConnection(): Connection {
    // 从环境变量或默认值获取RPC URL
    const rpcUrl = this.env?.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
    return new Connection(rpcUrl, 'confirmed');
  }

  /**
   * 获取最优分配策略
   */
  private async getOptimalAllocation(
    amount: number,
    asset: SupportedAsset,
    riskProfile: RiskProfile
  ): Promise<AllocationStrategy> {
    const cacheKey = MarsDataCache.compositeKey(
      MarsDataCache.CACHE_KEYS.OPTIMIZATION,
      asset,
      amount.toString(),
      riskProfile
    );

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        // 获取 Jupiter 和 Kamino 的收益数据
        const jupiterData = await this.jupiterClient.getAssetEarnData(asset);
        const kaminoStrategy = await this.kaminoClient.getBestStrategyForAsset(asset);

        if (!jupiterData && !kaminoStrategy) {
          throw new TransactionError(`No earning opportunities available for ${asset}`);
        }

        // 根据风险偏好计算分配比例
        const allocation = this.calculateAllocation(
          amount,
          asset,
          riskProfile,
          jupiterData,
          kaminoStrategy
        );

        return allocation;
      },
      MarsDataCache.TTL.OPTIMIZATION
    );
  }

  /**
   * 计算分配策略 - 根据最优收益选择协议
   */
  private calculateAllocation(
    amount: number,
    asset: SupportedAsset,
    riskProfile: RiskProfile,
    jupiterData: any,
    kaminoStrategy: any
  ): AllocationStrategy {
    const allocations = [];
    
    // 获取可用协议的 APY
    const jupiterAPY = jupiterData?.apy || 0;
    const kaminoAPY = kaminoStrategy?.apy || 0;

    // 根据 APY 和风险偏好决定最优分配
    let optimalProtocol: 'jupiter' | 'kamino';
    let primaryPercentage = 100;

    if (jupiterAPY === 0 && kaminoAPY === 0) {
      throw new Error(`No earning opportunities available for ${asset}`);
    }

    // 选择最优协议
    if (jupiterAPY === 0) {
      optimalProtocol = 'kamino';
    } else if (kaminoAPY === 0) {
      optimalProtocol = 'jupiter';
    } else {
      // 两个都有收益时，根据风险偏好和收益差异选择
      const apyDiff = Math.abs(jupiterAPY - kaminoAPY);
      
      if (riskProfile === 'conservative') {
        // 保守型：选择风险较低的 Jupiter，除非 Kamino 收益显著更高 (>2%)
        optimalProtocol = (kaminoAPY - jupiterAPY > 2) ? 'kamino' : 'jupiter';
      } else if (riskProfile === 'aggressive') {
        // 激进型：选择收益更高的协议
        optimalProtocol = kaminoAPY > jupiterAPY ? 'kamino' : 'jupiter';
      } else {
        // 平衡型：收益差异小于1%时选择 Jupiter (稳定)，否则选择收益更高的
        if (apyDiff < 1) {
          optimalProtocol = 'jupiter';
        } else {
          optimalProtocol = kaminoAPY > jupiterAPY ? 'kamino' : 'jupiter';
        }
      }
    }

    // 构建分配
    if (optimalProtocol === 'jupiter' && jupiterData) {
      allocations.push({
        protocol: 'jupiter' as const,
        percentage: primaryPercentage,
        amount: amount,
        expectedAPY: jupiterAPY
      });
    } else if (optimalProtocol === 'kamino' && kaminoStrategy) {
      allocations.push({
        protocol: 'kamino' as const,
        percentage: primaryPercentage,
        amount: amount,
        expectedAPY: kaminoAPY
      });
    }

    const expectedAPY = allocations[0]?.expectedAPY || 0;
    const riskScore = this.calculateRiskScore(riskProfile, allocations);

    return {
      totalAmount: amount,
      asset,
      riskProfile,
      allocations,
      expectedAPY,
      riskScore
    };
  }

  /**
   * 计算风险评分
   */
  private calculateRiskScore(riskProfile: RiskProfile, allocations: any[]): number {
    const baseScores = {
      conservative: 3,
      moderate: 5,
      aggressive: 8
    };

    // TODO: 根据分配比例和协议风险调整评分
    return baseScores[riskProfile];
  }

  /**
   * 构建存款交易指令
   */
  private async buildDepositInstructions(
    allocation: AllocationStrategy,
    userAddress: string
  ): Promise<any[]> {
    const instructions = [];

    for (const alloc of allocation.allocations) {
      if (alloc.protocol === 'jupiter') {
        const tx = await this.jupiterClient.createDepositTransaction(
          allocation.asset,
          alloc.amount,
          userAddress
        );
        instructions.push(tx);
      } else if (alloc.protocol === 'kamino') {
        const ix = await this.kaminoClient.createDepositInstruction(
          'strategy-id', // TODO: 从分配中获取正确的策略ID
          alloc.amount,
          userAddress
        );
        instructions.push(ix);
      }
    }

    return instructions;
  }

  /**
   * 估算交易费用和时间
   */
  private async estimateTransaction(
    type: TransactionType,
    amount: number,
    asset: SupportedAsset
  ): Promise<TransactionPreview> {
    const cacheKey = MarsDataCache.compositeKey(
      MarsDataCache.CACHE_KEYS.FEES_ESTIMATE,
      type,
      asset,
      amount.toString()
    );

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        // TODO: 实际的费用估算逻辑
        const baseGas = 5000; // lamports
        const protocolFee = amount * 0.001; // 0.1%
        const networkFee = 5000; // lamports

        return {
          amount,
          asset,
          estimatedGas: baseGas,
          fees: {
            protocol: protocolFee,
            network: networkFee,
            total: protocolFee + networkFee
          },
          estimatedTime: type === 'deposit' ? 30 : 60 // seconds
        };
      },
      MarsDataCache.TTL.FEES_ESTIMATE
    );
  }

  /**
   * 根据分配策略构建交易参数
   */
  private async buildTransactionParams(allocation: AllocationStrategy, params: any): Promise<{ serializedTx: string }> {
    // 选择主要协议 (分配比例最高的)
    const primaryAllocation = allocation.allocations.reduce((max, current) => 
      current.percentage > max.percentage ? current : max
    );

    const transactionData = {
      userAddress: params.userAddress,
      amount: params.amount,
      asset: params.asset,
      allocation: allocation,
      protocol: primaryAllocation.protocol,
      timestamp: Date.now()
    };

    // 根据协议添加对应的程序 ID
    if (primaryAllocation.protocol === 'jupiter') {
      Object.assign(transactionData, {
        programs: JUPITER_LEND_PROGRAMS,
        type: 'jupiter_lend'
      });
    } else if (primaryAllocation.protocol === 'kamino') {
      Object.assign(transactionData, {
        programs: KAMINO_PROGRAMS,
        type: 'kamino_lend'
      });
    }

    // 序列化为 base64 供前端使用
    const serializedTx = btoa(JSON.stringify(transactionData));

    return { serializedTx };
  }

  /**
   * 获取用户仓位
   */
  private async getUserPositions(userAddress: string) {
    // 组合 Jupiter 和 Kamino 的仓位数据
    const jupiterPositions = await this.jupiterClient.getUserPositions(userAddress);
    const kaminoPositions = await this.kaminoClient.getUserPositions(userAddress);

    return [...jupiterPositions, ...kaminoPositions];
  }

  /**
   * 生成交易 ID
   */
  private generateTransactionId(): string {
    return `mars_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 构建Solana交易并序列化
   */
  private async buildSolanaTransaction(
    instructions: any[],
    userAddress: string
  ): Promise<string> {
    try {
      // 创建新的交易
      const transaction = new Transaction();
      
      // 获取最新的blockhash
      const connection = this.getSolanaConnection();
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(userAddress);
      
      // 添加指令到交易（这里需要根据实际的指令结构来调整）
      for (const instruction of instructions) {
        if (instruction && instruction.instruction) {
          transaction.add(instruction.instruction);
        } else if (instruction) {
          // 如果instruction本身就是指令对象
          transaction.add(instruction);
        }
      }
      
      // 如果没有有效指令，创建一个简单的memo指令作为占位符
      if (transaction.instructions.length === 0) {
        console.log('⚠️ No valid instructions found, creating placeholder transaction');
        // 添加一个简单的系统程序指令作为占位符
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(userAddress),
            toPubkey: new PublicKey(userAddress),
            lamports: 0, // 0 SOL转账，仅用于创建有效交易
          })
        );
      }
      
      // 序列化交易为base64
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });
      
      return serialized.toString('base64');
      
    } catch (error) {
      console.error('❌ Error building Solana transaction:', error);
      // 返回一个基础的空交易
      const emptyTx = new Transaction();
      emptyTx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(userAddress),
          toPubkey: new PublicKey(userAddress),
          lamports: 0,
        })
      );
      return emptyTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      }).toString('base64');
    }
  }

  /**
   * 记录LI.FI跨链交易（公共方法）
   */
  async recordLiFiTransaction(params: {
    userAddress: string;
    transactionType: string;
    asset: string;
    amount: number;
    transactionHash: string;
    protocol: string;
    chainId: number;
    status: string;
    metadata?: any;
  }): Promise<string> {
    if (!this.db) {
      console.warn('Database not available, skipping LI.FI transaction record');
      return nanoid();
    }

    try {
      const transactionId = nanoid();
      const now = new Date();

      await this.db.insert(marsTransactions).values({
        id: transactionId,
        userAddress: params.userAddress,
        transactionType: params.transactionType as 'deposit' | 'withdraw',
        asset: params.asset,
        amount: params.amount.toString(),
        protocol: params.protocol,
        txHash: params.transactionHash,
        status: 'pending',
        metadata: JSON.stringify({
          ...params.metadata,
          lifiIntegration: true,
          chainId: params.chainId,
        }),
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`LI.FI transaction recorded: ${transactionId} for ${params.userAddress}`);
      return transactionId;

    } catch (error) {
      console.error('Failed to record LI.FI transaction:', error);
      throw error;
    }
  }

  /**
   * 获取管理器统计
   */
  getStats() {
    return {
      jupiterStats: this.jupiterClient.getStats(),
      kaminoStats: this.kaminoClient.getStats(),
      cacheStats: this.cache.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 创建交易管理器
 */
export function createMarsTransactionManager(
  jupiterClient: JupiterLendClient,
  kaminoClient: KaminoSDKClient,
  cache: MarsDataCache,
  env?: any
): MarsTransactionManager {
  return new MarsTransactionManager(jupiterClient, kaminoClient, cache, env);
}