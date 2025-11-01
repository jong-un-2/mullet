/**
 * OKX DEX Hook
 * 用于 XFund 和 XStock 页面的 TRON 跨链桥接和代币交换
 */

import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  checkAndRefillTrx,
  bridgeTronToSolana,
  bridgeSolanaToTron,
  getSwapQuote,
  executeSwap,
  OKX_CHAIN_IDS,
  type SwapParams,
} from '../services/okxDexService';
import { TRON_TOKENS, MIN_TRX_FOR_FEES } from '../constants/tronConstants';
import { getTronWeb } from '../services/tronService';

/**
 * 交易状态
 */
export type TransactionStatus = 
  | 'idle' 
  | 'checking-balance' 
  | 'refilling-trx' 
  | 'getting-quote' 
  | 'swapping' 
  | 'bridging' 
  | 'confirming' 
  | 'success' 
  | 'error';

/**
 * OKX DEX Hook 返回类型
 */
export interface UseOkxDexReturn {
  // 状态
  isLoading: boolean;
  status: TransactionStatus;
  error: string | null;
  txHash: string | null;

  // TRON 原生代币交换（USDT → TRX）
  swapUsdtToTrx: (amount: number) => Promise<void>;
  
  // 检查并补充 TRX
  ensureTrxBalance: () => Promise<boolean>;

  // TRON → Solana 跨链桥接
  bridgeToSolana: (
    fromToken: string,
    toToken: string,
    amount: string
  ) => Promise<string>;

  // Solana → TRON 跨链桥接
  bridgeFromSolana: (
    fromToken: string,
    toToken: string,
    amount: string
  ) => Promise<string>;

  // 重置状态
  reset: () => void;
}

/**
 * 使用 OKX DEX 进行 TRON 相关操作
 */
export function useOkxDex(): UseOkxDexReturn {
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * 获取用户的 TRON 钱包地址
   */
  const getTronAddress = useCallback((): string | null => {
    const tronWallet = user?.linkedAccounts?.find(
      (account) => account.type === 'wallet' && account.walletClientType === 'privy'
    );

    if (!tronWallet || tronWallet.type !== 'wallet') {
      return null;
    }

    return tronWallet.address;
  }, [user]);

  /**
   * 获取用户的 Solana 钱包地址
   */
  const getSolanaAddress = useCallback((): string | null => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === 'wallet' && account.chainType === 'solana'
    );

    if (!solanaWallet || solanaWallet.type !== 'wallet') {
      return null;
    }

    return solanaWallet.address;
  }, [user]);

  /**
   * 获取 TRX 余额
   */
  const getTrxBalance = useCallback(async (address: string): Promise<number> => {
    const tronWeb = await getTronWeb();
    const balance = await tronWeb.trx.getBalance(address);
    return balance / 1e6; // TRX 有 6 位小数
  }, []);

  /**
   * 检查并确保 TRX 余额充足
   */
  const ensureTrxBalance = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setStatus('checking-balance');
      setError(null);

      const tronAddress = getTronAddress();
      if (!tronAddress) {
        throw new Error('未找到 TRON 钱包地址');
      }

      const tronWeb = await getTronWeb();
      const currentBalance = await getTrxBalance(tronAddress);

      console.log(`[OKX DEX Hook] 当前 TRX 余额: ${currentBalance} TRX`);

      if (currentBalance < MIN_TRX_FOR_FEES) {
        setStatus('refilling-trx');
        console.log(`[OKX DEX Hook] TRX 余额不足，开始补充...`);
        
        const refilled = await checkAndRefillTrx(tronAddress, currentBalance, tronWeb);
        
        if (refilled) {
          console.log(`[OKX DEX Hook] ✅ TRX 补充成功`);
        }
        
        return refilled;
      }

      console.log(`[OKX DEX Hook] ✅ TRX 余额充足`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '检查 TRX 余额失败';
      console.error('[OKX DEX Hook] 错误:', err);
      setError(errorMessage);
      setStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getTronAddress, getTrxBalance]);

  /**
   * USDT → TRX 交换
   */
  const swapUsdtToTrx = useCallback(async (amount: number): Promise<void> => {
    try {
      setIsLoading(true);
      setStatus('getting-quote');
      setError(null);
      setTxHash(null);

      const tronAddress = getTronAddress();
      if (!tronAddress) {
        throw new Error('未找到 TRON 钱包地址');
      }

      const tronWeb = await getTronWeb();

      // 计算金额（USDT 有 6 位小数）
      const amountInSmallestUnit = (amount * 1e6).toString();

      // 获取报价
      console.log(`[OKX DEX Hook] 获取 USDT → TRX 报价...`);
      const swapParams: SwapParams = {
        fromChainId: OKX_CHAIN_IDS.TRON,
        toChainId: OKX_CHAIN_IDS.TRON,
        fromTokenAddress: TRON_TOKENS.USDT,
        toTokenAddress: TRON_TOKENS.TRX,
        amount: amountInSmallestUnit,
        userWalletAddress: tronAddress,
        slippage: 1.0, // 1% 滑点
      };

      const quote = await getSwapQuote(swapParams);
      console.log(`[OKX DEX Hook] 报价:`, quote.data[0]);

      // 执行交换
      setStatus('swapping');
      console.log(`[OKX DEX Hook] 执行交换...`);
      
      const swapResult = await executeSwap(swapParams);
      const txData = swapResult.data[0].tx;

      // 签名并发送交易
      setStatus('confirming');
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        txData.to,
        txData.data,
        {
          feeLimit: Number(txData.gas) * Number(txData.gasPrice),
          callValue: Number(txData.value),
        },
        [],
        tronAddress
      );

      const signedTx = await tronWeb.trx.sign(transaction.transaction);
      const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);

      if (!broadcast.result) {
        throw new Error(`交易失败: ${JSON.stringify(broadcast)}`);
      }

      setTxHash(broadcast.txid);
      setStatus('success');
      console.log(`[OKX DEX Hook] ✅ 交换成功，交易哈希: ${broadcast.txid}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'USDT → TRX 交换失败';
      console.error('[OKX DEX Hook] 错误:', err);
      setError(errorMessage);
      setStatus('error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getTronAddress]);

  /**
   * TRON → Solana 跨链桥接
   */
  const bridgeToSolana = useCallback(
    async (fromToken: string, toToken: string, amount: string): Promise<string> => {
      try {
        setIsLoading(true);
        setStatus('checking-balance');
        setError(null);
        setTxHash(null);

        const tronAddress = getTronAddress();
        const solanaAddress = getSolanaAddress();

        if (!tronAddress) {
          throw new Error('未找到 TRON 钱包地址');
        }
        if (!solanaAddress) {
          throw new Error('未找到 Solana 钱包地址');
        }

        // 1. 确保 TRX 余额充足
        const hasEnoughTrx = await ensureTrxBalance();
        if (!hasEnoughTrx) {
          throw new Error('TRX 余额不足且补充失败');
        }

        // 2. 执行跨链桥接
        setStatus('bridging');
        const tronWeb = await getTronWeb();
        
        const txHash = await bridgeTronToSolana(
          fromToken,
          toToken,
          amount,
          tronAddress,
          solanaAddress,
          tronWeb
        );

        setTxHash(txHash);
        setStatus('success');
        return txHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'TRON → Solana 桥接失败';
        console.error('[OKX DEX Hook] 错误:', err);
        setError(errorMessage);
        setStatus('error');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getTronAddress, getSolanaAddress, ensureTrxBalance]
  );

  /**
   * Solana → TRON 跨链桥接
   */
  const bridgeFromSolana = useCallback(
    async (fromToken: string, toToken: string, amount: string): Promise<string> => {
      try {
        setIsLoading(true);
        setStatus('bridging');
        setError(null);
        setTxHash(null);

        const tronAddress = getTronAddress();
        const solanaAddress = getSolanaAddress();

        if (!tronAddress) {
          throw new Error('未找到 TRON 钱包地址');
        }
        if (!solanaAddress) {
          throw new Error('未找到 Solana 钱包地址');
        }

        // 执行跨链桥接
        const txHash = await bridgeSolanaToTron(
          fromToken,
          toToken,
          amount,
          solanaAddress,
          tronAddress,
          null // Solana 钱包实例，待实现
        );

        setTxHash(txHash);
        setStatus('success');
        return txHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Solana → TRON 桥接失败';
        console.error('[OKX DEX Hook] 错误:', err);
        setError(errorMessage);
        setStatus('error');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getTronAddress, getSolanaAddress]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    isLoading,
    status,
    error,
    txHash,
    swapUsdtToTrx,
    ensureTrxBalance,
    bridgeToSolana,
    bridgeFromSolana,
    reset,
  };
}
