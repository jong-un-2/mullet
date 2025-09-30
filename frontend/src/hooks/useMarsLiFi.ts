/**
 * Mars LI.FI 跨链操作 React Hook
 * 简化前端跨链操作的使用
 */

import { useState, useCallback } from 'react';
import { marsLiFiHelper } from '../services/marsLiFiHelper';
import { marsLiFiService } from '../services/marsLiFiService';
import type { MarsDepositConfig, MarsWithdrawConfig } from '../services/marsLiFiHelper';
import type { LiFiQuote } from '../services/marsLiFiService';

interface UseMarsLiFiReturn {
  // 状态
  isLoading: boolean;
  error: string | null;
  
  // 存款相关
  depositQuote: LiFiQuote | null;
  isDepositSupported: boolean | null;
  prepareDeposit: (config: MarsDepositConfig) => Promise<void>;
  executeDeposit: (transactionHash: string) => Promise<{ success: boolean; transactionHash: string }>;
  
  // 提款相关
  withdrawQuote: LiFiQuote | null;
  isWithdrawSupported: boolean | null;
  prepareWithdraw: (config: MarsWithdrawConfig) => Promise<void>;
  executeWithdraw: (transactionHash: string) => Promise<{ success: boolean; transactionHash: string }>;
  
  // 辅助方法
  checkAddressSupport: (address: string) => { isEvm: boolean; isSolana: boolean; chainId: number | null };
  clearQuotes: () => void;
}

export function useMarsLiFi(): UseMarsLiFiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositQuote, setDepositQuote] = useState<LiFiQuote | null>(null);
  const [withdrawQuote, setWithdrawQuote] = useState<LiFiQuote | null>(null);
  const [isDepositSupported, setIsDepositSupported] = useState<boolean | null>(null);
  const [isWithdrawSupported, setIsWithdrawSupported] = useState<boolean | null>(null);
  const [currentDepositConfig, setCurrentDepositConfig] = useState<MarsDepositConfig | null>(null);
  const [currentWithdrawConfig, setCurrentWithdrawConfig] = useState<MarsWithdrawConfig | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearQuotes = useCallback(() => {
    setDepositQuote(null);
    setWithdrawQuote(null);
    setIsDepositSupported(null);
    setIsWithdrawSupported(null);
    setCurrentDepositConfig(null);
    setCurrentWithdrawConfig(null);
    clearError();
  }, [clearError]);

  const checkAddressSupport = useCallback((address: string) => {
    try {
      const chainId = marsLiFiService.getChainIdFromAddress(address);
      return {
        isEvm: /^0x[a-fA-F0-9]{40}$/.test(address),
        isSolana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address),
        chainId,
      };
    } catch {
      return {
        isEvm: false,
        isSolana: false,
        chainId: null,
      };
    }
  }, []);

  const prepareDeposit = useCallback(async (config: MarsDepositConfig) => {
    setIsLoading(true);
    clearError();
    
    try {
      // 检查操作是否支持
      const support = await marsLiFiHelper.isMarsOperationSupported('deposit', config.userAddress);
      setIsDepositSupported(support.supported);
      
      if (!support.supported) {
        throw new Error(support.reason || 'Deposit operation not supported');
      }
      
      // 准备存款
      const result = await marsLiFiHelper.prepareMarsDeposit(config);
      setDepositQuote(result.quote);
      setCurrentDepositConfig(config);
      
      console.log('Mars deposit prepared:', {
        targetChain: result.targetChain,
        isDirectDeposit: result.isDirectDeposit,
        quote: result.quote,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare deposit';
      setError(errorMessage);
      setIsDepositSupported(false);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const executeDeposit = useCallback(async (transactionHash: string) => {
    if (!currentDepositConfig) {
      throw new Error('No deposit configuration available. Call prepareDeposit first.');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const result = await marsLiFiHelper.executeMarsDeposit({
        userAddress: currentDepositConfig.userAddress,
        fromChain: currentDepositConfig.sourceChain,
        fromToken: currentDepositConfig.asset,
        fromAmount: currentDepositConfig.amount,
        transactionHash,
        marsProtocol: currentDepositConfig.marsProtocol,
      });
      
      console.log('Mars deposit executed:', result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute deposit';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentDepositConfig, clearError]);

  const prepareWithdraw = useCallback(async (config: MarsWithdrawConfig) => {
    setIsLoading(true);
    clearError();
    
    try {
      // 检查操作是否支持
      const support = await marsLiFiHelper.isMarsOperationSupported('withdraw', config.userAddress, config.targetAddress);
      setIsWithdrawSupported(support.supported);
      
      if (!support.supported) {
        throw new Error(support.reason || 'Withdraw operation not supported');
      }
      
      // 准备提款
      const result = await marsLiFiHelper.prepareMarsWithdraw(config);
      setWithdrawQuote(result.quote);
      setCurrentWithdrawConfig(config);
      
      console.log('Mars withdraw prepared:', {
        sourceChain: result.sourceChain,
        targetChain: result.targetChain,
        isDirectWithdraw: result.isDirectWithdraw,
        quote: result.quote,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare withdraw';
      setError(errorMessage);
      setIsWithdrawSupported(false);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const executeWithdraw = useCallback(async (transactionHash: string) => {
    if (!currentWithdrawConfig) {
      throw new Error('No withdraw configuration available. Call prepareWithdraw first.');
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const result = await marsLiFiHelper.executeMarsWithdraw({
        userAddress: currentWithdrawConfig.userAddress,
        toAddress: currentWithdrawConfig.targetAddress,
        toToken: currentWithdrawConfig.asset,
        fromAmount: currentWithdrawConfig.amount,
        transactionHash,
        marsProtocol: currentWithdrawConfig.marsProtocol,
      });
      
      console.log('Mars withdraw executed:', result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute withdraw';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWithdrawConfig, clearError]);

  return {
    // 状态
    isLoading,
    error,
    
    // 存款相关
    depositQuote,
    isDepositSupported,
    prepareDeposit,
    executeDeposit,
    
    // 提款相关
    withdrawQuote,
    isWithdrawSupported,
    prepareWithdraw,
    executeWithdraw,
    
    // 辅助方法
    checkAddressSupport,
    clearQuotes,
  };
}

// 导出一个简化的Hook用于检查跨链支持
export function useCrossChainSupport() {
  const [isLoading, setIsLoading] = useState(false);
  const [supportedChains, setSupportedChains] = useState<any[]>([]);
  
  const checkSupport = useCallback(async (fromAddress: string, toAddress?: string) => {
    setIsLoading(true);
    
    try {
      if (toAddress) {
        // 检查两个地址间的跨链支持
        return await marsLiFiService.isCrossChainSupportedByAddress(fromAddress, toAddress);
      } else {
        // 只检查单个地址的支持情况
        const chainId = marsLiFiService.getChainIdFromAddress(fromAddress);
        const chains = await marsLiFiService.getSupportedChains();
        return chains.some((chain: any) => chain.id === chainId);
      }
    } catch (error) {
      console.error('Failed to check cross-chain support:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSupportedChains = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const chains = await marsLiFiService.getSupportedChains();
      setSupportedChains(chains);
      return chains;
    } catch (error) {
      console.error('Failed to load supported chains:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    supportedChains,
    checkSupport,
    loadSupportedChains,
  };
}