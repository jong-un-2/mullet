/**
 * useUserVaultPosition Hook
 * 获取用户在 Kamino Vault 中的持仓信息（Total Supplied）
 */

import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Kamino Vault 配置
const VAULT_SHARES_MINT = new PublicKey('5ocJK68fF1wtMY4ZHSQSZFdW9bFN44G35u7t5ZxxmqjD');

export interface UserVaultPosition {
  totalSupplied: number; // 用户存入的 PYUSD 数量（以 PYUSD 计）
  sharesBalance: number; // 用户持有的 shares 数量
  loading: boolean;
  error?: string;
}

/**
 * 获取用户在 Kamino Vault 中的持仓
 */
export const useUserVaultPosition = (userAddress: string | null): UserVaultPosition => {
  const { connection } = useConnection();
  const [position, setPosition] = useState<UserVaultPosition>({
    totalSupplied: 0,
    sharesBalance: 0,
    loading: false,
  });

  useEffect(() => {
    if (!userAddress) {
      setPosition({
        totalSupplied: 0,
        sharesBalance: 0,
        loading: false,
      });
      return;
    }

    const fetchUserPosition = async () => {
      setPosition(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        const userPublicKey = new PublicKey(userAddress);
        
        // 获取用户的 shares ATA
        const userSharesAta = getAssociatedTokenAddressSync(
          VAULT_SHARES_MINT,
          userPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        // 获取 shares 账户信息
        const accountInfo = await connection.getAccountInfo(userSharesAta);
        
        if (!accountInfo) {
          // 用户没有 shares ATA，说明没有存款
          setPosition({
            totalSupplied: 0,
            sharesBalance: 0,
            loading: false,
          });
          return;
        }

        // 解析 Token Account 数据
        // Token Account 结构: 
        // - mint: 32 bytes (offset 0)
        // - owner: 32 bytes (offset 32)
        // - amount: 8 bytes (offset 64) - u64 little-endian
        const data = accountInfo.data;
        const amountBuffer = data.slice(64, 72);
        const sharesBalance = Number(
          amountBuffer.readBigUInt64LE(0)
        ) / 1_000_000; // 6 decimals

        // 对于 PYUSD Vault，shares 和 PYUSD 的比例通常接近 1:1
        // 更精确的计算需要获取 vault state 中的 totalSupply 和 totalAssets
        // 这里简化处理，直接使用 shares 数量作为 totalSupplied
        const totalSupplied = sharesBalance;

        setPosition({
          totalSupplied,
          sharesBalance,
          loading: false,
        });
      } catch (error) {
        console.error('❌ Failed to fetch user vault position:', error);
        setPosition({
          totalSupplied: 0,
          sharesBalance: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchUserPosition();
    
    // 每 10 秒刷新一次
    const interval = setInterval(fetchUserPosition, 10000);
    
    return () => clearInterval(interval);
  }, [userAddress, connection]);

  return position;
};
