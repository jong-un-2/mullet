/**
 * useMarsContract Hook
 * 提供 Mars 合约的存款和取款功能
 */

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  createDepositAndStakeTransaction,
  createUnstakeAndWithdrawTransactions,
  checkPyusdBalance,
} from '../services/marsContract';

export interface TransactionStatus {
  status: 'idle' | 'building' | 'signing' | 'sending' | 'confirming' | 'success' | 'error';
  currentSignature?: string;
  error?: string;
  isProcessing: boolean;
}

export const useMarsContract = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const [status, setStatus] = useState<TransactionStatus['status']>('idle');
  const [currentSignature, setCurrentSignature] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  const deposit = useCallback(async (amount: number): Promise<string | undefined> => {
    console.log('🔵 [useMarsContract] deposit 函数被调用, amount:', amount);
    console.log('🔵 [useMarsContract] publicKey:', publicKey?.toString());
    console.log('🔵 [useMarsContract] sendTransaction:', typeof sendTransaction);
    
    if (!publicKey || !sendTransaction) {
      const errorMsg = '请先连接钱包';
      console.error('❌ [useMarsContract]', errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log('🟢 [useMarsContract] 开始存款流程...');
      setIsProcessing(true);
      setError(undefined);
      setStatus('building');

      console.log('🟢 [useMarsContract] 构建存款交易...', { amount, wallet: publicKey.toString() });

      const balance = await checkPyusdBalance(publicKey, connection);
      console.log('🟢 [useMarsContract] PYUSD 余额:', balance);

      if (balance < amount) {
        throw new Error(`PYUSD 余额不足。当前: ${balance}, 需要: ${amount}`);
      }

      console.log('🟢 [useMarsContract] 调用 createDepositAndStakeTransaction...');
      const transaction = await createDepositAndStakeTransaction(
        publicKey,
        amount,
        connection
      );
      console.log('🟢 [useMarsContract] 交易构建完成:', transaction);

      setStatus('signing');
      console.log('🟡 [useMarsContract] 等待用户签名...');
      console.log('🟡 [useMarsContract] 即将调用 sendTransaction...');

      setStatus('sending');
      const signature = await sendTransaction(transaction, connection);
      setCurrentSignature(signature);
      console.log('🟢 [useMarsContract] 交易已发送:', signature);

      setStatus('confirming');
      console.log('等待确认...');
      
      await connection.confirmTransaction(signature, 'confirmed');

      setStatus('success');
      console.log('存款成功!');
      
      return signature;

    } catch (err: any) {
      console.error('存款失败:', err);
      setStatus('error');
      setError(err.message || '存款失败');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection]);

  const withdraw = useCallback(async (
    amount: number, 
    onStepChange?: (step: number, txName: string) => void
  ): Promise<string[] | undefined> => {
    if (!publicKey || !sendTransaction) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsProcessing(true);
      setError(undefined);
      setStatus('building');

      console.log('构建取款交易...', { amount, wallet: publicKey.toString() });

      const transactions = await createUnstakeAndWithdrawTransactions(
        publicKey,
        amount,
        connection
      );

      const signatures: string[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const txName = ['Start Unstake', 'Unstake', 'Withdraw'][i];
        console.log(`第 ${i + 1}/3 步: ${txName}`);

        // 通知进度更新
        if (onStepChange) {
          onStepChange(i + 1, txName);
        }

        setStatus('signing');
        console.log('等待签名...');

        setStatus('sending');
        const signature = await sendTransaction(transactions[i], connection);
        signatures.push(signature);
        setCurrentSignature(signature);
        console.log(`${txName} 交易已发送:`, signature);

        setStatus('confirming');
        console.log('等待确认...');
        await connection.confirmTransaction(signature, 'confirmed');
        console.log(`${txName} 确认成功!`);

        if (i < 2) {
          console.log('等待 5 秒后继续...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      setStatus('success');
      console.log('取款完成! 所有 3 个交易:', signatures);
      
      return signatures;

    } catch (err: any) {
      console.error('取款失败:', err);
      setStatus('error');
      setError(err.message || '取款失败');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection]);

  return {
    deposit,
    withdraw,
    status,
    currentSignature,
    error,
    isProcessing,
  };
};
