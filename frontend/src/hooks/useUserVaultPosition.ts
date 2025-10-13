/**
 * useUserVaultPosition Hook
 * 获取用户在 Kamino Vault 中的持仓信息
 * 
 * 与 Kamino 官方 UI 保持一致的计算逻辑：
 * - Total Supplied: 用户实际持有的 token 数量（shares × tokensPerShare）
 * - Interest Earned: 累计利息收益（当前价值 - 初始存款）
 * - Daily Interest: 每日预期收益（基于当前 APY）
 * - Supply APY: Lending APY + Incentives APY
 * 
 * 数据刷新：每 60 秒自动更新一次（后台静默刷新，无 loading 状态）
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
  interestEarned: number; // 累计利息收益（USD）- 根据 tokensPerShare 增长计算
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
  interestEarned: 0,
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
    // 不管是否有用户地址，都要获取 Vault 的整体数据（APY, rewards 等）
    let isCancelled = false;

    const fetchUserPosition = async () => {
      // 后台静默刷新，不显示 loading 状态
      // setPosition(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        console.log('🔍 [useUserVaultPosition] Starting fetch, userAddress:', userAddress);
        
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
        console.log('📦 [useUserVaultPosition] Vault state loaded');

        // 3. 获取当前 slot
        const currentSlot = await rpc.getSlot({ commitment: 'confirmed' }).send();
        console.log('🎰 [useUserVaultPosition] Current slot:', currentSlot);
        
        // 4. 初始化共用变量
        const tokenPrice = new Decimal(1.0); // PYUSD 价格约为 $1
        
        // 5. 计算用户持仓数据（如果有用户地址）
        let userSharesNum = 0;
        let actualTokens = new Decimal(0);
        let totalSuppliedUSD = 0;
        let safeInterestEarned = 0;
        
        if (userAddress) {
          // 获取用户在特定 Vault 的份额
          const userSharesForVault = await kaminoManager.getUserSharesBalanceSingleVault(
            userAddress as any,
            vault
          );

          if (isCancelled) return;

          // 如果用户有持仓，计算详细数据
          if (userSharesForVault && !userSharesForVault.totalShares.isZero()) {
            // 获取当前 tokensPerShare
            const tokensPerShare = await kaminoManager.getTokensPerShareSingleVault(vault, currentSlot);
            
            userSharesNum = userSharesForVault.totalShares.toNumber();
            
            // 用户实际持有的 token 数量 = shares × tokensPerShare
            actualTokens = new Decimal(userSharesNum).mul(tokensPerShare);
            totalSuppliedUSD = actualTokens.toNumber() * tokenPrice.toNumber();
            
            // 计算 Interest Earned
            const initialTokensPerShare = new Decimal(1.0);
            const initialValue = new Decimal(userSharesNum).mul(initialTokensPerShare).mul(tokenPrice);
            const currentValue = actualTokens.mul(tokenPrice);
            const interestEarned = currentValue.sub(initialValue).toNumber();
            safeInterestEarned = Math.max(0, interestEarned);
          }
        }
        
        // 6. 获取 Reserves 详情并计算加权 Lending APY（所有用户都需要这个数据）
        const reservesOverview = await kaminoManager.getVaultReservesDetails(vaultState, currentSlot);
        
        let weightedLendingAPY = new Decimal(0);
        let totalSupplied = new Decimal(0);
        
        reservesOverview.forEach((reserveDetail) => {
          const supplied = reserveDetail.suppliedAmount;
          totalSupplied = totalSupplied.add(supplied);
          weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
        });
        
        const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;
        console.log('📊 [useUserVaultPosition] Lending APY:', lendingAPY, 'Total Supplied:', totalSupplied.toString());

        // 7. 获取 Farm Rewards（并行优化）- 所有用户都需要这个数据
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

        // 8. 处理所有 rewards
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
        
        console.log('🎁 [useUserVaultPosition] Incentives APY:', totalIncentivesAPY);
        console.log('💰 [useUserVaultPosition] Total APY:', totalCombinedAPY);
        
        // 9. 计算每日利息（基于 lending APY，只有用户有持仓时才计算）
        const dailyInterestRate = lendingAPY / 365;
        const dailyInterestUSD = totalSuppliedUSD * dailyInterestRate;
        
        console.log('📈 [useUserVaultPosition] User position - Total Supplied USD:', totalSuppliedUSD, 'Interest Earned:', safeInterestEarned, 'Daily Interest:', dailyInterestUSD);

        // 10. 解析 rewards 信息
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

        // 11. 更新状态（即使没有用户地址，也要显示 Vault 的整体 APY 和 rewards）
        const finalPosition = {
          totalSupplied: actualTokens.toNumber(), // 实际持有的 token 数量（不是 shares）
          totalSuppliedUSD,
          sharesBalance: userSharesNum,
          interestEarned: safeInterestEarned,
          dailyInterestUSD,
          lendingAPY,
          incentivesAPY: totalIncentivesAPY,
          totalAPY: totalCombinedAPY,
          rewards,
          loading: false,
        };
        
        console.log('✅ [useUserVaultPosition] Final position:', finalPosition);
        setPosition(finalPosition);

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
    
    // 每 60 秒刷新一次（后台静默更新）
    const interval = setInterval(fetchUserPosition, 60000);
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [userAddress, connection]);

  return position;
};
