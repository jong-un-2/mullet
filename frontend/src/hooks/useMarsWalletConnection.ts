/**
 * Mars Wallet Connection Hook
 * 管理钱包连接记录的 React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { marsWalletAPI, type WalletConnectionData } from '../services/marsWalletAPI';

export interface WalletConnectionSession {
  sessionId?: string;
  isRecorded: boolean;
}

export function useMarsWalletConnection() {
  const [sessions, setSessions] = useState<Map<string, WalletConnectionSession>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Privy hooks
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // External wallet hooks
  const { address: ethAddress, isConnected: ethConnected } = useAccount();
  const { publicKey: solanaPublicKey, connected: solanaConnected, wallet: solanaWallet } = useWallet();

  /**
   * 检测钱包类型
   */
  const detectWalletType = useCallback((address: string, isPrivy: boolean = false): WalletConnectionData['walletType'] => {
    if (isPrivy) return 'privy';
    
    // Solana 钱包检测
    if (solanaWallet?.adapter?.name) {
      const walletName = solanaWallet.adapter.name.toLowerCase();
      if (walletName.includes('phantom')) return 'phantom';
      if (walletName.includes('solflare')) return 'solflare';
      if (walletName.includes('backpack')) return 'backpack';
      if (walletName.includes('trust')) return 'trust';
    }

    // Ethereum 钱包检测（通过地址格式）
    if (address.startsWith('0x')) {
      // 检查是否是特定钱包（可以通过 window 对象检测）
      if ((window as any).ethereum?.isMetaMask) return 'metamask';
      if ((window as any).ethereum?.isCoinbaseWallet) return 'coinbase';
      if ((window as any).ethereum?.isRabby) return 'rainbow'; // Rabby 暂时归类为 rainbow
      if ((window as any).ethereum?.isTrust) return 'trust';
    }

    return 'other';
  }, [solanaWallet]);

  /**
   * 检测链类型
   */
  const detectChainType = useCallback((address: string): WalletConnectionData['chainType'] => {
    if (address.startsWith('0x')) return 'ethereum';
    return 'solana';
  }, []);

  /**
   * 获取 Privy 用户信息
   */
  const getPrivyInfo = useCallback(() => {
    if (!authenticated || !user) return {};
    
    return {
      privyUserId: user.id,
      privyEmail: user.email?.address,
      privyAuthMethod: user.linkedAccounts?.[0]?.type || 'wallet',
    };
  }, [authenticated, user]);

  /**
   * 记录钱包连接
   */
  const recordConnection = useCallback(async (address: string, isPrivy: boolean = false) => {
    if (!address || sessions.get(address)?.isRecorded) {
      return null; // 已经记录过或地址无效
    }

    setIsRecording(true);
    setError(null);

    try {
      const walletType = detectWalletType(address, isPrivy);
      const chainType = detectChainType(address);
      const privyInfo = isPrivy ? getPrivyInfo() : {};

      const connectionData: WalletConnectionData = {
        walletAddress: address,
        walletType,
        chainType,
        networkId: chainType === 'ethereum' ? '1' : 'mainnet-beta', // 默认主网
        userAgent: navigator.userAgent,
        ...privyInfo,
      };

      console.log('🔗 Recording wallet connection:', connectionData);

      const response = await marsWalletAPI.recordConnection(connectionData);

      // 更新 session 状态
      setSessions(prev => new Map(prev.set(address, {
        sessionId: response.sessionId,
        isRecorded: true,
      })));

      return response.sessionId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record connection';
      setError(errorMessage);
      console.error('❌ Wallet connection recording failed:', err);
      return null;
    } finally {
      setIsRecording(false);
    }
  }, [sessions, detectWalletType, detectChainType, getPrivyInfo]);

  /**
   * 记录钱包断开连接
   */
  const recordDisconnection = useCallback(async (address: string) => {
    const session = sessions.get(address);
    if (!session?.isRecorded) {
      return; // 没有记录过连接
    }

    try {
      await marsWalletAPI.recordDisconnection({
        walletAddress: address,
        sessionId: session.sessionId,
      });

      // 清除 session 状态
      setSessions(prev => {
        const newSessions = new Map(prev);
        newSessions.delete(address);
        return newSessions;
      });

      console.log('✅ Wallet disconnection recorded for:', address);

    } catch (err) {
      console.error('❌ Wallet disconnection recording failed:', err);
    }
  }, [sessions]);

  /**
   * 自动检测并记录钱包连接
   */
  useEffect(() => {
    const recordConnections = async () => {
      // Privy 钱包
      if (authenticated && wallets.length > 0) {
        for (const wallet of wallets) {
          if (wallet.address && !sessions.get(wallet.address)?.isRecorded) {
            await recordConnection(wallet.address, true);
          }
        }
      }

      // 外部 Ethereum 钱包
      if (ethConnected && ethAddress && !sessions.get(ethAddress)?.isRecorded) {
        await recordConnection(ethAddress, false);
      }

      // 外部 Solana 钱包
      if (solanaConnected && solanaPublicKey && !sessions.get(solanaPublicKey.toString())?.isRecorded) {
        await recordConnection(solanaPublicKey.toString(), false);
      }
    };

    recordConnections();
  }, [authenticated, wallets, ethConnected, ethAddress, solanaConnected, solanaPublicKey, sessions, recordConnection]);

  /**
   * 清理断开的钱包
   */
  useEffect(() => {
    const handleDisconnections = async () => {
      const currentAddresses = new Set<string>();
      
      // 收集当前连接的地址
      if (authenticated && wallets.length > 0) {
        wallets.forEach(wallet => {
          if (wallet.address) currentAddresses.add(wallet.address);
        });
      }
      
      if (ethConnected && ethAddress) {
        currentAddresses.add(ethAddress);
      }
      
      if (solanaConnected && solanaPublicKey) {
        currentAddresses.add(solanaPublicKey.toString());
      }

      // 检查需要断开记录的地址
      for (const [address] of sessions) {
        if (!currentAddresses.has(address)) {
          await recordDisconnection(address);
        }
      }
    };

    handleDisconnections();
  }, [authenticated, wallets, ethConnected, ethAddress, solanaConnected, solanaPublicKey, sessions, recordDisconnection]);

  return {
    sessions: Object.fromEntries(sessions),
    isRecording,
    error,
    recordConnection,
    recordDisconnection,
  };
}