/**
 * Mars Withdraw Manager
 * 专门处理取款路径优化和取款预览
 */

import type {
  WithdrawPreview,
  WithdrawPath,
  SupportedAsset,
  UserPosition
} from '../types';
import { TransactionError } from '../types';
import { JupiterLendClient } from '../jupiter/client';
import { KaminoSDKClient } from '../kamino/client';
import { MarsDataCache } from '../cache';

export class MarsWithdrawManager {
  constructor(
    private jupiterClient: JupiterLendClient,
    private kaminoClient: KaminoSDKClient,
    private cache: MarsDataCache
  ) {}

  /**
   * 获取取款预览
   */
  async getWithdrawPreview(
    userAddress: string,
    asset: SupportedAsset,
    requestedAmount: number
  ): Promise<WithdrawPreview> {
    const cacheKey = MarsDataCache.compositeKey(
      MarsDataCache.CACHE_KEYS.WITHDRAW_PATHS,
      userAddress,
      asset,
      requestedAmount.toString()
    );

    return this.cache.getOrFetch(
      cacheKey,
      async () => {
        // 1. 获取用户仓位
        const positions = await this.getUserAssetPositions(userAddress, asset);
        const totalAvailable = this.calculateTotalAvailable(positions);

        if (requestedAmount > totalAvailable) {
          throw new TransactionError(
            `Insufficient balance: ${totalAvailable} available, ${requestedAmount} requested`
          );
        }

        // 2. 生成所有可能的取款路径
        const withdrawPaths = await this.generateWithdrawPaths(positions, requestedAmount);

        // 3. 选择最优路径
        const optimalPath = this.selectOptimalPath(withdrawPaths);

        // 4. 计算费用和预计收到金额
        const totalFees = withdrawPaths.reduce((sum, path) => sum + path.fees, 0);
        const estimatedReceived = requestedAmount - totalFees;

        // 5. 估算总时间
        const estimatedTime = Math.max(...withdrawPaths.map(path => path.estimatedTime));

        const preview: WithdrawPreview = {
          availableAmount: totalAvailable,
          requestedAmount,
          fees: {
            protocol: totalFees * 0.8,      // 80% 是协议费用
            network: totalFees * 0.1,       // 10% 是网络费用  
            slippage: totalFees * 0.1,      // 10% 是滑点
            total: totalFees
          },
          estimatedReceived,
          estimatedTime,
          withdrawPaths,
          optimalPath
        };

        return preview;
      },
      MarsDataCache.TTL.WITHDRAW_PATHS
    );
  }

  /**
   * 生成取款路径
   */
  private async generateWithdrawPaths(
    positions: UserPosition[],
    requestedAmount: number
  ): Promise<WithdrawPath[]> {
    const paths: WithdrawPath[] = [];
    let remainingAmount = requestedAmount;

    // 按优先级排序仓位 (流动性高、费用低的优先)
    const sortedPositions = positions.sort((a, b) => {
      // TODO: 实际的优先级计算逻辑
      return b.amount - a.amount; // 暂时按金额排序
    });

    for (const position of sortedPositions) {
      if (remainingAmount <= 0) break;

      const withdrawAmount = Math.min(remainingAmount, position.currentValue);
      const percentage = (withdrawAmount / requestedAmount) * 100;

      // 根据协议估算取款参数
      const pathEstimate = await this.estimateProtocolWithdraw(
        position.protocol,
        withdrawAmount,
        position.asset
      );

      const path: WithdrawPath = {
        protocol: position.protocol,
        percentage,
        amount: withdrawAmount,
        estimatedTime: pathEstimate.estimatedTime,
        fees: pathEstimate.fees,
        liquidity: pathEstimate.liquidity,
        priority: this.calculatePathPriority(position, pathEstimate)
      };

      paths.push(path);
      remainingAmount -= withdrawAmount;
    }

    return paths;
  }

  /**
   * 估算协议取款参数
   */
  private async estimateProtocolWithdraw(
    protocol: 'jupiter' | 'kamino',
    amount: number,
    asset: SupportedAsset
  ): Promise<{
    estimatedTime: number;
    fees: number;
    liquidity: number;
  }> {
    if (protocol === 'jupiter') {
      // Jupiter 通常更快但费用可能更高
      return {
        estimatedTime: 30,           // 30秒
        fees: amount * 0.002,        // 0.2% 费用
        liquidity: amount * 20       // 20x 流动性
      };
    } else {
      // Kamino 策略取款估算
      return this.kaminoClient.estimateWithdraw('strategy-id', amount);
    }
  }

  /**
   * 计算路径优先级
   */
  private calculatePathPriority(
    position: UserPosition,
    estimate: { estimatedTime: number; fees: number; liquidity: number }
  ): number {
    // 优先级计算：时间快 + 费用低 + 流动性高 = 优先级高
    const timeScore = Math.max(1, 10 - (estimate.estimatedTime / 30)); // 时间越短分数越高
    const feeScore = Math.max(1, 10 - (estimate.fees / position.amount * 1000)); // 费用越低分数越高
    const liquidityScore = Math.min(10, estimate.liquidity / position.amount); // 流动性越高分数越高

    return Math.round((timeScore + feeScore + liquidityScore) / 3);
  }

  /**
   * 选择最优路径
   */
  private selectOptimalPath(paths: WithdrawPath[]): WithdrawPath {
    if (paths.length === 0) {
      throw new TransactionError('No withdraw paths available');
    }

    // 选择优先级最高的路径
    return paths.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }

  /**
   * 获取用户特定资产的仓位
   */
  private async getUserAssetPositions(
    userAddress: string,
    asset: SupportedAsset
  ): Promise<UserPosition[]> {
    // 获取 Jupiter 仓位
    const jupiterPositions = await this.jupiterClient.getUserPositions(userAddress);
    const kaminoPositions = await this.kaminoClient.getUserPositions(userAddress);

    // 合并并转换为 UserPosition 格式
    const allPositions: UserPosition[] = [
      ...jupiterPositions.map(p => this.convertToUserPosition(p, 'jupiter')),
      ...kaminoPositions
    ];

    return allPositions.filter(p => p.asset === asset);
  }

  /**
   * 转换 Jupiter 数据为 UserPosition 格式
   */
  private convertToUserPosition(jupiterPos: any, protocol: 'jupiter'): UserPosition {
    return {
      id: jupiterPos.id,
      userAddress: 'user-address', // TODO: 从上下文获取
      protocol,
      asset: jupiterPos.asset,
      amount: jupiterPos.tvl || 0,
      shares: 1, // TODO: 计算实际 shares
      entryAPY: jupiterPos.apy,
      currentValue: jupiterPos.tvl || 0,
      unrealizedGain: 0, // TODO: 计算实际收益
      depositTime: new Date(),
      lastUpdate: new Date()
    };
  }

  /**
   * 计算总可取金额
   */
  private calculateTotalAvailable(positions: UserPosition[]): number {
    return positions.reduce((sum, p) => sum + p.currentValue, 0);
  }

  /**
   * 创建实际取款交易
   */
  async createWithdrawTransactions(
    userAddress: string,
    preview: WithdrawPreview
  ): Promise<{
    transactions: any[];
    totalEstimatedTime: number;
  }> {
    const transactions = [];
    
    for (const path of preview.withdrawPaths) {
      if (path.protocol === 'jupiter') {
        const tx = await this.jupiterClient.createWithdrawTransaction(
          'USDC', // TODO: 从 path 获取正确资产
          path.amount,
          userAddress
        );
        transactions.push(tx);
      } else if (path.protocol === 'kamino') {
        const ix = await this.kaminoClient.createWithdrawInstruction(
          'strategy-id', // TODO: 从 path 获取正确策略ID
          path.amount,
          userAddress
        );
        transactions.push(ix);
      }
    }

    return {
      transactions,
      totalEstimatedTime: preview.estimatedTime
    };
  }

  /**
   * 优化现有取款路径
   */
  async optimizeWithdrawPath(
    userAddress: string,
    asset: SupportedAsset,
    amount: number,
    preferences: {
      prioritizeSpeed?: boolean;
      minimizeFees?: boolean;
      maxSlippage?: number;
    } = {}
  ): Promise<WithdrawPreview> {
    const basePreview = await this.getWithdrawPreview(userAddress, asset, amount);

    // 根据偏好重新排序和选择路径
    let optimizedPaths = [...basePreview.withdrawPaths];

    if (preferences.prioritizeSpeed) {
      optimizedPaths.sort((a, b) => a.estimatedTime - b.estimatedTime);
    } else if (preferences.minimizeFees) {
      optimizedPaths.sort((a, b) => a.fees - b.fees);
    }

    // 应用最大滑点限制
    if (preferences.maxSlippage) {
      const maxFees = amount * preferences.maxSlippage;
      optimizedPaths = optimizedPaths.filter(path => path.fees <= maxFees);
    }

    const optimalPath = optimizedPaths[0] || basePreview.optimalPath;

    return {
      ...basePreview,
      withdrawPaths: optimizedPaths,
      optimalPath
    };
  }

  /**
   * 获取管理器统计
   */
  getStats() {
    return {
      cacheStats: this.cache.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 创建取款管理器
 */
export function createMarsWithdrawManager(
  jupiterClient: JupiterLendClient,
  kaminoClient: KaminoSDKClient,
  cache: MarsDataCache
): MarsWithdrawManager {
  return new MarsWithdrawManager(jupiterClient, kaminoClient, cache);
}