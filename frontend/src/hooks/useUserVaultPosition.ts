/**
 * useUserVaultPosition Hook (Backend-powered)
 * 从后端 API 获取缓存的用户持仓数据
 * 替代前端直接查询链上数据，大幅提升性能
 * 
 * 数据由后端 cron job 每分钟更新，提供实时缓存的链上数据
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://api.marsliquidity.com';

export interface RewardInfo {
  tokenName: string;
  rewardMint: string;
  weeklyAmount: number;
  apy: number;
  pendingBalance: number;
}

export interface UserVaultPosition {
  totalSupplied: number;
  totalSuppliedUSD: number;
  sharesBalance: number;
  interestEarned: number;
  dailyInterestUSD: number;
  lendingAPY: number;
  incentivesAPY: number;
  totalAPY: number;
  rewards: RewardInfo[];
  loading: boolean;
  error?: string;
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
 * 从后端获取用户 Kamino Vault 持仓
 * 与原来的接口兼容，但数据来自后端缓存
 */
export const useUserVaultPosition = (
  userAddress: string | null | undefined,
  refreshTrigger?: number
): UserVaultPosition => {
  const [position, setPosition] = useState<UserVaultPosition>(EMPTY_POSITION);

  useEffect(() => {
    let isCancelled = false;

    const fetchPosition = async () => {
      if (!userAddress) {
        setPosition(EMPTY_POSITION);
        return;
      }

      setPosition(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        const response = await axios.get(
          `${API_BASE_URL}/v1/api/mars/positions/${userAddress}`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (isCancelled) return;

        if (response.data.success) {
          // API returns data grouped by protocol: { kamino: {...}, jupiter: {...} }
          const kaminoData = response.data.data.kamino;
          const kaminoPositions = kaminoData?.positions || [];
          
          // Find Kamino Vault position
          const vaultPosition = kaminoPositions.find((p: any) => p.protocol === 'mars-vault');
          
          if (vaultPosition) {
            // Convert backend data format to frontend format
            const formattedPosition: UserVaultPosition = {
              totalSupplied: parseFloat(vaultPosition.amount) || 0,
              totalSuppliedUSD: parseFloat(vaultPosition.currentValue) || 0,
              sharesBalance: parseFloat(vaultPosition.shares) || 0,
              interestEarned: parseFloat(vaultPosition.interestEarned) || 0,
              dailyInterestUSD: parseFloat(vaultPosition.dailyInterestUSD) || 0,
              lendingAPY: vaultPosition.lendingAPY || 0,
              incentivesAPY: vaultPosition.incentivesAPY || 0,
              totalAPY: vaultPosition.entryAPY || 0,
              rewards: (vaultPosition.rewards || []).map((r: any) => ({
                tokenName: r.tokenName || 'TOKEN',
                rewardMint: r.tokenMint || r.rewardMint || '',
                weeklyAmount: r.weeklyAmount || 0,
                apy: r.apy || 0,
                pendingBalance: r.pendingBalance || 0,
              })),
              loading: false,
            };
            
            console.log('✅ Loaded Kamino position from backend:', formattedPosition);
            setPosition(formattedPosition);
          } else {
            // No position found
            console.log('⚠️ No Kamino vault position found');
            setPosition({ ...EMPTY_POSITION, loading: false });
          }
        } else {
          throw new Error(response.data.error || 'Failed to fetch position');
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch user vault position from backend:', err);
        
        if (!isCancelled) {
          if (err.response?.status === 404) {
            // No positions found - not an error
            setPosition({ ...EMPTY_POSITION, loading: false });
          } else {
            setPosition({
              ...EMPTY_POSITION,
              loading: false,
              error: err.message || 'Failed to fetch position',
            });
          }
        }
      }
    };

    fetchPosition();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchPosition, 60000);
    
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [userAddress, refreshTrigger]);

  return position;
};

/**
 * 强制刷新用户持仓（触发后端重新从链上获取）
 */
export const refreshUserPositions = async (userAddress: string): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/v1/api/mars/positions/${userAddress}/refresh`,
      {},
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Error refreshing user positions:', err);
    throw new Error(err.message || 'Failed to refresh positions');
  }
};
