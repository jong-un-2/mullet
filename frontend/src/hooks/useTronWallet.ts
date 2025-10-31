/**
 * TRON 钱包 Hook
 * 用于管理 TRON 钱包连接状态
 */

import { useState, useEffect, useCallback } from 'react';
import { tronService, type TronWalletInfo, type TronBalance } from '../services/tronService';
import { COMMON_TOKENS } from '../services/marsLiFiService';

export const useTronWallet = () => {
  const [walletInfo, setWalletInfo] = useState<TronWalletInfo | null>(null);
  const [balance, setBalance] = useState<TronBalance | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTronLinkInstalled, setIsTronLinkInstalled] = useState(false);

  // 检测 TronLink 安装和自动连接
  useEffect(() => {
    const checkAndConnect = async () => {
      const installed = await tronService.detectTronLink();
      setIsTronLinkInstalled(installed);
      
      // 如果已安装，检查是否已经授权连接
      if (installed) {
        const existingConnection = await tronService.checkTronLinkConnection();
        if (existingConnection) {
          setWalletInfo(existingConnection);
        }
      }
    };
    
    checkAndConnect();
  }, []);
  
  // 当 walletInfo 更新后，自动获取余额
  useEffect(() => {
    if (walletInfo?.address && !balance) {
      const fetchBalance = async () => {
        try {
          const tronTokens = [
            COMMON_TOKENS.TRON.USDT,
            COMMON_TOKENS.TRON.USDC,
          ];

          const balanceData = await tronService.getBalance(
            walletInfo.address,
            tronTokens
          );
          
          setBalance(balanceData);
        } catch (err) {
          console.error('Failed to fetch initial balance:', err);
        }
      };
      
      fetchBalance();
    }
  }, [walletInfo, balance]);

  // 监听 TronLink 账户变化
  useEffect(() => {
    const handleAccountChange = (e: MessageEvent) => {
      if (e.data.message && e.data.message.action === 'accountsChanged') {
        console.log('🔔 TRON account changed:', e.data.message.data.address);
        // 重新获取钱包信息
        const newAddress = e.data.message.data.address;
        if (newAddress) {
          setWalletInfo({
            address: newAddress,
            connected: true,
            walletType: 'tronlink',
          });
        } else {
          setWalletInfo(null);
          setBalance(null);
        }
      }
    };

    window.addEventListener('message', handleAccountChange);
    
    return () => {
      window.removeEventListener('message', handleAccountChange);
    };
  }, []);

  // 连接钱包
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const info = await tronService.connectTronLink();
      setWalletInfo(info);
      
      // 获取初始余额
      await refreshBalance();
      
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      await tronService.disconnect();
      setWalletInfo(null);
      setBalance(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 刷新余额
  const refreshBalance = useCallback(async () => {
    if (!walletInfo?.address) {
      return;
    }

    try {
      // 获取常用 TRON 代币余额
      const tronTokens = [
        COMMON_TOKENS.TRON.USDT,
        COMMON_TOKENS.TRON.USDC,
      ];

      const balanceData = await tronService.getBalance(
        walletInfo.address,
        tronTokens
      );
      
      setBalance(balanceData);
      return balanceData;
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance';
      setError(errorMessage);
    }
  }, [walletInfo]);

  // 获取特定代币余额
  const getTokenBalance = useCallback(async (tokenAddress: string) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      return await tronService.getTrc20Balance(tokenAddress, walletInfo.address);
    } catch (err) {
      console.error(`Failed to get token balance for ${tokenAddress}:`, err);
      throw err;
    }
  }, [walletInfo]);

  // 发送 TRX
  const sendTrx = useCallback(async (toAddress: string, amount: string) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const txId = await tronService.sendTrx(toAddress, amount);
      // 刷新余额
      await refreshBalance();
      return txId;
    } catch (err) {
      console.error('Failed to send TRX:', err);
      throw err;
    }
  }, [walletInfo, refreshBalance]);

  // 发送 TRC20 代币
  const sendToken = useCallback(async (
    tokenAddress: string,
    toAddress: string,
    amount: string
  ) => {
    if (!walletInfo?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const txId = await tronService.sendTrc20(tokenAddress, toAddress, amount);
      // 刷新余额
      await refreshBalance();
      return txId;
    } catch (err) {
      console.error('Failed to send token:', err);
      throw err;
    }
  }, [walletInfo, refreshBalance]);

  return {
    // 状态
    walletInfo,
    balance,
    isConnecting,
    error,
    isTronLinkInstalled,
    isConnected: !!walletInfo?.connected,
    address: walletInfo?.address,

    // 方法
    connect,
    disconnect,
    refreshBalance,
    getTokenBalance,
    sendTrx,
    sendToken,
  };
};

export default useTronWallet;
