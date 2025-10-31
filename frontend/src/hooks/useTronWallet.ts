/**
 * TRON Wallet Hook (Privy Integration)
 * Manages TRON wallet state using Privy's Tier 2 support
 */

import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { privyTronService } from '../services/privyTronService';
import { COMMON_TOKENS } from '../services/marsLiFiService';

export interface TronWalletInfo {
  address: string;
  connected: boolean;
  walletType: 'privy-embedded' | 'privy-imported';
  walletId?: string;
  publicKey?: string;
}

export interface TronBalance {
  trx: number;
  tokens: Record<string, { balance: number; symbol: string; decimals: number }>;
}

export const useTronWallet = () => {
  const { user, authenticated, getAccessToken, createWallet } = usePrivy();
  const { wallets } = useWallets();
  
  const [walletInfo, setWalletInfo] = useState<TronWalletInfo | null>(null);
  const [balance, setBalance] = useState<TronBalance | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing TRON wallet on mount and when user changes
  useEffect(() => {
    const checkExistingWallet = async () => {
      if (!authenticated || !user) {
        setWalletInfo(null);
        setBalance(null);
        return;
      }

      console.log('[useTronWallet] Checking wallets:', wallets);
      console.log('[useTronWallet] User linked accounts:', user.linkedAccounts);

      // Find TRON wallet in Privy wallets
      const tronWallet = wallets.find(
        (wallet) => {
          console.log('[useTronWallet] Checking wallet:', wallet.walletClientType, wallet);
          return wallet.walletClientType === 'tron';
        }
      );

      if (tronWallet) {
        console.log('[useTronWallet] Found existing TRON wallet:', tronWallet.address);
        setWalletInfo({
          address: tronWallet.address,
          connected: true,
          walletType: tronWallet.imported ? 'privy-imported' : 'privy-embedded',
          walletId: (tronWallet as any).id,
          publicKey: (tronWallet as any).publicKey,
        });
      } else {
        console.log('[useTronWallet] No TRON wallet found in wallets array');
        // 也检查 linkedAccounts - 打印详细信息
        console.log('[useTronWallet] linkedAccounts数量:', user.linkedAccounts?.length);
        console.log('[useTronWallet] linkedAccounts原始数据:', JSON.stringify(user.linkedAccounts, null, 2));
        
        if (user.linkedAccounts && user.linkedAccounts.length > 0) {
          console.log('[useTronWallet] linkedAccounts详细信息:');
          user.linkedAccounts.forEach((account: any, index: number) => {
            console.log(`  账户[${index}]:`, {
              type: account.type,
              chainType: account.chainType,
              address: account.address,
              walletClientType: account.walletClientType,
              connectorType: account.connectorType,
              imported: account.imported,
              delegated: account.delegated,
              allKeys: Object.keys(account)
            });
          });
        } else {
          console.log('[useTronWallet] linkedAccounts 为空或不存在');
        }
        
        const tronAccount = user.linkedAccounts?.find(
          (account: any) => account.type === 'wallet' && account.chainType === 'tron'
        ) as any;
        
        if (tronAccount) {
          console.log('[useTronWallet] Found TRON wallet in linkedAccounts:', tronAccount);
          setWalletInfo({
            address: tronAccount.address,
            connected: true,
            walletType: tronAccount.imported ? 'privy-imported' : 'privy-embedded',
            walletId: tronAccount.walletId || tronAccount.id,
            publicKey: tronAccount.publicKey,
          });
        } else {
          console.log('[useTronWallet] No TRON wallet found at all');
          setWalletInfo(null);
        }
      }
    };

    checkExistingWallet();
  }, [authenticated, user, wallets]);

  // Auto-fetch balance when wallet info updates
  useEffect(() => {
    if (walletInfo?.address && !balance) {
      const fetchBalance = async () => {
        try {
          await refreshBalance();
        } catch (err) {
          console.error('Failed to fetch initial balance:', err);
        }
      };
      
      fetchBalance();
    }
  }, [walletInfo]);

  // Create TRON wallet via Privy
  const connect = useCallback(async () => {
    if (!authenticated) {
      throw new Error('Please log in to Privy first');
    }

    // 检查是否已经有 TRON 钱包
    if (walletInfo?.address) {
      console.log('[useTronWallet] TRON wallet already exists:', walletInfo.address);
      return { 
        address: walletInfo.address, 
        connected: true, 
        walletType: walletInfo.walletType 
      };
    }

    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('[useTronWallet] Creating TRON wallet via server API...');
      
      // Create TRON wallet via server API (Tier 2 chains require server SDK)
      const address = await privyTronService.createPrivyTronWallet(getAccessToken);
      
      // Wallet info will be updated by the useEffect watching wallets
      // But we can set it immediately for better UX
      setWalletInfo({
        address,
        connected: true,
        walletType: 'privy-embedded',
      });
      
      // Fetch initial balance
      await refreshBalance();
      
      return { address, connected: true, walletType: 'privy-embedded' as const };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create TRON wallet';
      
      // Special handling: if wallet already exists, try to fetch from Privy
      if (errorMessage.includes('already has') || errorMessage.includes('already exists')) {
        console.log('[useTronWallet] User already has TRON wallet, fetching from Privy...');
        
        // 重新检查 wallets
        const tronWallet = wallets.find(w => w.walletClientType === 'tron');
        if (tronWallet) {
          const walletType = (tronWallet.imported ? 'privy-imported' : 'privy-embedded') as 'privy-imported' | 'privy-embedded';
          const walletData = {
            address: tronWallet.address,
            connected: true,
            walletType
          };
          setWalletInfo({
            ...walletData,
            walletId: (tronWallet as any).id,
            publicKey: (tronWallet as any).publicKey,
          });
          return walletData;
        }
        
        // 如果还是找不到，从 user.linkedAccounts 找
        const tronAccount = user?.linkedAccounts?.find(
          (account: any) => account.type === 'wallet' && account.chainType === 'tron'
        ) as any;
        
        if (tronAccount) {
          const walletType = (tronAccount.imported ? 'privy-imported' : 'privy-embedded') as 'privy-imported' | 'privy-embedded';
          const walletData = {
            address: tronAccount.address,
            connected: true,
            walletType
          };
          setWalletInfo({
            ...walletData,
            walletId: tronAccount.walletId || tronAccount.id,
            publicKey: tronAccount.publicKey,
          });
          return walletData;
        }
      }
      
      setError(errorMessage);
      console.error('[useTronWallet] Failed to create wallet:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [authenticated, createWallet]);

  // Disconnect (clear state)
  const disconnect = useCallback(async () => {
    try {
      setWalletInfo(null);
      setBalance(null);
      setError(null);
      console.log('[useTronWallet] Disconnected (cleared state)');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!walletInfo?.address) {
      return;
    }

    try {
      console.log('[useTronWallet] Refreshing balance for:', walletInfo.address);
      
      // Get TRX balance
      const trxBalance = await privyTronService.getTronBalance(walletInfo.address);
      
      // Get token balances (USDT only, USDC removed per user request)
      const tokens: Record<string, { balance: number; symbol: string; decimals: number }> = {};
      
      try {
        const usdtBalance = await privyTronService.getTrc20Balance(
          walletInfo.address,
          COMMON_TOKENS.TRON.USDT
        );
        tokens[COMMON_TOKENS.TRON.USDT] = {
          balance: usdtBalance,
          symbol: 'USDT',
          decimals: 6,
        };
      } catch (err) {
        console.warn('Failed to fetch USDT balance:', err);
      }
      
      const balanceData = {
        trx: trxBalance,
        tokens,
      };
      
      setBalance(balanceData);
      return balanceData;
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance';
      setError(errorMessage);
    }
  }, [walletInfo]);

  // Get specific token balance
  const getTokenBalance = useCallback(async (tokenAddress: string) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await privyTronService.getTrc20Balance(walletInfo.address, tokenAddress);
    } catch (err) {
      console.error(`Failed to get token balance for ${tokenAddress}:`, err);
      throw err;
    }
  }, [walletInfo]);

  // Send TRX using Privy signing
  const sendTrx = useCallback(async (toAddress: string, amount: string) => {
    if (!walletInfo?.address || !walletInfo.walletId || !walletInfo.publicKey) {
      throw new Error('Wallet not fully initialized');
    }

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const amountInSun = parseFloat(amount) * 1_000_000; // Convert TRX to SUN
      
      // Build and sign transaction
      const signedTx = await privyTronService.buildAndSignTronTransaction(
        walletInfo.walletId,
        walletInfo.address,
        toAddress,
        amountInSun,
        accessToken,
        walletInfo.publicKey
      );
      
      // Broadcast transaction
      const txId = await privyTronService.broadcastTronTransaction(signedTx);
      
      // Refresh balance
      await refreshBalance();
      
      return txId;
    } catch (err) {
      console.error('Failed to send TRX:', err);
      throw err;
    }
  }, [walletInfo, getAccessToken, refreshBalance]);

  // Sign message using Privy
  const signMessage = useCallback(async (message: string) => {
    if (!walletInfo?.walletId || !walletInfo.publicKey) {
      throw new Error('Wallet not fully initialized');
    }

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const signature = await privyTronService.signMessageWithPrivy(
        walletInfo.walletId,
        message,
        accessToken,
        walletInfo.publicKey
      );
      
      return signature;
    } catch (err) {
      console.error('Failed to sign message:', err);
      throw err;
    }
  }, [walletInfo, getAccessToken]);

  return {
    // State
    walletInfo,
    balance,
    isConnecting,
    error,
    isConnected: !!walletInfo?.connected,
    address: walletInfo?.address,
    isTronLinkInstalled: false, // Not applicable with Privy

    // Methods
    connect,
    disconnect,
    refreshBalance,
    getTokenBalance,
    sendTrx,
    signMessage,
  };
};

export default useTronWallet;

