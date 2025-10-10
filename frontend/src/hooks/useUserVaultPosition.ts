/**
 * useUserVaultPosition Hook
 * 获取用户在 Kamino Vault 中的持仓信息（Total Supplied）
 */

import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
} from "@solana/kit";
import {
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
} from "@kamino-finance/klend-sdk";
import { Farms } from "@kamino-finance/farms-sdk";
import { Decimal } from "decimal.js";

// Kamino Vault 配置
const VAULT_ADDRESS = "A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK";

export interface UserVaultPosition {
  totalSupplied: number; // 用户存入的 PYUSD 数量（以 PYUSD 计）
  totalSuppliedUSD: number; // USD 价值
  sharesBalance: number; // 用户持有的 shares 数量
  dailyInterestUSD: number; // 每日利息（USD）
  lendingAPY: number; // 借贷 APY（基础利率）
  incentivesAPY: number; // 奖励 APY
  totalAPY: number; // 总 APY
  rewards: RewardInfo[]; // 奖励详情
  loading: boolean;
  error?: string;
}

export interface RewardInfo {
  tokenName: string;
  weeklyAmount: number;
  apy: number;
  rewardMint: string;
}

const EMPTY_POSITION: UserVaultPosition = {
  totalSupplied: 0,
  totalSuppliedUSD: 0,
  sharesBalance: 0,
  dailyInterestUSD: 0,
  lendingAPY: 0,
  incentivesAPY: 0,
  totalAPY: 0,
  rewards: [],
  loading: false,
};

/**
 * 获取用户在 Kamino Vault 中的持仓
 */
export const useUserVaultPosition = (userAddress: string | null): UserVaultPosition => {
  const { connection } = useConnection();
  const [position, setPosition] = useState<UserVaultPosition>(EMPTY_POSITION);

  useEffect(() => {
    if (!userAddress) {
      setPosition(EMPTY_POSITION);
      return;
    }

    let isCancelled = false;

    const fetchUserPosition = async () => {
      setPosition(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        // 1. 初始化 RPC 和 Kamino Manager
        const rpc = createRpc({
          api: createSolanaRpcApi(),
          transport: createDefaultRpcTransport({ url: connection.rpcEndpoint })
        });
        
        const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
        const kaminoManager = new KaminoManager(rpc, slotDuration);
        
        // 2. 获取 Vault 状态
        const vault = new KaminoVault(VAULT_ADDRESS as any);
        const vaultState = await vault.getState(rpc);

        // 3. 获取用户在特定 Vault 的份额（使用 SingleVault 方法避免 RPC 限制）
        const userSharesForVault = await kaminoManager.getUserSharesBalanceSingleVault(
          userAddress as any,
          vault
        );

        if (isCancelled) return;

        // 4. 检查用户是否有持仓
        if (!userSharesForVault || userSharesForVault.totalShares.isZero()) {
          setPosition({
            ...EMPTY_POSITION,
            loading: false,
          });
          return;
        }

        // 5. 计算关键指标
        const tokenPrice = new Decimal(1.0); // PYUSD 价格约为 $1
        const userSharesNum = userSharesForVault.totalShares.toNumber();
        const totalSuppliedUSD = userSharesNum * tokenPrice.toNumber();

        // 6. 获取当前 slot
        const currentSlot = await rpc.getSlot({ commitment: 'confirmed' }).send();
        
        // 7. 获取 Reserves 详情并计算加权 Lending APY
        const reservesOverview = await kaminoManager.getVaultReservesDetails(vaultState, currentSlot);
        
        let weightedLendingAPY = new Decimal(0);
        let totalSupplied = new Decimal(0);
        
        reservesOverview.forEach((reserveDetail) => {
          const supplied = reserveDetail.suppliedAmount;
          totalSupplied = totalSupplied.add(supplied);
          weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
        });
        
        const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;

        // 8. 获取 Farm Rewards（并行优化）
        const farmsClient = new Farms(rpc);
        
        const [vaultFarmRewards, ...reserveIncentivesArray] = await Promise.all([
          // Vault Farm Rewards
          kaminoManager.getVaultFarmRewardsAPY(vault, tokenPrice, farmsClient, currentSlot),
          // Reserve Farm Rewards（并行获取所有 reserves）
          ...Array.from(reservesOverview.keys()).map(reservePubkey =>
            kaminoManager.getReserveFarmRewardsAPY(
              reservePubkey,
              tokenPrice,
              farmsClient,
              currentSlot
            )
          )
        ]);

        if (isCancelled) return;

        // 9. 处理所有 rewards
        const allRewardsStats: any[] = [...vaultFarmRewards.incentivesStats];
        let totalReserveFarmAPY = 0;
        
        let reserveIndex = 0;
        for (const [, reserveDetail] of reservesOverview.entries()) {
          const reserveIncentives = reserveIncentivesArray[reserveIndex++];
          
          // 加权 reserve farm rewards by allocation
          const reserveAllocation = reserveDetail.suppliedAmount.div(totalSupplied);
          const weightedReserveFarmAPY = reserveIncentives.collateralFarmIncentives.totalIncentivesApy * reserveAllocation.toNumber();
          totalReserveFarmAPY += weightedReserveFarmAPY;
          
          // 添加 reserve rewards 到列表
          reserveIncentives.collateralFarmIncentives.incentivesStats.forEach(stat => {
            allRewardsStats.push({
              ...stat,
              incentivesApy: stat.incentivesApy * reserveAllocation.toNumber()
            });
          });
        }
        
        const totalIncentivesAPY = vaultFarmRewards.totalIncentivesApy + totalReserveFarmAPY;
        const totalCombinedAPY = lendingAPY + totalIncentivesAPY;
        
        // 10. 计算每日利息（基于 lending APY）
        const dailyInterestRate = lendingAPY / 365;
        const dailyInterestUSD = totalSuppliedUSD * dailyInterestRate;

        // 11. 解析 rewards 信息
        const rewards: RewardInfo[] = allRewardsStats
          .filter(r => r.incentivesApy > 0)
          .map(incentive => {
            const rewardMint = incentive.rewardMint.toString();
            let tokenName = "TOKEN";
            
            if (rewardMint === "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS") {
              tokenName = "KMNO";
            } else if (rewardMint === "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo") {
              tokenName = "PYUSD";
            } else {
              tokenName = rewardMint.slice(0, 5);
            }
            
            return {
              tokenName,
              weeklyAmount: incentive.weeklyRewards.toNumber(),
              apy: incentive.incentivesApy,
              rewardMint,
            };
          });

        if (isCancelled) return;

        // 12. 更新状态
        setPosition({
          totalSupplied: userSharesNum,
          totalSuppliedUSD,
          sharesBalance: userSharesNum,
          dailyInterestUSD,
          lendingAPY,
          incentivesAPY: totalIncentivesAPY,
          totalAPY: totalCombinedAPY,
          rewards,
          loading: false,
        });

      } catch (error) {
        console.error('❌ Failed to fetch user vault position:', error);
        if (!isCancelled) {
          setPosition({
            ...EMPTY_POSITION,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    fetchUserPosition();
    
    // 每 30 秒刷新一次
    const interval = setInterval(fetchUserPosition, 30000);
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [userAddress, connection]);

  return position;
};
